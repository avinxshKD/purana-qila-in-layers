'use strict';
// Pool check on the built site (tier world) at 1440x900 DPR1: the Kushan state (150 CE) with the kushan-house pool
// active, beside the old-world reference still from pool-ab-capture.cjs. Writes the tier still, the side-by-side
// sheet and the emphasis evidence (active slot, light state). One GPU turn; never overwrites an output folder.
// Usage: node scripts/site/tier-pool-check.cjs --dist output/site/deploy-dry-r10 --out output/site/tier-pool-r1
//        [--reference output/site/pool-ab-r1/kushan-house-site.png]
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{activePoolPredicate}=require('./active-pool.cjs'),{BASE,serveDist}=require('./deploy-check.cjs'),{ffmpeg}=require('../media.cjs');
const CAP_MS=540000,PORT=5188,FEATURE='kushan-house',YEAR=150;
async function main(){
  const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/tier-pool-r1')),reference=path.resolve(root,arg('--reference','output/site/pool-ab-r1/kushan-house-site.png'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);if(!fs.existsSync(reference))throw new Error('No reference still '+reference);
  fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,PORT),result={dist,reference,feature:FEATURE,year:YEAR,viewport:'1440x900 DPR1',errors:[]};
  try{
    await withGpu('site:tier-pool',async()=>{
      let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
      try{
        browser=await launch();const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});page.setDefaultTimeout(240000);
        page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)result.errors.push(`HTTP ${r.status()} ${r.url()}`);});
        await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>window.strataSite?.ready&&window.strataSite.metadata(),{timeout:360000});
        await page.evaluate(y=>window.strataSite.setYear(y,{instant:true}),YEAR);
        const settled=()=>page.waitForFunction(()=>{const s=window.strataSite,m=s?.metadata();return m?.scheduler.frames>0&&!m.scheduler.pendingFrame&&!m.scheduler.dirty&&!m.occlusion?.pending&&!m.occlusion?.pendingOperations&&!(m.residency?.pending)&&m.layout?.fresh&&s.markerReport().every(r=>r.workerFresh&&r.reason!=='pending-occlusion');},{timeout:120000,polling:250});
        await settled();await page.evaluate(id=>window.strataSite.setActiveFeature(id),FEATURE);
        await page.waitForFunction(activePoolPredicate(FEATURE),{timeout:60000,polling:100});await settled();await new Promise(r=>setTimeout(r,400));
        result.image=path.join(out,'kushan-house-tier.png');await page.screenshot({path:result.image});
        result.evidence=await page.evaluate(id=>{const m=window.strataSite.metadata();return {world:m.world??m.backend??null,emphasis:m.emphasis,pools:m.pools,marker:window.strataSite.markerReport().find(r=>r.featureId===id)??null};},FEATURE);
      }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}
    });
  }finally{await server.close();}
  // Reference (old world) on the left, tier world on the right.
  result.sheet=path.join(out,'kushan-house-reference-vs-tier.png');ffmpeg(['-i',reference,'-i',result.image,'-filter_complex','hstack=inputs=2','-frames:v','1',result.sheet]);
  fs.writeFileSync(path.join(out,'tier-pool.json'),JSON.stringify(result,null,2)+'\n');
  const lit=(result.evidence?.emphasis?.lights||[]).filter(l=>l.intensity>0).length;
  console.log(JSON.stringify({image:result.image,sheet:result.sheet,activeFeature:result.evidence?.emphasis?.activeFeature,litLights:lit,errors:result.errors}));
  if(result.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
