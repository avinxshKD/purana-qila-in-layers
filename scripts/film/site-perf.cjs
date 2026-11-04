'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),puppeteer=require('puppeteer-core');
const {root,launch,executable}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs'),{bin,sha256}=require('../media.cjs'),{difference}=require('../capture-session.cjs');
const {variationEnvelope}=require('./pixel-variation.cjs');
const frozen=path.join(root,'output','site','perf-r2-r1'),candidateStage='candidate-r3',out=path.join(frozen,'measurements-r5'),captures=[],idleReports=[],inputReports=[],performanceReports=[],errors=[],freshBaseline=[];
let candidateFirstRest;
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
function decode(file){const r=spawnSync(bin('ffmpeg'),['-v','error','-i',file,'-f','rawvideo','-pix_fmt','rgba','pipe:1'],{maxBuffer:64*1024*1024});if(r.status!==0)throw new Error(r.stderr.toString());return r.stdout;}
async function instrumentation(page){
  await page.evaluateOnNewDocument(()=>{
    window.__siteMeasure={frames:0,draws:0};let framebuffer=null;
    const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),held=new Map();let gated=true,fake=-1;
    window.requestAnimationFrame=callback=>{if(!gated)return request(callback);const id=fake--;held.set(id,{callback});return id;};
    window.cancelAnimationFrame=id=>{const item=held.get(id);if(item){if(item.nativeId)cancel(item.nativeId);held.delete(id);}else cancel(id);};
    window.__releaseSiteRaf=()=>{if(!gated)return;gated=false;for(const [id,item]of held)item.nativeId=request(time=>{held.delete(id);item.callback(time);});};
    const prototype=WebGL2RenderingContext.prototype,bind=prototype.bindFramebuffer,clear=prototype.clear;
    prototype.bindFramebuffer=function(target,value){if(target===this.FRAMEBUFFER||target===this.DRAW_FRAMEBUFFER)framebuffer=value;return bind.call(this,target,value);};
    prototype.clear=function(mask){if(framebuffer===null&&(mask&this.COLOR_BUFFER_BIT))window.__siteMeasure.frames++;return clear.call(this,mask);};
    for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const original=prototype[name];prototype[name]=function(...args){window.__siteMeasure.draws++;return original.apply(this,args);};}
  });
  page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(100000);
}
async function settle(page){
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.waitForFunction(()=>{const m=window.strataSite.metadata();if(m?.occlusion?.error)throw new Error(m.occlusion.error);return !m?.scheduler||!m.scheduler.pendingFrame&&!m.resolution.interacting&&!m.occlusion?.pending;},{polling:50});
}
async function idle(page,label){
  const row=await page.evaluate(async()=>{
    const start=performance.now(),before={...window.__siteMeasure};await new Promise(resolve=>setTimeout(resolve,1000));const seconds=(performance.now()-start)/1000;
    return {seconds,frames:window.__siteMeasure.frames-before.frames,draws:window.__siteMeasure.draws-before.draws,framesPerSecond:(window.__siteMeasure.frames-before.frames)/seconds,metadata:window.strataSite.metadata()};
  });idleReports.push({label,...row});write('idle.json',idleReports);return row;
}
async function inputProbe(page,dpr,kind){
  await page.evaluate(dpr=>window.strataSite.benchmark({frames:1,warmup:0,dpr,pauseAfter:false}),dpr);await settle(page);
  const canvas=await page.$eval('#scene',node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
  let report=inputReports.find(report=>report.dpr===dpr);if(!report){report={dpr,samples:[]};inputReports.push(report);}
  const samples=report.samples;
  async function low(name){const handle=await page.waitForFunction(()=>{const m=window.strataSite.metadata();return m.effectiveDpr===.55?m:false;});samples.push({name,phase:'active',metadata:await handle.jsonValue()});await handle.dispose();}
  async function restored(name){await settle(page);samples.push({name,phase:'restored',metadata:await page.evaluate(()=>window.strataSite.metadata())});}
  if(kind==='orbit'){await page.mouse.move(canvas.x+canvas.width*.8,canvas.y+canvas.height*.55);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.8+32,canvas.y+canvas.height*.55+8,{steps:3});await low(kind);await page.mouse.up();await restored(kind);}
  if(kind==='zoom'){await page.mouse.move(canvas.x+canvas.width*.8,canvas.y+canvas.height*.55);await page.mouse.wheel({deltaY:45});await low(kind);await restored(kind);}
  if(kind==='scrub'){
    const track=await page.$eval('#timeline',node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};});
    await page.mouse.move(track.x+track.width*.5,track.y+12);await page.mouse.down();await page.mouse.move(track.x+track.width*.55,track.y+12,{steps:3});await low(kind);await page.mouse.up();await restored(kind);
  }
  for(const sample of samples)if(sample.phase==='restored'&&sample.metadata.effectiveDpr!==dpr)throw new Error('Full native DPR did not restore');
  const before=path.join(out,`restored-dpr${dpr}.png`),after=path.join(out,`full-reference-dpr${dpr}.png`);
  if(kind==='scrub')await page.screenshot({path:before});
  await page.evaluate(dpr=>window.strataSite.benchmark({frames:1,warmup:0,dpr,pauseAfter:true}),dpr);
  if(kind==='scrub'){await page.screenshot({path:after});report.restoredVersusExplicitFull=difference(decode(before),decode(after));}
  write('input-restoration.json',inputReports);
}
async function main(){
  if(fs.existsSync(path.join(out,'report.md')))throw new Error('Preserve delivered site report');
  fs.mkdirSync(out,{recursive:true});fs.copyFileSync(__filename,path.join(out,'measurement-harness.cjs'));
  for(const stage of ['baseline',candidateStage]){
    const manifest=JSON.parse(fs.readFileSync(path.join(frozen,stage,'snapshot-manifest.json')));
    for(const [file,hash]of Object.entries(manifest.files))if(sha256(fs.readFileSync(path.join(frozen,stage,'snapshot',file)))!==hash)throw new Error('Frozen '+stage+' changed: '+file);
  }
  const original=JSON.parse(fs.readFileSync(path.join(frozen,'baseline','source-inputs.json'))),candidate=JSON.parse(fs.readFileSync(path.join(frozen,candidateStage,'source-inputs.json')));
  const changes=Object.keys(candidate.files).filter(p=>candidate.files[p]!==original.files[p]);
  if(changes.some(p=>!p.startsWith('src/site/')&&!['package.json','package-lock.json'].includes(p)))throw new Error('Non-app inputs changed: '+changes.join(','));
  if(JSON.parse(fs.readFileSync(path.join(frozen,candidateStage,'source','package.json'))).dependencies.three!=='0.187.0')throw new Error('Three version drift');
  write('changed-inputs.json',{changes,worldGeometryMaterialsIdentical:true});
  freshBaseline.push(
    {repeat:1,file:path.join(frozen,'screenshots','baseline-desktop-dpr1','default.png'),freshTemporaryProfile:true,provenance:'First page in original r1 fresh launch; frozen baseline bundle86937512e9064a765300758849fc2e33fc3aacc9b39a8248f9870ca7585a5ea0; no benchmark before capture'},
    {...JSON.parse(fs.readFileSync(path.join(frozen,'measurements-r3','fresh-baselines.json')))[0],repeat:2,provenance:'First page in separate r3 fresh launch, same baseline bundle; no benchmark before capture'}
  );write('fresh-baselines.json',freshBaseline);
  const prior=JSON.parse(fs.readFileSync(path.join(frozen,'measurements-r4','interactive-frame-times.json')));
  performanceReports.push(...prior.filter(r=>r.dpr===1));write('interactive-frame-times.json',performanceReports);
  const server=await servePinned({folder:frozen,port:5188,middleware(req,res,next){const match=/^\/(baseline|candidate)\/(.*)$/.exec(req.url);if(match)req.url='/'+(match[1]==='candidate'?candidateStage:'baseline')+'/snapshot/'+match[2];else if(req.url.startsWith('/fonts/'))req.url='/baseline/snapshot'+req.url;next();}});
  let browser,page,deadline,loadedKey;
  async function turn(name,callback){
    await withGpu('site:perf-r2:'+name,async()=>{
      const started=performance.now();deadline=setTimeout(()=>{console.error('Site measurement deadline: closing own browser');browser?.close().catch(()=>{});},110000);
      try{await callback();if(errors.length)throw new Error(errors.join('\n'));}
      catch(error){await browser?.close();browser=undefined;throw error;}
      finally{clearTimeout(deadline);console.log(name+' lock-held seconds '+((performance.now()-started)/1000).toFixed(2));}
    });
  }
  try{
    for(const dpr of [1,2]){
      if(performanceReports.filter(r=>r.dpr===dpr).length===2)continue;
      await turn(`headed-startup-dpr${dpr}`,async()=>{
        browser=await puppeteer.launch({executablePath:executable(),headless:false,protocolTimeout:300000,args:['--force-color-profile=srgb','--hide-scrollbars','--no-first-run','--window-size=1500,1040']});
        page=(await browser.pages())[0]||await browser.newPage();await instrumentation(page);await page.setViewport({width:1440,height:900,deviceScaleFactor:dpr});await page.goto(server.url+'/candidate/site.html');await page.waitForFunction(()=>window.strataSite?.ready,{polling:100});
        if(await page.evaluate(()=>window.__siteMeasure.frames)!==0)throw new Error('Initial RAF gate failed');
      });
      await turn(`headed-first-draw-dpr${dpr}`,async()=>{await page.evaluate(()=>window.__releaseSiteRaf());await settle(page);});
      for(const mode of ['orbit','scrub'])await turn(`headed-${mode}-dpr${dpr}`,async()=>{
        await page.bringToFront();
        const report=await page.evaluate(({dpr,mode})=>window.strataSite.benchmark({frames:60,warmup:10,dpr,mode,pauseAfter:true}),{dpr,mode});
        performanceReports.push({headed:true,...report});write('interactive-frame-times.json',performanceReports);console.log(JSON.stringify({mode,dpr,effectiveDpr:report.effectiveDpr,p50:report.p50FrameMs,p95:report.p95FrameMs,p95Submit:report.p95SubmitMs,p95Js:report.p95JsMs,occlusionRays:report.occlusionRaysDuringBenchmark,gpu:report.gpuIdentity}));
        if(mode==='scrub'){await browser.close();browser=undefined;}
      });
    }
    for(const [name,width,height,dpr]of [['desktop',1440,900,1],['desktop',1440,900,2],['mobile',390,844,1]])for(const stage of ['baseline','candidate']){
      await turn(`${stage}-${name}-dpr${dpr}-startup`,async()=>{
        if(!browser){browser=await launch();page=(await browser.pages())[0]||await browser.newPage();await instrumentation(page);}
        const key=`${stage}-${name}-dpr${dpr}`;
        if(loadedKey!==key){await page.bringToFront();await page.setViewport({width,height,deviceScaleFactor:dpr});await page.goto(server.url+'/'+stage+'/site.html');await page.waitForFunction(()=>window.strataSite?.ready,{polling:100});loadedKey=key;}
      });
      await turn(`${stage}-${name}-dpr${dpr}-first-draw`,async()=>{await page.evaluate(()=>window.__releaseSiteRaf());await settle(page);});
      await turn(`${stage}-${name}-dpr${dpr}-rest`,async()=>{
        if(stage==='candidate'&&name==='desktop'&&dpr===1){const file=path.join(out,'candidate-first-rest.png');await page.screenshot({path:file});candidateFirstRest={file,counts:await page.evaluate(()=>window.__siteMeasure)};write('candidate-first-rest.json',candidateFirstRest);}
        const folder=path.join(out,'screenshots',`${stage}-${name}-dpr${dpr}`);fs.mkdirSync(folder,{recursive:true});
        for(const view of ['default','drawer','kushan','excavation-end']){
          await page.evaluate(view=>{const d=document.querySelector('#drawer');if(d.open)d.querySelector('.close').click();if(view==='drawer')window.strataSite.openFeature('mauryan-ring-well');if(view==='kushan')window.strataSite.setYear(100,{instant:true});if(view==='excavation-end')window.strataSite.setYear(2023,{instant:true});},view);
          await page.evaluate(dpr=>window.strataSite.benchmark({frames:1,warmup:0,dpr,pauseAfter:true}),dpr);await settle(page);const file=path.join(folder,view+'.png');await page.screenshot({path:file});captures.push({stage,name,width,height,dpr,view,file});write('captures.json',captures);
        }
        await page.evaluate(dpr=>window.strataSite.benchmark({frames:1,warmup:0,dpr,pauseAfter:false}),dpr);await settle(page);
        await idle(page,stage+'-'+name+'-dpr'+dpr);
        await page.evaluate(dpr=>window.strataSite.benchmark({frames:1,warmup:0,dpr,pauseAfter:true}),dpr);
      });
      if(stage==='candidate'&&name==='desktop')for(const kind of ['orbit','zoom','scrub'])await turn(`${stage}-dpr${dpr}-input-${kind}`,()=>inputProbe(page,dpr,kind));
    }
    await browser.close();browser=undefined;
  }finally{clearTimeout(deadline);if(browser)await browser.close();await server.close();}
  const baselineVariation=variationEnvelope(decode(freshBaseline[0].file),decode(freshBaseline[1].file),decode(candidateFirstRest.file));write('baseline-variation.json',baselineVariation);
  const proofs=[];
  for(const capture of captures.filter(c=>c.stage==='candidate')){
    const before=captures.find(c=>c.stage==='baseline'&&c.name===capture.name&&c.dpr===capture.dpr&&c.view===capture.view),reference=path.join(root,'output','site','s6-gpu',capture.name+'-'+capture.view+'.png');
    const row={viewport:capture.name,dpr:capture.dpr,view:capture.view,candidateVersusPrechange:difference(decode(before.file),decode(capture.file))};
    if(capture.dpr===1){row.prechangeVersusS6=difference(decode(reference),decode(before.file));row.candidateVersusS6=difference(decode(reference),decode(capture.file));}
    proofs.push(row);
  }write('pixel-proof.json',proofs);
  const summary={referenceDefinition:'Re-captured pre-change S6 app on identical frozen scene/static inputs; historical S6 PNG comparisons are informational because shared scene sources have changed',baselineVariation,firstRestWithinFreshBaselineEnvelope:baselineVariation.candidateWithinEnvelope,restPixelsMatchPrechange:proofs.every(p=>p.candidateVersusPrechange.equal),historicalS6MatchInformational:proofs.filter(p=>p.dpr===1).every(p=>p.candidateVersusS6.equal),idleFPS:idleReports.map(r=>({label:r.label,fps:r.framesPerSecond,frames:r.frames,draws:r.draws,seconds:r.seconds})),restoredMatchesFull:inputReports.every(r=>r.restoredVersusExplicitFull.equal),worldGeometryMaterialsIdentical:true,changes,performance:performanceReports.map(r=>({mode:r.mode,dpr:r.dpr,effectiveDpr:r.effectiveDpr,p50:r.p50FrameMs,p95:r.p95FrameMs,p95Submit:r.p95SubmitMs,p95Js:r.p95JsMs,p95MainThread:r.p95MainThreadMs,occlusionRays:r.occlusionRaysDuringBenchmark,passes:r.passes}))};
  write('summary.json',summary);
  const delays=inputReports.flatMap(r=>r.samples.filter(s=>s.phase==='restored').map(s=>({dpr:r.dpr,input:s.name,actualDelayMs:s.metadata.resolution.lastRestorationDelayMs})));write('restoration-timing.json',{requestedDelayMs:150,delays});
  const lines=['# Site app performance r3','',summary.referenceDefinition+'.','',`Strict rest pixels match re-captured pre-change reference: **${summary.restPixelsMatchPrechange}**. First rest image within two fresh baselines' per-pixel/channel envelope: **${baselineVariation.candidateWithinEnvelope}** (${baselineVariation.baselineVaryingPixels} varying baseline pixels;${baselineVariation.candidateOutsideEnvelopePixels} candidate pixels outside). Historical S6 match (informational only): **${summary.historicalS6MatchInformational}**. Restored interaction view matches an explicit full-quality render: **${summary.restoredMatchesFull}**. No geometry/material inputs changed.`,'','The first attempt timed out during DPR2 startup and is preserved in the parent folder. Its default first image differed by1pixel/1level; its three other desktop DPR1 views were exact. Both fresh baseline captures here precede benchmark calls and use separate temporary browser profiles. View proof uses one identical static quality-check frame before each screenshot for both builds. Startup and real-input gestures run in separate bounded turns. Native DPR is set before constructing each headed world.','',`Requested restoration delay150ms; required ceiling250ms. Actual timer delays: ${delays.map(r=>`DPR${r.dpr} ${r.input} ${r.actualDelayMs?.toFixed(1)}ms`).join('; ')}. These measure the resolution controller timer, not isolated GPU execution or physical presentation.`,'','| Interaction | Device DPR | Internal ratio | p50 ms | p95 ms | JS p95 ms | Render submit p95 ms | Occlusion rays |','|---|---:|---:|---:|---:|---:|---:|---:|'];
  for(const r of summary.performance)lines.push(`| ${r.mode} | ${r.dpr} | ${r.effectiveDpr} | ${r.p50.toFixed(2)} | ${r.p95.toFixed(2)} | ${r.p95Js.toFixed(2)} | ${r.p95Submit.toFixed(2)} | ${r.occlusionRays} |`);
  lines.push('','Idle GL frames/s: '+summary.idleFPS.map(r=>r.label+'='+r.fps).join('; ')+'.','','Headed hardware rAF timings,60frames after10warm-up frames. Interactive frames project markers while retaining their last visibility; BVH occlusion is deferred to a worker after motion. Scrub refreshes existing shadows. JS excludes renderer.render. Render-submit is CPU/driver call time, not a GPU timer query. Target16.7ms remains unchanged; failures are reported, not waived. Raw image diffs, actual-input restoration and idle counts are in JSON.');
  fs.writeFileSync(path.join(out,'report.md'),lines.join('\n')+'\n');console.log(JSON.stringify(summary,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
