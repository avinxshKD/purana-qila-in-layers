'use strict';
// M1 stills for the composite era section: hero stills (cold open, the 10 era ends, the 3 season ends), the trench and
// ring-well close-ups and the square-on side view in the final state, each with an era id pass; then near-black,
// per-era band cells, the fixed A3 cells and texture regions, measured with output/review/look-stats run unedited.
//   node scripts/modelling/m1-stills.cjs [render] [measure] [--force] [--only=name,name]
// Every capture runs in its own browser inside one scripts/gpu-lock.cjs hold; a capture that fails twice stops the run.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { root, launch, openPage } = require('../browser.cjs');
const { captureSession } = require('../capture-session.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const { ffmpeg, run, sha256, bin } = require('../media.cjs');
const checks = require('../round6-checks.cjs');
const { inputHash } = require('../input-hash.cjs');
const directory = path.join(root, 'output', 'lookdev', 'modelling', 'm1'), work = path.join(directory, 'work');
const out = name => path.join(directory, name), temp = name => path.join(work, name);
const lookStats = path.join(root, 'output', 'review', 'look-stats');
const node = process.execPath;
// Kit identity at render time: SHA-256 of every src/features file, and of the sorted name+bytes bundle.
function kitHashes() {
  const dir = path.join(root, 'src', 'features'), files = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isFile()).sort();
  const bundle = require('node:crypto').createHash('sha256'), perFile = {};
  for (const f of files) { const bytes = fs.readFileSync(path.join(dir, f)); perFile[f] = sha256(bytes); bundle.update(f); bundle.update('\0'); bundle.update(bytes); bundle.update('\0'); }
  return { bundle: bundle.digest('hex'), perFile };
}
const ERAS = ['pre-mauryan', 'mauryan', 'sunga', 'kushan', 'gupta', 'post-gupta', 'rajput', 'sultanate', 'mughal', 'modern-fill'];
const ones = Array(10).fill(1), upTo = n => ERAS.map((_, i) => i <= n ? 1 : 0);
const FINAL = { schemaVersion: 1, eraIndex: 9, deposits: ones, features: ones, excavation: 1 };
// Hero camera: the turntable at 6 s (azimuth 35 degrees), as the A3 hero frame.
const STILLS = {
  'cold-open': { view: 'turntable', seconds: 6, state: FINAL },
  ...Object.fromEntries(ERAS.map((id, i) => [`era-${String(i + 1).padStart(2, '0')}-${id}`, { view: 'turntable', seconds: 6,
    state: { schemaVersion: 1, eraIndex: i, deposits: upTo(i), features: upTo(i), excavation: 0 } }])),
  ...Object.fromEntries([1, 2, 3].map(s => [`season-${s}-end`, { view: 'turntable', seconds: 6, state: { ...FINAL, excavation: s * 4 / 12 } }])),
  'trench-closeup': { view: 'trench', seconds: 4, state: FINAL },
  'ring-well-closeup': { view: 'cut', seconds: 4, state: FINAL },
  'side-square': { view: 'side-square', seconds: 4, state: FINAL }
};
const REPEATS = ['cold-open', 'trench-closeup'];
const CAPTURES = { ...STILLS, ...Object.fromEntries(REPEATS.map(name => [`repeat-${name}`, STILLS[name]])) };
const master = name => name.startsWith('repeat-') ? temp(`repeat/${name.slice(7)}-2160.png`) : temp(`${name}-2160.png`);
const ids = name => temp(`${name}-ids-2160.png`), ids1080 = name => temp(`${name}-ids-1080.png`), mask1080 = name => temp(`${name}-mask-1080.png`);
const still = name => out(`${name}.png`);
// A3 fixed cells and texture regions at 1080 (same cameras: hero = turntable-frame-180, ring = ring-well-closeup).
const FIXED = {
  'cold-open': 'top:680:400:40:20;grey:680:460:40:20;yellow:680:570:40:20;salmon:680:670:40:20;rightface:1240:400:220:150',
  'ring-well-closeup': 'ring-top:900:300:140:20;ring-upper:900:420:140:20;ring-mid:900:560:140:20;ring-low:900:720:140:20;ring-bottom:900:830:140:20;face-left:200:400:300:200;face-right:1300:400:300:200;pit-wall:780:400:60:200;ledge:900:160:200:30;bottom-band:1200:950:400:60;pit-floor:800:880:100:30;cell-face-left:300:450:40:20;cell-face-right:1400:500:40:20;cell-ring-upper:950:422:40:14;cell-ring-low:950:722:40:14;cell-bottom-band:1300:960:40:20'
};
const TEXTURE = {
  'cold-open': { corr: [[705, 380, 90, 150], [840, 430, 100, 260], [1240, 400, 220, 150]], stripes: [[680, 555, 50, 85]] },
  'trench-closeup': { corr: [[940, 160, 90, 480]], stripes: [[870, 640, 80, 110], [520, 430, 80, 130], [160, 140, 60, 160]] },
  'ring-well-closeup': { corr: [[200, 400, 300, 200], [1300, 400, 300, 200], [1100, 300, 500, 150]], stripes: [[730, 760, 80, 300], [250, 160, 230, 560]] },
  'side-square': { corr: [[300, 300, 300, 200], [800, 500, 300, 200], [1300, 700, 300, 200]] }
};
// Band cells: outer faces facing z (B = 1) and x (B = 2, the right side face) on the hero stills, also dug walls facing z (B = 5) on the trench close-up.
const CELL_SURFACES = { 'cold-open': [1, 2], 'trench-closeup': [1, 5], 'side-square': [2] };

