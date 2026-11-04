'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {ffmpeg}=require('../media.cjs');
async function main(){
  const args=process.argv.slice(2),i=args.indexOf('--out');if(i<0)throw new Error('Supply F2 --out');const out=path.resolve(args[i+1]),input=JSON.parse(fs.readFileSync(path.join(out,'f2-input.json'))),audit=JSON.parse(fs.readFileSync(path.join(out,'seam-audit.json'))),preflight=JSON.parse(fs.readFileSync(path.join(input.preflight,'frame-metrics.json')));
  const {filmState}=await import(pathToFileURL(path.join(out,'source/src/film/timeline.js')));
  const folder=path.join(out,'seam-evidence');if(fs.existsSync(path.join(folder,'evidence.json')))throw new Error('Preserve seam evidence');fs.mkdirSync(folder,{recursive:true});const cases=[];
  for(const flag of audit.flags){
    const index=flag.boundary/45,left=JSON.parse(fs.readFileSync(path.join(out,`chunks/part-${String(index-1).padStart(2,'0')}.json`))),right=JSON.parse(fs.readFileSync(path.join(out,`chunks/part-${String(index).padStart(2,'0')}.json`))),frames=[...left.stats.slice(-2),...right.stats.slice(0,2)];
    const item={boundary:flag.boundary,ratio:flag.ratio,frames:frames.map(row=>{
      const accepted=preflight[row.frame],state=filmState(row.frame/30);return {frame:row.frame,scene:state.scene,dig:state.dig,rewind:state.rewind,section:state.section,leaders:row.overlayReport.leaders,
        acceptedPreflightPoseEqual:JSON.stringify(accepted.pose)===JSON.stringify(row.pose),acceptedPreflightLeaderLayoutEqual:JSON.stringify(accepted.overlayReport.leaders)===JSON.stringify(row.overlayReport.leaders),acceptedPreflightGeometryEqual:JSON.stringify(accepted.geometryAudit)===JSON.stringify(row.geometryAudit)};
    })};
    if(item.frames.some(f=>!f.acceptedPreflightPoseEqual||!f.acceptedPreflightLeaderLayoutEqual||!f.acceptedPreflightGeometryEqual))throw new Error('Captured boundary differs from accepted continuous preflight at'+flag.boundary);
    for(const[record,first,count]of[[left,43,2],[right,0,2]]){
      const frame=record.startFrame+first;ffmpeg(['-i',path.join(out,record.video),'-vf',`select=between(n\\,${first}\\,${first+count-1}),scale=960:540`,'-fps_mode','vfr','-frames:v',String(count),'-start_number',String(frame),path.join(folder,'frame-%04d.png')]);
    }
    ffmpeg(['-framerate','1','-start_number',String(flag.boundary-2),'-i',path.join(folder,'frame-%04d.png'),'-vf','scale=480:270,tile=2x2','-frames:v','1',path.join(folder,'boundary-'+flag.boundary+'.png')]);cases.push(item);
  }
  fs.writeFileSync(path.join(folder,'evidence.json'),JSON.stringify({snapshotSHA256:audit.snapshotSHA256,cases,method:'Four decoded lossless frames per flagged boundary. Pose, leader layout and CPU geometry must exactly match the already-accepted uninterrupted1800-frame preflight. Frozen timeline supplies actual state, not legacy nominal pictureEvents flags.'},null,2)+'\n');
  fs.writeFileSync(path.join(folder,'review.html'),`<!doctype html><meta charset="utf-8"><title>F2 lossless seam evidence</title><style>body{background:#191b1c;color:#eee4d2;font:16px sans-serif;margin:30px}img{width:960px;max-width:100%}</style><h1>Flagged lossless boundaries</h1><p>Each2×2 strip is n−2,n−1 / n,n+1. State/layout evidence in<a href="evidence.json">evidence.json</a>.</p>${cases.map(c=>`<h2>Frame${c.boundary},${c.ratio.toFixed(3)}×</h2><img src="boundary-${c.boundary}.png">`).join('')}`);
  console.log(JSON.stringify(cases.map(c=>({boundary:c.boundary,ratio:c.ratio,allAcceptedPreflightFieldsExact:c.frames.every(f=>f.acceptedPreflightPoseEqual&&f.acceptedPreflightLeaderLayoutEqual&&f.acceptedPreflightGeometryEqual),scenes:c.frames.map(f=>({frame:f.frame,cut:f.dig.cutStep,feature:f.scene.features,deposit:f.scene.deposits,section:f.section.id}))})),null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
