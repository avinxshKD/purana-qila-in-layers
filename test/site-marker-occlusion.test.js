import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createOcclusionKernel} from '../src/site/occlusion-kernel.js';
import {createOcclusionClient,createDeferredOcclusion} from '../src/site/marker-occlusion.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
  const kernel=createOcclusionKernel(),worker={postMessage({id,type,data}){queueMicrotask(()=>{try{worker.onmessage({data:{id,result:kernel.run(type,data)}});}catch(error){worker.onmessage({data:{id,error:error.message}});}});},terminate(){}};
  return createOcclusionClient({worker});
}
const ray=(x=0,z=5,far=10)=>({origin:[x,0,z],direction:[0,0,-1],far});
test('worker ignores hidden or zero-opacity native material groups',async()=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();const client=fixture();await client.prepare([mesh]);
  mesh.material.visible=false;assert.deepEqual(await client.query([mesh],[ray()]),[true]);mesh.material.visible=true;mesh.material.opacity=0;assert.deepEqual(await client.query([mesh],[ray()]),[true]);mesh.material.opacity=1;assert.deepEqual(await client.query([mesh],[ray()]),[false]);client.dispose();
});
test('pinned MIT BVH supports the installed three0.187 runtime',()=>{
  const packageJson=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url)));
  const dependency=JSON.parse(fs.readFileSync(new URL('../node_modules/three-mesh-bvh/package.json',import.meta.url)));
  assert.equal(packageJson.dependencies['three-mesh-bvh'],'0.9.18');assert.equal(dependency.license,'MIT');assert.equal(dependency.peerDependencies.three,'>= 0.159.0');assert.equal(THREE.REVISION,'187');
});
test('worker BVHs preserve source positions/indexes and account for clipping beyond the nearest hit',async()=>{
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshBasicMaterial({side:THREE.DoubleSide,clippingPlanes:[new THREE.Plane(new THREE.Vector3(0,0,-1),0)]}));mesh.updateMatrixWorld();
  const position=mesh.geometry.attributes.position.array.slice(),index=mesh.geometry.index.array.slice(),client=fixture();
  await client.prepare([mesh]);assert.deepEqual(await client.query([mesh],[ray(),ray(4)]),[false,true]);
  mesh.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),-10)];
  assert.deepEqual(await client.query([mesh],[ray()]),[true]);await client.prepare([mesh]);
  assert.equal(client.metadata().builds,1);assert.equal(client.metadata().refits,0);
  assert.deepEqual(mesh.geometry.attributes.position.array,position);assert.deepEqual(mesh.geometry.index.array,index);assert.equal(mesh.geometry.boundsTree,undefined);client.dispose();
});
test('nonindexed geometry, instance transforms and material sides match native occlusion',async()=>{
  const geometry=new THREE.PlaneGeometry(2,2).toNonIndexed(),mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),1);
  mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(2,0,0));mesh.position.x=3;mesh.updateMatrixWorld();
  const client=fixture();await client.prepare([mesh]);assert.deepEqual(await client.query([mesh],[ray(5),ray(0)]),[false,true]);assert.equal(geometry.index,null);
  mesh.material.side=THREE.BackSide;assert.deepEqual(await client.query([mesh],[ray(5)]),[true]);client.dispose();
});
test('changed positions refit the existing BVH rather than rebuilding',async()=>{
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
  const client=fixture();await client.prepare([mesh]);assert.deepEqual(await client.query([mesh],[ray(0,5,4)]),[true]);
  for(let i=0;i<mesh.geometry.attributes.position.count;i++)mesh.geometry.attributes.position.setZ(i,2);mesh.geometry.attributes.position.needsUpdate=true;
  await client.prepare([mesh]);assert.deepEqual(await client.query([mesh],[ray(0,5,4)]),[false]);
  assert.equal(client.metadata().builds,1);assert.equal(client.metadata().refits,1);client.dispose();
});
test('interactive updates launch zero occlusion queries and keep the last committed visibility',async()=>{
  let interacting=true,queries=0,last='prior';
  const work=createDeferredOcclusion({blocked:()=>interacting,query:async()=>{queries++;return 'new';},commit:value=>last=value});
  for(let i=0;i<20;i++){work.invalidate();work.update();}await flush();assert.equal(queries,0);assert.equal(last,'prior');
  interacting=false;work.update();await flush();assert.equal(queries,1);assert.equal(last,'new');assert.equal(work.metadata().pending,false);
});
test('a new input discards an in-flight result before it can change marker visibility',async()=>{
  let interacting=false;const resolvers=[],commits=[];
  const work=createDeferredOcclusion({blocked:()=>interacting,query:()=>new Promise(resolve=>resolvers.push(resolve)),commit:value=>commits.push(value)});
  work.update();await Promise.resolve();interacting=true;work.invalidate();resolvers[0]('stale');await flush();assert.deepEqual(commits,[]);
  interacting=false;work.update();await Promise.resolve();resolvers[1]('fresh');await flush();assert.deepEqual(commits,['fresh']);
});
