'use strict';
// Short desktop windows, DOM-only, fine pointer: a still per size and every pair of visible HUD text boxes checked for
// overlap across the state titles of several years. Never overwrites an output folder.
// Usage: node scripts/site/short-window-stills.cjs --dist output/site/deploy-dry-rc3j --out output/site/short-window-rc3j [--sizes 1536x530,1536x480,1536x450]
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer-core'),{root,executable}=require('../browser.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const YEARS=[2023,150,-400,1650,1900,2014,2018,-200,600,1200];
const TEXT=['#site-title','#site-tagline','#global-note','header nav button','#era-title','#era-dates','#era-caption','#marker-hint','.tools button','#year-readout','.axis-labels','.season-stop','.state-note'];
function overlaps(years,selectors){
  const boxes=[];for(const sel of selectors)document.querySelectorAll(sel).forEach((el,i)=>{if(el.closest('[hidden]'))return;const cs=getComputedStyle(el);if(cs.display==='none'||cs.visibility==='hidden'||!el.textContent.trim())return;
    // Text boxes are cut to the line height: a glyph content box (ascent + descent) is taller than a tight line-height
    // and would report stacked lines as overlapping when no ink touches.
    const r=document.createRange();r.selectNodeContents(el);const rs=[...r.getClientRects()].filter(c=>c.width>0&&c.height>0),L=parseFloat(cs.lineHeight);
    if(rs.length)boxes.push({id:sel+(i?'#'+i:''),el,rects:rs.map(c=>{const inset=Number.isFinite(L)&&c.height>L?(c.height-L)/2:0;return {l:c.left,t:c.top+inset,r:c.right,b:c.bottom-inset};})});});
  const out=[];for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a.el.contains(b.el)||b.el.contains(a.el))continue;
    if(a.rects.some(p=>b.rects.some(q=>p.l<q.r&&q.l<p.r&&p.t<q.b&&q.t<p.b)))out.push(a.id+' x '+b.id);}
  return out;
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/short-window-r1')),sizes=arg('--sizes','1536x530,1536x480,1536x450').split(',');
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,0),browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--hide-scrollbars']}),rows=[];
  try{for(const size of sizes){const [width,height]=size.split('x').map(Number),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewport({width,height,deviceScaleFactor:1});await page.goto(server.url+BASE+'?dom-only',{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);await new Promise(r=>setTimeout(r,500));
    const perYear={};for(const y of YEARS){await page.evaluate(y=>window.strataSite.setYear(y),y);await new Promise(r=>setTimeout(r,60));perYear[y]=await page.evaluate(overlaps,YEARS,TEXT);}
    await page.evaluate(()=>window.strataSite.setYear(2023));await new Promise(r=>setTimeout(r,200));await page.screenshot({path:path.join(out,`dom-only-${size}.png`)});
    const shown=await page.evaluate(()=>Object.fromEntries(['#site-tagline','#global-note'].map(s=>[s,getComputedStyle(document.querySelector(s)).display!=='none'])));
    const hits=[...new Set(Object.values(perYear).flat())],row={viewport:size,shown,overlaps:hits,perYear,errors,pass:!hits.length&&!errors.length};rows.push(row);await page.close();
    console.log(size.padEnd(9),row.pass?'pass':'FAIL',JSON.stringify(shown),hits.join('; '),errors.join('|'));}
  }finally{await browser.close();await server.close();}
  fs.writeFileSync(path.join(out,'short-window.json'),JSON.stringify({dist:path.relative(root,dist).split(path.sep).join('/'),rows},null,2)+'\n');
  if(rows.some(r=>!r.pass))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
