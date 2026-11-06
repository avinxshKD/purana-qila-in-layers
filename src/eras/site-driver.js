// Shared CPU state driver for native and packed features. Construction supplies exact, JSON-safe driverData;
// this module never imports or builds the kit, seating, excavation geometry or soil meshes.
import * as THREE from 'three';
import { ERA_IDS, activeTopGrid, sampleGrid } from './stack.js';
import { RING_WELL } from './layout.js';
import { ANCHOR_VIEW, ANCHOR_OFFSET_METRES, createAnchorPicker, roundAnchor } from './anchor-picker.js';
import { ANCHOR_TABLE } from './anchor-table.js';

export { ANCHOR_VIEW, ANCHOR_OFFSET_METRES };
export const CUT_STEPS = 12;
export const BLOCK = Object.freeze({ xmin: -12, xmax: 12, zmin: -8, zmax: 8 });
export const stepOf = excavation => Math.round(Math.max(0, Math.min(1, Number(excavation) || 0)) * CUT_STEPS);
const ERA = Object.fromEntries(ERA_IDS.map((id, i) => [id, i]));
const now = () => globalThis.performance?.now() ?? Date.now();
let anchorYieldChannel;
const anchorYieldQueue = [];
// Priority continuations must not inherit the nested-timer 4 ms clamp. Native import creates no channel.
export function yieldAnchorWork() {
  if (globalThis.scheduler?.yield) return globalThis.scheduler.yield();
  if (!globalThis.MessageChannel) return new Promise(resolve => setTimeout(resolve, 0));
  if (!anchorYieldChannel) {
    anchorYieldChannel = new globalThis.MessageChannel();
    anchorYieldChannel.port1.onmessage = () => {
      anchorYieldQueue.shift()();
      if (!anchorYieldQueue.length) {
        anchorYieldChannel.port1.unref?.(); anchorYieldChannel.port2.unref?.();
      }
    };
  }
  return new Promise(resolve => {
    anchorYieldQueue.push(resolve);
    anchorYieldChannel.port1.ref?.(); anchorYieldChannel.port2.ref?.();
    anchorYieldChannel.port2.postMessage(null);
  });
}
export const ANCHOR_PARTS = Object.freeze({ 'sunga-burnt-patches': ['at masonry'] });
export const PRE_MAURYAN_SOIL_X = -3;
export function anchorStateKey(scene) {
  const c = v => Math.max(0, Math.min(1, v));
  return `${stepOf(scene.excavation)}|${scene.deposits.map(c).join(',')}|${scene.features.map(c).join(',')}`;
}

// World half-space -> feature-local half-space, shared with the native cut model.
export function toLocalPlane(plane, matrix) {
  const e = matrix.elements, [nx, ny, nz] = plane.normal;
  return {
    normal: [e[0] * nx + e[1] * ny + e[2] * nz, e[4] * nx + e[5] * ny + e[6] * nz, e[8] * nx + e[9] * ny + e[10] * nz],
    constant: nx * e[12] + ny * e[13] + nz * e[14] + plane.constant
  };
}

