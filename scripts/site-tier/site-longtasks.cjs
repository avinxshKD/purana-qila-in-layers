'use strict';
// Main-thread tasks on the site page (site.html on the dev server) after its first presented frame, with the page left
// idle or orbited by a real pointer drag, attributed from a Chromium trace: each task over --over ms with the callback
// that ran it and the CPU profile's hottest frames inside it. One fresh headed browser per mode, each inside its own
// gpu-lock hold (requires AC; watchdog 9 min).
//   node scripts/site-tier/site-longtasks.cjs --out <new folder> [--modes idle,orbit] [--seconds 25] [--w 1440 --h 900 --dpr 1] [--over 50]
//     [--folder <built site folder>] (serve a production build under the Pages sub-path, as scripts/site/long-task-check.cjs, instead of the dev server's site.html)
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { launch, serve } = require('../browser.cjs');
const { withGpu } = require('../gpu-lock.cjs');
const { serveDist, BASE } = require('../site/deploy-check.cjs');
const args = process.argv.slice(2), get = k => { const i = args.indexOf(k); return i < 0 ? undefined : args[i + 1]; };
if (!get('--out')) throw new Error('--out is required');
const out = path.resolve(get('--out')), modes = (get('--modes') ?? 'idle,orbit').split(','), seconds = Number(get('--seconds') ?? 25);
const w = Number(get('--w') ?? 1440), h = Number(get('--h') ?? 900), dpr = Number(get('--dpr') ?? 1), overMs = Number(get('--over') ?? 50);
if (fs.existsSync(path.join(out, 'longtasks.json'))) throw new Error(`${out} already has longtasks.json`);
fs.mkdirSync(out, { recursive: true });
const CATEGORIES = ['toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute', 'blink.user_timing', 'disabled-by-default-v8.cpu_profiler', 'v8', 'disabled-by-default-v8.gc'];
const CHILD = new Set(['FunctionCall', 'TimerFire', 'FireIdleCallback', 'FireAnimationFrame', 'EventDispatch', 'v8.evaluateModule', 'EvaluateScript', 'v8.compile', 'MajorGC', 'MinorGC', 'V8.GCScavenger', 'V8.GCFinalizeMC', 'ParseHTML', 'Layout', 'UpdateLayoutTree', 'Paint', 'Decode Image', 'XHRReadyStateChange', 'ResourceReceivedData', 'v8.run']);
const short = url => (url || '').replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '');
const frameName = f => `${f.functionName || '(anonymous)'} ${short(f.url)}:${(f.lineNumber ?? -1) + 1}`;

