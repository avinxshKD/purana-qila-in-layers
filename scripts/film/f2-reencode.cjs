'use strict';
// CPU only. Never invokes capture or browser code; retains all rejected encode evidence.
const fs=require('node:fs'),path=require('node:path');
const {verifySnapshot,verifySource,verifyProfileProof,fileSHA256}=require('./f2-contract.cjs'),{validateChunk}=require('./f2-render.cjs'),{auditSeams}=require('./f2-seams.cjs'),{pictureEncodeArgs,encodeAndMux}=require('./encode.cjs'),{finalDarkCheck}=require('./f2-quality.cjs');
async function main(){
  const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];if(!args.includes('--out')||!args.includes('--candidate'))throw new Error('Supply --out and reviewed --candidate JSON');
  const out=path.resolve(get('--out')),candidateFile=path.resolve(get('--candidate')),candidate=JSON.parse(fs.readFileSync(candidateFile)),settings=candidate.settings,master=path.join(out,'picture-lossless.mkv'),final=path.join(out,'strata-f2.mp4');
  const argv=pictureEncodeArgs(['-i',master],90,settings);if(argv[argv.indexOf('-vf')+1]!==candidate.filter)throw new Error('Candidate and final color path differ');
  if(candidate.sha256!==fileSHA256(path.join(path.dirname(candidateFile),candidate.name+'.mp4')))throw new Error('Reviewed candidate bytes changed');
  const manifest=verifySnapshot(out),source=verifySource(out),previous=JSON.parse(fs.readFileSync(path.join(out,'delivery-report.json'))),lossless=JSON.parse(fs.readFileSync(path.join(out,'lossless-master.json')));
  if(previous.snapshotSHA256!==manifest.snapshotSHA256||previous.sourceSHA256!==source.sha256||lossless.sha256!==fileSHA256(master))throw new Error('Frozen delivery/source/master changed');
  const fresh=JSON.parse(fs.readFileSync(path.join(out,'proof-fresh.json'))),profile=JSON.parse(fs.readFileSync(path.join(out,'proof-profile.json'))),proof=verifyProfileProof(fresh,profile,manifest.snapshotSHA256);
  const records=Array.from({length:40},(_,i)=>validateChunk(out,i,manifest,proof)),seams=await auditSeams(out,records,manifest,proof),review=JSON.parse(fs.readFileSync(path.join(out,'seam-review.json')));
  if(review.snapshotSHA256!==manifest.snapshotSHA256||!review.reviewed||seams.flags.some(f=>!review.explanations?.[f.boundary]))throw new Error('Unreviewed lossless seam');
  const archive=path.join(out,'rejected-encodes','grain14-'+previous.mp4SHA256.slice(0,12));if(fs.existsSync(archive))throw new Error('Preserve prior replacement attempt');
  const files=['strata-f2.mp4','strata-f2-picture.mp4','strata-f2-report.json','delivery-report.json','final-dark-check'];if(previous.mp4SHA256!==fileSHA256(final))throw new Error('Rejected encode changed');
  for(const file of files)if(!fs.existsSync(path.join(out,file)))throw new Error('Incomplete rejected evidence');
  fs.mkdirSync(archive,{recursive:true});
  const timingFile=path.join(out,'render-timing.json'),timing=JSON.parse(fs.readFileSync(timingFile));fs.copyFileSync(timingFile,path.join(archive,'render-timing.json'));
  for(const file of files)fs.renameSync(path.join(out,file),path.join(archive,file));
  fs.writeFileSync(path.join(archive,'REJECTED.json'),JSON.stringify({reason:'Decoded frame0 has contour steps at6x. Superseded by CPU-only dither replacement; source/capture unchanged.',mp4SHA256:previous.mp4SHA256,mp4Bytes:previous.mp4Bytes,originalRelativePaths:files},null,2)+'\n');
  timing.replacementEncodeStartedUTC=new Date().toISOString();timing.initialRejectedEncodeCompletedUTC=timing.finalEncodeAndDecodedCheckCompletedUTC;fs.writeFileSync(timingFile,JSON.stringify(timing,null,2)+'\n');
  const encoded=encodeAndMux({videoFile:master,outputFile:final,...settings}),dark=finalDarkCheck(out,master,final),bytes=fs.statSync(final).size;
  timing.finalEncodeAndDecodedCheckCompletedUTC=new Date().toISOString();fs.writeFileSync(timingFile,JSON.stringify(timing,null,2)+'\n');
  const report={...previous,settings:encoded.settings,mp4SHA256:fileSHA256(final),mp4Bytes:bytes,finalDarkCheck:dark,replacement:{candidate:path.relative(out,candidateFile),candidateSHA256:candidate.sha256,rejectedArchive:path.relative(out,archive),cpuOnly:true},timing:{...previous.timing,...timing,totalWallSeconds:(Date.parse(timing.finalEncodeAndDecodedCheckCompletedUTC)-Date.parse(timing.startedUTC))/1000},visualDarkReview:'Pending inspection of replacement decoded6x crops before delivery acceptance'};
  fs.writeFileSync(path.join(out,'delivery-report.json'),JSON.stringify(report,null,2)+'\n');if(bytes>100000000)throw new Error(`Replacement exceeds100MB cap: ${bytes}`);
  console.log(JSON.stringify({bytes,sha256:report.mp4SHA256,encodingSeconds:encoded.encodeAndMuxSeconds,dark},null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
