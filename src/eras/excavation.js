// Excavation cut model for the composite section (M1): battered trench walls, the controlled pit and the ring-well pit,
// as convex removed volumes per cut step. The soil block and the kit features share these planes. Every batter, step
// rule and pit shape here is a modelling decision (M).
import { groundHeight } from './stack.js';
import { SEATING } from './seating.js';
import { RING_WELL, CONTROLLED_PIT } from './layout.js';
import { BLOCK, CUT_STEPS, stepOf } from './site-driver.js';
export { BLOCK, CUT_STEPS, stepOf, toLocalPlane } from './site-driver.js';

// Same per-wall batter draw as the Round 6 look (CUT_SHAPE in src/layers.js), so the A3 batter values carry over.
export const BATTER = Object.freeze({ trenchDegrees: [2.5, 4.5], pitDegrees: [2, 3], seed: 18401 });
const hash01 = n => { const s = Math.sin(n * 127.1 + BATTER.seed) * 43758.5453; return s - Math.floor(s); };
const degrees = ([a, b], h) => a + (b - a) * h;
// The outer faces of the block, as kept half-spaces (dot(n, p) + c >= 0).
export const BLOCK_KEEP = Object.freeze({
  west: { normal: [1, 0, 0], constant: 12 }, east: { normal: [-1, 0, 0], constant: 12 },
  back: { normal: [0, 0, 1], constant: 8 }, front: { normal: [0, 0, -1], constant: 8 }
});

// Floor plane y = A x + B z + C from a seating plane.
const coeffs = p => ({ A: p.a, B: p.b, C: p.y0 - p.a * p.px - p.b * p.pz });
const level = y => ({ A: 0, B: 0, C: y });
const midPlane = (p, q) => ({ A: (p.A + q.A) / 2, B: (p.B + q.B) / 2, C: (p.C + q.C) / 2 });
// Walls lean back by their batter (as in the Round 6 look): each wall plane passes through the box edge at its reference
// height (the uncut ground, or the parent floor for a pit, at the wall's midpoint) and leans inward going down, so the
// opening at the top keeps the 1 m baulks and the floor is the smaller rectangle.
function wallPlanes(box, tans, refs) {
  const planes = {};
  if (tans.west !== undefined) { const t = tans.west; planes.west = { normal: [1, t, 0], constant: -box.xmin - t * refs.west }; }
  if (tans.east !== undefined) { const t = tans.east; planes.east = { normal: [-1, t, 0], constant: box.xmax - t * refs.east }; }
  if (tans.back !== undefined) { const t = tans.back; planes.back = { normal: [0, t, 1], constant: -box.zmin - t * refs.back }; }
  if (tans.front !== undefined) { const t = tans.front; planes.front = { normal: [0, t, -1], constant: box.zmax - t * refs.front }; }
  else planes.front = { normal: [0, 0, -1], constant: box.zmax + 1 };
  return planes;
}
const evalPlane = (p, x, y, z) => p.normal[0] * x + p.normal[1] * y + p.normal[2] * z + p.constant;

// Reference height of each wall: `top(x, z)` at the wall's midpoint.
function wallRefs(box, top) {
  const xm = (box.xmin + box.xmax) / 2, zm = (box.zmin + box.zmax) / 2;
  return { west: top(box.xmin, zm), east: top(box.xmax, zm), back: top(xm, box.zmin), front: top(xm, box.zmax) };
}
function volume(id, kind, box, floor, tanDegrees, top, inside = null) {
  const tans = Object.fromEntries(Object.entries(tanDegrees).map(([k, d]) => [k, Math.tan(d * Math.PI / 180)]));
  const refs = wallRefs(box, top), walls = wallPlanes(box, tans, refs), wallList = Object.values(walls);
  const floorAt = (x, z) => floor.A * x + floor.B * z + floor.C;
  // Step offset: at step 0 the moving floor lies above the ground everywhere over the (battered) top opening.
  let D = 0;
  for (let x = box.xmin - .3; x <= box.xmax + .3 + 1e-9; x += .1) for (let z = box.zmin - .3; z <= Math.min(8, box.zmax + .3) + 1e-9; z += .1)
    D = Math.max(D, groundHeight(x, z) - floorAt(x, z));
  D += .05;
  const v = {
    id, kind, box, floor, walls, batterDegrees: tanDegrees, tans, refs, depthRange: D, inside,
    floorAt,
    stepOffset: k => (1 - Math.max(0, Math.min(CUT_STEPS, k)) / CUT_STEPS) * D,
    stepFloorAt: (k, x, z) => floorAt(x, z) + v.stepOffset(k),
    // Removed volume at step k: walls, the moving floor, and a far top.
    planesAt(k) {
      const off = v.stepOffset(k);
      return [...wallList, { normal: [-floor.A, 1, -floor.B], constant: -floor.C - off }, { normal: [0, -1, 0], constant: 40 }];
    },
    insideWalls: (x, y, z) => wallList.every(p => evalPlane(p, x, y, z) >= 0),
    removes: (k, x, y, z) => k > 0 && y >= floorAt(x, z) + v.stepOffset(k) && wallList.every(p => evalPlane(p, x, y, z) >= 0)
  };
  return v;
}

