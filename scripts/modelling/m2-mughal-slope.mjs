// M2 probe: slope of the Mughal top (boundary 9) roughness and of its step term, on a 2 cm plan grid (5 mm differences).
import { gradientNoise } from '../../src/soil-noise.js';
import { boundaryHeights, BOUNDARY_COUNT } from '../../src/eras/stack.js';
const n = (x, z, period, seed) => gradientNoise(x / period, 1 * 1.37 + .21, z / period, seed + 101);
const variants = {
  current: (x, z) => Math.max(0, n(x, z, .09, 18113)) * .045,
};
for (const [p, a] of (process.argv[2] ?? '').split(';').filter(Boolean).map(s => s.split(',').map(Number))) variants[`period ${p} amp ${a}`] = (x, z) => Math.max(0, n(x, z, p, 18113)) * a;
const base = (x, z) => .085 * n(x, z, 1.3, 18101) + .045 * n(x, z, .42, 18107) + .02 * n(x, z, .13, 18109);
const b = new Float64Array(BOUNDARY_COUNT), h = .005;
function stats(f, label) {
  const s = [];
  for (let x = -12; x <= 12; x += .02) for (let z = -8; z <= 8; z += .02) { const gx = (f(x + h, z) - f(x - h, z)) / (2 * h), gz = (f(x, z + h) - f(x, z - h)) / (2 * h); s.push(Math.hypot(gx, gz)); }
  s.sort((p, q) => p - q);
  console.log(label.padEnd(28), 'max', s.at(-1).toFixed(3), 'p99.9', s[Math.floor(s.length * .999)].toFixed(3), 'p99', s[Math.floor(s.length * .99)].toFixed(3), 'p50', s[Math.floor(s.length * .5)].toFixed(3), 'frac>0.5', (s.filter(v => v > .5).length / s.length).toFixed(4));
}
stats(base, 'other terms');
for (const [k, f] of Object.entries(variants)) { stats(f, 'step ' + k); stats((x, z) => base(x, z) + f(x, z), 'total ' + k); }
stats((x, z) => boundaryHeights(x, z, b)[9], 'boundary 9 (with ground)');
