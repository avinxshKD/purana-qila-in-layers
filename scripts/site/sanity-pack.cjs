'use strict';
const fs=require('node:fs'),path=require('node:path'),{root}=require('../browser.cjs'),{ffmpeg}=require('../media.cjs'),{fileSHA256}=require('../film/f2-contract.cjs');
const args=process.argv.slice(2),i=args.indexOf('--out'),out=path.resolve(i<0?path.join(root,'output/site/sanity-m1-r1'):args[i+1]),report=JSON.parse(fs.readFileSync(path.join(out,'sanity-report.json')));
if(fs.existsSync(path.join(out,'review.md')))throw Error('Preserve completed site review');
const lines=['# Real-M1 site integration sanity','','Not a look or performance review. Native geometry/anchor table: immutable accepted-M1 r2b; current site adapter and r6 pool fields.','',`GPU turn: ${report.gpuTurnSeconds}s; ready: ${report.readySeconds??'not reached'}s; viewport1440×900 DPR1.`, `Snapshot: \`${report.snapshotSHA256}\`.`,report.failure?`**Stopped:** ${report.failure.phase}: ${report.failure.message}`:'All four states captured.','','Reasons distinguish native exposure/soil hiding from worker-ray occlusion, era reveal and off-screen anchors. Visible dot-only markers remain visible even when their text label is suppressed for overlap.',''];
const summary=[];
for(const state of report.states){
 const counts={};for(const row of state.markers)counts[row.reason]=(counts[row.reason]||0)+1;
 const mismatch=state.markers.filter(r=>r.visible!==(r.reason==='visible')||!r.workerFresh||r.reason==='missing-native-anchor');
 const viewport=state.viewport;
 const gates={nativeAnchors:state.metadata.placeholderAnchors===false,viewport:viewport.width===1440&&viewport.height===900&&viewport.dpr===1&&viewport.canvasWidth===1440&&viewport.canvasHeight===900,allWorkerResultsFresh:state.markers.every(r=>r.workerFresh),visibilityReasonsConsistent:mismatch.length===0,workerSettled:!state.metadata.occlusion.pending&&!state.metadata.occlusion.pendingOperations};
 summary.push({id:state.id,year:state.year,counts,gates,issues:mismatch.map(r=>r.featureId),image:state.image,imageSHA256:fileSHA256(path.join(out,state.image))});
 lines.push(`## ${state.id}, year ${state.year}`,'',`![${state.id}](${state.image})`,'',`Counts: ${Object.entries(counts).map(([k,v])=>k+': '+v).join(', ')}. Worker revision is current for every row: ${gates.allWorkerResultsFresh}.`,'','| Marker | State | Why | Label |','|---|---|---|---|');
 for(const marker of state.markers)lines.push(`| ${marker.featureId} | ${marker.visible?'visible':'hidden'} | ${marker.reason}: ${marker.detail} | ${marker.labelVisible?'text':marker.visible?'dot only':'hidden'} |`);
 lines.push('');
}
if(report.states.length===4){
 const folder=path.join(out,'contact-tiles');fs.mkdirSync(folder,{recursive:true});for(const[index,state]of report.states.entries())ffmpeg(['-i',path.join(out,state.image),'-vf','scale=720:450','-frames:v','1',path.join(folder,String(index).padStart(2,'0')+'.png')]);
 ffmpeg(['-framerate','1','-start_number','0','-i',path.join(folder,'%02d.png'),'-vf','tile=2x2:padding=4:margin=4','-frames:v','1',path.join(out,'contact.png')]);
}
lines.push('## Active pool','',`Selected feature: ${report.activeFeature??'not reached'}. Detailed light pose/opacity/map state and native projected anchor are in \`sanity-report.json\`.`,`No claim of exact solo-site brightness or P2 performance is made. Ring remains deferred to M2a.`,'' ,'## Machine evidence','','- [Full per-marker/state report](sanity-report.json)','- [Frozen candidate provenance](candidate-source.json)','- [Snapshot hashes](snapshot-manifest.json)','');
fs.writeFileSync(path.join(out,'review.md'),lines.join('\n'));fs.writeFileSync(path.join(out,'pack-report.json'),JSON.stringify({snapshotSHA256:report.snapshotSHA256,gpuTurnSeconds:report.gpuTurnSeconds,readySeconds:report.readySeconds,failure:report.failure||null,summary,allIntegrationGatesPass:report.states.length===4&&summary.every(r=>Object.values(r.gates).every(Boolean)),activeFeature:report.activeFeature||null,scope:'Integration sanity, not visual/performance acceptance',reviewSHA256:fileSHA256(path.join(out,'review.md'))},null,2)+'\n');
console.log(JSON.stringify({out,states:summary.length,summary},null,2));
