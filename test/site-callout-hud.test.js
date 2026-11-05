import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutCallouts,offsetsOf,HUD_LABEL_CLEARANCE} from '../src/site/callouts.js';
import {polygonDistance,rectPoints,pointSegmentDistance} from '../src/film/layout.js';
const hull=[{x:900,y:700},{x:1100,y:700},{x:1100,y:800},{x:900,y:800}];
const item=(id,x,y)=>({id,featureId:id,lines:[id],boxWidth:180,boxHeight:40,ascent:28,lineHeight:40,anchor:{x,y}});
const view={width:1440,height:900,margin:48};
const gap=(a,b)=>polygonDistance(rectPoints(a),rectPoints(b));
const segRect=(a,b,r)=>Math.min(...rectPoints(r).map(p=>pointSegmentDistance(p,a,b)),...[a,b].map(p=>gap({x:p.x,y:p.y,width:0,height:0},r)));
test('labels and leaders keep 24px from HUD text, including the state title',()=>{
  for(const hud of [[{x:560,y:300,width:420,height:60}],[{x:48,y:380,width:520,height:120}],[{x:600,y:430,width:300,height:40},{x:300,y:250,width:600,height:90}]]){
    const r=layoutCallouts({era:[item('a',620,420),item('b',820,560)],silhouette:hull,protectedRects:hud,...view});
    assert.ok(r.placed.length>0,JSON.stringify(r.failures));
    for(const p of r.placed)for(const h of hud){
      assert.ok(gap(p.rect,h)>=HUD_LABEL_CLEARANCE-1e-6,`${p.id} label ${gap(p.rect,h).toFixed(1)}px from HUD`);
      assert.ok(segRect(p.end,p.anchor,h)>=HUD_LABEL_CLEARANCE-8-1e-6,`${p.id} leader too close to HUD`);
    }
  }
});
test('a held offset that would sit inside the 24px HUD band is re-placed',()=>{
  const a=item('a',620,420),hud=[{x:850,y:380,width:300,height:60}];
  const previous=offsetsOf([{featureId:'a',anchor:a.anchor,rect:{x:650,y:390,width:180,height:40}}]);
  const r=layoutCallouts({era:[a],silhouette:hull,protectedRects:hud,previous,...view});
  assert.equal(r.placed.length,1);assert.ok(!r.placed[0].held);
  assert.ok(gap(r.placed[0].rect,hud[0])>=HUD_LABEL_CLEARANCE-1e-6);
});
