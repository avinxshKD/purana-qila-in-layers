'use strict';
// Site tier P0 driver: node scripts/site-tier/p0.cjs <seq|async|coverage|drivers|warm|split> [query, e.g. 'aa=0&quick=1']  -> output/lookdev/modelling/site-tier/p0/<phase>-<run>.json
// One headed browser inside one gpu-lock turn; the page is scripts/site-tier/p0.js. Fresh temporary profile, except
// drivers (not a cold-start measurement), which keeps compiled programs in output/.edge-profiles/site-tier-p0.
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const { root, executable, serve } = require('../browser.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const phase = process.argv[2], extra = process.argv[3] ?? ''; // extra: query string such as 'aa=0&quick=1'
if (!['seq', 'async', 'coverage', 'drivers', 'warm', 'split'].includes(phase)) throw new Error('usage: p0.cjs <seq|async|coverage|drivers|warm|split>');
const profile = ['drivers', 'warm', 'split'].includes(phase) ? path.join(root, 'output', '.edge-profiles', 'site-tier-p0') : undefined;
const run = Math.floor(Date.now() / 1000) % 1e7, outDir = path.join(root, 'output', 'lookdev', 'modelling', 'site-tier', 'p0');
fs.mkdirSync(outDir, { recursive: true });
(async () => {
  const server = await serve({ port: 5193 });
  let browser, killer;
  try {
    await withGpu(`site-tier:p0-${phase}`, async () => {
      const started = Date.now();
      browser = await puppeteer.launch({ executablePath: executable(), headless: false, protocolTimeout: 300000, ...(profile ? { userDataDir: profile } : {}),
        args: ['--force-color-profile=srgb', '--hide-scrollbars', '--no-first-run', '--window-size=1500,1040'] });
      killer = setTimeout(() => browser.close().catch(() => {}), 240000);
      const page = (await browser.pages())[0] || await browser.newPage(), errors = [];
      page.setDefaultTimeout(230000);
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      const failedRequests = [];
      page.on('response', r => { if (r.status() >= 400) failedRequests.push({ status: r.status(), url: r.url() }); });
      page.on('requestfailed', r => failedRequests.push({ failed: r.failure()?.errorText, url: r.url() }));
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 }); await page.bringToFront();
      await page.goto(`${server.url}/scripts/site-tier/p0.html?phase=${phase}&run=${run}${extra ? '&' + extra : ''}`);
      await page.waitForFunction(() => window.p0?.done, { polling: 250 });
      const p0 = await page.evaluate(() => window.p0);
      await browser.close(); browser = undefined; clearTimeout(killer);
      if (p0.error) throw new Error(p0.error + '\n' + errors.join('\n'));
      const result = { ...p0.result, browser: path.basename(executable()), headed: true, freshTemporaryProfile: !profile, pageErrors: errors, failedRequests, lockTurnSeconds: Math.round((Date.now() - started) / 1000) };
      if (result.images) { for (const [id, b64] of Object.entries(result.images)) fs.writeFileSync(path.join(outDir, `coverage-${run}-${id}.png`), Buffer.from(b64, 'base64')); delete result.images; }
      const file = path.join(outDir, `${phase}${extra ? '-' + extra.replace(/[^a-z0-9]+/gi, '') : ''}-${run}.json`);
      fs.writeFileSync(file, JSON.stringify(result, null, 1) + '\n');
      console.log('wrote', file, 'lock turn s', result.lockTurnSeconds);
    });
  } finally { clearTimeout(killer); if (browser) await browser.close().catch(() => {}); await server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
