import { readFileSync } from 'node:fs';
import { loadSiteTierAssets } from '../../src/site-tier/assets.js';
const dir = new URL('../../public/site-tier/', import.meta.url);
const assets = await loadSiteTierAssets({ fetch: async path => new Response(readFileSync(new URL(path.replace(/^\/site-tier\//, ''), dir))) });
const core = await assets.core(), atlases = core.meta.atlases;
const bins = {};
for (const k of [1, 5, 12]) {
  const step = await assets.step(k);
  for (const id of core.meta.soilSteps[k]) {
    const { geometry, record } = step.geometry(id), atlas = atlases[record.texture]; if (!atlas) continue;
    const texel = record.mode === 'floor' ? atlas.floorTexelMetres : atlas.wallTexelMetres;
    const p = geometry.attributes.position.array, q = geometry.attributes.uv.array, I = geometry.index.array;
    let bad = [], areaBad = 0, areaAll = 0;
    for (let t = 0; t < I.length; t += 3) {
      const P = [0, 1, 2].map(s => [p[3 * I[t + s]], p[3 * I[t + s] + 1], p[3 * I[t + s] + 2]]), U = [0, 1, 2].map(s => [q[2 * I[t + s]], q[2 * I[t + s] + 1]]);
      const a = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]], b = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
      const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], world = Math.hypot(...n) / 2;
      const tex = ((U[1][0] - U[0][0]) * (U[2][1] - U[0][1]) - (U[1][1] - U[0][1]) * (U[2][0] - U[0][0])) / 2 * atlas.width * atlas.height * texel * texel;
      const r = Math.abs(tex) / world; areaAll += world;
      if (world > 1e-6 && (r < .55 || r > 1.05)) { areaBad += world; if (bad.length < 4) bad.push({ worldMm2: +(world * 1e6).toFixed(2), r: +r.toFixed(3), n: n.map(v => +(v / world / 2).toFixed(3)), P: P.map(v => v.map(x => +x.toFixed(4))), U: U.map(v => [+(v[0] * atlas.width).toFixed(2), +(v[1] * atlas.height).toFixed(2)]) }); }
    }
    console.log(id, record.texture, 'badArea m2', areaBad.toFixed(5), 'of', areaAll.toFixed(2), JSON.stringify(bad));
  }
}
