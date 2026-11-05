// M0.1 layout: seating of every feature on the tilted era tops (vertical shear), exposure rule, floors, cut depths,
// sections per face, trench rule, and plan/front-elevation diagrams drawn with local y. CPU only.
// Usage: node scripts/modelling/m0.1-layout.mjs [--out=<dir relative to the repo>]   -> output/lookdev/modelling/m0.1/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { surfaceHeight } from '../../src/layers.js';
import { edgeErosion } from '../../src/earth-edges.js';
import { ERA_IDS, ERA_THICKNESS, BOUNDARY_COUNT } from '../../src/eras/stack.js';
import { SEATING, siteBoundaries, siteEraAtHeight, insidePolygon, polygonSamples, planeJSON, bboxOf } from '../../src/eras/seating.js';
import { TRENCHES, RING_WELL, CONTROLLED_PIT, FLATTEN_FEATHER_METRES } from '../../src/eras/layout.js';
import { canvas, hex, fillPoly, line, outline, save, declutter } from './raster.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outArg = process.argv.find(a => a.startsWith('--out='))?.slice(6);
const outDir = outArg ? path.resolve(root, outArg) : path.join(root, 'output', 'lookdev', 'modelling', 'm0.1');
fs.mkdirSync(outDir, { recursive: true });
const ffmpegExe = path.join(root, 'tools', 'ffmpeg', 'bin', 'ffmpeg.exe');
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const B = (x, z) => siteBoundaries(x, z);
const NAMES = { 'pre-mauryan': 'Pre-Mauryan', mauryan: 'Mauryan', sunga: 'Sunga', kushan: 'Kushan', gupta: 'Gupta', 'post-gupta': 'Post-Gupta', rajput: 'Rajput', sultanate: 'Sultanate', mughal: 'Mughal', 'modern-fill': 'Modern fill', silt: 'silt', 'above ground': 'above ground' };
const REASONS = {
  'modern-fill': ['band 1', 'Loose slope fill; P1 "visible in gradient and an uneven manner", "On the slope area": thickest downslope, thin upslope.'],
  mughal: ['band 2 (A3 flecks)', 'P1 "deposited on slopes": also thickens downslope, less than the modern fill.'],
  sultanate: ['band 3', 'Sealing earth over the 3-course corner (0.68 m kit height, 0.34 m proud at era end) must bury it.'],
  rajput: ['band 6', 'Thickest occupation band: the 1 m stone wall (reading of 4.40x1.40x1 m) and three superposed rubble phases need depth.'],
  'post-gupta': ['band 4', 'Only 0.10 m brickbat walls; a thinner band.'],
  gupta: ['band 4 variant', 'Floor traces and a 0.11 m brickbat wall; thin like Post-Gupta, separated by a value step.'],
  kushan: ['band 4, burnt-brick inclusions', 'Three phases with brick sizes varying (P1); house complex; thick occupation band.'],
  sunga: ['band 5', 'Mud-brick and rubble remains and a few burnt patches; medium.'],
  mauryan: ['occupation earth + sealing floor', 'Ring well (2.2 m) starts at the sealing floor; Mauryan + Pre-Mauryan must exceed 2.2 m where the well sits.'],
  'pre-mauryan': ['band 7 beds', 'Stratified beds; deep enough that the ring well ends inside it (P1: the well cuts the Pre-Mauryan levels).']
};
const trench = Object.fromEntries(SEATING.trenches.map(t => [t.id, t]));
const ERA = Object.fromEntries(ERA_IDS.map((id, i) => [id, i]));

// ---- Units: one per Fig.13 wall, one per other feature (assemblies keep one plane and their overall height).
const units = [];
for (const r of SEATING.records) {
  const minY = r.localBounds ? r.localBounds.min[1] : 0, maxY = r.localBounds ? r.localBounds.max[1] : r.height;
  if (r.id === 'kushan-house') for (const w of r.walls) units.push({ r, key: `kushan-house/${w.id}`, label: w.id, polys: [w.poly], plane: w.plane, height: w.height, exposure: w.exposure, bottom: 0, top: w.height, seat: w.seat });
  else if (r.rule === 'opening') units.push({ r, key: r.key, label: r.key, polys: r.polys, plane: r.plane, height: 0, bottom: -r.cutDepth, top: 0, seat: r.seat, depth: r.cutDepth });
  else units.push({ r, key: r.key, label: r.key, polys: r.polys, plane: r.plane, height: r.height, exposure: r.exposure, bottom: Math.min(0, minY), top: maxY, seat: r.seat });
}
const unitBottom = (u, x, z) => u.plane.at(x, z) + u.bottom, unitTop = (u, x, z) => u.plane.at(x, z) + u.top;

// ---- Per-unit checks.
const faceOpenings = [...TRENCHES.map(t => ({ x: [t.xmin, t.xmax], floor: x => trench[t.id].floorAt(x, 8) })),
  { x: [RING_WELL.pit.xmin, RING_WELL.pit.xmax], floor: () => SEATING.ring.pitFloorY }];
