// Era-top texture gate on the hero era stills (1080): the still's top pixels (era id pass: era k, top mode, horizontal)
// are mapped onto the active top surface and averaged into 7 cm cells, on a grid aligned with the world axes and on one
// rotated 45 degrees. On screen a pixel covers about 3 cm across but 6.7 cm in depth (27 degree elevation), so 7 cm cells
// give the same resolution both ways; the raw still's x/y correlation ratio is foreshortened by about 1/sin(27 deg).
// texture.cjs (output/review/look-stats, unedited) then measures corr and stripes on 4.2 m windows that lie wholly on the top.
// Top pixels are those of the era's top mode in any orientation: the Mughal top (boundary 9, the rough modern-fill base)
// has enough facets steeper than |n.y| = 0.7 that horizontal-only windows never fit on it.
// --angles=0,15,... sweeps the grid rotation (default 0,45): stripes measure column means, so on any lit relief they
// depend on the grid's angle to the key light as well as on streaks.
// Usage: node scripts/modelling/top-texture.mjs [--tag=name] [--work=dir] [--angles=0,45] [--only=era-09-mughal,...]
//   -> output/lookdev/modelling/m1/top-texture<tag>.json
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { activeTopAt, ERA_IDS } from '../../src/eras/stack.js';
import { arcAngle } from '../../src/museum-scene.js';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../', import.meta.url));
const m1 = root + 'output/lookdev/modelling/m1/';
const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const work = args.work ?? m1 + 'work/', tag = args.tag ?? '', angles = (args.angles ?? '0,45').split(',').map(Number), only = args.only?.split(',');
const ffmpeg = root + 'tools/ffmpeg/bin/ffmpeg.exe', node = process.execPath, texture = root + 'output/review/look-stats/texture.cjs';
const W = 1920, H = 1080, CELL = .07, WINDOW = 60;
function readRGB(file) {
  const r = spawnSync(ffmpeg, ['-v', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=neighbor`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`decode ${file}: ${r.stderr}`);
  return r.stdout;
}
function writePNG(file, w, h, data) {
  const r = spawnSync(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-i', 'pipe:0', '-frames:v', '1', file], { input: data });
  if (r.status !== 0) throw new Error(`encode ${file}: ${r.stderr}`);
}
// museum-scene.js placeCamera for view 'turntable' (distance 74, target y -3.85, elevation 27, azimuth 35, angle 0).
function turntableCamera(seconds) {
  const camera = new THREE.PerspectiveCamera(25, W / H, .1, 180), target = new THREE.Vector3(-1.4, -3.85, 0);
  const elevation = 27 * Math.PI / 180, theta = 35 * Math.PI / 180 + arcAngle(seconds), distance = 74;
  camera.position.set(target.x + distance * Math.cos(elevation) * Math.sin(theta), target.y + distance * Math.sin(elevation), target.z + distance * Math.cos(elevation) * Math.cos(theta));
  camera.lookAt(target); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  return camera;
}
const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const enc = v => Math.round(255 * (v <= .0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - .055));
const run = (file, mode) => spawnSync(node, [texture, file, mode, 0, 0, WINDOW, WINDOW], { encoding: 'utf8' }).stdout.trim();

const camera = turntableCamera(6), results = [];
mkdirSync(work + 'top-texture/', { recursive: true });
for (let i = 0; i < ERA_IDS.length; i++) {
  const name = `era-${String(i + 1).padStart(2, '0')}-${ERA_IDS[i]}`, deposits = ERA_IDS.map((_, j) => j <= i ? 1 : 0);
  if (only && !only.includes(name)) continue;
  const still = readRGB(m1 + `${name}.png`), ids = readRGB(work + `${name}-ids-1080.png`);
  const isTop = (x, y) => { const k = 3 * (y * W + x); return ids[k + 1] === 255 && ids[k + 2] >= 12 && ids[k + 2] <= 14 && ids[k] === (i + 1) * 20; };
  // Camera check: a 0.5 m lattice inside the top projects onto top-id pixels.
  let hit = 0, tried = 0;
  for (let x = -11.5; x <= 11.5; x += .5) for (let z = -7.5; z <= 7.5; z += .5) {
    const p = new THREE.Vector3(x, activeTopAt(deposits, x, z), z).project(camera), px = Math.floor((p.x + 1) / 2 * W), py = Math.floor((1 - p.y) / 2 * H);
    if (px < 0 || py < 0 || px >= W || py >= H) continue;
    tried++; if (isTop(px, py)) hit++;
  }
  const record = { name, cameraCheck: { lattice: tried, onTopId: hit, fraction: +(hit / tried).toFixed(4) }, grids: [] };
  // World (x, z) of every pixel's ray on the active top: plane at the centre's top height, refined three times on top
  // pixels (other pixels only mark the cells they fall in as not wholly top).
  const hitX = new Float32Array(W * H), hitZ = new Float32Array(W * H), topMask = new Uint8Array(W * H);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), y0 = activeTopAt(deposits, -1.4, 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const top = isTop(x, y), k = y * W + x;
    ndc.set((x + .5) / W * 2 - 1, 1 - (y + .5) / H * 2); ray.setFromCamera(ndc, camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    let t = (y0 - o.y) / d.y;
    if (top) {
      for (let r = 0; r < 3; r++) t = (activeTopAt(deposits, o.x + t * d.x, o.z + t * d.z) - o.y) / d.y;
      // The fixed-point step only converges where the top's slope along the ray is under about 0.5 (27 degree rays); on
      // the rough Mughal top it scatters hits and leaves cells empty. Unconverged pixels march the ray in 2 cm steps for
      // the first crossing near a damped estimate, then bisect.
      const gap = s => o.y + s * d.y - activeTopAt(deposits, o.x + s * d.x, o.z + s * d.z);
      if (Math.abs(gap(t)) > .002) {
        for (let r = 0; r < 12; r++) t += .4 * gap(t) / -d.y;
        let a = t - .6, fa = gap(a);
        for (let s = a + .02; s <= t + .6; s += .02) {
          const fs = gap(s);
          if (fa > 0 && fs <= 0) { let lo = s - .02, hi = s; for (let b = 0; b < 8; b++) { const m = (lo + hi) / 2; if (gap(m) > 0) lo = m; else hi = m; } t = (lo + hi) / 2; break; }
          fa = fs;
        }
      }
    }
    hitX[k] = o.x + t * d.x; hitZ[k] = o.z + t * d.z; topMask[k] = top ? 1 : 0;
  }
  for (const angle of angles) {
    const c = Math.cos(angle * Math.PI / 180), s = Math.sin(angle * Math.PI / 180), N = 520, half = N / 2;
    const sum = new Float64Array(N * N * 3), count = new Uint32Array(N * N), bad = new Uint8Array(N * N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const top = topMask[y * W + x], wx = hitX[y * W + x], wz = hitZ[y * W + x], u = c * wx + s * wz, v = -s * wx + c * wz;
      const cu = Math.floor(u / CELL) + half, cv = Math.floor(v / CELL) + half;
      if (cu < 0 || cv < 0 || cu >= N || cv >= N) continue;
      const k = cv * N + cu;
      if (!top) { bad[k] = 1; continue; }
      const q = 3 * (y * W + x);
      sum[3 * k] += lin(still[q]); sum[3 * k + 1] += lin(still[q + 1]); sum[3 * k + 2] += lin(still[q + 2]); count[k]++;
    }
    const ok = k => count[k] > 0 && !bad[k];
    if (args.masks) {
      // Grid status: green ok, red has a non-top pixel, black empty.
      const img = Buffer.alloc(N * N * 3);
      for (let k = 0; k < N * N; k++) { if (bad[k]) img[3 * k] = 255; else if (count[k]) img[3 * k + 1] = 255; }
      writePNG(work + `top-texture/${name}${tag}-${angle}-mask.png`, N, N, img);
    }
    // Windows wholly on the top (every cell filled, no non-top pixel in any cell), scanned on a 20-cell stride; keep the
    // two nearest the top's centre that do not overlap.
    // A top steeper than the 27 degree view (the Mughal top) hides its back-facing slopes, leaving scattered empty cells;
    // when no strict window fits, windows with no non-top cell and at most 3% empty cells are taken and the empty cells
    // filled from their filled neighbours (recorded as emptyShare).
    const scan = maxEmpty => {
      const found = [];
      for (let v0 = 0; v0 + WINDOW <= N; v0 += 20) for (let u0 = 0; u0 + WINDOW <= N; u0 += 20) {
        let good = true, empty = 0;
        for (let v = v0; v < v0 + WINDOW && good; v++) for (let u = u0; u < u0 + WINDOW; u++) {
          const k = v * N + u;
          if (bad[k] || (!count[k] && ++empty > maxEmpty)) { good = false; break; }
        }
        if (good) found.push({ u0, v0, empty, d: Math.hypot(u0 + WINDOW / 2 - half - (-1.4 / CELL), v0 + WINDOW / 2 - half) });
      }
      return found;
    };
    let windows = scan(0);
    if (!windows.length) windows = scan(Math.floor(.03 * WINDOW * WINDOW));
    for (const w of windows) if (w.empty) for (let pass = 0; pass < 4; pass++) for (let v = w.v0; v < w.v0 + WINDOW; v++) for (let u = w.u0; u < w.u0 + WINDOW; u++) {
      const k = v * N + u;
      if (count[k]) continue;
      let n = 0; const acc = [0, 0, 0];
      for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) { const q = (v + dv) * N + u + du; if (count[q]) { n++; for (let ch = 0; ch < 3; ch++) acc[ch] += sum[3 * q + ch] / count[q]; } }
      if (n) { for (let ch = 0; ch < 3; ch++) sum[3 * k + ch] = acc[ch] / n; count[k] = 1; }
    }
    windows.sort((a, b) => a.d - b.d);
    const chosen = [];
    for (const w of windows) if (chosen.every(o => Math.abs(o.u0 - w.u0) >= WINDOW || Math.abs(o.v0 - w.v0) >= WINDOW)) { chosen.push(w); if (chosen.length === 2) break; }
    for (const [n, w] of chosen.entries()) {
      const data = Buffer.alloc(WINDOW * WINDOW * 3);
      for (let v = 0; v < WINDOW; v++) for (let u = 0; u < WINDOW; u++) {
        const k = (w.v0 + v) * N + w.u0 + u;
        for (let ch = 0; ch < 3; ch++) data[3 * (v * WINDOW + u) + ch] = enc(sum[3 * k + ch] / count[k]);
      }
      const file = work + `top-texture/${name}${tag}-${angle}-${n}.png`;
      writePNG(file, WINDOW, WINDOW, data);
      const corr = run(file, 'corr'), stripes = run(file, 'stripes');
      const m = /sd L\* ([\d.]+)\s+corr length x ([\d.NaN]+) px\s+y ([\d.NaN]+) px\s+ratio x\/y ([\d.NaN]+)/.exec(corr), rms = /RMS ([\d.]+)/.exec(stripes), peak = /peak ([\d.]+)/.exec(stripes);
      record.grids.push({ angle, window: n, centreMetres: [((w.u0 + WINDOW / 2 - half) * CELL).toFixed(2), ((w.v0 + WINDOW / 2 - half) * CELL).toFixed(2)], emptyShare: +(w.empty / WINDOW ** 2).toFixed(4), file: file.slice(root.length),
        sdL: +m[1], corrX: +m[2], corrY: +m[3], ratio: +m[4], stripeRms: +rms[1], stripePeak: +peak[1] });
    }
  }
  results.push(record);
  console.log(name, 'camera', record.cameraCheck.fraction, record.grids.map(g => `${g.angle}deg#${g.window} ratio ${g.ratio} stripes ${g.stripeRms}/${g.stripePeak} sd ${g.sdL}`).join('; '));
}
writeFileSync(m1 + `top-texture${tag}.json`, JSON.stringify({ method: 'see scripts/modelling/top-texture.mjs header; cells 7 cm, windows 60 cells (4.2 m); texture.cjs corr/stripes on the whole window; top = top mode, any orientation', angles, results }, null, 2) + '\n');
