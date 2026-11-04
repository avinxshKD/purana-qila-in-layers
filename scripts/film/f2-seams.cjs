'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {bin,run,sha256}=require('../media.cjs'),{pixelDiff}=require('./review-pack.cjs'),{flipRows}=require('./lossless.cjs');
function compareSeam(beforePrevious,before,after,afterNext){
  const seam=pixelDiff(before,after),left=pixelDiff(beforePrevious,before),right=pixelDiff(after,afterNext),baseline=(left.meanAbsoluteRGBDifference+right.meanAbsoluteRGBDifference)/2;
  const ratio=baseline?seam.meanAbsoluteRGBDifference/baseline:seam.meanAbsoluteRGBDifference?null:0;
  return {...seam,neighbourMeanAbsoluteRGBDifference:baseline,ratio,gateRatio:1.5,reviewFlag:ratio===null||ratio>1.5};
}
function decodeFrames(file,first,count){
  const bytes=run(bin('ffmpeg'),['-v','error','-i',file,'-vf',`select=between(n\\,${first}\\,${first+count-1})`,'-frames:v',String(count),'-f','rawvideo','-pix_fmt','rgba','pipe:1'],{encoding:null,maxBuffer:(count+1)*1920*1080*4}).stdout;
  const size=1920*1080*4;if(bytes.length!==size*count)throw new Error('Decoded lossless frame count differs');
  return Array.from({length:count},(_,i)=>bytes.subarray(i*size,(i+1)*size));
}
async function auditSeams(out,records,manifest,proof){
  const file=path.join(out,'seam-audit.json'),chunkSHA256=records.map(r=>r.videoSHA256??null);
  if(fs.existsSync(file)){
    const old=JSON.parse(fs.readFileSync(file));if(old.snapshotSHA256!==manifest.snapshotSHA256||JSON.stringify(old.chunkSHA256)!==JSON.stringify(chunkSHA256)||old.pixelProof.some(p=>!p.equal||proof.samples.find(s=>s.frame===p.frame)?.sha256!==p.expectedSHA256))throw new Error('Previous seam snapshot/pixel proof failed');return old;
  }
  const {pictureEvents}=await import(pathToFileURL(path.join(manifest.sourceRoot,'src/film/timeline.js'))),events=pictureEvents(),seams=[];
  for(let i=1;i<records.length;i++){
    const left=records[i-1],right=records[i];if(left.endFrame!==right.startFrame)throw new Error('F2 chunk gap');
    const a=decodeFrames(path.join(out,left.video),left.frames-2,2),b=decodeFrames(path.join(out,right.video),0,2);
    seams.push({boundary:right.startFrame,frames:[right.startFrame-1,right.startFrame],...compareSeam(a[0],a[1],b[0],b[1]),coincidentEvents:events.filter(event=>Math.abs(event.frame-right.startFrame)<1e-7)});
  }
  const pixelProof=proof.samples.map(sample=>{
    const record=records.find(r=>r.startFrame<=sample.frame&&r.endFrame>sample.frame),stat=record.stats.find(s=>s.frame===sample.frame);
    const decoded=decodeFrames(path.join(out,record.video),sample.frame-record.startFrame,1)[0],decodedBottomUpSHA256=sha256(flipRows(decoded,1920,1080));
    return {frame:sample.frame,expectedSHA256:sample.sha256,capturedSHA256:stat.sha256,decodedBottomUpSHA256,equal:sample.sha256===stat.sha256&&stat.sha256===decodedBottomUpSHA256};
  });
  const report={snapshotSHA256:manifest.snapshotSHA256,chunkSHA256,lossless:true,gpuUsed:false,seams,pixelProof,flags:seams.filter(s=>s.reviewFlag),method:'Decoded FFV1 RGBA seam versus immediate motion neighbours, ≤1.5x or an evidence-backed explanation. Coincident timeline events are context, not automatic acceptance.'};
  fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');if(pixelProof.some(p=>!p.equal))throw new Error('F2 captured/decoded frames differ from fresh/profile proof');
  return report;
}
module.exports={compareSeam,decodeFrames,auditSeams};
