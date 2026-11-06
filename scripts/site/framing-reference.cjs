'use strict';
// Framing reference: --dump rasters the 2013 block live (?framing=live) at 1440x900 and writes the record to ship as
// src/site/framing-reference.json; the default verifies the shipped record against a live raster at 1440x900 and
// 390x844 (block silhouettes within 0.5 px). Serves a production build under the project path. One bounded GPU
// turn; never overwrites an output folder.
// Usage: node scripts/site/framing-reference.cjs --dist output/site/deploy-dry-r8 --out output/site/framing-ref-r1 [--dump]
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const CAP_MS=540000,PORT=5188,LIMIT_PX=.5,VIEWPORTS=[[1440,900],[390,844]];
async function main(){
  const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];},dump=args.includes('--dump');
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/framing-ref-r1'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);
  fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,PORT),report={dist,mode:dump?'dump':'verify',runs:[],failures:[]};
  try{
    await withGpu('site:framing-reference',async()=>{
      let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
      try{
        browser=await launch({dumpio:args.includes('--dumpio')});
        for(const [width,height] of dump?VIEWPORTS.slice(0,1):VIEWPORTS){
          const page=await browser.newPage();page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
          await page.setViewport({width,height,deviceScaleFactor:1});await page.goto(server.url+BASE+(dump?'?framing=live':''),{waitUntil:'domcontentloaded'});
          await page.waitForFunction(()=>window.strataSite?.ready&&window.strataSite.metadata(),{polling:100});
          const result=await page.evaluate(()=>window.strataSite.verifyFraming());
          if(dump)fs.writeFileSync(path.join(out,'framing-reference.json'),JSON.stringify(result.liveRecord)+'\n');
          const {liveRecord,...rest}=result;report.runs.push({...rest,errors});await page.close();
          if(errors.length)report.failures.push(`${width}x${height}: page errors ${errors.join('; ')}`);
          if(!dump&&rest.source!=='shipped')report.failures.push(`${width}x${height}: reference was rastered live, not shipped`);
          if(!(rest.displacementPx<=LIMIT_PX))report.failures.push(`${width}x${height}: ${rest.displacementPx} px between shipped and live silhouettes`);
        }
      }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}
    });
  }finally{await server.close();}
  report.pass=report.failures.length===0;fs.writeFileSync(path.join(out,'framing-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({pass:report.pass,runs:report.runs.map(r=>({size:`${r.width}x${r.height}`,source:r.source,rowsEqual:r.rowsEqual,displacementPx:r.displacementPx})),failures:report.failures}));
  if(!report.pass)process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
