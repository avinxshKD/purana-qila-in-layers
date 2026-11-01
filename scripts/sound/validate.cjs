'use strict';
// Independent delivery checks. This script never rewrites the soundtrack.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'output', 'sound');
const report = JSON.parse(fs.readFileSync(path.join(OUT, 'audio-report.json'), 'utf8'));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const wav = fs.readFileSync(path.join(OUT, 'strata-score.wav'));
check(wav.toString('ascii', 0, 4) === 'RIFF' && wav.toString('ascii', 8, 12) === 'WAVE', 'WAV header');
check(wav.readUInt16LE(20) === 1, 'Integer PCM');
check(wav.readUInt16LE(22) === 2, 'Stereo');
check(wav.readUInt32LE(24) === 48000, '48 kHz');
check(wav.readUInt16LE(34) === 24, '24 bits');
check(wav.readUInt32LE(40) === 2880000 * 6 && wav.length === 44 + 2880000 * 6, 'Exactly 2,880,000 frames');
const sha256 = crypto.createHash('sha256').update(wav).digest('hex');
check(sha256 === report.determinism.render1Sha256 && sha256 === report.determinism.render2Sha256, 'Both render hashes equal delivered file');
check(report.determinism.twoRendersByteIdentical, 'Determinism flag');
check(Math.abs(report.loudness.integratedLufs + 14) <= .5, 'Integrated loudness');
check(report.loudness.truePeakDbtp <= -1, 'True peak');
check(report.loudness.perSection.length === 16 && report.loudness.perSection.every(s =>
  [s.trailing3sMinimumLufs, s.trailing3sMaximumLufs, s.trailing3sMeanLufs].every(Number.isFinite) && s.readings.length), 'Section short-term readings');
check(report.onsets.coldOpenFirstSoundMs <= 100, 'Cold open within 100 ms');
check(report.onsets.sections.length === 16 && report.onsets.sections.every(s => Math.abs(s.offsetMs) <= 5), 'Downbeat onset tolerance');
check(report.leadOverSediment.length === 10 && report.leadOverSediment.every(s =>
  s.leadOverCombinedSedimentDb >= 6 && (s.minimum200msWindowDb === null || s.minimum200msWindowDb >= 6)), 'Lead dominance');
let endPeak = 0;
for (let i = Math.round(59.5 * 48000); i < 2880000; i++) {
  endPeak = Math.max(endPeak, Math.abs(wav.readIntLE(44 + i * 6, 3) / 8388607), Math.abs(wav.readIntLE(47 + i * 6, 3) / 8388607));
}
check(20 * Math.log10(Math.max(1e-12, endPeak)) <= -50, 'Final half-second below -50 dBFS');
check(wav.readIntLE(wav.length - 6, 3) === 0 && wav.readIntLE(wav.length - 3, 3) === 0, 'Final samples zero');
for (const file of ['spectrogram.png', 'waveform.png']) {
  const image = fs.readFileSync(path.join(OUT, file));
  check(image.toString('hex', 0, 8) === '89504e470d0a1a0a', `${file} PNG signature`);
  check(image.readUInt32BE(16) === 1920 && image.readUInt32BE(20) === 990, `${file} dimensions`);
}
const timbres = fs.readFileSync(path.join(OUT, 'timbres.wav'));
check(report.timbreComparison.length === 16, 'All section lead comparisons present');
check(timbres.length === 44 + Math.round(16 * 4.4 * 48000) * 6, 'Timbre comparison duration');
const probe = spawnSync(path.join(ROOT, 'tools', 'ffmpeg', 'bin', 'ffprobe.exe'),
  ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.join(OUT, 'animatic.mp4')], { encoding: 'utf8' });
check(probe.status === 0, 'Animatic ffprobe');
if (probe.status === 0) {
  const info = JSON.parse(probe.stdout), v = info.streams.find(s => s.codec_type === 'video'), a = info.streams.find(s => s.codec_type === 'audio');
  check(v.width === 1920 && v.height === 1080 && v.r_frame_rate === '30/1' && v.nb_frames === '1800', '1080p 30 fps 1800-frame video');
  check(Number(info.format.duration) === 60, '60-second MP4');
  check(a && a.channels === 2 && a.sample_rate === '48000', 'Animatic stereo score');
}
for (const file of ['notes.md', 'audition.ass']) check(fs.statSync(path.join(OUT, file)).size > 1000, `${file} populated`);
const result = { passed: !failures.length, sha256, integratedLufs: report.loudness.integratedLufs,
  truePeakDbtp: report.loudness.truePeakDbtp, lraLu: report.loudness.lraLu,
  independentTailPeakDbfs: 20 * Math.log10(Math.max(1e-12, endPeak)), failures };
fs.writeFileSync(path.join(OUT, 'validation.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
