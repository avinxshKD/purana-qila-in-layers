'use strict';
// Program-hash reference from a pinned build (e.g. the untouched M2b freeze build): loads it,
// renders the given frames, records SHA-256 of every linked program's shader sources.
const fs=require('node:fs'),path=require('node:path'),{launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs');
const {installProgramRecorder,readProgramHashes}=require('./program-hashes.cjs');
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const folder=path.resolve(get('--snapshot')),out=path.resolve(get('--out')),query=get('--query')||'/film.html?capture&backend=m1',frames=(get('--frames')||'').split(',').filter(Boolean).map(Number),cap=Number(get('--cap')||280);
if(fs.existsSync(out))throw new Error('Preserve existing program reference');
withGpu('film:program-reference',async()=>{
  const t0=performance.now(),s=()=>(performance.now()-t0)/1000;let browser,server;const stop=setTimeout(()=>browser?.close().catch(()=>{}),cap*1000);
  try{server=await servePinned({folder,port:5188});browser=await launch({profile:get('--profile')||undefined});const page=(await browser.pages())[0]||await browser.newPage();
    await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});page.setDefaultTimeout(cap*1000);await installProgramRecorder(page);
    await page.goto(server.url+query);await page.waitForFunction(()=>window.strataFilm?.ready);await page.evaluate(()=>document.fonts.ready);const ready=s();
    for(const frame of [300,1530,0,...frames])await page.evaluate(f=>{window.strataFilm.render(f/30);window.strataFilm.readPixels();},frame);
    const programs=await readProgramHashes(page);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({snapshot:folder,query,frames,readySeconds:ready,gpuTurnSeconds:s(),programs},null,2)+'\n');
    console.log(JSON.stringify({ready,seconds:s(),programs:programs.unique.length}));
  }finally{clearTimeout(stop);await browser?.close().catch(()=>{});await server?.close();}
}).catch(e=>{console.error(e);process.exitCode=1;});
