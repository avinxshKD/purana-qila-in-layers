'use strict';
const fs=require('node:fs'),path=require('node:path');
const {verifySource,verifySnapshot,verifyPreflight,fileSHA256}=require('./f2-contract.cjs'),{root}=require('../browser.cjs');
function crossed(a,b,c,d){
  const side=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  return side(a,b,c)*side(a,b,d)<0&&side(c,d,a)*side(c,d,b)<0;
}
function main(){
  const args=process.argv.slice(2),i=args.indexOf('--out');if(i<0)throw new Error('Supply preflight --out');const out=path.resolve(args[i+1]),target=path.join(out,'r2b-gates.json');
  if(fs.existsSync(target))throw new Error('Preserve completed r2b gate pack');
  const manifest=verifySnapshot(out),source=verifySource(out),summary=verifyPreflight(out),frames=JSON.parse(fs.readFileSync(path.join(out,'frame-metrics.json'))),scale=JSON.parse(fs.readFileSync(path.join(out,'scale-label-all-frame-containment.json')));
  if(scale.snapshotSHA256!==manifest.snapshotSHA256||scale.failures.length||scale.cases.length!==2||scale.cases.some(c=>c.frames.length!==1800||c.minimumPadding<24-1e-6))throw new Error('Frozen scale containment is incomplete/failed');
  const anchors=frames.flatMap(frame=>frame.anchorVisibility.map(anchor=>({...anchor,frame:frame.frame}))),leaders=frames.flatMap(frame=>frame.overlayReport.leaders.map(leader=>({...leader,frame:frame.frame}))),crossings=[];
  for(const frame of frames){const ls=frame.overlayReport.leaders;for(let a=0;a<ls.length;a++)for(let b=a+1;b<ls.length;b++)if(crossed(ls[a].start,ls[a].anchor,ls[b].start,ls[b].anchor))crossings.push({frame:frame.frame,ids:[ls[a].id,ls[b].id]});}
  const main=fs.readFileSync(path.join(out,'source/src/film/main.js'),'utf8');
  const report={revision:summary.revision,snapshotSHA256:manifest.snapshotSHA256,sourceSHA256:source.sha256,backend:'m1',emphasisImported:/\bfrom\s+['"][^'"]*emphasis/.test(main),fullRenderAuthorized:false,
    stills:summary.stillCount,frames:frames.length,anchorSamples:anchors.length,anchors:{occluded:anchors.filter(a=>a.occluded).length,missing:anchors.filter(a=>a.missing).length,providedOffFrame:anchors.filter(a=>!a.missing&&a.offFrame).length},
    hud:{minimumTextClearance:summary.minimumTextClearance,maximumLeaderLength:summary.maximumLeaderLength,belowBlockFrames:summary.labelsBelowBlock.length,layoutFailures:summary.layoutFailures.length,leaderSamples:leaders.length,nonStraightLeaders:leaders.filter(l=>l.straight!==true).length,crossings},
    scale:{minimumFeatureClearance:summary.minimumScaleClearance,minimumGlyphGap1080:summary.minimumScaleGlyphGap1080,minimumReservePadding:summary.minimumScaleReservePadding,labelCountFailures:summary.scaleLabelCountFailures.length,actualInkContainment:scale.cases.map(c=>({height:c.height,frames:c.frames.length,minimumPadding:c.minimumPadding})),numericNote:'Raw reserve measurements retained. Subtracting projected coordinates produces at most2.3e-13px cancellation below24; the per-frame gate permits only1e-9px numerical tolerance, not pixel rounding.'},
    framing:{minimumMargin:summary.minimumFrameMargin,worstFrame:frames.reduce((a,b)=>a.framing.minimumMargin<b.framing.minimumMargin?a:b).frame,frame1799:{margin:frames[1799].framing.minimumMargin,margins:frames[1799].framing.margins,pose:frames[1799].pose},distanceMetres:summary.distanceMetres},
    geometry:{failures:summary.geometryFailures.length,maximumTopOutsideBlockMetres:summary.maximumTopOutsideBlockMetres},validation:'Fresh frozen-r2b browser samples, shared displacement adapter and depth-tested anchor rays; separate frozen-source Canvas2D ink audit at1080/2160. No full F2 render or final-profile proof yet.'};
  if(report.emphasisImported||report.hud.nonStraightLeaders||crossings.length)throw new Error('r2b emphasis/leader gate failed');
  const evidence={};
  for(const [name,relative]of[['capture-audit-harness.cjs','scripts/film/preflight.cjs'],['scale-audit-harness.cjs','scripts/film/scale-audit.cjs'],['pack-audit-harness.cjs','scripts/film/preflight-pack.cjs'],['f2-contract-harness.cjs','scripts/film/f2-contract.cjs']]){
    const from=path.join(root,relative),to=path.join(out,name);if(fs.existsSync(to))throw new Error('Preserve evidence: '+name);fs.copyFileSync(from,to);evidence[name]={source:relative,sha256:fileSHA256(to)};
  }
  for(const name of['source-inputs.json','snapshot-manifest.json','summary.json','frame-metrics.json','frame-metrics.csv','scale-label-all-frame-containment.json','stills.json','device.json'])evidence[name]={source:'Fresh r2b preflight',sha256:fileSHA256(path.join(out,name))};
  fs.writeFileSync(path.join(out,'integration-evidence.json'),JSON.stringify(evidence,null,2)+'\n');fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
if(require.main===module)try{main();}catch(error){console.error(error);process.exitCode=1;}
module.exports={crossed};
