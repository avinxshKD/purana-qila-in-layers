// Site tier soil look-dev (browser page, scripts/site-tier/soil-view.html; driver soil-view.cjs). One M1 world
// (createLookWorld, soil 'eras': the film reference) plus a site layer: the same soil drawn with the site material
// (src/site-tier/soil-material.js) on the site packs' geometry for walls, floors, step tops and fronts, and on the M1
// fixed top and outer faces (the same GPU-displaced geometry the site tier builds). Modes:
//   film          - M1 soil only
//   site          - site soil only
//   site-filmtop  - site soil with the M1 live top program on the top meshes (option B cost)
// Jobs: views (frames, G4 band means against film, crops) and timing (GPU TIME_ELAPSED per mode).
import * as THREE from 'three';
import { createLookWorld, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN } from '/src/museum-scene.js';
import { sceneForYear } from '/src/film/scene-year.js';
import { stepOf } from '/src/eras/excavation.js';
import { activeEra } from '/src/eras/stack.js';
import { eraDepositUniform, blockLevels } from '/src/eras/soil-block.js';
import { boundaryTextures, eraDepthMaterial } from '/src/eras/soil-shader.js';
import { loadSiteTierAssets } from '/src/site-tier/assets.js';
import { siteSoilMaterial, siteSoilUnifiedMaterial, pageTexture, composeTop, splitByPlane } from '/src/site-tier/soil-material.js';

const params = new URLSearchParams(location.search), W = Number(params.get('w') || 1440), H = Number(params.get('h') || 900);
// assets: site-tier asset folder (default the live /site-tier/); atlas: folder of the core and step atlas pages, which
// must come from the same build as the assets (default: bake).
// programs=merged: the site soil as one program per side (siteSoilUnifiedMaterial) instead of one per mode.
const soilMaterial = params.get('programs') === 'merged' ? siteSoilUnifiedMaterial : siteSoilMaterial;
const bakeDir = params.get('bake'), topDir = params.get('top'), assetBase = params.get('assets') ?? '/site-tier/', atlasDir = params.get('atlas') ?? bakeDir;
const round = (v, d = 2) => +Number(v).toFixed(d);
const canvas = document.createElement('canvas'); document.body.append(canvas);
const t0 = performance.now();
// msaa=0: the world's renderer without MSAA (film and site alike).
const world = createLookWorld(canvas, { width: W, height: H, antialias: params.get('msaa') !== '0', preserve: true, view: 'turntable', soil: 'eras' });
const worldMs = performance.now() - t0, { renderer, scene, camera } = world, gl = renderer.getContext();
const t1 = performance.now(), assets = await loadSiteTierAssets({ base: assetBase }), grid = await assets.grids(), core = await assets.core();
const levels = blockLevels(grid), textures = boundaryTextures(grid);
const uniforms = { eraB0: { value: textures[0] }, eraB1: { value: textures[1] }, eraB2: { value: textures[2] }, eraDeposits: { value: Array(10).fill(1) }, eraActive: { value: 9 } };
const depth = eraDepthMaterial({ grid, uniforms });
// Vite answers a missing file with the index page (HTTP 200), so check the type; '+' stays literal in paths.
const json = async url => { const r = await fetch(url); if (!r.ok || !/json/.test(r.headers.get('content-type') ?? '')) throw new Error(`${url}: HTTP ${r.status} ${r.headers.get('content-type')}`); return r.json(); };
const image = async url => { const i = new Image(); i.src = url; await i.decode(); return i; };
const meta = { top: await json(`${topDir}/top-all.json`), floorXz: await json(`${bakeDir}/floorXz-all.json`) };
for (const p of ['z+', 'z-', 'x+', 'x-']) meta[p] = await json(`${bakeDir}/plane-${p}.json`);
const setupMs = performance.now() - t1;

