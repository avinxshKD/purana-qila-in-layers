import { createLayerTable, FRACTIONS, surfaceHeight, trenchFloorDepth } from '../../src/layers.js';
const t = createLayerTable();
const p = t.proportions;
const out = { keys: Object.keys(p), bottomDepth: p.bottomDepth, FRACTIONS, layers: t.layers.map(l => ({ id: l.id, name: l.name, color: l.color, description: l.description?.text ?? l.description })),
  trenches: p.trenches.map(tr => ({ ...tr, floorDepthBelowLocal: trenchFloorDepth(tr), floorY: -trenchFloorDepth(tr), surfaceMid: surfaceHeight((tr.xmin + tr.xmax) / 2, (tr.zmin + tr.zmax) / 2) })),
  features: p.features, faces: t.faces.map(f => ({ id: f.id, from: f.from, to: f.to, inward: f.inward, topDepth: f.topDepth, floorDepth: f.floorDepth })),
  surface: { frontLeft: surfaceHeight(-12, 8), frontRight: surfaceHeight(12, 8), backLeft: surfaceHeight(-12, -8), backRight: surfaceHeight(12, -8) } };
for (const k of Object.keys(p)) if (!['trenches', 'features'].includes(k)) out['p_' + k] = p[k];
console.log(JSON.stringify(out, null, 1));
