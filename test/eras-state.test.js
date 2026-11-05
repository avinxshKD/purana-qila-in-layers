import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createEraSite } from '../src/eras/site-state.js';
import { sceneForYear } from '../src/film/scene-year.js';
import { filmState } from '../src/film/timeline.js';

function digest(site) {
  const h = createHash('sha256');
  for (const it of site.items) for (const m of it.handle.object.children) {
    const count = m.visible ? m.geometry.drawRange.count : 0;
    h.update(`${it.key}:${count}:${it.handle.object.matrix.elements.join(',')};`);
    if (!count) continue;
    for (const name of ['position', 'normal', 'color']) {
      const a = m.geometry.getAttribute(name)?.array;
      if (!a) continue;
      h.update(Buffer.from(a.buffer, a.byteOffset, Math.min(a.length, count * 3) * 4));
    }
  }
  h.update(Buffer.from(site.activeTop.buffer));
  return h.digest('hex');
}
const site = createEraSite();
const A = filmState(1.0).scene, B = filmState(30.2).scene, C = filmState(53.9).scene;

test('applyState A, B, A matches a fresh applyState(A), forwards and backwards', () => {
  const fresh = createEraSite();
  fresh.applyState(A); const ref = digest(fresh); fresh.dispose();
  site.applyState(A); assert.equal(digest(site), ref);
  site.applyState(B); assert.notEqual(digest(site), ref);
  site.applyState(A); assert.equal(digest(site), ref);
  site.applyState(C); site.applyState(B); site.applyState(A); assert.equal(digest(site), ref);
});

test('a full backward scrub and a forward scrub land on identical geometry', () => {
  site.applyState(filmState(0).scene); const ref = digest(site);
  for (let s = 0; s <= 60; s += .37) site.applyState(filmState(s).scene);
  for (let s = 60; s >= 0; s -= .41) site.applyState(filmState(s).scene);
  site.applyState(filmState(0).scene);
  assert.equal(digest(site), ref);
});

test('warmState leaves the displayed state unchanged, returns ms, and the warmed state is a cache hit', () => {
  site.applyState(sceneForYear(2013)); const before = digest(site);
  let total = 0;
  for (const year of [2014, 2018, 2023]) { const ms = site.warmState(sceneForYear(year)); assert.ok(Number.isFinite(ms) && ms >= 0); total += ms; }
  assert.equal(digest(site), before);
  for (const year of [2014, 2018, 2023, 2013]) {
    site.applyState(sceneForYear(year));
    for (const it of site.items) assert.equal(it.handle.stats.lastCutCacheHit, true, `${it.key} at ${year}`);
  }
});

test('return values: anchors keyed by featureId, active-top anchor, no reconstruction outline', () => {
  const out = site.applyState(sceneForYear(2023));
  assert.equal(out.hasReconstructionOutline, false);
  assert.equal(out.cutStep, 12);
  for (const id of ['mauryan-ring-well', 'kushan-house', 'pre-mauryan-soil', 'rajput-wall', 'sunga-burnt-patches', 'deepest-cut'])
    assert.ok(out.featureAnchors[id] && out.featureAnchors[id].point.every(Number.isFinite), id);
  assert.ok(out.activeTopAnchor.point.every(Number.isFinite));
  const low = site.applyState(sceneForYear(-539));
  assert.ok(low.activeTopAnchor.point[1] < out.activeTopAnchor.point[1] - 8);
});

test('state validation rejects malformed input', () => {
  assert.throws(() => site.applyState({ schemaVersion: 2, deposits: Array(10).fill(0), features: Array(10).fill(0), excavation: 0 }));
  assert.throws(() => site.applyState({ schemaVersion: 1, deposits: Array(9).fill(0), features: Array(10).fill(0), excavation: 0 }));
  assert.throws(() => site.applyState({ schemaVersion: 1, deposits: Array(10).fill(0), features: Array(10).fill(0), excavation: NaN }));
});
