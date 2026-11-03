import { buildEraFeature, eraFeatureSpec } from '../../src/features/index.js';
import { SEATING } from '../../src/eras/seating.js';
const r = SEATING.records.find(r => r.id === 'rajput-pottery-dump');
console.log('overrides', JSON.stringify(r.overrides));
for (const ov of [{}, r.overrides ?? {}]) {
  const h = buildEraFeature('rajput-pottery-dump', ov);
  let lo = Infinity, hi = -Infinity;
  for (const m of h.object.children) { const p = m.geometry.getAttribute('position'); if (!p) continue; for (let i = 0; i < p.count; i++) { lo = Math.min(lo, p.getY(i)); hi = Math.max(hi, p.getY(i)); } }
  console.log(JSON.stringify(ov), 'y', lo.toFixed(4), hi.toFixed(4), 'bounds', h.bounds.min.y.toFixed(4), h.bounds.max.y.toFixed(4), 'kind', eraFeatureSpec('rajput-pottery-dump', ov).kind);
}
