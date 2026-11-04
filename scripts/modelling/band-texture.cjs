'use strict';
// Per-era band colour and texture on a 1080 still from its 1080 id pass (R = era*20, G 255, B = mode*4 + orientation).
// Pixels need a same-era, same-surface 4 px neighbourhood. CIELAB is D65 from sRGB. Texture numbers on L*:
// hpSd = sd of L* minus its 7x7 box mean (grain); fleck = share of pixels more than 6 L* from their 15x15 box mean
// (discrete flecks, clods and inclusions), split dark/pale; lumpSd = sd of the 7x7 mean minus the 31x31 mean (clods).
// CLI: node scripts/modelling/band-texture.cjs <ids-1080.png> <still-1080.png> [surfaces=1,2,5]
const { readRGB } = require('../round6-checks.cjs');
const ERAS = ['silt', 'pre-mauryan', 'mauryan', 'sunga', 'kushan', 'gupta', 'post-gupta', 'rajput', 'sultanate', 'mughal', 'modern-fill'];
const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116;
function boxMean(src, W, H, R) {
  const t = new Float64Array(W * H), o = new Float64Array(W * H);
  for (let y = 0; y < H; y++) { let s = 0; for (let x = -R; x <= R; x++) s += src[y * W + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) { t[y * W + x] = s / (2 * R + 1); s += src[y * W + Math.min(W - 1, x + R + 1)] - src[y * W + Math.max(0, x - R)]; } }
  for (let x = 0; x < W; x++) { let s = 0; for (let y = -R; y <= R; y++) s += t[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) { o[y * W + x] = s / (2 * R + 1); s += t[Math.min(H - 1, y + R + 1) * W + x] - t[Math.max(0, y - R) * W + x]; } }
  return o;
}
function bandTexture(idsFile, stillFile, surfaces = [1, 2, 5], minPixels = 400) {
  const ids = readRGB(idsFile), img = readRGB(stillFile), W = ids.width, H = ids.height;
  if (img.width !== W || img.height !== H) throw new Error(`size ${img.width}x${img.height} vs ${W}x${H}`);
  const Ls = new Float64Array(W * H), As = new Float64Array(W * H), Bs = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = lin(img.data[3 * i]), g = lin(img.data[3 * i + 1]), b = lin(img.data[3 * i + 2]);
    const X = (.4124564 * r + .3575761 * g + .1804375 * b) / .95047, Y = .2126729 * r + .7151522 * g + .0721750 * b, Z = (.0193339 * r + .1191920 * g + .9503041 * b) / 1.08883;
    const fx = f(X), fy = f(Y), fz = f(Z); Ls[i] = 116 * fy - 16; As[i] = 500 * (fx - fy); Bs[i] = 200 * (fy - fz);
  }
  const L3 = boxMean(Ls, W, H, 3), L7 = boxMean(Ls, W, H, 7), L15 = boxMean(Ls, W, H, 15);
  const kOf = i => ids.data[3 * i + 1] > 200 && ids.data[3 * i + 2] !== 255 ? Math.round(ids.data[3 * i] / 20) : -1;
  const acc = {}, M = 4;
  for (let y = M; y < H - M; y++) for (let x = M; x < W - M; x++) {
    const i = y * W + x, k = kOf(i), s = ids.data[3 * i + 2]; if (k < 0 || !surfaces.includes(s)) continue;
    let ok = true; for (const [dx, dy] of [[-M, 0], [M, 0], [0, -M], [0, M], [-M, -M], [M, M], [-M, M], [M, -M]]) { const j = (y + dy) * W + x + dx; if (kOf(j) !== k || ids.data[3 * j + 2] !== s) { ok = false; break; } }
    if (!ok) continue;
    const o = acc[`${s}:${k}`] ??= { n: 0, L: 0, a: 0, b: 0, L2: 0, hp2: 0, fleck: 0, dark: 0, pale: 0, lump2: 0 };
    const hp = Ls[i] - L3[i], d7 = Ls[i] - L7[i], lm = L3[i] - L15[i];
    o.n++; o.L += Ls[i]; o.a += As[i]; o.b += Bs[i]; o.L2 += Ls[i] * Ls[i]; o.hp2 += hp * hp; o.lump2 += lm * lm;
    if (Math.abs(d7) > 6) o.fleck++; if (d7 < -6) o.dark++; if (d7 > 6) o.pale++;
  }
  const out = {};
  for (const s of surfaces) {
    const bands = Object.entries(acc).filter(([key, o]) => +key.split(':')[0] === s && o.n >= minPixels).map(([key, o]) => { const k = +key.split(':')[1], n = o.n, L = o.L / n;
      return { k, id: ERAS[k], n, L, a: o.a / n, b: o.b / n, sdL: Math.sqrt(o.L2 / n - L * L), hpSd: Math.sqrt(o.hp2 / n), fleck: o.fleck / n, dark: o.dark / n, pale: o.pale / n, lumpSd: Math.sqrt(o.lump2 / n) }; }).sort((p, q) => p.k - q.k);
    if (!bands.length) continue;
    const pairs = [];
    for (let i = 1; i < bands.length; i++) { const p = bands[i - 1], q = bands[i]; if (q.k !== p.k + 1) continue;
      pairs.push({ pair: [p.id, q.id], dE76: Math.hypot(q.L - p.L, q.a - p.a, q.b - p.b), dL: q.L - p.L, fleck: [p.fleck, q.fleck], hpSd: [p.hpSd, q.hpSd], lumpSd: [p.lumpSd, q.lumpSd] }); }
    out[s] = { bands, pairs };
  }
  return out;
}
module.exports = { bandTexture, ERAS };
if (require.main === module) {
  const [idsFile, stillFile, surf] = process.argv.slice(2), r = bandTexture(idsFile, stillFile, (surf || '1,2,5').split(',').map(Number));
  for (const [s, { bands, pairs }] of Object.entries(r)) {
    console.log(`surface ${s}`);
    for (const b of bands) console.log(`  ${b.id.padEnd(12)} n ${String(b.n).padStart(7)}  L ${b.L.toFixed(1)} a ${b.a.toFixed(1)} b ${b.b.toFixed(1)}  sdL ${b.sdL.toFixed(1)} hpSd ${b.hpSd.toFixed(2)} fleck ${(100 * b.fleck).toFixed(1)}% (dark ${(100 * b.dark).toFixed(1)} pale ${(100 * b.pale).toFixed(1)}) lumpSd ${b.lumpSd.toFixed(2)}`);
    for (const p of pairs) console.log(`  ${p.pair.join('/')}: dE76 ${p.dE76.toFixed(1)} dL ${p.dL.toFixed(1)} fleck ${(100 * p.fleck[0]).toFixed(1)}->${(100 * p.fleck[1]).toFixed(1)}% hpSd ${p.hpSd[0].toFixed(2)}->${p.hpSd[1].toFixed(2)}`);
  }
}