function lineSamples(face, polys, step = .02) {
  const pts = [];
  if (face.axis === 'z') for (let x = face.range[0]; x <= face.range[1] + 1e-9; x += step) { if (polys.some(p => insidePolygon(p, x, face.at - 1e-6))) pts.push([x, face.at - 1e-6]); }
  else for (let z = face.range[0]; z <= face.range[1] + 1e-9; z += step) { if (polys.some(p => insidePolygon(p, face.at + face.side * 1e-6, z))) pts.push([face.at + face.side * 1e-6, z]); }
  return pts;
}
function sectionsOf(u) {
  if (u.r.rule === 'find') {
    const [x] = u.r.centre, y = u.plane.y0;
    return [{ face: 'front face (z = 8)', along: `x ${round(u.r.bbox.x[0])} to ${round(u.r.bbox.x[1])}`, y: [round(y - .08), round(y + .08)], bands: [NAMES[siteEraAtHeight(x, y, 8 - 1e-6)]], note: 'find seated on the face' }];
  }
  const faces = [{ name: 'front face (z = 8)', axis: 'z', at: 8, range: [-12, 12], exposedTop: (x, z) => surfaceHeight(x, z), exposedBottom: () => -Infinity, open: x => faceOpenings.find(o => x > o.x[0] && x < o.x[1]) }];
  for (const t of TRENCHES) {
    const T = trench[t.id];
    faces.push({ name: `${t.id} west wall (x = ${t.xmin}, visible)`, axis: 'x', at: t.xmin, side: -1, range: [t.zmin, t.zmax], exposedTop: surfaceHeight, exposedBottom: (x, z) => T.floorAt(t.xmin, z) });
    faces.push({ name: `${t.id} east wall (x = ${t.xmax}, faces away)`, axis: 'x', at: t.xmax, side: 1, range: [t.zmin, t.zmax], exposedTop: surfaceHeight, exposedBottom: (x, z) => T.floorAt(t.xmax, z) });
    faces.push({ name: `${t.id} back wall (z = ${t.zmin}, visible)`, axis: 'z', at: t.zmin + 2e-6, range: [t.xmin, t.xmax], exposedTop: surfaceHeight, exposedBottom: (x, z) => T.floorAt(x, t.zmin) });
  }
  const out = [];
  for (const face of faces) {
    const pts = lineSamples(face, u.polys);
    if (!pts.length) continue;
    const bands = new Set(); let yMin = Infinity, yMax = -Infinity, exposed = 0;
    for (const [x, z] of pts) {
      let lo = unitBottom(u, x, z), hi = unitTop(u, x, z);
      const open = face.open?.(x);
      const top = open ? Math.min(face.exposedTop(x, z), open.floor(x)) : face.exposedTop(x, z), bottom = face.exposedBottom(x, z);
      lo = Math.max(lo, bottom); hi = Math.min(hi, top);
      if (hi <= lo + .005) continue;
      exposed++; yMin = Math.min(yMin, lo); yMax = Math.max(yMax, hi);
      for (const f of [.02, .5, .98]) bands.add(NAMES[siteEraAtHeight(x, lo + f * (hi - lo), z)]);
    }
    const xs = pts.map(p => face.axis === 'z' ? p[0] : p[1]);
    out.push({ face: face.name, along: `${face.axis === 'z' ? 'x' : 'z'} ${round(Math.min(...xs))} to ${round(Math.max(...xs))}`, y: exposed ? [round(yMin), round(yMax)] : null, bands: exposed ? [...bands] : [], note: exposed ? '' : 'not exposed (removed or below the floor)' });
  }
  return out;
}
function trenchRule(u) {
  const res = [];
  for (const t of TRENCHES) {
    const T = trench[t.id], pts = u.polys.flatMap(p => polygonSamples(p, .05)).filter(([x, z]) => x > t.xmin && x < t.xmax && z > t.zmin && z < t.zmax);
    if (!pts.length) continue;
    const d = pts.map(([x, z]) => unitBottom(u, x, z) - T.floorAt(x, z)), dt = pts.map(([x, z]) => unitTop(u, x, z) - T.floorAt(x, z));
    let result;
    if (Math.max(...dt) <= .005) result = 'buried below the floor';
    else if (Math.max(...d) <= .01) result = Math.min(...d) >= -.03 ? 'preserved, standing on the floor' : `preserved, but ${round(-Math.min(...d), 3)} m below the floor in places`;
    else if (Math.min(...d) >= -.01) result = 'removed with the soil inside the trench';
    else result = `MIXED: base ${round(Math.min(...d), 3)} to ${round(Math.max(...d), 3)} m about the floor`;
    res.push({ trench: t.id, result, baseMinusFloor: [round(Math.min(...d), 3), round(Math.max(...d), 3)] });
  }
  return res;
}
const rows = units.map(u => {
  const samples = u.polys.flatMap(p => polygonSamples(p)), outlinePts = u.polys.flatMap(p => polygonSamples(p, .1).slice(0, 0).concat(p));
  const edge = u.polys.flatMap(p => { const pts = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .05)); for (let k = 0; k < n; k++) pts.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return pts; });
  const row = { key: u.key, era: u.r.era, rule: u.r.rule, seat: u.seat, shear: planeJSON(u.plane), height: round(u.height, 3) };
  if (u.r.rule !== 'find') {
    const host = u.r.hostBoundary, gaps = samples.map(([x, z]) => u.plane.at(x, z) - B(x, z)[host]);
    row.host = host === u.r.eraIndex ? `${NAMES[u.r.era]} base` : `${NAMES[u.r.era]} top`;
    row.gapUnderBase = round(Math.max(0, ...gaps), 3); row.embeddingBelowHost = round(Math.max(0, ...gaps.map(v => -v)), 3);
    row.rawResidual = u.r.rawResidual && { gap: round(u.r.rawResidual.maxGap, 3), embedding: round(u.r.rawResidual.maxEmbedding, 3) };
    if (u.r.floorOf) {
      const t = TRENCHES.find(t => t.id === u.r.floorOf), inside = samples.filter(([x, z]) => x > t.xmin && x < t.xmax && z > t.zmin && z < t.zmax);
      if (inside.length) { const d = inside.map(([x, z]) => u.plane.at(x, z) - trench[t.id].floorAt(x, z)); row.vsFloor = [round(Math.min(...d), 3), round(Math.max(...d), 3)];
        // A flush-laid feature (the drain) is let into the floor: its top, not its base, is on the floor.
        if (u.r.flush) { const top = u.r.localBounds.max[1]; row.topVsFloor = [round(Math.min(...d) + top, 3), round(Math.max(...d) + top, 3)]; } }
    }
  }
  if (u.r.rule === 'wall') {
    const proud = edge.map(([x, z]) => unitTop(u, x, z) - B(x, z)[u.r.eraIndex + 1]);
    row.exposure = round(u.exposure, 3); row.proud = [round(Math.min(...proud), 3), round(Math.max(...proud), 3)];
    if (u.r.eraIndex + 2 < BOUNDARY_COUNT) { const m = edge.map(([x, z]) => B(x, z)[u.r.eraIndex + 2] - unitTop(u, x, z)); row.buriedByNext = round(Math.min(...m), 3); }
  }
  if (u.depth !== undefined) { row.cutDepth = u.depth; row.cutNote = u.r.cutNote; }
  row.sections = sectionsOf(u); row.trenches = trenchRule(u);
  row.flattened = u.r.flattens || (u.r.id === 'kushan-house' && SEATING.patches.some(p => p.feature === `kushan-house:${u.label}`));
  return row;
});
const gates = {
  floats: rows.filter(r => r.gapUnderBase > .01).map(r => `${r.key} ${r.gapUnderBase}`),
  belowFloor: rows.filter(r => r.vsFloor && !r.topVsFloor && r.vsFloor[0] < -.03).map(r => r.key),
  flushTopOffFloor: rows.filter(r => r.topVsFloor && Math.max(...r.topVsFloor.map(Math.abs)) > .02).map(r => `${r.key} ${r.topVsFloor.join('..')}`),
  mixed: rows.filter(r => r.trenches.some(t => t.result.startsWith('MIXED'))).map(r => `${r.key}: ${r.trenches.filter(t => t.result.startsWith('MIXED')).map(t => `${t.trench} ${t.result}`).join('; ')}`),
  fig13Proud: rows.filter(r => r.key.startsWith('kushan-house/') && (r.proud[0] < .10 - 1e-9 && r.height > .15 || r.proud[1] > .25)).map(r => `${r.key} ${r.proud.join('..')}`),
  t3WallsOffFloor: rows.filter(r => r.key.startsWith('kushan-house/') && r.vsFloor && Math.max(Math.abs(r.vsFloor[0]), Math.abs(r.vsFloor[1])) > .02).map(r => r.key),
  ringMargin: round(SEATING.ring.marginAboveSilt, 3), pitIntoSilt: [round(SEATING.pit.intoSiltMin, 3), round(SEATING.pit.intoSiltMax, 3)]
};

