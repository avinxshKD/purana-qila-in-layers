import {sceneForYear} from '../film/scene-year.js';
import {createAuditGeometryAdapter} from '../film/audit-geometry.js';
import {featureFootprint} from '../film/emphasis.js';
import {anchorStateKey} from '../eras/site-driver.js';

// Thin provider boundary: M1/M2 native world now, P2 tier world later.
// displaceInWorker: era-displaced soil goes to the occlusion worker as it is (displacedKind names it) and the worker
// displaces it; otherwise CPU-displaced proxies are built here.
export function createSiteBackend(world,{poolCatalog={pools:{},fieldHashes:{},manifest:{}},onProgress=()=>{},displaceInWorker=false}={}){
  const site=world.eraSite?.();
  if(!site||!world.eraBlock||typeof world.applyState!=='function'||typeof world.eraDisplacement?.resolve!=='function')throw new Error('Site requires the real era backend, anchors and CPU displacement');
  const geometry=createAuditGeometryAdapter((mesh,state)=>world.eraDisplacement.resolve(mesh,state)),owned=new Set(),lastProxy=new WeakMap();let roles=new WeakMap();
  let key=null,state=null,result=null,revision=0,disposed=false,anchorMode='exact';
  // Interactive anchors (tier world): 'nearest' table anchors while the state moves, refined to exact once it rests.
  // Worlds without refineAnchors (native) always apply exact.
  // A nearest apply that hits the anchor table exactly already carries the exact anchors, so it needs no refinement.
  const interactiveAnchors=typeof world.refineAnchors==='function',applyTimes=[];let tableHits=0;
  const tableHit=next=>{const status=typeof world.anchorStatus==='function'?world.anchorStatus():null;return !!status?.tableKey&&status.tableKey===anchorStateKey(next);};
  function applyState(next,{anchors='exact'}={}){
    if(disposed)throw new Error('Site backend disposed');
    if(!Array.isArray(next.deposits)||!Array.isArray(next.features)||next.deposits.length!==10||next.features.length!==10||![...next.deposits,...next.features,next.excavation].every(Number.isFinite))throw new Error('Invalid site scene state');
    const mode=interactiveAnchors&&anchors==='nearest'?'nearest':'exact';
    const nextKey=JSON.stringify([next.deposits,next.features,next.excavation,next.eraIndex]);if(nextKey===key&&(mode==='nearest'||anchorMode==='exact'))return result;
    const start=performance.now(),applied=mode==='nearest'?world.applyState(structuredClone(next),{anchors:'nearest'}):world.applyState(structuredClone(next));if(!applied.activeTopAnchor?.point||!applied.featureAnchors)throw new Error('Real site backend did not return native anchors');
    state=structuredClone(next);geometry.beginFrame(state);world.scene.updateMatrixWorld(true);key=nextKey;revision++;
    const hit=mode==='nearest'&&tableHit(next);if(hit)tableHits++;anchorMode=hit?'exact':mode;result={...applied,activeTopY:applied.activeTopAnchor.point[1],stateRevision:revision,tableHit:hit};
    applyTimes.push({mode,ms:performance.now()-start});if(applyTimes.length>600)applyTimes.shift();return result;
  }
  // Exact anchors for the state applied last, without committing them: null when cancelled or superseded.
  async function refineAnchors({signal}={}){
    if(!interactiveAnchors||anchorMode==='exact'||disposed)return null;
    const forKey=key,exact=await world.refineAnchors({signal});
    return exact&&!disposed&&key===forKey&&anchorMode==='nearest'?{key:forKey,exact}:null;
  }
  function commitAnchors(refined){
    if(!refined||refined.key!==key||anchorMode!=='nearest')return null;
    revision++;anchorMode='exact';result={...refined.exact,activeTopY:refined.exact.activeTopAnchor.point[1],stateRevision:revision};return result;
  }
  const percentile=(values,q)=>{if(!values.length)return null;const s=[...values].sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*s.length))];};
  function applyReport(){const nearest=applyTimes.filter(a=>a.mode==='nearest').map(a=>a.ms),exact=applyTimes.filter(a=>a.mode==='exact').map(a=>a.ms);
    return {nearest:{count:nearest.length,p50Ms:percentile(nearest,.5),p95Ms:percentile(nearest,.95),maxMs:nearest.length?Math.max(...nearest):null},exact:{count:exact.length,p95Ms:percentile(exact,.95),maxMs:exact.length?Math.max(...exact):null},nearestTableHits:tableHits};}
  function marker(id){const anchor=result?.featureAnchors[id];return anchor?.point?.length===3&&anchor.point.every(Number.isFinite)?{...anchor,point:[...anchor.point],visible:anchor.visible!==false&&anchor.revealed!==false}:null;}
  function occluderSources(){
    if(!state)throw new Error('Apply a site state before requesting occluders');world.scene.updateMatrixWorld(true);const sources=[];
    function visit(node,visible=true,role=''){
      visible=visible&&node.visible;if(!visible)return;role=node.userData.sectionRole||role;
      if(node.isMesh&&role!=='ground'&&node.geometry.attributes.position?.count>=3&&node.geometry.drawRange.count>=3&&(Array.isArray(node.material)?node.material:[node.material]).some(m=>m.visible&&m.opacity!==0))sources.push({node,role});
      for(const child of node.children)visit(child,visible,role);
    }
    visit(world.scene);return sources;
  }
  const displacedKind=mesh=>displaceInWorker?mesh.userData?.eraDisplaced??null:null;
  function proxyFor({node,role},nextRoles){
    if(displacedKind(node)){nextRoles.set(node,role);return node;}
    const proxy=geometry.meshFor(node),old=lastProxy.get(node);if(old&&old!==proxy.geometry){old.dispose();owned.delete(old);}if(proxy!==node){owned.add(proxy.geometry);lastProxy.set(node,proxy.geometry);}nextRoles.set(proxy,role);return proxy;
  }
  let occluderStats=null;
  function occluders(){const nextRoles=new WeakMap(),meshes=occluderSources().map(source=>proxyFor(source,nextRoles));roles=nextRoles;return meshes;}
  // The same meshes, built in slices of about budgetMs with a task yield between them (CPU displacement of a cold
  // state takes 70-230 ms in all). Returns null once valid() fails, e.g. after a newer state.
  async function occludersSliced({valid=()=>true,budgetMs=8,yieldTask=()=>new Promise(resolve=>setTimeout(resolve,0))}={}){
    const sources=occluderSources(),nextRoles=new WeakMap(),meshes=[],forState=revision,started=performance.now();
    let sliceStart=started,slices=1,maxSliceMs=0,maxMeshMs=0,maxMesh=null;
    for(const source of sources){
      if(meshes.length&&performance.now()-sliceStart>=budgetMs){maxSliceMs=Math.max(maxSliceMs,performance.now()-sliceStart);await yieldTask();if(!valid()||revision!==forState||disposed)return null;sliceStart=performance.now();slices++;}
      const start=performance.now();meshes.push(proxyFor(source,nextRoles));const ms=performance.now()-start;if(ms>maxMeshMs){maxMeshMs=ms;maxMesh=source.node.name||source.node.uuid;}
    }
    maxSliceMs=Math.max(maxSliceMs,performance.now()-sliceStart);roles=nextRoles;
    occluderStats={meshes:meshes.length,totalMs:+(performance.now()-started).toFixed(1),slices,maxSliceMs:+maxSliceMs.toFixed(1),maxMeshMs:+maxMeshMs.toFixed(1),maxMesh};return meshes;
  }
  onProgress({phase:'anchors',source:'provider static table with native fallback'});
  return {kind:'real-era',base:world.eraBlock.base,top:world.eraBlock.top,bottomY:world.eraBlock.bottomY,applyState,
    setYear:year=>applyState(sceneForYear(year)),
    setEra(index){if(!Number.isInteger(index)||index<0||index>9)throw new Error('Invalid era');const deposits=Array.from({length:10},(_,i)=>Number(i<=index));return applyState({schemaVersion:1,eraIndex:index,deposits,features:[...deposits],excavation:0});},
    marker,occluders,occludersSliced,occluderStats:()=>occluderStats,displacedKind,appliedDeposits:()=>state?[...state.deposits]:null,
    // Every era-displaced soil mesh of every resident cut step (hidden steps included), for the worker warm.
    displacedMeshes(){const meshes=[];world.scene.traverse(node=>{if(node.isMesh&&displacedKind(node))meshes.push(node);});return meshes;},
    poolCatalog,roleOf:mesh=>roles.get(mesh)||'',
    interactiveAnchors,refineAnchors,commitAnchors,anchorMode:()=>anchorMode,
    prepareAnchors:options=>typeof world.prepareAnchors==='function'?world.prepareAnchors(options):Promise.resolve(null),
    anchorStatus:()=>typeof world.anchorStatus==='function'?world.anchorStatus():null,applyReport,
    markerRecord(id){const anchor=result?.featureAnchors[id];return anchor?{...anchor,point:anchor.point?[...anchor.point]:null}:null;},
    footprint:id=>poolCatalog.pools[id]?.footprint||featureFootprint(site.items,id,{fullGeometry:true,clusters:true}),
    // v1.1 resident states: providers holding every state in memory omit both methods.
    isResident:next=>typeof world.isResident==='function'?world.isResident(next):true,
    ensureState:next=>typeof world.ensureState==='function'?Promise.resolve(world.ensureState(structuredClone(next))):Promise.resolve(),
    warmState:next=>world.warmState(next),
    metadata:()=>({backend:'real-era',placeholderAnchors:false,anchorMode,anchorSource:'provider src/eras/anchor-table.js; native fallback for uncached interpolated states',stateRevision:revision,cpuDisplacement:true,
      geometrySource:'current native import tree; pending accepted M2/P2 rebase',poolSceneSource:poolCatalog.manifest.sceneRoot||null,poolSourceLayoutSHA256:poolCatalog.manifest.sourceLayoutSHA256||null,poolFieldHashes:poolCatalog.fieldHashes,poolSourceVerifiedAgainstProvider:false,resident:world.metadata?.()?.resident??null}),
    dispose(){disposed=true;for(const value of owned)value.dispose();owned.clear();}
  };
}
