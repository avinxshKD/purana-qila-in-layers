import * as THREE from 'three';
import { geometry, quad, box, merged } from './geometry.js';
import { surfaceHeight, trenchFloorDepth, subtractConvex, subtractRectangle, cutOnFace, earthPoint } from './layers.js';
import { mulberry32 } from './rng.js';
import { labToHex } from './soil-colour.js';
import { LIP_STRIP_METRES } from './earth-edges.js';
import { gradientNoise } from './soil-noise.js';

const circle = (shaft, count = 48) => Array.from({ length: count }, (_, i) => {
  const a = i / count * Math.PI * 2;
  return [shaft.x + Math.cos(a) * shaft.radius, shaft.z + Math.sin(a) * shaft.radius];
});

export function lipSegments(table) {
  const { width, length, trenches } = table.proportions, hx = width / 2, hz = length / 2;
  return [[-hx, -hz, hx, -hz], [-hx, hz, hx, hz], [-hx, -hz, -hx, hz], [hx, -hz, hx, hz],
    ...trenches.flatMap(t => [[t.xmin, t.zmin, t.xmin, t.zmax], [t.xmax, t.zmin, t.xmax, t.zmax], [t.xmin, t.zmin, t.xmax, t.zmin]])];
}
// Coarse 10 cm grid, refined to 2.5 cm (the wall sample step) in a strip along every lip so notches are resolved.
// Fine vertices on a border shared with a coarse cell are interpolated along that border, leaving no T-junction cracks.
export function sectionTop(table) {
  const { width, length, trenches } = table.proportions, coarse = .1, sub = 4, fine = coarse / sub;
  const nx = Math.round(width / coarse), nz = Math.round(length / coarse), segments = lipSegments(table);
  const cellX = i => -width / 2 + i * coarse, cellZ = j => -length / 2 + j * coarse;
  const inTrench = (i, j) => {
    const x = cellX(i + .5), z = cellZ(j + .5);
    return trenches.some(t => x > t.xmin && x < t.xmax && z > t.zmin && z < t.zmax);
  };
  const near = (i, j) => segments.some(([x1, z1, x2, z2]) => Math.hypot(Math.max(0, x1 - cellX(i + 1), cellX(i) - x2),
    Math.max(0, z1 - cellZ(j + 1), cellZ(j) - z2)) < LIP_STRIP_METRES - 1e-9);
  const solid = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && !inTrench(i, j);
  const isNear = Array.from({ length: nx }, (_, i) => Array.from({ length: nz }, (_, j) => solid(i, j) && near(i, j)));
  const cache = new Map();
  const sample = (ix, iz) => {
    const key = ix * 4096 + iz;
    if (!cache.has(key)) {
      const x = -width / 2 + ix * fine, z = -length / 2 + iz * fine, d = .004, h = surfaceHeight(x, z);
      const n = new THREE.Vector3(-(surfaceHeight(x + d, z) - surfaceHeight(x - d, z)) / (2 * d), 1,
        -(surfaceHeight(x, z + d) - surfaceHeight(x, z - d)) / (2 * d)).normalize();
      cache.set(key, { x, z, h, n });
    }
    return cache.get(key);
  };
  const v = [], normals = [];
  const push = (x, z, h, n) => { v.push(...earthPoint(x, h, z)); normals.push(n.x, n.y, n.z); };
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (!solid(i, j)) continue;
    if (!isNear[i][j]) {
      const corners = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => sample(a * sub, b * sub));
      for (const k of [0, 2, 1, 0, 3, 2]) push(corners[k].x, corners[k].z, corners[k].h, corners[k].n);
      continue;
    }
    const coarseSide = [solid(i - 1, j) && !isNear[i - 1][j], solid(i + 1, j) && !isNear[i + 1][j],
      solid(i, j - 1) && !isNear[i][j - 1], solid(i, j + 1) && !isNear[i][j + 1]];
    const vertex = (a, b) => {
      const s = sample(i * sub + a, j * sub + b);
      let along = -1, from, to;
      if ((a === 0 && coarseSide[0]) || (a === sub && coarseSide[1])) { along = b / sub; from = sample(i * sub + a, j * sub); to = sample(i * sub + a, j * sub + sub); }
      else if ((b === 0 && coarseSide[2]) || (b === sub && coarseSide[3])) { along = a / sub; from = sample(i * sub, j * sub + b); to = sample(i * sub + sub, j * sub + b); }
      return along < 0 ? s : { x: s.x, z: s.z, h: from.h + (to.h - from.h) * along, n: s.n };
    };
    for (let a = 0; a < sub; a++) for (let b = 0; b < sub; b++) {
      const q = [vertex(a, b), vertex(a + 1, b), vertex(a + 1, b + 1), vertex(a, b + 1)];
      for (const k of [0, 2, 1, 0, 3, 2]) push(q[k].x, q[k].z, q[k].h, q[k].n);
    }
  }
  const result = geometry(v);
  result.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  return result;
}

