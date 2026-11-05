'use strict';
// Dedicated F3 engine (emphasis on, pinned callout track, pinned end-card contract). F2 engine is untouched.
// Modes: chunk --chunk N | proof-fresh | proof-profile | stills --seconds a,b,c
const fs=require('node:fs'),path=require('node:path'),{once}=require('node:events');
const {root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs');
const {sha256,bin,run,rawPng}=require('../media.cjs'),{losslessEncoder}=require('./lossless.cjs'),{fileSHA256,verifySnapshot,assertFrame}=require('./f2-contract.cjs');
const {expectedPoolFields,assertPoolFields}=require('./pool-fields.cjs'),{FREEZE,checkEndCard,checkColdOpen,CHUNKS,chunkSpec}=require('./f3-contract.cjs');
const {installProgramRecorder,readProgramHashes}=require('./program-hashes.cjs');
const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
const out=path.resolve(get('--out')||path.join(root,'output/film/f3/run-r1')),mode=get('--mode')||'chunk',chunk=Number(get('--chunk'));
// Chunk turns: browser startup has its own limit; the render cap runs from the first frame to the encoded last frame.
const STARTUP_CAP=150,RENDER_CAP=160,TURN_CAP=300;
const capSeconds=Number(get('--cap')||110),profile='f3-'+sha256(out).slice(0,16),proof=mode.startsWith('proof-'),stillsMode=mode==='stills';
const captureProtocol='f3-cpu2d-primed-v1',warmupFrames=[300,1530,0],query='/film.html?capture&backend=m1&callouts=track';
if(!['chunk','proof-fresh','proof-profile','stills'].includes(mode)||(mode==='chunk'&&(!Number.isInteger(chunk)||chunk<0||chunk>=CHUNKS)))throw new Error('Invalid F3 capture mode/chunk');
const spec=mode==='chunk'?chunkSpec(chunk):null,chunkFrames=spec?.frames;
const stillSeconds=stillsMode?(get('--seconds')||'').split(',').filter(Boolean).map(Number):[];
if(stillsMode&&(!stillSeconds.length||stillSeconds.some(s=>!(s>=0&&s<60))))throw new Error('--seconds required for stills');
function verifyF3Source(){
  const input=JSON.parse(fs.readFileSync(path.join(out,'source-inputs.json'),'utf8'));
  if(input.film!=='F3'||input.freeze.sumsSHA256!==FREEZE.sumsSHA256||sha256(JSON.stringify(input.files))!==input.sha256)throw new Error('F3 source manifest differs');
  for(const[file,hash]of Object.entries(input.files))if(fileSHA256(path.join(out,'source',file))!==hash)throw new Error('Frozen F3 source changed: '+file);
  return input;
}
function checkF3(row){
  assertFrame(row);const failures=[...checkColdOpen(row.overlayReport,{expectTagline:row.frame<128&&!!row.overlayReport.coldOpen})];
  if(row.frame<120&&!row.overlayReport.coldOpen)failures.push('Tagline missing in the cold open');
  if(row.overlayReport.endCard)failures.push(...checkEndCard(row.overlayReport.endCard));
  if(!row.calloutTrack?.sha256)failures.push('Pinned callout track not in use');
  if(failures.length)throw new Error(`F3 frame ${row.frame}: ${failures.join('; ')}`);
}
async function main(){
  const manifest=verifySnapshot(out),source=verifyF3Source(),poolFieldHashes=expectedPoolFields(path.join(out,'source'));
  if(!Object.keys(poolFieldHashes).length)throw new Error('F3 requires pinned pool fields');
  const trackSHA256=source.files['src/film/callout-track.json'];
  const timingOnly=args.includes('--timing-only'),chunkDir=timingOnly?'timing':'chunks';
  const name=proof?mode:stillsMode?'stills-'+sha256(stillSeconds.join(',')).slice(0,8):`${chunkDir}/part-${String(chunk).padStart(2,'0')}`;
  const reportFile=path.join(out,name+'.json');if(fs.existsSync(reportFile))throw new Error('Preserve completed F3 capture');
  if(mode==='chunk'||stillsMode){
    const p=path.join(out,'profile-proof.json');if(mode==='chunk'&&!timingOnly){const proofReport=JSON.parse(fs.readFileSync(p));if(proofReport.snapshotSHA256!==manifest.snapshotSHA256||proofReport.equal!==true)throw new Error('F3 profile reuse requires fresh/profile pixel proof');}
  }
  const folder=path.join(out,proof?`proof/${mode}-${process.pid}`:stillsMode?name:chunkDir);fs.mkdirSync(folder,{recursive:true});
  const video=mode==='chunk'?path.join(folder,`part-${String(chunk).padStart(2,'0')}.mkv`):null;
  if(video&&fs.existsSync(video))throw new Error('Preserve incomplete FFV1 capture');
  let browser,server,encoder,deadline,turnDeadline,expired=false,expiredPhase=null,device,readySeconds=null,startupSeconds=null,renderStart=null,renderSeconds=null;const stats=[],errors=[],rawHashes=[];
  const started=performance.now(),elapsed=()=>(performance.now()-started)/1000;
  try{
    const expire=phase=>()=>{expired=true;expiredPhase=phase;browser?.close().catch(()=>{});};
    deadline=setTimeout(expire(mode==='chunk'?'startup':'turn'),(mode==='chunk'?STARTUP_CAP:capSeconds)*1000);
    if(mode==='chunk')turnDeadline=setTimeout(expire('turn'),TURN_CAP*1000);
    server=await servePinned({folder:path.join(out,'snapshot'),port:5188,middleware(req,res,next){
      const match=/^\/__f3\/(frame|raw)\/([a-z0-9.-]+)$/.exec(req.url);if(!match)return next();if(req.method!=='POST'){res.writeHead(405).end();return;}
      const chunks=[];let length=0;req.on('data',bytes=>{length+=bytes.length;if(length>1920*1080*4)req.destroy();else chunks.push(bytes);});
      req.on('end',async()=>{try{
        const bytes=Buffer.concat(chunks);if(bytes.length!==1920*1080*4)throw new Error('F3 native RGBA byte count differs');
        if(match[1]==='frame'){if(!encoder)throw new Error('FFV1 encoder unavailable');if(!encoder.process.stdin.write(bytes))await once(encoder.process.stdin,'drain');}
        else fs.writeFileSync(path.join(folder,match[2]+'.rgba'),bytes,{flag:'wx'});
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify({sha256:sha256(bytes),bytes:bytes.length}));
      }catch(error){if(!res.headersSent)res.writeHead(500);res.end(error.message);}});
    }});
    browser=await launch(mode==='proof-fresh'?{}:{profile});if(expired)throw new Error('F3 launch exceeded deadline');const page=(await browser.pages())[0]||await browser.newPage();
    await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});page.setDefaultTimeout((mode==='chunk'?TURN_CAP:capSeconds)*1000);page.on('pageerror',e=>errors.push(e.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await installProgramRecorder(page);
    await page.goto(server.url+query);await page.waitForFunction(()=>window.strataFilm?.ready);await page.evaluate(()=>document.fonts.ready);readySeconds=elapsed();
    const initial=await page.evaluate(()=>window.strataFilm.sample(0));checkF3({...initial,frame:0});
    if(initial.calloutTrack.sha256!==trackSHA256)throw new Error('Browser callout track differs from the frozen source');
    assertPoolFields(poolFieldHashes,initial.emphasis?.poolFieldHashes);
    device=await page.evaluate(()=>window.strataFilm.device());if(!(device.samples>0))throw new Error('F3 needs native multisampling');
    for(const frame of warmupFrames)await page.evaluate(frame=>{window.strataFilm.render(frame/30);window.strataFilm.readPixels();},frame);
    if(video){encoder=losslessEncoder(video);encoder.finished.catch(error=>console.error(error.message));}
    if(mode==='chunk'){startupSeconds=elapsed();clearTimeout(deadline);renderStart=performance.now();deadline=setTimeout(expire('render'),RENDER_CAP*1000);}
    async function capture(frame,label,kind){
      const row=await page.evaluate(async({frame,label,kind})=>{
        const t0=performance.now(),data=window.strataFilm.render(frame/30),renderMs=performance.now()-t0,bytes=window.strataFilm.readPixels();
        const response=await fetch('/__f3/'+kind+'/'+label,{method:'POST',body:bytes});if(!response.ok)throw new Error(await response.text());
        return {frame,renderMs,...await response.json(),backend:data.backend,provisionalGeometry:data.provisionalGeometry,pose:data.pose,framing:data.framing,overlayReport:data.overlayReport,
          anchorVisibility:data.anchorVisibility,geometryAudit:data.geometryAudit,activeTopWorldY:data.activeTopWorldY,activeTopFrameY:data.activeTopFrameY,info:data.info,poolFieldHashes:data.emphasis?.poolFieldHashes,calloutTrack:data.calloutTrack};
      },{frame,label,kind});
      checkF3(row);assertPoolFields(poolFieldHashes,row.poolFieldHashes);if(row.calloutTrack.sha256!==trackSHA256)throw new Error('Callout track differs');if(errors.length)throw new Error(errors.join('\n'));return row;
    }
    if(proof){
      for(const[frame,label]of[[300,'first-300'],[300,'consecutive2-300'],[300,'consecutive3-300'],[1530,'first-1530'],[0,'reset-0'],[300,'repeat-300'],[1530,'repeat-1530']]){
        const row=await capture(frame,label,'raw');rawHashes.push({frame,label,sha256:row.sha256,raw:path.relative(out,path.join(folder,label+'.rgba')).replaceAll('\\','/')});
      }
    }else if(stillsMode){
      for(const seconds of stillSeconds){const frame=Math.round(seconds*30),label='f'+String(frame).padStart(4,'0');const row=await capture(frame,label,'raw');rawHashes.push({frame,seconds,label,sha256:row.sha256});stats.push(row);}
    }else{
      const first=spec.start;for(let frame=first;frame<first+chunkFrames;frame++){
        stats.push(await capture(frame,String(frame),'frame'));if(frame===first||frame%15===0)console.log(`F3 lossless frame ${frame}/1800 at ${elapsed().toFixed(1)}s`);
      }
      encoder.process.stdin.end();await encoder.finished;encoder=null;renderSeconds=(performance.now()-renderStart)/1000;
    }
    var programs=await readProgramHashes(page);
  }finally{
    if(encoder){encoder.process.stdin.destroy();encoder.process.kill();}
    try{await browser?.close();}finally{try{await server?.close();}finally{clearTimeout(deadline);clearTimeout(turnDeadline);}}
  }
  const report={schemaVersion:1,film:'F3',timingContract:'film-timing.md v1.3',backend:'m1',emphasis:true,snapshotSHA256:manifest.snapshotSHA256,sourceSHA256:source.sha256,
    endCardContractSHA256:source.endCardContractSHA256,sceneContractSHA256:source.sceneContractSHA256,calloutTrackSHA256:trackSHA256,poolFieldHashes,captureProtocol,warmupFrames,query,
    profileUsed:mode!=='proof-fresh',profileSlug:mode!=='proof-fresh'?profile:null,device,programs,readySeconds,gpuTurnSeconds:elapsed(),capSeconds};
  if(mode==='chunk')Object.assign(report,{startupSeconds,renderSeconds,startupCapSeconds:STARTUP_CAP,renderCapSeconds:RENDER_CAP,turnCapSeconds:TURN_CAP,
    withinChunkCap:startupSeconds<=STARTUP_CAP&&renderSeconds<=RENDER_CAP&&report.gpuTurnSeconds<=TURN_CAP});else report.withinChunkCap=report.gpuTurnSeconds<=capSeconds;
  if(expired)throw new Error(`F3 ${expiredPhase} limit exceeded`);
  if(mode==='chunk'&&!report.withinChunkCap)throw new Error('F3 chunk exceeded a startup/render/turn limit');
  if(proof){
    report.samples=[300,1530].map(frame=>{const first=rawHashes.find(r=>r.label==='first-'+frame),repeat=rawHashes.find(r=>r.label==='repeat-'+frame);return {frame,first,repeat,equal:first.sha256===repeat.sha256};});
    report.consecutive300=rawHashes.filter(r=>r.label.endsWith('-300')&&!r.label.startsWith('repeat'));
    report.equal=report.samples.every(s=>s.equal)&&report.consecutive300.every(r=>r.sha256===report.consecutive300[0].sha256);
  }else if(stillsMode){
    for(const r of rawHashes){const png=path.join(folder,r.label+'.png');rawPng(path.join(folder,r.label+'.rgba'),png);r.png=path.relative(out,png).replaceAll('\\','/');}
    report.stills=rawHashes;report.frameReports=stats.map(s=>({frame:s.frame,overlayReport:s.overlayReport,framing:s.framing,anchorVisibility:s.anchorVisibility}));
  }else{
    const media=JSON.parse(run(bin('ffprobe'),['-v','error','-count_frames','-show_entries','stream=codec_name,pix_fmt,width,height,nb_read_frames:format=duration,size','-of','json',video]).stdout),stream=media.streams[0];
    if(stream.codec_name!=='ffv1'||stream.width!==1920||stream.height!==1080||Number(stream.nb_read_frames)!==chunkFrames)throw new Error('F3 FFV1 chunk format/count differs');
    Object.assign(report,{startFrame:spec.start,endFrame:spec.start+chunkFrames,frames:chunkFrames,video:path.relative(out,video).replaceAll('\\','/'),videoSHA256:fileSHA256(video),bytes:fs.statSync(video).size,
      renderMs:{mean:stats.reduce((a,s)=>a+s.renderMs,0)/stats.length,max:Math.max(...stats.map(s=>s.renderMs))},stats,probe:media});
  }
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
  if(proof&&!report.equal)throw new Error('F3 repeated raw scrubs are not pixel-exact');
  console.log(JSON.stringify({report:reportFile,mode,chunk:mode==='chunk'?chunk:null,readySeconds,startupSeconds,renderSeconds,gpuTurnSeconds:report.gpuTurnSeconds,withinChunkCap:report.withinChunkCap,frames:stats.length,programs:programs?.unique.length}));
}
withGpu('film:f3-'+mode+(mode==='chunk'?'-'+chunk:''),main).catch(error=>{console.error(error);process.exitCode=1;});
