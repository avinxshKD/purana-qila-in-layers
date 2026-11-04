import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{withGpu}=require('../scripts/gpu-lock.cjs');
const {serve,launch,root}=require('../scripts/browser.cjs');
const enabled=process.env.STRATA_ALLOW_GPU==='1';
test('S1 GPU screenshots and frame-time report, only after orchestrator resume',{skip:!enabled,timeout:900000},async()=>{
  const out=path.join(root,'output','site','s6-gpu');fs.mkdirSync(out,{recursive:true});
  if(fs.existsSync(path.join(out,'frame-time-report.json')))throw new Error('GPU delivery already exists; preserve reviewed outputs.');
  const server=await serve({port:0}),errors=[],performanceReports=[],captureReports=[];
  async function browserTurn(owner,viewport,callback){
    return withGpu(owner,async()=>{
      const browser=await launch();
      try{
        const page=(await browser.pages())[0]||await browser.newPage();await page.bringToFront();page.setDefaultTimeout(100000);
        page.on('pageerror',error=>errors.push(error.message));
        await page.setViewport(viewport);await page.goto(`${server.url}/site.html`);
        await page.waitForFunction(()=>window.strataSite?.ready);
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        assert.deepEqual(errors,[]);return await callback(page);
      }finally{await browser.close();}
    });
  }
  try{
    for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
      await browserTurn(`site:${name}-stills`,{width,height,deviceScaleFactor:1},async page=>{
        async function still(state){
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          await page.screenshot({path:path.join(out,`${name}-${state}.png`)});
          captureReports.push({viewport:name,state,width,height,metadata:await page.evaluate(()=>window.strataSite.metadata())});
        }
        await still('default');
        await page.evaluate(()=>window.strataSite.openFeature('mauryan-ring-well'));await still('drawer');
        await page.keyboard.press('Escape');
        await page.evaluate(()=>window.strataSite.setYear(100,{instant:true}));await still('kushan');
        await page.evaluate(()=>window.strataSite.setYear(2023,{instant:true}));await still('excavation-end');
      });
    }
    for(const dpr of [1,2]){
      await browserTurn(`site:benchmark-dpr-${dpr}`,{width:1440,height:900,deviceScaleFactor:dpr},async page=>{
        const report=await page.evaluate(dpr=>window.strataSite.benchmark({frames:60,warmup:10,dpr}),dpr);
        performanceReports.push(report);
      });
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'frame-time-report.json'),JSON.stringify({reports:performanceReports,environment:'Headless Edge on the mission machine; one shared GPU owner per turn.',targetDPR1P95Ms:16.7},null,2)+'\n');
    fs.writeFileSync(path.join(out,'capture-report.json'),JSON.stringify(captureReports,null,2)+'\n');
    fs.writeFileSync(path.join(out,'README.md'),'# S1 GPU delivery\n\nEight required scene screenshots, desktop and mobile. Stand-in geometry and anchors only. Frame-time results are measured, not assumed; see frame-time-report.json. Each turn used the shared GPU lock. The final film player, project title, About text and locator map remain unapproved placeholders.\n');
  }finally{await server.close();}
});
