'use strict';
// About drawer stills from a production build: desktop 1440x900, phones 390x844 and 360x800, at the top and, if the drawer
// scrolls, scrolled to the end. DOM-only on the CPU by default; --gpu shows the live 3D view behind the drawer (GPU lock).
// Never overwrites.
// Usage: node scripts/site/about-stills.cjs --dist output/site/deploy-dry-rc3l --out output/site/about-stills-rc3l [--gpu]
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer-core'),{root,executable}=require('../browser.cjs'),{serveDist,BASE}=require('./deploy-check.cjs');
const VIEWS=[['desktop-1440x900',{width:1440,height:900,deviceScaleFactor:1}],['phone-390x844',{width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}],['phone-360x800',{width:360,height:800,deviceScaleFactor:2,isMobile:true,hasTouch:true}]];
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/about-stills-r1'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);fs.mkdirSync(out,{recursive:true});
  const gpu=args.includes('--gpu'),report=[];
  const run=async()=>{const server=await serveDist(dist,gpu?5188:0),browser=gpu?await require('../browser.cjs').launch({headless:true}):await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--hide-scrollbars']});
  try{
    for(const [name,viewport] of VIEWS){
      const page=await browser.newPage();await page.setViewport(viewport);await page.goto(server.url+BASE+(gpu?'':'?dom-only'),{waitUntil:'load'});
      await page.waitForFunction(()=>window.strataSite?.ready,{timeout:300000});
      if(gpu)await page.waitForFunction(()=>{const m=window.strataSite.metadata();return m&&!m.residency?.pending&&!m.scheduler?.pendingFrame;},{timeout:120000,polling:100});await page.evaluate(()=>document.fonts.ready);
      await page.click('header [data-panel="about"]');await new Promise(r=>setTimeout(r,400));
      const scroller=await page.evaluate(()=>{for(const el of [document.querySelector('#drawer-body'),document.querySelector('#drawer')]){if(el.scrollHeight>el.clientHeight+1)return {selector:'#'+el.id,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight};}return null;});
      await page.screenshot({path:path.join(out,`about-${name}.png`)});const shots=[`about-${name}.png`];
      if(scroller){await page.evaluate(s=>{const el=document.querySelector(s);el.scrollTop=el.scrollHeight;},scroller.selector);await new Promise(r=>setTimeout(r,200));await page.screenshot({path:path.join(out,`about-${name}-end.png`)});shots.push(`about-${name}-end.png`);}
      report.push({view:name,scroller,shots});await page.close();
    }
  }finally{await browser.close();await server.close();}};
  if(gpu)await require('../gpu-lock.cjs').withGpu('site:about-stills',run);else await run();
  fs.writeFileSync(path.join(out,'about-stills.json'),JSON.stringify({gpu,dist:path.relative(root,dist).split(path.sep).join('/'),report},null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
