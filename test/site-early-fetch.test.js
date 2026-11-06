import test from 'node:test';
import assert from 'node:assert/strict';
import {createEarlyFetch} from '../src/site/early-fetch.js';

const manifest={packs:{core:{file:'core.a.bin'},grids:{file:'grids.b.bin'},'step-0':{file:'step-0.c.bin'}},firstView:['core','grids'],
  pages:{'z+':{maps:{albedo:{file:'zp-albedo.webp'},normal:{file:'zp-normal.webp'}}},late:{maps:{albedo:{file:'late.webp'}}}},firstViewPages:['z+']};

test('first-view requests start once, early, and each goes to the first loader request for its URL',async()=>{
  const calls=[];
  const get=async(url,init)=>{calls.push([url,init?.cache??null]);return new Response(url.endsWith('manifest.json')?JSON.stringify(manifest):'bytes:'+url);};
  const early=createEarlyFetch('/b/site-tier/',{get});
  const files=await early.primeFirstView();
  assert.deepEqual(files,['core.a.bin','grids.b.bin','zp-albedo.webp','zp-normal.webp']);
  assert.deepEqual(calls.map(c=>c[0]),['/b/site-tier/manifest.json',...files.map(f=>'/b/site-tier/'+f)]);
  assert.equal(calls[0][1],'no-cache');
  const m=await (await early.fetch('/b/site-tier/manifest.json',{cache:'no-cache'})).json();assert.deepEqual(m,manifest);
  assert.equal(await (await early.fetch('/b/site-tier/core.a.bin')).text(),'bytes:/b/site-tier/core.a.bin');
  assert.equal(calls.length,5,'claimed responses are not fetched again');
  await early.fetch('/b/site-tier/core.a.bin');await early.fetch('/b/site-tier/step-0.c.bin');
  assert.equal(calls.length,7,'second and non-first-view requests go to the network');
  assert.deepEqual(early.unclaimed(),files.slice(1).map(f=>'/b/site-tier/'+f));
});

test('a failed manifest primes nothing and the loader still makes its own request',async()=>{
  const calls=[];const get=async url=>{calls.push(url);return new Response('',{status:500});};
  const early=createEarlyFetch('/s/',{get});
  assert.deepEqual(await early.primeFirstView(),[]);
  assert.equal((await early.fetch('/s/manifest.json')).status,500);assert.equal(calls.length,1);
  assert.equal((await early.fetch('/s/manifest.json')).status,500);assert.equal(calls.length,2);
});
