'use strict';
// All sound is computed here. No samples, plugins, downloaded media, or runtime dependencies.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'output', 'sound');
const FFMPEG = path.join(ROOT, 'tools', 'ffmpeg', 'bin', 'ffmpeg.exe');
const FFPROBE = path.join(ROOT, 'tools', 'ffmpeg', 'bin', 'ffprobe.exe');
const SR = 48000, SECONDS = 60, N = SR * SECONDS, TAU = 2 * Math.PI;
const SEED = 0x54A7A202, TARGET = -14, CEILING = 10 ** (-1.25 / 20);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const db = x => 20 * Math.log10(Math.max(x, 1e-12));
const noteName = m => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12] + (Math.floor(m / 12) - 1);
const phrase = [
  { t: 0, midi: 62, vel: 1 }, { t: .75, midi: 69, vel: .79 },
  { t: 1.25, midi: 67, vel: .83 }, { t: 1.75, midi: 64, vel: .62 },
  { t: 2, midi: 65, vel: .94 }, { t: 2.75, midi: 64, vel: .72 },
  { t: 3.25, midi: 62, vel: .92 }
];
const eraEndings = [64, 65, 65, 67, 67, 69, 69, 71, 71, 72];
const scale = [62, 64, 65, 67, 69, 71, 72, 74, 76];
function eraPhrase(index) {
  const notes = phrase.map(n => ({ ...n }));
  notes[6].midi = eraEndings[index];
  if (index % 2) notes[5].midi = scale[scale.indexOf(eraEndings[index]) + 1];
  return notes;
}
const sections = [
  { name: 'Cold open: the excavated block today', short: 'Today', dates: '2023', start: 0, end: 4, material: 8 },
  { name: 'Rewind to 540 BCE', short: 'Rewind', dates: '2023 back to 540 BCE', start: 4, end: 8 },
  { name: 'Pre-Mauryan', dates: '540–323 BCE', start: 8, end: 12, material: 0 },
  { name: 'Mauryan', dates: '323–200 BCE', start: 12, end: 16, material: 1 },
  { name: 'Sunga', dates: '200 BCE – 1 CE', start: 16, end: 20, material: 2 },
  { name: 'Kushan', dates: '1–200 CE', start: 20, end: 24, material: 3 },
  { name: 'Gupta', dates: '200–400 CE', start: 24, end: 28, material: 4 },
  { name: 'Post-Gupta', dates: '400–600 CE', start: 28, end: 32, material: 5 },
  { name: 'Rajput', dates: '600–1200 CE', start: 32, end: 36, material: 6 },
  { name: 'Sultanate', dates: '1200–1500 CE', start: 36, end: 40, material: 7 },
  { name: 'Mughal', dates: '1600–1800 CE', start: 40, end: 44, material: 8 },
  { name: 'Modern fill', dates: 'Object dates: 1948 CE / 1955 CE', start: 44, end: 48, material: 9 },
  { name: 'Excavation season 2013–14', short: 'Dig 13–14', dates: '2013–2014', start: 48, end: 50 },
  { name: 'Excavation season 2017–18', short: 'Dig 17–18', dates: '2017–2018', start: 50, end: 52 },
  { name: 'Excavation season 2022–23', short: 'Dig 22–23', dates: '2022–2023', start: 52, end: 54 },
  { name: 'End card', short: 'End', dates: 'Composite section / report chronology', start: 54, end: 60, material: 0 }
];
// Ratios are designed resonator parameters, not archaeological measurements.
const materials = [
  { name: 'Earth / sherd', ratios: [1, 1.97, 2.71, 4.13], amps: [1, .19, .11, .04], decays: [.55, .15, .09, .04], cutoff: 1050, noise: .1, attack: .003, gain: 1.08,
    recipe: 'Damped low soil resonance; four modes 1:1.97:2.71:4.13, soft band-limited contact and a tiny sherd tick.' },
  { name: 'Terracotta', ratios: [1, 1.59, 2.16, 2.94, 4.02], amps: [1, .42, .21, .13, .05], decays: [.74, .35, .22, .13, .07], cutoff: 4100, noise: .025, attack: .0016, gain: .91,
    recipe: 'Hollow fired-clay shell; five inharmonic modes, warm low body and short rim modes; no plucked-string model.' },
  { name: 'Mud brick / rubble', ratios: [1, 1.37, 2.23, 3.61], amps: [1, .2, .12, .07], decays: [.48, .14, .1, .045], cutoff: 2200, noise: .15, attack: .002, gain: 1.1, grains: 3,
    recipe: 'Strongly damped unfired-clay body, rough contact grains, small high stone-contact modes.' },
  { name: 'Burnt brick', ratios: [1, 2.18, 3.07, 4.44], amps: [1, .34, .15, .08], decays: [.62, .25, .14, .065], cutoff: 5500, noise: .04, attack: .0014, gain: .99,
    recipe: 'Dense fired-clay bar modes; brighter and shorter than terracotta, four deliberately non-harmonic resonances.' },
  { name: 'Brick / brick-jelly', ratios: [1, 2.18, 3.07, 4.44], amps: [1, .29, .14, .07], decays: [.6, .21, .12, .055], cutoff: 4600, noise: .12, attack: .0015, gain: 1.02, grains: 7,
    recipe: 'Same burnt-brick resonator family; seven quiet seeded fragments over 100 ms add crushed-brick granularity.' },
  { name: 'Brick-bats', ratios: [1, 1.83, 2.72, 4.13], amps: [1, .29, .13, .07], decays: [.45, .15, .085, .045], cutoff: 5000, noise: .07, attack: .0011, gain: 1.13, grains: 4,
    recipe: 'Short broken-brick resonator, four offset chip contacts and less low-body persistence.' },
  { name: 'Semi-dressed stone', ratios: [1, 2.43, 3.79, 5.27], amps: [1, .34, .16, .07], decays: [.63, .23, .13, .065], cutoff: 7100, noise: .014, attack: .0008, gain: 1.04,
    recipe: 'Dry stone-bar/lithophone modes; hard contact, sparse high partials, no metallic shimmer stack.' },
  { name: 'Rubble stone / lime', ratios: [1, 2.39, 3.76, 5.16], amps: [1, .25, .11, .045], decays: [.66, .2, .1, .05], cutoff: 3900, noise: .075, attack: .0025, gain: 1.03,
    recipe: 'Related stone resonator with a low-passed chalky contact layer and softened attack for the reported lime floors.' },
  { name: 'Porcelain / glass', ratios: [1, 2.67, 4.72, 6.21, 8.08], amps: [1, .31, .16, .07, .025], decays: [.91, .55, .34, .18, .09], cutoff: 10600, noise: .008, attack: .0007, gain: .91,
    recipe: 'Thin porcelain shell plus a weak glass mode pair; high non-harmonic modes ring beyond the low body without a preset bell.' },
  { name: 'Loose mixed fill', ratios: [1, 2.18, 2.67, 4.72], amps: [1, .18, .2, .08], decays: [.58, .16, .37, .15], cutoff: 6500, noise: .14, attack: .0022, gain: 1.01, grains: 5,
    recipe: 'Soft loose-soil contact under mixed brick and china-clay modes; deterministic fragment scatter, on-grid melody. No fire sound.' }
];

