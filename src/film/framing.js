import * as THREE from 'three';
import {convexHull} from './layout.js';
import {createSceneSilhouette} from './silhouette.js';
const roles=new Set(['cutface','top','floor','feature','plinth']),versions=new WeakMap();
export function projectPoint(point,camera,width=1920,height=1080){
  const p=new THREE.Vector3(...point).project(camera);return {x:(p.x+1)*width/2,y:(1-p.y)*height/2,z:p.z};
}
export function sceneFraming(scene,camera,width=1920,height=1080,{geometryAdapter}={}){
  scene.updateMatrixWorld(true);const points=[];
  function visit(object,inheritedRole='',visible=true){
    visible=visible&&object.visible;if(!visible)return;
    const role=object.userData.sectionRole||inheritedRole;
    if(object.isMesh&&roles.has(role)){
      const auditMesh=geometryAdapter?.meshFor(object)||object,geometry=auditMesh.geometry,position=geometry.attributes.position;
      if(versions.get(geometry)!==position.version){geometry.computeBoundingBox();versions.set(geometry,position.version);}
      const bounds=auditMesh.isInstancedMesh?(auditMesh.computeBoundingBox(),auditMesh.boundingBox.clone()):geometry.boundingBox.clone();bounds.applyMatrix4(object.matrixWorld);
      const materials=Array.isArray(object.material)?object.material:[object.material];
      // Horizontal course/deposit clips, where every material uses the plane.
      for(const plane of materials[0].clippingPlanes||[])if(Math.abs(plane.normal.y+1)<1e-8&&materials.every(m=>m.clippingPlanes?.includes(plane)))bounds.max.y=Math.min(bounds.max.y,plane.constant);
      if(!bounds.isEmpty())for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z])points.push(projectPoint([x,y,z],camera,width,height));
    }
    for(const child of object.children)visit(child,role,visible);
  }
  visit(scene);const hull=convexHull(points),xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  const bbox={x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
  const margins={left:bbox.x/width,right:1-(bbox.x+bbox.width)/width,top:bbox.y/height,bottom:1-(bbox.y+bbox.height)/height};
  const silhouette=createSceneSilhouette(scene,camera,{width,height,geometryAdapter});
  return {hull,bbox,bboxFraction:{x:bbox.x/width,y:bbox.y/height,width:bbox.width/width,height:bbox.height/height},margins,minimumMargin:Math.min(...Object.values(margins)),silhouette,silhouetteReport:silhouette.report,method:'Camera margins retain the conservative mesh-box envelope; HUD clearance uses the separately rasterized actual triangles'};
}
