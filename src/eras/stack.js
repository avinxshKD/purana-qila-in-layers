// Era stack for the composite section: deposit thicknesses and boundary surfaces. Every value here is a modelling
// decision (M), proposed in output/lookdev/modelling/m0/m0-layout.md; no source gives per-period thicknesses.
import { surfaceHeight } from '../layers.js';
import { gradientNoise } from '../soil-noise.js';
import { edgeErosion, lipErosion } from '../earth-edges.js';

// State-contract order, bottom to top (deposits[i], features[i]).
export const ERA_IDS = Object.freeze(['pre-mauryan', 'mauryan', 'sunga', 'kushan', 'gupta', 'post-gupta', 'rajput', 'sultanate', 'mughal', 'modern-fill']);
// thickness = T * (1 + s * r), r = clamp((ground - 2.5) / 2.5, -1, 1). s < 0 thickens downslope; s > 0 thickens the
// occupation bands upslope so that the deeper boundaries, and the trench floors on them, flatten. Nominal ranges leave
// room for the boundary swell and raggedness (the modern-fill base keeps its 5-20 cm unevenness), so local thickness
// stays within 0.5-1.5 m away from the eroded block edges.
export const ERA_THICKNESS = Object.freeze({
  'modern-fill': { T: .95, s: -.15 }, mughal: { T: .75, s: -.15 }, sultanate: { T: .8, s: .25 }, rajput: { T: 1.1, s: .25 },
  'post-gupta': { T: .75, s: .2 }, gupta: { T: .75, s: .2 }, kushan: { T: 1.1, s: .25 }, sunga: { T: .8, s: .25 },
  mauryan: { T: 1, s: 0 }, 'pre-mauryan': { T: 1.4, s: 0 }
});
export const SILT = Object.freeze({ shownMetres: .6, fadeMetres: .6 });
// Low swell on the inner boundaries, smaller than the seven-band look's (.10/.065) so local thickness stays near the table.
export const BOUNDARY_SWELL = Object.freeze({ amplitudesMetres: [.025, .015], truncationMetres: .002 });
export const BOUNDARY_COUNT = ERA_IDS.length + 1;
// The eraDeposits uniform value for a state's deposits (soil-block.js, the CPU mirror in soil-displace.js, the site tier).
export const eraDepositUniform = deposits => deposits.map(v => v < 0 ? 0 : v > 1 ? 1 : v);

// The stack follows the uneroded ground; edge erosion only truncates it from above.
export const groundHeight = (x, z) => surfaceHeight(x, z) + edgeErosion(x, z);
// Present surface before any cut: the outer block edges are eroded, the trench lips are not (they exist only once cut;
// the soil block applies the lip erosion per cut step).
export const uncutGround = (x, z) => surfaceHeight(x, z) + lipErosion(x, z);
const ratio = (x, z) => Math.max(-1, Math.min(1, (groundHeight(x, z) - 2.5) / 2.5));
export function nominalThickness(era, x, z) {
  const { T, s } = ERA_THICKNESS[ERA_IDS[era]];
  return T * (1 + s * ratio(x, z));
}
// The octaves and amplitudes of layers.js boundaryRoughness, sampled in plan (x, z). That function is a profile in
// s = x + z for a band line on a face; used for a whole boundary surface it makes parallel ridges along x + z = const,
// which every exposed era top and trench floor showed as diagonal streaks.
function surfaceRoughness(index, x, z) {
  const n = (period, seed) => gradientNoise(x / period, index * 1.37 + .21, z / period, seed + index * 101);
  if (index === 1) {
    // Raised 0-4.2 cm terraces, broad enough that their slope stays under 0.5 (0.09 m / 0.045 m reached 1.8).
    const step = Math.max(0, n(.3, 18113)) * .042;
    return .085 * n(1.3, 18101) + .045 * n(.42, 18107) + .02 * n(.13, 18109) + step;
  }
  return .016 * n(.55, 18201) + .014 * n(.16, 18203) + .009 * n(.06, 18207) + Math.max(0, n(.11, 18211)) * .018;
}
function swell(j, x, z) {
  const [a, b] = BOUNDARY_SWELL.amplitudesMetres;
  // Boundary 9 is the base of the modern fill and keeps the look's uneven 5-20 cm profile (roughness index 1).
  return a * Math.sin(x * .29 + z * .17 + j * 1.3) + b * Math.cos(z * .43 - x * .12 - j) + surfaceRoughness(j === 9 ? 1 : 11 + j, x, z);
}
// Boundary j (0..10): j = 10 is the present surface (top of the modern fill), j = 0 the top of the silt. Era i lies
// between boundary i (its base) and boundary i + 1 (its top). Fills out[0..10] for one point; ground is evaluated once.
export function boundaryHeights(x, z, out = new Float64Array(BOUNDARY_COUNT)) {
  const eroded = uncutGround(x, z), ground = surfaceHeight(x, z) + edgeErosion(x, z), r = Math.max(-1, Math.min(1, (ground - 2.5) / 2.5));
  out[BOUNDARY_COUNT - 1] = eroded;
  let depth = 0;
  for (let j = BOUNDARY_COUNT - 2; j >= 0; j--) {
    const { T, s } = ERA_THICKNESS[ERA_IDS[j]];
    depth += T * (1 + s * r);
    out[j] = Math.min(ground - depth + swell(j, x, z), eroded - BOUNDARY_SWELL.truncationMetres * (BOUNDARY_COUNT - 1 - j));
  }
  return out;
}
const scratch = new Float64Array(BOUNDARY_COUNT);
export const boundaryHeight = (j, x, z) => boundaryHeights(x, z, scratch)[j];
export const eraTop = (era, x, z) => boundaryHeight(era + 1, x, z);
export const eraBase = (era, x, z) => boundaryHeight(era, x, z);

