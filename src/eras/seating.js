// Seating of the layout's features on the era stack (M0.1): host planes with a vertical shear, trench floor planes,
// exposure, boundary flattening under surface features, and the placement matrices for the kit groups.
// CPU only; deterministic. Every plane and depth here is a modelling decision (M).
import * as THREE from 'three';
import { buildEraFeature, buildFeature, eraFeatureSpec, fig13Specs } from '../features/index.js';
import { boundaryHeights as stackBoundaries, ERA_IDS, BOUNDARY_COUNT } from './stack.js';
import { surfaceHeight } from '../layers.js';
import { TRENCHES, FEATURES, FIG13_OFFSET, RING_WELL, CONTROLLED_PIT, FIND_BAND_FRACTION, exposure, FLATTEN_FEATHER_METRES } from './layout.js';

const ERA = Object.fromEntries(ERA_IDS.map((id, i) => [id, i]));
const RING_MOUTH_RADIUS = .4;
const raw = (x, z) => stackBoundaries(x, z, new Float64Array(BOUNDARY_COUNT));

// ---- Geometry helpers.
export function insidePolygon(poly, x, z) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function polygonSamples(poly, step = .1) {
  const pts = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (step / 2)));
    for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
  for (let x = Math.min(...xs) + step / 2; x < Math.max(...xs); x += step) for (let z = Math.min(...zs) + step / 2; z < Math.max(...zs); z += step) if (insidePolygon(poly, x, z)) pts.push([x, z]);
  return pts;
}
const outlineSamples = (poly, step = .05) => polygonSamples(poly, step * 2).slice(0, 0).concat((() => {
  const pts = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
  }
  return pts;
})());
export const bboxOf = points => { const xs = points.map(p => p[0]), zs = points.map(p => p[1]); return { x: [Math.min(...xs), Math.max(...xs)], z: [Math.min(...zs), Math.max(...zs)] }; };
// Least-squares plane y = y0 + a (x - px) + b (z - pz) through samples [x, z, y].
function fitPlane(samples) {
  const n = samples.length, px = samples.reduce((s, p) => s + p[0], 0) / n, pz = samples.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, sxz = 0, szz = 0, sxy = 0, szy = 0, sy = 0;
  for (const [x, z, y] of samples) { const dx = x - px, dz = z - pz; sxx += dx * dx; sxz += dx * dz; szz += dz * dz; sxy += dx * y; szy += dz * y; sy += y; }
  const y0 = sy / n, det = sxx * szz - sxz * sxz;
  const a = det > 1e-12 ? (sxy * szz - szy * sxz) / det : 0, b = det > 1e-12 ? (szy * sxx - sxy * sxz) / det : 0;
  return plane(px, pz, y0 - 0 * a, a, b, y0);
}
function plane(px, pz, _unused, a, b, y0) { return { px, pz, y0, a, b, at: (x, z) => y0 + a * (x - px) + b * (z - pz) }; }
const shifted = (p, dy) => plane(p.px, p.pz, 0, p.a, p.b, p.y0 + dy);
const planeJSON = p => ({ yAtCentre: +p.y0.toFixed(4), centre: [+p.px.toFixed(3), +p.pz.toFixed(3)], dYdX: +p.a.toFixed(5), dYdZ: +p.b.toFixed(5) });

