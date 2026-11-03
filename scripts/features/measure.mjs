import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {buildFeature,buildEraFeature,fig13Specs,eraFeatureSpec} from '../../src/features/index.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),folder=process.argv[2]??'k1b',batch=process.argv[3]??'k1';
const out=path.join(root,'output/lookdev/features',folder),ff=path.join(root,'tools/ffmpeg/bin/ffmpeg.exe');
const captures=JSON.parse(fs.readFileSync(path.join(out,'capture-stats.json'),'utf8'));
const frontSamples=fs.existsSync(path.join(out,'front-surface-samples.json'))?JSON.parse(fs.readFileSync(path.join(out,'front-surface-samples.json'),'utf8')):null;
const pack=JSON.parse(fs.readFileSync(path.join(root,'reference/era-model.json'),'utf8'));
const sourceFeatures=pack.layers.flatMap(l=>l.features);
const lin=v=>v/255<=.04045?v/255/12.92:((v/255+.055)/1.055)**2.4;
const F=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;
function lab(rgb){
 const [r,g,b]=rgb.map(lin),x=F((.4124*r+.3576*g+.1805*b)/.95047),y=F(.2126*r+.7152*g+.0722*b),z=F((.0193*r+.1192*g+.9505*b)/1.08883);
 return [116*y-16,500*(x-y),200*(y-z)];
}
function summary(rows){
 if(!rows.length)return {n:0};
 const mean=rows[0].map((_,i)=>rows.reduce((s,r)=>s+r[i],0)/rows.length);
 return {n:rows.length,L:mean[0],a:mean[1],b:mean[2],C:Math.hypot(mean[1],mean[2]),sdL:Math.sqrt(rows.reduce((s,r)=>s+(r[0]-mean[0])**2,0)/rows.length)};
}
const metrics={batch,folder,renderedUnitColours:{}};
for(const [key,original]of Object.entries(captures)){
 const entry=frontSamples?.[key]?{...original,samples:frontSamples[key]}:original;
 if(!entry.samples.length)continue;
 const file=path.join(out,key+'.png'),png=fs.readFileSync(file),width=png.readUInt32BE(16),height=png.readUInt32BE(20);
 const rgb=execFileSync(ff,['-v','error','-i',file,'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:100*1024*1024});
 const readings=[];
 const samplePixel=(x,y,half=1)=>{
  const rows=[];x=Math.round(x);y=Math.round(y);
  for(let j=-half;j<=half;j++)for(let i=-half;i<=half;i++){if(x+i<0||y+j<0||x+i>=width||y+j>=height)continue;const at=((y+j)*width+x+i)*3;rows.push(lab([...rgb.subarray(at,at+3)]));}
  const s=summary(rows);return [s.L,s.a,s.b];
 };
 for(const u of entry.samples.flatMap(e=>e.units.map(u=>({...u,featureId:e.id})))){
  const x=Math.round(u.x),y=Math.round(u.y);if(x<3||y<3||x>=width-3||y>=height-3)continue;
  const values=[];for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const at=((y+j)*width+x+i)*3;values.push(lab([...rgb.subarray(at,at+3)]));}
  const s=summary(values);readings.push({id:u.id,featureId:u.featureId,material:u.material??null,dusty:u.dusty??null,x,y,Lab:[s.L,s.a,s.b]});
 }
 metrics.renderedUnitColours[key]={...summary(readings.map(r=>r.Lab)),method:entry.samples.some(g=>g.sampleMethod)?'Per-feature sampling methods are recorded below; do not compare pooled differently oriented faces.':'One visible front-facing triangle-centroid 3×3 pixel mean per unit; normals z>.8, abs(y)<.25, abs(x)<.3; ray-tested; no occluded units. Face-orientation lighting variation is not counted as unit-colour variation.',samples:readings};
 metrics.renderedUnitColours[key].perFeature=entry.samples.map(group=>{
  const values=readings.filter(r=>r.featureId===group.id),soil=group.soil?samplePixel(group.soil.x,group.soil.y,width>=3000?3:1):null;
  const clean=values.filter(v=>v.dusty===false),dusty=values.filter(v=>v.dusty===true),Ls=values.map(v=>v.Lab[0]);
  const stats=summary(values.map(v=>v.Lab)),cleanStats=summary(clean.map(v=>v.Lab));
  return {id:group.id,...stats,sampleMethod:group.sampleMethod??'Visible front-facing faces; normal z>.8, abs(y)<.25, abs(x)<.3; camera ray-tested.',spanL:Ls.length?Math.max(...Ls)-Math.min(...Ls):null,soilLab:soil,
   clean:{...cleanStats,hue:cleanStats.n?Math.atan2(cleanStats.b,cleanStats.a)*180/Math.PI:null},
   dusty:summary(dusty.map(v=>v.Lab)),
   dustyFraction:values.length?dusty.length/values.length:0,
   nearSoilFraction:soil&&values.length?values.filter(v=>Math.abs(v.Lab[0]-soil[0])<=4&&v.Lab[1]<=soil[1]+2).length/values.length:null,
   deltaE76:soil&&stats.n?Math.hypot(stats.L-soil[0],stats.a-soil[1],stats.b-soil[2]):null,
   byMaterial:[...new Set(values.map(v=>v.material))].map(material=>({material,...summary(values.filter(v=>v.material===material).map(v=>v.Lab))})),
   measurements:[...(soil?[{name:'soil',x:Math.round(group.soil.x),y:Math.round(group.soil.y)}]:[]),
     ...(clean.length?[{name:'brick-clean',x:clean[0].x,y:clean[0].y}]:[]),
     ...(dusty.length?[{name:'brick-dust',x:dusty[0].x,y:dusty[0].y}]:[]),
     ...[...new Set(values.filter(v=>v.dusty===null).map(v=>v.material))].map(material=>{
       const q=values.find(v=>v.material===material);return {name:material??(group.id.includes('mudbrick')?'mudbrick':'stone'),x:q.x,y:q.y};
     })]};
 });
}
const ids=[...new Set(Object.values(captures).flatMap(c=>c.stats.map(s=>s.id)))],provenance=[];
for(const id of [...ids,...(batch==='k1'?fig13Specs().map(s=>s.id):[])]){
 const spec=eraFeatureSpec(id),h=buildFeature(spec),source=sourceFeatures.find(f=>f.id===id);
 provenance.push({id,triangles:h.stats.triangles,drawCalls:h.stats.drawCalls,courses:h.courseCount,bounds:{min:h.bounds.min.toArray(),max:h.bounds.max.toArray()},units:h.stats.units,source:source?.evidence??[],sourcedSize:source?.sourcedSize??null,M:spec.M??h.stats.provenance.M});
 h.dispose();
}
metrics.features=provenance;
if(batch==='k1'){
 const handles=fig13Specs().map(s=>buildFeature(s)),steps=[];
 for(let i=0;i<12;i++){
  const start=performance.now();
  for(const h of handles)h.setCuts({keep:[{normal:[0,Math.tan(3*Math.PI/180),1],constant:-(3+i*.2)}]});
  steps.push(performance.now()-start);
 }
 const revealTimes=[],allRevealTimes=[];
 for(let i=0;i<600;i++){
  let start=performance.now();handles[i%handles.length].setReveal((i%101)/100);revealTimes.push(performance.now()-start);
  start=performance.now();for(const h of handles)h.setReveal((i%101)/100);allRevealTimes.push(performance.now()-start);
 }
 const cacheHits=[];
 for(let i=0;i<12;i++){
  const state={keep:[{normal:[0,Math.tan(3*Math.PI/180),1],constant:-(3+(9+i%3)*.2)}]};
  const start=performance.now();for(const h of handles)h.setCuts(state);cacheHits.push(performance.now()-start);
 }
 const percentile=(v,p)=>[...v].sort((a,b)=>a-b)[Math.floor((v.length-1)*p)];
 metrics.timings={all24SetCutsMs:steps,p50:percentile(steps,.5),p95:percentile(steps,.95),
  all24SetRevealMs:{p50:percentile(allRevealTimes,.5),p95:percentile(allRevealTimes,.95)},
  setRevealMs:{p50:percentile(revealTimes,.5),p95:percentile(revealTimes,.95)},
  all24CutCacheHitMs:{p50:percentile(cacheHits,.5),p95:percentile(cacheHits,.95),all:cacheHits},
  cacheBufferBytesAll24:handles.reduce((s,h)=>s+h.stats.cacheBytes,0),
  cacheBufferBytesPerStateAll24:[0,1,2,3].map(i=>handles.reduce((s,h)=>s+(h.stats.cacheStateBytes[i]??0),0)),
  note:'Node CPU, 12 distinct single-plane cut steps, capped with 3° batter and per-unit proud offset; includes geometry/anchor rebuild. Exact buffer bytes exclude immutable originals, JS overhead, and GPU copies.'};
 handles.forEach(h=>h.dispose());
 const a=execFileSync(ff,['-v','error','-i',path.join(out,'brick-wall-2160.png'),'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:100*1024*1024});
 const b=execFileSync(ff,['-v','error','-i',path.join(out,'brick-repeat-2160.png'),'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:100*1024*1024});
 metrics.scrubPixelExact=a.equals(b);
 const ps=path.join(root,'output/review/look-stats/colour.ps1'),texture=path.join(root,'output/review/look-stats/texture.cjs');
 const rows=[];
 for(const [image,regions,box]of [
  ['brick-wall-2160','brick-front:950:1000:1500:260',[950,1000,1500,260]],
  ['rubble-wall-2160','stone-front:850:680:1900:350',[850,680,1900,350]]
 ]){
  const file=path.join(out,image+'.png');
  rows.push(execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',ps,'-Image',file,'-Regions',regions],{encoding:'utf8'}));
  rows.push(execFileSync(process.execPath,[texture,file,'corr',...box.map(String)],{encoding:'utf8'}));
 }
 fs.writeFileSync(path.join(out,'review-script-measurements.txt'),rows.join('\n'));
 const everyStill=[];
 for(const [name,m]of Object.entries(metrics.renderedUnitColours)){
  const regions=m.perFeature.flatMap(f=>f.measurements.map(q=>`${f.id}-${q.name}:${Math.max(0,q.x-1)}:${Math.max(0,q.y-1)}:3:3`)).join(';');
  if(regions)everyStill.push('## '+name+'\n'+execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',ps,'-Image',path.join(out,name+'.png'),'-Regions',regions],{encoding:'utf8'}));
 }
 fs.writeFileSync(path.join(out,'colour-every-still.txt'),everyStill.join('\n'));
}
fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));
const notes=[
 '# '+batch.toUpperCase()+' feature provenance and validation',
 '',
 'All geometry is deterministic, feature-local metres, y up. Dimensions not in the source pack are M (modelling decisions).',
 'Material Lab values and rendered pixel Lab values are look targets, not archaeological measurements.',
 '',
 '| Feature | Triangles | Draws | Reveal tiers | Source sizes | M decisions |',
 '|---|---:|---:|---:|---|---|',
 ...provenance.map(p=>`| ${p.id} | ${p.triangles} | ${p.drawCalls} | ${p.courses} | ${p.sourcedSize?JSON.stringify(p.sourcedSize.map(s=>s.metres)):'null'} | ${p.M.join('; ')} |`),
 '',
 ...(batch==='k1'?[
  '## Measurements',
  ...Object.entries(metrics.renderedUnitColours).map(([id,m])=>`- ${id}: ${m.n} visible units; per-unit sd L* ${m.sdL.toFixed(2)}, mean a* ${m.a.toFixed(2)}, C* ${m.C.toFixed(2)}.`),
  `- 12 all-24-wall cut steps: p50 ${metrics.timings.p50.toFixed(2)} ms; p95 ${metrics.timings.p95.toFixed(2)} ms. See metrics.json for all 12 values and the exact scope.`,
  `- One setReveal call: p50 ${(metrics.timings.setRevealMs.p50*1000).toFixed(2)} µs; p95 ${(metrics.timings.setRevealMs.p95*1000).toFixed(2)} µs.`,
  `- All 24 setReveal calls in one step: p50 ${metrics.timings.all24SetRevealMs.p50.toFixed(4)} ms, p95 ${metrics.timings.all24SetRevealMs.p95.toFixed(4)} ms.`,
  `- All 24 cut-cache hits in one step: p50 ${metrics.timings.all24CutCacheHitMs.p50.toFixed(3)} ms, p95 ${metrics.timings.all24CutCacheHitMs.p95.toFixed(3)} ms.`,
  `- Four-state cache vertex buffers, all 24 walls: ${metrics.timings.cacheBufferBytesAll24} bytes total; each of the four states ${metrics.timings.cacheBufferBytesPerStateAll24.join(', ')} bytes.`,
  `- Brick A → B → A: decoded RGB pixel-exact ${metrics.scrubPixelExact}.`,
  '- Unedited review scripts: review-script-measurements.txt. These are region/pixel statistics, separate from per-unit statistics.',
  '- K1e per-still colour.ps1 face/mud/soil samples: colour-every-still.txt. metrics.json separates exposed brick, dust-coated brick, and mud/stone; absent materials are not fabricated.',
  '- Current targets are the K1 measured review, superseding the original sd L* 6–10 request. Report exposed brick hue separately from the majority soil-dust faces.',
  '- The 50 ms cold-cut budget was waived by the orchestrator; the site prewarms four excavation states, matching the four-entry LRU.',
  '- Shadow settings follow the current createLookWorld: VSM, normalBias .08 m, bias -.0004. Awaiting the final A3 bias from the scene owner.',
  '- Hero-distance 400% crops are nearest-neighbour enlargements from 1080 downsampled masters, not magnified geometry. Distance 74 m, elevation 27°, azimuth 35°, FOV 25°, near .1 m, far 180 m. Camera chain checked in src/film/main.js → createLookWorld.',
 ]:[]),
 '',
 '## Modelling cautions',
 '- Fig.13 is a local drawing with caption-level Kushan association, not a geographic or per-wall stratigraphic assignment.',
 '- Unknown elevations, find sizes, surviving heights, rubble and mudbrick unit dimensions, and surface wear are M.',
 '- No second Fig.13 drain or ring well; no water, fire, roofs, people, religious objects or dates on objects.',
 '- Floor/pit profiles and placement are schematic. The filled pit is an ellipsoidal U-profile through three demonstration soil bands.',
 '- Finds remain their documented M dimensions; the detail cameras move closer instead of enlarging objects.',
 '- Every kit mesh receives shadows. Masonry, stone and modern brick cast; thin floors and find fragments do not.'
];
fs.writeFileSync(path.join(out,'provenance.md'),notes.join('\n')+'\n');
console.log(JSON.stringify({renderedUnitColours:Object.fromEntries(Object.entries(metrics.renderedUnitColours).map(([k,v])=>[k,{n:v.n,sdL:v.sdL,a:v.a,C:v.C}])),timings:metrics.timings,pixelExact:metrics.scrubPixelExact,features:provenance.map(f=>[f.id,f.triangles,f.drawCalls])},null,2));
