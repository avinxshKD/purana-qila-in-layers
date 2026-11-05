'use strict';
// Independent CPU-only final checks; one frame or scan per invocation.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {ffmpeg,run,bin}=require('../media.cjs'),{stretch,ROI}=require('./f2-quality.cjs'),{fileSHA256}=require('./f2-contract.cjs'),{probe,verifyMedia,LOCKED_SHA256}=require('./encode.cjs');
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];if(!args.includes('--out'))throw new Error('Supply --out');
const out=path.resolve(get('--out')),master=path.join(out,'picture-lossless.mkv'),video=path.join(out,'strata-f2.mp4'),folder=path.join(out,args.includes('--p-frame')?'p-frame-dark-check':'final-dark-check');fs.mkdirSync(folder,{recursive:true});
const save=(name,data)=>{fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify(data));};
if(args.includes('--frame')){
  const frame=Number(get('--frame'));if(!Number.isInteger(frame)||frame<0||frame>=1800)throw new Error('Invalid frame');
  const crops={};for(const[name,file]of[['source',master],['decoded',video]]){const crop=path.join(folder,`${name}-${frame}-6x.png`);if(!fs.existsSync(crop))stretch(file,frame,crop);crops[name]={file:path.relative(out,crop),sha256:fileSHA256(crop)};}
  save(`${path.basename(folder)}/frame-${frame}.json`,{frame,crops,videoSHA256:fileSHA256(video),masterSHA256:fileSHA256(master),roi:ROI,contrast:'clip((val-24)*6+128,0,255)'});
}else if(args.includes('--scan')){
  const which=get('--scan');if(!['source','decoded'].includes(which))throw new Error('Invalid scan');const file=which==='source'?master:video;
  const filters=`crop=${ROI.width}:${ROI.height}:${ROI.x}:${ROI.y},format=yuv444p,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-`;
  const result=run(bin('ffmpeg'),['-v','error','-i',file,'-vf',filters,'-an','-f','null','NUL']),values=[...result.stdout.matchAll(/lavfi\.signalstats\.YAVG=([0-9.]+)/g)].map(m=>Number(m[1]));
  if(values.length!==1800)throw new Error(`Darkest scan coverage ${values.length}`);const minimum=Math.min(...values),maximum=Math.max(...values),frames=values.flatMap((v,i)=>v===minimum?[i]:[]);
  save(`darkest-background-${which}.json`,{source:path.basename(file),sha256:fileSHA256(file),roi:ROI,method:'All1800 decoded frames: fixed empty-background ROI, yuv444p signalstats YAVG. A lower average is darker; source and final each scanned independently.',minimumYAVG:minimum,maximumYAVG:maximum,darkestFrame:frames[0],darkestFrameCount:frames.length,darkestFrames:frames,values});
}else if(args.includes('--probe')){
  const media=probe(video),verification=verifyMedia(media,60),score=path.resolve(out,'../../../sound/v2.1/strata-score.wav'),locked=fileSHA256(score).toUpperCase();if(locked!==LOCKED_SHA256)throw new Error('Locked WAV hash changed');
  const frames=JSON.parse(run(bin('ffprobe'),['-v','error','-select_streams','v:0','-read_intervals','0%+#50','-show_frames','-show_entries','frame=best_effort_timestamp_time,pict_type','-of','json',video]).stdout).frames;
  const prediction=frames.map((f,i)=>({frame:i,...f})).filter(f=>[0,44,45].includes(f.frame));if(prediction.find(f=>f.frame===44)?.pict_type!=='P')throw new Error('Frame44 is not P in the delivery');
  const reference=path.join(out,'audio-reference.m4a');if(!fs.existsSync(reference))ffmpeg(['-i',score,'-af','atrim=end_sample=2880000,asetpts=PTS-STARTPTS','-c:a','aac','-profile:a','aac_low','-ar','48000','-ac','2','-b:a','256k','-t','60','-movflags','+faststart',reference]);
  const pcm=file=>{const bytes=run(bin('ffmpeg'),['-v','error','-i',file,'-map','0:a:0','-f','s16le','-acodec','pcm_s16le','-ar','48000','-ac','2','pipe:1'],{encoding:null,maxBuffer:16*1024*1024}).stdout;return{bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};};
  const actual=pcm(video),expected=pcm(reference);if(actual.sha256!==expected.sha256||actual.bytes!==expected.bytes)throw new Error('Delivered AAC decode differs from independent locked-WAV AAC reference');
  save('media-probe.json',media);save('media-verification.json',{verification,mp4SHA256:fileSHA256(video),mp4Bytes:fs.statSync(video).size,predictionFrames:prediction,lockedScoreSHA256:locked,audio:{method:'The verified locked WAV is trimmed to samples0..2879999 and encoded AAC-LC48kHz stereo at256k; H.264 picture is stream-copied. AAC is lossy, so its decoded PCM cannot equal the original WAV file hash. Independent AAC encoding of the same locked WAV/settings decodes to exactly the same s16le PCM as the delivered MP4.',decodedDeliveredPCM:actual,decodedReferencePCM:expected,equal:true,reference:'audio-reference.m4a',nominalScoreSamples:2880000}});
}else throw new Error('Use --frame N, --scan source|decoded, or --probe');
