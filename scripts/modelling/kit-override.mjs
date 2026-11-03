// Checks era-adapter overrides used by the layout (bounds after override).
import { buildEraFeature, eraFeatureSpec } from '../../src/features/index.js';
const cases = [['mauryan-drain', { polyline: [[0, 0], [4.8, 0]] }], ['rajput-sealed-pit', { base: 0, width: .8, depth: .85 }], ['rajput-sealed-pit', { base: 0, length: .8, depth: .85 }], ['rajput-postholes', { depth: .4 }]];
for (const [id, o] of cases) {
  try { const h = buildEraFeature(id, o); const b = h.bounds; console.log(id, JSON.stringify(o), b.min.toArray().map(v => v.toFixed(3)).join(','), '->', b.max.toArray().map(v => v.toFixed(3)).join(','), 'courses', h.courseCount); h.dispose?.(); }
  catch (e) { console.log(id, 'ERROR', e.message.split('\n')[0]); }
}
console.log(JSON.stringify(eraFeatureSpec('rajput-postholes')), JSON.stringify(eraFeatureSpec('mauryan-drain')));