function analyse(trace, alignPerfMs, firstPresentedMs) {
  const events = trace.traceEvents ?? trace;
  const mark = events.find(e => e.name === 'strata-align');
  if (!mark) throw new Error('alignment mark missing from the trace');
  const offsetUs = mark.ts - alignPerfMs * 1000, pid = mark.pid;
  const mainTid = events.find(e => e.ph === 'M' && e.name === 'thread_name' && e.pid === pid && e.args?.name === 'CrRendererMain')?.tid ?? mark.tid;
  const toPerf = ts => (ts - offsetUs) / 1000, fromUs = firstPresentedMs * 1000 + offsetUs;
  const main = events.filter(e => e.pid === pid && e.tid === mainTid && e.ph === 'X');
  const tasks = main.filter(e => e.name === 'RunTask' && e.ts >= fromUs).sort((a, b) => a.ts - b.ts);
  const children = main.filter(e => CHILD.has(e.name)).sort((a, b) => a.ts - b.ts);
  // CPU profile samples of the main thread.
  const nodes = new Map(), samples = [];
  const profiles = new Map();
  for (const e of events) {
    if (e.pid !== pid) continue;
    if (e.name === 'Profile' && e.tid === mainTid) profiles.set(e.id, { time: e.args.data.startTime });
    if (e.name === 'ProfileChunk' && profiles.has(e.id)) {
      const p = profiles.get(e.id), cp = e.args.data.cpuProfile ?? {}, deltas = e.args.data.timeDeltas ?? [];
      for (const n of cp.nodes ?? []) nodes.set(`${e.id}:${n.id}`, { ...n, key: `${e.id}:${n.id}`, parentKey: n.parent === undefined ? null : `${e.id}:${n.parent}` });
      (cp.samples ?? []).forEach((id, i) => { p.time += deltas[i] ?? 0; samples.push({ ts: p.time, key: `${e.id}:${id}` }); });
    }
  }
  samples.sort((a, b) => a.ts - b.ts);
  const interval = samples.length > 1 ? (samples.at(-1).ts - samples[0].ts) / (samples.length - 1) / 1000 : null;
  const ours = f => /\/(src|scripts)\//.test(f?.url ?? '') && !/node_modules/.test(f.url);
  function hottest(a, b) {
    const self = new Map(), mine = new Map();
    let lo = 0, hi = samples.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (samples[m].ts < a) lo = m + 1; else hi = m; }
    let n = 0;
    for (let i = lo; i < samples.length && samples[i].ts <= b; i++) {
      const leaf = nodes.get(samples[i].key); if (!leaf) continue; n++;
      const name = leaf.callFrame.functionName === '(program)' || leaf.callFrame.functionName === '(idle)' || leaf.callFrame.functionName === '(garbage collector)' ? leaf.callFrame.functionName : frameName(leaf.callFrame);
      self.set(name, (self.get(name) ?? 0) + 1);
      let x = leaf; while (x && !ours(x.callFrame)) x = nodes.get(x.parentKey);
      const own = x ? frameName(x.callFrame) : '(no src frame)';
      mine.set(own, (mine.get(own) ?? 0) + 1);
    }
    const top = m => [...m].sort((p, q) => q[1] - p[1]).slice(0, 6).map(([name, count]) => ({ name, samples: count, approxMs: interval ? +(count * interval).toFixed(1) : null }));
    return { samples: n, selfTop: top(self), deepestSrcFrameTop: top(mine) };
  }
  const describe = t => {
    const end = t.ts + t.dur, inside = children.filter(c => c.ts >= t.ts && c.ts + c.dur <= end + 1);
    const top = inside.filter(c => !inside.some(o => o !== c && o.ts <= c.ts && o.ts + o.dur >= c.ts + c.dur && (o.ts < c.ts || o.dur > c.dur)));
    const call = inside.find(c => c.name === 'FunctionCall');
    return { atMs: +toPerf(t.ts).toFixed(1), ms: +(t.dur / 1000).toFixed(1), afterFirstPresentedMs: +(toPerf(t.ts) - firstPresentedMs).toFixed(1),
      callback: call ? frameName({ functionName: call.args?.data?.functionName, url: call.args?.data?.url, lineNumber: call.args?.data?.lineNumber }) : null,
      parts: top.slice(0, 8).map(c => ({ name: c.name, ms: +(c.dur / 1000).toFixed(1), fn: c.args?.data?.functionName ? frameName({ functionName: c.args.data.functionName, url: c.args.data.url, lineNumber: c.args.data.lineNumber }) : (c.args?.data?.type ?? null) })),
      profile: hottest(t.ts, end) };
  };
  const durs = tasks.map(t => t.dur / 1000);
  const callbackOf = t => { const c = children.find(c => c.name === 'FunctionCall' && c.ts >= t.ts && c.ts <= t.ts + t.dur); return c ? `${c.args?.data?.functionName} ${short(c.args?.data?.url)}` : null; };
  const worldTasks = tasks.filter(t => /site-tier\/world\.js$/.test(callbackOf(t) ?? '')).map(t => ({ fn: callbackOf(t).split(' ')[0], ms: t.dur / 1000 }));
  const byFn = {};
  for (const x of worldTasks) { const s = byFn[x.fn] ??= { tasks: 0, maxMs: 0, over8: 0 }; s.tasks++; s.maxMs = +Math.max(s.maxMs, x.ms).toFixed(1); if (x.ms > 8) s.over8++; }
  return { mainThread: { pid, tid: mainTid }, sampleIntervalMs: interval && +interval.toFixed(3), tasksAfterFirstPresented: tasks.length,
    over16: durs.filter(d => d > 16.7).length, over33: durs.filter(d => d > 33.3).length, overThreshold: durs.filter(d => d > overMs).length, maxTaskMs: +Math.max(0, ...durs).toFixed(1),
    worldCallbacks: byFn, long: tasks.filter(t => t.dur / 1000 > overMs).map(describe),
    over16Tasks: tasks.filter(t => t.dur / 1000 > 16.7 && t.dur / 1000 <= overMs).map(t => ({ atMs: +toPerf(t.ts).toFixed(1), ms: +(t.dur / 1000).toFixed(1), callback: callbackOf(t) })) };
}

