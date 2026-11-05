// Site tier soil atlases (public/site-tier packs): every charted soil mesh has uv inside its atlas, the uv map of each
// simplified triangle is a planar projection at the atlas density (area ratio = |n . axis| within the chart limit)
// and keeps the chart's orientation (no folds), and triangles that share an atlas page in one cut step do not cover
// the same texel centres. uv is stored as uint16, so slivers whose area the quantisation can change by more than 2%
// are left out of the ratio check, and a few texel centres on sliver edges may be claimed twice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadSiteTierAssets } from '../src/site-tier/assets.js';

const dir = fileURLToPath(new URL('../public/site-tier/', import.meta.url));
const assets = await loadSiteTierAssets({ fetch: async path => new Response(readFileSync(dir + path.replace(/^\/site-tier\//, ''))) });

function triangles(geometry, fn) {
  const p = geometry.attributes.position.array, q = geometry.attributes.uv.array, I = geometry.index.array;
  for (let t = 0; t < I.length; t += 3) fn([0, 1, 2].map(s => [p[3 * I[t + s]], p[3 * I[t + s] + 1], p[3 * I[t + s] + 2]]), [0, 1, 2].map(s => [q[2 * I[t + s]], q[2 * I[t + s] + 1]]));
}
function texelCentres(uv, width, height, visit) {
  const P = uv.map(([u, v]) => [u * width, v * height]), d = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[1][1] - P[0][1]) * (P[2][0] - P[0][0]);
  if (!(Math.abs(d) > 0)) return;
  for (let x = Math.ceil(Math.min(...P.map(p => p[0])) - .5); x + .5 <= Math.max(...P.map(p => p[0])); x++) for (let y = Math.ceil(Math.min(...P.map(p => p[1])) - .5); y + .5 <= Math.max(...P.map(p => p[1])); y++) {
    const cx = x + .5, cy = y + .5;
    const w0 = ((P[1][0] - cx) * (P[2][1] - cy) - (P[1][1] - cy) * (P[2][0] - cx)) / d, w1 = ((P[2][0] - cx) * (P[0][1] - cy) - (P[2][1] - cy) * (P[0][0] - cx)) / d;
    if (w0 > 1e-7 && w1 > 1e-7 && 1 - w0 - w1 > 1e-7) visit(y * width + x);
  }
}

test('charted soil meshes map planar into their atlas without overlaps', async () => {
  const core = await assets.core(), atlases = core.meta.atlases;
  let meshes = 0, worstRatio = [Infinity, 0], overlaps = 0, covered = 0, flippedArea = 0, totalArea = 0, slivers = 0;
  for (let k = 1; k <= core.meta.cutSteps; k++) {
    const step = await assets.step(k), owners = new Map();
    const ids = [...core.meta.soilSteps[k], ...(k === core.meta.defaultStep ? ['soil:pedestal'] : [])];
    for (const id of ids) {
      const { geometry, record } = step.geometry(id), atlas = atlases[record.texture];
      if (!atlas) { assert.ok(['top-xz', 'z+'].includes(record.texture), id); assert.equal(geometry.attributes.uv, undefined, id); continue; }
      meshes++;
      const texel = record.mode === 'floor' ? atlas.floorTexelMetres : atlas.wallTexelMetres;
      for (const v of geometry.attributes.uv.array) assert.ok(v >= 0 && v <= 1, id);
      // walls-core shares the core page with the step-12 meshes, which are other cut steps: no overlap check across them.
      const page = record.texture === 'core' && k !== core.meta.defaultStep ? null : owners;
      triangles(geometry, (P, uv) => {
        const a = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], b = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
        const world = Math.hypot(a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]) / 2;
        const signed = ((uv[1][0] - uv[0][0]) * (uv[2][1] - uv[0][1]) - (uv[1][1] - uv[0][1]) * (uv[2][0] - uv[0][0])) / 2 * atlas.width * atlas.height;
        // Bound on the texel-area change from uint16 uv: half a step per component along each edge.
        const step = Math.max(atlas.width, atlas.height) / 65535 / 2, edges = [0, 1, 2].reduce((s, i) => s + Math.hypot((uv[(i + 1) % 3][0] - uv[i][0]) * atlas.width, (uv[(i + 1) % 3][1] - uv[i][1]) * atlas.height), 0);
        totalArea += world;
        if (signed < -edges * step) flippedArea += world;
        if (Math.abs(signed) > 0 && edges * step / Math.abs(signed) < .02) { const r = Math.abs(signed) * texel * texel / world; worstRatio = [Math.min(worstRatio[0], r), Math.max(worstRatio[1], r)]; } else slivers++;
        if (page) texelCentres(uv, atlas.width, atlas.height, i => { const key = record.texture + ':' + i; covered++; if (page.has(key)) overlaps++; else page.set(key, id); });
      });
    }
  }
  console.log(JSON.stringify({ meshes, areaRatio: worstRatio.map(v => +v.toFixed(4)), slivers, flippedAreaM2: flippedArea, totalAreaM2: +totalArea.toFixed(2), covered, overlaps }));
  // 0.6 is the chart builder's minimum alignment; the 2% quantisation allowance applies at both ends.
  assert.ok(worstRatio[0] >= .6 * .98 && worstRatio[1] <= 1.02, `area ratio ${worstRatio}`);
  assert.equal(flippedArea, 0);
  assert.ok(overlaps <= covered * 1e-4, `${overlaps} of ${covered} texel centres claimed twice`);
});
