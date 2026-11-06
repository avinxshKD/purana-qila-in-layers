// Site tier world (backend contract v1 + v1.1): the M1 era composite drawn from precomputed packs and baked pages
// instead of being built from source. Same stage as createLookWorld (look-stage.js: backdrop, lights, VSM key shadow,
// plinth, ground) and the same camera, soil look from siteSoilMaterial, features from features.js on the shared state
// driver. Cut steps other than the default arrive lazily (isResident / ensureState / prefetch); applyState and
// warmState are synchronous and only valid for resident states. Imports nothing that builds the M1 kit (seating.js,
// excavation.js, soil-block.js, site-state.js, museum-scene.js).
import * as THREE from 'three';
import { loadSiteTierAssets } from './assets.js';
import { decodeFixedSoilSteps } from './fixed-soil.js';
import { siteSoilMaterial, siteSoilUnifiedMaterial, pageTexture, composeTop, splitByPlane } from './soil-material.js';
import { createTierFeatures } from './features.js';
import { boundaryTextures, eraDepthMaterial } from '../eras/soil-shader.js';
import { createEraDisplacement } from '../eras/soil-displace.js';
import { activeEra, eraDepositUniform } from '../eras/stack.js';
import { stepOf } from '../eras/site-driver.js';
import { ANCHOR_TABLE } from '../eras/anchor-table.js';
import { surfaceHeight } from '../layers.js';
import { PALETTES } from '../palettes.js';
import { TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN, BACKDROP, arcAngle, backdrop, addLookLights, addLookPlinth } from '../look-stage.js';

const now = () => globalThis.performance?.now() ?? Date.now();
const FIXED_ARRAYS = ['lattice', 'blend', 'normal', 'index', 'heights', 'pairs', 'pairHeights'];
const STEP_MESH_NAMES = { top: k => `era-top-step-${k}`, 'walls-core': k => `era-walls-step-${k}`, walls: k => `era-walls-step-${k}`, floors: k => `era-floors-step-${k}`, front: k => `era-front-step-${k}` };
// Memory profile: the drawing buffer at most MAX_PIXEL_RATIO device pixels per CSS pixel; MSAA only below
// MSAA_MAX_PIXEL_RATIO; on phones (short viewport side at most PHONE_SHORT_SIDE CSS px at load) the key VSM at
// PHONE_SHADOW_SIZE with its blur radius scaled to keep the blur's width in metres.
const MAX_PIXEL_RATIO = 2, MSAA_MAX_PIXEL_RATIO = 2, PHONE_SHORT_SIDE = 600, PHONE_SHADOW_SIZE = 1024;
// Cut step builds after the first frame run as slices of at most BUILD_SLOT_MS.
const BUILD_SLOT_MS = 8;
const drain = steps => { let r; while (!(r = steps.next()).done); return r.value; };
const never = () => false;
// geometry.computeVertexNormals as a generator (yields whenever over() is true, checked every 1024 triangles or
// vertices): the same operations in the same order, so the normals are bit-identical. Indexed, plain float32 positions
// only; anything else takes three's method in one go.
export function* vertexNormalsSteps(geometry, over = never) {
  const position = geometry.attributes.position, index = geometry.index;
  if (!index || position.isInterleavedBufferAttribute || position.normalized || position.itemSize !== 3 || geometry.attributes.normal) { geometry.computeVertexNormals(); return; }
  const p = position.array, ix = index.array, n = new Float32Array(position.count * 3);
  for (let i = 0, il = index.count; i < il; i += 3) {
    const a = 3 * ix[i], b = 3 * ix[i + 1], c = 3 * ix[i + 2], bx = p[b], by = p[b + 1], bz = p[b + 2];
    const cbx = p[c] - bx, cby = p[c + 1] - by, cbz = p[c + 2] - bz, abx = p[a] - bx, aby = p[a + 1] - by, abz = p[a + 2] - bz;
    const x = cby * abz - cbz * aby, y = cbz * abx - cbx * abz, z = cbx * aby - cby * abx;
    // All three read before any write, as three does (a degenerate triangle may repeat a vertex).
    const ax = n[a] + x, ay = n[a + 1] + y, az = n[a + 2] + z, Bx = n[b] + x, By = n[b + 1] + y, Bz = n[b + 2] + z, cx = n[c] + x, cy = n[c + 1] + y, cz = n[c + 2] + z;
    n[a] = ax; n[a + 1] = ay; n[a + 2] = az; n[b] = Bx; n[b + 1] = By; n[b + 2] = Bz; n[c] = cx; n[c + 1] = cy; n[c + 2] = cz;
    if (i % 3072 === 3069 && over()) yield;
  }
  for (let v = 0; v < n.length; v += 3) {
    const x = n[v], y = n[v + 1], z = n[v + 2], s = 1 / (Math.sqrt(x * x + y * y + z * z) || 1);
    n[v] = x * s; n[v + 1] = y * s; n[v + 2] = z * s;
    if (v % 3072 === 3069 && over()) yield;
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(n, 3));
}
function notResident(k, packs) {
  const error = new Error(`site-tier: cut step ${k} is not resident (${packs.join(', ') || 'pages'})`);
  error.name = 'SiteStateNotResident'; error.packs = packs;
  return error;
}

