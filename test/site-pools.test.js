import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {loadSitePools} from '../src/site/pools.js';
import {cropField,expandCrop} from '../src/site/pool-field.js';
import {createActiveMarkerEmphasis} from '../src/site/emphasis.js';
import {createCalloutEmphasis} from '../src/film/emphasis.js';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const site=new URL('../public/site-pools-m2b/',import.meta.url),film=new URL('../public/film-emphasis-m2b/',import.meta.url);
function fileFetcher(root,log=[]){return async url=>{const name=url.pathname.split('/').pop();log.push(name);try{const bytes=readFileSync(new URL(name,root));return new Response(bytes);}catch{return new Response(null,{status:404});}};}

test('shipped site pool crops re-expand to the exact film fields',()=>{
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',site))),source=JSON.parse(readFileSync(new URL('manifest.json',film)));
  assert.equal(manifest.format,'r8-crop');assert.equal(manifest.size,512);assert.deepEqual(Object.keys(manifest.fields),Object.keys(source.fields));
  for(const [id,record] of Object.entries(manifest.fields)){
    const data=readFileSync(new URL(record.file,site));assert.equal(sha(data),record.sha256,id);
    assert.equal(sha(expandCrop(new Uint8Array(data),record.crop,manifest.size)),source.fields[id].sha256,id);
    assert.equal(record.sourceSHA256,source.fields[id].sha256);
    for(const key of ['position','target','angle','planeY'])assert.deepEqual(record[key],source.fields[id][key],id+' '+key);
  }
});
test('crop keeps a zero border so clamp-to-edge sampling is zero outside it',()=>{
  const size=16,rgba=new Uint8Array(size*size*4);for(let i=3;i<rgba.length;i+=4)rgba[i]=255;
  for(const [x,y,v] of [[5,6,255],[6,6,128],[7,9,20]]){const at=(y*size+x)*4;rgba[at]=rgba[at+1]=rgba[at+2]=v;}
  const {data,crop}=cropField(rgba,size);assert.deepEqual(crop,{x:4,y:5,width:5,height:6});
  for(let c=0;c<crop.width;c++){assert.equal(data[c],0);assert.equal(data[(crop.height-1)*crop.width+c],0);}
  for(let r=0;r<crop.height;r++){assert.equal(data[r*crop.width],0);assert.equal(data[r*crop.width+crop.width-1],0);}
  assert.deepEqual(expandCrop(data,crop,size),rgba);
});
test('site catalogue fetches only the manifest until a pool is asked for, then shares one fetch',async()=>{
  const log=[],catalog=await loadSitePools({baseURL:'https://unit.invalid/',fetcher:fileFetcher(site,log),idle:async()=>{}});
  assert.deepEqual(log,['manifest.json']);assert.equal(catalog.isResident('kushan-house'),false);assert.equal(catalog.pools['kushan-house'],undefined);
  const [a,b]=await Promise.all([catalog.ensure('kushan-house'),catalog.ensure('kushan-house')]);assert.equal(a,b);assert.deepEqual(log,['manifest.json','kushan-house.r8']);
  assert.equal(catalog.isResident('kushan-house'),true);assert.equal(catalog.pools['kushan-house'],a);
  const t=a.texture;assert.ok(t.isDataTexture);assert.equal(t.image.width,512);assert.equal(t.format,THREE.RGBAFormat);
  assert.equal(t.colorSpace,THREE.NoColorSpace);assert.equal(t.minFilter,THREE.LinearFilter);assert.equal(t.magFilter,THREE.LinearFilter);assert.equal(t.generateMipmaps,false);
  const source=readFileSync(new URL('kushan-house.rgba',film));assert.equal(sha(t.image.data),sha(source));
  await catalog.prefetch(['mughal-glass','kushan-house','modern-brick-1948']);assert.deepEqual(log.slice(2),['mughal-glass.r8','modern-brick-1948.r8']);
  assert.equal(catalog.metadata().loaded.length,3);catalog.dispose();
});
test('a changed or missing field rejects with the pool id, is not cached, and retries',async()=>{
  let broken=true;const real=fileFetcher(site);
  const fetcher=async url=>broken&&url.pathname.endsWith('gupta-floor.r8')?new Response(new Uint8Array([1,2,3])):real(url);
  const catalog=await loadSitePools({baseURL:'https://unit.invalid/',fetcher});
  await assert.rejects(catalog.ensure('gupta-floor'),error=>error.pack==='pool:gupta-floor'&&/hash differs/.test(error.message));
  assert.equal(catalog.isResident('gupta-floor'),false);assert.match(catalog.metadata().failed['gupta-floor'],/hash differs/);
  broken=false;await catalog.ensure('gupta-floor');assert.equal(catalog.isResident('gupta-floor'),true);assert.deepEqual(catalog.metadata().failed,{});
});
test('lazy emphasis: 1x1 zero idle map, no light until the field is resident, then the pool texture',async()=>{
  const catalog=await loadSitePools({baseURL:'https://unit.invalid/',fetcher:fileFetcher(site)}),scene=new THREE.Scene();let ready=0;
  const e=createActiveMarkerEmphasis(scene,{catalog,onPoolReady:()=>ready++,powers:{'kushan-house':100},anchorFor:()=>({point:[0,0,0],visible:true,opacity:1})});
  const maps=()=>e.metadata().lights.map(l=>l.mapSize);assert.deepEqual(maps(),[1,1]);
  e.setActive('kushan-house');assert.equal(e.metadata().activeFeature,null);assert.equal(e.metadata().pendingPool,'kushan-house');
  e.update(0,{immediate:true});assert.ok(e.metadata().lights.every(l=>l.intensity===0));
  await catalog.ensure('kushan-house');await new Promise(r=>setTimeout(r,0));assert.equal(ready,1);assert.equal(e.metadata().activeFeature,'kushan-house');
  e.update(0,{immediate:true});const lit=e.metadata().lights.find(l=>l.intensity>0);assert.equal(lit.intensity,100);assert.equal(lit.mapSize,512);
  const light=scene.children.find(c=>c.isSpotLight&&c.intensity>0);assert.equal(light.map,catalog.get('kushan-house').texture);
  for(const key of ['position','target'])assert.deepEqual(lit[key],catalog.records['kushan-house'][key]);
  e.setActive(null);e.update(0,{immediate:true});assert.ok(scene.children.filter(c=>c.isSpotLight).every(l=>l.map&&l.intensity===0));
  e.dispose();assert.equal(scene.children.length,0);assert.ok(catalog.get('kushan-house').texture.image.data.length>0);catalog.dispose();
});
test('film emphasis keeps its own 512 map for byte pools after a texture pool',()=>{
  const scene=new THREE.Scene(),bytes=new Uint8Array(512*512*4).fill(7),texture=new THREE.DataTexture(new Uint8Array(4*4*4),4,4);
  const pose={position:[0,10,0],target:[0,0,0],angle:.2,hull:[],hulls:[[]],clusterCount:1,planeY:0};
  const effect=createCalloutEmphasis(scene,{featureIdFor:c=>c.id,pools:{a:{...pose,texture},b:{...pose,bytes}}}),light=effect.lights[0],own=light.map;
  assert.equal(own.image.width,512);
  effect.update([{id:'a',slot:0,opacity:1}],{a:{point:[0,0,0]}});assert.equal(light.map,texture);
  effect.update([{id:'b',slot:0,opacity:1}],{b:{point:[0,0,0]}});assert.equal(light.map,own);assert.equal(light.map.image.data[0],7);
});
