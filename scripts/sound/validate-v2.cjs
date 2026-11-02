'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const base = require('./score.cjs');
const OUT = path.join(base.ROOT, 'output', 'sound', 'v2');
const report = JSON.parse(fs.readFileSync(path.join(OUT, 'audio-report.json'), 'utf8'));
const failures = [], warnings = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const wav = fs.readFileSync(path.join(OUT, 'strata-score.wav'));
check(wav.toString('ascii', 0, 4) === 'RIFF' && wav.toString('ascii', 8, 12) === 'WAVE', 'WAV header');
check(wav.readUInt16LE(20) === 1 && wav.readUInt16LE(22) === 2 && wav.readUInt32LE(24) === 48000 && wav.readUInt16LE(34) === 24, '48 kHz 24-bit stereo PCM');
check(wav.length === 44 + 2880000 * 6 && wav.readUInt32LE(40) === 2880000 * 6, 'Exactly 2,880,000 frames');
const hash = crypto.createHash('sha256').update(wav).digest('hex');
check(hash === report.determinism.render1Sha256 && hash === report.determinism.render2Sha256, 'Two fresh render hashes equal delivered WAV');
check(Math.abs(report.loudness.integratedLufs - report.master.targetIntegratedLufs) <= .5, 'Authorized integrated target ±0.5');
check([-14, -15].includes(report.master.targetIntegratedLufs), 'Only authorized -14/-15 LUFS targets');
check(report.loudness.truePeakDbtp <= -1, 'True peak ≤-1 dBTP');
check(report.loudness.lraLu >= 5, 'LRA ≥5 LU');
check(report.master.maximumGainReductionDb <= 4, 'Revised limiter reduction ≤4 dB');
check(report.master.limiterActiveShare < .05, 'Limiter active under 5% at reported threshold');
check(report.master.lookAheadMs >= 5, 'Limiter look-ahead ≥5 ms');
if (report.master.clipper.enabled) {
  check(report.master.clipper.oversampling >= 4, 'Clipper oversampling ≥4×');
  check(report.master.clipper.maximumActualReductionDb <= 2.000001, 'Clipper touches at most top 2 dB');
  check(report.master.clipper.onlyRunsShorterThanMs <= 1, 'Clipper only touches sub-ms peaks');
}
check(report.onsets.coldOpenFirstSoundMs <= 100, 'Cold open ≤100 ms');
check(report.onsets.sections.every(s => s.scheduledOffsetMs === 0 && s.thresholdCrossingOffsetMs <= 5), 'New material onsets within 5 ms');
check(report.strikeVariation.samePitchDuplicates.length === 0, 'No sample-identical same-pitch lead strikes');
check(report.sediment.ducking === false && report.sediment.gainModulation === false, 'No sediment ducking or note-linked gain');
check(report.sediment.highpassHz >= 60 && report.sediment.highpassHz <= 80, 'Sediment high-pass 60–80 Hz');
check(report.sediment.fixedLayerGains.every(g => g > 0), 'All ten layer gains positive');
for (let i = 0; i < 10; i++) check(JSON.stringify(report.music.eraVariants[i].notes) === JSON.stringify(base.eraPhrase(i)), `${report.music.eraVariants[i].section} melody unchanged`);
for (const r of report.leadOverSediment) {
  check(!r.failedOnsetsBelow4Db.length, `${r.section} no onset below hard 4 dB minimum`);
  if (r.onsetsBelow6DbTarget.length) warnings.push(`${r.section}: ${r.onsetsBelow6DbTarget.length} onsets below aspirational 6 dB`);
  if (r.targetSectionRmsDb) check(r.sectionRmsDb >= r.targetSectionRmsDb[0] && r.sectionRmsDb <= r.targetSectionRmsDb[1], `${r.section} section-RMS ratio`);
}
for (const m of report.materials) {
  for (const [key, measured] of [['centroidHz', m.centroidHz], ['t20Ms', m.t20Ms], ['attackMs', m.attackMs]]) {
    const target = m.targets[key];
    if (target) check(measured >= target[0] && measured <= target[1], `${m.material} ${key} in target band`);
  }
}
check(report.materials[2].flatness >= report.materials[1].flatness * 2, 'Mud-rubble flatness ≥2× terracotta');
check(report.materials[4].flatness >= report.materials[3].flatness * 1.5, 'Brick-jelly flatness ≥1.5× brick');
let tail = 0;
for (let n = Math.round(59.5 * 48000); n < 2880000; n++) tail = Math.max(tail, Math.abs(wav.readIntLE(44 + n * 6, 3)), Math.abs(wav.readIntLE(47 + n * 6, 3)));
check(20 * Math.log10(Math.max(1e-12, tail / 8388607)) <= -50, 'Final half-second below -50 dBFS');
check(wav.readIntLE(wav.length - 6, 3) === 0 && wav.readIntLE(wav.length - 3, 3) === 0, 'Final samples exactly zero');
check(report.timbreComparison.length === 16 && report.singleNotesIndex.length === 10, 'Complete comparison indices');
for (const name of ['timbres.wav', 'materials-single-notes.wav']) {
  const pcm = fs.readFileSync(path.join(OUT, name));
  let fullScale = 0;
  for (let n = 44; n < pcm.length; n += 3) if (Math.abs(pcm.readIntLE(n, 3)) >= 8388607) fullScale++;
  check(fullScale === 0, `${name} contains no clipped PCM samples`);
}
check(report.orchestratorMeasurementScript.rows.length === 16, 'Original measurement script output included');
const originalScript = fs.readFileSync(path.join(base.ROOT, 'output', 'review', 'sound-stats', 'measure.ps1'));
const copiedScript = fs.readFileSync(path.join(OUT, 'stats', 'measure.ps1'));
check(originalScript.equals(copiedScript), 'Measurement script copy unchanged');
const oldWav = fs.readFileSync(path.join(base.ROOT, 'output', 'sound', 'strata-score.wav'));
check(crypto.createHash('sha256').update(oldWav).digest('hex') === '39be671d3a90ce6d3868d4b11bb43b7edfafc2033ef279509bdab8fa33602884', 'V1 WAV preserved');
if (!process.argv.includes('--audio-only')) {
  for (const file of ['spectrogram.png', 'waveform.png']) {
    const image = fs.readFileSync(path.join(OUT, file));
    check(image.toString('hex', 0, 8) === '89504e470d0a1a0a' && image.readUInt32BE(16) === 1920 && image.readUInt32BE(20) === 1000, `${file} 1920×1000 PNG`);
  }
  const probe = JSON.parse(fs.readFileSync(path.join(OUT, 'animatic-probe.json'), 'utf8'));
  const video = probe.streams.find(s => s.codec_type === 'video'), audio = probe.streams.find(s => s.codec_type === 'audio');
  check(video.width === 1920 && video.height === 1080 && video.r_frame_rate === '30/1' && video.nb_frames === '1800', '1080p 30 fps / 1800-frame animatic');
  check(+probe.format.duration === 60 && audio.channels === 2 && audio.sample_rate === '48000', '60 s MP4 with 48 kHz stereo audio');
  check(fs.readFileSync(path.join(OUT, 'audition.ass'), 'utf8').includes('SOUND SKETCH 02'), 'Animatic version label');
}
const result = { passed: !failures.length, failures, warnings, sha256: hash, integratedLufs: report.loudness.integratedLufs,
  truePeakDbtp: report.loudness.truePeakDbtp, lraLu: report.loudness.lraLu, limiterMaximumReductionDb: report.master.maximumGainReductionDb };
fs.writeFileSync(path.join(OUT, 'validation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
