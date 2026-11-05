// Site tier soil bake (browser page, scripts/site-tier/bake.html; driver bake.cjs). Renders the M1 era soil shader
// (src/eras/soil-shader.js, unchanged) into texture space: each fragment is one texel of a page, at the texel's world
// position, so the shader's own pixel-footprint filtering runs at the texel size. The film material is wrapped, not
// edited: its onBeforeCompile runs first, then this file moves gl_Position to the page and replaces the output.
//   albedo  - diffuse colour before lighting (linear; written as sRGB 8-bit)
//   normal  - world normal of the visible side with the M1 relief applied (xyz * 0.5 + 0.5)
//   top     - active top only: the variation multiplier (mottle, clods, specks, dark patches) and the x, z relief
//             gradient, with the seed of the 2023 state (eraActive 9); era colour, veneer and slope stay live.
// Uncovered texels are filled from the nearest covered texel (breadth-first), so mips and filtering never pull in
// background. Every page is also returned 2x downsampled (same uv) for the 4 cm first-view option.
import * as THREE from 'three';
import { siteBoundaryGrids } from '../../src/eras/site-state.js';
import { eraSoilMaterial, boundaryTextures } from '../../src/eras/soil-shader.js';
import { blockLevels, fixedGeometry } from '../../src/eras/soil-block.js';
import { TOP_CHARACTER, FLOOR_CHARACTER, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN } from '../../src/museum-scene.js';
import { readPack, inflatePack } from '../../src/site-tier/pack.js';
import { loadSiteTierAssets } from '../../src/site-tier/assets.js';

export const TOP_ACTIVE_ERA = 9;
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: false });
renderer.setPixelRatio(1); renderer.setSize(64, 64); renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false;
document.body.append(renderer.domElement);
const t0 = performance.now(), stack = siteBoundaryGrids(), gridsMs = performance.now() - t0, levels = blockLevels(stack), textures = boundaryTextures(stack);
const uniforms = { eraB0: { value: textures[0] }, eraB1: { value: textures[1] }, eraB2: { value: textures[2] },
  eraDeposits: { value: Array(10).fill(1) }, eraActive: { value: TOP_ACTIVE_ERA }, eraIdPass: { value: 0 } };
const bake = { output: { value: 0 }, visible: { value: 0 }, axis: { value: new THREE.Vector2() }, out: { value: new THREE.Vector3() },
  uvMode: { value: 0 }, planeU: { value: new THREE.Vector4() }, planeV: { value: new THREE.Vector4() }, depthMode: { value: 0 } };
