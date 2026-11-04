// M1 gate measurements on the M1 stills (A3 side-list items 2, 7, 10; wall against layer; B11 / B07-1 slivers), with A3
// stills as positive controls where the A3 review saw the defect. All thresholds below are modelling decisions (M).
// Usage: node scripts/modelling/m1-gates.mjs -> output/lookdev/modelling/m1/m1-gates.json (+ work/gates/*.png crops)
import { writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { arcAngle } from '../../src/museum-scene.js';

const root = fileURLToPath(new URL('../../', import.meta.url)), m1 = root + 'output/lookdev/modelling/m1/', a3 = root + 'output/lookdev/round6/stage-a3/';
const work = m1 + 'work/gates/'; mkdirSync(work, { recursive: true });
const ffmpeg = root + 'tools/ffmpeg/bin/ffmpeg.exe';
function readRGB(file) {
  const p = spawnSync(ffmpeg.replace('ffmpeg.exe', 'ffprobe.exe'), ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  const [width, height] = p.stdout.trim().split(',').map(Number);
  const r = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`decode ${file}: ${r.stderr}`);
  return { width, height, data: r.stdout };
}
const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
function lightness(img) {
  const L = new Float32Array(img.width * img.height), d = img.data;
  for (let p = 0; p < L.length; p++) { const Y = .2126 * lin(d[3 * p]) + .7152 * lin(d[3 * p + 1]) + .0722 * lin(d[3 * p + 2]); L[p] = Y > .008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; }
  return L;
}
// Masked box mean (rx, ry half sizes): mean of v over mask pixels in the box, NaN where the box has none.
function maskedMean(v, mask, W, H, rx, ry) {
  const S = new Float64Array((W + 1) * (H + 1)), C = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y + 1) * (W + 1) + x + 1, m = mask[y * W + x] ? 1 : 0;
    S[i] = (m ? v[y * W + x] : 0) + S[i - 1] + S[i - W - 1] - S[i - W - 2]; C[i] = m + C[i - 1] + C[i - W - 1] - C[i - W - 2];
  }
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const x0 = Math.max(0, x - rx), x1 = Math.min(W, x + rx + 1), y0 = Math.max(0, y - ry), y1 = Math.min(H, y + ry + 1);
    const at = (A, xx, yy) => A[yy * (W + 1) + xx], n = at(C, x1, y1) - at(C, x0, y1) - at(C, x1, y0) + at(C, x0, y0);
    out[y * W + x] = n ? (at(S, x1, y1) - at(S, x0, y1) - at(S, x1, y0) + at(S, x0, y0)) / n : NaN;
  }
  return out;
}
function components(on, W, H) {
  const label = new Int32Array(W * H).fill(-1), comps = [];
  for (let s = 0; s < W * H; s++) {
    if (!on[s] || label[s] >= 0) continue;
    const stack = [s], px = []; label[s] = comps.length;
    while (stack.length) {
      const p = stack.pop(); px.push(p); const x = p % W, y = (p - x) / W;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const q = yy * W + xx; if (on[q] && label[q] < 0) { label[q] = comps.length; stack.push(q); }
      }
    }
    comps.push(px);
  }
  return comps;
}
const isSoil = (d, p) => d[3 * p + 1] === 255 && d[3 * p] % 20 === 0 && d[3 * p] <= 200 && !(d[3 * p] === 0 && d[3 * p + 2] === 255);
const isFeature = (d, p) => d[3 * p] === 0 && d[3 * p + 1] === 0 && d[3 * p + 2] === 255;
const isFace = (d, p) => isSoil(d, p) && (d[3 * p + 2] & 3) !== 0 && (d[3 * p + 2] >> 2) <= 1;
const rect = (W, [x0, y0, w, h]) => p => { const x = p % W, y = (p - x) / W; return x >= x0 && x < x0 + w && y >= y0 && y < y0 + h; };
const report = { notes: {} };

