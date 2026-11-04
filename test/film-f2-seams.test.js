import test from 'node:test';
import assert from 'node:assert/strict';
import {compareSeam} from '../scripts/film/f2-seams.cjs';
const pixel=n=>Buffer.from([n,n,n,255]);
test('F2 decoded seam gate is1.5x and flags a nonzero seam between static neighbours',()=>{
  assert.equal(compareSeam(pixel(0),pixel(2),pixel(4),pixel(6)).reviewFlag,false);
  assert.equal(compareSeam(pixel(0),pixel(2),pixel(6),pixel(8)).ratio,2);
  assert.equal(compareSeam(pixel(0),pixel(2),pixel(6),pixel(8)).reviewFlag,true);
  assert.equal(compareSeam(pixel(0),pixel(0),pixel(1),pixel(1)).reviewFlag,true);
  assert.equal(compareSeam(pixel(1),pixel(1),pixel(1),pixel(1)).reviewFlag,false);
});
