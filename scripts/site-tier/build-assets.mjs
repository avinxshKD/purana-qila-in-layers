// Site tier asset builder (CPU, deterministic): precomputes what the site would otherwise build from source at load
// (about 7 s of main-thread CPU for M1), into content-hashed packs under public/site-tier/ plus manifest.json.
//   grids   - the 11 M1 boundary grids (int16 row deltas at 0.25 mm), for the GPU top displacement coefficients.
//   core    - the default site view (2023, cut step 12): step-12 soil meshes, ring well, the feature geometry used at
//             step 12, feature paint textures, the per-step feature table.
//   step-k  - soil meshes of cut step k (k >= 1) and the feature geometry step k needs beyond core.
// fixed soil - the fixed top, margin top and outer faces (soil-block.js fixedGeometry, exact M1 geometry) as lattice
//             indices and float32 heights (src/site-tier/fixed-soil.js); the margins only show uncut, so they ride in step-0.
// Static soil meshes are simplified with the meshoptimizer simplifier shipped with
// three (examples/jsm/libs, MIT), borders locked so seams stay closed, at an absolute error (M). Feature geometry is
// packed dense, indexed by identical vertices. Every size here is a modelling decision (M).
// Usage: node scripts/site-tier/build-assets.mjs [--report <dir>] [--wall-texel <m>] [--floor-texel <m>] [--core-floor-texel <m>]  -> public/site-tier/*, <dir>/build-assets.json
//   (default dir output/lookdev/modelling/site-tier/; an existing report there is never replaced)
import { writeFileSync, readFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { MeshoptSimplifier } from 'three/examples/jsm/libs/meshopt_simplifier.module.js';
import { siteBoundaryGrids, createEraSite } from '../../src/eras/site-state.js';
import { createSoilBlock, fixedGeometry } from '../../src/eras/soil-block.js';
import { BLOCK } from '../../src/eras/excavation.js';
import { SEATING } from '../../src/eras/seating.js';
import { RING_WELL } from '../../src/eras/layout.js';
import { createLayerTable, surfaceHeight } from '../../src/layers.js';
import { ringSection } from '../../src/section-geometry.js';
import { PALETTES } from '../../src/palettes.js';
import { TOP_CHARACTER, FLOOR_CHARACTER, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN } from '../../src/museum-scene.js';
import { createPackWriter, encodeGrids } from '../../src/site-tier/pack.js';
import { encodeFixedSoil } from '../../src/site-tier/fixed-soil.js';
import { buildCharts, partitionByReference, subsetGeometry, applyReferenceCharts, weld } from './uv-charts.mjs';

// --out: asset folder (default public/site-tier/, the live site assets); trial builds pass a scratch folder.
const root = fileURLToPath(new URL('../../', import.meta.url)), OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1].replace(/[\\/]?$/, '/') : root + 'public/site-tier/', REPORT = (process.argv.includes('--report') ? process.argv[process.argv.indexOf('--report') + 1].replace(/[\\/]?$/, '/') : root + 'output/lookdev/modelling/site-tier/');
if (existsSync(REPORT + 'build-assets.json')) throw new Error(`${REPORT}build-assets.json exists; pass a new --report folder`);
const SOIL_ERROR_METRES = .001, GRID_UNIT_METRES = .00025, DEFAULT_STEP = 12;
// Baked soil texture density (M): metres per texel on dug walls and on floors.
const arg = name => process.argv.includes(name) ? Number(process.argv[process.argv.indexOf(name) + 1]) : null;
// The core atlas (the first view) may carry its own, finer floor density; step atlases keep FLOOR_TEXEL_METRES.
const WALL_TEXEL_METRES = arg('--wall-texel') ?? .02, FLOOR_TEXEL_METRES = arg('--floor-texel') ?? .04, CORE_FLOOR_TEXEL_METRES = arg('--core-floor-texel') ?? FLOOR_TEXEL_METRES;
const BAKE = REPORT + 'bake-input/';
mkdirSync(OUT, { recursive: true }); mkdirSync(REPORT, { recursive: true });
await MeshoptSimplifier.ready;
const t0 = performance.now(), report = { soilErrorMm: SOIL_ERROR_METRES * 1000, gridUnitMm: GRID_UNIT_METRES * 1000, packs: {}, soil: {}, features: {} };

