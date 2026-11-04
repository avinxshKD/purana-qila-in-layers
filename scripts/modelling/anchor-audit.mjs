// CPU anchor audit over the film path (approximation of the film's audit in src/film/main.js, for the 3D agent's own
// checks): ray from the film camera to each active callout anchor, blocked by any displayed feature triangle or by
// soil (site.soilAt marched along the ray). The film agent's audit with the real soil meshes is the gate.
// Usage: node scripts/modelling/anchor-audit.mjs [--out=<json>] [--every=<n>]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { createEraSite } from '../../src/eras/site-state.js';
import { filmState } from '../../src/film/timeline.js';
import { cameraPose } from '../../src/film/camera.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const copy = JSON.parse(fs.readFileSync(path.join(root, 'reference', 'film-callouts.json'), 'utf8'));
const every = +arg('every', 1), out = arg('out', null);
const t0 = performance.now();
const site = createEraSite();
site.group.updateMatrixWorld(true);
const camera = new THREE.PerspectiveCamera(25, 1920 / 1080, .1, 180), ray = new THREE.Raycaster();
const geomKey = new Map();
function featureMeshes() {
  const list = [];
  site.group.traverse(o => {
    if (!o.isMesh) return;
    let v = true; for (let p = o; p; p = p.parent) v = v && p.visible;
    if (!v) return;
    const g = o.geometry, pos = g.getAttribute('position'), key = `${pos?.array?.length}:${pos?.version}:${g.drawRange.count}:${pos?.array}`.slice(0, 0) + `${pos?.array?.length}:${pos?.version}:${g.drawRange.count}`;
    if (geomKey.get(g) !== key || geomKey.get(g.uuid + 'arr') !== pos.array) { g.boundingSphere = null; g.boundingBox = null; geomKey.set(g, key); geomKey.set(g.uuid + 'arr', pos.array); }
    list.push(o);
  });
  return list;
}
const rows = [], byId = new Map();
for (let frame = 0; frame < 1800; frame += every) {
  const seconds = frame / 30, state = filmState(seconds), applied = site.applyState(state.scene), pose = cameraPose(seconds, 0, 0);
  camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld(); camera.updateProjectionMatrix();
  const meshes = featureMeshes();
  for (const c of state.overlays.callouts) {
    if (!(c.opacity > 0)) continue;
    const item = copy.sections[c.sectionIndex].callouts[c.slot], a = applied.featureAnchors?.[item.featureId];
    const r = { id: c.id, featureId: item.featureId, frame, part: a?.part ?? null };
    const stat = byId.get(c.id) ?? { id: c.id, featureId: item.featureId, samples: 0, missing: [], offFrame: [], featureBlocked: [], soilBlocked: [], worst: null };
    byId.set(c.id, stat); stat.samples++;
    if (!a?.point || a.visible === false) { stat.missing.push(frame); continue; }
    const p = new THREE.Vector3(...a.point), ndc = p.clone().project(camera);
    if (Math.abs(ndc.x) > 1 || Math.abs(ndc.y) > 1 || Math.abs(ndc.z) > 1) stat.offFrame.push(frame);
    const dir = p.clone().sub(camera.position), dist = dir.length(); dir.normalize();
    ray.set(camera.position, dir); ray.near = 0; ray.far = Math.max(0, dist - 1e-4);
    const hit = ray.intersectObjects(meshes, false).find(h => { const m = Array.isArray(h.object.material) ? h.object.material[h.face?.materialIndex ?? 0] : h.object.material; return m.visible && m.opacity !== 0; });
    if (hit) { stat.featureBlocked.push(frame); const d = dist - hit.distance; if (!stat.worst || d > stat.worst.metresBeforeAnchor) stat.worst = { frame, kind: 'feature', metresBeforeAnchor: d, point: a.point, part: a.part }; }
    // Soil: march back from the anchor toward the camera until the ray is above any ground.
    let soil = null;
    for (let t = 1e-4; t < 30; t += t < 1 ? .005 : .02) {
      const x = p.x - dir.x * t, y = p.y - dir.y * t, z = p.z - dir.z * t;
      if (y > 3) break;
      if (site.soilAt(x, y, z)) { soil = t; break; }
    }
    if (soil !== null) { stat.soilBlocked.push(frame); if (!stat.worst || soil > stat.worst.metresBeforeAnchor) stat.worst = { frame, kind: 'soil', metresBeforeAnchor: soil, point: a.point, part: a.part }; }
  }
}
const ranges = f => { const o = []; for (const v of f) { const l = o[o.length - 1]; if (l && v - l[1] <= every) l[1] = v; else o.push([v, v]); } return o.map(([a, b]) => a === b ? `${a}` : `${a}-${b}`).join(','); };
const summary = [...byId.values()].map(s => ({ ...s, missing: s.missing.length, missingFrames: ranges(s.missing), offFrame: s.offFrame.length, featureBlocked: s.featureBlocked.length, featureFrames: ranges(s.featureBlocked), soilBlocked: s.soilBlocked.length, soilFrames: ranges(s.soilBlocked) }));
const totals = { samples: summary.reduce((a, s) => a + s.samples, 0), missing: summary.reduce((a, s) => a + s.missing, 0), offFrame: summary.reduce((a, s) => a + s.offFrame, 0), featureBlocked: summary.reduce((a, s) => a + s.featureBlocked, 0), soilBlocked: summary.reduce((a, s) => a + s.soilBlocked, 0), seconds: +((performance.now() - t0) / 1000).toFixed(1) };
for (const s of summary) console.log(s.id.padEnd(18), String(s.samples).padStart(3), 'miss', s.missing, s.missingFrames, 'off', s.offFrame, 'feat', s.featureBlocked, s.featureFrames, 'soil', s.soilBlocked, s.soilFrames, s.worst ? `worst ${s.worst.kind} ${s.worst.metresBeforeAnchor.toFixed(4)} @${s.worst.frame}` : '');
console.log(JSON.stringify(totals));
if (out) fs.writeFileSync(path.resolve(root, out), JSON.stringify({ method: 'CPU approximation: camera ray vs displayed feature triangles (THREE.Raycaster, stop 0.1 mm before the anchor) and site.soilAt marched along the ray (5 mm steps for 1 m, then 2 cm)', totals, summary }, null, 1) + '\n');
