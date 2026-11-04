'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{sha256}=require('../media.cjs');
const LOCKED_SCORE='126440F1B57F14FFDB8FAAC2CA8F3AD0DF8274015AF15617DD18997E0291413B';
function fileSHA256(file){
  const fd=fs.openSync(file,'r'),hash=crypto.createHash('sha256'),buffer=Buffer.allocUnsafe(1024*1024);
  try{let length;while((length=fs.readSync(fd,buffer,0,buffer.length,null))>0)hash.update(buffer.subarray(0,length));return hash.digest('hex');}finally{fs.closeSync(fd);}
}
function verifySource(folder){
  const input=JSON.parse(fs.readFileSync(path.join(folder,'source-inputs.json')));
  if(input.backend!=='m1'||sha256(JSON.stringify(input.files))!==input.sha256)throw new Error('Frozen M1 source manifest differs');
  for(const[file,hash]of Object.entries(input.files))if(sha256(fs.readFileSync(path.join(folder,'source',file)))!==hash)throw new Error('Frozen source changed: '+file);
  return input;
}
function verifySnapshot(folder){
  const manifest=JSON.parse(fs.readFileSync(path.join(folder,'snapshot-manifest.json')));
  if(sha256(JSON.stringify(manifest.files))!==manifest.snapshotSHA256)throw new Error('Snapshot manifest digest differs');
  for(const[file,hash]of Object.entries(manifest.files))if(sha256(fs.readFileSync(path.join(folder,'snapshot',file)))!==hash)throw new Error('Frozen snapshot changed: '+file);
  return manifest;
}
function assertBackend(data){if(data.backend!=='m1'||data.provisionalGeometry!==false||data.geometryAudit?.cpuDisplacement!==true||data.geometryAudit?.standInApplied!==false)throw new Error('F2 fails closed: explicit real M1 backend is required');}
function assertFrame(data){
  assertBackend(data);const r=data.overlayReport;
  if(!Number.isFinite(data.framing?.minimumMargin)||data.framing.minimumMargin<.04)throw new Error('F2 frame margin below4percent');
  if(!r||r.failures.length||r.maximumLeaderLength>400||(r.maximumLabelBottom!==null&&r.maximumLabelBottom>r.blockLowestY))throw new Error('F2 HUD layout failed');
  if([r.minimumTextClearance,r.minimumScaleClearance,r.maximumLeaderLength,r.maximumLabelBottom].some(value=>value!==null&&!Number.isFinite(value))||!Number.isFinite(r.minimumScaleReservePadding))throw new Error('F2 HUD metrics missing/nonfinite');
  // Reserves are formed at24px; subtracting projected coordinates can leave
  // ~1e-13px cancellation error. Preserve raw values; allow only1e-9px here.
  if((r.minimumTextClearance??Infinity)<24||(r.minimumScaleClearance??Infinity)<24||(r.minimumScaleReservePadding??0)<24-1e-9||(r.scaleLabels||[]).length!==2)throw new Error('F2 HUD/scale clearance failed');
  if(r.scaleLabelLayout?.length!==2||r.scaleLabelLayout.some(label=>!Number.isFinite(label.gapPx1080)||label.gapPx1080<6))throw new Error('F2 shared scale glyph gap failed');
  if(data.anchorVisibility.some(a=>a.missing!==false||a.offFrame!==false||a.occluded!==false||a.point?.length!==3||!a.point.every(Number.isFinite)||!['x','y','z'].every(key=>Number.isFinite(a.projected?.[key]))))throw new Error('F2 anchor visibility failed');
  if(data.geometryAudit.visibleLegacyPlaneCaps.length||data.geometryAudit.flatGrowthTops.length||data.geometryAudit.topMeshes.some(m=>!Number.isFinite(m.outsideBlockMetres)||m.outsideBlockMetres>1e-4))throw new Error('F2 geometry gate failed');
}
function verifyPreflight(folder){
  const summary=JSON.parse(fs.readFileSync(path.join(folder,'summary.json'))),frames=JSON.parse(fs.readFileSync(path.join(folder,'frame-metrics.json')));
  if(summary.backend!=='m1'||summary.geometryProvisional!==false||summary.framesAudited!==1800||frames.length!==1800||summary.stillCount!==17)throw new Error('F2 needs complete corrected-M1 preflight');
  frames.forEach((frame,index)=>{if(frame.frame!==index)throw new Error('F2 preflight frame coverage differs');assertFrame(frame);});
  return summary;
}
function verifyProfileProof(fresh,profile,snapshotSHA256){
  if(fresh.snapshotSHA256!==snapshotSHA256||profile.snapshotSHA256!==snapshotSHA256||fresh.profileUsed!==false||profile.profileUsed!==true||fresh.backend!=='m1'||profile.backend!=='m1')throw new Error('F2 fresh/profile proof provenance differs');
  if(fresh.equal!==true||profile.equal!==true)throw new Error('F2 complete repeated proof failed');
  if(fresh.captureProtocol!==profile.captureProtocol)throw new Error('F2 raster protocols differ');
  const samples=[300,1530].map(frame=>{
    const a=fresh.samples.find(s=>s.frame===frame),b=profile.samples.find(s=>s.frame===frame);
    if(!a?.equal||!b?.equal||!/^[a-f0-9]{64}$/.test(a.first.sha256)||a.first.sha256!==a.repeat.sha256||b.first.sha256!==b.repeat.sha256||a.first.sha256!==b.first.sha256)throw new Error('F2 fresh/profile pixels differ at frame'+frame);
    return {frame,sha256:a.first.sha256,equal:true};
  });
  return {snapshotSHA256,backend:'m1',equal:true,captureProtocol:fresh.captureProtocol??'legacy-test-fixture',samples,method:'Native bottom-up RGBA: CPU-backed Canvas2D/font-ready/glyph-primed HUD; fresh versus persistent-profile frames300/1530, each repeated after other states, plus three consecutive300 draws. All must be exactly equal; no HUD exception used.'};
}
module.exports={LOCKED_SCORE,fileSHA256,verifySource,verifySnapshot,assertBackend,assertFrame,verifyPreflight,verifyProfileProof};