// Pages per set ('full' 2 cm, 'half' 4 cm, same uv), WebP q 0.9; 'png' is the 2 cm lossless reference.
const pageCache = new Map();
async function pages(set) {
  if (pageCache.has(set)) return pageCache.get(set);
  // 'albedo-q80': 2 cm, albedo pages at WebP q .8 (normals, top and the floor-xz comparison page, baked at q .9 only, q .9).
  const t = performance.now(), sub = set === 'half' ? '/half' : '', at = (dir, name, map) => `${dir}${sub}/${name}-${map}${set === 'png' ? '.png' : set === 'albedo-q80' && map === 'albedo' && name !== 'floor-xz' ? '-q80.webp' : '-q90.webp'}`;
  const pair = async (dir, name) => ({ albedo: pageTexture(await image(at(dir, name, 'albedo')), { srgb: true }), normal: pageTexture(await image(at(dir, name, 'normal'))) });
  const out = { top: { top: pageTexture(composeTop(...await Promise.all(['variation', 'gradX', 'gradZ'].map(m => image(at(topDir, 'top', m)))))) } };
  for (const p of ['z+', 'z-', 'x+', 'x-', 'floor-xz']) out[p] = await pair(bakeDir, p);
  out.core = await pair(atlasDir, 'core');
  for (let k = 1; k <= 11; k++) out[`step-${k}`] = await pair(atlasDir, `step-${k}`);
  out.loadMs = performance.now() - t; pageCache.set(set, out); return out;
}
let current = await pages('full'), currentSet = 'full';
const topOptions = { albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN, gradientMax: meta.top.gradientMax };
const common = { grid, uniforms, bottomY: levels.bottomY, fadeStartY: levels.fadeStartY, top: topOptions };
const materials = new Map();
// One material per (mode, mapping, page name, displaced); page textures are swapped in place on set changes.
function material(mode, texture, displaced = false, mappingOverride = null) {
  const key = `${mode}|${texture}|${displaced}|${mappingOverride ? 'planar' : ''}`;
  if (materials.has(key)) return materials.get(key).material;
  const mapping = mappingOverride ?? (texture === 'top-xz' ? meta.top.plane : meta[texture]?.plane ?? 'uv');
  const name = texture === 'top-xz' ? 'top' : texture;
  const m = soilMaterial({ ...common, mode, mapping, displaced, pages: texture === 'top-xz' ? current.top : current[name] });
  materials.set(key, { material: m, name }); return m;
}
function useSet(set) { return pages(set).then(p => { current = p; currentSet = set; for (const { material: m, name } of materials.values()) { const u = m.userData.siteUniforms, src = name === 'top' ? p.top : p[name]; for (const k of Object.keys(u)) if (k === 'siteTop') u.siteTop.value = src.top; else if (k === 'siteAlbedo') u.siteAlbedo.value = src.albedo; else if (k === 'siteNormal') u.siteNormal.value = src.normal; } }); }

