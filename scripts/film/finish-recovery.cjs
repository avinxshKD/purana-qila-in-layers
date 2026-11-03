'use strict';
// CPU-only assembly of the incrementally saved final45frames.
const fs=require('node:fs'),path=require('node:path');
const {root}=require('../browser.cjs');
const {ffmpeg,probe,sha256}=require('../media.cjs');
const out=path.resolve(process.argv[2]||path.join(root,'output','film','f1-a3')),folder=path.join(out,'raw-recovery');
const manifest=JSON.parse(fs.readFileSync(path.join(out,'snapshot-manifest.json'),'utf8'));
const reportFile=path.join(out,'pinned-segments','part-19-1.json');
if(fs.existsSync(reportFile))throw new Error('Completed segment already exists; preserve delivery');
const stats=Array.from({length:45},(_,i)=>{
  const frame=1755+i,row=JSON.parse(fs.readFileSync(path.join(folder,`frame-${frame}.json`),'utf8'));
  const bytes=fs.readFileSync(path.join(folder,`frame-${frame}.rgba`));
  if(row.frame!==frame||bytes.length!==8294400||sha256(bytes)!==row.sha256||row.snapshotSHA256!==manifest.snapshotSHA256)throw new Error(`Recovery integrity failed for frame${frame}`);
  return row;
});
const raw=path.join(folder,'last-45.rgba'),handle=fs.openSync(raw,'wx');
try{for(const row of stats)fs.writeSync(handle,fs.readFileSync(path.join(folder,`frame-${row.frame}.rgba`)));}finally{fs.closeSync(handle);}
const video=path.join(out,'pinned-segments','part-19-1.mp4');
if(fs.existsSync(video)){const failed=path.join(out,'failed-attempts');fs.mkdirSync(failed,{recursive:true});fs.renameSync(video,path.join(failed,`part-19-1-before-raw-${Date.now()}.mp4`));}
ffmpeg(['-f','rawvideo','-pixel_format','rgba','-video_size','1920x1080','-framerate','30','-i',raw,'-vf','vflip,scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv','-c:v','libx264','-preset','medium','-crf','18','-profile:v','high','-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-color_range','tv','-an','-movflags','+faststart',video]);
if(Number(probe(video).streams[0].nb_frames)!==45)throw new Error('Recovery encode frame count differs');
const gpuTurnStartFrames=stats.filter((row,index)=>!index||row.recoveryTurnPID!==stats[index-1].recoveryTurnPID).map(row=>row.frame);
fs.writeFileSync(reportFile,JSON.stringify({startFrame:1755,endFrame:1800,renderSeconds:null,gpuTurnSeconds:115,gpuTurnSecondsIsConservativeUpperBound:true,gpuTurnTimingNote:'First incremental recovery turn was interrupted at the110s deadline;115s is its enclosing tool-call duration, not a measured GPU-only duration. Raw recovery did not record complete render-only wall time.',gpuTurnStartFrames,snapshotSHA256:manifest.snapshotSHA256,stats},null,2)+'\n');
console.log(JSON.stringify({frames:stats.length,gpuTurnStartFrames,video}));
