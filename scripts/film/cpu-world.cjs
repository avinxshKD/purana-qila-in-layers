'use strict';
const path=require('node:path');
const {pathToFileURL}=require('node:url');
function addLegacyRings(scene,features,create){
  if(features.items.some(it=>it.featureId==='mauryan-ring-well'))return [];
  const meshes=create();for(const mesh of meshes){mesh.userData.sectionRole='feature';scene.add(mesh);}return meshes;
}
// Same M1 geometry factories and dimensions as museum-scene.js. No renderer,
// canvas, font, light or WebGL context is created. Verify against frozen r2.
async function loadCpuWorld(tree){
  const THREE=await import('three');
  async function module(file){return import(pathToFileURL(path.join(tree,'src',file)).href);}
    const [site,soil,displace,excavation,seating,layout,layers,section,geometry,museum,timeline,cameraModule,audit]=await Promise.all([
      module('eras/site-state.js'),module('eras/soil-block.js'),module('eras/soil-displace.js'),module('eras/excavation.js'),module('eras/seating.js'),module('eras/layout.js'),
      module('layers.js'),module('section-geometry.js'),module('geometry.js'),module('museum-scene.js'),module('film/timeline.js'),module('film/camera.js'),module('film/audit-geometry.js')
    ]);
    const scene=new THREE.Scene(),stack=site.siteBoundaryGrids(),table=layers.createLayerTable();
    const block=soil.createSoilBlock({stack,outputScale:1,parent:scene,top:{character:museum.TOP_CHARACTER,albedoMultiplier:museum.TOP_ALBEDO_MULTIPLIER,slopeDarken:museum.TOP_SLOPE_DARKEN},floor:{character:museum.FLOOR_CHARACTER}});
    const features=site.createEraSite({outputScale:1});features.group.userData.sectionRole='feature';scene.add(features.group);
    addLegacyRings(scene,features,()=>{
      const r=seating.SEATING.ring,R=layout.RING_WELL,shaft={...table.proportions.shaft,x:R.x,z:R.z,localTopDepth:layers.surfaceHeight(R.x,R.z)-r.topY,pit:{...table.proportions.shaft.pit,xmin:R.pit.xmin,xmax:R.pit.xmax,zmin:R.pit.zmin,bottomDepth:-r.pitFloorY}};
      const ring=section.ringSection(shaft,8,{heapColour:0,fragmentColour:0});
      return ['body','lips','gaps','soil','fill','cracks'].map(name=>{const mesh=new THREE.Mesh(ring[name],new THREE.MeshStandardMaterial({side:THREE.DoubleSide}));mesh.name='ring-'+name;return mesh;});
    });
    const plinths=[];
    for(const[w,h,d,y]of[[25.3,.30,17.3,-block.base-.21],[25.24,.065,17.24,-block.base-.0325]]){const mesh=new THREE.Mesh(geometry.box(w,h,d,0,y,0),new THREE.MeshStandardMaterial());mesh.userData.sectionRole='plinth';scene.add(mesh);plinths.push(mesh);}
    const S=museum.SCALE_BAR,barY=-block.base-S.centreBelowBaseMetres;
    function bar(w,h,d,x,y,z){const mesh=new THREE.Mesh(geometry.box(w,h,d,x,y,z),new THREE.MeshBasicMaterial());mesh.userData.sectionRole='scale';scene.add(mesh);}
    for(let i=0;i<5;i++)bar(1,S.heightMetres,.012,2.5+i,barY,8.66);
    for(let i=0;i<=5;i++)bar(S.outlineMetres,S.heightMetres+2*S.outlineMetres,.014,2+i,barY,8.668);
    for(const side of[-1,1])bar(5+S.outlineMetres,S.outlineMetres,.015,4.5,barY+side*(S.heightMetres+S.outlineMetres)/2,8.67);
    const displacement=displace.createEraDisplacement({stack:block.stack}),adapter=audit.createAuditGeometryAdapter(displacement.resolve),camera=new THREE.PerspectiveCamera(25,16/9,.1,180);
    const featureGroups=new WeakMap(features.items.map(item=>[item.handle.object,{featureId:item.featureId,part:item.part}]));
    function meshes(){
      const result=[],contexts=new WeakMap();
      function visit(node,role='',feature=null,path='scene',visible=true){visible=visible&&node.visible;if(!visible)return;role=node.userData.sectionRole||role;feature=featureGroups.get(node)||feature;
        if(node.isMesh&&role!=='ground'){result.push(node);contexts.set(node,{role,...feature,path,name:node.name||node.type});}
        node.children.forEach((child,i)=>visit(child,role,feature,path+'/'+(child.name||child.type)+'['+i+']',visible));
      }visit(scene);return {meshes:result,contexts};
    }
    function plinthMargin(){let minimum=Infinity;for(const mesh of plinths){if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;for(const x of[b.min.x,b.max.x])for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);minimum=Math.min(minimum,(1-Math.abs(p.x))/2,(1-Math.abs(p.y))/2);}}return minimum;}
    return {THREE,scene,camera,features,block,adapter,meshes,plinthMargin,filmState:timeline.filmState,
      apply(frame){const state=timeline.filmState(frame/30),applied=features.applyState(state.scene),solid=block.apply({deposits:state.scene.deposits,k:excavation.stepOf(state.scene.excavation)});
        displacement.beginFrame(state.scene);adapter.beginFrame(state.scene);cameraModule.applyCamera(camera,frame/30,block.base,layers.surfaceHeight(-12,-8));scene.updateMatrixWorld(true);return {state,applied:{...applied,...solid}};},
      close:async()=>{}};
}
module.exports={loadCpuWorld,addLegacyRings};
