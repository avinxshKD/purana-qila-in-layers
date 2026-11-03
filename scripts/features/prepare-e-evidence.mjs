import fs from 'node:fs';
import path from 'node:path';
import {buildEraFeature,eraFeatureSpec} from '../../src/features/index.js';
import {surfacePieces} from '../../src/features/surfaces.js';
import {findPieces} from '../../src/features/finds.js';
import {faceNormal,dot} from '../../src/features/solid.js';
import {limeVisibleDustCoverage} from './gate-math.mjs';
const folder=path.resolve(import.meta.dirname,'../../output/lookdev/features',process.argv[2]??'k2e-cpu'),features=[];
for(const id of ['sultanate-lime-floor','mauryan-drain','pillar-base-as-drawn','top-left-stone-as-drawn']){
 const spec=eraFeatureSpec(id),source=spec.kind==='traced-stone'?findPieces({...spec,burial:0}):surfacePieces(spec),h=buildEraFeature(id);
 const f={id,triangles:h.stats.triangles,draws:h.stats.drawCalls,bounds:[h.bounds.min.toArray(),h.bounds.max.toArray()],M:spec.M};
 if(spec.kind==='lime-floor'){f.visibleDust=limeVisibleDustCoverage(source);f.rawMask=source.measurements.limeDustCoverage;f.cleanLab=source.pieces[0].lab;f.bodyLab=source.pieces[0].bodyLab;f.proudEdges='North/west arcs only, non-periodic1–5 cm notch widths and varying heights; same small-patch dust on body/top. South/east taper below soil.';}
 if(spec.kind==='tile-drain'){f.roundedArris=.011;f.chips='Two irregular corner clips plus a real concave top-arris fracture per tile;2 broken ends. Continuous3.5/1.8 cm tonal noise, fine grain, soft lower-third stain.';f.tiles=source.units;}
 if(spec.kind==='traced-stone'){
  const facets=[];for(const face of source.pieces.flatMap(p=>p.faces.filter(f=>f.surface))){const n=faceNormal(face);if(!facets.some(q=>dot(q,n)>1-1e-8))facets.push(n);}
  f.baseOutline=spec.footprint;f.height=.12;f.burial=h.stats.unitColours[0].burial;f.cleanLab=source.units[0].lab;f.facets=facets;f.stone=source.pieces[0].stoneInfo;
 }
 features.push(f);h.dispose();
}
fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'cpu-validation.json'),JSON.stringify({tests:'CPU preflight; see test-output.txt for the actual scoped test result.',note:'All unsourced geometry/material details are M. Dark end of accepted K1 rubble family, not a hue invention. No A3 changes. Gupta/lens remain accepted, reused and not re-rendered.',features},null,2),{flag:'wx'});
console.log(JSON.stringify(features.map(f=>({id:f.id,triangles:f.triangles,dust:f.visibleDust?.fraction??f.stone?.dustCoverage,facets:f.facets?.length}))));
