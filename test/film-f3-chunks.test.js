import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {CHUNK_TABLE,CHUNKS,chunkSpec,checkContinuity}=createRequire(import.meta.url)('../scripts/film/f3-contract.cjs');
const records=()=>CHUNK_TABLE.map(c=>({startFrame:c.start,endFrame:c.start+c.frames,frames:c.frames}));
test('F3 mixed chunk table: 22 x 30 then 57 x 20, contiguous over 1800 frames',()=>{
  assert.equal(CHUNKS,79);
  assert.ok(CHUNK_TABLE.slice(0,22).every((c,i)=>c.frames===30&&c.start===i*30));
  assert.ok(CHUNK_TABLE.slice(22).every((c,i)=>c.frames===20&&c.start===660+i*20));
  assert.equal(CHUNK_TABLE.reduce((n,c)=>n+c.frames,0),1800);
  assert.ok(CHUNK_TABLE.some(c=>c.start===1620),'end card starts on a chunk boundary');
  assert.equal(CHUNK_TABLE.filter(c=>c.start>=1620).length,9);
  assert.deepEqual(chunkSpec(22),{index:22,start:660,frames:20});assert.throws(()=>chunkSpec(79),/Invalid F3 chunk/);
});
test('F3 continuity check rejects gaps, overlaps, wrong sizes and short runs',()=>{
  assert.equal(checkContinuity(records()),true);
  const gap=records();gap[30].startFrame+=1;gap[30].endFrame+=1;assert.throws(()=>checkContinuity(gap),/chunk 30/);
  const size=records();size[22]={startFrame:660,endFrame:690,frames:30};assert.throws(()=>checkContinuity(size),/chunk 22/);
  assert.throws(()=>checkContinuity(records().slice(0,78)),/end at 1780/);
});
