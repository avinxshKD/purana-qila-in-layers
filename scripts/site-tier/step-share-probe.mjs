// Probe (CPU): do the dug walls and step tops of cut step k coincide with those of the last step? Counts step-k
// vertices whose exact position (0.1 mm key) is also a vertex of step 12, and step-top area by slope.
import * as THREE from 'three';
import { siteBoundaryGrids } from '../../src/eras/site-state.js';
import { createSoilBlock } from '../../src/eras/soil-block.js';
import { TOP_CHARACTER, FLOOR_CHARACTER, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN } from '../../src/museum-scene.js';
const stack = siteBoundaryGrids();
const block = createSoilBlock({ stack, outputScale: 1, parent: new THREE.Scene(), top: { character: TOP_CHARACTER, albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN }, floor: { character: FLOOR_CHARACTER } });
for (let k = 1; k <= block.cutSteps; k++) block.warm(k);
const by = Object.fromEntries(block.meshes().map(m => [m.name, m]));
const key = (p, i) => Math.round(p[3 * i] * 1e4) + ',' + Math.round(p[3 * i + 1] * 1e4) + ',' + Math.round(p[3 * i + 2] * 1e4);
const set = g => { const p = g.attributes.position.array, s = new Set(); for (let i = 0; i < p.length / 3; i++) s.add(key(p, i)); return s; };
const tris = (g, fn) => { const p = g.attributes.position.array, I = g.index.array; for (let t = 0; t < I.length / 3; t++) { const a = 3 * I[3 * t], b = 3 * I[3 * t + 1], c = 3 * I[3 * t + 2]; const u = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]], v = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]]; const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]], l = Math.hypot(...n); fn(l / 2, l ? Math.abs(n[1]) / l : 1, I[3 * t], I[3 * t + 1], I[3 * t + 2]); } };
const last = { walls: set(by['era-walls-step-12'].geometry), top: set(by['era-top-step-12'].geometry), floors: set(by['era-floors-step-12'].geometry) };
const fixedTop = set(by['era-top'].geometry);
for (let k = 1; k <= 12; k++) {
  const row = { k };
  for (const [part, name] of [['walls', 'era-walls-step-'], ['top', 'era-top-step-'], ['floors', 'era-floors-step-']]) {
    const g = by[name + k].geometry, p = g.attributes.position.array, n = p.length / 3; let hit = 0, hitAll = 0;
    const s12 = last[part]; for (let i = 0; i < n; i++) { const q = key(p, i); if (s12.has(q)) hit++; if (last.walls.has(q) || last.top.has(q) || last.floors.has(q)) hitAll++; }
    // Area of triangles whose three vertices are all step-12 vertices of any part.
    let area = 0, shared = 0; tris(g, (A, ny, a, b, c) => { area += A; if ([a, b, c].every(i => last.walls.has(key(p, i)) || last.top.has(key(p, i)) || last.floors.has(key(p, i)))) shared += A; });
    row[part] = { vertices: n, inSame12: +(hit / n).toFixed(3), inAny12: +(hitAll / n).toFixed(3), areaM2: +area.toFixed(2), sharedAreaM2: +shared.toFixed(2) };
  }
  let steep = 0, all = 0, topFixed = 0; const g = by['era-top-step-' + k].geometry, p = g.attributes.position.array;
  tris(g, (A, ny) => { all += A; if (ny < .6) steep += A; });
  for (let i = 0; i < p.length / 3; i++) if (fixedTop.has(key(p, i))) topFixed++;
  row.stepTop = { steepAreaM2: +steep.toFixed(2), areaM2: +all.toFixed(2), verticesOnFixedTop: topFixed };
  console.log(JSON.stringify(row));
}
for (const name of ['era-top', 'era-top-margins', 'era-outer', 'era-outer-margins', 'era-ring-pedestal', 'era-front-step-12']) { const g = by[name].geometry; g.computeBoundingBox(); console.log(name, JSON.stringify(g.boundingBox)); }