const site = new THREE.Group(); site.name = 'site-tier-soil'; scene.add(site);
const filmByName = () => { const m = new Map(); scene.traverse(o => { if (o.isMesh && o.userData.eraSoil) m.set(o.name, o); }); return m; };
const siteMeshes = []; // { mesh, isTop, show(k) }
// Pack geometries carry no normals; vertex normals only feed the shadow normal bias (lighting uses flat normals and the
// baked normal). M1 geometries are shared with the film meshes and left untouched.
const addSite = (geometry, mat, { isTop, show, displaced = false, name, pack = false }) => {
  if (pack && !geometry.attributes.normal) geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.name = name; mesh.visible = false;
  if (displaced) { mesh.customDepthMaterial = depth; mesh.frustumCulled = false; }
  site.add(mesh); siteMeshes.push({ mesh, isTop, show }); return mesh;
};
const normalsMs = { computed: 0 };
{
  const film = filmByName(), split = { other: 0 };
  addSite(film.get('era-top').geometry, material('top', 'top-xz', true), { isTop: true, show: () => true, displaced: true, name: 'site-top' });
  addSite(film.get('era-top-margins').geometry, material('top', 'top-xz', true), { isTop: true, show: k => k === 0, displaced: true, name: 'site-top-margins' });
  for (const [src, show] of [['era-outer', () => true], ['era-outer-margins', k => k === 0]]) for (const [plane, g] of Object.entries(splitByPlane(film.get(src).geometry))) {
    if (plane === 'other') { split.other += g.index.count / 3; continue; }
    addSite(g, material('outer', plane, true), { isTop: false, show, displaced: true, name: `site-${src}-${plane}` });
  }
  meta.splitOtherTriangles = split.other;
  addSite(core.geometries.get('soil:pedestal').geometry, material('inner', 'core'), { isTop: false, show: () => true, name: 'site-pedestal', pack: true });
}
const loadedSteps = new Map();
let floors2cm = null;
async function ensureStep(k) {
  if (k === 0 || loadedSteps.has(k)) return;
  const s = await assets.step(k), t = performance.now();
  for (const id of core.meta.soilSteps[k]) {
    const { geometry, record } = s.geometry(id), part = id.split(':')[2];
    const mesh = addSite(geometry, material(record.mode, record.texture), { isTop: part === 'top', show: kk => kk === k, name: `site-${id}`, pack: true });
    if (k === 12 && part === 'floors') floors2cm = { mesh, atlas: mesh.material, planar: material('floor', 'floor-xz', false, meta.floorXz.plane) };
  }
  normalsMs.computed += performance.now() - t;
  loadedSteps.set(k, true);
}

