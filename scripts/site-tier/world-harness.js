// Site tier world harness: builds src/site-tier/world.js behind the site's provider boundary (src/site/backend.js),
// as createSiteScene would through its worldFactory, and measures what the cold load pays for: world build, shader
// compile (compileAsync, as scene.js) and first frame, the program inventory, and the serial compile and link cost of
// each program in a second WebGL context. Driven by world-harness.cjs.
import * as THREE from 'three';
import { createSiteTierWorld, createSiteTierRenderer } from '../../src/site-tier/world.js';
import { stepOf } from '../../src/eras/site-driver.js';
import { createSiteBackend } from '../../src/site/backend.js';
import { sceneForYear } from '../../src/film/scene-year.js';
import { readPack, inflatePack } from '../../src/site-tier/pack.js';

const q = new URLSearchParams(location.search), W = Number(q.get('w') ?? 1440), H = Number(q.get('h') ?? 900);
const now = () => performance.now();

function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); }

// GPU memory as the page asks for it: every buffer, texture and renderbuffer allocation through the WebGL2 API, by
// object, minus deletions (driver padding, mip tails it adds itself and the default framebuffer are not seen here).
const glMem = (() => {
  const P = WebGL2RenderingContext.prototype, sizes = new Map(), kind = new Map(), owner = new Map(), state = new WeakMap();
  const S = { 0x8058: 4, 0x8C43: 4, 0x8051: 4, 0x8C41: 4, 0x822F: 4, 0x822D: 2, 0x881A: 8, 0x881B: 8, 0x822E: 4, 0x8230: 8, 0x8814: 16, 0x8815: 16, 0x8229: 1, 0x822B: 2,
    0x81A5: 2, 0x81A6: 4, 0x8CAC: 4, 0x88F0: 4, 0x8CAD: 8, 0x8D48: 1, 0x8232: 1, 0x8234: 2, 0x8236: 4, 0x823C: 4 };
  const unsized = (format, type) => ({ 0x1908: 4, 0x1907: 4, 0x1902: 4, 0x84F9: 4, 0x1903: 1, 0x8227: 2 })[format] * ({ 0x1401: 1, 0x140B: 2, 0x8D61: 2, 0x1406: 4, 0x1405: 1, 0x84FA: 1, 0x1403: 1 })[type] || 4;
  const bpp = (internal, format, type) => S[internal] ?? unsized(internal, type);
  let unknown = 0;
  const st = gl => { let s = state.get(gl); if (!s) state.set(gl, s = { unit: 0x84C0, tex: new Map(), buf: new Map(), rb: null, vao: null, vaoElement: new Map() }); return s; };
  let gl_ = null;
  const set = (obj, k, bytes) => { if (!obj) return; sizes.set(obj, bytes); kind.set(obj, k); owner.set(obj, gl_); };
  const add = (obj, k, bytes) => { if (!obj) return; sizes.set(obj, (sizes.get(obj) ?? 0) + bytes); kind.set(obj, k); owner.set(obj, gl_); };
  const wrap = (name, f) => { const orig = P[name]; P[name] = function (...a) { gl_ = this; f.call(this, a); return orig.apply(this, a); }; };
  const targetOf = t => t >= 0x8515 && t <= 0x851A ? 0x8513 : t;
  const texFor = (gl, t) => st(gl).tex.get(st(gl).unit + ':' + targetOf(t));
  wrap('activeTexture', function ([u]) { st(this).unit = u; });
  wrap('bindTexture', function ([t, tex]) { st(this).tex.set(st(this).unit + ':' + t, tex); });
  wrap('bindBuffer', function ([t, b]) { const s = st(this); if (t === 0x8893) s.vaoElement.set(s.vao, b); else s.buf.set(t, b); });
  wrap('bindVertexArray', function ([v]) { st(this).vao = v; });
  wrap('bindRenderbuffer', function ([t, rb]) { st(this).rb = rb; });
  const bufferOf = (gl, t) => t === 0x8893 ? st(gl).vaoElement.get(st(gl).vao) : st(gl).buf.get(t);
  wrap('bufferData', function ([t, d]) { set(bufferOf(this, t), 'buffer', typeof d === 'number' ? d : d?.byteLength ?? 0); });
  wrap('texStorage2D', function ([t, levels, internal, w, h]) { let b = 0; for (let l = 0; l < levels; l++) b += Math.max(1, w >> l) * Math.max(1, h >> l) * (S[internal] ?? (unknown++, 4)); set(texFor(this, t), 'texture', b * (t === 0x8513 ? 6 : 1)); });
  wrap('texStorage3D', function ([t, levels, internal, w, h, d]) { let b = 0; for (let l = 0; l < levels; l++) b += Math.max(1, w >> l) * Math.max(1, h >> l) * d * (S[internal] ?? (unknown++, 4)); set(texFor(this, t), 'texture', b); });
  wrap('texImage2D', function (a) {
    const [t, level, internal] = a; let w, h, format, type;
    if (a.length >= 8) [, , , w, h, , format, type] = a; else { [, , , format, type] = a; const src = a[5]; w = src?.width ?? src?.videoWidth ?? 0; h = src?.height ?? src?.videoHeight ?? 0; }
    const tex = texFor(this, t), b = w * h * bpp(internal, format, type);
    if (level === 0 && (t === 0x0DE1 || t === 0x8515)) set(tex, 'texture', t === 0x8515 ? b * 6 : b); else add(tex, 'texture', t >= 0x8516 && t <= 0x851A ? 0 : b);
  });
  wrap('texImage3D', function (a) { const [t, level, internal, w, h, d, , format, type] = a; const tex = texFor(this, t), b = w * h * d * bpp(internal, format, type); if (level === 0) set(tex, 'texture', b); else add(tex, 'texture', b); });
  wrap('generateMipmap', function ([t]) { const tex = texFor(this, t); if (tex && sizes.has(tex)) sizes.set(tex, sizes.get(tex) * 4 / 3); });
  wrap('renderbufferStorage', function ([, internal, w, h]) { set(st(this).rb, 'renderbuffer', w * h * (S[internal] ?? (unknown++, 4))); });
  wrap('renderbufferStorageMultisample', function ([, samples, internal, w, h]) { set(st(this).rb, 'renderbuffer', w * h * Math.max(1, samples) * (S[internal] ?? (unknown++, 4))); });
  for (const name of ['deleteBuffer', 'deleteTexture', 'deleteRenderbuffer']) wrap(name, function ([o]) { sizes.delete(o); kind.delete(o); owner.delete(o); });
  // context: only that context's objects (a lost context's objects are never deleted one by one).
  return context => {
    const out = { buffer: 0, texture: 0, renderbuffer: 0, objects: 0, unknownFormats: unknown };
    for (const [o, b] of sizes) { if (context && owner.get(o) !== context) continue; out[kind.get(o)] += b; out.objects++; }
    out.total = out.buffer + out.texture + out.renderbuffer; return out;
  };
})();
let world, backend, renderer, scene, camera, gl, debugShaders, worldMs, phases, canvas = null;
// One world at a time; the first comes from the query (programs, background) so a cold run measures only it.
// options.width / height: drawing-buffer size (default the page's w, h); options.antialias false: a renderer without MSAA.
async function open(options) {
  if (world) { backend.dispose(); const r = world.renderer; world.dispose(); r.forceContextLoss(); canvas.remove(); }
  const width = options.width ?? W, height = options.height ?? H;
  canvas = options.renderer?.domElement ?? document.createElement('canvas');
  canvas.width = width; canvas.height = height; canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  document.body.append(canvas);
  const t0 = now(); phases = [];
  world = await createSiteTierWorld(canvas, { width, height, preserve: true, prefetch: false, onProgress: p => phases.push({ ...p, atMs: now() - t0 }), ...options });
  worldMs = now() - t0;
  backend = createSiteBackend(world);
  ({ renderer, scene, camera } = world); gl = renderer.getContext();
  renderer.shadowMap.autoUpdate = false;
  debugShaders = gl.getExtension('WEBGL_debug_shaders');
}
// inject=1: the renderer is made first (createSiteTierRenderer) and passed in, as the site does while its poster shows.
const injectStart = now();
const injectedRenderer = q.get('inject') ? await (async () => { const c = document.createElement('canvas'); const r = createSiteTierRenderer(c, { background: q.get('background') ?? 'css', preserve: true }); return r; })() : null;
const injectMs = now() - injectStart;
// prefetch=1: background prefetch as the site; uploads=off: no idle upload warm (for comparison).
await open({ programs: q.get('programs') ?? 'merged', background: q.get('background') ?? 'css', renderer: injectedRenderer, prefetch: q.get('prefetch') === '1', warmUploads: q.get('uploads') !== 'off' });
const pixel = new Uint8Array(4), memBaselines = new Map();
let openAntialias = true, openPhone = false, shadowChanged = false;
const finish = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
function render() { renderer.info.reset(); renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); }
// One frame: wall time (render + readPixels), CPU time of the render call, GPU TIME_ELAPSED (null without the extension).
async function timedFrame() {
  const tq = gl.getExtension('EXT_disjoint_timer_query_webgl2'), query = tq ? gl.createQuery() : null;
  if (query) gl.beginQuery(tq.TIME_ELAPSED_EXT, query);
  const t = now(); render(); const cpu = now() - t;
  if (query) gl.endQuery(tq.TIME_ELAPSED_EXT);
  finish(); const wall = now() - t;
  let gpu = null;
  if (query) { for (let i = 0; i < 200 && !gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE); i++) await new Promise(r => setTimeout(r, 5)); gpu = gl.getParameter(tq.GPU_DISJOINT_EXT) ? 'disjoint' : +(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6).toFixed(2); gl.deleteQuery(query); }
  return { wallMs: +wall.toFixed(1), cpuMs: +cpu.toFixed(1), gpuMs: gpu };
}
// FNV-1a over the drawing buffer's 32-bit words (pixel identity between runs).
function frameHash() {
  const w = canvas.width, h = canvas.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const words = new Uint32Array(px.buffer); let x = 0x811c9dc5;
  for (let i = 0; i < words.length; i++) { x ^= words[i]; x = Math.imul(x, 0x01000193); }
  return (x >>> 0).toString(16).padStart(8, '0');
}

