'use strict';
// Round 6 Stage A2 look pass: the four stills, crops and measurements, all measured with the orchestrator's unedited
// scripts (output/review/look-stats/colour.ps1 and texture.cjs). Usage:
//   node scripts/round6-stage-a2.cjs [overview] [trench-closeup] [ring-well-closeup] [turntable-frame-180] [--measure-only] [--force]
// With no still names every still is considered. A still is re-rendered only when its recorded input hash (src, public,
// index.html, package files; see input-hash.cjs) differs from the current one, its files are missing, or --force is given.
// Metrics from earlier runs are kept for stills that are not re-rendered.
const fs = require('node:fs');
const path = require('node:path');
const { root, launch, openPage } = require('./browser.cjs');
const { captureSession } = require('./capture-session.cjs');
const { ffmpeg, run, sha256 } = require('./media.cjs');
const directory = path.join(root, 'output', 'lookdev', 'round6', 'stage-a2'), work = path.join(directory, 'work');
const out = name => path.join(directory, name), temp = name => path.join(work, name);
const lookStats = path.join(root, 'output', 'review', 'look-stats');
const node = process.execPath;
const STILLS = { overview: ['overview', 4], 'trench-closeup': ['trench', 4], 'ring-well-closeup': ['cut', 4], 'turntable-frame-180': ['turntable', 6] };
// Orbit-limit checks: the hero turntable time with the azimuth offset by ±80 degrees; 1080 only, kept in work/.
const SIDES = { 'side-plus-80': ['turntable', 6, 80], 'side-minus-80': ['turntable', 6, -80] };
const ALL = { ...STILLS, ...SIDES };
const dest = name => SIDES[name] ? temp(`${name}.png`) : out(`${name}.png`);
const FIXED = {
  'turntable-frame-180': 'top:680:400:40:20;grey:680:460:40:20;yellow:680:570:40:20;salmon:680:670:40:20',
  'ring-well-closeup': 'ring-top:900:300:140:20;ring-upper:900:420:140:20;ring-mid:900:560:140:20;ring-low:900:720:140:20;ring-bottom:900:830:140:20;face-left:200:400:300:200;face-right:1300:400:300:200;pit-wall:780:400:60:200;ledge:900:160:200:30;bottom-band:1200:950:400:60;pit-floor:800:880:100:30;cell-face-left:300:450:40:20;cell-face-right:1400:500:40:20;cell-ring-upper:950:422:40:14;cell-ring-low:950:722:40:14;cell-bottom-band:1300:960:40:20'
};
const CLOSEUP_CORR = [[200, 400, 300, 200], [1300, 400, 300, 200], [1100, 300, 500, 150]];

const { inputHash, inputFiles } = require('./input-hash.cjs');
function colour(image, regions) {
  if (!regions) return [];
  const result = run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(lookStats, 'colour.ps1'), '-Image', image, '-Regions', regions]);
  return result.stdout.split(/\r?\n/).filter(Boolean).map(line => {
    const m = /^(\S+)\s+L\*=\s*([-\d.]+)\s+a\*=\s*([-\d.]+)\s+b\*=\s*([-\d.]+)\s+C\*\(of mean\)=\s*([-\d.]+)\s+meanC\*=\s*([-\d.]+)\s+sdL\*=\s*([-\d.]+)\s+n=(\d+)/.exec(line.trim());
    if (!m) throw new Error(`Unparsed colour line: ${line}`);
    const [L, a, b, C, meanC, sdL] = m.slice(2, 8).map(Number);
    return { name: m[1], L, a, b, C, meanC, sdL, hue: (Math.atan2(b, a) * 180 / Math.PI + 360) % 360, n: Number(m[8]), line: line.trim() };
  });
}
function texture(image, mode, args) {
  return run(node, [path.join(lookStats, 'texture.cjs'), image, mode, ...args.map(String)]).stdout.trim();
}
function corr(image, region) {
  const line = texture(image, 'corr', region);
  const m = /sd L\* ([\d.]+)\s+corr length x ([\d.NaN]+) px\s+y ([\d.NaN]+) px\s+ratio x\/y ([\d.NaN]+)/.exec(line);
  return { region, line, sdL: m && Number(m[1]), x: m && Number(m[2]), y: m && Number(m[3]), ratio: m && Number(m[4]) };
}
const regionString = cells => cells.map(c => `${c.name}:${c.x}:${c.y}:${c.width}:${c.height}`).join(';');

