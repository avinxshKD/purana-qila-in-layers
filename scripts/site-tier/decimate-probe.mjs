// Site tier P1 probe (CPU): how far the M1 soil block and feature meshes can be simplified. Soil meshes go through the
// meshoptimizer simplifier shipped with three (examples/jsm/libs, MIT) with locked borders and an absolute error; the
// GPU-displaced tops are then checked against the dense mesh at many deposit states (vertical error at every dense
// vertex), since the simplifier only sees the full-deposit shape. Features: triangles per cut step at full reveal.
// Usage: node scripts/site-tier/decimate-probe.mjs -> output/lookdev/modelling/site-tier/decimate-probe.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';
import { siteBoundaryGrids, createEraSite } from '../../src/eras/site-state.js';
import { createSoilBlock } from '../../src/eras/soil-block.js';
import { createEraDisplacement } from '../../src/eras/soil-displace.js';
import { TOP_CHARACTER, FLOOR_CHARACTER, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN } from '../../src/museum-scene.js';

const root = fileURLToPath(new URL('../../', import.meta.url)), outDir = root + 'output/lookdev/modelling/site-tier/';
mkdirSync(outDir, { recursive: true });
await MeshoptSimplifier.ready;
const ERRORS_MM = [1, 2, 3, 5];
const scene = new THREE.Scene(), stack = siteBoundaryGrids();
const block = createSoilBlock({ stack, outputScale: 1, parent: scene, top: { character: TOP_CHARACTER, albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN }, floor: { character: FLOOR_CHARACTER } });
for (let k = 1; k <= block.cutSteps; k++) block.warm(k);
const site = createEraSite({ outputScale: 1 }); scene.add(site.group);

function simplify(geometry, errorMetres) {
  const pos = geometry.attributes.position.array, idx = Uint32Array.from(geometry.index.array);
  const [indices, error] = MeshoptSimplifier.simplify(idx, pos instanceof Float32Array ? pos : Float32Array.from(pos), 3, 0, errorMetres, ['LockBorder', 'ErrorAbsolute']);
  return { indices, error, triangles: indices.length / 3, vertices: new Set(indices).size };
}
// Vertical error of the simplified surface at every dense vertex, for one set of vertex heights.
function locator(indices, positions) {
  const cell = .25, grid = new Map(), key = (i, j) => i * 65536 + j;
  for (let t = 0; t < indices.length; t += 3) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let s = 0; s < 3; s++) { const v = indices[t + s]; x0 = Math.min(x0, positions[3 * v]); x1 = Math.max(x1, positions[3 * v]); z0 = Math.min(z0, positions[3 * v + 2]); z1 = Math.max(z1, positions[3 * v + 2]); }
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++) for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) {
      const k = key(i + 1000, j + 1000); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t); }
  }
  return (x, z, heights) => {
    const list = grid.get(key(Math.floor(x / cell) + 1000, Math.floor(z / cell) + 1000)) ?? [];
    for (const t of list) {
      const a = indices[t], b = indices[t + 1], c = indices[t + 2];
      const ax = positions[3 * a], az = positions[3 * a + 2], bx = positions[3 * b], bz = positions[3 * b + 2], cx = positions[3 * c], cz = positions[3 * c + 2];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-14) continue;
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w = 1 - u - v;
      if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue;
      return u * heights[a] + v * heights[b] + w * heights[c];
    }
    return null;
  };
}
const states = [Array(10).fill(1)];
for (let i = 0; i < 10; i++) for (const f of [.5, 1]) states.push(Array.from({ length: 10 }, (_, j) => j < i ? 1 : j === i ? f : 0));
const displacement = createEraDisplacement({ stack });

const out = { method: 'see header', errorsMm: ERRORS_MM, states: states.length, soil: {}, features: {} };
const t0 = performance.now();
for (const mesh of block.meshes()) {
  if (!mesh.geometry.index) { out.soil[mesh.name] = { triangles: mesh.geometry.attributes.position.count / 3, note: 'non-indexed, kept' }; continue; }
  const dense = mesh.geometry.index.count / 3, rec = { dense, displaced: mesh.userData.eraDisplaced ?? null, levels: {} };
  for (const mm of ERRORS_MM) {
    const s = simplify(mesh.geometry, mm / 1000), level = { triangles: s.triangles, vertices: s.vertices, ratio: +(dense / s.triangles).toFixed(1), meshoptErrorMm: +(s.error * 1000).toFixed(2) };
    if (mesh.userData.eraDisplaced === 'top' || /top-step|floors/.test(mesh.name)) {
      const pos = mesh.geometry.attributes.position.array, n = pos.length / 3, locate = locator(s.indices, pos);
      const list = mesh.userData.eraDisplaced === 'top' ? states : [null];
      let worst = 0, sum = 0, count = 0, misses = 0;
      for (const d of list) {
        const p = d ? displacement.resolve(mesh, { deposits: d }).positions : pos, h = new Float64Array(n);
        for (let i = 0; i < n; i++) h[i] = p[3 * i + 1];
        for (let i = 0; i < n; i++) { const y = locate(pos[3 * i], pos[3 * i + 2], h); if (y === null) { misses++; continue; } const e = Math.abs(y - h[i]); worst = Math.max(worst, e); sum += e; count++; }
      }
      Object.assign(level, { verticalErrorMm: { max: +(worst * 1000).toFixed(2), mean: +(sum / count * 1000).toFixed(3) }, statesChecked: list.length, unlocatedSamples: misses });
    }
    rec.levels[`${mm}mm`] = level;
  }
  out.soil[mesh.name] = rec;
}
out.soilProbeMs = Math.round(performance.now() - t0);
// Features per cut step, full reveal: triangles drawn (draw range) and vertex count of the attribute buffers.
for (let k = 0; k <= site.cutSteps; k++) {
  site.applyState({ schemaVersion: 1, deposits: Array(10).fill(1), features: Array(10).fill(1), excavation: k / site.cutSteps });
  let tris = 0, verts = 0, meshes = 0, bytes = 0;
  site.group.traverse(o => { if (!o.isMesh || !o.visible) return; meshes++; const g = o.geometry, c = g.index ? g.index.count : g.attributes.position.count;
    tris += Math.min(c, g.drawRange.count) / 3; verts += g.attributes.position.count; for (const a of Object.values(g.attributes)) bytes += a.array.byteLength; });
  out.features[`step-${k}`] = { meshes, triangles: Math.round(tris), vertices: verts, attributeBytes: bytes };
}
writeFileSync(outDir + 'decimate-probe.json', JSON.stringify(out, null, 1) + '\n');
const sum = lvl => Object.values(out.soil).reduce((s, r) => s + (r.levels?.[lvl]?.triangles ?? r.triangles ?? r.dense), 0);
console.log('soil dense', Object.values(out.soil).reduce((s, r) => s + (r.dense ?? r.triangles), 0), Object.fromEntries(ERRORS_MM.map(mm => [`${mm}mm`, sum(`${mm}mm`)])));
for (const name of ['era-top', 'era-top-margins', 'era-top-step-12', 'era-floors-step-12', 'era-walls-step-12']) console.log(name, JSON.stringify(out.soil[name]));
console.log('features', JSON.stringify(out.features['step-0']), JSON.stringify(out.features['step-12']), 'ms', out.soilProbeMs);
