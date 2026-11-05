import test from 'node:test';
import assert from 'node:assert/strict';
import {placeCallouts,rectDistance,segmentsCross,inside,lineHitsRect,rectPoints} from '../src/film/layout.js';
const hull=[{x:600,y:200},{x:1320,y:200},{x:1320,y:900},{x:600,y:900}];
const obstacles=[{x:60,y:48,width:450,height:120},{x:60,y:1006,width:384,height:49}];
const item=(id,x,y)=>({id,anchor:{x,y},boxWidth:260,boxHeight:72});
test('straight leaders may cross the block, with24px label clearance and400px maximum',()=>{
  const result=placeCallouts([item('left',960,500),item('right',1040,650)],hull,obstacles);
  assert.deepEqual(result.failures,[]);assert.equal(result.placed.length,2);
  for(const callout of result.placed){assert.ok(rectDistance(callout.rect,hull)>=24);assert.ok(callout.length<=400);assert.ok(inside(callout.anchor,hull));assert.ok(!obstacles.some(r=>lineHitsRect(callout.end,callout.anchor,r)));}
  const [a,b]=result.placed;assert.ok(!segmentsCross(a.end,a.anchor,b.end,b.anchor));
});
test('impossible and missing anchors are reported by ID rather than moving the feature',()=>{
  const result=placeCallouts([{...item('missing',0,0),anchor:null}],hull,obstacles);
  assert.equal(result.failures[0].id,'missing');assert.match(result.failures[0].reason,/Missing/);assert.deepEqual(result.placed,[]);
  const impossible=placeCallouts([item('off-frame',3000,500)],hull,obstacles);
  assert.equal(impossible.failures[0].id,'off-frame');
});

test('two labels keep at least 1 em and twice the internal line gap between ink boxes',async()=>{
  const {labelGap,compatibleCallouts,polygonDistance,rectPoints}=await import('../src/film/layout.js');
  const a={rect:{x:100,y:100,width:200,height:80},end:{x:300,y:140},anchor:{x:700,y:300},em:48,lineGap:10};
  assert.equal(labelGap(a,{...a,em:48,lineGap:30}),60);assert.equal(labelGap({},{}),8);assert.equal(labelGap(a,a),48);
  const near={...a,rect:{x:100,y:190,width:200,height:80},end:{x:300,y:230},anchor:{x:700,y:500}};
  assert.equal(polygonDistance(rectPoints(a.rect),rectPoints(near.rect)),10);assert.equal(compatibleCallouts(a,near),false);
  assert.equal(compatibleCallouts({...a,em:0,lineGap:0},{...near,em:0,lineGap:0}),true,'old 8 px rule accepted the 10 px Gupta-style gap');
  const far={...near,rect:{...near.rect,y:228},end:{x:300,y:268}};assert.equal(compatibleCallouts(a,far),true);
});
test('pair search moves labels apart rather than stacking them 10 px apart',()=>{
  const items=[{...item('upper',900,300),em:48,lineGap:10},{...item('lower',905,420),em:48,lineGap:10}];
  const result=placeCallouts(items,hull,obstacles);assert.equal(result.placed.length,2);
  const [a,b]=result.placed;assert.ok(rectDistance(a.rect,rectPoints(b.rect))>=48,'gap '+rectDistance(a.rect,rectPoints(b.rect)));
});
