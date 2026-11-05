// Per-band CIELAB statistics of a beauty frame, grouped by the era id pass: era index k, mode, orientation.
//   node scripts/modelling/m2-band-stats.mjs <dir> [beauty.png] [ids.png] [x0,y0,x1,y1]
import { spawnSync } from 'node:child_process';
const [dir, beauty = 'none.png', ids = 'ids.png', box = '0,0,1920,1080'] = process.argv.slice(2), [X0, Y0, X1, Y1] = box.split(',').map(Number);
const raw = f => { const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', `${dir}/${f}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 26 }); if (r.status) throw new Error(String(r.stderr)); return r.stdout; };
const b = raw(beauty), id = raw(ids), W = 1920;
const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const lab = (r, g, bl) => {
  const R = lin(r), G = lin(g), B = lin(bl), x = (.4124 * R + .3576 * G + .1805 * B) / .95047, y = .2126 * R + .7152 * G + .0722 * B, z = (.0193 * R + .1192 * G + .9505 * B) / 1.08883;
  const f = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116, fx = f(x), fy = f(y), fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
const groups = new Map();
for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
  const i = (y * W + x) * 3; if (id[i + 1] < 250) continue;
  const key = `k${Math.round(id[i] / 20)} mode${id[i + 2] >> 2} orient${id[i + 2] & 3}`, L = lab(b[i], b[i + 1], b[i + 2]);
  const g = groups.get(key) ?? { n: 0, s: [0, 0, 0], ss: 0, Ls: [] }; g.n++; g.s[0] += L[0]; g.s[1] += L[1]; g.s[2] += L[2]; g.ss += L[0] * L[0]; g.Ls.push(L[0]); groups.set(key, g);
}
for (const [k, g] of [...groups].sort()) {
  if (g.n < 200) continue;
  const m = g.s.map(v => v / g.n), sd = Math.sqrt(g.ss / g.n - m[0] * m[0]); g.Ls.sort((p, q) => p - q);
  console.log(k.padEnd(22), 'n', String(g.n).padStart(7), 'L', m[0].toFixed(1), 'sd', sd.toFixed(1), 'p95', g.Ls[Math.floor(g.n * .95)].toFixed(1), 'p99', g.Ls[Math.floor(g.n * .99)].toFixed(1), 'a', m[1].toFixed(1), 'b', m[2].toFixed(1));
}
