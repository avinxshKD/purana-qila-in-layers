'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { root, serve, launch, openPage } = require('./browser.cjs');
const { ffmpeg, sha256, probe } = require('./media.cjs');
const directory = path.join(root, 'output', 'lookdev'), work = path.join(directory, 'work');
const metrics = { configuration: { revision: 3, synthetic: true, palette: 'B only', year: 38, seconds: 4,
  film: { width: 3840, height: 2160, msaa: false, output: '1920x1080 Lanczos' },
  live: { width: 1920, height: 1080, msaa: true }, warmup: 12, timingFrames: 24,
  turntable: { seconds: 10, fps: 30, frames: 300, typeface: 'adobe' } },
  failures: [], stills: {}, labels: {}, cost: {}, determinism: {}, ao: {} };
const save = () => fs.writeFileSync(path.join(directory, 'metrics.json'), JSON.stringify(metrics, null, 2) + '\n');
function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return { mean: values.reduce((sum, value) => sum + value, 0) / values.length,
    p50: sorted[Math.ceil(sorted.length * .5) - 1], p95: sorted[Math.ceil(sorted.length * .95) - 1], rawMs: values };
}
function difference(a, b) {
  let differingPixels = 0, maxChannelDifference = 0;
  for (let i = 0; i < a.length; i += 4) {
    let differs = false;
    for (let c = 0; c < 4; c++) {
      const delta = Math.abs(a[i + c] - b[i + c]);
      if (delta) { differs = true; maxChannelDifference = Math.max(maxChannelDifference, delta); }
    }
    if (differs) differingPixels++;
  }
  return { equal: differingPixels === 0, differingPixels, pixelsCompared: a.length / 4,
    fractionPixelsDifferent: differingPixels / (a.length / 4), maxChannelDifference };
}
const filmOptions = { lookdev: '', width: '3840', height: '2160', aa: 'off' };
async function still(page, name, seconds = 4) {
  const result = await page.evaluate(seconds => window.strata.capture({ method: 'blob', year: 38, seconds }), seconds);
  fs.writeFileSync(path.join(work, name), Buffer.from(result.data, 'base64'));
}
function scaled(input, output, width = 1920, height = 1080) {
  ffmpeg(['-i', path.join(work, input), '-vf', `scale=${width}:${height}:flags=lanczos`, '-frames:v', '1', path.join(directory, output)]);
}
function phone(file) {
  ffmpeg(['-i', path.join(directory, `${file}.png`), '-vf', 'scale=540:304:flags=lanczos', '-frames:v', '1', path.join(directory, `${file}-540.png`)]);
}
function crop(input, output, bounds, scale = .5) {
  const b = { x: Math.max(0, Math.floor(bounds.x * scale) - 10), y: Math.max(0, Math.floor(bounds.y * scale) - 10),
    width: Math.ceil(bounds.width * scale) + 20, height: Math.ceil(bounds.height * scale) + 20 };
  ffmpeg(['-i', path.join(directory, input), '-vf', `crop=${b.width}:${b.height}:${b.x}:${b.y}`,
    '-frames:v', '1', path.join(directory, output)]);
  return b;
}
async function timing(page) {
  const result = await page.evaluate(({ warmup, count }) => {
    const values = [];
    for (let i = -warmup; i < count; i++) {
      const start = performance.now();
      window.strata.render(38, 4);
      window.strata.finish();
      if (i >= 0) values.push(performance.now() - start);
    }
    return { values, info: window.strata.info(), device: window.strata.device() };
  }, { warmup: 12, count: 24 });
  return { timing: stats(result.values), info: result.info, device: result.device };
}
async function raw(page, year = 32, seconds = 4) {
  return Buffer.from(await page.evaluate(({ year, seconds }) => {
    window.strata.render(year, seconds);
    return window.strata.raw();
  }, { year, seconds }), 'base64');
}
async function determinism(server, options, key) {
  const captures = [], devices = [];
  for (let launchIndex = 0; launchIndex < 2; launchIndex++) {
    const browser = await launch();
    try {
      const page = await openPage(browser, server.url, { lookdev: '', ...options });
      await page.evaluate(() => { for (let i = 0; i < 5; i++) window.strata.render(32, 4); });
      captures.push(await raw(page), await raw(page));
      await raw(page, 100, 12);
      captures.push(await raw(page));
      devices.push(await page.evaluate(() => window.strata.device()));
      if (launchIndex === 0 && key === 'gtao') {
        const result = await page.evaluate(() => window.strata.capture({ method: 'blob', year: 38, seconds: 4 }));
        fs.writeFileSync(path.join(directory, 'gtao-experiment.png'), Buffer.from(result.data, 'base64'));
      }
    } finally { await browser.close(); }
  }
  const result = { devices, hashes: captures.map(sha256), repeat: [difference(captures[0], captures[1]), difference(captures[3], captures[4])],
    scrub: [difference(captures[0], captures[2]), difference(captures[3], captures[5])],
    launches: difference(captures[0], captures[3]) };
  result.allExact = [...result.repeat, ...result.scrub, result.launches].every(result => result.equal);
  fs.writeFileSync(path.join(work, `${key}-reference.rgba`), captures[0]);
  return result;
}

