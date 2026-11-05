// Pixel difference between two same-size PNGs: count of differing pixels, max channel difference, bounding box.
import { spawnSync } from 'node:child_process';
const raw = f => { const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', f, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 26 }); if (r.status) throw new Error(String(r.stderr)); return r.stdout; };
const [fa, fb, W = '1920'] = process.argv.slice(2), a = raw(fa), b = raw(fb), w = Number(W);
let n = 0, max = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
for (let i = 0; i < a.length; i += 3) {
  const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
  if (!d) continue; n++; max = Math.max(max, d); const p = i / 3, x = p % w, y = Math.floor(p / w);
  x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
}
console.log(JSON.stringify({ differingPixels: n, maxChannelDifference: max, bbox: n ? [x0, y0, x1, y1] : null }));
