// GPU readback check of the CPU era displacement (src/eras/soil-displace.js): sampled vertices of the displaced era
// meshes are drawn as points through the render path's own GLSL (boundsGLSL + TOP_GLSL + DISPLACE_GLSL + DISPLACE_Y),
// each writing its displaced y and top normal to one texel of a float target; the CPU values are compared per vertex.
import * as THREE from 'three';
import { siteBoundaryGrids } from '/src/eras/site-state.js';
import { createSoilBlock } from '/src/eras/soil-block.js';
import { boundsGLSL, TOP_GLSL, DISPLACE_GLSL, DISPLACE_Y } from '/src/eras/soil-shader.js';
import { createEraDisplacement } from '/src/eras/soil-displace.js';
import { TOP_CHARACTER, FLOOR_CHARACTER } from '/src/museum-scene.js';
import { filmState } from '/src/film/timeline.js';

const W = 256, SAMPLES = 16000;
const renderer = new THREE.WebGLRenderer({ canvas: document.createElement('canvas') });
const stack = siteBoundaryGrids();
const block = createSoilBlock({ stack, top: { character: TOP_CHARACTER, albedoMultiplier: .65, slopeDarken: 0 }, floor: { character: FLOOR_CHARACTER } });
const displacement = createEraDisplacement({ stack: block.stack });
const meshes = block.meshes().filter(m => m.userData.eraDisplaced);
const targetSize = { value: new THREE.Vector2(W, 1) };
const vertexShader = `${boundsGLSL(stack)}${TOP_GLSL}${DISPLACE_GLSL}
  attribute float sampleIndex; uniform vec2 targetSize; varying vec4 vOut;
  void main(){
    vec3 objectNormal=normal;
    ${DISPLACE_Y}
    vOut=vec4(eraY,objectNormal);
    float px=mod(sampleIndex,targetSize.x),py=floor(sampleIndex/targetSize.x);
    gl_Position=vec4((px+.5)/targetSize.x*2.0-1.0,(py+.5)/targetSize.y*2.0-1.0,0.0,1.0);
    gl_PointSize=1.0;
  }`;
