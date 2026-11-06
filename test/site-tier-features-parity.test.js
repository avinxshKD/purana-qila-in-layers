// Exact native/packed CPU state parity. Filter test names to keep each locked battery run below ten minutes.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadSiteTierAssets } from '../src/site-tier/assets.js';
import { createTierFeatures } from '../src/site-tier/features.js';
import { createEraSite } from '../src/eras/site-state.js';
import { ANCHOR_TABLE } from '../src/eras/anchor-table.js';
import { anchorStateKey } from '../src/eras/site-driver.js';
import { sceneForYear, EXCAVATION_STOPS } from '../src/film/scene-year.js';
import { featureFootprint } from '../src/film/emphasis.js';

const dir = fileURLToPath(new URL('../public/site-tier/', import.meta.url));
const callouts = JSON.parse(readFileSync(new URL('../reference/film-callouts.json', import.meta.url), 'utf8'));
const poolIds = [...new Set(callouts.sections.flatMap(s => s.callouts.map(c => c.featureId)))];
let pending;
async function setup() {
  return pending ??= (async () => {
    const assets = await loadSiteTierAssets({ fetch: async path => {
      try { return new Response(readFileSync(dir + path.replace(/^\/site-tier\//, ''))); } catch { return new Response(null, { status: 404 }); }
    } });
    const core = await assets.core(), stack = await assets.grids();
    assert.ok(core.meta.featureDriver, 'rebuild/install the packs with featureDriver and kitAnchors before running parity');
    const native = createEraSite();
    assert.deepEqual(core.meta.featureDriver, native.driverData, 'packed context must be the exact live context, not another implementation');
    assert.equal(core.meta.ringWell.sinkMetres, native.ringWell.sinkMetres);
    let resident = await assets.step(core.meta.defaultStep);
    const tier = createTierFeatures({ core, stack, geometry: id => resident.geometry(id) });
    console.log(JSON.stringify({ featurePaintLoad: tier.paintStats, estimatedPaintGpuBytesWithMips: Math.ceil(tier.paintStats.bytes * 4 / 3) }));
    return { native, tier: tier.site, core, async resident(k) { resident = await assets.step(k); }, geometry: id => resident.geometry(id) };
  })();
}
after(async () => { if (pending) { const s = await pending; s.native.dispose(); s.tier.dispose(); } });
const full = k => ({ schemaVersion: 1, deposits: Array(10).fill(1), features: Array(10).fill(1), excavation: k / 12 });
const trace = (phase, detail) => { if (process.env.TIER_FEATURE_TRACE) console.log(JSON.stringify({ phase, detail, elapsedMs: performance.now() })); };
const footprintCache = new WeakMap();
function fullFootprint(site, id) {
  // Full-course footprints ignore visibility and drawRange. Reuse a calculation only while every geometry,
  // position/index version and world matrix is identical. The tolerance and the compared fields do not change.
  const signature = site.items.filter(it => it.featureId === id).flatMap(it => it.handle.object.children.map(m =>
    [m.geometry.uuid, m.geometry.attributes.position?.version, m.geometry.index?.version, ...m.matrixWorld.elements].join(','))).join('|');
  let cache = footprintCache.get(site);
  if (!cache) footprintCache.set(site, cache = new Map());
  const key = `${id}:${signature}`;
  if (!cache.has(key)) cache.set(key, JSON.parse(JSON.stringify(featureFootprint(site.items, id, { fullGeometry: true, clusters: true }))));
  return cache.get(key);
}

function near(a, b, label) {
  if (typeof a === 'number') { assert.ok(Math.abs(a - b) <= 1e-5, `${label}: ${a} versus ${b}`); return; }
  if (Array.isArray(a)) { assert.ok(Array.isArray(b), label); assert.equal(a.length, b.length, label); a.forEach((v, i) => near(v, b[i], `${label}[${i}]`)); return; }
  if (a && typeof a === 'object') { assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), label); for (const key of Object.keys(a)) near(a[key], b[key], `${label}.${key}`); return; }
  assert.equal(a, b, label);
}
async function parity(scene, footprints = true) {
  const s = await setup(), k = Math.round(Math.max(0, Math.min(1, scene.excavation)) * 12);
  trace('resident:start', k);
  await s.resident(k);
  trace('native:apply', k);
  const expected = s.native.applyState(scene);
  trace('packed:apply', k);
  let actual;
  if (ANCHOR_TABLE.states[anchorStateKey(scene)]) actual = s.tier.applyState(scene);
  else {
    s.tier.applyState(scene, { anchors: 'nearest' });
    actual = await s.tier.refineAnchors();
    assert.notEqual(actual, null, 'settled refinement must finish for an unchanged state');
  }
  trace('compare:items', k);
  s.native.group.updateMatrixWorld(true); s.tier.group.updateMatrixWorld(true);
  assert.deepEqual(actual, expected, `state ${anchorStateKey(scene)}`);
  assert.equal(s.tier.ringWell.offset(), s.native.ringWell.offset());
  assert.equal(s.tier.items.length, s.native.items.length);
  for (let i = 0; i < s.native.items.length; i++) {
    const n = s.native.items[i], p = s.tier.items[i], label = `${n.key} at step ${k}`;
    for (const key of ['key', 'featureId', 'part', 'kitId', 'era', 'rule', 'dug', 'dugMin', 'buried']) assert.equal(p[key], n[key], `${label} ${key}`);
    assert.deepEqual(p.matrix.toArray(), n.matrix.toArray(), label);
    assert.deepEqual(p.handle.object.matrix.toArray(), n.handle.object.matrix.toArray(), label);
    assert.equal(p.handle.courseCount, n.handle.courseCount, label);
    const pm = p.handle.object.children, nm = n.handle.object.children;
    assert.equal(pm.length, nm.length, label);
    for (let slot = 0; slot < nm.length; slot++) {
      assert.equal(pm[slot].visible, nm[slot].visible, `${label} slot ${slot} visible`);
      assert.equal(pm[slot].geometry.drawRange.count, nm[slot].geometry.drawRange.count, `${label} slot ${slot} reveal`);
      assert.equal(pm[slot].castShadow, nm[slot].castShadow, label);
      assert.equal(pm[slot].receiveShadow, nm[slot].receiveShadow, label);
      if (!p.ring) {
        const id = s.core.meta.featureSteps[k][p.key][slot];
        if (id) {
          const source = s.geometry(id).geometry;
          for (const name of ['position', 'normal', 'color']) assert.equal(pm[slot].geometry.attributes[name], source.attributes[name], `${label} shared ${name}`);
          assert.equal(pm[slot].geometry.index, source.index, `${label} shared index`);
        }
      }
    }
  }
  if (footprints) for (const id of poolIds) {
    trace('native:footprint', id);
    const a = fullFootprint(s.native, id);
    trace('packed:footprint', id);
    const b = fullFootprint(s.tier, id);
    near(a, b, `full footprint ${id}, step ${k}`);
  }
  trace('parity:done', k);
  return s;
}

for (let k = 0; k <= 12; k++) test(`native parity cut ${k}`, async () => { await parity(full(k)); });
for (const year of EXCAVATION_STOPS) test(`native parity excavation stop ${year}`, async () => { await parity(sceneForYear(year)); });
for (let era = 0; era < 10; era++) test(`native parity era endpoint ${era}`, async () => {
  const deposits = Array.from({ length: 10 }, (_, i) => Number(i <= era));
  await parity({ schemaVersion: 1, eraIndex: era, deposits, features: [...deposits], excavation: 0 });
});
for (const year of [129.125, 257.375, 817.2, 1328.875, 1743.21, 1907.1234]) test(`native parity runtime fallback year ${year}`, async () => {
  const scene = sceneForYear(year);
  assert.equal(ANCHOR_TABLE.states[anchorStateKey(scene)], undefined, 'sample must exercise the runtime picker, not the film table');
  await parity(scene);
});
for (let index = 0; index < 3; index++) test(`native parity dug boundary ${index}`, async () => {
  const s = await setup(), scenes = [], item = s.native.items.filter(it => !it.ring && it.dug)[index];
  assert.ok(item, `dug sample ${index}`);
  for (const d of [item.dugMin - 1e-6, item.dugMin, item.dugMin + 1e-6]) {
    const scene = full(0); scene.deposits[item.era] = d; scene.features[item.era] = .371234; scenes.push(scene);
  }
  for (const scene of [...scenes, ...scenes.slice().reverse()]) await parity(scene, false);
});
test('native parity wall-course boundaries, clamps and backward scrubs', async () => {
  const scenes = [];
  for (const f of [-1, 0, .000001, .333333, .666667, 1, 2]) {
    const scene = full(0); scene.features = Array(10).fill(f); scenes.push(scene);
  }
  for (const scene of [...scenes, ...scenes.slice().reverse()]) await parity(scene, false);
});
test('native parity warmState is inert for displayed geometry, anchors and transforms', async () => {
  const s = await parity(sceneForYear(2013), false);
  const before = s.tier.items.map(it => ({ step: it.step, matrix: it.matrix.toArray(), meshes: it.handle.object.children.map(m => ({ geometry: m.geometry, visible: m.visible, count: m.geometry.drawRange.count })) }));
  const current = s.tier.state;
  await s.resident(12); assert.ok(s.tier.warmState(sceneForYear(2023)) >= 0);
  assert.equal(s.tier.state, current);
  s.tier.items.forEach((it, i) => {
    assert.equal(it.step, before[i].step); assert.deepEqual(it.matrix.toArray(), before[i].matrix);
    it.handle.object.children.forEach((m, j) => { assert.equal(m.geometry, before[i].meshes[j].geometry); assert.equal(m.visible, before[i].meshes[j].visible); assert.equal(m.geometry.drawRange.count, before[i].meshes[j].count); });
  });
});
