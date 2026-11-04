'use strict';
const fs=require('node:fs'),path=require('node:path'),{root}=require('../browser.cjs');
function ranges(values){const result=[];for(const value of[...new Set(values.map(Math.round))].sort((a,b)=>a-b)){const last=result.at(-1);if(last&&last[1]+1===value)last[1]=value;else result.push([value,value]);}return result.map(([a,b])=>a===b?String(a):a+'–'+b).join(', ');}
function review(delivery){
const out=path.join(delivery,'integration-review.md');
if(fs.existsSync(out))throw new Error('Preserve delivered integration review');
const summary=JSON.parse(fs.readFileSync(path.join(delivery,'summary.json'))),frames=JSON.parse(fs.readFileSync(path.join(delivery,'frame-metrics.json'))),anchors=frames.flatMap(f=>f.anchorVisibility.map(anchor=>({...anchor,frame:f.frame,offFrame:!anchor.missing&&anchor.offFrame}))),ids=new Map();
const revision=summary.revision||'r2',corrected=revision!=='r2';
for(const anchor of anchors){if(!ids.has(anchor.id))ids.set(anchor.id,{featureId:anchor.featureId,count:0,occluded:[],offFrame:[],missing:[],firstFailure:null});const row=ids.get(anchor.id);row.count++;
  if(anchor.occluded)row.occluded.push(anchor.frame);if(anchor.offFrame)row.offFrame.push(anchor.frame);if(anchor.missing)row.missing.push(anchor.frame);
  if(!row.firstFailure&&(anchor.occluded||anchor.offFrame||anchor.missing))row.firstFailure=anchor;
}
const fmt=(number,digits=3)=>Number.isFinite(number)?number.toFixed(digits):'n/a',lines=[
`# F2 preflight ${revision}, M1 ${corrected?'corrected-look candidate':'integration only'}`,'',
`Frozen snapshot: \`${summary.snapshotSHA256}\`. ${summary.stillCount} stills; ${summary.framesAudited} audited camera frames; ${anchors.length} nonzero-opacity anchor samples.`,
'',corrected?'Fresh corrected-M1 candidate. Judge streak-free era tops, camera-ray-correct anchors and every-frame framing/HUD against the evidence below. This report is not look acceptance or full-render authorization.':'Era-top texture streaks are a pending look issue. This is not M1 look acceptance or full-render authorization. r2b must judge the corrected look.','',
'## Integration gates','',
`- CPU geometry: validated M1 displacement export, same per-frame state, used by framing, silhouette and rays; GPU geometry unchanged.`,
`- Anchor audit: **${anchors.filter(a=>a.occluded).length} occluded**, **${anchors.filter(a=>a.offFrame).length} provided-but-off-frame**, **${anchors.filter(a=>a.missing).length} missing** samples. Missing is not also counted as off-frame. Ray stop tolerance0.0001m; every opacity>0 is included.`,
`- Minimum whole-block/plinth frame margin: **${fmt(summary.minimumFrameMargin*100)}%** (gate4%).`,
`- Minimum HUD clearance: **${fmt(summary.minimumTextClearance)}px** (gate24px); maximum leader **${fmt(summary.maximumLeaderLength)}px** (gate400px).`,
`- Feature label/leader-to-scale minimum clearance: **${fmt(summary.minimumScaleClearance)}px** (gate24px).`,
`- Shared scale ink-to-bar gap: **${fmt(summary.minimumScaleGlyphGap1080)}px** at1080 (gate6px). Actual ink reservation padding **${fmt(summary.minimumScaleReservePadding)}px** (gate24px); unexpected scale label counts on ${summary.scaleLabelCountFailures.length} frames.`,
`- Labels below the lowest block silhouette: **${summary.labelsBelowBlock.length}** frames.`,
`- Flat growth tops / visible legacy PlaneGeometry caps / stand-in backend: **${summary.geometryFailures.length}** failing frames.`,
`- Maximum displaced top extent outside x[-12,12],z[-8,8]: **${fmt(summary.maximumTopOutsideBlockMetres,6)}m**. Inspect this numeric extent alongside the stills; actual trenches and floors are not classified as forbidden growth caps.`,
'- M1 never creates the film stand-in cap/refill rectangle meshes. Real stepped M1 floors remain intentional.',
'','## Every active anchor','',
'| Callout | Feature | Samples | Occluded frames | Off-frame | Missing |','|---|---|---:|---|---|---|'];
for(const[id,r]of ids)lines.push(`| ${id} | ${r.featureId} | ${r.count} | ${ranges(r.occluded)||'none'} | ${ranges(r.offFrame)||'none'} | ${ranges(r.missing)||'none'} |`);
for(const[id,r]of ids)if(r.firstFailure){const f=r.firstFailure,h=f.firstBlockingHit;lines.push('',`### ${id}: first failure at frame${f.frame} (${fmt(f.frame/30)}s), opacity${f.opacity}`,f.reason||'See raw audit.',h?`Blocker: \`${h.mesh}\`, role \`${h.role}\`, ${fmt(h.metresBeforeAnchor,6)}m before the returned anchor.`:'No geometric blocker, see missing/off-frame data.',`Returned point: \`${JSON.stringify(f.point)}\`; projected: \`${JSON.stringify(f.projected)}\`.`);}
lines.push('','## Layout failures','');
if(!summary.layoutFailures.length)lines.push('None.');
for(const failure of summary.layoutFailures)lines.push(`- \`${failure.id}\` (${failure.kind}): ${failure.reason}. Frames ${ranges(failure.frames)}.`);
lines.push('','## Evidence','',
...['review.html','contact-17.png','stills','frame-metrics.json','frame-metrics.csv','cpu-batches','scale-label-all-frame-containment.json','cpu-displacement-check.json','cpu-displacement-check.md','m1-anchors-reference.json','source','source-inputs.json','snapshot','snapshot-manifest.json','integration-evidence.json'].filter(file=>fs.existsSync(path.join(delivery,file))).map(file=>'- `'+file+'`'),
'','Persistent/fresh final-snapshot pixel identity and final encoding are still pending. No full F2 render was performed.','');
fs.writeFileSync(out,lines.join('\n'));console.log(JSON.stringify({review:out,anchorSamples:anchors.length,occluded:anchors.filter(a=>a.occluded).length,offFrame:anchors.filter(a=>a.offFrame).length,missing:anchors.filter(a=>a.missing).length,layoutFailures:summary.layoutFailures.length,geometryFailureFrames:summary.geometryFailures.length}));
}
if(require.main===module)review(path.resolve(process.argv[2]||path.join(root,'output/film/f2/preflight-m1-r2')));
module.exports={review,ranges};
