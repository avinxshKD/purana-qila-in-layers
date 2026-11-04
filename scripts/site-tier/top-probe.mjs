// Site tier P1 probe 2 (CPU): (1) an adaptive top for the site tier in M1's own scheme (10 cm cells, 2.5 cm lattice
// cells only where a 10 cm cell or edge misses the dense M1 top by more than a tolerance at any of 21 deposit states;
// fine vertices on a coarse neighbour's edge follow that edge), checked against the dense M1 top at every dense vertex
// and state, vertical and along the dense normal; CPU displacement time per state on the result. (2) Feature geometry:
// distinct cut states across the 13 steps and a quantized indexed size estimate.
// Usage: node scripts/site-tier/top-probe.mjs -> output/lookdev/modelling/site-tier/top-probe.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { siteBoundaryGrids, createEraSite } from '../../src/eras/site-state.js';
import { createSoilBlock, MARGINS } from '../../src/eras/soil-block.js';
import { createEraDisplacement } from '../../src/eras/soil-displace.js';
import { uncutGround } from '../../src/eras/stack.js';
import { BLOCK } from '../../src/eras/excavation.js';

const root = fileURLToPath(new URL('../../', import.meta.url)), outDir = root + 'output/lookdev/modelling/site-tier/';
mkdirSync(outDir, { recursive: true });
const H = .025, C = 4, NX = Math.round((BLOCK.xmax - BLOCK.xmin) / H), NZ = Math.round((BLOCK.zmax - BLOCK.zmin) / H), NI = NX / C, NJ = NZ / C;
const X = ix => (ix * 25 + BLOCK.xmin * 1000) / 1000, Z = iz => (iz * 25 + BLOCK.zmin * 1000) / 1000;
const IX = x => Math.round((x - BLOCK.xmin) / H), IZ = z => Math.round((z - BLOCK.zmin) / H), L = (ix, iz) => iz * (NX + 1) + ix;
const stack = siteBoundaryGrids(), scene = new THREE.Scene();
const block = createSoilBlock({ stack, outputScale: 1, parent: scene, top: { character: {}, albedoMultiplier: 1, slopeDarken: 0 }, floor: { character: {} } });
const states = [Array(10).fill(1)];
for (let i = 0; i < 10; i++) for (const f of [.5, 1]) states.push(Array.from({ length: 10 }, (_, j) => j < i ? 1 : j === i ? f : 0));
const S = states.length, displacement = createEraDisplacement({ stack });
const byName = Object.fromEntries(block.meshes().map(m => [m.name, m]));
const denseTops = [byName['era-top'], byName['era-top-margins']];

// Reference: dense M1 heights (and normal y) at every dense vertex, per state, keyed by lattice point.
const ref = new Map();
for (const mesh of denseTops) {
  const pos = mesh.geometry.attributes.position.array;
  states.forEach((d, s) => {
    const r = displacement.resolve(mesh, { deposits: d });
    for (let i = 0; i < pos.length / 3; i++) {
      const k = L(IX(pos[3 * i]), IZ(pos[3 * i + 2]));
      let e = ref.get(k); if (!e) ref.set(k, e = { y: new Float64Array(S), ny: new Float64Array(S) });
      e.y[s] = r.positions[3 * i + 1]; e.ny[s] = r.normals[3 * i + 1];
    }
  });
}
const inMargin = (x, z) => MARGINS.some(m => x > m.x0 && x < m.x1 && z > m.z0 && z < m.z1);
const cellDomain = (i, j) => { const x = X(i * C) + C * H / 2, z = Z(j * C) + C * H / 2; return inMargin(x, z) ? 'margin' : 'top'; };
// Coarse-cell interpolation at lattice offset (a, c) in [0, C], diagonal (0,0)-(C,C) as in M1.
function coarseAt(i, j, a, c, s) {
  const y = (p, q) => ref.get(L(i * C + p, j * C + q))?.y[s];
  const y00 = y(0, 0), y10 = y(C, 0), y11 = y(C, C), y01 = y(0, C), u = a / C, v = c / C;
  if ([y00, y10, y11, y01].some(t => t === undefined)) return null;
  return u >= v ? y00 + u * (y10 - y00) + v * (y11 - y10) : y00 + v * (y01 - y00) + u * (y11 - y01);
}
function cellErrors(i, j) {
  let interior = 0; const edge = [0, 0, 0, 0]; // -x, +x, -z, +z
  for (let a = 0; a <= C; a++) for (let c = 0; c <= C; c++) {
    const e = ref.get(L(i * C + a, j * C + c)); if (!e) continue;
    for (let s = 0; s < S; s++) {
      const y = coarseAt(i, j, a, c, s); if (y === null) return null;
      const err = Math.abs(y - e.y[s]) * Math.abs(e.ny[s]);
      interior = Math.max(interior, err);
      if (a === 0) edge[0] = Math.max(edge[0], err); if (a === C) edge[1] = Math.max(edge[1], err);
      if (c === 0) edge[2] = Math.max(edge[2], err); if (c === C) edge[3] = Math.max(edge[3], err);
    }
  }
  return { interior, edge };
}
const errs = new Map();
for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) errs.set(i * 1024 + j, cellErrors(i, j));

