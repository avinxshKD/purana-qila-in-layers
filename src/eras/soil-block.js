// Era soil block for the composite section (M1): the block's outer faces, the active top, and per cut step the dug
// walls, floors and front-face profile of the four trenches and their pits. Geometry only; the look is in soil-shader.js.
// While nothing is cut the top follows the deposits on the GPU (soil-shader.js DISPLACE_Y). A cut step is a CPU
// heightfield, min(top, lowest removed height of every volume), resolved exactly on a 2.5 cm lattice: within each lattice
// triangle every surface term is linear, so the lower envelope splits it into convex pieces whose kinks (lip, wall foot,
// corner) are exact and shared by neighbouring triangles. Cut steps assume full deposits: the film and the site only cut
// the finished stack. Every size and rule here is a modelling decision (M).
import * as THREE from 'three';
import { uncutGround, SILT, activeEra, eraDepositUniform } from './stack.js';
import { lipBreakParts } from '../earth-edges.js';
import { gradientNoise } from '../soil-noise.js';
import { VOLUMES, BLOCK, CUT_STEPS } from './excavation.js';
import { TRENCHES } from './layout.js';
import { SEATING } from './seating.js';
import { eraSoilMaterial, eraDepthMaterial, boundaryTextures } from './soil-shader.js';

export const SOIL_BLOCK = Object.freeze({
  fineMetres: .025, coarsePerFine: 4, marginMetres: .4, fineBandZ: 3.5, outerStripMetres: .4,
  // Lip erosion grows with the local cut depth below the lip and is complete once the cut is 1 m deep.
  lipFullDepthMetres: 1,
  // Floors: raised-only undulation and one trowelled step, ramped to zero within 15 cm of every wall foot, pit rim and
  // floor-ground line, so features seated on the floor plane are never undercut and every kink stays on its plane.
  floor: { undulationMetres: [.02, .008], stepMetres: .03, stepWidthMetres: .06, rampMetres: .15, groundRampMetres: .1, seed: 18501 },
  // The soil pedestal left under the rings when the well pit is dug below them.
  pedestalRadiusMetres: .335
});
const H = SOIL_BLOCK.fineMetres, NX = Math.round((BLOCK.xmax - BLOCK.xmin) / H), NZ = Math.round((BLOCK.zmax - BLOCK.zmin) / H);
// Lattice coordinates as correctly rounded decimals, so every builder gets bit-identical shared vertices.
const X = ix => (ix * 25 + BLOCK.xmin * 1000) / 1000, Z = iz => (iz * 25 + BLOCK.zmin * 1000) / 1000;
const IX = x => Math.round((x - BLOCK.xmin) / H), IZ = z => Math.round((z - BLOCK.zmin) / H);
const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
// Defined in stack.js so the CPU mirror (soil-displace.js) does not import this module.
export { eraDepositUniform };

let groundCache = null;
function ground(ix, iz) {
  groundCache ??= new Float64Array((NX + 1) * (NZ + 1)).fill(NaN);
  const k = iz * (NX + 1) + ix;
  let g = groundCache[k];
  if (Number.isNaN(g)) groundCache[k] = g = uncutGround(X(ix), Z(iz));
  return g;
}

export function blockLevels(stack) {
  let siltTop = Infinity;
  for (const v of stack.grids[0]) siltTop = Math.min(siltTop, v);
  const bottomY = siltTop - SILT.shownMetres - SILT.fadeMetres;
  return { lowestSiltTopY: siltTop, bottomY, fadeStartY: bottomY + SILT.fadeMetres };
}
export const MARGINS = Object.freeze(TRENCHES.map(t => Object.freeze({ id: t.id, x0: t.xmin - SOIL_BLOCK.marginMetres, x1: t.xmax + SOIL_BLOCK.marginMetres,
  z0: t.zmin - SOIL_BLOCK.marginMetres, z1: BLOCK.zmax })));
const inMargin = (x, z) => MARGINS.some(m => x > m.x0 && x < m.x1 && z > m.z0 && z < m.z1);

