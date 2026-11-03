import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createEraSite } from '../../src/eras/site-state.js';
import { filmState } from '../../src/film/timeline.js';

const out = fileURLToPath(new URL('../../output/lookdev/modelling/m1/', import.meta.url));
mkdirSync(out, { recursive: true });
const site = createEraSite();
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
function run(label, seconds) {
  const ms = [], cutMs = [];
  let prev = null;
  for (const s of seconds) {
    const t = performance.now(); const r = site.applyState(filmState(s).scene); const e = performance.now() - t;
    ms.push(e); if (prev !== null && r.cutStep !== prev) cutMs.push(e); prev = r.cutStep;
  }
  return { label, steps: ms.length, p50: +pct(ms, .5).toFixed(2), p95: +pct(ms, .95).toFixed(2), max: +Math.max(...ms).toFixed(2), cutStepChanges: cutMs.length, cutChangeP50: cutMs.length ? +pct(cutMs, .5).toFixed(2) : null };
}
site.applyState(filmState(0).scene);
let seed = 20240607 >>> 0;
const rand = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const forward = Array.from({ length: 600 }, (_, i) => i * 0.1);
const backward = [...forward].reverse();
const random = Array.from({ length: 600 }, () => rand() * 60);
const res = [run('forward 0-60 s @0.1 s', forward), run('backward 60-0 s @0.1 s', backward), run('random seeded 600 jumps', random)];
console.log(JSON.stringify(res, null, 1));
writeFileSync(out + 'applystate-timings.json', JSON.stringify({ node: process.version, results: res }, null, 1));