async function render(names, metrics) {
  const session = await captureSession();
  try {
    for (const name of names) {
      const [view, seconds, angle = 0] = ALL[name];
      let attempt = 0;
      for (;;) {
        const browser = await launch({ dumpio: false });
        // A hung page (seen once: no progress for hours after navigation) is closed so the attempt fails and retries.
        const watchdog = setTimeout(() => { console.log(`${name}: attempt exceeded 10 min, closing browser`); browser.close().catch(() => {}); }, 600000);
        try {
          metrics.browser = await browser.version();
          const page = await openPage(browser, session.url, { lookdev: '', width: '3840', height: '2160', aa: 'off', typeface: 'adobe', view, ...(angle ? { angle: String(angle) } : {}) });
          await session.capture(page, name, temp(`${name}-2160.png`), { seconds });
          const still = metrics.stills[name] = { view, seconds, angle, camera: (await page.evaluate(() => window.strata.device())).camera,
            octavePeriods: await page.evaluate(() => window.strata.octaveProjection()) };
          if (SIDES[name]) {
            // The outer face that yields the most band cells is the one facing the camera at this azimuth.
            still.sideFaces = await page.evaluate(() => ['outer-0', 'outer-1', 'outer-2', 'outer-3'].map(faceId => ({ faceId,
              cells: window.strata.bandCells(3, { width: 40, height: 20, faceId }), thin: window.strata.bandCells(3, { width: 40, height: 10, faceId }) })));
          } else if (view === 'turntable') {
            still.bandCells = await page.evaluate(() => window.strata.bandCells(3, { width: 40, height: 20 }));
            still.thinBandCells = await page.evaluate(() => window.strata.bandCells(3, { width: 40, height: 10 }));
            still.thinnestBandCells = await page.evaluate(() => window.strata.bandCells(3, { width: 40, height: 6 }));
            still.corrRegions = await page.evaluate(() => window.strata.bandCells(2, { width: 120, height: 40 }));
            still.corrRegionsShort = await page.evaluate(() => window.strata.bandCells(2, { width: 120, height: 24 }));
            still.lipOverhang = await page.evaluate(() => window.strata.lipOverhang());
            const coverage = await page.evaluate(() => window.strata.coverage());
            fs.writeFileSync(temp(`${name}-mask-2160.png`), Buffer.from(coverage.png, 'base64'));
            still.lights = (await page.evaluate(() => window.strata.device())).lights;
          }
          if (view === 'trench') {
            still.backWalls = await page.evaluate(() => window.strata.layerTable.faces.filter(face => face.inward && face.id.endsWith('-2') && face.id !== 'well-pit-2')
              .map(face => ({ faceId: face.id, cells: window.strata.bandCells(2, { width: 40, height: 20, faceId: face.id }), thin: window.strata.bandCells(2, { width: 40, height: 10, faceId: face.id }) })));
          }
          if (view === 'cut') {
            still.inclusionDensity = await page.evaluate(() => window.strata.inclusionDensity());
            still.ringTones = await page.evaluate(() => window.strata.ringTones());
            still.inclusionTotals = (await page.evaluate(() => window.strata.device())).strata.inclusionsByBand;
          }
          break;
        } catch (error) {
          if (++attempt >= 3) throw error;
          console.log(`${name}: capture failed (${error.message.split('\n')[0]}), retrying`);
        } finally { clearTimeout(watchdog); await browser.close().catch(() => {}); }
      }
      ffmpeg(['-i', temp(`${name}-2160.png`), '-vf', 'scale=1920:1080:flags=lanczos', '-frames:v', '1', dest(name)]);
      if (!SIDES[name]) ffmpeg(['-i', out(`${name}.png`), '-vf', 'scale=540:304:flags=lanczos', '-frames:v', '1', out(`${name}-540.png`)]);
      metrics.stills[name].fileSha256 = sha256(fs.readFileSync(dest(name)));
      console.log(`${name} captured`);
    }
  } finally { await session.close(); }
}

