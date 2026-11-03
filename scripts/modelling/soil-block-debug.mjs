import { internals as I } from '../../src/eras/soil-block.js';
import { TRENCHES } from '../../src/eras/layout.js';
const ctx = I.trenchContext(TRENCHES[1], 1), k = 1, vals = I.stepValues(ctx, k);
const { nx, xs, zs, terms, volumes } = ctx;
const i = I.IX(-4.975) - ctx.ia, j = I.IZ(7.15) - ctx.ja;
for (const [di, dj] of [[-1,-1],[0,-1],[-1,0],[0,0]]) {
  const q00 = (j+dj) * nx + (i+di), q10 = q00 + 1, q01 = q00 + nx, q11 = q01 + 1;
  for (const tri of [[q00, q11, q10], [q00, q01, q11]]) {
    const poly = tri.map(q => ({ x: xs[q % nx], z: zs[Math.floor(q / nx)], vals: Float64Array.from(terms.map((_, t) => vals[t][q])) }));
    const pieces = I.envelope(poly, volumes);
    console.log(JSON.stringify(poly.map(p => [p.x, p.z, +p.vals[0].toFixed(4), +p.vals[1].toFixed(4), ...[2,3,4].map(t=>+p.vals[t].toFixed(3))])));
    for (const [p, l] of pieces) console.log('  label', l, terms[l].kind, terms[l].side ?? '', JSON.stringify(p.map(v => [+v.x.toFixed(5), +v.z.toFixed(5), +v.vals[l].toFixed(4)])));
  }
}