function build(tolMetres, domain) {
  const fine = new Set(), has = (i, j) => i >= 0 && j >= 0 && i < NI && j < NJ && cellDomain(i, j) === domain;
  for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) {
    if (!has(i, j)) continue;
    const e = errs.get(i * 1024 + j);
    if (!e || e.interior > tolMetres) fine.add(i * 1024 + j);
  }
  // An edge that misses by more than the tolerance must not be blended: refine both cells on it.
  for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) {
    if (!has(i, j)) continue; const e = errs.get(i * 1024 + j); if (!e) continue;
    if (e.edge[0] > tolMetres && has(i - 1, j)) { fine.add(i * 1024 + j); fine.add((i - 1) * 1024 + j); }
    if (e.edge[1] > tolMetres && has(i + 1, j)) { fine.add(i * 1024 + j); fine.add((i + 1) * 1024 + j); }
    if (e.edge[2] > tolMetres && has(i, j - 1)) { fine.add(i * 1024 + j); fine.add(i * 1024 + j - 1); }
    if (e.edge[3] > tolMetres && has(i, j + 1)) { fine.add(i * 1024 + j); fine.add(i * 1024 + j + 1); }
  }
  const position = [], A = [], B = [], T = [], normal = [], index = [], map = new Map();
  const sample = (ix, iz) => [X(ix), Z(iz), uncutGround(X(ix), Z(iz))];
  const vtx = (key, x, y, z, a, b, t) => { let v = map.get(key); if (v !== undefined) return v; v = position.length / 3; position.push(x, y, z); A.push(...a); B.push(...b); T.push(t); normal.push(0, 1, 0); map.set(key, v); return v; };
  const plain = (ix, iz) => { const s = sample(ix, iz); return vtx(ix * 1024 + iz, s[0], s[2], s[1], s, s, 0); };
  const isFine = (i, j) => fine.has(i * 1024 + j);
  for (let i = 0; i < NI; i++) for (let j = 0; j < NJ; j++) {
    if (!has(i, j)) continue;
    if (!isFine(i, j)) { const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, c]) => plain(a * C, c * C)); index.push(q[0], q[2], q[1], q[0], q[3], q[2]); continue; }
    const coarseSide = [has(i - 1, j) && !isFine(i - 1, j), has(i + 1, j) && !isFine(i + 1, j), has(i, j - 1) && !isFine(i, j - 1), has(i, j + 1) && !isFine(i, j + 1)];
    const v = (a, c) => {
      const ix = i * C + a, iz = j * C + c; let from = null, to = null, t = 0;
      if ((a === 0 && coarseSide[0]) || (a === C && coarseSide[1])) { from = [ix, j * C]; to = [ix, j * C + C]; t = c / C; }
      else if ((c === 0 && coarseSide[2]) || (c === C && coarseSide[3])) { from = [i * C, iz]; to = [i * C + C, iz]; t = a / C; }
      if (!from || t === 0 || t === 1) return plain(ix, iz);
      const sa = sample(...from), sb = sample(...to);
      return vtx(ix * 1024 + iz, X(ix), sa[2] + (sb[2] - sa[2]) * t, Z(iz), sa, sb, t);
    };
    for (let a = 0; a < C; a++) for (let c = 0; c < C; c++) { const q = [v(a, c), v(a + 1, c), v(a + 1, c + 1), v(a, c + 1)]; index.push(q[0], q[2], q[1], q[0], q[3], q[2]); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  g.setAttribute('eraSampleA', new THREE.Float32BufferAttribute(A, 3)); g.setAttribute('eraSampleB', new THREE.Float32BufferAttribute(B, 3)); g.setAttribute('eraBlend', new THREE.Float32BufferAttribute(T, 1));
  g.setIndex(index);
  const mesh = new THREE.Mesh(g); mesh.userData.eraDisplaced = 'top'; mesh.name = `site-top-${domain}`;
  return { mesh, fineCells: fine.size };
}
// Error of a built top against the dense reference at every dense lattice point and state.
function check(mesh) {
  const pos = mesh.geometry.attributes.position.array, idx = mesh.geometry.index.array, cell = .25, grid = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const xs = [0, 1, 2].map(s => pos[3 * idx[t + s]]), zs = [0, 1, 2].map(s => pos[3 * idx[t + s] + 2]);
    for (let i = Math.floor(Math.min(...xs) / cell); i <= Math.floor(Math.max(...xs) / cell); i++) for (let j = Math.floor(Math.min(...zs) / cell); j <= Math.floor(Math.max(...zs) / cell); j++) {
      const k = (i + 1000) * 65536 + j + 1000; if (!grid.has(k)) grid.set(k, []); grid.get(k).push(t); }
  }
  const heights = states.map(d => Float64Array.from({ length: pos.length / 3 }, (_, i) => displacement.resolve(mesh, { deposits: d }).positions[3 * i + 1]));
  let vmax = 0, nmax = 0, nsum = 0, n = 0, worst = null;
  for (const [k, e] of ref) {
    const ix = k % (NX + 1), iz = Math.floor(k / (NX + 1)), x = X(ix), z = Z(iz);
    const list = grid.get((Math.floor(x / cell) + 1000) * 65536 + Math.floor(z / cell) + 1000) ?? [];
    let hit = null;
    for (const t of list) {
      const a = idx[t], b = idx[t + 1], c = idx[t + 2], ax = pos[3 * a], az = pos[3 * a + 2], bx = pos[3 * b], bz = pos[3 * b + 2], cx = pos[3 * c], cz = pos[3 * c + 2];
      const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-14) continue;
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w = 1 - u - v;
      if (u < -1e-6 || v < -1e-6 || w < -1e-6) continue; hit = [a, b, c, u, v, w]; break;
    }
    if (!hit) continue;
    for (let s = 0; s < S; s++) {
      const h = heights[s], y = hit[3] * h[hit[0]] + hit[4] * h[hit[1]] + hit[5] * h[hit[2]], ev = Math.abs(y - e.y[s]), en = ev * Math.abs(e.ny[s]);
      vmax = Math.max(vmax, ev); nsum += en; n++; if (en > nmax) { nmax = en; worst = { x, z, state: s, verticalMm: +(ev * 1000).toFixed(2) }; }
    }
  }
  return { verticalMaxMm: +(vmax * 1000).toFixed(2), normalMaxMm: +(nmax * 1000).toFixed(2), normalMeanMm: +(nsum / n * 1000).toFixed(3), worst, samples: n };
}
const out = { method: 'see header', states: S, denseTriangles: denseTops.reduce((s, m) => s + m.geometry.index.count / 3, 0), denseMovingVertices: 0, tolerances: {} };
for (const mm of [3, 5, 10]) {
  const rec = {};
  let moving = 0; const meshes = [];
  for (const domain of ['top', 'margin']) { const b = build(mm / 1000, domain); meshes.push(b.mesh); rec[domain] = { triangles: b.mesh.geometry.index.count / 3, vertices: b.mesh.geometry.attributes.position.count, fineCells: b.fineCells, error: check(b.mesh) }; moving += b.mesh.geometry.attributes.position.count; }
  const times = [];
  for (let s = 0; s < 40; s++) { const d = Array.from({ length: 10 }, (_, i) => Math.min(1, Math.max(0, s / 4 - i + .013))); const t = performance.now(); for (const m of meshes) displacement.resolve(m, { deposits: d }); times.push(performance.now() - t); }
  times.sort((a, b) => a - b);
  rec.movingVertices = moving; rec.displacementMs = { p50: +times[20].toFixed(2), p95: +times[38].toFixed(2) };
  out.tolerances[`${mm}mm`] = rec;
}
// Features: distinct cut signatures over the 13 steps and a quantized indexed size estimate.
const site = createEraSite({ outputScale: 1 }); const seen = new Map();
for (let k = 0; k <= site.cutSteps; k++) {
  site.applyState({ schemaVersion: 1, deposits: Array(10).fill(1), features: Array(10).fill(1), excavation: k / site.cutSteps });
  site.group.traverse(o => { if (!o.isMesh) return; const g = o.geometry; if (!g.attributes.position) return; seen.set(g.uuid, g); });
}
let verts = 0, unique = 0, tris = 0, raw = 0;
for (const g of seen.values()) {
  const a = g.attributes, n = a.position.count, keys = new Map();
  for (let i = 0; i < n; i++) { const k = [a.position.getX(i), a.position.getY(i), a.position.getZ(i), a.normal.getX(i), a.normal.getY(i), a.normal.getZ(i), a.color.getX(i), a.color.getY(i), a.color.getZ(i)].map(v => Math.round(v * 1e4)).join(','); if (!keys.has(k)) keys.set(k, keys.size); }
  verts += n; unique += keys.size; tris += n / 3; for (const at of Object.values(a)) raw += at.array.byteLength;
}
out.features = { distinctGeometries: seen.size, triangles: tris, vertices: verts, uniqueVertices: unique, rawBytes: raw,
  quantizedEstimateBytes: unique * (6 + 4 + 3 + 2) + tris * 3 * 4, note: 'estimate: Int16 positions, oct normals 2xInt16, Uint8 colour, Uint8x2 finish, Uint32 indices; before any simplification or compression' };
writeFileSync(outDir + 'top-probe.json', JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out, null, 1));
