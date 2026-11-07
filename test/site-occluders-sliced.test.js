import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSiteBackend} from '../src/site/backend.js';
import {createDeferredOcclusion} from '../src/site/marker-occlusion.js';
import {sceneForYear} from '../src/film/scene-year.js';
function fixture(count=5){
  const scene=new THREE.Scene();for(let i=0;i<count;i++){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshStandardMaterial());mesh.name='m'+i;mesh.userData.sectionRole=i%2?'wall':'top';scene.add(mesh);}
  const world={scene,eraBlock:{base:10,top:0,bottomY:-10},eraSite:()=>({items:[]}),eraDisplacement:{resolve:()=>null},applyState:()=>({activeTopAnchor:{point:[0,0,0]},featureAnchors:{}})};
  const backend=createSiteBackend(world);backend.applyState(sceneForYear(150));return backend;
}
test('sliced occluders match the synchronous list, yield between slices and report their cost',async()=>{
  const backend=fixture(),sync=backend.occluders(),roles=sync.map(backend.roleOf);let yields=0;
  const sliced=await backend.occludersSliced({budgetMs:0,yieldTask:async()=>{yields++;}});
  assert.deepEqual(sliced,sync);assert.deepEqual(sliced.map(backend.roleOf),roles);assert.equal(yields,sync.length-1);
  const stats=backend.occluderStats();assert.equal(stats.meshes,5);assert.equal(stats.slices,5);assert.ok(stats.maxMesh);
});
test('sliced occluders stop at a newer state or when no longer valid',async()=>{
  const backend=fixture();let valid=true;
  assert.equal(await backend.occludersSliced({budgetMs:0,valid:()=>valid,yieldTask:async()=>{valid=false;}}),null);
  assert.equal(await backend.occludersSliced({budgetMs:0,yieldTask:async()=>{backend.applyState(sceneForYear(400));}}),null);
});
test('deferred occlusion starts its query only when the deferral runs',async()=>{
  let run=null,queries=0;const work=createDeferredOcclusion({defer:callback=>{run=callback;},query:async()=>{queries++;return 1;},commit:()=>{}});
  work.update();await Promise.resolve();await Promise.resolve();assert.equal(queries,0);run();await new Promise(r=>setImmediate(r));assert.equal(queries,1);
});
