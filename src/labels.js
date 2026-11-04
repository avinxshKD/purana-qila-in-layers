import * as THREE from 'three';

export const ERAS = Object.freeze([
  { id: 'pre-mauryan', name: 'Pre-Mauryan', dates: '540–323 BCE', start: -539, end: -322 },
  { id: 'mauryan', name: 'Mauryan', dates: '323–200 BCE', start: -322, end: -199 },
  { id: 'sunga', name: 'Sunga', dates: '200 BCE – 1 CE', start: -199, end: 1 },
  { id: 'kushan', name: 'Kushan', dates: '1–200 CE', start: 1, end: 200 },
  { id: 'gupta', name: 'Gupta', dates: '200–400 CE', start: 200, end: 400 },
  { id: 'post-gupta', name: 'Post-Gupta', dates: '400–600 CE', start: 400, end: 600 },
  { id: 'rajput', name: 'Rajput', dates: '600–1200 CE', start: 600, end: 1200 },
  { id: 'sultanate', name: 'Sultanate', dates: '1200–1500 CE', start: 1200, end: 1500 },
  { id: 'mughal', name: 'Mughal', dates: '1600–1800 CE', start: 1600, end: 1800 }
]);
// Astronomical years avoid inventing a calendar year zero: 540 BCE is year -539.
export const axisFraction = year => (year + 539) / (2023 + 539);

export async function loadLabelFont() {
  const faces = [...['Strata Inter', 'Strata Serif', 'Strata Sans', 'Strata Sans Numerals'].map(family => [600, family]), [400, 'Strata Sans'], [400, 'Strata Sans Numerals']];
  for (const [weight, family] of faces) {
    const loaded = await document.fonts.load(`${weight} 64px "${family}"`);
    if (!loaded.length || loaded.some(font => font.status !== 'loaded' || String(font.weight) !== String(weight)))
      throw new Error(`Bundled ${family} ${weight} failed to load; film fallback is forbidden`);
  }
}

const TYPEFACES = {
  inter: { title: 'Strata Inter', body: 'Strata Inter' },
  adobe: { title: 'Strata Serif', body: 'Strata Sans' }
};

// Underside of the scale bar's bone outline below the block base (museum-scene.js SCALE_BAR: centre .21, half height .1,
// outline .034), the outline's outer x ends, and the clear gap kept between the bar and the label glyph tops, in px at 1080.
// The gap is 1 px over the 6 px gate because the 2160 master is Lanczos-resampled to 1080, which spreads edges.
const SCALE_BAR_UNDERSIDE_METRES = .21 + .1 + .034, SCALE_BAR_ENDS = [2 - .034 / 2, 7 + .034 / 2], SCALE_LABEL_GAP = 7;
// Labels are drawn only while the camera is in front of the bar's front face (z 8.7).
export const SCALE_LABEL_MIN_CAMERA_Z = 8.7;
export const SCALE_BAR_LABELS = Object.freeze([Object.freeze([2, '0']), Object.freeze([7, '5 m'])]);
// Px values are at 1080 and scale with canvas height / 1080. The halo is shared with every labels.js text run.
export const SCALE_LABEL_STYLE = Object.freeze({
  family: 'Strata Sans', numeralFamily: 'Strata Sans Numerals', weight: 600, capHeightPx1080: 15, gapPx1080: SCALE_LABEL_GAP,
  fill: '#eee4d2', haloBlurPx1080: 28, haloColor: 'rgba(12,13,13,.95)', haloOffsetYPx1080: 1
});

