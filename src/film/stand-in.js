import * as THREE from 'three';
import {box} from '../geometry.js';
import {surfaceHeight} from '../layers.js';

export function createStandIn(world) {
  const {renderer,scene,layerTable}=world,base=layerTable.proportions.bottomDepth;
  const top=surfaceHeight(-12,-8),clip=new THREE.Plane(new THREE.Vector3(0,-1,0),top+1);
  renderer.localClippingEnabled=true;
  for(const mesh of scene.children)if(mesh.isMesh&&['cutface','feature','top','floor'].includes(mesh.userData.sectionRole)){
    const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    for(const mat of mats){mat.clippingPlanes=[clip];mat.clipShadows=true;mat.needsUpdate=true;}
  }
  const soil=new THREE.MeshStandardMaterial({color:0x83745c,roughness:1});
  const cap=new THREE.Mesh(new THREE.PlaneGeometry(24,16),soil);
  cap.userData.sectionRole='top';
  cap.rotation.x=-Math.PI/2;cap.receiveShadow=true;scene.add(cap);
  const fills=layerTable.proportions.trenches.map(trench=>{
    const x=(trench.xmin+trench.xmax)/2,z=(trench.zmin+trench.zmax)/2;
    const ceiling=surfaceHeight(x,z),floor=-trench.depth;
    const mesh=new THREE.Mesh(box(trench.xmax-trench.xmin,1,trench.zmax-trench.zmin,x,0,z),soil);
    mesh.userData.sectionRole='cutface';
    mesh.receiveShadow=true;mesh.castShadow=true;mesh.material=soil.clone();mesh.material.clippingPlanes=[clip];mesh.material.clipShadows=true;
    scene.add(mesh);return {mesh,ceiling,floor};
  });
  const pit=layerTable.proportions.shaft.pit,wellFill=new THREE.Mesh(box(pit.xmax-pit.xmin,1,pit.zmax-pit.zmin,(pit.xmin+pit.xmax)/2,0,(pit.zmin+pit.zmax)/2),soil.clone());
  wellFill.userData.sectionRole='cutface';
  wellFill.material.clippingPlanes=[clip];wellFill.material.clipShadows=true;scene.add(wellFill);
  fills.push({mesh:wellFill,ceiling:-pit.topDepth,floor:-pit.bottomDepth});
  return {base,top,apply(state){
    const full=state.scene.deposits.every(v=>v===1),height=-base+1+(top+base-1)*state.scene.deposits.reduce((a,b)=>a+b,0)/10;
    clip.constant=full?top+1:height;
    cap.visible=!full;cap.position.y=height+.001;
    for(const {mesh,ceiling,floor} of fills){
      const fillHeight=(ceiling-floor)*(1-state.scene.excavation);
      mesh.visible=fillHeight>.0001;mesh.scale.y=Math.max(.0001,fillHeight);mesh.position.y=floor+fillHeight/2;
    }
    return {activeTopY:full?top:height,provisional:true};
  }};
}
