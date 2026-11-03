// M0 layout for the modelling round: schematic thickness model, trench floors, feature placement, and the plan and
// front-elevation diagrams. CPU only (no browser): diagrams are rasterised here and labelled with ffmpeg drawtext.
// Usage: node scripts/modelling/m0-layout.mjs   -> output/lookdev/modelling/m0/
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { surfaceHeight as erodedSurface } from '../../src/layers.js';
import { edgeErosion } from '../../src/earth-edges.js';
import { ERA_IDS, ERA_THICKNESS, boundaryHeights, BOUNDARY_SWELL } from '../../src/eras/stack.js';
import { buildEraFeature, eraFeatureSpec, fig13Specs } from '../../src/features/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outDir = path.join(root, 'output', 'lookdev', 'modelling', 'm0');
fs.mkdirSync(outDir, { recursive: true });
const ffmpegExe = path.join(root, 'tools', 'ffmpeg', 'bin', 'ffmpeg.exe');
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
// The layout works on the uneroded ground: edge bites are a few centimetres of render detail, not stratigraphy.
const surfaceHeight = (x, z) => erodedSurface(x, z) + edgeErosion(x, z);

// ---- Thickness model (all M). Nominal thickness T at the block-centre surface height (2.5 m), varied linearly with the
// local surface height: r = clamp((surface - 2.5) / 2.5, -1, 1), thickness = T * (1 + s * r). s < 0 thickens downslope;
// s > 0 for the occupation bands thickens them upslope, so the lower boundaries (and the trench floors on them) flatten.
export const ERAS = [
  { id: 'modern-fill', name: 'Modern fill', T: ERA_THICKNESS['modern-fill'].T, s: ERA_THICKNESS['modern-fill'].s, character: 'band 1', reason: 'Loose slope fill; P1 "visible in gradient and an uneven manner", "On the slope area": thickest downslope, thin upslope.' },
  { id: 'mughal', name: 'Mughal', T: ERA_THICKNESS['mughal'].T, s: ERA_THICKNESS['mughal'].s, character: 'band 2 (A3 flecks)', reason: 'P1 "deposited on slopes": also thickens downslope, less than the modern fill.' },
  { id: 'sultanate', name: 'Sultanate', T: ERA_THICKNESS['sultanate'].T, s: ERA_THICKNESS['sultanate'].s, character: 'band 3', reason: 'Sealing earth over 3-course corner (0.70 m kit height) must bury the wall and keep 0.15 m of it above its own top.' },
  { id: 'rajput', name: 'Rajput', T: ERA_THICKNESS['rajput'].T, s: ERA_THICKNESS['rajput'].s, character: 'band 6', reason: 'Thickest occupation band: the 1 m stone wall (reading of 4.40x1.40x1 m) and three superposed rubble phases need depth.' },
  { id: 'post-gupta', name: 'Post-Gupta', T: ERA_THICKNESS['post-gupta'].T, s: ERA_THICKNESS['post-gupta'].s, character: 'band 4', reason: 'Only 0.10 m brickbat walls; a thinner band.' },
  { id: 'gupta', name: 'Gupta', T: ERA_THICKNESS['gupta'].T, s: ERA_THICKNESS['gupta'].s, character: 'band 4 variant', reason: 'Floor traces and a 0.11 m brickbat wall; thin like Post-Gupta, separated by a value step.' },
  { id: 'kushan', name: 'Kushan', T: ERA_THICKNESS['kushan'].T, s: ERA_THICKNESS['kushan'].s, character: 'band 4, burnt-brick inclusions', reason: 'Three phases with brick sizes varying (P1); house complex; thick occupation band.' },
  { id: 'sunga', name: 'Sunga', T: ERA_THICKNESS['sunga'].T, s: ERA_THICKNESS['sunga'].s, character: 'band 5', reason: 'Mud-brick and rubble remains and a few burnt patches; medium.' },
  { id: 'mauryan', name: 'Mauryan', T: ERA_THICKNESS['mauryan'].T, s: ERA_THICKNESS['mauryan'].s, character: 'occupation earth + sealing floor', reason: 'Ring well (2.2 m) starts at the sealing floor; Mauryan + Pre-Mauryan must exceed 2.2 m everywhere the well can sit.' },
  { id: 'pre-mauryan', name: 'Pre-Mauryan', T: ERA_THICKNESS['pre-mauryan'].T, s: ERA_THICKNESS['pre-mauryan'].s, character: 'band 7 beds', reason: 'Stratified beds; deep enough that the ring well ends inside it (P1: the well cuts the Pre-Mauryan levels).' }
];
export const SILT = { shownMetres: .6, fadeMetres: .6 };
// ERAS here run top to bottom (k = 0 is the modern fill); the stack's boundary j = 10 - k is the top of ERAS[k].
// Depths are below the uneroded ground and include the stack's boundary swell and raggedness.
const B = new Float64Array(11);
export const topDepth = (k, x, z) => { boundaryHeights(x, z, B); return surfaceHeight(x, z) - B[10 - k]; };
export const thickness = (k, x, z) => { boundaryHeights(x, z, B); return B[10 - k] - B[9 - k]; };
if (ERAS.some((e, k) => e.id !== ERA_IDS[9 - k])) throw new Error('ERAS order differs from the stack');
const siltTopDepth = (x, z) => topDepth(ERAS.length, x, z);
const ERA_INDEX = Object.fromEntries(ERAS.map((e, i) => [e.id, i]));

