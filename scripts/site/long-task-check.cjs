'use strict';
// Long-task gate on a production build under the Pages sub-path, one bounded GPU turn (vsync, DPR1 1440x900 by default):
// no main-thread task over 50 ms after the first presented frame (the ready-to-first-presented task is exempt), in
//   idle: --idle-ms with no input after first-presented (pool prefetch, anchor preparation, warm-ups);
//   orbit: a real pointer orbit (--steps moves, one per frame) with no state change;
//   refine-cold / refine-warm: the same orbit with a timeline year change early in it, so the refinement, the exact
//   commit, the shadow refresh and the occlusion restore all land mid-orbit (cold: first change to --year after load;
//   warm: back to the load year, settled, then --year again);
//   drag: a timeline drag 1900 -> 150. Orbit and drag phases end once the view has settled after release.
// Each phase lists browser long tasks and frame gaps over 25 ms with long-animation-frame script attribution and the
// site's own named tasks that overlap them. Never overwrites an output folder.
// Usage: node scripts/site/long-task-check.cjs --dist output/site/deploy-dry-r18 --out output/site/long-task-r1 [--dpr 1 --year 199 --headed]
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{serveDist,BASE}=require('./deploy-check.cjs');
const PORT=5188,IDLE_BEFORE_MS=2000,LONG_MS=50,GAP_MS=25;
function probe(){
  const w=window;w.__long=[];w.__loaf=[];w.__frames=[];
  try{new PerformanceObserver(l=>{for(const e of l.getEntries())w.__long.push({startMs:+e.startTime.toFixed(1),durationMs:+e.duration.toFixed(1),attribution:(e.attribution||[]).map(a=>a.containerType||a.name)});}).observe({type:'longtask',buffered:true});}catch{}
  try{new PerformanceObserver(l=>{for(const e of l.getEntries())w.__loaf.push({startMs:+e.startTime.toFixed(1),durationMs:+e.duration.toFixed(1),blockingMs:+(e.blockingDuration??0).toFixed(1),renderStartMs:+(e.renderStart??0).toFixed(1),
    scripts:(e.scripts||[]).filter(s=>s.duration>=5).map(s=>({durationMs:+s.duration.toFixed(1),invoker:s.invoker,invokerType:s.invokerType,fn:s.sourceFunctionName,url:(s.sourceURL||'').split('/').pop(),char:s.sourceCharPosition,forcedLayoutMs:+(s.forcedStyleAndLayoutDuration??0).toFixed(1)}))});}).observe({type:'long-animation-frame',buffered:true});}catch{}
  const tick=t=>{w.__frames.push(+t.toFixed(1));requestAnimationFrame(tick);};requestAnimationFrame(tick);
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/long-task-r1')),dpr=+arg('--dpr','1'),year=+arg('--year','199');
  const idleMs=+arg('--idle-ms','8000'),steps=+arg('--steps','180'),width=+arg('--width','1440'),height=+arg('--height','900'),headed=args.includes('--headed');
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const report={dist,viewport:{width,height,dpr},headed,gate:{longTaskMs:LONG_MS,gapMs:GAP_MS,exempt:'tasks starting before first-presented'},phases:[],problems:[]},t0=Date.now(),log=s=>console.log(`[${((Date.now()-t0)/1000).toFixed(1)}s] ${s}`);
  const server=await serveDist(dist,PORT);
  try{
    await withGpu('site:long-task',async()=>{
      const watchdog=setTimeout(()=>{console.error('Watchdog: GPU turn exceeded 540 s');process.exit(2);},540000);watchdog.unref();
      const browser=await launch({headless:!headed});
      try{
        const page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(240000);
        page.on('pageerror',e=>report.problems.push('page error '+e.message));page.on('console',m=>{if(m.type()==='error')report.problems.push('console error '+m.text());});
        await page.setViewport({width,height,deviceScaleFactor:dpr});await page.goto('about:blank');await sleep(IDLE_BEFORE_MS);
        await page.evaluateOnNewDocument(probe);await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>window.strataSite?.metadata?.()?.loadTimeline?.some(m=>m.name==='first-presented'),{polling:50});
        report.loadEraIndex=await page.evaluate(()=>{const e=window.strataSite.sceneForYear(window.strataSite.getYear()).eraIndex;return Number.isInteger(e)?e:null;});
        const loadYear=await page.evaluate(()=>window.strataSite.getYear()),timeline=await page.evaluate(()=>window.strataSite.metadata().loadTimeline);
        const at=n=>timeline.find(x=>x.name===n)?.atMs??null;report.loadTimeline=timeline;report.firstPresentedMs=at('first-presented');
        // Memory profile as built: drawing buffer, MSAA samples (off at DPR 2+), phone VSM size.
        report.device=await page.evaluate(()=>{const d=window.strataSite.device?.(),m=window.strataSite.metadata();return {devicePixelRatio:m.devicePixelRatio,effectiveDpr:m.effectiveDpr,maxPixelRatio:m.maxPixelRatio,drawingBuffer:d?.drawingBuffer??null,samples:d?.samples??null,memoryProfile:d?.memoryProfile??null,renderer:d?.renderer??null};});report.readyMs=at('ready');report.loadYear=loadYear;
        const now=()=>page.evaluate(()=>performance.now());
        const rect=await page.evaluate(()=>{const r=document.querySelector('#scene').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height*.45};});
        async function orbit(change){
          await page.mouse.move(rect.x,rect.y);await page.mouse.down();const from=await now();
          for(let i=0;i<steps;i++){if(change&&i===20)await page.evaluate(y=>window.strataSite.setYear(y),change);
            await page.mouse.move(rect.x+Math.sin(i/steps*Math.PI*2)*180,rect.y+Math.sin(i/steps*Math.PI*4)*20);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r())));}
          await page.mouse.up();return from;
        }
        // A timeline drag, one pointer move per frame.
        async function drag(fromYear,toYear,moves){
          const geo=await page.evaluate(()=>{const r=document.querySelector('#timeline').getBoundingClientRect();return {x:r.left,y:r.top+r.height/2,width:r.width};});
          const {yearToX}=await import('../../src/site/scrubber.js'),x0=geo.x+yearToX(fromYear,geo.width),x1=geo.x+yearToX(toYear,geo.width);
          await page.mouse.move(x0,geo.y);await page.mouse.down();const from=await now();
          for(let i=1;i<=moves;i++){await page.mouse.move(x0+(x1-x0)*i/moves,geo.y);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>r())));}
          await page.mouse.up();return from;
        }
        const settle=async()=>{await page.waitForFunction(()=>{const m=window.strataSite.metadata();return m.anchors.mode!=='nearest'&&!m.anchors.refining&&!m.anchors.easing&&!m.residency?.pending&&!m.scheduler?.pendingFrame&&!m.occlusion?.pending&&!m.occlusion?.pendingOperations;},{polling:100,timeout:60000}).catch(()=>report.problems.push('settle timed out'));await sleep(1500);};
        const phases=[
          // Idle also runs until the occlusion worker's pre-warm of every cut step is done (tier world), so its
          // main-thread registration copies count.
          ['idle',async()=>{const wait=report.firstPresentedMs+idleMs-await now();if(wait>0)await sleep(wait);
            await page.waitForFunction(()=>{const w=window.strataSite.metadata().anchors?.occlusionWarm;return typeof w==='string'||!!w?.doneAtMs||!!w?.stopped;},{polling:250,timeout:180000}).catch(()=>report.problems.push('occlusion warm did not finish in 180 s'));}],
          // Orbit and drag phases run on to the settled state after release, so the exact commit, occlusion restore
          // and label layout count too.
          ['orbit',async()=>{await settle();const from=await orbit(null);await settle();return from;}],
          ['refine-cold',async()=>{await settle();const from=await orbit(year);await settle();return from;}],
          ['refine-warm',async()=>{await settle();await page.evaluate(y=>window.strataSite.setYear(y),loadYear);await settle();const from=await orbit(year);await settle();return from;}],
          ['drag',async()=>{await settle();await page.evaluate(()=>window.strataSite.setYear(1900));await settle();const from=await drag(1900,150,30);await settle();return from;}],
        ];
        for(const [name,run] of phases){
          // Orbit phases are timed from their pointer down, after the settle wait inside run().
          const from=await run(),end=await now();
          report.phases.push({name,fromMs:+(from??report.firstPresentedMs).toFixed(1),toMs:+end.toFixed(1)});log(`${name} done`);
        }
        await sleep(1000);
        const data=await page.evaluate(()=>({long:window.__long,loaf:window.__loaf,frames:window.__frames,tasks:window.strataSite.metadata().taskReport?.tasks??[],anchors:window.strataSite.metadata().anchors,loadTimeline:window.strataSite.metadata().loadTimeline}));
        // Startup settle: first presented frame to the first visible dot and the first fresh label.
        const mark=n=>data.loadTimeline.find(x=>x.name===n)?.atMs??null,after=n=>mark(n)===null?null:+(mark(n)-report.firstPresentedMs).toFixed(1);
        report.loadTimeline=data.loadTimeline;report.startup={dotsVisibleAfterFirstPresentedMs:after('dots-visible'),labelsVisibleAfterFirstPresentedMs:report.loadEraIndex===null?'n/a (no era callouts at this state)':after('labels-visible'),loadYear:report.loadYear,nearestTableHits:data.anchors.applies?.nearestTableHits??null,firstRefinement:data.anchors.refinements?.[0]??null};
        report.anchors={refinements:data.anchors.refinements,refineFailures:data.anchors.refineFailures};report.occlusionWarm=data.anchors.occlusionWarm??null;
        // Occlusion pipeline costs on the main thread: sliced proxy builds, outline index, layout.
        const pick=n=>data.tasks.filter(t=>t.name===n).map(({startTimeMs,durationMs,name,...rest})=>({startMs:+startTimeMs.toFixed(1),durationMs:+durationMs.toFixed(1),...rest}));
        report.occlusionTasks={occluderProxies:pick('occluder-proxies'),silhouetteBuild:pick('silhouette-build'),occlusionRegister:pick('occlusion-register'),occlusionApply:pick('occlusion-apply'),visibilityApply:pick('occlusion-visibility-apply')};
        const named=data.tasks.filter(t=>t.source!=='browser-longtask');
        const overlap=(s,e)=>named.filter(t=>t.startTimeMs<e&&t.startTimeMs+t.durationMs>s).map(t=>({name:t.name,startMs:+t.startTimeMs.toFixed(1),durationMs:+t.durationMs.toFixed(1)}));
        const loafFor=(s,e)=>data.loaf.filter(f=>f.startMs<e&&f.startMs+f.durationMs>s);
        for(const phase of report.phases){
          const inPhase=x=>x>=phase.fromMs&&x<phase.toMs;
          phase.longTasks=data.long.filter(t=>t.startMs>=report.firstPresentedMs&&inPhase(t.startMs)).map(t=>({...t,named:overlap(t.startMs,t.startMs+t.durationMs),frames:loafFor(t.startMs,t.startMs+t.durationMs)}));
          const frames=data.frames.filter(inPhase),gaps=[];for(let i=1;i<frames.length;i++){const d=frames[i]-frames[i-1];if(d>GAP_MS)gaps.push({atMs:frames[i-1],gapMs:+d.toFixed(1),named:overlap(frames[i-1],frames[i]),frames:loafFor(frames[i-1],frames[i])});}
          const intervals=frames.slice(1).map((f,i)=>f-frames[i]).sort((a,b)=>a-b),q=p=>intervals.length?+intervals[Math.min(intervals.length-1,Math.ceil(p*intervals.length)-1)].toFixed(1):null;
          phase.frameCount=frames.length;phase.frameMs={p50:q(.5),p95:q(.95),max:intervals.length?+intervals.at(-1).toFixed(1):null};phase.gapsOver25=gaps;phase.maxGapMs=gaps.length?Math.max(...gaps.map(g=>g.gapMs)):0;phase.maxLongTaskMs=phase.longTasks.length?Math.max(...phase.longTasks.map(t=>t.durationMs)):0;phase.pass=phase.longTasks.length===0;
        }
        report.exemptLongTasks=data.long.filter(t=>t.startMs<report.firstPresentedMs);
      }finally{clearTimeout(watchdog);await browser.close().catch(()=>{});}
    });
  }finally{await server.close();}
  report.pass=report.phases.every(p=>p.pass)&&!report.problems.length;
  fs.writeFileSync(path.join(out,'long-task.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({pass:report.pass,firstPresentedMs:report.firstPresentedMs,occlusionWarm:report.occlusionWarm,startup:report.startup,device:report.device,occlusionMaxMs:Object.fromEntries(Object.entries(report.occlusionTasks).map(([k,v])=>[k,{n:v.length,maxMs:v.length?Math.max(...v.map(t=>t.durationMs)):null,maxSliceMs:v.some(t=>t.maxSliceMs!=null)?Math.max(...v.map(t=>t.maxSliceMs??0)):undefined,maxMeshMs:v.some(t=>t.maxMeshMs!=null)?Math.max(...v.map(t=>t.maxMeshMs??0)):undefined}])),phases:report.phases.map(p=>({name:p.name,pass:p.pass,longTasks:p.longTasks.map(t=>[t.startMs,t.durationMs,t.named.map(n=>n.name).join('+')]),gaps:p.gapsOver25.length,maxGapMs:p.maxGapMs,frameMs:p.frameMs})),problems:report.problems}));
  if(!report.pass)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