// Excavation floors (look decisions): low undulation, one small trowelled step, and zero relief where the floor meets a wall,
// the open front or the pit rim so every edge stays on the wall's bottom line. 2.5 cm grid aligned with the wall samples.
export const FLOOR_SHAPE = Object.freeze({ gridMetres: .025, undulationMetres: [.02, .008], stepMetres: .03, stepWidthMetres: .06, edgeRampMetres: .15, seed: 18501 });
export function floorRelief(trench, x, z, pit = null) {
  const S = FLOOR_SHAPE, seed = S.seed + Math.round(trench.xmin * 10);
  const hasPit = pit && pit.xmin >= trench.xmin && pit.xmax <= trench.xmax && pit.zmin >= trench.zmin && pit.zmax <= trench.zmax;
  const stepLine = trench.xmin + (trench.xmax - trench.xmin) * (.35 + .3 * (.5 + .5 * gradientNoise(trench.xmin, .5, .5, seed)));
  const edge = Math.min(x - trench.xmin, trench.xmax - x, z - trench.zmin, trench.zmax - z,
    hasPit ? Math.hypot(Math.max(pit.xmin - x, 0, x - pit.xmax), Math.max(pit.zmin - z, 0)) : Infinity);
  const ramp = Math.min(1, Math.max(0, edge / S.edgeRampMetres));
  const wobble = .15 * gradientNoise(z / .5, .2, .8, seed + 1);
  const lower = S.stepMetres * Math.max(0, Math.min(1, (x - stepLine - wobble) / S.stepWidthMetres + .5));
  return ramp * (S.undulationMetres[0] * gradientNoise(x / .45, z / .45, .3, seed + 2) + S.undulationMetres[1] * gradientNoise(x / .12, z / .12, .6, seed + 3) - lower);
}
export function excavationFloor(trench, shaft) {
  const y0 = -trenchFloorDepth(trench), v = [], pit = shaft.pit, S = FLOOR_SHAPE, step = S.gridMetres;
  const hasPit = pit.xmin >= trench.xmin && pit.xmax <= trench.xmax && pit.zmin >= trench.zmin && pit.zmax <= trench.zmax;
  const nx = Math.round((trench.xmax - trench.xmin) / step), nz = Math.round((trench.zmax - trench.zmin) / step);
  const height = (x, z) => floorRelief(trench, x, z, pit);
  const inPit = (x, z) => hasPit && x > pit.xmin + 1e-7 && x < pit.xmax - 1e-7 && z > pit.zmin + 1e-7;
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const x0 = trench.xmin + i * step, z0 = trench.zmin + j * step;
    if (inPit(x0 + step / 2, z0 + step / 2)) continue;
    const corners = [[x0, z0], [x0 + step, z0], [x0 + step, z0 + step], [x0, z0 + step]].map(([x, z]) => earthPoint(x, y0 + height(x, z), z));
    for (const k of [0, 2, 1, 0, 3, 2]) v.push(...corners[k]);
  }
  return geometry(v);
}

