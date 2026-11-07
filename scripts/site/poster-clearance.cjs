'use strict';
// Poster clearance: in the poster states (?dom-only, as before the first 3D frame, and a browser without WebGL2), the
// smallest distance in CSS px between the header's text (title, tagline, global note when in the header, nav links)
// and the poster's block, at every review and sweep size. Block: the largest 4-connected component of non-background
// pixels in a screenshot with everything but the poster hidden. CPU only (GPU-disabled browser). Never overwrites.
// Usage: node scripts/site/poster-clearance.cjs --dist output/site/deploy-dry-rc3 --out output/site/poster-clearance-rc3 [--min 30] [--sizes 1536x530,1536x450]
// (--sizes: desktop viewports at device scale 1 instead of the review set)
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer-core'),{root,executable}=require('../browser.cjs'),{BASE,serveDist}=require('./deploy-check.cjs'),{readRGB}=require('../round6-checks.cjs');
const phone=(width,height)=>({width,height,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const VIEWPORTS=[{width:1536,height:730,deviceScaleFactor:1.25},{width:1440,height:900,deviceScaleFactor:4/3},{width:1920,height:1080,deviceScaleFactor:1},{width:1366,height:657,deviceScaleFactor:1},{width:1280,height:600,deviceScaleFactor:1},
  phone(844,390),phone(932,430),phone(360,800),phone(375,812),phone(384,832),phone(390,844),phone(393,852),phone(412,915),phone(430,932)];
const MODES=[{name:'dom-only',query:'?dom-only'},{name:'no-webgl2',query:'',noWebGL2:true}];
const BACKGROUND_LUMA=48,GRID=2;
function blockWebGL2(){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return type==='webgl2'?null:original.call(this,type,...rest);};}
function blockMask(img,dpr){
  const gw=Math.floor(img.width/GRID),gh=Math.floor(img.height/GRID),on=new Uint8Array(gw*gh);
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const i=((y*GRID)*img.width+x*GRID)*3,l=.2126*img.data[i]+.7152*img.data[i+1]+.0722*img.data[i+2];on[y*gw+x]=l>BACKGROUND_LUMA?1:0;}
  const label=new Int32Array(gw*gh).fill(-1);let best=null;
  for(let s=0;s<gw*gh;s++){if(!on[s]||label[s]>=0)continue;const stack=[s],cells=[];label[s]=s;
    while(stack.length){const c=stack.pop();cells.push(c);const x=c%gw,y=(c-x)/gw;for(const n of [x>0?c-1:-1,x<gw-1?c+1:-1,y>0?c-gw:-1,y<gh-1?c+gw:-1])if(n>=0&&on[n]&&label[n]<0){label[n]=s;stack.push(n);}}
    if(!best||cells.length>best.length)best=cells;}
  return (best||[]).map(c=>{const x=c%gw,y=(c-x)/gw;return [(x+.5)*GRID/dpr,(y+.5)*GRID/dpr];});
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];},minimum=+arg('--min','30');
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/poster-clearance-r1'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,0),browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--force-color-profile=srgb','--hide-scrollbars']}),rows=[];
  const sizes=arg('--sizes',null),viewports=sizes?sizes.split(',').map(s=>{const [width,height]=s.split('x').map(Number);return {width,height,deviceScaleFactor:1};}):VIEWPORTS;
  try{for(const mode of MODES)for(const vp of viewports){
    const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    if(mode.noWebGL2)await page.evaluateOnNewDocument(blockWebGL2);
    await page.setViewport(vp);await page.goto(server.url+BASE+mode.query,{waitUntil:'load'});
    await page.waitForFunction(()=>window.strataSite?.ready&&[...document.querySelectorAll('#scene-poster img')].some(i=>i.complete&&i.naturalWidth&&getComputedStyle(i).opacity!=='0'&&getComputedStyle(i).visibility==='visible'),{timeout:60000});
    if(mode.noWebGL2)await page.waitForFunction(()=>!!document.querySelector('.scene-fallback'),{timeout:60000}).catch(()=>errors.push('no fallback note'));
    await page.evaluate(async()=>{await document.fonts.ready;});await new Promise(r=>setTimeout(r,500));
    const name=`${mode.name}-${vp.width}x${vp.height}`;await page.screenshot({path:path.join(out,name+'.png')});
    const text=await page.evaluate(()=>{
      const header=document.querySelector('header'),items=[['site-title','#site-title'],['tagline','#site-tagline'],['global-note','#global-note'],...[...header.querySelectorAll('nav a,nav button')].map((e,i)=>['nav:'+e.textContent.trim(),e])];
      const out=[];for(const [id,sel] of items){const el=typeof sel==='string'?document.querySelector(sel):sel;if(!el||!header.contains(el)||el.closest('[hidden]'))continue;const r=document.createRange();r.selectNodeContents(el);
        for(const c of r.getClientRects())if(c.width>0&&c.height>0)out.push({id,x:c.left,y:c.top,right:c.right,bottom:c.bottom});}
      return out;});
    await page.addStyleTag({content:'body *:not(#scene-poster):not(#scene-poster *){visibility:hidden!important}#scene-poster,#scene-poster *{visibility:visible!important}'});
    // The poster's ancestors must stay visible for it to paint; the rule above hides only non-ancestors' content.
    await page.evaluate(()=>{for(let e=document.querySelector('#scene-poster').parentElement;e&&e!==document.body;e=e.parentElement)e.style.setProperty('visibility','visible','important');});
    await new Promise(r=>setTimeout(r,200));const posterFile=path.join(out,name+'-poster.png');await page.screenshot({path:posterFile});await page.close();
    const mask=blockMask(readRGB(posterFile),vp.deviceScaleFactor);
    const per={};for(const t of text){let best=Infinity;for(const [x,y] of mask){const dx=Math.max(t.x-x,0,x-t.right),dy=Math.max(t.y-y,0,y-t.bottom);const d=Math.hypot(dx,dy);if(d<best)best=d;}
      const d=Math.max(0,best-GRID/vp.deviceScaleFactor/2);if(!(t.id in per)||d<per[t.id])per[t.id]=+d.toFixed(1);}
    const min=Object.entries(per).reduce((a,[id,d])=>d<a.d?{id,d}:a,{id:null,d:Infinity});
    const row={mode:mode.name,viewport:`${vp.width}x${vp.height}`,blockCells:mask.length,minimum:{id:min.id,clearance:min.d},perText:per,pass:min.d>=minimum&&!errors.length&&mask.length>0,errors};rows.push(row);
    console.log(mode.name.padEnd(9),row.viewport.padEnd(9),row.pass?'pass':'FAIL','min',JSON.stringify(row.minimum),JSON.stringify(per),errors.length?'ERR '+errors.join('|'):'');
  }}finally{await browser.close();await server.close();}
  fs.writeFileSync(path.join(out,'poster-clearance.json'),JSON.stringify({dist:path.relative(root,dist).split(path.sep).join('/'),minimum,rows},null,2)+'\n');
  if(rows.some(r=>!r.pass))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
