// Thickness limits of the era stack including boundary swell, and boundary ordering, on a 0.1 m grid.
import { edgeErosion } from '../../src/earth-edges.js';
import { ERA_IDS, boundaryHeights, BOUNDARY_COUNT, boundaryGrids, activeTopGrid, activeTopAt, sampleGrid } from '../../src/eras/stack.js';
const t0 = performance.now();
let order = 0; const min = new Array(ERA_IDS.length).fill(Infinity), max = new Array(ERA_IDS.length).fill(-Infinity);
for (let x = -12; x <= 12; x += .1) for (let z = -8; z <= 8; z += .1) {
  const b = boundaryHeights(x, z); const inner = Math.abs(x) < 11.5 && Math.abs(z) < 7.5 && edgeErosion(x, z) < 1e-6;
  if (!inner) continue;
  for (let i = 0; i < ERA_IDS.length; i++) { const t = b[i + 1] - b[i]; if (t <= 0) order++; min[i] = Math.min(min[i], t); max[i] = Math.max(max[i], t); }
}
console.log('(excluded: points within 0.5 m of the block edges and wherever edge erosion bites, which truncates the top band)');
console.log('scan ms', Math.round(performance.now() - t0), 'non-positive', order);
ERA_IDS.forEach((id, i) => console.log(id.padEnd(12), min[i].toFixed(3), max[i].toFixed(3)));
const t1 = performance.now(); const stack = boundaryGrids(); console.log('grids ms', Math.round(performance.now() - t1), stack.nx, stack.nz);
const out = new Float32Array(stack.nx * stack.nz), times = [];
for (let s = 0; s < 600; s++) { const d = ERA_IDS.map((_, i) => Math.max(0, Math.min(1, s / 60 - i))); const a = performance.now(); activeTopGrid(stack, d, out); times.push(performance.now() - a); }
times.sort((a, b) => a - b); console.log('activeTop p50', times[300].toFixed(2), 'p95', times[570].toFixed(2));
const d = [1, 1, 1, .4, 0, 0, 0, 0, 0, 0]; activeTopGrid(stack, d, out);
let err = 0; for (let k = 0; k < 2000; k++) { const x = -12 + 24 * ((k * .618) % 1), z = -8 + 16 * ((k * .377) % 1); err = Math.max(err, Math.abs(sampleGrid(stack, out, x, z) - activeTopAt(d, x, z))); }
console.log('grid vs exact max error', err.toFixed(4));