// Angular fragment: a jittered low-poly solid with flat-shaded facets, scaled anisotropically.
function fragment(random, size, flat = .55) {
  const kind = random();
  const g = (kind < .4 ? new THREE.TetrahedronGeometry(1, 0) : kind < .75 ? new THREE.OctahedronGeometry(1, 0) : new THREE.BoxGeometry(1.4, 1.4, 1.4)).toNonIndexed();
  const p = g.attributes.position, jitter = new Map();
  for (let k = 0; k < p.count; k++) {
    const key = `${p.getX(k).toFixed(3)},${p.getY(k).toFixed(3)},${p.getZ(k).toFixed(3)}`;
    if (!jitter.has(key)) jitter.set(key, [.7 + random() * .6, .7 + random() * .6, .7 + random() * .6]);
    const [a, b, c] = jitter.get(key);
    p.setXYZ(k, p.getX(k) * a, p.getY(k) * b, p.getZ(k) * c);
  }
  g.scale(size * (.8 + random() * .5), size * flat * (.6 + random() * .6), size * (.6 + random() * .5));
  g.rotateY(random() * Math.PI * 2).rotateX((random() - .5) * .6).rotateZ((random() - .5) * .6);
  g.computeVertexNormals();
  return g;
}
function colourise(g, color) {
  const colors = [];
  for (let k = 0; k < g.attributes.position.count; k++) colors.push(color.r, color.g, color.b);
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.deleteAttribute('uv'); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}
export const DEBRIS = { topCount: 1400, sizeMetres: [.02, .15], lipClearanceMetres: .25, spoilPerMetre: 24, spoilSizeMetres: [.01, .06], seed: 17751 };
// Loose top debris (clods, brick-bats, pale sherds) kept clear of the lips, plus 1-6 cm spoil crumbs heaped along each wall foot.
export function topDebris(table, colours) {
  const random = mulberry32(DEBRIS.seed), parts = [], segments = lipSegments(table), { trenches } = table.proportions;
  const clearance = (x, z) => Math.min(...segments.map(([x1, z1, x2, z2]) => Math.hypot(Math.max(0, x1 - x, x - x2), Math.max(0, z1 - z, z - z2))));
  for (let i = 0; i < DEBRIS.topCount; i++) {
    const x = -11.8 + random() * 23.6, z = -7.8 + random() * 15.6, kind = random(), size = .02 * 7.5 ** (random() ** 1.6);
    if (trenches.some(t => x > t.xmin && x < t.xmax && z > t.zmin && z < t.zmax) || clearance(x, z) < DEBRIS.lipClearanceMetres + size) continue;
    const color = kind < .07 ? new THREE.Color(colours.brick).multiplyScalar(.75 + random() * .3)
      : kind < .12 ? new THREE.Color(colours.sherd).multiplyScalar(.9 + random() * .2)
      : new THREE.Color(colours.clod).multiplyScalar(.6 + random() * .45);
    const g = fragment(random, size * (kind < .12 ? .7 : 1), kind < .12 ? .3 : .55);
    g.translate(x, surfaceHeight(x, z) - size * .12, z);
    parts.push(colourise(g, color));
  }
  for (const t of trenches) {
    const y = -trenchFloorDepth(t);
    for (const [x1, z1, x2, z2, nx, nz] of [[t.xmin, t.zmin, t.xmin, t.zmax, 1, 0], [t.xmax, t.zmin, t.xmax, t.zmax, -1, 0], [t.xmin, t.zmin, t.xmax, t.zmin, 0, 1]]) {
      const span = Math.hypot(x2 - x1, z2 - z1);
      for (let k = 0; k < span * DEBRIS.spoilPerMetre; k++) {
        const u = random(), out = .01 + random() ** 2.5 * .2, [s0, s1] = DEBRIS.spoilSizeMetres, size = s0 * (s1 / s0) ** random();
        const wx = x1 + (x2 - x1) * u, wz = z1 + (z2 - z1) * u, foot = earthPoint(wx, y, wz);
        const x = foot[0] + nx * out, z = foot[2] + nz * out;
        if (x > 6.3 && x < 7.7 && z > 6.85) continue;
        const g = fragment(random, size, .6);
        // Crumbs nearest the wall rest a little higher, as a low talus against the foot.
        g.translate(x, y + floorRelief(t, x, z) + size * .15 + Math.max(0, .06 - out) * .5, z);
        parts.push(colourise(g, new THREE.Color(colours.clod).multiplyScalar(.75 + random() * .35)));
      }
    }
  }
  return merged(parts);
}

function clipFront(poly, front) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = front - a[2], db = front - b[2];
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push(a.map((value, j) => value + (b[j] - value) * t));
    }
  }
  return out;
}
function emit(v, poly, front) {
  const p = clipFront(poly, front);
  for (let i = 1; i < p.length - 1; i++) v.push(...p[0], ...p[i], ...p[i + 1]);
}

