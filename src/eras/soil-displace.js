// CPU mirror of the era block's GPU top displacement (TOP_GLSL and DISPLACE_Y in soil-shader.js), for CPU audits of
// the meshes whose top vertices move on the GPU (era-top, era-top-margins, era-outer, era-outer-margins): ray casts,
// silhouettes and anchors. It samples the same boundary grids the shader reads (the Float32 data behind
// boundaryTextures), with the same bilinear lookup, truncation and normal step constants. The render path never calls
// it. Contract: output/lookdev/modelling/m1/cpu-displacement.md; GPU readback check: scripts/modelling/era-displace-gpu.cjs.
import { BOUNDARY_COUNT } from './stack.js';
import { TOP_STAGGER_METRES, TOP_NORMAL_STEP_METRES } from './soil-shader.js';
import { eraDepositUniform } from './stack.js';

const N = BOUNDARY_COUNT - 1, STRIDE = BOUNDARY_COUNT;
const mix = (a, b, t) => a * (1 - t) + b * t;

// eraBounds in boundsGLSL: clamped bilinear lookup of the 11 boundary grids.
function boundsAt(stack, x, z, out) {
  const { nx, nz, xmin, zmin, stepMetres, grids } = stack;
  const gx = Math.min(Math.max((x - xmin) / stepMetres, 0), nx - 1), gz = Math.min(Math.max((z - zmin) / stepMetres, 0), nz - 1);
  const ix = Math.min(Math.floor(gx), nx - 2), iz = Math.min(Math.floor(gz), nz - 2), u = gx - ix, v = gz - iz;
  const k00 = iz * nx + ix, k10 = k00 + 1, k01 = k00 + nx, k11 = k01 + 1;
  for (let j = 0; j < BOUNDARY_COUNT; j++) { const g = grids[j]; out[j] = mix(mix(g[k00], g[k10], u), mix(g[k01], g[k11], u), v); }
  return out;
}
// eraTopFrom in TOP_GLSL is linear in the deposits: top = c[0] + sum_i d[i] * c[i + 1]. Adds weight * c at offset.
function addTopCoefficients(b, ground, c, offset, weight) {
  b[N] = ground;
  for (let j = 0; j < N; j++) b[j] = Math.min(b[j], ground - TOP_STAGGER_METRES * (N - j));
  c[offset] += weight * b[0];
  for (let i = 0; i < N; i++) c[offset + 1 + i] += weight * (b[i + 1] - b[i]);
}

export function createEraDisplacement({ stack }) {
  const records = new WeakMap(), b = new Float64Array(BOUNDARY_COUNT);
  let current = null;
  function prepare(geometry, top) {
    const { position, normal, eraSampleA: A, eraSampleB: B, eraBlend: T } = geometry.attributes, moving = [];
    for (let i = 0; i < T.count; i++) if (T.getX(i) >= 0) moving.push(i);
    const C = new Float32Array(moving.length * STRIDE), G = top ? new Float32Array(moving.length * 2 * STRIDE) : null, h = TOP_NORMAL_STEP_METRES;
    moving.forEach((i, m) => {
      const t = T.getX(i);
      addTopCoefficients(boundsAt(stack, A.getX(i), A.getY(i), b), A.getZ(i), C, m * STRIDE, 1 - t);
      if (t !== 0) addTopCoefficients(boundsAt(stack, B.getX(i), B.getY(i), b), B.getZ(i), C, m * STRIDE, t);
      if (!G) return;
      // ERA_TOP_NORMAL: central differences of the grid top (ground = the grid's own surface) 5 cm either side.
      const x = mix(A.getX(i), B.getX(i), t), z = mix(A.getY(i), B.getY(i), t), o = m * 2 * STRIDE;
      for (const [dx, dz, at] of [[h, 0, o], [0, h, o + STRIDE]]) {
        boundsAt(stack, x + dx, z + dz, b); addTopCoefficients(b, b[N], G, at, 1);
        boundsAt(stack, x - dx, z - dz, b); addTopCoefficients(b, b[N], G, at, -1);
      }
    });
    return { moving: Int32Array.from(moving), C, G, positions: Float32Array.from(position.array), normals: Float32Array.from(normal.array), key: null };
  }
  function resolve(mesh, state = current) {
    const kind = mesh?.userData?.eraDisplaced;
    if (!kind) return null;
    if (!state?.deposits) throw new Error('era displacement needs a state with deposits (call beginFrame or pass the applyState state)');
    const geometry = mesh.geometry, d = eraDepositUniform(state.deposits), key = d.join(',');
    let r = records.get(geometry);
    if (!r) records.set(geometry, r = prepare(geometry, kind === 'top'));
    if (r.key === key) return { positions: r.positions, normals: r.normals };
    const { moving, C, G, positions, normals } = r, h2 = 2 * TOP_NORMAL_STEP_METRES;
    for (let m = 0; m < moving.length; m++) {
      const i = moving[m], o = m * STRIDE;
      let y = C[o];
      for (let k = 0; k < N; k++) y += d[k] * C[o + 1 + k];
      positions[3 * i + 1] = y;
      if (!G) continue;
      const g = 2 * o;
      let gx = G[g], gz = G[g + STRIDE];
      for (let k = 0; k < N; k++) { gx += d[k] * G[g + 1 + k]; gz += d[k] * G[g + STRIDE + 1 + k]; }
      const nx = -gx / h2, nz = -gz / h2, l = Math.hypot(nx, 1, nz);
      normals[3 * i] = nx / l; normals[3 * i + 1] = 1 / l; normals[3 * i + 2] = nz / l;
    }
    r.key = key;
    return { positions, normals };
  }
  return {
    // Call after applyState with the same state; resolve(mesh) then uses it.
    beginFrame(state) { current = state; },
    resolve
  };
}
