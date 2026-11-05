import test from 'node:test';
import assert from 'node:assert/strict';
import {BLOCK_STYLE,blockInterior,blockSeparations,separationFailures,inkGaps} from '../src/film/text-blocks.js';
const r=(y,height,width=400)=>({x:59,y,width,height});
// Rects measured with real fonts (headless Edge, CPU canvas) for the cold open and end card.
const coldOpen=[{id:'title:0',paragraph:'title',em:77.37,rect:r(42,75)},{id:'title:1',paragraph:'title',em:77.37,rect:r(112,79)},
  {id:'tagline:0',paragraph:'tagline',em:40.91,rect:r(205,41)},{id:'tagline:1',paragraph:'tagline',em:40.91,rect:r(248,33)}];
test('block spec: 66 px headline-to-body baseline offset, 43 px body step',()=>{
  assert.equal(BLOCK_STYLE.headlineToBody,66);assert.equal(BLOCK_STYLE.endCardHeadlineGap,14);assert.equal(BLOCK_STYLE.bodyParagraphGap,19);assert.equal(BLOCK_STYLE.body.step,43);assert.equal(BLOCK_STYLE.body.family,'Strata Sans');
});
test('inside a block the gate is max(8 px, 2x internal line gap), not 1 em',()=>{
  const b=blockInterior('cold-open',coldOpen);
  assert.deepEqual(inkGaps(coldOpen.slice(2).map(l=>l.rect)),[2]);
  assert.deepEqual(b.joints.map(j=>[j.gap,j.required]),[[14,8]]);assert.equal(b.failures.length,0);
  // A paragraph with a 10 px internal gap needs 20 px to the next one.
  const tight=[{id:'a0',paragraph:'p1',em:41,rect:r(293,33)},{id:'a1',paragraph:'p1',em:41,rect:r(336,40)},{id:'b0',paragraph:'p2',em:41,rect:r(391,41)}];
  const f=blockInterior('end-card',tight);assert.deepEqual(f.joints.map(j=>[j.gap,j.required]),[[15,20]]);assert.equal(f.failures[0].kind,'block-interior');
  const ok=blockInterior('end-card',tight.map(l=>l.id==='b0'?{...l,rect:r(396,41)}:l));assert.equal(ok.failures.length,0);
});
test('between a block and other text the full label-gap rule applies',()=>{
  const b=blockInterior('cold-open',coldOpen);
  const rows=blockSeparations(b,[{id:'timeline:start',kind:'timeline',rect:r(1029,24,112),em:30,lineGap:0},{id:'cap',kind:'caption',rect:r(300,40),em:40,lineGap:0}]);
  assert.ok(Math.abs(rows[1].required-77.37)<1e-9,'1 em of the title');
  assert.deepEqual(separationFailures(rows).map(f=>f.id),['cold-open+cap']);
});