// ---- Kit footprints and heights in feature-local coordinates.
function localShape(f) {
  const h = buildEraFeature(f.id, f.overrides ?? {}), b = h.bounds, spec = eraFeatureSpec(f.id, f.overrides ?? {});
  const rect = [[b.min.x, b.min.z], [b.max.x, b.min.z], [b.max.x, b.max.z], [b.min.x, b.max.z]];
  const polys = spec.kind === 'assembly' && Array.isArray(spec.children) && spec.children.every(c => c.footprint) ? spec.children.map(c => c.footprint)
    : spec.footprint ? [spec.footprint] : [rect];
  // Traced stones (K3c on) keep their figure-local base below local y = 0; their height is the full extent.
  const baseY = spec.kind === 'traced-stone' ? b.min.y : 0;
  const out = { polys, min: b.min.toArray(), max: b.max.toArray(), courses: h.courseCount, height: b.max.y - baseY, baseY, kind: spec.kind };
  h.dispose?.();
  return out;
}
function fig13Walls() {
  return fig13Specs().map(spec => {
    const h = buildFeature(spec), b = h.bounds;
    const w = { id: spec.id, poly: spec.footprint.map(([x, z]) => [x + FIG13_OFFSET[0], z + FIG13_OFFSET[1]]), height: b.max.y, courses: h.courseCount };
    h.dispose?.();
    return w;
  });
}
// Local -> world xz for the layout's rotation (90 maps local +x to world +z).
function placeXZ(f, shape) {
  const lcx = (shape.min[0] + shape.max[0]) / 2, lcz = (shape.min[2] + shape.max[2]) / 2, rot = (f.rotate ?? 0) * Math.PI / 180;
  const c = Math.cos(-rot), s = Math.sin(-rot);
  const map = ([x, z]) => { const dx = x - lcx, dz = z - lcz; return [f.centre[0] + dx * c + dz * s, f.centre[1] - dx * s + dz * c]; };
  return { lcx, lcz, rot: -rot, map };
}

// ---- Trench floors: a plane fitted to the target level over the trench, lowered by its largest residual so the
// floor is at or below the level everywhere in the trench.
function trenchSamples(t, step = .25) { const pts = []; for (let x = t.xmin; x <= t.xmax + 1e-9; x += step) for (let z = t.zmin; z <= t.zmax + 1e-9; z += step) pts.push([x, z]); return pts; }
function floorPlane(t, level) {
  const pts = trenchSamples(t).map(([x, z]) => [x, z, level(x, z)]), p = fitPlane(pts);
  const lowered = Math.max(...pts.map(([x, z, y]) => p.at(x, z) - y));
  return { plane: shifted(p, -lowered), loweredMetres: lowered, tiltDegrees: Math.atan(Math.hypot(p.a, p.b)) * 180 / Math.PI };
}

