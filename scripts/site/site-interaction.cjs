'use strict';
// Interaction measurements on a production build under the Pages sub-path (6b), one bounded GPU turn:
// A (vsync): load (about:blank, 2 s idle first) with a WebGL program-link probe; G2 static right after ready with
//   slow-frame attribution (frame index, time since ready, main thread vs elsewhere, overlapping tasks); a cold
//   timeline drag before anchor preparation finishes; first-use actions (pool on/off, drawer, film dialog, hover,
//   every step and era); warm drags with settle times; G5 scrub benchmark. Every program link is listed with the
//   phase it happened in.
// B (--disable-gpu-vsync --disable-frame-rate-limit): headroom at DPR1 (static; orbit at interaction scale 1, 0.75,
//   0.55; scrub) and DPR2 (static, orbit at 1) as information.
// Usage: node scripts/site/site-interaction.cjs --dist output/site/deploy-dry-r14 --out output/site/interaction-r1 [--headed]
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{serveDist,BASE}=require('./deploy-check.cjs'),{activePoolPredicate}=require('./active-pool.cjs');
const PORT=5188,WIDTH=1440,HEIGHT=900,FRAMES=300,UNTHROTTLED=['--disable-gpu-vsync','--disable-frame-rate-limit'];
const STEP_YEARS=[2013,2014,2018,2023],ERA_YEARS=[-400,-250,-100,150,400,700,1000,1300,1650,1900];
function programProbe(){
  const sources=new WeakMap(),attached=new WeakMap(),links=window.__programLinks=[];window.__programDeletes=0;
  for(const C of [window.WebGL2RenderingContext,window.WebGLRenderingContext]){if(!C)continue;const p=C.prototype,shaderSource=p.shaderSource,attachShader=p.attachShader,linkProgram=p.linkProgram,deleteProgram=p.deleteProgram;
    p.shaderSource=function(shader,code){sources.set(shader,code);return shaderSource.call(this,shader,code);};
    p.attachShader=function(program,shader){if(!attached.has(program))attached.set(program,[]);attached.get(program).push(shader);return attachShader.call(this,program,shader);};
    p.deleteProgram=function(program){window.__programDeletes++;return deleteProgram.call(this,program);};
    p.linkProgram=function(program){const start=performance.now();try{return linkProgram.call(this,program);}finally{const code=(attached.get(program)||[]).map(s=>sources.get(s)||'').join('\n');
      const define=name=>new RegExp('#define '+name+' (\\S+)').exec(code)?.[1]??null,flags=[...new Set([...code.matchAll(/#define (USE_[A-Z_]+|DEPTH_PACKING|DISTANCE|SHADOWMAP_TYPE_[A-Z]+|FLAT_SHADED|DOUBLE_SIDED|ALPHATEST|TRANSPARENT)\b/g)].map(m=>m[1]))].slice(0,24);
      let h=0;for(let i=0;i<code.length;i++)h=(h*31+code.charCodeAt(i))|0;
      links.push({atMs:+start.toFixed(1),linkMs:+(performance.now()-start).toFixed(2),shaderName:define('SHADER_NAME'),shaderType:define('SHADER_TYPE'),firstLines:code.split('\n').filter(l=>/^#define (SHADER|USE_|DEPTH|VSM|SAMPLE|HORIZONTAL)|^precision|^uniform /.test(l)).slice(0,6),lights:{dir:define('NUM_DIR_LIGHTS'),spot:define('NUM_SPOT_LIGHTS'),point:define('NUM_POINT_LIGHTS'),shadowDir:define('NUM_DIR_LIGHT_SHADOWS'),shadowSpot:define('NUM_SPOT_LIGHT_SHADOWS'),clipping:define('NUM_CLIPPING_PLANES')},flags,hash:(h>>>0).toString(16),bytes:code.length});}};
  }
  window.__longTasks=[];try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__longTasks.push({startMs:+e.startTime.toFixed(1),durationMs:+e.duration.toFixed(1)});}).observe({type:'longtask',buffered:true});}catch{}
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pct=(v,q)=>{if(!v.length)return null;const s=[...v].sort((a,b)=>a-b);return +s[Math.min(s.length-1,Math.max(0,Math.ceil(q*s.length)-1))].toFixed(2);};
const stats=v=>({n:v.length,p50:pct(v,.5),p95:pct(v,.95),max:v.length?+Math.max(...v).toFixed(2):null});
async function open(browser,url,dpr,problems,label,probe){
  const page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(300000);
  page.on('response',r=>{if(r.status()>=400)problems.push(`${label}: HTTP ${r.status()} ${r.url()}`);});page.on('pageerror',e=>problems.push(`${label}: page error ${e.message}`));
  page.on('console',m=>{if(m.type()==='error')problems.push(`${label}: console error ${m.text()}`);});
  await page.setViewport({width:WIDTH,height:HEIGHT,deviceScaleFactor:dpr});if(probe)await page.evaluateOnNewDocument(programProbe);
  await page.goto('about:blank');await sleep(2000);await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.strataSite?.ready&&window.strataSite.metadata?.()?.loadTimeline?.some(m=>m.name==='first-presented'),{timeout:300000,polling:50});
  return page;
}
const now=page=>page.evaluate(()=>performance.now());
async function settled(page,timeout=60000){
  await page.waitForFunction(()=>{const s=window.strataSite,m=s.metadata();return m.anchors&&m.anchors.mode==='exact'&&!m.anchors.refining&&!m.anchors.easing&&!m.residency?.pending&&!m.scheduler.pendingFrame&&!m.occlusion.pending&&!m.occlusion.pendingOperations&&s.markerReport().every(r=>r.workerFresh);},{timeout,polling:16})
    .catch(async e=>{const state=await page.evaluate(()=>{const s=window.strataSite,m=s.metadata();return {year:s.getYear(),mode:m.anchors?.mode,refining:m.anchors?.refining,easing:m.anchors?.easing,residency:m.residency?.pending,pendingFrame:m.scheduler?.pendingFrame,occlusion:m.occlusion?.pending,operations:m.occlusion?.pendingOperations,stale:s.markerReport().filter(r=>!r.workerFresh).map(r=>r.featureId),visibility:document.visibilityState,focus:document.hasFocus(),active:document.activeElement?.id||document.activeElement?.tagName,dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>d.id)};}).catch(()=>null);throw new Error(e.message.split('\n')[0]+' '+JSON.stringify(state));});
}
async function idle(page){
  await page.waitForFunction(()=>{const m=window.strataSite.metadata();return m.taskReport.tasks.filter(t=>t.name==='excavation-warm').length>=4&&m.pools.loaded.length===m.pools.total&&(!m.anchors?.interactive||m.anchors.preparation?.doneAtMs||m.anchors.preparation?.stopped);},{timeout:120000,polling:250});
  await sleep(1000);
}
// One pointer move per rendered frame, like a real drag; rAF intervals recorded from pointer down to settle.
async function drag(page,fromYear,toYear,moves){
  const geo=await page.evaluate((a,b)=>{const t=document.querySelector('#timeline'),r=t.getBoundingClientRect();return {x:r.left,y:r.top+r.height/2,width:r.width};},fromYear,toYear);
  const {yearToX}=await import('../../src/site/scrubber.js'),inside=x=>Math.max(geo.x+1,Math.min(geo.x+geo.width-1,x)),x0=inside(geo.x+yearToX(fromYear,geo.width)),x1=geo.x+yearToX(toYear,geo.width);
  await page.evaluate(()=>{window.__dragFrames=[];let last;const tick=t=>{if(last!==undefined)window.__dragFrames.push(t-last);last=t;if(window.__dragFrames)window.__dragRaf=requestAnimationFrame(tick);};window.__dragRaf=requestAnimationFrame(tick);});
  const startedAt=await now(page);await page.mouse.move(x0,geo.y);await page.mouse.down();
  for(let i=1;i<=moves;i++){await page.mouse.move(x0+(x1-x0)*i/moves,geo.y);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));}
  const dragFrames=await page.evaluate(()=>window.__dragFrames.length);const upAt=await now(page);await page.mouse.up();
  await settled(page);const doneAt=await now(page);
  const out=await page.evaluate(up=>{cancelAnimationFrame(window.__dragRaf);const frames=window.__dragFrames;window.__dragFrames=null;const m=window.strataSite.metadata();
    return {frames,lastRefinement:m.anchors.lastRefinement,year:window.strataSite.getYear(),occlusionAt:m.taskReport.tasks.find(t=>t.name==='occlusion-apply'&&t.startTimeMs>=up)?.startTimeMs??null,dotsAt:m.taskReport.tasks.find(t=>t.name==='occlusion-visibility-apply'&&t.startTimeMs>=up)?.startTimeMs??null,tableHit:m.anchors.applies?.nearestTableHits??null,restoreDelayMs:m.resolution.lastRestorationDelayMs};},upAt);
  const r=out.lastRefinement,exactAt=r?.committedAtMs>upAt?r.committedAtMs:upAt;
  const breakdown={pointerUpToExactMs:+(exactAt-upAt).toFixed(1),exactBeforePointerUp:!(r?.committedAtMs>upAt),pointerUpToEaseEndMs:+(exactAt-upAt+(r?.committedAtMs>upAt?r.easeMs:0)).toFixed(1),pointerUpToOcclusionMs:out.occlusionAt!==null?+(out.occlusionAt-upAt).toFixed(1):null,pointerUpToDotsMs:out.dotsAt!==null?+(out.dotsAt-upAt).toFixed(1):null,nearestTableHitsSoFar:out.tableHit,restoreDelayMs:out.restoreDelayMs};
  return {fromYear,toYear,moves,startedAtMs:+startedAt.toFixed(1),pointerUpMs:+upAt.toFixed(1),settleObservedMs:+(doneAt-upAt).toFixed(1),dragFrameMs:stats(out.frames.slice(0,dragFrames)),afterUpFrameMs:stats(out.frames.slice(dragFrames)),rawDragFrameMs:out.frames.slice(0,dragFrames).map(v=>+v.toFixed(1)),breakdown,refinement:out.lastRefinement,year:out.year};
}
function summary(b){if(!b)return null;const {rawFrameMs,rawSubmitMs,rawJsMs,rawMainThreadMs,warmTasks,tasks,longTasksOver50ms,diagnosticReport,caveat,...rest}=b;return {...rest,frameMs:stats(rawFrameMs),mainThreadMs:stats(rawMainThreadMs),submitMs:stats(rawSubmitMs)};}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];},headed=args.includes('--headed'),unthrottled=!args.includes('--no-unthrottled');
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/interaction-r1'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const report={dist,viewport:{width:WIDTH,height:HEIGHT},headed,problems:[],actions:[]},t0=Date.now(),log=s=>console.log(`[${((Date.now()-t0)/1000).toFixed(1)}s] ${s}`);
  const server=await serveDist(dist,PORT),url=server.url+BASE;
  try{await withGpu('site:interaction',async()=>{
    const watchdog=setTimeout(()=>{console.error('Watchdog: GPU turn exceeded 570 s');process.exit(2);},570000);watchdog.unref();
    try{
      // ---- A: vsync, DPR1 ----
      let browser=await launch(headed?{headless:false}:{});
      try{
        const page=await open(browser,url,1,report.problems,'A',true),act=async(name,fn)=>{const start=await now(page);let result=null,error=null;try{result=await fn();}catch(e){error=String(e.message).split('\n')[0];log(`${name} failed: ${error}`);}report.actions.push({name,startMs:+start.toFixed(1),endMs:+(await now(page)).toFixed(1),...(error?{error}:{})});return result;};
        const marks=Object.fromEntries((await page.evaluate(()=>window.strataSite.metadata().loadTimeline)).map(m=>[m.name,m.atMs]));report.loadTimeline=marks;log(`A ready ${marks.ready} ms, first-presented ${marks['first-presented']} ms`);
        // Startup settle: the load year's dots and labels after the first presented frame (dots wait for refinement only off the anchor table).
        await page.waitForFunction(()=>{const e=window.strataSite.sceneForYear(window.strataSite.getYear()).eraIndex;const t=window.strataSite.metadata().loadTimeline;return t.some(m=>m.name==='dots-visible')&&(!Number.isInteger(e)||t.some(m=>m.name==='labels-visible'));},{timeout:30000,polling:50}).catch(()=>{});
        {const m=await page.evaluate(()=>{const m=window.strataSite.metadata();const e=window.strataSite.sceneForYear(window.strataSite.getYear()).eraIndex;return {timeline:m.loadTimeline,hits:m.anchors.applies?.nearestTableHits??null,refinements:m.anchors.refinements.length,year:window.strataSite.getYear(),eraCallouts:Number.isInteger(e)};}),at=n=>m.timeline.find(x=>x.name===n)?.atMs;
          report.startup={year:m.year,nearestTableHits:m.hits,refinementsBeforeLabels:m.refinements,firstPresentedToDotsMs:at('dots-visible')!=null?+(at('dots-visible')-at('first-presented')).toFixed(1):null,firstPresentedToLabelsMs:!m.eraCallouts?'n/a (no era callouts at this state)':at('labels-visible')!=null?+(at('labels-visible')-at('first-presented')).toFixed(1):null};log('startup '+JSON.stringify(report.startup));}
        const staticRaw=await act('g2-static',()=>page.evaluate(f=>window.strataSite.benchmark({mode:'static',frames:f,warmup:30,dpr:1}),FRAMES));
        if(staticRaw){let t=staticRaw.firstFrameTimestampMs;const slow=[];staticRaw.rawFrameMs.forEach((ms,i)=>{const end=t+ms;if(ms>25)slow.push({index:i,intervalMs:+ms.toFixed(1),endMs:+end.toFixed(1),sinceReadyMs:+(end-marks.ready).toFixed(0),renderMainThreadMs:+staticRaw.rawMainThreadMs[i]?.toFixed(2),renderSubmitMs:+staticRaw.rawSubmitMs[i]?.toFixed(2),windowStartMs:+t.toFixed(1)});t=end;});
          const tasks=await page.evaluate(()=>({scene:window.strataSite.metadata().taskReport.tasks.map(t=>({name:t.name,startMs:+(t.startTimeMs??0).toFixed(1),durationMs:+t.durationMs.toFixed(1)})),long:window.__longTasks}));
          for(const s of slow){const overlap=x=>x.startMs<s.endMs&&x.startMs+x.durationMs>s.windowStartMs;s.sceneTasks=tasks.scene.filter(overlap);s.longTasks=tasks.long.filter(overlap);
            s.cause=s.longTasks.length||s.sceneTasks.some(x=>x.durationMs>8)?'main thread (task outside the frame callback)':s.renderMainThreadMs>16?'main thread (frame callback)':'not on the main thread (GPU/compositor)';}
          report.g2Static={...summary(staticRaw),startedSinceReadyMs:+(staticRaw.firstFrameTimestampMs-marks.ready).toFixed(0),slowFrames:slow};log(`G2 static p95 ${report.g2Static.frameMs.p95}, slow ${slow.length}`);}
        report.coldDrag=await act('drag-cold',()=>drag(page,2023,150,40));if(report.coldDrag)report.coldDrag.preparationAtPointerUp=await page.evaluate(()=>window.strataSite.metadata().anchors.preparation);log(`cold drag settle ${report.coldDrag?.settleObservedMs} ms dots +${report.coldDrag?.breakdown.pointerUpToDotsMs} ${JSON.stringify(report.coldDrag?.breakdown)} refine ${report.coldDrag?.refinement?.refineMs}`);
        await act('idle-wait',()=>idle(page));report.preparation=await page.evaluate(()=>window.strataSite.metadata().anchors.preparation);
        await act('pool-on',async()=>{await page.evaluate(()=>window.strataSite.setYear(150,{instant:true}));await settled(page);await page.evaluate(()=>window.strataSite.setActiveFeature('kushan-house'));try{await page.waitForFunction(activePoolPredicate('kushan-house'),{timeout:15000,polling:50});}catch(e){const {activePoolSettled}=require('./active-pool.cjs');throw new Error('pool not settled: '+JSON.stringify(await page.evaluate(`(${activePoolSettled})(window.strataSite.metadata(),window.strataSite.markerReport(),'kushan-house')`))+' year '+await page.evaluate(()=>window.strataSite.getYear()));}await sleep(300);});
        await act('pool-off',async()=>{await page.evaluate(()=>window.strataSite.setActiveFeature(null));await sleep(600);});
        await act('hover-marker',async()=>{const box=await page.evaluate(()=>{const b=[...document.querySelectorAll('.marker')].find(x=>!x.hidden);const r=b?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;});if(box){await page.mouse.move(box.x,box.y);await sleep(600);await page.mouse.move(5,5);await sleep(400);}});
        await act('drawer',async()=>{await page.evaluate(()=>window.strataSite.openFeature('kushan-house'));await sleep(600);await page.keyboard.press('Escape');await sleep(400);});
        await act('film-dialog',async()=>{await page.click('[data-panel="film"]');await sleep(600);await page.keyboard.press('Escape');await sleep(400);});
        for(const year of [...STEP_YEARS,...ERA_YEARS])await act('year-'+year,async()=>{await page.evaluate(y=>window.strataSite.setYear(y),year);await settled(page);});
        report.warmDrags=[];for(const [a,b,n] of [[1900,150,30],[150,-400,30],[-400,1650,60],[1650,1600,10],[1600,150,8],[150,2023,40],[2023,2014,20],[2014,2018,10]])report.warmDrags.push(await act(`drag ${a}->${b}`,()=>drag(page,a,b,n)));
        log('warm drags: '+report.warmDrags.filter(Boolean).map(d=>`${d.fromYear}->${d.toYear} settled ${d.settleObservedMs}ms: exact +${d.breakdown.pointerUpToExactMs}${d.breakdown.exactBeforePointerUp?' (before up)':''}, ease end +${d.breakdown.pointerUpToEaseEndMs}, dots +${d.breakdown.pointerUpToDotsMs}, occlusion +${d.breakdown.pointerUpToOcclusionMs} (refine ${d.refinement?.refineMs})`).join(', '));
        report.g5Scrub=summary(await act('g5-scrub',()=>page.evaluate(f=>window.strataSite.benchmark({mode:'scrub',frames:f,warmup:30,dpr:1}),FRAMES)));log(`G5 scrub p95 ${report.g5Scrub?.frameMs.p95}, main p95 ${report.g5Scrub?.mainThreadMs.p95}`);
        report.g2OrbitVsync=summary(await act('g2-orbit',()=>page.evaluate(f=>window.strataSite.benchmark({mode:'orbit',frames:f,warmup:30,dpr:1}),FRAMES)));
        const m=await page.evaluate(()=>{const m=window.strataSite.metadata();return {programs:m.programs,anchors:m.anchors,links:window.__programLinks,deletes:window.__programDeletes,tasks:m.taskReport.tasks,longTasks:window.__longTasks};});
        report.sceneTasks=m.tasks;report.browserLongTasks=m.longTasks;report.anchors=m.anchors;report.programsInfo=m.programs;report.programDeletes=m.deletes;
        const phaseOf=at=>at<=marks['first-presented']?'before first-presented':(report.actions.find(a=>at>=a.startMs&&at<=a.endMs)?.name??'idle (between actions)');
        report.programLinks=m.links.map(l=>({...l,phase:phaseOf(l.atMs)}));log(`programs ${m.programs}, links ${m.links.length}: `+report.programLinks.map(l=>`${l.shaderName}@${l.phase}`).join('; '));
      }finally{await browser.close().catch(()=>{});}
      // ---- B: unthrottled ----
      if(unthrottled){browser=await launch({args:UNTHROTTLED,...(headed?{headless:false}:{})});
      try{
        const page=await open(browser,url,1,report.problems,'B',false);report.loadTimelineB=Object.fromEntries((await page.evaluate(()=>window.strataSite.metadata().loadTimeline)).map(m=>[m.name,m.atMs]));log(`B ready ${report.loadTimelineB.ready} ms, first-presented ${report.loadTimelineB['first-presented']} ms`);await idle(page);const run=o=>page.evaluate(o=>window.strataSite.benchmark({frames:300,warmup:30,...o}),o).then(summary);
        const b=report.unthrottled={flags:UNTHROTTLED};
        b.staticDpr1=await run({mode:'static',dpr:1});b.orbitDpr1Scale1=await run({mode:'orbit',dpr:1,interactionRatio:1});b.orbitDpr1Scale075=await run({mode:'orbit',dpr:1,interactionRatio:.75});b.orbitDpr1Scale055=await run({mode:'orbit',dpr:1,interactionRatio:.55});
        b.scrubDpr1=await run({mode:'scrub',dpr:1});b.staticDpr2=await run({mode:'static',dpr:2});b.orbitDpr2Scale1=await run({mode:'orbit',dpr:2,interactionRatio:1});
        b.flagsEffective=b.staticDpr1.frameMs.p50<15;log('unthrottled: '+Object.entries(b).filter(([,v])=>v?.frameMs).map(([k,v])=>`${k} p50 ${v.frameMs.p50} p95 ${v.frameMs.p95} max ${v.frameMs.max} (dpr ${v.effectiveDpr})`).join('; '));
      }finally{await browser.close().catch(()=>{});}}
    }finally{clearTimeout(watchdog);}
  });}finally{await server.close();fs.writeFileSync(path.join(out,'interaction.json'),JSON.stringify(report,null,2)+'\n');log('wrote '+path.join(out,'interaction.json'));}
  if(report.problems.length){console.log('problems: '+JSON.stringify(report.problems));process.exitCode=1;}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