// Thickness limits (0.25 m grid), excluding the block's outer 0.5 m and wherever edge erosion truncates the top band.
const grid = [];
for (let x = -12; x <= 12; x += .25) for (let z = -8; z <= 8; z += .25) grid.push([x, z]);
const inner = grid.filter(([x, z]) => Math.abs(x) < 11.5 && Math.abs(z) < 7.5 && edgeErosion(x, z) < 1e-6);
const limits = ERAS.map((e, k) => { const v = inner.map(([x, z]) => thickness(k, x, z)); return { id: e.id, min: round(Math.min(...v)), max: round(Math.max(...v)), centre: e.T }; });
const allT = limits.flatMap(l => [l.min, l.max]);
const siltTopY = grid.map(([x, z]) => surfaceHeight(x, z) - siltTopDepth(x, z));
const baseY = round(Math.min(...siltTopY) - SILT.shownMetres - SILT.fadeMetres);

// ---- Trenches: positions as now; final floors chosen to land on feature levels.
const TRENCHES = [
  { id: 'square-1', xmin: -10, xmax: -6, zmin: 4, zmax: 8, floor: 'rajput-wall base', era: 'rajput' },
  { id: 'square-2', xmin: -5, xmax: -1, zmin: 4, zmax: 8, floor: 'Gupta top (brick-jelly floor and Gupta wall stand on it)', era: 'gupta' },
  { id: 'square-3', xmin: 0, xmax: 4, zmin: 4, zmax: 8, floor: 'Kushan house wall base', era: 'kushan' },
  { id: 'square-4', xmin: 5, xmax: 9, zmin: 4, zmax: 8, floor: 'Mauryan top (sealing floor with the drain)', era: 'mauryan' }
];
for (const t of TRENCHES) { t.cx = (t.xmin + t.xmax) / 2; t.cz = (t.zmin + t.zmax) / 2; t.surfaceY = surfaceHeight(t.cx, t.cz); }

// ---- Features. place: world bbox target {x:[a,b], z:[a,b]}, rotation 0 or 90 degrees (M). depth: rule for the base.
const kitBounds = id => { const h = buildEraFeature(id); const b = h.bounds; const v = { min: b.min.toArray(), max: b.max.toArray(), courses: h.courseCount }; h.dispose?.(); return v; };
const F = [
  { id: 'modern-brick-1948', era: 'modern-fill', x: [10.45, 10.75], z: [7.86, 8.02], rule: 'mid', note: 'front-face band, right baulk; anchor on the front face' },
  { id: 'modern-china-1955', era: 'modern-fill', x: [-11.3, -10.7], z: [7.9, 8.02], rule: 'mid', note: 'front-face band, left baulk' },
  { id: 'mughal-porcelain', era: 'mughal', x: [-0.8, -0.2], z: [7.9, 8.02], rule: 'mid', note: 'front-face band, baulk T2/T3' },
  { id: 'mughal-glass', era: 'mughal', x: [4.2, 4.8], z: [7.9, 8.02], rule: 'mid', note: 'front-face band, baulk T3/T4' },
  { id: 'sultanate-corner', era: 'sultanate', x: [-4.6, -0.85], z: [3.2, 5.0], rule: 'structure', note: 'east-west leg behind T2, south return crosses the T2 back wall' },
  { id: 'sultanate-lime-floor', era: 'sultanate', x: [-3.6, -2.2], z: [4.1, 4.9], rule: 'top', height: .075, part: 'A', note: 'patch A inside the corner, inside T2 (excavated)' },
  { id: 'sultanate-lime-floor', era: 'sultanate', x: [1.0, 2.6], z: [3.3, 4.5], rule: 'top', height: .075, part: 'B', note: 'patch B crosses the T3 back wall' },
  { id: 'rajput-wall', era: 'rajput', x: [-10.9, -6.5], z: [4.8, 6.2], rule: 'structure', note: 'stands on the T1 floor, crosses the T1 west wall' },
  { id: 'rajput-postholes', era: 'rajput', x: [-8.85, -6.95], z: [3.6, 4.1], rule: 'top', height: .6, cut: true, note: 'two holes straddling the T1 back wall: U-profiles in section' },
  { id: 'rajput-rubble', era: 'rajput', x: [-11.6, -10.85], z: [6.2, 8.3], rule: 'structure', rotate: 90, note: 'north-south, crosses the front face in the west baulk: three phases in section' },
  { id: 'rajput-pottery-dump', era: 'rajput', x: [-10.6, -9.6], z: [6.6, 7.6], rule: 'mid', optional: true, note: 'east of the rubble walls, crosses the T1 west wall (pack-only)' },
  { id: 'rajput-sealed-pit', era: 'rajput', x: [-5.9, -5.1], z: [7.3, 8.3], rule: 'base', height: .6, cut: true, optional: true, note: 'opens at the Rajput base, cut by the front face in baulk T1/T2 (pack-only)' },
  { id: 'post-gupta-wall-ns', era: 'post-gupta', x: [-0.7, -0.3], z: [5.96, 8.1], rule: 'structure', note: 'north-south, crosses the front face in baulk T2/T3' },
  { id: 'post-gupta-wall-ew', era: 'post-gupta', x: [-6.4, -2.9], z: [5.4, 5.8], rule: 'structure', note: 'east-west, crosses the T2 west wall' },
  { id: 'gupta-floor', era: 'gupta', x: [-4.4, -2.6], z: [5.9, 7.4], rule: 'top', height: .04, part: 'A', note: 'exposure 1 on the T2 floor' },
  { id: 'gupta-floor', era: 'gupta', x: [-2.2, -1.3], z: [3.4, 4.4], rule: 'top', height: .04, part: 'B', note: 'exposure 2 crosses the T2 back wall' },
  { id: 'gupta-brickbat-wall', era: 'gupta', x: [-4.6, -2.4], z: [4.6, 5.05], rule: 'structure', note: 'stands on the T2 floor' },
  { id: 'kushan-house', era: 'kushan', fig13: { dx: -2.6, dz: -4.1 }, rule: 'structure', note: 'Fig.13 at true scale, page-up = north (-z), offset (-2.6, -4.1): walls stand in T3 and are sectioned on its walls and the front face; the walls inside T4 sit above the T4 floor and go out with the soil' },
  { id: 'pillar-base-as-drawn', era: 'kushan', fig13: { dx: -2.6, dz: -4.1 }, rule: 'structure', note: 'same transform as the house' },
  { id: 'top-left-stone-as-drawn', era: 'kushan', fig13: { dx: -2.6, dz: -4.1 }, rule: 'structure', note: 'same transform as the house' },
  { id: 'kushan-bricks', era: 'kushan', x: [10.9, 11.55], z: [5.45, 8.15], rule: 'structure', rotate: 90, note: 'north-south remnant crossing the front face in the east baulk: 0.39 m bricks in section' },
  { id: 'sunga-masonry', era: 'sunga', x: [7.4, 8.1], z: [2.6, 6.0], rule: 'structure', rotate: 90, note: 'north-south, crosses the T4 back wall' },
  { id: 'sunga-burnt-patches', era: 'sunga', x: [6.6, 7.3], z: [2.0, 2.5], rule: 'top', height: .03, part: 'at masonry', note: 'patch beside the masonry' },
  { id: 'sunga-burnt-patches', era: 'sunga', x: [-3.5, -2.6], z: [-4.5, -3.8], rule: 'top', height: .03, part: 'isolated 1', note: 'isolated' },
  { id: 'sunga-burnt-patches', era: 'sunga', x: [-11.8, -11.1], z: [7.4, 8.05], rule: 'top', height: .03, part: 'isolated 2', note: 'isolated, crosses the front face (west baulk)' },
  { id: 'sunga-kushan-lane', era: 'sunga', x: [9.4, 10.4], z: [5.0, 8.2], rule: 'boundary', height: .15, note: 'straddles the Sunga/Kushan boundary (the Sunga top), crosses the front face (east baulk)' },
  { id: 'mauryan-drain', era: 'mauryan', x: [4.6, 9.4], z: [6.3, 6.5], rule: 'top', height: .12, note: 'west to east in the sealing floor (T4 floor), crosses the T4 west wall' },
  { id: 'mauryan-ring-well', era: 'mauryan', x: [6.65, 7.35], z: [7.175, 7.875], rule: 'top-down', height: 2.2, note: 'existing well and pit; from the sealing floor down 2.2 m into Pre-Mauryan' },
  { id: 'controlled-pit', era: 'pre-mauryan', x: [7.7, 8.9], z: [4.3, 5.9], rule: 'cut', note: 'modern sondage, two steps, from the T4 floor to the top of the silt; part of the excavation steps' },
  { id: 'pre-mauryan-sherds', era: 'pre-mauryan', x: [1.6, 2.4], z: [7.9, 8.02], rule: 'mid', note: 'front-face band below the T3 floor' }
];