const materials = new Map();
// outputScale as the film's (output height / 1080): scales the pixel footprint the octave filter sees, so > 1 drops the
// finest octaves a texel would otherwise keep.
function material(mode, outputScale = 1) {
  const cacheKey = `${mode}|${outputScale}`;
  if (materials.has(cacheKey)) return materials.get(cacheKey);
  const m = eraSoilMaterial({ mode, displaced: false, outputScale, grid: stack, uniforms, bottomY: levels.bottomY, fadeStartY: levels.fadeStartY,
    top: { character: TOP_CHARACTER, albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN }, floor: { character: FLOOR_CHARACTER } });
  const film = m.onBeforeCompile, filmKey = m.customProgramCacheKey;
  m.onBeforeCompile = (shader, r) => {
    film(shader, r);
    Object.assign(shader.uniforms, { bakeOutput: bake.output, bakeVisible: bake.visible, bakeAxis: bake.axis, bakeOut: bake.out, bakeUvMode: bake.uvMode, bakePlaneU: bake.planeU, bakePlaneV: bake.planeV, bakeDepthMode: bake.depthMode });
    const v = shader.vertexShader.split('#include <project_vertex>');
    if (v.length !== 2) throw new Error('bake: project_vertex not found once');
    shader.vertexShader = `attribute vec2 bakeUv; uniform int bakeUvMode; uniform vec4 bakePlaneU; uniform vec4 bakePlaneV; uniform int bakeDepthMode;\n${v[0]}#include <project_vertex>
      vec2 bUv=bakeUvMode==0?bakeUv:vec2(dot(eraPosition,bakePlaneU.xyz)+bakePlaneU.w,dot(eraPosition,bakePlaneV.xyz)+bakePlaneV.w);
      gl_Position=vec4(bUv*2.0-1.0,bakeDepthMode==1?-eraPosition.y/50.0:0.0,1.0);${v[1]}`;
    const f = shader.fragmentShader.split('diffuseColor.rgb*=variation;');
    if (f.length !== 2) throw new Error('bake: variation line not found once');
    let frag = `float bakeVariation=1.0; uniform int bakeOutput; uniform int bakeVisible; uniform vec2 bakeAxis; uniform vec3 bakeOut;\n${f[0]}diffuseColor.rgb*=variation; bakeVariation=variation;${f[1]}`;
    const end = frag.lastIndexOf('}');
    frag = frag.slice(0, end) + `
      {
        vec3 bN=normalize(cross(dFdx(eraPosition),dFdy(eraPosition)));
        if(bakeVisible==0){ if(bN.y<0.0) bN=-bN; }
        else if(bakeVisible==1){ if(dot(bN.xz,eraPosition.xz-bakeAxis)<0.0) bN=-bN; }
        else { if(dot(bN,bakeOut)<0.0) bN=-bN; }
        vec3 bG=strataReliefGradient, bNp=bN;
        if(dot(bG,bG)<16.0) bNp=normalize(bN-(bG-bN*dot(bG,bN)));
        gl_FragColor=bakeOutput==0?vec4(diffuseColor.rgb,1.0):bakeOutput==1?vec4(bNp,1.0):vec4(bakeVariation,bG.x,bG.z,1.0);
      }
    ` + frag.slice(end);
    shader.fragmentShader = frag;
  };
  m.customProgramCacheKey = () => filmKey() + '-site-tier-bake';
  m.side = THREE.DoubleSide; m.polygonOffset = false;
  materials.set(cacheKey, m);
  return m;
}
const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
const VISIBLE = { up: 0, radial: 1, plane: 2 }, OUTPUT = { albedo: 0, normal: 1, top: 2 };

