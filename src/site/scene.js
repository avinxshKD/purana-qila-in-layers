import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {loadLabelFont} from '../labels.js';
import {createSiteBackend} from './backend.js';
import {createActiveMarkerEmphasis} from './emphasis.js';
import {loadSitePools} from './pools.js';
import {CALLOUT_IDS} from '../film/timeline.js';
import {CALLOUT_POWERS,CALIBRATION_STATUS} from '../film/emphasis-powers.js';
import {sceneForYear} from '../film/scene-year.js';
import {element} from './content.js';
import {createResidencyGate} from './resident.js';
import {createTaskMonitor,warmExcavationStates,selectWarmBackend} from './tasks.js';
import {runRefinement} from './anchor-refine.js';
import {siteHeroPose} from './camera.js';
import {diagnosticOptions,rendererIdentity,applyDiagnosticOverrides} from './diagnostics.js';
import {createDemandScheduler,createInteractionResolution,cappedPixelRatio,MAX_PIXEL_RATIO} from './render-demand.js';
import {createOcclusionClient,createDeferredOcclusion} from './marker-occlusion.js';
import {markerStatus} from './marker-state.js';
import {REFERENCE_SIZE,createReference,rowsWithBar,applyFraming,solveSiteFraming} from './framing.js';
import {createSiteScaleBar} from './scale-bar.js';
import shippedFraming from './framing-reference.json';
import {referenceKey,shippedReference,referenceRecord,rowsEqual,silhouetteDisplacement} from './framing-reference.js';
import {createSiteTierWorld,createSiteTierRenderer} from '../site-tier/world.js';
import {createEarlyFetch} from './early-fetch.js';
import {calloutMetrics,layoutCallouts,auditCallouts,holdCallouts,offsetsOf} from './callouts.js';
import {silhouetteFromRows} from '../film/silhouette.js';
import {polygonDistance,rectPoints} from '../film/layout.js';
import {wrapText} from '../film/hud.js';
import {sceneForYear as stateForYear} from '../film/scene-year.js';