// Colour of every band cell (40×20, else 40×10, else 40×6) and the neighbour-band table on one face of one image.
function bandTable(image, deltaE2000, bandCells, thinCells, thinnestCells, prefix = 'band') {
  const cells = bandCells.bands.map(band => {
    const thin = thinCells?.bands.find(item => item.band === band.band), thinnest = thinnestCells?.bands.find(item => item.band === band.band);
    const chosen = band.cells.length ? band.cells : thin?.cells.length ? thin.cells : thinnest?.cells ?? [];
    return { band: band.band, size: chosen.length ? `${chosen[0].width}x${chosen[0].height}` : 'none', projectedThicknessPx: band.projectedThicknessPx,
      cells: chosen.map((cell, i) => ({ name: `${prefix}${band.band}-${i + 1}`, x: cell.x, y: cell.y, width: cell.width, height: cell.height })) };
  });
  const rows = colour(image, regionString(cells.flatMap(band => band.cells)));
  for (const band of cells) {
    band.colour = rows.filter(row => row.name.startsWith(`${prefix}${band.band}-`));
    const n = band.colour.length;
    band.mean = n ? ['L', 'a', 'b', 'sdL'].reduce((acc, key) => ({ ...acc, [key]: band.colour.reduce((s, row) => s + row[key], 0) / n }), {}) : null;
  }
  const present = cells.filter(band => band.mean);
  const neighbours = present.slice(1).map((band, i) => {
    const p = present[i].mean, q = band.mean;
    return { pair: [present[i].band, band.band], adjacent: band.band === present[i].band + 1, dL: q.L - p.L, da: q.a - p.a, db: q.b - p.b, CIEDE2000: deltaE2000([p.L, p.a, p.b], [q.L, q.a, q.b]) };
  });
  return { bands: cells, neighbours };
}