function rng(tag) {
  let a = SEED;
  for (const c of tag) a = Math.imul(a ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    a += 0x6D2B79F5;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function bus(length = N) { return { L: new Float64Array(length), R: new Float64Array(length) }; }
function add(target, source, start = 0, gain = 1) {
  for (const c of ['L', 'R']) for (let i = 0; i < source[c].length && start + i < target[c].length; i++) target[c][start + i] += source[c][i] * gain;
}
function modal(target, time, midi, materialIndex, velocity, pan, tag, options = {}) {
  const m = materials[materialIndex], random = rng(tag), f = hz(midi);
  const duration = options.duration || 2.1, length = Math.ceil(duration * SR), start = Math.round(time * SR);
  const pitch = options.pitch || 1, damping = options.damping || 1;
  const left = Math.cos((pan + 1) * Math.PI / 4), right = Math.sin((pan + 1) * Math.PI / 4);
  const modes = m.ratios.map((ratio, k) => {
    const omega = TAU * f * ratio * pitch / SR;
    return { sin: 0, cos: 1, stepS: Math.sin(omega), stepC: Math.cos(omega), amp: m.amps[k], decay: Math.exp(-1 / (m.decays[k] * damping * SR)) };
  });
  const pole = Math.exp(-TAU * m.cutoff / SR), lowPole = Math.exp(-TAU * 115 / SR);
  let low = 0, noiseLow = 0, rumble = 0;
  const fragments = Array.from({ length: m.grains || 0 }, (_, i) => ({ t: .007 + i * .019 + random() * .006, amp: .035 + random() * .05, f: 1300 + random() * 2800 }));
  for (let n = 0; n < length && start + n < target.L.length; n++) {
    const t = n / SR;
    let value = 0;
    for (const mode of modes) {
      value += mode.sin * mode.amp;
      const nextS = mode.sin * mode.stepC + mode.cos * mode.stepS;
      mode.cos = mode.cos * mode.stepC - mode.sin * mode.stepS; mode.sin = nextS;
      mode.amp *= mode.decay;
    }
    noiseLow = .75 * noiseLow + .25 * (random() * 2 - 1);
    value += m.noise * noiseLow * Math.exp(-t / .045);
    for (const g of fragments) if (t > g.t && t - g.t < .055) {
      const local = t - g.t;
      value += g.amp * Math.sin(TAU * g.f * local) * Math.exp(-local / .009) * smooth(local / .001);
    }
    value *= smooth(t / m.attack) * smooth((duration - t) / .05);
    low = pole * low + (1 - pole) * value;
    rumble = lowPole * rumble + (1 - lowPole) * low;
    const out = (low - rumble) * velocity * m.gain * .41;
    target.L[start + n] += out * left;
    target.R[start + n] += out * right;
  }
}
function playPhrase(target, start, material, tag, options = {}) {
  for (const [i, note] of (options.notes || phrase).entries()) {
    modal(target, start + note.t * (options.stretch || 1), note.midi + (options.transpose || 0), material,
      note.vel * (options.gain || 1), (i % 2 ? .12 : -.12) + (options.pan || 0), `${tag}-${i}`, options);
  }
}
function rms(target, a, b) {
  let e = 0;
  for (let i = a; i < b; i++) e += target.L[i] ** 2 + target.R[i] ** 2;
  return Math.sqrt(e / Math.max(1, b - a));
}
function filterHighpass(target, cutoff) {
  const p = Math.exp(-TAU * cutoff / SR);
  for (const c of ['L', 'R']) {
    let low = 0;
    for (let i = 0; i < target[c].length; i++) { low = p * low + (1 - p) * target[c][i]; target[c][i] -= low; }
  }
}
function shadeLayer(target, eraEnd, index) {
  for (const c of ['L', 'R']) {
    let a = 0, b = 0;
    for (let i = Math.round(eraEnd * SR); i < target[c].length; i++) {
      const t = i / SR;
      const current = clamp((t - 8) / 4, 0, 9), depth = Math.max(1, current - index);
      const cutoff = Math.max(210, 1200 * .78 ** depth);
      const p = Math.exp(-TAU * cutoff / SR);
      a = p * a + (1 - p) * target[c][i];
      b = p * b + (1 - p) * a;
      const fade = smooth((t - eraEnd) / .08);
      target[c][i] = b * .30 * .78 ** (depth - 1) * fade;
    }
  }
}
function tool(target, time, kind, velocity, pan, tag) {
  const random = rng(tag), start = Math.round(time * SR), duration = { pick: .24, trowel: .24, sieve: .32, brush: .30 }[kind];
  const left = Math.cos((pan + 1) * Math.PI / 4), right = Math.sin((pan + 1) * Math.PI / 4);
  let low = 0, high = 0;
  for (let n = 0; n < duration * SR; n++) {
    const t = n / SR, noise = random() * 2 - 1;
    low = .58 * low + .42 * noise; high = .93 * high + .07 * low;
    const band = low - high;
    let value = 0;
    if (kind === 'pick') value = .46 * Math.sin(TAU * 1390 * t) * Math.exp(-t / .022) + .19 * Math.sin(TAU * 3077 * t) * Math.exp(-t / .011) + .26 * band * Math.exp(-t / .015);
    if (kind === 'trowel') value = band * (.48 + .52 * Math.sin(TAU * 73 * t) ** 2) * Math.exp(-t / .09) * .55;
    if (kind === 'sieve') value = band * (.1 + .9 * Math.max(0, Math.sin(TAU * 27 * t)) ** 6) * Math.exp(-t / .12) * .7;
    if (kind === 'brush') value = band * smooth(t / .024) * Math.exp(-t / .085) * .38;
    value *= smooth(t / .0006) * smooth((duration - t) / .035) * velocity;
    target.L[start + n] += value * left; target.R[start + n] += value * right;
  }
}
function constrainSediment(lead, sediment) {
  // A linked, smooth 20-ms look-ahead envelope keeps the combined buried layers subordinate.
  const block = 480, blocks = Math.ceil(N / block), gains = new Float64Array(blocks);
  for (let k = 0; k < blocks; k++) {
    const a = Math.max(0, k * block - 960), b = Math.min(N, (k + 1) * block + 960);
    gains[k] = Math.min(1, rms(lead, a, b) * .26 / Math.max(1e-10, rms(sediment, a, b)));
  }
  for (let i = 0; i < N; i++) {
    const k = Math.floor(i / block), f = i / block - k;
    const g = gains[k] * (1 - f) + gains[Math.min(blocks - 1, k + 1)] * f;
    sediment.L[i] *= g; sediment.R[i] *= g;
  }
}
function render() {
  const lead = bus(), sediment = bus(), excavation = bus(), scene = bus(), layers = [];
  // Opening gives the motif its clearest statement; earth and stone are already faintly below.
  const openingNotes = phrase.map((n, i) => ({ ...n, midi: i === 6 ? 69 : n.midi }));
  playPhrase(lead, 0, 8, 'opening', { gain: .95, notes: openingNotes });
  for (let i = 0; i < 10; i++) {
    const s = sections[i + 2], local = bus(), eraLead = bus(4 * SR), notes = eraPhrase(i);
    playPhrase(eraLead, 0, i, `era-${i}`, { notes });
    for (let n = 0; n < eraLead.L.length; n++) {
      const gain = smooth((4 - n / SR) / .025);
      eraLead.L[n] *= gain; eraLead.R[n] *= gain;
    }
    add(lead, eraLead, s.start * SR);
    for (let t = s.end; t < 54; t += 8) playPhrase(local, t, i, `buried-${i}-${t}`, {
      stretch: 2, transpose: -12, gain: .7, damping: 1.15, duration: 2.8, pan: (i % 2 ? 1 : -1) * .32, notes
    });
    shadeLayer(local, s.end, i); layers.push(local); add(sediment, local);
  }
  playPhrase(sediment, 0, 0, 'opening-earth', { stretch: 2, transpose: -12, gain: .15, duration: 3 });
  playPhrase(sediment, 0, 6, 'opening-stone', { stretch: 2, transpose: -12, gain: .09, duration: 3 });
  // Two-bar melody returns across the first two digs, then its opening cell again in the third.
  for (const [i, note] of phrase.entries()) {
    const t = 48 + note.t, material = i < 4 ? 6 : 3;
    modal(lead, t, i === 6 ? 65 : note.midi, material, note.vel * .96, i % 2 ? .1 : -.1, `dig-melody-${i}`);
  }
  for (const [i, note] of phrase.filter(n => n.t < 2).entries()) modal(lead, 52 + note.t, note.midi, i < 2 ? 1 : 0, note.vel, 0, `deep-melody-${i}`);
  const toolEvents = [];
  for (let season = 0; season < 3; season++) {
    const base = 48 + season * 2;
    for (const [offset, kind, v, p] of [[0, 'pick', .24, -.28], [.5, 'trowel', .24, .26], [1, 'sieve', .23, -.2], [1.5, 'brush', .29, .24]]) {
      tool(excavation, base + offset, kind, v, p, `tool-${season}-${kind}`);
      toolEvents.push({ timeSeconds: base + offset, tool: kind, season: sections[12 + season].name });
    }
    // New notes from successively older resonators make depth audible, not just louder old beds.
    const surfaced = [6, 3, 0][season];
    for (let j = 0; j < 2; j++) modal(sediment, base + .5 + j, [57, 50][j], surfaced, .22, -.3 + .6 * j, `surfaced-${season}-${j}`, { duration: 1.2 });
  }
  // The final statement is unhurried; no new notes after 57.25 s.
  playPhrase(lead, 54, 0, 'end-earth', { gain: .84, damping: 1.45, duration: 3 });
  playPhrase(sediment, 54, 8, 'end-porcelain', { transpose: -12, gain: .12, damping: 1.1, duration: 2.5 });
  constrainSediment(lead, sediment);
  add(scene, lead); add(scene, sediment); add(scene, excavation);
  // Rewind is an accelerating reverse read through a full score-derived stratified phrase.
  const reverseSource = bus(4 * SR);
  playPhrase(reverseSource, 0, 8, 'rewind-porcelain', { gain: .7, notes: openingNotes });
  for (let i = 0; i < 8; i++) playPhrase(reverseSource, 0, i, `rewind-bed-${i}`, { transpose: -12, gain: .025, damping: 1.5 });
  const openingRms = rms(scene, 0, 4 * SR);
  for (let n = 0; n < 4 * SR; n++) {
    const u = n / (4 * SR), read = clamp(Math.floor((1 - u ** 1.7) * (4 * SR - 1)), 0, 4 * SR - 1);
    const env = (.72 + .28 * u) * smooth((1 - u) / .035);
    const index = 4 * SR + n;
    scene.L[index] = reverseSource.R[read] * env;
    scene.R[index] = reverseSource.L[read] * env;
  }
  const reverseRms = rms(scene, 4 * SR, 8 * SR), reverseGain = openingRms * .80 / reverseRms;
  for (let i = 4 * SR; i < 8 * SR; i++) { scene.L[i] *= reverseGain; scene.R[i] *= reverseGain; }
  // Short, quiet wall reflections, not a cinematic reverb wash.
  const dry = { L: Float64Array.from(scene.L), R: Float64Array.from(scene.R) };
  for (const [delay, gain] of [[.019, .07], [.037, .046], [.061, .028]]) {
    const shift = Math.round(delay * SR);
    for (let i = shift; i < N; i++) {
      scene.L[i] += dry.R[i - shift] * gain; scene.R[i] += dry.L[i - shift] * gain;
    }
  }
  filterHighpass(scene, 75);
  for (let i = 58 * SR; i < N; i++) {
    const g = 1 - smooth((i / SR - 58) / 1.45);
    scene.L[i] *= g; scene.R[i] *= g;
  }
  const dominance = sections.slice(2, 12).map(s => {
    const a = s.start * SR, b = s.end * SR, total = db(rms(lead, a, b) / Math.max(1e-12, rms(sediment, a, b)));
    let minimum = Infinity;
    for (let start = a; start + .2 * SR <= b; start += .05 * SR) {
      const l = rms(lead, start, start + .2 * SR), d = rms(sediment, start, start + .2 * SR);
      if (d > 1e-9) minimum = Math.min(minimum, db(l / d));
    }
    return { section: s.name, leadOverCombinedSedimentDb: total, minimum200msWindowDb: Number.isFinite(minimum) ? minimum : null,
      method: 'Stereo-energy RMS of pre-master lead and summed sediment stems, 200 ms windows at 50 ms hops; no tools/reflections in either stem.',
      previousLayers: s.material };
  });
  return { ...scene, dominance, toolEvents };
}
function kWeight(input) {
  const out = Float64Array.from(input);
  for (const [[b0, b1, b2], [a1, a2]] of [
    [[1.53512485958697, -2.69169618940638, 1.19839281085285], [-1.69065929318241, .73248077421585]],
    [[1, -2, 1], [-1.99004745483398, .99007225036621]]
  ]) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < out.length; i++) {
      const x = out[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
      out[i] = y; x2 = x1; x1 = x; y2 = y1; y1 = y;
    }
  }
  return out;
}
function lufsOf(audio) {
  const l = kWeight(audio.L), r = kWeight(audio.R), energies = [];
  for (let start = 0; start + .4 * SR <= audio.L.length; start += .1 * SR) {
    let e = 0;
    for (let i = start; i < start + .4 * SR; i++) e += l[i] ** 2 + r[i] ** 2;
    energies.push(e / (.4 * SR));
  }
  const loudness = e => -.691 + 10 * Math.log10(Math.max(e, 1e-30));
  const absolute = energies.filter(e => loudness(e) >= -70);
  const threshold = loudness(absolute.reduce((a, b) => a + b, 0) / absolute.length) - 10;
  const gated = absolute.filter(e => loudness(e) >= threshold);
  return loudness(gated.reduce((a, b) => a + b, 0) / gated.length);
}
function master(raw) {
  // Modest deterministic soft saturation is shared by the two channels, then an exact gain search.
  const out = bus(), drive = .99;
  const renderGain = gain => {
    for (let i = 0; i < N; i++) {
      out.L[i] = CEILING * Math.tanh(raw.L[i] * gain * drive / CEILING);
      out.R[i] = CEILING * Math.tanh(raw.R[i] * gain * drive / CEILING);
    }
    return lufsOf(out);
  };
  let lo = .05, hi = 12;
  for (let i = 0; i < 14; i++) {
    const g = (lo + hi) / 2;
    if (renderGain(g) < TARGET) lo = g; else hi = g;
  }
  const gain = (lo + hi) / 2, measured = renderGain(gain);
  return { ...out, gain, internalLufs: measured };
}
function wavBuffer(audio) {
  const data = Buffer.alloc(44 + audio.L.length * 6);
  data.write('RIFF', 0); data.writeUInt32LE(data.length - 8, 4); data.write('WAVE', 8);
  data.write('fmt ', 12); data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(2, 22);
  data.writeUInt32LE(SR, 24); data.writeUInt32LE(SR * 6, 28); data.writeUInt16LE(6, 32); data.writeUInt16LE(24, 34);
  data.write('data', 36); data.writeUInt32LE(audio.L.length * 6, 40);
  for (let i = 0; i < audio.L.length; i++) {
    data.writeIntLE(clamp(Math.round(audio.L[i] * 8388607), -8388608, 8388607), 44 + i * 6, 3);
    data.writeIntLE(clamp(Math.round(audio.R[i] * 8388607), -8388608, 8388607), 47 + i * 6, 3);
  }
  return data;
}
function media(binary, args) {
  const result = spawnSync(binary, ['-hide_banner', ...args], { cwd: OUT, encoding: 'utf8', maxBuffer: 24 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stderr;
}
function writeTimbres() {
  const ordered = sections;
  const gap = .4, length = Math.round(ordered.length * (4 + gap) * SR), comparison = bus(length), index = [];
  ordered.forEach((s, i) => {
    const temp = bus(4 * SR);
    const material = s.material === undefined ? (i === 1 ? 8 : [6, 3, 0][i - 12]) : s.material;
    playPhrase(temp, 0, material, `comparison-${material}`);
    if (i === 1) for (const c of ['L', 'R']) temp[c].reverse();
    const gain = .155 / rms(temp, 0, temp.L.length);
    for (let n = 0; n < temp.L.length; n++) {
      const fade = smooth((4 - n / SR) / .10);
      temp.L[n] *= gain * fade; temp.R[n] *= gain * fade;
    }
    add(comparison, temp, Math.round(i * (4 + gap) * SR));
    index.push({ section: s.name, material: i === 1 ? 'Reversed porcelain/glass (same phrase, reverse order)' : materials[material].name, startSeconds: i * (4 + gap), phraseSeconds: 4, gapSeconds: gap });
  });
  fs.writeFileSync(path.join(OUT, 'timbres.wav'), wavBuffer(comparison));
  return index;
}
function measure() {
  const text = media(FFMPEG, ['-nostats', '-i', 'strata-score.wav', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  fs.writeFileSync(path.join(OUT, 'ebur128.txt'), text);
  const summary = text.slice(text.lastIndexOf('Summary:'));
  const integratedLufs = Number(summary.match(/I:\s+(-?[\d.]+)\s+LUFS/)[1]);
  const truePeakDbtp = Number(summary.match(/Peak:\s+(-?[\d.]+)\s+dBFS/)[1]);
  const lraLu = Number(summary.match(/LRA:\s+(-?[\d.]+)\s+LU/)[1]);
  const shortTerm = [...text.matchAll(/t:\s*([\d.]+)\s+TARGET:.*?M:\s*(-?[\d.]+)\s+S:\s*(-?[\d.]+)/g)]
    .map(m => ({ seconds: Number(m[1]), momentaryLufs: Number(m[2]), shortTermLufs: Number(m[3]) }));
  const perSection = sections.map(s => {
    // Short-term is the EBU trailing 3-second window, not the section's integrated loudness.
    const frames = shortTerm.filter(f => f.seconds >= Math.max(3, s.start + .1) && f.seconds <= s.end + .001);
    const values = frames.map(f => f.shortTermLufs);
    return { section: s.name, startSeconds: s.start, endSeconds: s.end,
      trailing3sMinimumLufs: Math.min(...values), trailing3sMaximumLufs: Math.max(...values),
      trailing3sMeanLufs: values.reduce((a, b) => a + b, 0) / values.length,
      windowsStraddleBoundaries: s.end - s.start < 3, readings: frames };
  });
  return { integratedLufs, truePeakDbtp, lraLu, method: 'FFmpeg ebur128=peak=true, delivered 24-bit PCM; S readings are trailing 3-second windows every 100 ms.', perSection };
}
function drawText(text, x, y, size = 19, color = '0xd8d6cc') {
  const escaped = text.replace(/\\/g, '\\\\').replace(/'/g, '').replace(/:/g, '\\:').replace(/,/g, '\\,');
  return `drawtext=fontfile='C\\:/Windows/Fonts/consola.ttf':text='${escaped}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
}
function plots() {
  const guides = sections.slice(1).map(s => `drawbox=x=${Math.round(s.start / 60 * 1920)}:y=0:w=2:h=680:color=0xd5c38d@0.7:t=fill`);
  const ticks = sections.map((s, i) => drawText(String(i).padStart(2, '0'), clamp(Math.round(s.start / 60 * 1920) + 4, 4, 1880), 651, 19));
  const legend = sections.map((s, i) => drawText(`${String(i).padStart(2, '0')}  ${s.start}s  ${s.short || s.name}`, 35 + i % 4 * 480, 745 + Math.floor(i / 4) * 50, 18));
  const annotation = [drawText('STRATA / 60 s / material score sketch', 35, 700, 22), ...legend];
  media(FFMPEG, ['-y', '-i', 'strata-score.wav', '-lavfi',
    `showspectrumpic=s=1920x680:legend=disabled:scale=log:fscale=log:color=nebulae:gain=2:drange=90:stop=14000,pad=1920:990:0:0:color=0x101113,${[...guides, ...ticks, ...annotation].join(',')}`,
    '-frames:v', '1', 'spectrogram.png']);
  media(FFMPEG, ['-y', '-i', 'strata-score.wav', '-lavfi',
    `showwavespic=s=1920x680:split_channels=1:colors=0xc9bd9e|0xa5bdb5:scale=lin:filter=peak,pad=1920:990:0:0:color=0x101113,${[...guides, ...ticks, ...annotation].join(',')}`,
    '-frames:v', '1', 'waveform.png']);
}
function assTime(t) {
  const whole = Math.floor(t), cs = Math.round((t - whole) * 100);
  return `0:${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
function animatic() {
  const lines = [
    '[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080', 'WrapStyle: 2', '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Default,Segoe UI,54,&H00E4E1D6,&H00FFFFFF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1',
    '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
  ];
  const event = (a, b, text, layer = 0) => lines.push(`Dialogue: ${layer},${assTime(a)},${assTime(b)},Default,,0,0,0,,${text}`);
  event(0, 60, '{\\pos(104,100)\\fs30\\c&H9EAAAD&}STRATA  /  SOUND SKETCH 01');
  event(0, 60, '{\\pos(104,1000)\\fs22\\c&H7A8085&}Internal timing audition / no picture / synthesized material resonators');
  for (const [i, s] of sections.entries()) {
    event(s.start, s.end, `{\\pos(104,315)\\fs24\\c&H9FAFAF&}SECTION ${String(i).padStart(2, '0')}   /   ${s.start}–${s.end} s`);
    event(s.start, s.end, `{\\pos(100,392)\\fs68}${s.name}`);
    event(s.start, s.end, `{\\pos(104,500)\\fs37\\c&HA5BDBC&}${s.dates}`);
    const material = s.material === undefined ? (i === 1 ? 'Score-derived accelerating reverse' : 'Pick / trowel / sieve / brush + resurfacing layers') : materials[s.material].name;
    event(s.start, s.end, `{\\pos(104,615)\\fs29\\c&H92A0A4&}${material}`);
  }
  event(0, 60, '{\\pos(110,826)\\p1\\c&H34383B&}m 0 0 l 1700 0 1700 4 0 4{\\p0}');
  for (let bar = 0; bar <= 30; bar++) {
    const x = Math.round(110 + 1700 * bar / 30);
    event(0, 60, `{\\pos(${x},818)\\p1\\c&H697174&}m 0 0 l 1 0 1 20 0 20{\\p0}`);
  }
  event(0, 60, '{\\move(110,805,1810,805,0,60000)\\p1\\c&H9EC3D5&}m -3 0 l 3 0 3 46 -3 46{\\p0}', 1);
  for (let bar = 0; bar < 30; bar++) event(bar * 2, (bar + 1) * 2,
    `{\\pos(110,890)\\fs32}BAR ${String(bar + 1).padStart(2, '0')} / 30     {\\c&H829195&}120 BPM   4/4`);
  fs.writeFileSync(path.join(OUT, 'audition.ass'), lines.join('\n') + '\n');
  media(FFMPEG, ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:r=30:d=60', '-i', 'strata-score.wav',
    '-vf', 'subtitles=audition.ass', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k', '-ar', String(SR), '-t', '60', '-frames:v', '1800', '-movflags', '+faststart', 'animatic.mp4']);
}
function onsets(audio) {
  const result = [];
  for (const [index, s] of sections.entries()) {
    if (index === 1) {
      result.push({ section: s.name, barLineSeconds: s.start, firstOnsetSeconds: s.start, offsetMs: 0, method: 'Reverse reader begins at exactly sample 192000; continuous score transition, not a forward note transient.' });
      continue;
    }
    const test = bus(Math.round(.06 * SR)), material = s.material === undefined ? [6, 3, 1][index - 12] : s.material;
    modal(test, 0, 62, material, 1, -.12, `onset-${index}`, { duration: .06 });
    let first = 0;
    while (first < test.L.length && Math.max(Math.abs(test.L[first]), Math.abs(test.R[first])) < 10 ** (-60 / 20)) first++;
    result.push({ section: s.name, barLineSeconds: s.start, scheduledNoteOffsetMs: 0,
      firstOnsetSeconds: s.start + first / SR, offsetMs: first / SR * 1000,
      method: 'Isolated new lead resonator reaches -60 dBFS relative to unity pre-master; continuous preceding tails excluded.' });
  }
  let first = 0;
  while (first < N && Math.max(Math.abs(audio.L[first]), Math.abs(audio.R[first])) < 10 ** (-60 / 20)) first++;
  return { firstAudibleSample: first, coldOpenFirstSoundMs: first / SR * 1000, sections: result };
}
function writeNotes(report) {
  const sectionsText = sections.filter(s => s.material !== undefined).map(s => `- **${s.name} (${s.start}–${s.end} s):** ${materials[s.material].recipe}`).join('\n');
  fs.writeFileSync(path.join(OUT, 'notes.md'), [
    '# Strata / complete 60-second score sketch', '',
    '## Music', '',
    '120 BPM, 4/4; quarter = 0.5 s, bar = 2.0 s. Thirty bars, exactly 60 seconds. Tonal centre D, neutral D Dorian collection D–E–F–G–A–B–C. No augmented second or instrument-based geographic signifier.',
    'One two-bar motif: **D4 – A4 – G4 – E4 | F4 – E4 – [travelling ending]**. Note starts within the phrase: **0, 0.75, 1.25, 1.75 | 2.00, 2.75, 3.25 s**. The opening cell stays identical; paired calls and answers let the last note climb by scale steps. Answers approach a local landing from above, not a full D-tonic cadence. Only the end card gives **F4–E4–D4**. Octave-lowered, time-doubled quotations of each era variant become sediment. No drone.',
    'Cold open states the motif immediately in porcelain/glass with earth and stone underneath. Rewind reads a stratified phrase backward, with a quadratic-like accelerating read curve, then releases before the earth downbeat at 8 s. It is transformed score, not a library reverse effect.',
    'On each new era, the old material remains in a slower lower layer. Each additional layer darkens the previous ones with two low-pass poles and reduces their gain. The combined sediment has a smooth linked level cap beneath the current melody; there is a 75 Hz high-pass on the final scene.',
    'Dig bars: pick on beat 1, trowel on beat 2, sieve on beat 3, brush on beat 4. Stone, brick and finally earth return in sequence as the excavation reaches lower material. Tool choices are modelling assumptions, not excavator claims.',
    'End card restates the complete motif in earth. Last note starts at 57.25 s. A smooth final attenuation reaches digital zero at 59.45 s.', '',
    '### Per-era melody variants', '',
    ...sections.slice(2, 12).map((s, i) => `- ${s.name}, ${i % 2 ? 'answer / local close' : 'call / open'}: **${eraPhrase(i).map(n => noteName(n.midi)).join(' – ')}**.`),
    '',
    '## Material recipes', '', sectionsText, '',
    'All mode ratios, decay constants, resonator tunings, noise spectra and gains are sound-design choices. They are not measurements of ancient objects. Material names and chronology come only from film-timing.md v0; no archaeological dimensions are introduced.',
    'Timbres.wav is an equal-RMS comparison, not the film mix. It follows all sixteen sections in film order, with the same original 4 s D–A–G–E / F–E–D phrase and a 0.4 s gap. The rewind comparison reverses that phrase in isolation; the dig comparisons use stone, brick and earth respectively with no tool percussion. Exact index is in audio-report.json.', '',
    '## Measured delivery', '',
    `- WAV: ${SR} Hz, stereo PCM, 24 bit, ${N.toLocaleString('en-US')} frames, 60.000000 s.`,
    `- FFmpeg EBU R128: **${report.loudness.integratedLufs.toFixed(1)} LUFS integrated**, **${report.loudness.truePeakDbtp.toFixed(1)} dBTP**, **${report.loudness.lraLu.toFixed(1)} LU LRA**.`,
    `- Cold-open -60 dBFS threshold crossing: **${report.onsets.coldOpenFirstSoundMs.toFixed(3)} ms**.`,
    `- Era first-onset threshold offsets: **${Math.min(...report.onsets.sections.slice(2, 12).map(s => s.offsetMs)).toFixed(3)}–${Math.max(...report.onsets.sections.slice(2, 12).map(s => s.offsetMs)).toFixed(3)} ms** after their bar lines. Scheduled excitation is exactly on the downbeat.`,
    `- Smallest lead-over-summed-sediment ratio: **${Math.min(...report.leadOverSediment.map(s => s.leadOverCombinedSedimentDb)).toFixed(2)} dB** by whole-section RMS; **${Math.min(...report.leadOverSediment.filter(s => s.minimum200msWindowDb !== null).map(s => s.minimum200msWindowDb)).toFixed(2)} dB** in overlapping 200 ms windows.`,
    `- End tail maximum, 59.5–60 s: **${report.endTail.maximumDbfs.toFixed(1)} dBFS** (the -240 dBFS reporting floor means digital zero).`,
    `- Independently synthesized render SHA-256s match: **${report.determinism.twoRendersByteIdentical}**.`,
    `- Render 1: \`${report.determinism.render1Sha256}\``,
    `- Render 2: \`${report.determinism.render2Sha256}\``, '',
    'Short-term section readings and onset method are in audio-report.json. EBU short-term readings use a trailing three-second window, so one-bar excavation windows necessarily include the preceding section. Lead/sediment readings use isolated pre-master stems, excluding tool percussion and shared early reflections; this is not a claim of a 6 dB instantaneous sample ratio after saturation.',
    'Animatic uses AAC for ordinary MP4 compatibility; the WAV is the mastering reference. Plot vertical gold rules mark the timing-map boundaries, numbered against the key below each plot.', '',
    '## Known weaknesses / audition questions', '',
    '- This is a composed sketch, not a measured reconstruction of historical object acoustics. Modal ratios are deliberately designed rather than claimed as physical measurements.',
    '- The three brick periods share a real resonator family. Their differences are mostly decay and fragment texture; whether those differences read clearly requires the user’s listening comparison.',
    '- The D–A–G–E opening cell repeats through ten short eras. Travelling call/answer endings reduce the literal loop, but the deliberately tight material comparison may still feel over-regular.',
    '- The linked sediment cap keeps the low end clear but makes buried material breathe with the melody. The oldest layers are genuinely present, though not always individually identifiable.',
    '- The reverse transition changes playback rate, so it changes pitch as well as direction. It is intentionally score-derived, not a historical timbre.',
    '- A deterministic memoryless soft-saturation master meets loudness without a compressor. It changes transient colour at louder peaks; a later mastering pass may use a more transparent limiter if requested.',
    '- No direct human/headphone audition was performed by this code-only session. Audible qualities above describe the design; objective checks do not replace the requested user audition.',
    '', '## Rebuild', '', '`tools\\node-v24.22.1-win-x64\\node.exe scripts\\sound\\score.cjs`', '',
    'The rebuild performs two fresh syntheses and masters, checks equal SHA-256, and regenerates all deliverables. No timestamp or unseeded randomness enters either WAV.', ''
  ].join('\n'));
}
function main() {
  fs.mkdirSync(OUT, { recursive: true });
  console.log('Synthesizing all material leads, sediment, rewind and excavation.');
  const firstRaw = render(), first = master(firstRaw), firstBytes = wavBuffer(first);
  fs.writeFileSync(path.join(OUT, 'strata-score.wav'), firstBytes);
  const hash1 = crypto.createHash('sha256').update(firstBytes).digest('hex');
  console.log(`First render ${hash1}. Independently repeating complete synthesis and master.`);
  const secondRaw = render(), second = master(secondRaw), secondBytes = wavBuffer(second);
  const hash2 = crypto.createHash('sha256').update(secondBytes).digest('hex');
  if (hash1 !== hash2) throw new Error('Determinism check failed.');
  const timbreIndex = writeTimbres(), loudness = measure(), onsetReport = onsets(first);
  let endPeak = 0;
  for (let i = 59.5 * SR; i < N; i++) endPeak = Math.max(endPeak, Math.abs(first.L[i]), Math.abs(first.R[i]));
  const report = {
    format: { sampleRate: SR, channels: 2, bitsPerSample: 24, pcmFrames: N, seconds: SECONDS },
    timingContract: 'output/review/film-timing.md v0', seed: SEED,
    music: { bpm: 120, meter: '4/4', barSeconds: 2, mode: 'D Dorian: D E F G A B C', melody: phrase.map(n => ({ ...n, name: noteName(n.midi) })),
      eraVariants: sections.slice(2, 12).map((s, i) => ({ section: s.name, role: i % 2 ? 'answer' : 'call', notes: eraPhrase(i).map(n => noteName(n.midi)) })) },
    determinism: { algorithm: 'SHA-256', render1Sha256: hash1, render2Sha256: hash2, twoRendersByteIdentical: hash1 === hash2, method: 'Two complete fresh seeded syntheses and two fresh deterministic mastering passes in one invocation.' },
    loudness, onsets: onsetReport, leadOverSediment: firstRaw.dominance,
    toolEvents: firstRaw.toolEvents, timbreComparison: timbreIndex,
    master: { type: 'Static gain into memoryless tanh; no compressor', gain: first.gain, ceilingDbfs: db(CEILING), internalLufs: first.internalLufs },
    endTail: { fromSeconds: 59.5, maximumDbfs: db(endPeak), finalSampleL: first.L[N - 1], finalSampleR: first.R[N - 1] },
    plots: { sectionBoundarySeconds: sections.slice(1).map(s => s.start), width: 1920, height: 990 },
    knownLimitations: ['No direct headphone audition in this session.', 'Lead/sediment dominance is measured on pre-master stems, not instantaneously on the nonlinear master.', 'Three-second EBU windows straddle two-second excavation sections.']
  };
  fs.writeFileSync(path.join(OUT, 'audio-report.json'), JSON.stringify(report, null, 2) + '\n');
  writeNotes(report);
  console.log(JSON.stringify({ loudness: { integratedLufs: loudness.integratedLufs, truePeakDbtp: loudness.truePeakDbtp, lraLu: loudness.lraLu }, onsetsMs: onsetReport.sections.map(s => s.offsetMs), dominanceDb: report.leadOverSediment.map(s => s.minimum200msWindowDb), endTail: report.endTail }, null, 2));
  if (Math.abs(loudness.integratedLufs - TARGET) > .5 || loudness.truePeakDbtp > -1) throw new Error('Loudness/true-peak acceptance failed.');
  if (onsetReport.coldOpenFirstSoundMs > 100 || onsetReport.sections.slice(2, 12).some(s => s.offsetMs > 5)) throw new Error('Onset acceptance failed.');
  if (report.leadOverSediment.some(s => s.leadOverCombinedSedimentDb < 6 || s.minimum200msWindowDb !== null && s.minimum200msWindowDb < 6)) throw new Error('Sediment dominance acceptance failed.');
  if (report.endTail.maximumDbfs > -50) throw new Error('End-tail acceptance failed.');
  console.log('Rendering boundary-marked plots and 1080p audition animatic.');
  plots(); animatic();
  const probe = spawnSync(FFPROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path.join(OUT, 'animatic.mp4')], { encoding: 'utf8' });
  if (probe.status !== 0) throw new Error(probe.stderr);
  fs.writeFileSync(path.join(OUT, 'animatic-probe.json'), probe.stdout);
  const info = JSON.parse(probe.stdout), video = info.streams.find(s => s.codec_type === 'video');
  if (video.width !== 1920 || video.height !== 1080 || video.nb_frames !== '1800' || Number(info.format.duration) !== 60) throw new Error('Animatic format acceptance failed.');
  console.log(`Complete: ${OUT}`);
}
if (require.main === module) main();
module.exports = { SR, N, SECONDS, TAU, SEED, ROOT, phrase, sections, eraPhrase, materials,
  clamp, smooth, hz, db, noteName, rng, bus, add, rms, filterHighpass, kWeight, lufsOf, wavBuffer };
