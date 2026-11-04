import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {prepareDelivery,validateChunk} from '../scripts/film/f2-render.cjs';
import {fileSHA256} from '../scripts/film/f2-contract.cjs';
import {sha256} from '../scripts/media.cjs';
import {ranges,review} from '../scripts/film/preflight-review.cjs';
const frame=index=>({frame:index,backend:'m1',provisionalGeometry:false,framing:{minimumMargin:.041},overlayReport:{failures:[],maximumLeaderLength:null,maximumLabelBottom:null,blockLowestY:900,minimumTextClearance:25,minimumScaleClearance:null,minimumScaleReservePadding:24,scaleLabels:[{},{}],scaleLabelLayout:[{gapPx1080:7},{gapPx1080:7}]},anchorVisibility:[],geometryAudit:{cpuDisplacement:true,standInApplied:false,visibleLegacyPlaneCaps:[],flatGrowthTops:[],topMeshes:[]}});
function fixture(folder){
  const preflight=path.join(folder,'preflight');fs.mkdirSync(path.join(preflight,'snapshot'),{recursive:true});fs.mkdirSync(path.join(preflight,'source'),{recursive:true});
  fs.writeFileSync(path.join(preflight,'snapshot','film.html'),'frozen fixture');fs.writeFileSync(path.join(preflight,'source','module.js'),'frozen source fixture');
  const files={'film.html':sha256('frozen fixture')},sourceFiles={'module.js':sha256('frozen source fixture')},snapshotSHA256=sha256(JSON.stringify(files));
  fs.writeFileSync(path.join(preflight,'snapshot-manifest.json'),JSON.stringify({files,snapshotSHA256,sourceRoot:path.join(preflight,'source')}));
  fs.writeFileSync(path.join(preflight,'source-inputs.json'),JSON.stringify({backend:'m1',revision:'r2b',files:sourceFiles,sha256:sha256(JSON.stringify(sourceFiles))}));
  fs.writeFileSync(path.join(preflight,'frame-metrics.json'),JSON.stringify(Array.from({length:1800},(_,i)=>frame(i))));
  fs.writeFileSync(path.join(preflight,'summary.json'),JSON.stringify({backend:'m1',revision:'r2b',geometryProvisional:false,framesAudited:1800,stillCount:17,snapshotSHA256,minimumFrameMargin:.041,scaleLabelCountFailures:[],labelsBelowBlock:[],geometryFailures:[],layoutFailures:[]}));
  return preflight;
}
test('F2 preparation is file-only, preserves frozen input and rejects changed source/build/coverage',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'strata-f2-prepare-'));
  try{
    const preflight=fixture(folder),out=path.join(folder,'delivery'),prepared=prepareDelivery(preflight,out);
    assert.equal(prepared.input.backend,'m1');assert.equal(prepared.input.emphasis,false);
    assert.equal(fs.existsSync(path.join(out,'proof-fresh.json')),false);
    assert.equal(fileSHA256(path.join(out,'snapshot','film.html')),sha256('frozen fixture'));
    assert.equal(prepareDelivery(preflight,out).manifest.snapshotSHA256,prepared.manifest.snapshotSHA256);
    fs.writeFileSync(path.join(out,'source','module.js'),'changed');assert.throws(()=>prepareDelivery(preflight,out),/Frozen source changed/);
    fs.writeFileSync(path.join(out,'source','module.js'),'frozen source fixture');fs.writeFileSync(path.join(out,'snapshot','film.html'),'changed build');assert.throws(()=>prepareDelivery(preflight,out),/Frozen snapshot changed/);
    const frames=Array.from({length:1800},(_,i)=>frame(i));frames[10].frame=11;fs.writeFileSync(path.join(preflight,'frame-metrics.json'),JSON.stringify(frames));
    assert.throws(()=>prepareDelivery(preflight,path.join(folder,'bad-coverage')),/coverage/);
    frames[10]=frame(10);frames[11].backend='a3';fs.writeFileSync(path.join(preflight,'frame-metrics.json'),JSON.stringify(frames));
    assert.throws(()=>prepareDelivery(preflight,path.join(folder,'bad-backend')),/real M1/);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('F2 resumed chunks must retain exact range, hash, deadline and pixel-proof metadata',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'strata-f2-chunk-'));
  try{
    fs.mkdirSync(path.join(folder,'chunks'));fs.writeFileSync(path.join(folder,'chunks','part-00.mkv'),'unit metadata fixture, not video');
    const report={backend:'m1',emphasis:false,snapshotSHA256:'snapshot',startFrame:0,endFrame:45,frames:45,gpuTurnSeconds:90,video:'chunks/part-00.mkv',videoSHA256:fileSHA256(path.join(folder,'chunks','part-00.mkv')),stats:Array.from({length:45},(_,i)=>frame(i))},file=path.join(folder,'chunks','part-00.json');
    const write=()=>fs.writeFileSync(file,JSON.stringify(report));write();assert.equal(validateChunk(folder,0,{snapshotSHA256:'snapshot'},{samples:[]}).frames,45);
    report.gpuTurnSeconds=110.1;write();assert.throws(()=>validateChunk(folder,0,{snapshotSHA256:'snapshot'},{samples:[]}),/deadline/);
    report.gpuTurnSeconds=90;write();fs.appendFileSync(path.join(folder,'chunks','part-00.mkv'),'changed');assert.throws(()=>validateChunk(folder,0,{snapshotSHA256:'snapshot'},{samples:[]}),/bytes changed/);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
test('r2b review uses integer derived ranges and does not double-count missing anchors as off-frame',()=>{
  assert.equal(ranges([407.00000000000006,406,407,409]),'406–407, 409');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'strata-r2b-review-'));
  try{
    const preflight=fixture(folder),frames=[frame(406),frame(407)];frames[0].anchorVisibility=[{id:'fixture',featureId:'fixture-feature',frame:406.00000000000006,opacity:.1,missing:true,offFrame:true,occluded:null}];
    frames[1].anchorVisibility=[{id:'fixture',featureId:'fixture-feature',frame:407.00000000000006,opacity:.2,missing:false,offFrame:false,occluded:true}];
    fs.writeFileSync(path.join(preflight,'frame-metrics.json'),JSON.stringify(frames));review(preflight);
    const text=fs.readFileSync(path.join(preflight,'integration-review.md'),'utf8');assert.match(text,/# F2 preflight r2b/);assert.match(text,/\*\*0 provided-but-off-frame\*\*/);assert.match(text,/\*\*1 missing\*\*/);assert.doesNotMatch(text,/406\.0000/);
    assert.match(fs.readFileSync(path.join(preflight,'frame-metrics.json'),'utf8'),/406\.00000000000006/);assert.throws(()=>review(preflight),/Preserve/);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
