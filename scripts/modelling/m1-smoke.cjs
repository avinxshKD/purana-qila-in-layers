'use strict';
// M1 smoke render of the era soil block: one browser per capture inside a gpu-lock hold, 1080p, a few states.
// Usage: node scripts/modelling/m1-smoke.cjs [name,name] [--width=1920 --height=1080]
const fs = require('node:fs');
const path = require('node:path');
const { root, launch, openPage } = require('../browser.cjs');
const { captureSession } = require('../capture-session.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const out = path.join(root, 'output', 'lookdev', 'modelling', 'm1', 'work', 'smoke');
fs.mkdirSync(out, { recursive: true });
const full = Array(10).fill(1), upTo = n => Array.from({ length: 10 }, (_, i) => i <= n ? 1 : 0);
const STATES = {
  'cut-turntable': { view: 'turntable', seconds: 6, state: { deposits: full, features: full, excavation: 1 } },
  'uncut-turntable': { view: 'turntable', seconds: 6, state: { deposits: full, features: full, excavation: 0 } },
  'mauryan-turntable': { view: 'turntable', seconds: 6, state: { deposits: upTo(1), features: upTo(1), excavation: 0 } },
  'kushan-turntable': { view: 'turntable', seconds: 6, state: { deposits: upTo(3), features: upTo(3), excavation: 0 } },
  'gupta-turntable': { view: 'turntable', seconds: 6, state: { deposits: upTo(4), features: upTo(4), excavation: 0 } },
  'post-gupta-turntable': { view: 'turntable', seconds: 6, state: { deposits: upTo(5), features: upTo(5), excavation: 0 } },
  'sultanate-turntable': { view: 'turntable', seconds: 6, state: { deposits: upTo(7), features: upTo(7), excavation: 0 } },
  'season1-trench': { view: 'trench', seconds: 4, state: { deposits: full, features: full, excavation: 4 / 12 } },
  'cut-trench': { view: 'trench', seconds: 4, state: { deposits: full, features: full, excavation: 1 } },
  'cut-ring': { view: 'cut', seconds: 4, state: { deposits: full, features: full, excavation: 1 } },
  'side-square': { view: 'side-square', seconds: 4, state: { deposits: full, features: full, excavation: 1 } }
};
const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => (([k, v]) => [k, v ?? true])(a.slice(2).split('='))));
const names = (args.find(a => !a.startsWith('--')) ?? Object.keys(STATES).join(',')).split(',');
(async () => {
  const session = await captureSession();
  try {
    for (const name of names) {
      const { view, seconds, state } = STATES[name];
      await withGpu(`strata-m1-smoke:${name}`, async () => {
        const browser = await launch();
        const t0 = Date.now();
        try {
          const page = await openPage(browser, session.url, { lookdev: '', soil: 'eras', labels: 'scale', ...(opt.debug ? { eraDebug: opt.debug } : {}), width: opt.width ?? '1920', height: opt.height ?? '1080', aa: 'off', view });
          if (opt.noshadow) await page.evaluate(() => window.strata.setShadowRoles({ keyShadow: false }));
          const errors = [];
          page.on('console', m => { if (['error', 'warning'].includes(m.type())) errors.push(m.text().slice(0, 400)); });
          const applied = await page.evaluate(s => { const w = window.strata.warmState(s); const a = window.strata.applyState(s); return { warm: w, cutStep: a.cutStep, timings: a.timings, flag: a.cutAssumesFullDeposits }; }, { schemaVersion: 1, ...state });
          const result = await session.capture(page, name, path.join(out, `${name}${opt.tag ?? ''}.png`), { seconds });
          const device = await page.evaluate(() => { const d = window.strata.device(); return { eraBlock: d.eraBlock, info: window.strata.info(), labels: d.labels.parts?.scaleLabels }; });
          fs.writeFileSync(path.join(out, `${name}${opt.tag ?? ''}.json`), JSON.stringify({ name, view, seconds, state, applied, result, device, errors, seconds_elapsed: (Date.now() - t0) / 1000 }, null, 2));
          console.log(name, 'ok', ((Date.now() - t0) / 1000).toFixed(1), 's', JSON.stringify(applied), errors.length ? 'ERRORS: ' + errors.join(' | ') : '');
        } finally { await browser.close().catch(() => {}); }
      });
    }
  } finally { await session.close(); }
})().catch(e => { console.error(e); process.exit(1); });
