'use strict';
// Sketch 02. Source material is numerical synthesis, not recordings.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const base = require('./score.cjs');
const { SR, N, TAU, ROOT, phrase, eraPhrase, clamp, smooth, hz, db, noteName, rng, bus, add, rms, filterHighpass, kWeight, lufsOf, wavBuffer } = base;
const OUT = path.join(ROOT, 'output', 'sound', 'v2');
const FF = path.join(ROOT, 'tools', 'ffmpeg', 'bin', 'ffmpeg.exe');
const PROBE = path.join(ROOT, 'tools', 'ffmpeg', 'bin', 'ffprobe.exe');
const sections = base.sections.map((s, i) => ({ ...s, material: i === 0 || i === 15 ? 3 : s.material }));
sections[11].dates = 'Modern fill / no sourced date range';
const materials = [
  { name: 'Earth / sherd', r: [1, 1.93, 2.76], a: [1, .17, .045], tau: .043, attack: .0028, noise: .003, cutoff: 950 },
  { name: 'Terracotta', r: [1, 1.63, 2.35, 3.51, 5.02], a: [.8, .52, .35, .17, .08], tau: .185, attack: .00065, noise: .003, cutoff: 11500 },
  { name: 'Mud brick / rubble', r: [1, 1.41, 2.31, 3.81], a: [.8, .22, .14, .08], tau: .035, attack: .0013, noise: .045, cutoff: 1700, grains: 3 },
  { name: 'Burnt brick', r: [1, 2.81, 4.35, 6.5, 8.8], a: [.65, .8, .65, .35, .2], tau: .09, attack: .00015, noise: .006, cutoff: 15500 },
  { name: 'Brick-jelly', r: [1, 2.81, 4.35, 6.5, 8.8], a: [.8, .9, .55, .2, .1], tau: .09, attack: .00015, noise: .008, cutoff: 13000, grains: 11 },
  { name: 'Brick-bats', r: [1, 2.53, 4.11, 6.32, 9.1], a: [.55, .7, .73, .35, .15], tau: .03, attack: .00012, noise: .001, cutoff: 14000, grains: 3 },
  { name: 'Semi-dressed stone', r: [1, 2.71, 4.51, 6.91, 9.53], a: [.5, .6, .7, .55, .3], tau: .135, attack: .00007, noise: .003, cutoff: 17500 },
  { name: 'Rubble stone / lime', r: [1, 2.7, 4.49, 6.85, 9.4], a: [.6, .65, .65, .4, .18], tau: .105, attack: .001, noise: .024, cutoff: 8500 },
  { name: 'Porcelain / glass', r: [1, 2.67, 4.72, 7.1, 10.3, 14.4, 19.7], a: [.35, .35, .55, .6, .6, .45, .3], tau: .64, attack: .00006, noise: .001, cutoff: 19500 },
  { name: 'Mixed loose fill', r: [1, 2.18, 2.67, 4.72, 7.1, 10.3], a: [.6, .35, .45, .3, .25, .17], tau: .115, attack: .0004, noise: .035, cutoff: 8500, grains: 9 }
];
const materialTargets = [
  { centroidHz: [0, 600], t20Ms: [60, 150], attackMs: [5, 15] },
  { centroidHz: [700, 1100], t20Ms: [300, 600], attackMs: [2, 5] },
  { centroidHz: [600, 1000], t20Ms: [60, 120], attackMs: [3, 8], flatnessVsTerracotta: 2 },
  { centroidHz: [1200, 1800], t20Ms: [150, 300], attackMs: [0, 2] },
  { centroidHz: [1200, 1800], t20Ms: [150, 300], attackMs: [0, 2], flatnessVsBurntBrick: 1.5 },
  { centroidHz: [1300, 2000], t20Ms: [50, 100], attackMs: [0, 2] },
  { centroidHz: [1800, 2800], t20Ms: [200, 450], attackMs: [0, 1] },
  { centroidHz: [1400, 2200], t20Ms: [150, 350], attackMs: [3, 6] },
  { centroidHz: [3000, 12000], t20Ms: [800, 1600], attackMs: [0, 1] },
  { centroidHz: null, t20Ms: null, attackMs: null }
];
const eventLedger = [];
function run(exe, args) {
  const p = spawnSync(exe, args, { cwd: OUT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (p.error) throw p.error;
  if (p.status !== 0) throw new Error(p.stderr);
  return p.stdout + p.stderr;
}
function ff(args) { return run(FF, ['-hide_banner', ...args]); }
function strike(material, midi, tag, options = {}) {
  const m = materials[material], random = rng(`v2-${tag}`);
  const length = Math.round((options.duration || 2) * SR), out = new Float64Array(length);
  const position = .15 + random() * .7, velocity = .91 + random() * .18;
  const transpose = options.transpose || 0, f = hz(midi + transpose);
  const damping = options.damping || 1;
  const contactPeak = [.009, .0034, .005, .0007, .0007, .0006, .00035, .004, .0003, .0018][material];
  const cutoff = options.cutoff || m.cutoff, pole = Math.exp(-TAU * cutoff / SR);
  const modes = m.r.map((ratio, k) => {
    const omega = TAU * f * ratio * (1 + (random() - .5) * .0015) / SR;
    const phase = random() * TAU;
    return { s: Math.sin(phase), c: Math.cos(phase), ss: Math.sin(omega), cc: Math.cos(omega),
      amp: m.a[k] * (.85 + .28 * Math.cos(Math.PI * (k + 1) * position)) * (.94 + .12 * random()),
      decay: Math.exp(-1 / (m.tau * damping * (k === 0 ? 1.04 : 1 - .025 * k) * SR)) };
  });
  const grains = Array.from({ length: m.grains || 0 }, (_, i) => ({
    start: .004 + i * (material === 4 ? .010 : .008) + .002 * random(),
    f: (material === 2 ? 600 : 1000) + random() * (material === 2 ? 1500 : 3000), amp: (material === 4 ? .035 : .018) * (.6 + random()),
    tau: material === 4 ? .018 : .005
  }));
  let low = 0, noiseLow = 0;
  const contactTau = material === 2 ? .028 : material === 4 ? .105 : material === 7 ? .050 : .025;
  for (let n = 0; n < length; n++) {
    const t = n / SR;
    let value = 0;
    for (const mode of modes) {
      value += mode.s * mode.amp;
      const s = mode.s * mode.cc + mode.c * mode.ss;
      mode.c = mode.c * mode.cc - mode.s * mode.ss; mode.s = s; mode.amp *= mode.decay;
    }
    const noise = random() * 2 - 1;
    noiseLow = .60 * noiseLow + .40 * noise;
    value += m.noise * (material === 2 || material === 7 ? noiseLow : noise) * Math.exp(-t / contactTau);
    for (const g of grains) if (t >= g.start && t < g.start + .11) {
      const gt = t - g.start;
      value += g.amp * Math.sin(TAU * g.f * gt) * Math.exp(-gt / g.tau) * smooth(gt / .0004);
    }
    value *= smooth(t / contactPeak) * smooth((length / SR - t) / .04);
    low = pole * low + (1 - pole) * value;
    out[n] = low * velocity * .32;
  }
  // A short physical contact packet precedes the freely beating resonator.
  // It moves no mode phases into alignment and does not lengthen the ring.
  if (material !== 0 && material !== 7 && material !== 9) {
    let peak = 0;
    for (const value of out) peak = Math.max(peak, Math.abs(value));
    const center = Math.round(contactPeak * SR), sign = Math.sign(out[center]) || 1;
    const width = material === 1 ? .0007 : material === 2 ? .0008 : .00018;
    const a = Math.max(0, center - Math.ceil(width * 5 * SR)), b = Math.min(length, center + Math.ceil(width * 5 * SR));
    for (let n = a; n < b; n++) {
      const t = n / SR, local = t - contactPeak;
      const weight = Math.exp(-.5 * (local / width) ** 2) * smooth(t / .00004);
      const contact = sign * peak * 1.035 * Math.cos(TAU * f * local);
      out[n] = out[n] * (1 - weight) + contact * weight;
    }
  }
  if (options.cutoff) {
    let a = 0, b = 0;
    for (let n = 0; n < out.length; n++) {
      a = pole * a + (1 - pole) * out[n]; b = pole * b + (1 - pole) * a; out[n] = b;
    }
  }
  return { samples: out, position, velocity, material, midi, tag };
}
function put(target, time, sound, gain = 1, pan = 0, record = false) {
  const start = Math.round(time * SR), left = Math.cos((pan + 1) * Math.PI / 4), right = Math.sin((pan + 1) * Math.PI / 4);
  for (let n = 0; n < sound.samples.length && n + start < target.L.length; n++) {
    target.L[start + n] += sound.samples[n] * gain * left;
    target.R[start + n] += sound.samples[n] * gain * right;
  }
  if (record) eventLedger.push({ timeSeconds: time, midi: sound.midi, note: noteName(sound.midi), material: materials[sound.material].name,
    position: sound.position, velocity: sound.velocity, sha256: crypto.createHash('sha256').update(Buffer.from(sound.samples.buffer)).digest('hex') });
}
function play(target, time, material, tag, options = {}) {
  for (const [i, note] of (options.notes || phrase).entries()) {
    const sound = strike(material, note.midi, `${tag}-${i}`, options);
    put(target, time + note.t * (options.stretch || 1), sound, note.vel * (options.gain || 1), options.pan || (i % 2 ? .14 : -.14), !!options.record);
  }
}
function scaleBus(audio, gain) {
  for (const c of ['L', 'R']) for (let i = 0; i < audio[c].length; i++) audio[c][i] *= gain;
  return audio;
}
function cropBus(audio, a, b) { return { L: audio.L.slice(Math.round(a * SR), Math.round(b * SR)), R: audio.R.slice(Math.round(a * SR), Math.round(b * SR)) }; }
function meanLoudness(audio) {
  const l = kWeight(audio.L), r = kWeight(audio.R);
  let e = 0;
  for (let i = 0; i < l.length; i++) e += l[i] ** 2 + r[i] ** 2;
  return -.691 + 10 * Math.log10(e / l.length + 1e-30);
}
function equalRms(audio, target = .11) { return scaleBus(audio, target / Math.max(1e-12, rms(audio, 0, audio.L.length))); }
function materialCalibration() {
  const all = bus(20 * SR), index = [], rows = [];
  for (let m = 0; m < 10; m++) {
    const sound = strike(m, 69, `single-${m}`), local = bus(2 * SR);
    put(local, 0, sound); equalRms(local, .035); add(all, local, m * 2 * SR);
    const filename = `material-${m}.wav`;
    fs.writeFileSync(path.join(OUT, filename), wavBuffer(local));
    index.push({ material: materials[m].name, startSeconds: m * 2, durationSeconds: 2, pitch: 'A4', midi: 69 });
    const text = ff(['-v', 'error', '-i', filename, '-af',
      'atrim=duration=0.2,pan=mono|c0=0.5*c0+0.5*c1,aspectralstats=win_size=4096:overlap=0.75:measure=mean+centroid+flatness,ametadata=mode=print:file=-', '-f', 'null', '-']);
    const frames = [...text.matchAll(/lavfi\.aspectralstats\.1\.mean=([\d.e+-]+)[\s\S]*?lavfi\.aspectralstats\.1\.centroid=([\d.e+-]+)[\s\S]*?lavfi\.aspectralstats\.1\.flatness=([\d.e+-]+)/g)]
      .map(x => ({ weight: +x[1], centroid: +x[2], flatness: +x[3] }));
    const total = frames.reduce((s, f) => s + f.weight, 0);
    const centroidHz = frames.reduce((s, f) => s + f.weight * f.centroid, 0) / total;
    const flatness = frames.reduce((s, f) => s + f.weight * f.flatness, 0) / total;
    const mono = local.L, env = [];
    // 1-ms centred RMS: attack and T20 are measured on the dry envelope, not sample peaks.
    for (let n = 0; n < mono.length; n += 48) {
      let energy = 0, count = 0;
      for (let j = Math.max(0, n - 24); j < Math.min(mono.length, n + 24); j++) { energy += mono[j] ** 2; count++; }
      env.push(Math.sqrt(energy / count));
    }
    const peak = Math.max(...env), peakIndex = env.indexOf(peak);
    let samplePeak = 0, samplePeakIndex = 0;
    for (let n = 0; n < mono.length; n++) if (Math.abs(mono[n]) > samplePeak) { samplePeak = Math.abs(mono[n]); samplePeakIndex = n; }
    let onset = 0; while (onset < mono.length && Math.abs(mono[onset]) < samplePeak * .001) onset++;
    let t20 = peakIndex;
    // Require 15 ms continuously below -20 dB, to reject inharmonic beat nulls.
    while (t20 + 15 < env.length && env.slice(t20, t20 + 15).some(e => e > peak * .1)) t20++;
    const row = { material: materials[m].name, centroidHz, flatness, attackMs: (samplePeakIndex - onset) / SR * 1000,
      t20Ms: t20 - peakIndex, targets: materialTargets[m], method: 'Magnitude-weighted 4096-point FFTs over first 200 ms; attack = -60 dB relative onset to absolute sample peak; T20 = 1-ms centred RMS envelope, first 15-ms sustained crossing after RMS peak.' };
    rows.push(row);
  }
  fs.writeFileSync(path.join(OUT, 'materials-single-notes.wav'), wavBuffer(all));
  fs.writeFileSync(path.join(OUT, 'materials-measured.json'), JSON.stringify(rows, null, 2) + '\n');
  return { index, rows };
}
function makeTimbres() {
  const comparison = bus(Math.round(16 * 4.4 * SR)), index = [];
  sections.forEach((s, i) => {
    const material = s.material === undefined ? (i === 1 ? 8 : [0, 0, 3][i - 12]) : s.material;
    const temp = bus(4 * SR);
    play(temp, 0, material, `timbre-${i}`);
    if (i === 1) for (const c of ['L', 'R']) temp[c].reverse();
    equalRms(temp, .065);
    for (let n = 0; n < temp.L.length; n++) {
      const fade = smooth((4 - n / SR) / .03); temp.L[n] *= fade; temp.R[n] *= fade;
    }
    add(comparison, temp, Math.round(i * 4.4 * SR));
    index.push({ section: s.name, material: i === 1 ? 'Fixed-pitch reversed porcelain fragment phrase' : materials[material].name,
      startSeconds: i * 4.4, phraseSeconds: 4, gapSeconds: .4 });
  });
  fs.writeFileSync(path.join(OUT, 'timbres.wav'), wavBuffer(comparison));
  return index;
}

const registers = [45, 47, 48, 50, 52, 53, 55, 57, 59, 60];
const dCollection = [26, 28, 29, 31, 33, 35, 36, 38, 40, 41, 43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76];
const desiredRatios = [null, 11.8, 9.4, 8.7, 8.3, 7.9, 7.5, 7.1, 6.7, 6.3];
const relativeArc = [1, -2, -7.8, -6.4, -5.1, -4.2, -3.3, -2.5, -1.8, -1.0, -.3, -.3, 2.1, 2.1, 2.1, -.2];
const exits = [4, 4.8, 5.45, 6, 6.45, 6.83, 7.15, 7.43, 7.66, 7.85, 8];
function makeLayer(index) {
  const target = bus(), rootIndex = dCollection.indexOf(registers[index]);
  const ownPhrase = eraPhrase(index), rootLead = dCollection.indexOf(62);
  const layerNote = n => {
    const leadIndex = dCollection.indexOf(n.midi);
    return dCollection[rootIndex + leadIndex - rootLead];
  };
  const regions = [[0, exits[10 - index]], [12 + index * 4, 48], [54, 59.45]];
  if (index === 0) regions.push([50, 52]);
  if (index === 3) regions.push([52, 54]);
  for (const [region, [a, b]] of regions.entries()) {
    for (let t = a + .22 + index * .027, count = 0; t < b; t += 2, count++) {
      const n = ownPhrase[count % ownPhrase.length];
      const sound = strike(index, layerNote(n), `sediment-${index}-${region}-${count}`, {
        duration: 1.35, damping: [3.2, 1.0, 3.0, 1.2, 1.2, 3.0, 1.0, 1.1, .6, 1.0][index], cutoff: 330 + index * 105
      });
      let energy = 0;
      for (const value of sound.samples) energy += value * value;
      const norm = .05 / Math.sqrt(energy / sound.samples.length);
      const unitVelocity = .985 + .03 * rng(`buried-velocity-${index}-${region}-${count}`)();
      for (let n = 0; n < sound.samples.length; n++) sound.samples[n] *= norm * unitVelocity;
      eventLedger.push({ role: 'sediment', timeSeconds: t, midi: sound.midi, note: noteName(sound.midi),
        material: materials[index].name, position: sound.position, velocity: unitVelocity,
        sha256: crypto.createHash('sha256').update(Buffer.from(sound.samples.buffer)).digest('hex') });
      const segment = bus(Math.round(Math.min(1.35, b - t) * SR));
      put(segment, 0, sound, 1, (index % 2 ? 1 : -1) * (.22 + index * .025));
      add(target, segment, Math.round(t * SR));
    }
  }
  filterHighpass(target, 70);
  return target;
}
function solveLayerGain(previous, next, a, b, desired) {
  let aa = 0, ab = 0, bb = 0;
  for (let i = a; i < b; i++) for (const c of ['L', 'R']) {
    aa += next[c][i] ** 2; ab += previous[c][i] * next[c][i]; bb += previous[c][i] ** 2;
  }
  const target = desired ** 2 * (b - a);
  if (aa < 1e-20 || bb >= target) return 0;
  return Math.max(0, (-ab + Math.sqrt(ab * ab + aa * (target - bb))) / aa);
}
function makeTools(target) {
  const events = [];
  const patterns = [
    [[0, 'pick', .8, -.3], [.5, 'trowel', .7, .25], [.875, 'sieve', .6, -.2], [1.5, 'brush', .75, .2]],
    [[0, 'brush', .8, .2], [.5, 'trowel', .55, -.25], [1, 'sieve', .65, .25], [1.75, 'brush', .65, -.2]],
    [[0, 'pick', .8, -.25], [.5, 'pick', .5, .25], [1, 'trowel', .65, -.2], [1.5, 'sieve', .7, .25], [1.75, 'brush', .5, 0]]
  ];
  for (let season = 0; season < 3; season++) for (const [offset, kind, velocity, pan] of patterns[season]) {
    const time = 48 + 2 * season + offset + (offset === 0 ? .0015 : 0), random = rng(`tool-v2-${season}-${kind}-${offset}`), duration = .25;
    const samples = new Float64Array(Math.round(duration * SR));
    const pickPhaseA = random() * TAU, pickPhaseB = random() * TAU;
    let low = 0, high = 0;
    for (let n = 0; n < samples.length; n++) {
      const t = n / SR, noise = random() * 2 - 1;
      low = .65 * low + .35 * noise; high = .94 * high + .06 * low;
      const band = low - high;
      let value = kind === 'pick' ? .65 * (.25 * Math.cos(TAU * 1390 * t + pickPhaseA) + .11 * Math.cos(TAU * 3077 * t + pickPhaseB) + .2 * band) * Math.exp(-t / .016) :
        kind === 'trowel' ? .4 * band * (.5 + .5 * Math.sin(TAU * 73 * t) ** 2) * Math.exp(-t / .075) :
        kind === 'sieve' ? .4 * band * (.1 + .9 * Math.max(0, Math.sin(TAU * 31 * t)) ** 6) * Math.exp(-t / .10) :
        .31 * band * smooth(t / .012) * Math.exp(-t / .065);
      samples[n] = value * velocity * smooth(t / .0004) * smooth((duration - t) / .025);
    }
    put(target, time, { samples }, 1, pan);
    events.push({ timeSeconds: time, tool: kind, season: sections[12 + season].name });
  }
  return events;
}
function compose() {
  eventLedger.length = 0;
  const lead = bus(), sediment = bus(), tools = bus(), layerGains = [];
  const openingNotes = phrase.map((n, i) => ({ ...n, midi: i === 6 ? 69 : n.midi }));
  const leadSections = [];
  for (const [i, s] of sections.entries()) {
    if (i === 1 || i >= 12 && i <= 14) continue;
    const local = bus((s.end - s.start) * SR), notes = i === 0 ? openingNotes : i === 15 ? phrase : eraPhrase(i - 2);
    play(local, 0, s.material, `lead-${i}`, { notes, record: false });
    equalRms(local, .10);
    for (let n = 0; n < local.L.length; n++) {
      const fade = smooth(((s.end - s.start) - n / SR) / .006);
      local.L[n] *= fade; local.R[n] *= fade;
    }
    add(lead, local, s.start * SR);
    notes.forEach((note, j) => {
      const sound = strike(s.material, note.midi, `lead-${i}-${j}`);
      eventLedger.push({ timeSeconds: s.start + note.t, midi: note.midi, note: noteName(note.midi), material: materials[s.material].name,
        position: sound.position, velocity: sound.velocity, sha256: crypto.createHash('sha256').update(Buffer.from(sound.samples.buffer)).digest('hex') });
    });
    leadSections.push({ section: s.name, start: s.start, end: s.end, notes });
  }
  // Fixed-pitch fragments are reversed at their native sample rate. Only spacing accelerates.
  const rewindPeels = [];
  for (let j = 0; j < 10; j++) {
    const material = 9 - j, start = exits[j], stop = exits[j + 1], duration = Math.min(.28, stop - start);
    const sound = strike(material, phrase[j % phrase.length].midi, `peel-${material}`, { duration });
    sound.samples.reverse();
    eventLedger.push({ role: 'rewind fragment', timeSeconds: start, midi: sound.midi, note: noteName(sound.midi),
      material: materials[material].name, position: sound.position, velocity: sound.velocity,
      sha256: crypto.createHash('sha256').update(Buffer.from(sound.samples.buffer)).digest('hex') });
    const temp = bus(Math.round(duration * SR)); put(temp, 0, sound); equalRms(temp, .055 * (1 - .065 * j));
    for (let n = 0; n < temp.L.length; n++) {
      const g = smooth(n / (SR * .002)) * smooth((temp.L.length - n) / (SR * .003));
      temp.L[n] *= g; temp.R[n] *= g;
    }
    add(lead, temp, Math.round(start * SR));
    rewindPeels.push({ material: materials[material].name, startSeconds: start, durationSeconds: duration, playbackRate: 1, reversed: true });
  }
  for (let m = 0; m < 10; m++) {
    const layer = makeLayer(m);
    const next = sections[m + 3];
    let gain;
    if (m < 9) {
      const a = next.start * SR, b = next.end * SR;
      const wanted = rms(lead, a, b) / 10 ** (desiredRatios[m + 1] / 20);
      gain = Math.max(.15, solveLayerGain(sediment, layer, a, b, wanted));
    } else gain = layerGains[8] * .85;
    layerGains.push(gain); add(sediment, layer, 0, gain);
  }
  // Melody data is unchanged; material ownership follows the three season captions.
  for (const [i, n] of phrase.entries()) {
    const time = 48 + n.t, midi = i === 6 ? 65 : n.midi;
    const material = i < 4 ? [9, 7, 3, 0][i] : 0;
    put(lead, time, strike(material, midi, `dig-melody-${i}`), n.vel * .85, i % 2 ? .12 : -.12, true);
  }
  for (const [i, n] of phrase.filter(n => n.t < 2).entries()) put(lead, 52 + n.t,
    strike(3, n.midi, `dig-deep-${i}`), n.vel * .85, 0, true);
  const surfacing = [];
  for (let j = 0; j < 10; j++) {
    const material = 9 - j, time = 48.004 + 1.68 * (1 - (1 - j / 10) ** 1.4);
    const sound = strike(material, material === 0 ? 62 : 57, `surface-${j}`, { duration: .34, damping: .55 });
    eventLedger.push({ role: 'surfacing', timeSeconds: time, midi: sound.midi, note: noteName(sound.midi),
      material: materials[material].name, position: sound.position, velocity: sound.velocity,
      sha256: crypto.createHash('sha256').update(Buffer.from(sound.samples.buffer)).digest('hex') });
    const temp = bus(Math.round(.34 * SR)); put(temp, 0, sound); equalRms(temp, .022);
    add(sediment, temp, Math.round(time * SR));
    surfacing.push({ season: '2013–14', material: materials[material].name, seconds: time });
  }
  const toolEvents = makeTools(tools);
  // Dynamic shaping is one slow scene-level gain, shared by lead and sediment.
  const scene = bus(), sceneGains = [];
  for (const [i, s] of sections.entries()) {
    const a = s.start * SR, b = s.end * SR, local = bus(b - a);
    for (let n = a; n < b; n++) for (const c of ['L', 'R']) local[c][n - a] = lead[c][n] + sediment[c][n] + tools[c][n];
    const measured = meanLoudness(i === 15 ? cropBus(local, 0, 4) : local);
    const desired = -14 + relativeArc[i];
    const gain = 10 ** ((desired - measured) / 20); sceneGains.push(gain);
    for (let n = a; n < b; n++) {
      // The new lead always receives its own scene gain, including its first contact.
      const g = gain;
      for (const c of ['L', 'R']) {
        lead[c][n] *= g; sediment[c][n] *= g; tools[c][n] *= g;
        scene[c][n] = lead[c][n] + sediment[c][n] + tools[c][n];
      }
    }
  }
  for (let n = 58 * SR; n < N; n++) {
    const g = 1 - smooth((n / SR - 58) / 1.45);
    for (const c of ['L', 'R']) { lead[c][n] *= g; sediment[c][n] *= g; tools[c][n] *= g; scene[c][n] *= g; }
  }
  const dominance = sections.slice(2, 12).map((s, i) => {
    const a = s.start * SR, b = s.end * SR;
    const windows = eraPhrase(i).map(note => {
      const start = Math.round((s.start + note.t) * SR), stop = Math.min(N, start + Math.round(.15 * SR));
      const buriedRms = rms(sediment, start, stop);
      return { onsetSeconds: s.start + note.t, leadOverSedimentDb: buriedRms > 1e-12 ? db(rms(lead, start, stop) / buriedRms) : null };
    });
    let min200 = Infinity;
    for (let n = a; n + .2 * SR <= b; n += .05 * SR) min200 = Math.min(min200, db(rms(lead, n, n + .2 * SR) / Math.max(1e-12, rms(sediment, n, n + .2 * SR))));
    const valid = windows.filter(w => w.leadOverSedimentDb !== null), buriedRms = rms(sediment, a, b);
    return { section: s.name, sectionRmsDb: buriedRms > 1e-12 ? db(rms(lead, a, b) / buriedRms) : null,
      targetSectionRmsDb: i === 0 ? null : i <= 2 ? [9, 12] : [6, 9],
      minimum150msAfterOnsetDb: valid.length ? Math.min(...valid.map(w => w.leadOverSedimentDb)) : null, onsetWindows: windows,
      nullMeansNoSedimentPresent: true,
      failedOnsetsBelow4Db: valid.filter(w => w.leadOverSedimentDb < 4),
      onsetsBelow6DbTarget: valid.filter(w => w.leadOverSedimentDb < 6),
      legacyMinimum200msIncludingGapsDb: min200, legacy200msIsNotAcceptanceRule: true };
  });
  const ledger = eventLedger.map(e => ({ ...e }));
  return { ...scene, lead, sediment, tools, dominance, layerGains, sceneGains, leadSections, rewindPeels, surfacing, toolEvents, ledger };
}
function limit(raw, gain, rate = SR) {
  const ceiling = 10 ** (-1.35 / 20), length = raw.L.length, ahead = Math.round(rate * .010), release = Math.exp(-1 / (rate * .015));
  const desired = new Float64Array(length), nextMax = new Float64Array(length), queue = new Int32Array(length);
  // Sliding maximum over a 10-ms future window, with immediate attack and smooth 15-ms release.
  const peaks = new Float64Array(length);
  for (let n = 0; n < length; n++) peaks[n] = Math.max(Math.abs(raw.L[n]), Math.abs(raw.R[n])) * gain;
  let head = 0, tail = 0;
  for (let n = length - 1; n >= 0; n--) {
    while (head < tail && queue[head] > n + ahead) head++;
    while (head < tail && peaks[queue[tail - 1]] <= peaks[n]) tail--;
    queue[tail++] = n; nextMax[n] = peaks[queue[head]];
  }
  let g = 1, minimum = 1, maxReductionSample = 0;
  const out = bus(length);
  let active = 0;
  for (let n = 0; n < length; n++) {
    const want = Math.min(1, ceiling / Math.max(1e-12, nextMax[n]));
    g = want < g ? want : release * g + (1 - release) * want;
    desired[n] = g * gain;
    if (g < minimum) { minimum = g; maxReductionSample = n; }
    if (g < 10 ** (-.1 / 20)) active++;
    out.L[n] = raw.L[n] * desired[n]; out.R[n] = raw.R[n] * desired[n];
  }
  return { ...out, gainEnvelope: desired, maximumGainReductionDb: -db(minimum), limiterActiveShare: active / length,
    maximumGainReductionTimeSeconds: maxReductionSample / rate,
    activeThresholdDb: .1, staticGain: gain, ceilingDbfs: db(ceiling), lookAheadMs: 10, releaseMs: 15 };
}
function interleavedBuffer(audio, gain = 1) {
  const b = Buffer.alloc(audio.L.length * 16);
  for (let n = 0; n < audio.L.length; n++) { b.writeDoubleLE(audio.L[n] * gain, n * 16); b.writeDoubleLE(audio.R[n] * gain, n * 16 + 8); }
  return b;
}
function readInterleaved(filename) {
  const b = fs.readFileSync(filename), out = bus(b.length / 16);
  for (let n = 0; n < out.L.length; n++) { out.L[n] = b.readDoubleLE(n * 16); out.R[n] = b.readDoubleLE(n * 16 + 8); }
  return out;
}
function oversampledPeakPass(raw, gain, useClipper, tag) {
  const input = `${tag}-input.f64`, over = `${tag}-4x.f64`, processed = `${tag}-processed-4x.f64`, output = `${tag}-48k.f64`;
  fs.writeFileSync(path.join(OUT, input), interleavedBuffer(raw, gain));
  ff(['-v', 'error', '-y', '-f', 'f64le', '-ar', String(SR), '-ac', '2', '-i', input,
    '-af', 'aresample=192000:filter_size=48:phase_shift=10:exact_rational=1', '-f', 'f64le', over]);
  const up = readInterleaved(path.join(OUT, over));
  let clippedSamples = 0, clippedFrames = 0, maxClipReduction = 0;
  if (useClipper) {
    const threshold = 10 ** (-3.35 / 20), ceiling = 10 ** (-1.35 / 20), width = ceiling - threshold, maxRatio = 10 ** (-2 / 20);
    let start = -1;
    const applyRun = stop => {
      if (start >= 0 && stop - start < .001 * SR * 4) for (let n = start; n < stop; n++) {
        const peak = Math.max(Math.abs(up.L[n]), Math.abs(up.R[n]));
        const soft = threshold + width * (1 - Math.exp(-(peak - threshold) / width));
        const g = Math.max(maxRatio, soft / peak);
        if (g < 1 - 1e-12) {
          up.L[n] *= g; up.R[n] *= g; clippedFrames++; clippedSamples += 2;
          maxClipReduction = Math.max(maxClipReduction, -db(g));
        }
      }
      start = -1;
    };
    for (let n = 0; n < up.L.length; n++) {
      const above = Math.max(Math.abs(up.L[n]), Math.abs(up.R[n])) > threshold;
      if (above && start < 0) start = n;
      else if (!above && start >= 0) applyRun(n);
    }
    applyRun(up.L.length);
  }
  const limited = limit(up, 1, SR * 4);
  fs.writeFileSync(path.join(OUT, processed), interleavedBuffer(limited));
  ff(['-v', 'error', '-y', '-f', 'f64le', '-ar', '192000', '-ac', '2', '-i', processed,
    '-af', 'aresample=48000:filter_size=48:phase_shift=10:exact_rational=1,atrim=end_sample=2880000', '-f', 'f64le', output]);
  const down = readInterleaved(path.join(OUT, output));
  return { ...down, staticGain: gain, maximumGainReductionDb: limited.maximumGainReductionDb,
    maximumGainReductionTimeSeconds: limited.maximumGainReductionTimeSeconds,
    limiterActiveShare: limited.limiterActiveShare, activeThresholdDb: limited.activeThresholdDb,
    ceilingDbfs: limited.ceilingDbfs, lookAheadMs: limited.lookAheadMs, releaseMs: limited.releaseMs,
    clipper: { enabled: useClipper, oversampling: 4, thresholdDbfs: -3.35, maximumAllowedReductionDb: 2,
      maximumActualReductionDb: maxClipReduction, onlyRunsShorterThanMs: 1, clippedOversampledChannelSamples: clippedSamples,
      clippedOversampledFrames: clippedFrames, shareOfOversampledFrames: clippedFrames / up.L.length } };
}
function masterV2(raw, target = -14, useClipper = false, tag = 'master') {
  let gain = 10 ** ((target - lufsOf(raw)) / 20), out;
  for (let i = 0; i < 3; i++) {
    out = oversampledPeakPass(raw, gain, useClipper, tag);
    const measured = lufsOf(out);
    if (Math.abs(measured - target) < .03) break;
    gain *= 10 ** ((target - measured) / 20);
  }
  // Keep a tiny static reserve when only rounding-sized peak headroom is missing.
  // This lowers loudness within its delivery tolerance; it never adds limiting.
  out.staticHeadroomReserveDb = 0;
  if (target === -15 && out.maximumGainReductionDb > 4 && out.maximumGainReductionDb <= 4.1) {
    out = oversampledPeakPass(raw, out.staticGain * 10 ** (-.08 / 20), useClipper, tag);
    out.staticHeadroomReserveDb = .08;
  }
  out.targetIntegratedLufs = target;
  return out;
}
function loudnessReport() {
  const text = ff(['-nostats', '-i', 'strata-score.wav', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  fs.writeFileSync(path.join(OUT, 'ebur128.txt'), text);
  const summary = text.slice(text.lastIndexOf('Summary:'));
  const integratedLufs = +summary.match(/I:\s+(-?[\d.]+)\s+LUFS/)[1];
  const truePeakDbtp = +summary.match(/Peak:\s+(-?[\d.]+)\s+dBFS/)[1];
  const lraLu = +summary.match(/LRA:\s+(-?[\d.]+)\s+LU/)[1];
  const readings = [...text.matchAll(/t:\s*([\d.]+)\s+TARGET:.*?M:\s*(-?[\d.]+)\s+S:\s*(-?[\d.]+)/g)]
    .map(m => ({ seconds: +m[1], momentaryLufs: +m[2], shortTermLufs: +m[3] }));
  return { integratedLufs, truePeakDbtp, lraLu, perSection: sections.map(s => {
    const frames = readings.filter(f => f.seconds >= Math.max(3, s.start + .1) && f.seconds < s.end + .001);
    const stable = readings.filter(f => f.seconds >= Math.max(3, s.start + 3) && f.seconds < s.end + .001);
    const values = frames.map(f => f.shortTermLufs);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return { section: s.name, startSeconds: s.start, endSeconds: s.end,
      minimumLufs: Math.min(...values), maximumLufs: Math.max(...values), meanLufs: mean,
      meanRelativeToIntegratedLu: mean - integratedLufs,
      stable3sMeanLufs: stable.length ? stable.reduce((a, b) => a + b.shortTermLufs, 0) / stable.length : null,
      stable3sRelativeLu: stable.length ? stable.reduce((a, b) => a + b.shortTermLufs, 0) / stable.length - integratedLufs : null,
      targetRelativeLu: relativeArc[sections.indexOf(s)], readings: frames };
  }), method: 'FFmpeg EBU R128; short-term = trailing 3 s. Stable means use windows wholly within the section; 2-s digs have none.' };
}

function textFilter(text, x, y, size = 18, color = '0xddd7c9') {
  text = text.replace(/'/g, '').replace(/:/g, '\\:').replace(/,/g, '\\,');
  return `drawtext=fontfile='C\\:/Windows/Fonts/consola.ttf':text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
}
function fft(real, imag) {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [real[i], real[j]] = [real[j], real[i]]; [imag[i], imag[j]] = [imag[j], imag[i]]; }
  }
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2, stepR = Math.cos(-TAU / size), stepI = Math.sin(-TAU / size);
    for (let start = 0; start < n; start += size) {
      let wr = 1, wi = 0;
      for (let j = 0; j < half; j++) {
        const a = start + j, b = a + half;
        const r = real[b] * wr - imag[b] * wi, im = real[b] * wi + imag[b] * wr;
        real[b] = real[a] - r; imag[b] = imag[a] - im; real[a] += r; imag[a] += im;
        const next = wr * stepR - wi * stepI; wi = wr * stepI + wi * stepR; wr = next;
      }
    }
  }
}
function reviewPlots(audio) {
  const W = 1920, H = 1000, X = 105, Y = 20, PW = 1775, PH = 640, SIZE = 4096;
  const image = Buffer.alloc(W * H * 3, 9), real = new Float64Array(SIZE), imag = new Float64Array(SIZE);
  const stops = [[9, 9, 16], [53, 28, 78], [136, 54, 94], [219, 102, 88], [249, 198, 133]];
  const pixel = (x, y, rgb) => { const i = (y * W + x) * 3; image[i] = rgb[0]; image[i + 1] = rgb[1]; image[i + 2] = rgb[2]; };
  for (let x = 0; x < PW; x++) {
    const center = Math.round(x / (PW - 1) * (N - 1));
    for (let n = 0; n < SIZE; n++) {
      const i = center + n - SIZE / 2;
      real[n] = i >= 0 && i < N ? (audio.L[i] + audio.R[i]) * .5 * (.5 - .5 * Math.cos(TAU * n / SIZE)) : 0;
      imag[n] = 0;
    }
    fft(real, imag);
    for (let y = 0; y < PH; y++) {
      const frequency = 40 * (16000 / 40) ** (1 - y / (PH - 1)), bin = frequency / SR * SIZE;
      const a = Math.floor(bin), f = bin - a;
      const magnitude = ((1 - f) * Math.hypot(real[a], imag[a]) + f * Math.hypot(real[a + 1], imag[a + 1])) / (SIZE / 2);
      const level = clamp((db(magnitude) + 90) / 80, 0, 1) * (stops.length - 1);
      const k = Math.min(stops.length - 2, Math.floor(level)), mix = level - k;
      pixel(X + x, Y + y, stops[k].map((v, i) => Math.round(v * (1 - mix) + stops[k + 1][i] * mix)));
    }
  }
  fs.writeFileSync(path.join(OUT, 'spectrogram.rgb'), image);
  const common = [];
  for (const [i, s] of sections.entries()) {
    const x = Math.round(X + s.start / 60 * PW);
    common.push(`drawbox=x=${x}:y=${Y}:w=1:h=${PH}:color=0xd8c494@0.8:t=fill`, textFilter(String(i).padStart(2, '0'), x + 3, 666, 17));
    common.push(textFilter(`${String(i).padStart(2, '0')}  ${s.start}s  ${s.short || s.name}`, 30 + i % 4 * 480, 770 + Math.floor(i / 4) * 47, 17));
  }
  common.push(textFilter('STRATA / SOUND SKETCH 02 / 60 s', 105, 716, 22));
  const axis = [100, 1000, 10000].flatMap(f => {
    const y = Math.round(Y + (1 - Math.log(f / 40) / Math.log(16000 / 40)) * (PH - 1));
    return [textFilter(f === 100 ? '100 Hz' : f === 1000 ? '1 kHz' : '10 kHz', 8, y - 9, 17),
      `drawbox=x=${X}:y=${y}:w=${PW}:h=1:color=white@0.22:t=fill`];
  });
  ff(['-y', '-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', `${W}x${H}`, '-i', 'spectrogram.rgb',
    '-vf', [...common, ...axis].join(','), '-frames:v', '1', 'spectrogram.png']);
  ff(['-y', '-i', 'strata-score.wav', '-lavfi',
    `showwavespic=s=${PW}x${PH}:split_channels=1:colors=0xc8b58e|0x93b7b6:scale=lin:filter=peak,pad=${W}:${H}:${X}:${Y}:color=0x090910,${common.join(',')}`,
    '-frames:v', '1', 'waveform.png']);
}
function timecode(t) { const n = Math.round(t * 100); return `0:${String(Math.floor(n / 6000)).padStart(2, '0')}:${String(Math.floor(n / 100) % 60).padStart(2, '0')}.${String(n % 100).padStart(2, '0')}`; }
function makeAnimatic() {
  const source = fs.readFileSync(path.join(ROOT, 'output', 'sound', 'audition.ass'), 'utf8');
  const header = source.slice(0, source.indexOf('Dialogue:'));
  const lines = [header];
  const event = (a, b, text, layer = 0) => lines.push(`Dialogue: ${layer},${timecode(a)},${timecode(b)},Default,,0,0,0,,${text}`);
  event(0, 60, '{\\pos(104,100)\\fs30\\c&H9EAAAD&}STRATA  /  SOUND SKETCH 02');
  event(0, 60, '{\\pos(104,1000)\\fs22\\c&H7A8085&}Internal timing audition / no picture / synthesized material resonators');
  for (const [i, s] of sections.entries()) {
    event(s.start, s.end, `{\\pos(104,315)\\fs24\\c&H9FAFAF&}SECTION ${String(i).padStart(2, '0')} / ${s.start}–${s.end} s`);
    event(s.start, s.end, `{\\pos(100,392)\\fs68}${s.name}`);
    event(s.start, s.end, `{\\pos(104,500)\\fs37\\c&HA5BDBC&}${s.dates}`);
    const material = i === 1 ? 'Top-down material exits / fixed pitch / accelerating spacing' :
      i === 12 ? 'Whole stack surfaces top-down / earth and sherd tick' :
      i === 13 ? 'Earth motif / brush, trowel and sieve' :
      i === 14 ? 'Early Kushan / burnt brick returns' : materials[s.material].name;
    event(s.start, s.end, `{\\pos(104,615)\\fs29\\c&H92A0A4&}${material}`);
  }
  event(0, 60, '{\\pos(110,826)\\p1\\c&H34383B&}m 0 0 l 1700 0 1700 4 0 4{\\p0}');
  for (let bar = 0; bar <= 30; bar++) event(0, 60, `{\\pos(${Math.round(110 + 1700 * bar / 30)},818)\\p1\\c&H697174&}m 0 0 l 1 0 1 20 0 20{\\p0}`);
  event(0, 60, '{\\move(110,805,1810,805,0,60000)\\p1\\c&H9EC3D5&}m -3 0 l 3 0 3 46 -3 46{\\p0}', 1);
  for (let bar = 0; bar < 30; bar++) event(bar * 2, (bar + 1) * 2, `{\\pos(110,890)\\fs32}BAR ${String(bar + 1).padStart(2, '0')} / 30  {\\c&H829195&}120 BPM  4/4`);
  fs.writeFileSync(path.join(OUT, 'audition.ass'), lines.join('\n') + '\n');
  ff(['-y', '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:r=30:d=60', '-i', 'strata-score.wav',
    '-vf', 'subtitles=audition.ass', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-t', '60', '-frames:v', '1800', '-movflags', '+faststart', 'animatic.mp4']);
  const probe = run(PROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', 'animatic.mp4']);
  fs.writeFileSync(path.join(OUT, 'animatic-probe.json'), probe);
}
function onsetReport(audio) {
  const threshold = 10 ** (-60 / 20), rows = sections.map((s, i) => {
    const material = i === 1 ? 9 : i === 12 ? 9 : i === 13 ? 0 : i === 14 ? 3 : s.material;
    const sound = strike(material, i === 13 ? 65 : 62, `onset-${i}`);
    let n = 0; while (n < sound.samples.length && Math.abs(sound.samples[n]) < threshold) n++;
    return { section: s.name, barLineSeconds: s.start, scheduledOffsetMs: 0, thresholdCrossingOffsetMs: n / SR * 1000,
      method: i === 1 ? 'Reversed material exit scheduled exactly on bar line; fixed sample-rate reader.' : 'Isolated new material at unity nominal strike gain, -60 dBFS threshold; earlier tails excluded.' };
  });
  let n = 0; while (n < N && Math.max(Math.abs(audio.L[n]), Math.abs(audio.R[n])) < threshold) n++;
  return { coldOpenFirstSoundMs: n / SR * 1000, sections: rows };
}
function notesFor(report) {
  const rows = report.materials.map(m => `| ${m.material} | ${m.centroidHz.toFixed(0)} | ${m.flatness.toFixed(4)} | ${m.t20Ms} | ${m.attackMs.toFixed(3)} |`);
  const ratios = report.leadOverSediment.map(r => `| ${r.section} | ${r.sectionRmsDb === null ? 'no sediment' : r.sectionRmsDb.toFixed(2)} | ${r.minimum150msAfterOnsetDb === null ? 'n/a' : r.minimum150msAfterOnsetDb.toFixed(2)} | ${r.failedOnsetsBelow4Db.length} |`);
  return [
    '# Strata / sound sketch 02', '',
    '## What changed', '',
    '- The melody, call/answer note data, travelling endings, 120 BPM and 4/4 are unchanged. D Dorian, D–E–F–G–A–B–C. The head is D4–A4–G4–E4, followed by the original travelling endings. Only the end card closes F4–E4–D4.',
    '- Resonators were rebuilt around strongly excited upper modes and truly different contact/decay envelopes. Every strike has its own seeded position, modal weighting and velocity. No sampled audio or instruments.',
    '- Burnt brick now leads both the cold open and end card; every era’s lower layer is present underneath. Mughal porcelain/glass is the brightest, longest dry material.',
    '- The rewind reverses native-rate fragments and removes material newest-first. Only the fragment spacing speeds up. No resampling, tape-speed rise or pitch sweep.',
    '- Each buried layer has a fixed diatonic register, fixed low-pass, fixed strike damping and one fixed gain. A sparse note every two seconds walks slowly through its original motif. There is no ducking, compressor or linked cap. The sediment sum is high-passed at 70 Hz.',
    '- The 2013–14 bar briefly surfaces all ten layers, ending in earth. The 2017–18 bar gives earth the melody and only the earth bed remains. Burnt brick returns with its own bed in 2022–23 and carries into the final cadence, where the full stack returns. Layer exits are structural, not ducking. Each season has a different grid-locked tool pattern. Tools are modelling assumptions, not excavator claims.',
    '- A static scene-level dynamic arc is shared by lead, layers and tools; it does not follow their note envelopes. Mode phases are now independently randomized per strike, not cosine aligned. Full-stack contacts are spread in time; coincident tool downbeats are staggered by 1.5 ms.', '',
    '## Dry A4 materials', '',
    '| Material | Centroid Hz | Flatness | T20 ms | Attack ms |', '|---|---:|---:|---:|---:|', ...rows, '',
    `Stone attack is **${report.materials[6].attackMs.toFixed(3)} ms**; lime attack is **${report.materials[7].attackMs.toFixed(3)} ms**, with a longer chalky contact layer. This attack difference, not just brightness, distinguishes the two stone eras.`,
    `Mud/rubble flatness / terracotta: ${(report.materials[2].flatness / report.materials[1].flatness).toFixed(2)}×. Brick-jelly / burnt brick: ${(report.materials[4].flatness / report.materials[3].flatness).toFixed(2)}×.`,
    'Measurement: magnitude-weighted 4096-point FFT frames over the first 200 ms; flatness uses the same frames. Attack is -60 dB-relative onset to the absolute waveform peak. T20 is the first 15-ms sustained -20 dB crossing of a 1-ms RMS envelope after its peak. No room processing.',
    'All resonator frequencies, mode ratios, gains, contact times and filter values are creative synthesis parameters, not archaeological measurements.', '',
    '## Delivery and dynamics', '',
    `48 kHz, 24-bit stereo PCM, exactly 2,880,000 frames / 60.000 s. **${report.loudness.integratedLufs.toFixed(1)} LUFS integrated, ${report.loudness.truePeakDbtp.toFixed(1)} dBTP, ${report.loudness.lraLu.toFixed(1)} LU LRA.** Maximum limiter reduction: **${report.master.maximumGainReductionDb.toFixed(2)} dB**; active **${(report.master.limiterActiveShare * 100).toFixed(2)}%** of time at the >0.1 dB threshold.`,
    `Stopped at orchestrator priority **step ${report.master.stoppedAtPriorityStep}**. ${report.master.type}. The limiter uses 10 ms look-ahead and a smooth 15 ms release. Clipper oversampling: ${report.master.clipper.oversampling}×; clipped channel samples at 192 kHz: ${report.master.clipper.clippedOversampledChannelSamples}; maximum clip reduction: ${report.master.clipper.maximumActualReductionDb.toFixed(2)} dB. Only above-threshold runs shorter than 1 ms are eligible; clip gain is bounded at 2 dB. All attempted earlier steps are recorded in audio-report.json.`,
    `Final static headroom reserve: ${(report.master.staticHeadroomReserveDb || 0).toFixed(2)} dB, taken from overall gain rather than extra peak reduction.`,
    `Cold-open onset: ${report.onsets.coldOpenFirstSoundMs.toFixed(3)} ms. Tail peak from 59.5 s: ${report.endTail.maximumDbfs.toFixed(1)} dBFS (−240 means digital zero).`,
    'Short-term readings in the report are relative to the integrated measurement. Both all readings and wholly contained trailing-three-second readings are provided; two-second excavation sections necessarily include prior material in EBU short-term windows.', '',
    '| Section | Mean short-term / integrated, LU | Contained 3-s windows, LU |',
    '|---|---:|---:|',
    ...report.loudness.perSection.map(s => `| ${s.section} | ${s.meanRelativeToIntegratedLu.toFixed(2)} | ${s.stable3sRelativeLu === null ? 'n/a' : s.stable3sRelativeLu.toFixed(2)} |`), '',
    '| Section | Full-section lead / sediment dB | Minimum after onset, 150 ms dB | Failed onsets <4 dB |',
    '|---|---:|---:|---:|', ...ratios, '',
    'The orchestrator clarified the gap rule: the hard 4 dB limit and 6 dB aspiration apply only to the 150 ms after each lead onset. There is deliberately no dominance requirement in the gaps. Legacy 200-ms gap-inclusive minima are reported but do not drive the mix.', '',
    '## Melody variants, unchanged', '',
    ...sections.slice(2, 12).map((s, i) => `- ${s.name}, ${i % 2 ? 'answer' : 'call'}: **${eraPhrase(i).map(n => noteName(n.midi)).join(' – ')}**.`), '',
    '## Determinism and comparisons', '',
    `Independent render 1: \`${report.determinism.render1Sha256}\``,
    `Independent render 2: \`${report.determinism.render2Sha256}\``,
    `Byte-identical: **${report.determinism.twoRendersByteIdentical}**. Same-pitch scored events sample-identical: **${report.strikeVariation.samePitchDuplicates.length}**.`,
    'Timbres.wav retains v1’s sixteen-section comparison structure: the same original two-bar D–A–G–E / F–E–D phrase alone, equal RMS, then 0.4 s of space. Materials-single-notes.wav is ten dry A4 strikes, 2.0 s apart, in era order. Indices are in audio-report.json. Lead, sediment and tool stems are 32-bit float WAVs, with the shared scene gain and static master gain. They sum to the pre-peak-control scene, not the nonlinear clipper/limiter output.',
    'The orchestrator’s measure.ps1 is copied unchanged into stats and run there, so its generated files do not overwrite the v1 review. Its output is included in audio-report.json.', '',
    '## Known weaknesses / remaining targets', '',
    ...report.warnings.map(w => `- ${w}`),
    `- The loudness arc is approximate: contained Mughal windows average +${report.loudness.perSection[10].stable3sRelativeLu.toFixed(2)} LU rather than about 0; the 2017–18 trailing-three-second mean remains +${report.loudness.perSection[13].meanRelativeToIntegratedLu.toFixed(2)} LU after the authorized excavation trim. These two-second season windows include preceding material.`,
    '- No direct headphone audition was performed in this session. These objective measurements cannot judge whether the materials feel convincing to the user.',
    '- The solo A4 test is one reproducible strike position. Per-strike variation and transposition deliberately move the exact centroid and decay in the actual phrase.',
    '- Short notes are allowed to leave real gaps. Buried layers are intentionally audible there, so an always-on 200-ms lead-dominance metric is not appropriate.',
    '- No historical acoustics claim is made: this is a material-led composed score, not a reconstruction of excavated objects.', '',
    '## Rebuild', '',
    '`tools\\node-v24.22.1-win-x64\\node.exe scripts\\sound\\score-v2.cjs`', ''
  ].join('\n');
}
function reproduceReview(reportPath) {
  const dir = path.join(OUT, 'stats'); fs.mkdirSync(dir, { recursive: true });
  const source = path.join(ROOT, 'output', 'review', 'sound-stats', 'measure.ps1');
  const copy = path.join(dir, 'measure.ps1'); fs.copyFileSync(source, copy);
  const output = run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', copy,
    '-Wav', path.join(OUT, 'timbres.wav'), '-Report', reportPath]);
  fs.writeFileSync(path.join(OUT, 'review-timbre-table.txt'), output);
  const stats = JSON.parse(fs.readFileSync(path.join(dir, 'timbre-stats.json'), 'utf8').replace(/^\uFEFF/, ''));
  return { source: 'output/review/sound-stats/measure.ps1', unchangedCopySha256: crypto.createHash('sha256').update(fs.readFileSync(copy)).digest('hex'), rows: stats, formattedOutput: output };
}
function cleanKnownIntermediates() {
  const names = ['lead-stem.f64', 'sediment-stem.f64', 'tools-stem.f64', 'spectrogram.rgb'];
  for (const prefix of ['master', 'master-repeat']) for (const suffix of ['input.f64', '4x.f64', 'processed-4x.f64', '48k.f64']) names.push(`${prefix}-${suffix}`);
  for (const name of names) {
    const file = path.join(OUT, name);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}
function build() {
  fs.mkdirSync(OUT, { recursive: true });
  const selected = process.argv.includes('--selected-pass') ? JSON.parse(fs.readFileSync(path.join(OUT, 'audio-report.json'), 'utf8')) : null;
  if (selected && selected.master.stoppedAtPriorityStep === 4) relativeArc[12] = relativeArc[13] = relativeArc[14] = 1.1;
  console.log('Calibrating ten dry A4 material contacts.');
  const calibration = materialCalibration(), timbreComparison = makeTimbres();
  console.log('Composing v2: fixed-gain layers, material exits and three distinct digs.');
  let firstRaw = compose(), first, stoppedAtStep = 1;
  const peakControlAttempts = selected ? selected.master.attempts.filter(a => a.step < selected.master.stoppedAtPriorityStep) : [];
  const attempt = (step, target, clipper) => {
    const result = masterV2(firstRaw, target, clipper, 'master');
    peakControlAttempts.push({ step, targetIntegratedLufs: target, clipperEnabled: clipper,
      limiterMaximumReductionDb: result.maximumGainReductionDb, limiterActiveShare: result.limiterActiveShare });
    console.log('Peak-control attempt', JSON.stringify(peakControlAttempts.at(-1)));
    first = result; stoppedAtStep = step;
    return result.maximumGainReductionDb <= 4 && result.limiterActiveShare < .05;
  };
  if (selected) {
    attempt(selected.master.stoppedAtPriorityStep, selected.master.targetIntegratedLufs, selected.master.clipper.enabled);
  } else if (!attempt(1, -14, false) && !attempt(2, -14, true) && !attempt(3, -15, true)) {
    relativeArc[12] = relativeArc[13] = relativeArc[14] = 1.1;
    firstRaw = compose();
    attempt(4, -15, true);
  }
  const bytes = wavBuffer(first);
  fs.writeFileSync(path.join(OUT, 'strata-score.wav'), bytes);
  const hash1 = crypto.createHash('sha256').update(bytes).digest('hex');
  console.log(`Render 1 ${hash1}; repeating independent composition and master.`);
  const secondRaw = compose(), second = masterV2(secondRaw, first.targetIntegratedLufs, first.clipper.enabled, 'master-repeat'), bytes2 = wavBuffer(second);
  const hash2 = crypto.createHash('sha256').update(bytes2).digest('hex');
  if (hash1 !== hash2) throw new Error('Determinism failed.');
  for (const [name, source] of [['lead', firstRaw.lead], ['sediment', firstRaw.sediment], ['tools', firstRaw.tools]]) {
    fs.writeFileSync(path.join(OUT, `${name}-stem.f64`), interleavedBuffer(source, first.staticGain));
    ff(['-v', 'error', '-y', '-f', 'f64le', '-ar', '48000', '-ac', '2', '-i', `${name}-stem.f64`,
      '-c:a', 'pcm_f32le', `${name}-stem.wav`]);
  }
  const loudness = loudnessReport(), seen = new Map(), duplicates = [];
  for (const event of firstRaw.ledger) {
    const key = `${event.midi}-${event.sha256}`;
    if (seen.has(key)) duplicates.push({ first: seen.get(key), second: event });
    else seen.set(key, event);
  }
  let endPeak = 0;
  for (let n = Math.round(59.5 * SR); n < N; n++) endPeak = Math.max(endPeak, Math.abs(first.L[n]), Math.abs(first.R[n]));
  const warnings = [];
  if (loudness.lraLu < 5) warnings.push(`LRA ${loudness.lraLu.toFixed(1)} LU misses the 5 LU target.`);
  if (first.maximumGainReductionDb > 4) warnings.push(`Limiter maximum ${first.maximumGainReductionDb.toFixed(2)} dB exceeds the revised 4 dB ceiling.`);
  if (first.limiterActiveShare >= .05) warnings.push(`Limiter active ${(first.limiterActiveShare * 100).toFixed(2)}% exceeds the 5% target.`);
  for (const m of calibration.rows) for (const [key, value] of [['centroidHz', m.centroidHz], ['attackMs', m.attackMs], ['t20Ms', m.t20Ms]]) {
    const target = m.targets[key];
    if (target && (value < target[0] || value > target[1])) warnings.push(`${m.material}: ${key} ${value.toFixed(2)} outside original ${target.join('–')} band after seeded phase randomization.`);
  }
  for (const row of firstRaw.dominance) {
    if (row.targetSectionRmsDb && (row.sectionRmsDb < row.targetSectionRmsDb[0] || row.sectionRmsDb > row.targetSectionRmsDb[1])) warnings.push(`${row.section} section ratio ${row.sectionRmsDb.toFixed(2)} dB is outside ${row.targetSectionRmsDb.join('–')} dB.`);
    if (row.failedOnsetsBelow4Db.length) warnings.push(`${row.section}: ${row.failedOnsetsBelow4Db.length} onset windows below the hard 4 dB minimum.`);
    else if (row.onsetsBelow6DbTarget.length) warnings.push(`${row.section}: ${row.onsetsBelow6DbTarget.length} onset windows meet 4 dB but not the 6 dB aspiration.`);
  }
  const report = {
    version: 2, timingContract: 'film-timing.md v1 plus orchestrator clarification: dominance only for 150 ms following a lead onset',
    format: { sampleRate: SR, channels: 2, bitsPerSample: 24, pcmFrames: N, seconds: 60 }, seed: base.SEED,
    determinism: { render1Sha256: hash1, render2Sha256: hash2, twoRendersByteIdentical: hash1 === hash2, method: 'Two complete fresh seeded compositions and mastering passes.' },
    music: { bpm: 120, meter: '4/4', mode: 'D Dorian', originalMelody: phrase, eraVariants: sections.slice(2, 12).map((s, i) => ({ section: s.name, notes: eraPhrase(i) })) },
    loudness, onsets: onsetReport(first), materials: calibration.rows, singleNotesIndex: calibration.index,
    timbreComparison, leadOverSediment: firstRaw.dominance,
    sediment: { ducking: false, gainModulation: false, highpassHz: 70, fixedLayerGains: firstRaw.layerGains, fixedRootMidiRegisters: registers, fixedLowpassHz: materials.map((m, i) => 330 + i * 105), noteSpacingSeconds: 2,
      availability: 'All layers in cold open/end; old eras accumulate until 48 s; explicit top-down surfacing in 2013–14; earth bed only in 2017–18; burnt-brick bed only in 2022–23.' },
    dynamicArc: { sectionSceneGains: firstRaw.sceneGains, targetRelativeLu: relativeArc },
    rewind: { playbackRateAlwaysOne: true, peels: firstRaw.rewindPeels },
    excavation: { toolEvents: firstRaw.toolEvents, surfacing: firstRaw.surfacing },
    strikeVariation: { eventCount: firstRaw.ledger.length, everyPitchedStrikeSeeded: true,
      scope: 'All score leads, buried-layer notes, rewind fragments and excavation surfacing',
      samePitchDuplicates: duplicates, events: firstRaw.ledger },
    master: { type: first.clipper.enabled ? 'Static gain, 4× oversampled peak-only bounded soft clipper, linked 4× look-ahead limiter' : 'Static gain plus linked 4× look-ahead peak limiter',
      staticGain: first.staticGain, targetIntegratedLufs: first.targetIntegratedLufs, stoppedAtPriorityStep: stoppedAtStep, attempts: peakControlAttempts,
      staticHeadroomReserveDb: first.staticHeadroomReserveDb,
      lookAheadMs: first.lookAheadMs, releaseMs: first.releaseMs, ceilingDbfs: first.ceilingDbfs, maximumGainReductionDb: first.maximumGainReductionDb,
      limiterActiveShare: first.limiterActiveShare, limiterActiveThresholdDb: first.activeThresholdDb, clipper: first.clipper },
    stems: { format: '32-bit float WAV, pre-peak-control', staticMasterGainIncluded: true, reconstructs: 'Unclipped scene before oversampled clipper and limiter; not the nonlinear master.' },
    endTail: { fromSeconds: 59.5, maximumDbfs: db(endPeak), finalSampleL: first.L[N - 1], finalSampleR: first.R[N - 1] },
    warnings
  };
  const reportPath = path.join(OUT, 'audio-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ loudness: { I: loudness.integratedLufs, TP: loudness.truePeakDbtp, LRA: loudness.lraLu },
    limiterMaxDb: first.maximumGainReductionDb, dominance: firstRaw.dominance.map(r => ({ section: r.section, rms: r.sectionRmsDb, onsetMin: r.minimum150msAfterOnsetDb })),
    layerGains: firstRaw.layerGains, warnings }, null, 2));
  report.orchestratorMeasurementScript = reproduceReview(reportPath);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(OUT, 'notes.md'), notesFor(report));
  if (process.argv.includes('--audio-only')) { cleanKnownIntermediates(); return; }
  console.log('Drawing labelled frequency plots and rendering SOUND SKETCH 02 animatic.');
  reviewPlots(first); makeAnimatic();
  cleanKnownIntermediates();
  console.log(`Complete: ${OUT}`);
}

