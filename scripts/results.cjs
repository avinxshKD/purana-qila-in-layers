'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./browser.cjs');
const { ffmpeg, run, bin, sha256 } = require('./media.cjs');
const directory = path.join(root, 'output', 'tech-test');
const file = path.join(directory, 'metrics.json');
const metrics = JSON.parse(fs.readFileSync(file, 'utf8'));
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
const n = value => value.toFixed(2);
const capture = {};
for (const method of ['png', 'blob', 'raw']) {
  const runs = metrics.capture.filter(run => run.method === method);
  capture[method] = {
    captureMsPerFrame: mean(runs.map(run => run.captureMsPerFrame)),
    totalMsPerFrame: mean(runs.map(run => run.totalMsPerFrame)),
    browserReadEncodeMs: mean(runs.map(run => run.readEncodeMs.mean)),
    transferMs: mean(runs.map(run => run.transferMs.mean)),
    bytesPerFrame: mean(runs.map(run => run.bytes / run.frames)),
    repeats: runs.length, framesPerRepeat: runs[0].frames
  };
}
const fastest = Object.keys(capture).sort((a, b) => capture[a].totalMsPerFrame - capture[b].totalMsPerFrame)[0];
metrics.summary = {
  capture, fastestEndToEnd: fastest,
  rawVsBlob: {
    rawTimeDividedByBlobTime: capture.raw.totalMsPerFrame / capture.blob.totalMsPerFrame,
    rawMinusBlobMsPerFrame: capture.raw.totalMsPerFrame - capture.blob.totalMsPerFrame,
    blobPercentLessTime: (1 - capture.blob.totalMsPerFrame / capture.raw.totalMsPerFrame) * 100
  },
  aa: {
    supersampleRenderDividedByMSAA: metrics.aa.supersample2160.renderFinishMs.mean / metrics.aa.msaa1080.renderFinishMs.mean
  },
  budget: {
    source: 'live.stress4, 4x MSAA, this placeholder workload only',
    callsIncludingShadows: metrics.live.stress4.info.calls,
    trianglesIncludingShadows: metrics.live.stress4.info.triangles,
    observedFrameMs: metrics.live.stress4.frameMs,
    ceilingFound: false,
    caveat: 'A provisional tested workload budget, not a proven 60fps limit. Headed validation required. Stress instances overlap.'
  }
};
metrics.validation = {
  unitTests: { command: 'npm test', passed: 5, failed: 0 },
  build: { command: 'npm run build', passed: true, warning: 'Minified Three.js-containing chunk exceeds Vite default 500 kB warning threshold.' },
  sourceClockScan: { files: ['src/scene.js', 'src/time.js', 'src/rng.js'], forbiddenPatternMatches: 0 },
  corrections: [
    'Initial still had overlapping placeholder buildings; moved the static mass before recorded runs.',
    'Missing favicon produced a 404; added an inline empty favicon before recorded runs.',
    'Unscoped node --test discovered scripts/tech-test.cjs and collided with the occupied Vite port. Scoped npm test to test/time.test.js; four tests then passed.',
    'Preliminary AA gl.finish-only times were not treated as GPU completion measurements. Final run adds synchronous one-pixel readback.',
    'Preliminary raw transport drained each HTTP chunk. Final run buffers one frame before each ffmpeg write; this did not resolve the slowdown. Preliminary metrics are retained separately.'
  ],
  visualInspection: [
    'overview.png inspected: six soil bands, cut wall sections, building massings, scaffold, people and vehicles visible.',
    'aa-crops.png inspected at native output pixels: supersampling smooths small silhouettes and scaffold edges; thin PCF shadow noise remains.',
    'transition-strip.png inspected: construction, deterministic collapse and rising burial visible in sequence.'
  ],
  notPerformed: [
    'Headed browser benchmark, per instruction.',
    'Cross-driver or cross-machine determinism, and SwiftShader determinism for this scene.',
    'A maximum workload threshold search. Instanced stress tiers are not representative of arbitrary future materials.',
    'Full production-length film and soundtrack; these clips are capture-pipeline tests only.',
    'Ground-truth linear-light/transfer-function color comparison. Encoded stream tags were checked with ffprobe.'
  ]
};
if (metrics.failures.some(failure => failure.message.includes('Target closed'))) {
  metrics.validation.unresolved = [
    'Browser target closed during optional stress16 tier after the base MSAA, base no-MSAA and stress4 tiers had each completed 600 frames. Cause not established. Stress64 was not attempted in the final run.'
  ];
}
metrics.skipped = [...metrics.validation.notPerformed,
  ...(metrics.validation.unresolved || [])];
