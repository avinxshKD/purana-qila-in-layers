'use strict';
// State-title review stills of a built site, full HUD over the live 3D view, in one bounded GPU turn: the 2022–23
// stop at 1440x900, 390x844 and 360x780, Mughal (1650) at 1440x900, and the 2022–23 stop in a 1280x540 window.
// Never overwrites an output folder.
// Usage: node scripts/site/title-stills.cjs --dist output/site/deploy-dry-rc3n --out output/review/title-size-rc3n
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const PORT=5188,CAP_MS=540000,PHONE={deviceScaleFactor:2,isMobile:true,hasTouch:true};
const SHOTS=[['2022-23-1440x900',1440,900,{deviceScaleFactor:4/3},2023],['2022-23-390x844',390,844,PHONE,2023],['2022-23-360x780',360,780,PHONE,2023],['mughal-1440x900',1440,900,{deviceScaleFactor:4/3},1650],['2022-23-1280x540',1280,540,{deviceScaleFactor:1},2023]];
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist')),out=path.resolve(root,arg('--out'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,PORT),report={dist:path.relative(root,dist).split(path.sep).join('/'),shots:[]};
  try{await withGpu('site:title-stills',async()=>{let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
    try{browser=await launch({headless:true});
      for(const [name,width,height,extra,year] of SHOTS){
        const page=await browser.newPage();page.setDefaultTimeout(120000);await page.setViewport({width,height,deviceScaleFactor:1,...extra});
        await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});
        const settled=()=>page.waitForFunction(()=>{const m=window.strataSite?.ready&&window.strataSite.metadata();return m&&m.loadTimeline.some(x=>x.name==='first-presented')&&!m.residency?.pending&&!m.scheduler.pendingFrame;},{polling:100});
        await settled();if(year!==2023){await page.evaluate(y=>window.strataSite.setYear(y,{instant:true}),year);await settled();}
        await page.evaluate(()=>document.fonts.ready);await new Promise(r=>setTimeout(r,800));
        const file=path.join(out,name+'.png');await page.screenshot({path:file});
        report.shots.push({name,file:path.relative(root,file).split(path.sep).join('/'),...await page.evaluate(()=>({era:document.querySelector('#era-title').textContent,eraPx:parseFloat(getComputedStyle(document.querySelector('#era-title')).fontSize),sitePx:parseFloat(getComputedStyle(document.querySelector('#site-title')).fontSize),titleScale:window.strataSite.metadata().framing.titleScale}))});
        await page.close();}
    }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}});
  }finally{await server.close();}
  fs.writeFileSync(path.join(out,'title-stills.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.shots));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
