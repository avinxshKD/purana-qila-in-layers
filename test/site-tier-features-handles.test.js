import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { createTierFeatures } from '../src/site-tier/features.js';
import { activeTopGrid, sampleGrid } from '../src/eras/stack.js';
import { anchorStateKey, yieldAnchorWork } from '../src/eras/site-driver.js';

// Small pack-shaped inputs test the adapter without constructing the native archaeological kit.
function fixture() {
  const source = x => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([x, .5, 0, x, .5, 1, x + 1, .5, 0, x + 1, .5, 1], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(12).fill(.2), 3));
    g.setAttribute('featureFinish', new THREE.Float32BufferAttribute([1, 0, 1, 0, 1, 0, 1, 0], 2));
    g.setIndex([0, 1, 2, 2, 1, 3]); g.computeBoundingBox(); g.computeBoundingSphere();
    return { geometry: g, record: { ends: [0, 3, 6] } };
  };
  const records = new Map([['a', source(0)], ['b', source(2)]]);
  for (const part of ['body', 'soil', 'cracks']) {
    const entry = source(0);
    if (part === 'cracks') entry.geometry.deleteAttribute('color');
    records.set(`ring:${part}`, entry);
  }
  const volume = (id, y) => ({ id, box: { xmin: -1, xmax: 1, zmin: -1, zmax: 1 }, floor: { A: 0, B: 0, C: y }, depthRange: 10, walls: [{ normal: [0, 1, 0], constant: 100 }] });
  const kitAnchors = Array.from({ length: 13 }, () => Array.from({ length: 3 }, (_, q) => ({ courseCount: 2, anchor: { id: 'fixture', point: [.25, .5, .25], normal: [0, 1, 0], visible: q > 0 } })));
  const core = { meta: {
    defaultStep: 12, featureDriver: { centre: Array.from({ length: 11 }, (_, i) => i - 10), preMauryanBand: [-10, -9], sealedPit: null, ring: { topY: -7, bottomY: -9 },
      volumes: [volume('ring-well-pit', -10), volume('controlled-pit:lower', -10)] },
    featureItems: { fixture: { featureId: 'fixture', kitId: 'fixture', part: null, era: 0, rule: 'wall', buried: .25, dug: true, dugMin: .5, courseCount: 2, kitAnchors,
      matrix: new THREE.Matrix4().toArray(), bbox: { min: [0, .5, 0], max: [3, .5, 1] }, findCandidates: null, slots: [{ castShadow: true, receiveShadow: true, roughness: .8, paint: 'paint:test' }] } },
    featureSteps: Array.from({ length: 13 }, (_, k) => ({ fixture: [k === 4 ? 'b' : 'a'] })),
    ring: ['body', 'soil', 'cracks'].map(key => ({ key, id: `ring:${key}`, colour: 0xffffff, vertexColors: key !== 'cracks', castShadow: true, receiveShadow: false })),
    ringWell: { sinkMetres: 1.234567 }
  }, arrays: { 'paint:test': Uint8Array.from([24, 8, 2, 128, 24, 8, 2, 128, 24, 8, 2, 128, 24, 8, 2, 128]) },
    header: { arrays: { 'paint:test': { width: 2, height: 2, box: [0, 0, 3, 1] } } } };
  const stack = { xmin: -12, zmin: -12, stepMetres: 24, nx: 2, nz: 2, grids: Array.from({ length: 11 }, (_, i) => new Float32Array(4).fill(i - 10)) };
  return { core, stack, records, geometry: id => { const entry = records.get(id); if (!entry) throw new Error(`not resident: ${id}`); return entry; } };
}
const state = (k = 12, d = 1, f = 1) => ({ schemaVersion: 1, deposits: Array(10).fill(d), features: Array(10).fill(f), excavation: k / 12 });
const table = () => ({ features: ['fixture'], parts: [], points: [[.25, .51, .25, 0, 1, 0, -1], [2.25, .51, .25, 0, 1, 0, -1]],
  states: { [anchorStateKey(state(0))]: [1], [anchorStateKey(state(4))]: [3] } });

