import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRequire} from 'node:module';
import {createCalloutEmphasis} from '../src/film/emphasis.js';
import {createActiveMarkerEmphasis} from '../src/site/emphasis.js';
const {activePoolSettled,activePoolPredicate}=createRequire(import.meta.url)('../scripts/site/active-pool.cjs');
function pool(){const effect=createCalloutEmphasis(new THREE.Scene(),{featureIdFor:c=>c.id});effect.update([{id:'a',slot:0,opacity:1}],{a:{point:[0,0,0]}});return effect.exportPools().a;}
test('active-pool wait settles at partial reveal opacity, where the old opacity===1 wait never could',()=>{
 const reveal=0.7487437185929648,scene=new THREE.Scene(),e=createActiveMarkerEmphasis(scene,{pools:{'kushan-house':pool()},powers:{'kushan-house':100},anchorFor:()=>({point:[0,0,0],visible:true,opacity:reveal}),visible:()=>true});
 const markers=[{featureId:'kushan-house',visible:true,reason:'visible',featureOpacity:reveal}],state=()=>({emphasis:e.metadata()});
 assert.equal(activePoolSettled(state(),markers,'kushan-house').reason,'not-active');
 e.setActive('kushan-house');e.update(1/60);assert.equal(activePoolSettled(state(),markers,'kushan-house').reason,'fading');
 let frames=1;while(e.update(1/60)&&frames<600)frames++;
 assert.ok(frames<120,`fade should settle within 2s of frames, took ${frames}`);
 const settled=activePoolSettled(state(),markers,'kushan-house');assert.equal(settled.ok,true);assert.equal(settled.opacity,reveal);
 assert.equal(state().emphasis.entries.some(x=>x.id==='kushan-house'&&x.opacity===1),false,'old wait condition is unreachable');
 assert.equal(activePoolSettled(state(),[{...markers[0],visible:false,reason:'occluded'}],'kushan-house').reason,'marker-occluded');
 const site={metadata:state,markerReport:()=>markers};assert.equal(new Function('window','return '+activePoolPredicate('kushan-house'))({strataSite:site}),true);
 e.dispose();
});