// Ring look decisions (not measurements). Every zone is terracotta; the pale upper read comes from adhering soil crusts,
// the dark lower read from damp staining. Zone changes blend irregularly over about two rings.
// The damp lower zone was L* 17 (M); at 25 its unlit left limb in the ring close-up stays above the near-black test's 5% luma
// (at 22 one stained, darker-offset ring still had a 187 px region).
export const RING_ZONES = Object.freeze({ terracottaLab: [[54, 5, 8.2], [37, 6.8, 10], [25, 4, 6.2]], crustLab: [60, 3.5, 9.5], dampCrustLab: [38, 2.5, 6.5], jointLab: [24, 2.5, 5.5],
  crustCover: [.3, .1, .03], lipCrustBonus: .22, jointCrustBonus: .12, blendRings: 2, stepL: [2.5, 5], bandL: 4,
  ovality: [.005, .015], offsetMetres: [.005, .02], bigChipEveryRings: 3, bigChipWidthMetres: [.02, .06], bigChipDepthMetres: [.014, .028],
  smallChipWidthMetres: [.008, .02], smallChipDepthMetres: [.004, .01], spallCover: .08, spallDepthMetres: .004, crustThicknessMetres: .0018,
  jointWidthMetres: [.006, .016], angularSegments: 192, bodyRows: 7 });
const RING_RADIUS = .34;
// Two-octave crust field in metres along the ring surface (arc length, height), so patches never streak vertically.
const crustField = (u, y, seed) => .7 * gradientNoise(u / .15, y / .05, .37, seed) + .3 * gradientNoise(u / .035, y / .02, .71, seed + 1);
const CRUST_QUANTILES = (() => {
  const random = mulberry32(81501), values = Array.from({ length: 4096 }, () => crustField(random() * 40, random() * 40, 81511));
  return values.sort((a, b) => a - b);
})();
const crustThreshold = cover => CRUST_QUANTILES[Math.max(0, Math.min(CRUST_QUANTILES.length - 1, Math.round((1 - cover) * (CRUST_QUANTILES.length - 1))))];
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mixLab = (p, q, t) => p.map((v, k) => v + (q[k] - v) * t);

