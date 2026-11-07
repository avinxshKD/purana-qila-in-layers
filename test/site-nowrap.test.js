import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core'),{serve,executable}=require('../scripts/browser.cjs');
// Runs in the page: characters of the subtree in order with their line boxes; an unspaced dash (a range: 2022–23)
// whose next character starts a new line ends that line. A spaced prose dash ('2014 – when') may end a line.
function dashLineEnds(selector){
  const root=document.querySelector(selector);if(!root)return [];const chars=[],range=document.createRange(),walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode())for(let i=0;i<node.data.length;i++){if(/\s/.test(node.data[i]))continue;range.setStart(node,i);range.setEnd(node,i+1);const r=range.getClientRects()[0];if(r&&r.width>0)chars.push({c:node.data[i],spaced:/\s/.test(node.data[i+1]??' '),top:r.top,bottom:r.bottom,text:node.data});}
  const hits=[];for(let i=0;i+1<chars.length;i++)if(chars[i].c==='–'&&!chars[i].spaced&&chars[i+1].top>=chars[i].bottom-1)hits.push(chars[i].text.slice(0,60));return hits;
}
test('no line ends in an en dash at 360x800 and 375x812: state panel in every state, Features list and every drawer',{timeout:240000},async()=>{
  const server=await serve({port:0});let browser;
  try{
    browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--hide-scrollbars']});
    for(const [width,height] of [[360,800],[375,812]]){
      const page=await browser.newPage();await page.setViewport({width,height,deviceScaleFactor:2,isMobile:true,hasTouch:true});
      await page.goto(`${server.url}/site.html?dom-only`);await page.waitForFunction(()=>window.strataSite?.ready);await page.evaluate(()=>document.fonts.ready);
      const years=await page.evaluate(()=>{const seen=new Map();for(let y=-539;y<=2023;y++){const key=JSON.stringify(window.strataSite.sceneForYear(y));if(!seen.has(key))seen.set(key,y);}return [...new Set([...seen.values(),2014,2018,2023])];});
      assert.ok(years.length>=15,`${years.length} states`);
      const failures=[];
      for(const year of years){await page.evaluate(y=>window.strataSite.setYear(y),year);for(const s of ['.era-panel','#timeline','.axis-labels'])failures.push(...(await page.evaluate(dashLineEnds,s)).map(t=>`${width}x${height} ${year} ${s}: ${t}`));}
      await page.click('#features');failures.push(...(await page.evaluate(dashLineEnds,'#drawer')).map(t=>`${width}x${height} Features: ${t}`));
      for(const id of await page.evaluate(()=>window.strataSite.featureIds)){await page.evaluate(id=>window.strataSite.openFeature(id),id);failures.push(...(await page.evaluate(dashLineEnds,'#drawer')).map(t=>`${width}x${height} ${id}: ${t}`));}
      for(const panel of ['about','sources']){await page.evaluate(()=>document.querySelector('#drawer').close());await page.click(`header [data-panel="${panel}"]`);failures.push(...(await page.evaluate(dashLineEnds,'#drawer')).map(t=>`${width}x${height} ${panel}: ${t}`));}
      // The 2022–23 title breaks before the range, not inside it.
      await page.evaluate(()=>{document.querySelector('#drawer').close();window.strataSite.setYear(2023);});
      const lines=await page.evaluate(()=>{const t=document.querySelector('#era-title'),range=document.createRange();range.selectNodeContents(t);return [...range.getClientRects()].map(r=>Math.round(r.top)).filter((v,i,a)=>a.indexOf(v)===i).length;});
      assert.equal(await page.$eval('#era-title .nowrap',n=>n.textContent),'2022–23');assert.ok(lines<=2);
      assert.deepEqual(failures,[]);await page.close();
    }
  }finally{await browser?.close();await server.close();}
});