// Indexed geometry with the GPU top attributes: eraSampleA/B = (x, z, exact uncut ground), eraBlend (-1 = fixed vertex).
function gpuBuilder() {
  const position = [], sampleA = [], sampleB = [], blend = [], normal = [], index = [], map = new Map();
  return {
    vertex(key, x, y, z, a, b, t, n) {
      let i = key === null ? undefined : map.get(key);
      if (i !== undefined) return i;
      i = position.length / 3;
      position.push(x, y, z); sampleA.push(...a); sampleB.push(...b); blend.push(t); normal.push(...n);
      if (key !== null) map.set(key, i);
      return i;
    },
    tri(a, b, c) { index.push(a, b, c); },
    geometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
      g.setAttribute('eraSampleA', new THREE.Float32BufferAttribute(sampleA, 3));
      g.setAttribute('eraSampleB', new THREE.Float32BufferAttribute(sampleB, 3));
      g.setAttribute('eraBlend', new THREE.Float32BufferAttribute(blend, 1));
      g.setIndex(position.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
      return g;
    },
    get count() { return index.length / 3; }
  };
}
const sampleAt = (ix, iz) => [X(ix), Z(iz), ground(ix, iz)];
const UP = [0, 1, 0];

// The top outside the trench margins: 10 cm cells, refined to the lattice near the outer edges and over the trench band;
// a fine vertex on a coarse neighbour's edge follows that edge (no T-junction cracks).
function staticTop() {
  const C = SOIL_BLOCK.coarsePerFine, ni = NX / C, nj = NZ / C, b = gpuBuilder();
  const centre = (i, j) => [X(i * C) + C * H / 2, Z(j * C) + C * H / 2];
  const solid = (i, j) => i >= 0 && j >= 0 && i < ni && j < nj && !inMargin(...centre(i, j));
  const fine = (i, j) => { const [x, z] = centre(i, j); return z > SOIL_BLOCK.fineBandZ || Math.abs(x) > BLOCK.xmax - SOIL_BLOCK.outerStripMetres || Math.abs(z) > BLOCK.zmax - SOIL_BLOCK.outerStripMetres; };
  const plain = (ix, iz) => { const s = sampleAt(ix, iz); return b.vertex(ix * 1024 + iz, s[0], s[2], s[1], s, s, 0, UP); };
  for (let i = 0; i < ni; i++) for (let j = 0; j < nj; j++) {
    if (!solid(i, j)) continue;
    if (!fine(i, j)) {
      const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, c]) => plain(a * C, c * C));
      b.tri(q[0], q[2], q[1]); b.tri(q[0], q[3], q[2]);
      continue;
    }
    const coarseSide = [solid(i - 1, j) && !fine(i - 1, j), solid(i + 1, j) && !fine(i + 1, j), solid(i, j - 1) && !fine(i, j - 1), solid(i, j + 1) && !fine(i, j + 1)];
    const vertex = (a, c) => {
      const ix = i * C + a, iz = j * C + c;
      let from = null, to = null, t = 0;
      if ((a === 0 && coarseSide[0]) || (a === C && coarseSide[1])) { from = [ix, j * C]; to = [ix, j * C + C]; t = c / C; }
      else if ((c === 0 && coarseSide[2]) || (c === C && coarseSide[3])) { from = [i * C, iz]; to = [i * C + C, iz]; t = a / C; }
      if (!from || t === 0 || t === 1) return plain(ix, iz);
      const A = sampleAt(...from), B = sampleAt(...to);
      return b.vertex(ix * 1024 + iz, X(ix), A[2] + (B[2] - A[2]) * t, Z(iz), A, B, t, UP);
    };
    for (let a = 0; a < C; a++) for (let c = 0; c < C; c++) {
      const q = [vertex(a, c), vertex(a + 1, c), vertex(a + 1, c + 1), vertex(a, c + 1)];
      b.tri(q[0], q[2], q[1]); b.tri(q[0], q[3], q[2]);
    }
  }
  return b;
}
// The uncut top over the trench margins (step 0).
function marginTop() {
  const b = gpuBuilder();
  for (const m of MARGINS) {
    const ia = IX(m.x0), ib = IX(m.x1), ja = IZ(m.z0), jb = IZ(m.z1);
    const v = (ix, iz) => { const s = sampleAt(ix, iz); return b.vertex(ix * 1024 + iz, s[0], s[2], s[1], s, s, 0, UP); };
    for (let ix = ia; ix < ib; ix++) for (let iz = ja; iz < jb; iz++) {
      const q = [v(ix, iz), v(ix + 1, iz), v(ix + 1, iz + 1), v(ix, iz + 1)];
      b.tri(q[0], q[2], q[1]); b.tri(q[0], q[3], q[2]);
    }
  }
  return b;
}
// Outer face strip from a list of [x, z] lattice points along the face: top vertices follow the GPU top, or a fixed
// profile height when given; bottom vertices are fixed at the block base.
function faceStrip(b, points, outward, bottomY) {
  let previous = null;
  for (const p of points) {
    const [x, z, fixedY] = p, top = fixedY === undefined
      ? (() => { const s = sampleAt(IX(x), IZ(z)); return b.vertex(null, x, s[2], z, s, s, 0, outward); })()
      : b.vertex(null, x, fixedY, z, [x, z, 0], [x, z, 0], -1, outward);
    const bottom = b.vertex(null, x, bottomY, z, [x, z, 0], [x, z, 0], -1, outward);
    if (previous) {
      // Orient each quad so its normal is the outward face normal (outer faces draw their back sides into the shadow map).
      const [t0, b0, x0, z0] = previous, ex = x - x0, ez = z - z0;
      const nx = -ez, nz = ex; // normal of (b0 -> b1 -> t1) for an upward edge pair, in the horizontal plane
      if (nx * outward[0] + nz * outward[2] > 0) { b.tri(b0, bottom, top); b.tri(b0, top, t0); }
      else { b.tri(bottom, b0, t0); b.tri(bottom, t0, top); }
    }
    previous = [top, bottom, x, z];
  }
}
function latticeLine(from, to, fixed) {
  const out = [];
  if (fixed.axis === 'z') for (let ix = IX(from); ix <= IX(to); ix++) out.push([X(ix), fixed.value]);
  else for (let iz = IZ(from); iz <= IZ(to); iz++) out.push([fixed.value, Z(iz)]);
  return out;
}
function staticFaces(bottomY) {
  const b = gpuBuilder();
  faceStrip(b, latticeLine(BLOCK.xmin, BLOCK.xmax, { axis: 'z', value: BLOCK.zmin }), [0, 0, -1], bottomY);
  faceStrip(b, latticeLine(BLOCK.zmin, BLOCK.zmax, { axis: 'x', value: BLOCK.xmin }), [-1, 0, 0], bottomY);
  faceStrip(b, latticeLine(BLOCK.zmin, BLOCK.zmax, { axis: 'x', value: BLOCK.xmax }), [1, 0, 0], bottomY);
  const edges = [BLOCK.xmin, ...MARGINS.flatMap(m => [m.x0, m.x1]), BLOCK.xmax];
  for (let i = 0; i < edges.length; i += 2) faceStrip(b, latticeLine(edges[i], edges[i + 1], { axis: 'z', value: BLOCK.zmax }), [0, 0, 1], bottomY);
  return b;
}
function marginFaces(bottomY) {
  const b = gpuBuilder();
  for (const m of MARGINS) faceStrip(b, latticeLine(m.x0, m.x1, { axis: 'z', value: BLOCK.zmax }), [0, 0, 1], bottomY);
  return b;
}

