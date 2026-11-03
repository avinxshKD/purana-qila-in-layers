import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEraFeature,eraFeatureSpec } from '../src/features/index.js';
import { faceNormal,dot,sub } from '../src/features/solid.js';
import { masonryPieces } from '../src/features/masonry.js';
import { findPieces } from '../src/features/finds.js';
import { surfacePieces } from '../src/features/surfaces.js';
import { lensFaceCoverage,limeVisibleDustCoverage } from '../scripts/features/gate-math.mjs';
const ids=['sultanate-lime-floor','gupta-floor','mauryan-drain','rajput-postholes','rajput-sealed-pit','sunga-kushan-lane','sunga-burnt-patches','pre-mauryan-sherds','mughal-porcelain','mughal-glass','modern-china-1955','modern-brick-1948','pillar-base-as-drawn','top-left-stone-as-drawn','rajput-pottery-dump'];
for(const id of ids)test(id+' builds finite, reversible, true-scale feature geometry',()=>{
 const a=buildEraFeature(id),b=buildEraFeature(id);
 assert.ok(a.stats.triangles>0);
 const buffers=h=>h.object.children.map(m=>Array.from(m.geometry.attributes.position.array));
 assert.deepEqual(buffers(a),buffers(b));
 for(const m of a.object.children)assert.ok(Array.from(m.geometry.attributes.position.array).every(Number.isFinite));
 const original=buffers(a);a.setReveal(0);assert.equal(a.stats.triangles,0);a.setReveal(1);assert.ok(a.anchors[id].visible);
 a.setCuts({keep:[{normal:[0,.05234,-1],constant:.01}]});a.setCuts();assert.deepEqual(buffers(a),original);
 if(id==='modern-brick-1948')assert.ok(a.bounds.max.x-a.bounds.min.x<.231);
 if(['mughal-porcelain','pre-mauryan-sherds'].includes(id))assert.ok(a.stats.unitColours.every(u=>u.size[0]<=.11));
 a.dispose();b.dispose();
});
test('filled holes have a real deep U-volume, not dark circular decals',()=>{
 const h=buildEraFeature('rajput-postholes');assert.ok(h.bounds.min.y<-.59);assert.ok(h.bounds.max.y<.001);h.dispose();
 const p=buildEraFeature('rajput-sealed-pit');assert.ok(p.bounds.min.y< -1.44);p.dispose();
});
test('drain reveals its earth floor before the lining tiles',()=>{
 const h=buildEraFeature('mauryan-drain');assert.equal(h.courseCount,2);h.setReveal(.25);assert.ok(h.bounds.max.y>.09);assert.ok(h.stats.triangles>0);const floor=h.stats.triangles;h.setReveal(1);assert.ok(h.stats.triangles>floor);h.dispose();
});
test('narrow traced rubble and laid-down bottle necks remain outward convex solids',()=>{
 for(const built of [masonryPieces(eraFeatureSpec('S01-east-upper-stone-1')),findPieces(eraFeatureSpec('mughal-glass'))]){
  for(const p of built.pieces)for(const f of p.faces){
   const n=faceNormal(f);assert.ok(p.faces.flat().every(q=>dot(n,sub(q,f[0]))<1e-6));
  }
 }
});
test('filled-cut caps share one normal and continuous albedo, and sealed pit is below its sealing surface',()=>{
 for(const id of ['rajput-postholes','rajput-sealed-pit']){
  const source=surfacePieces(eraFeatureSpec(id));assert.ok(source.pieces.every(p=>JSON.stringify(p.lab)===JSON.stringify(source.pieces[0].lab)));
  const h=buildEraFeature(id);if(id==='rajput-sealed-pit')assert.ok(h.bounds.max.y<=-.17999);
  h.setCuts({keep:[{normal:[0,.05234,-1],constant:0}]});
  const expected=[0,-.05234/Math.hypot(1,.05234),1/Math.hypot(1,.05234)];let count=0,first;
  for(const mesh of h.object.children){
   const n=mesh.geometry.attributes.normal,c=mesh.geometry.attributes.color;
   for(let i=0;i<n.count;i++)if(n.getZ(i)>.99&&n.getY(i)<-.05){
    assert.ok(dot([n.getX(i),n.getY(i),n.getZ(i)],expected)>1-1e-6);
    const colour=[c.getX(i),c.getY(i),c.getZ(i)];if(first)assert.deepEqual(colour,first);else first=colour;count++;
   }
  }
  assert.ok(count>100);h.dispose();
 }
});
test('lime traces have real wide breaks, a flush uneven top and outward convex crumb volumes',()=>{
 const source=surfacePieces(eraFeatureSpec('sultanate-lime-floor'));
 const vertices=source.pieces.flatMap(p=>p.faces.flat());
 assert.ok(Math.max(...vertices.map(p=>p[1]))<.021);
 assert.ok(Math.min(...vertices.map(p=>p[1]))<-.07);
 assert.ok(vertices.every(p=>p[0]<=.580001||p[0]>=.859999));
 assert.ok(vertices.every(p=>p[0]<=1.940001||p[0]>=2.189999));
 for(const p of source.pieces)for(const f of p.faces)assert.ok(p.faces.flat().every(q=>dot(faceNormal(f),sub(q,f[0]))<1e-6));
 assert.ok(source.measurements.limeDustCoverage>=.2&&source.measurements.limeDustCoverage<=.4);
 for(const p of source.pieces)for(const f of p.faces.filter(f=>f.surface))for(const a of f)for(const b of f)assert.ok(Math.hypot(...sub(a,b))<.10001);
 const h=buildEraFeature('sultanate-lime-floor');assert.ok(h.stats.triangles<=8000);assert.equal(h.object.children[0].material.transparent,false);assert.equal(h.object.children[0].material.roughness,1);h.dispose();
});
test('Gupta random crushed brick splits 1–3 cm solids and 0.5–1 cm filtered speckle',()=>{
 const source=surfacePieces(eraFeatureSpec('gupta-floor'));
 assert.ok(source.measurements.crushedCoverage.every(c=>c>=.3&&c<=.5));
 assert.ok(source.units.every(u=>u.size[0]>=.01&&u.size[0]<=.03));
 assert.ok(source.measurements.geometryCoverage.every(c=>c>=.2));
 assert.ok(source.measurements.speckleCoverage.every(c=>c>.1&&c<.2));
 assert.ok(source.measurements.sampling.every(s=>s.clumps.length>=3&&s.clumps.length<=6&&s.gaps.length>=2));
 assert.ok(source.paint.data.some(v=>v>0));
 assert.ok(source.units.length>1000);
 const matrixTop=Math.max(...source.pieces.filter(p=>!p.unitId).flatMap(p=>p.faces.flat().map(v=>v[1])));
 assert.ok(source.units.every(u=>u.centre[1]>matrixTop+.001),'projected coverage must also be exposed above the matrix');
 const h=buildEraFeature('gupta-floor');assert.ok(h.stats.triangles<=24000);assert.equal(h.stats.drawCalls,1);h.dispose();
});
test('lime small-patch dust covers20–40% of actual visible interpolated top, with toned body',()=>{
 const source=surfacePieces(eraFeatureSpec('sultanate-lime-floor')),coverage=limeVisibleDustCoverage(source);
 assert.ok(coverage.fraction>=.2&&coverage.fraction<=.4);
 assert.ok(source.pieces.every(p=>p.dustAll&&p.bodyLab[0]<p.lab[0]));
});
test('drain tiles have bounded seeded tilt/displacement and a visible first-tier bed',()=>{
 const source=surfacePieces(eraFeatureSpec('mauryan-drain'));
 assert.ok(source.units.every(u=>Math.abs(u.tiltDegrees)>=1&&Math.abs(u.tiltDegrees)<=3));
 assert.ok(source.units.every(u=>Math.hypot(...u.displacement)>=.01&&Math.hypot(...u.displacement)<=.02));
 assert.ok(source.pieces.filter(p=>p.tier===1).flatMap(p=>p.faces.flat()).some(p=>p[1]>0));
 assert.equal(source.units.filter(u=>u.brokenEnd).length,2);
 assert.ok(source.pieces.filter(p=>p.unitId).every(p=>p.finish[0]===2));
 assert.ok(source.units.every(u=>source.pieces.filter(p=>p.unitId===u.id).reduce((s,p)=>s+p.faces.length,0)>15));
 for(const p of source.pieces)for(const f of p.faces)assert.ok(p.faces.flat().every(q=>dot(faceNormal(f),sub(q,f[0]))<1e-6));
});
test('traced stones retain their full base outline/height with relief and non-extruded sides',()=>{
 for(const id of ['pillar-base-as-drawn','top-left-stone-as-drawn']){
  const spec={...eraFeatureSpec(id),burial:0},source=findPieces(spec),vertices=source.pieces.flatMap(p=>p.faces.flat());
  assert.ok(Math.abs(Math.max(...vertices.map(p=>p[1]))-.12)<1e-7);
  for(const p of spec.footprint)assert.ok(vertices.some(v=>Math.abs(v[0]-p[0])<1e-7&&Math.abs(v[2]-p[1])<1e-7&&Math.abs(v[1])<1e-7));
  const tops=source.pieces.flatMap(p=>p.faces.filter(f=>f.surface).flat().map(p=>p[1]));
  assert.ok(Math.max(...tops)-Math.min(...tops)>=.02);
  for(const p of source.pieces)for(const f of p.faces)assert.ok(p.faces.flat().every(q=>dot(faceNormal(f),sub(q,f[0]))<1e-6));
  const info=source.pieces[0].stoneInfo;
  assert.ok(info.chamfers.every(w=>w>=.005&&w<=.03));
  assert.ok(info.chips>=4&&info.chips<=8);
  assert.ok(info.dustCoverage<=.3);
  const facets=[];
  for(const f of source.pieces.flatMap(p=>p.faces.filter(f=>f.surface))){const n=faceNormal(f);if(!facets.some(q=>dot(n,q)>1-1e-8))facets.push(n);}
  assert.ok(facets.length>=4&&facets.length<=8);
  const h=buildEraFeature(id);assert.ok(h.stats.triangles<=1500);h.dispose();
 }
});
test('pottery dump is a 0.12 m tapered lens with terracotta/grey sherds through its depth',()=>{
 const source=findPieces(eraFeatureSpec('rajput-pottery-dump')),h=buildEraFeature('rajput-pottery-dump');
 assert.ok(Math.abs(h.bounds.max.y-h.bounds.min.y-.12)<1e-6);
 assert.ok(source.units.every(u=>['terracotta','pgw'].includes(u.material)));
 const ys=source.units.map(u=>u.centre[1]);assert.ok(Math.max(...ys)-Math.min(...ys)>.08);
 const vertices=source.pieces.filter(p=>!p.unitId).flatMap(p=>p.faces.flat()),edge=vertices.filter(p=>Math.abs(p[0])>.39);
 assert.ok(Math.max(...edge.map(p=>p[1]))-Math.min(...edge.map(p=>p[1]))<.04);
 assert.equal(h.stats.drawCalls,1);assert.ok(h.stats.triangles<=12000);h.dispose();
});
test('pottery sections cover 25–40% of the real lens face with 5–10 mm thin closed strips',()=>{
 const h=buildEraFeature('rajput-pottery-dump');h.setCuts({keep:[{normal:[0,.05234,-1],constant:0}]});
 const coverage=lensFaceCoverage(h);assert.ok(coverage.fraction>=.25&&coverage.fraction<=.4,JSON.stringify(coverage));
 assert.ok(h.stats.unitColours.every(u=>u.size[0]>=.02&&u.size[0]<=.06&&u.size[2]>=.005&&u.size[2]<=.01));h.dispose();
});
test('find burial varies per real-size unit without changing its shape, with dust on exposed surfaces',()=>{
 for(const id of ['pre-mauryan-sherds','mughal-porcelain','mughal-glass','modern-china-1955','modern-brick-1948','pillar-base-as-drawn']){
  const source=findPieces(eraFeatureSpec(id)),exposed=findPieces({...eraFeatureSpec(id),burial:0});
  for(const unit of source.units){
   const vertices=source.pieces.filter(p=>p.unitId===unit.id).flatMap(p=>p.faces.flat()),ys=vertices.map(p=>p[1]);
   const low=Math.min(...ys),high=Math.max(...ys),f=-low/(high-low);
   assert.ok(f>=.3-1e-6&&f<=(id==='modern-brick-1948'?.5:.7)+1e-6);
   assert.ok(Math.abs(f-unit.burial)<1e-8);
   const original=exposed.pieces.filter(p=>p.unitId===unit.id).flatMap(p=>p.faces.flat());
   const originalY=original.map(p=>p[1]);assert.ok(Math.abs(high-low-(Math.max(...originalY)-Math.min(...originalY)))<1e-8);
   assert.deepEqual(vertices.map(p=>[p[0],p[2]]),original.map(p=>[p[0],p[2]]));
  }
  assert.ok(source.pieces.every(p=>p.dustCoat>=.3));
 }
});
