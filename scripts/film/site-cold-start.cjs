'use strict';
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer-core');
const {root,executable}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs'),{sha256}=require('../media.cjs'),{installStartupTelemetry}=require('./startup-telemetry.cjs');
const base=path.join(root,'output','site','perf-r2-r1'),out=path.join(base,'cold-start-r1'),stage='candidate-r4';
async function main(){
  if(fs.existsSync(out))throw new Error('Preserve cold startup proof');fs.mkdirSync(out,{recursive:true});for(const file of ['site-cold-start.cjs','startup-telemetry.cjs'])fs.copyFileSync(path.join(__dirname,file),path.join(out,file));
  const manifest=JSON.parse(fs.readFileSync(path.join(base,stage,'snapshot-manifest.json')));for(const[file,hash]of Object.entries(manifest.files))if(sha256(fs.readFileSync(path.join(base,stage,'snapshot',file)))!==hash)throw new Error('Frozen snapshot changed');
  const server=await servePinned({folder:path.join(base,stage,'snapshot'),port:5188});let browser,deadline,report;
  try{await withGpu('site:cold-start-dpr1',async()=>{
    browser=await puppeteer.launch({executablePath:executable(),headless:false,protocolTimeout:180000,args:['--force-color-profile=srgb','--hide-scrollbars','--no-first-run','--window-size=1500,1040']});
    const page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(105000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width:1440,height:900,deviceScaleFactor:1});await page.bringToFront();await page.evaluateOnNewDocument(installStartupTelemetry);
    deadline=setTimeout(()=>browser.close().catch(()=>{}),110000);await page.goto(server.url+'/site.html',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.strataSite?.ready&&window.__siteStartup.firstFrameEndMs!==null&&!window.strataSite.metadata().occlusion.pending,{polling:50});
    await page.evaluate(()=>window.__siteStartup.measuringInput=true);await page.mouse.move(1152,495);await page.mouse.down();await page.mouse.move(1160,497,{steps:2});
    await page.waitForFunction(()=>window.__siteStartup.firstInteractiveFrameEndMs!==null,{polling:20});
    report=await page.evaluate(()=>{
      const trace=window.__siteStartup,gl=document.querySelector('#scene').getContext('webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
      return {...trace,deviceDpr:devicePixelRatio,programCount:trace.programs.length,gpu:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),samples:gl.getParameter(gl.SAMPLES),
        navigation:performance.getEntriesByType('navigation')[0].toJSON(),metadata:window.strataSite.metadata()};
    });
    await page.mouse.up();if(errors.length)throw new Error(errors.join('\n'));await browser.close();browser=undefined;clearTimeout(deadline);
  });}finally{clearTimeout(deadline);if(browser)await browser.close();await server.close();}
  report={...report,snapshotSha256:manifest.sha256,headed:true,browserExecutable:path.basename(executable()),freshTemporaryProfile:true,browserShaderCacheReused:false,osDriverCacheCleared:false,viewport:{width:1440,height:900,dpr:1},
    targetNavigationToInteractiveMs:10000,passes:report.firstInteractiveFrameEndMs<=10000,
    caveat:'Times are relative to browser navigation start. First interactive frame is CPU submission after a real pointer-move gesture, not physical presentation. WebGL link/compile/status calls measure main-thread blocking, not isolated GPU execution. No initial RAF gate, no shader warm-up, no persistent browser profile. OS driver cache was not cleared.'};
  report.slowestLinks=[...report.programs].sort((a,b)=>(b.linkCallMs+b.linkStatusMs)-(a.linkCallMs+a.linkStatusMs)).slice(0,10);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
  const reportPath=path.join(base,'measurements-r5','report.md'),lines=['','## Fresh-profile cold startup baseline','',`Headed ${report.browserExecutable}, Intel Iris Xe, DPR1,1440×900; frozen ${stage} snapshot \`${manifest.sha256}\`. Fresh temporary Chromium profile, no persistent shader cache and no initial RAF gate. OS driver cache was not cleared.`,
    '',`Navigation → first scene-frame submission: **${(report.firstFrameEndMs/1000).toFixed(2)}s**. Navigation → first frame responding to a real orbit gesture: **${(report.firstInteractiveFrameEndMs/1000).toFixed(2)}s**. Program count: **${report.programCount}**. Future site-tier startup gate: **≤10s**, current result **${report.passes?'PASS':'FAIL'}**.`,
    '','| Program | Shader names | Link call ms | Link-status wait ms | Shader compile/status ms | Max draw call ms |','|---|---|---:|---:|---:|---:|'];
  for(const p of report.slowestLinks)lines.push(`| ${p.id} | ${[...new Set(p.shaders.map(s=>s.name))].join(', ')} | ${p.linkCallMs.toFixed(2)} | ${p.linkStatusMs.toFixed(2)} | ${p.shaders.reduce((n,s)=>n+s.compileCallMs+s.compileStatusMs,0).toFixed(2)} | ${p.maxDrawCallMs.toFixed(2)} |`);
  lines.push('',report.caveat,'','Full timings: `../cold-start-r1/results.json`. Simpler shaders and fewer program variants belong to the post-M1 site detail tier.','');
  fs.appendFileSync(reportPath,lines.join('\n'));console.log(JSON.stringify({navigationToFirstFrameMs:report.firstFrameEndMs,navigationToInteractiveMs:report.firstInteractiveFrameEndMs,programCount:report.programCount,slowestLinks:report.slowestLinks,passes:report.passes}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