// ---- Cut steps ----
function floorRelief(v, x, z) {
  const F = SOIL_BLOCK.floor, seed = F.seed + Math.round(v.box.xmin * 10) + Math.round(v.box.zmin * 7);
  const width = v.box.xmax - v.box.xmin;
  const stepLine = v.box.xmin + width * (.35 + .3 * (.5 + .5 * gradientNoise(v.box.xmin, .5, .5, seed)));
  const wobble = .15 * gradientNoise(z / .5, .2, .8, seed + 1);
  const raised = F.stepMetres * clamp01(.5 - (x - stepLine - wobble) / F.stepWidthMetres);
  return Math.max(0, F.undulationMetres[0] * gradientNoise(x / .45, z / .45, .3, seed + 2) + F.undulationMetres[1] * gradientNoise(x / .12, z / .12, .6, seed + 3)) + raised;
}
const reliefFree = new Set(['ring-well-pit']);

function trenchContext(trench, index) {
  const m = MARGINS[index], ia = IX(m.x0), ib = IX(m.x1), ja = IZ(m.z0), jb = IZ(m.z1), nx = ib - ia + 1, nz = jb - ja + 1, n = nx * nz;
  const vols = VOLUMES.filter(v => v.box.xmin >= trench.xmin - 1e-9 && v.box.xmax <= trench.xmax + 1e-9 && v.box.zmin >= trench.zmin - 1e-9);
  const terms = [{ kind: 'top' }], volumes = [];
  for (const v of vols) {
    const floorTerm = terms.length; terms.push({ kind: 'floor', v });
    const wallTerms = [];
    for (const [side, p] of Object.entries(v.walls)) {
      if (!(p.normal[1] > 0)) continue;
      const t = p.normal[1];
      wallTerms.push(terms.length);
      terms.push({ kind: 'wall', v, side, t, a: -p.normal[0] / t, b: -p.normal[2] / t, c: -p.constant / t, plane: p });
    }
    volumes.push({ v, floorTerm, wallTerms, children: [] });
  }
  for (const vol of volumes) vol.children = volumes.filter(c => c.v.inside === vol.v.id);
  const xs = Float64Array.from({ length: nx }, (_, i) => X(ia + i)), zs = Float64Array.from({ length: nz }, (_, j) => Z(ja + j));
  const g = new Float64Array(n), lips = [0, 1, 2].map(() => new Float32Array(n));
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    g[k] = ground(ia + i, ja + j);
    for (const [lip, amount] of lipBreakParts(xs[i], zs[j])) if (lip >= index * 3 && lip < index * 3 + 3) lips[lip - index * 3][k] = amount;
  }
  const walls = terms.map(t => t.kind !== 'wall' ? null : (() => { const w = new Float64Array(n); for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) w[j * nx + i] = t.a * xs[i] + t.b * zs[j] + t.c; return w; })());
  const relief = new Map(volumes.map(vol => [vol.v.id, reliefFree.has(vol.v.id) ? null : (() => {
    const r = new Float32Array(n); for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) r[j * nx + i] = floorRelief(vol.v, xs[i], zs[j]); return r;
  })()]));
  return { trench, index, margin: m, ia, ja, nx, nz, n, xs, zs, g, lips, terms, volumes, walls, relief, trenchVolume: volumes.find(vol => vol.v.id === trench.id) };
}

