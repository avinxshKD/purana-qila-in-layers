'use strict';
// Before/after identity check for the labels.js scale-label extraction (see label-layout-check.js). One browser, DOM/2D only.
// Usage: node scripts/modelling/label-layout-check.cjs <before-module-url-path> <out.json>
const fs = require('node:fs');
const { launch, serve } = require('../browser.cjs');
const [beforePath, outPath] = process.argv.slice(2);
if (!beforePath || !outPath) { console.error('usage: label-layout-check.cjs <before-module-url-path> <out.json>'); process.exit(2); }
(async () => {
  const server = await serve({ port: 5179 });
  try {
    const browser = await launch();
    try {
      const page = await browser.newPage(), errors = [];
      page.setDefaultTimeout(600000);
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`${server.url}/scripts/modelling/label-layout-check.html?before=${encodeURIComponent(beforePath)}`);
      await page.waitForFunction(() => window.labelLayoutCheck?.done || window.labelLayoutCheck?.error || document.title === 'failed', { polling: 500 });
      const result = await page.evaluate(() => window.labelLayoutCheck);
      result.errors = errors;
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
      if (result.error) throw new Error(result.error);
      for (const c of result.cases) console.log(JSON.stringify({ height: c.height, mode: c.mode, frames: c.frames, framesWithLabels: c.framesWithLabels, labelBoxes: c.labelBoxes,
        originMismatches: c.originMismatches, otherMetadataMismatches: c.otherMetadataMismatches, pixelFrames: c.pixelFrames, pixelMismatchFrames: c.pixelMismatchFrames, maxPixelDiff: c.maxPixelDiff,
        metricInkOutside: c.metricInkOutside, minMetricInkMarginPx: c.minMetricInkMarginPx, pixelInkOutside: c.pixelInkOutside, minPixelInkMarginPx: c.minPixelInkMarginPx, maxDescentBelowOldBoxPx: c.maxDescentBelowOldBoxPx, pure: c.pureMatchesDrawnLastFrame, firstProblem: c.firstProblem }));
      if (errors.length) console.log('page errors:', errors.join(' | '));
    } finally { await browser.close().catch(() => {}); }
  } finally { await server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
