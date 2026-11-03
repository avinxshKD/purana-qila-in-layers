import { createEraSite } from '../../src/eras/site-state.js';
import { VOLUMES } from '../../src/eras/excavation.js';
import { sceneForYear } from '../../src/film/scene-year.js';
import * as THREE from 'three';
const site = createEraSite();
site.applyState(sceneForYear(2013));
for (const key of ['modern-china-1955', 'rajput-pottery-dump']) {
  const it = site.items.find(i => i.key === key);
  console.log(key, 'anchors', JSON.stringify(it.handle.anchors), 'reveal', it.handle.courseCount);
  const v = new THREE.Vector3(); let lo = null;
  const T1 = VOLUMES[0];
  for (const m of it.handle.object.children) { const p = m.geometry.getAttribute('position'); if (!p) continue;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(it.matrix); if (!T1.insideWalls(v.x, v.y, v.z)) continue; const d = v.y - T1.floorAt(v.x, v.z); if (!lo || d < lo[0]) lo = [d, v.x, v.y, v.z]; } }
  console.log('lowest in T1', JSON.stringify(lo), 'bbox', JSON.stringify(it.bbox));
}