let k = 0, mode = 'film', filmVisible = new Map();
async function apply(year) {
  const state = sceneForYear(year); k = stepOf(state.excavation); await ensureStep(k);
  world.applyState(state);
  const d = eraDepositUniform(state.deposits); uniforms.eraDeposits.value = d; uniforms.eraActive.value = activeEra(d);
  filmVisible = new Map(); for (const [name, m] of filmByName()) filmVisible.set(m, m.visible);
  setMode(mode);
  return { year, k, eraActive: uniforms.eraActive.value };
}
const isFilmTop = m => /^era-top/.test(m.name);
function setMode(next) {
  mode = next;
  for (const [m, v] of filmVisible) m.visible = v && (mode === 'film' || (mode === 'site-filmtop' && isFilmTop(m)));
  for (const s of siteMeshes) s.mesh.visible = s.show(k) && mode !== 'film' && !(mode === 'site-filmtop' && s.isTop);
  renderer.shadowMap.needsUpdate = true;
}
function place(distance) {
  const az = 35 * Math.PI / 180, el = 27 * Math.PI / 180, t = [-1.4, -3.85, 0];
  camera.position.set(t[0] + distance * Math.cos(el) * Math.sin(az), t[1] + distance * Math.sin(el), t[2] + distance * Math.cos(el) * Math.cos(az)); camera.lookAt(...t); camera.updateMatrixWorld();
}
// Every frame sets autoClear itself instead of relying on the state another pass left behind.
const frame = () => { renderer.autoClear = true; renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); return canvas.toDataURL('image/png').split(',')[1]; };
async function decode(b64) {
  const img = await createImageBitmap(await (await fetch('data:image/png;base64,' + b64)).blob());
  const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0); return { data: x.getImageData(0, 0, img.width, img.height).data, width: img.width, height: img.height, bitmap: img };
}
// CIEDE2000 on band means: sRGB bytes -> linear mean -> XYZ (D65) -> Lab.
const toLinear = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
function lab([r, g, b]) {
  const X = (.4124564 * r + .3575761 * g + .1804375 * b) / .95047, Y = .2126729 * r + .7151522 * g + .0721750 * b, Z = (.0193339 * r + .1191920 * g + .9503041 * b) / 1.08883;
  const q = t => t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116, fx = q(X), fy = q(Y), fz = q(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function deltaE2000([L1, a1, b1], [L2, a2, b2]) {
  const rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2, G = .5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (a, b) => { if (a === 0 && b === 0) return 0; const v = Math.atan2(b, a) / rad; return v < 0 ? v + 360 : v; };
  const h1 = h(a1p, b1), h2 = h(a2p, b2), dL = L2 - L1, dC = C2p - C1p;
  let dh = 0; if (C1p * C2p !== 0) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh / 2 * rad), Lm = (L1 + L2) / 2, Cpm = (C1p + C2p) / 2;
  let hm = h1 + h2; if (C1p * C2p !== 0) { if (Math.abs(h1 - h2) > 180) hm += h1 + h2 < 360 ? 360 : -360; hm /= 2; }
  const T = 1 - .17 * Math.cos((hm - 30) * rad) + .24 * Math.cos(2 * hm * rad) + .32 * Math.cos((3 * hm + 6) * rad) - .2 * Math.cos((4 * hm - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2)), RC = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const SL = 1 + .015 * (Lm - 50) ** 2 / Math.sqrt(20 + (Lm - 50) ** 2), SC = 1 + .045 * Cpm, SH = 1 + .015 * Cpm * T, RT = -Math.sin(2 * dTheta * rad) * RC;
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
const MODES = ['outer', 'inner', 'floor', 'top'];
// Band key per pixel from the M1 id pass: mode/era, only where the pixel and its 4 neighbours share the id.
function bandKeys(ids) {
  const { data, width, height } = ids, key = new Int32Array(width * height).fill(-1);
  const id = i => data[4 * i + 1] === 255 && data[4 * i] % 20 === 0 && data[4 * i] <= 200 ? (data[4 * i + 2] >> 2) * 16 + data[4 * i] / 20 : -1;
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const i = y * width + x, v = id(i); if (v < 0) continue;
    if (id(i - 1) === v && id(i + 1) === v && id(i - width) === v && id(i + width) === v) key[i] = v;
  }
  return key;
}
function bandMeans(img, key) {
  const sums = new Map();
  for (let i = 0; i < key.length; i++) { if (key[i] < 0) continue; let s = sums.get(key[i]); if (!s) sums.set(key[i], s = [0, 0, 0, 0]); for (let c = 0; c < 3; c++) s[c] += toLinear(img.data[4 * i + c]); s[3]++; }
  return sums;
}
// Crop window (cw x ch) with the most pixels of the given surface mode, from the id pass (integral image, step 8 px).
function bestWindow(key, width, height, modeName, cw, ch) {
  const m = MODES.indexOf(modeName), I = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) { let row = 0; for (let x = 0; x < width; x++) { const v = key[y * width + x]; row += v >= 0 && v >> 4 === m ? 1 : 0; I[(y + 1) * (width + 1) + x + 1] = I[y * (width + 1) + x + 1] + row; } }
  let best = { x: 0, y: 0, count: -1 };
  for (let y = 0; y + ch <= height; y += 8) for (let x = 0; x + cw <= width; x += 8) {
    const c = I[(y + ch) * (width + 1) + x + cw] - I[y * (width + 1) + x + cw] - I[(y + ch) * (width + 1) + x] + I[y * (width + 1) + x];
    if (c > best.count) best = { x, y, count: c };
  }
  return { ...best, share: round(best.count / (cw * ch), 3) };
}
async function sideBySide(images, rect) {
  const gap = 6, c = new OffscreenCanvas(images.length * rect.w + (images.length - 1) * gap, rect.h), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  images.forEach((img, i) => x.drawImage(img.bitmap, rect.x, rect.y, rect.w, rect.h, i * (rect.w + gap), 0, rect.w, rect.h));
  const blob = await c.convertToBlob({ type: 'image/png' }), bytes = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < bytes.length; i += 32768) s += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(s);
}