// The native era world builds its kit when its modules are evaluated (seating.js alone is about 4.6 s), so it
// is reached only through this dynamic import and never from the site's static module graph. Dev server only
// (?world=native); production builds drop it.
export async function nativeWorldFactory(canvas,options){
  const {createLookWorld}=await import('../museum-scene.js');
  return createLookWorld(canvas,options);
}
export const siteTierWorldFactory=(canvas,options)=>createSiteTierWorld(canvas,options);
// Label outline raster cell (CSS px). Cell 1 holds labels closest to the exact outline (cell 4 moves some label or
// leader end by up to 15.6 px, output/site/silhouette-study-r1), but in the page its row count makes the worker
// raster 300-660 ms and the main-thread layout 60-173 ms per settle (output/site/interaction-rc1 vs -rc1-cell4).
const SILHOUETTE_CELL=4;
const SITE_TIER_BASE=(import.meta.env?.BASE_URL??'/')+'site-tier/';
function defaultWorldFactory(){
  return import.meta.env?.DEV&&typeof location!=='undefined'&&new URLSearchParams(location.search).get('world')==='native'?nativeWorldFactory:siteTierWorldFactory;
}
// v1 loaders resolve with every field loaded; give them the lazy catalogue surface.
function lazyCatalog(catalog){
  if(typeof catalog.ensure==='function')return catalog;
  const pools=catalog.pools||{};
  return {...catalog,pools,has:id=>!!pools[id],isResident:id=>!!pools[id],get:id=>pools[id]??null,ensure:id=>pools[id]?Promise.resolve(pools[id]):Promise.reject(new Error('Unknown pool '+id)),
    ensureAll:()=>Promise.resolve(),prefetch:()=>Promise.resolve(),metadata:()=>({source:'v1-loader',total:Object.keys(pools).length,loaded:Object.keys(pools)}),dispose(){}};
}
export async function createSiteScene(canvas,features,filmCopy,onOpen,{worldFactory=defaultWorldFactory(),poolLoader=loadSitePools,hudRects=()=>[],onMarkerInteraction=()=>{},setTitleScale=()=>{},onContextLost=()=>{}}={}){
  const taskMonitor=createTaskMonitor(),loadTimeline=[],mark=name=>loadTimeline.push({name,atMs:+performance.now().toFixed(1)});
  mark('scene-start');await loadLabelFont();mark('label-font');
  const host=document.querySelector('#viewport'),markerHost=document.querySelector('#markers'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const rect=host.getBoundingClientRect(),dpr=cappedPixelRatio(devicePixelRatio),diagnostic=diagnosticOptions();
  const listeners=[],listen=(target,name,callback)=>{target.addEventListener(name,callback);listeners.push(()=>target.removeEventListener(name,callback));},loadStatus=host.querySelector('.scene-load-status')||host.appendChild(element('p','Loading the layers…','scene-load-status'));
  loadStatus.setAttribute('role','status');
  let loadPhase='scene';const progress=({phase})=>{loadPhase=phase;loadStatus.textContent=({scene:'Loading the layers…',pools:'Loading feature light fields…',anchors:'Loading native feature anchors…',occlusion:'Preparing feature visibility…',shaders:'Preparing shaders…',ready:'Ready'})[phase]||phase;};
  // The world build holds the main thread, and a newly loaded image cannot be painted until it yields, so the hero
  // still gets up to 1.5 s to decode and paint first.
  const posterImage=document.querySelector('#scene-poster img');
  if(posterImage&&!posterImage.complete)await Promise.race([posterImage.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,1500))]);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));mark('poster-painted');
  const antialias=diagnostic.msaa!==false,worldWidth=Math.round(rect.width*dpr),worldHeight=Math.round(rect.height*dpr);let early={};
  if(worldFactory===siteTierWorldFactory){
    // First-view requests go out before the WebGL context is created, so the downloads overlap its main-thread cost.
    const fetcher=createEarlyFetch(SITE_TIER_BASE);await fetcher.primeFirstView();mark('first-view-requested');
    const contextStart=performance.now(),renderer=createSiteTierRenderer(canvas,{antialias,preserve:false,background:'css'});
    taskMonitor.record({name:'webgl-context',startTimeMs:contextStart,durationMs:performance.now()-contextStart});mark('webgl-context');
    early={renderer,background:'css',assets:{base:SITE_TIER_BASE,fetch:fetcher.fetch}};
  }
  const buildStart=performance.now(),world=await worldFactory(canvas,{width:worldWidth,height:worldHeight,antialias,preserve:false,view:'turntable',soil:'eras',onProgress:progress,...early});
  // background 'css': the canvas is transparent and the film's backdrop raster sits behind it, 1:1 with the drawing buffer.
  let backdropCanvas=null;
  if(world.backdrop?.canvas){const start=performance.now();backdropCanvas=world.backdrop.canvas(worldWidth,worldHeight);backdropCanvas.className='scene-backdrop';backdropCanvas.setAttribute('aria-hidden','true');canvas.before(backdropCanvas);
    taskMonitor.record({name:'css-backdrop',startTimeMs:start,durationMs:performance.now()-start});}
  taskMonitor.record({name:worldFactory===siteTierWorldFactory?'site-tier-world-build':'native-era-world-build',startTimeMs:buildStart,durationMs:performance.now()-buildStart});mark('world-built');progress({phase:'pools'});
  // Only the manifest loads here; fields follow per era (residency gate) and in the background after ready.
  // ?pools=film selects the film's full-size field set, for side-by-side review.
  const poolCatalog=lazyCatalog(await poolLoader({source:new URLSearchParams(location.search).get('pools')==='film'?'film':'site',onTask:taskMonitor.record}));mark('pool-manifest');
  const tierWorld=worldFactory===siteTierWorldFactory;
  const backend=createSiteBackend(world,{poolCatalog:{pools:poolCatalog.records??poolCatalog.pools,fieldHashes:poolCatalog.fieldHashes,manifest:poolCatalog.manifest},onProgress:progress,displaceInWorker:tierWorld}),controls=new OrbitControls(world.camera,canvas),radians=Math.PI/180;
  const gpuIdentity=rendererIdentity(world.renderer),diagnosticReport=applyDiagnosticOverrides(world,diagnostic);
  const hero=siteHeroPose();world.camera.position.fromArray(hero.position);
  controls.target.set(-1.4,-3.85,0);controls.minAzimuthAngle=(35-80)*radians;controls.maxAzimuthAngle=(35+80)*radians;
  controls.minPolarAngle=20*radians;controls.maxPolarAngle=85*radians;controls.minDistance=31;controls.maxDistance=104;
  controls.enablePan=false;controls.enableDamping=!reduced.matches;controls.dampingFactor=.08;controls.autoRotate=false;controls.update();controls.saveState();
  world.renderer.shadowMap.autoUpdate=false;world.renderer.shadowMap.needsUpdate=true;
  let target=sceneForYear(2023),current=structuredClone(target),lastTime=0,benchmarking=false,markersDirty=true,sizeDirty=false,benchmarkDpr=null,renderCount=0,effectiveDpr=dpr;
  let markerWork,motion=false,benchmarkInteraction=false,lastFrameTiming,framingSize=rect.width+'x'+rect.height;
  // Interactive anchors: a moving state shows nearest-table anchors; once it rests they are refined to exact and the
  // displayed dots (and with them labels and pool) ease over ANCHOR_EASE_MS. The canonical anchors are not eased.
  const ANCHOR_EASE_MS=150;let scrubReleased=false,anchorEase=null,refineController=null,lastAppliedRevision=null,lastStateChangeAt=0,lastInputAt=0,lastRefinement=null,anchorPreparation=null;const refinements=[];
  // A pixel-ratio change alone leaves the CSS layout and camera as they were, so marker visibility stays valid.
  const resolution=createInteractionResolution(()=>{sizeDirty=true;schedule();});
  const byId=new Map(features.map(feature=>[feature.id,feature])),markerNodes=new Map();
  const featurePeriods=filmCopy.sections.slice(2,12).flatMap((section,eraIndex)=>section.callouts.map((callout,slot)=>({featureId:callout.featureId,eraIndex,slot,calloutId:CALLOUT_IDS[eraIndex][slot]})));
  let selectedFeature=null,hoveredFeature=null,focusedFeature=null,emphasisMoving=false;
  const eraPoolIds=Array.from({length:10},(_,era)=>featurePeriods.filter(r=>r.eraIndex===era&&poolCatalog.has(r.featureId)).map(r=>r.featureId));
  const poolsResident=state=>!Number.isInteger(state.eraIndex)||eraPoolIds[state.eraIndex].every(poolCatalog.isResident);
  const ensurePools=state=>Number.isInteger(state.eraIndex)?poolCatalog.ensureAll(eraPoolIds[state.eraIndex]):Promise.resolve();
  const isResident=state=>backend.isResident(state)&&poolsResident(state),ensureState=state=>Promise.all([backend.ensureState(state),ensurePools(state)]).then(()=>{});
  const emphasis=createActiveMarkerEmphasis(world.scene,{catalog:poolCatalog,onPoolReady:()=>{markersDirty=true;schedule();},powers:Object.fromEntries(featurePeriods.map(r=>[r.featureId,CALLOUT_POWERS[r.calloutId]??0])),
    anchorFor(id){const anchor=displayMarker(id),record=markerNodes.get(id);return anchor?{...anchor,opacity:record?current.features[record.eraIndex]:0}:null;},
    visible:id=>markerNodes.get(id)?.lastVisible===true});
  function syncActive(){emphasis.setActive(selectedFeature||focusedFeature||hoveredFeature);markersDirty=true;schedule();}
  function setActiveFeature(id){selectedFeature=id;if(!id)hoveredFeature=focusedFeature=null;syncActive();}
  for(const record of featurePeriods){
    const feature=byId.get(record.featureId);if(!feature)continue;
    const button=element('button',undefined,'marker'),label=element('span',feature.title,'callout-label');label.hidden=true;
    button.append(label);button.setAttribute('aria-label',feature.title);button.dataset.featureId=feature.id;
    listen(button,'click',()=>{onMarkerInteraction();setActiveFeature(feature.id);onOpen(feature.id);});
    listen(button,'pointerenter',()=>{onMarkerInteraction();hoveredFeature=feature.id;syncActive();});listen(button,'pointerleave',()=>{if(hoveredFeature===feature.id)hoveredFeature=null;syncActive();});
    listen(button,'focus',()=>{onMarkerInteraction();focusedFeature=feature.id;syncActive();});listen(button,'blur',()=>{if(focusedFeature===feature.id)focusedFeature=null;syncActive();});
    button.hidden=true;markerHost.append(button);markerNodes.set(feature.id,{button,label,lastVisible:false,...record});
  }
  const metricsCanvas=document.createElement('canvas'),context=metricsCanvas.getContext('2d'),leaders=markerHost.querySelector('#leaders')||markerHost.appendChild(document.createElementNS('http://www.w3.org/2000/svg','svg'));leaders.id='leaders';
  // Film callout type scaled to this viewport: cap height = 32 px at 1080 (min 12 px).
  let labelMetrics,labelFont,fontMetrics;const measured=new Map();
  function setLabelMetrics(){
    labelMetrics=calloutMetrics(host.clientWidth,host.clientHeight);context.font='600 100px "Strata Sans"';
    const size=labelMetrics.cap*100/context.measureText('H').actualBoundingBoxAscent;labelFont=`600 ${size}px "Strata Sans"`;context.font=labelFont;
    const probe=context.measureText('Hg');fontMetrics={size,ascent:probe.fontBoundingBoxAscent,descent:probe.fontBoundingBoxDescent};measured.clear();
    for(const {label} of markerNodes.values()){label.style.fontSize=`${size}px`;label.style.lineHeight=`${labelMetrics.lineHeight}px`;}
  }
  function measure(text){const key=labelFont+'|'+text;if(measured.has(key))return measured.get(key);context.font=labelFont;const m=context.measureText(text),r={width:Math.max(m.width,m.actualBoundingBoxRight)+2,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent+2,ascent:m.actualBoundingBoxAscent+1};measured.set(key,r);return r;}
  // Same item geometry as the film overlay, including the label-gap inputs (em, ink line gap).
  function calloutItem(record,anchor){
    const text=record.label.dataset.text||record.label.textContent,width=line=>measure(line).width;
    // Two-word last lines ("Terracotta / ring well") where the width allows; otherwise the film's plain wrap.
    const lines=wrapText(text,labelMetrics.wrapWidth,width,{noSingleLast:true})||wrapText(text,labelMetrics.wrapWidth,width)||[record.label.textContent],sizes=lines.map(measure),lineHeight=labelMetrics.lineHeight;
    const lineGap=sizes.length>1?Math.max(...sizes.slice(1).map((size,i)=>lineHeight-(sizes[i].height-sizes[i].ascent)-size.ascent)):0;
    return {id:record.featureId,featureId:record.featureId,lines,lineHeight,em:fontMetrics.size,lineGap,ascent:Math.max(...sizes.map(s=>s.ascent)),boxWidth:Math.max(...sizes.map(s=>s.width)),boxHeight:Math.max(...sizes.map(s=>s.height))+(lines.length-1)*lineHeight,anchor};
  }
  for(const {label} of markerNodes.values())label.dataset.text=label.textContent;
  setLabelMetrics();
  const accelerator=createOcclusionClient({onTask:taskMonitor.record,displacedKind:backend.displacedKind});
  // The worker displaces the era soil from the same boundary grids pack the world loaded (now in the HTTP cache).
  if(tierWorld){await accelerator.loadStack(SITE_TIER_BASE);mark('occlusion-grids');}
  const occluders=()=>backend.occluders();progress({phase:'occlusion'});
  // Framing reference: the full pre-excavation block (largest outline of any state) at the
  // hero pose, zoom 1, rastered off-thread. Live framing is an exact similarity of it.
  const stateNote=element('p',undefined,'state-note');stateNote.setAttribute('role','status');stateNote.hidden=true;(document.querySelector('.scrubber')||host).append(stateNote);
  const gate=createResidencyGate({isResident,ensureState,onReady:()=>{markersDirty=true;world.renderer.shadowMap.needsUpdate=true;schedule();},onNote(note){
    stateNote.hidden=!note;if(note==='loading')stateNote.textContent='Loading this step…';
    else if(note==='failed'){const retry=element('button','Retry','state-retry');retry.addEventListener('click',()=>gate.retry());stateNote.replaceChildren("Couldn't load this step. ",retry);}
  }});
  const scaleBar=createSiteScaleBar(world.scene,markerHost);let scaleState=null;
  const framingStart=performance.now();
  const referenceCamera=world.camera.clone();referenceCamera.aspect=REFERENCE_SIZE.width/REFERENCE_SIZE.height;referenceCamera.zoom=1;referenceCamera.clearViewOffset();referenceCamera.updateProjectionMatrix();referenceCamera.updateMatrixWorld();
  // The shipped raster is used when it was made for this exact reference camera; otherwise (or with ?framing=live)
  // the 2013 block is applied and rastered here, which needs its step geometry before ready.
  async function liveReferenceRaster(){
    const fullBlock=stateForYear(2013);await backend.ensureState(fullBlock);backend.applyState(fullBlock,{anchors:'nearest'});const meshes=occluders();await accelerator.prepare(meshes);
    return accelerator.silhouette(meshes,{roleOf:backend.roleOf,camera:referenceCamera,...REFERENCE_SIZE,deposits:backend.appliedDeposits()});
  }
  const framingKey=referenceKey(referenceCamera,REFERENCE_SIZE),forceLiveFraming=new URLSearchParams(location.search).get('framing')==='live';
  let referenceRaster=forceLiveFraming?null:shippedReference(framingKey,shippedFraming),referenceSource='shipped';
  if(!referenceRaster){
    if(shippedFraming.rows&&!forceLiveFraming)console.warn('Shipped framing reference was made for another reference camera; rastering it live');
    referenceSource='live';referenceRaster=await liveReferenceRaster();
  }
  let framingReference=createReference(referenceRaster);
  const barCorners=[];for(const x of [scaleBar.placement.x0,scaleBar.placement.x1])for(const y of [scaleBar.placement.bottom,scaleBar.placement.top])for(const z of [scaleBar.placement.z,scaleBar.placement.zBack]){const q=new THREE.Vector3(x,y,z).project(referenceCamera);barCorners.push({x:(q.x+1)*REFERENCE_SIZE.width/2,y:(1-q.y)*REFERENCE_SIZE.height/2});}
  const barBox={x0:Math.min(...barCorners.map(p=>p.x)),x1:Math.max(...barCorners.map(p=>p.x)),y0:Math.min(...barCorners.map(p=>p.y)),y1:Math.max(...barCorners.map(p=>p.y))};
  const referenceWithBar=(k,labels)=>createReference({...referenceRaster,rows:rowsWithBar(referenceRaster,barBox,labels,k)});
  taskMonitor.record({name:'framing-reference',startTimeMs:framingStart,durationMs:performance.now()-framingStart});mark('framing-reference');
  // Exact anchors only ever arrive through an async refinement: a synchronous exact apply of a year outside the anchor
  // table can take seconds on the main thread.
  await ensureState(current);backend.applyState(current,{anchors:'nearest'});await accelerator.prepare(occluders());mark('initial-state');
  let framing=null,activeReference=framingReference;
  function scaleLabelBlock(width,height){const s=scaleBar.update(world.camera,width,height);return {gap:s.gap,cap:s.cap,halfWidth:Math.max(...s.labelWidths)/2+2};}
  function reframe(){
    const width=host.clientWidth,height=host.clientHeight;setLabelMetrics();setTitleScale(1);
    applyFraming(world.camera,null,width,height);world.camera.updateMatrixWorld();
    const labels=scaleLabelBlock(width,height);
    // Phone: the block spans ~89% of the width, centred in the band between the header and the state title; narrow
    // screens may shrink the state title (at most 20%). 24 px + safety clearance always holds.
    const fit=solveSiteFraming({width,height,referenceFor:k=>referenceWithBar(k,labels),hudFor:scale=>{setTitleScale(scale);return hudRects({worstCase:true});},metrics:labelMetrics,warn:console.warn});
    framing=fit.framing;activeReference=fit.reference??framingReference;setTitleScale(framing.feasible?framing.titleScale:1);
    applyFraming(world.camera,framing.feasible?framing:null,width,height);controls.zoom0=world.camera.zoom;world.camera.updateMatrixWorld();
    layout=null;markersDirty=true;
  }
  let layout=null;reframe();mark('reframe');
  // compileAsync links every scene material (hidden eras included) through KHR_parallel_shader_compile when the
  // driver has it, so the first render does not stall on program links. Shadow depth programs still link in it.
  if(typeof world.renderer.compileAsync==='function'){
    progress({phase:'shaders'});const compileStart=performance.now();await world.renderer.compileAsync(world.scene,world.camera);
    taskMonitor.record({name:'shader-compile-async',startTimeMs:compileStart,durationMs:performance.now()-compileStart,programs:world.renderer.info.programs?.length??null,parallel:world.renderer.extensions?.has?.('KHR_parallel_shader_compile')??null});mark('shaders');
  }
  progress({phase:'ready'});loadStatus.hidden=true;mark('ready');
  // Nearest era first from the state shown at ready; the excavation states count as the modern end.
  const poolOrigin=Number.isInteger(current.eraIndex)?current.eraIndex:9,poolOrder=[...eraPoolIds.keys()].sort((a,b)=>Math.abs(a-poolOrigin)-Math.abs(b-poolOrigin)||b-a).flatMap(era=>eraPoolIds[era]);
  const poolPrefetch=new Promise(resolve=>requestAnimationFrame(()=>resolve(poolCatalog.prefetch(poolOrder).catch(error=>console.warn('Pool prefetch stopped',error)))));
  // Lowest-priority warm of the occlusion worker: every resident cut step's displaced soil, once the pools and the
  // world's step builds are done, one mesh per idle callback. Afterwards no first query waits for a cold resolve.
  let occlusionWarm=null;const prepareController=new AbortController();
  if(tierWorld){const idleSlot=()=>new Promise(resolve=>typeof requestIdleCallback==='function'?requestIdleCallback(resolve,{timeout:4000}):setTimeout(resolve,200));
    (async()=>{
      await poolPrefetch;while(!world.metadata?.().resident?.prefetch?.finished){if(prepareController.signal.aborted)return;await new Promise(resolve=>setTimeout(resolve,500));}
      const meshes=backend.displacedMeshes(),start=performance.now();occlusionWarm={startedAtMs:+start.toFixed(1),meshes:meshes.length,warmed:0};
      for(const mesh of meshes){await idleSlot();if(prepareController.signal.aborted)return;await accelerator.warm(mesh,backend.appliedDeposits());occlusionWarm.warmed++;}
      const at=performance.now(),ready=loadTimeline.find(m=>m.name==='ready')?.atMs??null;
      occlusionWarm={...occlusionWarm,doneAtMs:+at.toFixed(1),durationMs:+(at-start).toFixed(1),readyToDoneMs:ready===null?null:+(at-ready).toFixed(1),steps:world.metadata().resident.steps.length,memory:await accelerator.memory()};
    })().catch(error=>{if(!prepareController.signal.aborted){console.warn('Occlusion warm stopped',error);occlusionWarm={...occlusionWarm,stopped:String(error?.message??error)};}});}
  // Anchor trees build in idle chunks after ready, so the first refinement after a scrub finds them prepared.
  if(backend.interactiveAnchors){const run=()=>{const start=performance.now();anchorPreparation={startedAtMs:+start.toFixed(1)};
      backend.prepareAnchors({signal:prepareController.signal}).then(result=>{anchorPreparation={...anchorPreparation,doneAtMs:+performance.now().toFixed(1),durationMs:+(performance.now()-start).toFixed(1),result:result??null};},
        error=>{if(!prepareController.signal.aborted)console.warn('Anchor preparation stopped',error);anchorPreparation={...anchorPreparation,stopped:String(error?.message??error)};});};
    if(typeof requestIdleCallback==='function')requestIdleCallback(run,{timeout:3000});else setTimeout(run,500);}
  function displayMarker(id){
    const anchor=backend.marker(id),from=anchorEase?.from.get(id);if(!from||!anchor?.visible)return anchor;
    const t=Math.min(1,(performance.now()-anchorEase.start)/ANCHOR_EASE_MS),s=t*t*(3-2*t);return {...anchor,point:anchor.point.map((v,i)=>from[i]+(v-from[i])*s)};
  }
  let refineFailures={revision:null,count:0},refineWarned=false,refineAborts=0;
  const idle=callback=>typeof requestIdleCallback==='function'?requestIdleCallback(callback,{timeout:1000}):setTimeout(callback,200);
  function stateChanged(){refineController?.abort();refineController=null;anchorEase=null;lastStateChangeAt=performance.now();}
  async function refineAnchors(){
    const controller=new AbortController(),startedAt=performance.now(),stateAt=lastStateChangeAt,revisionAt=backend.metadata().stateRevision;refineController=controller;
    const {outcome,refined,failure}=await runRefinement({refine:options=>backend.refineAnchors(options),signal:controller.signal,isCurrent:()=>refineController===controller&&backend.metadata().stateRevision===revisionAt});
    if(refineController===controller)refineController=null;if(outcome==='superseded')return;
    // No exact anchors for a current state: keep nearest, retry once when idle, then stay on nearest.
    if(outcome==='fallback'){
      if(refineFailures.revision!==revisionAt)refineFailures={revision:revisionAt,count:0};refineFailures.count++;
      if(refineFailures.count===1)idle(()=>{if(!refineController&&backend.anchorMode()==='nearest'&&backend.metadata().stateRevision===revisionAt)refineAnchors();});
      else if(!refineWarned){refineWarned=true;console.warn('Exact anchors unavailable; keeping nearest anchors',failure??'no result');}
      return;}
    const from=new Map();for(const id of markerNodes.keys()){const a=displayMarker(id);if(a?.visible)from.set(id,a.point);}
    const committed=backend.commitAnchors(refined);if(!committed)return;lastAppliedRevision=committed.stateRevision;
    const at=performance.now();let moved=0;for(const [id,p] of from){const a=backend.marker(id);if(a?.visible&&a.point.some((v,i)=>Math.abs(v-p[i])>1e-6))moved++;}
    anchorEase=moved&&!reduced.matches?{from,start:at}:null;const ease=anchorEase?ANCHOR_EASE_MS:0;
    lastRefinement={startedAtMs:+startedAt.toFixed(1),committedAtMs:+at.toFixed(1),refineMs:+(at-startedAt).toFixed(1),settledAfterStateMs:+(at-stateAt+ease).toFixed(1),lastInputAtMs:+lastInputAt.toFixed(1),easeMs:ease,moved,status:backend.anchorStatus()};
    refinements.push(lastRefinement);if(refinements.length>50)refinements.shift();markersDirty=true;schedule();
  }
  function markerPoint(record){
    const anchor=displayMarker(record.featureId);return anchor?.visible?new THREE.Vector3(...anchor.point):null;
  }
  function markerCandidate(record,workerVisible){
    const anchor=backend.markerRecord(record.featureId),point=markerPoint(record),projected=point?.clone().project(world.camera),status=markerStatus({anchor,featureOpacity:current.features[record.eraIndex],projected,workerVisible});
    return{record,point,projected,...status};
  }
  markerWork=createDeferredOcclusion({
    // Occlusion runs on exact anchors only, so it is restored together with them. It waits for active inputs and
    // motion, not for the pixel-ratio restore after them.
    blocked:()=>resolution.inputActive()||motion||benchmarkInteraction||backend.anchorMode()==='nearest',
    // Its own task, not a microtask of the frame callback that invalidated it.
    defer:run=>setTimeout(run,0),
    async query(valid,preview){
      const proxyStart=performance.now(),meshes=await backend.occludersSliced({valid});if(!meshes||!valid())return null;
      taskMonitor.record({name:'occluder-proxies',startTimeMs:proxyStart,durationMs:performance.now()-proxyStart,...backend.occluderStats()});
      const deposits=backend.appliedDeposits();await accelerator.prepare(meshes);if(!valid())return null;
      const stateRevision=backend.metadata().stateRevision,candidates=[...markerNodes.values()].map(record=>{
        const candidate=markerCandidate(record);if(!candidate.eligible)return candidate;const direction=candidate.point.clone().sub(world.camera.position);
        return {...candidate,ray:{origin:world.camera.position.toArray(),direction:direction.clone().normalize().toArray(),far:Math.max(0,direction.length()-.0001)}};
      });
      const eligible=candidates.filter(c=>c.eligible),visibility=await accelerator.query(meshes,eligible.map(c=>c.ray),{deposits});if(!valid())return null;
      let index=0;const results=candidates.map(c=>{const workerVisible=c.eligible?visibility[index++]:undefined;return{id:c.record.featureId,visible:workerVisible===true,stateRevision,...(c.eligible?markerCandidate(c.record,workerVisible):{reason:c.reason,detail:c.detail})};});
      // Dots show as soon as the ray query lands; their labels follow the outline raster.
      preview(results);
      const key=viewKey(),outline=await accelerator.silhouette(meshes,{roleOf:backend.roleOf,camera:world.camera,width:host.clientWidth,height:host.clientHeight,cell:SILHOUETTE_CELL,deposits});if(!valid())return null;
      // The outline index builds in a task of its own, apart from the layout that reads it.
      await new Promise(resolve=>setTimeout(resolve,0));if(!valid())return null;
      const buildStart=performance.now(),silhouette=silhouetteFromRows(outline.rows,outline);taskMonitor.record({name:'silhouette-build',startTimeMs:buildStart,durationMs:performance.now()-buildStart});
      await new Promise(resolve=>setTimeout(resolve,0));if(!valid())return null;
      layoutPending={key,silhouette,report:outline.report};return results;
    },
    preview(results){const start=performance.now();applyVisibility(results);placeMarkers();taskMonitor.record({name:'occlusion-visibility-apply',startTimeMs:start,durationMs:performance.now()-start});schedule();},
    commit(results){const start=performance.now();if(layoutPending){layout=layoutPending;layoutPending=null;}applyVisibility(results);placeMarkers();taskMonitor.record({name:'occlusion-apply',startTimeMs:start,durationMs:performance.now()-start});schedule();}
  });
  let dotsShown=false,labelsShown=false;
  function applyVisibility(results){if(!dotsShown&&results.some(item=>item.visible)){dotsShown=true;mark('dots-visible');}for(const item of results)Object.assign(markerNodes.get(item.id),{lastVisible:item.visible,visibilityReason:item.reason,visibilityDetail:item.detail,occlusionStateRevision:item.stateRevision});}
  let layoutPending=null,heldLabels=null,lastLayout={fresh:false,placed:[],failures:[],audit:null,hudClearances:[]};
  const viewKey=()=>[backend.metadata().stateRevision,host.clientWidth,host.clientHeight,...world.camera.projectionMatrix.elements,...world.camera.matrixWorldInverse.elements].join(',');
  function line(x1,y1,x2,y2,stroke,width){const node=document.createElementNS('http://www.w3.org/2000/svg','line');for(const [k,v] of Object.entries({x1,y1,x2,y2,stroke,'stroke-width':width,'stroke-linecap':'round'}))node.setAttribute(k,v);return node;}
  function placeMarkers(){
    const width=host.clientWidth,height=host.clientHeight,points=new Map();
    for(const record of markerNodes.values()){
      const point=markerPoint(record),projected=point?.clone().project(world.camera),visible=record.lastVisible&&!!point;
      record.labelWasShown=!record.label.hidden;record.button.hidden=!visible;record.label.hidden=true;if(!visible)continue;
      const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2;points.set(record.featureId,{x,y});
      record.button.style.left=`${x}px`;record.button.style.top=`${y}px`;
    }
    leaders.replaceChildren();
    const era=current.eraIndex,active=selectedFeature||focusedFeature||hoveredFeature,labelKey=era+':'+(active||'')+':'+width+'x'+height;
    const eraItems=Number.isInteger(era)?[...markerNodes.values()].filter(r=>r.eraIndex===era&&points.has(r.featureId)).sort((a,b)=>a.slot-b.slot).map(r=>calloutItem(r,points.get(r.featureId))):[];
    const extraRecord=active&&points.has(active)&&!eraItems.some(i=>i.featureId===active)?markerNodes.get(active):null,extra=extraRecord?calloutItem(extraRecord,points.get(active)):null;
    const previous=heldLabels?.key===labelKey?heldLabels.offsets:null;
    // Fresh labels need an outline rastered for exactly this camera/state. Until the view
    // settles (orbit, resize, scrub), labels keep their last offsets and ride with their dots.
    const fresh=!!layout&&layout.key===viewKey();
    if(!fresh){
      const held=previous?holdCallouts([...eraItems,...(extra?[extra]:[])],previous):[];drawLabels(held);
      lastLayout={fresh:false,held:held.length>0,placed:held.map(p=>({id:p.id,featureId:p.featureId,rect:p.rect,anchor:p.anchor,end:p.end,length:p.length,lines:p.lines})),failures:[],audit:null,hudClearances:[]};return;
    }
    const hud=hudRects(),scale=scaleBar.update(world.camera,width,height),scaleLabels=scale.labels.map(l=>({id:'scale:'+l.text,rect:l.rect,em:l.cap/.66,lineGap:0}));
    const result=layoutCallouts({era:eraItems,extra,silhouette:layout.silhouette,protectedRects:hud.map(h=>h.rect),scaleZones:scale.polygon?[scale.polygon]:[],scaleLabels,width,height,margin:labelMetrics.margin,previous});
    heldLabels={key:labelKey,offsets:offsetsOf(result.placed)};drawLabels(result.placed);if(!labelsShown&&result.placed.length){labelsShown=true;mark('labels-visible');}
    lastLayout={fresh:true,held:result.placed.some(p=>p.held),placed:result.placed.map(p=>({id:p.id,featureId:p.featureId,rect:p.rect,anchor:p.anchor,end:p.end,length:p.length,clearance:p.clearance,lines:p.lines,em:p.em,lineGap:p.lineGap,held:!!p.held,kind:eraItems.some(i=>i.id===p.id)?'era':'active'})),
      failures:result.failures,audit:auditCallouts(result.placed,layout.silhouette),hudClearances:hud.map(h=>({id:h.id,rect:h.rect,clearance:layout.silhouette.distanceRect(h.rect)})),scaleLabels,
      scaleLabelHudGaps:scaleLabels.flatMap(s=>hud.map(h=>({label:s.id,hud:h.id,gap:polygonDistance(rectPoints(s.rect),rectPoints(h.rect))}))),
      metrics:{...labelMetrics,fontSize:fontMetrics.size},silhouette:layout.report};
  }
  // A newly shown label and its leader fade in (opacity only, so nothing moves). Leaders are rebuilt on every
  // placement, so each rebuild resumes the fade at the time already elapsed.
  const LABEL_FADE_MS=120;
  function fadeIn(node,elapsed){for(const running of node.getAnimations?.()??[])running.cancel();const animation=node.animate?.([{opacity:0},{opacity:1}],{duration:LABEL_FADE_MS,easing:'ease-out'});if(animation)animation.currentTime=elapsed;}
  function drawLabels(placedLabels){
    const halfLeading=(labelMetrics.lineHeight-fontMetrics.ascent-fontMetrics.descent)/2,now=performance.now();
    for(const placed of placedLabels){
      const record=markerNodes.get(placed.featureId),half=record.button.offsetWidth/2;
      record.label.textContent=placed.lines.join('\n');record.label.hidden=false;
      record.label.style.left=`${placed.rect.x+1-placed.anchor.x+half}px`;record.label.style.top=`${placed.rect.y+placed.ascent-halfLeading-fontMetrics.ascent-placed.anchor.y+half}px`;
      const lines=[line(placed.end.x,placed.end.y,placed.anchor.x,placed.anchor.y,'#101212',3),line(placed.end.x,placed.end.y,placed.anchor.x,placed.anchor.y,'#d0c5ae',1)];leaders.append(...lines);
      if(!record.labelWasShown)record.labelShownAt=now;const elapsed=now-(record.labelShownAt??-Infinity);
      if(elapsed<LABEL_FADE_MS&&!reduced.matches){if(!record.labelWasShown)fadeIn(record.label,0);for(const node of lines)fadeIn(node,elapsed);}
    }
  }
  function render(dt=1/60){
    const start=performance.now();
    if(sizeDirty){
      effectiveDpr=resolution.ratio(Math.min(cappedPixelRatio(benchmarkDpr??devicePixelRatio),diagnostic.dprCap??Infinity));
      const width=Math.round(host.clientWidth*effectiveDpr),height=Math.round(host.clientHeight*effectiveDpr);
      if(canvas.width!==width||canvas.height!==height)world.renderer.setSize(width,height,false);
      if(framingSize!==host.clientWidth+'x'+host.clientHeight){framingSize=host.clientWidth+'x'+host.clientHeight;reframe();markersDirty=true;}
      world.camera.aspect=host.clientWidth/host.clientHeight;world.camera.updateProjectionMatrix();sizeDirty=false;
    }
    if(gate.check(current)){const applied=backend.applyState(current,{anchors:'nearest'});if(applied.stateRevision!==lastAppliedRevision){lastAppliedRevision=applied.stateRevision;stateChanged();}}
    scaleState=scaleBar.update(world.camera,host.clientWidth,host.clientHeight);
    if(markersDirty){placeMarkers();markerWork.invalidate();markersDirty=false;}
    emphasisMoving=emphasis.update(dt,{immediate:reduced.matches});
    world.renderer.info.reset();world.renderer.autoClear=true;const submitStart=performance.now();world.renderer.render(world.scene,world.camera);const submitMs=performance.now()-submitStart;
    if(renderCount===0){taskMonitor.record({name:'first-render',startTimeMs:submitStart,durationMs:submitMs,programs:world.renderer.info.programs?.length??null});mark('first-render');
      // The next frame callback runs after the first rendered frame has been handed to the compositor.
      requestAnimationFrame(()=>{mark('first-presented');const poster=document.querySelector('#scene-poster');if(poster){poster.classList.add('gone');setTimeout(()=>poster.remove(),400);}});}
    renderCount++;
    markerWork.update();lastFrameTiming={renderSubmitMs:submitMs,jsMs:performance.now()-start-submitMs};
    return lastFrameTiming;
  }
  function schedule(){scheduler.invalidate();}
  function frame(timestamp){
    const dt=lastTime?Math.min(.1,(timestamp-lastTime)/1000):1/60;lastTime=timestamp;
    let moving=false;
    // A timeline drag drives the state directly (and its release lands exactly), so the exact anchors can settle as
    // soon as the pointer stops; the 90 ms ease is for jumps (season stops, keys, clicks).
    const direct=resolution.isActive('scrub')||scrubReleased;scrubReleased=false;
    const blend=reduced.matches||direct?1:1-Math.exp(-dt/.09);
    for(const key of ['deposits','features'])for(let i=0;i<10;i++){const delta=target[key][i]-current[key][i];if(Math.abs(delta)>.0005)moving=true;current[key][i]=Math.abs(delta)<.0005?target[key][i]:current[key][i]+delta*blend;}
    const delta=target.excavation-current.excavation;if(Math.abs(delta)>.0005)moving=true;
    current.excavation=Math.abs(delta)<.0005?target.excavation:current.excavation+delta*blend;current.eraIndex=target.eraIndex;
    if(moving){world.renderer.shadowMap.needsUpdate=true;markersDirty=true;}
    const easing=!!anchorEase&&performance.now()-anchorEase.start<ANCHOR_EASE_MS;if(anchorEase){markersDirty=true;if(!easing)anchorEase=null;}
    const orbitMoving=controls.update();motion=moving||orbitMoving||easing;render(dt);if(motion||emphasisMoving)schedule();
    // Refinement yields in slices that can run back to back without a render, so it starts only once the state and
    // the camera (orbit input and damping) are both at rest.
    if(!moving&&!orbitMoving&&!resolution.isActive('orbit')&&!refineController&&backend.anchorMode()==='nearest'&&refineFailures.revision!==backend.metadata().stateRevision)refineAnchors();
  }
  const scheduler=createDemandScheduler(frame);
  listen(controls,'change',()=>{markersDirty=true;schedule();});
  // Camera input aborts a running refinement; frame() restarts it once the camera is at rest (the anchor trees stay
  // prepared), so its back-to-back scheduler.yield chunks never hold a frame while the view moves.
  listen(controls,'start',()=>{resolution.begin('orbit');if(refineController){refineController.abort();refineController=null;refineAborts++;}});
  listen(controls,'end',()=>resolution.end('orbit'));
  listen(canvas,'dblclick',()=>{controls.reset();schedule();});
  // preventDefault keeps the context restorable; the page offers a reload rather than rebuilding the world.
  let contextLost=false;
  listen(canvas,'webglcontextlost',event=>{event.preventDefault();if(contextLost)return;contextLost=true;scheduler.pause();refineController?.abort();markerHost.hidden=true;onContextLost();});
  listen(reduced,'change',()=>{controls.enableDamping=!reduced.matches;current=structuredClone(target);world.renderer.shadowMap.needsUpdate=true;schedule();});
  function resize(pixelRatio){
    if(pixelRatio!==undefined)benchmarkDpr=pixelRatio;
    sizeDirty=true;markersDirty=true;schedule();
  }
  listen(window,'resize',()=>resize());
  const {backend:warmBackend,warmState}=selectWarmBackend(world);
  const warming=new Promise((resolve,reject)=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
    // The provider prefetches non-resident packs itself; warming them here would throw SiteStateNotResident.
    warmExcavationStates(state=>backend.isResident(state)?warmState(state):null,{onTask:taskMonitor.record}).then(resolve,reject);
  })));
  warming.catch(error=>console.error('Excavation warming failed',error));
  const percentile=(values,fraction)=>[...values].sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*fraction)-1)];
  return {
    setYear(year,instant=false){gate.retry();target=sceneForYear(year);if(instant||reduced.matches)current=structuredClone(target);markersDirty=true;world.renderer.shadowMap.needsUpdate=true;schedule();},
    setActiveFeature,
    // Rasters the 2013 reference live and frames the current viewport with it and with the reference in use;
    // displacementPx is the largest gap between the two framed block silhouettes.
    async verifyFraming(){
      scheduler.pause();const used={raster:referenceRaster,reference:framingReference};
      const snapshot=()=>{if(!framing?.feasible)throw new Error('Framing infeasible: '+framing?.reason);return {k:framing.k,centre:{...framing.centre},mode:framing.mode};};
      try{
        const live=await liveReferenceRaster();await ensureState(current);backend.applyState(current,{anchors:'nearest'});await accelerator.prepare(occluders());markerWork?.invalidate();
        reframe();const a={...used,framing:snapshot()};
        referenceRaster=live;framingReference=createReference(live);reframe();const b={raster:live,reference:framingReference,framing:snapshot()};
        return {width:host.clientWidth,height:host.clientHeight,source:referenceSource,key:framingKey,rowsEqual:rowsEqual(used.raster,live),displacementPx:silhouetteDisplacement(a,b),
          framingInUse:a.framing,framingLive:b.framing,liveRecord:referenceRecord(framingKey,live,'sceneForYear(2013) rastered live at the hero pose')};
      }finally{referenceRaster=used.raster;framingReference=used.reference;reframe();markersDirty=true;world.renderer.shadowMap.needsUpdate=true;scheduler.resume();schedule();}
    },
    markerReport(){return [...markerNodes.values()].map(record=>{const fresh=record.occlusionStateRevision===backend.metadata().stateRevision,c=markerCandidate(record,fresh?record.lastVisible:undefined),point=c.projected?{x:(c.projected.x+1)*host.clientWidth/2,y:(1-c.projected.y)*host.clientHeight/2,z:c.projected.z}:null;return{featureId:record.featureId,title:record.label.textContent,visible:!record.button.hidden,reason:c.reason,detail:c.detail,nativeAnchor:backend.markerRecord(record.featureId),projectedCSS:point,featureOpacity:current.features[record.eraIndex],workerStateRevision:record.occlusionStateRevision??null,currentStateRevision:backend.metadata().stateRevision,workerFresh:fresh,labelVisible:!record.button.hidden&&!record.label.hidden};});},
    beginInteraction:source=>{lastInputAt=performance.now();resolution.begin(source);},endInteraction:source=>{lastInputAt=performance.now();if(source==='scrub'&&resolution.isActive('scrub'))scrubReleased=true;resolution.end(source);schedule();},pulseInteraction:()=>{lastInputAt=performance.now();resolution.pulse();},invalidate:schedule,
    reset(){controls.reset();schedule();},
    // Drawing buffer, MSAA samples and the memory profile (phone VSM size) as the world built them.
    device:()=>world.device?.()??null,
    // Tracked GPU memory: every geometry buffer and texture the scene holds (resident steps included, so an upper
    // bound once uploads are warm), the VSM shadow targets and the default framebuffer; renderer.info alongside.
    gpuMemory(){
      const arrays=new Map(),textures=new Map(),mipmapped=t=>t.generateMipmaps&&![THREE.NearestFilter,THREE.LinearFilter].includes(t.minFilter);
      const texture=t=>{if(!t?.isTexture||textures.has(t))return;const image=t.image;textures.set(t,image?.data?.byteLength??(image?.width&&image?.height?image.width*image.height*4*(mipmapped(t)?4/3:1):0));};
      world.scene.traverse(node=>{if(!node.geometry)return;const g=node.geometry;for(const a of [...Object.values(g.attributes),g.index])if(a){const array=a.isInterleavedBufferAttribute?a.data.array:a.array;arrays.set(array,array.byteLength);}
        for(const m of [node.material].flat().filter(Boolean)){for(const v of Object.values(m))texture(v);for(const u of [...Object.values(m.uniforms??{}),...Object.values(m.userData?.siteUniforms??{})])texture(u?.value);}});
      const d=world.device?.()??{},[w,h]=d.drawingBuffer??[canvas.width,canvas.height],samples=d.samples??0,map=d.memoryProfile?.shadowMapSize??2048;
      const sum=m=>[...m.values()].reduce((s,b)=>s+b,0),geometryBytes=sum(arrays),textureBytes=Math.round(sum(textures)),shadowBytes=map*map*16,framebufferBytes=w*h*8*Math.max(1,samples)+w*h*4;
      const totalBytes=geometryBytes+textureBytes+shadowBytes+framebufferBytes;
      return {geometryBytes,textureBytes,textureCount:textures.size,shadowBytes,framebufferBytes,drawingBuffer:[w,h],samples,totalBytes,totalMB:+(totalBytes/1048576).toFixed(1),info:{...world.renderer.info.memory,programs:world.renderer.info.programs?.length??null}};
    },
    // Outline raster cost against its cell size, and how far the label layout moves from the cell-1 raster.
    async silhouetteStudy({cells=[1,2,3,4,6,8],repeats=3}={}){
      const meshes=backend.occluders(),deposits=backend.appliedDeposits(),width=host.clientWidth,height=host.clientHeight,saved={layout,heldLabels},results=[];await accelerator.prepare(meshes);
      try{
        for(const cell of cells){
          const times=[];let outline;for(let i=0;i<repeats;i++){const start=performance.now();outline=await accelerator.silhouette(meshes,{roleOf:backend.roleOf,camera:world.camera,width,height,cell,deposits});times.push(performance.now()-start);}
          const buildStart=performance.now(),silhouette=silhouetteFromRows(outline.rows,outline),buildMs=performance.now()-buildStart;
          layout={key:viewKey(),silhouette,report:outline.report};heldLabels=null;const layoutStart=performance.now();placeMarkers();const layoutMs=performance.now()-layoutStart;
          results.push({cell,roundTripMs:times.map(t=>+t.toFixed(1)),medianMs:+[...times].sort((a,b)=>a-b)[Math.floor(times.length/2)].toFixed(1),buildMs:+buildMs.toFixed(1),layoutMs:+layoutMs.toFixed(1),placed:lastLayout.placed.map(p=>({id:p.id,rect:p.rect,anchor:p.anchor,end:p.end})),failures:lastLayout.failures?.length??0});
        }
      }finally{layout=saved.layout;heldLabels=saved.heldLabels;markersDirty=true;schedule();}
      const base=results[0],moved=r=>{let max=0,missing=0;for(const p of base.placed){const q=r.placed.find(x=>x.id===p.id);if(!q){missing++;continue;}max=Math.max(max,...['x','y'].map(k=>Math.abs(p.rect[k]-q.rect[k])),...['x','y'].map(k=>Math.abs(p.end[k]-q.end[k])));}return {maxShiftPx:+max.toFixed(2),missing,extra:r.placed.filter(q=>!base.placed.some(p=>p.id===q.id)).length};};
      return {width,height,baselineCell:base.cell,labels:base.placed.length,results:results.map(({placed,...r})=>({...r,...moved({placed})}))};
    },
    metadata(){return {...backend.metadata(),contextLost,loadPhase,loadTimeline:[...loadTimeline],pools:poolCatalog.metadata(),programs:world.renderer.info.programs?.length??null,residency:gate.metadata(),emphasis:{...emphasis.metadata(),calibrationStatus:CALIBRATION_STATUS,siteVisualReview:'Pending P2 tier'},anchors:{interactive:backend.interactiveAnchors,mode:backend.anchorMode(),refining:!!refineController,refineFailures:{...refineFailures},refineAbortsByCamera:refineAborts,occlusionWarm:tierWorld?occlusionWarm:'n/a (native world)',easing:!!anchorEase,preparation:anchorPreparation,lastRefinement,refinements:[...refinements],applies:backend.applyReport(),status:backend.anchorStatus()},hasReconstructionOutline:false,renderOnDemand:true,renderCount,devicePixelRatio:devicePixelRatio||1,maxPixelRatio:MAX_PIXEL_RATIO,effectiveDpr,scheduler:scheduler.metadata(),resolution:resolution.metadata(),occlusion:{...markerWork.metadata(),...accelerator.metadata()},lastFrameTiming,warmBackend,warmCacheCapacity:warmBackend==='scene-kit'?4:null,taskReport:taskMonitor.report(),capHeightCSSPixels:labelMetrics.cap,maximumLabelCount:3,layout:lastLayout,scaleBar:scaleBar.metadata(),framing:{...framing,reference:{bounds:framingReference.bounds,barBox,...REFERENCE_SIZE,state:'sceneForYear(2013), full pre-excavation block',source:referenceSource,shippedKeyMatches:shippedFraming.key===framingKey}},camera:{zoom:world.camera.zoom,viewOffset:world.camera.view?{x:world.camera.view.offsetX,y:world.camera.view.offsetY}:null,heroAzimuthDegrees:35,azimuthRangeDegrees:[-45,115],polarRangeDegrees:[20,85],distanceMetres:[31,104]},yearInterpolationNote:'Modern-fill progress between 1800 and 2013 is an S1 control interpolation, not an archaeological date range.'};},
    dispose(){scheduler.pause();refineController?.abort();prepareController.abort();for(const remove of listeners)remove();markerWork.invalidate();accelerator.dispose();emphasis.dispose();poolCatalog.dispose();backend.dispose();controls.dispose();taskMonitor.dispose();for(const record of markerNodes.values())record.button.remove();scaleBar.dispose();loadStatus.remove();stateNote.remove();backdropCanvas?.remove();},
    async benchmark({frames=120,warmup=20,dpr=1,pauseAfter=false,mode='static',interactionRatio}={}){
      const warmTasks=await warming;
      if(!['static','orbit','scrub'].includes(mode))throw new Error('Unknown benchmark mode');
      if(benchmarking)throw new Error('Benchmark already running');benchmarking=true;scheduler.pause();
      const saved={current:structuredClone(current),target:structuredClone(target),position:world.camera.position.clone(),quaternion:world.camera.quaternion.clone(),targetPoint:controls.target.clone()};
      const offset=saved.position.clone().sub(controls.target);
      benchmarkInteraction=mode!=='static';motion=false;
      const queriesBefore=accelerator.metadata().queries;
      if(interactionRatio!==undefined)resolution.setInteractionRatio(interactionRatio);
      if(benchmarkInteraction)resolution.begin('benchmark');
      resize(dpr);const intervals=[],submit=[],js=[],mainThread=[];let previous,firstTimestamp=null;
      try{
        await new Promise(resolve=>{let index=-warmup;function tick(timestamp){
          if(index>=0&&previous!==undefined)intervals.push(timestamp-previous);if(index===0)firstTimestamp=timestamp;previous=timestamp;const start=performance.now();
          if(mode==='orbit'){world.camera.position.copy(offset).applyAxisAngle(new THREE.Vector3(0,1,0),Math.sin((index+warmup)*.025)*.04).add(controls.target);world.camera.lookAt(controls.target);world.camera.updateMatrixWorld();markersDirty=true;}
          if(mode==='scrub'){current=sceneForYear(-539+2562*((index+warmup)%90)/89);world.renderer.shadowMap.needsUpdate=true;markersDirty=true;}
          const timing=render();if(index>=0){submit.push(timing.renderSubmitMs);mainThread.push(performance.now()-start);js.push(mainThread.at(-1)-timing.renderSubmitMs);}index++;if(index<frames)requestAnimationFrame(tick);else resolve();
        }requestAnimationFrame(tick);});
        return {frames,width:host.clientWidth,height:host.clientHeight,dpr,effectiveDpr,mode,interactionRatio:resolution.metadata().interactionPixelRatio,firstFrameTimestampMs:firstTimestamp,gpuIdentity,diagnosticReport,visibilityState:document.visibilityState,p50FrameMs:percentile(intervals,.5),p95FrameMs:percentile(intervals,.95),p50SubmitMs:percentile(submit,.5),p95SubmitMs:percentile(submit,.95),p95JsMs:percentile(js,.95),p95MainThreadMs:percentile(mainThread,.95),rawFrameMs:intervals,rawSubmitMs:submit,rawJsMs:js,rawMainThreadMs:mainThread,occlusionRaysDuringBenchmark:accelerator.metadata().queries-queriesBefore,targetP95Ms:16.7,passes:percentile(intervals,.95)<=16.7,warmBackend,warmTasks,...taskMonitor.report(),caveat:'rAF intervals are not GPU timer queries. JS excludes renderer.render; render-submit includes CPU/driver work, not isolated GPU execution. Interactive frames project markers but launch no occlusion rays. Scrub refreshes existing shadows; geometry/materials unchanged.'};
      }finally{
        current=saved.current;target=saved.target;world.camera.position.copy(saved.position);world.camera.quaternion.copy(saved.quaternion);controls.target.copy(saved.targetPoint);world.camera.updateMatrixWorld();markersDirty=true;world.renderer.shadowMap.needsUpdate=true;
        if(mode!=='static')resolution.end('benchmark',0);if(interactionRatio!==undefined)resolution.setInteractionRatio(undefined);benchmarkInteraction=false;motion=false;benchmarkDpr=null;benchmarking=false;resize();if(!pauseAfter)scheduler.resume();
      }
    }
  };
}
