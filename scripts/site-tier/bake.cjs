'use strict';
// Site tier bake driver: renders scripts/site-tier/bake.html jobs and writes the pages.
//   node scripts/site-tier/bake.cjs --out <new folder> --input <bake-input folder> --jobs "plane:z+,plane:x+;atlas:core"
// Jobs separated by ';' run in separate browser sessions, each inside one gpu-lock hold (watchdog 9 min); ',' separates
// jobs in one session. Per page: <name>-<map>.png (lossless reference), <name>-<map>-q<NN>.webp, and the 2x
// downsampled set under half/. <name>.json holds the job's metadata and the WebP round-trip errors.
const fs = require('node:fs');
const path = require('node:path');
const { root, launch, serve } = require('../browser.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const args = process.argv.slice(2), get = k => { const i = args.indexOf(k); return i < 0 ? undefined : args[i + 1]; };
if (!get('--out') || !get('--jobs') || !get('--input')) throw new Error('--out, --input and --jobs are required');
const out = path.resolve(get('--out')), input = '/' + path.relative(root, path.resolve(get('--input'))).split(path.sep).join('/') + '/';
// Job: kind[:name[:scale]] (scale: the top's variationScale, e.g. "top::2").
const sessions = get('--jobs').split(';').map(s => s.split(',').map(j => { const [kind, name, scale] = j.split(':'); return { kind, name: name || undefined, ...(scale ? { variationScale: Number(scale) } : {}) }; }));
fs.mkdirSync(path.join(out, 'half'), { recursive: true });
function write(page) {
  const stats = {};
  for (const [set, dir] of [['full', out], ['half', path.join(out, 'half')]]) {
    const r = page[set], base = path.join(dir, `${page.name}-${page.map}`);
    fs.writeFileSync(base + '.png', Buffer.from(r.png, 'base64'));
    stats[set] = { pngBytes: Buffer.byteLength(r.png, 'base64'), webp: {} };
    for (const [q, w] of Object.entries(r.webp)) {
      const bytes = Buffer.from(w.b64, 'base64'); fs.writeFileSync(`${base}-q${Math.round(Number(q) * 100)}.webp`, bytes);
      stats[set].webp[q] = { bytes: bytes.length, meanAbs: w.meanAbs, maxAbs: w.maxAbs, psnr: w.psnr };
    }
  }
  return { name: page.name, map: page.map, width: page.width, height: page.height, covered: page.covered, clipped: page.clipped, ...stats };
}
async function session(server, jobs) {
  return withGpu(`strata-site-tier-bake:${jobs.map(j => j.kind + ':' + (j.name ?? '')).join(',')}`, async () => {
    const browser = await launch(), started = Date.now();
    const watchdog = setTimeout(() => { console.log('session exceeded 9 min, closing browser'); browser.close().catch(() => {}); }, 540000);
    try {
      const page = (await browser.pages())[0] || await browser.newPage(), errors = [];
      page.setDefaultTimeout(500000);
      // The dev server has no favicon; that 404 is the only expected failed request.
      page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
      page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`HTTP ${r.status()} ${r.url()}`); });
      await page.goto(`${server.url}/scripts/site-tier/bake.html`); await page.waitForFunction(() => window.bake?.ready, { polling: 250 });
      const info = await page.evaluate(() => ({ gridsMs: window.bake.gridsMs, gl: window.bake.renderer }));
      for (const job of jobs) {
        const t = Date.now(), file = path.join(out, `${job.kind}-${(job.name ?? 'all').replace(/[^a-z0-9+-]/gi, '')}.json`);
        if (fs.existsSync(file)) throw new Error(`${file} exists`);
        const r = await page.evaluate(j => window.bake.run(j), { ...job, input: job.kind === 'atlas' || job.kind === 'floorXz' ? `${input}${job.name ?? 'core'}.bin` : undefined });
        if (errors.length) throw new Error(errors.join('\n'));
        fs.writeFileSync(file, JSON.stringify({ ...r.meta, session: info, seconds: (Date.now() - t) / 1000, pages: r.pages.map(write) }, null, 1) + '\n');
        console.log(job.kind, job.name ?? '', (Date.now() - t) / 1000, 's');
      }
      console.log('session seconds', (Date.now() - started) / 1000);
    } finally { clearTimeout(watchdog); await browser.close().catch(() => {}); }
  });
}
(async () => {
  const server = await serve({ port: 5194 });
  try { for (const jobs of sessions) await session(server, jobs); } finally { await server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
