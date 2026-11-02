'use strict';
// Round 6 image checks shared by the look harnesses: background darks, near-black faces inside the block mask, and the
// timeline stem width used to prove which Source Sans 3 weight is drawn. Luma is Rec.709 on encoded sRGB code values.
const { spawnSync } = require('node:child_process');
const { bin, ffmpeg, probe } = require('./media.cjs');

function readRGB(file, crop) {
  const size = crop ? { width: crop[2], height: crop[3] } : (({ width, height }) => ({ width, height }))(probe(file).streams[0]);
  const args = ['-hide_banner', '-loglevel', 'error', '-i', file, ...(crop ? ['-vf', `crop=${crop[2]}:${crop[3]}:${crop[0]}:${crop[1]}`] : []),
    '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'];
  const r = spawnSync(bin('ffmpeg'), args, { maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ffmpeg decode failed for ${file}: ${r.stderr}`);
  if (r.stdout.length !== size.width * size.height * 3) throw new Error(`Unexpected decode size for ${file}`);
  return { ...size, data: r.stdout };
}
const luma = (d, i) => (.2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2]) / 255;

// Frames with dark levels stretched 6x, half size, stacked top to bottom.
function backgroundCheck(images, out) {
  const inputs = images.flatMap(file => ['-i', file]);
  const chains = images.map((_, i) => `[${i}]lutrgb=r=clipval*6:g=clipval*6:b=clipval*6,scale=iw/2:ih/2:flags=area[v${i}]`).join(';');
  ffmpeg([...inputs, '-filter_complex', `${chains};${images.map((_, i) => `[v${i}]`).join('')}vstack=inputs=${images.length}`, '-frames:v', '1', out]);
}

// Connected (4-neighbour) regions of mask pixels below the luma threshold; mask pixels are those with r+g+b > 30 in the
// coverage render (white cut faces + red tops/floors).
function nearBlack(frameFile, maskFile, { threshold = .05, minimumRegion = 150 } = {}) {
  const frame = readRGB(frameFile), mask = readRGB(maskFile);
  if (frame.width !== mask.width || frame.height !== mask.height) throw new Error('Frame and mask sizes differ');
  const n = frame.width * frame.height, inMask = new Uint8Array(n), dark = new Uint8Array(n), lumas = [];
  for (let p = 0; p < n; p++) {
    const i = p * 3;
    if (mask.data[i] + mask.data[i + 1] + mask.data[i + 2] <= 30) continue;
    inMask[p] = 1;
    const y = luma(frame.data, i);
    lumas.push(y);
    if (y < threshold) dark[p] = 1;
  }
  lumas.sort((a, b) => a - b);
  let largest = 0, regions = 0;
  const stack = new Int32Array(n);
  for (let p = 0; p < n; p++) if (dark[p]) {
    let top = 0, size = 0;
    stack[top++] = p; dark[p] = 0;
    while (top) {
      const q = stack[--top], x = q % frame.width;
      size++;
      for (const r of [q - 1, q + 1, q - frame.width, q + frame.width]) {
        if (r < 0 || r >= n || !dark[r] || (Math.abs((r % frame.width) - x) > 1)) continue;
        dark[r] = 0; stack[top++] = r;
      }
    }
    largest = Math.max(largest, size);
    if (size >= minimumRegion) regions++;
  }
  return { maskPixels: lumas.length, percentile1Luma: lumas[Math.floor(lumas.length * .01)], minimumLuma: lumas[0],
    largestDarkRegionPx: largest, regionsAtOrAboveMinimum: regions, pass: regions === 0, threshold, minimumRegion };
}

// Width of the "E" stem of the timeline's "540 BCE" at 2160p: rows inside the lower half of the E, coverage
// (L - background) / (peak - background) summed across the right-most glyph run, so the result is sub-pixel.
function timelineStem(file, { x0 = 110, x1 = 700, rows = [2087, 2095] } = {}) {
  const crop = [x0, rows[0], x1 - x0, rows[1] - rows[0] + 1], image = readRGB(file, crop), widths = [];
  for (let y = 0; y < image.height; y++) {
    const row = Array.from({ length: image.width }, (_, x) => luma(image.data, (y * image.width + x) * 3));
    const sorted = [...row].sort((a, b) => a - b), background = sorted[Math.floor(sorted.length * .2)], peak = sorted[sorted.length - 1];
    const coverage = row.map(v => Math.max(0, Math.min(1, (v - background) / (peak - background))));
    let end = -1;
    for (let x = coverage.length - 1; x >= 0; x--) if (coverage[x] > .5) { end = x; break; }
    if (end < 0) continue;
    let start = end;
    while (start > 0 && coverage[start - 1] > .5) start--;
    let width = 0;
    for (let x = Math.max(0, start - 3); x <= Math.min(coverage.length - 1, end + 3); x++) width += coverage[x];
    widths.push({ y: rows[0] + y, startX: x0 + start, endX: x0 + end, width });
  }
  const mean = widths.reduce((s, w) => s + w.width, 0) / widths.length;
  return { meanPx: mean, rows: widths, method: 'Rec.709 luma; per row coverage relative to the 20th-percentile background and the row peak; summed over the right-most run ±3 px (the E stem of "540 BCE").' };
}

function typeWeightCheck(semiboldFrame, regularFrame, out, font = 'C\\:/Windows/Fonts/arial.ttf') {
  const semibold = timelineStem(semiboldFrame), regular = timelineStem(regularFrame);
  const label = (text) => `drawtext=fontfile='${font}':text='${text}':fontcolor=white:fontsize=22:x=8:y=8`;
  ffmpeg(['-i', semiboldFrame, '-i', regularFrame, '-filter_complex',
    `[0]crop=520:120:100:2010,scale=1040:240:flags=neighbor,pad=1040:280:0:40,${label(`Semibold 600 (before)  E stem ${semibold.meanPx.toFixed(2)} px at 2160p`)}[a];` +
    `[1]crop=520:120:100:2010,scale=1040:240:flags=neighbor,pad=1040:280:0:40,${label(`Regular 400 (now)  E stem ${regular.meanPx.toFixed(2)} px at 2160p`)}[b];[a][b]hstack`,
    '-frames:v', '1', out]);
  return { semibold, regular };
}

module.exports = { readRGB, backgroundCheck, nearBlack, timelineStem, typeWeightCheck };
