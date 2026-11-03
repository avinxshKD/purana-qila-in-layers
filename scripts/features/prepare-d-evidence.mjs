import fs from 'node:fs';
import path from 'node:path';
import {buildEraFeature,eraFeatureSpec} from '../../src/features/index.js';
import {surfacePieces} from '../../src/features/surfaces.js';
import {findPieces} from '../../src/features/finds.js';
import {faceNormal} from '../../src/features/solid.js';
import {lensFaceCoverage} from './gate-math.mjs';
const base=path.resolve(import.meta.dirname,'../../output/lookdev/features'),folders=[process.argv[2]??'k2d-final',process.argv[3]??'k3d-final'];
const sets=[['sultanate-lime-floor','gupta-floor','mauryan-drain','sunga-kushan-lane'],['pillar-base-as-drawn','top-left-stone-as-drawn','rajput-pottery-dump']];
for(let i=0;i<2;i++){
 const out=path.join(base,folders[i]),features=[];
 if(fs.existsSync(path.join(out,'cpu-validation.json')))throw new Error('CPU proof already exists');
 for(const id of sets[i]){
  const spec=eraFeatureSpec(id),h=buildEraFeature(id),source=['traced-stone','pottery-lens'].includes(spec.kind)?findPieces(spec):surfacePieces(spec);
  const v={id,triangles:h.stats.triangles,draws:h.stats.drawCalls,units:h.stats.units,bounds:[h.bounds.min.toArray(),h.bounds.max.toArray()],M:spec.M};
  if(source.measurements)v.measurements=source.measurements;
  if(spec.kind==='lime-floor'){
   v.cleanLab=source.pieces[0].lab;v.opaque=!h.object.children[0].material.transparent;v.roughness=h.object.children[0].material.roughness;
   v.maxTopFacet=Math.max(...source.pieces.flatMap(p=>p.faces.filter(f=>f.surface).flatMap(f=>f.flatMap(a=>f.map(b=>Math.hypot(...a.map((x,j)=>x-b[j])))))));
   v.formM='angular1–3.5 cm notches at <=7 cm intervals;10 crumbs per patch before existing broad breaks;3 wandering cracks per patch, one9 mm through-plate gap; short1.4 cm proud front edges. Original clean palette/dust shader unchanged.';
  }
  if(spec.kind==='brick-jelly-floor'){
   v.palette=Object.fromEntries(['terracotta','pale-dusty','burnt'].map(role=>[role,source.units.filter(u=>u.paletteRole===role).length/source.units.length]));
   v.matrixTop=Math.max(...source.pieces.filter(p=>!p.unitId).flatMap(p=>p.faces.flat().map(v=>v[1])));
   v.minimumParticleTop=Math.min(...source.units.map(u=>u.centre[1]));
   v.paintFiltering='Unique1024x512 premultiplied RGBA field, linear mipmaps, no texture wrapping/tiling. Fine particles have no separate geometry.';
  }
  if(spec.kind==='tile-drain')v.tiles=source.units.map(u=>({id:u.id,tilt:u.tiltDegrees,displacement:Math.hypot(...u.displacement),brokenEnd:u.brokenEnd}));
  if(spec.kind==='traced-stone'){
   const unburied=findPieces({...spec,burial:0}),tops=unburied.pieces.flatMap(p=>p.faces.filter(f=>f.surface)),heights=tops.flat().map(p=>p[1]);
   v.baseFootprint=spec.footprint;v.height=.12;v.topRelief=Math.max(...heights)-Math.min(...heights);v.burial=source.units[0].burial;v.albedo=source.units[0].lab;
   v.topPlaneTilts=tops.map(f=>{const n=faceNormal(f);return Math.atan2(Math.hypot(n[0],n[2]),Math.abs(n[1]))*180/Math.PI;});
   v.spikeFix='Removed independent corner-plane clipping and smooth height-field normals; common planar vertices with render-only internal-face cancellation. No detached stone pieces.';
  }
  if(spec.kind==='pottery-lens'){
   h.setCuts({keep:[{normal:[0,.05234,-1],constant:0}]});v.section=lensFaceCoverage(h);
   v.placement={upper:0,centre:-.06,survivalBase:-.12};v.sherdSizeRanges=[[.02,.06],[.018,.032],[.005,.01]];v.softEdge='Ragged fine-grid envelope and all-face soil-colour feather at ellipsoid boundary; no opaque straight wedge interface.';
  }
  features.push(v);h.dispose();
 }
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'cpu-validation.json'),JSON.stringify({note:'All unsourced dimensions, material variation, placement, dust and packing are M. Gupta alone has a24k triangle allowance; every handle one draw. A3 and accepted controls unchanged.',features},null,2),{flag:'wx'});
 console.log(JSON.stringify({folder:folders[i],features:features.map(f=>({id:f.id,triangles:f.triangles,section:f.section,palette:f.palette,maxTopFacet:f.maxTopFacet,relief:f.topRelief,tiltRange:f.topPlaneTilts?[Math.min(...f.topPlaneTilts),Math.max(...f.topPlaneTilts)]:undefined}))}));
}
