'use strict';
// Z-fighting check at film distance: each state is rendered on the turntable camera (74 m, 1.5 m further than the
// film's closest 72.5 m, so depth precision is no better than in the film) at 6 s, again at 6 s (control), and at
// 6 s + 1/300 s (a hair of camera motion, about 0.01 degree). Coplanar surfaces that z-fight flip between surfaces when the
// camera moves a hair; a flip shows as an id-pass pixel whose 3x3 neighbourhood is uniform in both frames but whose id
// differs between them. Colour: pixels in such uniform interiors whose L* changes by more than 10 between frames.
// Usage: node scripts/modelling/zfight-check.cjs  -> output/lookdev/modelling/m1/zfight-check.json (+ work/zfight/*.png)
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, launch, openPage } = require('../browser.cjs');
const { captureSession } = require('../capture-session.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const { bin } = require('../media.cjs');
const W = 1920, H = 1080, dir = path.join(root, 'output', 'lookdev', 'modelling', 'm1'), work = path.join(dir, 'work', 'zfight');
fs.mkdirSync(work, { recursive: true });
const ones = Array(10).fill(1), upTo = n => Array.from({ length: 10 }, (_, i) => i <= n ? 1 : 0);
const STATES = {
  'final-cut': { schemaVersion: 1, eraIndex: 9, deposits: ones, features: ones, excavation: 1 },
  'season-1-end': { schemaVersion: 1, eraIndex: 9, deposits: ones, features: ones, excavation: 4 / 12 },
  'kushan-end': { schemaVersion: 1, eraIndex: 3, deposits: upTo(3), features: upTo(3), excavation: 0 },
  'gupta-end': { schemaVersion: 1, eraIndex: 4, deposits: upTo(4), features: upTo(4), excavation: 0 },
  'sultanate-end': { schemaVersion: 1, eraIndex: 7, deposits: upTo(7), features: upTo(7), excavation: 0 }
};
const TIMES = [['a', 6], ['control', 6], ['hair', 6 + 1 / 300]];
const decode = file => {
  const r = spawnSync(bin('ffmpeg'), ['-v', 'error', '-i', file, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(String(r.stderr)); return r.stdout;
};
const lin = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
const Lstar = (buf, p) => { const Y = .2126 * lin(buf[3 * p]) + .7152 * lin(buf[3 * p + 1]) + .0722 * lin(buf[3 * p + 2]); return Y > .008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
function compare(idA, idB, colA, colB) {
  const id = (buf, p) => buf[3 * p] << 16 | buf[3 * p + 1] << 8 | buf[3 * p + 2];
  const uniform = (buf, x, y) => { const c = id(buf, y * W + x); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (id(buf, (y + dy) * W + x + dx) !== c) return false; return true; };
  let idFlips = 0, colourJumps = 0, interior = 0, maxDL = 0; const pairs = {}, where = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const p = y * W + x;
    if (!uniform(idA, x, y) || !uniform(idB, x, y)) continue;
    const a = id(idA, p), b = id(idB, p);
    if (a === 0) continue;
    interior++;
    if (a !== b) { idFlips++; const k = `${a.toString(16)}>${b.toString(16)}`; pairs[k] = (pairs[k] ?? 0) + 1; if (where.length < 20) where.push([x, y]); continue; }
    const dL = Math.abs(Lstar(colA, p) - Lstar(colB, p)); maxDL = Math.max(maxDL, dL);
    if (dL > 10) { colourJumps++; if (where.length < 20) where.push([x, y, +dL.toFixed(1)]); }
  }
  return { interiorPixels: interior, idFlips, idFlipPairs: pairs, colourJumpsOver10L: colourJumps, maxInteriorDeltaL: +maxDL.toFixed(2), firstLocations: where };
}
(async () => {
  const session = await captureSession(), report = { camera: 'turntable 74 m, azimuth 35 deg + arc(6 s), elevation 27 deg, 1920x1080, aa off', times: TIMES, states: {} };
  try {
    for (const [name, state] of Object.entries(STATES)) {
      await withGpu(`strata-zfight:${name}`, async () => {
        const browser = await launch();
        try {
          const page = await openPage(browser, session.url, { lookdev: '', soil: 'eras', labels: 'scale', width: String(W), height: String(H), aa: 'off', view: 'turntable' });
          await page.evaluate(s => { window.strata.warmState(s); window.strata.applyState(s); }, state);
          const files = {};
          for (const [tag, seconds] of TIMES) {
            const colour = path.join(work, `${name}-${tag}.png`), ids = path.join(work, `${name}-${tag}-ids.png`);
            await session.capture(page, `${name}-${tag}`, colour, { seconds });
            const pass = await page.evaluate(() => window.strata.eraIds());
            fs.writeFileSync(ids, Buffer.from(pass.png, 'base64'));
            files[tag] = { colour: decode(colour), ids: decode(ids) };
          }
          report.states[name] = { state, control: compare(files.a.ids, files.control.ids, files.a.colour, files.control.colour), hair: compare(files.a.ids, files.hair.ids, files.a.colour, files.hair.colour) };
          console.log(name, JSON.stringify({ control: report.states[name].control.idFlips + '/' + report.states[name].control.colourJumpsOver10L, hair: report.states[name].hair.idFlips + '/' + report.states[name].hair.colourJumpsOver10L, pairs: report.states[name].hair.idFlipPairs, maxDL: report.states[name].hair.maxInteriorDeltaL }));
        } finally { await browser.close().catch(() => {}); }
      });
    }
  } finally { await session.close(); }
  fs.writeFileSync(path.join(dir, 'zfight-check.json'), JSON.stringify(report, null, 1) + '\n');
})().catch(e => { console.error(e); process.exit(1); });