function stepValues(ctx, k) {
  const { nx, nz, n, xs, zs, g, lips, terms, volumes, walls, relief, trench, trenchVolume } = ctx;
  const vals = terms.map((t, i) => t.kind === 'wall' ? walls[i] : new Float64Array(n));
  // Lip erosion scale from the cut depth below each lip, sampled along the lip on the lattice.
  const T = trenchVolume.v, floorK = (x, z) => T.floorAt(x, z) + T.stepOffset(k);
  const depthScale = (x, z) => clamp01((ground(IX(x), IZ(z)) - floorK(x, z)) / SOIL_BLOCK.lipFullDepthMetres);
  const top = vals[0];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const q = j * nx + i, x = xs[i], z = zs[j];
    let e = 0;
    if (lips[0][q]) e += lips[0][q] * depthScale(trench.xmin, Math.min(BLOCK.zmax, Math.max(trench.zmin, z)));
    if (lips[1][q]) e += lips[1][q] * depthScale(Math.min(trench.xmax, Math.max(trench.xmin, x)), trench.zmin);
    if (lips[2][q]) e += lips[2][q] * depthScale(trench.xmax, Math.min(BLOCK.zmax, Math.max(trench.zmin, z)));
    top[q] = g[q] - e;
  }
  const F = SOIL_BLOCK.floor;
  for (const vol of volumes) {
    const v = vol.v, off = v.stepOffset(k), out = vals[vol.floorTerm], r = relief.get(v.id);
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const q = j * nx + i, x = xs[i], z = zs[j], fr = v.floor.A * x + v.floor.B * z + v.floor.C + off;
      if (!r) { out[q] = fr; continue; }
      let ramp = clamp01((top[q] - fr) / F.groundRampMetres);
      for (const w of vol.wallTerms) ramp = Math.min(ramp, clamp01((fr - walls[w][q]) * terms[w].t / F.rampMetres));
      for (const c of vol.children) {
        const fc = c.v.floor.A * x + c.v.floor.B * z + c.v.floor.C + c.v.stepOffset(k);
        if (fc >= fr) continue;
        let outside = -Infinity;
        for (const w of c.wallTerms) outside = Math.max(outside, (walls[w][q] - fr) * terms[w].t);
        ramp = Math.min(ramp, clamp01(outside / F.rampMetres));
      }
      out[q] = fr + r[q] * ramp;
    }
  }
  return vals;
}

