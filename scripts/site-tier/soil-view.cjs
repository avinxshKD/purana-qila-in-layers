'use strict';
// Site tier soil look-dev driver: renders scripts/site-tier/soil-view.html sessions and writes frames, crops and JSON.
//   node scripts/site-tier/soil-view.cjs --out <new folder> --bake <bake folder> --top <top bake folder> --sessions hero,closest
//     [--assets <asset folder> --atlas <atlas page folder>] (a trial build and its atlases; default the live assets)
//     [--programs merged] (site soil as one program per side)
// Each session is one browser inside one gpu-lock hold (watchdog 9 min). Per view: <view>-<variant>.png (full frame),
// <view>-crop-<surface>.png (variants side by side, left to right as listed in the JSON), <session>.json (G4 band
// means, crop windows, timings).
const fs = require('node:fs');
const path = require('node:path');
const { root, launch, serve } = require('../browser.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const args = process.argv.slice(2), get = k => { const i = args.indexOf(k); return i < 0 ? undefined : args[i + 1]; };
if (!get('--out') || !get('--bake') || !get('--top') || !get('--sessions')) throw new Error('--out, --bake, --top and --sessions are required');
const out = path.resolve(get('--out')), url = p => '/' + path.relative(root, path.resolve(p)).split(path.sep).join('/');
fs.mkdirSync(out, { recursive: true });
const crop = (surfaces, w, h) => surfaces.map(surface => ({ surface, w, h }));
const SESSIONS = {
  hero: { w: 1440, h: 900, jobs: [
    { kind: 'view', id: 'hero-2023', year: 2023, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }, { name: 'site-4cm', mode: 'site', set: 'half' }], crops: crop(['top', 'outer', 'inner', 'floor'], 480, 320) },
    { kind: 'view', id: 'hero-kushan-199', year: 199, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }], crops: crop(['top', 'outer'], 480, 320) },
    { kind: 'view', id: 'hero-2012-unexcavated', year: 2012, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }], crops: crop(['top', 'outer'], 480, 320) },
    { kind: 'timing', year: 2023, distance: 74, scales: [1, 2] }
  ] },
  diag: { w: 1440, h: 900, jobs: [
    { kind: 'view', id: 'diag-kushan-199', year: 199, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }, { name: 'site-norecv', mode: 'site', receive: false }, { name: 'site-nocast', mode: 'site', cast: false }, { name: 'site-flattop', mode: 'site', flatTop: true }, { name: 'site-png', mode: 'site', set: 'png' }], crops: crop(['top', 'outer'], 480, 320) },
    { kind: 'view', id: 'diag-2023', year: 2023, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }, { name: 'site-norecv', mode: 'site', receive: false }, { name: 'site-nocast', mode: 'site', cast: false }, { name: 'site-flattop', mode: 'site', flatTop: true }, { name: 'site-png', mode: 'site', set: 'png' }], crops: crop(['top', 'inner', 'floor'], 480, 320) }
  ] },
  // Pairs (film, site) with the same switch on both: unlit albedo, flat normals, key shadow off.
  diag2: { w: 2880, h: 1800, jobs: [
    ...[['albedo', { output: 'albedo' }], ['flatnormal', { output: 'flatnormal' }], ['noshadow', { shadows: false }]].flatMap(([tag, sw]) => [
      { kind: 'view', id: `d2-2023-${tag}`, year: 2023, distance: 31, variants: [{ name: 'film', mode: 'film', ...sw }, { name: 'site', mode: 'site', ...sw }], crops: crop(['top', 'inner', 'floor'], 720, 480) },
      { kind: 'view', id: `d2-kushan-199-${tag}`, year: 199, distance: 31, variants: [{ name: 'film', mode: 'film', ...sw }, { name: 'site', mode: 'site', ...sw }], crops: crop(['top', 'outer'], 720, 480) }])
  ] },
  // Unlit albedo with site mesh subsets hidden, and the top page / top terms (r veneer, g base fade) written raw.
  diag3: { w: 2880, h: 1800, jobs: [
    { kind: 'view', id: 'd3-kushan-199', year: 199, distance: 31, variants: [{ name: 'film', mode: 'film', output: 'albedo' }, { name: 'site', mode: 'site', output: 'albedo' },
      { name: 'site-nomargins', mode: 'site', output: 'albedo', hide: '^site-top-margins$' }, { name: 'site-noouter', mode: 'site', output: 'albedo', hide: 'outer' },
      { name: 'site-toppage', mode: 'site', output: 'toppage' }, { name: 'site-topterms', mode: 'site', output: 'topterms' }], crops: crop(['top'], 360, 240) },
    { kind: 'view', id: 'd3-2023', year: 2023, distance: 31, variants: [{ name: 'film', mode: 'film', output: 'albedo' }, { name: 'site', mode: 'site', output: 'albedo' },
      { name: 'site-nofixedtop', mode: 'site', output: 'albedo', hide: '^site-top$' }, { name: 'site-nosteptop', mode: 'site', output: 'albedo', hide: ':top$' },
      { name: 'site-toppage', mode: 'site', output: 'toppage' }, { name: 'site-topterms', mode: 'site', output: 'topterms' }], crops: crop(['top', 'floor'], 360, 240) }
  ] },
  diag4: { w: 2880, h: 1800, jobs: [
    { kind: 'view', id: 'd4-kushan-199', year: 199, distance: 31, variants: [{ name: 'film', mode: 'film', output: 'albedo' }, { name: 'site', mode: 'site', output: 'albedo' }, { name: 'site-noothers', mode: 'site', output: 'albedo', hideOthers: true }, { name: 'film-noothers', mode: 'film', output: 'albedo', hideOthers: true }], crops: crop(['top'], 480, 320) },
    { kind: 'view', id: 'd4-2023', year: 2023, distance: 31, variants: [{ name: 'film', mode: 'film', output: 'albedo' }, { name: 'site', mode: 'site', output: 'albedo' }, { name: 'site-noothers', mode: 'site', output: 'albedo', hideOthers: true }, { name: 'film-noothers', mode: 'film', output: 'albedo', hideOthers: true }], crops: crop(['top', 'floor', 'inner'], 480, 320) }
  ] },
  // Frame order: the same film frame repeated, before and after one site frame.
  diag5: { w: 2880, h: 1800, jobs: [
    { kind: 'view', id: 'd5-kushan-199-albedo', year: 199, distance: 31, variants: [{ name: 'film', mode: 'film', output: 'albedo' }, { name: 'film2', mode: 'film', output: 'albedo' }, { name: 'site', mode: 'site', output: 'albedo' }, { name: 'film3', mode: 'film', output: 'albedo' }], crops: crop(['top'], 480, 320) },
    { kind: 'view', id: 'd5-kushan-199-lit', year: 199, distance: 31, variants: [{ name: 'film', mode: 'film' }, { name: 'film2', mode: 'film' }, { name: 'film3', mode: 'film' }], crops: crop(['top'], 480, 320) }
  ] },
  // Clear check after the autoClear fix: film before and after a site frame, unlit and lit.
  check: { w: 2880, h: 1800, jobs: [
    { kind: 'view', id: 'check-kushan-199', year: 199, distance: 31, variants: [{ name: 'film', mode: 'film', output: 'albedo' }, { name: 'site', mode: 'site', output: 'albedo' }, { name: 'film2', mode: 'film', output: 'albedo' }, { name: 'site-lit', mode: 'site' }, { name: 'film-lit', mode: 'film' }], crops: crop(['top'], 480, 320) },
    { kind: 'view', id: 'check-2023', year: 2023, distance: 31, variants: [{ name: 'film', mode: 'film', output: 'albedo' }, { name: 'site', mode: 'site', output: 'albedo' }, { name: 'film2', mode: 'film', output: 'albedo' }], crops: crop(['floor', 'inner'], 480, 320) }
  ] },
  // Native-scale crops (300 x 200 px per panel, three panels fit about 1:1 in a 1024 px view): floors 2 vs 4 cm.
  floorcrop: { w: 2880, h: 1800, jobs: [
    { kind: 'view', id: 'fc-2023', year: 2023, distance: 31, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }, { name: 'site-floors2cm', mode: 'site', floors: '2cm' }], crops: crop(['floor', 'inner', 'outer', 'top'], 300, 200) }
  ] },
  // Albedo WebP q .8 against q .9, native-scale crops, hero and closest.
  albedoq: { w: 2880, h: 1800, jobs: [
    { kind: 'view', id: 'aq-2023-closest', year: 2023, distance: 31, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }, { name: 'site-albedo-q80', mode: 'site', set: 'albedo-q80' }], crops: crop(['floor', 'inner', 'outer'], 300, 200) },
    { kind: 'view', id: 'aq-2023-hero', year: 2023, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }, { name: 'site-albedo-q80', mode: 'site', set: 'albedo-q80' }], crops: crop(['inner', 'outer'], 300, 200) }
  ] },
  inventory: { w: 640, h: 400, jobs: [{ kind: 'inventory', year: 199 }, { kind: 'inventory', year: 2023 }] },
  // Memory options against the film (hero framing): key VSM variants on the site; the same views at 2880 x 1800 with
  // and without MSAA, and at 960 x 600 (2/3 scale, as a DPR cap of 2 on a DPR 3 screen) for band means across sizes.
  memopts: { w: 1440, h: 900, jobs: [2023, 199, 2012].map(year => ({ kind: 'view', id: `mo-${year}`, year, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' },
    { name: 'site-blur-nodepth', mode: 'site', blurDepth: false }, { name: 'site-vsm1024', mode: 'site', shadowSize: 1024 }, { name: 'site-vsm1024-r35', mode: 'site', shadowSize: 1024, shadowRadius: 3.5 }], crops: crop(['top', 'outer'], 480, 320) })) },
  'memopts-2x': { w: 2880, h: 1800, jobs: [2023, 199, 2012].map(year => ({ kind: 'view', id: `mo2x-${year}`, year, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }] })) },
  'memopts-2x-noaa': { w: 2880, h: 1800, query: 'msaa=0', jobs: [2023, 199, 2012].map(year => ({ kind: 'view', id: `mo2xnoaa-${year}`, year, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }] })) },
  // The accepted phone profile at 390 x 844 @3 under the cap (780 x 1688, MSAA off): site with the phone key VSM
  // (1024, radius 3.5, blur target without depth) against the film at the same size.
  'memopts-phone': { w: 780, h: 1688, query: 'msaa=0', jobs: [2023, 199, 2012].map(year => ({ kind: 'view', id: `mophone-${year}`, year, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' },
    { name: 'site-phone', mode: 'site', shadowSize: 1024, shadowRadius: 3.5, blurDepth: false }], crops: crop(['top', 'outer'], 360, 240) })) },
  'memopts-small': { w: 960, h: 600, jobs: [2023, 199, 2012].map(year => ({ kind: 'view', id: `mosmall-${year}`, year, distance: 74, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }] })) },
  closest: { w: 2880, h: 1800, jobs: [
    { kind: 'view', id: 'closest-2023', year: 2023, distance: 31, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }, { name: 'site-floors2cm', mode: 'site', floors: '2cm' }, { name: 'site-4cm', mode: 'site', set: 'half' }], crops: crop(['floor', 'top', 'inner', 'outer'], 720, 480) },
    { kind: 'view', id: 'closest-kushan-199', year: 199, distance: 31, variants: [{ name: 'film', mode: 'film' }, { name: 'site', mode: 'site' }], crops: crop(['top', 'outer'], 720, 480) }
  ] }
};
async function session(server, name) {
  const s = SESSIONS[name]; if (!s) throw new Error(`unknown session ${name}`);
  const file = path.join(out, `${name}.json`); if (fs.existsSync(file)) throw new Error(`${file} exists`);
  return withGpu(`strata-site-tier-soil-view:${name}`, async () => {
    const browser = await launch(), started = Date.now();
    const watchdog = setTimeout(() => { console.log('session exceeded 9 min, closing browser'); browser.close().catch(() => {}); }, 540000);
    try {
      const page = (await browser.pages())[0] || await browser.newPage(), errors = [];
      page.setDefaultTimeout(500000);
      page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
      page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`HTTP ${r.status()} ${r.url()}`); });
      await page.setViewport({ width: 800, height: 600 });
      await page.goto(`${server.url}/scripts/site-tier/soil-view.html?w=${s.w}&h=${s.h}&bake=${encodeURIComponent(url(get('--bake')))}&top=${encodeURIComponent(url(get('--top')))}${get('--assets') ? `&assets=${encodeURIComponent(url(get('--assets')) + '/')}&atlas=${encodeURIComponent(url(get('--atlas')))}` : ''}${get('--programs') ? `&programs=${get('--programs')}` : ''}${s.query ? `&${s.query}` : ''}`);
      await page.waitForFunction(() => window.view?.ready || window.viewError, { polling: 250 });
      const failed = await page.evaluate(() => window.viewError); if (failed || errors.length) throw new Error([failed, ...errors].filter(Boolean).join('\n'));
      const info = await page.evaluate(() => window.view.info), results = [];
      for (const job of s.jobs) {
        const t = Date.now(), r = await page.evaluate(j => window.view.run(j), job);
        if (errors.length) throw new Error(errors.join('\n'));
        if (r.frames) for (const [v, png] of Object.entries(r.frames)) fs.writeFileSync(path.join(out, `${r.id}-${v}.png`), Buffer.from(png, 'base64'));
        if (r.crops) for (const [surface, c] of Object.entries(r.crops)) { fs.writeFileSync(path.join(out, `${r.id}-crop-${surface}.png`), Buffer.from(c.png, 'base64')); delete c.png; }
        delete r.frames; results.push({ ...r, seconds: (Date.now() - t) / 1000 });
        console.log(job.kind, job.id ?? '', (Date.now() - t) / 1000, 's');
      }
      fs.writeFileSync(file, JSON.stringify({ session: name, info, results, seconds: (Date.now() - started) / 1000 }, null, 1) + '\n');
      console.log('session seconds', (Date.now() - started) / 1000);
    } finally { clearTimeout(watchdog); await browser.close().catch(() => {}); }
  });
}
(async () => {
  const server = await serve({ port: 5195 });
  try { for (const name of get('--sessions').split(',')) await session(server, name); } finally { await server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
