// Anchor picking for the era features: camera-facing triangle candidates of the displayed kit geometry, tested on
// lines to five eyes on the film orbit against displayed feature triangles and soil. Used offline by
// scripts/modelling/anchor-table.mjs (which writes the static anchor-table.js the site state reads on film states)
// and at run time only for states the table does not hold. Every rule here is a modelling decision (M).
import * as THREE from 'three';
import { sampleGrid } from './stack.js';

// Candidate facing direction: the middle of the film orbit, azimuth 41.5 deg, elevation 28 deg (src/film/camera.js).
const VIEW = (() => { const az = 41.5 * Math.PI / 180, el = 28 * Math.PI / 180; return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)]; })();
export const ANCHOR_VIEW = Object.freeze(VIEW);
// Returned anchors sit this far out along their surface normal, so a camera ray reaches them before the surface.
export const ANCHOR_OFFSET_METRES = .01;
// Five eyes on the film orbit (u = 0..1: azimuth 35 + 13u, elevation 27 + 2u, target (-1.4, -3.85 - 0.95u, 0), 72.5 m).
export const ANCHOR_EYES = Object.freeze([0, .25, .5, .75, 1].map(u => {
  const az = (35 + 13 * u) * Math.PI / 180, el = (27 + 2 * u) * Math.PI / 180, d = 72.5;
  return Object.freeze([-1.4 + d * Math.cos(el) * Math.sin(az), -3.85 - .95 * u + d * Math.sin(el), d * Math.cos(el) * Math.cos(az)]);
}));
const round6 = v => Math.round(v * 1e6) / 1e6;
export const roundAnchor = p => p && p.map(round6);