// Item 2: pale streaks. L* smoothed over 9x3 px (horizontal streaks survive, flecks fade) minus the 41x41 masked mean of
// the same surface; pale where > 3 L*. Components longer than 3x their height are streaks; length uses 73 px/m, the
// scale of the farthest trench walls in the trench close-up (31 m, 25 deg fov at 1080), so lengths are not understated.
const PX_PER_M = 73;
function paleStreaks(img, mask) {
  const W = img.width, H = img.height, L = lightness(img);
  const smooth = maskedMean(L, mask, W, H, 4, 1), ref = maskedMean(L, mask, W, H, 20, 20), on = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) if (mask[p] && smooth[p] - ref[p] > 3) on[p] = 1;
  const streaks = components(on, W, H).map(px => {
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1; for (const p of px) { const x = p % W, y = (p - x) / W; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area: px.length };
  }).filter(c => c.w >= 3 * c.h).sort((a, b) => b.w - a.w);
  return { maskPixels: mask.reduce((s, v) => s + v, 0), longest: streaks.slice(0, 5).map(c => ({ ...c, metres: +(c.w / PX_PER_M).toFixed(2) })), over30cm: streaks.filter(c => c.w / PX_PER_M > .3).length };
}
{
  const still = readRGB(m1 + 'trench-closeup.png'), ids = readRGB(m1 + 'work/trench-closeup-ids-1080.png'), W = 1920, H = 1080;
  const face = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) face[p] = isFace(ids.data, p) ? 1 : 0;
  const a3still = readRGB(a3 + 'trench-closeup.png');
  // A3 regions where the review saw 1-2 m pale streaks (1024-wide view coordinates x 1.875).
  const regions = { 'upper-front': [712, 112, 226, 113], 'right-face': [1687, 431, 233, 188] };
  report.item2 = { method: 'smoothed 9x3 L* minus 41x41 same-surface mean > 3 L*; components wider than 3x their height; 73 px/m', regions, m1: {}, a3control: {} };
  report.item2.m1.allFaces = paleStreaks(still, face);
  for (const [name, r] of Object.entries(regions)) {
    const inR = rect(W, r), m = new Uint8Array(W * H), all = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) { m[p] = face[p] && inR(p) ? 1 : 0; all[p] = inR(p) ? 1 : 0; }
    report.item2.m1[name] = paleStreaks(still, m);
    report.item2.a3control[name] = paleStreaks(a3still, all);
  }
}

// Item 7: thin straight pale line. Vertical high-pass hp = L* minus the mean of the rows 3-5 px above and below; a
// line pixel has hp > 6. Straight runs are traced for slopes -0.5..0.5 (step 0.01) allowing 2 px gaps; the longest run is
// reported. A3 control: the lime-floor pencil line at about 1080 y 466-488, x 470-650.
function thinLines(img, mask) {
  const W = img.width, H = img.height, L = lightness(img), on = new Uint8Array(W * H);
  for (let y = 5; y < H - 5; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x; if (!mask[p]) continue;
    const ref = (L[p - 3 * W] + L[p - 4 * W] + L[p - 5 * W] + L[p + 3 * W] + L[p + 4 * W] + L[p + 5 * W]) / 6;
    if (L[p] - ref > 6) on[p] = 1;
  }
  let best = { length: 0 };
  for (let k = -50; k <= 50; k++) {
    const s = k / 100;
    for (let y0 = 0; y0 < H; y0++) {
      let run = 0, gap = 0, start = -1;
      for (let x = 0; x < W; x++) {
        const y = Math.round(y0 + s * x); if (y < 0 || y >= H) { run = 0; gap = 0; continue; }
        if (on[y * W + x]) { if (!run) start = x; run += gap + 1; gap = 0; if (run > best.length) best = { length: run, slope: s, start: [start, Math.round(y0 + s * start)], end: [x, y] }; }
        else if (run && ++gap > 2) { run = 0; gap = 0; }
      }
    }
  }
  return best;
}
{
  const still = readRGB(m1 + 'trench-closeup.png'), ids = readRGB(m1 + 'work/trench-closeup-ids-1080.png'), W = 1920, H = 1080;
  const soil = new Uint8Array(W * H), all = new Uint8Array(W * H).fill(1);
  for (let p = 0; p < W * H; p++) soil[p] = isSoil(ids.data, p) ? 1 : 0;
  const a3still = readRGB(a3 + 'trench-closeup.png'), ctrl = new Uint8Array(W * H), inC = rect(W, [440, 430, 240, 90]);
  for (let p = 0; p < W * H; p++) ctrl[p] = inC(p) ? 1 : 0;
  report.item7 = { method: 'vertical high-pass > 6 L*, longest straight run (slope |s| <= 0.5, gaps <= 2 px)',
    m1SoilPixels: thinLines(still, soil), m1AllPixels: thinLines(still, all), a3controlRegion: thinLines(a3still, ctrl), a3wholeImage: thinLines(a3still, all) };
}

