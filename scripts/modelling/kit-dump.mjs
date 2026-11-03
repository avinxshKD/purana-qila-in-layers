// Dumps the kit's era-feature specs (base, height, courses, footprint extents) and built bounds, for seating.
import { buildEraFeature, eraFeatureSpec } from '../../src/features/index.js';
const ids = process.argv.slice(2);
for (const id of ids) {
  try {
    const spec = eraFeatureSpec(id), h = buildEraFeature(id);
    const b = h.bounds, short = JSON.stringify(spec, (k, v) => Array.isArray(v) && v.length > 6 ? `[${v.length} items]` : v);
    console.log(id, '| courses', h.courseCount, '| bounds', b.min.toArray().map(v => v.toFixed(3)).join(','), '->', b.max.toArray().map(v => v.toFixed(3)).join(','), '| anchors', Object.keys(h.anchors ?? {}).join(','));
    console.log('   spec', short.slice(0, 600));
    h.dispose?.();
  } catch (e) { console.log(id, 'ERROR', e.message.split('\n')[0]); }
}