// ---- Thickness limits on the final boundaries (0.1 m grid; outer 0.5 m and eroded lips excluded as in rev 2).
const lim = ERA_IDS.map(() => [Infinity, -Infinity]), limAt = ERA_IDS.map(() => [null, null]);
for (let x = -11.5; x <= 11.5; x += .1) for (let z = -7.5; z <= 7.5; z += .1) {
  if (Math.abs(x) >= 11.5 || Math.abs(z) >= 7.5 || edgeErosion(x, z) >= 1e-6) continue;
  const b = B(x, z);
  for (let i = 0; i < ERA_IDS.length; i++) { const t = b[i + 1] - b[i]; if (t < lim[i][0]) { lim[i][0] = t; limAt[i][0] = [round(x), round(z)]; } if (t > lim[i][1]) { lim[i][1] = t; limAt[i][1] = [round(x), round(z)]; } }
}

// ---- Outputs.
const dc = SEATING.deepestCut;
const layout = { stage: 'M0.1', status: 'all placements, planes, depths and exposures are M', compass: '+x east, -z north, front face z = +8 faces south',
  seatingModel: `Each kit group gets y += a x + b z in its placement matrix (vertical shear), fitted to the surface it stands on; trench-floor features use the floor plane. Surface features flatten their host boundary to the seat plane under the footprint (feather ${FLATTEN_FEATHER_METRES} m).`,
  thickness: ERA_IDS.map((id, i) => ({ era: NAMES[id], T: ERA_THICKNESS[id].T, s: ERA_THICKNESS[id].s, localRange: lim[i].map(v => round(v)), character: REASONS[id][0], reason: REASONS[id][1] })).reverse(),
  trenches: SEATING.trenches.map(t => ({ id: t.id, lands: t.lands, plane: planeJSON(t.plane), floorYAtCentre: round(t.plane.y0), tiltDegrees: round(t.tiltDegrees, 1), loweredMetres: round(t.loweredMetres, 3) })),
  fig13T3Embedding: { metres: round(SEATING.records.find(r => r.id === 'kushan-house').embedT3, 3), note: SEATING.records.find(r => r.id === 'kushan-house').embedT3Note },
  ringWell: { topY: round(SEATING.ring.topY), bottomY: round(SEATING.ring.bottomY), pitFloorY: round(SEATING.ring.pitFloorY), marginAboveSiltMin: round(SEATING.ring.marginAboveSilt, 3), shear: planeJSON(SEATING.ring.plane) },
  controlledPit: { floor: planeJSON(SEATING.pit.floorPlane), intoSilt: gates.pitIntoSilt, siltTopFallAcrossPit: round(SEATING.pit.siltTopFall, 3), steps: CONTROLLED_PIT.steps },
  deepestCut: { highestSurfaceY: round(dc.highestSurfaceY), deepestExposedY: round(dc.deepestExposedY), depthMetres: round(dc.depthMetres), quote14m: 'gate fails; not quoted' },
  gates, seating: rows };
