import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core');
const {serve,executable}=require('../scripts/browser.cjs');
const PHONE={deviceScaleFactor:2,isMobile:true,hasTouch:true};
// DOM-only still places the hero still with the scene's framing solver, which sets --title-scale as the 3D view would.
async function open(browser,url,width,height,extra={}){
  const page=await browser.newPage();await page.setViewport({width,height,deviceScaleFactor:1,...extra});
  await page.goto(`${url}/site.html?dom-only`);await page.waitForFunction(()=>window.strataSite?.ready&&document.querySelector('#scene-poster.placed'));await page.evaluate(()=>document.fonts.ready);
  return page;
}
const sizes=()=>{const px=s=>parseFloat(getComputedStyle(document.querySelector(s)).fontSize),scale=parseFloat(document.querySelector('.era-panel').style.getPropertyValue('--title-scale')||'1');
  const hud=window.strataSite.hudRects({worstCase:true}).filter(h=>h.rect.width>0&&h.rect.height>0),era=hud.find(h=>h.id==='era-panel').rect;
  const headerBottom=Math.max(...hud.filter(h=>['site-title','tagline','subtitle','nav'].includes(h.id)).map(h=>h.rect.y+h.rect.height));
  return {site:px('#site-title'),era:px('#era-title'),scale,gap:era.y-headerBottom};};
test('the state title is the site title size at every breakpoint, times the framing title scale',{timeout:120000},async()=>{
  const server=await serve({port:0});let browser;
  try{
    browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--force-color-profile=srgb','--hide-scrollbars']});
    for(const [width,height,extra] of [[1440,900],[1280,720],[390,844,PHONE],[360,780,PHONE]]){
      const page=await open(browser,server.url,width,height,extra),s=await page.evaluate(sizes);await page.close();
      assert.ok(s.scale>=.8&&s.scale<=1,`${width}x${height} title scale ${s.scale}`);
      assert.ok(Math.abs(s.era-s.site*s.scale)<.05,`${width}x${height}: state title ${s.era}px, site title ${s.site}px x ${s.scale}`);
      if(!extra)assert.equal(s.scale,1,`${width}x${height} desktop keeps the full title`);
    }
    // Short fine-pointer windows: compaction keeps the state title at 32 px down to 500 px, then 28 px with the site
    // title; never above the site title, and the state panel clears the header by 12 px or more.
    for(const [height,era,site] of [[548,42,42],[547,32,42],[500,32,42],[499,28,28],[422,28,28],[421,28,28]]){
      const page=await open(browser,server.url,1280,height),s=await page.evaluate(sizes);await page.close();
      assert.deepEqual({era:s.era,site:s.site},{era,site},`1280x${height}`);assert.ok(s.era<=s.site);
      assert.ok(s.gap>=12,`1280x${height}: gap ${s.gap.toFixed(1)} px`);
    }
  }finally{await browser?.close();await server.close();}
});