const stack = siteBoundaryGrids(), scene = new THREE.Scene();
const block = createSoilBlock({ stack, outputScale: 1, parent: scene, top: { character: TOP_CHARACTER, albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN }, floor: { character: FLOOR_CHARACTER } });
for (let k = 1; k <= block.cutSteps; k++) block.warm(k);
const site = createEraSite({ outputScale: 1 });
const meshByName = Object.fromEntries(block.meshes().map(m => [m.name, m]));

// Chart uv rides along: meshopt keeps a subset of the source vertices, and a chart's uv is a planar map of position.
// A simplified triangle can fold over in its chart's projection (its uv winding flips) although it stays within the
// error in 3D (threshold: 1e-9 of the page area, about 1e-3 texel squared, so collinear source slivers do not count); the dense vertices under each folded triangle's uv box are then locked and the mesh simplified again.
const uvArea = (uv, a, b, c) => (uv[2 * b] - uv[2 * a]) * (uv[2 * c + 1] - uv[2 * a + 1]) - (uv[2 * b + 1] - uv[2 * a + 1]) * (uv[2 * c] - uv[2 * a]);
function simplifyUnfolded(idx, pos, uv) {
  const n = pos.length / 3, lock = new Uint8Array(n), none = new Float32Array(0);
  let ix, error, passes = 0, folds = 0;
  for (; ; passes++) {
    [ix, error] = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, none, 0, [], uv ? lock : null, 0, SOIL_ERROR_METRES, ['LockBorder', 'ErrorAbsolute']);
    if (!uv) break;
    const folded = [];
    for (let t = 0; t < ix.length; t += 3) if (uvArea(uv, ix[t], ix[t + 1], ix[t + 2]) < -1e-9) folded.push(t);
    if (passes === 0) folds = folded.length;
    if (!folded.length) break;
    if (passes === 8) throw new Error(`${folded.length} folded triangles after ${passes} passes`);
    for (const t of folded) {
      // The box grows with every pass, so a fold whose cause lies just outside its own box is still reached.
      const us = [0, 1, 2].map(s => uv[2 * ix[t + s]]), vs = [0, 1, 2].map(s => uv[2 * ix[t + s] + 1]), m = passes * Math.max(Math.max(...us) - Math.min(...us), Math.max(...vs) - Math.min(...vs));
      const u0 = Math.min(...us) - m, u1 = Math.max(...us) + m, v0 = Math.min(...vs) - m, v1 = Math.max(...vs) + m;
      for (let i = 0; i < n; i++) if (uv[2 * i] >= u0 && uv[2 * i] <= u1 && uv[2 * i + 1] >= v0 && uv[2 * i + 1] <= v1) lock[i] = 1;
    }
  }
  return { ix, error, passes, folds, locked: lock.reduce((s, v) => s + v, 0) };
}
function simplified(geometry) {
  const pos = Float32Array.from(geometry.attributes.position.array), idx = Uint32Array.from(geometry.index.array), uv = geometry.attributes.uv?.array;
  const { ix, error, passes, folds, locked } = simplifyUnfolded(idx, pos, uv);
  const remap = new Map(), p = [], q = [], index = new Uint32Array(ix.length);
  for (let i = 0; i < ix.length; i++) { let v = remap.get(ix[i]); if (v === undefined) { v = p.length / 3; remap.set(ix[i], v); p.push(pos[3 * ix[i]], pos[3 * ix[i] + 1], pos[3 * ix[i] + 2]); if (uv) q.push(uv[2 * ix[i]], uv[2 * ix[i] + 1]); } index[i] = v; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(q, 2)); g.setIndex(new THREE.BufferAttribute(index, 1));
  return { geometry: g, errorMm: +(error * 1000).toFixed(3), dense: idx.length / 3, triangles: ix.length / 3, ...(uv ? { foldedFirstPass: folds, passes, lockedVertices: locked } : {}) };
}
// Soil texture atlases. 'core' holds the step-12 walls and floors and the ring pedestal; 'step-k' holds the floors of
// step k and the walls of step k that are not step-12 wall triangles (those use 'core'). Outer faces, step fronts and
// the active top use world-planar pages, not atlases. Each atlas also gets a bake input: the dense charted meshes.
const atlases = {}, charted = {};
{
  const ped = weld(meshByName['era-ring-pedestal'].geometry);
  const core = buildCharts([{ geometry: meshByName['era-walls-step-12'].geometry, texelMetres: WALL_TEXEL_METRES }, { geometry: meshByName['era-floors-step-12'].geometry, texelMetres: CORE_FLOOR_TEXEL_METRES }, { geometry: ped, texelMetres: WALL_TEXEL_METRES }]);
  atlases.core = core; charted[12] = { walls: core.meshes[0].geometry, floors: core.meshes[1].geometry, atlas: 'core' }; charted.pedestal = core.meshes[2].geometry;
  for (let k = 1; k < block.cutSteps; k++) {
    const walls = meshByName[`era-walls-step-${k}`].geometry, { shared, rest } = partitionByReference(walls, core.meshes[0]);
    const page = buildCharts([{ geometry: subsetGeometry(walls, rest), texelMetres: WALL_TEXEL_METRES }, { geometry: meshByName[`era-floors-step-${k}`].geometry, texelMetres: FLOOR_TEXEL_METRES }]);
    atlases[`step-${k}`] = page;
    charted[k] = { wallsCore: applyReferenceCharts(walls, shared, core.meshes[0]), walls: page.meshes[0].geometry, floors: page.meshes[1].geometry, atlas: `step-${k}` };
  }
}
const atlasMeta = Object.fromEntries(Object.entries(atlases).map(([name, a]) => [name, { width: a.width, height: a.height, wallTexelMetres: WALL_TEXEL_METRES, floorTexelMetres: name === 'core' ? CORE_FLOOR_TEXEL_METRES : FLOOR_TEXEL_METRES }]));
report.atlases = Object.fromEntries(Object.entries(atlases).map(([name, a]) => [name, { width: a.width, height: a.height, occupancy: +a.occupancy.toFixed(3),
  gpuMbRgba8TwoPagesMips: +(a.width * a.height * 8 * 4 / 3 / 2 ** 20).toFixed(2), meshes: a.meshes.map(m => ({ ...m.stats, areaM2: +m.stats.areaM2.toFixed(2) })) }]));