// Item 10: inclusion shapes at 2160. Pieces = components of |L* - 15x15 masked mean| > 8 on soil faces, 30..3000 px.
// Solidity = area / convex hull area (pixel corners); aspect = sqrt of the covariance eigenvalue ratio. A comma or tadpole
// (blob plus tail) has low solidity and some elongation: counted where solidity < 0.75 and aspect > 1.8.
function hullArea(pts) {
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lower = [], upper = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop(); lower.push(p); }
  for (const p of pts.slice().reverse()) { while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop(); upper.push(p); }
  const h = lower.slice(0, -1).concat(upper.slice(0, -1)); let a = 0;
  for (let i = 0; i < h.length; i++) { const [x0, y0] = h[i], [x1, y1] = h[(i + 1) % h.length]; a += x0 * y1 - x1 * y0; }
  return Math.abs(a) / 2;
}
function pieces(img, mask) {
  const W = img.width, H = img.height, L = lightness(img), ref = maskedMean(L, mask, W, H, 7, 7), on = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) if (mask[p] && Math.abs(L[p] - ref[p]) > 8) on[p] = 1;
  const shapes = [];
  for (const px of components(on, W, H)) {
    if (px.length < 30 || px.length > 3000) continue;
    let mx = 0, my = 0; const corners = [];
    for (const p of px) { const x = p % W, y = (p - x) / W; mx += x; my += y; corners.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]); }
    mx /= px.length; my /= px.length;
    let sxx = 0, syy = 0, sxy = 0; for (const p of px) { const x = p % W - mx, y = (p - p % W) / W - my; sxx += x * x; syy += y * y; sxy += x * y; }
    const tr = (sxx + syy) / px.length, det = (sxx * syy - sxy * sxy) / px.length ** 2, d = Math.sqrt(Math.max(0, tr * tr / 4 - det));
    shapes.push({ area: px.length, solidity: px.length / hullArea(corners), aspect: Math.sqrt((tr / 2 + d) / Math.max(1e-9, tr / 2 - d)) });
  }
  const q = (arr, f) => arr.length ? +arr.slice().sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(f * arr.length))].toFixed(3) : null;
  const comma = shapes.filter(s => s.solidity < .75 && s.aspect > 1.8).length;
  return { pieces: shapes.length, solidity: { p10: q(shapes.map(s => s.solidity), .1), p50: q(shapes.map(s => s.solidity), .5) },
    aspect: { p50: q(shapes.map(s => s.aspect), .5), p90: q(shapes.map(s => s.aspect), .9) }, commaLike: comma, commaShare: shapes.length ? +(comma / shapes.length).toFixed(3) : null };
}
{
  const still = readRGB(m1 + 'work/trench-closeup-2160.png'), ids = readRGB(m1 + 'work/trench-closeup-ids-2160.png'), W = still.width, H = still.height;
  const face = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) face[p] = isFace(ids.data, p) ? 1 : 0;
  // M1 counterpart of the A3 right-end crop (360x1400 at 2160 from the right edge) for a like-for-like region.
  const rightEnd = new Uint8Array(W * H), inR = rect(W, [W - 360, 380, 360, 1400]); for (let p = 0; p < W * H; p++) rightEnd[p] = face[p] && inR(p) ? 1 : 0;
  const ctrl = file => { const img = readRGB(file); return pieces(img, new Uint8Array(img.width * img.height).fill(1)); };
  report.item10 = { method: '|L* - 15x15 mean| > 8 at 2160, components 30..3000 px; comma-like = solidity < 0.75 and aspect > 1.8',
    m1AllFaces: pieces(still, face), m1RightEnd: pieces(still, rightEnd),
    a3controlRightEnd: ctrl(a3 + 'trench-rightend-2160crop.png'), a3controlBelowTrench2: ctrl(a3 + 'below-trench2-corner-2160crop.png') };
}

// Wall against layer: every feature region (id 0,0,255) of at least 150 px at 1080; rim = feature pixels within 3 px of
// soil, surround = soil pixels 3-8 px outside; dL* = rim mean - surround mean.
function wallVsLayer(name) {
  const img = readRGB(m1 + `${name}.png`), ids = readRGB(m1 + `work/${name}-ids-1080.png`), W = 1920, H = 1080, L = lightness(img);
  const feat = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) feat[p] = isFeature(ids.data, p) ? 1 : 0;
  const out = [];
  for (const px of components(feat, W, H)) {
    if (px.length < 150) continue;
    const set = new Set(px); let rimS = 0, rimN = 0, surS = 0, surN = 0, cx = 0, cy = 0; const seen = new Set();
    for (const p of px) {
      const x = p % W, y = (p - x) / W; cx += x; cy += y; let nearSoil = false;
      for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const q = yy * W + xx, r = Math.max(Math.abs(dx), Math.abs(dy));
        if (set.has(q) || !isSoil(ids.data, q)) continue;
        if (r <= 3) nearSoil = true;
        if (r >= 3 && !seen.has(q)) { seen.add(q); surS += L[q]; surN++; }
      }
      if (nearSoil) { rimS += L[p]; rimN++; }
    }
    if (!rimN || !surN) continue;
    out.push({ centre: [Math.round(cx / px.length), Math.round(cy / px.length)], pixels: px.length, rimL: +(rimS / rimN).toFixed(1), surroundL: +(surS / surN).toFixed(1), dL: +((rimS / rimN) - (surS / surN)).toFixed(1) });
  }
  return out.sort((a, b) => b.pixels - a.pixels);
}
report.wallVsLayer = { method: 'feature rim (within 3 px of soil) mean L* minus soil surround (3-8 px) mean L*, regions >= 150 px at 1080',
  'trench-closeup': wallVsLayer('trench-closeup'), 'cold-open': wallVsLayer('cold-open'), 'season-1-end': wallVsLayer('season-1-end'), 'season-2-end': wallVsLayer('season-2-end') };