// The site tier renderer as the world creates it. Context attributes (antialias, alpha for the css background,
// preserveDrawingBuffer) are fixed at creation, so a renderer made ahead of the world must come from here.
// antialias true: MSAA when pixelRatio (the device's, at creation) is below MSAA_MAX_PIXEL_RATIO.
export function createSiteTierRenderer(canvas, { antialias = true, preserve = false, background = 'css', pixelRatio = globalThis.devicePixelRatio || 1 } = {}) {
  return new THREE.WebGLRenderer({ canvas, antialias: antialias && pixelRatio < MSAA_MAX_PIXEL_RATIO, alpha: background === 'css', preserveDrawingBuffer: preserve, powerPreference: 'high-performance' });
}

// options: as createLookWorld (width, height, antialias, preserve, view 'turntable', soil 'eras') plus assets (base,
// fetch for loadSiteTierAssets), anchorTable, maxResidentSteps (cut steps besides the default kept resident; M: all),
// prefetch (start background loading after the first frame; default true), onProgress, programs ('merged': one soil
// program per side and the plinth on the feature program; 'split': a soil program per mode, mapping and displacement
// and a plain standard plinth, as before) and background ('css': transparent
// canvas, the page draws world.backdrop behind it; 'texture': the backdrop texture as scene.background, as the film),
// renderer (from createSiteTierRenderer on the same canvas, made early so the page's first WebGL context is not
// created inside the world build; the world sets its size, colour, tone mapping and shadow state), warmUploads (after
// the first frame, upload each newly resident cut step's buffers and pages in idle slots; default true), pixelRatio
// (the device's, for the MSAA choice when the world makes its renderer), maxPixelRatio (drawing buffer pixels per CSS
// pixel of the canvas at most; sizes asked of renderer.setSize above it are reduced to it) and phone (the phone shadow
// profile; null: decided from the viewport at load).
export async function createSiteTierWorld(canvas, {
  width = 1920, height = 1080, antialias = true, preserve = false, view = 'turntable', soil = 'eras', angle = 0,
  assets: assetOptions = {}, anchorTable = ANCHOR_TABLE, maxResidentSteps = Infinity, prefetch = true, onProgress = () => {},
  programs = 'merged', background = 'css', renderer: injected = null, warmUploads = true,
  pixelRatio = globalThis.devicePixelRatio || 1, maxPixelRatio = MAX_PIXEL_RATIO, phone = null
} = {}) {
  if (!['merged', 'split'].includes(programs)) throw new Error(`site-tier world: programs ${programs}`);
  if (!['css', 'texture'].includes(background)) throw new Error(`site-tier world: background ${background}`);
  if (soil !== 'eras') throw new Error('site-tier world: soil must be eras');
  if (view !== 'turntable') throw new Error(`site-tier world: view ${view} is not supported`);
  const started = now(), timings = {};
  onProgress({ phase: 'scene' });
  // ---- First view: manifest, core, grids, first-view pages ----
  // Started before the renderer: creating it (the page's first WebGL context) blocked the main thread for about 1.3 s
  // on a fresh profile here, and the network fetches need not wait for that.
  let t = now();
  const assets = await loadSiteTierAssets(assetOptions);
  const { manifest } = assets, resident = new Map(), pendingPacks = new Set(), failedPacks = new Map();
  function loadPack(name) {
    if (resident.has(name)) return Promise.resolve(resident.get(name));
    pendingPacks.add(name);
    return assets.pack(name).then(p => { pendingPacks.delete(name); failedPacks.delete(name); resident.set(name, p); return p; },
      error => { pendingPacks.delete(name); failedPacks.set(name, String(error?.message ?? error)); error.pack ??= name; throw error; });
  }
  const pageEntries = manifest.pages ?? {}, pages = new Map(), pendingPages = new Map();
  const image = async (file, flip) => {
    const r = await assets.fetch(assets.base + file);
    if (!r.ok) throw new Error(`site-tier page ${file}: HTTP ${r.status}`);
    return createImageBitmap(await r.blob(), { imageOrientation: flip ? 'flipY' : 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  };
  function loadPage(name) {
    if (pages.has(name)) return Promise.resolve(pages.get(name));
    if (pendingPages.has(name)) return pendingPages.get(name);
    const entry = pageEntries[name];
    if (!entry) return Promise.reject(Object.assign(new Error(`site-tier: no page ${name} in the manifest`), { pack: `page:${name}` }));
    const promise = (async () => {
      let page;
      if (entry.kind === 'top') {
        // The top ships as three grey images; composed on a canvas, which three flips at upload as before.
        const [variation, gradX, gradZ] = await Promise.all(['variation', 'gradX', 'gradZ'].map(m => image(entry.maps[m].file, false)));
        page = { top: pageTexture(composeTop(variation, gradX, gradZ)) };
        for (const b of [variation, gradX, gradZ]) b.close();
      } else {
        const [albedo, normal] = await Promise.all(['albedo', 'normal'].map(m => image(entry.maps[m].file, true)));
        page = { albedo: pageTexture(albedo, { srgb: true, flipY: false }), normal: pageTexture(normal, { flipY: false }) };
      }
      pages.set(name, page);
      return page;
    })();
    pendingPages.set(name, promise);
    promise.then(() => pendingPages.delete(name), () => pendingPages.delete(name));
    return promise.catch(error => { failedPacks.set(`page:${name}`, String(error?.message ?? error)); error.pack ??= `page:${name}`; throw error; });
  }
  const firstPages = manifest.firstViewPages ?? [];
  const firstView = Promise.all([loadPack('core'), loadPack('grids'), ...firstPages.map(loadPage)]);
  firstView.catch(() => {});

  const stageStart = now();
  if (injected && injected.domElement !== canvas) throw new Error('site-tier world: the injected renderer must draw to the given canvas');
  if (injected && injected.getContext().getContextAttributes().alpha !== (background === 'css')) throw new Error('site-tier world: the injected renderer was created for another background');
  const renderer = injected ?? createSiteTierRenderer(canvas, { antialias, preserve, background, pixelRatio });
  renderer.setPixelRatio(1);
  // The page sizes the drawing buffer from its CSS size and devicePixelRatio; the cap applies to every later resize
  // too. A capped request that matches the current size is skipped, so a page comparing canvas.width with its
  // uncapped size does not reset the drawing buffer on every resize pass.
  const capSize = (w, h) => {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!(cw > 0 && ch > 0) || (w <= cw * maxPixelRatio + 1 && h <= ch * maxPixelRatio + 1)) return [w, h, false];
    return [Math.round(cw * maxPixelRatio), Math.round(ch * maxPixelRatio), true];
  };
  const setSize = renderer.setSize.bind(renderer), drawingSize = new THREE.Vector2();
  renderer.setSize = (w, h, updateStyle) => {
    const [cw, ch, capped] = capSize(w, h);
    if (capped && renderer.getSize(drawingSize).x === cw && drawingSize.y === ch) return;
    setSize(cw, ch, updateStyle);
  };
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  if (background === 'texture') scene.background = backdrop(width, height);
  else renderer.setClearColor(0x000000, 0);
  // createLookWorld's turntable camera at t = 0.
  const camera = new THREE.PerspectiveCamera(25, width / height, .1, 180), target = new THREE.Vector3(-1.4, -3.85, 0);
  const distance = 74, elevation = 27 * Math.PI / 180, theta = 35 * Math.PI / 180 + angle * Math.PI / 180 + arcAngle(0);
  camera.position.set(target.x + distance * Math.cos(elevation) * Math.sin(theta), target.y + distance * Math.sin(elevation), target.z + distance * Math.cos(elevation) * Math.cos(theta));
  camera.lookAt(target); camera.updateMatrixWorld();
  const { key } = addLookLights(scene);
  // The VSM blur target needs no depth buffer (three's default has one): a full-screen blur draws into it.
  const isPhone = phone ?? Math.min(globalThis.innerWidth ?? Infinity, globalThis.innerHeight ?? Infinity) <= PHONE_SHORT_SIDE;
  if (isPhone) { key.shadow.radius *= PHONE_SHADOW_SIZE / key.shadow.mapSize.x; key.shadow.mapSize.set(PHONE_SHADOW_SIZE, PHONE_SHADOW_SIZE); }
  key.shadow.mapPass = new THREE.WebGLRenderTarget(key.shadow.mapSize.x, key.shadow.mapSize.y, { format: THREE.RGFormat, type: THREE.HalfFloatType, depthBuffer: false });
  timings.stageMs = now() - stageStart;

  const [core] = await firstView;
  const grid = await assets.grids();
  timings.firstViewMs = now() - t;

  // ---- Soil ----
  t = now();
  const meta = core.meta, levels = meta.levels, textures = boundaryTextures(grid);
  const uniforms = { eraB0: { value: textures[0] }, eraB1: { value: textures[1] }, eraB2: { value: textures[2] }, eraDeposits: { value: Array(10).fill(1) }, eraActive: { value: 9 } };
  const depth = eraDepthMaterial({ grid, uniforms });
  const topOptions = { albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN, gradientMax: pageEntries.top?.gradientMax };
  const common = { grid, uniforms, bottomY: levels.bottomY, fadeStartY: levels.fadeStartY, top: topOptions };
  // One material per (mode, page, displaced); materials of one mode and mapping share a program.
  const materials = new Map();
  function soilMaterial(mode, texture, displaced = false) {
    const key = `${mode}|${texture}|${displaced}`;
    if (materials.has(key)) return materials.get(key);
    const name = texture === 'top-xz' ? 'top' : texture, page = pages.get(name);
    if (!page) throw new Error(`site-tier: page ${name} not loaded`);
    const mapping = pageEntries[name].kind === 'atlas' ? 'uv' : pageEntries[name].plane;
    const m = (programs === 'merged' ? siteSoilUnifiedMaterial : siteSoilMaterial)({ ...common, mode, mapping, displaced, pages: page });
    m.userData.sitePage = name;
    materials.set(key, m); return m;
  }
  const soilGroup = new THREE.Group(); soilGroup.name = 'era-soil-block'; scene.add(soilGroup);
  // displaced: 'top' or 'face' for meshes whose eraBlend >= 0 vertices move on the GPU (soil-displace.js resolves them).
  function soilMesh(geometry, material, role, name, displaced = null, visible = true) {
    const m = new THREE.Mesh(geometry, material);
    m.visible = visible;
    m.castShadow = true; m.receiveShadow = true; m.userData.sectionRole = role; m.userData.group = name; m.userData.eraSoil = true; m.name = name;
    if (displaced) { m.customDepthMaterial = depth; m.frustumCulled = false; m.userData.eraDisplaced = displaced; }
    soilGroup.add(m); return m;
  }
  const fixedFrom = (pack, name, over) => decodeFixedSoilSteps(Object.fromEntries(FIXED_ARRAYS.map(k => [k, pack.arrays[`fixed:${name}:${k}`]])), meta.fixedSoil[name], over);
  let splitOther = 0;
  function* fixedMeshSteps(pack, topName, facesName, label, over, visible) {
    const out = [soilMesh(yield* fixedFrom(pack, topName, over), soilMaterial('top', 'top-xz', true), 'top', `era-top${label}`, 'top', visible)];
    for (const [plane, g] of Object.entries(splitByPlane(yield* fixedFrom(pack, facesName, over)))) {
      if (plane === 'other') { splitOther += g.index.count / 3; continue; }
      out.push(soilMesh(g, soilMaterial('outer', plane, true), 'cutface', `era-outer${label}-${plane}`, 'face', visible));
    }
    return out;
  }
  const fixed = drain(fixedMeshSteps(core, 'top', 'faces', '', never, true));
  const pedestalGeometry = core.geometries.get('soil:pedestal').geometry;
  if (!pedestalGeometry.attributes.normal) pedestalGeometry.computeVertexNormals();
  fixed.push(soilMesh(pedestalGeometry, soilMaterial('inner', 'core'), 'cutface', 'era-ring-pedestal'));

  // ---- Cut steps and residency ----
  const DEFAULT_STEP = meta.defaultStep, CUT_STEPS = meta.cutSteps, steps = new Map(), building = new Map();
  const packOf = id => meta.geometryPack[id];
  function stepPacks(k) {
    const names = new Set(['core']);
    for (const id of meta.soilSteps[k] ?? []) names.add(packOf(id));
    for (const slots of Object.values(meta.featureSteps[k] ?? {})) for (const id of slots) if (id) names.add(packOf(id));
    for (const f of Object.values(meta.fixedSoil)) if (f.shown === 'always' || k === 0) names.add(f.pack);
    return [...names];
  }
  const stepPages = k => k > 0 && k < DEFAULT_STEP && pageEntries[`step-${k}`] ? [`step-${k}`] : [];
  const missing = k => stepPacks(k).filter(n => !resident.has(n));
  const stepResident = k => steps.has(k) && missing(k).length === 0;
  function geometry(id) {
    const name = packOf(id), pack = resident.get(name);
    if (!pack) throw notResident(current?.k ?? DEFAULT_STEP, [name]);
    const g = pack.geometries.get(id);
    if (!g) throw new Error(`site-tier: geometry ${id} missing from pack ${name}`);
    return g;
  }
  // A step's meshes stay hidden until the whole step is built (a frame may be drawn between slices).
  function* buildStepSteps(k, over) {
    const meshes = [];
    for (const id of meta.soilSteps[k] ?? []) {
      const { geometry: g, record } = geometry(id), part = id.split(':')[2];
      // Pack soil carries no normals except the fronts; vertex normals only feed the shadow normal bias (lighting uses
      // flat derivative normals and the baked normal).
      if (!g.attributes.normal) yield* vertexNormalsSteps(g, over);
      meshes.push(soilMesh(g, soilMaterial(record.mode, record.texture), record.role, STEP_MESH_NAMES[part](k), null, false));
      if (over()) yield;
    }
    if (k === 0) { const f = meta.fixedSoil.marginTop; meshes.push(...yield* fixedMeshSteps(resident.get(f.pack), 'marginTop', 'marginFaces', '-margins', over, false)); }
    for (const m of meshes) m.visible = current?.k === k;
    steps.set(k, { k, meshes });
  }
  // Slices run in idle callbacks for background (prefetch) builds and as soon as possible (scheduler.postTask, else
  // setTimeout) once any caller waits for the step.
  const urgent = new Set(), buildSlots = [], wake = new Map();
  const soon = f => globalThis.scheduler?.postTask ? globalThis.scheduler.postTask(f, { priority: 'user-visible' }) : setTimeout(f, 0);
  function runBuild(k) {
    return new Promise((resolve, reject) => {
      let sliceEnd = 0;
      const over = () => now() > sliceEnd, steps_ = buildStepSteps(k, over), stats = { k, atMs: +now().toFixed(1), ms: 0, slices: 0, maxSliceMs: 0 };
      // A step that becomes urgent while its next slice waits for idle time is rescheduled; the stale callback is a no-op.
      let ticket = 0, waitingIdle = false;
      const next = () => { const t = ++ticket, run = d => { if (t === ticket) slice(d); }; waitingIdle = !urgent.has(k); if (waitingIdle) idle(run, { timeout: 1000 }); else soon(run); };
      wake.set(k, () => { if (waitingIdle) next(); });
      function slice(deadline) {
        waitingIdle = false;
        if (disposed) { reject(new Error('site-tier world: disposed')); return; }
        const start = now(), budget = !deadline || deadline.didTimeout || urgent.has(k) ? BUILD_SLOT_MS : Math.min(BUILD_SLOT_MS, deadline.timeRemaining());
        sliceEnd = start + budget;
        let r;
        try { do r = steps_.next(); while (!r.done && !over()); } catch (error) { wake.delete(k); reject(error); return; }
        const ms = now() - start;
        stats.ms += ms; stats.slices++; stats.maxSliceMs = Math.max(stats.maxSliceMs, ms);
        if (buildSlots.length < 1000) buildSlots.push({ k, atMs: +start.toFixed(1), ms: +ms.toFixed(1), urgent: urgent.has(k) });
        if (!r.done) { next(); return; }
        wake.delete(k);
        buildLog.push({ ...stats, ms: +stats.ms.toFixed(1), maxSliceMs: +stats.maxSliceMs.toFixed(1), wallMs: +(now() - stats.atMs).toFixed(1) });
        resolve();
      }
      next();
    });
  }
  // background: a prefetch request (the build waits for idle time unless someone else asks for the step).
  function ensureStep(k, { background = false } = {}) {
    if (stepResident(k)) return Promise.resolve();
    if (!background && !urgent.has(k)) { urgent.add(k); wake.get(k)?.(); }
    if (building.has(k)) return building.get(k);
    const promise = Promise.all([...stepPacks(k).map(loadPack), ...stepPages(k).map(loadPage)])
      .then(() => steps.has(k) ? null : runBuild(k).then(() => queueUploads(k)))
      .then(() => evict(k));
    building.set(k, promise);
    const done = () => { building.delete(k); urgent.delete(k); };
    promise.then(done, done);
    return promise;
  }
  // Eviction (only with maxResidentSteps): farthest cut step first; never the default step, the applied step, the last
  // warmed step or the step just made resident (its caller is about to apply it), nor any pack those need. Features
  // release their wrappers before the packs' geometries go.
  let current = null, lastWarmed = null;
  const buildLog = [];
  function evict(ensured = null) {
    const extra = () => [...steps.keys()].filter(k => k !== DEFAULT_STEP);
    while (extra().length > maxResidentSteps) {
      const pinned = new Set([DEFAULT_STEP, current?.k, lastWarmed, ensured, ...building.keys()].filter(k => k !== null && k !== undefined));
      const keep = new Set([...pinned].flatMap(stepPacks));
      const candidates = extra().filter(k => !pinned.has(k)).sort((a, b) => Math.abs(b - (current?.k ?? DEFAULT_STEP)) - Math.abs(a - (current?.k ?? DEFAULT_STEP)));
      const k = candidates[0];
      if (k === undefined) break;
      const s = steps.get(k);
      for (const m of s.meshes) { m.removeFromParent(); if (k === 0 && m.userData.eraDisplaced) m.geometry.dispose(); }
      steps.delete(k); uploadsDone.delete(k);
      for (const name of stepPacks(k)) {
        if (keep.has(name) || name === 'core' || name === 'grids') continue;
        if ([...steps.keys()].some(j => stepPacks(j).includes(name))) continue;
        const pack = resident.get(name);
        if (!pack) continue;
        const ids = [...pack.geometries.keys()];
        site.release(ids);
        for (const id of ids) warmedFeatureIds.delete(id);
        for (const { geometry: g } of pack.geometries.values()) g.dispose();
        resident.delete(name); assets.evict(name);
      }
      for (const name of stepPages(k)) {
        const page = pages.get(name);
        if (!page) continue;
        for (const [key, m] of materials) if (m.userData.sitePage === name) { m.dispose(); materials.delete(key); }
        for (const tex of Object.values(page)) tex.dispose();
        pages.delete(name);
      }
    }
  }
  drain(buildStepSteps(DEFAULT_STEP, never));
  timings.soilMs = now() - t;

  // ---- Features, ring, stage ----
  t = now();
  const { group: featureGroup, site, paintStats } = createTierFeatures({ core, geometry, stack: grid, anchorTable });
  featureGroup.userData.sectionRole = 'feature';
  scene.add(featureGroup);
  timings.featuresMs = now() - t;
  const add = (g, material, { cast = true, receive = true, role = 'feature', group = role } = {}) => {
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.userData.sectionRole = role; mesh.userData.group = group;
    scene.add(mesh); return mesh;
  };
  // The plinth takes the feature material's configuration (white vertex colour, neutral half-float map, as
  // features.js) so it shares the feature program; colour x 1 x 1 leaves its shading unchanged.
  const neutral = new THREE.DataTexture(new Uint16Array([15360, 15360, 15360, 15360]), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  neutral.needsUpdate = true;
  const standard = programs === 'split' ? color => new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 })
    : color => new THREE.MeshStandardMaterial({ color, vertexColors: true, map: neutral, roughness: 1, metalness: 0 });
  const plinthAdd = programs === 'split' ? add : (g, material, options) => {
    g.setAttribute('color', new THREE.Uint8BufferAttribute(new Uint8Array(g.attributes.position.count * 3).fill(255), 3, true));
    return add(g, material, options);
  };
  addLookPlinth({ scene, add: plinthAdd, material: standard, base: meta.base, plinthColour: PALETTES.photo.plinth, scaleBar: false });
  const eraDisplacement = createEraDisplacement({ stack: grid });
  timings.plinthMs = now() - t - timings.featuresMs;
  timings.totalMs = now() - started;

  // ---- State ----
  // options go to the feature driver unchanged ({ anchors: 'nearest' } on the drag path; omitted means exact). Nothing
  // here reads site.activeTop, which nearest mode leaves lazy.
  function applyState(state, options) {
    const k = stepOf(state.excavation);
    if (!stepResident(k)) throw notResident(k, missing(k));
    const t0 = now(), result = options === undefined ? site.applyState(state) : site.applyState(state, options), t1 = now();
    const d = eraDepositUniform(state.deposits);
    uniforms.eraDeposits.value = d; uniforms.eraActive.value = activeEra(d);
    for (const s of steps.values()) for (const m of s.meshes) m.visible = s.k === k;
    current = { k };
    eraDisplacement.beginFrame(state);
    return { ...result, cutStep: k, cutAssumesFullDeposits: k > 0 && d.some(v => v < 1), timings: { featuresMs: t1 - t0, blockMs: now() - t1 } };
  }
  function warmState(state) {
    const k = stepOf(state.excavation);
    if (!stepResident(k)) throw notResident(k, missing(k));
    const t0 = now(), featuresMs = site.warmState(state);
    lastWarmed = k;
    return { featuresMs, totalMs: now() - t0 };
  }
  const isResident = state => stepResident(stepOf(state.excavation));
  const ensureState = state => ensureStep(stepOf(state.excavation));

  // Background prefetch after the first frame: one cut step at a time, nearest to the applied step first.
  let prefetchStarted = false, prefetchStopped = false;
  const prefetchState = { completed: 0, total: 0, error: null, finished: false };
  async function runPrefetch() {
    const order = () => Array.from({ length: CUT_STEPS + 1 }, (_, k) => k).filter(k => !stepResident(k))
      .sort((a, b) => Math.abs(a - (current?.k ?? DEFAULT_STEP)) - Math.abs(b - (current?.k ?? DEFAULT_STEP)) || a - b);
    prefetchState.total = order().length;
    for (let next = order(); next.length && !prefetchStopped; next = order()) {
      if ([...steps.keys()].filter(k => k !== DEFAULT_STEP).length >= maxResidentSteps) break;
      try { await ensureStep(next[0], { background: true }); prefetchState.completed++; }
      catch (error) { prefetchState.error = String(error?.message ?? error); break; }
      await new Promise(resolve => (globalThis.requestIdleCallback ?? (f => setTimeout(f, 0)))(resolve, { timeout: 1000 }));
    }
    prefetchState.finished = true;
  }
  function startPrefetch() { if (prefetchStarted) return; prefetchStarted = true; runPrefetch(); }

  // ---- Idle upload warm ----
  // A cut step's first frame otherwise pays for its uploads: vertex and index buffers, page textures and vertex array
  // objects. After the first frame, each newly built step is uploaded in idle slots of at most WARM_SLOT_MS (predicted
  // from the bytes; one task is never split). Index buffers and vertex arrays are only made when drawn, so each mesh is
  // drawn once into a 1 x 1 target through a proxy on WARM_LAYER, which only the warm camera and the lights see. three
  // picks tone mapping and output colour space by render target but treats an XR target like the canvas, so the target
  // is flagged as one and the warm draws use the frame's programs.
  const WARM_LAYER = 31, WARM_SLOT_MS = 8, WARM_DRAW_MS = 1;
  const warmTarget = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  warmTarget.texture.colorSpace = renderer.outputColorSpace; warmTarget.isXRRenderTarget = true;
  const warmCamera = new THREE.PerspectiveCamera();
  let featureWarmMaterial = null;
  featureGroup.traverse(o => { if (!featureWarmMaterial && o.isMesh && o.material.side === THREE.FrontSide) featureWarmMaterial = o.material; });
  const warmedFeatureIds = new Set(Object.values(meta.featureSteps[DEFAULT_STEP] ?? {}).flat().filter(Boolean));
  const uploadQueue = [], uploadsDone = new Set([DEFAULT_STEP]);
  const uploadStats = { enabled: warmUploads, slots: 0, maxSlotMs: 0, totalMs: 0, tasks: 0, maxTaskMs: 0, bytes: 0, draws: 0, steps: [], log: [] };
  let framed = false, uploadScheduled = false, uploading = null, msPerByte = 1e-6, disposed = false;
  const idle = (f, options) => (globalThis.requestIdleCallback ?? (g => setTimeout(() => g({ didTimeout: true, timeRemaining: () => WARM_SLOT_MS }), 0)))(f, options);
  const bytesOf = g => [...Object.values(g.attributes), g.index].reduce((s, a) => s + (a ? (a.isInterleavedBufferAttribute ? a.data.array : a.array).byteLength : 0), 0);
  function queueUploads(k) {
    if (!warmUploads || uploadsDone.has(k) || uploadQueue.includes(k)) return;
    uploadQueue.push(k); scheduleUploads();
  }
  function scheduleUploads() {
    if (!framed || uploadScheduled || disposed || (!uploading && !uploadQueue.length)) return;
    uploadScheduled = true; idle(runUploads, { timeout: 1000 });
  }
  function uploadTasks(k) {
    const tasks = [];
    for (const name of stepPages(k)) for (const texture of Object.values(pages.get(name) ?? {})) tasks.push({ texture, bytes: texture.image.width * texture.image.height * 4 });
    for (const m of steps.get(k).meshes) tasks.push({ geometry: m.geometry, material: m.material, receive: m.receiveShadow, bytes: bytesOf(m.geometry) });
    if (featureWarmMaterial) for (const slots of Object.values(meta.featureSteps[k] ?? {})) for (const id of slots) {
      if (!id || warmedFeatureIds.has(id)) continue;
      warmedFeatureIds.add(id);
      const g = geometry(id).geometry;
      tasks.push({ geometry: g, material: featureWarmMaterial, receive: true, bytes: bytesOf(g) });
    }
    return tasks;
  }
  function warmDraw(batch) {
    const target = renderer.getRenderTarget(), shadow = renderer.shadowMap, { autoUpdate, needsUpdate } = shadow, counts = { ...renderer.info.render };
    const proxies = batch.map(t => { const p = new THREE.Mesh(t.geometry, t.material); p.frustumCulled = false; p.receiveShadow = t.receive; p.layers.set(WARM_LAYER); scene.add(p); return p; });
    // Every light the frame sees, so the light state (part of the program choice) matches the frame's.
    scene.traverse(o => { if (o.isLight && o.layers.test(camera.layers)) o.layers.enable(WARM_LAYER); });
    warmCamera.copy(camera); warmCamera.layers.set(WARM_LAYER);
    shadow.autoUpdate = false; shadow.needsUpdate = false;
    try { renderer.setRenderTarget(warmTarget); renderer.render(scene, warmCamera); }
    finally {
      renderer.setRenderTarget(target); shadow.autoUpdate = autoUpdate; shadow.needsUpdate = needsUpdate;
      for (const p of proxies) p.removeFromParent();
      Object.assign(renderer.info.render, counts);
    }
    uploadStats.draws++;
  }
  function runUploads(deadline) {
    uploadScheduled = false;
    if (disposed) return;
    const start = now(), budget = deadline.didTimeout ? WARM_SLOT_MS : Math.min(WARM_SLOT_MS, deadline.timeRemaining());
    let batch = [], batchBytes = 0, ran = 0;
    const predict = bytes => WARM_DRAW_MS + bytes * msPerByte;
    const flush = () => {
      if (!batch.length) return;
      const t0 = now(); warmDraw(batch); const ms = now() - t0;
      if (batchBytes >= 1 << 20) msPerByte = Math.max(msPerByte, ms / batchBytes);
      uploadStats.maxTaskMs = Math.max(uploadStats.maxTaskMs, ms); batch = []; batchBytes = 0;
    };
    while (true) {
      if (!uploading) {
        const k = uploadQueue.shift();
        if (k === undefined) break;
        if (!steps.has(k)) continue;
        uploading = { k, tasks: uploadTasks(k), started: now(), ms: 0 };
      }
      if (!steps.has(uploading.k)) { uploading = null; continue; }
      const task = uploading.tasks[0];
      if (!task) { const t0 = now(); flush(); uploading.ms += now() - t0; uploadsDone.add(uploading.k); uploadStats.steps.push({ k: uploading.k, ms: +uploading.ms.toFixed(1) }); uploading = null; continue; }
      const cost = task.texture ? task.bytes * msPerByte : predict(batchBytes + task.bytes) - (batch.length ? predict(batchBytes) : 0);
      // The first task of a full-length (or overdue) slot always runs, so a task predicted over the budget still goes.
      if ((ran || batch.length || (!deadline.didTimeout && budget < WARM_SLOT_MS - 1)) && now() - start + (batch.length ? predict(batchBytes) : 0) + cost > budget) break;
      uploading.tasks.shift(); ran++; uploadStats.tasks++; uploadStats.bytes += task.bytes;
      const t0 = now();
      if (task.texture) { renderer.initTexture(task.texture); const ms = now() - t0; uploadStats.maxTaskMs = Math.max(uploadStats.maxTaskMs, ms); if (task.bytes >= 1 << 20) msPerByte = Math.max(msPerByte, ms / task.bytes); }
      else { batch.push(task); batchBytes += task.bytes; }
      uploading.ms += now() - t0;
    }
    { const t0 = now(); flush(); if (uploading) uploading.ms += now() - t0; }
    const ms = now() - start;
    if (ran) {
      uploadStats.slots++; uploadStats.totalMs += ms; uploadStats.maxSlotMs = Math.max(uploadStats.maxSlotMs, ms);
      if (uploadStats.log.length < 500) uploadStats.log.push({ atMs: +start.toFixed(1), ms: +ms.toFixed(1), budgetMs: +budget.toFixed(1), timedOut: deadline.didTimeout });
      scheduleUploads();
    }
    // Nothing fitted this slot: wait before asking again, so short idle periods do not spin.
    else setTimeout(scheduleUploads, 100);
  }
  // First frame: start the prefetch and the upload warm (warm draws are not frames).
  scene.onAfterRender = (r, s, cam) => {
    if (cam === warmCamera || framed) return;
    framed = true;
    if (prefetch) idle(startPrefetch, { timeout: 2000 });
    scheduleUploads();
  };

  function info() {
    return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs.length };
  }
  function device() {
    const gl = renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info');
    return { renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      samples: gl.getParameter(gl.SAMPLES), width, height, drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], programs, background, shadowMapType: renderer.shadowMap.type, palette: 'photo', view, soil, tier: 'site',
      memoryProfile: { pixelRatio, maxPixelRatio, phone: isPhone, shadowMapSize: key.shadow.mapSize.x, shadowRadius: key.shadow.radius, blurTargetDepth: key.shadow.mapPass?.depthBuffer ?? null },
      camera: { verticalFov: 25, elevation: elevation * 180 / Math.PI, distance, target: target.toArray() },
      fixedSoilUnplacedTriangles: splitOther, paint: paintStats, timings, boundaryTextureBytes: textures.reduce((s, t) => s + t.image.data.byteLength, 0) };
  }
  function metadata() {
    return { resident: { packs: [...resident.keys()], pending: [...pendingPacks, ...[...pendingPages.keys()].map(n => `page:${n}`)], failed: Object.fromEntries(failedPacks),
      steps: [...steps.keys()].filter(stepResident).sort((a, b) => a - b), pages: [...pages.keys()], prefetch: { ...prefetchState, started: prefetchStarted } },
      builds: [...buildLog], buildSlots: [...buildSlots], uploads: { ...uploadStats, steps: [...uploadStats.steps], log: [...uploadStats.log], pending: [...(uploading ? [uploading.k] : []), ...uploadQueue], done: [...uploadsDone].sort((a, b) => a - b), msPerMiB: +(msPerByte * 1048576).toFixed(2) },
      anchorTable: { sourceHash: anchorTable?.sourceHash ?? null }, packTimings: { ...assets.timings }, programs: renderer.info.programs?.length ?? null };
  }
  function dispose() {
    prefetchStopped = true; disposed = true; warmTarget.dispose(); key.shadow.dispose();
    site.dispose();
    for (const p of resident.values()) for (const { geometry: g } of p.geometries.values()) g.dispose();
    for (const m of [...fixed, ...[...steps.values()].flatMap(s => s.meshes)]) { m.geometry.dispose(); m.removeFromParent(); }
    for (const m of materials.values()) m.dispose();
    for (const page of pages.values()) for (const tex of Object.values(page)) tex.dispose();
    for (const tex of textures) tex.dispose();
    depth.dispose(); neutral.dispose(); scene.background?.dispose?.();
    scene.traverse(o => { if (o.isMesh && !o.userData.eraSoil) { o.geometry.dispose(); o.material.dispose?.(); } });
    renderer.dispose();
  }
  return {
    renderer, scene, camera, info, device, metadata, dispose,
    // With background 'css' the page draws this behind the transparent canvas: BACKDROP's two-circle radial gradient
    // over a 512 square stretched to the viewport, with seeded dither; canvas(w, h) is the film's exact raster.
    // Under the pixel-ratio cap the raster takes the capped size, so it stays 1:1 with the drawing buffer.
    backdrop: { ...BACKDROP, canvas: (w, h) => { const [cw, ch] = capSize(w, h), t = backdrop(cw, ch), image = t.image; t.dispose(); return image; } },
    eraBlock: { base: meta.base, top: surfaceHeight(-12, -8), bottomY: levels.bottomY },
    eraDisplacement, eraSite: () => site, applyState, warmState, isResident, ensureState,
    // Interactive anchors (features interface): thin forwards to the driver.
    prepareAnchors: options => site.prepareAnchors(options),
    refineAnchors: options => site.refineAnchors(options),
    anchorStatus: () => site.anchorStatus(),
    prefetch: startPrefetch
  };
}