// texture: 'top-xz' (world-planar top page), 'z+' (the z = +8 face page), or an atlas name (uv attribute).
const SOIL_PARTS = [['top', 'top', 'top'], ['walls-core', 'inner', 'cutface'], ['walls', 'inner', 'cutface'], ['floors', 'floor', 'floor'], ['front', 'outer', 'cutface']];
const soilParts = k => SOIL_PARTS.filter(([part]) => part !== 'walls-core' || k < DEFAULT_STEP).map(([part]) => part);
function addSoilStep(writer, k) {
  const list = [];
  for (const [part, mode, role] of SOIL_PARTS) {
    if (part === 'walls-core' && k === DEFAULT_STEP) continue;
    const id = `soil:${k}:${part}`;
    if (part === 'front') {
      const mesh = meshByName[`era-front-step-${k}`], g = new THREE.BufferGeometry(); g.setAttribute('position', mesh.geometry.attributes.position); g.setAttribute('normal', mesh.geometry.attributes.normal); g.setIndex(mesh.geometry.index);
      writer.geometry(id, g, { mode, role, texture: 'z+' }, { exactPositions: true });
      report.soil[id] = { triangles: mesh.geometry.index.count / 3, simplified: false };
    } else {
      const source = part === 'top' ? meshByName[`era-top-step-${k}`].geometry : part === 'walls-core' ? charted[k].wallsCore : charted[k][part];
      const s = simplified(source), texture = part === 'top' ? 'top-xz' : part === 'walls-core' ? 'core' : charted[k].atlas;
      writer.geometry(id, s.geometry, { mode, role, texture }, { exactPositions: true });
      report.soil[id] = { dense: s.dense, triangles: s.triangles, meshoptErrorMm: s.errorMm, texture, foldedFirstPass: s.foldedFirstPass, passes: s.passes, lockedVertices: s.lockedVertices };
    }
    list.push(id);
  }
  return list;
}

