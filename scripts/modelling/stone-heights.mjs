import { SEATING } from '../../src/eras/seating.js';
for (const r of SEATING.records.filter(r => /pillar|top-left/.test(r.id))) console.log(r.id, 'height', r.height, 'localBounds', JSON.stringify(r.localBounds), 'walls', JSON.stringify(r.walls?.map(w => [w.id, w.height])));
