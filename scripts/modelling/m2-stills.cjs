'use strict';
// M2 film stills: the film page (film.html, backend m1, no emphasis) at fixed film times, 1080, plus 3x nearest-neighbour
// close crops of the dug features around their returned anchors.
//   node scripts/modelling/m2-stills.cjs --out <folder> [--times 2,10.5,...] [--crops]
// Each browser session runs inside one scripts/gpu-lock.cjs hold and renders at most four times.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, launch, serve } = require('../browser.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const { bin, sha256 } = require('../media.cjs');
const args = process.argv.slice(2), get = k => { const i = args.indexOf(k); return i < 0 ? undefined : args[i + 1]; };
const out = path.resolve(get('--out') ?? path.join(root, 'output', 'lookdev', 'modelling', 'm2', 'stills'));
const times = (get('--times') ?? '2,10.5,13,14.5,34.5,42.5,53').split(',').map(Number);
// Close crops: feature id, film time in its own era (callouts on, so the anchor is projected), crop size at 1080.
const CROPS = [['mauryan-ring-well', 14.5], ['mauryan-drain', 14.5], ['rajput-postholes', 34.5]];
const wantCrops = args.includes('--crops');
const name = s => `film-${String(s.toFixed(2)).replace('.', '_')}s`;
function ffmpeg(list) { const r = spawnSync(bin('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-y', ...list], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr); }

async function session(server, batch) {
  return withGpu(`strata-m2-stills:${batch.join(',')}`, async () => {
    const browser = await launch();
    const watchdog = setTimeout(() => { console.log('session exceeded 4 min, closing browser'); browser.close().catch(() => {}); }, 240000);
    try {
      const page = (await browser.pages())[0] || await browser.newPage(), errors = [];
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 }); page.setDefaultTimeout(200000);
      page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      const t0 = Date.now();
      await page.goto(server.url + '/film.html?capture&backend=m1&emphasis=absent'); await page.waitForFunction(() => window.strataFilm?.ready);
      await page.evaluate(() => document.fonts.ready);
      const rows = [];
      for (const s of batch) {
        const row = await page.evaluate(s => {
          const started = performance.now(), d = window.strataFilm.render(s), ms = performance.now() - started;
          return { seconds: s, frame: d.state.frame, renderMs: ms, png: document.querySelector('canvas').toDataURL('image/png').split(',')[1],
            anchors: d.anchorVisibility.map(a => ({ id: a.id, featureId: a.featureId, projected: a.projected, occluded: a.occluded, offFrame: a.offFrame, missing: a.missing, reason: a.reason })), info: d.info };
        }, s);
        if (errors.length) throw new Error(errors.join('\n'));
        const file = path.join(out, name(s) + '.png'), bytes = Buffer.from(row.png, 'base64');
        fs.writeFileSync(file, bytes); delete row.png; row.file = path.basename(file); row.sha256 = sha256(bytes); rows.push(row);
        console.log(`${row.file} frame ${row.frame} ${row.renderMs.toFixed(0)} ms`);
      }
      return { rows, sessionSeconds: (Date.now() - t0) / 1000, browser: await browser.version() };
    } finally { clearTimeout(watchdog); await browser.close().catch(() => {}); }
  });
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const report = path.join(out, 'stills.json');
  if (fs.existsSync(report)) throw new Error(`${report} exists; use a new --out folder`);
  const server = await serve({ port: 5191 }), all = [...new Set([...times, ...(wantCrops ? CROPS.map(c => c[1]) : [])])].sort((a, b) => a - b), result = { times: all, sessions: [] };
  try { for (let i = 0; i < all.length; i += 4) result.sessions.push(await session(server, all.slice(i, i + 4))); }
  finally { await server.close(); }
  const rows = result.sessions.flatMap(s => s.rows);
  if (wantCrops) {
    result.crops = [];
    for (const [id, s] of CROPS) {
      const row = rows.find(r => r.seconds === s), a = row.anchors.find(x => x.featureId === id);
      if (!a?.projected) { result.crops.push({ id, seconds: s, error: 'no projected anchor', anchor: a ?? null }); continue; }
      const w = 240, h = 160, x = Math.max(0, Math.min(1920 - w, Math.round(a.projected.x - w / 2))), y = Math.max(0, Math.min(1080 - h, Math.round(a.projected.y - h / 2)));
      const file = `crop-${id}-${name(s)}-3x.png`;
      ffmpeg(['-i', path.join(out, row.file), '-vf', `crop=${w}:${h}:${x}:${y},scale=${w * 3}:${h * 3}:flags=neighbor`, '-frames:v', '1', path.join(out, file)]);
      result.crops.push({ id, seconds: s, frame: row.frame, anchor: a, region1080: { x, y, width: w, height: h }, scale: '3x nearest', file });
    }
  }
  fs.writeFileSync(report, JSON.stringify(result, null, 2) + '\n');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