export function ringSection(shaft, front, { heapColour = 0x8a7a64, fragmentColour = 0x3a322b } = {}) {
  const Z = RING_ZONES, N = Z.angularSegments, top = surfaceHeight(shaft.x, shaft.z) - shaft.localTopDepth;
  const random = mulberry32(81221), tones = [], perZone = shaft.rings / 3;
  const bodyParts = [], lipParts = [], jointParts = [], crackV = [];
  let offsetL = 0, offsetZone = -1;
  for (let i = 0; i < shaft.rings; i++) {
    const y1 = top - i * shaft.visiblePitch, h = i === shaft.rings - 1 ? shaft.ringHeight : shaft.visiblePitch;
    const offset = Z.offsetMetres[0] + random() * (Z.offsetMetres[1] - Z.offsetMetres[0]), offsetAngle = random() * Math.PI * 2;
    const dx = offset * Math.cos(offsetAngle), dz = offset * Math.sin(offsetAngle), tilt = (random() * 2 - 1) * shaft.tiltRadians;
    const ovality = Z.ovality[0] + random() * (Z.ovality[1] - Z.ovality[0]), ovalAngle = random() * Math.PI;
    const zone = Math.min(2, Math.floor(i / perZone));
    if (zone !== offsetZone) { offsetL = (random() * 2 - 1) * 1.5; offsetZone = zone; }
    else {
      const step = Z.stepL[0] + random() * (Z.stepL[1] - Z.stepL[0]);
      offsetL += Math.abs(offsetL + step) > Z.bandL ? -step : Math.abs(offsetL - step) > Z.bandL ? step : random() < .5 ? step : -step;
    }
    const chroma = .85 + random() * .3, seed = 81600 + i * 13;
    // Chips: small ones everywhere; one ring in three gets a 2-6 cm chip on the camera side that breaks the lip outline.
    const chips = Array.from({ length: 1 + Math.floor(random() * 2) }, () => ({ at: random() * Math.PI * 2, bottom: random() < .3,
      width: Z.smallChipWidthMetres[0] + random() * (Z.smallChipWidthMetres[1] - Z.smallChipWidthMetres[0]),
      depth: Z.smallChipDepthMetres[0] + random() * (Z.smallChipDepthMetres[1] - Z.smallChipDepthMetres[0]) }));
    const bigChipPhase = random();
    if (i % Z.bigChipEveryRings === 0) chips.push({ at: Math.PI / 2 + (bigChipPhase - .5) * 1.7, bottom: random() < .35,
      width: Z.bigChipWidthMetres[0] + random() * (Z.bigChipWidthMetres[1] - Z.bigChipWidthMetres[0]),
      depth: Z.bigChipDepthMetres[0] + random() * (Z.bigChipDepthMetres[1] - Z.bigChipDepthMetres[0]), big: true });
    // Flat-bottomed notch with steep, slightly ragged walls.
    const chipAt = (a, bottom) => chips.reduce((sum, chip) => {
      if (chip.bottom !== bottom && !chip.big) return sum;
      const d = Math.abs(Math.atan2(Math.sin(a - chip.at), Math.cos(a - chip.at))) * RING_RADIUS;
      const half = chip.width / 2 * (1 + .25 * gradientNoise(a * 40, i, .3, seed + 2));
      return Math.max(sum, chip.depth * (1 - smooth(half * .75, half, d)) * (chip.bottom === bottom ? 1 : .35));
    }, 0);
    const lipSwell = a => .004 * gradientNoise(a * 2.2, i * 7.1 + .3, .5, 81301);
    const rows = Z.bodyRows, profile = [[.335, -.002, 'lip'], [.350, -.008, 'lip'], [.349, -.018, 'lip'], [.333, -.031, 'body']];
    for (let r = 1; r < rows; r++) profile.push([.333 - .004 * r / rows, -.031 - (h - .061) * r / rows, 'body']);
    profile.push([.329, -h + .030, 'body'], [.342, -h + .014, 'foot'], [.340, -h + .005, 'foot'], [.310, -h + .005, 'inner'], [.310, -.009, 'inner']);
    const K = profile.length, positions = [], colours = [];
    let crustSum = 0, crustCount = 0;
    for (let j = 0; j <= N; j++) {
      const a = (j % N) / N * Math.PI * 2, u = a * RING_RADIUS;
      const topChip = chipAt(a, false), footChip = chipAt(a, true);
      for (let k = 0; k < K; k++) {
        const [r0, dy0, part] = profile[k], y = y1 + dy0;
        // Zone coordinate with irregular boundaries: blends each zone change over about two rings.
        const zoneS = (i + .5 + dy0 / h) / perZone + .16 * gradientNoise(u / .09, y / .07, .13, 81521);
        const w1 = smooth(1 - Z.blendRings / 2 / perZone, 1 + Z.blendRings / 2 / perZone, zoneS), w2 = smooth(2 - Z.blendRings / 2 / perZone, 2 + Z.blendRings / 2 / perZone, zoneS);
        const zoneCover = Z.crustCover[0] + (Z.crustCover[1] - Z.crustCover[0]) * w1 + (Z.crustCover[2] - Z.crustCover[1]) * w2;
        let lab = mixLab(mixLab(Z.terracottaLab[0], Z.terracottaLab[1], w1), Z.terracottaLab[2], w2);
        lab = [lab[0] + offsetL, lab[1] * chroma, lab[2] * chroma];
        // Damp and soil stains: soft darker blotches stretched around the ring.
        const stain = smooth(.15, .6, gradientNoise(u / .12, y / .05, .91, seed + 3));
        lab = mixLab(lab, [lab[0] - 7, lab[1] * .7, lab[2] * .8], stain * (.5 + .5 * w1));
        const lipBonus = part === 'lip' ? Z.lipCrustBonus : part === 'foot' || (part === 'body' && dy0 < -h + .045) ? Z.jointCrustBonus : 0;
        const chip = part === 'lip' || (part === 'body' && k === 3) ? topChip : part === 'foot' ? footChip : 0;
        const spall = part === 'body' ? smooth(.55, .62, gradientNoise(u / .035, y / .025, .55, seed + 5)) : 0;
        const field = crustField(u, y, 81511);
        const crust = part === 'inner' || chip > .002 ? 0 : smooth(-.22, .22, field - crustThreshold(Math.min(.9, zoneCover + lipBonus * (1 - .6 * w2)))) * (1 - spall);
        if (part !== 'inner') { crustSum += crust; crustCount++; }
        // Dust in the damp lower zone is wet and darker, so it does not print as white flecks on dark rings.
        const crustLab = mixLab(Z.crustLab, Z.dampCrustLab, Math.min(1, .45 * w1 + w2));
        let colourLab = mixLab(lab, crustLab, crust * (.55 + .35 * smooth(-.5, .5, gradientNoise(u / .02, y / .02, .2, seed + 7))));
        if (chip > .002 || spall > .5) colourLab = [lab[0] + 4, lab[1] * 1.15, lab[2] * 1.1];
        const speck = 1 + .07 * gradientNoise(u / .006, y / .006, .4, seed + 9);
        const c = new THREE.Color(labToHex(colourLab)).multiplyScalar(speck);
        colours.push(c.r, c.g, c.b);
        const radial = part === 'inner' ? 0 : (k === 1 || k === 2 ? lipSwell(a) : 0) + crust * Z.crustThicknessMetres - spall * Z.spallDepthMetres - chip;
        const rr = (r0 + radial) * (1 + ovality * Math.cos(2 * (a - ovalAngle)));
        const dy = dy0 - (part === 'lip' && dy0 > -.012 ? topChip * .8 : 0) + (part === 'foot' && dy0 < -h + .01 ? footChip * .8 : 0);
        positions.push(shaft.x + dx + rr * Math.cos(a), y1 + dy + tilt * Math.cos(a), shaft.z + dz + rr * Math.sin(a));
      }
    }
    const lipIndex = [], bodyIndex = [];
    for (let j = 0; j < N; j++) for (let k = 0; k < K; k++) {
      const a = j * K + k, b = (j + 1) * K + k, c = (j + 1) * K + (k + 1) % K, d = j * K + (k + 1) % K;
      (k <= 2 ? lipIndex : bodyIndex).push(a, b, c, a, c, d);
    }
    const ringGeometry = index => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
      g.setIndex([...lipIndex, ...bodyIndex]);
      g.computeVertexNormals();
      g.setIndex(index);
      const flat = g.toNonIndexed(); g.dispose();
      flat.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(flat.attributes.position.count * 2), 2));
      return flat;
    };
    lipParts.push(ringGeometry(lipIndex)); bodyParts.push(ringGeometry(bodyIndex));
    tones.push({ ring: i, zone, albedoLab: Z.terracottaLab[zone].map((v, k) => k ? v * chroma : v + offsetL), offsetMetres: offset, ovality, tiltRadians: tilt,
      crustCoverage: crustSum / crustCount, chipsMetres: chips.map(chip => ({ width: chip.width, depth: chip.depth, big: Boolean(chip.big) })) });
    // Soil-packed joint below this ring: uneven width, bulging slightly out of the gap, dark with a little pale dust.
    if (i < shaft.rings - 1) {
      const jp = [], jc = [], jointBase = new THREE.Color(labToHex(Z.jointLab));
      for (let j = 0; j <= N; j++) {
        const a = (j % N) / N * Math.PI * 2, u = a * RING_RADIUS, y = y1 - h + .0015;
        const width = Z.jointWidthMetres[0] + (Z.jointWidthMetres[1] - Z.jointWidthMetres[0]) * (.5 + .5 * gradientNoise(u / .05, i * 3.1, .29, 81701));
        const bulge = .006 + .006 * gradientNoise(u / .02, i * 2.3, .61, 81703);
        for (const [rad, yy] of [[.334, y + width * .5], [.338 + bulge, y], [.334, y - width * .5]]) {
          const rr = rad * (1 + ovality * Math.cos(2 * (a - ovalAngle)));
          jp.push(shaft.x + dx + rr * Math.cos(a), yy + tilt * Math.cos(a), shaft.z + dz + rr * Math.sin(a));
          const dust = smooth(.35, .6, gradientNoise(u / .02, yy / .01, .83, 81707)) * (zone === 2 ? .2 : .55);
          const c = jointBase.clone().multiplyScalar(.8 + .35 * (.5 + .5 * gradientNoise(u / .012, i, .17, 81709))).lerp(new THREE.Color(labToHex(Z.crustLab)), dust);
          jc.push(c.r, c.g, c.b);
        }
      }
      const index = [];
      for (let j = 0; j < N; j++) for (let k = 0; k < 2; k++) { const a = j * 3 + k, b = (j + 1) * 3 + k; index.push(a, b, b + 1, a, b + 1, a + 1); }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(jp, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(jc, 3));
      g.setIndex(index); g.computeVertexNormals();
      const flat = g.toNonIndexed(); g.dispose();
      flat.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(flat.attributes.position.count * 2), 2));
      jointParts.push(flat);
    }
    if (shaft.crackedCourses.includes(i)) {
      const a = 1.8, b = a + .012, c = (r, angle, dy) => [shaft.x + dx + r * Math.cos(angle), y1 + dy + tilt * Math.cos(angle), shaft.z + dz + r * Math.sin(angle)];
      for (const p of [c(.3465, a, -.020), c(.3475, b, -.020), c(.3395, b + .035, -h + .025), c(.3465, a, -.020), c(.3395, b + .035, -h + .025), c(.3385, a + .035, -h + .025)]) crackV.push(...p);
    }
  }
  // Uneven soil fill a little below the top ring's rim, instead of a flush lid.
  const fillV = [], fillC = [], soil = new THREE.Color(heapColour), fillCount = 64, fillRings = 8;
  const fillPoint = (q, s) => {
    const a = q / fillCount * Math.PI * 2, r = .306 * s / fillRings, x = shaft.x + r * Math.cos(a), z = shaft.z + r * Math.sin(a);
    return [x, top - .028 + .008 * gradientNoise(x / .04, z / .04, .5, 81801) + .006 * Math.min(1, (s / fillRings) ** 3), z];
  };
  const fillColour = (p) => soil.clone().multiplyScalar(.75 + .3 * (.5 + .5 * gradientNoise(p[0] / .015, p[2] / .015, .3, 81803)));
  for (let s = 0; s < fillRings; s++) for (let q = 0; q < fillCount; q++) {
    const quadPoints = [fillPoint(q, s), fillPoint(q + 1, s), fillPoint(q + 1, s + 1), fillPoint(q, s + 1)];
    for (const k of [0, 2, 1, 0, 3, 2]) { fillV.push(...quadPoints[k]); const c = fillColour(quadPoints[k]); fillC.push(c.r, c.g, c.b); }
  }
  const result = { body: merged(bodyParts), lips: merged(lipParts), gaps: merged(jointParts), fill: geometry(fillV), cracks: geometry(crackV) };
  result.fill.setAttribute('color', new THREE.Float32BufferAttribute(fillC, 3));
  result.tones = tones;
  result.soil = footHeap(shaft, random, heapColour, fragmentColour);
  const v = [], pitY = -shaft.pit.bottomDepth;
  quad(v, earthPoint(shaft.pit.xmin, pitY, front), earthPoint(shaft.pit.xmax, pitY, front), earthPoint(shaft.pit.xmax, pitY, shaft.pit.zmin), earthPoint(shaft.pit.xmin, pitY, shaft.pit.zmin));
  result.pitFloor = geometry(v);
  return result;
}

