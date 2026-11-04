'use strict';
// Browser vs Node anchor identity over the film path: every distinct film scene state is applied in the browser
// (window.strata.applyState, soil=eras) and on the CPU (createEraSite in Node); featureAnchors must match exactly
// (points, normals, visible, part) on all 1800 frames.
// Usage: node scripts/modelling/anchor-browser-check.cjs [--out=<json relative to the repo>]
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { root, launch, openPage } = require('../browser.cjs');
const { captureSession } = require('../capture-session.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const outArg = process.argv.find(a => a.startsWith('--out='))?.slice(6) ?? 'output/lookdev/modelling/m1/anchor-browser-check.json';
(async () => {
  const { filmState } = await import(pathToFileURL(path.join(root, 'src/film/timeline.js')).href);
  const { createEraSite, anchorStateKey } = await import(pathToFileURL(path.join(root, 'src/eras/site-state.js')).href);
  const keys = [], states = new Map();
  for (let frame = 0; frame < 1800; frame++) { const s = filmState(frame / 30).scene, k = anchorStateKey(s); keys.push(k); if (!states.has(k)) states.set(k, s); }
  const site = createEraSite(), node = {};
  for (const [k, s] of states) node[k] = site.applyState(s).featureAnchors;
  const session = await captureSession();
  let browserAnchors;
  try {
    browserAnchors = await withGpu('strata-anchor-browser-check', async () => {
      const browser = await launch();
      try {
        const page = await openPage(browser, session.url, { lookdev: '', soil: 'eras', labels: 'scale', width: '960', height: '540', aa: 'off', view: 'turntable' });
        const out = {};
        for (const [k, s] of states) out[k] = await page.evaluate(scene => window.strata.applyState(scene).featureAnchors, s);
        return out;
      } finally { await browser.close().catch(() => {}); }
    });
  } finally { await session.close(); }
  const diffs = [];
  keys.forEach((k, frame) => {
    const a = node[k], b = browserAnchors[k];
    for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const x = a[id], y = b[id], pick = v => v && JSON.stringify({ point: v.point, normal: v.normal, visible: v.visible, part: v.part });
      if (pick(x) !== pick(y)) diffs.push({ frame, id, node: pick(x), browser: pick(y) });
    }
  });
  const report = { frames: keys.length, distinctStates: states.size, comparedAnchorsPerState: Object.keys(node[keys[0]]).length, differences: diffs.length, firstDifferences: diffs.slice(0, 20) };
  fs.writeFileSync(path.resolve(root, outArg), JSON.stringify(report, null, 1) + '\n');
  console.log(JSON.stringify(report));
  if (diffs.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