const fragmentShader = 'varying vec4 vOut; void main(){ gl_FragColor=vOut; }';
const camera = new THREE.OrthographicCamera();
const probes = meshes.map(mesh => {
  const g = mesh.geometry, T = g.attributes.eraBlend, moving = [];
  for (let i = 0; i < T.count; i++) if (T.getX(i) >= 0) moving.push(i);
  const edge = moving.filter(i => T.getX(i) > 0 && T.getX(i) < 1), rest = moving.filter(i => !(T.getX(i) > 0 && T.getX(i) < 1));
  const take = edge.slice(0, 4000), stride = Math.max(1, Math.floor(rest.length / (SAMPLES - take.length)));
  for (let i = 0; i < rest.length && take.length < SAMPLES; i += stride) take.push(rest[i]);
  const pick = name => { const a = g.attributes[name], n = a.itemSize, out = new Float32Array(take.length * n); take.forEach((i, j) => { for (let c = 0; c < n; c++) out[j * n + c] = a.array[i * n + c]; }); return new THREE.BufferAttribute(out, n); };
  const pg = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'eraSampleA', 'eraSampleB', 'eraBlend']) pg.setAttribute(name, pick(name));
  pg.setAttribute('sampleIndex', new THREE.BufferAttribute(Float32Array.from(take, (_, j) => j), 1));
  const top = mesh.userData.eraDisplaced === 'top';
  const material = new THREE.ShaderMaterial({ defines: top ? { ERA_TOP_NORMAL: '' } : {}, uniforms: { ...block.uniforms, targetSize }, vertexShader, fragmentShader });
  const points = new THREE.Points(pg, material); points.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(points);
  const H = Math.ceil(take.length / W), target = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: false });
  return { mesh, top, take, edgeCount: Math.min(edge.length, 4000), moving: moving.length, vertices: T.count, scene, target, H };
});
function gpuValues(probe) {
  targetSize.value.set(W, probe.H);
  renderer.setRenderTarget(probe.target); renderer.setClearColor(0x000000, 0); renderer.clear();
  renderer.render(probe.scene, camera);
  const out = new Float32Array(W * probe.H * 4); renderer.readRenderTargetPixels(probe.target, 0, 0, W, probe.H, out); renderer.setRenderTarget(null);
  return out;
}
const STATES = {
  'bare silt (all deposits 0)': { deposits: Array(10).fill(0), features: Array(10).fill(0), excavation: 0 },
  'film 5.0 s (rewind, fractional)': filmState(5).scene,
  'film 20.6 s (Kushan rising)': filmState(20.6).scene,
  'full deposits, excavation 1': { deposits: Array(10).fill(1), features: Array(10).fill(1), excavation: 1 }
};
const quantile = (v, q) => { const s = [...v].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * (s.length - 1)))]; };
const results = [];
for (const [name, state] of Object.entries(STATES)) {
  if (!state?.deposits) throw new Error(`state ${name} has no deposits`);
  block.apply({ deposits: state.deposits, k: 0 });
  displacement.beginFrame(state);
  for (const p of probes) {
    const gpu = gpuValues(p), cpu = displacement.resolve(p.mesh);
    let maxY = 0, maxAngle = 0, worst = null; const dys = [];
    p.take.forEach((i, j) => {
      const dy = Math.abs(cpu.positions[3 * i + 1] - gpu[4 * j]); dys.push(dy);
      if (dy > maxY) { maxY = dy; worst = { vertex: i, cpu: cpu.positions[3 * i + 1], gpu: gpu[4 * j], blend: p.mesh.geometry.attributes.eraBlend.getX(i) }; }
      if (p.top) { const a = [cpu.normals[3 * i], cpu.normals[3 * i + 1], cpu.normals[3 * i + 2]], g = [gpu[4 * j + 1], gpu[4 * j + 2], gpu[4 * j + 3]];
        const dot = (a[0] * g[0] + a[1] * g[1] + a[2] * g[2]) / Math.hypot(...a) / Math.hypot(...g); maxAngle = Math.max(maxAngle, Math.acos(Math.min(1, dot)) * 180 / Math.PI); }
    });
    results.push({ state: name, mesh: p.mesh.name, vertices: p.vertices, movingVertices: p.moving, sampled: p.take.length, edgeSampled: p.edgeCount,
      maxAbsYErrorMetres: maxY, p99AbsYErrorMetres: quantile(dys, .99), maxNormalAngleDegrees: p.top ? maxAngle : null, worst });
  }
}
// 600-step film scrub, CPU only: beginFrame + resolve of every displaced mesh per step.
const firstPrepare = [];
const fresh = createEraDisplacement({ stack: block.stack });
const s0 = filmState(0).scene; fresh.beginFrame(s0);
for (const m of meshes) { const t0 = performance.now(); fresh.resolve(m); firstPrepare.push({ mesh: m.name, ms: performance.now() - t0 }); }
const times = [], recomputeTimes = []; let last = null;
for (let i = 0; i < 600; i++) {
  const state = filmState(i * .1).scene, key = state.deposits.join(','), t0 = performance.now();
  fresh.beginFrame(state); for (const m of meshes) fresh.resolve(m);
  const ms = performance.now() - t0; times.push(ms); if (key !== last) recomputeTimes.push(ms); last = key;
}
const stat = v => ({ n: v.length, p50: quantile(v, .5), p95: quantile(v, .95), max: Math.max(...v) });
window.eraDisplaceCheck = { done: true, results, maxAbsYErrorMetres: Math.max(...results.map(r => r.maxAbsYErrorMetres)), maxNormalAngleDegrees: Math.max(...results.map(r => r.maxNormalAngleDegrees ?? 0)),
  firstPrepare, scrub: { stepSeconds: .1, steps: 600, all: stat(times), depositChangeSteps: stat(recomputeTimes) },
  gpu: renderer.getContext().getParameter(renderer.getContext().VERSION), userAgent: navigator.userAgent };
