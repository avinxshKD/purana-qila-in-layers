import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cameraPose,applyCamera,growthHeight} from '../src/film/camera.js';
import {LOOK_PROPORTIONS,surfaceHeight} from '../src/layers.js';
import {siteBoundaryGrids} from '../src/eras/site-state.js';
import {blockLevels} from '../src/eras/soil-block.js';
const base=LOOK_PROPORTIONS.bottomDepth,top=surfaceHeight(-12,-8);
test('camera starts at centre of approved hero arc and pushes in slowly',()=>{
  const pose=cameraPose(0,base,top);
  assert.equal(pose.azimuthDegrees,35);assert.equal(pose.elevationDegrees,27);assert.equal(pose.distanceMetres,74);
  assert.deepEqual(pose.target,[-1.4,-3.85,0]);
  assert.ok(cameraPose(4,base,top).distanceMetres<pose.distanceMetres);
});
test('camera stays at least 20 degrees off frontal without any position discontinuities',()=>{
  let previous=cameraPose(0,base,top);
  for(let sample=1;sample<=7200;sample++){
    const pose=cameraPose(sample/120,base,top);
    assert.ok(pose.azimuthDegrees>=20&&pose.azimuthDegrees<=48);
    assert.ok(pose.position.every(Number.isFinite));
    assert.ok(Math.hypot(...pose.position.map((v,i)=>v-previous.position[i]))<.5);
    previous=pose;
  }
});
test('v1.3 holds cold-open distance without rewind or growth pullback',()=>{
  const end=cameraPose(4,base,top).distanceMetres;
  for(let frame=0;frame<1800;frame++){
    const pose=cameraPose(frame/30,base,top);
    assert.ok(Math.abs(pose.distanceMetres/end-1)<=.05);
    if(frame>=120)assert.equal(pose.distanceMetres,end);
    assert.equal(pose.desiredActiveTopFrameY,undefined);
  }
});
test('active central top rises naturally instead of tracking57.5percent',()=>{
  const camera=new THREE.PerspectiveCamera(25,16/9,.1,180);
  const y=t=>{applyCamera(camera,t,base,top);return (1-new THREE.Vector3(0,growthHeight(t,base,top),0).project(camera).y)/2;};
  assert.ok(y(8)-y(46)>.3);
});
test('whole conservative block/plinth envelope retains4percent on every frame',()=>{
  const camera=new THREE.PerspectiveCamera(25,16/9,.1,180);
  for(let frame=0;frame<1800;frame++){
    applyCamera(camera,frame/30,base,top);
    for(const x of [-12.65,12.65])for(const z of [-8.65,8.65])for(const y of [-base-.36,4.913]){
      const p=new THREE.Vector3(x,y,z).project(camera);
      assert.ok(Math.abs(p.x)<=.92&&Math.abs(p.y)<=.92,`Frame ${frame}: ${p.toArray()}`);
    }
  }
});
test('real M1 plinth retains4percent across all1800frames',()=>{
  const m1Base=-blockLevels(siteBoundaryGrids()).bottomY,camera=new THREE.PerspectiveCamera(25,16/9,.1,180);
  for(let frame=0;frame<1800;frame++){
    applyCamera(camera,frame/30,m1Base,top);
    for(const x of[-12.65,12.65])for(const z of[-8.65,8.65])for(const y of[-m1Base-.36,-m1Base-.06]){
      const p=new THREE.Vector3(x,y,z).project(camera);
      assert.ok(Math.abs(p.x)<=.92&&Math.abs(p.y)<=.92,`M1 plinth frame ${frame}: ${p.toArray()}`);
    }
  }
});
