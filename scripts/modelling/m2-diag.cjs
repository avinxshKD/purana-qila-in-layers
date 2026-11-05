'use strict';
// M2 diagnostics driver: renders scripts/modelling/m2-diag.html at one film time for several eraDebug variants.
//   node scripts/modelling/m2-diag.cjs --out <new folder> --seconds 58 --variants "none;ids;bands;nostreak"
// Each browser session runs inside one gpu-lock hold and loads at most three pages.
const fs = require('node:fs');
const path = require('node:path');
const { root, launch, serve } = require('../browser.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const args = process.argv.slice(2), get = k => { const i = args.indexOf(k); return i < 0 ? undefined : args[i + 1]; };
const out = path.resolve(get('--out') ?? ''), seconds = Number(get('--seconds') ?? 58), variants = (get('--variants') ?? 'none;ids').split(';');
if (!get('--out')) throw new Error('--out is required');
if (fs.existsSync(path.join(out, 'diag.json'))) throw new Error(`${out} has diag.json; use a new folder`);
async function session(server, batch) {
  return withGpu(`strata-m2-diag:${batch.join(';')}`, async () => {
    const browser = await launch(), rows = [];
    const watchdog = setTimeout(() => { console.log('session exceeded 4 min, closing browser'); browser.close().catch(() => {}); }, 240000);
    try {
      const page = (await browser.pages())[0] || await browser.newPage(), errors = [];
      await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 }); page.setDefaultTimeout(200000);
      page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      for (const v of batch) {
        const debug = v === 'none' || v === 'ids' ? '' : v;
        await page.goto(`${server.url}/scripts/modelling/m2-diag.html?eraDebug=${encodeURIComponent(debug)}`); await page.waitForFunction(() => window.diag?.ready);
        const r = await page.evaluate((s, ids) => ids ? window.diag.ids(s) : window.diag.render(s), seconds, v === 'ids');
        if (errors.length) throw new Error(errors.join('\n'));
        const file = path.join(out, `${v.replace(/[^a-z0-9]+/gi, '-')}.png`);
        fs.writeFileSync(file, Buffer.from(r.png, 'base64'));
        rows.push({ variant: v, frame: r.frame, file: path.basename(file) }); console.log(v, r.frame);
      }
      return rows;
    } finally { clearTimeout(watchdog); await browser.close().catch(() => {}); }
  });
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const server = await serve({ port: 5192 }), rows = [];
  try { for (let i = 0; i < variants.length; i += 3) rows.push(...await session(server, variants.slice(i, i + 3))); }
  finally { await server.close(); }
  fs.writeFileSync(path.join(out, 'diag.json'), JSON.stringify({ seconds, rows }, null, 1));
})().catch(e => { console.error(e); process.exitCode = 1; });