const fig13 = fig13Specs();
const fig13World = (poly, { dx, dz }) => poly.map(([x, z]) => [x + dx, z + dz]);
function bboxOf(points) { const xs = points.map(p => p[0]), zs = points.map(p => p[1]); return { x: [Math.min(...xs), Math.max(...xs)], z: [Math.min(...zs), Math.max(...zs)] }; }
const kitCache = {};
for (const f of F) {
  if (f.fig13) {
    if (f.id === 'kushan-house') { f.polys = fig13.map(w => fig13World(w.footprint, f.fig13)); }
    else { const spec = eraFeatureSpec(f.id); f.polys = [fig13World(spec.footprint, f.fig13)]; }
    const b = bboxOf(f.polys.flat()); f.x = b.x; f.z = b.z;
  } else f.polys = [[[f.x[0], f.z[0]], [f.x[1], f.z[0]], [f.x[1], f.z[1]], [f.x[0], f.z[1]]]];
  let kitHeight = null;
  if (!['controlled-pit', 'mauryan-ring-well'].includes(f.id)) {
    try { kitCache[f.id] ??= kitBounds(f.id); kitHeight = kitCache[f.id].max[1] - kitCache[f.id].min[1]; f.kit = { courses: kitCache[f.id].courses, sizeLocal: kitCache[f.id].max.map((v, i) => round(v - kitCache[f.id].min[i], 3)) }; }
    catch (error) { f.kitError = error.message.split('\n')[0]; }
  }
  f.height = f.height ?? (kitHeight !== null ? round(kitHeight, 3) : null);
  const cx = (f.x[0] + f.x[1]) / 2, cz = (f.z[0] + f.z[1]) / 2, k = ERA_INDEX[f.era], top = topDepth(k, cx, cz), bottom = topDepth(k + 1, cx, cz);
  f.surfaceY = surfaceHeight(cx, cz);
  f.eraTopDepth = top; f.eraBottomDepth = bottom;
  // Structures keep max(0.15 m, all of a lower wall) above their era's top at the end of the era (brief section 3).
  if (f.rule === 'structure') { f.baseDepth = top + Math.max(0, f.height - .15); f.topDepthF = f.baseDepth - f.height; }
  else if (f.rule === 'top') { f.topDepthF = top; f.baseDepth = top + f.height; }
  else if (f.rule === 'top-down') { f.topDepthF = top; f.baseDepth = top + f.height; }
  else if (f.rule === 'base') { f.topDepthF = bottom; f.baseDepth = bottom + f.height; }
  else if (f.rule === 'boundary') { f.topDepthF = top - f.height / 2; f.baseDepth = top + f.height / 2; }
  else if (f.rule === 'mid') { f.topDepthF = top + (bottom - top) * .4; f.baseDepth = f.topDepthF + (f.height ?? .05); }
  else if (f.rule === 'cut') { f.topDepthF = topDepth(ERA_INDEX.mauryan, cx, cz); f.baseDepth = siltTopDepth(cx, cz); }
  f.baseY = f.surfaceY - f.baseDepth; f.topY = f.surfaceY - f.topDepthF;
  // Large features (the Fig.13 house) follow their era's boundary, so their levels are evaluated where a trench meets them.
  const lift = f.rule === 'structure' ? Math.max(0, f.height - .15) : f.rule === 'top' || f.rule === 'top-down' ? f.height : null;
  f.baseAt = lift === null ? () => f.baseY : (x, z) => surfaceHeight(x, z) - topDepth(k, x, z) - lift;
  f.topAt = lift === null ? () => f.topY : (x, z) => f.baseAt(x, z) + f.height;
  if (f.rule === 'structure' && f.baseDepth > bottom + 1e-6) f.warning = `base ${round(f.baseDepth - bottom)} m below its era's base (foundation cut into the era below, M)`;
}
const featureById = id => F.find(f => f.id === id);
// Trench floors: a plane least-squares fitted to the target level over the trench, lowered by its largest residual so the
// floor is at or below that level everywhere (standing features keep their base on or above it). Tilt is reported.
const floorFeature = { 'square-1': 'rajput-wall', 'square-3': 'kushan-house' };
for (const t of TRENCHES) {
  const f = floorFeature[t.id] && featureById(floorFeature[t.id]);
  t.level = (x, z) => surfaceHeight(x, z) - (topDepth(ERA_INDEX[t.era], x, z) + (f ? Math.max(0, f.height - .15) : 0));
  const pts = []; for (let x = t.xmin; x <= t.xmax + 1e-9; x += .25) for (let z = t.zmin; z <= t.zmax + 1e-9; z += .25) pts.push([x - t.cx, z - t.cz, t.level(x, z)]);
  const n = pts.length, sx = pts.reduce((s, p) => s + p[0] * p[0], 0), sz = pts.reduce((s, p) => s + p[1] * p[1], 0);
  const a = pts.reduce((s, p) => s + p[2], 0) / n, b = pts.reduce((s, p) => s + p[0] * p[2], 0) / sx, c = pts.reduce((s, p) => s + p[1] * p[2], 0) / sz;
  const residual = Math.max(...pts.map(([x, z, y]) => (a + b * x + c * z) - y));
  t.plane = { a: a - residual, b, c };
  t.floorAt = (x, z) => t.plane.a + b * (Math.min(t.xmax, Math.max(t.xmin, x)) - t.cx) + c * (Math.min(t.zmax, Math.max(t.zmin, z)) - t.cz);
  t.floorY = t.floorAt(t.cx, t.cz); t.floorDepth = t.surfaceY - t.floorY;
  t.tiltDegrees = Math.atan(Math.hypot(b, c)) * 180 / Math.PI; t.loweredMetres = residual;
}
const T4 = TRENCHES[3], well = featureById('mauryan-ring-well'), pit = featureById('controlled-pit');
well.topY = T4.floorAt(7, 7.525); well.baseY = well.topY - 2.2;
const wellSiltTopY = surfaceHeight(7, 7.525) - siltTopDepth(7, 7.525);
pit.topY = T4.floorAt(8.3, 5.1); pit.baseY = Math.min(...[[pit.x[0], pit.z[0]], [pit.x[1], pit.z[0]], [pit.x[0], pit.z[1]], [pit.x[1], pit.z[1]]].map(([x, z]) => surfaceHeight(x, z) - siltTopDepth(x, z)));
const wellPitFloorY = well.baseY - .12;
const highest = Math.max(...grid.map(([x, z]) => surfaceHeight(x, z)));
const deepestCut = { highestSurfaceY: round(highest), deepestExposedY: round(pit.baseY), depthMetres: round(highest - pit.baseY),
  quote14m: 'not matched (pack: "almost 14m"); do not quote the depth', method: 'highest point of the present surface minus the controlled-pit floor (top of silt)' };