const planeY = p => (x, z) => p.A * x + p.B * z + p.C;
function buildVolumes() {
  const out = [];
  SEATING.trenches.forEach((t, i) => {
    out.push(volume(t.id, 'trench', { xmin: t.xmin, xmax: t.xmax, zmin: t.zmin, zmax: t.zmax }, coeffs(t.plane), {
      west: degrees(BATTER.trenchDegrees, hash01(i * 3 + 1)), east: degrees(BATTER.trenchDegrees, hash01(i * 3 + 2)), back: degrees(BATTER.trenchDegrees, hash01(i * 3 + 3))
    }, groundHeight));
  });
  const ring = SEATING.ring, rp = RING_WELL.pit;
  const cp = CONTROLLED_PIT, pit = SEATING.pit, t4 = coeffs(SEATING.trenches.find(t => t.id === cp.inside).plane), pf = coeffs(pit.floorPlane);
  out.push(volume('ring-well-pit', 'pit', { xmin: rp.xmin, xmax: rp.xmax, zmin: rp.zmin, zmax: rp.zmax }, level(ring.pitFloorY), {
    west: degrees(BATTER.pitDegrees, hash01(31)), east: degrees(BATTER.pitDegrees, hash01(32)), back: degrees(BATTER.pitDegrees, hash01(33))
  }, planeY(t4), 'square-4'));
  // Controlled pit: two steps; the upper step's floor is midway between the T4 floor and the pit floor (M).
  const pitTans = n => ({ west: degrees(BATTER.pitDegrees, hash01(n)), east: degrees(BATTER.pitDegrees, hash01(n + 1)), back: degrees(BATTER.pitDegrees, hash01(n + 2)), front: degrees(BATTER.pitDegrees, hash01(n + 3)) });
  const upper = midPlane(t4, pf);
  out.push(volume('controlled-pit:upper', 'pit', { xmin: cp.xmin, xmax: cp.xmax, zmin: cp.zmin, zmax: cp.zmax }, upper, pitTans(41), planeY(t4), cp.inside));
  const s = cp.stepInset;
  out.push(volume('controlled-pit:lower', 'pit', { xmin: cp.xmin + s, xmax: cp.xmax - s, zmin: cp.zmin + s, zmax: cp.zmax - s }, pf, pitTans(45), planeY(upper), 'controlled-pit:upper'));
  return out;
}
// Keep the array API used by native construction, without touching lazy seating at module import.
let volumesBuilt = false;
export const VOLUMES = new Proxy([], {
  get(target, key, receiver) {
    if (!volumesBuilt) { target.push(...buildVolumes()); volumesBuilt = true; }
    return Reflect.get(target, key, receiver);
  }
});
export const removedAt = (k, x, y, z) => VOLUMES.some(v => v.removes(k, x, y, z));
export function batterReport() {
  return VOLUMES.map(v => ({ id: v.id, batterDegrees: Object.fromEntries(Object.entries(v.batterDegrees).map(([k, d]) => [k, +d.toFixed(2)])) }));
}
export { evalPlane };
