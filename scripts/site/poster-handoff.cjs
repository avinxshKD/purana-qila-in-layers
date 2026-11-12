'use strict';
// Poster hand-over on built sites, one bounded GPU turn, one browser page resized between sizes. For each viewport:
// the hero still's placement (and whether it moved after it was first shown), the 3D framing at the first frame, the
// block displacement between the two (from the capture framing in src/site/poster-layout.json, and measured: block
// bounding boxes in a still-only screenshot vs a 3D screenshot, HUD hidden), and the hero-still paint time (element
// timing) for each --dist. The measured boxes include whatever joins the block in the mask: at a small k the 3D scale
// labels (10 px minimum cap, where the still's shrink with it) and the lighter 3D backdrop can, so the model shift is
// the hand-over number and the measured edges a cross-check. The first --dist is the timing baseline; the last is the build under test.
// Usage: node scripts/site/poster-handoff.cjs --dist output/site/deploy-dry-rc2d,output/site/deploy-dry-rc3c --out output/site/poster-handoff-rc3c [--repeat 3]
//   [--only 1440x900,...] [--phones 412x775,... [--phone-dpr 2.625]] (touch viewports, timed like 390x844)
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs'),{readRGB}=require('../round6-checks.cjs');
const PORT=5188,CAP_MS=1500000,GRID=2,BACKGROUND_LUMA=48;
const phone=(width,height)=>({width,height,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const VIEWPORTS=[{width:1536,height:730,deviceScaleFactor:1.25},{width:1440,height:900,deviceScaleFactor:4/3},{width:1920,height:1080,deviceScaleFactor:1},phone(390,844),phone(360,800),
  {width:1366,height:657,deviceScaleFactor:1},phone(844,390),phone(932,430)];
const TIMED=new Set(['1440x900','390x844']);
const HIDE='header,.era-panel,.scrubber,.marker,#leaders,.state-note,.scene-load-status,.scene-fallback{visibility:hidden!important}';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function observe(){
  window.__handoff={heroPaint:null,poster:[],start:performance.now()};
  new PerformanceObserver(list=>{for(const e of list.getEntries())if(e.identifier==='hero-still'&&window.__handoff.heroPaint==null)window.__handoff.heroPaint=+(e.renderTime||e.loadTime).toFixed(1);}).observe({type:'element',buffered:true});
  const record=img=>window.__handoff.poster.push({t:+performance.now().toFixed(1),placed:img.parentNode?.classList.contains('placed')??false,gone:img.parentNode?.classList.contains('gone')??false,style:img.getAttribute('style')||'',rect:(r=>({x:r.x,y:r.y,width:r.width,height:r.height}))(img.getBoundingClientRect()),visible:getComputedStyle(img).visibility});
  document.addEventListener('DOMContentLoaded',()=>{const img=document.querySelector('#scene-poster img');if(!img)return;record(img);
    new MutationObserver(()=>record(img)).observe(img,{attributes:true,attributeFilter:['style']});new MutationObserver(()=>record(img)).observe(img.parentNode,{attributes:true,attributeFilter:['class']});});
}
function blockBox(file,dpr){
  const img=readRGB(file),gw=Math.floor(img.width/GRID),gh=Math.floor(img.height/GRID),on=new Uint8Array(gw*gh);
  for(let y=0;y<gh;y++)for(let x=0;x<gw;x++){const i=((y*GRID)*img.width+x*GRID)*3;on[y*gw+x]=.2126*img.data[i]+.7152*img.data[i+1]+.0722*img.data[i+2]>BACKGROUND_LUMA?1:0;}
  const label=new Int32Array(gw*gh).fill(-1);let best=null;
  for(let s=0;s<gw*gh;s++){if(!on[s]||label[s]>=0)continue;const stack=[s],cells=[];label[s]=s;
    while(stack.length){const c=stack.pop();cells.push(c);const x=c%gw,y=(c-x)/gw;for(const n of [x>0?c-1:-1,x<gw-1?c+1:-1,y>0?c-gw:-1,y<gh-1?c+gw:-1])if(n>=0&&on[n]&&label[n]<0){label[n]=s;stack.push(n);}}
    if(!best||cells.length>best.length)best=cells;}
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const c of best||[]){const x=c%gw,y=(c-x)/gw;x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}
  const s=GRID/dpr;return {x0:+(x0*s).toFixed(1),y0:+(y0*s).toFixed(1),x1:+(x1*s).toFixed(1),y1:+(y1*s).toFixed(1),cells:best?.length??0};
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];},repeat=+arg('--repeat','3');
  const dists=String(arg('--dist','dist')).split(',').map(d=>path.resolve(root,d)),out=path.resolve(root,arg('--out','output/site/poster-handoff-r1')),test=dists[dists.length-1];
  if(fs.existsSync(out))throw new Error('Preserve '+out);for(const d of dists)if(!fs.existsSync(path.join(d,'index.html')))throw new Error('No build at '+d);fs.mkdirSync(out,{recursive:true});
  const only=arg('--only',null)?.split(','),phones=arg('--phones',null)?.split(',').map(s=>{const [w,h]=s.split('x').map(Number);return {...phone(w,h),deviceScaleFactor:Number(arg('--phone-dpr',2))};});
  const viewports=[...(only?VIEWPORTS.filter(v=>only.includes(`${v.width}x${v.height}`)):phones?[]:VIEWPORTS),...(phones??[])];
  for(const p of phones??[])TIMED.add(`${p.width}x${p.height}`);
  const layout=JSON.parse(fs.readFileSync(path.join(root,'src/site/poster-layout.json'),'utf8')),report={dists:dists.map(d=>path.relative(root,d).split(path.sep).join('/')),timing:[],handoff:[]};
  const servers=new Map();for(const d of dists)servers.set(d,await serveDist(d,PORT+[...servers.keys()].length));
  try{
    await withGpu('site:poster-handoff',async()=>{
      let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
      try{
        browser=await launch({headless:true});const page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(120000);await page.evaluateOnNewDocument(observe);
        let errors=[];page.on('pageerror',e=>errors.push(e.message));
        const load=async(dist,viewport,query='')=>{errors=[];await page.goto('about:blank');await page.setViewport(viewport);await page.goto(servers.get(dist).url+BASE+query,{waitUntil:'domcontentloaded'});};
        const settled=()=>page.waitForFunction(()=>{const m=window.strataSite?.metadata?.();return !!m&&m.loadTimeline.some(x=>x.name==='first-presented')&&!m.residency?.pending&&!m.scheduler?.pendingFrame;},{polling:100,timeout:90000});
        for(const viewport of viewports){const v=`${viewport.width}x${viewport.height}`,dpr=viewport.deviceScaleFactor;
          for(let n=0;n<(TIMED.has(v)?repeat:1);n++)for(const dist of dists){
            await load(dist,viewport);let ok=true;await settled().catch(()=>{ok=false;});await sleep(300);
            const h=await page.evaluate(()=>({...window.__handoff,sceneState:window.strataSite?.sceneState?.(),timeline:window.strataSite?.metadata?.()?.loadTimeline??null,framing:(({mode,k,centre,titleScale,feasible})=>({mode,k,centre,titleScale,feasible}))(window.strataSite?.metadata?.()?.framing||{})}));
            const first=h.timeline?.find(x=>x.name==='first-presented')?.atMs??null;
            report.timing.push({viewport:v,dist:path.basename(dist),run:n,heroPaintMs:h.heroPaint,firstPresentedMs:first,sceneState:h.sceneState,started:ok,errors:[...errors]});
            console.log('TIME',v.padEnd(9),path.basename(dist).padEnd(16),'hero',h.heroPaint,'first3D',first,h.sceneState,errors.length?'ERR '+errors.join('|'):'');
            if(dist!==test||n>0)continue;
            // Poster records: the first one shown (placed or visible) and every later style change before it fades.
            const shown=h.poster.findIndex(r=>r.visible==='visible'),firstShown=h.poster[shown]||null,later=shown<0?[]:h.poster.slice(shown+1).filter(r=>!r.gone&&(r.rect.x!==firstShown.rect.x||r.rect.y!==firstShown.rect.y||r.rect.width!==firstShown.rect.width));
            const image=layout.images[viewport.height>viewport.width?'portrait':'landscape'],c=image.capture;let model=null;
            if(firstShown&&h.framing?.feasible){
              const scale=firstShown.rect.width/image.width,x=firstShown.rect.x,y=firstShown.rect.y;
              const kPoster=scale*c.deviceScaleFactor*c.k,cx=x+scale*c.deviceScaleFactor*c.centre.x,cy=y+scale*c.deviceScaleFactor*c.centre.y,f=h.framing;
              // Displacement of the reference bounds' corners between the two similarities (reference px about the raster centre).
              const shipped=JSON.parse(fs.readFileSync(path.join(root,'src/site/framing-reference.json'),'utf8')),o={x:shipped.width/2,y:shipped.height/2};
              const rows=shipped.rows;let bx0=Infinity,bx1=-Infinity,by0=Infinity,by1=-Infinity;rows.forEach((runs,yy)=>{if(!runs.length)return;by0=Math.min(by0,yy*shipped.cell);by1=Math.max(by1,(yy+1)*shipped.cell);for(const [l,r] of runs){bx0=Math.min(bx0,l);bx1=Math.max(bx1,r);}});
              let worst=0;for(const rx of [bx0,bx1])for(const ry of [by0,by1]){const px=cx+kPoster*(rx-o.x),py=cy+kPoster*(ry-o.y),qx=f.centre.x+f.k*(rx-o.x),qy=f.centre.y+f.k*(ry-o.y);worst=Math.max(worst,Math.hypot(px-qx,py-qy));}
              model={posterK:kPoster,sceneK:f.k,scaleRatio:+(kPoster/f.k).toFixed(5),centreShiftPx:+Math.hypot(cx-f.centre.x,cy-f.centre.y).toFixed(2),maxBlockCornerShiftPx:+worst.toFixed(2)};
            }
            await page.addStyleTag({content:HIDE});await sleep(300);const shot3d=path.join(out,`${v}-3d.png`);await page.screenshot({path:shot3d});
            await load(dist,viewport,'?dom-only');await page.waitForFunction(()=>document.querySelector('#scene-poster.placed')&&document.querySelector('.scene-fallback')?.style.visibility!=='hidden'||document.querySelector('#scene-poster.placed'),{timeout:30000}).catch(()=>errors.push('poster not placed in dom-only'));
            await page.evaluate(async()=>{await document.fonts.ready;});await sleep(500);await page.addStyleTag({content:HIDE});await sleep(200);const shotPoster=path.join(out,`${v}-poster.png`);await page.screenshot({path:shotPoster});
            const a=blockBox(shotPoster,dpr),b=blockBox(shot3d,dpr),measured={poster:a,scene:b,edgeShiftPx:{left:+(a.x0-b.x0).toFixed(1),top:+(a.y0-b.y0).toFixed(1),right:+(a.x1-b.x1).toFixed(1),bottom:+(a.y1-b.y1).toFixed(1)},maxEdgeShiftPx:+Math.max(Math.abs(a.x0-b.x0),Math.abs(a.x1-b.x1),Math.abs(a.y0-b.y0),Math.abs(a.y1-b.y1)).toFixed(1)};
            const row={viewport:v,heroPaintMs:h.heroPaint,shownAtMs:firstShown?.t??null,placed:firstShown?.placed??false,movedAfterShown:later.length,framing:h.framing,model,measured,errors:[...errors]};report.handoff.push(row);
            console.log('HANDOFF',v.padEnd(9),JSON.stringify({placed:row.placed,moved:row.movedAfterShown,model,edges:measured.edgeShiftPx}));
          }
        }
      }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}
    });
  }finally{for(const s of servers.values())await s.close();}
  const median=a=>{const s=a.filter(x=>x!=null).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null;};
  report.timingSummary=[...new Set(report.timing.map(t=>t.viewport))].map(v=>({viewport:v,...Object.fromEntries(report.dists.map(d=>[path.basename(d),{heroPaintMedianMs:median(report.timing.filter(t=>t.viewport===v&&t.dist===path.basename(d)).map(t=>t.heroPaintMs)),runs:report.timing.filter(t=>t.viewport===v&&t.dist===path.basename(d)).map(t=>t.heroPaintMs)}]))}));
  fs.writeFileSync(path.join(out,'poster-handoff.json'),JSON.stringify(report,null,2)+'\n');
  for(const t of report.timingSummary)console.log('SUMMARY',JSON.stringify(t));
  if(report.handoff.some(r=>!r.placed||r.movedAfterShown||r.errors.length)||report.timing.some(t=>path.basename(t.dist)===path.basename(test)&&!t.started))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
