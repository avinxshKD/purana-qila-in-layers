// CPU geometry budget (no GPU): triangles and draw calls submitted per frame for the A3 look world + film stand-in
// (what the site renders today) and the M1 era composite, at full excavation (2023) and Kushan mid-scrub (year 100).
// Mesh lists mirror createLookWorld (src/museum-scene.js) without the renderer, labels HUD or backdrop.
// Usage: node scripts/modelling/geometry-budget.mjs [--aspect=1.7778] > out.json
import * as THREE from 'three';
import { box } from '../../src/geometry.js';
import { createLayerTable } from '../../src/layers.js';
import { addStrata, noiseMaterial } from '../../src/strata-surface.js';
import { sectionTop, excavationFloor, ringSection, sectionFeatures, topDebris } from '../../src/section-geometry.js';
import { PALETTES } from '../../src/palettes.js';
import { createEraSite, siteBoundaryGrids } from '../../src/eras/site-state.js';
import { createSoilBlock } from '../../src/eras/soil-block.js';
import { stepOf } from '../../src/eras/excavation.js';
import { SEATING } from '../../src/eras/seating.js';
import { RING_WELL } from '../../src/eras/layout.js';
import { surfaceHeight } from '../../src/layers.js';
import { TOP_CHARACTER, FLOOR_CHARACTER, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN, SCALE_BAR as S, GROUND } from '../../src/museum-scene.js';
import { createStandIn } from '../../src/film/stand-in.js';
import { sceneForYear } from '../../src/film/scene-year.js';
import { siteHeroPose } from '../../src/site/camera.js';

