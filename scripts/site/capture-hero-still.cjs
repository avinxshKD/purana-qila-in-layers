'use strict';
// Captures the hero stills the site shows from first paint until its first 3D frame is presented: the built site
// under the project path, canvas and scale labels only (HUD, markers and leaders hidden), at the landscape and
// portrait viewports. One bounded GPU turn; never overwrites an output folder.
// Usage: node scripts/site/capture-hero-still.cjs --dist dist --out output/site/hero-still-r1
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const CAP_MS=540000,PORT=5188;
const DEFAULT_SHOTS=[{name:'hero-landscape',width:1440,height:900,deviceScaleFactor:4/3},{name:'hero-portrait',width:390,height:844,deviceScaleFactor:2,touch:true}];
// The framing the still was taken at and the scale bar it shows: poster-layout.cjs maps the still onto any viewport
// from these (src/site/poster-layout.json).
function heroRecord(){
  const m=window.strataSite.metadata(),f=m.framing,s=m.scaleBar;
  return {framing:{feasible:f.feasible,mode:f.mode,k:f.k,centre:f.centre,titleScale:f.titleScale,referenceKeyMatches:f.reference.shippedKeyMatches},
    scaleBar:{placement:s.placement,labelWidths:s.labelWidths,cap:s.cap,gap:s.gap},viewport:{width:innerWidth,height:innerHeight}};
}
const HIDE='header,.era-panel,.scrubber,.marker,#leaders,.state-note,.scene-load-status{visibility:hidden!important}';
async function main(){
  const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/hero-still-r1'));
  // --review keeps the HUD and adds --years (default 150) at the landscape size, for design review.
  const review=args.includes('--review'),years=String(arg('--years','150')).split(',').map(Number);
  const SHOTS=review?[...DEFAULT_SHOTS.map(s=>({...s,name:s.name.replace('hero','review')})),...years.map(year=>({...DEFAULT_SHOTS[0],name:'review-year-'+year,year}))]:DEFAULT_SHOTS;
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);
  fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,PORT),report={dist,shots:[]};
  try{
    await withGpu('site:hero-still',async()=>{
      let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
      try{
        browser=await launch();
        for(const shot of SHOTS){
          const page=await browser.newPage();page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
          // Portrait is a phone: touch emulation makes (pointer: coarse) match, as the touch hint and marker sizes rely on.
          await page.setViewport({width:shot.width,height:shot.height,deviceScaleFactor:shot.deviceScaleFactor,isMobile:!!shot.touch,hasTouch:!!shot.touch});
          await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});
          await page.waitForFunction(()=>{const m=window.strataSite?.ready&&window.strataSite.metadata();return m&&m.loadTimeline.some(x=>x.name==='first-presented')&&!m.residency?.pending&&!m.scheduler.pendingFrame;},{polling:100});
          await new Promise(r=>setTimeout(r,800));
          if(shot.year!==undefined){await page.evaluate(y=>window.strataSite.setYear(y,{instant:true}),shot.year);
            await page.waitForFunction(()=>{const m=window.strataSite.metadata();return !m.residency?.pending&&!m.scheduler.pendingFrame;},{polling:100});await new Promise(r=>setTimeout(r,800));}
          if(!review)await page.addStyleTag({content:HIDE});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
          const file=path.join(out,shot.name+'.jpg');await page.screenshot({path:file,type:'jpeg',quality:82});
          const m={...await page.evaluate(()=>{const m=window.strataSite.metadata(),h=document.querySelector('#marker-hint');return {loadTimeline:m.loadTimeline,programs:m.programs,pointerCoarse:matchMedia('(pointer: coarse)').matches,hint:h&&!h.hidden?h.textContent:null};}),...await page.evaluate(heroRecord)};
          if(!!shot.touch!==m.pointerCoarse)errors.push(`pointer: coarse is ${m.pointerCoarse} with touch ${!!shot.touch}`);
          report.shots.push({...shot,file,bytes:fs.statSync(file).size,errors,...m});await page.close();
        }
      }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}
    });
  }finally{await server.close();}
  fs.writeFileSync(path.join(out,'hero-still.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report.shots.map(s=>({name:s.name,bytes:s.bytes,pointerCoarse:s.pointerCoarse,hint:s.hint,errors:s.errors}))));
  if(report.shots.some(s=>s.errors.length))process.exitCode=1;
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={DEFAULT_SHOTS,heroRecord};