// Cut classification.
function overlaps(a, b) { return a[0] < b[1] && b[0] < a[1]; }
for (const f of F) {
  const cuts = [];
  if (f.z[1] > 8) cuts.push('front face (z=8), visible');
  // Fig.13 walls are classified one wall at a time (the house bbox would claim walls it does not have).
  const parts = f.id === 'kushan-house' ? f.polys.map(bboxOf) : [{ x: f.x, z: f.z }];
  for (const t of TRENCHES) {
    const hit = parts.filter(p => overlaps(p.x, [t.xmin, t.xmax]) && overlaps(p.z, [t.zmin, t.zmax]));
    if (!hit.length) continue;
    const hx = [Math.min(...hit.map(p => p.x[0])), Math.max(...hit.map(p => p.x[1]))], hz = [Math.min(...hit.map(p => p.z[0])), Math.max(...hit.map(p => p.z[1]))];
    const cx = Math.min(t.xmax, Math.max(t.xmin, (hx[0] + hx[1]) / 2)), cz = Math.min(t.zmax, Math.max(t.zmin, (hz[0] + hz[1]) / 2)), floor = t.floorAt(cx, cz);
    const baseY = f.baseAt(cx, cz), topY = f.topAt(cx, cz);
    // The floor plane sits up to a few centimetres below the target level; a base on that level still stands.
    const standing = baseY <= Math.max(floor, t.level(cx, cz)) + .005;
    if (topY < floor - .02) { cuts.push(`${t.id}: below its floor (buried)`); continue; }
    if (topY <= floor + .02) { cuts.push(`${t.id}: flush in the floor (exposed)`); continue; }
    const walls = [];
    if (hx[0] < t.xmin && hx[1] > t.xmin) walls.push('west wall (visible)');
    if (hx[1] > t.xmax && hx[0] < t.xmax) walls.push('east wall (faces away)');
    if (hz[0] < t.zmin && hz[1] > t.zmin) walls.push('back wall (visible)');
    cuts.push(`${t.id}: ${standing ? 'stands on the floor' : 'removed inside'}${walls.length ? `, sectioned on ${walls.join(' and ')}` : ''}`);
  }
  f.cuts = cuts.length ? cuts : ['none: buried in the final state'];
}
// Callout visibility at era time (camera azimuth 35-48 degrees, elevation 27-29 degrees, excavation 0).
for (const f of F) {
  f.callout = f.rule === 'mid' ? 'front face of its band, which faces the camera (35-48 degrees off its normal)'
    : f.rule === 'structure' ? 'stands 0.15 m (or its full height) proud of the active top surface; the top faces the camera'
    : f.rule === 'cut' ? 'cold open only (no callout)' : f.id === 'mauryan-ring-well' ? 'well top in the active top at era end; rings shown in the T4 pit at cold open'
    : f.rule === 'base' ? 'opens on the active top surface at the start of its era'
    : 'lies on the active top surface during its era';
}

