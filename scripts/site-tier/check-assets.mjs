// Site tier asset check (CPU): the simplified static soil meshes of every cut step against the dense M1 meshes
// (vertical error, and vertical error times the dense normal's y, which approximates the distance along the normal),
// decode and rebuild timings, and the GPU memory the first view would hold (decoded attributes, indices, the fixed
// top and faces rebuilt from soil-block.js fixedGeometry with the planned 11-float displacement coefficients per moving
// vertex, and the paint textures; no soil texture pages yet).
// Usage: node scripts/site-tier/check-assets.mjs [--out <file>] (default output/lookdev/modelling/site-tier/check-assets.json; never replaced)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { loadSiteTierAssets } from '../../src/site-tier/assets.js';
import { siteBoundaryGrids } from '../../src/eras/site-state.js';
import { createSoilBlock, fixedGeometry, blockLevels } from '../../src/eras/soil-block.js';

const root = fileURLToPath(new URL('../../', import.meta.url)), dir = root + 'public/site-tier/';
const fetchFile = async path => new Response(readFileSync(dir + path.replace(/^\/site-tier\//, '')));
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : root + 'output/lookdev/modelling/site-tier/check-assets.json';
if (existsSync(OUT)) throw new Error(`${OUT} exists; pass a new --out file`);
const out = {};
let t = performance.now();
const assets = await loadSiteTierAssets({ fetch: fetchFile }), core = await assets.core();
out.coreLoadMs = +(performance.now() - t).toFixed(0); out.coreTimings = assets.timings.core;
const stack = siteBoundaryGrids(), levels = blockLevels(stack);
t = performance.now();
const fixed = { top: fixedGeometry.top(), marginTop: fixedGeometry.marginTop(), faces: fixedGeometry.faces(levels.bottomY), marginFaces: fixedGeometry.marginFaces(levels.bottomY), pedestal: fixedGeometry.pedestal() };
out.fixedGeometryBuildMs = +(performance.now() - t).toFixed(0);
const gpuBytes = g => Object.values(g.attributes).reduce((s, a) => s + a.array.byteLength, 0) + (g.index ? g.index.array.byteLength : 0);
{
  // First view at step 12: margins are replaced by the step meshes. Fixed meshes as built (float32 attributes), with
  // the A/B/blend attributes replaced by 11 coefficients per vertex (planned), all vertices of displaced meshes.
  const shown = [fixed.top, fixed.faces, fixed.pedestal];
  let fixedBytes = 0, moving = 0;
  for (const g of shown) { const n = g.attributes.position.count; fixedBytes += n * (3 + 3) * 4 + (g.index ? g.index.array.byteLength : 0); if (g.attributes.eraBlend) { moving += n; fixedBytes += n * 11 * 4; } }
  let packed = 0;
  for (const { geometry } of core.geometries.values()) packed += gpuBytes(geometry);
  const paint = Object.values(core.header.arrays).filter(a => a.width).reduce((s, a) => s + a.width * a.height * 4 * 4 / 3, 0);
  out.firstViewGpuBytes = { fixedSoil: fixedBytes, movingVertices: moving, corePackGeometry: packed, paintWithMips: Math.round(paint), total: Math.round(fixedBytes + packed + paint),
    note: 'core includes geometry of all core packs (step 12 soil, step-12 features, ring); shadow map, render targets and soil texture pages not included' };
}
// Static soil meshes against dense M1, every step.
const block = createSoilBlock({ stack, outputScale: 1, parent: new THREE.Scene(), top: { character: {}, albedoMultiplier: 1, slopeDarken: 0 }, floor: { character: {} } });
for (let k = 1; k <= block.cutSteps; k++) block.warm(k);
const dense = Object.fromEntries(block.meshes().map(m => [m.name, m.geometry]));
function heightError(simple, ref) {
  const pos = simple.attributes.position.array, idx = simple.index.array, cell = .1, grid = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const xs = [0, 1, 2].map(s => pos[3 * idx[t + s]]), zs = [0, 1, 2].map(s => pos[3 * idx[t + s] + 2]);
    for (let i = Math.floor(Math.min(...xs) / cell); i <= Math.floor(Math.max(...xs) / cell); i++) for (let j = Math.floor(Math.min(...zs) / cell); j <= Math.floor(Math.max(...zs) / cell); j++) {
      const k = (i + 2000) * 65536 + j + 2000; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t); }
  }
  const rp = ref.attributes.position.array, rn = ref.attributes.normal.array;
  let vmax = 0, nmax = 0, nsum = 0, n = 0, missed = 0;
  for (let i = 0; i < rp.length / 3; i++) {
    const x = rp[3 * i], z = rp[3 * i + 2], list = grid.get((Math.floor(x / cell) + 2000) * 65536 + Math.floor(z / cell) + 2000) ?? [];
    let best = null;
    for (const t of list) {
      const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]], ax = pos[3 * a], az = pos[3 * a + 2], bx = pos[3 * b], bz = pos[3 * b + 2], cx = pos[3 * c], cz = pos[3 * c + 2];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-14) continue;
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w = 1 - u - v;
      if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
      const y = u * pos[3 * a + 1] + v * pos[3 * b + 1] + w * pos[3 * c + 1], e = Math.abs(y - rp[3 * i + 1]);
      // Overlapping pieces in plan (folded seams) can stack; take the closest.
      if (best === null || e < best) best = e;
    }
    if (best === null) { missed++; continue; }
    const en = best * Math.abs(rn[3 * i + 1]);
    vmax = Math.max(vmax, best); nmax = Math.max(nmax, en); nsum += en; n++;
  }
  return { verticalMaxMm: +(vmax * 1000).toFixed(2), normalMaxMm: +(nmax * 1000).toFixed(2), normalMeanMm: +(nsum / n * 1000).toFixed(3), samples: n, unlocated: missed };
}
out.soilError = {};
for (let k = 1; k <= block.cutSteps; k++) {
  const step = await assets.step(k);
  for (const [part, name] of [['top', `era-top-step-${k}`], ['floors', `era-floors-step-${k}`]]) out.soilError[`${k}:${part}`] = heightError(step.geometry(`soil:${k}:${part}`).geometry, dense[name]);
}
const all = Object.values(out.soilError);
out.soilErrorWorst = { verticalMaxMm: Math.max(...all.map(e => e.verticalMaxMm)), normalMaxMm: Math.max(...all.map(e => e.normalMaxMm)), unlocated: all.reduce((s, e) => s + e.unlocated, 0) };
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify({ ...out, soilError: undefined }, null, 1));
