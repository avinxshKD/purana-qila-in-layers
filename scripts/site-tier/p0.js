// Site tier P0 (GPU): ?phase=seq|async|coverage&run=<id>. Results on window.p0 (done, result | error).
// seq: one fresh program type per step, blocking render + 1 px readback, per-program compile/link timings.
// async: every type at once through renderer.compileAsync (KHR_parallel_shader_compile when exposed), with main-thread gaps.
// drivers: GPU cost split per mesh group (see drivers()).
// coverage: M1 world (createLookWorld soil 'eras') id-pass pixel coverage per surface mode at site views, and GPU time
// per mesh group by EXT_disjoint_timer_query_webgl2 when exposed.
// seq/async salt every shader source (two literals from the run id and a counter added to the output before main's
// closing brace) so neither Chrome's program cache nor the driver's bytecode cache can serve a program compiled earlier.
import * as THREE from 'three';
import { siteBoundaryGrids } from '/src/eras/site-state.js';
import { createSoilBlock } from '/src/eras/soil-block.js';
import { noiseMaterial, KEY_LIGHT_POSITION } from '/src/strata-surface.js';
import { createLookWorld, LIGHT_COLOURS, TOP_CHARACTER, FLOOR_CHARACTER, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN } from '/src/museum-scene.js';
import { sceneForYear } from '/src/film/scene-year.js';

