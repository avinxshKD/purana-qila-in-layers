import {createLookWorld} from '../museum-scene.js';
import {loadLabelFont} from '../labels.js';
import {filmState} from './timeline.js';
import {createFilmBackend} from './backend.js';
import {applyCamera} from './camera.js';
import {createFilmOverlays} from './overlays.js';
import {sceneFraming,projectPoint} from './framing.js';
import {createAuditGeometryAdapter} from './audit-geometry.js';
import {createFilmEmphasis} from './emphasis-film.js';
import {featureMaskWeights} from './emphasis.js';
import * as THREE from 'three';
import copy from '../../reference/film-callouts.json';
await loadLabelFont();
const canvas=document.querySelector('canvas'),width=1920,height=1080;
const mode=new URLSearchParams(location.search).get('backend')||'a3';
const world=createLookWorld(canvas,{width,height,antialias:true,preserve:true,view:'turntable',shadow:'vsm',soil:mode==='m1'?'eras':'look'});
const backend=createFilmBackend(world,mode),overlays=createFilmOverlays(width,height,world.camera);
// ?callouts=track reads the pinned CPU callout track (F3); the default solves each frame.
let calloutTrack=null,calloutTrackSHA256=null;
if(new URLSearchParams(location.search).get('callouts')==='track'){
  const response=await fetch(new URL('./callout-track.json',import.meta.url));if(!response.ok)throw new Error('Callout track missing');
  const bytes=await response.arrayBuffer();calloutTrackSHA256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
  calloutTrack=JSON.parse(new TextDecoder().decode(bytes));if(!calloutTrack.frames)throw new Error('Callout track is missing its frames');
}
if(mode==='m1'&&typeof world.eraDisplacement?.resolve!=='function')throw new Error('M1 needs its validated CPU displacement export');
const auditGeometry=createAuditGeometryAdapter((mesh,state)=>mode==='m1'?world.eraDisplacement.resolve(mesh,state):null);
const emphasis=mode==='m1'&&new URLSearchParams(location.search).get('emphasis')!=='absent'?await createFilmEmphasis(world,copy):null;
let lastPrepared=null;
function visibleMeshes(){
  const result=[];
  function visit(object,visible=true,role=''){
    visible=visible&&object.visible;if(!visible)return;role=object.userData.sectionRole||role;
    if(object.isMesh&&role!=='ground')result.push(object);
    for(const child of object.children)visit(child,visible,role);
  }visit(world.scene);return result;
}
function prepare(seconds,{audit=true}={}){
  const state=filmState(seconds),applied=backend.apply(state),pose={...applyCamera(world.camera,state.seconds,backend.base,backend.top),activeTopY:applied.activeTopY};
  auditGeometry.beginFrame(state.scene);
  emphasis?.update(state.overlays.callouts,applied.featureAnchors);
  lastPrepared={state,applied};
  const featureAnchors={};
  for(const c of state.overlays.callouts){
    const item=copy.sections[c.sectionIndex].callouts[c.slot];
    if(backend.provisional)featureAnchors[item.featureId]=[c.slot?5:-6,Math.min(applied.activeTopY-.15,-backend.base+1+(applied.activeTopY+backend.base-1)*.8),7.9];
    else {const anchor=applied.featureAnchors?.[item.featureId];if(anchor?.visible!==false&&anchor?.point)featureAnchors[item.featureId]=anchor.point;}
  }
  const framing=sceneFraming(world.scene,world.camera,width,height,{geometryAdapter:auditGeometry}),hasReconstructionOutline=!!applied.hasReconstructionOutline;
  const layout=overlays.plan(state,framing,hasReconstructionOutline,featureAnchors,backend.base,{track:calloutTrack}),meshes=audit?visibleMeshes():[];
  const anchorVisibility=state.overlays.callouts.filter(c=>c.opacity>0).map(c=>{
    const item=copy.sections[c.sectionIndex].callouts[c.slot],point=featureAnchors[item.featureId];
    const returned=applied.featureAnchors?.[item.featureId];
    const row={id:c.id,featureId:item.featureId,frame:state.frame,opacity:c.opacity,placeholderAnchor:backend.provisional,missing:!point,anchorVisible:returned?.visible,anchorPart:returned?.part};
    if(!point)return {...row,offFrame:true,occluded:null,reason:returned?.visible===false?'M1 anchor visible=false':'M1 anchor missing'};
    const projected=projectPoint(point,world.camera),position=new THREE.Vector3(...point),direction=position.clone().sub(world.camera.position),distance=direction.length();
    const ray=new THREE.Raycaster(world.camera.position,direction.normalize(),0,Math.max(0,distance-.0001));
    const hits=audit?auditGeometry.intersect(ray,meshes).filter(hit=>{
      const materials=Array.isArray(hit.object.material)?hit.object.material:[hit.object.material],material=materials[hit.face?.materialIndex||0];
      return material.visible&&material.opacity!==0&&!material.clippingPlanes?.some(plane=>plane.distanceToPoint(hit.point)<0);
    }):[];
    const hit=hits[0],offFrame=projected.x<0||projected.x>width||projected.y<0||projected.y>height||Math.abs(projected.z)>1;
    return {...row,point,projected,offFrame,occluded:audit?hits.length>0:null,reason:offFrame?'Projected anchor outside frame':hit?'Surface occludes the returned anchor':null,
      firstBlockingHit:hit?{mesh:hit.object.name||hit.object.type,role:hit.object.userData.sectionRole,featureId:hit.object.userData.featureId||null,distance:hit.distance,metresBeforeAnchor:distance-hit.distance}:null};
  });
  const activeTop=projectPoint([0,applied.activeTopY,0],world.camera);
  const {silhouette,...framingReport}=framing;
  const topMeshes=meshes.filter(mesh=>mesh.userData.eraDisplaced==='top').map(mesh=>{
    const geometry=auditGeometry.geometryFor(mesh);if(!geometry.boundingBox)geometry.computeBoundingBox();
    const b=geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
    return {name:mesh.name,heightRangeMetres:b.max.y-b.min.y,x:[b.min.x,b.max.x],z:[b.min.z,b.max.z],outsideBlockMetres:Math.max(0,-12-b.min.x,b.max.x-12,-8-b.min.z,b.max.z-8)};
  });
  const geometryAudit={standInApplied:backend.provisional,cpuDisplacement:mode==='m1',topMeshes,flatGrowthTops:topMeshes.filter(m=>m.heightRangeMetres<1e-5).map(m=>m.name),
    visibleLegacyPlaneCaps:meshes.filter(mesh=>mesh.userData.sectionRole==='top'&&mesh.geometry.type==='PlaneGeometry').map(mesh=>mesh.name||mesh.type),
    refillRectangles:backend.provisional?'A3 stand-in refill backend active':'No film stand-in cap/refill meshes are created on M1'};
  return {layout,state,pose,framing:framingReport,overlayReport:layout.report,anchorVisibility,geometryAudit,activeTopFrameY:activeTop.y/height,activeTopWorldY:applied.activeTopY,hasReconstructionOutline,backend:mode,calloutTrack:calloutTrack?{sha256:calloutTrackSHA256,source:calloutTrack.source||null}:null,provisionalGeometry:backend.provisional,emphasis:emphasis?{poolFieldHashes:emphasis.fieldHashes}:null};
}
function sample(seconds,options){
  const {layout,...data}=prepare(seconds,options);return data;
}
function render(seconds){
  const {layout,...data}=prepare(seconds);overlays.draw(layout,data.state);
  world.renderer.info.reset();world.renderer.autoClear=true;world.renderer.render(world.scene,world.camera);
  world.renderer.autoClear=false;world.renderer.render(overlays.scene,overlays.camera);
  return {...data,info:world.info()};
}
window.strataFilm={ready:true,render,sample,readPixels:world.readPixels,blob:()=>new Promise(resolve=>canvas.toBlob(resolve,'image/png')),device:world.device,
  cameraSample(seconds){const result=render(seconds);return {...result.pose,quaternion:world.camera.quaternion.toArray(),base:backend.base,top:backend.top};}};
