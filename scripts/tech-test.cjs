'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { performance } = require('node:perf_hooks');
const { once } = require('node:events');
const os = require('node:os');
const { root, executable, launch, serve, openPage } = require('./browser.cjs');
const { bin, run, ffmpeg, sha256, probe, rawEncoder, pngEncoder, rawPng } = require('./media.cjs');
const out = path.join(root, 'output', 'tech-test');
const work = path.join(out, 'work');
const metrics = { configuration: {
  width: 1920, height: 1080, fps: 30, captureFrames: 48, captureWarmup: 12,
  aaFrames: 36, aaWarmup: 12, liveFrames: 600, liveWarmup: 120,
  representative: { year: 32, seconds: 4 }, determinismFrame: { year: 57, seconds: 7.25 },
  transitionYears: [0, 20, 38, 57, 78, 100], units: 'metres',
  blockMetres: [160, 32, 160], soilRiseMetres: 8, shadowMapSize: [2048, 2048],
  captureTransport: 'Binary HTTP POST on loopback; raw RGBA piped to ffmpeg stdin with backpressure. No CDP base64 in timed capture.',
  notes: ['Years are arbitrary placeholder parameters, not dates or historical claims.',
    'Raw readPixels is bottom-up; vflip precedes encoding.',
    'Encoding is libx264 medium CRF18, 30 fps, BT.709 limited range. No audio.',
    'Headless requestAnimationFrame timings are approximate, not headed display performance.',
    'AA completion timings include gl.finish and a synchronous one-pixel readback.']
}, failures: [], skipped: [] };
function save() { fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n'); }
function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const q = n => sorted[Math.ceil(n * sorted.length) - 1];
  return { count: samples.length, mean: samples.reduce((a, b) => a + b, 0) / samples.length,
    p50: q(.5), p95: q(.95), p99: q(.99), min: sorted[0], max: sorted.at(-1) };
}
function compare(a, b) {
  if (a.length !== b.length) throw new Error('Mismatched pixel buffer lengths');
  let pixels = 0, channels = 0, maxChannelDifference = 0;
  for (let i = 0; i < a.length; i += 4) {
    let different = false;
    for (let c = 0; c < 4; c++) {
      const delta = Math.abs(a[i + c] - b[i + c]);
      if (delta) { different = true; channels++; maxChannelDifference = Math.max(maxChannelDifference, delta); }
    }
    if (different) pixels++;
  }
  return { equal: pixels === 0, pixelsCompared: a.length / 4, differingPixels: pixels,
    fractionPixelsDifferent: pixels / (a.length / 4), differingChannels: channels, maxChannelDifference };
}
async function raw(page, year, seconds, options) {
  const encoded = await page.evaluate(({ year, seconds, options }) => {
    window.strata.render(year, seconds, options);
    return window.strata.raw();
  }, { year, seconds, options });
  return Buffer.from(encoded, 'base64');
}
async function png(page, file, year = 32, seconds = 4) {
  const data = await page.evaluate(({ year, seconds }) => {
    window.strata.render(year, seconds);
    return window.strata.png().split(',')[1];
  }, { year, seconds });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
}
async function warm(page, count = 12) {
  await page.evaluate(count => {
    for (let i = 0; i < count; i++) window.strata.render(32, i / 30);
    window.strata.finish();
  }, count);
}
async function transferServer() {
  let handler;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.end();
      return;
    }
    try {
      if (!handler) throw new Error('No active capture');
      await handler(req);
      res.end('ok');
    } catch (error) { res.statusCode = 500; res.end(error.message); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    set: fn => { handler = fn; },
    close: () => new Promise(resolve => server.close(resolve))
  };
}
async function captureMethod(page, transport, method, sequence) {
  const directory = path.join(work, `png-${method}-${sequence}`);
  fs.mkdirSync(directory, { recursive: true });
  const video = path.join(out, `${method}-${sequence}.mp4`);
  let index = 0, bytes = 0, writeMs = [];
  const start = performance.now();
  const encoder = method === 'raw' ? rawEncoder(video, 1920, 1080) : null;
  transport.set(async req => {
    const t0 = performance.now();
    if (encoder) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const data = Buffer.concat(chunks);
      bytes += data.length;
      if (!encoder.process.stdin.write(data)) await once(encoder.process.stdin, 'drain');
    } else {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const data = Buffer.concat(chunks);
      bytes += data.length;
      await fs.promises.writeFile(path.join(directory, `f${String(index).padStart(4, '0')}.png`), data);
    }
    writeMs.push(performance.now() - t0);
    index++;
  });
  const timing = await page.evaluate(async ({ url, method, count }) => {
    const samples = [];
    for (let i = 0; i < count; i++) {
      const t0 = performance.now();
      window.strata.render(32, i / 30);
      const t1 = performance.now();
      let body;
      if (method === 'raw') body = window.strata.readPixelsForTransport();
      else if (method === 'png') {
        const data = window.strata.png();
        const binary = atob(data.split(',')[1]);
        body = Uint8Array.from(binary, c => c.charCodeAt(0));
      } else body = await window.strata.blobForTransport();
      const t2 = performance.now();
      const response = await fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'application/octet-stream' } });
      if (!response.ok) throw new Error(await response.text());
      await response.text();
      samples.push({ submitMs: t1 - t0, readEncodeMs: t2 - t1, transferMs: performance.now() - t2, frameMs: performance.now() - t0 });
    }
    return samples;
  }, { url: transport.url, method, count: metrics.configuration.captureFrames });
  const captureMs = performance.now() - start;
  if (encoder) { encoder.process.stdin.end(); await encoder.finished; }
  const drainedMs = performance.now() - start;
  const encodeStart = performance.now();
  if (!encoder) pngEncoder(path.join(directory, 'f%04d.png'), video);
  const totalMs = performance.now() - start;
  return {
    method, sequence, frames: index, bytes, video: path.relative(out, video).replaceAll('\\', '/'),
    captureWallMs: captureMs, captureMsPerFrame: captureMs / index,
    drainedWallMs: drainedMs, standaloneEncodeMs: encoder ? null : performance.now() - encodeStart,
    totalWallMs: totalMs, totalMsPerFrame: totalMs / index,
    browserFrameMs: stats(timing.map(t => t.frameMs)), readEncodeMs: stats(timing.map(t => t.readEncodeMs)),
    renderSubmitMs: stats(timing.map(t => t.submitMs)), transferMs: stats(timing.map(t => t.transferMs)),
    serverReceiveWriteMs: stats(writeMs), samples: timing, probe: probe(video)
  };
}
async function aaTiming(page) {
  return page.evaluate(({ count, warmup }) => {
    const samples = [];
    for (let i = -warmup; i < count; i++) {
      const t0 = performance.now();
      window.strata.render(32, (i + warmup) / 30);
      window.strata.finish();
      if (i >= 0) samples.push(performance.now() - t0);
    }
    return { samples, device: window.strata.device(), info: window.strata.info() };
  }, { count: metrics.configuration.aaFrames, warmup: metrics.configuration.aaWarmup });
}
async function main() {
  fs.mkdirSync(work, { recursive: true });
  metrics.environment = {
    platform: os.platform(), release: os.release(), cpu: os.cpus()[0].model,
    logicalCpus: os.cpus().length, memoryBytes: os.totalmem(), node: process.version,
    browserExecutable: executable(), packages: JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')),
    ffmpegVersion: run(bin('ffmpeg'), ['-version']).stdout.split('\n')[0]
  };
  const server = await serve();
  const transport = await transferServer();
  let browser;
  try {
    browser = await launch();
    metrics.environment.browserVersion = await browser.version();
    let page = await openPage(browser, server.url);
    await warm(page);
    metrics.device = await page.evaluate(() => window.strata.device());
    if (!metrics.device.renderer.includes('Intel')) throw new Error(`Expected GPU; got ${metrics.device.renderer}`);
    console.log('Rendering overview and six transition states');
    await png(page, path.join(out, 'overview.png'));
    for (const year of metrics.configuration.transitionYears) await png(page, path.join(work, `transition-${year}.png`), year, 4);
    const transitionInputs = metrics.configuration.transitionYears.flatMap(y => ['-i', path.join(work, `transition-${y}.png`)]);
    const transitionFilters = metrics.configuration.transitionYears.map((_, i) => `[${i}:v]scale=640:360:flags=lanczos[t${i}]`).join(';');
    ffmpeg([...transitionInputs, '-filter_complex', `${transitionFilters};${metrics.configuration.transitionYears.map((_, i) => `[t${i}]`).join('')}hstack=inputs=6`,
      '-frames:v', '1', path.join(out, 'transition-strip.png')]);
    metrics.transitions = { years: metrics.configuration.transitionYears, seconds: 4, order: 'left to right', tilePixels: [640, 360], infoByYear: {} };
    for (const year of metrics.configuration.transitionYears) metrics.transitions.infoByYear[year] = await page.evaluate(year => window.strata.render(year, 4), year);
    save();
    metrics.capture = [];
    console.log('Measuring PNG, blob and raw capture with video encoding');
    for (const [sequence, order] of [[0, ['png', 'blob', 'raw']], [1, ['raw', 'blob', 'png']]]) {
      for (const method of order) {
        await warm(page);
        const result = await captureMethod(page, transport, method, sequence);
        metrics.capture.push(result);
        console.log(`${method} ${sequence}: ${result.captureMsPerFrame.toFixed(2)} capture / ${result.totalMsPerFrame.toFixed(2)} end-to-end ms/frame`);
        save();
      }
    }
    await page.close();
    console.log('Measuring AA render and GPU completion');
    metrics.aa = {};
    for (const [name, options] of [
      ['none1080', { aa: 'off' }], ['msaa1080', {}],
      ['supersample2160', { aa: 'off', width: '3840', height: '2160' }]
    ]) {
      page = await openPage(browser, server.url, options);
      const result = await aaTiming(page);
      const file = path.join(work, `${name}.png`);
      await png(page, file);
      metrics.aa[name] = { renderFinishMs: stats(result.samples), rawRenderFinishMs: result.samples, device: result.device, info: result.info };
      console.log(`${name}: ${metrics.aa[name].renderFinishMs.mean.toFixed(2)} ms/frame, samples=${result.device.samples}`);
      await page.close();
      save();
    }
    const scaleStart = performance.now();
    ffmpeg(['-loop', '1', '-i', path.join(work, 'supersample2160.png'), '-vf', 'scale=1920:1080:flags=lanczos',
      '-frames:v', '36', '-f', 'null', '-']);
    metrics.aa.downscale = {
      repeatedPngDecodeAndScaleWallMs: performance.now() - scaleStart, frames: 36,
      caveat: 'Includes PNG input decode and ffmpeg startup, not an isolated in-memory scale kernel.'
    };
    metrics.aa.downscale.msPerFrame = metrics.aa.downscale.repeatedPngDecodeAndScaleWallMs / 36;
    ffmpeg(['-i', path.join(work, 'supersample2160.png'), '-vf', 'scale=1920:1080:flags=lanczos', '-frames:v', '1', path.join(work, 'supersampled1080.png')]);
    const crop = { x: 720, y: 390, width: 480, height: 360 };
    metrics.aa.crop = { ...crop, columns: ['No MSAA, 1080p', 'MSAA, 1080p', '2160p without MSAA, Lanczos to 1080p'], scale: '1:1 output pixels' };
    ffmpeg(['-i', path.join(work, 'none1080.png'), '-i', path.join(work, 'msaa1080.png'), '-i', path.join(work, 'supersampled1080.png'),
      '-filter_complex', `[0:v]crop=480:360:720:390[a];[1:v]crop=480:360:720:390[b];[2:v]crop=480:360:720:390[c];[a][b][c]hstack=inputs=3`,
      '-frames:v', '1', path.join(out, 'aa-crops.png')]);
    save();
    await browser.close();
    browser = null;
    console.log('Comparing raw RGBA within and across independent launches');
    metrics.determinism = {};
    for (const aa of ['off', 'on']) {
      const captures = [];
      const states = [];
      for (let launchIndex = 0; launchIndex < 2; launchIndex++) {
        browser = await launch();
        page = await openPage(browser, server.url, { aa });
        await warm(page);
        const a = await raw(page, 57, 7.25);
        const b = await raw(page, 57, 7.25);
        await raw(page, 100, 20);
        const scrub = await raw(page, 57, 7.25);
        captures.push(a, b, scrub);
        states.push(await page.evaluate(() => window.strata.device()));
        for (const [kind, bytes] of [['a', a], ['b', b], ['scrub', scrub]]) fs.writeFileSync(path.join(work, `det-${aa}-${launchIndex}-${kind}.rgba`), bytes);
        await browser.close();
        browser = null;
      }
      metrics.determinism[aa] = {
        shadows: true, devices: states, hashes: captures.map(sha256),
        sameLaunch: [compare(captures[0], captures[1]), compare(captures[3], captures[4])],
        scrubReturn: [compare(captures[0], captures[2]), compare(captures[3], captures[5])],
        separateLaunches: compare(captures[0], captures[3])
      };
      console.log(`AA ${aa}: separate-launch equality=${metrics.determinism[aa].separateLaunches.equal}`);
      save();
    }
    console.log('Running 600-frame headless GPU benchmarks');
    metrics.live = {};
    browser = await launch();
    for (const [name, options] of [
      ['msaa', {}], ['noMSAA', { aa: 'off' }], ['stress4', { load: '4' }]
    ]) {
      page = await openPage(browser, server.url, { ...options, live: '' });
      const result = await page.evaluate(() => window.strata.bench(600, 120, 32));
      metrics.live[name] = result;
      console.log(`${name}: ${JSON.stringify(result.frameMs)}, ${JSON.stringify(result.info)}`);
      await page.close();
      save();
    }
  } catch (error) {
    metrics.failures.push({ message: error.message, stack: error.stack });
    save();
    throw error;
  } finally {
    if (browser) await browser.close();
    await transport.close();
    await server.close();
  }
  save();
  console.log(`Results saved in ${out}`);
}
main().then(() => require('./results.cjs')).catch(error => { console.error(error); process.exitCode = 1; });
