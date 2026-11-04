'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs'),{bin}=require('../media.cjs');
const {gateInitialRaf,settle,decode}=require('./site-pixel-proof.cjs'),{maskedDifference,ghostMask}=require('./marker-mask.cjs'),{encode}=require('./site-pixel-proof.cjs');
const base=path.join(root,'output','site','perf-r2-r1'),out=path.join(base,'pixel-css-only-r1'),rows=[];
async function main(){
  if(fs.existsSync(out))throw new Error('Preserve CSS-only proof');fs.mkdirSync(out);fs.copyFileSync(__filename,path.join(out,'measurement-harness.cjs'));
  const server=await servePinned({folder:path.join(base,'baseline','snapshot'),port:5188});let browser,page,deadline;
  async function turn(name,callback){await withGpu('site:css-only:'+name,async()=>{const start=performance.now();deadline=setTimeout(()=>browser?.close().catch(()=>{}),110000);
    try{await callback();}finally{clearTimeout(deadline);console.log(name+' lock seconds '+((performance.now()-start)/1000).toFixed(2));}});}
  try{
    browser=await launch();page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(100000);await page.evaluateOnNewDocument(gateInitialRaf);
    await page.evaluateOnNewDocument(()=>{window.__cssProofDraws=0;for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){const original=WebGL2RenderingContext.prototype[name];WebGL2RenderingContext.prototype[name]=function(...args){window.__cssProofDraws++;return original.apply(this,args);};}});
    for(const dpr of[1,2]){
      await turn('construct-dpr'+dpr,async()=>{await page.bringToFront();await page.setViewport({width:1440,height:900,deviceScaleFactor:dpr});await page.goto(server.url+'/site.html');await page.waitForFunction(()=>window.strataSite?.ready,{polling:100});});
      await turn('first-draw-dpr'+dpr,async()=>{await page.evaluate(()=>window.__releaseSiteRaf());await settle(page);});
      await turn('CSS-toggle-dpr'+dpr,async()=>{
        await page.evaluate(()=>window.strataSite.setYear(100,{instant:true}));await page.evaluate(dpr=>window.strataSite.benchmark({frames:1,warmup:0,dpr,pauseAfter:true}),dpr);await settle(page);
        const boxes=await page.$$eval('.marker[hidden]',nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {id:node.dataset.featureId,x:r.x,y:r.y,width:r.width,height:r.height};}).filter(r=>r.width&&r.height)),beforeFile=path.join(out,`dpr${dpr}-before.png`),afterFile=path.join(out,`dpr${dpr}-after.png`);
        await page.screenshot({path:beforeFile});const beforeDraws=await page.evaluate(()=>window.__cssProofDraws);
        await page.addStyleTag({content:'.marker[hidden]{display:none}'});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.screenshot({path:afterFile});
        const afterDraws=await page.evaluate(()=>window.__cssProofDraws);if(beforeDraws!==afterDraws)throw new Error('CSS toggle unexpectedly changed the WebGL frame');
        const before=decode(beforeFile),after=decode(afterFile),width=1440*dpr,height=900*dpr,raw=maskedDifference(before,after,width,height,boxes,dpr);
        // Explicitly record both geometric boxes and their half-native-pixel AA
        // paint extent. Never turn the latter into a blanket image tolerance.
        const fringe=.5/dpr,paintBoxes=boxes.map(b=>({...b,x:b.x-fringe,y:b.y-fringe,width:b.width+2*fringe,height:b.height+2*fringe})),paint=maskedDifference(before,after,width,height,paintBoxes,dpr);
        const mask=ghostMask(width,height,paintBoxes,dpr),rgba=Buffer.alloc(mask.length*4);for(let i=0;i<mask.length;i++){rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=mask[i]*255;rgba[i*4+3]=255;}encode(rgba,width,height,path.join(out,`dpr${dpr}-paint-mask.png`));
        const x=Math.max(0,Math.floor(Math.min(...boxes.map(b=>b.x))*dpr)-16),y=Math.max(0,Math.floor(Math.min(...boxes.map(b=>b.y))*dpr)-16),right=Math.min(width,Math.ceil(Math.max(...boxes.map(b=>b.x+b.width))*dpr)+16),bottom=Math.min(height,Math.ceil(Math.max(...boxes.map(b=>b.y+b.height))*dpr)+16);
        for(const[name,file]of[['before',beforeFile],['after',afterFile]]){const r=spawnSync(bin('ffmpeg'),['-v','error','-i',file,'-vf',`crop=${right-x}:${bottom-y}:${x}:${y},scale=iw*${dpr===1?2:1}:ih*${dpr===1?2:1}:flags=neighbor`,'-frames:v','1',path.join(out,`dpr${dpr}-${name}-crop.png`)]);if(r.status!==0)throw new Error(r.stderr.toString());}
        rows.push({dpr,boxes,paintBoxes,rawGeometricBoxProof:raw,antialiasedPaintBoxProof:paint,GLDrawsDuringToggle:afterDraws-beforeDraws,beforeFile,afterFile});
        fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify({dpr,rawOutside:raw.outsideGhostPixels,paintOutside:paint.outsideGhostPixels,changed:paint.insideGhostPixels,GLDraws:afterDraws-beforeDraws}));
      });
    }
  }finally{clearTimeout(deadline);if(browser)await browser.close();await server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
