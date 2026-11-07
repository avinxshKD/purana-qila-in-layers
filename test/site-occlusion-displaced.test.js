import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOcclusionKernel} from '../src/site/occlusion-kernel.js';
import {createOcclusionClient} from '../src/site/marker-occlusion.js';
import {createEraDisplacement} from '../src/eras/soil-displace.js';
import {BOUNDARY_COUNT} from '../src/eras/stack.js';

const stack={nx:4,nz:4,xmin:-2,zmin:-2,stepMetres:4/3,grids:Array.from({length:BOUNDARY_COUNT},(_,j)=>new Float32Array(16).fill(-1+.12*j))};
function soil(kind='face'){
  const geometry=new THREE.PlaneGeometry(4,4,2,2);geometry.rotateX(-Math.PI/2);const p=geometry.attributes.position,count=p.count,A=new Float32Array(count*3);
  for(let i=0;i<count;i++)A.set([p.getX(i),p.getZ(i),.5],i*3);
  geometry.setAttribute('eraSampleA',new THREE.BufferAttribute(A,3));geometry.setAttribute('eraSampleB',new THREE.BufferAttribute(A.slice(),3));geometry.setAttribute('eraBlend',new THREE.BufferAttribute(new Float32Array(count),1));
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.userData.eraDisplaced=kind;mesh.updateMatrixWorld();return mesh;
}
function fixture(){
  const kernel=createOcclusionKernel(),worker={postMessage({id,type,data}){queueMicrotask(()=>{try{worker.onmessage({data:{id,result:kernel.run(type,data)}});}catch(error){worker.onmessage({data:{id,error:error.message}});}});},terminate(){}};
  kernel.run('stack',{grid:stack});
  return createOcclusionClient({worker,displacedKind:mesh=>mesh.userData.eraDisplaced??null});
}
const rays=[-1.5,-.4,0,.7,1.6].map(x=>({origin:[x,5,.3],direction:[0,-1,0],far:4.9}));
const full=Array(10).fill(1),bare=Array(10).fill(0),half=[1,1,1,1,1,.5,0,0,0,0];

for(const kind of ['face','top'])test(`worker-displaced ${kind} soil occludes as the main-thread CPU proxy does, for every deposit state`,async()=>{
  const mesh=soil(kind),client=fixture(),reference=createEraDisplacement({stack}),source=mesh.geometry.attributes.position.array.slice();await client.prepare([mesh]);
  for(const deposits of [full,bare,half,full]){
    const {positions}=reference.resolve(mesh,{deposits}),proxy=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions.slice(),3)).setIndex(mesh.geometry.index),mesh.material);proxy.updateMatrixWorld();
    const plain=fixture();await plain.prepare([proxy]);
    assert.deepEqual(await client.query([mesh],rays,{deposits}),await plain.query([proxy],rays));plain.dispose();
  }
  assert.deepEqual(await client.query([mesh],rays,{deposits:full}),Array(5).fill(false));assert.deepEqual(await client.query([mesh],rays,{deposits:bare}),Array(5).fill(true));
  assert.deepEqual(mesh.geometry.attributes.position.array,source,'source geometry stays undisplaced');
  client.dispose();
});
test('displaced proxies build once per geometry, refit per state, and cache the warmed state',async()=>{
  const mesh=soil(),client=fixture();
  await client.warm(mesh,half);let m=client.metadata();assert.equal(m.builds,1);assert.equal(m.resolves,1);
  await client.query([mesh],rays,{deposits:half});m=client.metadata();assert.equal(m.resolves,1,'warmed state is not resolved again');assert.equal(m.refits,0);
  await client.query([mesh],rays,{deposits:full});m=client.metadata();assert.equal(m.resolves,2);assert.equal(m.refits,1);assert.equal(m.builds,1);
  const memory=await client.memory();assert.equal(memory.displacedGeometries,1);assert.equal(memory.displacedWarm,1);assert.ok(memory.displacedBytes>0);
  await assert.rejects(client.query([mesh],rays),/applied deposits/);
  mesh.geometry.dispose();assert.equal((await client.memory()).displacedGeometries,0,'a disposed step geometry is released in the worker');client.dispose();
});
