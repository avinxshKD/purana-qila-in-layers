'use strict';
// Ready-time breakdown of a production site build, served under the Pages sub-path on a fresh browser profile.
// WebGL compile/link/upload calls are timed by wrapping the context prototypes before the page runs; resource,
// phase-mark, task and long-task timings come from the page. One bounded GPU turn. Never overwrites.
// Usage: node scripts/site/ready-breakdown.cjs --dist output/site/deploy-dry-r4 --out output/site/ready-r1 [--width 1440 --height 900 --dpr 1]
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{serveDist,BASE}=require('./deploy-check.cjs');
const CAP_MS=540000,PORT=5188;
function glProbe(){
  const stats=window.__glStats={calls:{},events:[]},names=['deleteProgram','compileShader','linkProgram','getShaderParameter','getProgramParameter','getShaderInfoLog','getProgramInfoLog','getUniformLocation','getActiveUniform','texImage2D','texSubImage2D','texImage3D','texStorage2D','texStorage3D','texSubImage3D','bufferData','bufferSubData','generateMipmap'];
  for(const C of [window.WebGL2RenderingContext,window.WebGLRenderingContext])if(C)for(const name of names){
    const original=C.prototype[name];if(!original)continue;
    C.prototype[name]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{const ms=performance.now()-t,s=stats.calls[name]||(stats.calls[name]={count:0,ms:0});s.count++;s.ms+=ms;stats.events.push([name,+t.toFixed(2),+ms.toFixed(3)]);}};
  }
}
const GROUPS={shaderCompile:['compileShader','linkProgram','getShaderParameter','getProgramParameter','getShaderInfoLog','getProgramInfoLog','getUniformLocation','getActiveUniform'],upload:['texImage2D','texSubImage2D','texImage3D','texStorage2D','texStorage3D','texSubImage3D','bufferData','bufferSubData','generateMipmap']};
function union(intervals){let total=0,end=-Infinity;for(const [a,b] of intervals.filter(([a,b])=>b>a).sort((x,y)=>x[0]-y[0])){if(b<=end)continue;total+=b-Math.max(a,end);end=b;}return total;}
function breakdown(raw){
  const marks=Object.fromEntries(raw.metadata.loadTimeline.map(m=>[m.name,m.atMs])),nav=raw.navigation,events=raw.gl.events;
  // One window per consecutive pair of scene marks, named by the mark that closes it (navigation start to the first).
  const timeline=raw.metadata.loadTimeline.filter(m=>m.atMs<=(marks['first-presented']??marks.ready));
  const windows=timeline.map((m,i)=>[i?`${timeline[i-1].name} -> ${m.name}`:`navigation -> ${m.name}`,i?timeline[i-1].atMs:0,m.atMs]);
  const glIn=(group,a,b)=>events.filter(e=>GROUPS[group].includes(e[0])&&e[1]>=a&&e[1]<b).reduce((s,e)=>s+e[2],0);
  const resources=raw.resources,fetchIn=(a,b)=>union(resources.filter(r=>r.start<b&&r.end>a).map(r=>[Math.max(a,r.start),Math.min(b,r.end)]));
  const longIn=(a,b)=>raw.longTasks.filter(t=>t.start>=a&&t.start<b).reduce((s,t)=>s+t.duration,0);
  const workerTasks=raw.metadata.taskReport.tasks.filter(t=>/occlusion|worker|bvh|silhouette|prepare/i.test(t.name));
  return {readyMs:marks.ready,firstFrameMs:raw.firstFrameAt,firstPresentedMs:marks['first-presented']??null,shadersMs:marks.shaders!==undefined?+(marks.shaders-marks.reframe).toFixed(1):null,firstPresentedLabel:'G1: navigation start to the first presented 3D frame',navigation:nav,
    windows:windows.map(([name,a,b])=>({name,startMs:+a.toFixed(1),durationMs:+(b-a).toFixed(1),networkBusyMs:+fetchIn(a,b).toFixed(1),shaderCompileMs:+glIn('shaderCompile',a,b).toFixed(1),uploadMs:+glIn('upload',a,b).toFixed(1),longTaskMs:+longIn(a,b).toFixed(1)})),
    afterReady:{firstRenderTask:raw.metadata.taskReport.tasks.find(t=>t.name==='first-render')??null,shaderCompileMs:+glIn('shaderCompile',marks.ready,Infinity).toFixed(1),uploadMs:+glIn('upload',marks.ready,Infinity).toFixed(1),
      excavationWarm:raw.metadata.taskReport.tasks.filter(t=>t.name==='excavation-warm').map(t=>({year:t.year,durationMs:+t.durationMs.toFixed(1)}))},
    totals:{shaderCompileMsToReady:+glIn('shaderCompile',0,marks.ready).toFixed(1),uploadMsToReady:+glIn('upload',0,marks.ready).toFixed(1),networkBusyMsToReady:+fetchIn(0,marks.ready).toFixed(1),bytesToReady:resources.filter(r=>r.end<=marks.ready).reduce((s,r)=>s+r.bytes,0),
      programs:raw.programs,glCalls:raw.gl.calls},
    workerTasks:workerTasks.map(t=>({name:t.name,startMs:+(t.startTimeMs??0).toFixed(1),durationMs:+t.durationMs.toFixed(1)})),
    resources:resources.map(r=>({path:r.path.replace(BASE,'~/'),startMs:+r.start.toFixed(1),durationMs:+(r.end-r.start).toFixed(1),bytes:r.bytes}))};
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/ready-r1')),width=+arg('--width','1440'),height=+arg('--height','900'),dpr=+arg('--dpr','1'),reportFile=path.join(out,'ready-breakdown.json');
  if(fs.existsSync(reportFile))throw new Error('Preserve '+reportFile);fs.mkdirSync(out,{recursive:true});
  let raw;const errors=[],t0=Date.now(),log=s=>console.log(`[${((Date.now()-t0)/1000).toFixed(1)}s] ${s}`);
  await withGpu('site:ready-breakdown',async()=>{
    log('GPU lock acquired');
    // Hard stop: a hung browser or server must not hold the shared GPU lock past its turn.
    const watchdog=setTimeout(()=>{console.error('Watchdog: GPU turn exceeded 570 s');process.exit(2);},570000);watchdog.unref();
    let browser,server;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
    try{
      server=await serveDist(dist,PORT);browser=await launch();const page=(await browser.pages())[0]||await browser.newPage();
      await page.setViewport({width,height,deviceScaleFactor:dpr});page.setDefaultTimeout(400000);await page.evaluateOnNewDocument(glProbe);
      await page.evaluateOnNewDocument(()=>{window.__longTasks=[];new PerformanceObserver(l=>l.getEntries().forEach(e=>window.__longTasks.push({start:e.startTime,duration:e.duration}))).observe({type:'longtask',buffered:true});});
      page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      log('browser up; navigating');await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});log('DOM loaded');
      await page.waitForFunction(()=>window.strataSite?.ready&&window.strataSite.metadata()?.loadPhase==='ready',{timeout:400000,polling:50});
      await page.waitForFunction(()=>window.strataSite.metadata().renderCount>0,{timeout:60000,polling:16});
      const firstFrameAt=await page.evaluate(()=>performance.now());log('ready and first frame');
      await page.waitForFunction(()=>{const m=window.strataSite.metadata();return m.taskReport.tasks.filter(t=>t.name==='excavation-warm').length>=4&&m.pools.loaded.length===m.pools.total&&!m.occlusion.pending;},{timeout:120000,polling:250});
      log('warm-up and pool prefetch done');raw=await page.evaluate(firstFrameAt=>{const m=window.strataSite.metadata(),n=performance.getEntriesByType('navigation')[0];
        return {metadata:{loadTimeline:m.loadTimeline,taskReport:m.taskReport,pools:m.pools,renderCount:m.renderCount,effectiveDpr:m.effectiveDpr},firstFrameAt,
          framingStart:m.taskReport.tasks.find(t=>t.name==='framing-reference')?.startTimeMs??null,
          navigation:{responseEndMs:n.responseEnd,domContentLoadedMs:n.domContentLoadedEventEnd,loadEventMs:n.loadEventEnd},
          resources:performance.getEntriesByType('resource').map(e=>({path:new URL(e.name).pathname,start:e.startTime,end:e.responseEnd,bytes:e.encodedBodySize||e.transferSize||0})),
          longTasks:window.__longTasks,gl:window.__glStats,programs:null};},firstFrameAt);
    }finally{clearTimeout(stop);log('closing');await browser?.close().catch(()=>{});await server?.close();clearTimeout(watchdog);log('closed');}
  });
  const report={dist,viewport:{width,height,dpr},profile:'fresh temporary',errors,breakdown:breakdown(raw),pools:raw.metadata.pools,raw};
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
  const b=report.breakdown;console.log(JSON.stringify({readyMs:b.readyMs,firstFrameMs:b.firstFrameMs,windows:b.windows.map(w=>`${w.name}: ${w.durationMs} ms (net ${w.networkBusyMs}, shader ${w.shaderCompileMs}, upload ${w.uploadMs})`),afterReady:{...b.afterReady,excavationWarm:b.afterReady.excavationWarm.length},totals:{...b.totals,glCalls:undefined},errors}));
  if(errors.length)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={breakdown,glProbe};
