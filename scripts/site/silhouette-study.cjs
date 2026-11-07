'use strict';
// Silhouette (label outline) raster study: worker round trip, outline index build and label layout cost per raster
// cell size, and the largest label/leader-end shift against the cell-1 raster, across era states and viewports.
// One bounded GPU turn; never overwrites an output folder.
// Usage: node scripts/site/silhouette-study.cjs --dist output/site/deploy-dry-r24 --out output/site/silhouette-study-r1
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const PORT=5188,CELLS=[1,2,3,4,5,6,8],YEARS=[-400,-100,150,600,1100,1350,1550,1650,1900];
const VIEWPORTS=[{name:'landscape',width:1440,height:900,deviceScaleFactor:1},{name:'portrait',width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true}];
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/silhouette-study-r1')),repeats=+arg('--repeats','5');
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,PORT),report={dist,cells:CELLS,years:YEARS,repeats,runs:[],problems:[]};
  try{
    await withGpu('site:silhouette-study',async()=>{
      const watchdog=setTimeout(()=>{console.error('Watchdog: GPU turn exceeded 540 s');process.exit(2);},540000);watchdog.unref();
      const browser=await launch();
      try{
        for(const viewport of VIEWPORTS){
          const page=await browser.newPage();page.setDefaultTimeout(120000);page.on('pageerror',e=>report.problems.push(viewport.name+' page error '+e.message));
          await page.setViewport(viewport);await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});
          const settled=()=>page.waitForFunction(()=>{const m=window.strataSite.metadata();return m&&m.anchors.mode!=='nearest'&&!m.anchors.refining&&!m.residency?.pending&&!m.scheduler?.pendingFrame&&!m.occlusion?.pending;},{polling:100});
          await page.waitForFunction(()=>window.strataSite?.metadata?.()?.loadTimeline?.some(m=>m.name==='first-presented'),{polling:100});
          for(const year of YEARS){
            await page.evaluate(y=>window.strataSite.setYear(y,{instant:true}),year);await settled();await new Promise(r=>setTimeout(r,300));
            const study=await page.evaluate((cells,repeats)=>window.strataSite.silhouetteStudy({cells,repeats}),CELLS,repeats);
            report.runs.push({viewport:viewport.name,year,...study});console.log(viewport.name,year,JSON.stringify(study.results.map(r=>[r.cell,r.medianMs,r.maxShiftPx,r.missing,r.extra])));
          }
          await page.close();
        }
      }finally{clearTimeout(watchdog);await browser.close().catch(()=>{});}
    });
  }finally{await server.close();}
  // Per cell: worst label shift and worst missing/extra labels over every run, median of the run medians.
  const median=v=>{const s=[...v].sort((a,b)=>a-b);return s.length?s[Math.floor(s.length/2)]:null;};
  report.summary=CELLS.map(cell=>{const rows=report.runs.map(r=>({viewport:r.viewport,...r.results.find(x=>x.cell===cell)}));
    return {cell,medianRoundTripMs:median(rows.map(r=>r.medianMs)),maxRoundTripMs:Math.max(...rows.map(r=>r.medianMs)),medianBuildMs:median(rows.map(r=>r.buildMs)),medianLayoutMs:median(rows.map(r=>r.layoutMs)),
      maxShiftPx:Math.max(...rows.map(r=>r.maxShiftPx)),missing:Math.max(...rows.map(r=>r.missing)),extra:Math.max(...rows.map(r=>r.extra)),within1px:rows.every(r=>r.maxShiftPx<=1&&!r.missing&&!r.extra)};});
  report.chosen=report.summary.filter(s=>s.within1px).at(-1)?.cell??null;
  fs.writeFileSync(path.join(out,'silhouette-study.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({chosen:report.chosen,summary:report.summary,problems:report.problems}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