// Boundary heights on a regular grid, the shared source for the active top and the shader clip.
export const GRID = Object.freeze({ xmin: -12, zmin: -8, width: 24, length: 16, stepMetres: .05 });
export function boundaryGrids(grid = GRID) {
  const nx = Math.round(grid.width / grid.stepMetres) + 1, nz = Math.round(grid.length / grid.stepMetres) + 1;
  const grids = Array.from({ length: BOUNDARY_COUNT }, () => new Float32Array(nx * nz));
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const x = grid.xmin + ix * grid.stepMetres, z = grid.zmin + iz * grid.stepMetres, k = iz * nx + ix;
    boundaryHeights(x, z, scratch);
    for (let j = 0; j < BOUNDARY_COUNT; j++) grids[j][k] = scratch[j];
  }
  return { ...grid, nx, nz, grids };
}
// Active top = silt top + sum of deposits[i] * thickness_i: continuous in every deposit value, and equal to boundary
// k + 1 whenever deposits 0..k are 1 and the rest 0.
export function activeTopGrid(stack, deposits, out = new Float32Array(stack.nx * stack.nz)) {
  const g = stack.grids;
  out.set(g[0]);
  for (let i = 0; i < ERA_IDS.length; i++) {
    const d = Math.max(0, Math.min(1, deposits[i] ?? 0));
    if (d === 0) continue;
    const top = g[i + 1], base = g[i];
    for (let k = 0; k < out.length; k++) out[k] += d * (top[k] - base[k]);
  }
  return out;
}
export function sampleGrid(stack, values, x, z) {
  const fx = Math.max(0, Math.min(stack.nx - 1, (x - stack.xmin) / stack.stepMetres)), fz = Math.max(0, Math.min(stack.nz - 1, (z - stack.zmin) / stack.stepMetres));
  const ix = Math.min(stack.nx - 2, Math.floor(fx)), iz = Math.min(stack.nz - 2, Math.floor(fz)), u = fx - ix, v = fz - iz, k = iz * stack.nx + ix;
  return (values[k] * (1 - u) + values[k + 1] * u) * (1 - v) + (values[k + stack.nx] * (1 - u) + values[k + stack.nx + 1] * u) * v;
}
export function activeTopAt(deposits, x, z) {
  const b = boundaryHeights(x, z, new Float64Array(BOUNDARY_COUNT));
  let y = b[0];
  for (let i = 0; i < ERA_IDS.length; i++) y += Math.max(0, Math.min(1, deposits[i] ?? 0)) * (b[i + 1] - b[i]);
  return y;
}
// Era whose deposit forms the active top at (x, z): the highest era with a non-zero deposit, or -1 (bare silt).
export function activeEra(deposits) {
  for (let i = ERA_IDS.length - 1; i >= 0; i--) if ((deposits[i] ?? 0) > 0) return i;
  return -1;
}
export function eraAtHeight(x, y, z) {
  const b = boundaryHeights(x, z, new Float64Array(BOUNDARY_COUNT));
  for (let i = ERA_IDS.length - 1; i >= 0; i--) if (y >= b[i]) return i;
  return -1;
}
