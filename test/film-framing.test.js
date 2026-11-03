import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {sceneFraming} from '../src/film/framing.js';
test('frame envelope includes current block/plinth, respects horizontal clips and ignores ground/hidden groups',()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(25,16/9,.1,180);camera.position.set(40,25,50);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const add=(role,geometry,material=new THREE.MeshBasicMaterial())=>{const mesh=new THREE.Mesh(geometry,material);mesh.userData.sectionRole=role;scene.add(mesh);return mesh;};
  const block=add('cutface',new THREE.BoxGeometry(24,14,16),new THREE.MeshBasicMaterial({clippingPlanes:[new THREE.Plane(new THREE.Vector3(0,-1,0),0)]}));
  const full=sceneFraming(scene,camera);block.material.clippingPlanes=[];const unclipped=sceneFraming(scene,camera);
  assert.ok(full.bbox.height<unclipped.bbox.height);
  const ground=add('ground',new THREE.BoxGeometry(1000,1000,1000));assert.deepEqual(sceneFraming(scene,camera).bbox,unclipped.bbox);
  const hidden=add('feature',new THREE.BoxGeometry(500,500,500));hidden.visible=false;assert.deepEqual(sceneFraming(scene,camera).bbox,unclipped.bbox);
  assert.ok(ground.visible);assert.ok(unclipped.minimumMargin>0);
});