export function applyLabelHalo(ctx, scale) {
  ctx.fillStyle = SCALE_LABEL_STYLE.fill;
  ctx.shadowBlur = SCALE_LABEL_STYLE.haloBlurPx1080 * scale;
  ctx.shadowColor = SCALE_LABEL_STYLE.haloColor;
  ctx.shadowOffsetY = SCALE_LABEL_STYLE.haloOffsetYPx1080 * scale;
}
// Leaves ctx.font set to the smallest size whose 'H' ink ascent reaches cap.
export function fontForCap(ctx, cap, family, weight = 600) {
  ctx.font = `${weight} 100px "${family}"`;
  const ratio = ctx.measureText('H').actualBoundingBoxAscent / 100;
  let size = Math.ceil(cap / ratio * 100) / 100;
  ctx.font = `${weight} ${size}px "${family}"`;
  while (ctx.measureText('H').actualBoundingBoxAscent < cap) {
    size += .1;
    ctx.font = `${weight} ${size}px "${family}"`;
  }
  return { family, weight, fontSize: size, capHeight: ctx.measureText('H').actualBoundingBoxAscent };
}
// Canvas does not expose font-variant-numeric. Equal digit advances enforce tnum here.
export function tabular(ctx, text, x, y, draw = true, tracking = 0) {
  const font = ctx.font, numeralFont = font.replace('"Strata Sans"', '"Strata Sans Numerals"');
  ctx.font = numeralFont;
  const digitWidth = Math.max(...'0123456789'.split('').map(d => ctx.measureText(d).width));
  let cursor = x;
  for (const char of text) {
    ctx.font = /\d/.test(char) ? numeralFont : font;
    const digit = /\d/.test(char), advance = digit ? digitWidth : ctx.measureText(char).width;
    if (draw) ctx.fillText(char, cursor + (digit ? (advance - ctx.measureText(char).width) / 2 : 0), y);
    cursor += advance + tracking;
  }
  ctx.font = font;
  return cursor - x - tracking;
}
function projector(camera, width, height) {
  return position => {
    const p = new THREE.Vector3(...position).project(camera);
    return { x: (p.x + 1) * width / 2, y: (1 - p.y) * height / 2 };
  };
}
// Leaves ctx.font set to the scale-label face. Returns the font metrics layoutScaleBarLabel needs, in canvas px.
export function measureScaleBarLabels(ctx, height) {
  const metrics = fontForCap(ctx, SCALE_LABEL_STYLE.capHeightPx1080 * (height / 1080), SCALE_LABEL_STYLE.family, SCALE_LABEL_STYLE.weight);
  const font = ctx.font, numeralFont = font.replace(`"${SCALE_LABEL_STYLE.family}"`, `"${SCALE_LABEL_STYLE.numeralFamily}"`);
  ctx.font = numeralFont;
  const digitWidth = Math.max(...'0123456789'.split('').map(d => ctx.measureText(d).width));
  const labels = SCALE_BAR_LABELS.map(([x, text]) => {
    const inkAscent = Math.max(...[...text].filter(c => c !== ' ').map(c => { ctx.font = /\d/.test(c) ? numeralFont : font; return ctx.measureText(c).actualBoundingBoxAscent; }));
    // Ink extents of the glyphs where tabular() places them: inkLeft/inkRight from the drawing origin, inkDescent below the baseline.
    let cursor = 0, inkLeft = Infinity, inkRight = -Infinity, inkDescent = -Infinity;
    for (const c of text) {
      const digit = /\d/.test(c);
      ctx.font = digit ? numeralFont : font;
      const m = ctx.measureText(c), advance = digit ? digitWidth : m.width, at = cursor + (digit ? (advance - m.width) / 2 : 0);
      if (c !== ' ') { inkLeft = Math.min(inkLeft, at - m.actualBoundingBoxLeft); inkRight = Math.max(inkRight, at + m.actualBoundingBoxRight); inkDescent = Math.max(inkDescent, m.actualBoundingBoxDescent); }
      cursor += advance;
    }
    ctx.font = font;
    return { x, text, advance: tabular(ctx, text, 0, 0, false), inkAscent, inkDescent, inkLeft, inkRight };
  });
  return { font, metrics, capHeight: metrics.capHeight, labels };
}
// Pure placement of one scale-bar label. x is the bar position in metres (2 or 7); advance, capHeight and the ink extents
// from measureScaleBarLabels are canvas px at this height. Returns the drawing origin (left, baseline) and a box
// (x, y, width, height) holding all ink: from the cap or ink top, whichever is higher, to the lowest ink descent.
export function layoutScaleBarLabel({ camera, width, height, baseDepth = 10, x, advance, capHeight, inkAscent, inkDescent = 0, inkLeft = 0, inkRight = advance }) {
  const scale = height / 1080, project = projector(camera, width, height);
  // Glyph tops sit SCALE_LABEL_GAP px (at 1080) below the lowest point of the bar's projected underside across the
  // label's width: the bar slopes on screen, so its underside above a label's edge can sit lower than above its centre.
  const y = -baseDepth - SCALE_BAR_UNDERSIDE_METRES, p = project([x, y, 8.7]);
  const left = p.x - advance / 2, right = left + advance;
  let barBottomY = -Infinity;
  for (const z of [8.67, 8.7]) {
    const a = project([SCALE_BAR_ENDS[0], y, z]), b = project([SCALE_BAR_ENDS[1], y, z]), lo = Math.max(Math.min(a.x, b.x), left), hi = Math.min(Math.max(a.x, b.x), right);
    if (lo <= hi && b.x !== a.x) for (const sx of [lo, hi]) barBottomY = Math.max(barBottomY, a.y + (b.y - a.y) * (sx - a.x) / (b.x - a.x));
  }
  if (barBottomY === -Infinity) barBottomY = Math.max(project([x, y, 8.67]).y, p.y);
  const top = Math.max(capHeight, inkAscent), baseline = barBottomY + SCALE_LABEL_GAP * scale + top;
  const visible = camera.position.z > SCALE_LABEL_MIN_CAMERA_Z && p.x > 0 && p.x < width && baseline > 0 && baseline < height;
  const x0 = left + Math.min(0, inkLeft), x1 = left + Math.max(advance, inkRight);
  return { visible, x: x0, y: baseline - top, width: x1 - x0, height: top + Math.max(0, inkDescent), left, baseline, barBottomY, gapPx1080: (baseline - top - barBottomY) / scale };
}
// Draws the visible scale-bar labels into ctx (state restored afterwards) and returns their boxes in canvas px.
export function drawScaleBarLabels(ctx, { camera, width, height, baseDepth = 10 }) {
  const scale = height / 1080, parts = [];
  ctx.save();
  const { metrics, labels } = measureScaleBarLabels(ctx, height);
  applyLabelHalo(ctx, scale);
  for (const label of labels) {
    const box = layoutScaleBarLabel({ camera, width, height, baseDepth, ...label, capHeight: metrics.capHeight });
    if (!box.visible) continue;
    tabular(ctx, label.text, box.left, box.baseline);
    parts.push({ text: label.text, x: box.x, y: box.y, width: box.width, height: box.height, left: box.left, baseline: box.baseline, barBottomY: box.barBottomY,
      gapPx1080: box.gapPx1080, capHeightPx1080: metrics.capHeight / scale, inkAscentPx1080: label.inkAscent / scale, inkDescentPx1080: label.inkDescent / scale });
  }
  ctx.restore();
  return parts;
}
export function createLabels({ width, height, camera, callout = true, mode = 'film', era = 'pre-mauryan', typeface = 'adobe', baseDepth = 10 }) {
  if (!document.fonts.check('600 64px "Strata Inter"')) throw new Error('Load bundled Inter before making labels');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const hudCamera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0, 2);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false
  }));
  plane.position.z = -1;
  scene.add(plane);
  const scale = height / 1080;
  let bounds, titleBounds, parts = {}, selectedEra = era, selectedType = typeface, cssWidth = width, currentTime = 38;
  const textHalo = () => applyLabelHalo(ctx, scale);
  function timeline(record, x, family) {
    ctx.save();
    ctx.shadowBlur = 0;
    const y = height - 68 * scale, length = 440 * scale;
    const at = year => x + axisFraction(year) * length;
    ctx.lineWidth = scale;
    ctx.strokeStyle = '#9e9b92';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
    for (const year of [...new Set([...ERAS.map(era => era.start), 1500, 1800, 2023])]) {
      ctx.moveTo(at(year), y - 4 * scale);
      ctx.lineTo(at(year), y + 4 * scale);
    }
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(at(1500), y - 5 * scale, at(1600) - at(1500), 10 * scale);
    ctx.clip();
    ctx.beginPath();
    for (let line = at(1500) - 10 * scale; line < at(1600) + 10 * scale; line += 5 * scale) {
      ctx.moveTo(line, y + 5 * scale);
      ctx.lineTo(line + 10 * scale, y - 5 * scale);
    }
    ctx.stroke();
    ctx.restore();
    const marker = at(record.start + Math.max(0, Math.min(100, currentTime)) / 100 * (record.end - record.start));
    ctx.fillStyle = '#eee4d2';
    ctx.beginPath();
    ctx.arc(marker, y, 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    const metrics = fontForCap(ctx, height * .02, family, 400);
    textHalo();
    ctx.globalAlpha = .6;
    tabular(ctx, '540 BCE', x, y + 40 * scale);
    tabular(ctx, '2023', x + length - tabular(ctx, '2023', 0, 0, false), y + 40 * scale);
    parts.timeline = { x: x - 12 * scale, y: y - 10 * scale, width: length + 24 * scale, height: 62 * scale, metrics };
    ctx.restore();
  }
  const project = projector(camera, width, height);
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const record = ERAS.find(record => record.id === selectedEra);
    if (!record) throw new Error('Unknown era label test');
    const families = TYPEFACES[selectedType];
    if (!families) throw new Error('Unknown typeface test');
    bounds = null;
    parts = {};
    if (mode === 'film') {
      const x = 60 * scale, baseline = height - 173 * scale;
      const nameMetrics = fontForCap(ctx, height * .048, families.title);
      const nameWidth = ctx.measureText(record.name).width;
      const dateMetrics = fontForCap(ctx, height * .035, families.body);
      const tracking = dateMetrics.fontSize * .02, dateWidth = tabular(ctx, record.dates, 0, 0, false, tracking);
      titleBounds = { x: x - 12 * scale, y: baseline - nameMetrics.capHeight - 12 * scale,
        width: Math.max(nameWidth, dateWidth, 440 * scale) + 24 * scale, height: 240 * scale,
        name: record.name, dates: record.dates, sourceId: 'P1:Table1', nameMetrics, dateMetrics };
      textHalo();
      ctx.font = `600 ${nameMetrics.fontSize}px "${families.title}"`;
      ctx.fillText(record.name, x, baseline);
      parts.title = { x: x - 10 * scale, y: baseline - nameMetrics.capHeight - 10 * scale, width: nameWidth + 20 * scale, height: nameMetrics.capHeight + 20 * scale };
      ctx.font = `600 ${dateMetrics.fontSize}px "${families.body}"`;
      ctx.globalAlpha = .8;
      tabular(ctx, record.dates, x, baseline + 58 * scale, true, tracking);
      ctx.globalAlpha = 1;
      parts.date = { x: x - 10 * scale, y: baseline + 58 * scale - dateMetrics.capHeight - 10 * scale, width: dateWidth + 20 * scale, height: dateMetrics.capHeight + 20 * scale };
      timeline(record, x, families.body);
    }
    if (callout) {
      const metrics = fontForCap(ctx, mode === 'film' ? height * .035 : 14 * width / cssWidth, families.body);
      const text = 'Sample A', textWidth = ctx.measureText(text).width;
      const p = project([-9.6, 5.2, 10.3]), anchor = project([-5.5, -.6, 8]);
      const padding = mode === 'film' ? 16 * scale : 6 * width / cssWidth;
      bounds = { x: p.x - textWidth / 2 - padding, y: p.y - metrics.capHeight / 2 - padding,
        width: textWidth + 2 * padding, height: metrics.capHeight + 2 * padding,
        text, sourceId: 'demo:layer-01', mode, ...metrics, minCssCapHeight: mode === 'live' ? 14 : null };
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#d0c5ae';
      ctx.fillStyle = '#d0c5ae';
      ctx.lineWidth = mode === 'film' ? .9 * scale : .9 * width / cssWidth;
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      const endpoint = bounds.x + bounds.width - padding + 8 * scale;
      ctx.lineTo(endpoint + 24 * scale, p.y);
      ctx.lineTo(endpoint, p.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, mode === 'film' ? 3 * scale : 2 * width / cssWidth, 0, Math.PI * 2);
      ctx.fill();
      textHalo();
      ctx.fillText(text, bounds.x + padding, p.y + metrics.capHeight / 2);
      parts.callout = bounds;
    }
    if ((mode === 'film' || mode === 'scale') && camera.position.z > SCALE_LABEL_MIN_CAMERA_Z)
      parts.scaleLabels = drawScaleBarLabels(ctx, { camera, width, height, baseDepth });
    texture.needsUpdate = true;
  }
  function numeralMetrics() {
    ctx.save();
    const results = Object.fromEntries(['Strata Inter', 'Strata Serif', 'Strata Sans Numerals'].map(family => {
      ctx.font = `600 100px "${family}"`;
      const digits = [...'0123456789'].map(char => {
        const m = ctx.measureText(char);
        return { char, advance: m.width, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent };
      });
      return [family, { digits, tabularCellWidth: Math.max(...digits.map(d => d.advance)),
        maxAdvanceDelta: Math.max(...digits.map(d => d.advance)) - Math.min(...digits.map(d => d.advance)),
        featureSettings: [...document.fonts].find(face => face.family.replaceAll('"', '') === family)?.featureSettings }];
    }));
    ctx.restore();
    return results;
  }
  draw();
  return {
    scene, camera: hudCamera,
    bounds: () => bounds,
    titleBounds: () => titleBounds,
    setEra(id) { selectedEra = id; draw(); },
    setTypeface(id) { selectedType = id; draw(); },
    setTime(value) { if (value !== currentTime) { currentTime = value; draw(); } },
    setDisplayWidth(value) { if (value !== cssWidth) { cssWidth = value; if (mode === 'live') draw(); } },
    redraw: draw,
    metadata: () => ({ mode, typeface: selectedType, fonts: TYPEFACES[selectedType], fontLoaded: document.fonts.check('600 64px "Strata Inter"'),
      numeralMetrics: numeralMetrics(), timeline: { start: '540 BCE', end: 2023, gap: [1500, 1600], scale: 'proportional astronomical-year coordinates' },
      calloutCount: callout ? 1 : 0, callout: bounds, title: titleBounds, parts, haloBlur1080: 28,
      dateOpacity: .8, dateTrackingEm: .02, timelineEndOpacity: .6, timelineEndWeight: 400,
      numeralFeatures: 'tnum/lnum on digit runs only; names drawn as whole strings' })
  };
}