// Low irregular heap of loose soil around the column foot, with a few small dark angular fragments half-buried in it.
function footHeap(shaft, random, heapColour, fragmentColour) {
  const pit = shaft.pit, y0 = -pit.bottomDepth, step = .025, v = [], colors = [], parts = [];
  const height = (x, z) => {
    const r = Math.hypot(x - shaft.x, z - shaft.z), wall = Math.min(x - pit.xmin, pit.xmax - x, z - pit.zmin);
    const ring = .055 * Math.exp(-(((r - .38) / .09) ** 2)) * (.55 + .45 * gradientNoise(x * 9, z * 9, .3, 81401));
    const foot = .03 * Math.exp(-((wall / .08) ** 2)) * (.6 + .4 * gradientNoise(x * 13, z * 13, .7, 81403));
    const lumps = .008 * gradientNoise(x * 31, z * 31, .1, 81407), front = Math.min(1, Math.max(0, (8 - z) / .08));
    return Math.max(.002, (ring + foot + lumps + .006) * front);
  };
  const snap = (x, z) => {
    const r = Math.hypot(x - shaft.x, z - shaft.z);
    return r >= .335 ? [x, z] : [shaft.x + (x - shaft.x) / Math.max(r, 1e-6) * .335, shaft.z + (z - shaft.z) / Math.max(r, 1e-6) * .335];
  };
  const base = new THREE.Color(heapColour);
  for (let x = pit.xmin; x < pit.xmax - 1e-9; x += step) for (let z = pit.zmin; z < 8 - 1e-9; z += step) {
    const corners = [[x, z], [x + step, z], [x + step, z + step], [x, z + step]].map(([a, b]) => snap(Math.min(a, pit.xmax), Math.min(b, 8)));
    if (corners.every(([a, b]) => Math.hypot(a - shaft.x, b - shaft.z) < .336)) continue;
    const point = ([a, b]) => [a, y0 + height(a, b), b];
    for (const k of [0, 2, 1, 0, 3, 2]) {
      v.push(...point(corners[k]));
      const shade = .85 + .3 * (.5 + .5 * gradientNoise(corners[k][0] * 17, corners[k][1] * 17, .9, 81409));
      colors.push(base.r * shade, base.g * shade, base.b * shade);
    }
  }
  const heap = geometry(v);
  heap.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  parts.push(heap);
  for (let i = 0; i < 9; i++) {
    const angle = random() * Math.PI * 2, r = .37 + random() * .12, x = shaft.x + r * Math.cos(angle), z = shaft.z + r * Math.sin(angle);
    if (x < pit.xmin + .03 || x > pit.xmax - .03 || z < pit.zmin + .03 || z > 7.95) continue;
    const size = .012 + random() * .03, g = fragment(random, size, .7);
    g.translate(x, y0 + height(x, z) - size * .25, z);
    parts.push(colourise(g, new THREE.Color(fragmentColour).multiplyScalar(.8 + random() * .4)));
  }
  return merged(parts);
}

