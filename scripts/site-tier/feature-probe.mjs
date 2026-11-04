// Site tier P1 probe 3 (CPU): feature meshes indexed by (position, colour, finish) and simplified with the meshoptimizer
// simplifier shipped with three (absolute error, locked borders), at the default site state (2023, cut step 12) and over
// all distinct cut states; and deflate sizes of quantized boundary grids. Flat shading is assumed (no normals stored).
// Usage: node scripts/site-tier/feature-probe.mjs -> output/lookdev/modelling/site-tier/feature-probe.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';
import { siteBoundaryGrids, createEraSite } from '../../src/eras/site-state.js';

const root = fileURLToPath(new URL('../../', import.meta.url)), outDir = root + 'output/lookdev/modelling/site-tier/';
mkdirSync(outDir, { recursive: true });
await MeshoptSimplifier.ready;
const out = { method: 'see header', grids: {}, features: {} };
{
  const stack = siteBoundaryGrids(); let lo = Infinity, hi = -Infinity;
  for (const g of stack.grids) for (const v of g) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const raw = stack.grids.reduce((s, g) => s + g.byteLength, 0);
  for (const unitMm of [.1, .25]) {
    const q = new Int16Array(stack.nx * stack.nz * stack.grids.length); let maxErr = 0, at = 0;
    for (const g of stack.grids) for (let iz = 0; iz < stack.nz; iz++) { let prev = 0; for (let ix = 0; ix < stack.nx; ix++) {
      const v = Math.round((g[iz * stack.nx + ix] - lo) / (unitMm / 1000)); maxErr = Math.max(maxErr, Math.abs(lo + v * unitMm / 1000 - g[iz * stack.nx + ix]));
      q[at++] = v - prev; prev = v; } }
    out.grids[`${unitMm}mm`] = { rangeMetres: [+lo.toFixed(3), +hi.toFixed(3)], fitsInt16: (hi - lo) / (unitMm / 1000) < 65535, rawFloat32Bytes: raw, deflatedDeltaInt16Bytes: deflateRawSync(Buffer.from(q.buffer), { level: 9 }).length, maxQuantErrorMm: +(maxErr * 1000).toFixed(3) };
  }
}
const site = createEraSite({ outputScale: 1 });
function indexed(g) {
  const a = g.attributes, n = Math.min(a.position.count, g.drawRange.count), map = new Map(), pos = [], col = [], fin = [], idx = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    const p = [a.position.getX(i), a.position.getY(i), a.position.getZ(i)], c = [a.color.getX(i), a.color.getY(i), a.color.getZ(i)], f = a.featureFinish ? [a.featureFinish.getX(i), a.featureFinish.getY(i)] : [0, 0];
    const k = [...p.map(v => Math.round(v * 1e5)), ...c.map(v => Math.round(v * 255)), ...f.map(v => Math.round(v * 1e3))].join(',');
    let v = map.get(k); if (v === undefined) { v = pos.length / 3; map.set(k, v); pos.push(...p); col.push(...c); fin.push(...f); }
    idx[i] = v;
  }
  return { positions: Float32Array.from(pos), indices: idx, vertices: pos.length / 3 };
}
function measure(geometries, mm) {
  let tris = 0, verts = 0, dense = 0, err = 0;
  for (const g of geometries) {
    const m = indexed(g); dense += m.indices.length / 3;
    if (!mm) { tris += m.indices.length / 3; verts += m.vertices; continue; }
    const [ix, e] = MeshoptSimplifier.simplify(m.indices, m.positions, 3, 0, mm / 1000, ['LockBorder', 'ErrorAbsolute']);
    tris += ix.length / 3; verts += new Set(ix).size; err = Math.max(err, e);
  }
  // Size estimate: Uint16 positions in a per-mesh box, Uint8 colour, Uint8x2 finish, Uint16 or Uint32 indices.
  return { denseTriangles: dense, triangles: tris, vertices: verts, maxErrorMm: +(err * 1000).toFixed(2), estimateBytes: verts * (6 + 3 + 2) + tris * 3 * (verts > 65535 ? 4 : 2) };
}
const at = k => { site.applyState({ schemaVersion: 1, deposits: Array(10).fill(1), features: Array(10).fill(1), excavation: k / site.cutSteps }); const list = []; site.group.traverse(o => { if (o.isMesh && o.visible && o.geometry.attributes.position) list.push(o.geometry); }); return list; };
const step12 = at(12);
for (const mm of [0, 1, 2, 3]) out.features[`step12-${mm}mm`] = measure(step12, mm);
const all = new Map(); for (let k = 0; k <= site.cutSteps; k++) for (const g of at(k)) all.set(g.uuid, g);
out.features['allSteps-2mm'] = { distinct: all.size, ...measure([...all.values()], 2) };
writeFileSync(outDir + 'feature-probe.json', JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out, null, 1));
