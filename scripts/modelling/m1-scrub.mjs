// M1 scrub test (CPU, node): the film timeline scene through createEraSite().applyState and the soil block's apply, for a
// 600-step forward, backward and seeded random scrub. Reports p50/p95/max per call and checks that the state after any
// scrub is identical (geometry digests) to a fresh site and block given the same scene. Browser upload cost is not here.
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createEraSite, siteBoundaryGrids } from '../../src/eras/site-state.js';
import { createSoilBlock } from '../../src/eras/soil-block.js';
import { stepOf } from '../../src/eras/excavation.js';
import { filmState } from '../../src/film/timeline.js';
import { TOP_CHARACTER, FLOOR_CHARACTER } from '../../src/museum-scene.js';

const out = fileURLToPath(new URL('../../output/lookdev/modelling/m1/', import.meta.url));
mkdirSync(out, { recursive: true });
const stack = siteBoundaryGrids();
const makeBlock = () => createSoilBlock({ stack, top: { character: TOP_CHARACTER, albedoMultiplier: .8, slopeDarken: .3 }, floor: { character: FLOOR_CHARACTER } });
const hashArray = (h, a) => h.update(Buffer.from(a.buffer, a.byteOffset, a.byteLength));
function digest(site, block) {
  const h = createHash('sha256');
  for (const it of site.items) for (const m of it.handle.object.children) {
    const count = m.visible ? m.geometry.drawRange.count : 0;
    h.update(`${it.key}:${count};`);
    if (!count) continue;
    for (const name of ['position', 'normal', 'color']) { const a = m.geometry.getAttribute(name).array; hashArray(h, a.subarray(0, Math.min(a.length, count * 3))); }
  }
  hashArray(h, site.activeTop);
  // Visible block meshes only: a scrubbed block also holds warmed, hidden steps that a fresh block has not built.
  for (const m of block.meshes().filter(m => m.visible)) {
    h.update(`${m.name};`);
    if (m.name.includes('-step-')) { hashArray(h, m.geometry.getAttribute('position').array); if (m.geometry.index) hashArray(h, m.geometry.index.array); }
  }
  h.update(JSON.stringify([block.uniforms.eraDeposits.value, block.uniforms.eraActive.value]));
  return h.digest('hex');
}
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r2 = v => +v.toFixed(2);
function apply(site, block, scene) {
  const t0 = performance.now(); const r = site.applyState(scene); const t1 = performance.now();
  block.apply({ deposits: scene.deposits, k: stepOf(scene.excavation) }); const t2 = performance.now();
  return { cutStep: r.cutStep, features: t1 - t0, block: t2 - t1, total: t2 - t0 };
}

const site = createEraSite(), block = makeBlock();
const warmed = { blockStepMs: {} };
for (let k = 1; k <= 12; k++) { const t = performance.now(); block.warm(k); warmed.blockStepMs[k] = r2(performance.now() - t); }
apply(site, block, filmState(0).scene);
let seed = 20240607 >>> 0;
const rand = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const forward = Array.from({ length: 600 }, (_, i) => i * .1), backward = [...forward].reverse(), random = Array.from({ length: 600 }, () => rand() * 60);
const samples = [1, 30.2, 48.7, 53.9, 59.9];
const references = Object.fromEntries(samples.map(s => {
  const freshSite = createEraSite(), freshBlock = makeBlock();
  apply(freshSite, freshBlock, filmState(s).scene);
  const d = digest(freshSite, freshBlock); freshSite.dispose(); freshBlock.dispose();
  return [s, d];
}));
const runs = [];
for (const [label, seconds] of [['forward 0-60 s @0.1 s', forward], ['backward 60-0 s @0.1 s', backward], ['random seeded 600 jumps', random]]) {
  const rows = seconds.map(s => apply(site, block, filmState(s).scene));
  const checks = samples.map(s => { apply(site, block, filmState(s).scene); return { seconds: s, cutStep: stepOf(filmState(s).scene.excavation), identicalToFresh: digest(site, block) === references[s] }; });
  runs.push({ label, steps: rows.length, ...Object.fromEntries(['features', 'block', 'total'].map(key => [key, { p50: r2(pct(rows.map(r => r[key]), .5)), p95: r2(pct(rows.map(r => r[key]), .95)), max: r2(Math.max(...rows.map(r => r[key]))) }])),
    afterScrub: checks });
}
const result = { node: process.version, method: 'node, CPU only: site.applyState + soilBlock.apply per film-timeline scene; all 12 cut steps warmed first (block.warm). Digests: feature geometry (position/normal/colour), active top, block mesh visibility, visible step geometry, deposit/era uniforms; fresh = new site and block given the same scene.', warmed, runs,
  allIdentical: runs.every(r => r.afterScrub.every(c => c.identicalToFresh)) };
console.log(JSON.stringify(result, null, 1));
writeFileSync(out + 'scrub-and-timings.json', JSON.stringify(result, null, 1) + '\n');