function computeSeating() {
  const shapes = {}, records = [];
  const fig13 = fig13Walls();
  const shapeOf = f => shapes[f.id + JSON.stringify(f.overrides ?? {})] ??= localShape(f);
  // World outlines and heights per feature.
  for (const f of FEATURES) {
    const r = { ...f, key: f.id + (f.part ? `:${f.part}` : ''), eraIndex: ERA[f.era] };
    if (f.fig13) {
      if (f.id === 'kushan-house') { r.walls = fig13; }
      else { const s = shapeOf(f); r.baseY = s.baseY; r.walls = [{ id: f.id, poly: s.polys[0].map(([x, z]) => [x + FIG13_OFFSET[0], z + FIG13_OFFSET[1]]), height: s.height, courses: s.courses }]; }
      r.polys = r.walls.map(w => w.poly); r.height = Math.max(...r.walls.map(w => w.height)); r.courses = f.id === 'kushan-house' ? shapeOf(f).courses : r.walls[0].courses;
      r.local = { translate: FIG13_OFFSET, rotateDegrees: 0 };
    } else {
      const s = shapeOf(f), m = placeXZ(f, s);
      r.polys = s.polys.map(p => p.map(m.map)); r.height = s.height; r.courses = s.courses; r.kind = s.kind; r.localBounds = { min: s.min, max: s.max };
      r.local = { centre: [m.lcx, m.lcz], rotateY: m.rot };
      r.walls = [{ id: f.id, poly: r.polys.flat().length ? bboxPoly(r.polys) : null, height: s.height, courses: s.courses }];
    }
    r.bbox = bboxOf(r.polys.flat());
    records.push(r);
  }
  const byKey = Object.fromEntries(records.map(r => [r.key, r]));
  const top = (r, x, z) => raw(x, z)[r.eraIndex + 1];
  // Exposure for walls.
  for (const r of records) if (r.rule === 'wall') {
    r.exposure = exposure(r.height, r.courses);
    for (const w of r.walls) w.exposure = exposure(w.height, w.courses);
  }
  // Trench floors.
  const rw = byKey['rajput-wall'], house = byKey['kushan-house'], T3 = TRENCHES.find(t => t.id === 'square-3');
  // Fig.13 walls differ in height (1-3 courses, stones 2): one shared base would bury the low walls. Walls in T3 share
  // the T3 floor; its depth below the Kushan top is the median of their (height - exposure), clamped so that every T3
  // wall stays 0.10-0.25 m proud (orchestrator gate). Others seat on their own fits.
  for (const w of house.walls) w.inT3 = polygonSamples(w.poly, .05).some(([x, z]) => x > T3.xmin && x < T3.xmax && z > T3.zmin && z < T3.zmax);
  {
    const t3 = house.walls.filter(w => w.inT3), e = t3.map(w => w.height - w.exposure).sort((a, b) => a - b);
    const lo = Math.max(...t3.map(w => w.height - .25)), hi = Math.min(...t3.map(w => w.height - .10)), median = e[Math.floor((e.length - 1) / 2)];
    house.embedT3 = lo <= hi ? Math.max(lo, Math.min(hi, median)) : median;
    house.embedT3Note = lo <= hi ? `median ${median.toFixed(3)} m clamped to [${lo.toFixed(3)}, ${hi.toFixed(3)}]` : `no common value: median ${median.toFixed(3)} m used`;
  }
  const targets = {
    'square-1': { lands: 'rajput-wall base', level: (x, z) => top(rw, x, z) - (rw.height - rw.exposure) },
    'square-2': { lands: 'Gupta top (brick-jelly floors and Gupta wall stand on it)', level: (x, z) => raw(x, z)[ERA.gupta + 1] },
    'square-3': { lands: 'base of the Fig.13 walls standing in T3', level: (x, z) => top(house, x, z) - house.embedT3 },
    'square-4': { lands: 'Mauryan top (sealing floor with the drain and the ring well)', level: (x, z) => raw(x, z)[ERA.mauryan + 1] }
  };
  const trenches = TRENCHES.map(t => { const fp = floorPlane(t, targets[t.id].level); return { ...t, lands: targets[t.id].lands, ...fp, floorAt: (x, z) => fp.plane.at(x, z) }; });
  const trench = Object.fromEntries(trenches.map(t => [t.id, t]));
  // Seat planes.
  const patches = [];
  for (const r of records) {
    const samples = r.polys.flatMap(p => polygonSamples(p));
    const hostIndex = r.rule === 'opening' && r.host === 'base' ? r.eraIndex : r.eraIndex + 1;
    r.hostBoundary = hostIndex;
    const hostFit = () => fitPlane(samples.map(([x, z]) => [x, z, raw(x, z)[hostIndex]]));
    if (r.id === 'kushan-house') {
      r.plane = trench['square-3'].plane; r.seat = 'per wall: T3 floor plane for walls in T3, else a fit to the Kushan top over the wall lowered by height - exposure';
      for (const w of r.walls) {
        w.plane = w.inT3 ? r.plane : shifted(fitPlane(polygonSamples(w.poly).map(([x, z]) => [x, z, raw(x, z)[hostIndex]])), -(w.height - w.exposure));
        w.seat = w.inT3 ? 'square-3 floor plane' : 'own fit to the Kushan top';
      }
    } else if (r.floorOf) { r.plane = trench[r.floorOf].plane; r.seat = `${r.floorOf} floor plane`; }
    else if (r.rule === 'wall') { r.plane = shifted(hostFit(), -(r.height - r.exposure) - (r.baseY ?? 0)); r.seat = `fit to the ${r.era} top over the outline, lowered by height - exposure${r.baseY ? `; local base y ${r.baseY.toFixed(3)} raised to the seat` : ''}`; }
    else if (r.rule === 'find') {
      const [x, z] = r.centre, b = raw(x, z - 1e-6), y = b[r.eraIndex] + FIND_BAND_FRACTION * (b[r.eraIndex + 1] - b[r.eraIndex]);
      r.plane = plane(x, z, 0, 0, 0, y); r.seat = `front face z = 8, ${FIND_BAND_FRACTION} of the ${r.era} band above its base; burial axis = face normal`;
    } else if (r.rule === 'bed') {
      r.plane = fitPlane(samples.map(([x, z]) => { const b = raw(x, z); return [x, z, b[r.eraIndex] + FIND_BAND_FRACTION * (b[r.eraIndex + 1] - b[r.eraIndex])]; }));
      r.seat = `bed inside the ${r.era} band, ${FIND_BAND_FRACTION} of its thickness above its base`;
      // A bed the trench wall must show in section is lifted to clear the trench floor there.
      if (r.aboveFloor) {
        const t = trench[r.aboveFloor.trench], bottom = Math.min(0, r.localBounds?.min[1] ?? 0), clear = Math.min(...samples.map(([x, z]) => r.plane.at(x, z) + bottom - t.floorAt(x, z)));
        r.bedRaise = Math.max(0, r.aboveFloor.clearance - clear);
        if (r.bedRaise > 0) { r.plane = shifted(r.plane, r.bedRaise); r.seat += `, raised ${r.bedRaise.toFixed(3)} m to clear the ${t.id} floor by ${r.aboveFloor.clearance} m`; }
      }
    } else { r.plane = hostFit(); r.seat = `fit to the ${hostIndex === r.eraIndex ? `${r.era} base` : `${r.era} top`} over the footprint`; }
    // The host surface stays on the seat plane; the kit goes down by its local top.
    if (r.flush) { r.surfacePlane = r.plane; r.plane = shifted(r.plane, -r.localBounds.max[1]); r.seat += `, lowered ${r.localBounds.max[1].toFixed(3)} m so its top is flush`; }
    // Surface-seated features (floors, patches, drain, lane, low walls, cut openings) flatten their host boundary.
    r.flattens = r.rule === 'surface' || r.rule === 'opening' || (r.rule === 'wall' && r.exposure >= r.height - 1e-9);
    if (r.id === 'kushan-house') {
      for (const w of r.walls) if (w.exposure >= w.height - 1e-9 && !w.inT3) patches.push({ boundary: hostIndex, poly: w.poly, bbox: bboxOf(w.poly), plane: w.plane, feature: `${r.key}:${w.id}` });
    } else if (r.flattens) for (const p of r.polys) patches.push({ boundary: hostIndex, poly: p, bbox: bboxOf(p), plane: r.surfacePlane ?? r.plane, feature: r.key });
    if (r.channel) {
      const m = placeXZ(r, r.localBounds), x0 = r.localBounds.min[0], x1 = r.localBounds.max[0], h = r.channel.halfWidthMetres;
      r.channelPoly = [[x0, -h], [x1, -h], [x1, h], [x0, h]].map(m.map);
      patches.push({ boundary: hostIndex, poly: r.channelPoly, bbox: bboxOf(r.channelPoly), plane: shifted(r.plane, r.channel.floorMetres), featherMetres: 0, feature: `${r.key}:channel` });
    }
    if (r.walls && r.id !== 'kushan-house') for (const w of r.walls) w.plane = r.plane;
    // Raw residual of the host under the base (before flattening): gap = base above host, embedding = base below host.
    if (r.rule !== 'find') {
      const residual = r.walls?.length && r.id === 'kushan-house' ? r.walls.flatMap(w => polygonSamples(w.poly).map(([x, z]) => w.plane.at(x, z) - raw(x, z)[hostIndex]))
        : samples.map(([x, z]) => r.plane.at(x, z) - raw(x, z)[hostIndex]);
      r.rawResidual = { maxGap: Math.max(0, ...residual), maxEmbedding: Math.max(0, ...residual.map(v => -v)) };
    }
  }
  // Cut depths that depend on floors and hosts.
  const ph = byKey['rajput-postholes'];
  {
    const t1 = trench['square-1'], xs = []; for (let x = ph.bbox.x[0]; x <= ph.bbox.x[1] + 1e-9; x += .05) xs.push(x);
    const clear = Math.min(...xs.map(x => ph.plane.at(x, 4) - t1.floorAt(Math.max(t1.xmin, Math.min(t1.xmax, x)), 4)));
    ph.cutDepth = +(clear - ph.postholeClearance).toFixed(3); ph.overrides = { ...(ph.overrides ?? {}), depth: ph.cutDepth };
    ph.cutNote = `U base ${ph.postholeClearance} m above the T1 floor along the back wall (z = 4); opening-to-floor clearance there ${clear.toFixed(3)} m`;
  }
  const sp = byKey['rajput-sealed-pit'];
  {
    const [x, z] = sp.centre, target = raw(x, z)[ERA.gupta + 1] - sp.intoGupta;
    sp.cutDepth = +(sp.plane.at(x, z) - target).toFixed(3); sp.overrides = { ...(sp.overrides ?? {}), depth: sp.cutDepth };
    sp.cutNote = `opening on the Rajput base; base ${sp.intoGupta} m below the Gupta top at the pit centre`;
  }
  // Ring well and controlled pit.
  const t4 = trench['square-4'], circle = Array.from({ length: 48 }, (_, i) => [RING_WELL.x + RING_WELL.radius * Math.cos(i * Math.PI / 24), RING_WELL.z + RING_WELL.radius * Math.sin(i * Math.PI / 24)]);
  const ring = { ...RING_WELL, plane: t4.plane, topY: t4.floorAt(RING_WELL.x, RING_WELL.z), bottomY: t4.floorAt(RING_WELL.x, RING_WELL.z) - RING_WELL.span,
    marginAboveSilt: Math.min(...circle.map(([x, z]) => t4.floorAt(x, z) - RING_WELL.span - raw(x, z)[0])) };
  ring.pitFloorY = ring.bottomY - RING_WELL.pit.belowRings;
  // The Mauryan top is flattened level with the ring top over the mouth (rings, lips and offsets reach 0.37 m), so
  // the top ring is flush with its surface.
  const mouth = Array.from({ length: 48 }, (_, i) => [RING_WELL.x + RING_MOUTH_RADIUS * Math.cos(i * Math.PI / 24), RING_WELL.z + RING_MOUTH_RADIUS * Math.sin(i * Math.PI / 24)]);
  patches.push({ boundary: ERA.mauryan + 1, poly: mouth, bbox: bboxOf(mouth), plane: plane(RING_WELL.x, RING_WELL.z, 0, 0, 0, ring.topY), feature: RING_WELL.id });
  ring.mouthRadius = RING_MOUTH_RADIUS;
  const cp = CONTROLLED_PIT, cpSamples = [], cpStep = .1;
  for (let x = cp.xmin; x <= cp.xmax + 1e-9; x += cpStep) for (let z = cp.zmin; z <= cp.zmax + 1e-9; z += cpStep) cpSamples.push([x, z, raw(x, z)[0]]);
  const siltFit = fitPlane(cpSamples), siltLower = Math.max(...cpSamples.map(([x, z, y]) => siltFit.at(x, z) - y));
  const pitFloor = shifted(siltFit, -siltLower);
  const pit = { ...cp, floorPlane: pitFloor, topPlane: t4.plane, intoSiltMax: Math.max(...cpSamples.map(([x, z, y]) => y - pitFloor.at(x, z))), intoSiltMin: Math.min(...cpSamples.map(([x, z, y]) => y - pitFloor.at(x, z))),
    siltTopFall: Math.max(...cpSamples.map(p => p[2])) - Math.min(...cpSamples.map(p => p[2])) };
  let highest = -Infinity; for (let x = -12; x <= 12; x += .05) for (let z = -8; z <= 8; z += .05) highest = Math.max(highest, surfaceHeight(x, z));
  const deepestY = Math.min(...cpSamples.map(([x, z]) => pitFloor.at(x, z)));
  return { records, trenches, patches, ring, pit, deepestCut: { highestSurfaceY: highest, deepestExposedY: deepestY, depthMetres: highest - deepestY } };
}
function bboxPoly(polys) { const b = bboxOf(polys.flat()); return [[b.x[0], b.z[0]], [b.x[1], b.z[0]], [b.x[1], b.z[1]], [b.x[0], b.z[1]]]; }

