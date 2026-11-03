import { SEATING, placementMatrix } from '../../src/eras/seating.js';
import * as THREE from 'three';
const r = SEATING.records.find(r => r.id === 'rajput-pottery-dump');
console.log(JSON.stringify({ plane: { y0: r.plane.y0, a: r.plane.a, b: r.plane.b, px: r.plane.px, pz: r.plane.pz }, local: r.local, centre: r.centre, raise: r.bedRaise }));
const m = placementMatrix(r);
for (const q of [[r.local.centre[0], 0, r.local.centre[1]], [-0.432, 0, 0], [0.388, 0, 0]]) { const v = new THREE.Vector3(...q).applyMatrix4(m); console.log(JSON.stringify(q), '->', v.toArray().map(n => n.toFixed(3)).join(','), 'plane', r.plane.at(v.x, v.z).toFixed(3)); }
