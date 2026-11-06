// Scene-state driver for the composite section (M1): builds and places the kit features, then maps the film/site
// state contract (deposits, features, excavation) onto reveal, capped cuts, the active-top grid and the anchors.
// CPU only: the renderer reads `activeTop` (grid) and the soil step from here. Placement and rules are M (M0.1).
import * as THREE from 'three';
import { buildEraFeature, buildFeature, fig13Specs } from '../features/index.js';
import { ERA_IDS, BOUNDARY_COUNT, GRID, sampleGrid } from './stack.js';
import { SEATING, siteBoundaries, placementMatrix } from './seating.js';
import { RING_WELL } from './layout.js';
import { createLayerTable, surfaceHeight } from '../layers.js';
import { ringSection } from '../section-geometry.js';
import { VOLUMES, BLOCK, BLOCK_KEEP, toLocalPlane } from './excavation.js';
import { ANCHOR_VIEW, ANCHOR_OFFSET_METRES, PRE_MAURYAN_SOIL_X, createSiteDriver } from './site-driver.js';
export { ANCHOR_VIEW, ANCHOR_OFFSET_METRES, ANCHOR_PARTS, PRE_MAURYAN_SOIL_X, anchorStateKey, createSiteDriver } from './site-driver.js';
import { ANCHOR_TABLE } from './anchor-table.js';

const ERA = Object.fromEntries(ERA_IDS.map((id, i) => [id, i]));
// A dug feature (a cut opening, a flush-laid drain) is shown only while its top is at most this far above the active
// top (M; the film's feature audit allows 2 cm).
export const DUG_TOLERANCE_METRES = .015;
export const RING_PARTS = Object.freeze(['body', 'lips', 'gaps', 'soil', 'fill', 'cracks']);

// Final boundaries (with flattened hosts) on the shared 0.05 m grid; computed once per page.
let siteStack = null;
export function siteBoundaryGrids(grid = GRID) {
  if (siteStack && grid === GRID) return siteStack;
  const nx = Math.round(grid.width / grid.stepMetres) + 1, nz = Math.round(grid.length / grid.stepMetres) + 1;
  const grids = Array.from({ length: BOUNDARY_COUNT }, () => new Float32Array(nx * nz)), b = new Float64Array(BOUNDARY_COUNT);
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    siteBoundaries(grid.xmin + ix * grid.stepMetres, grid.zmin + iz * grid.stepMetres, b);
    for (let j = 0; j < BOUNDARY_COUNT; j++) grids[j][iz * nx + ix] = b[j];
  }
  const out = { ...grid, nx, nz, grids };
  if (grid === GRID) siteStack = out;
  return out;
}

function worldVertices(handle, matrix, stride = 1) {
  const out = [], v = new THREE.Vector3();
  for (const mesh of handle.object.children) {
    const pos = mesh.geometry.getAttribute('position');
    if (!pos) continue;
    const n = mesh.geometry.drawRange.count === Infinity ? pos.count : Math.min(pos.count, mesh.geometry.drawRange.count);
    for (let i = 0; i < n; i += stride) { v.fromBufferAttribute(pos, i).applyMatrix4(matrix); out.push(v.x, v.y, v.z); }
  }
  return out;
}

// Trench rule (modelling brief section 3 and KIT.md): per removed volume, a feature whose lowest in-volume point is
// at or below the volume's final floor (1 cm tolerance) stands preserved; otherwise the volume is subtracted.
function classify(item) {
  const verts = item.vertices, rules = [];
  for (const v of VOLUMES) {
    const b = v.box;
    if (item.bbox.max.x < b.xmin - 1 || item.bbox.min.x > b.xmax + 1 || item.bbox.max.z < b.zmin - 1 || item.bbox.min.z > b.zmax + 1) continue;
    let dmin = Infinity, dmax = -Infinity, topAbove = -Infinity; const inside = [];
    for (let i = 0; i < verts.length; i += 3) {
      const x = verts[i], y = verts[i + 1], z = verts[i + 2];
      if (!v.insideWalls(x, y, z)) continue;
      const d = y - v.floorAt(x, z);
      dmin = Math.min(dmin, d); dmax = Math.max(dmax, d); inside.push(x, y, z);
      topAbove = Math.max(topAbove, d);
    }
    if (!inside.length) continue;
    const preserve = dmin <= .01;
    rules.push({ volume: v, id: v.id, rule: preserve ? 'preserve' : 'remove', baseMinusFloor: dmin, topMinusFloor: dmax, inside });
  }
  return rules;
}

