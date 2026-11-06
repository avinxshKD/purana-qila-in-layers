// Pack-backed features. The shared CPU driver owns state rules; these handles own only their cloned geometry and
// stock materials. Wrappers share pack attributes, are reused across scrubs, and are released before pack eviction.
import * as THREE from 'three';
import { createSiteDriver, yieldAnchorWork } from '../eras/site-driver.js';

const clamp = v => Math.max(0, Math.min(1, v));
const now = () => globalThis.performance?.now() ?? Date.now();
const painted = (finish, i) => finish && ((finish.getX(i) > .5 && finish.getX(i) < 1.5) || (finish.getX(i) > 2.5 && finish.getY(i) > .5));
const srgbWhite = () => new THREE.DataTexture(new Uint16Array([15360, 15360, 15360, 15360]), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType);

// Stock maps multiply vertex colour, whereas the kit's dust is premultiplied additive colour. Rasterize the local
// base-colour field and turn dust into a linear multiplier, (1-a) + dust/base. This keeps fine paint particles without
// custom GLSL or per-feature defines. The highest projected face supplies the field where top/bottom faces overlap.
function paintMap(source, data, meta) {
  const { width: w, height: h, box } = meta, pos = source.attributes.position, colour = source.attributes.color, finish = source.attributes.featureFinish;
  if (!colour || !finish) return null;
  const base = new Float32Array(w * h * 3), heights = new Float32Array(w * h).fill(-Infinity), average = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < pos.count; i++) if (painted(finish, i)) {
    average[0] += colour.getX(i); average[1] += colour.getY(i); average[2] += colour.getZ(i); count++;
  }
  if (!count) return null;
  for (let c = 0; c < 3; c++) average[c] /= count;
  for (let i = 0; i < w * h; i++) base.set(average, i * 3);
  const index = source.index, length = index?.count ?? pos.count, at = i => index ? index.getX(i) : i;
  for (let t = 0; t + 2 < length; t += 3) {
    const ids = [at(t), at(t + 1), at(t + 2)];
    if (!ids.every(i => painted(finish, i))) continue;
    const p = ids.map(i => [(pos.getX(i) - box[0]) / box[2] * w - .5, (pos.getZ(i) - box[1]) / box[3] * h - .5]);
    const [a, b, c] = p, det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(det) < 1e-10) continue;
    const xmin = Math.max(0, Math.ceil(Math.min(...p.map(v => v[0])))), xmax = Math.min(w - 1, Math.floor(Math.max(...p.map(v => v[0]))));
    const ymin = Math.max(0, Math.ceil(Math.min(...p.map(v => v[1])))), ymax = Math.min(h - 1, Math.floor(Math.max(...p.map(v => v[1]))));
    for (let y = ymin; y <= ymax; y++) for (let x = xmin; x <= xmax; x++) {
      const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / det;
      const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / det, z = 1 - u - v;
      if (Math.min(u, v, z) < -1e-6) continue;
      const k = y * w + x, height = u * pos.getY(ids[0]) + v * pos.getY(ids[1]) + z * pos.getY(ids[2]);
      if (height < heights[k]) continue;
      heights[k] = height;
      for (let channel = 0; channel < 3; channel++) base[3 * k + channel] = u * colour.array[ids[0] * 3 + channel] + v * colour.array[ids[1] * 3 + channel] + z * colour.array[ids[2] * 3 + channel];
    }
  }
  // Duplicate a one-texel border around the paint and reserve a white sentinel for unpainted triangles.
  const tw = w + 3, th = h + 3, values = new Uint16Array(tw * th * 4).fill(15360);
  for (let y = 0; y < h + 2; y++) for (let x = 0; x < w + 2; x++) {
    const p = Math.max(0, Math.min(h - 1, y - 1)) * w + Math.max(0, Math.min(w - 1, x - 1)), dst = (y * tw + x) * 4;
    for (let c = 0; c < 3; c++) values[dst + c] = THREE.DataUtils.toHalfFloat(1 - data[4 * p + 3] / 255 + data[4 * p + c] / 255 / Math.max(1e-6, base[3 * p + c]));
  }
  const texture = new THREE.DataTexture(values, tw, th, THREE.RGBAFormat, THREE.HalfFloatType);
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
  return texture;
}

