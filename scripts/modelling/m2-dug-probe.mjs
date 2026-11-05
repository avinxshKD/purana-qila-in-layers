// M2 probe: dug-feature tops versus their era tops (CPU).
import * as THREE from 'three';
import { createRequire } from 'node:module';
import { createEraSite, siteBoundaryGrids } from '../../src/eras/site-state.js';
import { SEATING, siteBoundaries } from '../../src/eras/seating.js';
import { RING_WELL } from '../../src/eras/layout.js';
import { createLayerTable, surfaceHeight } from '../../src/layers.js';
import { ringSection } from '../../src/section-geometry.js';
const site = createEraSite();
const all1 = { schemaVersion: 1, deposits: Array(10).fill(1), features: Array(10).fill(1), excavation: 0 };
site.applyState(all1);
const v = new THREE.Vector3();
for (const it of site.items.filter(i => ['mauryan-drain', 'rajput-postholes', 'rajput-sealed-pit'].includes(i.featureId))) {
  let worst = -Infinity, at = null, thick = 0;
  for (const m of it.handle.object.children) { const p = m.geometry.getAttribute('position'); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(it.matrix); const b = siteBoundaries(v.x, v.z), d = v.y - b[it.era + 1]; thick = Math.max(thick, b[it.era + 1] - b[it.era]); if (d > worst) { worst = d; at = v.toArray().map(n => +n.toFixed(3)); } } }
  console.log(it.key, 'rule', it.rule, 'maxAboveEraTop', worst.toFixed(4), 'at', at, 'maxBandThickness', thick.toFixed(3), 'courses', it.handle.courseCount, 'plane y0', it.record.plane.y0.toFixed(3), 'localMaxY', it.record.localBounds?.max[1]);
}
const r = SEATING.ring; let lo = Infinity, hi = -Infinity, th = 0;
for (let i = 0; i < 48; i++) for (const rad of [0, .2, .35, .5]) { const x = RING_WELL.x + rad * Math.cos(i * Math.PI / 24), z = RING_WELL.z + rad * Math.sin(i * Math.PI / 24); if (z > 8) continue; const b = siteBoundaries(x, z); lo = Math.min(lo, b[2]); hi = Math.max(hi, b[2]); th = Math.max(th, b[2] - b[1]); }
console.log('ring topY', r.topY.toFixed(4), 'Mauryan top around ring min/max', lo.toFixed(4), hi.toFixed(4), 'Mauryan thickness max', th.toFixed(3));
const table = createLayerTable();
const shaft = { ...table.proportions.shaft, x: RING_WELL.x, z: RING_WELL.z, localTopDepth: surfaceHeight(RING_WELL.x, RING_WELL.z) - r.topY, pit: { ...table.proportions.shaft.pit, xmin: RING_WELL.pit.xmin, xmax: RING_WELL.pit.xmax, zmin: RING_WELL.pit.zmin, bottomDepth: -r.pitFloorY } };
const ring = ringSection(shaft, 8, { heapColour: 0, fragmentColour: 0 });
for (const k of Object.keys(ring)) { const g = ring[k]; if (!g?.isBufferGeometry) { console.log('ring.' + k, typeof g); continue; } g.computeBoundingBox(); console.log('ring.' + k, 'y', g.boundingBox.min.y.toFixed(3), g.boundingBox.max.y.toFixed(3), 'x', g.boundingBox.min.x.toFixed(3), g.boundingBox.max.x.toFixed(3), 'z', g.boundingBox.min.z.toFixed(3), g.boundingBox.max.z.toFixed(3)); }