async function runMode(server, mode) {
  return withGpu(`strata-site-tier-longtasks:${mode}`, async () => {
    const browser = await launch({ headless: false, args: [`--window-size=${w + 40},${h + 160}`] });
    const watchdog = setTimeout(() => { console.log('mode exceeded 9 min, closing browser'); browser.close().catch(() => {}); }, 540000);
    try {
      const page = (await browser.pages())[0] || await browser.newPage(), errors = [];
      page.setDefaultTimeout(300000);
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
      await page.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
      await page.bringToFront();
      await page.tracing.start({ categories: CATEGORIES });
      await page.goto(`${server.url}/${get('--folder') ? BASE.replace(/^\//, '') : 'site.html'}`);
      await page.waitForFunction(() => window.strataSite?.metadata?.()?.loadTimeline?.some(m => m.name === 'first-presented'), { polling: 20, timeout: 120000 });
      const firstPresentedMs = await page.evaluate(() => window.strataSite.metadata().loadTimeline.find(m => m.name === 'first-presented').atMs);
      const alignPerfMs = await page.evaluate(() => { performance.mark('strata-align'); return performance.now(); });
      const t0 = Date.now();
      if (mode === 'orbit') {
        const box = await page.evaluate(() => { const r = document.querySelector('#scene').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; });
        await page.mouse.move(box.x, box.y); await page.mouse.down();
        let x = box.x, dir = 1;
        while (Date.now() - t0 < seconds * 1000) { x += dir * 6; if (Math.abs(x - box.x) > box.w * .2) dir = -dir; await page.mouse.move(x, box.y + Math.sin((Date.now() - t0) / 700) * 20); await new Promise(r => setTimeout(r, 16)); }
        await page.mouse.up();
      } else await new Promise(r => setTimeout(r, seconds * 1000));
      const meta = await page.evaluate(() => { const m = window.strataSite.metadata(); return { resident: m.resident, effectiveDpr: m.effectiveDpr, programs: m.programs, contextLost: m.contextLost, loadTimeline: m.loadTimeline,
        siteTasks: m.taskReport.tasks.filter(t => t.source !== 'browser-longtask').map(t => ({ name: t.name, startTimeMs: +(+t.startTimeMs).toFixed(1), durationMs: +(+t.durationMs).toFixed(1), year: t.year })),
        gpu: (() => { const gl = document.querySelector('#scene').getContext('webgl2'), d = gl.getExtension('WEBGL_debug_renderer_info'); return { renderer: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : null, samples: gl.getParameter(gl.SAMPLES), drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight] }; })() }; });
      const buffer = Buffer.from(await page.tracing.stop());
      fs.writeFileSync(path.join(out, `trace-${mode}.json.gz`), zlib.gzipSync(buffer));
      const analysis = analyse(JSON.parse(buffer.toString('utf8')), alignPerfMs, firstPresentedMs);
      if (errors.length) throw new Error(errors.join('\n'));
      return { mode, seconds, viewport: { w, h, dpr }, firstPresentedMs, ...analysis, page: meta };
    } finally { clearTimeout(watchdog); await browser.close().catch(() => {}); }
  }, { requireAc: true });
}
(async () => {
  const server = get('--folder') ? await serveDist(path.resolve(get('--folder')), 5198) : await serve({ port: 5197 }), result = { modes: {}, overMs, source: get('--folder') ? path.resolve(get('--folder')) : 'dev server site.html' };
  try {
    for (const mode of modes) {
      const r = await runMode(server, mode); result.modes[mode] = r;
      console.log(mode, JSON.stringify({ tasks: r.tasksAfterFirstPresented, over16: r.over16, over33: r.over33, overThreshold: r.overThreshold, maxTaskMs: r.maxTaskMs, worldCallbacks: r.worldCallbacks }));
    }
  } finally { await server.close(); }
  fs.writeFileSync(path.join(out, 'longtasks.json'), JSON.stringify(result, null, 1) + '\n');
})().catch(e => { console.error(e); process.exitCode = 1; });