async function main() {
  fs.mkdirSync(work, { recursive: true });
  const server = await serve();
  let browser;
  try {
    browser = await launch();
    metrics.browser = await browser.version();
    for (const [view, name] of [['overview', 'overview'], ['trench', 'trench-closeup'], ['cut', 'ring-well-closeup']]) {
      const page = await openPage(browser, server.url, { ...filmOptions, view, typeface: 'adobe' });
      await still(page, `${name}-2160.png`);
      scaled(`${name}-2160.png`, `${name}.png`);
      phone(name);
      metrics.stills[name] = { device: await page.evaluate(() => window.strata.device()), file: `${name}.png`, phone: `${name}-540.png` };
      if (view === 'overview') {
        const coverage = await page.evaluate(() => window.strata.coverage());
        fs.writeFileSync(path.join(directory, 'coverage-mask.png'), Buffer.from(coverage.png, 'base64'));
        delete coverage.png;
        metrics.coverage = coverage;
        if (coverage.fraction < .4) throw new Error('Cut faces cover less than 40% of block screen area');
        if (coverage.bounds.ymax >= 2150 || coverage.bounds.ymin <= 10) throw new Error('Overview block touches frame edge');
        metrics.layerTable = await page.evaluate(() => window.strata.layerTable);
        fs.writeFileSync(path.join(directory, 'layer-table.json'), JSON.stringify(metrics.layerTable, null, 2) + '\n');
      }
      await page.close();
      save();
      console.log(`${name} saved`);
    }
    const page = await openPage(browser, server.url, filmOptions);
    for (const [typeface, letter] of [['inter', 'a'], ['adobe', 'b']]) {
      metrics.labels[typeface] = {};
      await page.evaluate(id => window.strata.setTypeface(id), typeface);
      for (const era of ['pre-mauryan', 'sunga']) {
        await page.evaluate(id => window.strata.setEra(id), era);
        const stem = `type-${letter}-${era}`;
        await still(page, `${stem}-2160.png`);
        scaled(`${stem}-2160.png`, `${stem}.png`);
        phone(stem);
        const labels = await page.evaluate(() => window.strata.device().labels);
        metrics.labels[typeface][era] = labels;
        if (labels.callout.capHeight / 2 < 37.8) throw new Error('Callout cap height below 3.5%');
        for (const [kind, bounds] of [['title', labels.title], ['callout', labels.callout]]) {
          crop(`${stem}.png`, `${stem}-${kind}-1080-crop.png`, bounds);
          crop(`${stem}-540.png`, `${stem}-${kind}-540-crop.png`, bounds, 540 / 3840);
        }
      }
      save();
    }
    await page.close();
    for (const era of ['pre-mauryan', 'sunga']) ffmpeg([
      '-i', path.join(directory, `type-a-${era}.png`), '-i', path.join(directory, `type-b-${era}.png`),
      '-filter_complex', 'hstack=inputs=2', '-frames:v', '1', path.join(directory, `type-comparison-${era}.png`)
    ]);
    const inputs = ['type-a-pre-mauryan-title-1080-crop.png', 'type-b-pre-mauryan-title-1080-crop.png',
      'type-a-sunga-title-1080-crop.png', 'type-b-sunga-title-1080-crop.png',
      'type-a-pre-mauryan-callout-1080-crop.png', 'type-b-pre-mauryan-callout-1080-crop.png'];
    const pads = inputs.map((_, i) => `[${i}:v]pad=640:230:(ow-iw)/2:(oh-ih)/2:color=0x202120[p${i}]`).join(';');
    ffmpeg([...inputs.flatMap(file => ['-i', path.join(directory, file)]), '-filter_complex',
      `${pads};[p0][p1]hstack[r0];[p2][p3]hstack[r1];[p4][p5]hstack[r2];[r0][r1][r2]vstack=inputs=3`,
      '-frames:v', '1', path.join(directory, 'type-comparison-crops.png')]);
    console.log('Matched-cap-height typography A/B saved');
    if (process.argv.includes('--stills-only')) return;
    for (const typeface of ['inter', 'adobe']) {
      const live = await openPage(browser, server.url, { lookdev: '', labels: 'live', typeface });
      metrics.labels[typeface].live = {};
      for (const [name, width, height] of [['1080', 1920, 1080], ['540', 540, 304]]) {
        await live.setViewport({ width, height, deviceScaleFactor: 1 });
        await live.evaluate(() => window.dispatchEvent(new Event('resize')));
        await live.click('#source-label');
        const result = await live.evaluate(() => ({
          open: document.querySelector('#source-dialog').open, sourceId: document.querySelector('#source-id').textContent,
          bounds: window.strata.labelBounds(), cssWidth: document.querySelector('canvas').getBoundingClientRect().width
        }));
        result.cssCapHeight = result.bounds.capHeight * result.cssWidth / 1920;
        if (!result.open || result.sourceId !== 'demo:layer-01' || result.cssCapHeight < 14) throw new Error('Live callout failed');
        await live.click('#close-source');
        await live.screenshot({ path: path.join(directory, `live-${typeface}-${name}.png`) });
        crop(`live-${typeface}-${name}.png`, `live-${typeface}-${name}-crop.png`, result.bounds, width / 1920);
        metrics.labels[typeface].live[name] = result;
      }
      await live.close();
      save();
    }
    for (const [key, options] of [['native1080', {}], ['film2160', { width: '3840', height: '2160', aa: 'off' }]]) {
      const timed = await openPage(browser, server.url, { lookdev: '', ...options });
      metrics.cost[key] = await timing(timed);
      await timed.close();
      save();
    }
    await browser.close();
    browser = null;
    metrics.ao.test = await determinism(server, { ao: 'gtao', aa: 'off' }, 'gtao');
    metrics.ao.kept = false;
    metrics.ao.reason = metrics.ao.test.allExact ? 'Optional experiment only; default remains darkened floors pending visual/cost approval.'
      : 'Rejected: raw pixels differ across launches. Final uses darkened trench floors, not screen-space AO.';
    save();
    console.log(`GTAO exact=${metrics.ao.test.allExact}; default remains off`);
    for (const [typeface, view] of [['inter', 'overview'], ['adobe', 'overview'], ['adobe', 'turntable']]) for (const aa of ['off', 'on']) {
      const key = `${view}-${typeface}-${aa}`;
      metrics.determinism[key] = await determinism(server, { typeface, view, aa }, key);
      save();
      console.log(`${key}: exact=${metrics.determinism[key].allExact}`);
      if (!metrics.determinism[key].allExact) throw new Error(`Raw determinism failed: ${key}`);
    }
    if (process.argv.includes('--no-film')) return;
    browser = await launch();
    const film = await openPage(browser, server.url, { ...filmOptions, view: 'turntable', typeface: 'adobe' });
    const frames = path.join(work, 'turntable');
    fs.mkdirSync(frames, { recursive: true });
    const start = process.hrtime.bigint();
    for (let frame = 0; frame < 300; frame++) {
      const result = await film.evaluate(seconds => window.strata.capture({ method: 'blob', year: 38, seconds }), frame / 30);
      fs.writeFileSync(path.join(frames, `frame-${String(frame).padStart(4, '0')}.png`), Buffer.from(result.data, 'base64'));
      if (frame % 60 === 0) console.log(`Turntable frame ${frame}/300 saved`);
    }
    const captureMs = Number(process.hrtime.bigint() - start) / 1e6;
    await film.close();
    await browser.close();
    browser = null;
    const movie = path.join(directory, 'turntable-1080.mp4'), encodeStart = process.hrtime.bigint();
    ffmpeg(['-framerate', '30', '-i', path.join(frames, 'frame-%04d.png'), '-frames:v', '300', '-vf',
      'scale=1920:1080:flags=lanczos:out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high',
      '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
      '-an', '-movflags', '+faststart', movie]);
    metrics.film = { captureMs, encodeMs: Number(process.hrtime.bigint() - encodeStart) / 1e6,
      file: 'turntable-1080.mp4', probe: probe(movie), bytes: fs.statSync(movie).size };
    for (const frame of [0, 75, 150, 225]) {
      ffmpeg(['-i', movie, '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', path.join(directory, `turntable-frame-${frame}.png`)]);
    }
    save();
    console.log('10 s H.264 turntable saved and probed');
  } catch (error) {
    metrics.failures.push({ message: error.message, stack: error.stack });
    save();
    throw error;
  } finally {
    if (browser) await browser.close();
    await server.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