function emptyGeometry() {
  const g = new THREE.BufferGeometry();
  for (const [name, size] of [['position', 3], ['normal', 3], ['color', 3], ['uv', 2]]) g.setAttribute(name, new THREE.Float32BufferAttribute([], size));
  g.setDrawRange(0, 0);
  return g;
}

// CPU-only acceleration is deliberately lazy: the caller starts preparation after ready. Small index views bound
// each indivisible tree build, and indirect trees never reorder the packed reveal indices.
function createPickerAcceleration(items) {
  const records = new Map(), inverses = new WeakMap(), localRay = new THREE.Ray(), rangeRay = new THREE.Ray(), hit = new THREE.Vector3(), boxHit = new THREE.Vector3();
  let module, disposed = false, treeCount = 0, treeBytes = 0, maxBuildMs = 0, lastPreparation = null;
  const pause = priority => !priority && globalThis.requestIdleCallback
    ? new Promise(resolve => globalThis.requestIdleCallback(resolve, { timeout: 32 }))
    : yieldAnchorWork();
  const rangeOf = g => {
    const total = g.index?.count ?? g.attributes.position.count, start = g.drawRange.start;
    return { start, count: Math.max(0, Math.min(total - start, g.drawRange.count)) };
  };
  function recordFor(g) {
    let record = records.get(g);
    if (record) return record;
    record = { geometry: g, chunks: new Map(), ranges: new Map(), disposed: false };
    record.release = () => {
      record.disposed = true;
      for (const chunk of record.chunks.values()) { treeCount--; treeBytes -= chunk.bytes; }
      record.chunks.clear(); record.ranges.clear(); records.delete(g); g.removeEventListener('dispose', record.release);
    };
    records.set(g, record); g.addEventListener('dispose', record.release); return record;
  }
  async function prepare({ signal, priority = false, valid = () => true } = {}) {
    const alive = () => !disposed && !signal?.aborted && valid(), started = now();
    if (!alive()) return null;
    module ??= import('three-mesh-bvh');
    const { MeshBVH } = await module;
    if (!alive()) return null;
    const work = [];
    for (const it of items) for (const mesh of it.handle.object.children) {
      if (!mesh.visible || !mesh.material.visible || mesh.material.opacity === 0) continue;
      const g = mesh.geometry, { start, count } = rangeOf(g);
      if (!count) continue;
      const record = recordFor(g), key = `${start}:${count}`;
      let entry = record.ranges.get(key);
      if (!entry) record.ranges.set(key, entry = { ready: false, trees: [] });
      if (!entry.ready) work.push({ record, entry, start, count });
    }
    await pause(priority);
    const chunkBudgetMs = 8;
    let chunkStart = now(), maxChunkMs = 0, workMs = 0, chunks = 0;
    const finishChunk = () => { const ms = now() - chunkStart; maxChunkMs = Math.max(maxChunkMs, ms); workMs += ms; chunks++; };
    for (const { record, entry, start, count } of work) {
      if (record.disposed) continue;
      const trees = [];
      for (let at = start; at < start + count; at += 4096 * 3) {
        if (!alive()) return null;
        if (record.disposed) break;
        const length = Math.min(4096 * 3, start + count - at), key = `${at}:${length}`;
        let chunk = record.chunks.get(key);
        if (!chunk) {
          if (now() - chunkStart >= chunkBudgetMs) { finishChunk(); await pause(priority); chunkStart = now(); if (!alive()) return null; }
          if (record.disposed) break;
          const g = record.geometry, cpu = new THREE.BufferGeometry(), pos = g.attributes.position, buildStarted = now();
          if (g.boundingSphere === null) g.computeBoundingSphere();
          if (g.index) {
            cpu.setAttribute('position', pos);
            cpu.setIndex(new THREE.BufferAttribute(g.index.array.subarray(at, at + length), 1));
          } else cpu.setAttribute('position', new THREE.BufferAttribute(pos.array.subarray(at * pos.itemSize, (at + length) * pos.itemSize), pos.itemSize, pos.normalized));
          const tree = new MeshBVH(cpu, { indirect: true }), data = MeshBVH.serialize(tree, { cloneBuffers: false });
          const bytes = data.roots.reduce((sum, root) => sum + root.byteLength, 0) + (data.indirectBuffer?.byteLength ?? 0) + (g.index ? 0 : cpu.index.array.byteLength);
          maxBuildMs = Math.max(maxBuildMs, now() - buildStarted);
          record.chunks.set(key, chunk = { tree, bytes, bounds: tree.getBoundingBox(new THREE.Box3()) }); treeCount++; treeBytes += bytes;
        }
        trees.push(chunk);
      }
      if (!record.disposed) { entry.trees = trees; entry.ready = true; }
    }
    finishChunk();
    lastPreparation = { totalMs: now() - started, workMs, maxChunkMs, chunks };
    return lastPreparation;
  }
  function meshOccludes(mesh, caster) {
    if (!mesh.layers.test(caster.layers)) return false;
    const { start, count } = rangeOf(mesh.geometry), entry = records.get(mesh.geometry)?.ranges.get(`${start}:${count}`);
    if (!entry?.ready) return caster.intersectObject(mesh, false).length > 0;
    let cached = inverses.get(mesh);
    if (!cached || cached.geometryId !== mesh.geometry.uuid || !cached.world.equals(mesh.matrixWorld)) {
      cached = { geometryId: mesh.geometry.uuid, world: mesh.matrixWorld.clone(), inverse: mesh.matrixWorld.clone().invert(),
        sphere: mesh.geometry.boundingSphere.clone().applyMatrix4(mesh.matrixWorld) }; inverses.set(mesh, cached);
    }
    // Keep Three's broadphase, including its exact near/far sphere decision under affine seating.
    rangeRay.copy(caster.ray).recast(caster.near);
    if (!cached.sphere.containsPoint(rangeRay.origin)) {
      if (!rangeRay.intersectSphere(cached.sphere, boxHit) || rangeRay.origin.distanceToSquared(boxHit) > (caster.far - caster.near) ** 2) return false;
    }
    localRay.copy(caster.ray).applyMatrix4(cached.inverse);
    if (mesh.geometry.boundingBox && !localRay.intersectsBox(mesh.geometry.boundingBox)) return false;
    const e = mesh.matrixWorld.elements, d = localRay.direction;
    // Matrix column lengths are not a valid ray-distance scale under seating shear.
    const scale = Math.hypot(e[0] * d.x + e[4] * d.y + e[8] * d.z, e[1] * d.x + e[5] * d.y + e[9] * d.z, e[2] * d.x + e[6] * d.y + e[10] * d.z);
    const localFar = caster.far / scale, farSquared = (localFar + 1e-7 * Math.max(1, localFar)) ** 2, side = mesh.material.side;
    const callbacks = {
      intersectsBounds(box) { return box.containsPoint(localRay.origin) || !!(localRay.intersectBox(box, boxHit) && boxHit.distanceToSquared(localRay.origin) <= farSquared); },
      intersectsTriangle(triangle) {
        const p = side === THREE.BackSide ? localRay.intersectTriangle(triangle.c, triangle.b, triangle.a, true, hit)
          : localRay.intersectTriangle(triangle.a, triangle.b, triangle.c, side !== THREE.DoubleSide, hit);
        if (!p) return false;
        const distance = hit.applyMatrix4(mesh.matrixWorld).distanceTo(caster.ray.origin);
        return distance >= caster.near && distance <= caster.far;
      }
    };
    for (const chunk of entry.trees) if (callbacks.intersectsBounds(chunk.bounds) && chunk.tree.shapecast(callbacks)) return true;
    return false;
  }
  return {
    prepare, meshOccludes,
    status: () => ({ trees: treeCount, bytes: treeBytes, maxBuildMs, preparation: lastPreparation }),
    dispose() { disposed = true; for (const record of records.values()) record.release(); }
  };
}

