// Compares the labels.js HUD against a byte copy of an earlier labels.js (?before=) over the 1800-frame film camera path,
// at 1080 and 2160, in film and scale modes: HUD canvas pixels (every 10th frame), the scale labels' drawing origin and
// bar gap (every frame), and that each returned box holds all of its label's ink (every frame): the glyphs' canvas
// bounding boxes as drawn, and the alpha > 0 pixels of the same glyphs drawn without the halo.
import * as THREE from 'three';
import * as after from '/src/labels.js';
import { cameraPose } from '/src/film/camera.js';
import { LOOK_PROPORTIONS } from '/src/layers.js';
const before = await import(/* @vite-ignore */ new URLSearchParams(location.search).get('before'));
const out = window.labelLayoutCheck = { done: false, cases: [] };
const origin = l => l && l.map(b => ({ text: b.text, left: b.left ?? b.x, top: b.y, barBottomY: b.barBottomY, gapPx1080: b.gapPx1080 }));
const withoutScale = parts => JSON.stringify({ ...parts, scaleLabels: undefined });
try {
  await after.loadLabelFont();
  const base = LOOK_PROPORTIONS.bottomDepth;
  const pixels = labels => { const c = labels.scene.children[0].material.map.image; return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
  const fill = CanvasRenderingContext2D.prototype.fillText;
  for (const height of [1080, 2160]) for (const [mode, callout] of [['film', true], ['scale', false]]) {
    const width = height * 16 / 9, camera = new THREE.PerspectiveCamera(25, width / height, .1, 180);
    const make = m => m.createLabels({ width, height, camera, callout, mode, era: 'gupta', typeface: 'adobe', baseDepth: base });
    const a = make(before), b = make(after);
    const scratch = document.createElement('canvas'); scratch.width = width; scratch.height = height;
    const sctx = scratch.getContext('2d', { willReadFrequently: true });
    const c = { height, mode, base, frames: 0, framesWithLabels: 0, labelBoxes: 0, originMismatches: 0, otherMetadataMismatches: 0, pixelFrames: 0, pixelMismatchFrames: 0, maxPixelDiff: 0,
      metricInkOutside: 0, minMetricInkMarginPx: Infinity, pixelInkOutside: 0, minPixelInkMarginPx: Infinity, maxDescentBelowOldBoxPx: 0, firstProblem: null, sample: null };
    for (let frame = 0; frame < 1800; frame++) {
      const pose = cameraPose(frame / 30, base, 0);
      camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      a.redraw();
      // Glyph canvas bounding boxes exactly as drawn (the film regression's measure); only scale labels draw in scale mode.
      const glyphs = [];
      if (mode === 'scale') CanvasRenderingContext2D.prototype.fillText = function (t, x, y) { const m = this.measureText(t); glyphs.push({ t, x0: x - m.actualBoundingBoxLeft, x1: x + m.actualBoundingBoxRight, y0: y - m.actualBoundingBoxAscent, y1: y + m.actualBoundingBoxDescent }); return fill.apply(this, arguments); };
      try { b.redraw(); } finally { CanvasRenderingContext2D.prototype.fillText = fill; }
      c.frames++;
      const pa = a.metadata().parts, pb = b.metadata().parts, la = pa.scaleLabels ?? null, lb = pb.scaleLabels ?? null;
      if (lb?.length) { c.framesWithLabels++; c.labelBoxes += lb.length; }
      if (JSON.stringify(origin(la)) !== JSON.stringify(origin(lb))) { c.originMismatches++; c.firstProblem ??= { frame, kind: 'origin', la, lb }; }
      if (withoutScale(pa) !== withoutScale(pb) || JSON.stringify(a.bounds()) !== JSON.stringify(b.bounds()) || JSON.stringify(a.titleBounds()) !== JSON.stringify(b.titleBounds())) c.otherMetadataMismatches++;
      if (frame === 0) c.sample = { frame, before: la, after: lb };
      if (lb) la?.forEach((o, i) => { c.maxDescentBelowOldBoxPx = Math.max(c.maxDescentBelowOldBoxPx, lb[i].y + lb[i].height - (o.y + o.height)); });
      if (mode === 'scale' && lb) {
        for (const g of glyphs.filter(g => g.t !== ' ')) {
          const box = lb.find(l => g.x0 >= l.x - 50 && g.x1 <= l.x + l.width + 50 && Math.abs(g.y1 - (l.baseline)) < 50);
          const margin = box ? Math.min(g.x0 - box.x, g.y0 - box.y, box.x + box.width - g.x1, box.y + box.height - g.y1) : -Infinity;
          c.minMetricInkMarginPx = Math.min(c.minMetricInkMarginPx, margin);
          if (margin < -1e-9) { c.metricInkOutside++; c.firstProblem ??= { frame, kind: 'metric', g, box }; }
        }
      }
      // Real ink: draw each label's glyphs with no halo at the same origin and test every alpha > 0 pixel against its box.
      if (height === 1080 || mode === 'scale') for (const l of lb ?? []) {
        const wx = Math.floor(l.x) - 8, wy = Math.floor(l.y) - 8, ww = Math.ceil(l.width) + 16, wh = Math.ceil(l.height) + 16;
        sctx.save(); sctx.clearRect(wx, wy, ww, wh);
        const { font } = after.measureScaleBarLabels(sctx, height);
        sctx.font = font; sctx.fillStyle = '#fff'; sctx.shadowBlur = 0; sctx.shadowColor = 'transparent';
        after.tabular(sctx, l.text, l.left, l.baseline);
        const d = sctx.getImageData(wx, wy, ww, wh).data; sctx.restore();
        for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
          if (!d[4 * (y * ww + x) + 3]) continue;
          const px = wx + x, py = wy + y;
          // Pixel [px, px+1) x [py, py+1) must overlap the box; margin = how far inside the box the pixel's overlap reaches.
          const margin = Math.min(px + 1 - l.x, l.x + l.width - px, py + 1 - l.y, l.y + l.height - py);
          c.minPixelInkMarginPx = Math.min(c.minPixelInkMarginPx, margin);
          if (margin <= 0) { c.pixelInkOutside++; c.firstProblem ??= { frame, kind: 'pixel', px, py, box: l }; }
        }
      }
      if (frame % 10 === 0 || frame === 1799) {
        const x = pixels(a), y = pixels(b); let diff = 0;
        for (let i = 0; i < x.length; i++) { const dd = Math.abs(x[i] - y[i]); if (dd > diff) diff = dd; }
        c.pixelFrames++; if (diff) c.pixelMismatchFrames++; c.maxPixelDiff = Math.max(c.maxPixelDiff, diff);
      }
    }
    if (after.measureScaleBarLabels) {
      const ctx = document.createElement('canvas').getContext('2d'), m = after.measureScaleBarLabels(ctx, height);
      const pure = m.labels.map(l => after.layoutScaleBarLabel({ camera, width, height, baseDepth: base, ...l, capHeight: m.capHeight })).filter(l => l.visible);
      const drawn = b.metadata().parts.scaleLabels ?? [];
      c.pureMatchesDrawnLastFrame = pure.length === drawn.length && pure.every((p, i) => ['x', 'y', 'width', 'height', 'left', 'baseline', 'barBottomY', 'gapPx1080'].every(k => p[k] === drawn[i][k]));
      c.measured = m.labels;
    }
    out.cases.push(c);
  }
  out.style = after.SCALE_LABEL_STYLE;
  out.done = true;
} catch (e) { out.error = String(e.stack || e); document.title = 'failed'; }