export function createSiteDriver({ group, items, ring, stack, driverData, anchorTable = ANCHOR_TABLE, meshOccludes, cacheCandidates = false, prepareAnchors = async () => ({ maxChunkMs: 0 }) }) {
  const activeTop = new Float32Array(stack.nx * stack.nz), centre = driverData.centre;
  let depositsKey = null, current = { step: 0, deposits: Array(10).fill(0) }, ringOffset = 0, topDirty = false;
  let version = 0, currentKey = null, anchorMode = 'exact', selectedTableKey = null, disposed = false, lastRefinement = null;
  const samples = new Map(), sparseTop = new Proxy({}, { get(_target, key) {
    const index = Number(key);
    if (samples.has(index)) return samples.get(index);
    let y = stack.grids[0][index];
    // Match the Float32 store after every layer in activeTopGrid, not a telescoped double-precision sum.
    for (let i = 0; i < ERA_IDS.length; i++) if (current.deposits[i] !== 0) y = Math.fround(y + current.deposits[i] * (stack.grids[i + 1][index] - stack.grids[i][index]));
    samples.set(index, y); return y;
  } });
  const nearestStates = anchorTable ? Object.entries(anchorTable.states).map(([key, entry]) => {
    const [step, deposits, features] = key.split('|');
    return { key, entry, step: Number(step), values: `${deposits},${features}`.split(',').map(Number) };
  }) : [];
  function ensureTop() {
    if (topDirty) { activeTopGrid(stack, current.deposits, activeTop); topDirty = false; samples.clear(); }
    return activeTop;
  }
  function nearestEntry() {
    let best = null, bestScore = Infinity;
    for (const candidate of nearestStates) {
      let score = Math.abs(candidate.step - current.step) * 1e4;
      if (score > bestScore) continue;
      for (let i = 0; i < 10; i++) score += (candidate.values[i] - current.deposits[i]) ** 2 + (candidate.values[i + 10] - current.features[i]) ** 2;
      if (score < bestScore) { best = candidate; bestScore = score; }
    }
    selectedTableKey = best.key; return best.entry;
  }
  // Rehydrate only the volume queries needed by soil/anchor state. Native cut specs retain their live volume objects.
  const volumes = driverData.volumes.map(v => {
    const floorAt = (x, z) => v.floor.A * x + v.floor.B * z + v.floor.C;
    const stepOffset = k => (1 - Math.max(0, Math.min(CUT_STEPS, k)) / CUT_STEPS) * v.depthRange;
    return { ...v, floorAt, stepFloorAt: (k, x, z) => floorAt(x, z) + stepOffset(k),
      removes: (k, x, y, z) => k > 0 && y >= floorAt(x, z) + stepOffset(k) &&
        v.walls.every(p => p.normal[0] * x + p.normal[1] * y + p.normal[2] * z + p.constant >= 0) };
  });
  const removedAt = (k, x, y, z) => volumes.some(v => v.removes(k, x, y, z));
  function placeRing(offset) {
    if (offset === ringOffset) return;
    ringOffset = offset;
    // The heap on the pit floor is not part of the mouth and stays put.
    for (const it of ring.items) if (it.part !== 'soil') { it.matrix.makeTranslation(0, offset, 0); it.handle.object.matrix.copy(it.matrix); it.handle.object.updateMatrixWorld(true); }
  }

  function cutSpec(it, k) {
    let spec = it.specs.get(k);
    if (spec) return spec;
    const trenches = [];
    for (const rule of it.rules) {
      if (rule.rule !== 'remove' || k === 0) continue;
      // Skip a volume whose moving floor is still above every in-volume point: the spec then repeats an earlier step.
      const v = rule.volume, off = v.stepOffset(k), pts = rule.inside;
      let reaches = false;
      for (let i = 0; i < pts.length && !reaches; i += 3) reaches = pts[i + 1] >= v.floorAt(pts[i], pts[i + 2]) + off;
      if (!reaches) continue;
      trenches.push({ planes: v.planesAt(k).map(p => toLocalPlane(p, it.matrix)), finalFloor: -1e3 });
    }
    spec = { keep: it.keep, trenches };
    it.specs.set(k, spec);
    return spec;
  }
  function soilAt(x, y, z, k = current.step) {
    if (x < BLOCK.xmin || x > BLOCK.xmax || z < BLOCK.zmin || z > BLOCK.zmax) return false;
    if (y >= sampleGrid(stack, topDirty ? sparseTop : activeTop, x, z)) return false;
    // The well mouth: no soil inside the rings above their top (the fill is flush with the top ring).
    if (current.deposits[ERA.sunga] <= 0 && y > driverData.ring.topY + ringOffset && Math.hypot(x - RING_WELL.x, z - RING_WELL.z) < RING_WELL.radius) return false;
    return !removedAt(k, x, y, z);
  }
  const picker = createAnchorPicker({ items, soilAt, stack, activeTop, block: BLOCK, meshOccludes, cacheCandidates });
  const worldAnchor = (it, a) => {
    const p = new THREE.Vector3(...a.point).applyMatrix4(it.matrix), n = new THREE.Vector3(...a.normal).applyMatrix3(it.normalMatrix).normalize();
    return { point: p.toArray(), normal: n.toArray() };
  };
  function exposed(point, normal) {
    const e = .03;
    return !soilAt(point[0] + normal[0] * e, point[1] + normal[1] * e, point[2] + normal[2] * e);
  }
  const offset = (point, normal) => point.map((v, i) => v + normal[i] * ANCHOR_OFFSET_METRES);
  const byFeature = new Map();
  // The ring well's anchor is placed below (top lip or pit face), not picked from its parts.
  for (const it of items) if (!it.ring) { if (!byFeature.has(it.featureId)) byFeature.set(it.featureId, []); byFeature.get(it.featureId).push(it); }
  const NONE = Object.freeze({ point: null, normal: null, visible: false, revealed: false, part: null });
  // Run-time pick per feature: the candidate seen from the most film eyes (all five ranks first), preferred part next,
  // then the quantized candidate score; `prefer` (featureId -> rounded point) keeps an earlier choice while it is
  // still a candidate seen from every eye.
  function pickFeatureAnchors(prefer = {}) {
    ensureTop();
    picker.refresh();
    const out = {};
    for (const [id, list] of byFeature) {
      const parts = ANCHOR_PARTS[id];
      let best = null;
      for (const it of list) {
        const a = it.handle.anchors[it.kitId];
        if (!a || !a.visible) continue;
        const partRank = parts ? (parts.includes(it.part) ? 2 : 0) : 0, cands = it.findCandidates ?? picker.candidates(it);
        let pick = null, seen = 0;
        const kept = prefer[id] && cands.find(c => roundAnchor(c.anchor).join(',') === prefer[id]);
        if (kept && picker.eyesClear(kept).every(Boolean)) { pick = kept; seen = 5; }
        else ({ candidate: pick, eyes: seen } = it.findCandidates ? { candidate: cands[0], eyes: picker.eyesClear(cands[0]).filter(Boolean).length } : picker.pick(it));
        const w = pick ? { point: pick.anchor, normal: pick.normal, score: pick.score } : { ...(f => ({ point: offset(f.point, f.normal), normal: f.normal }))(worldAnchor(it, a)), score: -1 };
        const rank = (kept && pick === kept ? 32 : 0) + (seen === 5 ? 8 : 0) + (seen > 0 ? 4 : 0) + partRank;
        if (!best || rank > best.rank || (rank === best.rank && w.score > best.score)) best = { rank, score: w.score, point: roundAnchor(w.point), normal: roundAnchor(w.normal), open: seen > 0, eyes: seen, part: it.part };
      }
      out[id] = best ? { point: best.point, normal: best.normal, visible: best.open, revealed: true, part: best.part, eyes: best.eyes } : { ...NONE };
    }
    return out;
  }
  function tableAnchors(entry) {
    const out = {};
    anchorTable.features.forEach((id, i) => {
      const v = entry[i];
      if (v < 0) { out[id] = { ...NONE }; return; }
      const p = anchorTable.points[v >> 1];
      out[id] = { point: p.slice(0, 3), normal: p.slice(3, 6), visible: (v & 1) === 1, revealed: true, part: p[6] < 0 ? null : anchorTable.parts[p[6]] };
    });
    return out;
  }
  function featureAnchors(deposits, key, nearest = false) {
    let entry = anchorTable?.states[key];
    if (entry) selectedTableKey = key;
    else if (nearest) entry = nearestEntry();
    else selectedTableKey = null;
    const out = entry ? tableAnchors(entry) : pickFeatureAnchors();
    if (!entry) for (const a of Object.values(out)) delete a.eyes;
    // Sealed pit: the site drawer anchor sits on its front-face section, never on a top surface (M0 review rule 4).
    const sp = driverData.sealedPit;
    if (sp && out[sp.id]) {
      const p = sp.point;
      out[sp.id] = { ...out[sp.id], point: roundAnchor(offset(p, [0, 0, 1])), normal: [0, 0, 1], visible: out[sp.id].revealed && exposed(p, [0, 0, 1]) };
    }
    // Pre-Mauryan soil: middle of its band on the front face, once deposited.
    {
      const b = driverData.preMauryanBand, d = Math.max(0, Math.min(1, deposits[0])), p = [PRE_MAURYAN_SOIL_X, b[0] + (b[1] - b[0]) * d / 2, 8];
      out['pre-mauryan-soil'] = { point: roundAnchor(offset(p, [0, 0, 1])), normal: [0, 0, 1], visible: d > 0 && exposed(p, [0, 0, 1]), revealed: d > 0, part: null };
    }
    // Ring well: its top lip while the well is buried; its front face in the pit once the pit is open below the top.
    {
      const ring = driverData.ring, k = current.step, pit = volumes.find(v => v.id === 'ring-well-pit');
      const zf = RING_WELL.z + RING_WELL.radius, open = pit.stepFloorAt(k, RING_WELL.x, zf) < ring.topY - .05;
      const yOpen = (Math.max(ring.bottomY, pit.stepFloorAt(k, RING_WELL.x, zf)) + ring.topY) / 2;
      const p = open ? [RING_WELL.x, yOpen, zf] : [RING_WELL.x, ring.topY + ringOffset, zf - .02], n = open ? [0, 0, 1] : [0, 1, 0];
      const revealed = current.features[ERA.mauryan] > 0;
      out['mauryan-ring-well'] = { point: roundAnchor(offset(p, n)), normal: n, visible: revealed && exposed(p, n), revealed, part: null };
    }
    // Deepest exposure: lowest point of the controlled-pit floor.
    {
      const lower = volumes.find(v => v.id === 'controlled-pit:lower'), b = lower.box; let p = null;
      for (const x of [b.xmin, b.xmax]) for (const z of [b.zmin, b.zmax]) { const y = lower.floorAt(x, z); if (!p || y < p[1]) p = [x, y, z]; }
      const q = [p[0] + Math.sign((b.xmin + b.xmax) / 2 - p[0]) * .1, 0, p[2] + Math.sign((b.zmin + b.zmax) / 2 - p[2]) * .1]; q[1] = lower.floorAt(q[0], q[2]);
      out['deepest-cut'] = { point: roundAnchor(offset(q, [0, 1, 0])), normal: [0, 1, 0], visible: current.step === CUT_STEPS && exposed(q, [0, 1, 0]), revealed: current.step === CUT_STEPS, part: null };
    }
    return out;
  }
  function validate(scene) {
    if (!scene || scene.schemaVersion !== 1) throw new Error('applyState: schemaVersion 1 required');
    for (const key of ['deposits', 'features']) if (!Array.isArray(scene[key]) || scene[key].length !== 10 || !scene[key].every(Number.isFinite)) throw new Error(`applyState: ${key} must be ten finite numbers`);
    if (!Number.isFinite(scene.excavation)) throw new Error('applyState: finite excavation required');
  }
  function resultFor(anchors) {
    let y = centre[0]; for (let i = 0; i < ERA_IDS.length; i++) y += current.deposits[i] * (centre[i + 1] - centre[i]);
    return { featureAnchors: anchors, activeTopAnchor: { point: [0, y, 0], normal: [0, 1, 0] }, hasReconstructionOutline: false, cutStep: current.step };
  }
  function applyState(scene, { anchors = 'exact' } = {}) {
    validate(scene);
    if (anchors !== 'nearest' && anchors !== 'exact') throw new Error('applyState: anchors must be nearest or exact');
    if (anchors === 'nearest' && !nearestStates.length) throw new Error('applyState: nearest anchors require a nonempty anchor table');
    const k = stepOf(scene.excavation), deposits = scene.deposits.map(v => Math.max(0, Math.min(1, v))), features = scene.features.map(v => Math.max(0, Math.min(1, v)));
    for (const it of items) {
      if (it.step !== k) { it.handle.setCuts(cutSpec(it, k), k); it.step = k; }
      // Courses shown: a wall's buried courses come with its first step and the steps build the part above the deposit
      // (M). The course count is fixed here (rounded) and passed mid-course, so float noise cannot move a course.
      const f = it.dug && deposits[it.era] < it.dugMin ? 0 : features[it.era], n = it.handle.courseCount;
      const q = f > 0 ? Math.min(n, Math.ceil(Math.round((it.buried + f * (1 - it.buried)) * n * 1e6) / 1e6)) : 0;
      it.handle.setReveal(q > 0 ? (q - .5) / n : 0);
    }
    placeRing(features[ERA.mauryan] > 0 ? Math.round(-(1 - deposits[ERA.mauryan]) * ring.sinkMetres * 1e6) / 1e6 : 0);
    const key = deposits.join(',');
    if (key !== depositsKey) { depositsKey = key; topDirty = true; samples.clear(); }
    current = { step: k, deposits, features };
    version++; currentKey = anchorStateKey(scene); anchorMode = anchors;
    if (anchors === 'exact') ensureTop();
    return resultFor(featureAnchors(deposits, currentKey, anchors === 'nearest'));
  }
  async function refineAnchors({ signal } = {}) {
    if (currentKey === null) throw new Error('refineAnchors: apply a state first');
    const revision = version, valid = () => !disposed && !signal?.aborted && version === revision, started = now();
    if (!valid()) return null;
    const tableEntry = anchorTable?.states[currentKey];
    const preparation = tableEntry ? null : await prepareAnchors({ signal, priority: true, valid });
    if (!valid()) return null;
    const chunkBudgetMs = 8;
    let chunkStart = now(), maxChunkMs = preparation?.maxChunkMs ?? 0, workMs = 0, chunks = 0;
    const finishChunk = () => { const ms = now() - chunkStart; maxChunkMs = Math.max(maxChunkMs, ms); workMs += ms; chunks++; };
    const yieldWork = async () => { finishChunk(); await yieldAnchorWork(); chunkStart = now(); };
    ensureTop();
    if (!tableEntry) {
      picker.refresh();
      // Warm precisely the candidates the unchanged synchronous picker will visit. It then only repeats cheap soil
      // checks; all feature-ray results and candidate arrays are ready. Yield between candidates, not whole features.
      for (const list of byFeature.values()) for (const it of list) {
        if (!valid()) return null;
        if (!it.handle.anchors[it.kitId]?.visible) continue;
        if (now() - chunkStart >= chunkBudgetMs) { await yieldWork(); if (!valid()) return null; }
        const cands = it.findCandidates ?? picker.candidates(it);
        if (now() - chunkStart >= chunkBudgetMs) { await yieldWork(); if (!valid()) return null; }
        for (const candidate of it.findCandidates ? cands.slice(0, 1) : cands) {
          const clear = picker.eyesClear(candidate);
          if (clear.every(Boolean)) break;
          if (now() - chunkStart >= chunkBudgetMs) { await yieldWork(); if (!valid()) return null; }
        }
      }
    }
    if (!valid()) return null;
    const result = resultFor(featureAnchors(current.deposits, currentKey));
    finishChunk(); anchorMode = 'exact';
    lastRefinement = { totalMs: now() - started, workMs, maxChunkMs, chunks };
    return result;
  }
  // Fills every cache the state needs without touching the displayed geometry; returns elapsed ms.
  function warmState(scene) {
    validate(scene);
    const start = now(), k = stepOf(scene.excavation);
    for (const it of items) it.handle.warmCuts(cutSpec(it, k), k);
    for (const warm of sceneWarmers) warm(k);
    return now() - start;
  }
  const sceneWarmers = [];
  return {
    group, items, stack, driverData, get activeTop() { return ensureTop(); }, ringWell: { tones: ring.tones, sinkMetres: ring.sinkMetres, offset: () => ringOffset }, applyState, refineAnchors, prepareAnchors, warmState, soilAt, sceneWarmers, cutSteps: CUT_STEPS, pickFeatureAnchors, anchorPicker: picker,
    anchorStatus: () => ({ mode: anchorMode, tableKey: selectedTableKey, topDirty, refinement: lastRefinement }),
    get state() { return current; },
    trenchRules: () => items.map(it => ({ key: it.key, rules: it.rules.map(r => ({ volume: r.id, rule: r.rule === 'preserve' && r.topMinusFloor < 0 ? 'below the final floor' : r.rule, baseMinusFloor: +r.baseMinusFloor.toFixed(3), topMinusFloor: +r.topMinusFloor.toFixed(3) })) })),
    dispose() { disposed = true; version++; for (const it of items) { it.handle.dispose(); group.remove(it.handle.object); } }
  };
}
