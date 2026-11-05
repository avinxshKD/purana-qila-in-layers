'use strict';
// Pool A/B on the dev server at 1440x900: the Kushan state with the kushan-house pool active, once with the film's
// full-size field set (?pools=film, 512x512 RGBA) and once with the shipped site set (8-bit crops). Writes both stills,
// a difference image (x16) and pixel statistics. Also records which pool fields each load fetched. One GPU turn.
// Usage: node scripts/site/pool-ab-capture.cjs [--out output/site/pool-ab-r1]
const fs=require('node:fs'),path=require('node:path'),{root,launch,serve}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{activePoolPredicate}=require('./active-pool.cjs'),{ffmpeg,run,bin}=require('../media.cjs');
const CAP_MS=540000,FEATURE='kushan-house',YEAR=150;
async function main(){
  const args=process.argv.slice(2),i=args.indexOf('--out'),out=path.resolve(root,i<0?'output/site/pool-ab-r1':args[i+1]),reportFile=path.join(out,'pool-ab.json');
  if(fs.existsSync(reportFile))throw new Error('Preserve '+reportFile);fs.mkdirSync(out,{recursive:true});
  const result={feature:FEATURE,year:YEAR,viewport:'1440x900 DPR1',runs:[],errors:[]};
  await withGpu('site:pool-ab',async()=>{
    const start=performance.now(),seconds=()=>+((performance.now()-start)/1000).toFixed(1);let browser,server;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
    try{
      server=await serve({port:5188});browser=await launch();
      for(const variant of ['film','site']){
        const page=await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});page.setDefaultTimeout(240000);
        page.on('pageerror',e=>result.errors.push(variant+': '+e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(variant+': '+m.text());});
        const query=variant==='film'?'?pools=film':'';await page.goto(server.url+'/site.html'+query,{waitUntil:'domcontentloaded'});
        await page.waitForFunction(()=>window.strataSite?.ready&&window.strataSite.metadata(),{timeout:360000});const readySeconds=seconds();
        const atReady=await page.evaluate(()=>({pools:window.strataSite.metadata().pools,fetched:performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname).filter(p=>/site-pools|film-emphasis/.test(p))}));
        await page.evaluate(y=>window.strataSite.setYear(y,{instant:true}),YEAR);
        const settled=()=>page.waitForFunction(()=>{const s=window.strataSite,m=s?.metadata();return m?.scheduler.frames>0&&!m.scheduler.pendingFrame&&!m.scheduler.dirty&&!m.occlusion.pending&&!m.occlusion.pendingOperations&&!(m.residency?.pending)&&m.layout?.fresh&&s.markerReport().every(r=>r.workerFresh&&r.reason!=='pending-occlusion');},{timeout:120000,polling:250});
        await settled();await page.evaluate(id=>window.strataSite.setActiveFeature(id),FEATURE);
        await page.waitForFunction(activePoolPredicate(FEATURE),{timeout:30000,polling:100});await settled();await new Promise(r=>setTimeout(r,400));
        const image=path.join(out,`kushan-house-${variant}.png`);await page.screenshot({path:image});
        const evidence=await page.evaluate(()=>{const m=window.strataSite.metadata();return {pools:m.pools,emphasis:m.emphasis,poolHashes:m.poolFieldHashes?.['kushan-house']??null};});
        result.runs.push({variant,readySeconds,atReady,image,evidence,seconds:seconds()});await page.close();
        console.log(`${variant}: ready ${readySeconds}s, fetched at ready ${atReady.fetched.length}, captured at ${seconds()}s`);
      }
    }finally{clearTimeout(stop);await browser?.close().catch(()=>{});await server?.close();result.gpuTurnSeconds=seconds();}
  });
  const [a,b]=result.runs.map(r=>r.image),diff=path.join(out,'difference-x16.png');
  ffmpeg(['-i',a,'-i',b,'-filter_complex','[0][1]blend=all_mode=difference,lutrgb=r=val*16:g=val*16:b=val*16','-frames:v','1',diff]);
  const raw=f=>Buffer.from(run(bin('ffmpeg'),['-v','error','-i',f,'-f','rawvideo','-pix_fmt','rgb24','-'],{encoding:'buffer',maxBuffer:64*1024*1024}).stdout);
  const pa=raw(a),pb=raw(b);let differing=0,max=0;for(let k=0;k<pa.length;k+=3){const d=Math.max(Math.abs(pa[k]-pb[k]),Math.abs(pa[k+1]-pb[k+1]),Math.abs(pa[k+2]-pb[k+2]));if(d){differing++;if(d>max)max=d;}}
  result.difference={image:diff,pixels:pa.length/3,differingPixels:differing,maxChannelDifference:max,identical:differing===0};
  const sheet=path.join(out,'kushan-house-film-vs-site.png');ffmpeg(['-i',a,'-i',b,'-filter_complex','hstack=inputs=2','-frames:v','1',sheet]);result.sheet=sheet;
  fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({difference:result.difference,errors:result.errors,gpuTurnSeconds:result.gpuTurnSeconds}));
  if(result.errors.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