// Which scene objects use each program (shadow and blur programs have no scene user).
function programUsers() {
  const users = new Map();
  scene.traverse(o => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      const p = renderer.properties.get(m).currentProgram;
      if (!p) continue;
      if (!users.has(p)) users.set(p, new Set());
      users.get(p).add(o.name || o.parent?.name || m.type);
    }
  });
  return users;
}
function programs() {
  const users = programUsers();
  return renderer.info.programs.map(p => {
    const vs = gl.getShaderSource(p.vertexShader), fs = gl.getShaderSource(p.fragmentShader);
    const u = [...(users.get(p) ?? [])];
    return { id: p.id, name: p.name, type: p.type, cacheKey: fnv(p.cacheKey), usedTimes: p.usedTimes, users: u.length, userSample: u.slice(0, 4),
      vsChars: vs.length, fsChars: fs.length,
      vsTranslatedChars: debugShaders?.getTranslatedShaderSource(p.vertexShader)?.length ?? null,
      fsTranslatedChars: debugShaders?.getTranslatedShaderSource(p.fragmentShader)?.length ?? null };
  });
}
const sources = () => renderer.info.programs.map(p => ({ id: p.id, name: p.name, vs: gl.getShaderSource(p.vertexShader), fs: gl.getShaderSource(p.fragmentShader) }));

