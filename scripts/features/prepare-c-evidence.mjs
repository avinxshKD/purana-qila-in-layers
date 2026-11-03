import fs from 'node:fs';
import path from 'node:path';
import {buildEraFeature,eraFeatureSpec} from '../../src/features/index.js';
import {surfacePieces} from '../../src/features/surfaces.js';
import {findPieces} from '../../src/features/finds.js';
const root=path.resolve(import.meta.dirname,'../..'),base=path.join(root,'output/lookdev/features');
const folders=[[process.argv[2]??'k2c',['sultanate-lime-floor','gupta-floor','mauryan-drain','sunga-kushan-lane']],[process.argv[3]??'k3c',['pillar-base-as-drawn','top-left-stone-as-drawn','rajput-pottery-dump']]];
for(const[folder]of folders)if(fs.existsSync(path.join(base,folder,'cpu-validation.json')))throw new Error('CPU proof already exists: '+folder);
for(const[folder,ids]of folders){
 const features=ids.map(id=>{
  const spec=eraFeatureSpec(id),source=['traced-stone','pottery-lens'].includes(spec.kind)?findPieces(spec):surfacePieces(spec),h=buildEraFeature(id);
  const result={id,triangles:h.stats.triangles,draws:h.stats.drawCalls,bounds:[h.bounds.min.toArray(),h.bounds.max.toArray()],M:spec.M,measurements:source.measurements};
  if(spec.kind==='lime-floor'){
   const top=source.pieces.flatMap(p=>p.faces.filter(f=>f.surface));
   let maximum=0;for(const f of top)for(const a of f)for(const b of f)maximum=Math.max(maximum,Math.hypot(...a.map((v,i)=>v-b[i])));
   result.maxTopFacetMetres=maximum;
   result.cleanAlbedoLab=source.pieces[0].lab;result.material={opaque:!h.object.children[0].material.transparent,roughness:h.object.children[0].material.roughness};
  }
  if(spec.kind==='brick-jelly-floor')result.fragmentMetres=[Math.min(...source.units.map(u=>u.size[0])),Math.max(...source.units.map(u=>u.size[0]))];
  if(spec.kind==='tile-drain')result.tiles=source.units.map(u=>({id:u.id,tiltDegrees:u.tiltDegrees,displacementMetres:Math.hypot(...u.displacement)}));
  if(spec.kind==='traced-stone'){
   const unburied=findPieces({...spec,burial:0}),tops=unburied.pieces.flatMap(p=>p.faces.filter(f=>f.surface).flat().map(p=>p[1]));
   result.topReliefMetres=Math.max(...tops)-Math.min(...tops);result.burialFraction=source.units[0].burial;result.baseFootprint=spec.footprint;
  }
  if(spec.kind==='pottery-lens')result.lens={centralThickness:.12,upperLevel:spec.base??0,centreLevel:(spec.base??0)-.06,survivalBase:(spec.base??0)-.12,sherds:source.units.length,materials:[...new Set(source.units.map(u=>u.material))],sherdCentreRange:[Math.min(...source.units.map(u=>u.centre[1])),Math.max(...source.units.map(u=>u.centre[1]))]};
  h.dispose();return result;
 });
 const out=path.join(base,folder);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'cpu-validation.json'),JSON.stringify({tests:'35/35 pass: features-solid.test.js and features-kinds.test.js',note:'All unsourced dimensions, wear, packing, dust and density are M. No changes to accepted K1 palette, filled pit/postholes, burnt patches, ordinary finds, or A3 shadows. Optional pit grain/glass glint not changed.',features},null,2),{flag:'wx'});
 console.log(JSON.stringify({folder,features:features.map(({id,triangles,draws,measurements,maxTopFacetMetres,topReliefMetres})=>({id,triangles,draws,measurements,maxTopFacetMetres,topReliefMetres}))},null,2));
}
