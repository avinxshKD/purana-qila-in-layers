// Site detail tier, CPU-only inventory (no GPU, no renderer): for the scene the site renders today (A3 look world +
// film stand-in) and the M1 era composite, (1) the distinct shader programs three would build (approximate program key:
// material type, customProgramCacheKey, defines and the flags that become defines), each with the size of its expanded
// GLSL after onBeforeCompile and its static loop / noise call sites; (2) M1 soil surface areas by mode, for bake texel
// budgets; (3) the cost of the existing CPU displacement (soil-displace.js) per state change.
// Usage: node scripts/modelling/site-tier-inventory.mjs  -> output/lookdev/modelling/site-tier/inventory.json
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { box } from '../../src/geometry.js';
import { createLayerTable, surfaceHeight } from '../../src/layers.js';
import { addStrata, noiseMaterial } from '../../src/strata-surface.js';
import { sectionTop, excavationFloor, ringSection, sectionFeatures, topDebris } from '../../src/section-geometry.js';
import { PALETTES } from '../../src/palettes.js';
import { createEraSite, siteBoundaryGrids } from '../../src/eras/site-state.js';
import { createSoilBlock } from '../../src/eras/soil-block.js';
import { createEraDisplacement } from '../../src/eras/soil-displace.js';
import { SEATING } from '../../src/eras/seating.js';
import { RING_WELL } from '../../src/eras/layout.js';
import { TOP_CHARACTER, FLOOR_CHARACTER, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN, SCALE_BAR as S, GROUND } from '../../src/museum-scene.js';
import { createStandIn } from '../../src/film/stand-in.js';
import { sceneForYear } from '../../src/film/scene-year.js';

