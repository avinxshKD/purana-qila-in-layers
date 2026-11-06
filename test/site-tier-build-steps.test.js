import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadSiteTierAssets } from '../src/site-tier/assets.js';
import { decodeFixedSoil, decodeFixedSoilSteps } from '../src/site-tier/fixed-soil.js';
import { vertexNormalsSteps } from '../src/site-tier/world.js';

// The sliced step build (world.js) must produce the same arrays as the one-go code it replaced.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/site-tier/');
const fetch = async url => { const b = await readFile(path.join(root, url.replace(/^\/site-tier\//, ''))); return { ok: true, status: 200, json: async () => JSON.parse(b.toString('utf8')), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; };
const bits = a => new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
const FIXED = ['lattice', 'blend', 'normal', 'index', 'heights', 'pairs', 'pairHeights'];

test('sliced vertex normals are bit-identical to computeVertexNormals for every cut step soil mesh', async () => {
  const assets = await loadSiteTierAssets({ base: '/site-tier/', fetch }), meta = (await assets.core()).meta;
  let meshes = 0, yields = 0;
  for (let k = 0; k <= meta.cutSteps; k++) {
    const s = await assets.step(k);
    for (const id of meta.soilSteps[k] ?? []) {
      const { geometry: g } = s.geometry(id);
      if (g.attributes.normal) continue;
      const a = g.clone(), b = g.clone();
      a.computeVertexNormals();
      // over() true every call: a yield at every check, the worst case for slicing.
      for (const _ of vertexNormalsSteps(b, () => true)) yields++;
      assert.deepEqual(bits(b.attributes.normal.array), bits(a.attributes.normal.array), id);
      meshes++;
    }
  }
  assert.ok(meshes > 0 && yields > 0);
});

test('sliced fixed soil decode equals the one-go decode', async () => {
  const assets = await loadSiteTierAssets({ base: '/site-tier/', fetch }), meta = (await assets.core()).meta;
  for (const [name, f] of Object.entries(meta.fixedSoil)) {
    const pack = await assets.pack(f.pack), arrays = Object.fromEntries(FIXED.map(x => [x, pack.arrays[`fixed:${name}:${x}`]]));
    const a = decodeFixedSoil(arrays, f), steps = decodeFixedSoilSteps(arrays, f, () => true);
    let r, yields = 0; while (!(r = steps.next()).done) yields++;
    const b = r.value;
    assert.ok(yields > 0, name);
    assert.deepEqual(Object.keys(b.attributes), Object.keys(a.attributes));
    for (const k of Object.keys(a.attributes)) assert.deepEqual(bits(b.attributes[k].array), bits(a.attributes[k].array), `${name} ${k}`);
    assert.equal(b.index.array.constructor, a.index.array.constructor);
    assert.deepEqual(bits(b.index.array), bits(a.index.array), `${name} index`);
  }
});