const params = new URLSearchParams(location.search), phase = params.get('phase'), run = Math.floor(Number(params.get('run')) || 0) % 1e7;
const W = 1440, H = 900;
const trace = { programs: [], label: 'setup' };
let saltCounter = 0;
const salting = phase === 'seq' || phase === 'async';
(function telemetry() {
  const proto = WebGL2RenderingContext.prototype, programs = new WeakMap(), shaders = new WeakMap();
  const wrap = (name, fn) => { const original = proto[name]; proto[name] = function (...args) { return fn.call(this, original, args); }; };
  const timed = (record, key, original, self, args) => { const t = performance.now(), r = original.apply(self, args); if (record) record[key] += performance.now() - t; return r; };
  wrap('createProgram', function (o, a) { const p = o.apply(this, a); const r = { label: trace.label, names: [], compileCallMs: 0, compileStatusMs: 0, linkCallMs: 0, linkStatusMs: 0, otherQueriesMs: 0, firstUseMs: 0, shaders: [] }; programs.set(p, r); trace.programs.push(r); return p; });
  wrap('createShader', function (o, a) { const s = o.apply(this, a); shaders.set(s, { type: a[0], compileCallMs: 0, compileStatusMs: 0, chars: 0 }); return s; });
  wrap('shaderSource', function (o, [shader, src]) {
    const r = shaders.get(shader);
    if (salting) {
      const n = ++saltCounter, i = src.lastIndexOf('}');
      const add = r?.type === this.VERTEX_SHADER ? `gl_Position.z+=${run}e-15*gl_Position.w;gl_Position.z+=${n}e-15*gl_Position.w;` : `gl_FragColor.r+=${run}e-14;gl_FragColor.g+=${n}e-14;`;
      src = src.slice(0, i) + add + '\n' + src.slice(i);
    }
    if (r) { r.chars = src.length; r.name = /^#define SHADER_NAME (.*)$/m.exec(src)?.[1] ?? 'unnamed'; }
    return o.call(this, shader, src);
  });
  wrap('attachShader', function (o, a) { const r = programs.get(a[0]), s = shaders.get(a[1]); if (r && s) r.shaders.push(s); return o.apply(this, a); });
  wrap('compileShader', function (o, a) { return timed(shaders.get(a[0]), 'compileCallMs', o, this, a); });
  wrap('getShaderParameter', function (o, a) { return a[1] === this.COMPILE_STATUS ? timed(shaders.get(a[0]), 'compileStatusMs', o, this, a) : o.apply(this, a); });
  wrap('linkProgram', function (o, a) { return timed(programs.get(a[0]), 'linkCallMs', o, this, a); });
  wrap('getProgramParameter', function (o, a) { return timed(programs.get(a[0]), a[1] === this.LINK_STATUS ? 'linkStatusMs' : 'otherQueriesMs', o, this, a); });
  // With KHR_parallel_shader_compile the wait moves to the first call that needs the linked program.
  for (const name of ['getActiveUniform', 'getActiveAttrib', 'getUniformLocation', 'getAttribLocation', 'useProgram']) wrap(name, function (o, a) { return timed(programs.get(a[0]), 'firstUseMs', o, this, a); });
})();
const round = (v, d = 1) => +v.toFixed(d);
function summarise(r) {
  const names = [...new Set(r.shaders.map(s => s.name || '(three internal)'))];
  const shaderMs = r.shaders.reduce((s, x) => s + x.compileCallMs + x.compileStatusMs, 0);
  return { label: r.label, names, chars: r.shaders.map(s => s.chars), compileMs: round(shaderMs), linkCallMs: round(r.linkCallMs), linkStatusMs: round(r.linkStatusMs), otherQueriesMs: round(r.otherQueriesMs), firstUseMs: round(r.firstUseMs), blockingMs: round(shaderMs + r.linkCallMs + r.linkStatusMs + r.otherQueriesMs + r.firstUseMs) };
}
function device(gl) {
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    version: gl.getParameter(gl.VERSION), KHR_parallel_shader_compile: !!gl.getExtension('KHR_parallel_shader_compile'),
    EXT_disjoint_timer_query_webgl2: !!gl.getExtension('EXT_disjoint_timer_query_webgl2'), maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    compressed: ['WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb', 'EXT_texture_compression_bptc', 'EXT_texture_compression_rgtc', 'WEBGL_compressed_texture_astc', 'WEBGL_compressed_texture_etc'].filter(n => gl.getSupportedExtensions().includes(n)),
    extensions: gl.getSupportedExtensions() };
}
// Same renderer settings, lights and shadow setup as createLookWorld, so the programs carry the same defines.
function rig() {
  const canvas = document.createElement('canvas'); document.body.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
  const camera = new THREE.PerspectiveCamera(25, W / H, .1, 180); camera.position.set(-1.4 + 74 * Math.cos(.4712) * Math.sin(.6109), -3.85 + 74 * Math.sin(.4712), 74 * Math.cos(.4712) * Math.cos(.6109)); camera.lookAt(-1.4, -3.85, 0);
  const lights = () => {
    const key = new THREE.DirectionalLight(LIGHT_COLOURS.key, 2); key.position.set(...KEY_LIGHT_POSITION); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 110 }); Object.assign(key.shadow, { radius: 7, blurSamples: 16, normalBias: .08, bias: -.0004 });
    const fill = new THREE.DirectionalLight(LIGHT_COLOURS.fill, 2.4); fill.position.set(18, 5, 32);
    const rim = new THREE.DirectionalLight(0xc4c3b5, .3); rim.position.set(8, 19, -25);
    return [new THREE.HemisphereLight(LIGHT_COLOURS.sky, LIGHT_COLOURS.ground, .4), key, fill, rim];
  };
  return { renderer, camera, lights, gl: renderer.getContext() };
}
function testObjects() {
  let t = performance.now();
  const stack = siteBoundaryGrids(), gridsMs = performance.now() - t; t = performance.now();
  const block = createSoilBlock({ stack, top: { character: TOP_CHARACTER, albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN }, floor: { character: FLOOR_CHARACTER } });
  block.warm(1); const blockMs = performance.now() - t;
  const byName = Object.fromEntries(block.meshes().map(m => [m.name, m]));
  const box = (mat, { cast = false, receive = true } = {}) => { const g = new THREE.BoxGeometry(4, 4, 4); g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(.6), 3)); const m = new THREE.Mesh(g, mat); m.castShadow = cast; m.receiveShadow = receive; return m; };
  const tex = (srgb) => { const d = new Uint8Array(256 * 256 * 4); for (let i = 0; i < d.length; i += 4) { d[i] = 128 + (i >> 4) % 64; d[i + 1] = 128; d[i + 2] = 255; d[i + 3] = 255; } const x = new THREE.DataTexture(d, 256, 256); if (srgb) x.colorSpace = THREE.SRGBColorSpace; x.generateMipmaps = true; x.minFilter = THREE.LinearMipmapLinearFilter; x.needsUpdate = true; return x; };
  const soil = (name, cast = false) => { const m = byName[name]; m.removeFromParent(); m.visible = true; m.castShadow = cast; m.receiveShadow = true; return m; };
  const std = o => new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, ...o });
  const named = (name, make) => () => { const objects = make(); for (const o of objects) if (!o.material.name) o.material.name = name; return objects; };
  return { gridsMs: round(gridsMs), blockMs: round(blockMs), types: [
    ['first-program (MeshBasicMaterial, one-time init)', named('firstprogram-MeshBasicMaterial-onetime-i', () => [box(new THREE.MeshBasicMaterial({ color: 0x808080, name: 'basic' }), { receive: false })])],
    ['shadow pass, stock (VSM depth + blur)', named('shadow-pass-stock-VSM-depth-+-blur', () => [box(new THREE.MeshBasicMaterial({ color: 0x808080, name: 'basic' }), { cast: true, receive: false })])],
    ['stock standard, vertex colours', named('stock-standard-vertex-colours', () => [box(std({ vertexColors: true }))])],
    ['standard + map + normalMap', named('standard-+-map-+-normalMap', () => [box(std({ map: tex(true), normalMap: tex(false) }))])],
    ['noiseMaterial feature (ring body config)', named('noiseMaterial-feature-ring-body-config', () => [box(noiseMaterial(std({ vertexColors: true, side: THREE.DoubleSide }), { seed: 901 + 4 * 47, amplitude: .04, ring: true }))])],
    ['M1 soil top, GPU displaced', named('M1-soil-top-GPU-displaced', () => [soil('era-top')])],
    ['M1 soil top, static (step)', named('M1-soil-top-static-step', () => [soil('era-top-step-1')])],
    ['M1 soil outer, GPU displaced', named('M1-soil-outer-GPU-displaced', () => [soil('era-outer')])],
    ['M1 soil inner (walls)', named('M1-soil-inner-walls', () => [soil('era-walls-step-1')])],
    ['M1 soil floor', named('M1-soil-floor', () => [soil('era-floors-step-1')])],
    ['M1 era depth (shadow pass, displaced)', named('M1-era-depth-shadow-pass-displaced', () => { const m = soil('era-top-margins', true); m.material = new THREE.MeshBasicMaterial({ color: 0x808080, name: 'basic' }); return [m]; })],
  ] };
}
async function seq() {
  const { renderer, camera, lights, gl } = rig(), dev = device(gl), objects = testObjects(), steps = [], px = new Uint8Array(4);
  for (const [label, make] of objects.types) {
    const scene = new THREE.Scene(); scene.add(...lights(), ...make());
    trace.label = label; const before = trace.programs.length, t = performance.now();
    renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const wallMs = performance.now() - t, progs = trace.programs.slice(before).map(summarise);
    const t2 = performance.now(); renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    steps.push({ label, wallMs: round(wallMs), secondFrameMs: round(performance.now() - t2), programs: progs });
    await new Promise(r => setTimeout(r, 50));
  }
  return { device: dev, cpu: { gridsMs: objects.gridsMs, blockMs: objects.blockMs }, steps, totalWallMs: round(steps.reduce((s, x) => s + x.wallMs, 0)), programsTotal: trace.programs.length };
}
async function asyncPhase() {
  const { renderer, camera, lights, gl } = rig(), dev = device(gl), objects = testObjects(), scene = new THREE.Scene(), px = new Uint8Array(4);
  scene.add(...lights());
  objects.types.forEach(([, make], i) => { for (const o of make()) { o.position.x += (i - 5) * .01; scene.add(o); } });
  trace.label = 'compileAsync';
  const gaps = []; let running = true, last = performance.now();
  const tick = () => { const n = performance.now(); gaps.push(n - last); last = n; if (running) setTimeout(tick, 0); };
  setTimeout(tick, 0);
  const t0 = performance.now(); const p = renderer.compileAsync(scene, camera); const syncMs = performance.now() - t0;
  await p; const readyMs = performance.now() - t0;
  trace.label = 'first render after compileAsync';
  const t1 = performance.now(); renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const firstRenderMs = performance.now() - t1;
  running = false; await new Promise(r => setTimeout(r, 20));
  const sorted = [...gaps].sort((a, b) => b - a);
  return { device: dev, cpu: { gridsMs: objects.gridsMs, blockMs: objects.blockMs }, compileAsync: { syncCallMs: round(syncMs), readyMs: round(readyMs), firstRenderAfterMs: round(firstRenderMs), totalMs: round(readyMs + firstRenderMs) },
    mainThread: { ticks: gaps.length, maxGapMs: round(sorted[0] ?? 0), gapsOver50Ms: gaps.filter(g => g > 50).length, top5GapsMs: sorted.slice(0, 5).map(g => round(g)) },
    programs: trace.programs.map(summarise) };
}
// --- coverage and GPU time per group on the real M1 world ---
const VIEWS = [
  { id: 'hero-2023', year: 2023, distance: 74, note: 'default site view; 2023 = full excavation (excavation 1)' },
  { id: 'hero-kushan-199', year: 199, distance: 74, note: 'Kushan deposited, no excavation' },
  { id: 'hero-2012-unexcavated', year: 2012, distance: 74, note: 'full stack, no excavation' },
  { id: 'closest-2023', year: 2023, distance: 31, note: 'minimum orbit distance, hero direction' },
  { id: 'mobile-2023', year: 2023, distance: 104, note: 'mobile hero distance' },
];
function placeHero(camera, distance) {
  const az = 35 * Math.PI / 180, el = 27 * Math.PI / 180, t = [-1.4, -3.85, 0];
  camera.position.set(t[0] + distance * Math.cos(el) * Math.sin(az), t[1] + distance * Math.sin(el), t[2] + distance * Math.cos(el) * Math.cos(az)); camera.lookAt(...t); camera.updateMatrixWorld();
}
async function decodePng(b64) {
  const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, img.width, img.height).data;
}
const MODES = ['outer', 'inner', 'floor', 'top'], ORIENT = ['horizontal', 'facing z', 'facing x'];
function groupOf(mesh) {
  const n = mesh.name || '', g = mesh.userData.group || '';
  if (n === 'era-top' || n === 'era-top-margins') return 'soil top (fixed, displaced)';
  if (n === 'era-outer' || n === 'era-outer-margins') return 'soil outer faces (fixed, displaced)';
  if (n === 'era-ring-pedestal') return 'soil ring pedestal';
  if (/^era-top-step/.test(n)) return 'soil step top';
  if (/^era-walls-step/.test(n)) return 'soil step walls';
  if (/^era-floors-step/.test(n)) return 'soil step floors';
  if (/^era-front-step/.test(n)) return 'soil step front';
  if (/^ring-/.test(g)) return 'ring well';
  for (let o = mesh; o; o = o.parent) if (o.userData.sectionRole === 'feature' && o.parent && !o.isScene) return 'features';
  return 'plinth, scale bar, ground';
}
async function coverage() {
  const canvas = document.createElement('canvas'); document.body.append(canvas);
  const t0 = performance.now();
  const world = createLookWorld(canvas, { width: W, height: H, antialias: false, preserve: true, view: 'turntable', soil: 'eras' });
  const buildMs = performance.now() - t0, gl = world.renderer.getContext(), dev = device(gl);
  world.renderer.setPixelRatio(1);
  const views = [], images = {};
  let firstMs = null;
  for (const v of VIEWS) {
    const t = performance.now();
    world.applyState(sceneForYear(v.year)); placeHero(world.camera, v.distance);
    const { png } = world.eraIds(); if (firstMs === null) firstMs = performance.now() - t;
    placeHero(world.camera, v.distance);
    const d = await decodePng(png), counts = {}, eras = {}; let total = 0, other = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2]; total++;
      if (g === 255 && r % 20 === 0 && r <= 200) { const mode = MODES[b >> 2] ?? `mode${b >> 2}`, key = `${mode} / ${ORIENT[b & 3] ?? b & 3}`; counts[key] = (counts[key] ?? 0) + 1; if (mode === 'top' || mode === 'outer') { const ek = `${mode} era ${r / 20}`; eras[ek] = (eras[ek] ?? 0) + 1; } }
      else if (r === 0 && g === 0 && b === 255) counts['features + ring'] = (counts['features + ring'] ?? 0) + 1;
      else if (r || g || b) other++;
    }
    const frac = o => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, { pixels: n, ofFrame: round(n / total, 4) }]));
    views.push({ ...v, frame: [W, H], coverage: frac(counts), topAndOuterByEra: frac(eras), unclassifiedNonBlack: other, objectPixels: Object.values(counts).reduce((a, b) => a + b, 0) });
    images[v.id] = png;
  }
  // GPU time per group (timer query), hero 2023, DPR1 and DPR2, shadow map frozen after one full update.
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2'); let gpu = null;
  if (ext) {
    const renderer = world.renderer, scene = world.scene, camera = world.camera;
    world.applyState(sceneForYear(2023)); placeHero(camera, 74);
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);
    const meshes = []; scene.traverse(o => { if (o.isMesh || o.isLine || o.isPoints) meshes.push({ o, visible: o.visible, group: groupOf(o) }); });
    const groups = [...new Set(meshes.filter(m => m.visible).map(m => m.group))];
    const query = async fn => {
      const out = [];
      for (let i = 0; i < 7; i++) {
        const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); fn(); gl.endQuery(ext.TIME_ELAPSED_EXT);
        while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) await new Promise(r => requestAnimationFrame(r));
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT), ns = gl.getQueryParameter(q, gl.QUERY_RESULT); gl.deleteQuery(q);
        if (!disjoint && i >= 2) out.push(ns / 1e6);
      }
      out.sort((a, b) => a - b); return { medianMs: round(out[out.length >> 1] ?? NaN, 3), minMs: round(out[0] ?? NaN, 3), samples: out.length };
    };
    const only = name => { for (const m of meshes) m.o.visible = m.visible && (name === 'all' || m.group === name); };
    gpu = {};
    for (const dpr of [1, 2]) {
      renderer.setSize(W * dpr, H * dpr, false); const res = {};
      only('all'); renderer.render(scene, camera);
      res['all (beauty only)'] = await query(() => renderer.render(scene, camera));
      res['all + shadow map update'] = await query(() => { renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); });
      only('none'); res['background only'] = await query(() => renderer.render(scene, camera));
      for (const g of groups) { only(g); renderer.render(scene, camera); res[`${g} alone`] = await query(() => renderer.render(scene, camera)); }
      only('all'); gpu[`dpr${dpr} ${W * dpr}x${H * dpr}`] = res;
    }
    for (const m of meshes) m.o.visible = m.visible;
    renderer.setSize(W, H, false);
    gpu.note = 'TIME_ELAPSED over renderer.render (clear, background, draws; shadow pass only where stated), median of 5 after 2 warm-up queries. "alone" = that group with every other mesh hidden, so no occlusion by other groups.';
  }
  return { device: dev, buildWorldMs: round(buildMs), firstIdPassMs: round(firstMs), programs: world.renderer.info.programs.length, views, gpu, images };
}
// drivers: what makes each mesh group cost GPU time at hero 2023 (MSAA canvas as on the site). Per group and DPR:
// original materials alone; the same geometry with a flat unlit material (vertex, raster and ROP cost with trivial
// fragments; GPU displacement kept); a stock MeshStandardMaterial with map + normalMap (stand-in for the P2 site
// material); marginal cost in the full frame (all minus all-but-group). Fragment counts by additive float target:
// alone, in the full frame in three's own draw order (others write depth only), and finally visible pixels (depth
// pre-pass, then the group with depthFunc EQUAL).
async function drivers() {
  const canvas = document.createElement('canvas'); document.body.append(canvas);
  // ?aa=0 builds a canvas without MSAA; ?quick=1 times only whole frames and each group's original materials alone.
  const aa = params.get('aa') !== '0', quick = params.get('quick') === '1';
  const world = createLookWorld(canvas, { width: W, height: H, antialias: aa, preserve: true, view: 'turntable', soil: 'eras' });
  const { renderer, scene, camera } = world, gl = renderer.getContext(), dev = device(gl), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  if (!ext) throw new Error('no timer query');
  world.applyState(sceneForYear(2023)); placeHero(camera, 74);
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);
  const others = []; scene.traverse(o => { if ((o.isLine || o.isPoints || o.isSprite) && o.visible) others.push(o); });
  const live = []; scene.traverse(o => { if (o.isMesh && o.visible) live.push({ o, material: o.material, group: groupOf(o) }); });
  for (const o of others) o.visible = false;
  const groups = [...new Set(live.map(m => m.group))];
  const depthMat = live.find(m => m.o.customDepthMaterial)?.o.customDepthMaterial;
  const displaced = m => /"displaced":true/.test(m.material.customProgramCacheKey?.() ?? '');
  const tex = (srgb) => { const d = new Uint8Array(256 * 256 * 4); for (let i = 0; i < d.length; i += 4) { d[i] = 128 + (i >> 4) % 64; d[i + 1] = 128; d[i + 2] = 255; d[i + 3] = 255; } const x = new THREE.DataTexture(d, 256, 256); if (srgb) x.colorSpace = THREE.SRGBColorSpace; x.generateMipmaps = true; x.minFilter = THREE.LinearMipmapLinearFilter; x.needsUpdate = true; return x; };
  const map = tex(true), normalMap = tex(false), cache = new Map();
  function variant(m, kind) {
    const key = `${m.material.uuid}|${kind}`; let v = cache.get(key); if (v) return v;
    const side = m.material.side;
    if (kind === 'std') v = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, map, normalMap, side });
    else if (kind === 'flat') v = new THREE.MeshBasicMaterial({ color: 0x808080, side });
    else if (kind === 'depth') v = new THREE.MeshBasicMaterial({ colorWrite: false, side });
    else if (kind === 'count' || kind === 'countEqual') v = new THREE.MeshBasicMaterial({ color: 0xff0000, side, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
      ...(kind === 'countEqual' ? { depthFunc: THREE.EqualDepth, depthWrite: false } : {}) });
    if (displaced(m)) { v.onBeforeCompile = (s, r) => depthMat.onBeforeCompile(s, r); v.customProgramCacheKey = () => `p0-displaced-${kind}`; }
    cache.set(key, v); return v;
  }
  // plan(m) -> null (hidden), 'orig', or a variant kind
  const assign = plan => { for (const m of live) { const k = plan(m); m.o.visible = k !== null; m.o.material = k === null || k === 'orig' ? m.material : variant(m, k); } };
  const restore = () => { for (const m of live) { m.o.visible = true; m.o.material = m.material; } };
  const time = async (plan, { shadow = false } = {}) => {
    assign(plan); renderer.setRenderTarget(null); renderer.render(scene, camera);
    const out = [];
    for (let i = 0; i < 7; i++) {
      const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q);
      if (shadow) renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera); gl.endQuery(ext.TIME_ELAPSED_EXT);
      while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) await new Promise(r => requestAnimationFrame(r));
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT), ns = gl.getQueryParameter(q, gl.QUERY_RESULT); gl.deleteQuery(q);
      if (!disjoint && i >= 2) out.push(ns / 1e6);
    }
    out.sort((a, b) => a - b); return round(out[out.length >> 1] ?? NaN, 3);
  };
  const background = scene.background;
  async function count(dpr, passes) {
    const w = W * dpr, h = H * dpr, rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, depthBuffer: true }), buf = new Float32Array(w * h * 4);
    scene.background = null; renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
    renderer.autoClear = false;
    for (const plan of passes) { assign(plan); renderer.render(scene, camera); }
    renderer.autoClear = true; renderer.readRenderTargetPixels(rt, 0, 0, w, h, buf); renderer.setRenderTarget(null); rt.dispose(); scene.background = background;
    let frags = 0, pixels = 0; for (let i = 0; i < buf.length; i += 4) { frags += buf[i]; if (buf[i] > 0) pixels++; }
    return { fragments: Math.round(frags), pixels };
  }
  const geometry = {};
  for (const g of groups) {
    const ms = live.filter(m => m.group === g);
    geometry[g] = { draws: ms.length, triangles: ms.reduce((s, m) => s + (m.o.geometry.index ? m.o.geometry.index.count : m.o.geometry.attributes.position.count) / 3, 0), vertices: ms.reduce((s, m) => s + m.o.geometry.attributes.position.count, 0),
      displaced: ms.some(displaced), materials: [...new Set(ms.map(m => m.material.customProgramCacheKey?.().slice(0, 40) || m.material.type))] };
  }
  const res = { geometry, frames: {}, groups: {} };
  for (const dpr of [1, 2]) {
    renderer.setSize(W * dpr, H * dpr, false);
    const key = `dpr${dpr}`, f = res.frames[key] = {};
    f.allOriginal = await time(() => 'orig');
    f.allOriginalWithShadowUpdate = await time(() => 'orig', { shadow: true });
    if (quick) { const gr = res.groups[key] = {}; for (const g of groups) gr[g] = { originalAlone: await time(m => m.group === g ? 'orig' : null) }; f.allOriginalAgain = await time(() => 'orig'); continue; }
    f.allFlat = await time(() => 'flat');
    f.allStandardMapNormal = await time(() => 'std');
    f.depthOnly = await time(() => 'depth');
    f.fragments = await count(dpr, [() => 'count']);
    f.visiblePixels = (await count(dpr, [() => 'depth', () => 'countEqual'])).pixels;
    const gr = res.groups[key] = {};
    for (const g of groups) {
      const mine = m => m.group === g;
      const r = gr[g] = {};
      r.originalAlone = await time(m => mine(m) ? 'orig' : null);
      r.flatAlone = await time(m => mine(m) ? 'flat' : null);
      r.standardMapNormalAlone = await time(m => mine(m) ? 'std' : null);
      r.marginalInFrame = round(f.allOriginal - await time(m => mine(m) ? null : 'orig'), 3);
      const alone = await count(dpr, [m => mine(m) ? 'count' : null]);
      r.fragmentsAlone = alone.fragments; r.pixelsAlone = alone.pixels;
      r.fragmentsInFrame = (await count(dpr, [m => mine(m) ? 'count' : 'depth'])).fragments;
      r.visiblePixels = (await count(dpr, [m => 'depth', m => mine(m) ? 'countEqual' : null])).pixels;
      r.overdrawAlone = round(r.fragmentsAlone / Math.max(1, r.pixelsAlone), 2);
      r.nsPerFragmentAloneOriginalMinusFlat = round((r.originalAlone - r.flatAlone) * 1e6 / Math.max(1, r.fragmentsAlone), 2);
    }
  }
  restore(); for (const o of others) o.visible = true; renderer.setSize(W, H, false);
  res.note = 'MSAA canvas (antialias true, as the site). GPU TIME_ELAPSED medians of 5 after 2 warm-ups; shadow map frozen except where stated. Fragment counts are single-sample (float target without MSAA), depth test on; overdraw = fragments / covered pixels.';
  return { device: dev, antialias: aa, samples: gl.getParameter(gl.SAMPLES), quick, programs: renderer.info.programs.length, ...res };
}// warm: compile the hero-2023 world's programs into the persistent drivers profile, so the drivers turn stays short.
async function warm() {
  const canvas = document.createElement('canvas'); document.body.append(canvas);
  const t0 = performance.now(), world = createLookWorld(canvas, { width: W, height: H, antialias: true, preserve: true, view: 'turntable', soil: 'eras' }), buildMs = performance.now() - t0;
  world.applyState(sceneForYear(2023)); placeHero(world.camera, 74);
  const t1 = performance.now(); world.renderer.render(world.scene, world.camera); const px = new Uint8Array(4), gl = world.renderer.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return { buildWorldMs: round(buildMs), firstRenderMs: round(performance.now() - t1), programs: world.renderer.info.programs.length };
}
// split: one session, interleaved, DPR1 hero 2023, to separate clock drift from real effects: the same scene timed on
// the MSAA canvas, a single-sample render target and a 4-sample render target, and the step walls/floors timed dense
// and simplified at runtime (meshopt, 1 mm absolute error, locked borders: same pixels, fewer triangles).
async function split() {
  const { MeshoptSimplifier } = await import('three/examples/jsm/libs/meshopt_simplifier.module.js'); await MeshoptSimplifier.ready;
  const canvas = document.createElement('canvas'); document.body.append(canvas);
  const world = createLookWorld(canvas, { width: W, height: H, antialias: true, preserve: true, view: 'turntable', soil: 'eras' });
  const { renderer, scene, camera } = world, gl = renderer.getContext(), dev = device(gl), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  world.applyState(sceneForYear(2023)); placeHero(camera, 74);
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);
  const live = []; scene.traverse(o => { if (o.isMesh && o.visible) live.push({ o, group: groupOf(o) }); });
  const simplify = mesh => {
    const g0 = mesh.geometry, pos = Float32Array.from(g0.attributes.position.array), idx = Uint32Array.from(g0.index.array);
    const [ix, error] = MeshoptSimplifier.simplify(idx, pos, 3, 0, .001, ['LockBorder', 'ErrorAbsolute']);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(ix, 1)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mesh.material); m.castShadow = mesh.castShadow; m.receiveShadow = mesh.receiveShadow; m.visible = false; scene.add(m);
    return { mesh: m, dense: idx.length / 3, triangles: ix.length / 3, errorMm: round(error * 1000, 3) };
  };
  const pick = g => live.find(m => m.group === g).o;
  const simple = { walls: simplify(pick('soil step walls')), floors: simplify(pick('soil step floors')) };
  const extras = [simple.walls.mesh, simple.floors.mesh];
  const configs = {
    'all': m => true,
    'all, walls + floors simplified': m => m.group !== 'soil step walls' && m.group !== 'soil step floors',
    'soil outer faces alone': m => m.group === 'soil outer faces (fixed, displaced)',
    'soil top alone': m => m.group === 'soil top (fixed, displaced)',
    'step walls alone (dense)': m => m.group === 'soil step walls',
    'step walls alone (simplified)': m => false,
    'step floors alone (dense)': m => m.group === 'soil step floors',
    'step floors alone (simplified)': m => false,
    'step front alone': m => m.group === 'soil step front',
  };
  const extraOn = { 'all, walls + floors simplified': extras, 'step walls alone (simplified)': [simple.walls.mesh], 'step floors alone (simplified)': [simple.floors.mesh] };
  const targets = { 'canvas (MSAA)': null, 'target, 1 sample': new THREE.WebGLRenderTarget(W, H, { samples: 0 }), 'target, 4 samples': new THREE.WebGLRenderTarget(W, H, { samples: 4 }) };
  const timeOnce = async (target, n = 5) => {
    renderer.setRenderTarget(target); renderer.render(scene, camera);
    const out = [];
    for (let i = 0; i < n + 1; i++) {
      const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); renderer.setRenderTarget(target); renderer.render(scene, camera); gl.endQuery(ext.TIME_ELAPSED_EXT);
      while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) await new Promise(r => requestAnimationFrame(r));
      const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT), ns = gl.getQueryParameter(q, gl.QUERY_RESULT); gl.deleteQuery(q);
      if (!disjoint && i >= 1) out.push(ns / 1e6);
    }
    renderer.setRenderTarget(null); out.sort((a, b) => a - b); return out[out.length >> 1];
  };
  const samples = {};
  for (let rep = 0; rep < 3; rep++) for (const [c, vis] of Object.entries(configs)) {
    for (const m of live) m.o.visible = vis(m); for (const e of extras) e.visible = (extraOn[c] ?? []).includes(e);
    for (const [t, target] of Object.entries(targets)) (samples[`${c} | ${t}`] ??= []).push(await timeOnce(target));
  }
  for (const m of live) m.o.visible = true; for (const e of extras) e.visible = false;
  const table = {};
  for (const [k, v] of Object.entries(samples)) { const [c, t] = k.split(' | '); (table[c] ??= {})[t] = { medianMs: round([...v].sort((a, b) => a - b)[1], 2), perRepMs: v.map(x => round(x, 2)) }; }
  return { device: dev, samples: gl.getParameter(gl.SAMPLES), simplified: Object.fromEntries(Object.entries(simple).map(([k, s]) => [k, { dense: s.dense, triangles: s.triangles, errorMm: s.errorMm }])), table,
    note: 'GPU TIME_ELAPSED; per rep the median of 5 after 1 warm-up; medianMs is the median of 3 interleaved reps. Shadow map frozen. Render targets skip tone mapping and the sRGB canvas output, otherwise identical draws.' };
}const run_ = { seq, async: asyncPhase, coverage, drivers, warm, split }[phase];
window.p0 = { done: false };
(run_ ? run_() : Promise.reject(new Error('unknown phase ' + phase))).then(result => { window.p0 = { done: true, result: { phase, run, salted: salting, ...result } }; },
  error => { window.p0 = { done: true, error: String(error?.stack ?? error) }; });
