'use strict';
// Turn-upright screen on a built site, one bounded GPU turn, one page: at 844x390 and 667x375 touch the screen covers
// the page (every tap point hits it, the page under it is inert, its parts do not overlap), the 3D view idles behind
// it, and the film opens, plays and closes from it; turning 844x390 to 390x844 (no reload) removes it and leaves the
// 3D view running, framed as on a fresh portrait load, with passing labels at Kushan 150 CE; at 844x390 with a fine
// pointer there is no screen. Stills of each. Never overwrites an output folder.
// Usage: node scripts/site/rotate-check.cjs --dist output/site/deploy-dry-rc3f --out output/site/rotate-check-rc3f
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const PORT=5188,CAP_MS=900000,phone=(width,height)=>({width,height,deviceScaleFactor:2,isMobile:true,hasTouch:true}),sleep=ms=>new Promise(r=>setTimeout(r,ms));
function screenState(){
  const screen=document.querySelector('#rotate-screen'),cs=getComputedStyle(screen),r=screen.getBoundingClientRect(),vw=innerWidth,vh=innerHeight;
  let missed=0,points=0;for(let x=2;x<vw;x+=20)for(let y=2;y<vh;y+=20){points++;const top=document.elementFromPoint(x,y);if(!top||!screen.contains(top))missed++;}
  const parts=[...screen.children].map(e=>{const b=e.getBoundingClientRect();return {tag:e.tagName.toLowerCase(),text:e.textContent,x:b.x,y:b.y,width:b.width,height:b.height};});
  const overlaps=[];for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){const a=parts[i],b=parts[j];if(a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height)overlaps.push(a.tag+'/'+b.tag);}
  return {shown:cs.display!=='none'&&cs.visibility!=='hidden',covers:r.x<=0&&r.y<=0&&r.right>=vw&&r.bottom>=vh,tapPoints:points,tapPointsMissed:missed,parts,overlaps,partsInside:parts.every(p=>p.x>=0&&p.y>=0&&p.x+p.width<=vw&&p.y+p.height<=vh),
    inert:Object.fromEntries(['#viewport','header','.era-panel','.scrubber'].map(s=>[s,document.querySelector(s).inert])),sceneState:window.strataSite?.sceneState?.()??null};
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/rotate-check-r1'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,PORT),report={dist:path.relative(root,dist).split(path.sep).join('/'),cases:[]};
  try{
    await withGpu('site:rotate-check',async()=>{
      let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
      try{
        browser=await launch({headless:true});const page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(120000);let errors=[];
        page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
        const settled=()=>page.waitForFunction(()=>{const m=window.strataSite?.metadata?.();return !!m&&m.loadTimeline.some(x=>x.name==='first-presented')&&m.anchors.mode!=='nearest'&&!m.anchors.refining&&!m.anchors.easing&&!m.residency?.pending&&!m.scheduler?.pendingFrame&&!m.occlusion?.pending;},{polling:100,timeout:90000}).then(()=>true,()=>false);
        const open=async viewport=>{errors=[];await page.goto('about:blank');await page.setViewport(viewport);await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.strataSite?.ready,{polling:100});};
        const labels=()=>page.evaluate(()=>{const m=window.strataSite.metadata(),l=m.layout||{},f=m.framing;return {mode:f.mode,k:f.k,titleScale:f.titleScale,placed:(l.placed||[]).length,failures:(l.failures||[]).length,audit:l.audit?.passes??null,minimumClearance:l.audit?.minimumClearance??null,hudMin:Math.min(...(l.hudClearances||[]).map(h=>h.clearance))};});
        for(const viewport of [phone(844,390),phone(667,375)]){
          const v=`${viewport.width}x${viewport.height}`;await open(viewport);const sceneSettled=await settled();await sleep(500);
          const state=await page.evaluate(screenState);
          const r0=await page.evaluate(()=>window.strataSite.metadata()?.renderCount??null);await sleep(3000);const r1=await page.evaluate(()=>window.strataSite.metadata()?.renderCount??null);
          await page.screenshot({path:path.join(out,`${v}-screen.png`)});
          await page.tap('#rotate-screen button');await page.waitForFunction(()=>document.querySelector('#film-dialog').open,{timeout:5000}).catch(()=>errors.push('film dialog did not open'));
          const played=await page.waitForFunction(()=>document.querySelector('#film-video').currentTime>0.5,{timeout:20000,polling:100}).then(()=>true,()=>false);
          const film=await page.evaluate(()=>{const d=document.querySelector('#film-dialog').getBoundingClientRect(),v=document.querySelector('#film-video'),b=v.getBoundingClientRect();return {open:document.querySelector('#film-dialog').open,currentTime:v.currentTime,paused:v.paused,error:v.error?.code??null,dialog:{x:d.x,y:d.y,width:d.width,height:d.height},video:{x:b.x,y:b.y,width:b.width,height:b.height},inside:d.x>=0&&d.y>=0&&d.right<=innerWidth&&d.bottom<=innerHeight,videoInside:b.x>=d.x&&b.y>=d.y&&b.right<=d.right&&b.bottom<=d.bottom&&b.bottom<=innerHeight};});
          await page.screenshot({path:path.join(out,`${v}-film.png`)});
          await page.tap('#film-dialog .close');await sleep(400);
          const closed=await page.evaluate(()=>({open:document.querySelector('#film-dialog').open,paused:document.querySelector('#film-video').paused,screenShown:getComputedStyle(document.querySelector('#rotate-screen')).display!=='none'}));
          const fails=[];if(!state.shown)fails.push('screen not shown');if(!state.covers)fails.push('screen does not cover');if(state.tapPointsMissed)fails.push(state.tapPointsMissed+' tap points reach the page');if(state.overlaps.length)fails.push('overlap '+state.overlaps);if(!state.partsInside)fails.push('part outside');
          if(Object.values(state.inert).some(x=>!x))fails.push('page not inert');if(r0!=null&&r1!==r0)fails.push(`rendered ${r1-r0} frames in 3 s behind the screen`);if(!film.open||!played)fails.push('film did not play');if(!film.inside)fails.push('film dialog outside the viewport');if(!film.videoInside)fails.push('video spills out of the dialog');
          if(closed.open||!closed.paused)fails.push('film did not close');if(errors.length)fails.push('errors');
          const row={case:'sideways',viewport:v,sceneSettled,sceneState:state.sceneState,state,renderCount:[r0,r1],film:{...film,played},closed,errors:[...errors],pass:!fails.length,fails};report.cases.push(row);console.log('CASE',row.case,v,row.pass?'pass':'FAIL',fails.join('; '),JSON.stringify({parts:state.parts.map(p=>p.tag),film:{played,video:film.video}}));
          if(v!=='844x390')continue;
          // Turn the phone upright on the same page.
          await page.evaluate(()=>{window.__notReloaded=true;});await page.setViewport(phone(390,844));await sleep(300);
          const upright=await page.evaluate(()=>({reloaded:!window.__notReloaded,hudOverlaps:(()=>{const r=s=>document.querySelector(s).getBoundingClientRect(),hit=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom,era=r('.era-panel');return ['header','.scrubber'].filter(s=>hit(r(s),era));})(),screenShown:getComputedStyle(document.querySelector('#rotate-screen')).display!=='none',inert:['#viewport','header','.era-panel','.scrubber'].some(s=>document.querySelector(s).inert),sceneState:window.strataSite.sceneState()}));
          const ok1=await settled();await sleep(500);const first=await labels();
          await page.evaluate(()=>window.strataSite.setYear(150,{instant:true}));const ok2=await settled();await sleep(700);const kushan=await labels();
          await page.screenshot({path:path.join(out,'844x390-to-390x844-kushan-150.png')});
          // Fresh portrait load for the framing it should match.
          await open(phone(390,844));await settled();const fresh=await labels();
          const f2=[];if(upright.reloaded)f2.push('page reloaded');if(upright.hudOverlaps.length)f2.push('state title overlaps '+upright.hudOverlaps);if(upright.screenShown)f2.push('screen still shown');if(upright.inert)f2.push('page still inert');if(upright.sceneState!=='running')f2.push('scene '+upright.sceneState);if(!ok1||!ok2)f2.push('not settled');
          if(first.mode!=='portrait-band'||Math.abs(first.k/fresh.k-1)>1e-6||first.titleScale!==fresh.titleScale)f2.push(`framing ${first.mode} k ${first.k} vs fresh ${fresh.k}`);
          if(kushan.failures||kushan.audit!==true||!kushan.placed)f2.push(`labels placed ${kushan.placed} failures ${kushan.failures} audit ${kushan.audit}`);if(kushan.hudMin<24)f2.push('label HUD clearance '+kushan.hudMin);if(errors.length)f2.push('errors');
          const r2={case:'turn-upright',viewport:'844x390->390x844',upright,firstView:first,kushan150:kushan,freshPortrait:fresh,errors:[...errors],pass:!f2.length,fails:f2};report.cases.push(r2);console.log('CASE turn-upright',r2.pass?'pass':'FAIL',f2.join('; '),JSON.stringify({first,kushan,fresh:fresh.k}));
        }
        await open({width:844,height:390,deviceScaleFactor:1});const ok3=await settled();await sleep(500);const fine=await page.evaluate(screenState);await page.screenshot({path:path.join(out,'844x390-fine-pointer.png')});
        const f3=[];if(fine.shown)f3.push('screen shown with a fine pointer');if(Object.values(fine.inert).some(Boolean))f3.push('page inert');if(!ok3||fine.sceneState!=='running')f3.push('3D not running: '+fine.sceneState);
        report.cases.push({case:'fine-pointer',viewport:'844x390',state:fine,errors:[...errors],pass:!f3.length,fails:f3});console.log('CASE fine-pointer 844x390',f3.length?'FAIL '+f3.join('; '):'pass');
      }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}
    });
  }finally{await server.close();}
  fs.writeFileSync(path.join(out,'rotate-check.json'),JSON.stringify(report,null,2)+'\n');
  if(report.cases.some(c=>!c.pass))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
