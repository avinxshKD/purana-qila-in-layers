// Wall batter measured on the emitted step-12 dug-wall geometry (area-weighted normal tilt per trench wall) beside the
// design draw in excavation.js batterReport().
import { siteBoundaryGrids } from '../../src/eras/site-state.js';
import { createSoilBlock } from '../../src/eras/soil-block.js';
import { batterReport } from '../../src/eras/excavation.js';
import { TRENCHES } from '../../src/eras/layout.js';
import { TOP_CHARACTER, FLOOR_CHARACTER } from '../../src/museum-scene.js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const block = createSoilBlock({ stack: siteBoundaryGrids(), top: { character: TOP_CHARACTER, albedoMultiplier: .8, slopeDarken: .3 }, floor: { character: FLOOR_CHARACTER } });
block.warm(12); block.apply({ deposits: Array(10).fill(1), k: 12 });
const walls = block.meshes().find(m => m.name === 'era-walls-step-12').geometry;
const pos = walls.getAttribute('position').array, index = walls.index?.array;
const tri = i => index ? [index[i], index[i + 1], index[i + 2]] : [i, i + 1, i + 2];
const acc = {};
const count = index ? index.length : pos.length / 3;
for (let i = 0; i < count; i += 3) {
  const [a, b, c] = tri(i).map(k => [pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2]]);
  const u = b.map((v, j) => v - a[j]), v = c.map((w, j) => w - a[j]);
  const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], area = Math.hypot(...n) / 2;
  if (area < 1e-6) continue;
  const nn = n.map(x => x / (2 * area)), cx = (a[0] + b[0] + c[0]) / 3, cz = (a[2] + b[2] + c[2]) / 3;
  if (Math.abs(nn[1]) > .3) continue;
  const t = TRENCHES.find(t => cx > t.xmin - .5 && cx < t.xmax + .5 && cz > t.zmin - .5 && cz < t.zmax + .1);
  if (!t) continue;
  const wall = Math.abs(nn[0]) > Math.abs(nn[2]) ? (cx < (t.xmin + t.xmax) / 2 ? 'west' : 'east') : 'back';
  const key = `${t.id}-${wall}`; acc[key] ??= { area: 0, tilt: 0 };
  acc[key].area += area; acc[key].tilt += area * Math.asin(Math.abs(nn[1])) * 180 / Math.PI;
}
const design = Object.fromEntries(batterReport().map(r => [r.id, r.batterDegrees]));
const rows = Object.entries(acc).sort().map(([key, v]) => { const [id, wall] = [key.slice(0, key.lastIndexOf('-')), key.slice(key.lastIndexOf('-') + 1)];
  return { wall: key, measuredDegrees: +(v.tilt / v.area).toFixed(2), designDegrees: design[id]?.[wall] ?? null, areaSquareMetres: +v.area.toFixed(2) }; });
console.log(JSON.stringify(rows, null, 1));
writeFileSync(fileURLToPath(new URL('../../output/lookdev/modelling/m1/m1-batter.json', import.meta.url)), JSON.stringify({ method: 'Area-weighted asin(|n.y|) of the step-12 dug-wall triangles (|n.y| <= 0.3) per trench wall; design = excavation.js batterReport().', rows }, null, 1) + '\n');
