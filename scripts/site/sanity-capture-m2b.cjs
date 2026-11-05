'use strict';
// Site design-pass sanity on a pinned snapshot: three states and an active pool at 1440x900,
// then the default state at 1280x720 and at a 390x844 DPR2 phone viewport. One bounded GPU turn.
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('../film/static-server.cjs'),{verifySnapshot,fileSHA256}=require('../film/f2-contract.cjs'),{activePoolPredicate}=require('./active-pool.cjs');
const CAP_MS=570000;
async function main(){
 const args=process.argv.slice(2),i=args.indexOf('--out'),out=path.resolve(i<0?path.join(root,'output/site/sanity-m2b-r1'):args[i+1]),manifest=verifySnapshot(out),reportFile=path.join(out,'sanity-report.json');if(fs.existsSync(reportFile))throw Error('Preserve completed site sanity');
 const result={snapshotSHA256:manifest.snapshotSHA256,candidate:JSON.parse(fs.readFileSync(path.join(out,'candidate-source.json'))),purpose:'Integration and design sanity only, not look or performance acceptance',states:[],errors:[]};
 await withGpu('site:design-pass-m2b-sanity',async()=>{
  const start=performance.now(),seconds=()=>Number(((performance.now()-start)/1000).toFixed(3));let browser,server,expired=false,phase='launch';
  const stop=setTimeout(()=>{expired=true;browser?.close().catch(()=>{});},CAP_MS);
  try{
   server=await servePinned({folder:path.join(out,'snapshot'),port:5188});browser=await launch();const page=(await browser.pages())[0]||await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});page.setDefaultTimeout(150000);
   page.on('pageerror',error=>result.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')result.errors.push(message.text());});
   phase='cold-load';console.log('Cold load started');await page.goto(server.url+'/site.html',{waitUntil:'domcontentloaded',timeout:360000});await page.waitForFunction(()=>window.strataSite?.ready,{timeout:360000});result.readySeconds=seconds();
   if(result.readySeconds>360)throw Error('Cold load threatens ten-minute cap; stopping before state transitions');
   async function settled(){
    await page.waitForFunction(()=>{const s=window.strataSite,m=s?.metadata();return s?.ready&&m?.scheduler.frames>0&&!m.scheduler.pendingFrame&&!m.scheduler.dirty&&!m.occlusion.pending&&!m.occlusion.pendingOperations&&!(m.residency?.pending)&&m.layout?.fresh&&s.markerReport().every(r=>r.workerFresh&&r.reason!=='pending-occlusion');},{timeout:120000,polling:250});
    if(result.errors.length)throw Error(result.errors.join('\n'));if(expired||seconds()>540)throw Error('Stop before bounded GPU turn expires');
   }
   async function capture(id,year,extra={}){
    phase=id;await settled();await new Promise(r=>setTimeout(r,300));
    const evidence=await page.evaluate(()=>{const m=window.strataSite.metadata(),rect=e=>{if(!e||e.hidden)return null;const r=e.getBoundingClientRect();return r.width?{x:r.x,y:r.y,width:r.width,height:r.height}:null;};
     const hud=window.strataSite.hudRects(),labels=m.layout.placed,gap=(a,b)=>Math.max(0,Math.max(a.x-(b.x+b.width),b.x-(a.x+a.width)),0)**2+Math.max(0,Math.max(a.y-(b.y+b.height),b.y-(a.y+a.height)))**2;
     return {year:window.strataSite.getYear(),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,canvasWidth:document.querySelector('#scene').width,canvasHeight:document.querySelector('#scene').height},
      text:{title:document.querySelector('h1')?.textContent.trim(),tagline:document.querySelector('#site-tagline')?.textContent.trim(),titleRect:rect(document.querySelector('h1')),taglineRect:rect(document.querySelector('#site-tagline'))},
      layout:m.layout,framing:m.framing,residency:m.residency,emphasis:m.emphasis,markers:window.strataSite.markerReport(),
      labelHudGaps:labels.flatMap(p=>hud.map(h=>({label:p.featureId,hud:h.id,gap:Math.sqrt(gap(p.rect,h.rect))})))};});
    const image=id+'.png';await page.screenshot({path:path.join(out,image)});
    const minHudGap=evidence.labelHudGaps.length?Math.min(...evidence.labelHudGaps.map(g=>g.gap)):null,labelled=evidence.layout.placed.map(p=>p.featureId+':'+p.kind);
    const row={id,requestedYear:year,seconds:seconds(),image,imageSHA256:fileSHA256(path.join(out,image)),minLabelHudGap:minHudGap,labelled,failures:evidence.layout.failures,...extra,...evidence};result.states.push(row);
    fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(result,null,2)+'\n');
    console.log(`${id} at ${row.seconds}s; labels=${labelled.join(',')}; minHudGap=${minHudGap?.toFixed?.(1)}; failures=${evidence.layout.failures.length}; audit=${evidence.layout.audit?.passes}`);
   }
   await capture('01-default-2023-1440x900',2023);
   await page.evaluate(()=>window.strataSite.setYear(150,{instant:true}));await capture('02-kushan-150-1440x900',150);
   await page.evaluate(()=>window.strataSite.setYear(2018,{instant:true}));await capture('03-excavation-2018-1440x900',2018);
   await page.evaluate(()=>window.strataSite.setYear(150,{instant:true}));await settled();
   const active=await page.evaluate(()=>{const ids=['kushan-house','mauryan-drain'],reports=window.strataSite.markerReport();return ids.find(id=>reports.some(r=>r.featureId===id&&r.visible));});
   if(!active)throw Error('Neither requested active-pool target is visible in Kushan state');
   result.activeFeature=active;phase='active-pool';await page.evaluate(id=>window.strataSite.setActiveFeature(id),active);
   await page.waitForFunction(activePoolPredicate(active),{timeout:30000,polling:100});await capture('04-active-pool-1440x900',150,{activeFeature:active});
   await page.evaluate(()=>window.strataSite.setActiveFeature(null));await page.evaluate(()=>window.strataSite.setYear(2023,{instant:true}));
   if(seconds()>420)throw Error('Desktop states used the budget; extra viewports not attempted');
   await page.setViewport({width:1280,height:720,deviceScaleFactor:1});await capture('05-default-2023-1280x720',2023);
   await page.setViewport({width:390,height:844,deviceScaleFactor:2});await capture('06-default-2023-390x844-dpr2',2023,{note:'Phone-size viewport and DPR on desktop Chrome (no touch emulation, to avoid a reload)'});
  }catch(error){result.failure={phase,message:error.message,seconds:seconds()};throw error;}
  finally{try{await browser?.close();}finally{await server?.close();clearTimeout(stop);result.gpuTurnSeconds=seconds();result.expired=expired;fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');}}
  if(expired||result.gpuTurnSeconds>CAP_MS/1000)throw Error('Site turn exceeded 9.5-minute safety cap');
 });
 console.log(JSON.stringify({out,states:result.states.length,gpuTurnSeconds:result.gpuTurnSeconds,readySeconds:result.readySeconds,activeFeature:result.activeFeature}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
