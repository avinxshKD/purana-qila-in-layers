// UV charts for the site tier's irregular soil meshes (dug walls, floors, step tops, pedestal): each chart is a set of
// connected triangles projected along one world axis, so a chart's UV is a planar map of world position and a
// simplified mesh that keeps a subset of the chart's vertices keeps the same map. Vertices are split along chart
// borders, so a border-locking simplifier keeps every chart outline exact. Charts never overlap in their projection
// (checked by point sampling inside each triangle), are padded by a gutter and packed into one page with shelf packing,
// aligned to `align` texels so the first mip levels never mix two charts. Every size here is a modelling decision (M).
import * as THREE from 'three';

// Projection bases: u x v = the axis, so a chart is never mirrored.
export const AXES = Object.freeze([
  { name: '+x', n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] }, { name: '-x', n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { name: '+y', n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] }, { name: '-y', n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { name: '+z', n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, { name: '-z', n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] }
]);
const dot = (a, x, y, z) => a[0] * x + a[1] * y + a[2] * z;

// Charts several meshes into one shared page: returns the page size and, per mesh, the split geometry with uv.
export function buildCharts(geometries, { texelMetres = .02, minAlign = .6, gutterTexels = 4, align = 4, pageWidth = 0, sampleMetres = texelMetres / 3 } = {}) {
  // An entry is a geometry, or { geometry, texelMetres } for its own density.
  const sets = geometries.map(entry => chartMesh(entry.isBufferGeometry ? entry : entry.geometry, { texelMetres: entry.texelMetres ?? texelMetres, minAlign, gutterTexels, align, sampleMetres: entry.texelMetres ? entry.texelMetres / 3 : sampleMetres }));
  const all = sets.flatMap(set => set.charts), used = all.reduce((s, c) => s + c.w * c.h, 0), widest = Math.max(...all.map(c => c.w));
  const width = Math.max(widest, pageWidth || Math.ceil(Math.sqrt(used / .8) / 64) * 64);
  const packOrder = all.map((c, i) => i).sort((a, b) => all[b].h - all[a].h || all[b].w - all[a].w || a - b);
  let x = 0, y = 0, rowH = 0;
  for (const i of packOrder) {
    const c = all[i];
    if (x + c.w > width) { y += rowH; x = 0; rowH = 0; }
    c.x = x; c.y = y; x += c.w; rowH = Math.max(rowH, c.h);
  }
  const height = Math.ceil((y + rowH) / align) * align;
  return { width, height, chartTexels: used, occupancy: used / (width * height), meshes: sets.map(set => set.finish(width, height)) };
}

