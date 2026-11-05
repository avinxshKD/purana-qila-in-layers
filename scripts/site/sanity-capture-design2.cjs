'use strict';
// Site design-pass round 2 sanity on a pinned snapshot: default 1440x900 with the first-view hint, the scale bar
// crop, then a 390x844 DPR2 phone default, its scale bar crop and the phone Kushan state with labels. One GPU turn.
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('../film/static-server.cjs'),{verifySnapshot,fileSHA256}=require('../film/f2-contract.cjs');
const CAP_MS=570000;
async function main(){
 const args=process.argv.slice(2),i=args.indexOf('--out'),out=path.resolve(i<0?path.join(root,'output/site/sanity-m2b-r3'):args[i+1]),manifest=verifySnapshot(out),reportFile=path.join(out,'sanity-report.json');if(fs.existsSync(reportFile))throw Error('Preserve completed site sanity');
 const result={snapshotSHA256:manifest.snapshotSHA256,candidate:JSON.parse(fs.readFileSync(path.join(out,'candidate-source.json'))),purpose:'Design pass round 2 sanity (hint, dots, phone framing, scale bar); not look or performance acceptance',states:[],errors:[]};
 await withGpu('site:design-pass-2-sanity',async()=>{
  const start=performance.now(),seconds=()=>Number(((performance.now()-start)/1000).toFixed(3));let browser,server,expired=false,phase='launch';
  const stop=setTimeout(()=>{expired=true;browser?.close().catch(()=>{});},CAP_MS);
  try{
   server=await servePinned({folder:path.join(out,'snapshot'),port:5188});browser=await launch();const page=(await browser.pages())[0]||await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});page.setDefaultTimeout(150000);
   page.on('pageerror',error=>result.errors.push(error.message));page.on('console',message=>{if(message.type()==='error'||message.type()==='warning')result.errors.push(message.type()+': '+message.text());});
   phase='cold-load';await page.goto(server.url+'/site.html',{waitUntil:'domcontentloaded',timeout:360000});await page.waitForFunction(()=>window.strataSite?.ready&&window.strataSite.metadata(),{timeout:360000});result.readySeconds=seconds();
   if(result.readySeconds>360)throw Error('Cold load threatens ten-minute cap');
   async function settled(){
    await page.waitForFunction(()=>{const s=window.strataSite,m=s?.metadata();return s?.ready&&m?.scheduler.frames>0&&!m.scheduler.pendingFrame&&!m.scheduler.dirty&&!m.occlusion.pending&&!m.occlusion.pendingOperations&&!(m.residency?.pending)&&m.layout?.fresh&&s.markerReport().every(r=>r.workerFresh&&r.reason!=='pending-occlusion');},{timeout:120000,polling:250});
    if(result.errors.some(e=>!e.startsWith('warning:')))throw Error(result.errors.join('\n'));if(expired||seconds()>540)throw Error('Stop before bounded GPU turn expires');
   }
   const evidence=()=>page.evaluate(()=>{const m=window.strataSite.metadata(),hud=window.strataSite.hudRects(),box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
    const gap=(a,b)=>Math.hypot(Math.max(0,a.x-(b.x+b.width),b.x-(a.x+a.width)),Math.max(0,a.y-(b.y+b.height),b.y-(a.y+a.height)));
    const hint=document.querySelector('#marker-hint'),title=document.querySelector('#era-title'),dots=[...document.querySelectorAll('.marker:not([hidden])')].map(b=>({hit:b.getBoundingClientRect().width,dot:getComputedStyle(b,'::before').width}));
    const scaleLabels=[...document.querySelectorAll('.scale-label')].map(n=>({text:n.textContent,hidden:n.hidden,opacity:n.style.opacity,fontSize:n.style.fontSize,rect:box(n)}));
    return {year:window.strataSite.getYear(),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},hint:{text:hint.textContent,hidden:hint.hidden,rect:box(hint)},title:{fontSize:getComputedStyle(title).fontSize,titleScale:document.querySelector('.era-panel').style.getPropertyValue('--title-scale')},
     dots:dots.slice(0,3),dotCount:dots.length,layout:m.layout,framing:m.framing,scaleBar:m.scaleBar,scaleLabelsDOM:scaleLabels,
     labelHudGaps:m.layout.placed.flatMap(p=>hud.map(h=>({label:p.featureId,hud:h.id,gap:gap(p.rect,h.rect)}))),scaleHudGaps:(m.scaleBar.labels||[]).flatMap(l=>hud.map(h=>({label:l.text,hud:h.id,gap:gap(l.rect,h.rect)}))),markers:window.strataSite.markerReport()};});
   async function capture(id,year,extra={}){
    phase=id;await settled();await new Promise(r=>setTimeout(r,300));const e=await evidence(),image=id+'.png';await page.screenshot({path:path.join(out,image)});
    const min=list=>list.length?Math.min(...list.map(g=>g.gap)):null,row={id,requestedYear:year,seconds:seconds(),image,imageSHA256:fileSHA256(path.join(out,image)),minLabelHudGap:min(e.labelHudGaps),minScaleLabelHudGap:min(e.scaleHudGaps),labelled:e.layout.placed.map(p=>p.featureId+':'+p.kind),...extra,...e};
    result.states.push(row);fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(result,null,2)+'\n');
    console.log(`${id} at ${row.seconds}s; labels=${row.labelled.join(',')}; failures=${e.layout.failures.length}; minHudGap=${row.minLabelHudGap}; scale opacity=${e.scaleBar.opacity}; scaleHudGap=${row.minScaleLabelHudGap}; framing=${e.framing.mode} w=${e.framing.widthFraction??''} title=${e.framing.titleScale}; hint=${e.hint.hidden?'hidden':e.hint.text}; dots=${JSON.stringify(e.dots[0]||null)}`);
    return e;
   }
   async function crop(id,e,pad=36){
    const s=e.scaleBar;if(!s.polygon)throw Error('Scale bar not visible for crop '+id);
    const xs=[...s.polygon.map(p=>p.x),...s.labels.flatMap(l=>[l.rect.x,l.rect.x+l.rect.width])],ys=[...s.polygon.map(p=>p.y),...s.labels.flatMap(l=>[l.rect.y,l.rect.y+l.rect.height])];
    const x=Math.max(0,Math.min(...xs)-pad),y=Math.max(0,Math.min(...ys)-pad),clip={x,y,width:Math.min(e.viewport.width-x,Math.max(...xs)-x+pad),height:Math.min(e.viewport.height-y,Math.max(...ys)-y+pad)};
    const image=id+'.png';await page.screenshot({path:path.join(out,image),clip,captureBeyondViewport:false});result.states.push({id,image,imageSHA256:fileSHA256(path.join(out,image)),clip,crop:true});console.log(id+' crop '+JSON.stringify(clip));
   }
   const d=await capture('01-default-2023-1440x900-hint',2023);await crop('02-scale-bar-crop-1440x900',d);
   if(seconds()>400)throw Error('Desktop used the budget; phone states not attempted');
   await page.setViewport({width:390,height:844,deviceScaleFactor:2});const p=await capture('03-phone-default-2023-390x844-dpr2',2023,{note:'Phone size and DPR on desktop Chrome, no touch emulation'});await crop('04-scale-bar-crop-phone',p,24);
   await page.evaluate(()=>window.strataSite.setYear(150,{instant:true}));await capture('05-phone-kushan-150-390x844-dpr2',150);
  }catch(error){result.failure={phase,message:error.message,seconds:seconds()};throw error;}
  finally{try{await browser?.close();}finally{await server?.close();clearTimeout(stop);result.gpuTurnSeconds=seconds();result.expired=expired;fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');}}
  if(expired||result.gpuTurnSeconds>CAP_MS/1000)throw Error('Site turn exceeded 9.5-minute safety cap');
 });
 console.log(JSON.stringify({out,states:result.states.length,gpuTurnSeconds:result.gpuTurnSeconds,readySeconds:result.readySeconds}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
