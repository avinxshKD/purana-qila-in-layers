import test from 'node:test';
import assert from 'node:assert/strict';
import { boxSolid, clipSolid, subtractSolid, solidVolume, dot, cross, sub } from '../src/features/solid.js';
import { buildFeature, buildEraFeature, fig13Specs } from '../src/features/index.js';
import { SOIL_LAB } from '../src/features/colour.js';
function watertight(faces) {
  const edges=new Map(),key=p=>p.map(x=>x.toFixed(6)).join(',');
  for(const f of faces)for(let i=0;i<f.length;i++){
    const a=key(f[i]),b=key(f[(i+1)%f.length]),k=[a,b].sort().join('|');edges.set(k,(edges.get(k)??0)+1);
  }
  assert.ok([...edges.values()].every(n=>n===2),JSON.stringify([...edges].filter(([,n])=>n!==2)));
}
test('convex clipping is capped, outward and volume-correct including batter',()=>{
  const box=boxSolid(0,1,0,1,0,1);watertight(box);assert.ok(Math.abs(solidVolume(box)-1)<1e-10);
  for(const plane of [{normal:[1,0,0],constant:-.4},{normal:[1,.06,0],constant:-.4},{normal:[1,1,1],constant:-1.5}]){
    const f=clipSolid(box,plane);watertight(f);assert.ok(solidVolume(f)>0);
    for(const p of f.flat())assert.ok(dot(plane.normal,p)+plane.constant>=-1e-7);
  }
  assert.ok(Math.abs(solidVolume(clipSolid(box,{normal:[1,0,0],constant:-.4}))-.6)<1e-8);
});
test('convex subtraction retains closed disjoint outside pieces',()=>{
  const planes=[{normal:[1,0,0],constant:-.2},{normal:[-1,0,0],constant:.8},{normal:[0,1,0],constant:-.2},{normal:[0,-1,0],constant:.8}];
  const pieces=subtractSolid(boxSolid(0,1,0,1,0,1),planes);pieces.forEach(watertight);
  assert.ok(Math.abs(pieces.reduce((s,p)=>s+solidVolume(p),0)-.64)<1e-7);
});
const spec={id:'test-wall',kind:'brick-wall',footprint:[[0,0],[1.7,0],[1.7,.52],[0,.52]],courses:4,seed:714};
function positions(h){return h.object.children.map(m=>Array.from(m.geometry.attributes.position.array));}
test('wall reveal and recuts are reversible with identical buffers',()=>{
  const a=buildFeature(spec),fresh=buildFeature(spec),orig=positions(a);assert.deepEqual(orig,positions(fresh));
  const full=a.stats.triangles;a.setReveal(0);assert.equal(a.stats.triangles,0);
  a.setReveal(.25);assert.ok(a.stats.triangles>0&&a.stats.triangles<full);
  a.setReveal(1);assert.equal(a.stats.triangles,full);
  a.setCuts({keep:[{normal:[1,.05,0],constant:-.5}]});assert.ok(a.bounds.min.x>=.5-.05*a.bounds.max.y-.0201);
  a.setCuts();assert.deepEqual(positions(a),orig);a.dispose();fresh.dispose();
});
test('outputScale never changes geometry and lower-course anchor is visible',()=>{
  const a=buildFeature(spec,{outputScale:1}),b=buildFeature(spec,{outputScale:2});
  assert.deepEqual(positions(a),positions(b));a.setReveal(.25);assert.equal(a.anchors[spec.id].visible,true);a.dispose();b.dispose();
});
test('trench survival uses feature base versus final floor, not object top',()=>{
  const h=buildFeature(spec),full=h.stats.triangles,planes=[{normal:[0,1,0],constant:1}];
  h.setCuts({trenches:[{planes,finalFloor:0}]});assert.equal(h.stats.triangles,full);
  h.setCuts({trenches:[{planes,finalFloor:-.1}]});assert.equal(h.stats.triangles,0);assert.equal(h.anchors[spec.id].visible,false);h.dispose();
});
test('all 24 traces retained and known one/two course counts not inflated',()=>{
  const specs=fig13Specs();assert.equal(specs.length,24);
  assert.equal(specs.find(x=>x.id==='B03-short-central-stub-1').courses,1);
  assert.equal(specs.find(x=>x.id==='B04-south-room-wall-1').courses,2);
  const h=buildEraFeature('post-gupta-wall-ns');assert.ok(Math.abs(h.bounds.max.y-.1)<.011);h.dispose();
});
test('four-state cut LRU uses stable specs and restores cached geometry',()=>{
 const h=buildFeature(spec);
 const state=n=>({keep:[{normal:[1,0,0],constant:-n}]});
 h.setCuts(state(.2));const g=h.object.children[0].geometry;
 h.setCuts(state(.3));h.setCuts({keep:[{constant:-.2,normal:[1,0,0]}]});
 assert.equal(h.stats.lastCutCacheHit,true);assert.equal(h.object.children[0].geometry,g);
 for(const n of [.4,.5,.6,.7])h.setCuts(state(n));
 assert.equal(h.stats.cachedStates,4);assert.ok(h.stats.cacheBytes>0);
 h.setCuts(state(.2));assert.equal(h.stats.lastCutCacheHit,false);assert.notEqual(h.object.children[0].geometry,g);h.dispose();
});
test('K1e albedo is dust-dominant, bounded in value, with soil-like mud brick',()=>{
 const brick=buildEraFeature('kushan-bricks'),units=brick.stats.unitColours;
 assert.ok(units.filter(u=>u.dusty).length/units.length>=.6);
 const values=units.map(u=>u.lab[0]);assert.ok(Math.max(...values)-Math.min(...values)<=12);
 for(const u of units.filter(u=>u.dusty)){
  assert.ok(Math.abs(u.lab[0]-SOIL_LAB[0])<=4);
  assert.ok(u.lab[1]<=SOIL_LAB[1]+2);
 }
 const mud=buildEraFeature('M01-north-mudbrick-1');
 for(const u of mud.stats.unitColours){
  assert.ok(Math.abs(u.lab[0]-SOIL_LAB[0])<=6);
  assert.ok(Math.hypot(...u.lab.map((v,i)=>v-SOIL_LAB[i]))<=8);
 }
 brick.dispose();mud.dispose();
});
test('warmCuts is observationally inert and a later setCuts is a cache hit',()=>{
 const h=buildFeature(spec);h.setReveal(.5);
 const geometries=h.object.children.map(m=>m.geometry),before=positions(h),anchors=JSON.stringify(h.anchors),
  stats=JSON.stringify(h.stats),bounds=h.bounds.clone(),ranges=h.object.children.map(m=>({...m.geometry.drawRange}));
 const cut={keep:[{normal:[1,.05,0],constant:-.4}]};
 const elapsed=h.warmCuts(cut);assert.ok(Number.isFinite(elapsed)&&elapsed>=0);
 assert.deepEqual(positions(h),before);assert.deepEqual(h.object.children.map(m=>m.geometry),geometries);
 assert.equal(JSON.stringify(h.anchors),anchors);assert.equal(JSON.stringify(h.stats),stats);assert.deepEqual(h.bounds,bounds);
 assert.deepEqual(h.object.children.map(m=>m.geometry.drawRange),ranges);
 h.setCuts(cut);assert.equal(h.stats.lastCutCacheHit,true);h.dispose();
});
test('warming beyond capacity never evicts the displayed cut spec',()=>{
 const h=buildFeature(spec),displayed={keep:[{normal:[1,0,0],constant:-.13}]};h.setCuts(displayed);
 const geometry=h.object.children[0].geometry,anchor=JSON.stringify(h.anchors),stats=JSON.stringify(h.stats);
 for(const x of [.2,.3,.4,.5,.6,.7])h.warmCuts({keep:[{normal:[1,0,0],constant:-x}]});
 assert.equal(h.object.children[0].geometry,geometry);assert.equal(JSON.stringify(h.anchors),anchor);assert.equal(JSON.stringify(h.stats),stats);
 h.setCuts(displayed);assert.equal(h.stats.lastCutCacheHit,true);assert.equal(h.object.children[0].geometry,geometry);assert.equal(h.stats.cachedStates,4);h.dispose();
});