export function createTierFeatures({ core, geometry, stack, anchorTable } = {}) {
  if (!core?.meta?.featureDriver) throw new Error('site-tier: core featureDriver is required');
  if (typeof geometry !== 'function') throw new TypeError('site-tier: resident geometry resolver is required');
  const group = new THREE.Group(); group.name = 'era-features'; group.userData.sectionRole = 'feature';
  const items = [], ringItems = [], handles = [], neutral = srgbWhite();
  const paintStats = { textures: 0, bytes: 0, loadCpuMs: 0 };
  neutral.needsUpdate = true;
  let disposed = false;

  function makeHandle(meta, key, ringPart = null) {
    const object = new THREE.Group(); object.name = ringPart ? key : meta.kitId; object.matrixAutoUpdate = false;
    const slots = ringPart ? [ringPart] : meta.slots, anchors = {}, bounds = new THREE.Box3();
    const stats = { triangles: 0, drawCalls: 0, lastCutCacheHit: true };
    const meshes = slots.map(slot => {
      // Paint, colour and roughness are uniforms. Only the native feature/ring side distinction changes a program;
      // preserving it also keeps the fallback picker's back-face ray tests identical.
      const material = new THREE.MeshStandardMaterial({ color: slot.colour ?? 0xffffff, vertexColors: true, map: neutral, roughness: slot.roughness ?? 1, metalness: 0, side: ringPart ? THREE.DoubleSide : THREE.FrontSide });
      const mesh = new THREE.Mesh(emptyGeometry(), material);
      mesh.name = ringPart ? `ring-${ringPart.key}` : ''; mesh.castShadow = slot.castShadow; mesh.receiveShadow = slot.receiveShadow;
      mesh.frustumCulled = false; mesh.userData.sectionRole = 'feature';
      if (ringPart) mesh.userData.group = `ring-${ringPart.key}`;
      object.add(mesh); return mesh;
    });
    const caches = slots.map(() => new Map());
    let step = null, fraction = 1, ends = slots.map(() => [0]), currentIds = [];
    const handle = { object, courseCount: ringPart ? 1 : meta.courseCount, anchors, bounds, stats, setCuts, setReveal, warmCuts: () => 0, dispose,
      release(ids) {
        let count = 0;
        caches.forEach(cache => { for (const id of ids) { const entry = cache.get(id); if (entry) { entry.geometry.dispose(); entry.texture?.dispose(); cache.delete(id); count++; } } });
        return count;
      },
      uses: ids => currentIds.some(id => id && ids.has(id))
    };
    handles.push(handle);
    function refreshReveal() {
      const q = fraction === 0 ? 0 : Math.min(handle.courseCount, Math.ceil(fraction * handle.courseCount));
      stats.triangles = 0; stats.drawCalls = 0;
      meshes.forEach((mesh, i) => {
        const count = ringPart ? (q ? mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count : 0) : ends[i][q];
        if (!ringPart) mesh.geometry.setDrawRange(0, count);
        mesh.visible = count > 0;
        if (mesh.visible) { stats.triangles += count / 3; stats.drawCalls++; }
      });
      if (!ringPart && step !== null) {
        const tier = meta.kitAnchors[step][q];
        for (const id of Object.keys(anchors)) delete anchors[id];
        anchors[meta.kitId] = tier.anchor;
      }
    }
    function setReveal(f) {
      if (!Number.isFinite(f)) throw new Error('Feature reveal must be finite');
      fraction = clamp(f); refreshReveal();
    }
    function setCuts(_spec, k = core.meta.defaultStep) {
      if (disposed) throw new Error('Disposed feature');
      if (step === k || (ringPart && step !== null)) return;
      const ids = ringPart ? [ringPart.id] : core.meta.featureSteps[k]?.[key];
      if (!ids) throw new Error(`site-tier: no feature step ${k} for ${key}`);
      // Resolve the whole item before replacing any displayed slot. The world's residency gate precedes this call.
      const sources = ids.map((id, i) => caches[i].has(id) ? null : id ? geometry(id) : null);
      const next = sources.map((entry, i) => {
        const cached = caches[i].get(ids[i]);
        if (cached) return cached;
        const g = entry ? new THREE.BufferGeometry() : emptyGeometry();
        if (entry) {
          for (const [name, attribute] of Object.entries(entry.geometry.attributes)) g.setAttribute(name, attribute);
          g.setIndex(entry.geometry.index);
          g.boundingBox = entry.geometry.boundingBox?.clone() ?? null;
          g.boundingSphere = entry.geometry.boundingSphere?.clone() ?? null;
        }
        const pos = g.attributes.position;
        if (!g.attributes.color) g.setAttribute('color', new THREE.Uint8BufferAttribute(new Uint8Array(pos.count * 3).fill(255), 3, true));
        const slot = slots[i], paint = slot.paint && core.arrays[slot.paint], desc = slot.paint && core.header.arrays[slot.paint];
        const paintStart = now(), texture = paint && entry ? paintMap(entry.geometry, paint, desc) : null;
        if (step === null && texture) {
          paintStats.textures++; paintStats.bytes += texture.image.data.byteLength; paintStats.loadCpuMs += now() - paintStart;
        }
        const uv = texture ? new Float32Array(pos.count * 2) : null, finish = g.attributes.featureFinish;
        for (let v = 0; texture && v < pos.count; v++) {
          const active = texture && painted(finish, v);
          uv[2 * v] = active ? (clamp((pos.getX(v) - desc.box[0]) / desc.box[2]) * desc.width + 1) / (desc.width + 3) : texture ? (desc.width + 2.5) / (desc.width + 3) : .5;
          uv[2 * v + 1] = active ? (clamp((pos.getZ(v) - desc.box[1]) / desc.box[3]) * desc.height + 1) / (desc.height + 3) : texture ? (desc.height + 2.5) / (desc.height + 3) : .5;
        }
        if (uv) g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        else if (!g.attributes.uv) g.setAttribute('uv', new THREE.Uint8BufferAttribute(new Uint8Array(pos.count * 2), 2, true));
        const result = { geometry: g, texture, ends: entry?.record.ends ?? Array(handle.courseCount + 1).fill(0) };
        caches[i].set(ids[i], result);
        return result;
      });
      bounds.makeEmpty();
      next.forEach((entry, i) => {
        if (step === null) meshes[i].geometry.dispose();
        meshes[i].geometry = entry.geometry; meshes[i].material.map = entry.texture ?? neutral;
        if (entry.geometry.boundingBox) bounds.union(entry.geometry.boundingBox);
      });
      ends = next.map(entry => entry.ends); currentIds = ids; step = k;
      if (!ringPart) handle.courseCount = meta.kitAnchors[k][0].courseCount;
      refreshReveal();
    }
    function dispose() {
      for (const cache of caches) { for (const entry of cache.values()) { entry.geometry.dispose(); entry.texture?.dispose(); } cache.clear(); }
      for (const mesh of meshes) mesh.material.dispose();
      ends = []; currentIds = [];
    }
    setCuts(null, core.meta.defaultStep);
    return handle;
  }

  for (const [key, meta] of Object.entries(core.meta.featureItems)) {
    const matrix = new THREE.Matrix4().fromArray(meta.matrix), handle = makeHandle(meta, key);
    handle.object.matrix.copy(matrix); handle.object.updateMatrixWorld(true); group.add(handle.object);
    items.push({ key, featureId: meta.featureId, part: meta.part, kitId: meta.kitId, era: meta.era, rule: meta.rule, dug: meta.dug, dugMin: meta.dugMin, buried: meta.buried,
      bbox: new THREE.Box3(new THREE.Vector3(...meta.bbox.min), new THREE.Vector3(...meta.bbox.max)), findCandidates: meta.findCandidates ?? undefined,
      matrix, normalMatrix: new THREE.Matrix3().getNormalMatrix(matrix), handle, step: null, specs: new Map(), rules: [], keep: [] });
  }
  for (const part of core.meta.ring) {
    const key = `mauryan-ring-well:${part.key}`, handle = makeHandle({}, key, part), bbox = handle.bounds.clone();
    bbox.min.y -= core.meta.ringWell.sinkMetres;
    group.add(handle.object); handle.object.updateMatrixWorld(true);
    const item = { key, featureId: 'mauryan-ring-well', part: part.key, kitId: null, era: 1, rule: 'opening', dug: true, dugMin: 0, buried: 0, ring: true,
      matrix: new THREE.Matrix4(), normalMatrix: new THREE.Matrix3(), bbox, handle, step: null, specs: new Map(), rules: [], keep: [] };
    items.push(item); ringItems.push(item);
  }
  const acceleration = createPickerAcceleration(items);
  const site = createSiteDriver({ group, items, ring: { items: ringItems, sinkMetres: core.meta.ringWell.sinkMetres }, stack, driverData: core.meta.featureDriver, anchorTable,
    meshOccludes: acceleration.meshOccludes, cacheCandidates: true, prepareAnchors: acceleration.prepare });
  const anchorStatus = site.anchorStatus;
  site.anchorStatus = () => ({ ...anchorStatus(), ...acceleration.status() });
  const disposeSite = site.dispose;
  site.release = ids => {
    const set = new Set(ids);
    if (handles.some(handle => handle.uses(set))) throw new Error('site-tier: cannot release displayed feature geometry');
    return handles.reduce((count, handle) => count + handle.release(set), 0);
  };
  site.dispose = () => { if (disposed) return; acceleration.dispose(); disposeSite(); neutral.dispose(); disposed = true; };
  return { group, site, paintStats };
}