// Feature geometry: indexed by identical (position, normal, colour, finish) vertices in draw order, so the reveal tier
// ends (vertex counts of the source's non-indexed arrays) are index counts of the packed geometry.
function indexedFeature(source) {
  const g = source.index ? source.toNonIndexed() : source, a = g.attributes, n = a.position.count, names = Object.keys(a), map = new Map(), out = Object.fromEntries(names.map(k => [k, []])), index = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    const parts = names.map(k => { const at = a[k], v = []; for (let c = 0; c < at.itemSize; c++) v.push(at.array[i * at.itemSize + c]); return v; });
    const key = parts.map(v => v.join(',')).join('|');
    let v = map.get(key); if (v === undefined) { v = map.size; map.set(key, v); names.forEach((k, j) => out[k].push(...parts[j])); }
    index[i] = v;
  }
  const r = new THREE.BufferGeometry();
  for (const k of names) r.setAttribute(k, new THREE.Float32BufferAttribute(out[k], a[k].itemSize));
  r.setIndex(new THREE.BufferAttribute(index, 1));
  return r;
}
// Feature paint (dust) textures at most 512 texels wide for the site (M): 2x2 box average of the RGBA values, which the
// finish shader adds as premultiplied colour.
function sitePaint({ data, width, height }) {
  let d = Uint8Array.from(data), w = width, h = height;
  while (w > 512) {
    const nw = w >> 1, nh = h >> 1, out = new Uint8Array(nw * nh * 4);
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) for (let c = 0; c < 4; c++) {
      const at = (yy, xx) => d[((2 * y + yy) * w + 2 * x + xx) * 4 + c];
      out[(y * nw + x) * 4 + c] = Math.round((at(0, 0) + at(0, 1) + at(1, 0) + at(1, 1)) / 4);
    }
    d = out; w = nw; h = nh;
  }
  return { data: d, width: w, height: h, sourceWidth: width, sourceHeight: height };
}
const hashGeometry = g => { const h = createHash('sha256'); for (const k of Object.keys(g.attributes).sort()) { h.update(k); const arr = g.attributes[k].array; h.update(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)); } return h.digest('hex').slice(0, 16); };
const items = {}, steps = [], featureGeometry = new Map(), paints = new Map();
const full = k => ({ schemaVersion: 1, deposits: Array(10).fill(1), features: Array(10).fill(1), excavation: k / site.cutSteps });
for (let k = 0; k <= site.cutSteps; k++) {
  site.applyState(full(k));
  const entry = {};
  for (const it of site.items) {
    // The ring well is packed once below, as the site builds it.
    if (it.ring) continue;
    const meshes = it.handle.object.children.filter(o => o.isMesh), n = it.handle.courseCount;
    if (!items[it.key]) {
      if (meshes.some(m => !m.matrix.equals(new THREE.Matrix4()))) throw new Error(`feature ${it.key}: mesh matrix is not identity`);
      items[it.key] = { featureId: it.featureId, part: it.part, kitId: it.kitId, era: it.era, rule: it.rule,
        dug: it.dug, dugMin: it.dugMin, buried: it.buried, courseCount: n,
        bbox: { min: it.bbox.min.toArray(), max: it.bbox.max.toArray() },
        findCandidates: it.findCandidates ?? null, kitAnchors: [],
        matrix: it.handle.object.matrix.toArray(), slots: meshes.map((m, slot) => {
        const shader = { uniforms: {}, vertexShader: '', fragmentShader: '', defines: {} };
        try { m.material.onBeforeCompile(shader, null); } catch { /* finish-free stub shaders may not patch */ }
        const tex = shader.uniforms.featurePaint?.value, box = shader.uniforms.featurePaintBox?.value;
        let paint = null;
        if (tex) { paint = `paint:${it.key}`; paints.set(paint, { ...sitePaint(tex.image), box: box.toArray() }); }
        return { slot, castShadow: m.castShadow, receiveShadow: m.receiveShadow, roughness: m.material.roughness, paint };
      }) };
    }
    const ends = meshes.map(() => []);
    const tiers = items[it.key].kitAnchors[k] = [];
    for (let q = 0; q <= n; q++) {
      it.handle.setReveal(q > 0 ? (q - .5) / n : 0);
      tiers.push({ courseCount: n, anchor: JSON.parse(JSON.stringify(it.handle.anchors[it.kitId])) });
      meshes.forEach((m, i) => ends[i].push(Math.min(m.geometry.drawRange.count, m.geometry.attributes.position?.count ?? 0)));
    }
    entry[it.key] = meshes.map((m, i) => {
      if (!m.geometry.attributes.position || ends[i][n] === 0) return null;
      const id = `feature:${hashGeometry(m.geometry)}`;
      if (!featureGeometry.has(id)) featureGeometry.set(id, { geometry: indexedFeature(m.geometry), ends: ends[i], firstStep: k, steps: [] });
      featureGeometry.get(id).steps.push(k);
      return id;
    });
  }
  steps.push(entry);
}
// Ring well, as museum-scene.js builds it for the era composite.
const table = createLayerTable(), palette = PALETTES.photo, r = SEATING.ring;
const shaft = { ...table.proportions.shaft, x: RING_WELL.x, z: RING_WELL.z, localTopDepth: surfaceHeight(RING_WELL.x, RING_WELL.z) - r.topY,
  pit: { ...table.proportions.shaft.pit, xmin: RING_WELL.pit.xmin, xmax: RING_WELL.pit.xmax, zmin: RING_WELL.pit.zmin, bottomDepth: -r.pitFloorY } };
