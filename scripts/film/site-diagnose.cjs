'use strict';
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer-core');
const {root,executable}=require('../browser.cjs');
const {withGpu}=require('../gpu-lock.cjs');
const out=path.join(root,'output','site','diagnostics-r2'),results=[];let server;
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
async function turn({name,headless,options={},views=['default'],dprs=[1,2],identityOnly=false}){
  let browser,page,swiftshader=false;
  for(let index=0;index<dprs.length&&!swiftshader;index++){
    const dpr=dprs[index];
    await withGpu('site-diagnose:'+name+':dpr'+dpr,async()=>{
      const started=performance.now();
      try{
        if(!browser){
          // Fresh profile: the prior one-pixel screenshot mismatch is not waived.
          browser=await puppeteer.launch({executablePath:executable(),headless,protocolTimeout:300000,args:['--force-color-profile=srgb','--hide-scrollbars','--no-first-run','--window-size=1500,1040']});
          page=(await browser.pages())[0]||await browser.newPage();await page.bringToFront();
          await page.setViewport({width:1440,height:900,deviceScaleFactor:dpr});page.setDefaultTimeout(120000);
          await page.evaluateOnNewDocument(options=>{window.__STRATA_SITE_DIAGNOSTIC__=options;},options);
          await page.goto(server.url+'/site.html?diagnose');await page.waitForFunction(()=>window.strataSite?.ready);
        }else await page.setViewport({width:1440,height:900,deviceScaleFactor:dpr});
        for(const view of views){
          await page.evaluate(view=>{
            const drawer=document.querySelector('#drawer');if(drawer.open)drawer.querySelector('.close').click();
            window.strataSite.setYear(view==='kushan'?100:2023,{instant:true});
            if(view==='drawer')window.strataSite.openFeature('mauryan-ring-well');
          },view);
          const report=await page.evaluate(({frames,dpr})=>window.strataSite.benchmark({frames,warmup:10,dpr,pauseAfter:true}),{frames:identityOnly?1:60,dpr});
          results.push({name,headless,view,...report});write('results.json',results);
          console.log(JSON.stringify({name,headless,view,dpr,renderer:report.gpuIdentity,p50:report.p50FrameMs,p95:report.p95FrameMs}));
          if(/swiftshader/i.test(report.gpuIdentity.unmaskedRenderer)){swiftshader=true;write(name+'-invalid-renderer.json',{invalid:true,reason:'SwiftShader, not a hardware benchmark',renderer:report.gpuIdentity});break;}
        }
        // pauseAfter prevents render-on-demand work while this browser waits
        // between the two GPU turns. A separate process/profile is never reused.
        if(index===dprs.length-1||swiftshader){await browser.close();browser=undefined;}
      }catch(error){if(browser){await browser.close();browser=undefined;}throw error;}
      finally{console.log(name+' DPR'+dpr+' GPU turn seconds '+((performance.now()-started)/1000).toFixed(2));}
    });
  }
  return {swiftshader};
}
async function main(){
  if(fs.existsSync(path.join(out,'AB-table.md')))throw new Error('Preserve diagnosis delivery; use a new folder');
  fs.mkdirSync(out,{recursive:true});
  const {createServer}=await import('vite');
  const vite=await createServer({root,server:{host:'127.0.0.1',port:5188,strictPort:true,hmr:false,watch:null},logLevel:'warn'});
  await vite.listen();server={url:'http://127.0.0.1:5188',close:()=>vite.close()};
  try{
    await turn({name:'headless-renderer-probe',headless:true,dprs:[1],identityOnly:true});
    const baseline=await turn({name:'headed-baseline',headless:false,views:['default','drawer','kushan','excavation-end']});
    if(!baseline.swiftshader&&results.some(row=>!row.headless&&row.p95FrameMs>33)){
      for(const [name,options] of [['msaa-off',{msaa:false}],['half-shadows',{halfShadows:true}],['dpr-cap-1_5',{dprCap:1.5}],['plain-heaviest',{plainHeaviest:true}]]){
        await turn({name,headless:false,options});
      }
    }
    const lines=['# Site frame-time diagnosis','', 'Production defaults are unchanged. Variants require the diagnose URL plus injected options. A/B uses the full-excavation default view and changes only the named variable. Fresh browser profiles are used. Only this diagnostic server disables file watching, to avoid locked browser-cache files. The browser pauses scene rendering between its DPR lock turns.','', 'The headless probe uses one measured frame for GPU identity only, not a statistical p95. All headed rows use60measured frames after10warm-up frames.','', '| Mode / variant | View | DPR requested / effective | N | p50 ms | p95 ms | GPU renderer |','|---|---|---:|---:|---:|---:|---|'];
    for(const row of results)lines.push(`| ${row.headless?'headless / ':''}${row.name} | ${row.view} | ${row.dpr} / ${row.effectiveDpr} | ${row.frames} | ${row.p50FrameMs.toFixed(2)} | ${row.p95FrameMs.toFixed(2)} | ${row.gpuIdentity.unmaskedRenderer.replaceAll('|','/')} |`);
    fs.writeFileSync(path.join(out,'AB-table.md'),lines.join('\n')+'\n');
  }finally{await server?.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