if (require.main === module) {
  if (process.argv.includes('--materials')) {
    fs.mkdirSync(OUT, { recursive: true });
    console.log(JSON.stringify(materialCalibration().rows, null, 2));
  } else if (process.argv.includes('--assets-only')) {
    const b = fs.readFileSync(path.join(OUT, 'strata-score.wav')), audio = bus();
    for (let n = 0; n < N; n++) { audio.L[n] = b.readIntLE(44 + n * 6, 3) / 8388607; audio.R[n] = b.readIntLE(47 + n * 6, 3) / 8388607; }
    reviewPlots(audio); makeAnimatic(); cleanKnownIntermediates();
  } else if (process.argv.includes('--comparisons-only')) {
    const calibration = materialCalibration(), timbreComparison = makeTimbres();
    const reportPath = path.join(OUT, 'audio-report.json'), report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    report.materials = calibration.rows; report.singleNotesIndex = calibration.index; report.timbreComparison = timbreComparison;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    report.orchestratorMeasurementScript = reproduceReview(reportPath);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(OUT, 'notes.md'), notesFor(report));
  } else if (process.argv.includes('--audit-only')) {
    const reportPath = path.join(OUT, 'audio-report.json'), report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    if (report.master.stoppedAtPriorityStep === 4) relativeArc[12] = relativeArc[13] = relativeArc[14] = 1.1;
    const source = compose(), seen = new Map(), duplicates = [];
    for (const event of source.ledger) {
      const key = `${event.midi}-${event.sha256}`;
      if (seen.has(key)) duplicates.push({ first: seen.get(key), second: event }); else seen.set(key, event);
    }
    report.strikeVariation = { eventCount: source.ledger.length, everyPitchedStrikeSeeded: true,
      scope: 'All score leads, buried-layer notes, rewind fragments and excavation surfacing', samePitchDuplicates: duplicates, events: source.ledger };
    report.leadOverSediment = source.dominance;
    report.sediment.availability = 'All layers in cold open/end; old eras accumulate until 48 s; explicit top-down surfacing in 2013–14; earth bed only in 2017–18; burnt-brick bed only in 2022–23.';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    fs.writeFileSync(path.join(OUT, 'notes.md'), notesFor(report));
  } else build();
}
module.exports = { strike, materials, sections, play, put, OUT, compose, masterV2, reviewPlots, makeAnimatic, relativeArc, notesFor };
