'use strict';
// Small-speaker translation only. The auditioned v2 files are immutable inputs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const base = require('./score.cjs');
const { ROOT, SR, N, bus, rms, db, eraPhrase, wavBuffer, lufsOf } = base;
const OUT = path.join(ROOT, 'output', 'sound', 'v2.1');
const V2 = path.join(ROOT, 'output', 'sound', 'v2');
const SOURCE = path.join(__dirname, 'score-v2.cjs');
const FROZEN_SOURCE_SHA256 = '9670c8a0cbbaf83adaec53ce24fe0e2e4aa85d6c1506080e09852f11303fc1d2';
const FROZEN_SCORE_SHA256 = '10dd84d4de3e14879ee041eaa8b0d13b48775c0ade8b4e7839f65f335d780935';
const FF = path.join(ROOT, 'tools', 'ffmpeg', 'bin', 'ffmpeg.exe');
const baselineReport = JSON.parse(fs.readFileSync(path.join(V2, 'audio-report.json'), 'utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const CONFIG = {
  registers: [45, 47, 48, 50, 52, 53, 55, 57, 59, 60],
  lowpassHz: [1050, 2300, 1800, 3300, 3400, 3300, 4200, 3600, 6800, 4300],
  // These select existing resonator modes, not added noise or a generic treble shelf.
  modeWeights: [
    [.55, 1.5, 12.0], [.7, .9, 1.3, 3.5, 4.0], [.5, .6, 6.0, 8.0],
    [.75, 1.3, 1.3, 1, 1], [.75, 1.3, 1.3, 1, 1], [.75, 1.3, 1.3, 1, 1],
    [.75, 1.3, 1.3, 1, 1], [.75, 1.3, 1.3, 1, 1], [.75, 1.3, 1.3, 1, 1, 1, 1],
    [.75, 1.3, 1.3, 1, 1, 1]
  ],
  desiredRatios: [null, 10.6, 9.5, 8.1, 8.3, 7.9, 7.5, 7.1, 6.7, 6.3],
  minimumLayerGain: .12,
  // [layer, region] pairs rendered exactly as v2. The dig-season-2 earth strike sits under a 7.19x
  // frozen scene gain; its brighter, higher-crest voicing alone pushes the limiter past its 4 dB cap.
  v2VoicedRegions: [[0, 3]]
};

function run(exe, args) {
  const result = spawnSync(exe, args, { cwd: OUT, encoding: 'utf8', maxBuffer: 24 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout + result.stderr;
}
function ff(args) { return run(FF, ['-hide_banner', ...args]); }
function replaceOnce(source, old, replacement) {
  if (source.split(old).length !== 2) throw new Error(`Frozen v2 anchor changed: ${old.slice(0, 70)}`);
  return source.replace(old, replacement);
}
function loadFrozenSynth() {
  let source = fs.readFileSync(SOURCE, 'utf8');
  if (hash(Buffer.from(source)) !== FROZEN_SOURCE_SHA256) throw new Error('The frozen v2 source changed; refusing an unreviewed patch.');
  source = replaceOnce(source, "const OUT = path.join(ROOT, 'output', 'sound', 'v2');",
    `const OUT = ${JSON.stringify(OUT)};\nconst TRANSLATION = globalThis.__strataTranslation;`);
  source = replaceOnce(source, 'amp: m.a[k] * (',
    'amp: m.a[k] * (options.sedimentWeights ? options.sedimentWeights[k] : 1) * (');
  source = replaceOnce(source, 'const registers = [45, 47, 48, 50, 52, 53, 55, 57, 59, 60];',
    'const registers = TRANSLATION.registers;');
  source = replaceOnce(source, 'const desiredRatios = [null, 11.8, 9.4, 8.7, 8.3, 7.9, 7.5, 7.1, 6.7, 6.3];',
    'const desiredRatios = TRANSLATION.desiredRatios;');
  source = replaceOnce(source,
    'duration: 1.35, damping: [3.2, 1.0, 3.0, 1.2, 1.2, 3.0, 1.0, 1.1, .6, 1.0][index], cutoff: 330 + index * 105',
    'duration: 1.35, damping: [3.2, 1.0, 3.0, 1.2, 1.2, 3.0, 1.0, 1.1, .6, 1.0][index], ...(TRANSLATION.v2VoicedRegions.some(([l, r]) => l === index && r === region) ? { cutoff: 330 + index * 105 } : { cutoff: TRANSLATION.lowpassHz[index], sedimentWeights: TRANSLATION.modeWeights[index] })');
  source = replaceOnce(source, '      add(target, segment, Math.round(t * SR));',
    '      add(target, segment, Math.round(t * SR), TRANSLATION.v2VoicedRegions.some(([l, r]) => l === index && r === region) ? TRANSLATION.v2RegionScale[index] : 1);');
  source = replaceOnce(source, 'Math.max(.15, solveLayerGain(sediment, layer, a, b, wanted))',
    'Math.max(TRANSLATION.minimumLayerGain, solveLayerGain(sediment, layer, a, b, wanted))');
  source = replaceOnce(source, 'const gain = 10 ** ((desired - measured) / 20); sceneGains.push(gain);',
    'const gain = TRANSLATION.frozenSceneGains[i]; sceneGains.push(gain);');
  source = source.replaceAll('SOUND SKETCH 02', 'SOUND SKETCH 02.1');
  source += '\nObject.assign(module.exports, { makeLayer, loudnessReport, onsetReport, interleavedBuffer, readInterleaved, oversampledPeakPass, cleanKnownIntermediates });\n';
  const translation = { ...CONFIG, frozenSceneGains: baselineReport.dynamicArc.sectionSceneGains, v2RegionScale: null };
  globalThis.__strataTranslation = translation;
  const runtime = new Module(path.join(__dirname, 'score-v2.1.runtime.cjs'), module);
  runtime.filename = path.join(__dirname, 'score-v2.1.runtime.cjs');
  runtime.paths = module.paths;
  runtime._compile(source, runtime.filename);
  delete globalThis.__strataTranslation;
  runtime.exports.relativeArc[12] = runtime.exports.relativeArc[13] = runtime.exports.relativeArc[14] = 1.1;
  // V2-voiced regions must also carry v2's layer gain. They fall after every gain-solving window,
  // so a first pass at unit scale yields the solved v2.1 gains the scale has to undo.
  const compose = runtime.exports.compose;
  runtime.exports.compose = () => {
    if (!translation.v2RegionScale) {
      translation.v2RegionScale = Array(10).fill(1);
      const solved = compose().layerGains, v2Gains = baselineReport.sediment.fixedLayerGains;
      translation.v2RegionScale = solved.map((g, i) => v2Gains[i] / g);
    }
    return compose();
  };
  return runtime.exports;
}
function protectedManifest() {
  const rows = [];
  const visit = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else rows.push({ path: path.relative(V2, file).replaceAll('\\', '/'), sha256: hash(fs.readFileSync(file)) });
    }
  };
  visit(V2); rows.sort((a, b) => a.path.localeCompare(b.path));
  return { sourceSha256: hash(fs.readFileSync(SOURCE)), artifacts: rows };
}
function rmsDb(audio, a = 0, b = audio.L.length) {
  return db(rms(audio, a, b) / Math.sqrt(2));
}
function filterFile(file, filter, tag) {
  const dir = path.join(OUT, 'measure'); fs.mkdirSync(dir, { recursive: true });
  const output = path.join(dir, `${tag}.f64`);
  ff(['-v', 'error', '-y', '-i', file, ...(filter ? ['-af', filter] : []), '-f', 'f64le', output]);
  const data = fs.readFileSync(output), audio = bus(data.length / 16);
  for (let n = 0; n < audio.L.length; n++) { audio.L[n] = data.readDoubleLE(n * 16); audio.R[n] = data.readDoubleLE(n * 16 + 8); }
  fs.unlinkSync(output);
  return audio;
}
const BANDS = {
  total: '',
  below200: 'lowpass=f=200:p=2,lowpass=f=200:p=2',
  below120: 'lowpass=f=120:p=2,lowpass=f=120:p=2',
  above250: 'highpass=f=250:p=2,highpass=f=250:p=2',
  proxy300: 'highpass=f=300:p=2,highpass=f=300:p=2'
};
function eraDominance(lead, sediment) {
  return baselineReport.music.eraVariants.map((era, i) => {
    const start = 8 + i * 4, a = start * SR, b = (start + 4) * SR;
    const windows = eraPhrase(i).map(note => {
      const n = Math.round((start + note.t) * SR), end = n + .15 * SR, s = rms(sediment, n, end);
      return { onsetSeconds: start + note.t, leadOverSedimentDb: s > 1e-12 ? db(rms(lead, n, end) / s) : null };
    });
    const valid = windows.filter(w => w.leadOverSedimentDb !== null), s = rms(sediment, a, b);
    return {
      section: era.section, startSeconds: start, sectionRmsDb: s > 1e-12 ? db(rms(lead, a, b) / s) : null,
      minimum150msAfterOnsetDb: valid.length ? Math.min(...valid.map(w => w.leadOverSedimentDb)) : null,
      onsetWindows: windows, failedOnsetsBelow4Db: valid.filter(w => w.leadOverSedimentDb < 4),
      onsetsBelow6DbTarget: valid.filter(w => w.leadOverSedimentDb < 6),
      nullMeansNoSedimentPresent: true
    };
  });
}
function measureVersion(dir, version, includeMix = true) {
  const table = {}, retained = {}, sectionBandTable = {};
  for (const stem of ['lead', 'sediment', 'tools', ...(includeMix ? ['mix'] : [])]) {
    const file = path.join(dir, stem === 'mix' ? 'strata-score.wav' : `${stem}-stem.wav`), row = {};
    for (const [band, filter] of Object.entries(BANDS)) {
      const audio = filterFile(file, filter, `${version}-${stem}-${band}`);
      row[`${band}Dbfs`] = rmsDb(audio);
      sectionBandTable[stem] ||= {};
      sectionBandTable[stem][band] = baselineReport.loudness.perSection.map(s => ({
        section: s.section, startSeconds: s.startSeconds, endSeconds: s.endSeconds,
        rmsDbfs: rmsDb(audio, s.startSeconds * SR, s.endSeconds * SR)
      }));
      if (['lead', 'sediment'].includes(stem) && ['total', 'proxy300'].includes(band)) retained[`${stem}-${band}`] = audio;
    }
    row.below200RelativeDb = row.below200Dbfs - row.totalDbfs;
    row.proxy300RelativeDb = row.proxy300Dbfs - row.totalDbfs;
    table[stem] = row;
  }
  return { bandTable: table, sectionBandTable, eras: {
    fullBand: eraDominance(retained['lead-total'], retained['sediment-total']),
    proxy300: eraDominance(retained['lead-proxy300'], retained['sediment-proxy300'])
  }, method: 'FFmpeg two-pole lowpass/highpass filters applied twice, continuous whole-file filtering; stereo RMS averaged across both channels, no weighting or gate.',
  proxyDefinition: 'Own small-speaker proxy: highpass=f=300:p=2 applied twice. Not a measured phone or laptop response.' };
}
function writeStems(runtime, raw, gain) {
  for (const name of ['lead', 'sediment', 'tools']) {
    fs.writeFileSync(path.join(OUT, `${name}-stem.f64`), runtime.interleavedBuffer(raw[name], gain));
    ff(['-v', 'error', '-y', '-f', 'f64le', '-ar', '48000', '-ac', '2', '-i', `${name}-stem.f64`, '-c:a', 'pcm_f32le', `${name}-stem.wav`]);
  }
}
function checkRatios(measurement) {
  const failures = [];
  for (const [band, rows] of Object.entries(measurement.eras)) for (const [i, row] of rows.entries()) {
    if (i === 0) continue;
    const minimum = i <= 2 ? 9 : 6, maximum = (i <= 2 ? 12 : 9) + (band === 'proxy300' ? 3 : 0);
    if (row.sectionRmsDb < minimum || row.sectionRmsDb > maximum) failures.push(`${band}: ${row.section} ${row.sectionRmsDb.toFixed(2)} dB, wanted ${minimum}–${maximum}.`);
    if (row.failedOnsetsBelow4Db.length) failures.push(`${band}: ${row.section} ${row.failedOnsetsBelow4Db.length} onset windows below 4 dB.`);
  }
  return failures;
}
function digSeason2Identity(staticGain) {
  const ratio = staticGain / baselineReport.master.staticGain, a = 50 * SR, b = 52 * SR, rows = [];
  for (const name of ['lead', 'tools', 'sediment']) {
    const before = filterFile(path.join(V2, `${name}-stem.wav`), '', `dig2-v2-${name}`);
    const after = filterFile(path.join(OUT, `${name}-stem.wav`), '', `dig2-v21-${name}`);
    let maxError = 0, peak = 0;
    for (let n = a; n < b; n++) for (const c of ['L', 'R']) {
      maxError = Math.max(maxError, Math.abs(after[c][n] - before[c][n] * ratio)); peak = Math.max(peak, Math.abs(before[c][n] * ratio));
    }
    // Float32 stems round at about 2^-24 of full scale, so 2e-6 is rounding-level only.
    rows.push({ stem: name, fromSeconds: 50, toSeconds: 52, comparedFramesPerChannel: b - a, staticGainRatio: ratio,
      maximumAbsoluteError: maxError, maximumErrorDbfs: db(Math.max(maxError, 1e-20)), sectionPeakDbfs: db(peak), matches: maxError < 2e-6 });
  }
  return rows;
}
function sourceIdentity() {
  const rows = [];
  for (const name of ['lead', 'tools']) {
    const before = filterFile(path.join(V2, `${name}-stem.wav`), '', `identity-v2-${name}`);
    const after = filterFile(path.join(OUT, `${name}-stem.wav`), '', `identity-v21-${name}`);
    let xy = 0, xx = 0, maxError = 0, energyError = 0;
    for (let n = 0; n < N; n++) for (const c of ['L', 'R']) { xy += before[c][n] * after[c][n]; xx += before[c][n] ** 2; }
    const ratio = xy / xx;
    for (let n = 0; n < N; n++) for (const c of ['L', 'R']) {
      const error = after[c][n] - before[c][n] * ratio; maxError = Math.max(maxError, Math.abs(error)); energyError += error ** 2;
    }
    rows.push({ stem: name, onlyCommonStaticGainChanged: maxError < 2e-6, fittedGainRatio: ratio, maximumAbsoluteError: maxError, residualRmsDbfs: db(Math.sqrt(energyError / (2 * N))) });
  }
  return rows;
}
function tune(runtime) {
  const raw = runtime.compose();
  writeStems(runtime, raw, baselineReport.master.staticGain);
  const measured = measureVersion(OUT, 'candidate', false), failures = checkRatios(measured);
  const result = { config: CONFIG, measured, failures, fixedLayerGains: raw.layerGains,
    comparisonGain: 'Frozen v2 static master gain, so source-level low-band changes can be compared directly before mastering.' };
  fs.writeFileSync(path.join(OUT, 'tuning-report.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({
    ratios: measured.eras.fullBand.map((r, i) => ({ section: r.section, full: r.sectionRmsDb, proxy: measured.eras.proxy300[i].sectionRmsDb,
      onsetProxy: measured.eras.proxy300[i].minimum150msAfterOnsetDb })),
    sedimentBands: measured.bandTable.sediment, failures, fixedLayerGains: raw.layerGains
  }, null, 2));
}
function eventPreservation(raw) {
  const unchanged = event => event.role !== 'sediment';
  const key = event => `${event.role || 'lead'}|${event.timeSeconds}|${event.midi}|${event.material}`;
  const original = new Map(baselineReport.strikeVariation.events.filter(unchanged).map(e => [key(e), e.sha256]));
  const current = raw.ledger.filter(unchanged), failures = current.filter(e => original.get(key(e)) !== e.sha256);
  const digEarth = e => e.role === 'sediment' && e.material === raw.ledger.find(x => x.role === 'sediment').material && e.timeSeconds >= 50 && e.timeSeconds < 52;
  const v2Dig = baselineReport.strikeVariation.events.filter(digEarth), newDig = raw.ledger.filter(digEarth);
  const digIdentical = v2Dig.length > 0 && v2Dig.length === newDig.length && newDig.every((e, i) => e.sha256 === v2Dig[i].sha256);
  return { comparedEvents: current.length, originalEvents: original.size, identical: !failures.length && current.length === original.size && digIdentical, failures,
    digSeason2EarthV2Voiced: { events: newDig.map(e => ({ timeSeconds: e.timeSeconds, note: e.note, sha256: e.sha256 })), identicalToV2: digIdentical } };
}
function writeNotes(report) {
  const bandRows = [];
  for (const stem of ['lead', 'sediment', 'tools', 'mix']) for (const version of ['v2', 'v2.1']) {
    const row = report.measurements[version].bandTable[stem];
    bandRows.push(`| ${version} ${stem} | ${row.totalDbfs.toFixed(2)} | ${row.below200Dbfs.toFixed(2)} | ${row.below120Dbfs.toFixed(2)} | ${row.above250Dbfs.toFixed(2)} | ${row.proxy300Dbfs.toFixed(2)} |`);
  }
  const ratios = report.measurements['v2.1'].eras.fullBand.map((row, i) => {
    const old = report.measurements.v2.eras, proxy = report.measurements['v2.1'].eras.proxy300[i];
    const f = x => x === null ? 'n/a' : x.toFixed(2);
    return `| ${row.section} | ${f(old.fullBand[i].sectionRmsDb)} / ${f(old.proxy300[i].sectionRmsDb)} | ${f(row.sectionRmsDb)} / ${f(proxy.sectionRmsDb)} | ${f(row.minimum150msAfterOnsetDb)} / ${f(proxy.minimum150msAfterOnsetDb)} |`;
  });
  fs.writeFileSync(path.join(OUT, 'notes.md'), [
    '# Strata / sound sketch 02.1', '',
    '## Scope', '',
    'Small-speaker translation only. V2 and score-v2.cjs remain byte-for-byte unchanged. This separate script loads the frozen v2 synth read-only, checks its SHA-256, and applies narrow in-memory overrides only to buried resonators and the output folder/label.',
    'The melody, call/answer endings, dry material ladder, struck-note variations, tool patterns, native-rate reverse fragments, season structure and note timings are unchanged. V2’s scene gains are frozen rather than recalculated around the altered sediment. Lead and tool stems differ only by the new common static mastering gain, within float-rounding error.', '',
    '## What changed', '',
    '- All registers are unchanged from v2, including the A2 earth bed.',
    `- Each buried material re-weights its own existing resonator modes (per-mode multipliers, fundamental first): ${CONFIG.modeWeights.map((w, i) => `layer ${i} [${w.join(', ')}]`).join('; ')}. Earth (its 2.76× mode), terracotta and mud/rubble (Kushan) receive the strongest rebalancing. Each strike is still RMS-normalized as in v2, so raising upper modes lowers the fundamental share. No new modes, generic hiss, exciters, broadband treble shelf or additional melody are introduced.`,
    `- Full-band lead/sediment targets: ${CONFIG.desiredRatios.slice(1).join(', ')} dB for Mauryan through Mughal (v2: 11.8, 9.4, 8.7, 8.3, …). Floor on solved layer gain: ${CONFIG.minimumLayerGain} (v2: 0.15).`,
    `- Per-layer low-pass cutoffs: ${CONFIG.lowpassHz.join(', ')} Hz. Original strike damping and note schedules are retained. One static gain per layer, no ducking or linked cap; 70 Hz sediment high-pass remains.`,
    `- Whole-file sediment energy below 200 Hz changes by **${report.lowBandChange.sedimentBelow200Db.toFixed(2)} dB** against v2 (authorized window: a 2–4 dB cut, because this band is the score's only bass). Below 120 Hz: ${report.lowBandChange.sedimentBelow120Db.toFixed(2)} dB. Per era: ${report.lowBandChange.perEraSedimentBelow200Db.map(r => `${r.section} ${r.changeDb.toFixed(2)}`).join(', ')} dB.`,
    `- **Mix below 200 Hz relative to mix total: v2 ${report.lowBandChange.mixBelow200RelativeToTotalDb.v2.toFixed(2)} dB, v2.1 ${report.lowBandChange.mixBelow200RelativeToTotalDb['v2.1'].toFixed(2)} dB.** Absolute mix below 200 Hz changes ${report.lowBandChange.mixBelow200Db.toFixed(2)} dB (includes the new master gain).`, '',
    '## Measurement and proxy', '',
    '**The 300 Hz proxy is our own synthetic small-speaker proxy, not a measured phone or laptop response.** It is exactly FFmpeg `highpass=f=300:p=2,highpass=f=300:p=2`. The other bands use the same doubled two-pole filters at 120, 200 and 250 Hz. RMS averages stereo-channel energy over the whole file or named section, without weighting, gating or independent proxy normalization.',
    'The two proxy listening WAVs use this same filter at their actual levels. They are reference simulations, not device-response measurements. Lead/sediment/tool stems are pre-peak-control 32-bit float WAVs; the mix row is the delivered mastered score.', '',
    '| Version / stem | Total dBFS | Below 200 | Below 120 | Above 250 | Own 300 Hz proxy |',
    '|---|---:|---:|---:|---:|---:|', ...bandRows, '',
    '| Era | v2 full / own proxy, dB | v2.1 full / own proxy, dB | v2.1 onset min full / own proxy, dB |',
    '|---|---:|---:|---:|', ...ratios, '',
    'Per-onset readings, failed onsets and all per-section bands for both versions are in audio-report.json. The 150 ms rule applies after each lead onset, not in the gaps. Filter states run continuously across boundaries, as in the v2 review; very quiet filtered residue can remain after a layer ends.', '',
    '## Delivery', '',
    `48 kHz, 24-bit stereo, exactly 2,880,000 frames / 60.0 s. **${report.loudness.integratedLufs.toFixed(1)} LUFS integrated, ${report.loudness.truePeakDbtp.toFixed(1)} dBTP, ${report.loudness.lraLu.toFixed(1)} LU LRA.**`,
    `Peak-control step ${report.master.stoppedAtPriorityStep}; limiter maximum **${report.master.maximumGainReductionDb.toFixed(2)} dB**, active **${(report.master.limiterActiveShare * 100).toFixed(2)}%** at >0.1 dB reduction. Clipper ${report.master.clipper.oversampling}×, maximum ${report.master.clipper.maximumActualReductionDb.toFixed(2)} dB, ${report.master.clipper.clippedOversampledChannelSamples} oversampled channel samples touched. Same top-2-dB/sub-ms eligibility, 10-ms look-ahead and 15-ms release as v2.`,
    `Two fresh render hashes match: **${report.determinism.twoRendersByteIdentical}**.`,
    `Render 1: \`${report.determinism.render1Sha256}\``,
    `Render 2: \`${report.determinism.render2Sha256}\``,
    `Frozen v2 source and all ${report.protection.fileCount} artifacts unchanged: **${report.protection.unchanged}**. Non-sediment source-event identity: **${report.unchangedMusicAndTools.events.identical}**.`, '',
    '## Single exception: dig-season-2 earth strike', '',
    (x => `Event \`${x.eventId}\` (${x.layer}) at **${x.timeSeconds} s** is rendered with v2 voicing. ${x.voicing}. Why: ${x.reason} Its strike hash matches v2: **${report.unchangedMusicAndTools.events.digSeason2EarthV2Voiced.identicalToV2}** (\`${report.unchangedMusicAndTools.events.digSeason2EarthV2Voiced.events.map(e => e.sha256).join(', ')}\`).`)(report.unchangedMusicAndTools.singleV2VoicingException), '',
    'Sample comparison, 50.0–52.0 s, v2.1 stem against v2 stem × static-gain ratio (float32 stems):', '',
    '| Stem | Frames/channel | Gain ratio | Max abs error | Section peak dBFS | Matches |', '|---|---:|---:|---:|---:|---|',
    ...report.unchangedMusicAndTools.digSeason2Samples.map(r => `| ${r.stem} | ${r.comparedFramesPerChannel} | ${r.staticGainRatio.toFixed(6)} | ${r.maximumAbsoluteError.toExponential(2)} | ${r.sectionPeakDbfs.toFixed(2)} | ${r.matches} |`), '',
    '## Known weaknesses / open listening questions', '',
    ...report.warnings.map(w => `- ${w}`),
    '- The proxy intentionally removes most bass, but it does not model a real speaker’s resonances, distortion, stereo collapse or listening environment. Passing it does not establish audibility on every phone.',
    '- Upper-mode selection can change the perceived colour of a buried layer, particularly the earth bed, whose 2.76× sherd mode (about 304 Hz at A2) now carries much more of its energy, and mud/rubble, whose 2.31× and 3.81× modes now dominate its fundamental. This colour change is the intended small-speaker presence, but it is also audible on headphones and needs a headphone check against the approved v2. The lead, materials ladder and tools are untouched.',
    `- The whole-file cut is inside the 2–4 dB window, but some sections thin more below 200 Hz: ${report.lowBandChange.perEraSedimentBelow200Db.filter(r => r.changeDb < -4).map(r => `${r.section} ${r.changeDb.toFixed(2)} dB`).join(', ')}.`,
    '- Kushan has the thinnest proxy margin. In tuning, raising the mud/rubble upper modes further (to 9× and 14×) moved the Kushan proxy ratio by only 0.08 dB, because the earth and terracotta layers carry most of the Kushan sediment, so the gentler mud weighting was kept.',
    '- Glass, tools, materials and the dynamic arc were approved in the v2 headphone audition and are not changed here.',
    '- No direct human/headphone or real-device audition was performed in this session.', '',
    '## Rebuild', '', '`tools\\node-v24.22.1-win-x64\\node.exe scripts\\sound\\score-v2.1.cjs --build`', ''
  ].join('\n'));
}
function cleanIntermediates(runtime) {
  runtime.cleanKnownIntermediates();
  for (const prefix of ['try-1', 'try-2', 'try-3']) for (const suffix of ['input.f64', '4x.f64', 'processed-4x.f64', '48k.f64']) {
    const file = path.join(OUT, `${prefix}-${suffix}`); if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}
function build(runtime, protectedBefore) {
  console.log('Composing translation-only v2.1 with frozen v2 scene gains.');
  const raw = runtime.compose(), attempts = [];
  let mastered, stoppedAtStep = 1;
  for (const [step, target, clipper] of [[1, -14, false], [2, -14, true], [3, -15, true]]) {
    mastered = runtime.masterV2(raw, target, clipper, `try-${step}`);
    attempts.push({ step, targetIntegratedLufs: target, maximumGainReductionDb: mastered.maximumGainReductionDb,
      limiterActiveShare: mastered.limiterActiveShare, clipperEnabled: clipper });
    console.log('Peak-control attempt', JSON.stringify(attempts.at(-1)));
    stoppedAtStep = step;
    if (mastered.maximumGainReductionDb <= 4 && mastered.limiterActiveShare < .05) break;
  }
  if (mastered.maximumGainReductionDb > 4 || mastered.limiterActiveShare >= .05) throw new Error('Translation needs more peak control than authorized; do not force it.');
  const firstBytes = wavBuffer(mastered), firstHash = hash(firstBytes);
  fs.writeFileSync(path.join(OUT, 'strata-score.wav'), firstBytes);
  writeStems(runtime, raw, mastered.staticGain);
  console.log(`Render 1 ${firstHash}; independently repeating synthesis and selected master.`);
  const secondRaw = runtime.compose(), second = runtime.masterV2(secondRaw, mastered.targetIntegratedLufs, mastered.clipper.enabled, 'master-repeat');
  const secondHash = hash(wavBuffer(second));
  if (firstHash !== secondHash) throw new Error('V2.1 determinism failed.');
  const originalMeasurements = fs.existsSync(path.join(OUT, 'v2-reference-measurements.json')) ?
    JSON.parse(fs.readFileSync(path.join(OUT, 'v2-reference-measurements.json'), 'utf8')) : measureVersion(V2, 'v2');
  console.log('Measuring both full band and the synthetic 300 Hz proxy.');
  const measured = measureVersion(OUT, 'v21'), loudness = runtime.loudnessReport(), warnings = checkRatios(measured);
  const lowBandChange = {
    sedimentBelow200Db: measured.bandTable.sediment.below200Dbfs - originalMeasurements.bandTable.sediment.below200Dbfs,
    sedimentBelow120Db: measured.bandTable.sediment.below120Dbfs - originalMeasurements.bandTable.sediment.below120Dbfs,
    mixBelow200Db: measured.bandTable.mix.below200Dbfs - originalMeasurements.bandTable.mix.below200Dbfs,
    perEraSedimentBelow200Db: measured.sectionBandTable.sediment.below200.map((r, i) => ({
      section: r.section, changeDb: r.rmsDbfs - originalMeasurements.sectionBandTable.sediment.below200[i].rmsDbfs
    }))
  };
  lowBandChange.mixBelow200RelativeToTotalDb = {
    v2: originalMeasurements.bandTable.mix.below200RelativeDb, 'v2.1': measured.bandTable.mix.below200RelativeDb
  };
  // The sediment carries the score's only bass, so its low band may thin only slightly.
  if (lowBandChange.sedimentBelow200Db > -2 || lowBandChange.sedimentBelow200Db < -4) {
    warnings.push(`Sediment below 200 Hz changed ${lowBandChange.sedimentBelow200Db.toFixed(2)} dB; the authorized window is a 2–4 dB cut.`);
  }
  if (loudness.integratedLufs < -15 || loudness.integratedLufs > -14) warnings.push(`Integrated level ${loudness.integratedLufs} is outside -15 to -14 LUFS.`);
  if (loudness.truePeakDbtp > -1) warnings.push('True peak exceeds -1 dBTP.');
  if (loudness.lraLu < 5) warnings.push('LRA is below 5 LU.');
  const identity = { events: eventPreservation(raw), stems: sourceIdentity(), digSeason2Samples: digSeason2Identity(mastered.staticGain),
    singleV2VoicingException: { eventId: 'sediment-0-3-0', layer: 'Earth / sherd (layer 0), dig-season-2 return region',
      timeSeconds: raw.ledger.find(e => e.role === 'sediment' && e.timeSeconds >= 50 && e.timeSeconds < 52).timeSeconds,
      voicing: `Exact v2: low-pass 330 Hz, no mode re-weighting, v2 earth layer gain ${baselineReport.sediment.fixedLayerGains[0]} (region scale ${(baselineReport.sediment.fixedLayerGains[0] / raw.layerGains[0]).toFixed(6)} on the v2.1 earth gain), frozen v2 scene gain`,
      reason: 'Under the frozen 7.19x dig-season-2 scene gain, the brighter earth voicing raised this strike\'s crest enough to need 4.36 dB of limiting at -15 LUFS (cap 4 dB). It is too long for the sub-ms clipper.' } };
  if (!identity.events.identical || identity.stems.some(r => !r.onlyCommonStaticGainChanged) || identity.digSeason2Samples.some(r => !r.matches)) {
    warnings.push('Lead/tool/source-event or dig-season-2 sample identity did not pass.');
  }
  const after = protectedManifest(), unchanged = JSON.stringify(protectedBefore) === JSON.stringify(after);
  if (!unchanged) throw new Error('Protected v2 source or deliverable changed.');
  let tail = 0;
  for (let n = 59.5 * SR; n < N; n++) tail = Math.max(tail, Math.abs(mastered.L[n]), Math.abs(mastered.R[n]));
  const report = {
    version: '2.1', timingContract: 'film-timing.md v1.1 plus sound-v2.1-brief.md', baselineScoreSha256: FROZEN_SCORE_SHA256,
    format: { sampleRate: SR, channels: 2, bitsPerSample: 24, pcmFrames: N, seconds: 60 },
    protection: { unchanged, fileCount: after.artifacts.length, sourceSha256: after.sourceSha256, manifest: 'protected-v2-manifest.json' },
    changeScope: { buriedLayersOnly: true, config: CONFIG, fixedLayerGains: raw.layerGains, highpassHz: 70, ducking: false, frozenSceneGains: raw.sceneGains },
    unchangedMusicAndTools: identity, music: baselineReport.music, materials: { unchangedDryV2Ladder: true, referenceSourceSha256: FROZEN_SOURCE_SHA256 },
    measurements: { v2: originalMeasurements, 'v2.1': measured }, lowBandChange, loudness,
    onsets: runtime.onsetReport(mastered), endTail: { maximumDbfs: db(tail), fromSeconds: 59.5 },
    master: { stoppedAtPriorityStep: stoppedAtStep, attempts, staticGain: mastered.staticGain,
      targetIntegratedLufs: mastered.targetIntegratedLufs, maximumGainReductionDb: mastered.maximumGainReductionDb,
      limiterActiveShare: mastered.limiterActiveShare, limiterActiveThresholdDb: mastered.activeThresholdDb,
      lookAheadMs: mastered.lookAheadMs, releaseMs: mastered.releaseMs, clipper: mastered.clipper },
    determinism: { render1Sha256: firstHash, render2Sha256: secondHash, twoRendersByteIdentical: firstHash === secondHash },
    stems: { format: '32-bit float, pre-peak-control, common static master gain included', mixBandTableUses: 'Delivered mastered score, not the stem sum' },
    warnings
  };
  fs.writeFileSync(path.join(OUT, 'protected-v2-manifest.json'), JSON.stringify({ before: protectedBefore, after, unchanged }, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'audio-report.json'), JSON.stringify(report, null, 2) + '\n');
  writeNotes(report);
  console.log(JSON.stringify({ loudness: { integrated: loudness.integratedLufs, truePeak: loudness.truePeakDbtp, LRA: loudness.lraLu },
    sedimentBelow200ChangeDb: lowBandChange.sedimentBelow200Db, limiterMaxDb: mastered.maximumGainReductionDb,
    limiterActivePercent: mastered.limiterActiveShare * 100, warnings }, null, 2));
  if (warnings.length) throw new Error('V2.1 objective targets need attention; measurements saved.');
  runtime.reviewPlots(mastered); runtime.makeAnimatic();
  for (const [file, output] of [[path.join(V2, 'strata-score.wav'), 'v2-small-speaker-proxy.wav'], [path.join(OUT, 'strata-score.wav'), 'small-speaker-proxy.wav']]) {
    ff(['-v', 'error', '-y', '-i', file, '-af', BANDS.proxy300, '-c:a', 'pcm_s24le', output]);
  }
  cleanIntermediates(runtime);
  console.log(`Complete: ${OUT}`);
}
function main() {
  fs.mkdirSync(OUT, { recursive: true });
  if (hash(fs.readFileSync(path.join(V2, 'strata-score.wav'))) !== FROZEN_SCORE_SHA256) throw new Error('Frozen v2 score hash mismatch.');
  const before = protectedManifest(), runtime = loadFrozenSynth();
  if (process.argv.includes('--baseline')) {
    const measured = measureVersion(V2, 'v2');
    fs.writeFileSync(path.join(OUT, 'v2-reference-measurements.json'), JSON.stringify(measured, null, 2) + '\n');
    console.log(JSON.stringify(measured.bandTable, null, 2));
  } else if (process.argv.includes('--build')) build(runtime, before);
  else tune(runtime);
  const after = protectedManifest();
  if (JSON.stringify(before) !== JSON.stringify(after)) throw new Error('A protected v2 file changed.');
  fs.writeFileSync(path.join(OUT, 'protected-v2-manifest.json'), JSON.stringify({ before, after, unchanged: true }, null, 2) + '\n');
}
if (require.main === module) main();
module.exports = { loadFrozenSynth, CONFIG, measureVersion, checkRatios, protectedManifest, sourceIdentity, OUT };