function colour(image, regions) {
  if (!regions) return [];
  const result = run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(lookStats, 'colour.ps1'), '-Image', image, '-Regions', regions]);
  return result.stdout.split(/\r?\n/).filter(Boolean).map(line => {
    const m = /^(\S+)\s+L\*=\s*([-\d.]+)\s+a\*=\s*([-\d.]+)\s+b\*=\s*([-\d.]+)\s+C\*\(of mean\)=\s*([-\d.]+)\s+meanC\*=\s*([-\d.]+)\s+sdL\*=\s*([-\d.]+)\s+n=(\d+)/.exec(line.trim());
    if (!m) throw new Error(`Unparsed colour line: ${line}`);
    const [L, a, b, C, meanC, sdL] = m.slice(2, 8).map(Number);
    return { name: m[1], L, a, b, C, meanC, sdL, n: Number(m[8]), line: line.trim() };
  });
}
const texture = (image, mode, args) => run(node, [path.join(lookStats, 'texture.cjs'), image, mode, ...args.map(String)]).stdout.trim();
function corr(image, region) {
  const line = texture(image, 'corr', region);
  const m = /sd L\* ([\d.]+)\s+corr length x ([\d.NaN]+) px\s+y ([\d.NaN]+) px\s+ratio x\/y ([\d.NaN]+)/.exec(line);
  return { region, line, sdL: m && Number(m[1]), x: m && Number(m[2]), y: m && Number(m[3]), ratio: m && Number(m[4]) };
}
function stripes(image, region) {
  const line = texture(image, 'stripes', region);
  const rms = /rms ([\d.]+)/i.exec(line), peak = /peak ([\d.]+)/i.exec(line);
  return { region, line, rms: rms && Number(rms[1]), peak: peak && Number(peak[1]) };
}
function writeRGB(file, width, height, data) {
  const r = spawnSync(bin('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${width}x${height}`, '-i', 'pipe:0', '-frames:v', '1', file], { input: data });
  if (r.status !== 0) throw new Error(`ffmpeg encode failed for ${file}: ${r.stderr}`);
}

async function captureOne(session, name) {
  const { view, seconds, state } = CAPTURES[name], repeat = name.startsWith('repeat-');
  fs.mkdirSync(path.dirname(master(name)), { recursive: true });
  return withGpu(`strata-m1:${name}`, async () => {
    const browser = await launch({ dumpio: false });
    const watchdog = setTimeout(() => { console.log(`${name}: exceeded 4 min, closing browser`); browser.close().catch(() => {}); }, 240000);
    try {
      const started = Date.now(), kitBefore = kitHashes();
      const page = await openPage(browser, session.url, { lookdev: '', soil: 'eras', labels: 'scale', width: '3840', height: '2160', aa: 'off', typeface: 'adobe', view });
      const tOpen = Date.now();
      const applied = await page.evaluate(s => { const warm = window.strata.warmState(s); const a = window.strata.applyState(s); return { warm, cutStep: a.cutStep, cutAssumesFullDeposits: a.cutAssumesFullDeposits, timings: a.timings }; }, state);
      const tApplied = Date.now();
      const capture = await session.capture(page, name, master(name), { seconds });
      const tCaptured = Date.now();
      const kitAfter = kitHashes();
      const record = { view, seconds, state, applied, capture, browser: await browser.version(), kit: { ...kitBefore, unchangedDuringCapture: kitBefore.bundle === kitAfter.bundle } };
      if (!record.kit.unchangedDuringCapture) throw new Error('src/features changed during the capture');
      if (!repeat) {
        const pass = await page.evaluate(() => window.strata.eraIds());
        fs.writeFileSync(ids(name), Buffer.from(pass.png, 'base64'));
        Object.assign(record, await page.evaluate(() => {
          const d = window.strata.device();
          return { camera: d.camera, eraBlock: d.eraBlock, labels: d.labels, labelBounds: window.strata.labelBounds?.() ?? null, titleBounds: window.strata.titleBounds?.() ?? null, info: window.strata.info() };
        }));
        record.idPassMethod = pass.method;
      }
      record.seconds_elapsed = (Date.now() - started) / 1000;
      record.phaseSeconds = { open: (tOpen - started) / 1000, apply: (tApplied - tOpen) / 1000, capture: (tCaptured - tApplied) / 1000, idsAndDevice: (Date.now() - tCaptured) / 1000 };
      console.log(name, JSON.stringify(record.phaseSeconds));
      return record;
    } finally { clearTimeout(watchdog); await browser.close().catch(() => {}); }
  });
}

async function render(metrics, { force, only }) {
  const hash = inputHash();
  metrics.inputHash = hash;
  const names = Object.keys(CAPTURES).filter(name => !only || only.includes(name));
  const stale = names.filter(name => force || metrics.captures[name]?.inputHash !== hash || !fs.existsSync(master(name)));
  console.log(`captures: ${stale.length} to render, ${names.length - stale.length} cached`);
  if (!stale.length) return;
  const session = await captureSession();
  try {
    for (const name of stale) {
      let record;
      for (let attempt = 1; ; attempt++) {
        try { record = await captureOne(session, name); break; }
        catch (error) {
          console.log(`${name}: attempt ${attempt} failed: ${error.message.split('\n')[0]}`);
          if (attempt >= 2) throw new Error(`${name} failed twice; stopping`);
        }
      }
      metrics.captures[name] = { ...record, inputHash: hash };
      fs.writeFileSync(out('m1-metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
      console.log(`${name} captured (${record.seconds_elapsed.toFixed(0)} s)`);
    }
  } finally { await session.close(); }
}

// Up to three 40x20 cells per era on the given surfaces of the 1080 id pass, with a 3 px margin of the same id all round,
// clear of the HUD by 6 px; picks at 20/50/80% of candidates in x, at least 60 px apart.
// Bands too thin for 40x20 fall back to 40x10, then 40x6 (as the A3 band table).
function eraCells(idFile, surfaces, exclusions) {
  const img = checks.readRGB(idFile), result = [];
  for (const surface of surfaces) for (let k = 0; k <= 10; k++) {
    let band;
    for (const height of [20, 10, 6]) { band = eraCellsOf(img, surface, k, exclusions, { height }); if (band.cells.length) break; }
    result.push(band);
  }
  return result;
}
function eraCellsOf(img, surface, k, exclusions, { width = 40, height = 20, margin = 3 } = {}) {
  const W = img.width, H = img.height;
  {
    const sat = new Int32Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) for (let x = 0, row = 0; x < W; x++) {
      const i = (y * W + x) * 3, ok = img.data[i + 1] >= 250 && Math.abs(img.data[i] - k * 20) <= 2 && img.data[i + 2] === surface ? 1 : 0;
      row += ok; sat[(y + 1) * (W + 1) + x + 1] = sat[y * (W + 1) + x + 1] + row;
    }
    const sum = (x0, y0, x1, y1) => sat[y1 * (W + 1) + x1] - sat[y0 * (W + 1) + x1] - sat[y1 * (W + 1) + x0] + sat[y0 * (W + 1) + x0];
    const candidates = [];
    for (let y = margin; y + height + margin <= H; y += 2) for (let x = margin; x + width + margin <= W; x += 4) {
      const area = (width + 2 * margin) * (height + 2 * margin);
      if (sum(x - margin, y - margin, x + width + margin, y + height + margin) !== area) continue;
      if (exclusions.some(e => x + width > e.x - 6 && x < e.x + e.width + 6 && y + height > e.y - 6 && y < e.y + e.height + 6)) continue;
      candidates.push({ x, y });
    }
    // One candidate per x column: the one nearest the middle of the band's run there.
    const columns = new Map();
    for (const c of candidates) { const list = columns.get(c.x) ?? []; list.push(c); columns.set(c.x, list); }
    const middles = [...columns.values()].map(list => list[Math.floor(list.length / 2)]).sort((p, q) => p.x - q.x);
    const chosen = [];
    for (const q of [.2, .5, .8]) {
      const pick = middles[Math.min(middles.length - 1, Math.floor(q * middles.length))];
      if (pick && !chosen.some(item => Math.abs(item.x - pick.x) < width + 20)) chosen.push(pick);
    }
    return { era: k, id: k === 0 ? 'silt' : ERAS[k - 1], surface, size: `${width}x${height}`, available: candidates.length, cells: chosen.map(c => ({ ...c, width, height })) };
  }
}

async function measure(metrics) {
  const { deltaE2000 } = await import('../../src/soil-colour.js');
  const lanczos = (input, output, w, h) => ffmpeg(['-i', input, '-vf', `scale=${w}:${h}:flags=lanczos`, '-frames:v', '1', output]);
  const kitFile = path.join(root, 'output', 'lookdev', 'features', 'kit-k2e.json');
  if (fs.existsSync(kitFile)) {
    const text = fs.readFileSync(kitFile, 'utf8'), current = kitHashes();
    metrics.kitCheck = { file: 'output/lookdev/features/kit-k2e.json', sha256: sha256(Buffer.from(text)), perStill: Object.fromEntries(Object.entries(metrics.captures).map(([name, c]) => [name,
      c.kit ? { bundle: c.kit.bundle, everyFileHashListed: Object.values(c.kit.perFile).every(h => text.includes(h)), sameAsNow: c.kit.bundle === current.bundle } : 'no kit hashes recorded'])) };
  } else metrics.kitCheck = 'kit-k2e.json not present at measure time';
  metrics.nearBlack = {}; metrics.bandCells = {}; metrics.colour = {}; metrics.texture = {}; metrics.labels = {};
  for (const name of Object.keys(STILLS)) {
    if (!fs.existsSync(master(name))) continue;
    const record = metrics.captures[name];
    lanczos(master(name), still(name), 1920, 1080);
    lanczos(still(name), out(`${name}-540.png`), 540, 304);
    record.file1080Sha256 = sha256(fs.readFileSync(still(name)));
    ffmpeg(['-i', ids(name), '-vf', 'scale=1920:1080:flags=neighbor', '-frames:v', '1', ids1080(name)]);
    // Block mask for the near-black test: era soil or feature pixels of the id pass.
    const id = checks.readRGB(ids1080(name)), maskData = Buffer.alloc(id.data.length);
    for (let i = 0; i < id.data.length; i += 3) if (id.data[i + 1] >= 250 || id.data[i + 2] === 255) maskData[i] = maskData[i + 1] = maskData[i + 2] = 255;
    writeRGB(mask1080(name), id.width, id.height, maskData);
    metrics.nearBlack[name] = checks.nearBlack(still(name), mask1080(name));
    const scale = 1080 / 2160, hud = [record.labelBounds, record.titleBounds].filter(Boolean).map(b => ({ x: b.x * scale, y: b.y * scale, width: b.width * scale, height: b.height * scale }));
    if (CELL_SURFACES[name]) {
      const bands = eraCells(ids1080(name), CELL_SURFACES[name], hud);
      const regions = bands.flatMap(b => b.cells.map((c, i) => `e${b.era}s${b.surface}-${i + 1}:${c.x}:${c.y}:${c.width}:${c.height}`));
      const rows = regions.length ? colour(still(name), regions.join(';')) : [];
      for (const band of bands) {
        band.colour = rows.filter(row => row.name.startsWith(`e${band.era}s${band.surface}-`));
        const n = band.colour.length;
        band.mean = n ? ['L', 'a', 'b', 'C', 'sdL'].reduce((acc, key) => ({ ...acc, [key]: band.colour.reduce((s, row) => s + row[key], 0) / n }), {}) : null;
      }
      const neighbours = [];
      for (const surface of CELL_SURFACES[name]) {
        const present = bands.filter(b => b.surface === surface && b.mean);
        for (let i = 1; i < present.length; i++) {
          const p = present[i - 1].mean, q = present[i].mean;
          neighbours.push({ surface, pair: [present[i - 1].id, present[i].id], dL: q.L - p.L, dE76: Math.hypot(q.L - p.L, q.a - p.a, q.b - p.b), CIEDE2000: deltaE2000([p.L, p.a, p.b], [q.L, q.a, q.b]) });
        }
      }
      metrics.bandCells[name] = { bands, neighbours, method: '40x20 final-1080 cells from the era id pass (3 px same-id margin, HUD + 6 px excluded), colour.ps1 unedited; surface 1 = outer faces facing z, 2 = outer faces facing x, 5 = dug walls facing z.' };
    }
    if (FIXED[name]) metrics.colour[name] = colour(still(name), FIXED[name]);
    if (TEXTURE[name]) metrics.texture[name] = { corr: (TEXTURE[name].corr ?? []).map(r => corr(still(name), r)), stripes: (TEXTURE[name].stripes ?? []).map(r => stripes(still(name), r)) };
    metrics.labels[name] = record.labels?.parts?.scaleLabels ?? null;
  }
  // Scale-bar labels: gap and cap height from the label layout (projected bar underside to glyph cap top), and a 3x crop
  // of each label with the bar from the 2160 master for a visual check.
  const labelRows = Object.entries(metrics.labels).flatMap(([name, list]) => (list ?? []).map(l => ({ still: name, text: l.text, gapPx1080: l.gapPx1080, capHeightPx1080: l.capHeightPx1080 })));
  metrics.labelSummary = { minGapPx1080: Math.min(...labelRows.map(r => r.gapPx1080)), minCapHeightPx1080: Math.min(...labelRows.map(r => r.capHeightPx1080)), rows: labelRows,
    method: 'labels.js layout: baseline placed SCALE_LABEL_GAP below the projected bar underside plus the cap height; values in final-1080 px.' };
  for (const name of ['cold-open', 'era-01-pre-mauryan']) {
    const list = metrics.labels[name]; if (!list?.length || !fs.existsSync(master(name))) continue;
    const xs = list.flatMap(l => [l.x, l.x + l.width]), ys = list.flatMap(l => [l.barBottomY - 40, l.y + l.height]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - 60)), y0 = Math.max(0, Math.floor(Math.min(...ys) - 20)), w = Math.ceil(Math.max(...xs) - x0 + 60), h = Math.ceil(Math.max(...ys) - y0 + 20);
    ffmpeg(['-i', master(name), '-vf', `crop=${w}:${h}:${x0}:${y0},scale=iw*1.5:ih*1.5:flags=neighbor`, '-frames:v', '1', out(`${name}-scale-labels-3x1080.png`)]);
  }
  // Brief section 4 colour targets on every era band cell mean: a* 2-6, b* 12-22, C* <= 22.
  metrics.colourTargets = Object.fromEntries(Object.entries(metrics.bandCells).map(([name, t]) => [name, t.bands.filter(b => b.mean).map(b => ({ id: b.id, surface: b.surface,
    a: +b.mean.a.toFixed(1), b: +b.mean.b.toFixed(1), C: +b.mean.C.toFixed(1), pass: b.mean.a >= 2 && b.mean.a <= 6 && b.mean.b >= 12 && b.mean.b <= 22 && b.mean.C <= 22 }))]));
  metrics.nearBlackSummary = { method: 'round6-checks.cjs nearBlack on the 1080 still: 4-connected regions >= 150 px below 5% Rec.709 luma inside the id-pass block mask (era soil + features).',
    allPass: Object.values(metrics.nearBlack).every(r => r.pass), darkestPercentile1Luma: Math.min(...Object.values(metrics.nearBlack).map(r => r.percentile1Luma)) };
  metrics.determinism = REPEATS.filter(name => fs.existsSync(master(`repeat-${name}`)) && fs.existsSync(master(name))).map(name => {
    const a = checks.readRGB(master(name)), b = checks.readRGB(master(`repeat-${name}`));
    let differing = 0, maximum = 0;
    for (let i = 0; i < a.data.length; i++) { const d = Math.abs(a.data[i] - b.data[i]); if (d) differing++; maximum = Math.max(maximum, d); }
    return { name, pixelExact: differing === 0, differingChannels: differing, maxChannelDifference: maximum, resolution: `${a.width}x${a.height}` };
  });
}

function print(metrics) {
  for (const [name, r] of Object.entries(metrics.nearBlack ?? {})) console.log(`near-black ${name}: ${r.pass ? 'pass' : 'FAIL'} p1 ${r.percentile1Luma.toFixed(3)} largest ${r.largestDarkRegionPx}`);
  for (const [name, t] of Object.entries(metrics.texture ?? {})) {
    for (const c of t.corr) console.log(`${name} corr ${c.region.join(',')}: ${c.line}`);
    for (const s of t.stripes) console.log(`${name} stripes ${s.region.join(',')}: ${s.line}`);
  }
  for (const [name, rows] of Object.entries(metrics.colour ?? {})) for (const row of rows) console.log(`${name} ${row.line}`);
  for (const [name, table] of Object.entries(metrics.bandCells ?? {})) {
    for (const band of table.bands) console.log(`${name} s${band.surface} ${band.id}: ${band.mean ? `L ${band.mean.L.toFixed(1)} a ${band.mean.a.toFixed(1)} b ${band.mean.b.toFixed(1)} C ${band.mean.C.toFixed(1)} sd ${band.mean.sdL.toFixed(1)} (${band.colour.length} x ${band.size})` : `none (${band.available})`}`);
    for (const n of table.neighbours) console.log(`${name} s${n.surface} ${n.pair.join('/')}: dL ${n.dL.toFixed(1)} dE76 ${n.dE76.toFixed(1)}`);
  }
  for (const d of metrics.determinism ?? []) console.log(`determinism ${d.name}: ${d.pixelExact ? 'pixel-exact' : `DIFFERS (${d.differingChannels} channels, max ${d.maxChannelDifference})`}`);
}

async function main() {
  const args = process.argv.slice(2), force = args.includes('--force');
  const only = args.find(a => a.startsWith('--only='))?.slice(7).split(',');
  const doRender = args.includes('render') || !args.includes('measure'), doMeasure = args.includes('measure') || !args.includes('render');
  fs.mkdirSync(work, { recursive: true });
  const file = out('m1-metrics.json');
  const metrics = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { stage: 'M1', captures: {} };
  metrics.method = '3840x2160 no MSAA, Lanczos to 1920x1080 and 540x304; colour.ps1 and texture.cjs from output/review/look-stats, run unedited.';
  if (doRender) await render(metrics, { force, only });
  if (doMeasure) await measure(metrics);
  fs.writeFileSync(file, JSON.stringify(metrics, null, 2) + '\n');
  if (doMeasure) print(metrics);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