fs.writeFileSync(path.join(outDir, 'm0.1-layout.json'), JSON.stringify(layout, null, 1) + '\n');

const row = cells => `| ${cells.join(' | ')} |`, hd = n => row(Array(n).fill('---'));
const md = ['# M0.1 layout', '', 'Generated by `scripts/modelling/m0.1-layout.mjs` from `src/eras/stack.js`, `src/eras/layout.js` and `src/eras/seating.js` (CPU only). All values are M unless a quoted reason says otherwise.', '',
  `Compass (M): ${layout.compass}. Seating (M): ${layout.seatingModel}`, '',
  '## Changes from rev 2', '',
  '- Exposure rule: proud by max(0.15 m, 2 courses), capped at half the surviving height above 0.30 m; walls 0.15 m or lower sit on the top at full height.',
  `- T1 floor rises with the rajput-wall base (now ${layout.trenches[0].floorYAtCentre} at its centre).`,
  `- Fig.13: the walls differ in height (1 to 3 courses; stones 2 courses, up to 0.47 m), so one plane would bury the low walls. Walls in T3 stand on the T3 floor, which sits ${layout.fig13T3Embedding.metres} m below the Kushan top (${layout.fig13T3Embedding.note}). Every other wall gets its own shear.`,
  '- Postholes and sealed pit: depths set by the rules (table below). The sealed pit opens on the Rajput base and is absent while deposits[rajput] = 0.',
  (d => `- Moved: pottery dump to x ${round(d.bbox.x[0])} to ${round(d.bbox.x[1])}, z ${round(d.bbox.z[0])} to ${round(d.bbox.z[1])} (kit as built, rotated 90 deg), centred on the T1 west wall and raised ${round(d.bedRaise, 3)} m inside the Rajput band so its base clears the T1 floor by ${d.aboveFloor.clearance} m there (both the front face and the T1 west wall show it). Sunga patch 2`)(SEATING.records.find(r => r.id === 'rajput-pottery-dump')) + ' to z 7.02 to 7.64, sultanate corner and lime floor A 0.3 m north.',
  '- Kit sizes are used as built; no feature is scaled. Footprints below are the kit outlines placed in the world.',
  '- Finds on the front face are seated on the face plane with the kit burial axis along the face normal, so each fragment is whole, with its kit burial (30 to 70%) behind the face.', '',
  '## Thicknesses (rev 2, unchanged)', '', row(['Era', 'T', 's', 'Local range on the final boundaries (m)', 'Character', 'Reason (M)']), hd(6),
  ...layout.thickness.map(t => row([t.era, t.T, t.s, `${t.localRange[0]} to ${t.localRange[1]}`, t.character, t.reason])), '',
  '## Trench floors', '', row(['Trench', 'Floor lands on', 'y at centre', 'dY/dX', 'dY/dZ', 'Tilt', 'Lowered']), hd(7),
  ...layout.trenches.map(t => row([t.id, t.lands, t.floorYAtCentre, t.plane.dYdX, t.plane.dYdZ, `${t.tiltDegrees} deg`, `${t.loweredMetres} m`])), '',
  `Ring well: top y ${layout.ringWell.topY}, bottom y ${layout.ringWell.bottomY}, sheared with the T4 floor; the bottom is at least ${layout.ringWell.marginAboveSiltMin} m above the silt top around its whole circle (gate 0.10). Pit floor y ${layout.ringWell.pitFloorY}.`, '',
  `Controlled pit: floor plane fitted to the silt top over the pit and lowered to it (dY/dX ${layout.controlledPit.floor.dYdX}, dY/dZ ${layout.controlledPit.floor.dYdZ}); the floor is ${layout.controlledPit.intoSilt[0]} to ${layout.controlledPit.intoSilt[1]} m into the silt everywhere (gate: at or below the silt top, at most 0.15 m in). The silt top falls ${layout.controlledPit.siltTopFallAcrossPit} m across the pit.`, '',
  `Deepest cut: ${layout.deepestCut.depthMetres} m, from the highest surface point (y ${layout.deepestCut.highestSurfaceY}) to the lowest controlled-pit floor point (y ${layout.deepestCut.deepestExposedY}). "Almost 14m" stays unused.`, '',
  '## Gates', '',
  `- Floating (gap over 1 cm under a base): ${gates.floats.length ? gates.floats.join('; ') : 'none'}.`,
  `- More than 3 cm below a floor it stands on: ${gates.belowFloor.length ? gates.belowFloor.join('; ') : 'none'}.`,
  `- Flush-laid top more than 2 cm off its floor: ${gates.flushTopOffFloor.length ? gates.flushTopOffFloor.join('; ') : 'none'}.`,
  `- Trench rule mixed (neither preserved nor removed entirely): ${gates.mixed.length ? gates.mixed.join('; ') : 'none'}.`,
  `- Fig.13 walls over 0.15 m outside 0.10 to 0.25 m proud: ${gates.fig13Proud.length ? gates.fig13Proud.join('; ') : 'none'}.`,
  `- T3 walls more than 2 cm off the T3 floor: ${gates.t3WallsOffFloor.length ? gates.t3WallsOffFloor.join('; ') : 'none'}.`, '',
  '## Seating report', '', 'Gap and embedding are measured on a 0.1 m grid over the footprint against the final host boundary, after flattening. The raw columns show the residual before flattening. Proud is the top minus the era top along the outline at the end of the era. Buried-by-next is the next era top minus the wall top (positive means buried).', '',
  row(['Feature', 'Rule', 'Host / seat', 'dY/dX', 'dY/dZ', 'y at centre', 'Gap', 'Embedding', 'Raw gap / emb.', 'vs floor', 'Exposure', 'Proud (min..max)', 'Buried by next', 'Cut depth']), hd(14),
  ...rows.map(r => row([r.key, r.rule, `${r.host ?? 'front face'}; ${r.seat}`, r.shear.dYdX, r.shear.dYdZ, round(r.shear.yAtCentre, 3), r.gapUnderBase ?? '-', r.embeddingBelowHost ?? '-', r.rawResidual ? `${r.rawResidual.gap} / ${r.rawResidual.embedding}` : '-', r.vsFloor ? r.vsFloor.join('..') : '-', r.exposure ?? '-', r.proud ? r.proud.join('..') : '-', r.buriedByNext ?? '-', r.cutDepth !== undefined ? `${r.cutDepth} (${r.cutNote})` : '-'])), '',
  '## Sections and trench rule', '', 'Exposed part of each section in the final excavated state. Bands are sampled at the bottom, middle and top of the exposed section along the face. Trench walls are treated as vertical here (the 2.5 to 4.5 deg batter is left out).', '',
  row(['Feature', 'Face', 'Along', 'Exposed y', 'Bands', 'Trench rule']), hd(6),
  ...rows.flatMap(r => {
    const tr = r.trenches.map(t => `${t.trench}: ${t.result}`).join('; ') || 'outside every trench';
    if (!r.sections.length) return [row([r.key, 'none', '-', '-', '-', tr])];
    return r.sections.map((s, i) => row([i ? '' : r.key, s.face, s.along, s.y ? s.y.join(' to ') : s.note, s.bands.join(', ') || '-', i ? '' : tr]));
  }), '',
  '## Placement', '', row(['Feature', 'Era', 'x', 'z', 'Rotation', 'Callout visibility']), hd(6),
  ...SEATING.records.map(r => row([r.key + (r.optional ? ' [pack-only]' : ''), r.era, r.bbox.x.map(v => round(v)).join(' to '), r.bbox.z.map(v => round(v)).join(' to '), r.rotate ?? 0, callout(r)])), '',
  'Diagrams: `m0.1-plan.png` (base y per feature), `m0.1-elevation.png` (front face at z = 8; solid sections at the face with local y, dashed projections of features behind it with their own y range). Data: `m0.1-layout.json`.', ''];