// ---- Output tables.
const eraColour = ['#c9b88a', '#a9a59a', '#9a8f7a', '#b07a5a', '#c49a6a', '#b88a5a', '#a0563e', '#6e5a48', '#8c7a5c', '#d6c27a'];
const thicknessRows = ERAS.map((e, k) => ({ era: e.name, nominalMetres: e.T, slopeFactor: e.s, rangeMetres: [limits[k].min, limits[k].max], character: e.character, reason: e.reason }));
const layout = { stage: 'M0', status: 'proposal; all thicknesses, placements, rotations and floors are M (modelling decisions)', compass: 'M: +x east, -z north; the front face (z=+8) faces south; the surface falls to the south-east (the slope).',
  thicknessModel: 'nominal thickness = T * (1 + s * r), r = clamp((ground - 2.5) / 2.5, -1, 1); each boundary adds a low swell (0.025 and 0.015 m sine terms) and the A3 raggedness (1-5 cm; the modern-fill base keeps its 5-20 cm unevenness). Source of truth: src/eras/stack.js.',
  thickness: thicknessRows, limits: { thinnest: Math.min(...allT), thickest: Math.max(...allT), ratio: round(Math.max(...allT) / Math.min(...allT)) },
  silt: { shownMetres: SILT.shownMetres, fadeMetres: SILT.fadeMetres, baseY, note: 'unlabelled; never bedrock or natural soil' },
  trenches: TRENCHES.map(t => ({ id: t.id, x: [t.xmin, t.xmax], z: [t.zmin, t.zmax], floor: t.floor, floorYAtCentre: round(t.floorY), floorDepthBelowLocalSurface: round(t.floorDepth),
    floorTiltDegrees: round(t.tiltDegrees, 1), floorPlane: { yAtCentre: round(t.plane.a, 3), dYdX: round(t.plane.b, 4), dYdZ: round(t.plane.c, 4) }, loweredBelowLevelMetres: round(t.loweredMetres, 3) })),
  ringWell: { topY: round(well.topY), bottomY: round(well.baseY), pitFloorY: round(wellPitFloorY), siltTopY: round(wellSiltTopY), marginAboveSiltMetres: round(well.baseY - wellSiltTopY) },
  controlledPit: { x: pit.x, z: pit.z, topY: round(pit.topY), floorY: round(pit.baseY), steps: 2 }, deepestCut,
  features: F.map(f => ({ id: f.id, part: f.part, era: f.era, optional: !!f.optional, x: f.x.map(v => round(v)), z: f.z.map(v => round(v)), rotationDegrees: f.rotate ?? 0,
    heightMetres: f.height, kit: f.kit, kitError: f.kitError, topY: round(f.topY), baseY: round(f.baseY), cuts: f.cuts, callout: f.callout, note: f.note, warning: f.warning })) };
fs.writeFileSync(path.join(outDir, 'm0-layout.json'), JSON.stringify(layout, null, 2) + '\n');

