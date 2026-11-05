'use strict';
// CPU-only audit of native r2b geometry, not callout/anchor visibility.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {loadCpuWorld}=require('./cpu-world.cjs'),{auditSourceManifest}=require('./audit-manifest.cjs');
const ERA_IDS=['pre-mauryan','mauryan','sunga','kushan','gupta','post-gupta','rajput','sultanate','mughal','modern-fill'];
const EXITS=[8,7.85,7.66,7.43,7.15,6.83,6.45,6,5.45,4.8];
function timingViolation(era,frame){if(frame>=120&&frame<240)return frame/30>=EXITS[era]?'after-rewind-exit':null;if(frame>=240&&frame<255+era*120)return'before-feature-rise';return null;}
function assertDugIn(report){const flags=report.flags.filter(f=>f.kind==='dug-in-above-active-top');if(flags.length)throw new Error('Dug-in geometry above active top: '+flags.map(f=>`${f.key} ${f.maximumHeightMetres.toFixed(4)}m`).join(', '));}
// Height reference for a dug-in vertex. A flush item laid in an open channel (its record has
// surfacePlane, today only the drain) is measured against the deposit surface the channel is
// cut into: base + deposit x (surfacePlane(x,z) - base), base = the era's base boundary.
// Inside the channel the active top is the channel floor, so it would read the tiles as proud.
// Computed from the record data here, independent of the model's own dugThreshold.
const DUG_IN_LIMIT_METRES=.02;
function dugReferenceY(x,z,{surfacePlane,baseAt,deposit,activeTopAt}){
 if(!surfacePlane)return activeTopAt(x,z);
 const base=baseAt(x,z),d=Math.max(0,Math.min(1,Number.isFinite(deposit)?deposit:0));
 return base+d*(surfacePlane.at(x,z)-base);
}
// Largest height of the given world points [x,y,z] above their reference, and whether it breaks the 2 cm limit.
function dugInHeight(points,reference){let max=-Infinity;for(const [x,y,z] of points)max=Math.max(max,y-dugReferenceY(x,z,reference));return {maximumHeightMetres:max,proud:max>DUG_IN_LIMIT_METRES+1e-7};}
function ranges(frames){const out=[];for(const f of frames){const last=out.at(-1);if(last&&f===last[1]+1)last[1]=f;else out.push([f,f]);}return out;}
function createWorldVertexCache(THREE){
 const cache=new WeakMap(),point=new THREE.Vector3();
 return mesh=>{const g=mesh.geometry,matrixKey=mesh.matrixWorld.elements.join(',');let c=cache.get(g);if(c?.matrixKey===matrixKey)return c;const a=g.attributes.position,index=g.index,vertices=new Float64Array(a.count*3);for(let i=0;i<a.count;i++){point.fromBufferAttribute(a,i).applyMatrix4(mesh.matrixWorld);vertices.set(point.toArray(),i*3);}c={vertices,index,normal:g.attributes.normal,matrixKey};cache.set(g,c);return c;};
}
function summarize(report){
 const groups=new Map();for(const part of report.parts){let row=groups.get(part.featureId);if(!row){row={featureId:part.featureId,era:part.era,parts:[],firstVisibleFrame:null,lastVisibleFrame:null,sections:{}};groups.set(part.featureId,row);}row.parts.push(part.part);if(part.firstVisibleFrame!==null)row.firstVisibleFrame=row.firstVisibleFrame===null?part.firstVisibleFrame:Math.min(row.firstVisibleFrame,part.firstVisibleFrame);if(part.lastVisibleFrame!==null)row.lastVisibleFrame=row.lastVisibleFrame===null?part.lastVisibleFrame:Math.max(row.lastVisibleFrame,part.lastVisibleFrame);
  for(const [id,s]of Object.entries(part.sections)){const old=row.sections[id]??={maximumHeightMetres:null,maximumHeightFrame:null,maximumHeightPart:null,firstVisibleFrame:null,lastVisibleFrame:null};if(s.maximumHeightMetres!==null&&(old.maximumHeightMetres===null||s.maximumHeightMetres>old.maximumHeightMetres)){old.maximumHeightMetres=s.maximumHeightMetres;old.maximumHeightFrame=s.maximumHeightFrame;old.maximumHeightPart=part.part;}if(s.visibleFirstFrame!==null)old.firstVisibleFrame=old.firstVisibleFrame===null?s.visibleFirstFrame:Math.min(old.firstVisibleFrame,s.visibleFirstFrame);if(s.visibleLastFrame!==null)old.lastVisibleFrame=old.lastVisibleFrame===null?s.visibleLastFrame:Math.max(old.lastVisibleFrame,s.visibleLastFrame);}
 }
 report.features=[...groups.values()];report.summary={frames:report.framesAudited,featureIDs:report.features.length,parts:report.parts.length,flaggedFeatureIDs:[...new Set(report.flags.map(f=>f.featureId))],flaggedParts:[...new Set(report.flags.map(f=>f.key))].length,flagCount:report.flags.length,expectedBuiltParts:report.builtFeaturesExpectedAboveTop.length};
 report.coverageNotes=['Every native kit feature/part and all six ring parts are included exactly once. Legacy r2b builds scene-level rings; M2 uses its revealable site items and never adds duplicate always-visible rings.','Controlled-pit/trench voids are subtractive soil volumes, not independent feature meshes; their interfaces are represented by the soil/cut model used for exposure, not assigned an invented historical era.','First/last visibility means an exposed in-frame vertex witness; the method field explicitly states the sub-triangle/feature-occlusion limitations. Negative results are not an exact pixel-level absence certificate.'];
 return report;
}
async function audit({tree,frames=Array.from({length:1800},(_,i)=>i),onProgress=()=>{}}){
 const started=Date.now(),before=auditSourceManifest(tree),world=await loadCpuWorld(tree),THREE=world.THREE;
 const stackModule=await import(pathToFileURL(path.join(tree,'src/eras/stack.js')).href),sampleTop=(x,z)=>stackModule.sampleGrid(world.features.stack,world.features.activeTop,x,z);
 const parts=world.features.items.map(it=>({key:it.key,id:it.featureId,part:it.part,era:it.era,rule:it.rule,dugIn:it.rule==='opening'||it.featureId==='mauryan-drain',surfacePlane:it.record?.surfacePlane??null,object:it.handle.object}));
 const grids=world.features.stack.grids;if(parts.some(p=>p.surfacePlane)&&!grids)throw new Error('Stack boundary grids missing for surface-plane reference');
 for(const m of world.scene.children.filter(m=>m.name.startsWith('ring-')))parts.push({key:'mauryan-ring-well:'+m.name.slice(5),id:'mauryan-ring-well',part:m.name.slice(5),era:1,rule:'well-lining',dugIn:true,object:m});
 const rows=parts.map(p=>({key:p.key,featureId:p.id,part:p.part,era:ERA_IDS[p.era],rule:p.rule,dugIn:p.dugIn,heightReference:p.dugIn&&p.surfacePlane?'deposit surface the channel is cut into (record surfacePlane)':'active top',expected:{featureRiseFrame:255+p.era*120,featureRiseSeconds:8.5+p.era*4,rewindExitSeconds:EXITS[p.era],coldOpenAndExcavationAllowed:true,olderFeaturesMayRemainExposedAfterTheirEra:true},visibleFrames:[],sections:{},early:[],late:[],proud:[]}));
 const data=createWorldVertexCache(THREE),point=new THREE.Vector3(),normal=new THREE.Vector3(),projected=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
 function inside(p){projected.copy(p).project(world.camera);return Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1&&Math.abs(projected.z)<=1;}
 function soilBlocks(p){const eye=world.camera.position,dx=eye.x-p.x,dy=eye.y-p.y,dz=eye.z-p.z,len=Math.hypot(dx,dy,dz);for(let t=.001;t<len;){const x=p.x+dx*t/len,y=p.y+dy*t/len,z=p.z+dz*t/len;if(x< -12||x>12||z< -8||z>8)return false;if(world.features.soilAt(x,y-.0001,z))return true;t+=Math.max(.005,(y-sampleTop(x,z))/3);}return false;}
 try{for(const frame of frames){
  const {state}=world.apply(frame);for(let j=0;j<parts.length;j++){
   const part=parts[j],row=rows[j],meshes=part.object.isMesh?[part.object]:part.object.children;let visible=false,maxHeight=-Infinity,witness=null,peak=null,exposure=null;
   const reference=part.dugIn&&part.surfacePlane?{surfacePlane:part.surfacePlane,baseAt:(x,z)=>stackModule.sampleGrid(world.features.stack,grids[part.era],x,z),deposit:state.scene.deposits[part.era],activeTopAt:sampleTop}:{activeTopAt:sampleTop};
   for(const mesh of meshes){if(!mesh.visible||!mesh.material.visible||mesh.material.opacity===0)continue;const d=data(mesh),start=mesh.geometry.drawRange.start||0,end=Math.min(d.index?.count??d.vertices.length/3,start+mesh.geometry.drawRange.count);normalMatrix.getNormalMatrix(mesh.matrixWorld);
    for(let k=start;k<end;k++){
     const v=d.index?d.index.getX(k):k,at=v*3;point.set(d.vertices[at],d.vertices[at+1],d.vertices[at+2]);if(!inside(point))continue;const h=point.y-dugReferenceY(point.x,point.z,reference);if(h>maxHeight){maxHeight=h;peak=point.toArray();}
     if(visible)continue;
     if(d.normal)normal.fromBufferAttribute(d.normal,v).applyMatrix3(normalMatrix).normalize();else normal.set(0,1,0);
     if(normal.dot(world.camera.position.clone().sub(point))<=0&&mesh.material.side!==THREE.DoubleSide)continue;
     point.addScaledVector(normal,.0002);
     if(world.features.soilAt(point.x,point.y,point.z)||soilBlocks(point))continue;
     visible=true;witness=point.toArray();exposure=h>0?'above-active-top':'exposed-face-or-floor';
    }
   }
   let section=row.sections[state.section.id];if(!section)section=row.sections[state.section.id]={maximumHeightMetres:null,maximumHeightFrame:null,visibleFirstFrame:null,visibleLastFrame:null,visibleFrames:0};
   if(Number.isFinite(maxHeight)&&(section.maximumHeightMetres===null||maxHeight>section.maximumHeightMetres)){section.maximumHeightMetres=maxHeight;section.maximumHeightFrame=frame;section.maximumHeightPoint=peak;}
   if(visible){row.visibleFrames.push(frame);section.visibleFrames++;section.visibleFirstFrame??=frame;section.visibleLastFrame=frame;row.firstVisibleWitness??={frame,point:witness,exposure};const violation=timingViolation(part.era,frame);if(violation==='before-feature-rise')row.early.push(frame);if(violation==='after-rewind-exit')row.late.push(frame);}
   if(part.dugIn&&visible&&maxHeight>DUG_IN_LIMIT_METRES+1e-7)row.proud.push(frame);
  }if(frame%150===0)onProgress(frame);
 }}finally{await world.close();}
 const flags=[];for(const row of rows){row.firstVisibleFrame=row.visibleFrames[0]??null;row.lastVisibleFrame=row.visibleFrames.at(-1)??null;row.visibleRanges=ranges(row.visibleFrames);row.visibleFrameCount=row.visibleFrames.length;for(const [field,kind]of[['early','before-feature-rise'],['late','after-rewind-exit'],['proud','dug-in-above-active-top']])if(row[field].length)flags.push({key:row.key,featureId:row.featureId,part:row.part,kind,frames:ranges(row[field]),count:row[field].length,maximumHeightMetres:Math.max(...Object.values(row.sections).map(s=>s.maximumHeightMetres??-Infinity))});delete row.visibleFrames;delete row.early;delete row.late;delete row.proud;}
 const after=auditSourceManifest(tree);if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Audit source changed during run');
 return summarize({schemaVersion:1,cpuOnly:true,browserContexts:0,webglContexts:0,root:tree,framesAudited:frames.length,elapsedSeconds:(Date.now()-started)/1000,timingContract:'output/review/film-timing.md v1.3',sourceHashes:before,sourceConsistent:true,method:{state:'Same loadCpuWorld/apply(frame) as anchor-audit; native displayed draw ranges/cuts and current world matrices, actual film camera, bilinear activeTop grid; all six ring parts included once through native site items or legacy scene fallback.',height:'Maximum of all displayed in-frame native vertices relative to local uncut active top, not lowered excavation floor. Flush items in an open channel (record surfacePlane) are measured against base + deposits[era] x (surfacePlane - base), the deposit surface the channel is cut into.',visibility:'In-frame camera-facing native vertex witnesses, offset0.2mm along normal, soilAt and adaptive camera-ray soil steps of at least5mm. This is an exhaustive vertex witness audit, not a GPU pixel-coverage proof; sub-triangle-only slivers and occlusion by other features are not certified.',thresholdMetres:.02,temporalExceptions:'Cold open/excavation/end card allow old features. Rewind stops at deposit exit. Growth begins at era start+0.5s; later exposed earlier-era geometry is allowed.'},parts:rows,flags,builtFeaturesExpectedAboveTop:rows.filter(r=>r.rule==='wall').map(r=>({key:r.key,era:r.era,sections:Object.fromEntries(Object.entries(r.sections).filter(([,v])=>(v.maximumHeightMetres??0)>0))}))});
}
if(require.main===module){const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1],root=path.resolve(__dirname,'../..'),tree=path.resolve(args.includes('--root')?get('--root'):path.join(root,'output/film/f2/preflight-m1-r2b/source')),out=path.resolve(args.includes('--out')?get('--out'):path.join(root,'output/film/f2/feature-timing-audit.json'));if(fs.existsSync(out))throw new Error('Preserve completed audit');const frames=args.includes('--frames')?get('--frames').split(',').map(Number):undefined;audit({tree,frames,onProgress:f=>console.log('Feature audit '+f+'/1800')}).then(report=>{fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({out,frames:report.framesAudited,flags:report.flags}));if(args.includes('--strict'))assertDugIn(report);}).catch(e=>{console.error(e);process.exitCode=1;});}
module.exports={audit,timingViolation,assertDugIn,summarize,createWorldVertexCache,dugReferenceY,dugInHeight,DUG_IN_LIMIT_METRES};
