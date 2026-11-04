'use strict';
// GPU readback check of src/eras/soil-displace.js (see era-displace-gpu.js). One browser inside a gpu-lock hold.
// Usage: node scripts/modelling/era-displace-gpu.cjs  -> output/lookdev/modelling/m1/cpu-displacement-check.json
const fs = require('node:fs');
const path = require('node:path');
const { root, launch, serve } = require('../browser.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const out = path.join(root, 'output', 'lookdev', 'modelling', 'm1', 'cpu-displacement-check.json');
(async () => {
  const server = await serve({ port: 5179 });
  try {
    await withGpu('strata-m1-era-displace-gpu', async () => {
      const browser = await launch();
      try {
        const page = await browser.newPage(), errors = [];
        page.setDefaultTimeout(300000);
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        await page.goto(`${server.url}/scripts/modelling/era-displace-gpu.html`);
        await page.waitForFunction(() => window.eraDisplaceCheck?.done || document.title === 'failed', { polling: 500 }).catch(e => { throw new Error(errors.join('\n') || e.message); });
        const result = await page.evaluate(() => window.eraDisplaceCheck);
        result.errors = errors;
        fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n');
        console.log('max |y| error (m)', result.maxAbsYErrorMetres, 'max normal angle (deg)', result.maxNormalAngleDegrees);
        for (const r of result.results) console.log(r.state.padEnd(34), r.mesh.padEnd(18), 'sampled', r.sampled, 'max', r.maxAbsYErrorMetres.toExponential(2), 'p99', r.p99AbsYErrorMetres.toExponential(2), 'normal', r.maxNormalAngleDegrees?.toFixed(4) ?? '-');
        console.log('first prepare', JSON.stringify(result.firstPrepare));
        console.log('scrub', JSON.stringify(result.scrub));
        if (errors.length) console.log('page errors:', errors.join(' | '));
      } finally { await browser.close().catch(() => {}); }
    });
  } finally { await server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
