'use strict';
// Ready-time A/B of two production builds, in one GPU turn with nothing else of ours running: interleaved runs
// (A B A B ...), each a fresh browser and temporary profile, about:blank and ~2 s idle, then navigation start to the
// scene's ready and first-presented marks (page-relative, performance.now()), hero-still paint, and the wall time
// from browser launch to ready, which is what deploy-check.cjs reports as readySeconds. Never overwrites.
// Usage: node scripts/site/ready-ab.cjs --a output/site/deploy-dry-rc3j --b output/site/deploy-dry-rc3k --runs 3 --out output/site/ready-ab-r1
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{serveDist,BASE}=require('./deploy-check.cjs');
const PORT=5188,IDLE_MS=2000;
async function once(dist){
  const server=await serveDist(dist,PORT),start=performance.now();let browser;
  try{
    browser=await launch({headless:true});const page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(300000);
    await page.setViewport({width:1440,height:900,deviceScaleFactor:1});const launchedMs=performance.now()-start;
    await page.goto('about:blank');await new Promise(r=>setTimeout(r,IDLE_MS));
    await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.strataSite?.ready,{timeout:300000,polling:20});const wallMs=performance.now()-start;
    const t=await page.evaluate(async()=>{const m=window.strataSite.metadata(),at=n=>m.loadTimeline.find(x=>x.name===n)?.atMs??null;
      // Element timing entries are only reachable through a buffered observer, not getEntriesByType.
      const hero=await new Promise(resolve=>{const timer=setTimeout(()=>resolve(null),2000);new PerformanceObserver((list,o)=>{const e=list.getEntries().find(x=>x.identifier==='hero-still');if(!e)return;clearTimeout(timer);o.disconnect();resolve(e);}).observe({type:'element',buffered:true});});
      return {readyMs:at('ready'),firstPresentedMs:at('first-presented'),posterPaintedMs:at('poster-painted'),heroRenderMs:hero?+hero.renderTime.toFixed(1):null,fcpMs:performance.getEntriesByName('first-contentful-paint')[0]?.startTime??null,loadTimeline:m.loadTimeline.map(x=>[x.name,+x.atMs.toFixed(1)])};});
    return {launchedMs:+launchedMs.toFixed(0),wallToReadySeconds:+(wallMs/1000).toFixed(2),...t};
  }finally{await browser?.close().catch(()=>{});await server.close();}
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const a=path.resolve(root,arg('--a')),b=path.resolve(root,arg('--b')),runs=+arg('--runs','3'),out=path.resolve(root,arg('--out','output/site/ready-ab-r1'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);for(const d of [a,b])if(!fs.existsSync(path.join(d,'index.html')))throw new Error('No build at '+d);fs.mkdirSync(out,{recursive:true});
  const rel=d=>path.relative(root,d).split(path.sep).join('/'),report={a:rel(a),b:rel(b),idleBeforeNavigationMs:IDLE_MS,viewport:'1440x900 dpr1',runs:[]};
  await withGpu('site:ready-ab',async()=>{for(let i=0;i<runs;i++)for(const [label,dist] of [['a',a],['b',b]]){const r=await once(dist);report.runs.push({run:i+1,build:label,...r});
    console.log(`run ${i+1} ${label} ${rel(dist)}: ready ${r.readyMs?.toFixed(0)} ms, first-presented ${r.firstPresentedMs?.toFixed(0)} ms, hero ${r.heroRenderMs} ms, launch-to-ready ${r.wallToReadySeconds} s`);}});
  const median=xs=>{const s=[...xs].sort((x,y)=>x-y);return s[Math.floor(s.length/2)];};
  report.summary=Object.fromEntries(['a','b'].map(k=>{const rs=report.runs.filter(r=>r.build===k);return [k,{readyMs:rs.map(r=>+r.readyMs.toFixed(0)),medianReadyMs:+median(rs.map(r=>r.readyMs)).toFixed(0),wallToReadySeconds:rs.map(r=>r.wallToReadySeconds)}];}));
  fs.writeFileSync(path.join(out,'ready-ab.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
