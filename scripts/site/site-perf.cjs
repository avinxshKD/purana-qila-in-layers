'use strict';
// Site performance on a production build served under the Pages sub-path, in one bounded GPU turn:
// G1 per DPR: fresh temporary profile, browser already running (about:blank, ~2 s idle), then navigation start to
//   the first presented 3D frame; hero-still paint (element timing) and FCP alongside. A cold-launch load (navigate
//   straight after launch) is recorded per DPR as information only.
// G2: scene benchmark p95 frame interval, static and orbit modes, after ready and warm-up.
// Every failed request (status >= 400) and console error is recorded with its URL. Never overwrites.
// Usage: node scripts/site/site-perf.cjs --dist output/site/deploy-dry-r12 --out output/site/perf-r1
//        [--width 1440 --height 900 --dprs 1,2 --g2-dpr 1[,2] --frames 300 --modes static,orbit --no-cold --headed]
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{serveDist,BASE}=require('./deploy-check.cjs');
const PORT=5188,IDLE_MS=2000;
function heroPaint(){return new Promise(resolve=>{const timer=setTimeout(()=>resolve(null),2000);new PerformanceObserver((list,observer)=>{const e=list.getEntries().find(x=>x.identifier==='hero-still');if(!e)return;clearTimeout(timer);observer.disconnect();resolve({renderTimeMs:+e.renderTime.toFixed(1),loadTimeMs:+e.loadTime.toFixed(1)});}).observe({type:'element',buffered:true});});}
function watch(page,label,problems){
  page.on('response',r=>{if(r.status()>=400)problems.push(`${label}: HTTP ${r.status()} ${r.url()}`);});
  page.on('requestfailed',r=>{const reason=r.failure()?.errorText;if(reason!=='net::ERR_ABORTED')problems.push(`${label}: ${reason} ${r.url()}`);});
  page.on('pageerror',e=>problems.push(`${label}: page error ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')problems.push(`${label}: console error ${m.text()} ${m.location()?.url??''}`.trim());});
}
async function load(browser,url,{width,height,dpr,idle,label,problems}){
  const page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(300000);watch(page,label,problems);
  await page.setViewport({width,height,deviceScaleFactor:dpr});
  if(idle){await page.goto('about:blank');await new Promise(r=>setTimeout(r,IDLE_MS));}
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.strataSite?.metadata?.()?.loadTimeline?.some(m=>m.name==='first-presented'),{timeout:300000,polling:50});
  const timing=await page.evaluate(async heroSource=>{const hero=await (0,eval)('('+heroSource+')')();const m=window.strataSite.metadata(),at=n=>m.loadTimeline.find(x=>x.name===n)?.atMs??null;
    return {firstPresentedMs:at('first-presented'),readyMs:at('ready'),posterPaintedMs:at('poster-painted'),heroStill:hero,fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,effectiveDpr:m.effectiveDpr,devicePixelRatio:m.devicePixelRatio,device:(()=>{const d=window.strataSite.device?.();return d?{drawingBuffer:d.drawingBuffer,samples:d.samples,memoryProfile:d.memoryProfile}:null;})(),programs:m.programs,loadTimeline:m.loadTimeline.map(x=>[x.name,+x.atMs.toFixed(1)])};},heroPaint.toString());
  return {page,timing};
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/perf-r1')),width=+arg('--width','1440'),height=+arg('--height','900');
  const dprs=arg('--dprs','1,2').split(',').filter(Boolean).map(Number),frames=+arg('--frames','300'),modes=arg('--modes','static,orbit').split(',').filter(Boolean),cold=!args.includes('--no-cold'),g2Dprs=arg('--g2-dpr','1').split(',').map(Number),headless=!args.includes('--headed');
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const report={dist,viewport:{width,height},profile:'fresh temporary per load',idleBeforeNavigationMs:IDLE_MS,g1:[],coldLaunch:[],g2:[],gpuMemory:[],headed:!headless,problems:[]},t0=Date.now(),log=s=>console.log(`[${((Date.now()-t0)/1000).toFixed(1)}s] ${s}`);
  const server=await serveDist(dist,PORT);
  try{
    await withGpu('site:perf',async()=>{
      const watchdog=setTimeout(()=>{console.error('Watchdog: GPU turn exceeded 570 s');process.exit(2);},570000);watchdog.unref();
      try{
        for(const dpr of dprs){
          let browser=await launch({headless});
          try{const {page,timing}=await load(browser,server.url+BASE,{width,height,dpr,idle:true,label:`g1 dpr${dpr}`,problems:report.problems});report.g1.push({dpr,...timing});log(`G1 dpr${dpr}: first-presented ${timing.firstPresentedMs?.toFixed(0)} ms, hero ${timing.heroStill?.renderTimeMs} ms`);
            // G2 on the DPR1 page once its load settles; benchmark() waits for the scene's own warm-up first.
            // Tracked GPU memory at ready (first view) and once the world's step prefetch has finished (all resident).
            const gpu=()=>page.evaluate(()=>({atMs:+performance.now().toFixed(1),...window.strataSite.gpuMemory()}));const memory={dpr,firstView:await gpu()};
            // The occlusion pre-warm starts once the step prefetch has finished, so its end marks every step resident.
            await page.waitForFunction(()=>{const w=window.strataSite.metadata()?.anchors?.occlusionWarm;return !!(w?.doneAtMs||w?.stopped);},{timeout:120000,polling:250}).catch(()=>report.problems.push(`dpr${dpr}: step prefetch/occlusion warm did not finish in 120 s`));
            memory.allResident={...await gpu(),steps:await page.evaluate(()=>window.strataSite.metadata()?.anchors?.occlusionWarm?.steps??null)};report.gpuMemory.push(memory);log(`GPU memory dpr${dpr}: first view ${memory.firstView.totalMB} MB, all resident ${memory.allResident.totalMB} MB`);
            if(g2Dprs.includes(dpr))for(const mode of modes){await page.waitForFunction(()=>window.strataSite.ready,{timeout:120000});
              const b=await page.evaluate((mode,frames,dpr)=>window.strataSite.benchmark({mode,frames,warmup:30,dpr}),mode,frames,dpr);
              const {rawFrameMs,rawSubmitMs,rawJsMs,rawMainThreadMs,warmTasks,tasks,...summary}=b;report.g2.push({mode,...summary,rawFrameMs});log(`G2 ${mode}: p95 ${b.p95FrameMs?.toFixed(2)} ms, p50 ${b.p50FrameMs?.toFixed(2)} ms`);}
          }finally{await browser.close().catch(()=>{});}
          if(cold){browser=await launch({headless});
            try{const {timing}=await load(browser,server.url+BASE,{width,height,dpr,idle:false,label:`cold dpr${dpr}`,problems:report.problems});report.coldLaunch.push({dpr,...timing});log(`cold launch dpr${dpr}: first-presented ${timing.firstPresentedMs?.toFixed(0)} ms, hero ${timing.heroStill?.renderTimeMs} ms`);}
            finally{await browser.close().catch(()=>{});}}
        }
      }finally{clearTimeout(watchdog);}
    });
  }finally{await server.close();}
  fs.writeFileSync(path.join(out,'site-perf.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({g1:report.g1.map(g=>({dpr:g.dpr,device:g.device,firstPresentedMs:g.firstPresentedMs,readyMs:g.readyMs,heroStillMs:g.heroStill?.renderTimeMs,fcpMs:g.fcpMs,programs:g.programs})),
    coldLaunch:report.coldLaunch.map(g=>({dpr:g.dpr,firstPresentedMs:g.firstPresentedMs,heroStillMs:g.heroStill?.renderTimeMs,fcpMs:g.fcpMs})),
    gpuMemory:report.gpuMemory.map(m=>({dpr:m.dpr,firstViewMB:m.firstView.totalMB,allResidentMB:m.allResident.totalMB,steps:m.allResident.steps,firstView:m.firstView,allResident:m.allResident})),
    g2:report.g2.map(g=>({mode:g.mode,frames:g.frames,dpr:g.dpr,interactionRatio:g.interactionRatio,maxFrameMs:g.rawFrameMs?.length?Math.max(...g.rawFrameMs):null,p50FrameMs:g.p50FrameMs,p95FrameMs:g.p95FrameMs,p95SubmitMs:g.p95SubmitMs,p95MainThreadMs:g.p95MainThreadMs,effectiveDpr:g.effectiveDpr,gpu:g.gpuIdentity})),problems:report.problems}));
  if(report.problems.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