test('priority anchor continuations prefer scheduler.yield and fall back to real MessageChannel tasks without timers', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'scheduler'), timeout = globalThis.setTimeout;
  let schedulerCalls = 0, timerCalls = 0;
  try {
    Object.defineProperty(globalThis, 'scheduler', { configurable: true, value: { yield: () => { schedulerCalls++; return Promise.resolve(); } } });
    globalThis.setTimeout = (...args) => { timerCalls++; return timeout(...args); };
    await yieldAnchorWork(); assert.equal(schedulerCalls, 1);
    Object.defineProperty(globalThis, 'scheduler', { configurable: true, value: undefined });
    let done = false;
    const pending = yieldAnchorWork().then(() => { done = true; });
    await Promise.resolve(); assert.equal(done, false, 'fallback must yield a task, not only a microtask');
    await pending;
    const order = [];
    await Promise.all([1, 2, 3].map(id => yieldAnchorWork().then(() => order.push(id))));
    assert.deepEqual(order, [1, 2, 3]); assert.equal(timerCalls, 0);
  } finally {
    globalThis.setTimeout = timeout;
    if (descriptor) Object.defineProperty(globalThis, 'scheduler', descriptor); else delete globalThis.scheduler;
  }
});

test('nearest anchors build no trees and sparse soil samples preserve the full Float32 grid exactly', () => {
  const data = fixture(), { site } = createTierFeatures({ ...data, anchorTable: table() });
  try {
    data.stack.grids.forEach((grid, layer) => { for (let i = 0; i < grid.length; i++) grid[i] += i * .1734567 + layer * i * .0076543; });
    const scene = state(0, .731234567, .371234);
    scene.deposits = scene.deposits.map((d, i) => d - i * .01234567);
    const result = site.applyState(scene, { anchors: 'nearest' });
    assert.deepEqual(result.featureAnchors.fixture.point, [.25, .51, .25]);
    assert.equal(site.anchorStatus().topDirty, true);
    assert.equal(site.anchorStatus().trees, 0); assert.equal(site.anchorStatus().preparation, null);
    const expected = activeTopGrid(data.stack, scene.deposits);
    for (const [x, z] of [[0, 0], [-5.4321, 3.4567], [7.6543, -4.5678]]) {
      const y = sampleGrid(data.stack, expected, x, z);
      for (const delta of [-1e-10, 0, 1e-10]) assert.equal(site.soilAt(x, y + delta, z), delta < 0, `soil ${x},${z},${delta}`);
    }
    assert.equal(site.anchorStatus().topDirty, true, 'sparse queries must not rebuild the full grid');
    assert.deepEqual(site.activeTop, expected); assert.equal(site.anchorStatus().topDirty, false);
    const before = site.state;
    assert.throws(() => site.applyState(scene, { anchors: 'invalid' }), /nearest or exact/);
    assert.equal(site.state, before);
  } finally { site.dispose(); }
});

test('prepared affine-safe ranges refine exactly, cancel cleanly and release their owned CPU caches', async () => {
  const data = fixture(), matrix = new THREE.Matrix4();
  matrix.elements[1] = .37; matrix.elements[9] = -.21;
  data.core.meta.featureItems.fixture.matrix = matrix.toArray();
  data.core.meta.featureItems.fixture.bbox = { min: [-10, -10, -10], max: [10, 10, 10] };
  const { site } = createTierFeatures({ ...data, anchorTable: table() });
  const baseline = createTierFeatures({ ...data, anchorTable: null }).site;
  try {
    for (const scene of [state(0, .912345, .01), state(0, .823456, .8), state(4, .834567, .371234), state(0, .912345, .01)]) {
      const expected = baseline.applyState(scene);
      site.applyState(scene, { anchors: 'nearest' });
      assert.deepEqual(await site.refineAnchors(), expected);
      assert.deepEqual(site.applyState(scene), expected);
      assert.ok(site.anchorStatus().trees > 0);
      const mesh = site.items[0].handle.object.children[0], source = data.records.get(scene.excavation ? 'b' : 'a').geometry;
      assert.equal(mesh.geometry.index, source.index); assert.equal(mesh.geometry.attributes.position, source.attributes.position);
      assert.ok(Number.isFinite(site.anchorStatus().refinement.maxChunkMs));
    }
    const trees = site.anchorStatus().trees;
    site.applyState(state(4, .834567, .371234), { anchors: 'nearest' });
    assert.equal(site.release(['a']), 1); assert.ok(site.anchorStatus().trees < trees);
    const aborted = new AbortController(), pending = site.refineAnchors({ signal: aborted.signal });
    aborted.abort(); assert.equal(await pending, null);
    const stale = site.refineAnchors();
    site.applyState(state(0, .712345, .371234), { anchors: 'nearest' });
    assert.equal(await stale, null);
    const disposed = site.refineAnchors(); site.dispose();
    assert.equal(await disposed, null); assert.equal(site.anchorStatus().trees, 0);
  } finally { site.dispose(); baseline.dispose(); }
});

