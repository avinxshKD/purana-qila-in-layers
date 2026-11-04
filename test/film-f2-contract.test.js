import test from 'node:test';
import assert from 'node:assert/strict';
import {assertBackend,assertFrame,verifyProfileProof} from '../scripts/film/f2-contract.cjs';
const valid=()=>({backend:'m1',provisionalGeometry:false,framing:{minimumMargin:.041},overlayReport:{failures:[],maximumLeaderLength:350,maximumLabelBottom:500,blockLowestY:900,minimumTextClearance:24,minimumScaleClearance:24,minimumScaleReservePadding:24,scaleLabels:[{},{}],scaleLabelLayout:[{gapPx1080:7},{gapPx1080:7}]},anchorVisibility:[],geometryAudit:{cpuDisplacement:true,standInApplied:false,visibleLegacyPlaneCaps:[],flatGrowthTops:[],topMeshes:[]}});
test('F2 fails closed for missing, A3 or provisional backends',()=>{
  assert.doesNotThrow(()=>assertBackend(valid()));
  for(const patch of[{backend:'a3'},{backend:undefined},{provisionalGeometry:true},{geometryAudit:{cpuDisplacement:false}}])assert.throws(()=>assertBackend({...valid(),...patch}),/real M1/);
});
test('F2 cache reuse requires both fresh and profile exact300/1530 proofs',()=>{
  const proof=profileUsed=>({backend:'m1',profileUsed,equal:true,snapshotSHA256:'snapshot',samples:[300,1530].map(frame=>({frame,equal:true,first:{sha256:'a'.repeat(64)},repeat:{sha256:'a'.repeat(64)}}))});
  assert.equal(verifyProfileProof(proof(false),proof(true),'snapshot').equal,true);
  const bad=proof(true);bad.samples[1].first.sha256='b'.repeat(64);assert.throws(()=>verifyProfileProof(proof(false),bad,'snapshot'),/pixels differ/);
  assert.throws(()=>verifyProfileProof(proof(true),proof(true),'snapshot'),/provenance/);
  const failed=proof(true);failed.equal=false;assert.throws(()=>verifyProfileProof(proof(false),failed,'snapshot'),/complete repeated proof/);
});
test('F2 per-frame gates reject margin, layout and anchor regressions',()=>{
  assert.doesNotThrow(()=>assertFrame(valid()));
  const margin=valid();margin.framing.minimumMargin=.03999;assert.throws(()=>assertFrame(margin),/margin/);
  const anchor=valid();anchor.anchorVisibility=[{occluded:true}];assert.throws(()=>assertFrame(anchor),/anchor/);
  const scale=valid();scale.overlayReport.minimumScaleClearance=23.9;assert.throws(()=>assertFrame(scale),/clearance/);
  const geometry=valid();geometry.geometryAudit.flatGrowthTops=['flat'];assert.throws(()=>assertFrame(geometry),/geometry/);
  const cancellation=valid();cancellation.overlayReport.minimumScaleReservePadding=23.999999999999886;assert.doesNotThrow(()=>assertFrame(cancellation));
  cancellation.overlayReport.minimumScaleReservePadding=23.99999;assert.throws(()=>assertFrame(cancellation),/clearance/);
});
