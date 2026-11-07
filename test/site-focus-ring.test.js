import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {MIN_YEAR,MAX_YEAR} from '../src/film/scene-year.js';
const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core');
const {serve,executable,root}=require('../scripts/browser.cjs');
// The keyboard ring is the accent layer of the thumb's box-shadow; null when the thumb shows no ring.
const ring=page=>page.evaluate(()=>{
  const handle=document.querySelector('#year-handle'),shadow=getComputedStyle(handle).boxShadow,track=document.querySelector('#timeline');
  if(getComputedStyle(track).outlineStyle!=='none')return {trackOutline:true};
  if(shadow==='none')return null;
  const accent=getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(),probe=document.createElement('i');probe.style.color=accent;document.body.append(probe);const accentRgb=getComputedStyle(probe).color;probe.remove();
  const layers=shadow.split(/,(?![^(]*\))/).map(s=>s.trim()).map(s=>({color:s.match(/rgba?\([^)]*\)/)[0],spread:parseFloat(s.trim().split(/\s+/).at(-1))}));
  const index=layers.findIndex(l=>l.color===accentRgb);if(index<0)return null;
  const r=handle.getBoundingClientRect(),outer=layers[index].spread,inner=index>0?layers[index-1].spread:0;
  return {color:layers[index].color,stroke:outer-inner,gap:inner+parseFloat(getComputedStyle(handle).borderTopWidth),rect:{x:r.left-outer,y:r.top-outer,width:r.width+2*outer,height:r.height+2*outer},center:{x:r.left+r.width/2,y:r.top+r.height/2},dotRadius:r.width/2,outerRadius:r.width/2+outer};
});
// Smallest gap between the ring's outer edge and each label (readout, season labels, axis label) and the gap hatch.
const clearances=page=>page.evaluate(()=>{
  const handle=document.querySelector('#year-handle').getBoundingClientRect(),cx=handle.left+handle.width/2,cy=handle.top+handle.height/2;
  const shadow=getComputedStyle(document.querySelector('#year-handle')).boxShadow,spreads=[...shadow.matchAll(/(-?[\d.]+)px(?=,|$)/g)].map(m=>parseFloat(m[1]));
  const accentSpread=spreads[1],radius=handle.width/2+accentSpread,mask=(spreads[2]??accentSpread)-accentSpread;
  const gap=r=>{const dx=Math.max(r.left-cx,0,cx-r.right),dy=Math.max(r.top-cy,0,cy-r.bottom);return Math.hypot(dx,dy)-radius;};
  const named=[['readout',document.querySelector('#year-readout')],...[...document.querySelectorAll('.season-stop')].map(n=>['season '+n.textContent,n]),['axis 540 BCE',document.querySelector('.axis-labels span')]];
  const hatch=[...document.querySelectorAll('#timeline-svg path')].filter(p=>p.getAttribute('stroke-width')==='.7').map(p=>p.getBoundingClientRect());
  const hatchBox=hatch.length?{left:Math.min(...hatch.map(r=>r.left)),right:Math.max(...hatch.map(r=>r.right)),top:Math.min(...hatch.map(r=>r.top)),bottom:Math.max(...hatch.map(r=>r.bottom))}:null;
  return {year:window.strataSite.getYear(),labels:Object.fromEntries(named.map(([id,n])=>[id,+gap(n.getBoundingClientRect()).toFixed(1)])),hatch:hatchBox?+gap(hatchBox).toFixed(1):null,mask};
});
// Accent pixels in a screenshot row through the thumb centre, right of the dot: the stroke width in device pixels.
async function strokeDevicePixels(browser,page){
  const r=await ring(page),dpr=page.viewport().deviceScaleFactor,clip={x:r.center.x+r.dotRadius,y:r.center.y-.5,width:r.outerRadius-r.dotRadius+4,height:1};
  const data=await page.screenshot({encoding:'base64',clip});const decoder=await browser.newPage();
  try{return await decoder.evaluate(async(src,accent,ground)=>{const img=new Image();img.src='data:image/png;base64,'+src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const g=c.getContext('2d');g.drawImage(img,0,0);
    // Coverage per pixel: its position between the ground and accent colours, so antialiased edges count fractionally.
    const px=g.getImageData(0,Math.floor(img.height/2),img.width,1).data,[a,b]=[accent,ground],len=a.reduce((s,v,i)=>s+(v-b[i])**2,0);let count=0;
    for(let i=0;i<px.length;i+=4){const t=[0,1,2].reduce((s,k)=>s+(px[i+k]-b[k])*(a[k]-b[k]),0)/len;if(px[i]>=230&&px[i+1]>=220)continue;count+=Math.max(0,Math.min(1,t));}return {count:+count.toFixed(2),width:img.width};},data,[212,186,132],[27,29,29]);}
  finally{await decoder.close();}
}
const trackBox=page=>page.$eval('#timeline',node=>{const r=node.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};});
const shot=(page,file,box)=>page.screenshot({path:file,clip:{x:0,y:Math.max(0,box.top-60),width:page.viewport().width,height:box.height+120}});
const MIN_GAP=2;
test('timeline focus ring: a thumb ring for keyboard use only, never for mouse or touch, clear of the labels',{timeout:120000},async()=>{
  const server=await serve({port:0});let browser;const errors=[];
  const out=path.join(root,'output','site',process.env.STRATA_SITE_TEST_OUTPUT||'focus-ring');fs.mkdirSync(out,{recursive:true});
  const report={positions:[],strokes:[]};
  try{
    browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--force-color-profile=srgb','--hide-scrollbars']});
    const open=async viewport=>{const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.setViewport(viewport);await page.goto(`${server.url}/site.html?dom-only`);await page.waitForFunction(()=>window.strataSite?.ready);await page.evaluate(()=>document.fonts.ready);return page;};
    const tabToTimeline=async page=>{await page.evaluate(()=>document.activeElement?.blur());for(let i=0;i<40&&await page.evaluate(()=>document.activeElement?.id)!=='year';i++)await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'year');};
    const check=async(page,name,file)=>{
      const r=await ring(page);assert.ok(r&&!r.trackOutline,`${name}: thumb ring shown, no track box`);
      const c=await clearances(page);report.positions.push({name,viewport:page.viewport(),...c});
      for(const [id,gap] of Object.entries(c.labels))assert.ok(gap>=MIN_GAP,`${name} (year ${c.year}): ring ${gap} px from ${id}`);
      // At the gap endpoints the dot itself sits on the end of the hatch; the ground band past the ring masks it there.
      if(c.year<1500||c.year>1600)assert.ok(c.hatch===null||c.hatch>=MIN_GAP,`${name}: ring ${c.hatch} px from the gap hatch`);
      else assert.ok(c.mask>=MIN_GAP,`${name}: hatch masked ${c.mask} px past the ring`);
      if(file)await shot(page,path.join(out,file),await trackBox(page));return c;};
    let page=await open({width:1440,height:900,deviceScaleFactor:1});
    const buttonRing=await page.evaluate(()=>{const b=document.querySelector('#features');b.focus();const s=getComputedStyle(b);return {color:s.outlineColor,width:parseFloat(s.outlineWidth)};});
    await page.evaluate(()=>document.activeElement.blur());
    // (a) mouse click, then a drag: no ring while pressed, while moving or after release (the input keeps focus).
    let box=await trackBox(page);const y=box.top+12;
    await page.mouse.click(box.left+box.width*.3,y);assert.equal(await page.evaluate(()=>document.activeElement.id),'year');assert.equal(await ring(page),null,'no ring after a click');
    await page.mouse.move(box.left+box.width*.2,y);await page.mouse.down();assert.equal(await ring(page),null,'no ring on press');
    await page.mouse.move(box.left+box.width*.6,y,{steps:5});assert.equal(await ring(page),null,'no ring mid-drag');
    await page.mouse.up();assert.equal(await ring(page),null,'no ring after release');
    await shot(page,path.join(out,'a-mouse-after-release.png'),box);
    // (c) Tab to the timeline: thumb ring in the focus-ring colour and width; arrow keys move the year and keep it.
    await page.keyboard.press('End');await page.evaluate(()=>window.strataSite.setYear(2023));await tabToTimeline(page);
    const r=await ring(page);assert.ok(r&&!r.trackOutline,'ring on Tab focus');assert.equal(r.color,buttonRing.color);assert.equal(r.stroke,buttonRing.width,'2 px stroke like the other focus rings');assert.ok(r.gap>=1&&r.gap<=3,`small gap from the dot: ${r.gap}`);
    await page.keyboard.press('End');await check(page,'desktop right end (Tab)','c-tab-right-end.png');
    await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>window.strataSite.getYear()),MIN_YEAR);await check(page,'desktop left end','c-tab-left-end.png');
    await page.evaluate(()=>window.strataSite.setYear(400));const before=await page.evaluate(()=>window.strataSite.getYear());await page.keyboard.press('ArrowRight');
    assert.notEqual(await page.evaluate(()=>window.strataSite.getYear()),before);await check(page,'desktop mid-range after arrow','c-after-arrow-mid.png');
    for(const [year,file] of [[1500,'c-gap-1500.png'],[1600,'c-gap-1600.png'],[2013,'c-break-2013.png'],[2014,'c-break-2014.png'],[2018,'c-season-2018.png']]){await page.evaluate(v=>window.strataSite.setYear(v),year);await check(page,`desktop ${year}`,file);}
    report.strokes.push({dpr:1,...await strokeDevicePixels(browser,page)});
    // (d) a click after keyboard use hides it again; the next arrow key brings it back.
    await page.mouse.click(box.left+box.width*.5,y);assert.equal(await ring(page),null,'click hides the ring');
    await shot(page,path.join(out,'d-click-after-keyboard.png'),box);
    await page.keyboard.press('ArrowRight');assert.ok(await ring(page),'arrow key after a click shows the ring');
    await page.close();
    // DPR 2: the stroke stays 2 CSS px (about 4 device px).
    page=await open({width:1440,height:900,deviceScaleFactor:2});await tabToTimeline(page);await page.evaluate(()=>window.strataSite.setYear(150));await check(page,'desktop DPR2 150',null);
    report.strokes.push({dpr:2,...await strokeDevicePixels(browser,page)});await page.close();
    for(const s of report.strokes)assert.ok(Math.abs(s.count-2*s.dpr)<=1,`stroke ${s.count} device px at DPR ${s.dpr}`);
    // (b) touch: tap and drag never show it. Portrait keyboard positions are checked too.
    page=await open({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
    box=await trackBox(page);const ty=box.top+12;
    await page.touchscreen.tap(box.left+box.width*.4,ty);assert.equal(await page.evaluate(()=>document.activeElement.id),'year');assert.equal(await ring(page),null,'no ring after a tap');
    await page.touchscreen.touchStart(box.left+box.width*.2,ty);assert.equal(await ring(page),null,'no ring on touch start');
    for(let i=1;i<=5;i++)await page.touchscreen.touchMove(box.left+box.width*(.2+i*.1),ty);assert.equal(await ring(page),null,'no ring mid touch drag');
    await page.touchscreen.touchEnd();assert.equal(await ring(page),null,'no ring after touch release');
    await shot(page,path.join(out,'b-touch-after-drag.png'),box);
    await tabToTimeline(page);
    for(const [year,file] of [[MIN_YEAR,null],[150,'portrait-150.png'],[1500,null],[1600,null],[2013,null],[2014,null],[2018,null],[MAX_YEAR,null]]){await page.evaluate(v=>window.strataSite.setYear(v),year);await check(page,`portrait ${year}`,file);}
    assert.deepEqual(errors,[]);
  }finally{fs.writeFileSync(path.join(out,'focus-ring.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await server.close();}
});