// Convex polygon split by the sign of vals[a] - vals[b]; crossing points are interpolated from the lexicographically
// smaller endpoint so the triangles on both sides of a lattice edge produce identical vertices.
function lerpVertex(P, Q, t) {
  const vals = new Float64Array(P.vals.length);
  for (let i = 0; i < vals.length; i++) vals[i] = P.vals[i] + (Q.vals[i] - P.vals[i]) * t;
  return { x: P.x + (Q.x - P.x) * t, z: P.z + (Q.z - P.z) * t, vals };
}
function crossing(P, Q, dP, dQ) {
  const swap = P.x > Q.x || (P.x === Q.x && P.z > Q.z);
  return swap ? lerpVertex(Q, P, dQ / (dQ - dP)) : lerpVertex(P, Q, dP / (dP - dQ));
}
function split(poly, a, b) {
  const d = poly.map(p => p.vals[a] - p.vals[b]);
  if (d.every(v => v <= 0)) return [poly, null];
  if (d.every(v => v >= 0)) return [null, poly];
  const lo = [], hi = [];
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length, P = poly[i], Q = poly[j], dP = d[i], dQ = d[j];
    if (dP <= 0) lo.push(P);
    if (dP >= 0) hi.push(P);
    if ((dP < 0 && dQ > 0) || (dP > 0 && dQ < 0)) { const c = crossing(P, Q, dP, dQ); lo.push(c); hi.push(c); }
  }
  const area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; s += p[i].x * q.z - q.x * p[i].z; } return Math.abs(s) / 2; };
  return [lo.length >= 3 && area(lo) > 1e-12 ? lo : null, hi.length >= 3 && area(hi) > 1e-12 ? hi : null];
}
function envelope(tri, vols) {
  let pieces = [[tri, 0]];
  for (const vol of vols) {
    const next = [];
    for (const [poly, L] of pieces) {
      let regions = [[poly, vol.floorTerm]];
      for (const w of vol.wallTerms) {
        const r2 = [];
        for (const [p, a] of regions) { const [lo, hi] = split(p, w, a); if (hi) r2.push([hi, w]); if (lo) r2.push([lo, a]); }
        regions = r2;
      }
      const parts = [];
      for (const [p, a] of regions) { const [lo, hi] = split(p, a, L); if (lo) parts.push([lo, a]); if (hi) parts.push([hi, L]); }
      // A volume that never undercuts this piece leaves it whole, without the crossings of its own terms.
      if (parts.every(([, label]) => label === L)) next.push([poly, L]);
      else next.push(...parts);
    }
    pieces = next;
  }
  return pieces;
}

function plainBuilder() {
  const position = [], index = [], map = new Map();
  return {
    vertex(x, y, z) {
      const key = Math.round(x * 1e6) * 4e7 + Math.round(z * 1e6);
      let i = map.get(key);
      if (i === undefined) { i = position.length / 3; position.push(x, y, z); map.set(key, i); }
      return i;
    },
    tri(a, b, c) { if (a !== b && b !== c && a !== c) index.push(a, b, c); },
    geometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
      g.setIndex(position.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(index, 1) : new THREE.Uint16BufferAttribute(index, 1));
      g.computeVertexNormals();
      return g;
    },
    get count() { return index.length / 3; }
  };
}

