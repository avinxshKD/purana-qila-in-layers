'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {once}=require('node:events');
const {spawnSync}=require('node:child_process');
const {root,launch,executable}=require('../browser.cjs');
const puppeteer=require('puppeteer-core');
const {installStartupTrace,readStartupTrace}=require('./startup-trace.cjs');
const {servePinned}=require('./static-server.cjs');
const {bin,run,ffmpeg,rawEncoder,rawPng,sha256}=require('../media.cjs');
const {difference}=require('../capture-session.cjs');
const {withGpu}=require('../gpu-lock.cjs');
const {cameraScale}=require('./camera-scale.cjs');
const OUT=path.resolve(process.env.STRATA_FILM_OUT||path.join(root,'output','film','f1')),LOCKED='126440F1B57F14FFDB8FAAC2CA8F3AD0DF8274015AF15617DD18997E0291413B';
const preview=process.argv.includes('--preview');
const determinismOnly=process.argv.includes('--determinism');
const rawRecovery=process.argv.includes('--raw-recovery');
const chunkArgument=process.argv.indexOf('--chunk'),chunkIndex=chunkArgument<0?null:Number(process.argv[chunkArgument+1]);
const segmentArgument=process.argv.indexOf('--segment'),segmentIndex=segmentArgument<0?null:Number(process.argv[segmentArgument+1]);
const pieceArgument=process.argv.indexOf('--piece'),pieceIndex=pieceArgument<0?null:Number(process.argv[pieceArgument+1]);
const CHUNK_FRAMES=90,assemble=process.argv.includes('--assemble');
const CHUNK_DIR='pinned-chunks';
const contacts=[0,4,8,12,16,20,24,28,32,36,40,44,48,52,56,59];
const write=(name,value)=>fs.writeFileSync(path.join(OUT,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n');
async function main(){
  const turnStart=performance.now();
  const startup={nodeMilestones:[],persistentProfile:process.argv.includes('--profile'),normalizationRequested:process.argv.includes('--normal-priority')};
  function startupMark(name){const ms=performance.now()-turnStart;startup.nodeMilestones.push({name,ms});console.log('[startup]',ms.toFixed(3),name);}
  startupMark('main-start');
  fs.mkdirSync(OUT,{recursive:true});
  if(rawRecovery)fs.mkdirSync(path.join(OUT,'raw-recovery'),{recursive:true});
  if(!preview&&!determinismOnly&&fs.existsSync(path.join(OUT,'animatic.mp4')))throw new Error('Reviewed delivery protection: animatic already exists; use a new delivery folder.');
  const manifest=JSON.parse(fs.readFileSync(path.join(OUT,'snapshot-manifest.json'),'utf8'));
  for(const [relative,hash] of Object.entries(manifest.files))if(sha256(fs.readFileSync(path.join(OUT,'snapshot',relative)))!==hash)throw new Error(`Pinned snapshot changed: ${relative}`);
  const sourceRoot=manifest.sourceRoot||root;
  const timeline=await import(pathToFileURL(path.join(sourceRoot,'src','film','timeline.js')));
  const camera=await import(pathToFileURL(path.join(sourceRoot,'src','film','camera.js')));
  startupMark('snapshot-verified-and-contract-imported');
  const eventReport={schemaVersion:1,timingContract:'film-timing.md v1.2',fps:30,frames:1800,snapshotSHA256:manifest.snapshotSHA256,
    placeholders:{coldOpen:'cold-a',endCard:'end-b',unknownURL:'[TBD]',anchors:'All callout anchors provisional, not feature-verified',featureCourses:'Four timing steps, not historical course counts',geometry:'Disposable F1 horizontal clipping/cap and schematic refill'},
    events:timeline.pictureEvents()};
  if(!determinismOnly)write('events.json',eventReport);
  const tests=spawnSync(process.execPath,['--test','test/film-timeline.test.js'],{cwd:root,encoding:'utf8'});
  write('test-output.txt',tests.stdout+tests.stderr);if(tests.status!==0)throw new Error('Timeline tests failed');
  startupMark('timeline-tests-complete');
  const video=path.join(OUT,'picture.mp4');
  if(assemble){
    const reports=Array.from({length:1800/CHUNK_FRAMES},(_,index)=>JSON.parse(fs.readFileSync(path.join(OUT,CHUNK_DIR,`part-${index}.json`))));
    if(reports.some(report=>report.snapshotSHA256!==manifest.snapshotSHA256))throw new Error('Chunks do not share the pinned snapshot hash');
    const stats=reports.flatMap(report=>report.stats),renderSeconds=reports.every(report=>Number.isFinite(report.renderSeconds))?reports.reduce((sum,report)=>sum+report.renderSeconds,0):null;
    if(stats.length!==1800||stats.some((sample,index)=>sample.frame!==index))throw new Error('Chunk frame coverage failed');
    write('concat.txt',reports.map((_,index)=>`file '${CHUNK_DIR}/part-${index}.mp4'`).join('\n')+'\n');
    ffmpeg(['-f','concat','-safe','0','-i',path.join(OUT,'concat.txt'),'-c','copy',video]);
    finalize(eventReport,stats,renderSeconds,video);return;
  }
  if(chunkIndex!==null&&(!Number.isInteger(chunkIndex)||chunkIndex<0||chunkIndex>=1800/CHUNK_FRAMES))throw new Error('Invalid chunk index');
  if(segmentIndex!==null&&(chunkIndex===null||![0,1].includes(segmentIndex)))throw new Error('Segment needs a chunk and must be0 or1');
  fs.mkdirSync(path.join(OUT,CHUNK_DIR),{recursive:true});
  if(segmentIndex!==null)fs.mkdirSync(path.join(OUT,'pinned-segments'),{recursive:true});
  if(pieceIndex!==null){
    if(segmentIndex===null||![0,1,2].includes(pieceIndex))throw new Error('Piece needs a segment and must be0,1,or2');
    fs.mkdirSync(path.join(OUT,'pinned-pieces'),{recursive:true});
  }
  let browser,server,encoder,lastRaw,firstRaw,firstRepeat,secondRaw,secondRepeat,turnDeadline,priorityTimer;
  const stats=[],errors=[],stillFrames=new Map(contacts.map((s,i)=>[s*30,i]));
  server=await servePinned({folder:path.join(OUT,'snapshot'),port:5188,middleware(req,res,next){
    const match=/^\/__film\/(frame|still)\/(\d+)$/.exec(req.url);if(!match)return next();
    if(req.method!=='POST'){res.writeHead(405).end();return;}
    const chunks=[];let length=0;
    req.on('data',chunk=>{length+=chunk.length;if(length>1920*1080*4+1024)req.destroy();else chunks.push(chunk);});
    req.on('end',async()=>{
      try{
        const bytes=Buffer.concat(chunks),frame=Number(match[2]);lastRaw=bytes;
        if(bytes.length!==1920*1080*4)throw new Error(`Bad raw length ${bytes.length}`);
        if(match[1]==='frame'&&encoder){if(!encoder.process.stdin.write(bytes))await once(encoder.process.stdin,'drain');}
        if(match[1]==='frame'&&rawRecovery)fs.writeFileSync(path.join(OUT,'raw-recovery',`frame-${frame}.rgba`),bytes);
        // Contact images are decoded from the finished picture on CPU after the
        // GPU turn. A synchronous PNG writer must not consume the lock deadline.
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify({bytes:bytes.length,sha256:sha256(bytes)}));
      }catch(error){res.writeHead(500).end(error.message);}
    });
  }});
  try{
    startupMark('server-listening/browser-launch-start');
    if(startup.persistentProfile){
      startup.profileFolder=path.join(OUT,'capture-profile');
      browser=await puppeteer.launch({executablePath:executable(),headless:true,protocolTimeout:300000,userDataDir:startup.profileFolder,args:['--force-color-profile=srgb','--hide-scrollbars','--no-first-run']});
    }else browser=await launch();
    startupMark('browser-launch-end');
    // Bound each GPU turn. Closing our own browser unblocks a hung protocol call
    // and allows withGpu's finally to release rather than leaving a live stale owner.
    turnDeadline=setTimeout(()=>{console.error('GPU turn deadline reached; closing owned browser.');browser.close().catch(()=>{});},Math.max(1,110000-(performance.now()-turnStart)));
    const page=(await browser.pages())[0]||await browser.newPage();await page.bringToFront();
    await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
    if(process.argv.includes('--startup-report'))await installStartupTrace(page);
    function priorities(){
      const args=['-NoProfile','-File',path.join(__dirname,'startup-priority.ps1'),'-BrowserPID',String(browser.process().pid)];
      if(process.argv.includes('--normal-priority'))args.push('-Normalize');
      const priority=spawnSync('powershell.exe',args,{encoding:'utf8',timeout:10000});
      console.log('[startup]',(performance.now()-turnStart).toFixed(3),'renderer priorities',priority.stdout?.trim()||priority.stderr?.trim());
    }
    priorities();
    if(process.argv.includes('--normal-priority'))priorityTimer=setTimeout(priorities,3000);
    if(process.argv.includes('--diagnose'))await page.evaluateOnNewDocument(()=>{
      console.log('[startup]',performance.now(),'document start');
      const load=document.fonts.load.bind(document.fonts);
      document.fonts.load=(...args)=>{console.log('[startup]',performance.now(),'font start',args[0]);return load(...args).then(result=>{console.log('[startup]',performance.now(),'font done',args[0]);return result;});};
      const context=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2')console.log('[startup]',performance.now(),'WebGL2 context start');const result=context.call(this,type,...args);if(type==='webgl2')console.log('[startup]',performance.now(),'WebGL2 context done');return result;};
      for(const name of ['compileShader','linkProgram']){
        const method=WebGL2RenderingContext.prototype[name];let index=0;
        WebGL2RenderingContext.prototype[name]=function(...args){const id=index++,start=performance.now();console.log('[startup]',name,id,'start');const result=method.apply(this,args);console.log('[startup]',name,id,'done',performance.now()-start);return result;};
      }
    });
    page.setDefaultTimeout(300000);
    page.on('pageerror',error=>{errors.push(error.message);console.error('[film page]',error.message);});
    page.on('console',message=>{if(message.type()==='error'){errors.push(message.text());console.error('[film console]',message.text());}});
    page.on('console',message=>{if(message.text().startsWith('[startup]'))console.log(message.text());});
    startupMark('navigation-start');
    await page.goto(`${server.url}/film.html?capture`);startupMark('navigation-load-complete');
    await page.waitForFunction(()=>window.strataFilm?.ready,{timeout:Math.min(100000,Math.max(1,109000-(performance.now()-turnStart)))});
    startupMark('film-ready-observed');
    if(process.argv.includes('--startup-report')){
      startup.browser=await readStartupTrace(page);startup.snapshotSHA256=manifest.snapshotSHA256;
      fs.mkdirSync(path.join(OUT,'startup'),{recursive:true});write(`startup/turn-${process.pid}.json`,startup);
    }
    if(errors.length)throw new Error(errors.join('\n'));
    const calibration=await page.evaluate(()=>window.strataFilm.cameraSample(0));
    async function capture(frame,kind='still'){
      const result=await page.evaluate(async({frame,kind,base,top})=>{
        const start=performance.now(),data=window.strataFilm.render(frame/30);
        const renderMs=performance.now()-start,bytes=window.strataFilm.readPixels();
        const response=await fetch(`/__film/${kind}/${frame}`,{method:'POST',body:bytes});
        if(!response.ok)throw new Error(await response.text());
        const full=data.state.scene.deposits.every(value=>value===1);
        const activeTopWorldY=full?top:-base+1+(top+base-1)*data.state.scene.deposits.reduce((sum,value)=>sum+value,0)/10;
        return {frame,renderMs,...await response.json(),pose:data.pose,info:data.info,anchorVisibility:data.anchorVisibility,activeTopFrameY:data.activeTopFrameY,activeTopWorldY};
      },{frame,kind,base:calibration.base,top:calibration.top});
      if(errors.length)throw new Error(errors.join('\n'));return {...result,...cameraScale(result.pose,result.activeTopWorldY)};
    }
    const device=await page.evaluate(()=>window.strataFilm.device());write('device.json',device);
    if(preview){
      for(const seconds of [0,8,10,28,42,48,54,59]){await capture(seconds*30);const raw=path.join(OUT,'preview.rgba');fs.writeFileSync(raw,lastRaw);rawPng(raw,path.join(OUT,`preview-${seconds}.png`));}
      console.log('F1 preview ready');return;
    }
    if(chunkIndex===null||(chunkIndex===0&&(segmentIndex===null||segmentIndex===0))){
    // Two nonadjacent scrubs, each tested after rendering a different state.
    await capture(300);firstRaw=Buffer.from(lastRaw);await capture(1620);await capture(300);firstRepeat=Buffer.from(lastRaw);
    await capture(1530);secondRaw=Buffer.from(lastRaw);await capture(0);await capture(1530);secondRepeat=Buffer.from(lastRaw);
    const determinism={samples:[{frame:300,...difference(firstRaw,firstRepeat),sha256:sha256(firstRaw),repeatSHA256:sha256(firstRepeat)},{frame:1530,...difference(secondRaw,secondRepeat),sha256:sha256(secondRaw),repeatSHA256:sha256(secondRepeat)}]};
    if(determinismOnly)for(const sample of determinism.samples){
      const report=JSON.parse(fs.readFileSync(path.join(OUT,CHUNK_DIR,`part-${Math.floor(sample.frame/CHUNK_FRAMES)}.json`),'utf8'));
      sample.chunkCaptureSHA256=report.stats.find(row=>row.frame===sample.frame).sha256;
      sample.matchesChunkCapture=sample.chunkCaptureSHA256===sample.sha256;
    }
    determinism.snapshotSHA256=manifest.snapshotSHA256;
    determinism.startupReportPID=process.pid;determinism.persistentProfile=startup.persistentProfile;
    write(determinismOnly?'determinism-post.json':'determinism.json',determinism);
    if(determinismOnly)write(`determinism-post-${process.pid}.json`,determinism);
    if(determinism.samples.some(s=>!s.equal||s.matchesChunkCapture===false))throw new Error('Pixel determinism failed');
    const samples=Array.from({length:7201},(_,i)=>camera.cameraPose(i/120,device.blockDimensions.minimumY*-1,device.blockDimensions.maximumY));
    const speed=samples.slice(1).map((s,i)=>Math.hypot((s.azimuthDegrees-samples[i].azimuthDegrees)*Math.cos(s.elevationDegrees*Math.PI/180),s.elevationDegrees-samples[i].elevationDegrees)*120);
    const acceleration=speed.slice(1).map((s,i)=>Math.abs(s-speed[i])*120);
    write('camera-report.json',{method:'120 Hz finite differences of continuous orbit yaw/elevation; orientation tangent metric in degrees. No cuts, quintic ease.',peakAngularSpeedDegreesPerSecond:Math.max(...speed),peakAngularAccelerationDegreesPerSecondSquared:Math.max(...acceleration),minimumOffFrontalDegrees:Math.min(...samples.map(s=>s.azimuthDegrees)),start:samples[0],end:samples.at(-1),activeTopTarget:{frameY:.575,definition:'From top of frame, central cap anchor; compact smoothing across era starts'},draftNote:'F1 pulls back during rewind to retain room below the active top; top/cap and anchor are disposable stand-ins.'});
    if(determinismOnly){console.log('Post-render determinism is pixel-exact and matches chunk capture hashes');return;}
    }
    const chunkVideo=chunkIndex===null?video:pieceIndex!==null?path.join(OUT,'pinned-pieces',`part-${chunkIndex}-${segmentIndex}-${pieceIndex}.mp4`):segmentIndex===null?path.join(OUT,CHUNK_DIR,`part-${chunkIndex}.mp4`):path.join(OUT,'pinned-segments',`part-${chunkIndex}-${segmentIndex}.mp4`);
    if(!rawRecovery){encoder=rawEncoder(chunkVideo,1920,1080);encoder.finished.catch(error=>console.error('[encoder]',error.message));}
    const start=performance.now();
    const frameCount=pieceIndex!==null?15:segmentIndex===null?CHUNK_FRAMES:CHUNK_FRAMES/2;
    const startFrame=chunkIndex===null?0:chunkIndex*CHUNK_FRAMES+(segmentIndex??0)*45+(pieceIndex??0)*15,endFrame=chunkIndex===null?1800:startFrame+frameCount;
    for(let frame=startFrame;frame<endFrame;frame++){
      const saved=path.join(OUT,'raw-recovery',`frame-${frame}.json`);
      if(rawRecovery&&fs.existsSync(saved)){
        const sample=JSON.parse(fs.readFileSync(saved,'utf8'));
        if(sample.snapshotSHA256!==manifest.snapshotSHA256||sha256(fs.readFileSync(path.join(OUT,'raw-recovery',`frame-${frame}.rgba`)))!==sample.sha256)throw new Error('Recovery frame provenance/hash differs');
        stats.push(sample);continue;
      }
      const sample=await capture(frame,'frame');stats.push(sample);
      if(rawRecovery)fs.writeFileSync(saved,JSON.stringify({...sample,snapshotSHA256:manifest.snapshotSHA256,recoveryTurnPID:process.pid})+'\n');
      if(rawRecovery||frame===startFrame||frame%15===0)console.log(`Captured ${frame}/1800, ${((performance.now()-start)/1000).toFixed(1)} s`);
    }
    if(rawRecovery){write(`raw-recovery/turn-${Date.now()}.json`,{startFrame,endFrame,gpuTurnSeconds:(performance.now()-turnStart)/1000,snapshotSHA256:manifest.snapshotSHA256});console.log('Recovery raw frames complete; encoding deferred to CPU');return;}
    encoder.process.stdin.end();await encoder.finished;encoder=null;
    const renderSeconds=(performance.now()-start)/1000;
    if(chunkIndex!==null){
      const probe=JSON.parse(run(bin('ffprobe'),['-v','error','-count_frames','-show_entries','stream=nb_read_frames,duration','-of','json',chunkVideo]).stdout);
      if(Number(probe.streams[0].nb_read_frames)!==frameCount)throw new Error('Incomplete chunk/segment');
      const report=pieceIndex!==null?`pinned-pieces/part-${chunkIndex}-${segmentIndex}-${pieceIndex}.json`:segmentIndex===null?`${CHUNK_DIR}/part-${chunkIndex}.json`:`pinned-segments/part-${chunkIndex}-${segmentIndex}.json`;
      write(report,{startFrame,endFrame,renderSeconds,gpuTurnSeconds:(performance.now()-turnStart)/1000,snapshotSHA256:manifest.snapshotSHA256,stats});
      console.log(`Chunk ${chunkIndex}, segment ${segmentIndex??'all'} complete, ${renderSeconds.toFixed(2)} s`);return;
    }
    finalize(eventReport,stats,renderSeconds,video);
  }finally{
    clearTimeout(turnDeadline);
    clearTimeout(priorityTimer);
    if(encoder){encoder.process.stdin.destroy();encoder.process.kill();}
    if(browser)await browser.close();if(server)await server.close();
  }
}
function finalize(eventReport,stats,renderSeconds,video){
    write('render-time.json',{frames:1800,width:1920,height:1080,fps:30,msaa:true,supersampling:false,draftShadowMapSize:512,renderAndPictureEncodeSeconds:renderSeconds,meanSecondsPerFrame:renderSeconds===null?null:renderSeconds/1800,timingNote:renderSeconds===null?'Raw recovery did not preserve complete render-only wall time; do not treat missing timing as zero.':null});
    write('frame-metrics.json',stats);
    const visibility=new Map();
    for(const sample of stats)for(const anchor of sample.anchorVisibility){
      if(!visibility.has(anchor.id))visibility.set(anchor.id,{id:anchor.id,featureId:anchor.featureId,placeholderAnchor:true,offFrameFrames:[],occludedFrames:[]});
      const row=visibility.get(anchor.id);if(anchor.offFrame)row.offFrameFrames.push(sample.frame);if(anchor.occluded)row.occludedFrames.push(sample.frame);
    }
    eventReport.calloutVisibilityAudit={reportOnly:true,method:'Every frame of nonzero opacity; world ray intersection, clipping-plane filtered',callouts:[...visibility.values()].map(row=>({...row,flagged:!!(row.offFrameFrames.length||row.occludedFrames.length),firstOffFrame:row.offFrameFrames[0]??null,firstOccludedFrame:row.occludedFrames[0]??null}))};
    for(const event of eventReport.events)if(event.type==='callout-in')event.visibilityFlagged=eventReport.calloutVisibilityAudit.callouts.find(row=>row.id===event.id)?.flagged??false;
    write('events.json',eventReport);
    const score=path.join(root,'output','sound','v2.1','strata-score.wav'),scoreHash=sha256(fs.readFileSync(score)).toUpperCase();
    if(scoreHash!==LOCKED)throw new Error(`Locked score hash mismatch: ${scoreHash}`);
    write('score-integrity.json',{expectedSHA256:LOCKED,actualSHA256:scoreHash,equal:true});
    ffmpeg(['-i',video,'-i',score,'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-profile:a','aac_low','-ar','48000','-ac','2','-b:a','256k','-t','60','-movflags','+faststart',path.join(OUT,'animatic.mp4')]);
    const probe=JSON.parse(run(bin('ffprobe'),['-v','error','-show_streams','-show_format','-of','json',path.join(OUT,'animatic.mp4')]).stdout);
    write('media-probe.json',probe);
    for(const stream of probe.streams)if(Number(stream.start_time)!==0||Math.abs(Number(stream.duration)-60)>1e-6)throw new Error(`Stream alignment failed: ${stream.codec_type}`);
    const v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio');
    if(v.nb_frames!=='1800'||v.width!==1920||v.height!==1080||v.r_frame_rate!=='30/1'||v.profile!=='High'||v.pix_fmt!=='yuv420p'||v.color_space!=='bt709'||a.profile!=='LC'||a.sample_rate!=='48000'||a.channels!==2)throw new Error('Media format validation failed');
    const stills=path.join(OUT,'stills');fs.mkdirSync(stills,{recursive:true});
    ffmpeg(['-i',video,'-vf',`select=${contacts.map(seconds=>`eq(n\\,${seconds*30})`).join('+')}`,'-fps_mode','vfr','-start_number','0','-frames:v','16',path.join(stills,'contact-%02d.png')]);
    ffmpeg(['-framerate','1','-i',path.join(stills,'contact-%02d.png'),'-vf','scale=480:270,tile=4x4','-frames:v','1',path.join(OUT,'contact-16.png')]);
    write('README.md',`# F1 animatic\n\n60.000 s, 1800 frames, 1080p30, native MSAA. Locked score hash verified before mux. Both streams start at 0 and last 60.000 s. AAC-LC 48 kHz stereo. Picture settings imported unchanged from media.cjs.\n\nRender plus picture encode: ${renderSeconds===null?'partially unavailable after incremental raw recovery':renderSeconds.toFixed(2)+' s'}. Tests: 10/10. Initial repeated raw frames 300 and 1530 pixel-exact; post-render checks are reported separately. Camera metrics in camera-report.json. Contact sheet reads left-to-right, top-to-bottom: ${contacts.join(', ')} s.\n\nProvisional: clipping/cap growth, four feature timing steps, schematic excavation and all callout anchors. Cold-a and end-b copy are unapproved drafts. Modern fill marker hidden; URL shown [TBD]. No outline geometry, so reconstruction legend omitted. Kushan brick uses the sourced fallback label, not the 0.39 m measurement. First rewind fragment starts during refill; picture peels begin at 4.5 s, subsequent endpoints match locked score schedule. Callout occlusion/off-frame audit is report-only in events.json.\n`);
    console.log(`F1 complete; render-only timing ${renderSeconds===null?'partially unavailable after raw recovery':renderSeconds.toFixed(2)+' seconds'}`);
}
(assemble?main():withGpu(`film:${determinismOnly?'determinism':preview?'preview':`chunk-${chunkIndex??'all'}-segment-${segmentIndex??'all'}`}`,main))
  .catch(error=>{console.error(error);process.exitCode=1;});
