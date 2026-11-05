'use strict';
// CPU only. F3 delivery pack: probe, frame count, PCM proof, seams, contact sheet, crops, SHA-256, review page.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {root}=require('../browser.cjs'),{ffmpeg,run,bin}=require('../media.cjs'),{fileSHA256,verifySnapshot,assertFrame}=require('./f2-contract.cjs');
const {probe,verifyMedia,LOCKED_SHA256}=require('./encode.cjs'),{contactFilter}=require('./f2-delivery-pack.cjs'),{ROI}=require('./f2-quality.cjs'),{CHUNKS,checkContinuity}=require('./f3-contract.cjs');
const args=process.argv.slice(2),get=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1];};
const out=path.resolve(get('--out')||path.join(root,'output/film/f3/run-r1')),read=p=>JSON.parse(fs.readFileSync(path.join(out,p))),save=(p,o)=>fs.writeFileSync(path.join(out,p),JSON.stringify(o,null,2)+'\n');
const video=path.join(out,'strata-f3.mp4'),master=path.join(out,'picture-lossless.mkv'),score=path.join(root,'output/sound/v2.1/strata-score.wav');
const REVIEW_FRAMES=[0,60,120,300,751,1080,1530,1620,1700,1791,1799];
function pcm(file){const bytes=run(bin('ffmpeg'),['-v','error','-i',file,'-map','0:a:0','-f','s16le','-acodec','pcm_s16le','-ar','48000','-ac','2','pipe:1'],{encoding:null,maxBuffer:16*1024*1024}).stdout;return {bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}
function darkScan(file){
  const result=run(bin('ffmpeg'),['-v','error','-i',file,'-vf',`crop=${ROI.width}:${ROI.height}:${ROI.x}:${ROI.y},format=yuv444p,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`,'-an','-f','null','NUL'],{maxBuffer:16*1024*1024});
  const values=[...result.stdout.matchAll(/lavfi\.signalstats\.YAVG=([0-9.]+)/g)].map(m=>Number(m[1]));if(values.length!==1800)throw new Error(`Dark scan coverage ${values.length}`);
  const minimum=Math.min(...values);return {sha256:fileSHA256(file),roi:ROI,minimumYAVG:minimum,maximumYAVG:Math.max(...values),darkestFrame:values.indexOf(minimum)};
}
function main(){
  if(fs.existsSync(path.join(out,'pack-report.json')))throw new Error('Preserve delivered F3 pack');
  const manifest=verifySnapshot(out),delivery=read('delivery-report.json'),mp4SHA256=fileSHA256(video);
  if(delivery.snapshotSHA256!==manifest.snapshotSHA256||delivery.mp4SHA256!==mp4SHA256||read('lossless-master.json').sha256!==fileSHA256(master))throw new Error('F3 delivery provenance differs');
  if(fileSHA256(score).toUpperCase()!==LOCKED_SHA256)throw new Error('Locked WAV hash changed');
  const chunks=Array.from({length:CHUNKS},(_,i)=>read(`chunks/part-${String(i).padStart(2,'0')}.json`)),rows=chunks.flatMap(c=>c.stats);checkContinuity(chunks);
  if(rows.length!==1800)throw new Error('Missing F3 frame audits');rows.forEach((r,i)=>{if(r.frame!==i)throw new Error('F3 audit coverage differs');assertFrame(r);});
  const media=probe(video),verification=verifyMedia(media,60);save('media-probe.json',media);
  const counted=JSON.parse(run(bin('ffprobe'),['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=nb_read_frames','-of','json',video]).stdout).streams[0];
  if(Number(counted.nb_read_frames)!==1800)throw new Error('Decoded MP4 frame count differs');
  const types=JSON.parse(run(bin('ffprobe'),['-v','error','-select_streams','v:0','-read_intervals','0%+#60','-show_frames','-show_entries','frame=pict_type','-of','json',video]).stdout).frames.map(f=>f.pict_type);
  const reference=path.join(out,'audio-reference.m4a');if(!fs.existsSync(reference))ffmpeg(['-i',score,'-af','atrim=end_sample=2880000,asetpts=PTS-STARTPTS','-c:a','aac','-profile:a','aac_low','-ar','48000','-ac','2','-b:a','256k','-t','60','-movflags','+faststart',reference]);
  const actual=pcm(video),expected=pcm(reference);if(actual.sha256!==expected.sha256||actual.bytes!==expected.bytes)throw new Error('Delivered AAC decode differs from independent locked-WAV AAC reference');
  const mediaVerification={verification,mp4SHA256,mp4Bytes:fs.statSync(video).size,decodedFrames:1800,firstPictTypes:types.join(''),lockedScoreSHA256:LOCKED_SHA256,
    audio:{method:'Locked WAV verified, trimmed to samples 0..2879999, AAC-LC 48 kHz stereo 256k; picture stream-copied. An independent AAC encode of the same WAV/settings decodes to identical s16le PCM.',decodedDeliveredPCM:actual,decodedReferencePCM:expected,equal:true,nominalScoreSamples:2880000}};
  save('media-verification.json',mediaVerification);
  const darkest={source:darkScan(master),decoded:darkScan(video)};save('darkest-background.json',darkest);
  const sheet=path.join(out,'contact-every15.png');if(!fs.existsSync(sheet))ffmpeg(['-i',master,'-vf',contactFilter(),'-frames:v','1',sheet]);
  const framesDir=path.join(out,'review-frames');fs.mkdirSync(framesDir,{recursive:true});
  for(const frame of REVIEW_FRAMES)for(const[name,file]of[['source',master],['decoded',video]]){const png=path.join(framesDir,`${name}-${String(frame).padStart(4,'0')}.png`);if(!fs.existsSync(png))ffmpeg(['-i',file,'-vf',`select=eq(n\\,${frame})`,'-frames:v','1','-update','1',png]);}
  const seams=read('seam-audit.json'),anchors=rows.flatMap(r=>r.anchorVisibility||[]),proofs=['proof-fresh','proof-profile'].map(m=>read(m+'.json')),turns=[...proofs,...chunks];
  const report={film:'F3',snapshotSHA256:manifest.snapshotSHA256,sourceSHA256:delivery.sourceSHA256,endCardContractSHA256:delivery.endCardContractSHA256,sceneContractSHA256:delivery.sceneContractSHA256,calloutTrackSHA256:delivery.calloutTrackSHA256,
    deliverable:'strata-f3.mp4',mp4SHA256,mp4Bytes:mediaVerification.mp4Bytes,verification,encoding:delivery.settings,mediaVerification,darkestBackground:darkest,
    contacts:{file:'contact-every15.png',source:'Decoded lossless FFV1',sampleEveryFrames:15,count:120},reviewFrames:REVIEW_FRAMES,
    audits:{frames:rows.length,anchorSamples:anchors.length,occluded:anchors.filter(a=>a.occluded).length,missing:anchors.filter(a=>a.missing).length,layoutFailureFrames:rows.filter(r=>r.overlayReport?.failures?.length).length,minimumMargin:Math.min(...rows.map(r=>r.framing.minimumMargin))},
    losslessSeams:{count:seams.seams.length,gateRatio:1.5,flagged:seams.flags.map(f=>({frame:f.boundary,ratio:f.ratio})),maxRatio:Math.max(...seams.seams.map(s=>s.ratio??0)),pixelProof:seams.pixelProof},
    profileProof:delivery.profileProof,master:delivery.master,gpuTurns:{count:turns.length,maximumSeconds:Math.max(...turns.map(t=>t.gpuTurnSeconds)),totalSeconds:turns.reduce((n,t)=>n+t.gpuTurnSeconds,0),maximumRenderSeconds:Math.max(...chunks.map(c=>c.renderSeconds)),maximumStartupSeconds:Math.max(...chunks.map(c=>c.startupSeconds)),limits:{startupSeconds:150,renderSeconds:160,turnSeconds:300}},
    discardedPartialChunks:fs.existsSync(path.join(out,'failed-attempts'))?fs.readdirSync(path.join(out,'failed-attempts')):[],timing:{...delivery.timing,packCompletedUTC:new Date().toISOString()}};
  if(chunks.some(c=>!(c.renderSeconds<=160&&c.startupSeconds<=150&&c.gpuTurnSeconds<=300))||proofs.some(p=>p.gpuTurnSeconds>300))throw new Error('A recorded GPU turn exceeded its cap');
  const harness={};for(const name of['f3-capture.cjs','f3-run.cjs','f3-contract.cjs','f3-prepare.cjs','f3-delivery-pack.cjs','f2-contract.cjs','f2-seams.cjs','f2-quality.cjs','lossless.cjs','encode.cjs'])harness[name]=fileSHA256(path.join(__dirname,name));save('capture-harness-hashes.json',harness);
  fs.writeFileSync(path.join(out,'review.html'),`<!doctype html><meta charset="utf-8"><title>STRATA F3</title><style>body{background:#191b1c;color:#eee4d2;font:16px sans-serif;max-width:1600px;margin:32px auto;padding:20px}a{color:#dfd2ad}img,video{max-width:100%}.pairs{display:flex;gap:12px;flex-wrap:wrap}.pairs img{width:760px}pre{white-space:pre-wrap}</style><h1>STRATA F3</h1><p>1920×1080, 30 fps, 1800 frames, 60.000 s, locked score, M2b emphasis. Snapshot ${manifest.snapshotSHA256}.</p><video controls preload="metadata" src="strata-f3.mp4"></video><p>${report.mp4Bytes.toLocaleString('en-US')} bytes, SHA-256 ${mp4SHA256}. x264 CRF${report.encoding.crf}, AQ${report.encoding.aqMode}, ${report.encoding.tune}, ${report.encoding.conversion}.</p><h2>Every 15 frames (lossless)</h2><img src="contact-every15.png"><h2>Review frames: lossless vs decoded MP4</h2>${REVIEW_FRAMES.map(f=>`<h3>Frame ${f}</h3><div class="pairs"><img src="review-frames/source-${String(f).padStart(4,'0')}.png"><img src="review-frames/decoded-${String(f).padStart(4,'0')}.png"></div>`).join('')}<h2>6× dark crops</h2>${(delivery.finalDarkCheck?.rows||[]).map(r=>`<div class="pairs"><img style="width:256px" src="final-dark-check/source-${r.frame}-6x.png"><img style="width:256px" src="final-dark-check/decoded-${r.frame}-6x.png"></div>`).join('')}<h2>Summary</h2><pre>${JSON.stringify({verification,audits:report.audits,seams:{count:report.losslessSeams.count,flagged:report.losslessSeams.flagged,maxRatio:report.losslessSeams.maxRatio},gpuTurns:report.gpuTurns,pcm:actual},null,2)}</pre>`);
  save('pack-report.json',report);
  const delivered=[...['strata-f3.mp4','picture-lossless.mkv','delivery-report.json','pack-report.json','media-probe.json','media-verification.json','seam-audit.json','profile-proof.json','contact-every15.png','review.html','capture-harness-hashes.json','darkest-background.json'].map(f=>path.join(out,f))];
  fs.writeFileSync(path.join(out,'SHA256SUMS.txt'),delivered.map(f=>`${fileSHA256(f)}  ${path.relative(out,f).replaceAll('\\','/')}`).join('\n')+'\n');
  const top=path.join(out,'..','strata-f3.mp4');if(!fs.existsSync(top)){fs.copyFileSync(video,top);}if(fileSHA256(top)!==mp4SHA256)throw new Error('Top-level F3 copy differs');
  fs.writeFileSync(path.join(out,'..','strata-f3.mp4.sha256'),`${mp4SHA256}  strata-f3.mp4\n`);
  console.log(JSON.stringify({mp4SHA256,mp4Bytes:report.mp4Bytes,decodedFrames:1800,pcmEqual:true,seams:report.losslessSeams.count,flagged:report.losslessSeams.flagged.length,maxSeamRatio:report.losslessSeams.maxRatio,gpuMax:report.gpuTurns.maximumSeconds,darkest}));
}
if(require.main===module)try{main();}catch(error){console.error(error);process.exitCode=1;}
