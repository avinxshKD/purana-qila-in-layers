'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {root}=require('../browser.cjs');
const {ffmpeg,probe}=require('../media.cjs');
const outIndex=process.argv.indexOf('--out'),out=outIndex<0?path.join(root,'output','film','f1'):path.resolve(process.argv[outIndex+1]),script=path.join(__dirname,'capture.cjs');
process.env.STRATA_FILM_OUT=out;
if(fs.existsSync(path.join(out,'animatic.mp4')))throw new Error('F1 delivery exists: use a new output folder.');
const start=performance.now(),attempts=[];
function paused(){
  const control=path.join(out,'render-control.json');
  if(fs.existsSync(control)&&JSON.parse(fs.readFileSync(control,'utf8')).paused){console.log('F1 paused by the orchestrator; completed segments retained.');process.exit(0);}
}
for(let chunk=0;chunk<20;chunk++){
  paused();
  const chunkReport=path.join(out,'pinned-chunks',`part-${chunk}.json`);
  if(fs.existsSync(chunkReport)){console.log(`Reusing completed chunk ${chunk}`);continue;}
  for(let segment=0;segment<2;segment++){
    paused();
    const segmentReport=path.join(out,'pinned-segments',`part-${chunk}-${segment}.json`);
    if(fs.existsSync(segmentReport)){console.log(`Reusing chunk ${chunk} segment ${segment}`);continue;}
    let complete=false;
    for(let attempt=1;attempt<=3&&!complete;attempt++){
      console.log(`Starting chunk ${chunk} segment ${segment}, attempt ${attempt}`);
      const result=spawnSync(process.execPath,[script,'--chunk',String(chunk),'--segment',String(segment)],{cwd:root,encoding:'utf8',timeout:900000,windowsHide:true,maxBuffer:8*1024*1024});
      const log=`${result.stdout||''}\n${result.stderr||''}`;console.log(log);
      fs.writeFileSync(path.join(out,`chunk-${chunk}-segment-${segment}-attempt-${attempt}.txt`),log);
      attempts.push({chunk,segment,attempt,status:result.status,error:result.error?.message});
      complete=result.status===0&&fs.existsSync(segmentReport);
    }
    if(!complete){console.error(`Chunk ${chunk} segment ${segment} failed after three attempts`);process.exit(1);}
  }
  const reports=[0,1].map(segment=>JSON.parse(fs.readFileSync(path.join(out,'pinned-segments',`part-${chunk}-${segment}.json`),'utf8')));
  if(reports[0].snapshotSHA256!==reports[1].snapshotSHA256)throw new Error('Segment snapshot hashes differ');
  const concat=path.join(out,`concat-chunk-${chunk}.txt`),video=path.join(out,'pinned-chunks',`part-${chunk}.mp4`);
  fs.writeFileSync(concat,[0,1].map(segment=>`file 'pinned-segments/part-${chunk}-${segment}.mp4'`).join('\n')+'\n');
  if(fs.existsSync(video)){
    const failed=path.join(out,'failed-attempts');fs.mkdirSync(failed,{recursive:true});fs.renameSync(video,path.join(failed,`part-${chunk}-${Date.now()}.mp4`));
  }
  ffmpeg(['-f','concat','-safe','0','-i',concat,'-c','copy',video]);
  if(Number(probe(video).streams[0].nb_frames)!==90)throw new Error('Combined chunk must contain90frames');
  const stats=reports.flatMap(report=>report.stats),gpuTurnsSeconds=reports.map(report=>report.gpuTurnSeconds);
  fs.writeFileSync(chunkReport,JSON.stringify({startFrame:chunk*90,endFrame:(chunk+1)*90,renderSeconds:reports.every(report=>Number.isFinite(report.renderSeconds))?reports.reduce((sum,report)=>sum+report.renderSeconds,0):null,gpuTurnSeconds:Math.max(...gpuTurnsSeconds),gpuTurnsSeconds,gpuTurnSecondsIsConservativeUpperBound:reports.some(report=>report.gpuTurnSecondsIsConservativeUpperBound),gpuTurnStartFrames:reports.flatMap(report=>report.gpuTurnStartFrames||[report.startFrame]),snapshotSHA256:reports[0].snapshotSHA256,stats},null,2)+'\n');
  console.log(`Combined chunk ${chunk}:90frames, largest GPU turn ${Math.max(...gpuTurnsSeconds).toFixed(2)}s`);
}
const assembled=spawnSync(process.execPath,[script,'--assemble'],{cwd:root,stdio:'inherit',windowsHide:true});
fs.writeFileSync(path.join(out,'render-wall-time.json'),JSON.stringify({wallSeconds:(performance.now()-start)/1000,chunkFrames:90,segmentFrames:45,attempts},null,2)+'\n');
process.exitCode=assembled.status??1;