// Serial compile + link in a second context. A nonce define after #version makes each source new to the browser's
// and ANGLE's program caches; calibrate() checks that it does.
const c2 = document.createElement('canvas'), g2 = c2.getContext('webgl2');
const nonced = (src, nonce) => nonce == null ? src : src.replace(/^(#version[^\n]*\n)/, `$1#define STRATA_NONCE_${nonce} 1\n`);
function timeProgram(vs, fs, nonce) {
  const a = now(), v = g2.createShader(g2.VERTEX_SHADER); g2.shaderSource(v, nonced(vs, nonce)); g2.compileShader(v);
  const vOk = g2.getShaderParameter(v, g2.COMPILE_STATUS), b = now();
  const f = g2.createShader(g2.FRAGMENT_SHADER); g2.shaderSource(f, nonced(fs, nonce)); g2.compileShader(f);
  const fOk = g2.getShaderParameter(f, g2.COMPILE_STATUS), c = now();
  const p = g2.createProgram(); g2.attachShader(p, v); g2.attachShader(p, f); g2.linkProgram(p);
  const ok = g2.getProgramParameter(p, g2.LINK_STATUS), d = now();
  const log = ok ? '' : `${g2.getShaderInfoLog(v)}${g2.getShaderInfoLog(f)}${g2.getProgramInfoLog(p)}`.slice(0, 400);
  g2.deleteProgram(p); g2.deleteShader(v); g2.deleteShader(f);
  return { vertexMs: +(b - a).toFixed(2), fragmentMs: +(c - b).toFixed(2), linkMs: +(d - c).toFixed(2), totalMs: +(d - a).toFixed(2), ok: ok && vOk && fOk, log };
}
let nonceCounter = Math.floor(Math.random() * 1e9);

// The frame as the page shows it: the backdrop raster under the (possibly transparent) WebGL canvas.
function composite() {
  const W = canvas.width, H = canvas.height, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true });
  if (world.device().background === 'css') x.drawImage(world.backdrop.canvas(W, H), 0, 0);
  x.drawImage(canvas, 0, 0);
  return c;
}
const memFrames = new Map();
function scaled(c, w, h) {
  if (c.width === w && c.height === h) return c;
  const u = document.createElement('canvas'); u.width = w; u.height = h;
  const x = u.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'low'; x.drawImage(c, 0, 0, w, h);
  return u;
}
async function canvasPng(c) { const b = await c.convertToBlob({ type: 'image/png' }), r = new FileReader(); return new Promise(res => { r.onload = () => res(String(r.result).split(',')[1]); r.readAsDataURL(b); }); }