// meshes: [{ geometry, mode, visible, axis?, out? }] with bakeUv, or planar uv from page.plane.
function render(width, height, meshes, output, { plane = null, depth = false, outputScale = 1 } = {}) {
  const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.FloatType, format: THREE.RGBAFormat, depthBuffer: depth, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
  renderer.setRenderTarget(target); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
  bake.output.value = OUTPUT[output]; bake.uvMode.value = plane ? 1 : 0; bake.depthMode.value = depth ? 1 : 0;
  if (plane) { bake.planeU.value.fromArray(plane.u); bake.planeV.value.fromArray(plane.v); }
  for (const item of meshes) {
    const mesh = new THREE.Mesh(item.geometry, material(item.mode, outputScale)); mesh.frustumCulled = false;
    mesh.material.depthTest = depth; mesh.material.depthWrite = depth;
    bake.visible.value = VISIBLE[item.visible]; if (item.axis) bake.axis.value.fromArray(item.axis); if (item.out) bake.out.value.fromArray(item.out);
    scene.add(mesh); renderer.render(scene, camera); scene.remove(mesh);
  }
  const data = new Float32Array(width * height * 4);
  renderer.readRenderTargetPixels(target, 0, 0, width, height, data);
  renderer.setRenderTarget(null); target.dispose();
  return data;
}
// Breadth-first fill of uncovered texels (alpha 0) from covered neighbours.
function fill(data, width, height) {
  const n = width * height, done = new Uint8Array(n), queue = new Int32Array(n); let head = 0, tail = 0, covered = 0;
  for (let i = 0; i < n; i++) if (data[4 * i + 3] > .5) { done[i] = 1; queue[tail++] = i; covered++; }
  if (!covered) throw new Error('bake: page has no covered texel');
  while (head < tail) {
    const i = queue[head++], x = i % width, y = (i - x) / width;
    for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1]) {
      if (j < 0 || done[j]) continue;
      done[j] = 1; for (let c = 0; c < 3; c++) data[4 * j + c] = data[4 * i + c]; queue[tail++] = j;
    }
  }
  return covered;
}
function downsample(data, width, height, normalise) {
  const w = width >> 1, h = height >> 1, out = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) { let s = 0; for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) s += data[4 * ((2 * y + dy) * width + 2 * x + dx) + c]; out[4 * (y * w + x) + c] = s / 4; }
    if (normalise) { const o = 4 * (y * w + x), l = Math.hypot(out[o], out[o + 1], out[o + 2]) || 1; for (let c = 0; c < 3; c++) out[o + c] /= l; }
  }
  return { data: out, width: w, height: h };
}
const srgb = c => c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055;
// encode: 'srgb' (albedo), 'normal' (v * .5 + .5), or { scale } per channel for top data: byte = 255 * (offset + v * scale).
function bytes(data, width, height, encode) {
  const out = new Uint8ClampedArray(width * height * 4); let clipped = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = 4 * (y * width + x), o = 4 * ((height - 1 - y) * width + x);
    for (let c = 0; c < 3; c++) {
      const v = data[i + c], e = encode === 'srgb' ? srgb(Math.max(0, Math.min(1, v))) : encode === 'normal' ? v * .5 + .5 : encode.offset[c] + v * encode.scale[c];
      if (e < 0 || e > 1) clipped++;
      out[o + c] = Math.round(Math.max(0, Math.min(1, e)) * 255);
    }
    out[o + 3] = 255;
  }
  return { rgba: out, clipped };
}
const canvas = document.createElement('canvas'), context = canvas.getContext('2d', { willReadFrequently: true });
async function encodeImage({ rgba, width, height }, qualities) {
  canvas.width = width; canvas.height = height; context.putImageData(new ImageData(rgba, width, height), 0, 0);
  const png = canvas.toDataURL('image/png').split(',')[1], webp = {};
  for (const q of qualities) {
    const url = canvas.toDataURL('image/webp', q), image = new Image(); image.src = url; await image.decode();
    const c2 = document.createElement('canvas'); c2.width = width; c2.height = height; const x2 = c2.getContext('2d', { willReadFrequently: true }); x2.drawImage(image, 0, 0);
    const back = x2.getImageData(0, 0, width, height).data; let sum = 0, max = 0, sq = 0;
    for (let i = 0; i < back.length; i++) { if (i % 4 === 3) continue; const d = Math.abs(back[i] - rgba[i]); sum += d; sq += d * d; if (d > max) max = d; }
    const count = back.length * 3 / 4, mse = sq / count;
    webp[q] = { b64: url.split(',')[1], meanAbs: +(sum / count).toFixed(3), maxAbs: max, psnr: +(mse ? 10 * Math.log10(255 * 255 / mse) : Infinity).toFixed(2) };
  }
  return { png, webp };
}
function range(data, channels) {
  const lo = channels.map(() => Infinity), hi = channels.map(() => -Infinity), all = channels.map(() => []);
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > .5) channels.forEach((c, k) => { const v = data[i + c]; lo[k] = Math.min(lo[k], v); hi[k] = Math.max(hi[k], v); if ((i >> 2) % 7 === 0) all[k].push(v); });
  return channels.map((c, k) => { const s = all[k].sort((a, b) => a - b), p = q => s[Math.floor(q * (s.length - 1))]; return { min: lo[k], max: hi[k], p001: p(.001), p999: p(.999) }; });
}

