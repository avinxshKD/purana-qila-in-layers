import test from 'node:test';
import assert from 'node:assert/strict';
import {auditHud,wrapText,scaleRectDistance,scaleLineDistance,keepNumberUnitsTogether} from '../src/film/hud.js';
import {rectPoints,labelCandidates} from '../src/film/layout.js';
for(const kind of ['caption','title','end-card','timeline','callout']){
  test(`${kind} clearance violation reaches layoutFailures`,()=>{
    const result=auditHud([{kind,id:kind+':test',text:'test',rect:{x:0,y:0,width:100,height:30}}],{distanceRect:()=>23.9});
    assert.equal(result.failures.length,1);assert.equal(result.failures[0].kind,kind);assert.equal(result.failures[0].id,kind+':test');
  });
}
test('24px passes, but invisible HUD text is not counted',()=>{
  assert.deepEqual(auditHud([{kind:'caption',id:'a',opacity:0,rect:{}}],{distanceRect:()=>0}).failures,[]);
  assert.deepEqual(auditHud([{kind:'title',id:'b',rect:{}}],{distanceRect:()=>24}).failures,[]);
});
test('end-card wrapping preserves Table NBSP1 and has no single-word last line',()=>{
  for(const text of ['Composite section, not one surveyed trench.',"era dates follow the report's Table 1",'one two three four five']){
    const lines=wrapText(text,140,value=>value.length*8,{noSingleLast:true});
    assert.ok(lines);assert.ok(lines.every(line=>line.length*8<=140));assert.ok(lines.at(-1).split(/\s/u).length>=2);
    if(text.includes('Table 1'))assert.ok(lines.some(line=>line.includes('Table\u00a01')));
  }
});
test('number and unit cannot split across HUD lines',()=>{
  const cases=[['Stone wall, 1.40 m wide','1.40\u00a0m'],['Brickbat wall, 3.50 m','3.50\u00a0m'],['Width 120 cm','120\u00a0cm'],['Mass 25 kg','25\u00a0kg'],['Area 20 m²','20\u00a0m²'],['Time 10 ms','10\u00a0ms'],['Opacity 5 %','5\u00a0%'],['540 BCE','540\u00a0BCE']];
  for(const [text,pair]of cases){
    const lines=wrapText(text,140,value=>value.length*8);assert.ok(lines);assert.ok(lines.some(line=>line.includes(pair)),text);
    for(let i=0;i+1<lines.length;i++)assert.ok(!/\d(?:[.,]\d+)*$/.test(lines[i])||!/^(?:m|cm|kg|m²|ms|%|BCE)\b/u.test(lines[i+1]),lines.join(' / '));
  }
  assert.equal(keepNumberUnitsTogether('18 exposed rings; 1948 brick'),'18 exposed rings; 1948 brick');
  assert.equal(keepNumberUnitsTogether('5\u00a0m'),'5\u00a0m');
});
test('scale bar and its label protect label boxes and entire leader segments',()=>{
  const zones=[rectPoints({x:300,y:500,width:100,height:30}),rectPoints({x:350,y:540,width:50,height:20})];
  assert.equal(scaleRectDistance({x:350,y:510,width:40,height:20},zones),0);
  assert.equal(scaleLineDistance({x:200,y:510},{x:500,y:510},zones),0);
  assert.equal(scaleLineDistance({x:310,y:510},{x:320,y:510},zones),0);
  const result=labelCandidates({id:'lower',anchor:{x:650,y:690},boxWidth:230,boxHeight:80},[{x:600,y:200},{x:1300,y:200},{x:1300,y:900},{x:600,y:900}],[],{maxLabelBottom:700,rectScaleDistance:r=>scaleRectDistance(r,zones),lineScaleDistance:(a,b)=>scaleLineDistance(a,b,zones)});
  assert.ok(result.length);
  for(const candidate of result){assert.ok(candidate.labelBottom<=700);assert.ok(candidate.scaleLabelClearance>=24);assert.ok(candidate.scaleLeaderClearance>=24);}
});
