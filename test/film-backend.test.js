import test from 'node:test';
import assert from 'node:assert/strict';
import {createFilmBackend} from '../src/film/backend.js';
test('M1 applies only the scene contract through world.applyState, with no stand-in',()=>{
  const state={scene:{schemaVersion:1,deposits:Array(10).fill(1),features:Array(10).fill(1),excavation:.5}},calls=[];
  const world={eraBlock:{base:10,top:5},applyState(value){calls.push(value);return {activeTopAnchor:{point:[0,3,0]},featureAnchors:{real:{point:[1,2,3]}}};}};
  const backend=createFilmBackend(world,'m1'),result=backend.apply(state);
  assert.equal(backend.provisional,false);assert.equal(result.provisional,false);assert.equal(result.activeTopY,3);assert.equal(calls[0],state.scene);assert.equal(result.featureAnchors.real.point[0],1);
});
test('M1 fails instead of silently using the stand-in when the API is absent',()=>{
  assert.throws(()=>createFilmBackend({applyState(){}},'m1'),/accepted era block/);
});