async function measure(metrics) {
  const { deltaE2000 } = await import('../src/soil-colour.js');
  for (const name of Object.keys(SIDES)) {
    const side = metrics.stills[name];
    if (!side?.sideFaces || !fs.existsSync(dest(name))) continue;
    const best = side.sideFaces.reduce((p, q) => q.cells.bands.reduce((s, b) => s + b.cells.length, 0) > p.cells.bands.reduce((s, b) => s + b.cells.length, 0) ? q : p);
    side.face = best.faceId;
    side.table = bandTable(dest(name), deltaE2000, best.cells, best.thin);
  }
  const checks = require('./round6-checks.cjs'), hero = metrics.stills['turntable-frame-180'], ring = metrics.stills['ring-well-closeup'];
  if (hero && fs.existsSync(temp('turntable-frame-180-mask-2160.png')))
    hero.nearBlack = { ...checks.nearBlack(temp('turntable-frame-180-2160.png'), temp('turntable-frame-180-mask-2160.png')), resolution: '3840x2160',
      note: 'Single-frame smoke test of the 360-frame Stage B check; mask = coverage() white+red block pixels.' };
  if (hero && fs.existsSync(temp('turntable-frame-180-2160-semibold.png'))) {
    const widths = checks.typeWeightCheck(temp('turntable-frame-180-2160-semibold.png'), temp('turntable-frame-180-2160.png'), out('type-weight-check.png'));
    metrics.stemWidths = { semibold600Px: widths.semibold.meanPx, regular400Px: widths.regular.meanPx, ratio: widths.regular.meanPx / widths.semibold.meanPx,
      semiboldSource: 'work/turntable-frame-180-2160-semibold.png (A2 iteration before the Regular face was bundled)', method: widths.regular.method };
  }
  const bar = JSON.parse(run(node, [path.join(root, 'scripts', 'round6-scale-bar.mjs')]).stdout);
  for (const name of ['turntable-frame-180', 'overview']) if (fs.existsSync(out(`${name}.png`))) {
    const segments = bar.projected[name].segments;
    bar.projected[name].colour = colour(out(`${name}.png`), segments.map(s => `seg${s.index}-${s.colour}:${Math.round(s.centre1080[0] - 2)}:${Math.round(s.centre1080[1] - 1)}:4:2`).join(';'));
    const mean = key => { const rows = bar.projected[name].colour.filter(row => row.name.endsWith(key)); return rows.reduce((s, row) => s + row.L, 0) / rows.length; };
    bar.projected[name].boneMinusGreyL = mean('bone') - mean('grey');
  }
  metrics.scaleBar = bar;
  metrics.diagnoses = {
    sawtooth: 'Shadow acne from the key light (VSM, 2048² over 50 m = 2.4 cm texels) at grazing incidence: the block cut faces self-shadowed just above the plinth line and the plinth self-shadowed along its lower edge, in a regular texel staircase. Evidence (work/sawtooth/): teeth vanish with key shadows off, with block+plinth casting off, with normalBias 0.08, or bias −0.004; a 4096 map only halves their spacing; plinth receive off removes the lower-edge row. Fix: key normalBias 0.025 → 0.08 m and the plinth no longer receives shadows.',
    strayLine: 'Not isolated by a separate experiment. The only finite plane in the scene was the 160 m shadow-catcher (ShadowMaterial), whose edge and the ±25 m key shadow frustum boundary both move with the camera. Fix: a 26 m disc whose shadow alpha fades to zero between 17 and 23 m from the block centre (inside the frustum), so no plane or frustum edge can print. Verify in background-check.png.',
    dither: 'Background gradient evaluated in floating point at output resolution with mulberry32(60617) triangular dither of ±1 code value, drawn 1:1 with nearest filtering. Decoded-turntable check is Stage B.',
    trenchCornerStripes: 'Open. Vertical dashed stripes on the front face just below a trench corner (trench close-up, about x 1010-1090 y 830-1000 at 2160). Evidence (work/corner, work/bias, work/bias4096): they vanish with key shadows off, with block receive off and with normalBias 0.025; they stay with block and plinth casting off; they are faint at 0.04 and 0.055, and stronger with a 4096 map at 0.03 or 0.04. normalBias 0.025 brings the plinth-line teeth back, so 0.08 is kept. Cause not isolated.'
  };
  const trench = metrics.stills['trench-closeup'];
  if (trench?.backWalls) trench.backWallTables = trench.backWalls.map(wall => ({ faceId: wall.faceId,
    ...bandTable(out('trench-closeup.png'), deltaE2000, wall.cells, wall.thin, null, `${wall.faceId}-b`) }));
  if (hero) {
    const image = out('turntable-frame-180.png');
    hero.colour = { fixed: colour(image, FIXED['turntable-frame-180']) };
    // 40×20 cells where the band is thick enough; 40×10 cells for bands that project thinner (bands 1, 3 and 5).
    const cells = hero.bandCells.bands.map(band => {
      const thin = hero.thinBandCells.bands.find(item => item.band === band.band);
      const thinnest = hero.thinnestBandCells?.bands.find(item => item.band === band.band);
      const chosen = band.cells.length ? band.cells : thin.cells.length ? thin.cells : thinnest?.cells ?? [];
      return { band: band.band, size: chosen.length ? `${chosen[0].width}x${chosen[0].height}` : 'none', projectedThicknessPx: band.projectedThicknessPx,
        cells: chosen.map((cell, i) => ({ name: `band${band.band}-${i + 1}`, x: cell.x, y: cell.y, width: cell.width, height: cell.height })) };
    });
    const rows = colour(image, regionString(cells.flatMap(band => band.cells)));
    for (const band of cells) {
      band.colour = rows.filter(row => row.name.startsWith(`band${band.band}-`));
      const n = band.colour.length;
      band.mean = n ? ['L', 'a', 'b', 'sdL'].reduce((acc, key) => ({ ...acc, [key]: band.colour.reduce((s, row) => s + row[key], 0) / n }), {}) : null;
    }
    hero.colour.bands = cells;
    hero.neighbours = cells.slice(1).map((band, i) => {
      const p = cells[i].mean, q = band.mean;
      if (!p || !q) return { pair: [cells[i].band, band.band], missing: true };
      return { pair: [cells[i].band, band.band], dL: q.L - p.L, da: q.a - p.a, db: q.b - p.b, CIEDE2000: deltaE2000([p.L, p.a, p.b], [q.L, q.a, q.b]) };
    });
    // 120×40 where a band is that thick on the hero face; otherwise 120×24 (recorded per region).
    hero.corr = hero.corrRegions.bands.flatMap(band => {
      const cells = band.cells.length ? band.cells : hero.corrRegionsShort?.bands.find(item => item.band === band.band)?.cells ?? [];
      return cells.map(cell => ({ band: band.band, region: [cell.x, cell.y, cell.width, cell.height], ...corr(image, [cell.x, cell.y, cell.width, cell.height]) }));
    });
  }
  if (ring) {
    const image = out('ring-well-closeup.png');
    ring.colour = { fixed: colour(image, FIXED['ring-well-closeup']) };
    ring.corr = CLOSEUP_CORR.map(region => corr(image, region));
    ring.blobs = [[200, 400, 300, 200], [1300, 400, 300, 200]].map(region => texture(image, 'blobs', [...region, 7]));
  }
  for (const name of Object.keys(metrics.stills)) if (fs.existsSync(temp(`${name}-2160.png`))) {
    if (name === 'ring-well-closeup') ffmpeg(['-i', temp(`${name}-2160.png`), '-vf', 'crop=560:1440:1660:380', '-frames:v', '1', out('rings-2160crop.png')]);
    if (name === 'trench-closeup') ffmpeg(['-i', temp(`${name}-2160.png`), '-vf', 'crop=1000:500:1000:1700', '-frames:v', '1', out('plinth-2160crop.png')]);
  }
  if (fs.existsSync(out('overview.png')) && fs.existsSync(out('turntable-frame-180.png'))) {
    const checks = path.join(root, 'scripts', 'round6-checks.cjs');
    if (fs.existsSync(checks)) await require(checks).backgroundCheck([out('overview.png'), out('turntable-frame-180.png')], out('background-check.png'));
    else ffmpeg(['-i', out('overview.png'), '-i', out('turntable-frame-180.png'), '-filter_complex',
      '[0]lutrgb=r=clipval*6:g=clipval*6:b=clipval*6,scale=960:540[a];[1]lutrgb=r=clipval*6:g=clipval*6:b=clipval*6,scale=960:540[b];[a][b]vstack', '-frames:v', '1', out('background-check.png')]);
  }
}

