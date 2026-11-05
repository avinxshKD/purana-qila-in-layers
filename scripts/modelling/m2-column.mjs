// Dump a pixel column of two same-size PNGs (beauty and era id pass) as rows: y, era index (R/20), orientation, beauty RGB.
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const [dir, x, y0, y1] = process.argv.slice(2), X = Number(x), Y0 = Number(y0), Y1 = Number(y1), h = Y1 - Y0;
const col = f => { const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', `${dir}/${f}`, '-vf', `crop=1:${h}:${X}:${Y0}`, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 24 }); if (r.status) throw new Error(String(r.stderr)); return r.stdout; };
const b = col('none.png'), id = col('ids.png');
for (let i = 0; i < h; i += 2) console.log(Y0 + i, (id[i * 3] / 20).toFixed(1), id[i * 3 + 2] & 3, (id[i * 3 + 2] >> 2), b[i * 3], b[i * 3 + 1], b[i * 3 + 2]);