// anchorTable: the static table of src/eras/anchor-table.js (scripts/modelling/anchor-table.mjs); null picks every
// anchor at run time (the generator does that).
// ringWell: { heapColour, fragmentColour, material(part) } for the six ring meshes (default: plain double-sided
// MeshStandardMaterial, ringSection's default colours).
export function buildKitItems({ outputScale = 1, ringWell = {} } = {}) {
  const ctx = { outputScale }, group = new THREE.Group(); group.name = 'era-features';
  const specs = Object.fromEntries(fig13Specs().map(s => [s.id, s])), items = [];
  const add = (r, handle, matrix, part, kitId) => {
    handle.object.matrixAutoUpdate = false; handle.object.matrix.copy(matrix); handle.object.updateMatrixWorld(true);
    group.add(handle.object);
    const vertices = worldVertices(handle, matrix), bbox = new THREE.Box3();
    for (let i = 0; i < vertices.length; i += 3) bbox.expandByPoint(new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]));
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix);
    items.push({ key: part ? `${r.id}:${part}` : r.id, featureId: r.id, part: part ?? null, kitId, era: r.eraIndex, rule: r.rule, record: r, handle, matrix, normalMatrix, vertices, bbox, step: null, specs: new Map() });
  };
  for (const r of SEATING.records) {
    if (r.id === 'kushan-house') for (const w of r.walls) add(r, buildFeature(specs[w.id], ctx), placementMatrix(r, w), w.id, w.id);
    else add(r, buildEraFeature(r.id, r.overrides ?? {}, ctx), placementMatrix(r), r.part ?? null, r.id);
  }
  const stack = siteBoundaryGrids();
  // Lowest deposit fraction of the feature's era at which no vertex is more than the tolerance above the active top.
  function dugThreshold(it) {
    // A flush feature is judged against the surface it is laid in, not its own channel cut.
    const lo = stack.grids[it.era], hi = stack.grids[it.era + 1], v = it.vertices, surface = it.record.surfacePlane;
    let d = -Infinity;
    for (let i = 0; i < v.length; i += 3) {
      const x = v[i], z = v[i + 2];
      if (x < BLOCK.xmin || x > BLOCK.xmax || z < BLOCK.zmin || z > BLOCK.zmax) continue;
      const base = sampleGrid(stack, lo, x, z), t = (surface ? surface.at(x, z) : sampleGrid(stack, hi, x, z)) - base;
      d = Math.max(d, t > 1e-6 ? (v[i + 1] - base - DUG_TOLERANCE_METRES) / t : v[i + 1] - base > DUG_TOLERANCE_METRES ? 1 : 0);
    }
    return Math.round(Math.max(0, Math.min(1, d)) * 1e6) / 1e6;
  }
  for (const it of items) {
    it.rules = classify(it);
    it.keep = Object.entries(BLOCK_KEEP).filter(([face]) => !(it.rule === 'find' && face === 'front')).map(([, p]) => toLocalPlane(p, it.matrix));
    for (const rule of it.rules) {
      // Thin the in-volume points for the per-step reach test.
      const pts = rule.inside, stride = Math.max(1, Math.floor(pts.length / 3 / 4000)) * 3, keep = [];
      for (let i = 0; i < pts.length; i += stride) keep.push(pts[i], pts[i + 1], pts[i + 2]);
      rule.inside = keep;
    }
    it.dug = it.rule === 'opening' || Boolean(it.record.flush);
    it.dugMin = it.dug ? dugThreshold(it) : 0;
    delete it.vertices;
    // Share of a wall's height below its era top at its centre: the part seated under the deposit.
    const unit = it.featureId === 'kushan-house' ? it.record.walls.find(w => w.id === it.part) : it.record, plane = unit.plane ?? it.record.plane;
    const cx = (it.bbox.min.x + it.bbox.max.x) / 2, cz = (it.bbox.min.z + it.bbox.max.z) / 2;
    it.buried = it.rule === 'wall' && unit.height > 0 ? Math.round(Math.max(0, Math.min(1, (siteBoundaries(cx, cz)[it.era + 1] - plane.at(cx, cz)) / unit.height)) * 1e6) / 1e6 : 0;
    // Finds lie flat in the face plane; their one candidate is the centre of the face-side extent, facing out.
    if (it.rule === 'find') {
      const point = [(it.bbox.min.x + it.bbox.max.x) / 2, (it.bbox.min.y + it.bbox.max.y) / 2, it.bbox.max.z];
      it.findCandidates = [{ index: 0, point, normal: [0, 0, 1], facing: ANCHOR_VIEW[2], score: Math.round(ANCHOR_VIEW[2] * 1e3), anchor: [point[0], point[1], point[2] + ANCHOR_OFFSET_METRES] }];
    }
  }
  const ring = buildRingWell(ringWell);
  for (const it of ring.items) { group.add(it.handle.object); items.push(it); }

  function buildRingWell({ heapColour, fragmentColour, material = () => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }) }) {
    const r = SEATING.ring, table = createLayerTable();
    const shaft = { ...table.proportions.shaft, x: RING_WELL.x, z: RING_WELL.z, localTopDepth: surfaceHeight(RING_WELL.x, RING_WELL.z) - r.topY,
      pit: { ...table.proportions.shaft.pit, xmin: RING_WELL.pit.xmin, xmax: RING_WELL.pit.xmax, zmin: RING_WELL.pit.zmin, bottomDepth: -r.pitFloorY } };
    const geometry = ringSection(shaft, 8, { ...(heapColour !== undefined && { heapColour }), ...(fragmentColour !== undefined && { fragmentColour }) });
    let sink = 0;
    for (let iz = 0; iz < stack.nz; iz++) for (let ix = 0; ix < stack.nx; ix++) {
      const x = stack.xmin + ix * stack.stepMetres, z = stack.zmin + iz * stack.stepMetres;
      if (Math.hypot(x - RING_WELL.x, z - RING_WELL.z) > r.mouthRadius + stack.stepMetres * 1.5) continue;
      const k = iz * stack.nx + ix; sink = Math.max(sink, stack.grids[ERA.mauryan + 1][k] - stack.grids[ERA.mauryan][k]);
    }
    const record = { id: RING_WELL.id, eraIndex: ERA.mauryan, rule: 'opening' };
    const out = RING_PARTS.map(part => {
      const mesh = new THREE.Mesh(geometry[part], material(part));
      mesh.name = `ring-${part}`; mesh.castShadow = true; mesh.receiveShadow = false;
      mesh.userData.sectionRole = 'feature'; mesh.userData.group = `ring-${part}`;
      const object = new THREE.Group(); object.name = `${RING_WELL.id}:${part}`; object.matrixAutoUpdate = false; object.add(mesh); object.updateMatrixWorld(true);
      geometry[part].computeBoundingBox();
      const bounds = geometry[part].boundingBox.clone(), bbox = bounds.clone(); bbox.min.y -= sink;
      let shown = true;
      const handle = { object, courseCount: 1, bounds, anchors: {}, stats: { triangles: geometry[part].attributes.position.count / 3, drawCalls: 1, lastCutCacheHit: true },
        setReveal(f) { if (!Number.isFinite(f)) throw new Error('Feature reveal must be finite'); shown = f > 0; mesh.visible = shown; handle.stats.drawCalls = shown ? 1 : 0; },
        setCuts() {}, warmCuts: () => 0,
        dispose() { mesh.geometry.dispose(); mesh.material.dispose(); } };
      return { key: `${RING_WELL.id}:${part}`, featureId: RING_WELL.id, part, kitId: null, era: ERA.mauryan, rule: 'opening', record, handle, matrix: new THREE.Matrix4(),
        normalMatrix: new THREE.Matrix3(), bbox, step: null, specs: new Map(), rules: [], keep: [], buried: 0, dug: true, dugMin: 0, ring: true };
    });
    return { items: out, tones: geometry.tones, sinkMetres: Math.round(sink * 1e6) / 1e6 };
  }
  // Single source for the exact state-only context, also saved verbatim in the site packs.
  const sealedPit = SEATING.records.find(r => r.id === 'rajput-sealed-pit');
  const driverData = {
    centre: Array.from(siteBoundaries(0, 0)),
    preMauryanBand: Array.from(siteBoundaries(PRE_MAURYAN_SOIL_X, 8 - 1e-6)).slice(0, 2),
    sealedPit: sealedPit ? { id: sealedPit.id, point: [sealedPit.centre[0], sealedPit.plane.at(sealedPit.centre[0], 8) - sealedPit.cutDepth / 2, 8] } : null,
    ring: { topY: SEATING.ring.topY, bottomY: SEATING.ring.bottomY },
    volumes: VOLUMES.map(v => ({ id: v.id, box: { ...v.box }, floor: { ...v.floor }, depthRange: v.depthRange,
      walls: Object.values(v.walls).map(p => ({ normal: [...p.normal], constant: p.constant })) }))
  };
  return { group, items, ring, stack, driverData };
}

export function createEraSite({ outputScale = 1, anchorTable = ANCHOR_TABLE, ringWell = {} } = {}) {
  return createSiteDriver({ ...buildKitItems({ outputScale, ringWell }), anchorTable });
}