function callout(r) {
  if (r.rule === 'find') return 'on the front face of its band (faces the camera); anchor on the face';
  if (r.id === 'rajput-sealed-pit') return 'seen only in the front-face section (baulk T1/T2), under a continuous Rajput band, from the start of the Rajput deposit onward; never on a top surface; site drawer anchor on that section';
  if (r.rule === 'bed') return 'in the front-face section from the Rajput era onward; on the T1 west wall at the end';
  if (r.id === 'sunga-burnt-patches') return r.part === 'at masonry' ? 'on the Sunga top; sunga-patches callout anchor (nearest the camera)' : 'on the Sunga top during its era; buried at the end';
  if (r.rule === 'wall') return `stands ${round(r.exposure ?? 0)} m proud of the active top at era end; top faces the camera`;
  if (r.rule === 'opening') return 'U-profiles in the T1 back wall; opening on the Rajput top during its era';
  return 'lies on the active top during its era';
}
fs.writeFileSync(path.join(outDir, 'm0.1-layout.md'), md.join('\n'));

// ---- Diagrams.
const eraColour = { 'modern-fill': '#c9b88a', mughal: '#a9a59a', sultanate: '#9a8f7a', rajput: '#b07a5a', 'post-gupta': '#c49a6a', gupta: '#b88a5a', kushan: '#a0563e', sunga: '#6e5a48', mauryan: '#8c7a5c', 'pre-mauryan': '#d6c27a' };
// Plan.
{
  const S = 60, mx = 60, my = 70, W = 24 * S + 2 * mx + 380, H = 16 * S + my + 130, c = canvas(W, H, [250, 248, 243]), labels = [];
  const P = ([x, z]) => [mx + (x + 12) * S, my + (z + 8) * S];
  for (let px = 0; px < 24 * S; px += 2) for (let pz = 0; pz < 16 * S; pz += 2) { const h = surfaceHeight(px / S - 12, pz / S - 8), v = 236 - Math.round((h + .5) * 4); fillPoly(c, [[mx + px, my + pz], [mx + px + 2, my + pz], [mx + px + 2, my + pz + 2], [mx + px, my + pz + 2]], [v, v - 2, v - 8]); }
  outline(c, [P([-12, -8]), P([12, -8]), P([12, 8]), P([-12, 8])], [40, 40, 40], 2);
  for (const t of SEATING.trenches) { const q = [P([t.xmin, t.zmin]), P([t.xmax, t.zmin]), P([t.xmax, t.zmax]), P([t.xmin, t.zmax])]; fillPoly(c, q, [255, 255, 255], .75); outline(c, q, [30, 30, 30], 2);
    labels.push({ text: `${t.id.replace('square-', 'T')} floor y ${round(t.floorAt(t.xmin, t.zmin))} (NW) to ${round(t.floorAt(t.xmax, t.zmax))} (SE)`, x: P([t.xmin, 8])[0] + 2, y: P([t.xmin, 8])[1] + 30, size: 13, box: true }); }
  outline(c, [P([6.475, 7]), P([7.525, 7]), P([7.525, 8]), P([6.475, 8])], [30, 30, 30], 1, 6);
  outline(c, [P([CONTROLLED_PIT.xmin, CONTROLLED_PIT.zmin]), P([CONTROLLED_PIT.xmax, CONTROLLED_PIT.zmin]), P([CONTROLLED_PIT.xmax, CONTROLLED_PIT.zmax]), P([CONTROLLED_PIT.xmin, CONTROLLED_PIT.zmax])], [30, 30, 30], 1, 5);
  for (const u of units) { const col = hex(eraColour[u.r.era]); for (const p of u.polys) { const pts = p.map(P); fillPoly(c, pts, col, .8); outline(c, pts, col.map(v => v * .55), 1); } }
  const offsets = { 'mughal-porcelain': [0, -34], 'mughal-glass': [0, -34], 'modern-brick-1948': [-60, -48], 'modern-china-1955': [30, -70], 'pre-mauryan-sherds': [0, -48], 'sunga-burnt-patches:isolated 2': [0, -30], 'rajput-sealed-pit': [-30, -62], 'rajput-pottery-dump': [8, -34], 'mauryan-drain': [70, -18], 'rajput-postholes': [-20, -20], 'kushan-bricks': [-40, 30], 'sunga-kushan-lane': [-90, 140], 'post-gupta-wall-ns': [-50, 100], 'gupta-floor:B': [8, -18] };
  for (const r of SEATING.records) {
    const u = units.filter(v => v.r === r), ys = u.flatMap(v => v.polys.flatMap(p => p.map(([x, z]) => v.plane.at(x, z) + v.bottom)));
    const [ox, oy] = offsets[r.key] ?? [0, 0], [lx, ly] = P([r.bbox.x[0], r.bbox.z[0]]);
    labels.push({ text: `${r.key.replace('-as-drawn', '')}  base y ${round(Math.min(...ys))}..${round(Math.max(...ys))}`, x: lx + 2 + ox, y: ly + 2 + oy, size: 11, colour: '0x101010', box: true });
  }
  const lx0 = mx + 24 * S + 30;
  labels.push({ text: 'Plan (M0.1)', x: lx0, y: my - 50, size: 22 }, { text: 'north up (-z)  east right (+x)  front face = south edge', x: mx, y: my - 50, size: 15 });
  ERA_IDS.slice().reverse().forEach((id, k) => { fillPoly(c, [[lx0, my + k * 30], [lx0 + 22, my + k * 30], [lx0 + 22, my + k * 30 + 20], [lx0, my + k * 30 + 20]], hex(eraColour[id])); labels.push({ text: NAMES[id], x: lx0 + 30, y: my + k * 30 + 2, size: 15 }); });
  ['white = trenches (floor y at NW and SE corners)', 'dashed = ring-well pit and controlled pit', 'labels: base y range of each feature (local, sheared)', 'grey shading = present surface (higher = darker)', 'diagram hues only; M1 keeps the Round 6 colours', 'all placements and planes are M']
    .forEach((t, i) => labels.push({ text: t, x: lx0, y: my + 320 + i * 20, size: 13, colour: i === 5 ? '0x7a2a10' : '0x202020' }));
  for (let x = -12; x <= 12; x += 4) labels.push({ text: `x ${x}`, x: P([x, 8])[0] - 12, y: P([x, 8])[1] + 8, size: 12 });
  for (let z = -8; z <= 8; z += 4) labels.push({ text: `z ${z}`, x: mx - 52, y: P([-12, z])[1] - 7, size: 12 });
  save(c, declutter(labels), path.join(outDir, 'm0.1-plan.png'), ffmpegExe);
}
// Front elevation at z = 8.
{
  const S = 55, mx = 70, top = 5.2, bottom = -10, my = 60, W = 24 * S + 2 * mx + 300, H = Math.round((top - bottom) * S) + my + 90;
  const c = canvas(W, H, [250, 248, 243]), labels = [], P = (x, y) => [mx + (x + 12) * S, my + (top - y) * S];
  const xs = Array.from({ length: 481 }, (_, i) => -12 + i * .05), zf = 8 - 1e-6, bAt = xs.map(x => B(x, zf));
  const siltBase = Math.min(...bAt.map(b => b[0])) - 1.2;
  fillPoly(c, [...xs.map((x, i) => P(x, bAt[i][0])), P(12, siltBase), P(-12, siltBase)], [214, 198, 140]);
  fillPoly(c, [P(-12, siltBase + .6), P(12, siltBase + .6), P(12, siltBase), P(-12, siltBase)], [120, 112, 100], .6);
  ERA_IDS.forEach((id, i) => {
    fillPoly(c, [...xs.map((x, k) => P(x, bAt[k][i + 1])), ...xs.slice().reverse().map((x, k) => P(x, bAt[xs.length - 1 - k][i]))], hex(eraColour[id]));
    const b = B(11.9, zf); labels.push({ text: `${NAMES[id]}  ${round(b[i + 1] - b[i])} m`, x: P(12.1, 0)[0] + 4, y: P(0, (b[i] + b[i + 1]) / 2)[1] - 8, size: 13 });
  });
  labels.push({ text: 'Silt (unlabelled on screen)', x: P(12.1, 0)[0] + 4, y: P(0, siltBase + .9)[1] - 8, size: 13 }, { text: 'Base fade (unlabelled)', x: P(12.1, 0)[0] + 4, y: P(0, siltBase + .3)[1] - 8, size: 13 });
  for (const t of SEATING.trenches) {
    const f8 = x => t.floorAt(x, 8), f4 = x => t.floorAt(x, 4);
    fillPoly(c, [P(t.xmin, surfaceHeight(t.xmin, 8) + .3), P(t.xmax, surfaceHeight(t.xmax, 8) + .3), P(t.xmax, f8(t.xmax)), P(t.xmin, f8(t.xmin))], [250, 248, 243], .82);
    line(c, P(t.xmin, f8(t.xmin)), P(t.xmax, f8(t.xmax)), [20, 20, 20], 2); line(c, P(t.xmin, f4(t.xmin)), P(t.xmax, f4(t.xmax)), [20, 20, 20], 1, 5);
    line(c, P(t.xmin, surfaceHeight(t.xmin, 8)), P(t.xmin, f8(t.xmin)), [20, 20, 20], 2); line(c, P(t.xmax, surfaceHeight(t.xmax, 8)), P(t.xmax, f8(t.xmax)), [20, 20, 20], 2);
    labels.push({ text: `${t.id.replace('square-', 'T')} floor at z 8 (solid) and z 4 (dashed)`, x: P(t.xmin, 0)[0] + 4, y: P(0, f8(t.xmin))[1] + 6, size: 11, box: true });
  }
  const ring = SEATING.ring;
  const wp = [P(6.475, trench['square-4'].floorAt(6.475, 8)), P(7.525, trench['square-4'].floorAt(7.525, 8)), P(7.525, ring.pitFloorY), P(6.475, ring.pitFloorY)];
  fillPoly(c, wp, [250, 248, 243], .82); outline(c, wp, [20, 20, 20], 1);
  fillPoly(c, [P(6.65, ring.plane.at(6.65, 7.525)), P(7.35, ring.plane.at(7.35, 7.525)), P(7.35, ring.plane.at(7.35, 7.525) - 2.2), P(6.65, ring.plane.at(6.65, 7.525) - 2.2)], [170, 96, 64], .9);
  labels.push({ text: `ring well 2.2 m, bottom ${round(ring.marginAboveSilt)} m above silt`, x: P(7.4, 0)[0] + 2, y: P(0, ring.bottomY + .6)[1], size: 11, box: true });
  const pit = SEATING.pit, pf = x => pit.floorPlane.at(x, pit.zmax), pt = x => trench['square-4'].floorAt(x, pit.zmax), mid = x => (pf(x) + pt(x)) / 2, i0 = pit.xmin + pit.stepInset, i1 = pit.xmax - pit.stepInset;
  outline(c, [P(pit.xmin, pt(pit.xmin)), P(pit.xmax, pt(pit.xmax)), P(pit.xmax, mid(pit.xmax)), P(i1, mid(i1)), P(i1, pf(i1)), P(i0, pf(i0)), P(i0, mid(i0)), P(pit.xmin, mid(pit.xmin))], [20, 20, 20], 1, 5);
  labels.push({ text: 'controlled pit (behind, at z 5.9) to the silt top', x: P(pit.xmin, 0)[0] - 40, y: P(0, pf(pit.xmin))[1] + 6, size: 11, box: true });
  // Features: per 5 cm column, the section at the face (solid) or the projected y range over the footprint (dashed).
  const done = new Set();
  for (const u of units) {
    const col = hex(eraColour[u.r.era]).map(v => v * .55), b = bboxOf(u.polys.flat());
    if (u.r.rule === 'find') { const y = u.plane.y0; fillPoly(c, [P(b.x[0], y + .04), P(b.x[1], y + .04), P(b.x[1], y - .04), P(b.x[0], y - .04)], col, .95); }
    else {
      const solid = [], dashTop = [], dashBot = [];
      for (let x = Math.floor(b.x[0] / .05) * .05; x <= b.x[1]; x += .05) {
        const zs = []; for (let z = b.z[0]; z <= b.z[1] + 1e-9; z += .05) if (u.polys.some(p => insidePolygon(p, x, z))) zs.push(z);
        if (!zs.length) continue;
        const onFace = u.polys.some(p => insidePolygon(p, x, zf));
        if (onFace) solid.push([x, unitBottom(u, x, zf), unitTop(u, x, zf)]);
        dashTop.push([x, Math.max(...zs.map(z => unitTop(u, x, z)))]); dashBot.push([x, Math.min(...zs.map(z => unitBottom(u, x, z)))]);
      }
      for (const [x, lo, hi] of solid) fillPoly(c, [P(x, hi), P(x + .05, hi), P(x + .05, lo), P(x, lo)], col, .95);
      if (dashTop.length > 1 && solid.length < dashTop.length) { const ring2 = [...dashTop.map(([x, y]) => P(x, y)), ...dashBot.slice().reverse().map(([x, y]) => P(x + .05, y))]; outline(c, ring2, col, 1, 4); }
    }
    if (u.key.startsWith('kushan-house/') ? !done.has('kushan-house') : true) {
      const name = u.key.startsWith('kushan-house/') ? 'Fig.13 house walls' : u.r.key.replace('-as-drawn', ''); done.add(u.key.startsWith('kushan-house/') ? 'kushan-house' : u.key);
      const onFace = u.polys.some(p => bboxOf(p).z[1] > 8), y = unitTop(u, b.x[0], Math.min(b.z[1], zf));
      const offs = { 'Fig.13 house walls': [60, -40], 'rajput-wall': [90, -14], 'sultanate-corner': [-70, -4], 'sunga-masonry': [130, 50], 'mauryan-drain': [40, -16], 'rajput-postholes': [0, 10], 'gupta-floor:B': [20, -14], 'sultanate-lime-floor:A': [0, -14], 'sultanate-lime-floor:B': [0, -14], 'top-left-stone': [10, 30], 'pillar-base': [0, -14], 'sunga-burnt-patches:isolated 2': [0, 12], 'rajput-pottery-dump': [0, 12], 'kushan-bricks': [-70, 0] };
      const [ox, oy] = offs[name] ?? [0, 0];
      labels.push({ text: name + (onFace || u.r.rule === 'find' ? '' : ' (behind)'), x: P(b.x[0], 0)[0] + ox, y: P(0, y)[1] - 16 + oy, size: 10, colour: '0x101010', box: true });
    }
  }
  labels.push({ text: 'Front elevation at z = +8 (south face), 1-1, M0.1, local y', x: mx, y: 18, size: 20 });
  labels.push({ text: 'solid = section at the face  dashed = feature behind the face, drawn over its own y range  pale = removed by a trench', x: mx + 560, y: 22, size: 14 });
  for (let y = Math.ceil(bottom); y <= 5; y++) labels.push({ text: `${y} m`, x: 12, y: P(-12, y)[1] - 7, size: 12 });
  save(c, declutter(labels), path.join(outDir, 'm0.1-elevation.png'), ffmpegExe);
}
console.log(JSON.stringify({ gates, trenches: layout.trenches.map(t => [t.id, t.floorYAtCentre, t.tiltDegrees]), ring: layout.ringWell, pit: layout.controlledPit.intoSilt, deepest: layout.deepestCut.depthMetres, limits: layout.thickness.map(t => [t.era, t.localRange]), limAt: ERA_IDS.map((id, i) => [id, limAt[i]]), dump: (({ seat, plane }) => ({ seat, y0: plane.y0 }))(SEATING.records.find(r => r.id === 'rajput-pottery-dump')) }));