// Decode corresponding frames from both paths to expose orientation or encoding differences.
const decoded = {};
for (const method of ['blob', 'raw']) {
  const output = path.join(directory, `${method}-decoded.png`);
  ffmpeg(['-i', path.join(directory, `${method}-0.mp4`), '-frames:v', '1', output]);
  const rgba = run(bin('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-i', output, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'],
    { encoding: null, maxBuffer: 16 * 1024 * 1024 }).stdout;
  decoded[method] = { file: path.basename(output), rgbaSha256: sha256(rgba) };
}
metrics.validation.decodedFirstFrames = decoded;
metrics.validation.decodedFirstFramesMatch = decoded.blob.rgbaSha256 === decoded.raw.rgbaSha256;
fs.writeFileSync(file, JSON.stringify(metrics, null, 2) + '\n');
const c = metrics.summary.capture;
const determinant = Object.entries(metrics.determinism).map(([mode, result]) =>
  `| ${mode === 'on' ? '4x MSAA' : 'No MSAA'} | ${result.sameLaunch.every(r => r.equal)} | ${result.separateLaunches.equal} | ${result.scrubReturn.every(r => r.equal)} | ${result.separateLaunches.differingPixels} | ${result.separateLaunches.maxChannelDifference} |`).join('\n');
const live = Object.entries(metrics.live).map(([name, result]) =>
  `| ${name} | ${n(result.frameMs.p50)} | ${n(result.frameMs.p95)} | ${n(result.frameMs.p99)} | ${result.info.calls} | ${result.info.triangles} |`).join('\n');
const text = `# Placeholder tech test

## Recommendation

- Capture: **${fastest === 'blob' ? 'canvas.toBlob to PNG files' : fastest}** is fastest end-to-end in this measured Windows pipeline. Keep PNGs as an inspectable, resumable intermediate. Do not assume raw piping is faster.
- AA: use **4x MSAA for live interaction**. For the film, **2160p without MSAA, Lanczos downscale to 1080p** gives cleaner small silhouettes in the inspected crop sheet. Measure full-length render cost again once the historical model exists.
- Determinism: **exact raw RGBA matches** for the tested frame on this Intel/ANGLE driver, with and without MSAA and with shadows enabled. This is not a cross-GPU guarantee.
- Provisional live workload budget: **${metrics.summary.budget.callsIncludingShadows} draw calls / ${metrics.summary.budget.trianglesIncludingShadows} triangles**, counting color and shadow draws together, demonstrated in the 4x-MSAA stress tier at approximately 60 Hz headless cadence. Not a discovered maximum or a headed 60fps guarantee.

## Capture

1920×1080, ${metrics.configuration.captureFrames} frames per repeat, two reverse-order repeats. Each method renders the same year and seconds sequence. Binary loopback HTTP avoids CDP/base64 transport in timed raw capture. Both paths use x264 medium CRF18 at 30 fps. PNG capture time excludes its subsequent encode; end-to-end time includes it. Raw end-to-end includes stdin drain, encoder completion and final muxing.

| Method | Capture ms/frame | End-to-end ms/frame | Browser read/encode ms | Loopback/write/backpressure ms |
| --- | ---: | ---: | ---: | ---: |
| toDataURL PNG | ${n(c.png.captureMsPerFrame)} | ${n(c.png.totalMsPerFrame)} | ${n(c.png.browserReadEncodeMs)} | ${n(c.png.transferMs)} |
| toBlob PNG | ${n(c.blob.captureMsPerFrame)} | ${n(c.blob.totalMsPerFrame)} | ${n(c.blob.browserReadEncodeMs)} | ${n(c.blob.transferMs)} |
| readPixels RGBA → ffmpeg | ${n(c.raw.captureMsPerFrame)} | ${n(c.raw.totalMsPerFrame)} | ${n(c.raw.browserReadEncodeMs)} | ${n(c.raw.transferMs)} |

Raw takes **${n(metrics.summary.rawVsBlob.rawTimeDividedByBlobTime)}×** the blob path's end-to-end time, a difference of **${n(metrics.summary.rawVsBlob.rawMinusBlobMsPerFrame)} ms/frame**. Raw readback itself is faster than PNG encoding here, but the raw path is dominated by loopback transfer, writing and encoder backpressure. The slowdown's exact cause was not isolated. This is a result for this implementation, not proof that raw capture is inherently slower. Per-repeat timings and byte volumes are in metrics.json. Raw is bottom-up and explicitly flipped before encoding. The decoded first frames from blob and raw videos have ${metrics.validation.decodedFirstFramesMatch ? 'identical' : 'different'} RGBA hashes; both decoded stills were visually inspected for orientation.

ffprobe confirms H.264, 1920×1080, 30/1 frame rate, BT.709 matrix/primaries/transfer and limited range in the test clips. The filter chain explicitly stamps frame properties with \`setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv\`. Transfer-function fidelity against a reference display was not tested.

## AA

| Rendering mode | Mean render + completion ms/frame | p95 ms/frame | Actual context samples |
| --- | ---: | ---: | ---: |
| Native 1080p, no MSAA | ${n(metrics.aa.none1080.renderFinishMs.mean)} | ${n(metrics.aa.none1080.renderFinishMs.p95)} | ${metrics.aa.none1080.device.samples} |
| Native 1080p, MSAA | ${n(metrics.aa.msaa1080.renderFinishMs.mean)} | ${n(metrics.aa.msaa1080.renderFinishMs.p95)} | ${metrics.aa.msaa1080.device.samples} |
| 2160p, no MSAA | ${n(metrics.aa.supersample2160.renderFinishMs.mean)} | ${n(metrics.aa.supersample2160.renderFinishMs.p95)} | ${metrics.aa.supersample2160.device.samples} |

Each mode has ${metrics.configuration.aaWarmup} warmup frames and ${metrics.configuration.aaFrames} timed frames. Completion uses \`gl.finish\` plus a synchronous one-pixel readback. These are serialized wall-clock latencies, not isolated GPU timer-query measurements. Supersampled rendering costs ${n(metrics.summary.aa.supersampleRenderDividedByMSAA)}× MSAA in this sample.

Repeated PNG input decode + Lanczos downscale took **${n(metrics.aa.downscale.msPerFrame)} ms/frame**, including ffmpeg startup across ${metrics.aa.downscale.frames} frames. This is a separate conservative workflow measurement, not an isolated scale-kernel cost or an exact sum with the rendering timings.

\`aa-crops.png\`: three 480×360 crops at output pixel scale 1:1. Left: no MSAA; middle: native MSAA; right: 2160p without MSAA downscaled to 1080p. Coordinates and source stills are in metrics and work/. Supersampling improves scaffold diagonals and tiny people. Small PCF shadow speckle and deliberately separated collapse-piece seams remain visible.

## Raw-pixel determinism

Frame: placeholder year 57, seconds 7.25; shadows enabled. The same frame is captured twice per launch and again after scrubbing to year 100. Two independent browser launches are used for each MSAA mode. SHA-256 covers all 1920×1080 RGBA bytes.

| Mode | Within-launch exact | Across-launch exact | Scrub-return exact | Across-launch differing pixels | Max channel difference |
| --- | --- | --- | --- | ---: | ---: |
${determinant}

All pairwise comparison details, hashes, differing-pixel fractions and raw reference buffers are retained. PCF's screen-position noise is deterministic in the tested source; no temporal jitter is used. Cross-machine, cross-driver and SwiftShader results are not claimed.

## Live performance

**Headless numbers are approximate.** They are requestAnimationFrame timestamp intervals, not presented-frame guarantees or GPU execution times. Each tier has ${metrics.configuration.liveWarmup} warmup frames and ${metrics.configuration.liveFrames} measured frames. Canvas is 1920×1080, devicePixelRatio 1, drawing-buffer preservation off.

| Tier | p50 ms | p95 ms | p99 ms | Calls, including shadows | Triangles, including shadows |
| --- | ---: | ---: | ---: | ---: | ---: |
${live}

Base scene: **${metrics.live.msaa.info.geometries} geometries, ${metrics.live.msaa.info.textures} textures, ${metrics.live.msaa.info.programs} programs**. Draw and triangle counts include the shadow map. Stress tiers duplicate the people/vehicle/rubble batches at the same positions; they test increased instance and submission work, but overlapping early-depth rejection means they cannot establish an arbitrary historical scene budget. No timing-based ceiling was established. Keep the provisional workload budget until a headed run and actual era geometry justify increasing it.

${metrics.validation.unresolved ? `**Unresolved optional stress check:** ${metrics.validation.unresolved.join(' ')}` : ''}

Run \`npm run bench\`, open the printed URL with \`?live\`, then press **Measure 600 frames**. This serves only locally and does not open a browser itself.

## Scope and checks

- All years are arbitrary placeholders, not historical dates. Geometry units are metres. Block footprint is 160×160 m; the six bands have uneven internal boundaries. Soil rises 8 m in the placeholder transition.
- \`transition-strip.png\` is ordered left-to-right: ${metrics.configuration.transitionYears.join(', ')}. Each tile is 640×360, fixed at seconds 4. Construction, collapse and burial are visible; no historical content is modeled.
- Scene placement and animation use seeded mulberry32 and pure year/seconds evaluation. No scene-path clock or unseeded randomness calls.
- \`npm test\`: five tests pass, including cleanup after an occupied capture port. \`npm run build\`: passes, with Vite's large-chunk warning. The installed-source API audit is \`../../API-FACTS.md\`.
- Corrected before the final run: a favicon 404; overlapping placeholder massings; unit-test discovery accidentally invoking the capture harness; implausible finish-only AA timing methodology. Raw writes were consolidated from chunk-wise to frame-wise, but the slowdown remained. \`preliminary-metrics.json\` preserves the superseded run, which is not used for recommendations.
- Overview, native AA crops and transition strip were visually inspected. The wall ring appears only as the expected solid sections on the block faces; the buried interior is hidden by opaque soil.
- Not run: headed browser, cross-driver determinism, production-length film, soundtrack, and a calibrated color-reference comparison.

Environment: ${metrics.environment.browserVersion}, Three.js ${metrics.environment.packages.dependencies.three}, ${metrics.device.renderer}. Exact dependency versions, machine details and raw timing samples are in metrics.json.
`;
fs.writeFileSync(path.join(directory, 'RESULTS.md'), text);
console.log(JSON.stringify(metrics.summary, null, 2));
