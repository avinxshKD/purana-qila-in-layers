// Diagnostic: is the x/y correlation anisotropy on the era tops a lighting effect? Shades the CPU active-top heightfield
// (stack.js activeTopAt) with a Lambert key from KEY_LIGHT_POSITION, and with that key turned 90 degrees about y, on the
// same 7 cm cells and 4.2 m window as top-texture.mjs, plus the height itself; texture.cjs measures corr and stripes.
// Usage: node scripts/modelling/top-shade-anisotropy.mjs [--era=3]   -> output/lookdev/modelling/m1/work/top-shade/
import { writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { activeTopAt, ERA_IDS } from '../../src/eras/stack.js';
import { KEY_LIGHT_POSITION } from '../../src/strata-surface.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = root + 'output/lookdev/modelling/m1/work/top-shade/';
const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const eras = args.era !== undefined ? args.era.split(',').map(Number) : ERA_IDS.map((_, i) => i);
const ffmpeg = root + 'tools/ffmpeg/bin/ffmpeg.exe', texture = root + 'output/review/look-stats/texture.cjs';
const CELL = .07, WINDOW = 60, SUB = 7, STEP = CELL / SUB, CX = -1.4, CZ = 0;
mkdirSync(out, { recursive: true });
const norm = v => { const l = Math.hypot(...v); return v.map(c => c / l); };
const key = norm(KEY_LIGHT_POSITION), turned = norm([KEY_LIGHT_POSITION[2], KEY_LIGHT_POSITION[1], -KEY_LIGHT_POSITION[0]]);
const enc = v => Math.round(255 * Math.max(0, Math.min(1, v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055)));
const run = (file, mode) => spawnSync(process.execPath, [texture, file, mode, 0, 0, WINDOW, WINDOW], { encoding: 'utf8' }).stdout.trim();
const results = [];
for (const i of eras) {
  const deposits = ERA_IDS.map((_, j) => j <= i ? 1 : 0), n = WINDOW * SUB + 1, x0 = CX - WINDOW * CELL / 2, z0 = CZ - WINDOW * CELL / 2;
  const h = new Float64Array(n * n);
  for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) h[b * n + a] = activeTopAt(deposits, x0 + a * STEP, z0 + b * STEP);
  const maps = { key: new Float64Array(WINDOW * WINDOW), turned: new Float64Array(WINDOW * WINDOW), height: new Float64Array(WINDOW * WINDOW) };
  for (let b = 0; b < n - 1; b++) for (let a = 0; a < n - 1; a++) {
    const gx = (h[b * n + a + 1] - h[b * n + a] + h[(b + 1) * n + a + 1] - h[(b + 1) * n + a]) / (2 * STEP);
    const gz = (h[(b + 1) * n + a] - h[b * n + a] + h[(b + 1) * n + a + 1] - h[b * n + a + 1]) / (2 * STEP);
    const N = norm([-gx, 1, -gz]), cell = Math.floor(b / SUB) * WINDOW + Math.floor(a / SUB);
    if (Math.floor(b / SUB) >= WINDOW || Math.floor(a / SUB) >= WINDOW) continue;
    maps.key[cell] += Math.max(0, N[0] * key[0] + N[1] * key[1] + N[2] * key[2]) / (SUB * SUB);
    maps.turned[cell] += Math.max(0, N[0] * turned[0] + N[1] * turned[1] + N[2] * turned[2]) / (SUB * SUB);
    maps.height[cell] += h[b * n + a] / (SUB * SUB);
  }
  // Height: mapped to 0.1..0.4 linear; shades scaled to a mid-grey albedo (0.25) so texture.cjs sees soil-like L*.
  const hs = [...maps.height], lo = Math.min(...hs), hi = Math.max(...hs);
  const record = { era: ERA_IDS[i], heightRangeMetres: +(hi - lo).toFixed(4), maps: {} };
  for (const [name, m] of Object.entries(maps)) {
    const data = Buffer.alloc(WINDOW * WINDOW * 3);
    for (let c = 0; c < WINDOW * WINDOW; c++) { const v = name === 'height' ? .1 + .3 * (m[c] - lo) / (hi - lo || 1) : .25 * m[c]; data.fill(enc(v), 3 * c, 3 * c + 3); }
    const file = out + `${ERA_IDS[i]}-${name}.png`;
    const r = spawnSync(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${WINDOW}x${WINDOW}`, '-i', 'pipe:0', '-frames:v', '1', file], { input: data });
    if (r.status !== 0) throw new Error(String(r.stderr));
    record.maps[name] = { corr: run(file, 'corr'), stripes: run(file, 'stripes') };
  }
  results.push(record);
  console.log(record.era, 'height range', record.heightRangeMetres, Object.entries(record.maps).map(([k, v]) => `${k}: ${v.corr.replace(/\s+/g, ' ')} | ${v.stripes.replace(/\s+/g, ' ')}`).join(' || '));
}
writeFileSync(out + 'top-shade.json', JSON.stringify({ key, turned, cellMetres: CELL, windowCells: WINDOW, centre: [CX, CZ], results }, null, 2) + '\n');
