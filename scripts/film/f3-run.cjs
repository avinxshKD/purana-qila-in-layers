'use strict';
// F3 orchestration: proofs, lossless chunks (each its own locked GPU child), seam audit, FFV1 master, then final encode/mux only with --encode.
// GPU work requires --render. Pause with render-control.json {"paused":true}.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {root}=require('../browser.cjs'),{sha256,ffmpeg,bin,run}=require('../media.cjs');
const {fileSHA256,verifySnapshot,verifyProfileProof,assertFrame}=require('./f2-contract.cjs'),{auditSeams}=require('./f2-seams.cjs'),{finalDarkCheck}=require('./f2-quality.cjs');
const {encodeAndMux,probe,verifyMedia}=require('./encode.cjs'),{expectedPoolFields,assertPoolFields}=require('./pool-fields.cjs');
const {FREEZE,LOCKED_SCORE,CHUNKS,CHUNK_TABLE,chunkSpec,checkContinuity}=require('./f3-contract.cjs');
// Accepted F2 delivery settings (rough-r2, candidate quality-dither-r2/z-ed10-ip1).
const SETTINGS={crf:10,aqMode:3,tune:'grain',conversion:'zscale-ed',ipRatio:1,pbRatio:1};
const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
const out=path.resolve(get('--out')||path.join(root,'output/film/f3/run-r1')),read=p=>JSON.parse(fs.readFileSync(path.join(out,p))),save=(p,o)=>fs.writeFileSync(path.join(out,p),JSON.stringify(o,null,2)+'\n');
function verifyF3Source(){
  const input=read('source-inputs.json');if(input.film!=='F3'||input.freeze.sumsSHA256!==FREEZE.sumsSHA256||sha256(JSON.stringify(input.files))!==input.sha256)throw new Error('F3 source manifest differs');
  for(const[file,hash]of Object.entries(input.files))if(fileSHA256(path.join(out,'source',file))!==hash)throw new Error('Frozen F3 source changed: '+file);return input;
}
function validateChunk(index,manifest,source,proof,expected){
  const name=`chunks/part-${String(index).padStart(2,'0')}`,report=read(name+'.json'),video=path.join(out,report.video);
  if(report.film!=='F3'||report.backend!=='m1'||report.emphasis!==true||report.snapshotSHA256!==manifest.snapshotSHA256||report.sourceSHA256!==source.sha256||report.calloutTrackSHA256!==source.files['src/film/callout-track.json']||report.captureProtocol!==proof.captureProtocol)throw new Error(`F3 chunk ${index} provenance differs`);
  const spec=chunkSpec(index);
  if(report.startFrame!==spec.start||report.endFrame!==spec.start+spec.frames||report.frames!==spec.frames||report.stats.length!==spec.frames||!(report.startupSeconds<=150&&report.renderSeconds<=160&&report.gpuTurnSeconds<=300&&report.withinChunkCap===true))throw new Error(`F3 chunk ${index} range/deadline differs`);
  if(fileSHA256(video)!==report.videoSHA256)throw new Error(`F3 chunk ${index} bytes changed`);
  assertPoolFields(expected,report.poolFieldHashes);
  report.stats.forEach((s,i)=>{if(s.frame!==spec.start+i)throw new Error('F3 frame coverage differs');assertFrame(s);assertPoolFields(expected,s.poolFieldHashes);const p=proof.samples.find(x=>x.frame===s.frame);if(p&&p.sha256!==s.sha256)throw new Error(`F3 frame ${s.frame} differs from fresh/profile proof`);});
  return report;
}
async function main(){
  const manifest=verifySnapshot(out),source=verifyF3Source(),expected=expectedPoolFields(path.join(out,'source'));
  if(sha256(fs.readFileSync(path.join(root,'output/sound/v2.1/strata-score.wav'))).toUpperCase()!==LOCKED_SCORE)throw new Error('Locked score differs');
  if(!args.includes('--render')){console.log(JSON.stringify({out,snapshotSHA256:manifest.snapshotSHA256,chunks:CHUNKS,gpuLaunched:false,next:'Use --render after authorization'}));return;}
  const timing=fs.existsSync(path.join(out,'render-timing.json'))?read('render-timing.json'):{snapshotSHA256:manifest.snapshotSHA256,startedUTC:new Date().toISOString()};
  if(timing.snapshotSHA256!==manifest.snapshotSHA256)throw new Error('Render timing provenance differs');
  const checkpoint=name=>{if(!timing[name])timing[name]=new Date().toISOString();save('render-timing.json',timing);};checkpoint('firstInvocationUTC');
  const capture=path.join(__dirname,'f3-capture.cjs'),logs=path.join(out,'logs');fs.mkdirSync(logs,{recursive:true});
  function child(mode,index,attempt=1){
    // Proof turns start from a cold or reused profile and render 10 frames; they get a longer cap, still under the 5 min locked-turn rule.
    const parameters=[capture,'--out',out,'--mode',mode,...(index===undefined?['--cap','240']:['--chunk',String(index)])];
    const result=spawnSync(process.execPath,parameters,{cwd:root,encoding:'utf8',timeout:900000,maxBuffer:8*1024*1024,windowsHide:true}),log=(result.stdout||'')+'\n'+(result.stderr||'');
    fs.writeFileSync(path.join(logs,`${mode}-${index??'proof'}-${Date.now()}-${attempt}.txt`),log);console.log(log.trim());
    if(result.status!==0)throw new Error(`F3 ${mode} ${index??''} failed: ${result.error?.message||'see capture log'}`);
  }
  for(const mode of['proof-fresh','proof-profile'])if(!fs.existsSync(path.join(out,mode+'.json')))child(mode);
  const fresh=read('proof-fresh.json'),profile=read('proof-profile.json');
  for(const report of[fresh,profile])for(const raw of[...report.samples.flatMap(s=>[s.first,s.repeat]),...(report.consecutive300||[])])if(!raw.raw||fileSHA256(path.join(out,raw.raw))!==raw.sha256)throw new Error('Proof raw bytes changed');
  const proof=verifyProfileProof(fresh,profile,manifest.snapshotSHA256),proofFile=path.join(out,'profile-proof.json');
  if(fs.existsSync(proofFile)){if(JSON.stringify(read('profile-proof.json'))!==JSON.stringify(proof))throw new Error('Cached profile proof changed');}else save('profile-proof.json',proof);
  checkpoint('profileProofCompletedUTC');if(args.includes('--proof-only'))return;
  const records=[];
  for(let index=0;index<CHUNKS;index++){
    const pause=path.join(out,'render-control.json');if(fs.existsSync(pause)&&JSON.parse(fs.readFileSync(pause)).paused){console.log(`F3 paused before chunk ${index}; completed chunks preserved`);return;}
    const stem=`chunks/part-${String(index).padStart(2,'0')}`;
    if(!fs.existsSync(path.join(out,stem+'.json'))){
      // Failed partials are moved aside, never overwritten. A failed chunk stops the run.
      const video=path.join(out,stem+'.mkv');
      if(fs.existsSync(video)){const failed=path.join(out,'failed-attempts');fs.mkdirSync(failed,{recursive:true});fs.renameSync(video,path.join(failed,`${index}-${Date.now()}.mkv`));}
      child('chunk',index);
    }
    records.push(validateChunk(index,manifest,source,proof,expected));
  }
  checkContinuity(records);checkpoint('losslessCaptureCompletedUTC');console.log('F3 LOSSLESS CAPTURE COMPLETE; GPU free');
  const seams=await auditSeams(out,records,manifest,proof),master=path.join(out,'picture-lossless.mkv');
  if(!fs.existsSync(path.join(out,'lossless-master.json'))){
    // Matroska stores ms timestamps, so a 20-frame chunk probes as 0.666 s; exact per-file durations stop the concat drifting.
    const concat=path.join(out,'lossless-concat.txt'),list=records.map(r=>`file '${r.video}'\nduration ${(r.frames/30).toFixed(9)}`).join('\n')+'\n';
    if(fs.existsSync(master)){
      // An unverified master is only reused when it was built from this exact list; the checks below decide.
      if(!fs.existsSync(concat)||fs.readFileSync(concat,'utf8')!==list)throw new Error('Preserve incomplete lossless master');
    }else{fs.writeFileSync(concat,list);ffmpeg(['-f','concat','-safe','0','-i',concat,'-c','copy',master]);}
    const media=JSON.parse(run(bin('ffprobe'),['-v','error','-count_frames','-show_entries','stream=codec_name,width,height,nb_read_frames,r_frame_rate:format=duration,size','-of','json',master]).stdout),stream=media.streams[0];
    const pts=run(bin('ffprobe'),['-v','error','-select_streams','v:0','-show_entries','packet=pts_time','-of','csv=p=0',master],{maxBuffer:16*1024*1024}).stdout.trim().split(/\r?\n/).map(Number);
    const worstPtsErrorSeconds=Math.max(...pts.map((t,n)=>Math.abs(t-n/30)));
    // Millisecond container: the last packet's rounded duration leaves format duration within 2 ms of 60 s.
    if(stream.codec_name!=='ffv1'||Number(stream.nb_read_frames)!==1800||pts.length!==1800||!(worstPtsErrorSeconds<=0.001)||Math.abs(Number(media.format.duration)-60)>0.002)throw new Error('Lossless master count/timestamps differ');
    save('lossless-master.json',{snapshotSHA256:manifest.snapshotSHA256,sha256:fileSHA256(master),bytes:fs.statSync(master).size,chunkBytes:records.reduce((n,r)=>n+r.bytes,0),worstPtsErrorSeconds,probe:media});
  }else if(read('lossless-master.json').sha256!==fileSHA256(master))throw new Error('Lossless master changed');
  checkpoint('losslessMasterCompletedUTC');
  if(seams.flags.length){
    const review=fs.existsSync(path.join(out,'seam-review.json'))?read('seam-review.json'):null;
    if(!review||review.snapshotSHA256!==manifest.snapshotSHA256||review.reviewed!==true||seams.flags.some(f=>!review.explanations?.[f.boundary])){console.log(JSON.stringify({stopped:'Flagged lossless seams need seam-review.json before encode',flags:seams.flags.map(f=>({boundary:f.boundary,ratio:f.ratio}))}));return;}
  }
  if(!args.includes('--encode')){console.log(JSON.stringify({master,seams:seams.seams.length,flags:seams.flags.length,next:'Rerun with --render --encode'}));return;}
  const final=path.join(out,'strata-f3.mp4');let encoding;
  if(fs.existsSync(final)){encoding=read('strata-f3-report.json');for(const[k,v]of Object.entries(SETTINGS))if(encoding.settings[k]!==v)throw new Error('Existing F3 encode settings differ');verifyMedia(probe(final),60);}
  else encoding=encodeAndMux({videoFile:master,outputFile:final,...SETTINGS});
  const dark=finalDarkCheck(out,master,final,{frames:[0,45,300,1530,1620,1799]});checkpoint('finalEncodeCompletedUTC');
  const bytes=fs.statSync(final).size;
  const report={schemaVersion:1,film:'F3',deliverable:'strata-f3.mp4',frames:1800,durationSeconds:60,width:1920,height:1080,fps:30,lockedScoreSHA256:LOCKED_SCORE,snapshotSHA256:manifest.snapshotSHA256,sourceSHA256:source.sha256,
    endCardContractSHA256:source.endCardContractSHA256,sceneContractSHA256:source.sceneContractSHA256,calloutTrackSHA256:source.files['src/film/callout-track.json'],chunkTable:CHUNK_TABLE,chunks:CHUNKS,
    settings:encoding.settings,mp4SHA256:fileSHA256(final),mp4Bytes:bytes,master:read('lossless-master.json'),maximumGpuTurnSeconds:Math.max(...records.map(r=>r.gpuTurnSeconds)),maximumRenderSeconds:Math.max(...records.map(r=>r.renderSeconds)),maximumStartupSeconds:Math.max(...records.map(r=>r.startupSeconds)),limits:{startupSeconds:150,renderSeconds:160,turnSeconds:300},
    gpuTurnSecondsTotal:records.reduce((n,r)=>n+r.gpuTurnSeconds,0),losslessSeams:seams.seams.length,flaggedSeams:seams.flags.length,profileProof:proof,finalDarkCheck:dark,timing,
    visualReview:'Pending: contact sheet, 6x dark crops, end-card and cold-open crops'};
  save('delivery-report.json',report);if(bytes>110000000)throw new Error(`F3 exceeds 110 MB cap: ${bytes}`);
  console.log(JSON.stringify({deliverable:final,mp4Bytes:bytes,mp4SHA256:report.mp4SHA256,maxGpuTurn:report.maximumGpuTurnSeconds,flaggedSeams:report.flaggedSeams}));
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={validateChunk,SETTINGS};