render(0);

// Review controls do not change material/geometry membership or renderer programs.
window.strataEmphasis={
  configure:options=>emphasis?.configure(options),
  state:()=>emphasis?.state()||[],
  fieldHashes:()=>emphasis?.fieldHashes||{},
  maskWeights:featureMaskWeights,
  prepare(seconds){const d=prepare(seconds,{audit:false});overlays.draw(d.layout,d.state);return d.state;},
  programs:()=>world.renderer.info.programs.map(p=>p.id),
  footprint:id=>emphasis?.footprint(id),
  scenePixels(){world.renderer.autoClear=true;world.renderer.render(world.scene,world.camera);return world.readPixels();},
  draw(){world.renderer.autoClear=true;world.renderer.render(world.scene,world.camera);world.renderer.autoClear=false;world.renderer.render(overlays.scene,overlays.camera);return world.readPixels();},
  poolBox(slot,cluster){
    const pool=emphasis?.state()[slot]?.pool;if(!pool)return null;
    const pad=pool.marginMetres+pool.fadeMetres,points=[];
    for(const p of(cluster===undefined?pool.hull:pool.hulls[cluster]))for(const dx of[-pad,pad])for(const dz of[-pad,pad]){const v=new THREE.Vector3(p.x+dx,pool.planeY,p.y+dz).project(world.camera);points.push({x:(v.x+1)*width/2,y:(1-v.y)*height/2});}
    const x0=Math.min(...points.map(p=>p.x)),x1=Math.max(...points.map(p=>p.x)),y0=Math.min(...points.map(p=>p.y)),y1=Math.max(...points.map(p=>p.y));
    return {x:Math.max(0,Math.floor(x0)-12),y:Math.max(0,Math.floor(y0)-12),width:Math.min(width,Math.ceil(x1)+12)-Math.max(0,Math.floor(x0)-12),height:Math.min(height,Math.ceil(y1)+12)-Math.max(0,Math.floor(y0)-12)};
  },
  mask(featureId){
    if(!emphasis)throw new Error('No emphasis review adapter');
    const measure=emphasis.measurementScene(featureId,auditGeometry,lastPrepared.applied.featureAnchors?.[featureId]),target=new THREE.WebGLRenderTarget(width,height,{samples:4}),previous=world.renderer.getRenderTarget(),tone=world.renderer.toneMapping,shadow=world.renderer.shadowMap.enabled,bytes=new Uint8Array(width*height*4);
    try{world.renderer.setRenderTarget(target);world.renderer.autoClear=true;world.renderer.toneMapping=THREE.NoToneMapping;world.renderer.shadowMap.enabled=false;world.renderer.render(measure.scene,world.camera);world.renderer.readRenderTargetPixels(target,0,0,width,height,bytes);}
    finally{world.renderer.setRenderTarget(previous);world.renderer.toneMapping=tone;world.renderer.shadowMap.enabled=shadow;target.dispose();measure.dispose();}
    return bytes;
  }
};
