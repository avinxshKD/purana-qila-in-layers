'use strict';
// Dedicated F2 engine. F1 capture.cjs and its accepted deliveries are untouched.
const fs=require('node:fs'),path=require('node:path'),{once}=require('node:events');
const {root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs');
const {sha256,bin,run}=require('../media.cjs'),{losslessEncoder}=require('./lossless.cjs'),{fileSHA256,verifySource,verifySnapshot,assertFrame}=require('./f2-contract.cjs');
const {expectedPoolFields,assertPoolFields}=require('./pool-fields.cjs');
const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
const out=path.resolve(get('--out')||path.join(root,'output/film/f2/rough-r1')),mode=get('--mode')||'chunk',chunk=Number(get('--chunk')),chunkFrames=45;
const profile='f2-'+sha256(out).slice(0,16),proof=mode!=='chunk';
const captureProtocol='f2-cpu2d-primed-v1',warmupFrames=[300,1530,0];
if(!['chunk','proof-fresh','proof-profile'].includes(mode)||(!proof&&(!Number.isInteger(chunk)||chunk<0||chunk>=40)))throw new Error('Invalid F2 capture mode/chunk');
async function main(){
  const manifest=verifySnapshot(out),source=verifySource(out),delivery=JSON.parse(fs.readFileSync(path.join(out,'f2-input.json')));
  const poolFieldHashes=expectedPoolFields(path.join(out,'source'));
  if(delivery.backend!=='m1'||delivery.snapshotSHA256!==manifest.snapshotSHA256||delivery.sourceSHA256!==source.sha256||delivery.emphasis!==false)throw new Error('F2 requires pinned real M1 without emphasis');
  const reportFile=path.join(out,proof?mode+'.json':`chunks/part-${String(chunk).padStart(2,'0')}.json`);
  if(fs.existsSync(reportFile))throw new Error('Preserve completed F2 capture');
  if(!proof){
    const proofReport=JSON.parse(fs.readFileSync(path.join(out,'profile-proof.json')));
    if(proofReport.snapshotSHA256!==manifest.snapshotSHA256||proofReport.equal!==true||proofReport.captureProtocol!==captureProtocol)throw new Error('F2 profile reuse requires fresh/profile pixel proof');
  }
  const folder=path.join(out,proof?`proof/${mode}-${process.pid}`:'chunks');fs.mkdirSync(folder,{recursive:true});
  const video=proof?null:path.join(folder,`part-${String(chunk).padStart(2,'0')}.mkv`);
  if(video&&fs.existsSync(video))throw new Error('Preserve incomplete FFV1 capture; controller must archive it before retry');
  let browser,server,encoder,deadline,expired=false,device;const stats=[],errors=[],rawHashes=[];
  const started=performance.now();
  try{
    deadline=setTimeout(()=>{expired=true;browser?.close().catch(()=>{});},110000);
    server=await servePinned({folder:path.join(out,'snapshot'),port:5188,middleware(req,res,next){
      const match=/^\/__f2\/(frame|proof)\/([a-z0-9-]+)$/.exec(req.url);if(!match)return next();if(req.method!=='POST'){res.writeHead(405).end();return;}
      const chunks=[];let length=0;req.on('data',bytes=>{length+=bytes.length;if(length>1920*1080*4)req.destroy();else chunks.push(bytes);});
      req.on('end',async()=>{try{
        const bytes=Buffer.concat(chunks);if(bytes.length!==1920*1080*4)throw new Error('F2 native RGBA byte count differs');
        if(match[1]==='frame'){if(!encoder)throw new Error('FFV1 encoder unavailable');if(!encoder.process.stdin.write(bytes))await once(encoder.process.stdin,'drain');}
        else fs.writeFileSync(path.join(folder,match[2]+'.rgba'),bytes,{flag:'wx'});
        res.setHeader('Content-Type','application/json');res.end(JSON.stringify({sha256:sha256(bytes),bytes:bytes.length}));
      }catch(error){if(!res.headersSent)res.writeHead(500);res.end(error.message);}});
    }});
    browser=await launch(proof&&mode==='proof-fresh'?{}:{profile});if(expired)throw new Error('F2 GPU launch exceeded deadline');const page=(await browser.pages())[0]||await browser.newPage();
    await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});page.setDefaultTimeout(100000);page.on('pageerror',e=>errors.push(e.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    // Keep the accepted bundle untouched. CPU-backed Canvas2D removes Chrome's
    // history-dependent AA on HUD under-strokes; WebGL remains native MSAA.
    await page.evaluateOnNewDocument(()=>{
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(kind,options){return original.call(this,kind,kind==='2d'?{...options,willReadFrequently:true}:options);};
    });
    await page.goto(server.url+'/film.html?capture&backend=m1');await page.waitForFunction(()=>window.strataFilm?.ready);
    await page.evaluate(()=>document.fonts.ready);
    const initial=await page.evaluate(()=>window.strataFilm.sample(0));assertFrame(initial);
    assertPoolFields(poolFieldHashes,initial.emphasis?.poolFieldHashes);
    if(initial.emphasis&&delivery.emphasis===false)throw new Error('Pinned F2 is no-emphasis; a later emphasized delivery needs its own explicit contract');
    device=await page.evaluate(()=>window.strataFilm.device());if(!(device.samples>0))throw new Error('F2 needs native multisampling');
    for(const frame of warmupFrames)await page.evaluate(frame=>{window.strataFilm.render(frame/30);window.strataFilm.readPixels();},frame);
    if(!proof){encoder=losslessEncoder(video);encoder.finished.catch(error=>console.error(error.message));}
    async function capture(frame,label){
      const row=await page.evaluate(async({frame,label,proof})=>{
        const started=performance.now(),data=window.strataFilm.render(frame/30),renderMs=performance.now()-started,bytes=window.strataFilm.readPixels();
        const response=await fetch('/__f2/'+(proof?'proof':'frame')+'/'+label,{method:'POST',body:bytes});if(!response.ok)throw new Error(await response.text());
        return {frame,renderMs,...await response.json(),backend:data.backend,provisionalGeometry:data.provisionalGeometry,pose:data.pose,framing:data.framing,overlayReport:data.overlayReport,
          anchorVisibility:data.anchorVisibility,geometryAudit:data.geometryAudit,activeTopWorldY:data.activeTopWorldY,activeTopFrameY:data.activeTopFrameY,info:data.info,poolFieldHashes:data.emphasis?.poolFieldHashes};
      },{frame,label,proof});
      assertFrame(row);assertPoolFields(poolFieldHashes,row.poolFieldHashes);if(errors.length)throw new Error(errors.join('\n'));return row;
    }
    if(proof){
      for(const[frame,label]of[[300,'first-300'],[300,'consecutive2-300'],[300,'consecutive3-300'],[1530,'first-1530'],[0,'reset-0'],[300,'repeat-300'],[1530,'repeat-1530']]){
        const row=await capture(frame,label);rawHashes.push({frame,label,sha256:row.sha256,raw:path.relative(out,path.join(folder,label+'.rgba')).replaceAll('\\','/')});
      }
    }else{
      const first=chunk*chunkFrames;for(let frame=first;frame<first+chunkFrames;frame++){
        stats.push(await capture(frame,String(frame)));if(frame===first||frame%15===0)console.log(`F2 lossless frame ${frame}/1800`);
      }
      encoder.process.stdin.end();await encoder.finished;encoder=null;
    }
  }finally{
    if(encoder){encoder.process.stdin.destroy();encoder.process.kill();}
    try{await browser?.close();}finally{try{await server?.close();}finally{clearTimeout(deadline);}}
  }
  const report={schemaVersion:1,film:'F2',timingContract:'film-timing.md v1.3',backend:'m1',emphasis:false,snapshotSHA256:manifest.snapshotSHA256,poolFieldHashes,captureProtocol,warmupFrames,canvas2D:{willReadFrequently:true,fontReadyAwaited:true},profileUsed:mode!=='proof-fresh',profileSlug:mode!=='proof-fresh'?profile:null,device,gpuTurnSeconds:(performance.now()-started)/1000};
  if(expired||report.gpuTurnSeconds>110)throw new Error('F2 GPU turn exceeded110s');
  if(proof){
    report.samples=[300,1530].map(frame=>{const first=rawHashes.find(r=>r.label==='first-'+frame),repeat=rawHashes.find(r=>r.label==='repeat-'+frame);return {frame,first,repeat,equal:first.sha256===repeat.sha256};});
    report.consecutive300=rawHashes.filter(r=>['first-300','consecutive2-300','consecutive3-300'].includes(r.label));
    report.equal=report.samples.every(s=>s.equal)&&report.consecutive300.every(r=>r.sha256===report.consecutive300[0].sha256);fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
    if(!report.equal)throw new Error('F2 repeated raw scrubs are not pixel-exact');
  }else{
    const media=JSON.parse(run(bin('ffprobe'),['-v','error','-count_frames','-show_entries','stream=codec_name,pix_fmt,width,height,nb_read_frames:format=duration,size','-of','json',video]).stdout),stream=media.streams[0];
    if(stream.codec_name!=='ffv1'||stream.width!==1920||stream.height!==1080||Number(stream.nb_read_frames)!==chunkFrames)throw new Error('F2 FFV1 chunk format/count differs');
    Object.assign(report,{startFrame:chunk*chunkFrames,endFrame:(chunk+1)*chunkFrames,frames:chunkFrames,video:path.relative(out,video).replaceAll('\\','/'),videoSHA256:fileSHA256(video),bytes:fs.statSync(video).size,stats,probe:media});
    fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
  }
  console.log(JSON.stringify({report:reportFile,mode,chunk:proof?null:chunk,gpuTurnSeconds:report.gpuTurnSeconds,frames:stats.length}));
}
withGpu('film:f2-'+mode+(proof?'':'-'+chunk),main).catch(error=>{console.error(error);process.exitCode=1;});
