'use strict';
// CPU-only F2/final encoder. Usage:
// node scripts/film/encode.cjs --frames C:\frames\frame-%06d.png --output C:\delivery\film.mp4 --duration 60
// Alternative: --raw C:\frames.rgba [--bottom-up]. RGBA input is 1920x1080 at 30 fps.
// The entire locked WAV is verified before any mux; duration selects samples starting at sample zero.
const fs=require('node:fs');
const path=require('node:path');
const {root}=require('../browser.cjs');
const {bin,run,ffmpeg,sha256}=require('../media.cjs');
const LOCKED_SHA256='126440F1B57F14FFDB8FAAC2CA8F3AD0DF8274015AF15617DD18997E0291413B';
const SCORE=path.join(root,'output','sound','v2.1','strata-score.wav');
const probe=file=>JSON.parse(run(bin('ffprobe'),['-v','error','-show_streams','-show_format','-of','json',file]).stdout);
function verifyMedia(report,durationSeconds){
  const video=report.streams.find(stream=>stream.codec_type==='video'),audio=report.streams.find(stream=>stream.codec_type==='audio');
  if(!video||!audio)throw new Error('Both audio and video streams are required');
  for(const stream of [video,audio]){
    if(!Number.isFinite(Number(stream.duration))||Math.abs(Number(stream.duration)-durationSeconds)>1e-6)throw new Error(`${stream.codec_type} duration is ${stream.duration}, expected ${durationSeconds}`);
    if(Number(stream.start_time)!==0)throw new Error(`${stream.codec_type} starts at ${stream.start_time}, expected sample/frame zero`);
  }
  if(video.codec_name!=='h264'||video.profile!=='High'||video.width!==1920||video.height!==1080||video.pix_fmt!=='yuv420p'||video.r_frame_rate!=='30/1'||Number(video.nb_frames)!==durationSeconds*30)throw new Error('Video format/frame count mismatch');
  if(video.color_space!=='bt709'||video.color_transfer!=='bt709'||video.color_primaries!=='bt709')throw new Error('BT.709 tags missing');
  if(audio.codec_name!=='aac'||audio.profile!=='LC'||audio.sample_rate!=='48000'||audio.channels!==2)throw new Error('AAC-LC 48 kHz stereo format mismatch');
  const avStartOffsetSeconds=Number(audio.start_time)-Number(video.start_time);
  if(avStartOffsetSeconds!==0)throw new Error('Nonzero A/V start offset');
  return {durationSeconds,frames:Number(video.nb_frames),videoStartSeconds:Number(video.start_time),audioStartSeconds:Number(audio.start_time),avStartOffsetSeconds};
}
function pictureEncodeArgs(inputs,frames,{crf=16,aqMode,tune,conversion='plain',ipRatio,pbRatio}={}){
  if(!Number.isFinite(crf)||crf<0||crf>30||(aqMode!==undefined&&![1,2,3].includes(aqMode))||(tune!==undefined&&tune!=='grain')||!['plain','swscale-ed','zscale-ed'].includes(conversion)||[ipRatio,pbRatio].some(v=>v!==undefined&&(!Number.isFinite(v)||v<0.5||v>2)))throw new Error('Unsupported dark-detail encoder settings');
  const suffix=',format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv';
  const filter=conversion==='zscale-ed'?'format=gbrp16le,zscale=matrixin=gbr:matrix=709:rangein=full:range=limited:dither=error_diffusion'+suffix:
    `scale=1920:1080:flags=${conversion==='swscale-ed'?'lanczos+accurate_rnd+full_chroma_int':'lanczos'}:out_color_matrix=bt709:out_range=tv${conversion==='swscale-ed'?':sws_dither=ed':''}`+suffix;
  // RGB code transfer stays unchanged. zscale only converts matrix/range and dithers to8-bit.
  const params=[...(aqMode===undefined?[]:['aq-mode='+aqMode]),...(ipRatio===undefined?[]:['ipratio='+ipRatio.toFixed(1)]),...(pbRatio===undefined?[]:['pbratio='+pbRatio.toFixed(1)])];
  return [...inputs,'-frames:v',String(frames),'-vf',filter,
    '-c:v','libx264','-preset','medium','-crf',String(crf),...(params.length?['-x264-params',params.join(':')]:[]),...(tune?['-tune',tune]:[]),'-profile:v','high','-pix_fmt','yuv420p','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-an','-movflags','+faststart'];
}
function encodeAndMux({framePattern,rawFile,videoFile,rawBottomUp=false,outputFile,durationSeconds=60,startNumber=0,scoreFile=SCORE,crf=16,aqMode,tune,conversion='plain',ipRatio,pbRatio}){
  if([framePattern,rawFile,videoFile].filter(Boolean).length!==1)throw new Error('Supply exactly one frame pattern, RGBA file or lossless video');
  if(!Number.isFinite(durationSeconds)||durationSeconds<=0||!Number.isInteger(durationSeconds*30)||durationSeconds>60)throw new Error('Duration must be a positive whole number of frames, at most 60 seconds');
  if(!Number.isFinite(crf)||crf<0||crf>30||(aqMode!==undefined&&![1,2,3].includes(aqMode))||(tune!==undefined&&tune!=='grain'))throw new Error('Unsupported dark-detail encoder settings');
  const hash=sha256(fs.readFileSync(scoreFile)).toUpperCase();
  if(hash!==LOCKED_SHA256)throw new Error(`Locked score SHA-256 mismatch: ${hash}`);
  const folder=path.dirname(outputFile),stem=path.basename(outputFile,path.extname(outputFile)),picture=path.join(folder,`${stem}-picture.mp4`),reportFile=path.join(folder,`${stem}-report.json`);
  for(const file of [outputFile,picture,reportFile])if(fs.existsSync(file))throw new Error(`Preserve previous delivery: ${file} already exists`);
  fs.mkdirSync(folder,{recursive:true});
  const inputs=videoFile?['-i',videoFile]:framePattern?['-framerate','30','-start_number',String(startNumber),'-i',framePattern]:
    ['-f','rawvideo','-pixel_format','rgba','-video_size','1920x1080','-framerate','30','-i',rawFile];
  const encodeArgs=pictureEncodeArgs(inputs,durationSeconds*30,{crf,aqMode,tune,conversion,ipRatio,pbRatio});
  if(rawFile&&rawBottomUp){const filter=encodeArgs.indexOf('-vf')+1;encodeArgs[filter]='vflip,'+encodeArgs[filter];}encodeArgs.push(picture);
  const start=performance.now();ffmpeg(encodeArgs);
  // Check the original again immediately before muxing. No substitute or previously trimmed score is accepted.
  const muxHash=sha256(fs.readFileSync(scoreFile)).toUpperCase();if(muxHash!==LOCKED_SHA256)throw new Error('Locked score changed before mux');
  const muxArgs=['-i',picture,'-i',scoreFile,'-map','0:v:0','-map','1:a:0','-c:v','copy','-af',`atrim=end_sample=${Math.round(durationSeconds*48000)},asetpts=PTS-STARTPTS`,'-c:a','aac','-profile:a','aac_low','-ar','48000','-ac','2','-b:a','256k','-t',String(durationSeconds),'-movflags','+faststart',outputFile];
  ffmpeg(muxArgs);
  const media=probe(outputFile),verification=verifyMedia(media,durationSeconds);
  const result={schemaVersion:1,scoreSHA256:muxHash,expectedScoreSHA256:LOCKED_SHA256,scoreSamples:{first:0,count:Math.round(durationSeconds*48000)},settings:{codec:'H.264 High',width:1920,height:1080,fps:30,pixelFormat:'yuv420p',crf,aqMode:aqMode??'default',tune:tune??'default',conversion,ipRatio:ipRatio??'default',pbRatio:pbRatio??'default',faststart:true,colorSpace:'BT.709',audio:'AAC-LC, 48000 Hz, stereo'},verification,encodeAndMuxSeconds:(performance.now()-start)/1000,encodeArgs,muxArgs,probe:media};
  fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');return result;
}
if(require.main===module){
  try{
    const args=process.argv.slice(2),get=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
    const result=encodeAndMux({framePattern:get('--frames'),rawFile:get('--raw'),videoFile:get('--video'),rawBottomUp:args.includes('--bottom-up'),outputFile:get('--output'),durationSeconds:Number(get('--duration')??60),startNumber:Number(get('--start-number')??0),crf:Number(get('--crf')??16),aqMode:get('--aq-mode')===undefined?undefined:Number(get('--aq-mode')),tune:get('--tune')});
    console.log(JSON.stringify(result.verification));
  }catch(error){console.error(error);process.exitCode=1;}
}
module.exports={encodeAndMux,pictureEncodeArgs,verifyMedia,LOCKED_SHA256,probe};
