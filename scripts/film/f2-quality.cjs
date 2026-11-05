'use strict';
// CPU-only dark-detail candidate and final decoded checks. These are not GPU captures.
const fs=require('node:fs'),path=require('node:path'),{ffmpeg}=require('../media.cjs'),{decodeFrames}=require('./f2-seams.cjs');
const {pictureEncodeArgs}=require('./encode.cjs');
const {fileSHA256}=require('./f2-contract.cjs');
const PROFILES={baseline16:{crf:16},dark16:{crf:16,aqMode:3},grain14:{crf:14,aqMode:3,tune:'grain'}};
const ROI={x:1640,y:80,width:256,height:512};
function patchNoise(bytes,roi=ROI){
  let sum=0,count=0;const gray=(x,y)=>{const i=(y*1920+x)*4;return .2126*bytes[i]+.7152*bytes[i+1]+.0722*bytes[i+2];};
  for(let y=roi.y;y<roi.y+roi.height-1;y++)for(let x=roi.x;x<roi.x+roi.width-1;x++){const value=gray(x,y);sum+=(gray(x+1,y)-value)**2+(gray(x,y+1)-value)**2;count+=2;}
  return Math.sqrt(sum/count);
}
function stretch(file,frame,output){
  if(fs.existsSync(output))throw new Error('Preserve previous dark-background crop');
  const expression="clip((val-24)*6+128,0,255)",filters=`select=eq(n\\,${frame}),crop=${ROI.width}:${ROI.height}:${ROI.x}:${ROI.y},lutrgb=r='${expression}':g='${expression}':b='${expression}'`;
  ffmpeg(['-i',file,'-vf',filters,'-frames:v','1',output]);
}
function prepareQuality(out,master,records){
  const folder=path.join(out,'quality'),report=path.join(folder,'comparison.json'),masterSHA256=fileSHA256(master);
  if(fs.existsSync(report)){
    const old=JSON.parse(fs.readFileSync(report));if(old.masterSHA256!==masterSHA256||old.candidates.length!==Object.keys(PROFILES).length)throw new Error('Quality source differs');
    for(const row of old.candidates)if(JSON.stringify(row.settings)!==JSON.stringify(PROFILES[row.name])||row.sha256!==fileSHA256(path.join(folder,row.name+'.mp4')))throw new Error('Quality candidate changed');
    return old;
  }
  if(records.some(r=>r.stats.some(s=>s.framing.bbox.x+s.framing.bbox.width>=ROI.x-16)))throw new Error('Fixed background ROI intersects the block; review ROI before encoding');
  fs.mkdirSync(folder,{recursive:true});const source=decodeFrames(master,45,1)[0],sourceNoise=patchNoise(source),candidates=[];
  const sourceCrop=path.join(folder,'source-frame45-6x.png');if(!fs.existsSync(sourceCrop))stretch(master,45,sourceCrop);
  for(const[name,settings]of Object.entries(PROFILES)){
    const file=path.join(folder,name+'.mp4'),checkpoint=path.join(folder,name+'.json');
    if(fs.existsSync(checkpoint)){const old=JSON.parse(fs.readFileSync(checkpoint));if(old.masterSHA256!==masterSHA256||old.sha256!==fileSHA256(file))throw new Error('Quality checkpoint differs');candidates.push(old);continue;}
    if(fs.existsSync(file))throw new Error('Preserve incomplete quality candidate; use a new delivery/review folder');
    ffmpeg([...pictureEncodeArgs(['-i',master],90,settings),file]);
    const decoded=decodeFrames(file,45,1)[0],noise=patchNoise(decoded),row={name,settings,masterSHA256,sha256:fileSHA256(file),frames:90,bytes:fs.statSync(file).size,backgroundAdjacentDifferenceRMS:noise,sourceBackgroundAdjacentDifferenceRMS:sourceNoise,grainRetentionRatio:sourceNoise?noise/sourceNoise:null};
    stretch(file,45,path.join(folder,name+'-frame45-6x.png'));fs.writeFileSync(checkpoint,JSON.stringify(row,null,2)+'\n');candidates.push(row);
  }
  const result={masterSHA256,roi:ROI,method:'Frame45 decoded dark background, 6x RGB contrast around code24 mapped to128. Adjacent-pixel RMS describes retained high-frequency detail, not a standalone no-banding certification. Choose only after viewing crops.',candidates};
  fs.writeFileSync(report,JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(folder,'review.html'),`<!doctype html><meta charset="utf-8"><title>F2 dark detail</title><style>body{background:#191b1c;color:#eee4d2;font:16px sans-serif}main{display:flex;gap:16px}img{width:256px;image-rendering:pixelated}figure{margin:12px}</style><h1>F2 decoded dark background, 6× contrast</h1><p>Source and three 90-frame candidates. Frame45, fixed background ROI. Metrics are not a substitute for checking contour rings.</p><main>${['source',...Object.keys(PROFILES)].map(name=>`<figure><figcaption>${name}</figcaption><img src="${name}-frame45-6x.png"></figure>`).join('')}</main>`);
  return result;
}
function finalDarkCheck(out,master,video,{frames=[0,45,300,1530,1799],folderName='final-dark-check'}={}){
  const folder=path.join(out,folderName),reportFile=path.join(folder,'report.json'),videoSHA256=fileSHA256(video),masterSHA256=fileSHA256(master);
  if(fs.existsSync(reportFile)){const old=JSON.parse(fs.readFileSync(reportFile));if(old.videoSHA256!==videoSHA256||old.masterSHA256!==masterSHA256||JSON.stringify(old.rows.map(r=>r.frame))!==JSON.stringify(frames))throw new Error('Final dark-check provenance differs');return old;}fs.mkdirSync(folder,{recursive:true});
  const rows=[];for(const frame of frames){
    for(const[name,file]of[['source',master],['decoded',video]]){const crop=path.join(folder,name+'-'+frame+'-6x.png');if(!fs.existsSync(crop))stretch(file,frame,crop);}
    const a=patchNoise(decodeFrames(master,frame,1)[0]),b=patchNoise(decodeFrames(video,frame,1)[0]);rows.push({frame,sourceNoiseRMS:a,decodedNoiseRMS:b,grainRetentionRatio:a?b/a:null});
  }
  const report={videoSHA256,masterSHA256,roi:ROI,rows,visualReview:'Required: prefer retained dither noise over contour rings at6x. Numeric grain retention alone is not acceptance.'};
  fs.writeFileSync(path.join(folder,'report.json'),JSON.stringify(report,null,2)+'\n');return report;
}
module.exports={PROFILES,prepareQuality,finalDarkCheck,patchNoise,stretch,ROI};
