// Site tier assets (scripts/site-tier/build-assets.mjs output in public/site-tier): manifest integrity, boundary grid
// round trip, and every feature item at every cut step decoded against the M1 source geometry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadSiteTierAssets } from '../src/site-tier/assets.js';
import { siteBoundaryGrids, createEraSite } from '../src/eras/site-state.js';
import { fixedGeometry, blockLevels } from '../src/eras/soil-block.js';

const dir = fileURLToPath(new URL('../public/site-tier/', import.meta.url));
const fetchFile = async path => { try { return new Response(readFileSync(dir + path.replace(/^\/site-tier\//, ''))); } catch { return new Response(null, { status: 404 }); } };
const assets = await loadSiteTierAssets({ fetch: fetchFile });
const toSrgb8 = c => Math.round((c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055) * 255);

test('manifest names content-hashed packs whose bytes match', () => {
  for (const [name, p] of Object.entries(assets.manifest.packs)) {
    const bytes = readFileSync(dir + p.file), sha = createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha, p.sha256, name); assert.ok(p.file.includes(sha.slice(0, 16)), name); assert.equal(bytes.length, p.bytes, name);
  }
  assert.deepEqual(assets.manifest.firstView, ['core', 'grids']);
});

test('boundary grids round-trip within half the 0.25 mm unit', async () => {
  const decoded = await assets.grids(), source = siteBoundaryGrids();
  assert.equal(decoded.nx, source.nx); assert.equal(decoded.nz, source.nz); assert.equal(decoded.grids.length, source.grids.length);
  let worst = 0;
  source.grids.forEach((g, j) => { for (let i = 0; i < g.length; i++) worst = Math.max(worst, Math.abs(g[i] - decoded.grids[j][i])); });
  assert.ok(worst <= .000125 + 2e-6, `max error ${worst}`);
});

test('every feature item at every cut step matches the M1 source geometry', async () => {
  const site = createEraSite({ outputScale: 1 }), core = await assets.core();
  let checked = 0, worstPosition = 0, worstNormal = 0, worstColour = 0;
  for (let k = 0; k <= site.cutSteps; k++) {
    site.applyState({ schemaVersion: 1, deposits: Array(10).fill(1), features: Array(10).fill(1), excavation: k / site.cutSteps });
    const step = await assets.step(k), entry = core.meta.featureSteps[k];
    for (const it of site.items) {
      if (it.ring) continue;
      const meta = core.meta.featureItems[it.key];
      assert.deepEqual(meta.matrix, it.handle.object.matrix.toArray(), it.key);
      it.handle.object.children.filter(o => o.isMesh).forEach((mesh, slot) => {
        const id = entry[it.key][slot], src = mesh.geometry.attributes;
        if (!id) { assert.ok(!src.position || mesh.geometry.drawRange.count === 0 || src.position.count === 0, `${it.key} slot ${slot} step ${k}`); return; }
        const { geometry, record } = step.geometry(id), index = geometry.index.array, a = geometry.attributes;
        assert.equal(index.length, src.position.count, `${id} length`); assert.equal(record.ends.at(-1), src.position.count);
        const n = it.handle.courseCount;
        for (let q = 0; q <= n; q++) { it.handle.setReveal(q > 0 ? (q - .5) / n : 0); assert.equal(record.ends[q], Math.min(mesh.geometry.drawRange.count, src.position.count), `${id} tier ${q}`); }
        // Feature positions ship as float32 (fallback anchors and footprint hulls must match createEraSite exactly).
        assert.equal(record.attributes.position.codec, 'f32', `${id} position codec`);
        const tol = [0, 0, 0];
        for (let i = 0; i < index.length; i++) {
          const v = index[i];
          for (let c = 0; c < 3; c++) {
            // Messages are built only on failure: this loop runs for every vertex of every item and step.
            const dp = Math.abs(a.position.array[3 * v + c] - src.position.array[3 * i + c]); if (!(dp <= tol[c])) assert.fail(`${id} position`); worstPosition = Math.max(worstPosition, dp);
            worstNormal = Math.max(worstNormal, Math.abs(a.normal.array[3 * v + c] - src.normal.array[3 * i + c]));
            worstColour = Math.max(worstColour, Math.abs(toSrgb8(a.color.array[3 * v + c]) - toSrgb8(src.color.array[3 * i + c])));
          }
        }
        checked++;
      });
    }
  }
  assert.ok(worstNormal <= .5 / 127 + 1e-6, `normal ${worstNormal}`); assert.ok(worstColour <= 0, `colour ${worstColour}`);
  console.log(JSON.stringify({ checked, worstPositionMm: +(worstPosition * 1000).toFixed(4), worstNormal: +worstNormal.toFixed(5), worstColourSrgb8: worstColour }));
});

test('fixed soil meshes decode bit-identical to soil-block.js fixedGeometry', async () => {
  const core = await assets.core(), { bottomY } = blockLevels(siteBoundaryGrids());
  const source = { top: fixedGeometry.top(), faces: fixedGeometry.faces(bottomY), marginTop: fixedGeometry.marginTop(), marginFaces: fixedGeometry.marginFaces(bottomY) };
  const bytes = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
  assert.deepEqual(Object.keys(core.meta.fixedSoil).sort(), Object.keys(source).sort());
  for (const [name, g] of Object.entries(source)) {
    const d = await assets.fixedSoil(name);
    assert.deepEqual(Object.keys(d.attributes).sort(), Object.keys(g.attributes).sort(), name);
    for (const k of Object.keys(g.attributes)) assert.ok(bytes(d.attributes[k].array).equals(bytes(Float32Array.from(g.attributes[k].array))), `${name} ${k}`);
    assert.equal(d.index.array.constructor, g.index.array.constructor, `${name} index type`);
    assert.ok(bytes(d.index.array).equals(bytes(g.index.array)), `${name} index`);
  }
  assert.equal(core.meta.fixedSoil.marginTop.shown, 'uncut'); assert.equal(core.meta.fixedSoil.top.shown, 'always');
  assert.ok((await assets.step(0)).packs.includes(core.meta.fixedSoil.marginTop.pack));
});

test('core meta carries the live site driver data and ring sink exactly', async () => {
  const site = createEraSite({ outputScale: 1 }), core = await assets.core();
  assert.deepEqual(core.meta.featureDriver, site.driverData);
  assert.equal(core.meta.ringWell.sinkMetres, site.ringWell.sinkMetres);
});

test('asset URLs resolve from the base: /site-tier/ under Node, the Vite base when served from a sub-path', async () => {
  const record = urls => async path => { urls.push(path); return fetchFile(path.replace(/^.*?site-tier\//, '/site-tier/')); };
  const nodeUrls = [], node = await loadSiteTierAssets({ fetch: record(nodeUrls) });
  await node.step(0);
  assert.ok(nodeUrls.length >= 2 && nodeUrls.every(u => u.startsWith('/site-tier/')), nodeUrls.join(' '));
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), base: '/purana-qila-in-layers/', logLevel: 'warn',
    appType: 'custom', server: { middlewareMode: true, hmr: false, watch: null }, optimizeDeps: { noDiscovery: true, entries: [] } });
  try {
    const { loadSiteTierAssets: load } = await server.ssrLoadModule('/src/site-tier/assets.js');
    const viteUrls = [], vite = await load({ fetch: record(viteUrls) });
    await vite.step(0);
    assert.ok(viteUrls.length >= 2 && viteUrls.every(u => u.startsWith('/purana-qila-in-layers/site-tier/')), viteUrls.join(' '));
    assert.deepEqual(viteUrls.map(u => u.slice('/purana-qila-in-layers'.length)), nodeUrls);
  } finally { await server.close(); }
});
