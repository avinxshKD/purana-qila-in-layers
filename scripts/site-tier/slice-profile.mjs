// Slice lengths of the sliced cut step pieces (world.js vertexNormalsSteps, fixed-soil decodeFixedSoilSteps) in Node
// at a given budget. Usage: node scripts/site-tier/slice-profile.mjs [budgetMs]
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadSiteTierAssets } from '../../src/site-tier/assets.js';
import { decodeFixedSoilSteps } from '../../src/site-tier/fixed-soil.js';
import { vertexNormalsSteps } from '../../src/site-tier/world.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/site-tier/');
const fetch = async url => { const b = await readFile(path.join(root, url.replace(/^\/site-tier\//, ''))); return { ok: true, status: 200, json: async () => JSON.parse(b.toString('utf8')), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; };
const now = () => performance.now(), budget = Number(process.argv[2] ?? 8);
const assets = await loadSiteTierAssets({ base: '/site-tier/', fetch }), meta = (await assets.core()).meta;
const FIXED = ['lattice', 'blend', 'normal', 'index', 'heights', 'pairs', 'pairHeights'];
function slices(make) {
  let end = 0; const it = make(() => now() > end), out = [];
  for (let done = false; !done;) { const t = now(); end = t + budget; let r; do r = it.next(); while (!r.done && !(now() > end)); done = r.done; out.push(now() - t); }
  return { slices: out.length, maxMs: +Math.max(...out).toFixed(2), totalMs: +out.reduce((a, b) => a + b, 0).toFixed(2) };
}
const rows = [];
for (let k = 0; k <= meta.cutSteps; k++) {
  const s = await assets.step(k);
  for (const id of meta.soilSteps[k] ?? []) { const { geometry: g } = s.geometry(id); if (g.attributes.normal) continue; const c = g.clone(); rows.push({ id, ...slices(over => vertexNormalsSteps(c, over)) }); }
}
for (const [name, f] of Object.entries(meta.fixedSoil)) {
  const pack = await assets.pack(f.pack), arrays = Object.fromEntries(FIXED.map(x => [x, pack.arrays[`fixed:${name}:${x}`]]));
  rows.push({ id: `fixed:${name}`, ...slices(over => decodeFixedSoilSteps(arrays, f, over)) });
}
console.log(JSON.stringify({ budgetMs: budget, maxSliceMs: Math.max(...rows.map(r => r.maxMs)), rows }));