test('wrappers share all source attributes and the index, with only small owned UV/white attributes', () => {
  const data = fixture(), { site, paintStats } = createTierFeatures({ ...data, anchorTable: null });
  try {
    site.applyState(state());
    const mesh = site.items[0].handle.object.children[0], source = data.records.get('a').geometry;
    assert.notEqual(mesh.geometry, source);
    for (const [name, attribute] of Object.entries(source.attributes)) assert.equal(mesh.geometry.getAttribute(name), attribute, name);
    assert.equal(mesh.geometry.index, source.index);
    assert.equal(mesh.geometry.attributes.uv.array.constructor, Float32Array, 'paint UVs preserve Float32 values');
    const cracks = site.items.find(it => it.part === 'cracks').handle.object.children[0];
    assert.equal(cracks.geometry.attributes.color.array.constructor, Uint8Array);
    assert.equal(cracks.geometry.attributes.color.normalized, true);
    assert.equal(cracks.geometry.attributes.uv.array.constructor, Uint8Array);
    assert.equal(paintStats.textures, 1); assert.equal(paintStats.bytes, 200);
    assert.ok(Number.isFinite(paintStats.loadCpuMs) && paintStats.loadCpuMs >= 0);
    const signatures = new Set();
    for (const it of site.items) for (const m of it.handle.object.children) {
      assert.ok(m.material.isMeshStandardMaterial); assert.ok(m.material.map); assert.equal(m.material.vertexColors, true);
      assert.equal(m.material.onBeforeCompile, THREE.Material.prototype.onBeforeCompile);
      signatures.add(JSON.stringify([m.material.type, m.material.side, m.material.vertexColors, !!m.material.map]));
    }
    assert.equal(signatures.size, 2, 'only native front-sided features versus double-sided ring changes defines');
  } finally { site.dispose(); }
});

test('scrubbing reuses wrappers, warming is inert, and release disposes wrappers but never pack resources', () => {
  const data = fixture(), { site } = createTierFeatures({ ...data, anchorTable: null });
  let packDisposals = 0;
  for (const entry of data.records.values()) entry.geometry.addEventListener('dispose', () => packDisposals++);
  try {
    site.applyState(state(0));
    const item = site.items[0], mesh = item.handle.object.children[0], a = mesh.geometry;
    let wrapperDisposals = 0; a.addEventListener('dispose', () => wrapperDisposals++);
    const before = { geometry: mesh.geometry, count: mesh.geometry.drawRange.count, visible: mesh.visible, state: site.state, matrix: item.handle.object.matrix.toArray() };
    assert.ok(site.warmState(state(4)) >= 0);
    assert.equal(mesh.geometry, before.geometry); assert.equal(mesh.geometry.drawRange.count, before.count); assert.equal(mesh.visible, before.visible);
    assert.equal(site.state, before.state); assert.deepEqual(item.handle.object.matrix.toArray(), before.matrix);
    site.applyState(state(4)); const b = mesh.geometry;
    assert.notEqual(b, a); assert.equal(wrapperDisposals, 0);
    site.applyState(state(0)); assert.equal(mesh.geometry, a); assert.equal(wrapperDisposals, 0);
    assert.throws(() => site.release(['a']), /displayed/);
    site.applyState(state(4));
    assert.equal(site.release(['a']), 1); assert.equal(wrapperDisposals, 1); assert.equal(packDisposals, 0);
    site.applyState(state(0)); assert.notEqual(mesh.geometry, a);
  } finally { site.dispose(); site.dispose(); }
  assert.equal(packDisposals, 0);
});

