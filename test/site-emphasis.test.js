import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCalloutEmphasis} from '../src/film/emphasis.js';
import {createActiveMarkerEmphasis} from '../src/site/emphasis.js';
import crypto from 'node:crypto';
import {loadPoolFields} from '../src/film/emphasis-fields.js';
function pool(){const effect=createCalloutEmphasis(new THREE.Scene(),{featureIdFor:c=>c.id});effect.update([{id:'a',slot:0,opacity:1}],{a:{point:[0,0,0]}});return effect.exportPools().a;}
test('active marker alone fades permanent lights; hiding or clearing it settles to idle',()=>{
 const scene=new THREE.Scene(),source=pool();let shown=true;const e=createActiveMarkerEmphasis(scene,{pools:{a:source,b:source},powers:{a:100,b:80},anchorFor:()=>({point:[0,0,0],visible:shown}),visible:()=>shown}),membership=[...scene.children];
 e.setActive('a');assert.equal(e.update(.02),true);const first=e.metadata().lights[0].intensity;assert.ok(first>0&&first<100);
 e.setActive('b');e.update(.02);assert.deepEqual(scene.children,membership);assert.ok(e.metadata().lights.every(l=>l.visible&&!l.castShadow&&l.colour.every(c=>c===1)));
 shown=false;for(let i=0;i<100;i++)e.update(.1);assert.equal(e.update(.1),false);assert.ok(e.metadata().lights.every(l=>l.intensity===0));
 shown=true;e.setActive('a');e.update(0,{immediate:true});assert.equal(e.metadata().lights.find(l=>l.intensity>0).intensity,100);e.setActive(null);assert.equal(e.update(0,{immediate:true}),false);assert.ok(e.metadata().lights.every(l=>l.intensity===0));e.dispose();assert.equal(scene.children.length,0);
});
test('shared catalogue loader verifies actual field bytes and rejects changed data',async()=>{
 const bytes=new Uint8Array(512*512*4),hash=crypto.createHash('sha256').update(bytes).digest('hex'),manifest={size:512,fields:{a:{file:'a.rgba',sha256:hash}}};
 const fetcher=async url=>url.pathname.endsWith('manifest.json')?{ok:true,json:async()=>manifest}:{ok:true,arrayBuffer:async()=>bytes.buffer.slice(0)};
 const catalogue=await loadPoolFields({baseURL:'https://unit-test.invalid/',fetcher});assert.equal(catalogue.fieldHashes.a,hash);assert.equal(catalogue.pools.a.bytes.length,bytes.length);
 bytes[0]=1;await assert.rejects(loadPoolFields({baseURL:'https://unit-test.invalid/',fetcher}),/hash differs/);
});