export function createAnchorPicker({ items, soilAt, stack, activeTop, block: BLOCK, meshOccludes = (mesh, ray) => ray.intersectObject(mesh, false).length > 0, cacheCandidates = false }) {
  const eyes = ANCHOR_EYES.map(e => new THREE.Vector3(...e));
  const candidateCaches = new WeakMap();
  // Camera-facing triangle centroids, best first, one per 10 cm cell: up to 64 cells of any facing plus 64 of upward
  // faces. Scores are quantized to 1e-3 and ties keep the triangle order, so near-equal floats cannot reorder them.
  function candidates(it) {
    const meshes = it.handle.object.children, key = meshes.map(m => `${m.geometry.uuid}:${m.visible ? m.geometry.drawRange.count : 0}`).join('|');
    if (it.candidateKey === key) return it.candidates;
    let cache = candidateCaches.get(it);
    if (cacheCandidates && !cache) candidateCaches.set(it, cache = new Map());
    if (cache?.has(key)) {
      const cached = cache.get(key); cache.delete(key); cache.set(key, cached);
      it.candidateKey = key; it.candidates = cached; return cached;
    }
    const list = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    let index = 0;
    for (const m of meshes) {
      if (!m.visible) continue;
      const pos = m.geometry.getAttribute('position'), indices = m.geometry.index, start = m.geometry.drawRange.start;
      if (!pos) continue;
      const n = Math.min(indices?.count ?? pos.count, start + m.geometry.drawRange.count);
      for (let i = start; i + 2 < n; i += 3, index++) {
        a.fromBufferAttribute(pos, indices ? indices.getX(i) : i).applyMatrix4(it.matrix);
        b.fromBufferAttribute(pos, indices ? indices.getX(i + 1) : i + 1).applyMatrix4(it.matrix);
        c.fromBufferAttribute(pos, indices ? indices.getX(i + 2) : i + 2).applyMatrix4(it.matrix);
        e1.subVectors(b, a); e2.subVectors(c, a); e1.cross(e2);
        const area = e1.length() / 2; if (area < 2e-5) continue;
        e1.divideScalar(2 * area);
        const facing = e1.x * VIEW[0] + e1.y * VIEW[1] + e1.z * VIEW[2]; if (facing < .2) continue;
        const point = [(a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3, (a.z + b.z + c.z) / 3], normal = [e1.x, e1.y, e1.z];
        list.push({ index, point, normal, facing, score: Math.round(facing * Math.min(1, area / .002) * 1e3), anchor: point.map((v, j) => v + normal[j] * ANCHOR_OFFSET_METRES) });
      }
    }
    list.sort((p, q) => q.score - p.score || p.index - q.index);
    const out = [];
    for (const keep of [() => true, p => p.normal[1] > .7]) {
      const cells = new Set(); let n = 0;
      for (const p of list) { if (!keep(p)) continue; const cell = p.point.map(v => Math.floor(v / .1)).join(','); if (cells.has(cell)) continue; cells.add(cell); if (!out.includes(p)) out.push(p); if (++n >= 64) break; }
    }
    it.candidateKey = key; it.candidates = out;
    if (cache) { cache.set(key, out); if (cache.size > 16) cache.delete(cache.keys().next().value); }
    return out;
  }
  // Soil on the segment from p to the eye: steps of a third of the height above the active top (the removed volumes
  // only lower the soil), at least 5 mm, with the top treated as 3 mm higher than the grid.
  let topMax = Infinity, featureKey = null, featureClear = new WeakMap();
  function soilBetween(p, eye) {
    const dx = eye.x - p[0], dy = eye.y - p[1], dz = eye.z - p[2], len = Math.hypot(dx, dy, dz);
    for (let t = 0; t < len;) {
      const x = p[0] + dx * t / len, y = p[1] + dy * t / len, z = p[2] + dz * t / len;
      if (x < BLOCK.xmin || x > BLOCK.xmax || z < BLOCK.zmin || z > BLOCK.zmax || y > topMax + .01) return false;
      if (soilAt(x, y - .003, z)) return true;
      t += Math.max(.005, (y - sampleGrid(stack, activeTop, x, z)) / 3);
    }
    return false;
  }
  // Displayed feature triangles between the eye and p, cast from the eye like the film's audit.
  const caster = new THREE.Raycaster(), hitBox = new THREE.Vector3(), towards = new THREE.Vector3();
  function featureBetween(p, eye) {
    towards.set(p[0] - eye.x, p[1] - eye.y, p[2] - eye.z);
    const dist = towards.length(); towards.divideScalar(dist);
    caster.set(eye, towards); caster.near = 0; caster.far = Math.max(0, dist - 1e-4);
    for (const it of items) {
      if (!caster.ray.intersectBox(it.bbox, hitBox) || hitBox.distanceTo(eye) > caster.far) continue;
      for (const m of it.handle.object.children) {
        if (!m.visible || !m.material.visible || m.material.opacity === 0) continue;
        if (meshOccludes(m, caster)) return true;
      }
    }
    return false;
  }
  return {
    candidates,
    // Call once per state, after the feature geometry and the active top are updated.
    refresh() {
      const key = items.map(it => it.handle.object.children.map(m => `${m.geometry.uuid}:${m.visible ? m.geometry.drawRange.count : 0}`).join(',')).join('|');
      if (key !== featureKey) { featureKey = key; featureClear = new WeakMap(); }
      topMax = -Infinity; for (let i = 0; i < activeTop.length; i++) if (activeTop[i] > topMax) topMax = activeTop[i];
    },
    // Per eye: is the line from the candidate's offset point to the eye clear of feature triangles and soil?
    eyesClear(c) {
      let clear = featureClear.get(c);
      if (!clear) featureClear.set(c, clear = eyes.map(eye => !featureBetween(c.anchor, eye)));
      return eyes.map((eye, i) => clear[i] && !soilBetween(c.anchor, eye));
    },
    // Best candidate of one item: the first seen from every eye, else the one seen from the most eyes.
    pick(it) {
      let pick = null, seen = 0;
      for (const c of candidates(it)) {
        const n = this.eyesClear(c).filter(Boolean).length;
        if (n > seen) { pick = c; seen = n; }
        if (n === eyes.length) break;
      }
      return { candidate: pick ?? candidates(it)[0] ?? null, eyes: seen };
    }
  };
}