test('dug gates, rounded reveal tiers and the fixed ring heap use the shared native state driver', () => {
  const { site } = createTierFeatures({ ...fixture(), anchorTable: null });
  try {
    const mesh = site.items[0].handle.object.children[0];
    site.applyState(state(0, .499999, 1)); assert.equal(mesh.visible, false); assert.equal(mesh.geometry.drawRange.count, 0);
    site.applyState(state(0, .5, .01)); assert.equal(mesh.geometry.drawRange.count, 3);
    site.applyState(state(0, .5, .8)); assert.equal(mesh.geometry.drawRange.count, 6);
    assert.equal(site.ringWell.offset(), -.617283);
    for (const it of site.items.filter(it => it.ring)) {
      assert.equal(it.matrix.elements[13], it.part === 'soil' ? 0 : -.617283);
      assert.equal(it.handle.object.children[0].geometry.drawRange.count, Infinity);
    }
    const before = site.state, geometry = mesh.geometry;
    assert.throws(() => site.applyState({ ...state(), features: [NaN] }), /finite/);
    assert.equal(site.state, before); assert.equal(mesh.geometry, geometry);
    site.applyState(state(0, 1, 0)); assert.equal(site.ringWell.offset(), 0);
  } finally { site.dispose(); }
});

test('driver import, packed applyState and warmState construct zero kit shapes', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const code = `
    import assert from 'node:assert/strict';
    import { registerHooks } from 'node:module';
    import * as THREE from 'three';
    globalThis.__kitConstructions = 0;
    registerHooks({ load(url, context, next) {
      const result = next(url, context);
      if (url.endsWith('/src/features/index.js')) {
        const source = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
        const marker = 'export function buildFeature(spec,ctx={}) {';
        assert.ok(source.includes(marker), 'construction counter must instrument the real kit entry point');
        return { ...result, source: source.replace(marker, marker + ' globalThis.__kitConstructions++;') };
      }
      return result;
    } });
    const start = performance.now();
    const { createTierFeatures } = await import('./src/site-tier/features.js');
    console.log(JSON.stringify({ featuresImportWithThreeResidentMs: performance.now() - start }));
    const data = (${fixture.toString()})();
    const { site } = createTierFeatures({ ...data, anchorTable: null });
    const scene = { schemaVersion: 1, deposits: Array(10).fill(1), features: Array(10).fill(1), excavation: 0 };
    site.applyState(scene); site.warmState({ ...scene, excavation: 1 }); site.applyState({ ...scene, excavation: 1 }); site.dispose();
    assert.equal(globalThis.__kitConstructions, 0);
    const fs = await import('node:fs');
    const { loadSiteTierAssets } = await import('./src/site-tier/assets.js');
    const assets = await loadSiteTierAssets({ fetch: async path => {
      try { return new Response(fs.readFileSync(process.cwd() + '/public/site-tier/' + path.replace(/^\\/site-tier\\//, ''))); }
      catch { return new Response(null, { status: 404 }); }
    } });
    const core = await assets.core(), stack = await assets.grids();
    let resident = await assets.step(12);
    const real = createTierFeatures({ core, stack, geometry: id => resident.geometry(id) });
    real.site.applyState({ ...scene, excavation: 1 });
    resident = await assets.step(0);
    real.site.warmState(scene); real.site.applyState(scene); real.site.dispose();
    assert.equal(globalThis.__kitConstructions, 0, 'installed-pack apply/warm must also build zero kit shapes');
    await import('./src/eras/site-state.js');
    assert.equal(globalThis.__kitConstructions, 0, 'even importing the native construction entry point stays lazy');
    const { buildFeature } = await import('./src/features/index.js');
    const control = buildFeature({ id: 'counter-control', kind: 'brick-wall', footprint: [[0,0],[.2,0],[.2,.1],[0,.1]], courses: 1, seed: 1 });
    assert.ok(globalThis.__kitConstructions > 0, 'positive control proves the counter observes real kit construction');
    control.dispose();
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, encoding: 'utf8', timeout: 30000 });
  assert.equal(child.status, 0, child.stdout + child.stderr);
  console.log(child.stdout.trim());
});