function print(metrics) {
  const hero = metrics.stills['turntable-frame-180'], ring = metrics.stills['ring-well-closeup'];
  if (hero?.colour) {
    console.log('\nturntable-frame-180 fixed'); for (const row of hero.colour.fixed) console.log(`  ${row.line}`);
    for (const band of hero.colour.bands) {
      console.log(`band ${band.band} (${band.size})`); for (const row of band.colour) console.log(`  ${row.line}  hue=${row.hue.toFixed(1)}`);
    }
    console.log('neighbours'); for (const n of hero.neighbours) console.log(`  ${n.pair.join('-')}: ${n.missing ? 'missing' : `dL ${n.dL.toFixed(1)} da ${n.da.toFixed(1)} db ${n.db.toFixed(1)} dE00 ${n.CIEDE2000.toFixed(1)}`}`);
    console.log('hero corr'); for (const c of hero.corr) console.log(`  band ${c.band}: ${c.line}`);
    console.log(`lip overhang max ${JSON.stringify(hero.lipOverhang?.maximumOutwardMetres ?? hero.lipOverhang)}`);
  }
  for (const name of Object.keys(SIDES)) for (const n of metrics.stills[name]?.table?.neighbours ?? [])
    console.log(`${name} ${metrics.stills[name].face} ${n.pair.join('-')}: dL ${n.dL.toFixed(1)} dE00 ${n.CIEDE2000.toFixed(1)}`);
  for (const wall of metrics.stills['trench-closeup']?.backWallTables ?? []) {
    console.log(`back wall ${wall.faceId}: bands ${wall.bands.filter(b => b.mean).map(b => `${b.band}:L${b.mean.L.toFixed(1)}/sd${b.mean.sdL.toFixed(1)}`).join(' ')}`);
    for (const n of wall.neighbours) console.log(`  ${n.pair.join('-')}: dL ${n.dL.toFixed(1)} dE00 ${n.CIEDE2000.toFixed(1)}`);
  }
  if (ring?.colour) {
    console.log('\nring-well-closeup fixed'); for (const row of ring.colour.fixed) console.log(`  ${row.line}  hue=${row.hue.toFixed(1)}`);
    console.log('close-up corr'); for (const c of ring.corr) console.log(`  ${c.line}`);
    for (const line of ring.blobs) console.log(line);
  }
}

async function main() {
  const args = process.argv.slice(2), measureOnly = args.includes('--measure-only');
  const names = args.filter(arg => !arg.startsWith('--'));
  for (const name of names) if (!ALL[name]) throw new Error(`Unknown still ${name}`);
  fs.mkdirSync(work, { recursive: true });
  const file = out('stage-a2-metrics.json');
  const metrics = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { stage: 'A2', revision: 6, stills: {} };
  metrics.method = '3840×2160 no MSAA → Lanczos 1920×1080 and 540×304; colour from output/review/look-stats/colour.ps1 and texture from texture.cjs, both run unedited.';
  if (!measureOnly) {
    const hash = inputHash(), force = args.includes('--force');
    metrics.inputHash = hash;
    metrics.inputHashScope = inputFiles();
    const stale = (names.length ? names : Object.keys(ALL)).filter(name => force || metrics.stills[name]?.inputHash !== hash
      || !fs.existsSync(dest(name)) || !fs.existsSync(temp(`${name}-2160.png`)));
    for (const name of (names.length ? names : Object.keys(ALL)).filter(name => !stale.includes(name))) console.log(`${name}: cached (input hash unchanged)`);
    await render(stale, metrics);
    for (const name of stale) metrics.stills[name].inputHash = hash;
  }
  await measure(metrics);
  fs.writeFileSync(file, JSON.stringify(metrics, null, 2) + '\n');
  print(metrics);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
