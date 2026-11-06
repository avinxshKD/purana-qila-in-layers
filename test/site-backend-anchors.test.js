import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSiteBackend} from '../src/site/backend.js';
import {sceneForYear} from '../src/film/scene-year.js';
import {anchorStateKey} from '../src/eras/site-driver.js';
function fixture({interactive=true,tableKey=()=>null}={}){
  const scene=new THREE.Scene(),group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshStandardMaterial());group.add(mesh);scene.add(group);const calls=[];let release=null;
  const anchors=point=>({activeTopAnchor:{point:[0,0,0]},featureAnchors:{a:{point,normal:[0,1,0],visible:true,revealed:true,part:'real'}}});
  const world={scene,eraBlock:{base:10,top:0,bottomY:-10},eraSite:()=>({items:[]}),eraDisplacement:{resolve:()=>null},
    applyState(state,...options){calls.push(options);return anchors(options[0]?.anchors==='nearest'?[1,1,1]:[3,4,5]);}};
  if(interactive){world.refineAnchors=()=>new Promise(resolve=>{release=()=>resolve(anchors([3,4,5]));});world.prepareAnchors=async()=>({maxChunkMs:1});world.anchorStatus=()=>({mode:'x',tableKey:tableKey()});}
  return {world,calls,release:()=>release(),backend:createSiteBackend(world)};
}
test('native world: nearest requests apply exact, with the one-argument call, and never refine',async()=>{
  const f=fixture({interactive:false}),s=sceneForYear(150);f.backend.applyState(s,{anchors:'nearest'});
  assert.deepEqual(f.calls,[[]]);assert.equal(f.backend.anchorMode(),'exact');assert.equal(f.backend.interactiveAnchors,false);assert.equal(await f.backend.refineAnchors(),null);
});
test('tier world: nearest while moving, refined exact committed with a new revision, no re-apply for the same state',async()=>{
  const f=fixture(),s=sceneForYear(150),first=f.backend.applyState(s,{anchors:'nearest'});
  assert.deepEqual(f.calls,[[{anchors:'nearest'}]]);assert.equal(f.backend.anchorMode(),'nearest');assert.deepEqual(f.backend.marker('a').point,[1,1,1]);
  const pending=f.backend.refineAnchors({});f.release();const refined=await pending;assert.ok(refined);
  const committed=f.backend.commitAnchors(refined);assert.equal(committed.stateRevision,first.stateRevision+1);assert.equal(f.backend.anchorMode(),'exact');assert.deepEqual(f.backend.marker('a').point,[3,4,5]);
  f.backend.applyState(s,{anchors:'nearest'});f.backend.applyState(s);assert.equal(f.calls.length,1,'exact anchors stand for the resting state');
  assert.equal(f.backend.applyReport().nearest.count,1);
});
test('a nearest apply that hits the anchor table is exact at once; a miss waits for refinement',async()=>{
  const hitState=sceneForYear(2023),missState=sceneForYear(199);let key=null;const f=fixture({tableKey:()=>key});
  key=anchorStateKey(hitState);const hit=f.backend.applyState(hitState,{anchors:'nearest'});
  assert.equal(hit.tableHit,true);assert.equal(f.backend.anchorMode(),'exact');assert.equal(await f.backend.refineAnchors({}),null);assert.equal(f.backend.applyReport().nearestTableHits,1);
  key=anchorStateKey(hitState);const miss=f.backend.applyState(missState,{anchors:'nearest'});
  assert.equal(miss.tableHit,false);assert.equal(f.backend.anchorMode(),'nearest');assert.ok(f.calls.every(c=>c[0]?.anchors==='nearest'));
});
test('a newer state supersedes a pending refinement; an exact apply of the same state replaces nearest anchors',async()=>{
  const f=fixture();f.backend.applyState(sceneForYear(150),{anchors:'nearest'});const pending=f.backend.refineAnchors({});
  f.backend.applyState(sceneForYear(400),{anchors:'nearest'});f.release();assert.equal(await pending,null);assert.equal(f.backend.commitAnchors({key:'stale',exact:{}}),null);
  f.backend.applyState(sceneForYear(400));assert.deepEqual(f.calls.at(-1),[]);assert.equal(f.backend.anchorMode(),'exact');assert.deepEqual(f.backend.marker('a').point,[3,4,5]);
});
