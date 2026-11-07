'use strict';
// Records the hero framing the 3D view used at the hero-still capture sizes (block scale k, centre, title scale)
// and the scale bar's world placement and label widths, in the shape capture-hero-still.cjs now writes, for stills
// captured before it recorded them. One bounded GPU turn; never overwrites an output folder.
// Usage: node scripts/site/hero-framing-probe.cjs --dist output/site/deploy-dry-rc3a --out output/site/hero-framing-rc3
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const {DEFAULT_SHOTS,heroRecord}=require('./capture-hero-still.cjs');
const CAP_MS=300000,PORT=5188;
async function main(){
  const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/hero-framing-r1'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);
  fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,PORT),report={dist:path.relative(root,dist).split(path.sep).join('/'),probe:true,shots:[]};
  try{
    await withGpu('site:hero-framing',async()=>{
      let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
      try{
        browser=await launch();
        for(const shot of DEFAULT_SHOTS){
          const page=await browser.newPage();page.setDefaultTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
          await page.setViewport({width:shot.width,height:shot.height,deviceScaleFactor:shot.deviceScaleFactor,isMobile:!!shot.touch,hasTouch:!!shot.touch});
          await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});
          await page.waitForFunction(()=>{const m=window.strataSite?.ready&&window.strataSite.metadata();return m&&m.loadTimeline.some(x=>x.name==='first-presented')&&!m.residency?.pending&&!m.scheduler.pendingFrame;},{polling:100});
          report.shots.push({...shot,errors,...await page.evaluate(heroRecord)});await page.close();
        }
      }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}
    });
  }finally{await server.close();}
  fs.writeFileSync(path.join(out,'hero-framing.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.shots.map(s=>({name:s.name,framing:s.framing,errors:s.errors}))));
  if(report.shots.some(s=>s.errors.length||!s.framing?.feasible))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
