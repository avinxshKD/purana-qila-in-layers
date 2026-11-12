'use strict';
// Review stills of a built site under the Pages sub-path, full HUD, in one bounded GPU turn:
// 1440x900 (DPR 4/3): first view, Kushan 150 CE with labels and the kushan-house pool, Mauryan (200 BCE, its
// features fully revealed) with the ring-well pool,
// and the film dialog open; 390x844 touch (DPR 2): first view and Kushan 150 CE. --set cell: the label-outline cell
// states (the review label states plus the largest cell 1 -> 4 shifts in output/site/silhouette-study-r1), each with
// the label layout. Never overwrites an output folder.
// --set first-views: the first view at 1536x730, 1440x900, 1920x1080, 390x844 and 360x800.
// Usage: node scripts/site/review-stills.cjs --dist output/site/deploy-dry-rNN --out output/site/review-rc1 [--headed] [--set cell|first-views]
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs'),{activePoolPredicate}=require('./active-pool.cjs');
const PORT=5188,CAP_MS=540000;
const LANDSCAPE={width:1440,height:900,deviceScaleFactor:4/3},PORTRAIT={width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true};
const SHOTS=[
  {name:'landscape-first-view',viewport:LANDSCAPE},
  {name:'landscape-kushan-150-pool',viewport:LANDSCAPE,year:150,pool:'kushan-house'},
  {name:'landscape-mauryan-ring-well',viewport:LANDSCAPE,year:-201,pool:'mauryan-ring-well'},
  {name:'landscape-film-dialog',viewport:LANDSCAPE,film:true},
  {name:'portrait-first-view',viewport:PORTRAIT},
  {name:'portrait-kushan-150',viewport:PORTRAIT,year:150},
];
const phone=(width,height)=>({width,height,deviceScaleFactor:2,isMobile:true,hasTouch:true});
// --set first-views: the first view at the review sizes.
const FIRST_VIEW_SHOTS=[{width:1536,height:730,deviceScaleFactor:1.25},{width:1440,height:900,deviceScaleFactor:4/3},{width:1920,height:1080,deviceScaleFactor:1},phone(390,844),phone(360,800)]
  .map(viewport=>({name:`first-view-${viewport.width}x${viewport.height}`,viewport}));
const CELL_SHOTS=[
  {name:'landscape-kushan-150-pool',viewport:LANDSCAPE,year:150,pool:'kushan-house'},
  {name:'portrait-kushan-150',viewport:PORTRAIT,year:150},
  {name:'landscape-mauryan-ring-well',viewport:LANDSCAPE,year:-201},
  {name:'portrait-1900',viewport:PORTRAIT,year:1900},
  {name:'portrait-400-bce',viewport:PORTRAIT,year:-400},
  {name:'landscape-1650',viewport:LANDSCAPE,year:1650},
];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];},headless=!args.includes('--headed');
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/review-rc1')),set=arg('--set','review');
  if(!['review','cell','first-views'].includes(set))throw new Error('Unknown --set '+set);
  // --phones 412x775,... [--phone-dpr 2.625] [--phone-years 150,1650]: the first view and each year (default Kushan
  // 150 CE) at each touch viewport, instead of the set.
  const phones=arg('--phones',null)?.split(',').map(s=>{const [w,h]=s.split('x').map(Number);return {...phone(w,h),deviceScaleFactor:Number(arg('--phone-dpr',2))};});
  const years=arg('--phone-years','150').split(',').map(Number),yearName=y=>y===150?'kushan-150':y<0?`${-y}-bce`:`${y}-ce`;
  const shots=phones?phones.flatMap(viewport=>[{name:`phone-${viewport.width}x${viewport.height}-first-view`,viewport},...years.map(year=>({name:`phone-${viewport.width}x${viewport.height}-${yearName(year)}`,viewport,year}))]):{review:SHOTS,cell:CELL_SHOTS,'first-views':FIRST_VIEW_SHOTS}[set];
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,PORT),report={dist,set,headed:!headless,shots:[]};
  try{
    await withGpu('site:review-stills',async()=>{
      let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
      try{
        browser=await launch({headless});
        // One foreground tab for every shot: a background tab (headed) gets no frames, and closing the last tab ends
        // the browser.
        const page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(120000);let errors=[];
        page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
        for(const shot of shots){
          errors=[];await page.goto('about:blank');
          await page.setViewport(shot.viewport);await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});
          const settled=async()=>{await page.waitForFunction(()=>{const m=window.strataSite?.metadata?.();return !!m&&m.loadTimeline.some(x=>x.name==='first-presented')&&m.anchors.mode!=='nearest'&&!m.anchors.refining&&!m.anchors.easing&&!m.residency?.pending&&!m.scheduler?.pendingFrame&&!m.occlusion?.pending;},{polling:100,timeout:45000})
            .catch(async e=>{const s=await page.evaluate(()=>{const m=window.strataSite?.metadata?.();return m?{first:m.loadTimeline.some(x=>x.name==='first-presented'),mode:m.anchors.mode,refining:m.anchors.refining,easing:m.anchors.easing,residency:m.residency?.pending,frame:m.scheduler?.pendingFrame,occlusion:m.occlusion?.pending,visibility:document.visibilityState}:{metadata:null,sceneState:window.strataSite?.sceneState?.(),visibility:document.visibilityState};}).catch(()=>null);throw new Error('Not settled: '+JSON.stringify(s));});await sleep(900);};
          await settled();
          if(shot.year!==undefined){await page.evaluate(y=>window.strataSite.setYear(y,{instant:true}),shot.year);await settled();}
          if(shot.pool){await page.evaluate(id=>window.strataSite.setActiveFeature(id),shot.pool);await page.waitForFunction(activePoolPredicate(shot.pool),{timeout:15000,polling:50}).catch(()=>errors.push('pool did not settle: '+shot.pool));await settled();}
          if(shot.film){await page.click('[data-panel="film"]');await page.waitForFunction(()=>document.querySelector('#film-dialog').open);await sleep(900);}
          const file=path.join(out,shot.name+'.jpg');await page.screenshot({path:file,type:'jpeg',quality:88});
          const state=await page.evaluate(()=>{const r=window.strataSite.markerReport?.()??[];return {markers:r.map(m=>({id:m.featureId,visible:m.visible,reason:m.reason,label:m.labelVisible??m.label?.visible??null})),year:window.strataSite.getYear(),title:document.querySelector('#era-title').textContent,visibleMarkers:r.filter(m=>m.visible).length,labels:[...document.querySelectorAll('.callout-label')].filter(l=>!l.hidden&&getComputedStyle(l).opacity!=='0').map(l=>l.textContent),activeFeature:window.strataSite.metadata().emphasis?.activeFeature??null,film:document.querySelector('#film-dialog').open,
            layout:(({placed,failures,audit,hudClearances,scaleLabelHudGaps})=>({placed:placed.map(({id,rect,end,lines,clearance,kind})=>({id,rect,end,lines,clearance,kind})),failures,audit,hudClearances,scaleLabelHudGaps}))(window.strataSite.metadata().layout)};});
          report.shots.push({name:shot.name,file,viewport:shot.viewport,...state,errors});console.log(shot.name,JSON.stringify({...state,layout:undefined}),errors.length?'ERRORS '+errors.join(' | '):'');
        }
      }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}
    });
  }finally{await server.close();}
  fs.writeFileSync(path.join(out,'review-stills.json'),JSON.stringify(report,null,2)+'\n');
  if(report.shots.some(s=>s.errors.length))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