function buildStep(contexts, k, bottomY) {
  const out = { top: plainBuilder(), floor: plainBuilder(), inner: plainBuilder() }, front = gpuBuilder(), stats = { triangles: 0, slow: 0 };
  for (const ctx of contexts) {
    const vals = stepValues(ctx, k), { nx, nz, xs, zs, terms, volumes } = ctx, nT = terms.length;
    const profile = new Map();
    const latticeVertex = q => { const v = new Float64Array(nT); for (let t = 0; t < nT; t++) v[t] = vals[t][q]; return { x: xs[q % nx], z: zs[Math.floor(q / nx)], vals: v }; };
    const emit = (poly, label) => {
      const kind = terms[label].kind, b = kind === 'top' ? out.top : kind === 'floor' ? out.floor : out.inner;
      const ids = poly.map(p => {
        const y = p.vals[label];
        if (p.z === BLOCK.zmax) profile.set(Math.round(p.x * 1e6), [p.x, y]);
        return b.vertex(p.x, y, p.z);
      });
      for (let i = 1; i + 1 < ids.length; i++) b.tri(ids[0], ids[i], ids[i + 1]);
    };
    const best = [0, 0, 0], bestLabel = [0, 0, 0], arg = [0, 0, 0], m = [0, 0, 0];
    for (let j = 0; j + 1 < nz; j++) for (let i = 0; i + 1 < nx; i++) {
      const q00 = j * nx + i, q10 = q00 + 1, q01 = q00 + nx, q11 = q01 + 1;
      for (const tri of [[q00, q11, q10], [q00, q01, q11]]) {
        stats.triangles++;
        for (let s = 0; s < 3; s++) { best[s] = vals[0][tri[s]]; bestLabel[s] = 0; }
        let fast = true; const relevant = [];
        for (const vol of volumes) {
          let gap = Infinity;
          for (let s = 0; s < 3; s++) {
            let mx = vals[vol.floorTerm][tri[s]], a = vol.floorTerm;
            for (const w of vol.wallTerms) { const y = vals[w][tri[s]]; if (y > mx) { mx = y; a = w; } }
            m[s] = mx; arg[s] = a; gap = Math.min(gap, mx - vals[0][tri[s]]);
          }
          if (gap > 1.5) continue;
          relevant.push(vol);
          if (arg[0] !== arg[1] || arg[1] !== arg[2]) fast = false;
          for (let s = 0; s < 3; s++) if (m[s] < best[s]) { best[s] = m[s]; bestLabel[s] = arg[s]; }
        }
        const poly = tri.map(latticeVertex);
        if (fast && bestLabel[0] === bestLabel[1] && bestLabel[1] === bestLabel[2]) { emit(poly, bestLabel[0]); continue; }
        stats.slow++;
        for (const [p, label] of envelope(poly, relevant)) emit(p, label);
      }
    }
    const points = [...profile.values()].sort((a, b) => a[0] - b[0]).map(([x, y]) => [x, BLOCK.zmax, y]);
    faceStrip(front, points, [0, 0, 1], bottomY);
  }
  const geometries = Object.fromEntries(Object.entries(out).map(([key, b]) => [key, b.geometry()]));
  geometries.front = front.geometry();
  stats.pieces = Object.fromEntries(Object.entries(out).map(([key, b]) => [key, b.count]));
  return { geometries, stats };
}

// For scripts/modelling/soil-block-check.mjs.
export const internals = { trenchContext, stepValues, envelope, split, X, Z, IX, IZ };
// For the site tier (src/site-tier): the fixed top, outer-face and pedestal geometry without the soil materials.
export const fixedGeometry = Object.freeze({
  top: () => staticTop().geometry(), marginTop: () => marginTop().geometry(),
  faces: bottomY => staticFaces(bottomY).geometry(), marginFaces: bottomY => marginFaces(bottomY).geometry(), pedestal: () => pedestal()
});

