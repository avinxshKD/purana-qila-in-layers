'use strict';
// Preparation is CPU/file-only. --render is required for any GPU work and must
// only be used after the orchestrator accepts the fresh corrected-M1 r2b.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {root}=require('../browser.cjs'),{sha256,ffmpeg,bin,run}=require('../media.cjs');
const {LOCKED_SCORE,fileSHA256,verifySource,verifySnapshot,verifyPreflight,verifyProfileProof,assertFrame}=require('./f2-contract.cjs');
const {auditSeams}=require('./f2-seams.cjs'),{PROFILES,prepareQuality,finalDarkCheck}=require('./f2-quality.cjs'),{encodeAndMux}=require('./encode.cjs');
const {expectedPoolFields,assertPoolFields}=require('./pool-fields.cjs');
function prepareDelivery(preflight,out){
  if(fs.existsSync(path.join(out,'f2-input.json'))){
    const input=JSON.parse(fs.readFileSync(path.join(out,'f2-input.json'))),manifest=verifySnapshot(out),source=verifySource(out);
    if(input.backend!=='m1'||input.emphasis!==false||input.snapshotSHA256!==manifest.snapshotSHA256||input.sourceSHA256!==source.sha256)throw new Error('F2 delivery provenance differs');return {input,manifest};
  }
  if(!preflight)throw new Error('Supply --preflight with accepted corrected-M1 r2b');
  const summary=verifyPreflight(preflight),manifest=verifySnapshot(preflight),source=verifySource(preflight);
  if(summary.snapshotSHA256!==manifest.snapshotSHA256)throw new Error('Preflight snapshot differs');
  if(fs.existsSync(out)&&fs.readdirSync(out).length)throw new Error('Use a new F2 delivery folder');
  fs.mkdirSync(out,{recursive:true});for(const folder of['source','snapshot'])fs.cpSync(path.join(preflight,folder),path.join(out,folder),{recursive:true});
  fs.copyFileSync(path.join(preflight,'source-inputs.json'),path.join(out,'source-inputs.json'));
  const pinned={...manifest,sourceRoot:path.join(out,'source'),copiedFrom:preflight};
  fs.writeFileSync(path.join(out,'snapshot-manifest.json'),JSON.stringify(pinned,null,2)+'\n');
  const input={schemaVersion:1,film:'F2',backend:'m1',emphasis:false,timingContract:'film-timing.md v1.3',snapshotSHA256:manifest.snapshotSHA256,sourceSHA256:source.sha256,preflight,
    preflightSummarySHA256:sha256(fs.readFileSync(path.join(preflight,'summary.json'))),preflightFramesSHA256:sha256(fs.readFileSync(path.join(preflight,'frame-metrics.json'))),capture:'Native1920x1080 MSAA RGBA to lossless FFV1;40x45frames;GPU deadline110s',userDeliverable:'strata-f2.mp4'};
  fs.writeFileSync(path.join(out,'f2-input.json'),JSON.stringify(input,null,2)+'\n');return {input,manifest:pinned};
}
function validateChunk(out,index,manifest,proof){
  const report=JSON.parse(fs.readFileSync(path.join(out,`chunks/part-${String(index).padStart(2,'0')}.json`))),video=path.join(out,report.video);
  const expected=expectedPoolFields(path.join(out,'source'));assertPoolFields(expected,report.poolFieldHashes);for(const sample of report.stats)assertPoolFields(expected,sample.poolFieldHashes);
  if(report.backend!=='m1'||report.emphasis!==false||report.snapshotSHA256!==manifest.snapshotSHA256||report.captureProtocol!==proof.captureProtocol||report.startFrame!==index*45||report.endFrame!==(index+1)*45||report.frames!==45||report.stats.length!==45||!Number.isFinite(report.gpuTurnSeconds)||report.gpuTurnSeconds>110)throw new Error('F2 chunk provenance/range/deadline differs');
  if(fileSHA256(video)!==report.videoSHA256)throw new Error('F2 lossless chunk bytes changed');
  report.stats.forEach((sample,i)=>{if(sample.frame!==index*45+i)throw new Error('F2 frame coverage differs');assertFrame(sample);const expected=proof.samples.find(p=>p.frame===sample.frame);if(expected&&expected.sha256!==sample.sha256)throw new Error('F2 captured frame differs from fresh/profile proof');});
  return report;
}
async function main(){
  const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];},out=path.resolve(get('--out')||path.join(root,'output/film/f2/rough-r1')),preflight=get('--preflight')&&path.resolve(get('--preflight'));
  const {input,manifest}=prepareDelivery(preflight,out),score=path.join(root,'output/sound/v2.1/strata-score.wav');
  if(sha256(fs.readFileSync(score)).toUpperCase()!==LOCKED_SCORE)throw new Error('Locked score differs');
  if(!args.includes('--render')){console.log(JSON.stringify({prepared:out,snapshotSHA256:manifest.snapshotSHA256,gpuLaunched:false,next:'Wait for explicit r2b acceptance, then use --render'}));return;}
  const timingFile=path.join(out,'render-timing.json'),timing=fs.existsSync(timingFile)?JSON.parse(fs.readFileSync(timingFile)):{snapshotSHA256:manifest.snapshotSHA256,startedUTC:new Date().toISOString()};
  if(timing.snapshotSHA256!==manifest.snapshotSHA256)throw new Error('Render timing provenance differs');
  const checkpoint=name=>{if(!timing[name])timing[name]=new Date().toISOString();fs.writeFileSync(timingFile,JSON.stringify(timing,null,2)+'\n');};checkpoint('firstInvocationUTC');
  const final=path.join(out,'strata-f2.mp4');
  const capture=path.join(__dirname,'f2-capture.cjs'),logs=path.join(out,'logs');fs.mkdirSync(logs,{recursive:true});
  function child(mode,index,attempt=1){
    const parameters=[capture,'--out',out,'--mode',mode,...(index===undefined?[]:['--chunk',String(index)])],result=spawnSync(process.execPath,parameters,{cwd:root,encoding:'utf8',timeout:900000,maxBuffer:8*1024*1024,windowsHide:true}),log=(result.stdout||'')+'\n'+(result.stderr||'');
    fs.writeFileSync(path.join(logs,`${mode}-${index??'proof'}-${Date.now()}-${attempt}.txt`),log);console.log(log);
    if(result.status!==0)throw new Error(`F2 ${mode} ${index??''} failed: ${result.error?.message||'see capture log'}`);
  }
  for(const mode of['proof-fresh','proof-profile'])if(!fs.existsSync(path.join(out,mode+'.json')))child(mode);
  const fresh=JSON.parse(fs.readFileSync(path.join(out,'proof-fresh.json'))),profile=JSON.parse(fs.readFileSync(path.join(out,'proof-profile.json')));
  for(const report of[fresh,profile])for(const raw of[...report.samples.flatMap(sample=>[sample.first,sample.repeat]),...(report.consecutive300||[])])if(fileSHA256(path.join(out,raw.raw))!==raw.sha256)throw new Error('Proof raw bytes changed');
  const proof=verifyProfileProof(fresh,profile,manifest.snapshotSHA256),proofFile=path.join(out,'profile-proof.json');
  if(fs.existsSync(proofFile)){if(JSON.stringify(JSON.parse(fs.readFileSync(proofFile)))!==JSON.stringify(proof))throw new Error('Cached profile proof changed');}
  else fs.writeFileSync(proofFile,JSON.stringify(proof,null,2)+'\n');
  checkpoint('profileProofCompletedUTC');
  if(args.includes('--proof-only'))return;
  const records=[];
  for(let index=0;index<40;index++){
    const pause=path.join(out,'render-control.json');if(fs.existsSync(pause)&&JSON.parse(fs.readFileSync(pause)).paused){console.log('F2 paused; completed lossless chunks preserved');return;}
    const report=path.join(out,`chunks/part-${String(index).padStart(2,'0')}.json`);
    if(!fs.existsSync(report)){
      let complete=false;for(let attempt=1;attempt<=3&&!complete;attempt++){
        const video=path.join(out,`chunks/part-${String(index).padStart(2,'0')}.mkv`);
        if(fs.existsSync(video)){const failed=path.join(out,'failed-attempts');fs.mkdirSync(failed,{recursive:true});fs.renameSync(video,path.join(failed,`${index}-${Date.now()}.mkv`));}
        try{child('chunk',index,attempt);complete=true;}catch(error){if(attempt===3)throw error;console.error(error.message);}
      }
    }
    records.push(validateChunk(out,index,manifest,proof));
  }
  checkpoint('losslessCaptureCompletedUTC');
  const seams=await auditSeams(out,records,manifest,proof),master=path.join(out,'picture-lossless.mkv'),masterReport=path.join(out,'lossless-master.json');
  if(!fs.existsSync(masterReport)){
    if(fs.existsSync(master))throw new Error('Preserve incomplete lossless master');
    const concat=path.join(out,'lossless-concat.txt');fs.writeFileSync(concat,records.map(r=>`file '${r.video}'`).join('\n')+'\n');
    ffmpeg(['-f','concat','-safe','0','-i',concat,'-c','copy',master]);
    const probe=JSON.parse(run(bin('ffprobe'),['-v','error','-count_frames','-show_entries','stream=codec_name,width,height,nb_read_frames,r_frame_rate:format=duration,size','-of','json',master]).stdout),stream=probe.streams[0];
    if(stream.codec_name!=='ffv1'||Number(stream.nb_read_frames)!==1800||Math.abs(Number(probe.format.duration)-60)>1e-6)throw new Error('Lossless master count/duration differs');
    fs.writeFileSync(masterReport,JSON.stringify({snapshotSHA256:manifest.snapshotSHA256,sha256:fileSHA256(master),bytes:fs.statSync(master).size,chunkBytes:records.reduce((n,r)=>n+r.bytes,0),nativeRawEquivalentBytes:1800*1920*1080*4,probe},null,2)+'\n');
  }else if(JSON.parse(fs.readFileSync(masterReport)).sha256!==fileSHA256(master))throw new Error('Lossless master changed');
  prepareQuality(out,master,records);
  checkpoint('qualityCandidatesCompletedUTC');
  const selected=get('--encode-quality');
  if(!selected){console.log('Lossless F2 captured. Review seam-audit.json and quality/review.html before one final encode with --encode-quality grain14 (or another reviewed profile).');return;}
  if(!PROFILES[selected])throw new Error('Unknown quality profile');
  if(seams.flags.length){
    const accepted=JSON.parse(fs.readFileSync(path.join(out,'seam-review.json')));
    if(accepted.snapshotSHA256!==manifest.snapshotSHA256||accepted.reviewed!==true||seams.flags.some(flag=>!accepted.explanations?.[flag.boundary]))throw new Error('Every flagged lossless seam needs an evidence-backed explanation');
  }
  let encoding;
  if(fs.existsSync(final)){
    encoding=JSON.parse(fs.readFileSync(path.join(out,'strata-f2-report.json')));
    const settings=PROFILES[selected];if(encoding.settings.crf!==settings.crf||encoding.settings.aqMode!==(settings.aqMode??'default')||encoding.settings.tune!==(settings.tune??'default'))throw new Error('Existing final encode settings differ');
    const {probe,verifyMedia}=require('./encode.cjs');verifyMedia(probe(final),60);
  }else encoding=encodeAndMux({videoFile:master,outputFile:final,...PROFILES[selected]});
  const dark=finalDarkCheck(out,master,final);
  checkpoint('finalEncodeAndDecodedCheckCompletedUTC');
  const report={...input,deliverable:path.basename(final),frames:1800,durationSeconds:60,width:1920,height:1080,fps:30,lockedScoreSHA256:LOCKED_SCORE,settings:encoding.settings,mp4SHA256:fileSHA256(final),mp4Bytes:fs.statSync(final).size,
    intermediates:JSON.parse(fs.readFileSync(masterReport)),maximumGpuTurnSeconds:Math.max(...records.map(r=>r.gpuTurnSeconds)),losslessSeams:seams.seams.length,explainedSeams:seams.flags.length,profileProof:proof,finalDarkCheck:dark,
    timing:{...timing,totalWallSeconds:(Date.parse(timing.finalEncodeAndDecodedCheckCompletedUTC)-Date.parse(timing.startedUTC))/1000,losslessCaptureWallSeconds:(Date.parse(timing.losslessCaptureCompletedUTC)-Date.parse(timing.startedUTC))/1000,gpuTurnSecondsTotal:records.reduce((n,r)=>n+r.gpuTurnSeconds,0)+fresh.gpuTurnSeconds+profile.gpuTurnSeconds},visualDarkReview:'Pending inspection of decoded6x crops before delivery acceptance'};
  fs.writeFileSync(path.join(out,'delivery-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({deliverable:final,mp4Bytes:report.mp4Bytes,settings:report.settings,intermediateBytes:report.intermediates.chunkBytes+report.intermediates.bytes}));
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={prepareDelivery,validateChunk};
