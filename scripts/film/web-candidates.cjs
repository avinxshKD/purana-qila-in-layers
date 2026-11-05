'use strict';
// Web encode candidates from the F3 lossless master: C1 (F3 x264 tuning at CRF 20), C2 (same at CRF 18),
// C3 (web settings at CRF 18). Each is muxed with the F3 AAC track, verified, and gets 6x dark crops at frames
// 60, 1530 and 1799 plus a source-vs-candidate sheet. CPU only; never overwrites.
// Usage: node scripts/film/web-candidates.cjs [--out output/film/web-r2]
const fs=require('node:fs'),path=require('node:path'),{root}=require('../browser.cjs'),{ffmpeg,run,bin}=require('../media.cjs');
const {verifyMedia,probe}=require('./encode.cjs'),{fileSHA256}=require('./f2-contract.cjs'),{finalDarkCheck}=require('./f2-quality.cjs');
const {SETTINGS,MASTER,DELIVERY,DELIVERY_SHA256,webEncodeArgs,streamHash}=require('./web-encode.cjs');
const WEB_LIMITS={preset:SETTINGS.preset,conversion:SETTINGS.conversion,level:SETTINGS.level,maxrate:SETTINGS.maxrate,bufsize:SETTINGS.bufsize,gop:SETTINGS.gop};
const CANDIDATES={
  c1:{...WEB_LIMITS,crf:20,aqMode:3,tune:'grain',ipRatio:1,pbRatio:1,note:'F3 x264 tuning (tune grain, aq-mode 3, ipratio=pbratio=1.0) + web limits'},
  c2:{...WEB_LIMITS,crf:18,aqMode:3,tune:'grain',ipRatio:1,pbRatio:1,note:'C1 at CRF 18'},
  c3:{...WEB_LIMITS,crf:18,aqMode:3,note:'Current web settings at CRF 18, no tune grain'}};
const FRAMES=[60,1530,1799];
async function main(){
  const args=process.argv.slice(2),i=args.indexOf('--out'),out=path.resolve(i<0?path.join(root,'output/film/web-r2'):args[i+1]);
  if(fs.existsSync(path.join(out,'candidates-report.json')))throw new Error('Preserve completed candidate run');
  if(fileSHA256(DELIVERY)!==DELIVERY_SHA256)throw new Error('F3 delivery differs from the accepted file');
  const masterRecord=JSON.parse(fs.readFileSync(path.join(path.dirname(MASTER),'lossless-master.json'),'utf8')),masterSHA256=fileSHA256(MASTER);
  if(masterSHA256!==masterRecord.sha256)throw new Error('Lossless master differs');
  const audioF3=streamHash(DELIVERY,'a'),rows=[];
  for(const [name,settings] of Object.entries(CANDIDATES)){
    const folder=path.join(out,name),picture=path.join(folder,'picture.mp4'),final=path.join(folder,`strata-web-${name}.mp4`);
    if(fs.existsSync(final))throw new Error('Preserve candidate '+final);fs.mkdirSync(folder,{recursive:true});
    const start=performance.now(),encodeArgs=[...webEncodeArgs(settings),picture];ffmpeg(encodeArgs);const encodeSeconds=(performance.now()-start)/1000;
    const muxArgs=['-i',picture,'-i',DELIVERY,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',final];ffmpeg(muxArgs);
    const media=probe(final),verification=verifyMedia(media,60);
    const counted=Number(JSON.parse(run(bin('ffprobe'),['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=nb_read_frames','-of','json',final]).stdout).streams[0].nb_read_frames);
    if(counted!==1800||Math.abs(Number(media.format.duration)-60)>1e-6)throw new Error(name+': frames/duration '+counted+'/'+media.format.duration);
    const audio=streamHash(final,'a');if(audio!==audioF3)throw new Error(name+': audio differs from F3');
    const dark=finalDarkCheck(folder,MASTER,final,{frames:FRAMES,folderName:'dark-check'}),d=path.join(folder,'dark-check');
    const sheet=path.join(d,`comparison-${FRAMES.join('-')}-source-vs-${name}.png`);
    ffmpeg([...FRAMES.flatMap(f=>['source','decoded'].flatMap(n=>['-i',path.join(d,`${n}-${f}-6x.png`)])),'-filter_complex',FRAMES.map((_,k)=>`[${2*k}][${2*k+1}]`).join('')+`hstack=inputs=${2*FRAMES.length}`,sheet]);
    const bytes=fs.statSync(final).size,video=media.streams.find(s=>s.codec_type==='video');
    const row={name,settings,file:final,sha256:fileSHA256(final),bytes,megabytes:+(bytes/1e6).toFixed(2),videoKbps:Math.round(Number(video.bit_rate)/1000),level:video.level,encodeSeconds:Math.round(encodeSeconds),
      verification:{...verification,decodedFrames:counted,containerDuration:Number(media.format.duration),audioIdenticalToF3:true},dark:dark.rows,sheet,encodeArgs,muxArgs};
    fs.rmSync(picture);rows.push(row);fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(rows,null,2)+'\n');
    console.log(JSON.stringify({name,mb:row.megabytes,kbps:row.videoKbps,encodeSeconds:row.encodeSeconds,grain:dark.rows.map(r=>[r.frame,+r.grainRetentionRatio.toFixed(3)])}));
  }
  fs.writeFileSync(path.join(out,'candidates-report.json'),JSON.stringify({masterSHA256,deliverySHA256:DELIVERY_SHA256,frames:FRAMES,capMegabytesIncludingAudio:45,candidates:rows,
    selection:'Pending visual review: smallest candidate whose 6x crops at frames 60, 1530, 1799 show no contour line.'},null,2)+'\n');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
