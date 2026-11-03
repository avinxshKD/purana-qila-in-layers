import { siteBoundaries } from '../../src/eras/seating.js';
import { SEATING } from '../../src/eras/seating.js';
import { VOLUMES } from '../../src/eras/excavation.js';
import { LOOK_PROPORTIONS, surfaceHeight } from '../../src/layers.js';
import { lipErosion, lipErosionParts } from '../../src/earth-edges.js';
const out = new Float64Array(11);
let t = performance.now(), n = 0;
for (let x = -12; x <= 12; x += .1) for (let z = -8; z <= 8; z += .1) { siteBoundaries(x, z, out); n++; }
console.log('siteBoundaries', n, ((performance.now() - t) / n * 1000).toFixed(2), 'us each');
t = performance.now(); n = 0;
for (let x = -12; x <= 12; x += .1) for (let z = 3; z <= 8; z += .1) { lipErosionParts(x, z); n++; }
console.log('lipParts', ((performance.now() - t) / n * 1000).toFixed(2), 'us each');
console.log('old bottomDepth', LOOK_PROPORTIONS.bottomDepth, 'fadeStart', LOOK_PROPORTIONS.shaderFadeStartDepth);
console.log('ring', JSON.stringify({ topY: SEATING.ring.topY, bottomY: SEATING.ring.bottomY, pitFloorY: SEATING.ring.pitFloorY }));
for (const v of VOLUMES) console.log(v.id, JSON.stringify(v.box), 'D', v.depthRange.toFixed(3), 'refs', JSON.stringify(Object.fromEntries(Object.entries(v.refs).map(([k, y]) => [k, +y.toFixed(3)]))), 'tans', JSON.stringify(Object.fromEntries(Object.entries(v.tans).map(([k, y]) => [k, +y.toFixed(4)]))));
let min = Infinity; for (let x = -12; x <= 12; x += .05) for (let z = -8; z <= 8; z += .05) { siteBoundaries(x, z, out); min = Math.min(min, out[0]); }
console.log('min silt top', min.toFixed(3));