export function pitSection(pit, front) {
  const wall = [], floor = [], bottom = surfaceHeight(pit.x, pit.z) - pit.localBottomDepth;
  const points = circle(pit, 64);
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    emit(wall, [[...a.slice(0, 1), bottom, a[1]], [b[0], bottom, b[1]],
      [b[0], surfaceHeight(...b), b[1]], [a[0], surfaceHeight(...a), a[1]]], front);
    emit(floor, [[pit.x, bottom, pit.z], [b[0], bottom, b[1]], [a[0], bottom, a[1]]], front);
  }
  return { wall: geometry(wall), floor: geometry(floor) };
}

export const BRICK_SECTION = { courseMetres: [.065, .085], lengthMetres: [.20, .27], jointMetres: [.010, .018], reliefMetres: [.005, .02],
  toneScale: [.72, 1.28], missingTopCourse: .4, missingSecondCourse: .15, mudJointRecessMetres: .003 };
// Brick wall in section: irregular courses with recessed soil-coloured mud joints, a broken top and per-brick relief/tone.
export function sectionFeatures(table, { brick = 0x96725e, mud = 0x6f604f } = {}) {
  const bricks = [], mortar = [], front = table.proportions.length / 2;
  const random = mulberry32(41341), B = BRICK_SECTION;
  for (const feature of table.proportions.features.filter(feature => feature.material === 'brick')) {
    const height = feature.bottomDepth - feature.topDepth, depth = feature.zmax - feature.zmin;
    const mudBox = box(feature.xmax - feature.xmin, height, depth, (feature.xmin + feature.xmax) / 2, -(feature.topDepth + feature.bottomDepth) / 2,
      (feature.zmin + feature.zmax) / 2 - B.mudJointRecessMetres);
    mortar.push(colourise(mudBox, new THREE.Color(mud)));
    const rows = Math.round(height / ((B.courseMetres[0] + B.courseMetres[1]) / 2)), weights = Array.from({ length: rows }, () => .85 + random() * .3);
    const total = weights.reduce((a, b) => a + b);
    let y = -feature.bottomDepth;
    for (let row = 0; row < rows; row++) {
      const course = height * weights[row] / total;
      let x = feature.xmin - random() * B.lengthMetres[1];
      while (x < feature.xmax) {
        const length = B.lengthMetres[0] + random() * (B.lengthMetres[1] - B.lengthMetres[0]), joint = B.jointMetres[0] + random() * (B.jointMetres[1] - B.jointMetres[0]);
        const left = Math.max(feature.xmin + .004, x), right = Math.min(feature.xmax - .004, x + length - joint);
        x += length;
        const missing = row === rows - 1 ? random() < B.missingTopCourse : row === rows - 2 ? random() < B.missingSecondCourse : false;
        if (right - left < .03 || missing) continue;
        const broken = row >= rows - 2 ? random() * .35 : 0, h = (course - joint) * (1 - broken);
        const relief = B.reliefMetres[0] + random() * (B.reliefMetres[1] - B.reliefMetres[0]);
        const piece = box(right - left, h, depth + relief, 0, 0, 0);
        piece.rotateZ((random() - .5) * .03).translate((left + right) / 2, y + joint / 2 + h / 2 + (random() - .5) * .006, (feature.zmin + feature.zmax) / 2 + relief / 2);
        const tone = new THREE.Color(brick).multiplyScalar(B.toneScale[0] + random() * (B.toneScale[1] - B.toneScale[0]));
        tone.offsetHSL((random() - .5) * .02, (random() - .5) * .06, 0);
        bricks.push(colourise(piece, tone));
      }
      y += course;
    }
  }
  return { bricks: merged(bricks), mortar: merged(mortar), front };
}