function chartMesh(geometry, { texelMetres, minAlign, gutterTexels, align, sampleMetres }) {
  const P = geometry.attributes.position.array, I = geometry.index ? geometry.index.array : Uint32Array.from({ length: P.length / 3 }, (_, i) => i);
  const T = I.length / 3, nV = P.length / 3, normal = new Float64Array(T * 3), area = new Float64Array(T);
  for (let t = 0; t < T; t++) {
    const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2];
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz);
    area[t] = l / 2;
    if (l > 0) { normal[3 * t] = nx / l; normal[3 * t + 1] = ny / l; normal[3 * t + 2] = nz / l; }
  }
  // Edge adjacency.
  const edges = new Map(), neighbours = Array.from({ length: T }, () => []);
  for (let t = 0; t < T; t++) for (let e = 0; e < 3; e++) {
    const a = I[3 * t + e], b = I[3 * t + (e + 1) % 3], key = Math.min(a, b) * nV + Math.max(a, b), other = edges.get(key);
    if (other === undefined) edges.set(key, t); else { neighbours[t].push(other); neighbours[other].push(t); }
  }
  const alignment = (t, axis) => dot(AXES[axis].n, normal[3 * t], normal[3 * t + 1], normal[3 * t + 2]);
  const bestAxis = t => { let best = 0, value = -Infinity; for (let a = 0; a < 6; a++) { const v = alignment(t, a); if (v > value) { value = v; best = a; } } return [best, value]; };
  const project = (vertex, axis) => { const x = P[3 * vertex], y = P[3 * vertex + 1], z = P[3 * vertex + 2], A = AXES[axis]; return [dot(A.u, x, y, z), dot(A.v, x, y, z)]; };
  // Sample points of the projection strictly inside a triangle (shared edges belong to neither side).
  function samples(t, axis, visit) {
    const [p0, p1, p2] = [0, 1, 2].map(k => project(I[3 * t + k], axis)), h = sampleMetres;
    const d = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
    if (!(Math.abs(d) > 0)) return true;
    const i0 = Math.ceil(Math.min(p0[0], p1[0], p2[0]) / h), i1 = Math.floor(Math.max(p0[0], p1[0], p2[0]) / h);
    const j0 = Math.ceil(Math.min(p0[1], p1[1], p2[1]) / h), j1 = Math.floor(Math.max(p0[1], p1[1], p2[1]) / h);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const x = i * h, y = j * h;
      const w0 = ((p1[0] - x) * (p2[1] - y) - (p1[1] - y) * (p2[0] - x)) / d, w1 = ((p2[0] - x) * (p0[1] - y) - (p2[1] - y) * (p0[0] - x)) / d, w2 = 1 - w0 - w1;
      if (w0 > 1e-9 && w1 > 1e-9 && w2 > 1e-9 && visit((i + 4194304) * 8388608 + (j + 4194304)) === false) return false;
    }
    return true;
  }
  const chartOf = new Int32Array(T).fill(-1), charts = [];
  const order = Array.from({ length: T }, (_, t) => t).filter(t => area[t] > 1e-14);
  const seedAlign = new Float64Array(T); for (const t of order) seedAlign[t] = bestAxis(t)[1];
  order.sort((a, b) => seedAlign[b] - seedAlign[a] || a - b);
  let rejected = 0;
  for (const seed of order) {
    if (chartOf[seed] >= 0) continue;
    const axis = bestAxis(seed)[0], id = charts.length, occupied = new Set(), members = [];
    const tryAdd = t => {
      const keys = [];
      if (!samples(t, axis, key => { if (occupied.has(key)) return false; keys.push(key); })) return false;
      for (const key of keys) occupied.add(key);
      chartOf[t] = id; members.push(t); return true;
    };
    tryAdd(seed);
    for (let q = 0; q < members.length; q++) for (const n of neighbours[members[q]]) {
      if (chartOf[n] >= 0 || area[n] <= 1e-14 || alignment(n, axis) < minAlign) continue;
      if (!tryAdd(n)) rejected++;
    }
    charts.push({ axis, triangles: members });
  }
  // Degenerate triangles join a neighbouring chart (they cover no texels).
  let degenerate = 0;
  for (let pass = 0; pass < 4; pass++) for (let t = 0; t < T; t++) if (chartOf[t] < 0 && area[t] <= 1e-14) {
    const n = neighbours[t].find(m => chartOf[m] >= 0);
    if (n !== undefined || pass === 3) { const id = n !== undefined ? chartOf[n] : (charts.push({ axis: 2, triangles: [] }) - 1); chartOf[t] = id; charts[id].triangles.push(t); degenerate++; }
  }
  // Chart rectangles in texels, gutters included, aligned; rotated when taller than wide.
  const g = gutterTexels;
  for (const c of charts) {
    let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    for (const t of c.triangles) for (let k = 0; k < 3; k++) { const [u, v] = project(I[3 * t + k], c.axis); umin = Math.min(umin, u); umax = Math.max(umax, u); vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); }
    const wu = (umax - umin) / texelMetres + 2 * g, wv = (vmax - vmin) / texelMetres + 2 * g;
    c.rotated = wv > wu;
    c.box = [umin, umax, vmin, vmax];
    c.w = Math.ceil((c.rotated ? wv : wu) / align) * align; c.h = Math.ceil((c.rotated ? wu : wv) / align) * align;
    c.area = c.triangles.reduce((s, t) => s + area[t], 0);
  }
  // Split vertices per chart and write uv (page-normalised), once the charts are placed.
  function finish(width, height) {
    const remap = new Map(), position = [], uv = [], sourceVertex = [], index = new Uint32Array(I.length);
    for (let t = 0; t < T; t++) {
      const c = charts[chartOf[t]];
      for (let k = 0; k < 3; k++) {
        const v = I[3 * t + k], key = chartOf[t] * nV + v;
        let n = remap.get(key);
        if (n === undefined) {
          n = position.length / 3; remap.set(key, n); position.push(P[3 * v], P[3 * v + 1], P[3 * v + 2]); sourceVertex.push(v);
          const [u, w] = project(v, c.axis), [umin, , vmin, vmax] = c.box;
          const s = (u - umin) / texelMetres, r = (w - vmin) / texelMetres;
          // Rotation by 90 degrees: (s, r) -> (rows from the top of v, s).
          const tx = c.x + g + (c.rotated ? (vmax - w) / texelMetres : s), ty = c.y + g + (c.rotated ? s : r);
          uv.push(tx / width, ty / height);
        }
        index[3 * t + k] = n;
      }
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
    out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(index, 1));
    let stretchSum = 0, maxStretch = 1, areaSum = 0;
    for (let t = 0; t < T; t++) if (area[t] > 1e-14) { const s = 1 / alignment(t, charts[chartOf[t]].axis); stretchSum += s * area[t]; areaSum += area[t]; maxStretch = Math.max(maxStretch, s); }
    const lookup = new Map();
    for (let t = 0; t < T; t++) if (area[t] > 1e-14) lookup.set(triangleKey(P, I[3 * t], I[3 * t + 1], I[3 * t + 2]), chartOf[t]);
    const uvOf = (chart, x, y, z) => {
      const c = charts[chart], A = AXES[c.axis], u = dot(A.u, x, y, z), w = dot(A.v, x, y, z), [umin, , vmin, vmax] = c.box;
      const s = (u - umin) / texelMetres, r = (w - vmin) / texelMetres;
      return [(c.x + g + (c.rotated ? (vmax - w) / texelMetres : s)) / width, (c.y + g + (c.rotated ? s : r)) / height];
    };
    return { geometry: out, sourceVertex: Uint32Array.from(sourceVertex), lookup, uvOf, charts: charts.map(c => ({ axis: AXES[c.axis].name, triangles: c.triangles.length, area: c.area, x: c.x, y: c.y, w: c.w, h: c.h, rotated: c.rotated })),
      stats: { triangles: T, charts: charts.length, areaM2: areaSum, chartTexels: charts.reduce((s, c) => s + c.w * c.h, 0),
        surfaceTexels: areaSum / texelMetres ** 2, stretchAreaWeighted: stretchSum / areaSum, maxStretch, overlapRejections: rejected, degenerate, vertices: position.length / 3, sourceVertices: nV } };
  }
  return { charts, finish };
}

