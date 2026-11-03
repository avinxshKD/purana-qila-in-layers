import { createEraSite } from '../../src/eras/site-state.js';
import { batterReport, VOLUMES } from '../../src/eras/excavation.js';
import { sceneForYear } from '../../src/film/scene-year.js';
const t0 = performance.now();
const site = createEraSite();
const t1 = performance.now();
console.log('build ms', (t1 - t0).toFixed(0), 'items', site.items.length);
console.log(JSON.stringify(batterReport()));
console.log(JSON.stringify(VOLUMES.map(v => [v.id, +v.depthRange.toFixed(2)])));
for (const r of site.trenchRules()) if (r.rules.length) console.log(r.key, JSON.stringify(r.rules));
import { removedAt } from '../../src/eras/excavation.js';
for (const it of site.items.filter(i => i.rule === 'find')) {
  let hit = 0; const b = it.bbox;
  for (let x = b.min.x - .05; x <= b.max.x + .05; x += .01) for (let y = b.min.y; y <= b.max.y; y += .01) for (const z of [b.min.z, b.max.z]) if (removedAt(12, x, y, Math.min(z, 7.999))) hit++;
  console.log('find margin', it.key, 'x', b.min.x.toFixed(2), b.max.x.toFixed(2), 'hits within 5 cm', hit);
}
for (const year of [-539, -200, 1500, 2013, 2014, 2018, 2023]) {
  const s = performance.now(), out = site.applyState(sceneForYear(year)), e = performance.now() - s;
  const vis = Object.entries(out.featureAnchors).filter(([, a]) => a.visible).map(([k]) => k);
  console.log(year, 'step', out.cutStep, 'ms', e.toFixed(1), 'visible', vis.join(','));
}