// Diagnostic variant switches: receive / cast false on the site meshes (under VSM a receiver is also drawn into the map,
// so cast false alone changes nothing); flatTop replaces the top page by a neutral texel (variation 1, no relief
// gradient); shadows false turns the key shadow off for every mesh; output 'albedo' writes diffuseColor (sRGB-encoded,
// unlit) and 'flatnormal' drops the relief gradient (film) and the baked normal (site) so both light the flat normal.
// The output switch is a harness-only wrapper on the film and site soil programs.
const flat = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1); flat.needsUpdate = true;
const viewDebug = { value: 0 }, OUTPUTS = { lit: 0, albedo: 1, flatnormal: 2, toppage: 3, topterms: 4 };
function wrapDebug(m) {
  if (m.userData.viewDebugWrapped) return; m.userData.viewDebugWrapped = true;
  const before = m.onBeforeCompile, key = m.customProgramCacheKey;
  m.onBeforeCompile = (shader, r) => {
    before.call(m, shader, r); shader.uniforms.viewDebug = viewDebug;
    let s = 'uniform int viewDebug;\n' + shader.fragmentShader;
    const swaps = [['vec3 viewGradient=mat3(viewMatrix)*strataReliefGradient;', 'vec3 viewGradient=viewDebug==2?vec3(0.0):mat3(viewMatrix)*strataReliefGradient;'],
      ['vec3 viewGradient=mat3(viewMatrix)*siteGradient;', 'vec3 viewGradient=viewDebug==2?vec3(0.0):mat3(viewMatrix)*siteGradient;'],
      ['normal=normalize(mat3(viewMatrix)*siteWorldNormal);', 'if(viewDebug!=2) normal=normalize(mat3(viewMatrix)*siteWorldNormal);']];
    let hits = 0; for (const [a, b] of swaps) if (s.includes(a)) { s = s.replace(a, b); hits++; }
    if (hits !== 1) throw new Error(`view debug: ${hits} normal hooks in ${m.name || 'material'}`);
    // Top only: 'toppage' writes the sampled page (r variation / 2, g, b gradient); 'topterms' writes r veneer, g base fade.
    const topHook = 'vec4 sitePage=texture(siteTop,';
    const topOut = s.includes(topHook) ? 'if(viewDebug==3) gl_FragColor=vec4(sitePage.rgb,1.0); if(viewDebug==4) gl_FragColor=vec4(veneer,smoothstep(' + 'SITE_FADE' + '),0.0,1.0);\n' : '';
    const fade = s.match(/smoothstep\(([-\d.]+,[-\d.]+),P\.y\)\);\n\s*vec3 siteGradient/);
    if (topOut && !fade) throw new Error('view debug: top fade hook not found');
    const end = s.lastIndexOf('}');
    shader.fragmentShader = s.slice(0, end) + 'if(viewDebug==1) gl_FragColor=vec4(pow(max(diffuseColor.rgb,vec3(0.0)),vec3(1.0/2.2)),1.0);\n' + (fade ? topOut.replace('SITE_FADE', fade[1] + ',P.y') : '') + s.slice(end);
  };
  m.customProgramCacheKey = () => key.call(m) + '-view-debug'; m.needsUpdate = true;
}
let debugWrapped = false;
// shadowSize / shadowRadius / blurDepth: the key light's VSM map size, blur radius (texels) and whether its blur target
// has a depth buffer (three's default does); omitted means the world's own values.
function keyShadow({ shadowSize = null, shadowRadius = null, blurDepth = true }) {
  scene.traverse(o => {
    if (!o.isDirectionalLight || !o.shadow) return;
    const s = o.shadow; s.userData ??= {}; s.userData.view ??= { size: s.mapSize.x, radius: s.radius };
    const size = shadowSize ?? s.userData.view.size, radius = shadowRadius ?? s.userData.view.radius, depthless = blurDepth === false;
    if (s.mapSize.x === size && s.radius === radius && !!s.userData.depthless === depthless) return;
    s.map?.dispose(); s.mapPass?.dispose(); s.map = null; s.mapPass = null;
    s.mapSize.set(size, size); s.radius = radius; s.userData.depthless = depthless;
    if (depthless) s.mapPass = new THREE.WebGLRenderTarget(size, size, { format: THREE.RGFormat, type: THREE.HalfFloatType, depthBuffer: false });
    s.needsUpdate = true;
  });
}
function diagnose({ receive = true, cast = true, flatTop = false, shadows = true, output = 'lit', hide = null, hideOthers = false, shadowSize = null, shadowRadius = null, blurDepth = true }) {
  keyShadow({ shadowSize, shadowRadius, blurDepth });
  if (hide) for (const s of siteMeshes) if (new RegExp(hide).test(s.mesh.name)) s.mesh.visible = false;
  // hideOthers: hide every mesh that is neither era soil (film) nor in the site layer (features, ring, plinth, ground).
  scene.traverse(o => { if (o.isMesh && !o.userData.eraSoil && o.parent !== site) { o.userData.viewVisible ??= o.visible; o.visible = hideOthers ? false : o.userData.viewVisible; } });
  // Materials made after the first debug variant (cut steps load lazily) are wrapped when they are first needed.
  if (output !== 'lit' || debugWrapped) { debugWrapped = true; for (const m of filmByName().values()) wrapDebug(m.material); for (const { material: m } of materials.values()) wrapDebug(m); }
  viewDebug.value = OUTPUTS[output];
  for (const s of siteMeshes) { s.mesh.receiveShadow = receive; s.mesh.castShadow = cast; }
  scene.traverse(o => { if (o.isDirectionalLight && o.shadow) { o.userData.viewCast ??= o.castShadow; o.castShadow = shadows && o.userData.viewCast; } });
  for (const { material: m, name } of materials.values()) if (name === 'top') m.userData.siteUniforms.siteTop.value = flatTop ? flat : current.top.top;
  for (const { material: m } of materials.values()) m.needsUpdate = true;
}
const jobs = {
  // Visible meshes per mode for one year (name, era soil, site layer, triangles, shadow roles).
  async inventory({ year }) {
    await apply(year); const out = { year, k, modes: {} };
    for (const m of ['film', 'site']) {
      setMode(m); const list = [];
      scene.traverseVisible(o => { if (o.isMesh) list.push({ name: o.name, eraSoil: !!o.userData.eraSoil, site: site.children.includes(o), material: o.material.type, triangles: (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 }); });
      out.modes[m] = list;
    }
    const names = new Map(); scene.traverse(o => { if (o.isMesh && o.userData.eraSoil) names.set(o.name, (names.get(o.name) ?? 0) + 1); });
    out.duplicateEraSoilNames = [...names].filter(([, n]) => n > 1);
    setMode('film'); return out;
  },
  // view: { id, year, distance, variants: [{ name, mode, set?, floors? }], crops: [{ surface, w, h }] }. The first variant
  // is the reference for G4 (must be 'film'); the id pass is taken in film mode.
  async view(v) {
    await apply(v.year); place(v.distance);
    setMode('film'); const ids = await decode(world.eraIds().png); place(v.distance);
    const key = bandKeys(ids), out = { id: v.id, year: v.year, k, eraActive: uniforms.eraActive.value, distance: v.distance, size: [W, H], frames: {}, g4: {}, crops: {} };
    const decoded = {};
    for (const variant of v.variants) {
      if (variant.set && variant.set !== currentSet) await useSet(variant.set);
      if (floors2cm) floors2cm.mesh.material = variant.floors === '2cm' ? floors2cm.planar : floors2cm.atlas;
      setMode(variant.mode); place(v.distance); diagnose(variant);
      const png = frame(); diagnose({}); out.frames[variant.name] = png; decoded[variant.name] = await decode(png);
    }
    await useSet('full'); if (floors2cm) floors2cm.mesh.material = floors2cm.atlas; setMode('film');
    const ref = bandMeans(decoded[v.variants[0].name], key);
    for (const variant of v.variants.slice(1)) {
      const means = bandMeans(decoded[variant.name], key), rows = [];
      for (const [kk, s] of ref) {
        if (s[3] < 400) continue; const t = means.get(kk);
        const a = lab(s.slice(0, 3).map(x => x / s[3])), b = lab(t.slice(0, 3).map(x => x / t[3]));
        rows.push({ band: `${MODES[kk >> 4]} era-index ${kk & 15}`, pixels: s[3], dE2000: round(deltaE2000(a, b)), refLab: a.map(x => round(x, 1)), lab: b.map(x => round(x, 1)) });
      }
      rows.sort((p, q) => q.dE2000 - p.dE2000); out.g4[variant.name] = { maxDE2000: rows[0]?.dE2000 ?? null, bands: rows };
    }
    for (const c of v.crops ?? []) {
      const win = bestWindow(key, W, H, c.surface, c.w, c.h), rect = { x: win.x, y: win.y, w: c.w, h: c.h };
      out.crops[`${c.surface}`] = { window: win, variants: v.variants.map(x => x.name), png: await sideBySide(v.variants.map(x => decoded[x.name]), rect) };
    }
    return out;
  },
  // GPU frame time per mode (shadow map rebuilt once per mode, then frozen), at the given render scales.
  async timing({ year, distance, scales = [1, 2] }) {
    const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2'); if (!ext) throw new Error('no timer query');
    await apply(year); place(distance); renderer.shadowMap.autoUpdate = false; renderer.autoClear = true;
    const time = async () => {
      renderer.render(scene, camera); const out = [];
      for (let i = 0; i < 9; i++) {
        const q = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, q); renderer.render(scene, camera); gl.endQuery(ext.TIME_ELAPSED_EXT);
        while (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) await new Promise(r => requestAnimationFrame(r));
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT), ns = gl.getQueryParameter(q, gl.QUERY_RESULT); gl.deleteQuery(q);
        if (!disjoint && i >= 2) out.push(ns / 1e6);
      }
      out.sort((a, b) => a - b); return { medianMs: round(out[out.length >> 1], 3), minMs: round(out[0], 3), samples: out.length };
    };
    const res = {};
    for (const s of scales) {
      renderer.setSize(W * s, H * s, false); const r = res[`${W * s}x${H * s}`] = {};
      // Interleaved, three rounds, so clock drift does not favour one mode.
      for (let round_ = 0; round_ < 3; round_++) for (const m of ['film', 'site', 'site-filmtop']) {
        setMode(m); renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); renderer.shadowMap.needsUpdate = false;
        (r[m] ??= []).push(await time());
      }
      for (const m of Object.keys(r)) r[m] = { medianOfRoundsMs: round([...r[m].map(x => x.medianMs)].sort((a, b) => a - b)[1], 3), rounds: r[m] };
    }
    renderer.setSize(W, H, false); renderer.shadowMap.autoUpdate = true; setMode('film');
    return { year, distance, k, timings: res, note: 'GPU TIME_ELAPSED over renderer.render (beauty pass, shadow map frozen after one update per mode); per round the median of 7 after 2 warm-ups; three interleaved rounds.' };
  }
};
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.view = { ready: true, info: { worldMs: round(worldMs), setupMs: round(setupMs), pagesLoadMs: round(current.loadMs), size: [W, H], gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null, splitOtherTriangles: meta.splitOtherTriangles },
  async run(job) { const r = await jobs[job.kind](job); r.programs = renderer.info.programs.length; r.normalsMs = round(normalsMs.computed); return r; } };