const ring = ringSection(shaft, 8, { heapColour: palette.damp, fragmentColour: 0x3a322b });
const RING = [['body', 0xffffff], ['lips', 0xffffff], ['gaps', 0xffffff], ['soil', 0xffffff], ['fill', 0xffffff], ['cracks', 0x2e2720]];

const packName = k => k === DEFAULT_STEP ? 'core' : `step-${k}`;
// shown: 'always', or 'uncut' (step 0 only). Arrays are packed as fixed:<name>:<array>.
const FIXED_SOIL = { top: ['always', 'top', () => fixedGeometry.top()], faces: ['always', 'outer', () => fixedGeometry.faces(block.bottomY)],
  marginTop: ['uncut', 'top', () => fixedGeometry.marginTop()], marginFaces: ['uncut', 'outer', () => fixedGeometry.marginFaces(block.bottomY)] };
const fixedSoil = Object.fromEntries(Object.entries(FIXED_SOIL).map(([name, [shown, mode, build]]) => [name, { shown, mode, pack: shown === 'always' ? 'core' : packName(0), ...encodeFixedSoil(build(), BLOCK, block.bottomY) }]));
const soilSteps = { 0: [] }, geometryPack = {};
for (let k = 1; k <= block.cutSteps; k++) { soilSteps[k] = soilParts(k).map(part => `soil:${k}:${part}`); for (const id of soilSteps[k]) geometryPack[id] = packName(k); }
geometryPack['soil:pedestal'] = 'core';
for (const [id, f] of featureGeometry) geometryPack[id] = f.steps.includes(DEFAULT_STEP) ? 'core' : packName(f.firstStep);
for (const [key] of RING) geometryPack[`ring:${key}`] = 'core';
const coreMeta = { kind: 'core', levels: block.levels, base: block.base, cutSteps: block.cutSteps, defaultStep: DEFAULT_STEP, soilSteps, featureItems: items, featureSteps: steps, geometryPack, atlases: atlasMeta,
  fixedSoil: Object.fromEntries(Object.entries(fixedSoil).map(([name, { shown, mode, pack, meta }]) => [name, { shown, mode, pack, ...meta }])),
  ring: RING.map(([key, colour]) => ({ id: `ring:${key}`, key, colour, vertexColors: key !== 'cracks', castShadow: true, receiveShadow: false, doubleSide: true })),
  // Taken from the live site, not recomputed from the quantized grids, so the ring transforms match createEraSite.
  ringWell: { sinkMetres: site.ringWell.sinkMetres },
  // The packed runtime hands this to the same state driver (src/eras/site-driver.js), so it must survive JSON exactly.
  featureDriver: site.driverData };
{
  const same = (a, b) => a === b || (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => same(a[k], b[k])));
  if (!same(JSON.parse(JSON.stringify(site.driverData)), site.driverData)) throw new Error('site.driverData does not survive JSON');
}
const packs = { grids: createPackWriter({ kind: 'grids' }), core: createPackWriter(coreMeta) };
for (let k = 0; k <= block.cutSteps; k++) if (k !== DEFAULT_STEP) packs[packName(k)] = createPackWriter({ kind: 'step', step: k });
{ const { data, meta } = encodeGrids(stack, GRID_UNIT_METRES); packs.grids.array('grids', data, { grid: meta }); }
for (let k = 1; k <= block.cutSteps; k++) addSoilStep(packs[packName(k)], k);
{ const s = simplified(charted.pedestal); packs.core.geometry('soil:pedestal', s.geometry, { mode: 'inner', role: 'cutface', texture: 'core' }, { exactPositions: true }); report.soil['soil:pedestal'] = { dense: s.dense, triangles: s.triangles, meshoptErrorMm: s.errorMm, texture: 'core' }; }
// Bake inputs (not served): the dense charted meshes of each atlas. visible: which side of a triangle faces open air.
mkdirSync(BAKE, { recursive: true });
for (const [name, a] of Object.entries(atlases)) {
  const w = createPackWriter({ kind: 'bake-input', atlas: name, width: a.width, height: a.height });
  const k = name === 'core' ? DEFAULT_STEP : Number(name.slice(5));
  w.geometry('walls', charted[k].walls, { mode: 'inner', visible: 'up' }, { exactPositions: true });
  w.geometry('floors', charted[k].floors, { mode: 'floor', visible: 'up' }, { exactPositions: true });
  if (name === 'core') w.geometry('pedestal', charted.pedestal, { mode: 'inner', visible: 'radial', axis: [SEATING.ring.x, SEATING.ring.z] }, { exactPositions: true });
  writeFileSync(BAKE + name + '.bin', deflateRawSync(w.bytes(), { level: 6 }));
}
for (const [name, { pack, arrays }] of Object.entries(fixedSoil)) for (const [key, data] of Object.entries(arrays)) packs[pack].array(`fixed:${name}:${key}`, data);
report.fixedSoil = Object.fromEntries(Object.entries(fixedSoil).map(([name, { pack, meta, arrays }]) => [name, { pack, vertices: meta.vertices,
  deflatedBytesAlone: Object.values(arrays).reduce((s, a) => s + deflateRawSync(new Uint8Array(a.buffer, a.byteOffset, a.byteLength), { level: 9 }).length, 0) }]));
