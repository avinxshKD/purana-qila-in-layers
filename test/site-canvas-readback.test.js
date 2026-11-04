import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{topDownRGBA}=require('../scripts/film/canvas-readback.cjs'),{maskedDifference}=require('../scripts/film/marker-mask.cjs');
test('canvas readback flips GL bottom-up rows without changing channels',()=>{
  const bytes=Buffer.from([1,2,3,255,4,5,6,255]);
  assert.deepEqual([...topDownRGBA({rgba:bytes.toString('base64'),width:1,height:2})],[4,5,6,255,1,2,3,255]);
});
test('ghost mask permits only outward-rounded button boxes, not unrelated image changes',()=>{
  const before=Buffer.alloc(4*4*4),after=Buffer.from(before);after[4*(1+1*4)]=200;
  const boxes=[{x:.6,y:.7,width:.8,height:.8}];
  assert.equal(maskedDifference(before,after,4,4,boxes).onlyGhostBoxesChanged,true);
  after[4*(3+3*4)]=1;const result=maskedDifference(before,after,4,4,boxes);
  assert.equal(result.insideGhostPixels,1);assert.deepEqual(result.outside.map(({x,y})=>({x,y})),[{x:3,y:3}]);assert.equal(result.onlyGhostBoxesChanged,false);
});