async function loadBakeInput(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`); return readPack(await inflatePack(new Uint8Array(await r.arrayBuffer()))); }
const withBakeUv = g => { const out = new THREE.BufferGeometry(); out.setAttribute('position', g.attributes.position); if (g.attributes.uv) out.setAttribute('bakeUv', g.attributes.uv); out.setIndex(g.index); return out; };
// Outer planes: page rectangle (world) and the visible side. The y range runs from the block bottom to the highest
// vertex of the fixed outer faces on that plane (the full-stack top), plus one texel.
function planes(texel) {
  const faces = fixedGeometry.faces(levels.bottomY), p = faces.attributes.position.array, top = { 'z+': -Infinity, 'z-': -Infinity, 'x+': -Infinity, 'x-': -Infinity };
  for (let i = 0; i < p.length; i += 3) { const [x, y, z] = [p[i], p[i + 1], p[i + 2]]; if (z === 8) top['z+'] = Math.max(top['z+'], y); if (z === -8) top['z-'] = Math.max(top['z-'], y); if (x === 12) top['x+'] = Math.max(top['x+'], y); if (x === -12) top['x-'] = Math.max(top['x-'], y); }
  const out = {};
  for (const [name, axis, v, a0, a1] of [['z+', 'z', 8, -12, 12], ['z-', 'z', -8, -12, 12], ['x+', 'x', 12, -8, 8], ['x-', 'x', -12, -8, 8]]) {
    const y0 = levels.bottomY, y1 = top[name] + texel;
    const width = Math.ceil((a1 - a0) / texel / 4) * 4, height = Math.ceil((y1 - y0) / texel / 4) * 4, su = width * texel, sv = height * texel;
    const u = axis === 'z' ? [1 / su, 0, 0, -a0 / su] : [0, 0, 1 / su, -a0 / su], vv = [0, 1 / sv, 0, -y0 / sv];
    const corners = axis === 'z' ? [[a0, y0, v], [a0 + su, y0, v], [a0 + su, y0 + sv, v], [a0, y0 + sv, v]] : [[v, y0, a0], [v, y0, a0 + su], [v, y0 + sv, a0 + su], [v, y0 + sv, a0]];
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(corners.flat(), 3)); g.setIndex([0, 1, 2, 0, 2, 3]);
    out[name] = { width, height, plane: { u, v: vv }, rect: { axis, at: v, a0, y0, su, sv }, geometry: g, out: axis === 'z' ? [0, 0, Math.sign(v)] : [Math.sign(v), 0, 0] };
  }
  return out;
}
const QUALITIES = [.8, .9, .95, 1];
async function finish(name, map, data, width, height, encode, normalise, qualities = QUALITIES) {
  const covered = fill(data, width, height), small = downsample(data, width, height, normalise);
  const full = bytes(data, width, height, encode), half = bytes(small.data, small.width, small.height, encode);
  return { name, map, width, height, covered, clipped: full.clipped, full: await encodeImage({ ...full, width, height }, qualities), half: await encodeImage({ ...half, width: small.width, height: small.height }, qualities) };
}
const jobs = {
  // One outer plane: albedo and normal.
  async plane({ name, texel = .02 }) {
    const p = planes(texel)[name], mesh = [{ geometry: p.geometry, mode: 'outer', visible: 'plane', out: p.out }], t = performance.now();
    const albedo = render(p.width, p.height, mesh, 'albedo', { plane: p.plane }), normal = render(p.width, p.height, mesh, 'normal', { plane: p.plane }), renderMs = performance.now() - t;
    return { meta: { kind: 'plane', name, texelMetres: texel, rect: p.rect, plane: p.plane, renderMs }, pages: [await finish(name, 'albedo', albedo, p.width, p.height, 'srgb', false), await finish(name, 'normal', normal, p.width, p.height, 'normal', true)] };
  },
  // The active top page (xz), from the fixed top, the margins and every step top (site packs).
  // variationScale (M): the variation channel rendered at that outputScale (fewer fine octaves); the gradient stays at 1.
  async top({ texel = .02, gradientScale, variationScale = 1 }) {
    const assets = await loadSiteTierAssets({ base: '/site-tier/' }), meshes = [{ geometry: fixedGeometry.top(), mode: 'top', visible: 'up' }, { geometry: fixedGeometry.marginTop(), mode: 'top', visible: 'up' }];
    for (let k = 1; k <= 12; k++) { const s = await assets.step(k); meshes.push({ geometry: s.geometry(`soil:${k}:top`).geometry, mode: 'top', visible: 'up' }); }
    const width = Math.ceil(24 / texel / 4) * 4, height = Math.ceil(16 / texel / 4) * 4, su = width * texel, sv = height * texel, plane = { u: [1 / su, 0, 0, 12 / su], v: [0, 0, 1 / sv, 8 / sv] };
    const t = performance.now(), data = render(width, height, meshes, 'top', { plane, depth: true }), renderMs = performance.now() - t, stats = range(data, [0, 1, 2]);
    if (variationScale !== 1) { const v = render(width, height, meshes, 'top', { plane, depth: true, outputScale: variationScale }); for (let i = 0; i < data.length; i += 4) data[i] = v[i]; stats[0] = range(v, [0])[0]; }
    const g = gradientScale ?? Math.max(-stats[1].p001, stats[1].p999, -stats[2].p001, stats[2].p999), encode = { offset: [0, .5, .5], scale: [.5, .5 / g, .5 / g] };
    // Lossy WebP subsamples chroma, which mixes independent channels packed in RGB (22 dB measured), so each
    // channel is its own grey page (luma only).
    const pages = [];
    for (const [c, map] of [[0, 'variation'], [1, 'gradX'], [2, 'gradZ']]) {
      const grey = new Float32Array(data.length);
      for (let i = 0; i < data.length; i += 4) { grey[i] = grey[i + 1] = grey[i + 2] = data[i + c]; grey[i + 3] = data[i + 3]; }
      pages.push(await finish('top', map, grey, width, height, { offset: [0, 1, 2].map(() => encode.offset[c]), scale: [0, 1, 2].map(() => encode.scale[c]) }, false));
    }
    return { meta: { kind: 'top', texelMetres: texel, variationScale, plane, activeEra: TOP_ACTIVE_ERA, encode: { variation: 'byte/255*2', gradient: `(byte/255-.5)*${2 * g}` }, gradientMax: g, stats, renderMs }, pages };
  },
  // One atlas from its bake input: albedo and normal.
  async atlas({ name, input }) {
    const pack = await loadBakeInput(input), { width, height } = pack.meta, meshes = [...pack.geometries.values()].map(({ geometry, record }) => ({ geometry: withBakeUv(geometry), mode: record.mode, visible: record.visible, axis: record.axis }));
    const t = performance.now(), albedo = render(width, height, meshes, 'albedo'), normal = render(width, height, meshes, 'normal'), renderMs = performance.now() - t;
    return { meta: { kind: 'atlas', name, width, height, renderMs }, pages: [await finish(name, 'albedo', albedo, width, height, 'srgb', false), await finish(name, 'normal', normal, width, height, 'normal', true)] };
  },
  // Density comparison only: the step-12 floors on an xz page at the given texel size.
  async floorXz({ input, texel = .02 }) {
    const pack = await loadBakeInput(input), { geometry } = pack.geometries.get('floors'); geometry.computeBoundingBox();
    const b = geometry.boundingBox, x0 = b.min.x - 2 * texel, z0 = b.min.z - 2 * texel, width = Math.ceil((b.max.x - x0 + 2 * texel) / texel / 4) * 4, height = Math.ceil((b.max.z - z0 + 2 * texel) / texel / 4) * 4;
    const su = width * texel, sv = height * texel, plane = { u: [1 / su, 0, 0, -x0 / su], v: [0, 0, 1 / sv, -z0 / sv] }, meshes = [{ geometry: withBakeUv(geometry), mode: 'floor', visible: 'up' }];
    const albedo = render(width, height, meshes, 'albedo', { plane }), normal = render(width, height, meshes, 'normal', { plane });
    return { meta: { kind: 'floor-xz', texelMetres: texel, plane }, pages: [await finish('floor-xz', 'albedo', albedo, width, height, 'srgb', false, [.9]), await finish('floor-xz', 'normal', normal, width, height, 'normal', true, [.9])] };
  }
};
window.bake = { ready: true, gridsMs, renderer: renderer.getContext().getParameter(renderer.getContext().VERSION), async run(job) { return jobs[job.kind](job); } };