// ---- Markdown summary (tables generated from the same numbers as the JSON).
{
  const row = cells => `| ${cells.join(' | ')} |`;
  const md = ['# M0 layout proposal', '', 'Generated by `scripts/modelling/m0-layout.mjs` (CPU only). Every thickness, placement, rotation and floor below is an M (modelling decision); quotations in the reasons are from the pack as cited in the modelling-round brief.', '',
    `Compass (M): ${layout.compass}`, '', `Thickness model (M): ${layout.thicknessModel} The layout uses the uneroded ground (edge bites excluded).`, '',
    '## Thicknesses', '', row(['Era', 'T at centre (m)', 's', 'Local range (m)', 'Character', 'Reason (M)']), row(['---', '---', '---', '---', '---', '---']),
    ...thicknessRows.map(t => row([t.era, t.nominalMetres, t.slopeFactor, `${t.rangeMetres[0]} to ${t.rangeMetres[1]}`, t.character, t.reason])), '',
    `Local thickness including swell and raggedness, over the block except its outer 0.5 m and the eroded lips (which truncate the top band): thinnest ${layout.limits.thinnest} m, thickest ${layout.limits.thickest} m, ratio ${layout.limits.ratio} (brief: 0.5 to 1.5 m, ratio at most 3). Silt shown ${SILT.shownMetres} m plus ${SILT.fadeMetres} m fade, base at y ${baseY}.`, '',
    '## Trench floors', '', row(['Trench', 'x', 'z', 'Floor lands on', 'Floor y at centre', 'Depth below local surface', 'Floor tilt', 'Lowered below level']), row(['---', '---', '---', '---', '---', '---', '---', '---']),
    ...layout.trenches.map(t => row([t.id, t.x.join(' to '), t.z.join(' to '), t.floor, t.floorYAtCentre, t.floorDepthBelowLocalSurface, `${t.floorTiltDegrees} deg`, `${t.loweredBelowLevelMetres} m`])), '',
    'Floors are planes fitted to the target boundary and lowered by the largest residual, so they follow the boundary (and its tilt, which comes from the present surface slope of about 10.6 deg). Level floors would cut across bands instead; that is the alternative if tilted floors read wrong.', '',
    `Ring well: top y ${layout.ringWell.topY}, bottom y ${layout.ringWell.bottomY}, pit floor y ${layout.ringWell.pitFloorY}, silt top y ${layout.ringWell.siltTopY}; the well bottom is ${layout.ringWell.marginAboveSiltMetres} m above the silt, inside Pre-Mauryan.`, '',
    `Controlled pit: x ${pit.x.join(' to ')}, z ${pit.z.join(' to ')}, two steps, from the T4 floor (y ${layout.controlledPit.topY}) to the top of the silt (y ${layout.controlledPit.floorY}).`, '',
    `Deepest cut: ${deepestCut.depthMetres} m (${deepestCut.method}). The pack's "almost 14m" is not matched and is not quoted.`, '',
    '## Placement', '', 'Camera for callouts: film camera azimuth 35 to 48 deg, elevation 27 to 29 deg, positioned at +x and +z of the target (`src/film/camera.js`), so the front face (z = +8), trench west walls and trench back walls face the camera; trench east walls face away.', '',
    row(['Feature', 'Era', 'x (m)', 'z (m)', 'Rot.', 'Top y', 'Base y', 'Cutting faces / trenches', 'Callout visibility', 'Note']), row(['---', '---', '---', '---', '---', '---', '---', '---', '---', '---']),
    ...layout.features.map(f => row([f.id + (f.part ? ` (${f.part})` : '') + (f.optional ? ' [pack-only]' : ''), f.era, f.x.join(' to '), f.z.join(' to '), f.rotationDegrees, f.topY, f.baseY, f.cuts.join('; '), f.callout, f.note + (f.warning ? `. Warning: ${f.warning}` : '')])), '',
    'Fig.13 transform (M): true scale, page-up = north (-z), offset (-2.6, -4.1) m. Most of the house lies in unexcavated ground behind the trenches; it is seen where T3, T4 and the front face cut it.', '',
    'Diagrams: `m0-plan.png` (plan, north up), `m0-elevation.png` (front face at z = +8, 1:1). Data: `m0-layout.json`.', ''];
  fs.writeFileSync(path.join(outDir, 'm0-layout.md'), md.join('\n'));
}
// ---- Raster helpers.
function canvas(w, h, bg) { const d = Buffer.alloc(w * h * 3); for (let i = 0; i < w * h; i++) { d[i * 3] = bg[0]; d[i * 3 + 1] = bg[1]; d[i * 3 + 2] = bg[2]; } return { w, h, d }; }
const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
function blend(c, x, y, col, a = 1) { if (x < 0 || y < 0 || x >= c.w || y >= c.h) return; const i = (y * c.w + x) * 3; for (let k = 0; k < 3; k++) c.d[i + k] = Math.round(c.d[i + k] * (1 - a) + col[k] * a); }
function fillPoly(c, pts, col, a = 1) {
  const ys = pts.map(p => p[1]), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(c.h - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const yc = y + .5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc) !== (by <= yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.round(xs[i])); x < Math.min(c.w, Math.round(xs[i + 1])); x++) blend(c, x, y, col, a);
  }
}
function line(c, [ax, ay], [bx, by], col, width = 1, dash = 0) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay)) || 1;
  for (let i = 0; i <= n; i++) {
    if (dash && Math.floor(i / dash) % 2) continue;
    const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
    for (let dx = -Math.floor(width / 2); dx <= Math.floor((width - 1) / 2); dx++) for (let dy = -Math.floor(width / 2); dy <= Math.floor((width - 1) / 2); dy++) blend(c, Math.round(x + dx), Math.round(y + dy), col);
  }
}
const outline = (c, pts, col, width = 1, dash = 0) => pts.forEach((p, i) => line(c, p, pts[(i + 1) % pts.length], col, width, dash));
function save(c, labels, file) {
  const ppm = path.join(outDir, 'tmp.ppm'), script = path.join(outDir, 'tmp-labels.txt');
  fs.writeFileSync(ppm, Buffer.concat([Buffer.from(`P6 ${c.w} ${c.h} 255\n`), c.d]));
  const esc = s => String(s).replace(/[\\':,%]/g, ' ');
  const chains = labels.map(l => `drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${esc(l.text)}':x=${Math.round(l.x)}:y=${Math.round(l.y)}:fontsize=${l.size ?? 15}:fontcolor=${l.colour ?? '0x202020'}${l.box ? ':box=1:boxcolor=0xffffffb0:boxborderw=2' : ''}`);
  fs.writeFileSync(script, chains.join(',\n') || 'null');
  const r = spawnSync(ffmpegExe, ['-hide_banner', '-loglevel', 'error', '-y', '-i', ppm, '-/vf', script, '-frames:v', '1', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg ${r.status} ${r.error?.message ?? ''} ${r.stderr}`);
  fs.unlinkSync(ppm); fs.unlinkSync(script);
}

// ---- Plan view: 60 px per metre, north up (-z up).
{
  const S = 60, mx = 60, my = 70, W = 24 * S + 2 * mx + 380, H = 16 * S + my + 120;
  const c = canvas(W, H, [250, 248, 243]), labels = [];
  const P = ([x, z]) => [mx + (x + 12) * S, my + (z + 8) * S];
  // surface height contours as faint shading
  for (let px = 0; px < 24 * S; px += 2) for (let pz = 0; pz < 16 * S; pz += 2) {
    const x = px / S - 12, z = pz / S - 8, h = surfaceHeight(x, z), v = 236 - Math.round((h + .5) * 4);
    for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) blend(c, mx + px + a, my + pz + b, [v, v - 2, v - 8]);
  }
  for (let level = 0; level <= 4.5; level += .5) labels.push(...[]);
  outline(c, [P([-12, -8]), P([12, -8]), P([12, 8]), P([-12, 8])], [40, 40, 40], 2);
  for (const t of TRENCHES) { fillPoly(c, [P([t.xmin, t.zmin]), P([t.xmax, t.zmin]), P([t.xmax, t.zmax]), P([t.xmin, t.zmax])], [255, 255, 255], .75); outline(c, [P([t.xmin, t.zmin]), P([t.xmax, t.zmin]), P([t.xmax, t.zmax]), P([t.xmin, t.zmax])], [30, 30, 30], 2);
    const [lx, ly] = P([t.xmin, t.zmax]); labels.push({ text: `${t.id.replace('square-', 'T')} floor ${round(t.floorY, 2)} m (centre)`, x: lx + 4, y: ly + 30, size: 14, colour: '0x000000', box: true }); }
  const wp = [P([6.475, 7]), P([7.525, 7]), P([7.525, 8]), P([6.475, 8])]; outline(c, wp, [30, 30, 30], 1, 6);
  for (const f of F) {
    const k = ERA_INDEX[f.era], col = hex(eraColour[k]);
    for (const poly of f.polys) { const pts = poly.map(P); fillPoly(c, pts, col, f.rule === 'cut' ? .15 : .8); outline(c, pts, col.map(v => v * .55), 1, f.rule === 'cut' ? 5 : 0); }
  }
  const labelled = new Set();
  const offsets = { 'mughal-porcelain': [0, -34], 'mughal-glass': [0, -34], 'modern-brick-1948': [-60, -48], 'modern-china-1955': [30, -70], 'pre-mauryan-sherds': [0, -48], 'sunga-burnt-patches': [0, -30], 'rajput-sealed-pit': [-30, -60], 'rajput-pottery-dump': [8, -30], 'mauryan-drain': [70, -18], 'mauryan-ring-well': [-50, -60], 'rajput-postholes': [-20, -20], 'kushan-bricks': [-40, 30], 'sunga-kushan-lane': [-90, 140], 'post-gupta-wall-ns': [-50, 100], 'pillar-base-as-drawn': [6, -6], 'top-left-stone-as-drawn': [6, -6] };
  for (const f of F) {
    const key = f.id + (f.part ?? '');
    if (labelled.has(key)) continue; labelled.add(key);
    const [ox, oy] = offsets[f.id] ?? [0, 0];
    const [lx, ly] = P([f.x[0], f.z[0]]);
    labels.push({ text: f.id.replace('-as-drawn', '') + (f.part && f.part.length < 3 ? ` ${f.part}` : ''), x: lx + 2 + ox, y: ly + 2 + oy, size: 12, colour: '0x101010', box: true });
  }
  // legend
  const lx0 = mx + 24 * S + 30;
  labels.push({ text: 'Plan (M0 proposal)', x: lx0, y: my - 50, size: 22 });
  labels.push({ text: 'north up (-z)  east right (+x)  front face = south edge', x: mx, y: my - 50, size: 15 });
  ERAS.forEach((e, k) => { fillPoly(c, [[lx0, my + k * 30], [lx0 + 22, my + k * 30], [lx0 + 22, my + k * 30 + 20], [lx0, my + k * 30 + 20]], hex(eraColour[k])); labels.push({ text: e.name, x: lx0 + 30, y: my + k * 30 + 2, size: 15 }); });
  labels.push({ text: 'white = trenches (floors are final elevations)', x: lx0, y: my + 320, size: 13 });
  labels.push({ text: 'dashed = ring-well pit and controlled pit', x: lx0, y: my + 340, size: 13 });
  labels.push({ text: 'grey shading = present surface (higher = darker)', x: lx0, y: my + 360, size: 13 });
  labels.push({ text: 'block 24 x 16 m  grid 1 m', x: lx0, y: my + 380, size: 13 });
  labels.push({ text: 'All placement, rotation and floors are M', x: lx0, y: my + 410, size: 13, colour: '0x7a2a10' });
  for (let x = -12; x <= 12; x += 4) labels.push({ text: `x ${x}`, x: P([x, 8])[0] - 12, y: P([x, 8])[1] + 8, size: 12 });
  for (let z = -8; z <= 8; z += 4) labels.push({ text: `z ${z}`, x: mx - 52, y: P([-12, z])[1] - 7, size: 12 });
  save(c, labels, path.join(outDir, 'm0-plan.png'));
}
// ---- Front elevation at z = 8: x across, elevation up, 1:1, 55 px per metre.
{
  const S = 55, mx = 70, top = 5.2, bottom = baseY - .3, my = 60, W = 24 * S + 2 * mx + 300, H = Math.round((top - bottom) * S) + my + 90;
  const c = canvas(W, H, [250, 248, 243]), labels = [];
  const P = (x, y) => [mx + (x + 12) * S, my + (top - y) * S];
  const xs = Array.from({ length: 241 }, (_, i) => -12 + i * .1);
  for (let k = ERAS.length; k >= -1; k--) {
    const upper = x => k === -1 ? null : surfaceHeight(x, 8) - topDepth(k, x, 8);
    if (k === ERAS.length) {
      const pts = [...xs.map(x => P(x, upper(x))), P(12, baseY), P(-12, baseY)]; fillPoly(c, pts, [214, 198, 140]);
      fillPoly(c, [P(-12, baseY + SILT.fadeMetres), P(12, baseY + SILT.fadeMetres), P(12, baseY), P(-12, baseY)], [120, 112, 100], .6);
      continue;
    }
    if (k < 0) continue;
    const lower = x => surfaceHeight(x, 8) - topDepth(k + 1, x, 8);
    const pts = [...xs.map(x => P(x, upper(x))), ...xs.slice().reverse().map(x => P(x, lower(x)))];
    fillPoly(c, pts, hex(eraColour[k]));
    const lx = 12.1, ly = (upper(11.9) + lower(11.9)) / 2; labels.push({ text: `${ERAS[k].name}  ${round(thickness(k, 11.9, 8), 2)} m`, x: P(lx, ly)[0] + 4, y: P(lx, ly)[1] - 8, size: 13 });
  }
  labels.push({ text: 'Silt (unlabelled on screen)', x: P(12.1, 0)[0] + 4, y: P(0, baseY + SILT.fadeMetres + .25)[1] - 8, size: 13 });
  labels.push({ text: 'Base fade (unlabelled)', x: P(12.1, 0)[0] + 4, y: P(0, baseY + .25)[1] - 8, size: 13 });
  // trenches open to the front: show the removed volume and the floor
  for (const t of TRENCHES) {
    const fl = t.floorAt(t.xmin, 8), fr = t.floorAt(t.xmax, 8);
    const pts = [P(t.xmin, surfaceHeight(t.xmin, 8) + .3), P(t.xmax, surfaceHeight(t.xmax, 8) + .3), P(t.xmax, fr), P(t.xmin, fl)];
    fillPoly(c, pts, [250, 248, 243], .82); outline(c, [P(t.xmin, fl), P(t.xmax, fr)], [20, 20, 20], 2);
    line(c, P(t.xmin, surfaceHeight(t.xmin, 8)), P(t.xmin, fl), [20, 20, 20], 2); line(c, P(t.xmax, surfaceHeight(t.xmax, 8)), P(t.xmax, fr), [20, 20, 20], 2);
    labels.push({ text: `${t.id.replace('square-', 'T')} floor ${round(t.floorY)} (centre)`, x: P(t.xmin, 0)[0] + 4, y: P(0, Math.min(fl, fr))[1] + 4, size: 12, box: true });
  }
  // well pit and controlled pit
  const wpts = [P(6.475, well.topY), P(7.525, well.topY), P(7.525, well.baseY - .12), P(6.475, well.baseY - .12)]; fillPoly(c, wpts, [250, 248, 243], .82); outline(c, wpts, [20, 20, 20], 1);
  fillPoly(c, [P(6.65, well.topY), P(7.35, well.topY), P(7.35, well.baseY), P(6.65, well.baseY)], [170, 96, 64], .9);
  outline(c, [P(pit.x[0], pit.topY), P(pit.x[1], pit.topY), P(pit.x[1], (pit.topY + pit.baseY) / 2), P(pit.x[1] - .2, (pit.topY + pit.baseY) / 2), P(pit.x[1] - .2, pit.baseY), P(pit.x[0] + .2, pit.baseY), P(pit.x[0] + .2, (pit.topY + pit.baseY) / 2), P(pit.x[0], (pit.topY + pit.baseY) / 2)], [20, 20, 20], 1, 5);
  labels.push({ text: 'controlled pit (behind, z 4.3-5.9) to silt top', x: P(pit.x[0], 0)[0] - 40, y: P(0, pit.baseY)[1] + 6, size: 12, box: true });
  labels.push({ text: 'ring well 2.2 m', x: P(7.4, 0)[0] + 2, y: P(0, well.baseY + .6)[1], size: 12, box: true });
  // features: solid where the front face cuts them, dashed outline where they lie behind
  for (const f of F) {
    if (['controlled-pit', 'mauryan-ring-well'].includes(f.id)) continue;
    const k = ERA_INDEX[f.era], col = hex(eraColour[k]).map(v => v * .55), onFace = f.z[1] > 8;
    const yTop = f.topY, yBase = Math.min(f.baseY, f.topY - .03);
    // Fig.13 walls: draw each wall's own x-range, solid only for walls that cross the face.
    const spans = f.id === 'kushan-house' ? f.polys.map(poly => ({ b: bboxOf(poly) })).map(({ b }) => ({ x: b.x, onFace: b.z[1] > 8 })) : [{ x: f.x, onFace }];
    for (const span of spans) {
      const pts = [P(span.x[0], yTop), P(span.x[1], yTop), P(span.x[1], yBase), P(span.x[0], yBase)];
      if (span.onFace) fillPoly(c, pts, col, .9); else outline(c, pts, col, 1, 4);
    }
  }
  const done = new Set();
  const offs = { 'rajput-wall': [90, -14], 'sultanate-corner': [-70, -4], 'modern-china-1955': [0, -16], 'sunga-burnt-patches': [0, 6], 'rajput-pottery-dump': [0, 10], 'pillar-base-as-drawn': [0, -14], 'top-left-stone-as-drawn': [10, 30], 'sunga-masonry': [130, 50], 'gupta-floor': [0, 4], 'sultanate-lime-floor': [0, -14], 'mauryan-drain': [40, -16], 'rajput-postholes': [0, 10], 'kushan-house': [80, -16] };
  for (const f of F) {
    if (['controlled-pit', 'mauryan-ring-well'].includes(f.id) || done.has(f.id)) continue; done.add(f.id);
    const [ox, oy] = offs[f.id] ?? [0, 0];
    labels.push({ text: f.id.replace('-as-drawn', '') + (f.z[1] > 8 ? '' : ' (behind)'), x: P(f.x[0], 0)[0] + ox, y: P(0, f.topY)[1] - 16 + oy, size: 11, colour: '0x101010', box: true });
  }
  labels.push({ text: 'Front elevation at z = +8 (south face), 1-1, M0 proposal', x: mx, y: 18, size: 20 });
  labels.push({ text: 'solid = cut by the front face  dashed = behind the face (projected)  pale = removed by a trench (open to the front)', x: mx + 520, y: 22, size: 14 });
  for (let y = Math.ceil(bottom); y <= 5; y++) labels.push({ text: `${y} m`, x: 12, y: P(-12, y)[1] - 7, size: 12 });
  save(c, labels, path.join(outDir, 'm0-elevation.png'));
}
console.log(JSON.stringify({ limits: layout.limits, baseY, trenches: layout.trenches, ringWell: layout.ringWell, controlledPit: layout.controlledPit, deepestCut,
  warnings: F.filter(f => f.warning || f.kitError).map(f => `${f.id}: ${f.warning ?? ''} ${f.kitError ?? ''}`) }, null, 1));