const aspect = Number((process.argv.find(a => a.startsWith('--aspect=')) ?? '--aspect=1.7778').split('=')[1]);
const height = 1080;
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
    const stack = siteBoundaryGrids();
    eraBlock = createSoilBlock({ stack, outputScale: 1, parent: scene, top: { character: TOP_CHARACTER, albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN }, floor: { character: FLOOR_CHARACTER } });
    buildingStrata = false;
    eraSite = createEraSite({ outputScale: 1 }); eraSite.group.userData.sectionRole = 'feature'; scene.add(eraSite.group);
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
  for (let i = 0; i <= 5; i++) add(box(S.outlineMetres, S.heightMetres + 2 * S.outlineMetres, .014, 2 + i, barY, 8.668), new THREE.MeshBasicMaterial(), { role: 'scale', cast: false, group: 'scale-bar' });
  for (const side of [-1, 1]) add(box(5 + S.outlineMetres, S.outlineMetres, .015, 4.5, barY + side * (S.heightMetres + S.outlineMetres) / 2, 8.67), new THREE.MeshBasicMaterial(), { role: 'scale', cast: false, group: 'scale-bar' });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(GROUND.radiusMetres, 128), new THREE.ShadowMaterial());
  ground.rotation.x = -Math.PI / 2; ground.position.y = -base - .38; ground.receiveShadow = true; ground.userData.sectionRole = 'ground'; ground.userData.group = 'ground'; scene.add(ground);
  return { scene, table, eraSite, eraBlock };
}
function trianglesOf(mesh) {
  const g = mesh.geometry, n = g.index ? g.index.count : g.attributes.position.count;
  const count = Math.min(n, g.drawRange.count ?? Infinity) - (g.drawRange.start ?? 0);
  const inst = mesh.isInstancedMesh ? mesh.count : 1;
  return Math.max(0, count) / 3 * inst;
}
function visibleChain(o) { for (; o; o = o.parent) if (!o.visible) return false; return true; }
function measure(scene, camera) {
  scene.updateMatrixWorld(true);
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  const rows = [], materials = new Set(), clip = new Map();
  scene.traverse(m => {
    if (!m.isMesh || !visibleChain(m)) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const draws = Array.isArray(m.material) && m.geometry.groups.length ? m.geometry.groups.length : 1;
    let inFrustum = true;
    if (m.frustumCulled) { if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); const s = m.geometry.boundingSphere.clone().applyMatrix4(m.matrixWorld); inFrustum = frustum.intersectsSphere(s); }
    let label = m.name || m.userData.group; for (let o = m.parent; !label && o; o = o.parent) label = o.name || o.userData.group;
    rows.push({ mesh: label || m.uuid.slice(0, 8), role: (() => { let r; for (let o = m; o && !r; o = o.parent) r = o.userData.sectionRole; return r ?? null; })(),
      triangles: trianglesOf(m), vertices: m.geometry.attributes.position.count, draws, inFrustum, castShadow: m.castShadow, material: mats[0].type, clipPlanes: mats[0].clippingPlanes?.length ?? 0 });
    for (const mat of mats) { materials.add(mat); const c = mat.clippingPlanes?.length ?? 0; clip.set(c, (clip.get(c) ?? 0) + 1); }
  });
  const sum = (list, k) => list.reduce((a, r) => a + r[k], 0);
  const drawn = rows.filter(r => r.inFrustum && r.triangles > 0), shadow = rows.filter(r => r.castShadow && r.triangles > 0);
  // Group same-named meshes (e.g. per-layer strata, per-feature parts) for the top list.
  const byName = new Map();
  for (const r of drawn) { const o = byName.get(r.mesh) ?? { mesh: r.mesh, role: r.role, triangles: 0, vertices: 0, draws: 0, material: r.material, clipPlanes: r.clipPlanes }; o.triangles += r.triangles; o.vertices += r.vertices; o.draws += r.draws; byName.set(r.mesh, o); }
  return { visibleMeshes: rows.length, mainPass: { triangles: sum(drawn, 'triangles'), vertices: sum(drawn, 'vertices'), drawCalls: sum(drawn, 'draws'), meshesCulledByFrustum: rows.filter(r => !r.inFrustum).length },
    shadowPass: { triangles: sum(shadow, 'triangles'), drawCalls: sum(shadow, 'draws'), note: 'all shadow casters; the site re-renders the shadow map only on state change (shadowMap.autoUpdate=false)' },
    materialsByClipPlaneCount: Object.fromEntries(clip), distinctMaterials: materials.size,
    byRole: Object.fromEntries([...new Set(drawn.map(r => r.role))].map(role => [role, { triangles: sum(drawn.filter(r => r.role === role), 'triangles'), draws: sum(drawn.filter(r => r.role === role), 'draws') }])),
    top15: [...byName.values()].sort((a, b) => b.triangles - a.triangles).slice(0, 15) };
}
const hero = siteHeroPose(false), camera = new THREE.PerspectiveCamera(25, aspect, .1, 180);
camera.position.fromArray(hero.position); camera.lookAt(new THREE.Vector3(...hero.target)); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
const states = { full: sceneForYear(2023), kushan: sceneForYear(100) };
const out = { method: `CPU mesh lists mirroring createLookWorld; hero camera (site camera.js, desktop), fov 25, aspect ${aspect.toFixed(4)}; triangles = index/position count within drawRange; draw calls = visible meshes (x material groups) passing three's bounding-sphere frustum test. Labels HUD, backdrop and markers excluded.`, states: {} };
{
  const a3 = build('look');
  const standIn = createStandIn({ renderer: {}, scene: a3.scene, layerTable: a3.table });
  for (const [k, s] of Object.entries(states)) { const r = standIn.apply({ scene: s }); out.states[`A3+stand-in ${k}`] = { year: k === 'full' ? 2023 : 100, standIn: r, ...measure(a3.scene, camera) }; }
}
{
  const m1 = build('eras');
  for (const [k, s] of Object.entries(states)) {
    const res = m1.eraSite.applyState(s); const b = m1.eraBlock.apply({ deposits: s.deposits, k: stepOf(s.excavation) });
    out.states[`M1 ${k}`] = { year: k === 'full' ? 2023 : 100, cutStep: b.cutStep, ...measure(m1.scene, camera) };
  }
}
console.log(JSON.stringify(out, null, 1));
