'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync, spawn } = require('node:child_process');
const { root } = require('./browser.cjs');
const bin = name => path.join(root, 'tools', 'ffmpeg', 'bin', `${name}.exe`);
const TO_YUV = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,' +
  'setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv';
const TAGS = ['-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];
const ENCODER = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-profile:v', 'high', ...TAGS, '-an', '-movflags', '+faststart'];

function run(exe, args, options = {}) {
  const r = spawnSync(exe, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options });
  if (r.status !== 0) throw new Error(`${path.basename(exe)} failed: ${args.join(' ')}\n${r.stderr}`);
  return r;
}
const ffmpeg = args => run(bin('ffmpeg'), ['-hide_banner', '-loglevel', 'error', '-y', ...args]);
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function probe(file) {
  return JSON.parse(run(bin('ffprobe'), ['-v', 'error', '-show_entries',
    'format=size,duration:stream=width,height,codec_name,nb_frames,color_range,color_space,color_transfer,color_primaries,r_frame_rate',
    '-select_streams', 'v:0', '-of', 'json', file]).stdout);
}
function rawEncoder(file, width, height) {
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba',
    '-video_size', `${width}x${height}`, '-framerate', '30', '-i', 'pipe:0', '-vf', `vflip,${TO_YUV}`, ...ENCODER, file];
  const process = spawn(bin('ffmpeg'), args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  process.stderr.on('data', d => { stderr += d; });
  const finished = new Promise((resolve, reject) => {
    process.on('error', reject);
    process.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}: ${stderr}`)));
  });
  process.stdin.on('error', () => {});
  return { process, finished };
}
function pngEncoder(pattern, file) {
  ffmpeg(['-framerate', '30', '-i', pattern, '-vf', TO_YUV, ...ENCODER, file]);
}
function rawPng(raw, file, width = 1920, height = 1080) {
  ffmpeg(['-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${width}x${height}`, '-i', raw,
    '-vf', 'vflip', '-frames:v', '1', file]);
}
module.exports = { bin, run, ffmpeg, sha256, probe, rawEncoder, pngEncoder, rawPng };
