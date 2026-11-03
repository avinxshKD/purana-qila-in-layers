import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {cameraScale}=createRequire(import.meta.url)('../scripts/film/camera-scale.cjs');
test('active-top px/metre uses optical depth and known vertical field of view',()=>{
  const scale=cameraScale({position:[0,0,100],target:[0,0,0]},0);
  const expected=1080/(2*Math.tan(12.5*Math.PI/180)*100);
  assert.equal(scale.activeTopDepthMetres,100);
  assert.ok(Math.abs(scale.pixelsPerMetreAtActiveTop-expected)<1e-12);
  assert.ok(Math.abs(scale.worldVerticalPixelsPerMetreAtActiveTop-expected)<1e-12);
  assert.throws(()=>cameraScale({position:[0,0,100],target:[0,0,200]},0),/behind/);
});
