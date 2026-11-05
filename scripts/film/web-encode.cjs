'use strict';
// Web encode of the accepted F3 film from its lossless master, plus a poster and the social preview image.
// CPU only. Writes a new folder and never overwrites. Usage: node scripts/film/web-encode.cjs [--out output/film/web-r1]
const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const {root,executable}=require('../browser.cjs'),{bin,run,ffmpeg}=require('../media.cjs'),{pictureEncodeArgs,verifyMedia,probe}=require('./encode.cjs');
const {fileSHA256}=require('./f2-contract.cjs'),{finalDarkCheck}=require('./f2-quality.cjs');
const F3=path.join(root,'output/film/f3'),MASTER=path.join(F3,'run-r1/picture-lossless.mkv'),DELIVERY=path.join(F3,'strata-f3.mp4');
const DELIVERY_SHA256='44c43b6fd5169f836c14b7f64ccba75a0e9d5eb6247443310feb930ca2c7c4ff';
const POSTER_FRAME=60,JPEG_QUALITY=.85,OG={width:1200,height:630,crop:{x:0,y:0,width:1920,height:1008}};
const SETTINGS={crf:20,aqMode:3,conversion:'zscale-ed',preset:'slow',level:'4.1',maxrate:'6M',bufsize:'12M',gop:60};
function webEncodeArgs(s=SETTINGS){
  const argv=pictureEncodeArgs(['-i',MASTER],1800,{crf:s.crf,aqMode:s.aqMode,tune:s.tune,ipRatio:s.ipRatio,pbRatio:s.pbRatio,conversion:s.conversion});
  argv[argv.indexOf('-preset')+1]=s.preset;
  const at=argv.indexOf('-profile:v');argv.splice(at+2,0,'-level:v',s.level,'-maxrate',s.maxrate,'-bufsize',s.bufsize,'-g',String(s.gop));
  return argv;
}
const streamHash=(file,stream)=>run(bin('ffmpeg'),['-v','error','-i',file,'-map','0:'+stream+':0','-c','copy','-f','streamhash','-hash','sha256','-']).stdout.trim();
async function jpeg(png,out,quality){
  // Chrome's encoder (libjpeg-turbo) at quality .85 on the sRGB PNG; RGB codes are untouched until JPEG's own YCbCr.
  const puppeteer=createRequire(__filename)('puppeteer-core'),browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--force-color-profile=srgb']});
  try{const page=await browser.newPage(),data='data:image/png;base64,'+fs.readFileSync(png).toString('base64');
    const b64=await page.evaluate(async(src,q)=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d',{colorSpace:'srgb'});x.drawImage(img,0,0);return c.toDataURL('image/jpeg',q).split(',')[1];},data,quality);
    fs.writeFileSync(out,Buffer.from(b64,'base64'));}finally{await browser.close();}
}
async function main(){
  const args=process.argv.slice(2),i=args.indexOf('--out'),out=path.resolve(i<0?path.join(root,'output/film/web-r1'):args[i+1]);
  const final=path.join(out,'strata-web.mp4'),picture=path.join(out,'strata-web-picture.mp4'),reportFile=path.join(out,'web-encode-report.json');
  for(const f of [final,picture,reportFile])if(fs.existsSync(f))throw new Error('Preserve previous web encode: '+f);fs.mkdirSync(out,{recursive:true});
  const masterRecord=JSON.parse(fs.readFileSync(path.join(F3,'run-r1/lossless-master.json'),'utf8')),masterSHA256=fileSHA256(MASTER),deliverySHA256=fileSHA256(DELIVERY);
  if(masterSHA256!==masterRecord.sha256)throw new Error('Lossless master differs from lossless-master.json');
  if(deliverySHA256!==DELIVERY_SHA256)throw new Error('F3 delivery differs from the accepted file');
  const start=performance.now(),encodeArgs=[...webEncodeArgs(),picture];ffmpeg(encodeArgs);const encodeSeconds=(performance.now()-start)/1000;
  const muxArgs=['-i',picture,'-i',DELIVERY,'-map','0:v:0','-map','1:a:0','-c','copy','-movflags','+faststart',final];ffmpeg(muxArgs);
  const media=probe(final),verification=verifyMedia(media,60);
  const counted=JSON.parse(run(bin('ffprobe'),['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=nb_read_frames','-of','json',final]).stdout).streams[0].nb_read_frames;
  if(Number(counted)!==1800)throw new Error('Decoded frame count '+counted);
  if(Math.abs(Number(media.format.duration)-60)>1e-6)throw new Error('Container duration '+media.format.duration);
  const audioWeb=streamHash(final,'a'),audioF3=streamHash(DELIVERY,'a'),fields=s=>({codec:s.codec_name,profile:s.profile,sample_rate:s.sample_rate,channels:s.channels,bit_rate:s.bit_rate,nb_frames:s.nb_frames,duration:s.duration,extradata:s.extradata_hash});
  const f3Audio=probe(DELIVERY).streams.find(s=>s.codec_type==='audio'),webAudio=media.streams.find(s=>s.codec_type==='audio');
  if(audioWeb!==audioF3||JSON.stringify(fields(webAudio))!==JSON.stringify(fields(f3Audio)))throw new Error('Audio differs from F3');
  const dark=finalDarkCheck(out,MASTER,final,{frames:[0,45,60,300,1530,1620,1799],folderName:'dark-check'});
  // Poster and social image from the lossless master's RGB frame (no YUV round trip), JPEG q85.
  const framePNG=path.join(out,`master-frame-${String(POSTER_FRAME).padStart(3,'0')}.png`);if(!fs.existsSync(framePNG))ffmpeg(['-i',MASTER,'-vf',`select=eq(n\\,${POSTER_FRAME})`,'-frames:v','1',framePNG]);
  const ogPNG=path.join(out,'og-1200x630.png'),c=OG.crop;ffmpeg(['-i',framePNG,'-vf',`crop=${c.width}:${c.height}:${c.x}:${c.y},scale=${OG.width}:${OG.height}:flags=lanczos`,'-frames:v','1',ogPNG]);
  const poster=path.join(out,'strata-web-poster.jpg'),og=path.join(out,'og-image.jpg');await jpeg(framePNG,poster,JPEG_QUALITY);await jpeg(ogPNG,og,JPEG_QUALITY);
  const imageProbe=f=>JSON.parse(run(bin('ffprobe'),['-v','error','-show_entries','stream=codec_name,width,height,pix_fmt','-of','json',f]).stdout).streams[0];
  const video=media.streams.find(s=>s.codec_type==='video'),bytes=fs.statSync(final).size;
  const report={schemaVersion:1,source:{master:MASTER,masterSHA256,delivery:DELIVERY,deliverySHA256},settings:{...SETTINGS,codec:'H.264 High',width:1920,height:1080,fps:30,pixelFormat:'yuv420p',colour:'BT.709 limited via zscale error-diffusion (F3 path)',faststart:true,audio:'AAC track stream-copied from strata-f3.mp4'},
    output:{file:final,sha256:fileSHA256(final),bytes,megabytes:+(bytes/1e6).toFixed(2),videoBitRate:Number(video.bit_rate),level:video.level,encodeSeconds},
    verification:{...verification,decodedFrames:Number(counted),containerDuration:Number(media.format.duration),audioStreamHash:{web:audioWeb,f3:audioF3,identical:true},audioFields:fields(webAudio)},
    darkCheck:{folder:path.join(out,'dark-check'),rows:dark.rows,roi:dark.roi,visualReview:dark.visualReview},
    poster:{file:poster,sha256:fileSHA256(poster),bytes:fs.statSync(poster).size,frame:POSTER_FRAME,quality:JPEG_QUALITY,...imageProbe(poster)},
    og:{file:og,sha256:fileSHA256(og),bytes:fs.statSync(og).size,frame:POSTER_FRAME,crop:OG.crop,quality:JPEG_QUALITY,...imageProbe(og)},encodeArgs,muxArgs,probe:media};
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({out,mb:report.output.megabytes,videoKbps:Math.round(report.output.videoBitRate/1000),frames:counted,duration:media.format.duration,audioIdentical:true,dark:dark.rows.map(r=>[r.frame,+r.grainRetentionRatio.toFixed(3)]),poster:report.poster.bytes,og:report.og.bytes,encodeSeconds:Math.round(encodeSeconds)}));
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={SETTINGS,MASTER,DELIVERY,DELIVERY_SHA256,webEncodeArgs,streamHash,jpeg};