const root = fileURLToPath(new URL('../../', import.meta.url)), outDir = root + 'output/lookdev/modelling/site-tier/';
mkdirSync(outDir, { recursive: true });
const height = 1080, now = () => performance.now(), buildTimes = {};
// Same mesh lists as scripts/modelling/geometry-budget.mjs build() (createLookWorld without renderer, HUD or backdrop).
function build(soil) {
  const table = createLayerTable(), scene = new THREE.Scene(), palette = PALETTES.photo;
  let buildingStrata = true;
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, ...options });
  const soilMaterial = (mat, configuration = {}) => noiseMaterial(mat, { outputScale: height / 1080, ...configuration });
  const add = (geometry, mat, { cast = true, receive = true, role = buildingStrata ? 'cutface' : 'feature', group = role } = {}) => {
    const mesh = new THREE.Mesh(geometry, mat); mesh.castShadow = cast; mesh.receiveShadow = receive;
    mesh.userData.sectionRole = role; mesh.userData.group = group; scene.add(mesh); return mesh;
  };
  let eraSite = null, eraBlock = null, base = table.proportions.bottomDepth, ring;
  if (soil === 'look') {
    addStrata(table, add, material, height, scene, palette); buildingStrata = false;
    const topColour = new THREE.Color(palette.soil).multiplyScalar(TOP_ALBEDO_MULTIPLIER);
    add(sectionTop(table), soilMaterial(material(topColour), { seed: 977, amplitude: 1, character: TOP_CHARACTER, slopeDarken: TOP_SLOPE_DARKEN }), { role: 'top', group: 'top' });
    add(topDebris(table, { brick: palette.brick, sherd: palette.sherd, clod: topColour.getHex() }), soilMaterial(material(0xffffff, { vertexColors: true }), { seed: 983, amplitude: .06 }), { role: 'top', group: 'top-debris' });
    for (const trench of table.proportions.trenches) add(excavationFloor(trench, table.proportions.shaft), soilMaterial(material(palette.damp)), { role: 'floor', group: `floor-${trench.id}` });
    ring = ringSection(table.proportions.shaft, 8, { heapColour: palette.damp, fragmentColour: 0x3a322b });
    for (const key of ['body', 'lips', 'gaps', 'soil', 'fill', 'cracks']) add(ring[key], soilMaterial(material(0xffffff, { side: THREE.DoubleSide })), { receive: false, group: `ring-${key}` });
    add(ring.pitFloor, soilMaterial(material(palette.damp)), { role: 'floor', group: 'ring-pit-floor' });
    const features = sectionFeatures(table, { brick: palette.brick, mud: palette.mud });
    add(features.mortar, soilMaterial(material(0xffffff)), { group: 'mortar' });
    add(features.bricks, soilMaterial(material(0xffffff)), { group: 'bricks' });
  } else {
    let t = now(); const stack = siteBoundaryGrids(); buildTimes.boundaryGridsMs = +(now() - t).toFixed(0); t = now();
    eraBlock = createSoilBlock({ stack, outputScale: 1, parent: scene, top: { character: TOP_CHARACTER, albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN }, floor: { character: FLOOR_CHARACTER } });
    buildingStrata = false; buildTimes.soilBlockMs = +(now() - t).toFixed(0); t = now();
    eraSite = createEraSite({ outputScale: 1 }); buildTimes.eraSiteMs = +(now() - t).toFixed(0); eraSite.group.userData.sectionRole = 'feature'; scene.add(eraSite.group);
    const r = SEATING.ring;
    const shaft = { ...table.proportions.shaft, x: RING_WELL.x, z: RING_WELL.z, localTopDepth: surfaceHeight(RING_WELL.x, RING_WELL.z) - r.topY,
      pit: { ...table.proportions.shaft.pit, xmin: RING_WELL.pit.xmin, xmax: RING_WELL.pit.xmax, zmin: RING_WELL.pit.zmin, bottomDepth: -r.pitFloorY } };
    ring = ringSection(shaft, 8, { heapColour: palette.damp, fragmentColour: 0x3a322b });
    for (const key of ['body', 'lips', 'gaps', 'soil', 'fill', 'cracks']) add(ring[key], soilMaterial(material(0xffffff, { side: THREE.DoubleSide })), { receive: false, role: 'feature', group: `ring-${key}` });
    base = eraBlock.base;
  }
  add(box(25.3, .30, 17.3, 0, -base - .21, 0), material(palette.plinth), { role: 'plinth', receive: false, group: 'plinth' });
  add(box(25.24, .065, 17.24, 0, -base - .0325, 0), material(0x38362f), { role: 'plinth', receive: false, group: 'plinth-rim' });
  const barY = -base - S.centreBelowBaseMetres;
  for (let i = 0; i < 5; i++) add(box(1, S.heightMetres, .012, 2.5 + i, barY, 8.66), new THREE.MeshBasicMaterial(), { role: 'scale', cast: false, group: 'scale-bar' });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(GROUND.radiusMetres, 128), new THREE.ShadowMaterial());
  ground.rotation.x = -Math.PI / 2; ground.position.y = -base - .38; ground.receiveShadow = true; ground.userData.sectionRole = 'ground'; scene.add(ground);
  return { scene, table, eraSite, eraBlock };
}
const LIB = { MeshStandardMaterial: 'standard', MeshBasicMaterial: 'basic', ShadowMaterial: 'shadow', MeshDepthMaterial: 'depth', MeshDistanceMaterial: 'distanceRGBA', MeshLambertMaterial: 'lambert' };
const expand = src => { for (let i = 0; i < 6; i++) src = src.replace(/#include <(\w+)>/g, (_, n) => THREE.ShaderChunk[n] ?? ''); return src; };
const strip = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/\s+/g, ' ');
function programKey(mat) {
  return [mat.type, mat.customProgramCacheKey?.() ?? '', JSON.stringify(mat.defines ?? {}), `vc${!!mat.vertexColors}`, `flat${!!mat.flatShading}`, `ds${mat.side === THREE.DoubleSide}`,
    `map${!!mat.map}`, `clip${mat.clippingPlanes?.length ?? 0}`, `tr${!!mat.transparent}`].join('|');
}
function sources(mat) {
  const lib = THREE.ShaderLib[LIB[mat.type]];
  if (!lib) return null;
  const shader = { uniforms: {}, defines: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
  mat.onBeforeCompile?.(shader, null);
  const v = strip(expand(shader.vertexShader)), f = strip(expand(shader.fragmentShader));
  const count = (s, re) => (s.match(re) ?? []).length;
  return { vertexChars: v.length, fragmentChars: f.length, fragmentLoops: count(f, /\bfor\s*\(/g), vertexTexelFetch: count(v, /texelFetch\s*\(/g),
    fragmentNoiseCallSites: count(f, /\b\w*(?:[Nn]oise|[Hh]ash)\w*\s*\(/g), fragmentTextureCalls: count(f, /\b(?:texture|texelFetch|texture2D)\s*\(/g) };
}
function inventory(scene) {
  const programs = new Map();
  const note = (mat, use) => { const k = programKey(mat); const p = programs.get(k) ?? { key: k.slice(0, 160), type: mat.type, uses: 0, meshes: new Set(), src: sources(mat) }; p.uses++; p.meshes.add(use); programs.set(k, p); };
  scene.traverse(o => {
    if (!o.isMesh) return;
    let label = o.name || o.userData.group; for (let p = o.parent; !label && p; p = p.parent) label = p.name || p.userData.group;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) note(m, label ?? o.type);
    if (o.customDepthMaterial) note(o.customDepthMaterial, `${label} (shadow depth)`);
  });
  const list = [...programs.values()].map(p => ({ ...p, meshes: [...p.meshes].slice(0, 6), meshCount: p.meshes.size })).sort((a, b) => (b.src?.fragmentChars ?? 0) - (a.src?.fragmentChars ?? 0));
  const sum = k => list.reduce((s, p) => s + (p.src?.[k] ?? 0), 0);
  return { distinctPrograms: list.length, note: 'excludes three internals the renderer adds (default shadow depth, VSM blur, background); compare with renderer.info.programs', totalFragmentChars: sum('fragmentChars'), totalVertexChars: sum('vertexChars'), programs: list };
}
const triArea = (g, m) => {
  const p = g.attributes.position, idx = g.index, n = idx ? idx.count : p.count, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let s = 0; for (let i = 0; i < n; i += 3) { const [i0, i1, i2] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
    a.fromBufferAttribute(p, i0).applyMatrix4(m); b.fromBufferAttribute(p, i1).applyMatrix4(m); c.fromBufferAttribute(p, i2).applyMatrix4(m); s += b.sub(a).cross(c.sub(a)).length() / 2; }
  return s;
};
const out = { method: 'see header', scenes: {} };
{
  const a3 = build('look'); createStandIn({ renderer: {}, scene: a3.scene, layerTable: a3.table }).apply({ scene: sceneForYear(2023) });
  out.scenes['A3+stand-in (site today)'] = inventory(a3.scene);
}
{
  let t0 = now(); const m1 = build('eras'); out.buildErasWorldMs = +(now() - t0).toFixed(0); out.soilBlockFixedBuildMs = +m1.eraBlock.stats().buildMs.fixed.toFixed(0); out.buildTimes = buildTimes; t0 = now();
  const cutSteps = Array.from({ length: m1.eraBlock.cutSteps + 1 }, (_, k) => k);
  for (const k of cutSteps) m1.eraBlock.warm(k);
  out.buildAllCutStepsMs = +(now() - t0).toFixed(0);
  out.scenes['M1 era composite'] = inventory(m1.scene);
  m1.scene.updateMatrixWorld(true);
  const areas = {};
  for (const mesh of m1.eraBlock.meshes()) { const mode = mesh.material.customProgramCacheKey().match(/"mode":"(\w+)"/)?.[1]; const a = triArea(mesh.geometry, mesh.matrixWorld); (areas[mesh.name] = { mode, squareMetres: +a.toFixed(2), triangles: (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.attributes.position.count) / 3 }); }
  out.m1SoilSurfaces = areas;
  // Orientation classes and distinct planes (normal class + offset to 1 cm), area-weighted, for world-projected bakes.
  const planeKey = (n, p) => { const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    if (ay > .999) return 'y:' + p.y.toFixed(2); if (ax > .999) return 'x:' + p.x.toFixed(2); if (az > .999) return 'z:' + p.z.toFixed(2); return 'other'; };
  const planes = {};
  for (const mesh of m1.eraBlock.meshes()) {
    const g = mesh.geometry, pos = g.attributes.position, idx = g.index, n = idx ? idx.count : pos.count, m = mesh.matrixWorld;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), per = {};
    for (let i = 0; i < n; i += 3) { const [i0, i1, i2] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
      a.fromBufferAttribute(pos, i0).applyMatrix4(m); b.fromBufferAttribute(pos, i1).applyMatrix4(m); c.fromBufferAttribute(pos, i2).applyMatrix4(m);
      e1.subVectors(b, a); e2.subVectors(c, a); const cr = e1.cross(e2), area = cr.length() / 2; if (area < 1e-9) continue;
      const k = planeKey(cr.normalize(), a); per[k] = (per[k] ?? 0) + area; }
    planes[mesh.name] = Object.fromEntries(Object.entries(per).filter(([, v]) => v > .05).map(([k, v]) => [k, +v.toFixed(2)]));
  }
  out.m1Planes = planes;
  const fixedArea = ['era-top', 'era-outer', 'era-top-margins', 'era-outer-margins', 'era-ring-pedestal'].reduce((s, n) => s + (areas[n]?.squareMetres ?? 0), 0);
  const stepArea = k => Object.entries(areas).filter(([n]) => n.endsWith(`-step-${k}`)).reduce((s, [, a]) => s + a.squareMetres, 0);
  const steps = cutSteps.map(k => ({ k, squareMetres: +stepArea(k).toFixed(2) }));
  out.bakeBudget = { fixedSquareMetres: +fixedArea.toFixed(1), largestStepSquareMetres: Math.max(...steps.map(s => s.squareMetres)), steps,
    texelsPerSquareMetre: Object.fromEntries([.01, .015, .02].map(t => [`${t * 100} cm`, Math.round(1 / t ** 2)])) };
  // CPU displacement per state change (soil-displace.js, linear in the deposits): first call builds coefficients.
  const disp = createEraDisplacement({ stack: m1.eraBlock.stack }), movers = m1.eraBlock.meshes().filter(m => m.userData.eraDisplaced);
  const st = d => ({ deposits: d });
  let t = now(); for (const m of movers) disp.resolve(m, st(Array(10).fill(1))); const prepareMs = now() - t;
  const times = [];
  for (let s = 0; s < 40; s++) { const d = Array.from({ length: 10 }, (_, i) => Math.min(1, Math.max(0, s / 4 - i))); t = now(); for (const m of movers) disp.resolve(m, st(d)); times.push(now() - t); }
  times.sort((a, b) => a - b);
  out.cpuDisplacement = { meshes: movers.map(m => m.name), movingVertices: movers.reduce((s, m) => s + [...Array(m.geometry.attributes.eraBlend.count).keys()].filter(i => m.geometry.attributes.eraBlend.getX(i) >= 0).length, 0),
    prepareMs: +prepareMs.toFixed(0), perStateMs: { p50: +times[20].toFixed(2), p95: +times[38].toFixed(2) }, note: 'positions + top normals for every moving vertex; excludes the GPU buffer upload' };
}
writeFileSync(outDir + 'inventory.json', JSON.stringify(out, null, 1) + '\n');
for (const [k, s] of Object.entries(out.scenes)) console.log(k, 'programs', s.distinctPrograms, 'frag chars', s.totalFragmentChars, 'vert chars', s.totalVertexChars, '\n ', s.programs.slice(0, 8).map(p => `${p.type} ${p.meshCount} meshes f${p.src?.fragmentChars} loops${p.src?.fragmentLoops} noise${p.src?.fragmentNoiseCallSites} v${p.src?.vertexChars} vfetch${p.src?.vertexTexelFetch} [${p.meshes.slice(0, 2).join(',')}]`).join('\n  '));
console.log('bake', JSON.stringify(out.bakeBudget), '\ndisp', JSON.stringify(out.cpuDisplacement), '\nbuild steps ms', out.buildAllCutStepsMs);
