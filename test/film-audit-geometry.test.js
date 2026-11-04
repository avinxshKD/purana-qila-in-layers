import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAuditGeometryAdapter} from '../src/film/audit-geometry.js';
import {createSceneSilhouette} from '../src/film/silhouette.js';
import {sceneFraming} from '../src/film/framing.js';
function plane(){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  mesh.userData.sectionRole='top';mesh.name='era-top';mesh.updateMatrixWorld();
  return mesh;
}
test('undisplaced audit path retains the original mesh and ray results',()=>{
  const mesh=plane(),adapter=createAuditGeometryAdapter(),ray=new THREE.Raycaster(new THREE.Vector3(0,0,10),new THREE.Vector3(0,0,-1));
  assert.equal(adapter.meshFor(mesh),mesh);assert.equal(adapter.geometryFor(mesh),mesh.geometry);
  assert.deepEqual(adapter.intersect(ray,[mesh]),ray.intersectObjects([mesh],false));
});
test('GPU-displaced attributes fail closed without a matching CPU override',()=>{
  const mesh=plane();mesh.geometry.setAttribute('eraBlend',new THREE.Float32BufferAttribute(Array(4).fill(0),1));
  assert.throws(()=>createAuditGeometryAdapter().geometryFor(mesh),/requires displaced positions for era-top/);
  mesh.geometry.attributes.eraBlend.array.fill(-1);
  assert.equal(createAuditGeometryAdapter().geometryFor(mesh),mesh.geometry);
  const bad=createAuditGeometryAdapter(()=>({positions:new Float32Array(3)}));assert.throws(()=>bad.meshFor(mesh),/12 packed float/);
  const badNormal=createAuditGeometryAdapter(()=>({positions:mesh.geometry.attributes.position.array,normals:new Float32Array(3)}));assert.throws(()=>badNormal.meshFor(mesh),/normals.*12 packed float/);
});
test('rays use displaced CPU positions without mutating any rendered attribute',()=>{
  const mesh=plane(),original=mesh.geometry.attributes.position.array.slice(),positions=original.slice();
  for(let i=2;i<positions.length;i+=3)positions[i]=5;
  const adapter=createAuditGeometryAdapter(()=>({positions,normals:mesh.geometry.attributes.normal.array})),ray=new THREE.Raycaster(new THREE.Vector3(0,0,10),new THREE.Vector3(0,0,-1),0,8);
  adapter.beginFrame({schemaVersion:1});
  assert.equal(ray.intersectObject(mesh).length,0);
  const hits=adapter.intersect(ray,[mesh]);assert.ok(hits.length);assert.equal(hits[0].distance,5);assert.equal(hits[0].object,mesh);assert.equal(hits[0].point.z,5);
  assert.deepEqual(mesh.geometry.attributes.position.array,original);assert.notEqual(adapter.geometryFor(mesh),mesh.geometry);
});
test('framing, raster and rays share one per-frame override and refresh reused arrays',()=>{
  const mesh=plane(),scene=new THREE.Scene();scene.add(mesh);
  const camera=new THREE.OrthographicCamera(-100,100,100,-100,.1,100);camera.position.z=10;camera.updateMatrixWorld();
  const original=mesh.geometry.attributes.position.array.slice(),positions=original.slice();let calls=0;
  const adapter=createAuditGeometryAdapter((object,state)=>{calls++;for(let i=0;i<positions.length;i+=3){positions[i]=original[i];positions[i+1]=original[i+1]+state.y;positions[i+2]=original[i+2];}return {positions};});
  adapter.beginFrame({y:60});
  const first=sceneFraming(scene,camera,200,200,{geometryAdapter:adapter});
  assert.ok(Math.abs(first.bbox.y-20)<1e-9);assert.equal(first.silhouette.distanceRect({x:95,y:30,width:5,height:5}),0);
  const ray=new THREE.Raycaster(new THREE.Vector3(0,60,10),new THREE.Vector3(0,0,-1));
  assert.ok(adapter.intersect(ray,[mesh]).length);assert.equal(calls,1);
  adapter.beginFrame({y:-60});
  const next=sceneFraming(scene,camera,200,200,{geometryAdapter:adapter});assert.ok(Math.abs(next.bbox.y-140)<1e-9);
  assert.ok(next.silhouette.distanceRect({x:95,y:30,width:5,height:5})>24);assert.equal(next.silhouette.distanceRect({x:95,y:150,width:5,height:5}),0);
  assert.equal(adapter.intersect(ray,[mesh]).length,0);assert.equal(calls,2);assert.deepEqual(mesh.geometry.attributes.position.array,original);
  assert.equal(createSceneSilhouette(scene,camera,{width:200,height:200}).distanceRect({x:95,y:95,width:5,height:5}),0);
});
test('instanced displaced proxies preserve instance and world transforms and hit identity',()=>{
  const geometry=new THREE.PlaneGeometry(2,2),mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),1);
  mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(2,0,0));mesh.position.x=3;mesh.updateMatrixWorld();
  const positions=geometry.attributes.position.array.slice();for(let i=2;i<positions.length;i+=3)positions[i]=3;
  const adapter=createAuditGeometryAdapter(()=>({positions})),ray=new THREE.Raycaster(new THREE.Vector3(5,0,10),new THREE.Vector3(0,0,-1),0,8);
  adapter.beginFrame({});const hits=adapter.intersect(ray,[mesh]);
  assert.ok(hits.length);assert.equal(hits[0].instanceId,0);assert.equal(hits[0].object,mesh);assert.equal(hits[0].distance,7);assert.equal(geometry.attributes.position.getZ(0),0);
});
