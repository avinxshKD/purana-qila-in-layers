// Local orientation histogram of soft (9 px box-blurred) luma structure, energy-weighted, in a region at 1080.
// Angle of the structure (perpendicular to the gradient) in screen degrees, positive = running down to the right.
const path = require('node:path');
const { readRGB } = require('../round6-checks.cjs');
const d = path.join(__dirname, '../../output/lookdev/modelling/m1/work/smoke') + '/';
const [x0, y0, w, h] = (process.argv[2] ?? '1000,250,880,500').split(',').map(Number);
for (const n of process.argv.slice(3)) {
  const img = readRGB(d + n + '.png', [x0, y0, w, h]);
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = .2126 * img.data[i * 3] + .7152 * img.data[i * 3 + 1] + .0722 * img.data[i * 3 + 2];
  const blur = (src, r) => { const t = new Float32Array(w * h), o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += src[y * w + xx]; c++; } } t[y * w + x] = s / c; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += t[yy * w + x]; c++; } } o[y * w + x] = s / c; }
    return o; };
  const B = blur(L, 4), bins = new Float64Array(18); let total = 0;
  // Structure tensor averaged over 15 px windows, orientation per window.
  const S = 15;
  for (let y = 1 + S; y < h - 1 - S; y += S) for (let x = 1 + S; x < w - 1 - S; x += S) {
    let jxx = 0, jyy = 0, jxy = 0;
    for (let v = -S; v <= S; v++) for (let u = -S; u <= S; u++) { const i = (y + v) * w + x + u, gx = (B[i + 1] - B[i - 1]) / 2, gy = (B[i + w] - B[i - w]) / 2; jxx += gx * gx; jyy += gy * gy; jxy += gx * gy; }
    const coherence = Math.sqrt((jxx - jyy) ** 2 + 4 * jxy * jxy), energy = jxx + jyy;
    let grad = .5 * Math.atan2(2 * jxy, jxx - jyy) * 180 / Math.PI; // gradient direction, y down
    let structure = grad + 90; if (structure > 90) structure -= 180; if (structure <= -90) structure += 180;
    bins[Math.min(17, Math.floor((structure + 90) / 10))] += coherence; total += coherence; void energy;
  }
  const share = (a, b) => { let s = 0; for (let i = 0; i < 18; i++) { const c = -90 + i * 10 + 5; if (c >= a && c <= b) s += bins[i]; } return (s / total * 100).toFixed(1); };
  console.log(n.padEnd(28), 'coherent-energy share: horizontal |a|<=10:', share(-10, 10) + '%', ' down-right 10..40:', share(10, 40) + '%', ' up-right -40..-10:', share(-40, -10) + '%', ' total', total.toExponential(2));
}