// Slivers: B07-1 on the square-3 back wall (z = 4, x 3.86..3.9, y -3.49..-3.28) and B11 on the square-3 west wall
// (x = 0, z 7.92..7.94, y -3.64..-3.42), from seating/m0.1-layout.md. Projected into the trench close-up and the cold-open
// cameras; feature-id pixels counted inside the projected quad on the 2160 id pass; 8x crops written for a visual check.
function camera(view) {
  const c = new THREE.PerspectiveCamera(25, 16 / 9, .1, 180);
  let target, distance, elevation, theta;
  if (view === 'trench') { target = new THREE.Vector3(-.2, -3.1, 6.2); distance = 31; elevation = 22; theta = 20 * Math.PI / 180; }
  else { target = new THREE.Vector3(-1.4, -3.85, 0); distance = 74; elevation = 27; theta = 35 * Math.PI / 180 + arcAngle(6); }
  const e = elevation * Math.PI / 180;
  c.position.set(target.x + distance * Math.cos(e) * Math.sin(theta), target.y + distance * Math.sin(e), target.z + distance * Math.cos(e) * Math.cos(theta));
  c.lookAt(target); c.updateMatrixWorld(); c.updateProjectionMatrix(); return c;
}
const SLIVERS = { 'B07-1 square-3 back wall': [[3.86, -3.49, 4], [3.9, -3.49, 4], [3.9, -3.28, 4], [3.86, -3.28, 4]],
  'B11 square-3 west wall': [[0, -3.64, 7.92], [0, -3.64, 7.94], [0, -3.42, 7.94], [0, -3.42, 7.92]] };
report.slivers = {};
for (const [still, view] of [['trench-closeup', 'trench'], ['cold-open', 'turntable']]) {
  const cam = camera(view), ids = readRGB(m1 + `work/${still}-ids-2160.png`), img = readRGB(m1 + `work/${still}-2160.png`), W = ids.width, H = ids.height;
  for (const [name, quad] of Object.entries(SLIVERS)) {
    const pts = quad.map(([x, y, z]) => { const p = new THREE.Vector3(x, y, z).project(cam); return [(p.x + 1) / 2 * W, (1 - p.y) / 2 * H]; });
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.floor(Math.min(...xs)), x1 = Math.ceil(Math.max(...xs)), y0 = Math.floor(Math.min(...ys)), y1 = Math.ceil(Math.max(...ys));
    const inside = (x, y) => { let s = 0; for (let i = 0; i < 4; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 4]; const c = (bx - ax) * (y - ay) - (by - ay) * (x - ax); if (c !== 0) { if (s && Math.sign(c) !== s) return false; s = Math.sign(c); } } return true; };
    let n = 0, feat = 0;
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) if (inside(x + .5, y + .5)) { n++; if (isFeature(ids.data, y * W + x)) feat++; }
    const widths = [Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), Math.hypot(pts[2][0] - pts[3][0], pts[2][1] - pts[3][1])];
    const cx = Math.round((x0 + x1) / 2), cy = Math.round((y0 + y1) / 2), crop = `${work}${still}-${name.split(' ')[0]}.png`;
    spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', m1 + `work/${still}-2160.png`, '-vf', `crop=120:120:${Math.max(0, cx - 60)}:${Math.max(0, cy - 60)},scale=480:480:flags=neighbor`, crop]);
    (report.slivers[name] ??= {})[still] = { screenQuad2160: pts.map(p => p.map(v => +v.toFixed(1))), widthPx2160: widths.map(v => +v.toFixed(2)), widthPx1080: widths.map(v => +(v / 2).toFixed(2)), quadPixels2160: n, featurePixels2160: feat, crop: crop.slice(root.length) };
  }
}
writeFileSync(m1 + 'm1-gates.json', JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify(report, null, 1));
