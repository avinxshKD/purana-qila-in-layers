import { SEATING, planeJSON } from '../../src/eras/seating.js';
const t0 = performance.now();
for (const t of SEATING.trenches) console.log(t.id, planeJSON(t.plane), 'tilt', t.tiltDegrees.toFixed(1), 'lowered', t.loweredMetres.toFixed(3));
for (const r of SEATING.records) console.log(r.key.padEnd(34), r.rule.padEnd(7), 'h', r.height.toFixed(3), 'E', r.exposure?.toFixed(3) ?? '-', 'bbox', r.bbox.x.map(v => v.toFixed(2)).join('..'), r.bbox.z.map(v => v.toFixed(2)).join('..'), planeJSON(r.plane), 'raw gap', r.rawResidual?.maxGap.toFixed(3), 'emb', r.rawResidual?.maxEmbedding.toFixed(3), r.cutDepth ?? '');
const h = SEATING.records.find(r => r.id === 'kushan-house');
console.log('embedT3', h.embedT3); for (const w of h.walls) console.log('  ', w.id.padEnd(34), w.height.toFixed(3), w.courses, 'E', w.exposure.toFixed(3), w.inT3 ? 'T3' : '  ', w.plane.y0.toFixed(3));
console.log('ring', SEATING.ring.topY.toFixed(3), SEATING.ring.bottomY.toFixed(3), 'margin', SEATING.ring.marginAboveSilt.toFixed(3));
console.log('pit into silt', SEATING.pit.intoSiltMin.toFixed(3), SEATING.pit.intoSiltMax.toFixed(3), 'fall', SEATING.pit.siltTopFall.toFixed(3), 'deepest', JSON.stringify(SEATING.deepestCut));
console.log('patches', SEATING.patches.length);
