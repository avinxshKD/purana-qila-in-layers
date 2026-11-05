'use strict';
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('../film/static-server.cjs'),{verifySnapshot,fileSHA256}=require('../film/f2-contract.cjs'),{sha256}=require('../media.cjs');
async function main(){
 const args=process.argv.slice(2),i=args.indexOf('--out'),out=path.resolve(i<0?path.join(root,'output/site/sanity-m1-r1'):args[i+1]),manifest=verifySnapshot(out),reportFile=path.join(out,'sanity-report.json');if(fs.existsSync(reportFile))throw Error('Preserve completed site sanity');
 const result={snapshotSHA256:manifest.snapshotSHA256,candidate:JSON.parse(fs.readFileSync(path.join(out,'candidate-source.json'))),viewport:{width:1440,height:900,deviceScaleFactor:1},purpose:'Integration sanity only, not look or performance acceptance',states:[],errors:[]};
 await withGpu('site:real-m1-four-state-sanity',async()=>{
  const start=performance.now(),seconds=()=>Number(((performance.now()-start)/1000).toFixed(3));let browser,server,expired=false,phase='launch';
  const stop=setTimeout(()=>{expired=true;browser?.close().catch(()=>{});},570000);
  try{
   server=await servePinned({folder:path.join(out,'snapshot'),port:5188});browser=await launch();const page=(await browser.pages())[0]||await browser.newPage();await page.setViewport(result.viewport);page.setDefaultTimeout(150000);
   page.on('pageerror',error=>result.errors.push(error.message));page.on('console',message=>{if(message.type()==='error')result.errors.push(message.text());});
   phase='cold-load';console.log('Cold load started');await page.goto(server.url+'/site.html',{waitUntil:'domcontentloaded',timeout:360000});await page.waitForFunction(()=>window.strataSite?.ready,{timeout:360000});result.readySeconds=seconds();
   if(result.readySeconds>390)throw Error('Cold load threatens ten-minute cap; stopping before state transitions');
   async function settled(){
    await page.waitForFunction(()=>{const s=window.strataSite,m=s?.metadata();return s?.ready&&m?.scheduler.frames>0&&m.taskReport.tasks.filter(t=>t.name==='excavation-warm').length===4&&!m.scheduler.pendingFrame&&!m.scheduler.dirty&&!m.occlusion.pending&&!m.occlusion.pendingOperations&&s.markerReport().every(r=>r.workerFresh&&r.reason!=='pending-occlusion');},{timeout:120000});
    if(result.errors.length)throw Error(result.errors.join('\n'));if(expired||seconds()>530)throw Error('Stop before bounded GPU turn expires');
   }
   async function capture(id,year){
    phase=id;await settled();const evidence=await page.evaluate(()=>({year:window.strataSite.getYear(),metadata:window.strataSite.metadata(),markers:window.strataSite.markerReport(),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,canvasWidth:document.querySelector('#scene').width,canvasHeight:document.querySelector('#scene').height}}));
    const image=id+'.png';await page.screenshot({path:path.join(out,image)});const row={id,requestedYear:year,seconds:seconds(),image,imageSHA256:fileSHA256(path.join(out,image)),...evidence};result.states.push(row);fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(result,null,2)+'\n');console.log(id+' at'+row.seconds+'s; visible='+row.markers.filter(r=>r.visible).map(r=>r.featureId).join(','));
   }
   await capture('01-default-2023',2023);
   if(seconds()>420)throw Error('Cold load/settling threatens cap; remaining states not attempted');
   await page.evaluate(()=>window.strataSite.setYear(150,{instant:true}));await capture('02-kushan-150',150);
   await page.evaluate(()=>window.strataSite.setYear(2018,{instant:true}));await capture('03-excavation-2018',2018);
   await page.evaluate(()=>window.strataSite.setYear(150,{instant:true}));await settled();
   const active=await page.evaluate(()=>{const ids=['kushan-house','mauryan-drain'],reports=window.strataSite.markerReport();return ids.find(id=>reports.some(r=>r.featureId===id&&r.visible));});
   if(!active)throw Error('Neither requested active-pool target is visible in Kushan state; integration blocker preserved');
   result.activeFeature=active;await page.evaluate(id=>window.strataSite.setActiveFeature(id),active);
   await page.waitForFunction(id=>window.strataSite.metadata().emphasis.entries.some(e=>e.id===id&&e.opacity===1),{timeout:30000},active);await capture('04-active-marker-pool',150);
  }catch(error){result.failure={phase,message:error.message,seconds:seconds()};throw error;}
  finally{try{await browser?.close();}finally{await server?.close();clearTimeout(stop);result.gpuTurnSeconds=seconds();result.expired=expired;fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');}}
  if(expired||result.gpuTurnSeconds>570)throw Error('Site turn exceeded9.5-minute safety cap');
 });
 console.log(JSON.stringify({out,states:result.states.length,gpuTurnSeconds:result.gpuTurnSeconds,readySeconds:result.readySeconds,activeFeature:result.activeFeature}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
