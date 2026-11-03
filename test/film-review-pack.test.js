import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {pixelDiff,compareWithNeighbours}=createRequire(import.meta.url)('../scripts/film/review-pack.cjs');
test('seam RGB metric ignores alpha and compares immediate neighbour motion',()=>{
  const a=Buffer.from([0,10,20,255,30,40,50,255]),b=Buffer.from([1,11,21,0,31,41,51,0]);
  const diff=pixelDiff(a,b);assert.equal(diff.meanAbsoluteRGBDifference,1);assert.equal(diff.pixelsChanged,2);
  assert.equal(compareWithNeighbours(diff,diff,diff).seamToNeighbourRatio,1);
  assert.equal(compareWithNeighbours(diff,diff,diff).reviewFlag,false);
  assert.equal(compareWithNeighbours({...diff,meanAbsoluteRGBDifference:4},diff,diff).reviewFlag,true);
  assert.equal(compareWithNeighbours(pixelDiff(a,a),pixelDiff(a,a),pixelDiff(a,a)).seamToNeighbourRatio,null);
});