// Exact (float32) feature positions: fallback anchors and footprint hulls must match createEraSite's.
for (const [id, f] of featureGeometry) packs[geometryPack[id]].geometry(id, f.geometry, { ends: f.ends }, { exactPositions: true });
// The ring material reads no texture, so its uv attribute is dropped; identical vertices are shared. Positions are exact,
// as for the features (the ring's pool hulls are tested against createEraSite).
for (const [key, colour] of RING) { const g = ring[key].clone(); if (g.attributes.uv) g.deleteAttribute('uv'); packs.core.geometry(`ring:${key}`, indexedFeature(g), { colour, vertexColors: key !== 'cracks' }, { exactPositions: true }); }
for (const [id, p] of paints) packs.core.array(id, p.data, { width: p.width, height: p.height, sourceSize: [p.sourceWidth, p.sourceHeight], box: p.box });

// The grids are part of the first view: the site applies non-default states and resolves CPU displacement for
// occlusion before it reports ready (backend contract).
const manifest = { format: 'strata-site-tier', version: 1, defaultStep: DEFAULT_STEP, firstView: ['core', 'grids'], packs: {} };
const keep = new Set(['manifest.json']);
// Texture pages (install-pages.mjs) are carried over from the previous manifest only while every atlas they belong to
// keeps its size; otherwise they are dropped and install-pages.mjs must run again.
{
  const previous = existsSync(OUT + 'manifest.json') ? JSON.parse(readFileSync(OUT + 'manifest.json', 'utf8')) : null;
  if (previous?.pages) {
    const same = Object.entries(previous.pages).every(([name, p]) => p.kind !== 'atlas' || (atlasMeta[name]?.width === p.width && atlasMeta[name]?.height === p.height));
    if (same) { manifest.pages = previous.pages; manifest.firstViewPages = previous.firstViewPages; for (const p of Object.values(previous.pages)) for (const m of Object.values(p.maps)) keep.add(m.file); }
    else console.warn('atlas sizes changed: texture pages dropped, run scripts/site-tier/install-pages.mjs');
  }
}
for (const [name, w] of Object.entries(packs)) {
  const raw = w.bytes(), compressed = deflateRawSync(raw, { level: 9 }), sha = createHash('sha256').update(compressed).digest('hex'), file = `${name}.${sha.slice(0, 16)}.bin`;
  writeFileSync(OUT + file, compressed); keep.add(file);
  manifest.packs[name] = { file, bytes: compressed.length, inflatedBytes: raw.length, sha256: sha };
}
for (const f of readdirSync(OUT)) if (/^(grids|core|step-\d+)\.[0-9a-f]{16}\.bin$/.test(f) && !keep.has(f)) rmSync(OUT + f);
writeFileSync(OUT + 'manifest.json', JSON.stringify(manifest, null, 1) + '\n');
report.packs = manifest.packs;
report.firstViewBytes = manifest.firstView.reduce((s, p) => s + manifest.packs[p].bytes, 0);
report.features = { distinctGeometries: featureGeometry.size, items: Object.keys(items).length, paints: paints.size,
  step12Triangles: [...featureGeometry.values()].filter(f => f.steps.includes(DEFAULT_STEP)).reduce((s, f) => s + f.ends.at(-1) / 3, 0) };
report.buildMs = Math.round(performance.now() - t0);
writeFileSync(REPORT + 'build-assets.json', JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({ firstViewBytes: report.firstViewBytes, packs: Object.fromEntries(Object.entries(manifest.packs).map(([k, v]) => [k, [v.bytes, v.inflatedBytes]])), features: report.features, buildMs: report.buildMs }));
