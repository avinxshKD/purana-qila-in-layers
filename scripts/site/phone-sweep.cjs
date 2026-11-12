'use strict';
// Portrait phone framing sweep, DOM only (no GPU lock: ?dom-only never makes a WebGL context). The hero still is
// placed by the same site framing the 3D view uses (poster.js), so its mapping gives the framing: k, block box,
// horizontal offset from the free band's centre, width fraction, title scale and framing mode. One page per device scale and text scale; viewports are applied by resizing.
// Text scale emulates Android Chrome text scaling: every HUD font size (and --title-size) times the factor.
// Usage: node scripts/site/phone-sweep.cjs --dist output/site/deploy-dry-rc3n --out output/review/phone-bug/sweep-rc3n
//   [--widths 360:430:4] [--heights 640:940:10] [--dpr 2.625,3] [--text 1,1.15,1.3] [--sizes 412x800,...]
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const PORT=5189,layout=JSON.parse(fs.readFileSync(path.join(root,'src/site/poster-layout.json'),'utf8')),image=layout.images.portrait;
const range=s=>{const [a,b,step]=s.split(':').map(Number),out=[];for(let v=a;v<=b+1e-9;v+=step)out.push(v);if(out[out.length-1]!==b)out.push(b);return out;};
// Runs in the page: scale HUD text by f (from the unscaled computed sizes saved on first call).
function scaleText(f){
  const root=document.documentElement,h1=document.querySelector('#site-title');
  if(!window.__baseFonts){root.style.removeProperty('--title-size');window.__baseTitle=parseFloat(getComputedStyle(h1).fontSize);
    window.__baseFonts=[...document.querySelectorAll('header *, .era-panel *, .scrubber *')].filter(e=>!['H1','H2'].includes(e.tagName)).map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);}
  root.style.setProperty('--title-size',window.__baseTitle*f+'px');for(const [e,size]of window.__baseFonts)e.style.fontSize=size*f+'px';
}
function measure(image){
  const v=document.querySelector('#viewport'),img=v.querySelector('#scene-poster img'),width=v.clientWidth,height=v.clientHeight,s=img.style;
  const scale=parseFloat(s.width)/image.width,x=parseFloat(s.left),y=parseFloat(s.top),c=image.capture,ratio=scale*c.deviceScaleFactor,k=ratio*c.k;
  const block={x:x+image.blockBox.x*scale,y:y+image.blockBox.y*scale,width:image.blockBox.width*scale,height:image.blockBox.height*scale};
  const rects=window.strataSite.hudRects({worstCase:true}),header=rects.filter(r=>['site-title','tagline','nav'].includes(r.id)),era=rects.find(r=>r.id==='era-panel');
  const top=Math.max(...header.map(r=>r.rect.y+r.rect.height)),bottom=era.rect.y,title=document.querySelector('#era-title'),lh=parseFloat(getComputedStyle(title).lineHeight);
  return {width,height,innerWidth,innerHeight,k,titleScale:Number(getComputedStyle(document.querySelector('.era-panel')).getPropertyValue('--title-scale')||1),
    centreOffsetX:block.x+block.width/2-width/2,widthFraction:block.width/width,block,band:{top,bottom},bandCentreOffsetY:block.y+block.height/2-(top+bottom)/2,
    titleLines:Math.round(title.getBoundingClientRect().height/lh),fontPx:parseFloat(getComputedStyle(title).fontSize)};
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/review/phone-sweep'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);
  const sizes=arg('--sizes',null)?.split(',').map(s=>s.split('x').map(Number))??range(arg('--widths','360:430:4')).flatMap(w=>range(arg('--heights','640:940:10')).map(h=>[w,h]));
  const dprs=arg('--dpr','2.625,3').split(',').map(Number),texts=arg('--text','1,1.15,1.3').split(',').map(Number),rows=[];
  fs.mkdirSync(out,{recursive:true});const server=await serveDist(dist,PORT),browser=await launch({headless:true});
  try{
    for(const dpr of dprs)for(const text of texts){
      const page=await browser.newPage();
      await page.setViewport({width:sizes[0][0],height:sizes[0][1],deviceScaleFactor:dpr,isMobile:true,hasTouch:true});
      await page.goto(server.url+BASE+'?dom-only',{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
      await page.waitForFunction(()=>document.querySelector('#scene-poster.placed'),{timeout:20000});
      if(text!==1)await page.evaluate(scaleText,text);
      for(const [w,h]of sizes){
        await page.setViewport({width:w,height:h,deviceScaleFactor:dpr,isMobile:true,hasTouch:true});
        await page.evaluate(()=>{window.dispatchEvent(new Event('resize'));return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
        // poster.js passes no warn callback, so the mode is read from the result: the band always draws the block at
        // 87.7-90% of the width; the fallback is smaller.
        const m=await page.evaluate(measure,image),mode=Number.isNaN(m.k)?'none':m.widthFraction>=.87?'portrait-band':'general';
        const row={viewport:`${w}x${h}`,dpr,text,mode,...m};rows.push(row);
        if(m.width!==w||m.height!==h)console.warn('viewport mismatch',row.viewport,m.width,m.height);
      }
      await page.close();console.log('done dpr',dpr,'text',text,rows.filter(r=>r.dpr===dpr&&r.text===text&&r.mode!=='portrait-band').length,'non-band');
    }
  }finally{await browser.close();await server.close();}
  fs.writeFileSync(path.join(out,'phone-sweep.json'),JSON.stringify({dist:path.relative(root,dist).split(path.sep).join('/'),rows},null,1)+'\n');
  // Acceptance: every portrait phone size centres the block horizontally within 2 px.
  const bad=rows.filter(r=>!(Math.abs(r.centreOffsetX)<=2));
  console.log('rows',rows.length,'off centre by more than 2 px',bad.length,'max |dx|',Math.max(...rows.map(r=>Math.abs(r.centreOffsetX))).toFixed(2));
  for(const r of bad.slice(0,40))console.log(r.viewport,r.dpr,r.text,r.mode,'k',r.k.toFixed(4),'t',r.titleScale,'dx',r.centreOffsetX.toFixed(1),'wf',r.widthFraction.toFixed(3),'lines',r.titleLines);
  if(bad.length)process.exitCode=1;
}
module.exports={measure,scaleText};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