// Kit-derived seats are needed by native construction, not by the packed state driver. Resolve once on first
// access, then replace the getters with ordinary data properties so the public records keep their original shape.
let seating = null;
export const SEATING = {};
for (const key of ['records', 'trenches', 'patches', 'ring', 'pit', 'deepestCut']) Object.defineProperty(SEATING, key, {
  enumerable: true, configurable: true,
  get() {
    if (!seating) {
      seating = computeSeating();
      for (const [name, value] of Object.entries(seating)) Object.defineProperty(SEATING, name, {
        value, enumerable: true, configurable: false
      });
    }
    return seating[key];
  }
});

// ---- Final boundaries: the stack with each surface feature's host flattened to its seat plane under the footprint,
// blended back to the stack over FLATTEN_FEATHER_METRES. Ordering is kept by clamping between the neighbours.
function distanceOutside(patch, x, z) {
  if (insidePolygon(patch.poly, x, z)) return 0;
  let d = Infinity;
  const p = patch.poly;
  for (let i = 0; i < p.length; i++) {
    const [ax, az] = p[i], [bx, bz] = p[(i + 1) % p.length], vx = bx - ax, vz = bz - az, L = vx * vx + vz * vz;
    const t = L ? Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / L)) : 0;
    d = Math.min(d, Math.hypot(x - ax - t * vx, z - az - t * vz));
  }
  return d;
}
export function siteBoundaries(x, z, out = new Float64Array(BOUNDARY_COUNT)) {
  stackBoundaries(x, z, out);
  for (const patch of SEATING.patches) {
    const b = patch.bbox, F = patch.featherMetres ?? FLATTEN_FEATHER_METRES;
    if (x < b.x[0] - F || x > b.x[1] + F || z < b.z[0] - F || z > b.z[1] + F) continue;
    const d = distanceOutside(patch, x, z);
    if (d > 0 && d >= F) continue;
    const u = F > 0 ? d / F : 0, w = 1 - u * u * (3 - 2 * u), j = patch.boundary;
    let y = out[j] + w * (patch.plane.at(x, z) - out[j]);
    if (j > 0) y = Math.max(y, out[j - 1] + .02);
    if (j < BOUNDARY_COUNT - 1) y = Math.min(y, out[j + 1] - .02);
    out[j] = y;
  }
  return out;
}
export function siteEraAtHeight(x, y, z) {
  const b = siteBoundaries(x, z);
  if (y > b[BOUNDARY_COUNT - 1]) return 'above ground';
  for (let i = ERA_IDS.length - 1; i >= 0; i--) if (y >= b[i]) return ERA_IDS[i];
  return 'silt';
}
// Placement matrix: shear(seat plane) * translate(centre) * rotateY * translate(-local centre). Local y = 0 maps onto the
// seat plane; vertical lines stay vertical, so vertical cut planes keep their local form.
export function placementMatrix(r, wall = null) {
  const p = wall?.plane ?? r.plane, m = new THREE.Matrix4();
  if (r.rule === 'find') {
    const [lcx, lcz] = r.local.centre;
    return m.makeTranslation(r.centre[0], p.y0, 8).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)).multiply(new THREE.Matrix4().makeTranslation(-lcx, 0, -lcz));
  }
  const shear = new THREE.Matrix4().set(1, 0, 0, 0, p.a, 1, p.b, p.y0 - p.a * p.px - p.b * p.pz, 0, 0, 1, 0, 0, 0, 0, 1);
  if (r.fig13) return shear.multiply(new THREE.Matrix4().makeTranslation(FIG13_OFFSET[0], 0, FIG13_OFFSET[1]));
  const [lcx, lcz] = r.local.centre;
  return shear.multiply(new THREE.Matrix4().makeTranslation(r.centre[0], 0, r.centre[1])).multiply(new THREE.Matrix4().makeRotationY(r.local.rotateY)).multiply(new THREE.Matrix4().makeTranslation(-lcx, 0, -lcz));
}
export { planeJSON, outlineSamples, polygonSamples };
