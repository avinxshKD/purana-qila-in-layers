import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSceneSilhouette} from '../src/film/silhouette.js';
function fixture(){
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,100);camera.position.z=10;camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const add=(w,h,x,y)=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h).translate(x,y,0),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.userData.sectionRole='top';scene.add(mesh);return mesh;};
  add(40,180,-70,0);add(140,40,20,-70);
  return {scene,camera};
}
test('actual triangle raster retains concave empty space that a hull fills',()=>{
  const {scene,camera}=fixture(),mask=createSceneSilhouette(scene,camera,{width:200,height:200});
  assert.equal(mask.distanceRect({x:20,y:20,width:10,height:10}),0);
  assert.ok(mask.distanceRect({x:90,y:100,width:12,height:12})>=24);
  assert.equal(mask.report.maskWidth,50);assert.equal(mask.report.maskHeight,50);assert.equal(mask.blockLowestY,190);
});
test('silhouette respects horizontal clipping and invisible groups',()=>{
  const {scene,camera}=fixture();for(const mesh of scene.children)mesh.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),0)];
  const hidden=new THREE.Mesh(new THREE.PlaneGeometry(500,500),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));hidden.userData.sectionRole='top';hidden.visible=false;scene.add(hidden);
  const mask=createSceneSilhouette(scene,camera,{width:200,height:200});
  assert.ok(mask.distanceRect({x:20,y:20,width:10,height:10})>24);assert.equal(mask.distanceRect({x:20,y:120,width:10,height:10}),0);
});
