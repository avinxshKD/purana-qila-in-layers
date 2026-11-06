'use strict';
// Drives scripts/site-tier/world.html in one fresh browser (fresh temporary profile, so no shader disk cache) inside
// one gpu-lock hold (watchdog 9 min).
//   node scripts/site-tier/world-harness.cjs --out <new folder> [--software] [--w 1440 --h 900] [--jobs cold,states,serial,frames,diff]
//     [--repeats N] [--programs merged|split] [--background css|texture] [--diff split-texture,merged-texture,...] (first is the baseline)
//     [--inject] (renderer made first and passed in) [--only cut-0,year--100,...] (states job subset)
//     [--query prefetch=1,uploads=off] (extra page query parameters); a job may carry arguments: warmFrames:mode=orbit+width=1170
// Jobs besides the page's own: memopts (memory options, MEM_OPTIONS below; after each configuration the GPU process's
// dedicated and shared GPU memory is read from the Windows 'GPU Process Memory' counters); memnew (the accepted memory
// profile against the old defaults, with review crops and full frames).
// software: SwiftShader (smoke only; does not wait for AC). Writes harness.json and frame PNGs.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { launch, serve } = require('../browser.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const args = process.argv.slice(2), get = k => { const i = args.indexOf(k); return i < 0 ? undefined : args[i + 1]; };
if (!get('--out')) throw new Error('--out is required');
const out = path.resolve(get('--out')), software = args.includes('--software');
const w = Number(get('--w') ?? 1440), h = Number(get('--h') ?? 900), jobs = (get('--jobs') ?? 'cold,states,serial,frames').split(','), repeats = Number(get('--repeats') ?? 1);
if (fs.existsSync(path.join(out, 'harness.json'))) throw new Error(`${out} already has harness.json`);
fs.mkdirSync(out, { recursive: true });
const query = (get('--query') ?? '').split(',').filter(Boolean).map(kv => '&' + kv.split('=').map(encodeURIComponent).join('=')).join('');
// Each entry is one page call; baselines precede the variants compared with them.
const MEM_OPTIONS = [
  { name: '1440x900 baseline', size: [1440, 900], baseline: true },
  { name: '1440x900 blur target without depth', size: [1440, 900], shadow: { blurDepth: false } },
  { name: '1440x900 VSM 1024', size: [1440, 900], shadow: { size: 1024 } },
  { name: '1440x900 VSM 1024 radius 3.5', size: [1440, 900], shadow: { size: 1024, radius: 3.5 } },
  { name: '2880x1800 baseline', size: [2880, 1800], baseline: true },
  { name: '2880x1800 MSAA off', size: [2880, 1800], antialias: false },
  { name: '2880x1800 VSM 1024 radius 3.5', size: [2880, 1800], shadow: { size: 1024, radius: 3.5 } },
  { name: '1170x2532 baseline', size: [1170, 2532], baseline: true },
  { name: '1170x2532 MSAA off', size: [1170, 2532], antialias: false },
  { name: '1170x2532 VSM 1024', size: [1170, 2532], shadow: { size: 1024 } },
  { name: '1170x2532 VSM 1024 radius 3.5', size: [1170, 2532], shadow: { size: 1024, radius: 3.5 } },
  { name: 'DPR cap 2 at 390x844@3 (780x1688)', size: [780, 1688], compare: '1170x2532' },
  { name: 'DPR cap 2 + MSAA off at 390x844@3', size: [780, 1688], antialias: false, compare: '1170x2532' },
  { name: 'DPR cap 1.5 at 390x844@3 (585x1266)', size: [585, 1266], compare: '1170x2532' },
  { name: 'DPR cap 1.5 at 1440x900@2 (2160x1350)', size: [2160, 1350], compare: '2880x1800' },
  { name: 'reference 1440x900 (DPR 1 at 1440x900@2 for scale)', size: [1440, 900], compare: '2880x1800' }
];
// memnew: the accepted memory profile against the previous defaults (old: the blur target with a depth buffer, MSAA,
// the 2048 key VSM at radius 7), with kept frames for the review crops (CROPS) and full frames (FULL).
const OLD = { shadow: { blurDepth: true } };
const MEM_NEW = [
  { name: 'old 1440x900', size: [1440, 900], ...OLD, baseline: true, keep: true },
  { name: 'new 1440x900 (blur target without depth)', size: [1440, 900], keep: true },
  { name: 'old 2880x1800 (1440x900@2)', size: [2880, 1800], ...OLD, baseline: true, keep: true },
  { name: 'new 2880x1800 (1440x900@2: MSAA off, blur target without depth)', size: [2880, 1800], antialias: false, keep: true },
  { name: 'old 1170x2532 (390x844@3)', size: [1170, 2532], ...OLD, baseline: true, keep: true },
  { name: 'phone shadow only at 1170x2532 (VSM 1024 radius 3.5, MSAA on)', size: [1170, 2532], phone: true, keep: true },
  { name: 'cap 2 only at 390x844@3 (780x1688, MSAA on, old shadow)', size: [780, 1688], ...OLD, compare: '1170x2532' },
  { name: 'new 390x844@3 (cap 2: 780x1688, MSAA off, VSM 1024 radius 3.5, blur target without depth)', size: [780, 1688], antialias: false, phone: true, compare: '1170x2532', keep: true }
];
const CROPS = [
  { tag: 'a-1440x900@2-msaa-off', a: MEM_NEW[2].name, b: MEM_NEW[3].name, years: [2023, 199], w: 480, h: 320, count: 2 },
  { tag: 'b-390x844@3-shadow', a: MEM_NEW[4].name, b: MEM_NEW[7].name, select: MEM_NEW[5].name, years: [2023, 199], w: 480, h: 320, count: 2 },
  { tag: 'blur-depth-1440x900', a: MEM_NEW[0].name, b: MEM_NEW[1].name, years: [2023], w: 480, h: 320, count: 1 }
];
const FULL = [{ tag: 'c-390x844@3', a: MEM_NEW[4].name, b: MEM_NEW[7].name, year: 2023 }];
function gpuProcessMemory(browserPid) {
  const ps = c => execFileSync('powershell.exe', ['-NoProfile', '-Command', c], { encoding: 'utf8', timeout: 60000 });
  const gpuPid = ps(`(Get-CimInstance Win32_Process -Filter 'ParentProcessId=${browserPid}' | Where-Object { $_.CommandLine -like '*--type=gpu-process*' } | Select-Object -First 1).ProcessId`).trim();
  if (!gpuPid) return null;
  const lines = ps(`(Get-Counter '\\GPU Process Memory(pid_${gpuPid}_*)\\Dedicated Usage','\\GPU Process Memory(pid_${gpuPid}_*)\\Shared Usage').CounterSamples | ForEach-Object { $_.Path + '|' + $_.CookedValue }`).trim().split(/\r?\n/);
  const sum = { gpuPid: Number(gpuPid), dedicatedBytes: 0, sharedBytes: 0 };
  for (const l of lines) { const [p, v] = l.split('|'); if (/dedicated usage$/i.test(p)) sum.dedicatedBytes += Number(v); else if (/shared usage$/i.test(p)) sum.sharedBytes += Number(v); }
  return sum;
}
(async () => {
  const server = await serve({ port: 5196 });
  try {
    await withGpu(`strata-site-tier-world-harness${software ? ':swiftshader' : ''}`, async () => {
      const browser = await launch({ software }), started = Date.now(), result = { software, w, h, jobs: {} };
      const watchdog = setTimeout(() => { console.log('harness exceeded 9 min, closing browser'); browser.close().catch(() => {}); }, 540000);
      try {
        const page = (await browser.pages())[0] || await browser.newPage(), errors = [];
        page.setDefaultTimeout(500000);
        page.on('pageerror', e => errors.push(e.message));
        page.on('error', e => { errors.push(e.message); console.error('[renderer crash]', e.message); });
        page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); if (m.type() === 'warning') console.log('[warn]', m.text().slice(0, 300)); });
        page.on('response', r => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`HTTP ${r.status()} ${r.url()}`); });
        await page.setViewport({ width: w, height: h });
        const navigated = Date.now();
        await page.goto(`${server.url}/scripts/site-tier/world.html?w=${w}&h=${h}&programs=${get('--programs') ?? 'merged'}&background=${get('--background') ?? 'css'}${query}${get('--diff') ? `&diff=${encodeURIComponent(get('--diff'))}` : ''}${args.includes('--inject') ? '&inject=1' : ''}`);
        await page.waitForFunction(() => window.harness?.ready || window.harnessError, { polling: 100 });
        result.navigationToReadyMs = Date.now() - navigated;
        const failed = await page.evaluate(() => window.harnessError); if (failed || errors.length) throw new Error([failed, ...errors].filter(Boolean).join('\n'));
        for (const job of jobs) {
          const t = Date.now();
          if (job === 'frames') {
            for (const year of [2023, 199]) {
              const r = await page.evaluate(y => window.harness.run('frame', { year: y }), year);
              fs.writeFileSync(path.join(out, `frame-${year}.png`), Buffer.from(r.png, 'base64'));
            }
            result.jobs.frames = { seconds: (Date.now() - t) / 1000 };
          } else if (job === 'diff') {
            const r = await page.evaluate(() => window.harness.run('diff', {}));
            for (const p of r.pairs) if (p.diffImage) { const name = `diff-${p.year}-${p.against.programs}-${p.against.background}.png`; fs.writeFileSync(path.join(out, name), Buffer.from(p.diffImage, 'base64')); p.diffImage = name; }
            result.jobs.diff = { ...r, seconds: (Date.now() - t) / 1000 };
          } else if (job === 'memopts') {
            const rows = [];
            for (const option of MEM_OPTIONS) {
              const r = await page.evaluate(o => window.harness.run('memVariant', o), option);
              if (r.diffImage) { const name = `memopts-${rows.length}-diff-${r.diffImage.year}.png`; fs.writeFileSync(path.join(out, name), Buffer.from(r.diffImage.png, 'base64')); r.diffImage = { ...r.diffImage, png: name }; }
              await new Promise(res => setTimeout(res, 1500));
              r.gpuProcess = software ? null : gpuProcessMemory(browser.process().pid);
              rows.push(r); console.log('memopts', option.name, r.gpuProcess ? `${(r.gpuProcess.dedicatedBytes / 1048576).toFixed(1)} MiB dedicated, ${(r.gpuProcess.sharedBytes / 1048576).toFixed(1)} MiB shared` : '');
              if (errors.length) throw new Error(errors.join('\n'));
            }
            result.jobs.memopts = { rows, seconds: (Date.now() - t) / 1000 };
          } else if (job === 'memnew') {
            const rows = [], crops = [], full = [];
            for (const option of MEM_NEW) {
              const r = await page.evaluate(o => window.harness.run('memVariant', o), option);
              if (r.diffImage) { const name = `memnew-${rows.length}-diff-${r.diffImage.year}.png`; fs.writeFileSync(path.join(out, name), Buffer.from(r.diffImage.png, 'base64')); r.diffImage = { ...r.diffImage, png: name }; }
              await new Promise(res => setTimeout(res, 1500));
              r.gpuProcess = software ? null : gpuProcessMemory(browser.process().pid);
              rows.push(r); console.log('memnew', option.name, r.gpuProcess ? `${(r.gpuProcess.dedicatedBytes / 1048576).toFixed(1)} MiB dedicated, ${(r.gpuProcess.sharedBytes / 1048576).toFixed(1)} MiB shared` : '');
              if (errors.length) throw new Error(errors.join('\n'));
            }
            for (const c of CROPS) {
              const r = await page.evaluate(o => window.harness.run('memCrops', o), c);
              r.rows.forEach((row, i) => { const name = `crop-${c.tag}-${row.year}-${i + 1}.png`; fs.writeFileSync(path.join(out, name), Buffer.from(row.png, 'base64')); row.png = name; });
              crops.push({ tag: c.tag, ...r, layout: 'left: a (old), right: b (new); 100% of the a raster' });
            }
            for (const c of FULL) {
              const r = await page.evaluate(o => window.harness.run('memFull', o), c);
              for (const side of ['a', 'b']) { const name = `full-${c.tag}-${c.year}-${side === 'a' ? 'old' : 'new'}.png`; fs.writeFileSync(path.join(out, name), Buffer.from(r[side].png, 'base64')); r[side].png = name; }
              full.push({ tag: c.tag, ...r });
            }
            result.jobs.memnew = { rows, crops, full, seconds: (Date.now() - t) / 1000 };
          } else {
            // name:key=value+key=value (numbers parsed) adds arguments; a repeated name is saved as name#2, name#3.
            const [name, spec] = job.split(':'), extra = Object.fromEntries((spec ?? '').split('+').filter(Boolean).map(kv => { const [k, v] = kv.split('='); return [k, v !== '' && !Number.isNaN(Number(v)) ? Number(v) : v]; }));
            const key = Object.keys(result.jobs).some(k => k.split('#')[0] === name) ? `${name}#${Object.keys(result.jobs).filter(k => k.split('#')[0] === name).length + 1}` : name;
            result.jobs[key] = { ...await page.evaluate((j, a) => window.harness.run(j, a), name, { repeats, only: get('--only')?.split(',') ?? null, ...extra }), args: extra, seconds: (Date.now() - t) / 1000 };
          }
          if (errors.length) throw new Error(errors.join('\n'));
          console.log(job, (Date.now() - t) / 1000, 's');
        }
        result.seconds = (Date.now() - started) / 1000;
        fs.writeFileSync(path.join(out, 'harness.json'), JSON.stringify(result, null, 1) + '\n');
        console.log('harness seconds', result.seconds);
      } finally { clearTimeout(watchdog); await browser.close().catch(() => {}); }
    }, { requireAc: !software });
  } finally { await server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
