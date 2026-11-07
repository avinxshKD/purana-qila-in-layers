'use strict';
// Title sizes and hero framing of a built site, live 3D view, in one bounded GPU turn: per viewport the computed site
// title and state title sizes, --title-scale, how the state title wraps (2022–23 stop, plus any --years), the gap
// between the header and the worst-case state panel, the solved hero framing (block scale k, centre, mode, title
// scale) and where the hero still was placed. Never overwrites.
// --dom-only: no 3D view and no GPU lock (CPU); the hero still is still placed by the same framing solver, so the
// placement and title scale are those the 3D view would use.
// Usage: node scripts/site/title-size-probe.cjs --dist output/site/deploy-dry-rc3m --out output/site/title-probe-rc3m [--dom-only]
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer-core'),{root,launch,executable}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const PORT=5188,CAP_MS=540000,PHONE={deviceScaleFactor:2,isMobile:true,hasTouch:true};
const VIEWPORTS=[[1920,1080],[1440,900],[1536,730],[1280,720],[1280,540],...[548,547,500,499,422,421].flatMap(h=>[[1280,h],[1536,h]]),[390,844,PHONE],[360,780,PHONE],[360,800,PHONE],[375,812,PHONE]];
function measure(){
  const px=sel=>parseFloat(getComputedStyle(document.querySelector(sel)).fontSize),panel=document.querySelector('.era-panel'),title=document.querySelector('#era-title');
  const lines=[];const walker=document.createTreeWalker(title,NodeFilter.SHOW_TEXT);let tops=[];
  for(let n=walker.nextNode();n;n=walker.nextNode())for(let i=0;i<n.length;i++){const r=document.createRange();r.setStart(n,i);r.setEnd(n,i+1);const rect=[...r.getClientRects()].find(c=>c.width>0);if(!rect){if(lines.length)lines[lines.length-1]+=n.data[i];continue;}
    const top=Math.round(rect.top);let at=tops.findIndex(t=>Math.abs(t-top)<4);if(at<0){tops.push(top);lines.push('');at=lines.length-1;}lines[at]+=n.data[i];}
  const hud=window.strataSite.hudRects({worstCase:true}).filter(h=>h.rect.width>0&&h.rect.height>0),header=hud.filter(h=>['site-title','tagline','subtitle','nav'].includes(h.id)),era=hud.find(h=>h.id==='era-panel');
  const headerBottom=Math.max(...header.map(h=>h.rect.y+h.rect.height));
  const f=window.strataSite.metadata()?.framing,img=document.querySelector('#scene-poster img'),s=img?.style;
  return {siteTitlePx:px('#site-title'),eraTitlePx:px('#era-title'),titleScale:panel.style.getPropertyValue('--title-scale')||'1',eraText:title.textContent,lines:lines.map(l=>l.trim()),
    taglineShown:getComputedStyle(document.querySelector('#site-tagline')).display!=='none',noteShown:getComputedStyle(document.querySelector('#global-note')).display!=='none',
    headerBottom:+headerBottom.toFixed(1),worstEraTop:+era.rect.y.toFixed(1),gapPx:+(era.rect.y-headerBottom).toFixed(1),
    framing:f&&{feasible:f.feasible,mode:f.mode,k:f.k,centre:f.centre&&{x:+f.centre.x.toFixed(2),y:+f.centre.y.toFixed(2)},titleScale:f.titleScale},
    poster:s&&s.left?{left:parseFloat(s.left),top:parseFloat(s.top),width:parseFloat(s.width),height:parseFloat(s.height)}:null};
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist')),out=path.resolve(root,arg('--out')),years=(arg('--years','')||'').split(',').filter(Boolean).map(Number);
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,args.includes('--dom-only')?0:PORT),report={dist:path.relative(root,dist).split(path.sep).join('/'),runs:[]};
  const domOnly=args.includes('--dom-only');report.domOnly=domOnly;
  const turn=async()=>{let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
    try{browser=domOnly?await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--force-color-profile=srgb','--hide-scrollbars']}):await launch({headless:true});
      for(const [width,height,extra] of VIEWPORTS){
        const page=await browser.newPage();page.setDefaultTimeout(120000);await page.setViewport({width,height,deviceScaleFactor:1,...extra});
        await page.goto(server.url+BASE+(domOnly?'?dom-only':''),{waitUntil:'domcontentloaded'});
        await page.waitForFunction(dom=>window.strataSite?.ready&&(dom?!!document.querySelector('#scene-poster.placed'):window.strataSite.metadata()?.framing),{polling:50},domOnly);
        await page.evaluate(()=>document.fonts.ready);const run={viewport:`${width}x${height}`,touch:!!extra,first:await page.evaluate(measure)};
        for(const y of years){await page.evaluate(y=>window.strataSite.setYear(y,{instant:true}),y);const m=await page.evaluate(measure);run['year'+y]={eraText:m.eraText,eraTitlePx:m.eraTitlePx,lines:m.lines};}
        report.runs.push(run);const f=run.first;console.log(`${run.viewport}: site ${f.siteTitlePx} era ${f.eraTitlePx} scale ${f.titleScale} lines ${JSON.stringify(f.lines)} gap ${f.gapPx} k ${f.framing?.k?.toFixed(5)} centre ${f.framing?.centre?.x},${f.framing?.centre?.y} ${f.framing?.mode??''} poster ${f.poster?[f.poster.left,f.poster.top,f.poster.width,f.poster.height].map(v=>v.toFixed(1)).join(','):'-'}`);
        await page.close();}
    }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}};
  try{if(domOnly)await turn();else await withGpu('site:title-probe',turn);}finally{await server.close();}
  fs.writeFileSync(path.join(out,'title-probe.json'),JSON.stringify(report,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
