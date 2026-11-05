// Chart probe (CPU): charts each cut step's dug walls, floors and step top into one page, then simplifies the split
// meshes with the P1 settings (meshopt, borders locked, 1 mm absolute) and reports page sizes, texture memory and
// triangle counts against P1. Usage: node scripts/site-tier/chart-probe.mjs <out.json>
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';
import { siteBoundaryGrids } from '../../src/eras/site-state.js';
import { createSoilBlock } from '../../src/eras/soil-block.js';
import { TOP_CHARACTER, FLOOR_CHARACTER, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN } from '../../src/museum-scene.js';
import { buildCharts } from './uv-charts.mjs';

const out = process.argv[2]; if (!out) throw new Error('usage: chart-probe.mjs <out.json>');
await MeshoptSimplifier.ready;
const stack = siteBoundaryGrids();
const block = createSoilBlock({ stack, outputScale: 1, parent: new THREE.Scene(), top: { character: TOP_CHARACTER, albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN }, floor: { character: FLOOR_CHARACTER } });
for (let k = 1; k <= block.cutSteps; k++) block.warm(k);
const byName = Object.fromEntries(block.meshes().map(m => [m.name, m]));
const simplify = g => { const [ix, error] = MeshoptSimplifier.simplify(Uint32Array.from(g.index.array), Float32Array.from(g.attributes.position.array), 3, 0, .001, ['LockBorder', 'ErrorAbsolute']); return { triangles: ix.length / 3, errorMm: +(error * 1000).toFixed(3) }; };
const report = { texelMetres: .02, steps: {} };
let totalBytes = 0;
for (let k = 1; k <= block.cutSteps; k++) {
  const t0 = performance.now(), parts = ['walls', 'floors', 'top'], meshes = [byName['era-walls-step-' + k], byName['era-floors-step-' + k], byName['era-top-step-' + k]];
  const r = buildCharts(meshes.map(m => m.geometry));
  const bytes = r.width * r.height * 8 * 4 / 3; totalBytes += bytes;
  report.steps[k] = { page: [r.width, r.height], occupancy: +r.occupancy.toFixed(3), mbRgba8x2Mips: +(bytes / 2 ** 20).toFixed(2), ms: Math.round(performance.now() - t0),
    parts: Object.fromEntries(parts.map((p, i) => [p, { ...r.meshes[i].stats, simplified: simplify(r.meshes[i].geometry), simplifiedUnsplit: simplify(meshes[i].geometry) }])) };
  console.log(k, JSON.stringify(report.steps[k].page), report.steps[k].mbRgba8x2Mips, report.steps[k].ms);
}
report.totalMb = +(totalBytes / 2 ** 20).toFixed(2);
writeFileSync(out, JSON.stringify(report, null, 1) + '\n');
console.log('total MB', report.totalMb);
