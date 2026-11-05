import test from 'node:test';
import assert from 'node:assert/strict';
import {solveCalloutTrack,placeFromTrack,viewportFor,blockedField} from '../src/film/callout-track.js';
import {silhouetteFromRows} from '../src/film/silhouette.js';
import {evaluateCallout} from '../src/film/layout.js';
// A block that widens and drifts while two callouts are shown; the free per-frame optimum
// would slide the labels along the growing edge, the track must keep steps <= 4 px.
function frame(t){
  const cell=4,rows=Array.from({length:270},()=>[]),left=760-3*t,right=1160+t;
  for(let y=Math.floor(300/cell);y<Math.floor(800/cell);y++)rows[y].push([left,right]);
  const silhouette=silhouetteFromRows(rows,{cell,blockLowestY:800});
  const item=(id,slot,x,y,w)=>({id,featureId:id,era:5,opacity:t<10&&slot?0:1,anchor:{x:x+2*t,y},boxWidth:w,boxHeight:47,em:48,lineGap:0,lines:[id]});
  return {frame:t,silhouette,blockLowestY:800,protectedRects:[{x:59,y:62,width:300,height:50}],scaleZones:[],items:[item('a',0,900,420,260),item('b',1,1000,640,230)]};
}
test('pinned callout track keeps a locked side, <=4 px relative steps and every gate',{timeout:120000},()=>{
  const inputs=Array.from({length:60},(_,t)=>frame(t)),started=Date.now(),solved=solveCalloutTrack(inputs);
  assert.deepEqual(solved.failures,[]);assert.equal(solved.labels.length,2);
  for(const label of solved.labels)assert.ok(label.maximumRelativeStep<=4+1e-9,label.id+' step '+label.maximumRelativeStep);
  const prev={};
  for(const f of inputs){
    const result=placeFromTrack(f.items,{frames:solved.frames},(f.frame/30)*30,f.silhouette,f.protectedRects,viewportFor([],800));
    assert.deepEqual(result.failures,[]);assert.equal(result.placed.length,2);
    for(const c of result.placed){
      assert.ok(c.clearance>=24&&c.length<=400);
      const rel=[c.rect.x-c.anchor.x,c.rect.y-c.anchor.y];if(prev[c.id])assert.ok(Math.hypot(rel[0]-prev[c.id][0],rel[1]-prev[c.id][1])<=4+1e-9);prev[c.id]=rel;
      assert.ok(c.side==='left'?c.rect.x+c.rect.width<=c.anchor.x+1e-9:c.rect.x>=c.anchor.x-1e-9);
    }
  }
  console.log(JSON.stringify({seconds:(Date.now()-started)/1000,labels:solved.labels.map(l=>[l.id,l.side,l.maximumRelativeStep,+l.maximumLeader.toFixed(1)])}));
});
test('blocked field is conservative against the exact gate code',()=>{
  const f=frame(0),field=blockedField(f);let checked=0;
  for(let y=48;y<760;y+=7)for(let x=48;x<1600;x+=11){
    const rect={x,y,width:200,height:47},exact=evaluateCallout({anchor:{x:x+300,y:y+20}},rect,f.silhouette,f.protectedRects,viewportFor([],800));
    if(field.clear(x,y,200,47)){checked++;assert.ok(exact.clearance>=24.01,`clearance ${exact.clearance} at ${x},${y}`);assert.ok(exact.reason!=='Label within 8px of protected text');}
  }
  assert.ok(checked>1000);
});
test('a track solved for other anchors is rejected',()=>{
  const f=frame(0),solved=solveCalloutTrack([f]);f.items[0].anchor={x:f.items[0].anchor.x+3,y:f.items[0].anchor.y};
  assert.match(placeFromTrack(f.items,{frames:solved.frames},0,f.silhouette,f.protectedRects,viewportFor([],800)).failures.map(x=>x.reason).join(),/different anchor/);
});