// Soil pedestal under the ring column (from the pit floor to just inside the lowest ring's foot).
function pedestal() {
  const ring = SEATING.ring, r = SOIL_BLOCK.pedestalRadiusMetres, n = 64, v = [], y0 = ring.pitFloorY - .005, y1 = ring.bottomY + .012;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
    const p = (t, y) => [ring.x + r * Math.cos(t), y, ring.z + r * Math.sin(t)];
    v.push(...p(a, y0), ...p(b, y1), ...p(b, y0), ...p(a, y0), ...p(a, y1), ...p(b, y1));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

export function createSoilBlock({ stack, outputScale = 1, top, floor, parent = null, debug = null }) {
  const levels = blockLevels(stack), { bottomY, fadeStartY } = levels;
  const textures = boundaryTextures(stack);
  const uniforms = { eraB0: { value: textures[0] }, eraB1: { value: textures[1] }, eraB2: { value: textures[2] },
    eraDeposits: { value: Array(10).fill(1) }, eraActive: { value: 9 }, eraIdPass: { value: 0 } };
  const common = { outputScale, grid: stack, uniforms, bottomY, fadeStartY, top, floor, debug };
  const materials = {
    topGpu: eraSoilMaterial({ ...common, mode: 'top', displaced: true }),
    top: eraSoilMaterial({ ...common, mode: 'top' }),
    outer: eraSoilMaterial({ ...common, mode: 'outer', displaced: true }),
    inner: eraSoilMaterial({ ...common, mode: 'inner' }),
    floor: eraSoilMaterial({ ...common, mode: 'floor' })
  };
  const depth = eraDepthMaterial({ grid: stack, uniforms });
  const group = new THREE.Group(); group.name = 'era-soil-block';
  // displaced: 'top' or 'face' for meshes whose eraBlend >= 0 vertices move on the GPU (see soil-displace.js).
  const mesh = (geometry, material, role, name, displaced = null) => {
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = true; m.receiveShadow = true; m.userData.sectionRole = role; m.userData.group = name; m.userData.eraSoil = true; m.name = name;
    if (displaced) { m.customDepthMaterial = depth; m.frustumCulled = false; m.userData.eraDisplaced = displaced; }
    (parent ?? group).add(m);
    return m;
  };
  const started = globalThis.performance?.now() ?? Date.now();
  const fixed = {
    top: mesh(staticTop().geometry(), materials.topGpu, 'top', 'era-top', 'top'),
    faces: mesh(staticFaces(bottomY).geometry(), materials.outer, 'cutface', 'era-outer', 'face'),
    marginTop: mesh(marginTop().geometry(), materials.topGpu, 'top', 'era-top-margins', 'top'),
    marginFaces: mesh(marginFaces(bottomY).geometry(), materials.outer, 'cutface', 'era-outer-margins', 'face'),
    pedestal: mesh(pedestal(), materials.inner, 'cutface', 'era-ring-pedestal')
  };
  const buildMs = { fixed: (globalThis.performance?.now() ?? Date.now()) - started, steps: {} };
  let contexts = null;
  const steps = new Map();
  function step(k) {
    if (k <= 0) return null;
    let s = steps.get(k);
    if (s) return s;
    const t0 = globalThis.performance?.now() ?? Date.now();
    contexts ??= TRENCHES.map((t, i) => trenchContext(t, i));
    const { geometries, stats } = buildStep(contexts, k, bottomY);
    s = { k, stats, meshes: [
      mesh(geometries.top, materials.top, 'top', `era-top-step-${k}`), mesh(geometries.inner, materials.inner, 'cutface', `era-walls-step-${k}`),
      mesh(geometries.floor, materials.floor, 'floor', `era-floors-step-${k}`), mesh(geometries.front, materials.outer, 'cutface', `era-front-step-${k}`)
    ] };
    for (const m of s.meshes) m.visible = false;
    buildMs.steps[k] = (globalThis.performance?.now() ?? Date.now()) - t0;
    steps.set(k, s);
    return s;
  }
  let shown = 0;
  function apply({ deposits, k }) {
    const d = eraDepositUniform(deposits);
    uniforms.eraDeposits.value = d;
    uniforms.eraActive.value = activeEra(d);
    const s = step(k);
    fixed.marginTop.visible = fixed.marginFaces.visible = !s;
    for (const other of steps.values()) {
      const on = other === s;
      for (const m of other.meshes) m.visible = on;
      // Steps not on screen keep their CPU arrays only; three uploads them again on first use.
      if (!on && other.k === shown) for (const m of other.meshes) m.geometry.dispose();
    }
    shown = k;
    return { cutStep: k, cutAssumesFullDeposits: k > 0 && d.some(v => v < 1) };
  }
  return {
    group, stack, materials, uniforms, levels, bottomY, fadeStartY, base: -bottomY, apply, warm: k => { step(k); }, cutSteps: CUT_STEPS,
    stats: () => ({ buildMs, steps: Object.fromEntries([...steps].map(([k, s]) => [k, s.stats])),
      triangles: Object.fromEntries(Object.entries(fixed).map(([key, m]) => [key, m.geometry.index ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3])) }),
    meshes: () => [...Object.values(fixed), ...[...steps.values()].flatMap(s => s.meshes)],
    dispose() { for (const m of [...Object.values(fixed), ...[...steps.values()].flatMap(s => s.meshes)]) { m.geometry.dispose(); m.removeFromParent(); } for (const m of Object.values(materials)) m.dispose(); depth.dispose(); for (const t of textures) t.dispose(); }
  };
}
