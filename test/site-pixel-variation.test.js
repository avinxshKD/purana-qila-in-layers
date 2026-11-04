import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {variationEnvelope}=createRequire(import.meta.url)('../scripts/film/pixel-variation.cjs');
test('pixel variation accepts only the baseline per-pixel, per-channel envelope',()=>{
  const a=Buffer.from([10,20,30,255,40,50,60,255]),b=Buffer.from([11,20,30,255,40,50,60,255]);
  assert.equal(variationEnvelope(a,b,a).candidateWithinEnvelope,true);assert.equal(variationEnvelope(a,b,b).candidateWithinEnvelope,true);
  const wrongPixel=Buffer.from([10,20,30,255,41,50,60,255]),report=variationEnvelope(a,b,wrongPixel);
  assert.equal(report.candidateWithinEnvelope,false);assert.equal(report.baselineVaryingPixels,1);assert.equal(report.candidateOutsideEnvelopePixels,1);
  assert.throws(()=>variationEnvelope(a,b,Buffer.alloc(4)),/lengths/);
});
