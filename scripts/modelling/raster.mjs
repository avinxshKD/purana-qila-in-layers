// Small CPU rasteriser for the modelling diagrams: RGB canvas, polygon fill, lines, and ffmpeg drawtext labels.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function canvas(w, h, bg) { const d = Buffer.alloc(w * h * 3); for (let i = 0; i < w * h; i++) { d[i * 3] = bg[0]; d[i * 3 + 1] = bg[1]; d[i * 3 + 2] = bg[2]; } return { w, h, d }; }
export const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
export function blend(c, x, y, col, a = 1) { if (x < 0 || y < 0 || x >= c.w || y >= c.h) return; const i = (y * c.w + x) * 3; for (let k = 0; k < 3; k++) c.d[i + k] = Math.round(c.d[i + k] * (1 - a) + col[k] * a); }
export function fillPoly(c, pts, col, a = 1) {
  const ys = pts.map(p => p[1]), y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(c.h - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const yc = y + .5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc) !== (by <= yc)) xs.push(ax + (yc - ay) / (by - ay) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.round(xs[i])); x < Math.min(c.w, Math.round(xs[i + 1])); x++) blend(c, x, y, col, a);
  }
}
export function line(c, [ax, ay], [bx, by], col, width = 1, dash = 0) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay)) || 1;
  for (let i = 0; i <= n; i++) {
    if (dash && Math.floor(i / dash) % 2) continue;
    const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
    for (let dx = -Math.floor(width / 2); dx <= Math.floor((width - 1) / 2); dx++) for (let dy = -Math.floor(width / 2); dy <= Math.floor((width - 1) / 2); dy++) blend(c, Math.round(x + dx), Math.round(y + dy), col);
  }
}
export const outline = (c, pts, col, width = 1, dash = 0) => pts.forEach((p, i) => line(c, p, pts[(i + 1) % pts.length], col, width, dash));
// Nudges boxed labels vertically (in label-height steps, nearest first) until they no longer overlap a label placed
// before them. Widths are estimated from the Arial advance (~0.55 em per character).
export function declutter(labels) {
  const rect = (l, dy = 0) => { const s = l.size ?? 15; return [l.x - 3, l.y + dy - 3, l.x + String(l.text).length * s * .55 + 3, l.y + dy + s + 3]; };
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  const placed = labels.filter(l => !l.box).map(l => rect(l));
  for (const l of labels.filter(l => l.box)) {
    const h = (l.size ?? 15) + 6;
    let dy = 0;
    for (let k = 0; k <= 24; k++) { const t = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * h; if (!placed.some(p => hit(p, rect(l, t)))) { dy = t; break; } }
    l.y += dy; placed.push(rect(l));
  }
  return labels;
}
export function save(c, labels, file, ffmpegExe) {
  const dir = path.dirname(file), ppm = path.join(dir, 'tmp.ppm'), script = path.join(dir, 'tmp-labels.txt');
  fs.writeFileSync(ppm, Buffer.concat([Buffer.from(`P6 ${c.w} ${c.h} 255\n`), c.d]));
  const esc = s => String(s).replace(/[\\':,%]/g, ' ');
  const chains = labels.map(l => `drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='${esc(l.text)}':x=${Math.round(l.x)}:y=${Math.round(l.y)}:fontsize=${l.size ?? 15}:fontcolor=${l.colour ?? '0x202020'}${l.box ? ':box=1:boxcolor=0xffffffb0:boxborderw=2' : ''}`);
  fs.writeFileSync(script, chains.join(',\n') || 'null');
  const r = spawnSync(ffmpegExe, ['-hide_banner', '-loglevel', 'error', '-y', '-i', ppm, '-/vf', script, '-frames:v', '1', file], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg ${r.status} ${r.error?.message ?? ''} ${r.stderr}`);
  fs.unlinkSync(ppm); fs.unlinkSync(script);
}