const run = {
  // Cold path as scene.js: compileAsync over the scene, then the first frame (shadow programs link there).
  async cold() {
    const state = sceneForYear(2023);
    let t = now(); await backend.ensureState(state); backend.applyState(state); const applyMs = now() - t;
    t = now(); await renderer.compileAsync(scene, camera); const compileAsyncMs = now() - t, afterCompile = renderer.info.programs.length;
    t = now(); render(); finish(); const firstFrameMs = now() - t;
    t = now(); render(); finish(); const secondFrameMs = now() - t;
    return { injected: !!injectedRenderer, injectMs, worldMs, phases, device: world.device(), metadata: world.metadata(), applyMs, compileAsyncMs, programsAfterCompileAsync: afterCompile, firstFrameMs, secondFrameMs,
      parallel: renderer.extensions.has('KHR_parallel_shader_compile'), info: world.info(), programs: programs() };
  },
  // Every cut step (excavation k/12 at full deposits) and the era states the scrubber reaches, each rendered once.
  async states({ only = null } = {}) {
    const out = [], drawn = new Set(), layouts = new Set();
    // Meshes drawn for the first time, and vertex layouts (attribute names, types, item sizes) not drawn before.
    const firstDraws = () => {
      const meshes = [], newLayouts = [];
      scene.traverse(o => {
        if (!o.isMesh) return;
        for (let n = o; n; n = n.parent) if (!n.visible) return;
        const g = o.geometry, count = g.index ? Math.min(g.index.count, g.drawRange.count) : Math.min(g.attributes.position.count, g.drawRange.count);
        if (!count || drawn.has(o)) return;
        drawn.add(o);
        const layout = Object.entries(g.attributes).map(([k, a]) => `${k}:${(a.isInterleavedBufferAttribute ? a.data.array : a.array).constructor.name}x${a.itemSize}${a.normalized ? 'n' : ''}`).sort().join(',') + (g.index ? `|${g.index.array.constructor.name}` : '') + `|${o.material.type}${o.material.side}`;
        if (!layouts.has(layout)) { layouts.add(layout); newLayouts.push({ mesh: o.name || o.parent?.name, layout }); }
        meshes.push(o.name || o.parent?.name || o.uuid);
      });
      return { firstDrawn: meshes.length, sample: meshes.slice(0, 6), newLayouts };
    };
    const states = [...Array.from({ length: 13 }, (_, k) => ({ label: `cut-${k}`, state: { ...sceneForYear(2023), excavation: k / 12 } })),
      ...[2012, 1700, 1300, 900, 600, 400, 199, -100, -250, -400, -539].map(y => ({ label: `year-${y}`, state: sceneForYear(y) }))];
    for (const { label, state } of only ? states.filter(s => only.includes(s.label)) : states) {
      const before = renderer.info.programs.length;
      let t = now(); const wasResident = world.isResident(state); await backend.ensureState(state); const ensureMs = now() - t;
      t = now(); backend.applyState(state); const applyMs = now() - t;
      const draws = firstDraws();
      const mem0 = { ...renderer.info.memory };
      t = now(); render(); const renderCpuMs = now() - t; finish(); const frameMs = now() - t;
      const mem1 = { ...renderer.info.memory };
      t = now(); render(); finish(); const secondMs = now() - t;
      out.push({ label, wasResident, ensureMs: +ensureMs.toFixed(1), applyMs: +applyMs.toFixed(1), frameMs: +frameMs.toFixed(1), renderCpuMs: +renderCpuMs.toFixed(1), secondMs: +secondMs.toFixed(1),
        ...draws, newGeometries: mem1.geometries - mem0.geometries, newTextures: mem1.textures - mem0.textures,
        newPrograms: renderer.info.programs.length - before, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
    }
    return { states: out, programsTotal: renderer.info.programs.length, programs: programs(), metadata: world.metadata() };
  },
  // Serial per-program cost. calibrate: the largest program with a fresh nonce, the same nonce again, another fresh
  // nonce, and its original (already compiled) source.
  async serial({ repeats = 1 } = {}) {
    const list = sources(), rows = [];
    for (const s of list) {
      const times = [];
      for (let r = 0; r < repeats; r++) times.push(timeProgram(s.vs, s.fs, nonceCounter++));
      rows.push({ id: s.id, name: s.name, runs: times });
    }
    const largest = list.reduce((a, b) => a.fs.length + a.vs.length >= b.fs.length + b.vs.length ? a : b), n = nonceCounter++;
    const calibrate = { id: largest.id, fresh: timeProgram(largest.vs, largest.fs, n), sameNonce: timeProgram(largest.vs, largest.fs, n),
      freshAgain: timeProgram(largest.vs, largest.fs, nonceCounter++), original: timeProgram(largest.vs, largest.fs, null) };
    return { rows, calibrate };
  },
  async frame({ year = 2023 } = {}) {
    const state = sceneForYear(year);
    await backend.ensureState(state); backend.applyState(state); render(); finish();
    return { png: composite().toDataURL('image/png').split(',')[1] };
  },
  // Pixel diff between worlds at the same states: each variant is opened in turn (programs, background) and its
  // frames composited over the backdrop exactly as the page would (premultiplied canvas over the backdrop raster).
  async diff({ years = [2023, 2013, 600, 199, -250], variants = q.get('diff') ? q.get('diff').split(',').map(v => { const [programs, background] = v.split('-'); return { programs, background }; }) : [{ programs: 'split', background: 'texture' }, { programs: 'merged', background: 'texture' }, { programs: 'merged', background: 'css' }] } = {}) {
    const baseline = [], out = { years, variants, pairs: [], programs: [] };
    for (let a = 0; a < variants.length; a++) {
      await open(variants[a]);
      for (const [i, year] of years.entries()) {
        const state = sceneForYear(year); await backend.ensureState(state); backend.applyState(state); render(); finish();
        const y = composite().getContext('2d').getImageData(0, 0, W, H).data;
        if (a === 0) { baseline.push(y); continue; }
        compare(baseline[i], y, year, variants[a]);
      }
      out.programs.push(renderer.info.programs.length);
    }
    function compare(x, y, year, against) {
      const img = new ImageData(W, H);
      let differing = 0, max = 0, sum = 0; const at = [];
      for (let p = 0; p < x.length; p += 4) {
        const d = Math.max(Math.abs(x[p] - y[p]), Math.abs(x[p + 1] - y[p + 1]), Math.abs(x[p + 2] - y[p + 2]));
        if (d) { differing++; if (d > 1 && at.length < 40) at.push([(p / 4) % W, Math.floor(p / 4 / W), d]); } if (d > max) max = d; sum += d;
        img.data[p] = img.data[p + 1] = img.data[p + 2] = Math.min(255, d * 32); img.data[p + 3] = 255;
      }
      const c = new OffscreenCanvas(W, H); c.getContext('2d').putImageData(img, 0, 0);
      out.pairs.push({ year, against, differingPixels: differing, over1: at, maxChannelDiff: max, meanChannelDiff: sum / (W * H), diffImage: max ? canvasPng(c) : null });
    }
    for (const p of out.pairs) if (p.diffImage) p.diffImage = await p.diffImage;
    return out;
  },
  // First-frame hitch experiments: each step renders one frame and reports wall time (render + readPixels), the
  // CPU time of the render call and the GPU time of the frame (EXT_disjoint_timer_query_webgl2, null if absent).
  async hitch() {
    const tq = gl.getExtension('EXT_disjoint_timer_query_webgl2'), rows = [];
    const frameTimed = async label => {
      const query = tq ? gl.createQuery() : null;
      if (query) gl.beginQuery(tq.TIME_ELAPSED_EXT, query);
      let t = now(); render(); const cpu = now() - t;
      if (query) gl.endQuery(tq.TIME_ELAPSED_EXT);
      finish(); const wall = now() - t;
      let gpu = null;
      if (query) { for (let i = 0; i < 200 && !gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE); i++) await new Promise(r => setTimeout(r, 5)); gpu = gl.getParameter(tq.GPU_DISJOINT_EXT) ? 'disjoint' : +(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6).toFixed(2); gl.deleteQuery(query); }
      rows.push({ label, wallMs: +wall.toFixed(1), cpuMs: +cpu.toFixed(1), gpuMs: gpu });
    };
    const apply = async (year, extra = {}) => { const s = { ...sceneForYear(year), ...extra }; await backend.ensureState(s); let t = now(); backend.applyState(s); return now() - t; };
    await apply(2023); await frameTimed('2023 a'); await frameTimed('2023 b');
    { const t = now(); while (now() - t < 700) {} } await frameTimed('2023 after 700 ms busy main thread');
    rows.push({ label: 'apply -250', applyMs: +(await apply(-250)).toFixed(1) }); await frameTimed('-250 first'); await frameTimed('-250 second');
    rows.push({ label: 'apply -100', applyMs: +(await apply(-100)).toFixed(1) }); await frameTimed('-100 first'); await frameTimed('-100 second');
    await apply(2023); await frameTimed('2023 again');
    rows.push({ label: 'apply -100 again', applyMs: +(await apply(-100)).toFixed(1) }); await frameTimed('-100 second visit');
    rows.push({ label: 'apply -101', applyMs: +(await apply(-101)).toFixed(1) }); await frameTimed('-101 first'); await frameTimed('-101 second');
    rows.push({ label: 'apply -150', applyMs: +(await apply(-150)).toFixed(1) }); await frameTimed('-150 first'); await frameTimed('-150 second');
    return { rows, deposits: { '-100': sceneForYear(-100).deposits, '-101': sceneForYear(-101).deposits, '-150': sceneForYear(-150).deposits }, features: sceneForYear(-100).features };
  },
  // Same frame after a busy main thread of various lengths, timed both ways: blocking (readPixels) and non-blocking
  // (fence polled from timers, as a page that never reads back would see completion).
  async busy() {
    const rows = [], state = sceneForYear(2023);
    await backend.ensureState(state); backend.applyState(state); render(); finish(); render(); finish();
    const fenced = async () => { const t = now(); render(); const s = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); gl.flush();
      while (gl.clientWaitSync(s, 0, 0) === gl.TIMEOUT_EXPIRED) await new Promise(r => setTimeout(r, 1)); gl.deleteSync(s); return +(now() - t).toFixed(1); };
    const blocking = () => { const t = now(); render(); finish(); return +(now() - t).toFixed(1); };
    for (const ms of [0, 100, 300, 500, 700, 1000, 3000]) for (const mode of ['blocking', 'fence']) {
      await new Promise(r => setTimeout(r, 50));
      { const t = now(); while (now() - t < ms) {} }
      rows.push({ busyMs: ms, mode, frameMs: mode === 'blocking' ? blocking() : await fenced(), nextMs: blocking() });
    }
    return { rows };
  },
  // Computed GPU memory (bytes the uploads and render targets need; driver overhead and the browser's own swap chain
  // copies are not counted) for the scene as resident now, plus framebuffers per size. visible: meshes drawn at the
  // applied state; resident: every mesh in the scene.
  memory({ sizes = [[1440, 900, 1], [1440, 900, 2], [390, 844, 3]] } = {}) {
    const all = new Map(), visible = new Map(), textures = new Map();
    const arrayBytes = a => (a.isInterleavedBufferAttribute ? a.data.array : a.array);
    const shown = o => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };
    const texBytes = t => {
      const img = t.image; if (!img) return 0;
      const mip = t.generateMipmaps && t.minFilter !== 1003 && t.minFilter !== 1006 ? 4 / 3 : 1;
      if (img.data) return img.data.byteLength * mip;
      return img.width * img.height * 4 * mip;
    };
    const addTex = v => { if (v?.isTexture && !textures.has(v)) textures.set(v, texBytes(v)); };
    scene.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry, list = [...Object.values(g.attributes), g.index].filter(Boolean);
      for (const a of list) { const arr = arrayBytes(a); all.set(arr, arr.byteLength); if (shown(o)) visible.set(arr, arr.byteLength); }
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        for (const v of Object.values(m)) addTex(v);
        for (const u of Object.values(m.userData.siteUniforms ?? {})) addTex(u.value);
      }
    });
    const boundary = world.device().boundaryTextureBytes;
    const sum = m => [...m.values()].reduce((a, b) => a + b, 0);
    const gl2 = renderer.getContext(), samples = gl2.getParameter(gl2.SAMPLES);
    const shadow = 2048 * 2048 * (4 + 4 + 4 + 4); // VSM: RG16F map + 32F depth texture, RG16F blur pass + 24-bit depth renderbuffer
    const framebuffers = sizes.map(([w, h, dpr]) => {
      const px = w * dpr * h * dpr;
      // Default framebuffer: colour + depth/stencil per MSAA sample, plus the resolved colour.
      return { css: [w, h], dpr, pixels: px, samples, bytes: px * 8 * Math.max(1, samples) + px * 4 };
    });
    const fixed = sum(visible) + sum(textures) + boundary + shadow;
    return { totals: framebuffers.map(f => ({ css: f.css, dpr: f.dpr, firstViewBytes: fixed + f.bytes, residentBytes: sum(all) + sum(textures) + boundary + shadow + f.bytes })),
      geometryBytes: { visible: sum(visible), resident: sum(all) }, textureBytes: sum(textures), textureCount: textures.size,
      largestTextures: [...textures.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, b]) => ({ name: t.name || t.constructor.name, w: t.image?.width, h: t.image?.height, bytes: Math.round(b) })),
      shadowBytes: shadow, framebuffers, boundary, jsHeap: performance.memory ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize } : null,
      info: world.info() };
  },
  // First visits from the site's first state (2023, cut 12): the first frame as scene.js makes it (compileAsync, then
  // render), then residency as the site gets it (prefetch, and the idle upload warm unless uploads=off) until every cut
  // step is resident and uploaded, then each state once: the scrubber years down from 2023, then cut steps 11..0 at
  // 2023 deposits. hash: the second frame's pixels (identity between uploads on and off).
  async visits({ settleMs = 1000, gapMs = 100, timeoutMs = 240000 } = {}) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const first = sceneForYear(2023);
    await backend.ensureState(first); backend.applyState(first);
    let t = now(); await renderer.compileAsync(scene, camera); const compileAsyncMs = now() - t;
    const firstFrame = await timedFrame(), secondFrame = await timedFrame(), firstHash = frameHash();
    world.prefetch();
    const t0 = now(); let m = world.metadata(), settled = false;
    while (now() - t0 < timeoutMs) {
      m = world.metadata();
      if (m.resident.steps.length === 13 && (!m.uploads.enabled || m.uploads.pending.length === 0)) { settled = true; break; }
      await sleep(100);
    }
    const residentMs = now() - t0; await sleep(settleMs);
    const sequence = [...[2012, 1700, 1300, 900, 600, 400, 199, -100, -250, -400, -539].map(y => ({ label: `year-${y}`, state: sceneForYear(y) })),
      ...Array.from({ length: 12 }, (_, i) => 11 - i).map(k => ({ label: `cut-${k}`, state: { ...sceneForYear(2023), excavation: k / 12 } }))];
    const rows = [];
    for (const { label, state } of sequence) {
      const mem0 = { ...renderer.info.memory }, programs0 = renderer.info.programs.length, resident = world.isResident(state);
      if (!resident) await backend.ensureState(state);
      t = now(); backend.applyState(state); const applyMs = now() - t;
      const firstVisit = await timedFrame(), mem1 = { ...renderer.info.memory }, second = await timedFrame();
      rows.push({ label, k: stepOf(state.excavation), resident, applyMs: +applyMs.toFixed(1), first: firstVisit, second, newGeometries: mem1.geometries - mem0.geometries,
        newTextures: mem1.textures - mem0.textures, newPrograms: renderer.info.programs.length - programs0, hash: frameHash() });
      await sleep(gapMs);
    }
    return { compileAsyncMs: +compileAsyncMs.toFixed(1), firstFrame, secondFrame, firstHash, settled, residentMs: +residentMs.toFixed(0), uploads: m.uploads, rows,
      programs: renderer.info.programs.length, device: world.device(), metadata: world.metadata() };
  },
  // Memory options, one configuration per call (world-harness.cjs samples the GPU process's memory between calls).
  // size: drawing buffer; antialias false: no MSAA; shadow: { size, radius, blurDepth } for the key VSM (blurDepth false:
  // the blur target without a depth buffer); baseline true: keep the frames as the reference for this size; compare:
  // the reference size the frames are compared with (smaller frames are upscaled bilinearly, as a browser does).
  // phone: the world's phone shadow profile; keep: frames kept under name for memCrops / memFull.
  async memVariant({ name, size = [W, H], antialias = true, shadow = null, baseline = false, compare = null, years = [2023, 199, 2012, -250], phone = false, keep = false }) {
    if (!world || canvas.width !== size[0] || canvas.height !== size[1] || openAntialias !== antialias || openPhone !== phone || shadowChanged) {
      await open({ width: size[0], height: size[1], antialias, phone, programs: 'merged', background: 'css' }); openAntialias = antialias; openPhone = phone; shadowChanged = false;
    }
    let key = null; scene.traverse(o => { if (o.isDirectionalLight && o.castShadow) key = o; });
    const original = { size: key.shadow.mapSize.x, radius: key.shadow.radius };
    if (shadow) {
      const s = key.shadow, size_ = shadow.size ?? original.size;
      s.map?.dispose(); s.mapPass?.dispose(); s.map = null; s.mapPass = null;
      s.mapSize.set(size_, size_); s.radius = shadow.radius ?? original.radius;
      if (shadow.blurDepth === false) s.mapPass = new THREE.WebGLRenderTarget(size_, size_, { format: THREE.RGFormat, type: THREE.HalfFloatType, depthBuffer: false });
      s.needsUpdate = true; shadowChanged = true;
    }
    const frames = [];
    for (const year of years) {
      const state = sceneForYear(year); await backend.ensureState(state); backend.applyState(state); render(); finish();
      frames.push(composite());
    }
    if (keep) memFrames.set(name, { years, frames });
    const out = { name, size, antialias, phone, samples: gl.getParameter(gl.SAMPLES), shadow: { size: key.shadow.mapSize.x, radius: key.shadow.radius, blurDepth: key.shadow.mapPass ? key.shadow.mapPass.depthBuffer : null }, memoryProfile: world.device().memoryProfile, years, info: world.info(), glMem: glMem(gl) };
    if (baseline) { memBaselines.set(`${size[0]}x${size[1]}`, frames.map(c => c.getContext('2d').getImageData(0, 0, c.width, c.height).data)); return out; }
    const ref = memBaselines.get(compare ?? `${size[0]}x${size[1]}`);
    if (!ref) throw new Error(`memVariant ${name}: no baseline ${compare}`);
    const [RW, RH] = (compare ?? `${size[0]}x${size[1]}`).split('x').map(Number);
    out.pairs = []; let worst = null;
    frames.forEach((c, i) => {
      let data;
      if (c.width === RW && c.height === RH) data = c.getContext('2d').getImageData(0, 0, RW, RH).data;
      else { const u = document.createElement('canvas'); u.width = RW; u.height = RH; const x = u.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'low'; x.drawImage(c, 0, 0, RW, RH); data = x.getImageData(0, 0, RW, RH).data; }
      const x = ref[i], diff = new Uint8ClampedArray(RW * RH * 4); let differing = 0, over2 = 0, over8 = 0, over16 = 0, max = 0, sum = 0;
      for (let p = 0; p < x.length; p += 4) {
        const d = Math.max(Math.abs(x[p] - data[p]), Math.abs(x[p + 1] - data[p + 1]), Math.abs(x[p + 2] - data[p + 2]));
        if (d) differing++; if (d > 2) over2++; if (d > 8) over8++; if (d > 16) over16++; if (d > max) max = d; sum += d;
        diff[p] = diff[p + 1] = diff[p + 2] = Math.min(255, d * 8); diff[p + 3] = 255;
      }
      const px = RW * RH, row = { year: years[i], differingShare: +(differing / px).toFixed(5), over2Share: +(over2 / px).toFixed(5), over8Share: +(over8 / px).toFixed(5), over16Share: +(over16 / px).toFixed(5), maxChannelDiff: max, meanChannelDiff: +(sum / px).toFixed(4) };
      out.pairs.push(row);
      if (!worst || row.meanChannelDiff > worst.row.meanChannelDiff) worst = { row, diff };
    });
    if (worst && worst.row.maxChannelDiff) {
      const c = new OffscreenCanvas(RW, RH); c.getContext('2d').putImageData(new ImageData(worst.diff, RW, RH), 0, 0);
      out.diffImage = { year: worst.row.year, png: await canvasPng(c), scale: 'channel difference x 8' };
    }
    return out;
  },
  // 100% crops of two kept memVariant frame sets (a: old, b: new), side by side (a left, b right, 8 px apart). b is
  // scaled to a's size first when smaller (bilinear, as the browser shows a capped drawing buffer). Per year, the
  // count windows of w x h with the largest summed channel difference (non-overlapping, greedy) between a and select
  // (default b; another kept set picks the windows by one option's change).
  async memCrops({ a, b, select = null, years = null, w = 480, h = 320, count = 2 }) {
    const A = memFrames.get(a), B = memFrames.get(b), C = memFrames.get(select ?? b);
    if (!A || !B || !C) throw new Error(`memCrops: kept frames ${a} / ${b} / ${select} missing`);
    const out = { a, b, select: select ?? b, rows: [] };
    for (const year of years ?? A.years) {
      const ca = A.frames[A.years.indexOf(year)], cb0 = B.frames[B.years.indexOf(year)], cc0 = C.frames[C.years.indexOf(year)];
      if (!ca || !cb0 || !cc0) throw new Error(`memCrops: year ${year} not kept`);
      const RW = ca.width, RH = ca.height, cb = scaled(cb0, RW, RH);
      const da = ca.getContext('2d').getImageData(0, 0, RW, RH).data, db = scaled(cc0, RW, RH).getContext('2d').getImageData(0, 0, RW, RH).data;
      // Summed-area table of the per-pixel max channel difference.
      const S = new Float64Array((RW + 1) * (RH + 1));
      for (let y = 0; y < RH; y++) { let row = 0; for (let x = 0; x < RW; x++) { const p = 4 * (y * RW + x); row += Math.max(Math.abs(da[p] - db[p]), Math.abs(da[p + 1] - db[p + 1]), Math.abs(da[p + 2] - db[p + 2])); S[(y + 1) * (RW + 1) + x + 1] = S[y * (RW + 1) + x + 1] + row; } }
      const sum = (x, y) => S[(y + h) * (RW + 1) + x + w] - S[y * (RW + 1) + x + w] - S[(y + h) * (RW + 1) + x] + S[y * (RW + 1) + x];
      const taken = [];
      for (let n = 0; n < count; n++) {
        let best = null;
        for (let y = 0; y + h <= RH; y += 8) for (let x = 0; x + w <= RW; x += 8) {
          if (taken.some(t => x < t.x + w && t.x < x + w && y < t.y + h && t.y < y + h)) continue;
          const s = sum(x, y); if (!best || s > best.s) best = { x, y, s };
        }
        if (!best) break;
        taken.push(best);
        const c = new OffscreenCanvas(2 * w + 8, h), x = c.getContext('2d');
        x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, h);
        x.drawImage(ca, best.x, best.y, w, h, 0, 0, w, h); x.drawImage(cb, best.x, best.y, w, h, w + 8, 0, w, h);
        out.rows.push({ year, window: { x: best.x, y: best.y, w, h }, meanChannelDiff: +(best.s / (w * h)).toFixed(3), png: await canvasPng(c) });
      }
    }
    return out;
  },
  // Full kept frames of one year: a, and b scaled to a's size (as memCrops).
  async memFull({ a, b, year }) {
    const A = memFrames.get(a), B = memFrames.get(b), ca = A.frames[A.years.indexOf(year)], cb0 = B.frames[B.years.indexOf(year)];
    const png = async c => { const o = new OffscreenCanvas(c.width, c.height); o.getContext('2d').drawImage(c, 0, 0); return canvasPng(o); };
    return { year, a: { size: [ca.width, ca.height], png: await png(ca) }, b: { size: [cb0.width, cb0.height], shownAs: [ca.width, ca.height], png: await png(scaled(cb0, ca.width, ca.height)) } };
  },
  // Frames while the background work runs, as the site's first seconds: a fresh world with prefetch (and the upload
  // warm unless uploads=off), 2023 drawn first, then one render per animation frame (no readback, shadow map not
  // updated) until every step is resident and uploaded, plus tailMs. mode 'orbit' turns the camera 0.5 degrees a frame.
  // Rows: frame intervals over 16.7 ms with the upload slots, step builds and long tasks that overlap them.
  async warmFrames({ mode = 'static', tailMs = 3000, timeoutMs = 60000, width = W, height = H } = {}) {
    await open({ width, height, prefetch: true, warmUploads: q.get('uploads') !== 'off', programs: 'merged', background: 'css' });
    const longTasks = [], observer = new PerformanceObserver(list => { for (const e of list.getEntries()) longTasks.push({ atMs: +e.startTime.toFixed(1), ms: +e.duration.toFixed(1) }); });
    try { observer.observe({ type: 'longtask', buffered: false }); } catch {}
    const state = sceneForYear(2023); await backend.ensureState(state); backend.applyState(state);
    await renderer.compileAsync(scene, camera);
    const target = new THREE.Vector3(-1.4, -3.85, 0), offset = camera.position.clone().sub(target), axis = new THREE.Vector3(0, 1, 0);
    const frames = []; let settledAt = null, start = now(), frame = 0;
    renderer.shadowMap.needsUpdate = true;
    await new Promise(resolve => {
      const tick = t => {
        if (mode === 'orbit') { offset.applyAxisAngle(axis, Math.sign(Math.sin(frame / 240 * Math.PI) || 1) * .5 * Math.PI / 180); camera.position.copy(target).add(offset); camera.lookAt(target); camera.updateMatrixWorld(); }
        const c0 = now(); renderer.info.reset(); renderer.render(scene, camera); const cpu = now() - c0;
        frames.push({ atMs: +t.toFixed(1), cpuMs: +cpu.toFixed(2) }); frame++;
        const m = world.metadata();
        if (settledAt === null && m.resident.steps.length === 13 && (!m.uploads.enabled || m.uploads.pending.length === 0)) settledAt = now();
        if ((settledAt !== null && now() - settledAt > tailMs) || now() - start > timeoutMs) resolve(); else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    observer.disconnect();
    const m = world.metadata(), slots = m.uploads.log, builds = m.buildSlots ?? m.builds;
    // cpuMs: the render that opens the interval (the frame whose presentation the interval waits for).
    const intervals = frames.slice(1).map((f, i) => ({ fromMs: frames[i].atMs, toMs: f.atMs, ms: +(f.atMs - frames[i].atMs).toFixed(1), cpuMs: frames[i].cpuMs, index: i }));
    const overlaps = (list, a, b) => list.filter(e => e.atMs < b && e.atMs + e.ms > a);
    const during = iv => iv.toMs <= settledAt, missed = intervals.filter(iv => iv.ms > 16.7 * 1.5);
    const summary = list => { const s = list.map(i => i.ms).sort((a, b) => a - b); return { frames: s.length, p50: s[s.length >> 1] ?? null, p95: s[Math.floor(s.length * .95)] ?? null, max: s[s.length - 1] ?? null, over25: s.filter(x => x > 25).length }; };
    return { mode, size: [width, height], uploads: { enabled: m.uploads.enabled, slots: m.uploads.slots, maxSlotMs: m.uploads.maxSlotMs, timedOutSlots: slots.filter(s => s.timedOut).length, totalMs: m.uploads.totalMs },
      settledAfterMs: settledAt === null ? null : +(settledAt - start).toFixed(0), whileWorking: summary(intervals.filter(during)), afterSettled: summary(intervals.filter(iv => !during(iv))),
      missed: missed.map(iv => ({ ...iv, duringWork: during(iv), slots: overlaps(slots, iv.fromMs, iv.toMs), builds: overlaps(builds, iv.fromMs, iv.toMs), longTasks: overlaps(longTasks, iv.fromMs, iv.toMs) })),
      maxBuildSliceMs: Math.max(0, ...builds.map(b => b.ms)), stepBuilds: m.builds, firstFrameAtMs: frames[0]?.atMs ?? null,
      longTasksAfterFirstFrame: longTasks.filter(e => e.atMs >= (frames[0]?.atMs ?? 0)).map(e => ({ ...e, firstFrame: e.atMs <= frames[0].atMs + frames[0].cpuMs && e.atMs + e.ms >= frames[0].atMs + frames[0].cpuMs, slots: overlaps(slots, e.atMs, e.atMs + e.ms), builds: overlaps(builds, e.atMs, e.atMs + e.ms) })),
      slots, builds, longTasks, programs: renderer.info.programs.length, firstFrameCpuMs: frames[0]?.cpuMs ?? null,
      final: { steps: m.resident.steps, pending: m.resident.pending, failed: m.resident.failed, prefetch: m.resident.prefetch, uploadsPending: m.uploads.pending, uploadsDone: m.uploads.done } };
  },
  // GPU memory the page allocates (glMem: buffers, textures, renderbuffers of the world's context) plus the default
  // framebuffer (computed), at the first view, after prefetch and the upload warm, and after every state was visited.
  // maxResidentSteps (a residency policy): then also the cost of a far jump (2023 cut 12 to cut 0 and back).
  async steadyMemory({ width = W, height = H, maxResidentSteps = Infinity, timeoutMs = 120000 } = {}) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    await open({ width, height, prefetch: false, warmUploads: true, maxResidentSteps, programs: 'merged', background: 'css' });
    const samples = gl.getParameter(gl.SAMPLES), px = width * height, framebufferBytes = px * 8 * Math.max(1, samples) + (samples ? px * 4 : 0);
    const snap = label => ({ label, ...glMem(gl), framebufferBytes, totalWithFramebuffer: glMem(gl).total + framebufferBytes, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, steps: world.metadata().resident.steps });
    const settle = async () => { const t0 = now(); while (now() - t0 < timeoutMs) { const m = world.metadata(); if (!m.resident.pending.length && !m.uploads.pending.length && (!m.resident.prefetch.started || m.resident.prefetch.finished)) break; await sleep(100); } await sleep(500); };
    const first = sceneForYear(2023); await backend.ensureState(first); backend.applyState(first); render(); finish();
    const out = { size: [width, height], samples, maxResidentSteps: Number.isFinite(maxResidentSteps) ? maxResidentSteps : null, rows: [snap('first view (2023)')] };
    world.prefetch(); await sleep(200); await settle(); out.rows.push(snap('after prefetch and upload warm'));
    const states = [...[2012, 1700, 1300, 900, 600, 400, 199, -100, -250, -400, -539].map(sceneForYear), ...Array.from({ length: 12 }, (_, i) => ({ ...sceneForYear(2023), excavation: (11 - i) / 12 }))];
    if (!Number.isFinite(maxResidentSteps)) {
      for (const s of states) { await backend.ensureState(s); backend.applyState(s, { anchors: 'nearest' }); render(); finish(); }
      out.rows.push(snap('after visiting every state'));
    } else {
      // Far jumps under the policy: request to drawn frame, with the long tasks in between.
      const longTasks = [], observer = new PerformanceObserver(list => { for (const e of list.getEntries()) longTasks.push(+e.duration.toFixed(1)); });
      try { observer.observe({ type: 'longtask' }); } catch {}
      out.jumps = [];
      for (const [label, s] of [['cut 12 -> cut 0', { ...first, excavation: 0 }], ['cut 0 -> cut 12', first], ['cut 12 -> cut 3', { ...first, excavation: 3 / 12 }], ['cut 3 -> cut 11', { ...first, excavation: 11 / 12 }]]) {
        longTasks.length = 0;
        const resident = world.isResident(s), t0 = now(); await backend.ensureState(s); const ensureMs = now() - t0;
        const a0 = now(); backend.applyState(s, { anchors: 'nearest' }); const applyMs = now() - a0;
        const f = await timedFrame();
        await sleep(300);
        out.jumps.push({ label, wasResident: resident, ensureMs: +ensureMs.toFixed(1), applyMs: +applyMs.toFixed(1), frame: f, requestToFrameMs: +(now() - 300 - t0).toFixed(1), longTasksMs: [...longTasks] });
        await settle();
      }
      observer.disconnect();
      out.rows.push(snap('after the jumps (settled)'));
    }
    return out;
  },
  // Core pack parse broken down by stage (fetched again from the HTTP cache, inflated, parsed three times).
  async parseProfile() {
    const manifest = await (await fetch('/site-tier/manifest.json')).json(), entry = manifest.packs.core;
    const compressed = new Uint8Array(await (await fetch('/site-tier/' + entry.file)).arrayBuffer());
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const t0 = now(), raw = await inflatePack(compressed), t1 = now(), profile = {}; readPack(raw, profile); const t2 = now();
      runs.push({ inflateMs: +(t1 - t0).toFixed(1), parseMs: +(t2 - t1).toFixed(1), stages: Object.fromEntries(Object.entries(profile).map(([k, v]) => [k, +v.toFixed(1)])) });
    }
    return { bytes: entry.bytes, runs };
  },
  // Source of one program (for reading what drives its cost).
  source({ id }) { const s = sources().find(p => p.id === id); return s ? { ...s, vsTranslated: debugShaders?.getTranslatedShaderSource(renderer.info.programs.find(p => p.id === id).vertexShader) ?? null,
    fsTranslated: debugShaders?.getTranslatedShaderSource(renderer.info.programs.find(p => p.id === id).fragmentShader) ?? null } : null; }
};
window.harness = { ready: true, run: (name, args) => run[name](args) };
