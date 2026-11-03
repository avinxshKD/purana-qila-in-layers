// Soil block geometry check (CPU): build times, triangle counts, open-edge (crack) count per cut step, heightfield
// agreement with excavation.js removedAt, and wall batter from the emitted wall triangles.
import { siteBoundaryGrids } from '../../src/eras/site-state.js';
import { createSoilBlock, MARGINS, SOIL_BLOCK } from '../../src/eras/soil-block.js';
import { removedAt, VOLUMES } from '../../src/eras/excavation.js';
import { TOP_CHARACTER, FLOOR_CHARACTER } from '../../src/museum-scene.js';
const t0 = performance.now();
const stack = siteBoundaryGrids();
const t1 = performance.now();
const block = createSoilBlock({ stack, top: { character: TOP_CHARACTER, albedoMultiplier: .8, slopeDarken: .3 }, floor: { character: FLOOR_CHARACTER } });
const t2 = performance.now();
console.log('stack ms', (t1 - t0).toFixed(0), 'fixed ms', (t2 - t1).toFixed(0), 'levels', JSON.stringify(block.levels));
const steps = (process.argv[2] ?? '1,4,8,12').split(',').map(Number);
const q = v => Math.round(v * 1e5);
for (const k of steps) {
  const a = performance.now(); block.warm(k); const b = performance.now();
  block.apply({ deposits: Array(10).fill(1), k });
  const meshes = block.meshes().filter(m => m.visible && m.name.includes('-step-') && !m.name.startsWith('era-front'));
  // Open edges of the visible top/wall/floor surfaces, keyed by quantized plan position (heightfield: x, z identify a point).
  const edges = new Map(), pos3 = new Map();
  let tris = 0;
  for (const m of meshes) {
    const p = m.geometry.attributes.position, idx = m.geometry.index.array;
    for (let i = 0; i < idx.length; i += 3) {
      tris++;
      const ks = [0, 1, 2].map(s => `${q(p.getX(idx[i + s]))},${q(p.getZ(idx[i + s]))}`);
      for (let s = 0; s < 3; s++) pos3.set(ks[s], [p.getX(idx[i + s]), p.getY(idx[i + s]), p.getZ(idx[i + s])]);
      for (let s = 0; s < 3; s++) { const e = [ks[s], ks[(s + 1) % 3]].sort().join('|'); edges.set(e, (edges.get(e) ?? 0) + 1); }
    }
  }
  let open = 0, bad = 0, over = 0; const interior = []; const samples = [], overSamples = [];
  for (const [e, n] of edges) {
    if (n > 2) { over++; if (overSamples.length < 4) overSamples.push(e + ':' + n); }
    if (n !== 1) continue;
    open++;
    const [[x1, z1], [x2, z2]] = e.split('|').map(s => s.split(',').map(v => Number(v) / 1e5));
    const onBoundary = (x1 === x2 && (Math.abs(x1) === 12 || MARGINS.some(m => Math.abs(x1 - m.x0) < 1e-6 || Math.abs(x1 - m.x1) < 1e-6)))
      || (z1 === z2 && (Math.abs(z1) === 8 || MARGINS.some(m => Math.abs(z1 - m.z0) < 1e-6)));
    if (!onBoundary) { bad++; if (samples.length < 6) samples.push(e); interior.push(e.split('|')); }
  }
  // T-junctions: an open interior edge whose far side is two shorter open edges through a vertex on it; report the
  // largest 3D distance of such a vertex from the long edge (a crack only if it is not on the edge).
  let tj = 0, worst = 0;
  const openSet = new Set(interior.map(e => e.join('|')));
  for (const [a, b] of interior) {
    const A = pos3.get(a), B = pos3.get(b);
    for (const [c, d] of interior) {
      if (c !== a || d === b) continue;
      if (!openSet.has([d, b].sort().join('|')) && !openSet.has([b, d].sort().join('|'))) continue;
      const P = pos3.get(d), ab = A.map((v, i) => B[i] - v), ap = A.map((v, i) => P[i] - v), L2 = ab.reduce((s, v) => s + v * v, 0), t = ap.reduce((s, v, i) => s + v * ab[i], 0) / L2;
      if (t <= 0 || t >= 1) continue;
      tj++; worst = Math.max(worst, Math.hypot(...ap.map((v, i) => v - t * ab[i])));
    }
  }
  console.log(`k=${k} T-junction vertices ${tj}, worst distance from edge ${worst.toExponential(2)} m`);
  // Heightfield check: points just below / above each emitted step vertex must be soil / removed.
  let mismatch = 0, checked = 0;
  for (const m of meshes.filter(m => m.name.includes('step'))) {
    const p = m.geometry.attributes.position;
    for (let i = 0; i < p.count; i += 97) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i); checked++;
      if (m.name.startsWith('era-floors') ? !removedAt(k, x, y + .07, z) : removedAt(k, x, y - .003, z)) mismatch++;
    }
  }
  console.log(`k=${k} build ${(b - a).toFixed(0)} ms tris ${tris} open ${open} interior-open ${bad} over2 ${over} below-removed ${mismatch}/${checked}`, JSON.stringify(block.stats().steps[k]), samples.join(' '), overSamples.join(' '));
}
