'use strict';
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer-core');
const {root,executable}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs'),{installGestureTelemetry}=require('./gesture-telemetry.cjs'),{sha256}=require('../media.cjs');
const base=path.join(root,'output','site','perf-r2-r1'),source=path.join(base,'candidate-r3','snapshot'),out=path.join(base,'restore-submission-r1'),reports=[];
function gateInitialRaf(){
  const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),held=new Map();let gated=true,fake=-1;
  window.requestAnimationFrame=callback=>{if(!gated)return request(callback);const id=fake--;held.set(id,{callback});return id;};
  window.cancelAnimationFrame=id=>{const item=held.get(id);if(item){if(item.nativeId)cancel(item.nativeId);held.delete(id);}else cancel(id);};
  window.__releaseSiteRaf=()=>{gated=false;for(const [id,item]of held)item.nativeId=request(time=>{held.delete(id);item.callback(time);});};
}
async function settle(page){
  await page.waitForFunction(()=>{const m=window.strataSite.metadata();if(m.occlusion.error)throw new Error(m.occlusion.error);return !m.scheduler.pendingFrame&&!m.resolution.interacting&&!m.occlusion.pending;},{polling:50});
}
async function main(){
  if(fs.existsSync(path.join(out,'results.json')))throw new Error('Preserve delivered restoration proof');
  fs.mkdirSync(out,{recursive:true});fs.copyFileSync(__filename,path.join(out,'measurement-harness.cjs'));fs.copyFileSync(path.join(__dirname,'gesture-telemetry.cjs'),path.join(out,'gesture-telemetry.cjs'));
  const manifest=JSON.parse(fs.readFileSync(path.join(base,'candidate-r3','snapshot-manifest.json')));
  for(const [file,hash]of Object.entries(manifest.files))if(sha256(fs.readFileSync(path.join(source,file)))!==hash)throw new Error('Frozen candidate changed');
  const server=await servePinned({folder:source,port:5188});let browser,page,deadline;
  async function turn(name,callback){await withGpu('site:restore-submit:'+name,async()=>{
    const start=performance.now();deadline=setTimeout(()=>browser?.close().catch(()=>{}),110000);
    try{await callback();}finally{clearTimeout(deadline);console.log(name+' lock seconds '+((performance.now()-start)/1000).toFixed(2));}
  });}
  try{
    for(const dpr of [1,2]){
      await turn('construct-dpr'+dpr,async()=>{
        browser=await puppeteer.launch({executablePath:executable(),headless:false,protocolTimeout:300000,args:['--force-color-profile=srgb','--hide-scrollbars','--no-first-run','--window-size=1500,1040']});
        page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(100000);await page.evaluateOnNewDocument(gateInitialRaf);
        await page.setViewport({width:1440,height:900,deviceScaleFactor:dpr});await page.goto(server.url+'/site.html');await page.waitForFunction(()=>window.strataSite?.ready,{polling:100});
      });
      await turn('first-draw-dpr'+dpr,async()=>{await page.evaluate(()=>window.__releaseSiteRaf());await settle(page);await page.evaluate(installGestureTelemetry);});
      for(const kind of ['orbit','zoom','scrub'])await turn(kind+'-dpr'+dpr,async()=>{
        const before=await page.evaluate(()=>window.strataSite.metadata().occlusion.queries),canvas=await page.$eval('#scene',node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
        if(kind==='orbit'){await page.mouse.move(canvas.x+canvas.width*.8,canvas.y+canvas.height*.55);await page.mouse.down();await page.mouse.move(canvas.x+canvas.width*.8+32,canvas.y+canvas.height*.55+8,{steps:3});}
        if(kind==='zoom'){await page.mouse.move(canvas.x+canvas.width*.8,canvas.y+canvas.height*.55);await page.mouse.wheel({deltaY:45});}
        if(kind==='scrub'){const r=await page.$eval('#timeline',node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};});await page.mouse.move(r.x+r.width*.5,r.y+12);await page.mouse.down();await page.mouse.move(r.x+r.width*.55,r.y+12,{steps:3});}
        const lowHandle=await page.waitForFunction(()=>{const m=window.strataSite.metadata();return m.effectiveDpr===.55?m:false;}),low=await lowHandle.jsonValue();await lowHandle.dispose();
        if(kind!=='zoom')await page.mouse.up();await settle(page);
        const row=await page.evaluate(()=>{
          const m=window.strataSite.metadata(),trace=window.__siteGestureTrace,occlusionTasks=m.taskReport.tasks.filter(t=>t.name.startsWith('occlusion-')&&t.startTimeMs>=trace.stopAt);
          return {trace:{...trace},timerDelayMs:m.resolution.lastRestorationDelayMs,effectiveDpr:m.effectiveDpr,fullFrameSubmitAfterStopMs:trace.firstFullSubmit===null?null:trace.firstFullSubmit-trace.stopAt,
            occlusionMainMaximumMs:Math.max(0,...occlusionTasks.map(t=>t.durationMs)),postInputLongTasks:m.taskReport.longTasksOver50ms.filter(t=>t.startTimeMs+t.durationMs>=trace.stopAt),occlusion:m.occlusion};
        });
        reports.push({dpr,kind,observedLowDpr:low.effectiveDpr,interactiveOcclusionRays:low.occlusion.queries-before,...row});fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(reports,null,2)+'\n');
        console.log(JSON.stringify({dpr,kind,firstFullSubmitMs:row.fullFrameSubmitAfterStopMs,timerMs:row.timerDelayMs,occlusionMainMaximumMs:row.occlusionMainMaximumMs}));
      });
      await turn('close-dpr'+dpr,async()=>{await browser.close();browser=undefined;});
    }
  }finally{clearTimeout(deadline);if(browser)await browser.close();await server.close();}
  const summary={snapshotSha256:manifest.sha256,headed:true,firstFullSubmissionWithin250ms:reports.every(r=>r.fullFrameSubmitAfterStopMs!==null&&r.fullFrameSubmitAfterStopMs<=250),postInputOcclusionMainTasksWithin50ms:reports.every(r=>r.occlusionMainMaximumMs<=50),interactiveOcclusionRays:reports.reduce((n,r)=>n+r.interactiveOcclusionRays,0),reports,
    caveat:'First native-size frame CPU submission measured after pointer-up/wheel capture. This is not a GPU completion timer or physical presentation timestamp.'};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({firstFullSubmissionWithin250ms:summary.firstFullSubmissionWithin250ms,postInputOcclusionMainTasksWithin50ms:summary.postInputOcclusionMainTasksWithin50ms,interactiveOcclusionRays:summary.interactiveOcclusionRays}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