// Order-free key of a triangle's three positions (0.01 mm), to find the same triangle in another mesh.
export function triangleKey(P, a, b, c) {
  const k = i => Math.round(P[3 * i] * 1e5) + ':' + Math.round(P[3 * i + 1] * 1e5) + ':' + Math.round(P[3 * i + 2] * 1e5);
  return [k(a), k(b), k(c)].sort().join('|');
}
// Splits a mesh's triangles into those found in a charted reference (by position) and the rest.
export function partitionByReference(geometry, reference) {
  const P = geometry.attributes.position.array, I = geometry.index.array, shared = [], rest = [];
  for (let t = 0; t < I.length / 3; t++) (reference.lookup.has(triangleKey(P, I[3 * t], I[3 * t + 1], I[3 * t + 2])) ? shared : rest).push(t);
  return { shared, rest };
}
// A mesh made of the given triangles of a source mesh (vertices compacted).
export function subsetGeometry(geometry, triangles) {
  const P = geometry.attributes.position.array, I = geometry.index.array, remap = new Map(), position = [], index = new Uint32Array(triangles.length * 3);
  triangles.forEach((t, j) => { for (let k = 0; k < 3; k++) { const v = I[3 * t + k]; let n = remap.get(v); if (n === undefined) { n = position.length / 3; remap.set(v, n); position.push(P[3 * v], P[3 * v + 1], P[3 * v + 2]); } index[3 * j + k] = n; } });
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}
// Triangles of a mesh that all exist in a charted reference, split per reference chart, with the reference's uv.
export function applyReferenceCharts(geometry, triangles, reference) {
  const P = geometry.attributes.position.array, I = geometry.index.array, nV = P.length / 3, remap = new Map(), position = [], uv = [], index = new Uint32Array(triangles.length * 3);
  triangles.forEach((t, j) => {
    const chart = reference.lookup.get(triangleKey(P, I[3 * t], I[3 * t + 1], I[3 * t + 2]));
    if (chart === undefined) throw new Error('triangle not in the reference charts');
    for (let k = 0; k < 3; k++) {
      const v = I[3 * t + k], key = chart * nV + v;
      let n = remap.get(key);
      if (n === undefined) { n = position.length / 3; remap.set(key, n); position.push(P[3 * v], P[3 * v + 1], P[3 * v + 2]); uv.push(...reference.uvOf(chart, P[3 * v], P[3 * v + 1], P[3 * v + 2])); }
      index[3 * j + k] = n;
    }
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}
// Indexed copy of a mesh with identical positions welded (0.001 mm).
export function weld(geometry) {
  const P = geometry.attributes.position.array, n = P.length / 3, map = new Map(), position = [], index = new Uint32Array(geometry.index ? geometry.index.count : n);
  for (let i = 0; i < index.length; i++) {
    const v = geometry.index ? geometry.index.array[i] : i, key = Math.round(P[3 * v] * 1e6) + ':' + Math.round(P[3 * v + 1] * 1e6) + ':' + Math.round(P[3 * v + 2] * 1e6);
    let m = map.get(key); if (m === undefined) { m = position.length / 3; map.set(key, m); position.push(P[3 * v], P[3 * v + 1], P[3 * v + 2]); } index[i] = m;
  }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); out.setIndex(new THREE.BufferAttribute(index, 1));
  return out;
}
