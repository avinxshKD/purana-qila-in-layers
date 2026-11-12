'use strict';
// Framing sweep on built sites under the Pages sub-path, real scene and scale bar, one bounded GPU turn: for each
// viewport and each --dist (interleaved per viewport), the first view and Kushan 150 CE (labels shown): framing mode,
// block scale k, title scale, framing clearances, the live block-to-HUD clearances, the label audit and the
// scale-label-to-HUD gaps. The first --dist is the baseline for the k change. Never overwrites an output folder.
// Usage: node scripts/site/framing-sweep.cjs --dist output/site/deploy-dry-rc2d,output/site/deploy-dry-rc3 --out output/site/framing-sweep-rc3
//   [--only 1440x900,...] (a subset of the review set) [--sizes 1536x450,...] (desktop viewports at device scale 1)
//   [--phones 412x775,... [--phone-dpr 2.625]] (touch viewports, after any --only/--sizes)
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const PORT=5188,CAP_MS=1500000,LABEL_CLEARANCE=24;
const phone=(width,height)=>({width,height,deviceScaleFactor:2,isMobile:true,hasTouch:true});
const VIEWPORTS=[
  phone(360,800),phone(375,812),phone(384,832),phone(390,844),phone(393,852),phone(412,915),phone(430,932),
  {width:1440,height:900,deviceScaleFactor:4/3},{width:1536,height:730,deviceScaleFactor:1.25},{width:1920,height:1080,deviceScaleFactor:1},
  {width:1366,height:657,deviceScaleFactor:1},{width:1280,height:600,deviceScaleFactor:1},phone(667,375),phone(740,360),phone(800,360),phone(844,390),phone(915,412),phone(932,430)];
const STATES=[{name:'first-view'},{name:'kushan-150',year:150}];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function summary(){
  const m=window.strataSite.metadata(),f=m.framing||{},l=m.layout||{},min=(a,key)=>a&&a.length?a.reduce((x,y)=>y[key]<x[key]?y:x):null;
  const fc=min(f.clearances,'clearance'),hc=min(l.hudClearances,'clearance'),sg=min(l.scaleLabelHudGaps,'gap');
  return {mode:f.mode??null,feasible:f.feasible??null,k:f.k??null,titleScale:f.titleScale??null,spare:f.spare??null,required:f.required??null,
    centreOffsetX:f.bounds?+(f.bounds.x+f.bounds.width/2-document.querySelector('#viewport').clientWidth/2).toFixed(2):null,
    framingClearance:fc&&{id:fc.id,clearance:+fc.clearance.toFixed(1)},liveHudClearance:hc&&{id:hc.id,clearance:+hc.clearance.toFixed(1)},
    labels:{placed:(l.placed||[]).length,failures:(l.failures||[]).length,auditPasses:l.audit?.passes??null,minimumClearance:l.audit?.minimumClearance!=null?+l.audit.minimumClearance.toFixed(2):null},
    scaleLabelHudGap:sg&&{label:sg.label,hud:sg.hud,gap:+sg.gap.toFixed(1)},year:window.strataSite.getYear()};
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const dists=String(arg('--dist','dist')).split(',').map(d=>path.resolve(root,d)),out=path.resolve(root,arg('--out','output/site/framing-sweep-r1'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);for(const d of dists)if(!fs.existsSync(path.join(d,'index.html')))throw new Error('No build at '+d);fs.mkdirSync(out,{recursive:true});
  const only=arg('--only',null)?.split(','),sizes=arg('--sizes',null)?.split(',').map(s=>{const [width,height]=s.split('x').map(Number);return {width,height,deviceScaleFactor:1};});
  const phones=arg('--phones',null)?.split(',').map(s=>{const [width,height]=s.split('x').map(Number);return {...phone(width,height),deviceScaleFactor:Number(arg('--phone-dpr',2))};});
  const viewports=[...(sizes??(only?VIEWPORTS.filter(v=>only.includes(`${v.width}x${v.height}`)):phones?[]:VIEWPORTS)),...(phones??[])];
  const report={dists:dists.map(d=>path.relative(root,d).split(path.sep).join('/')),rows:[]};
  await withGpu('site:framing-sweep',async()=>{
    let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
    try{
      browser=await launch({headless:true});const page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(120000);
      let errors=[],warnings=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());if(m.type()==='warn'||m.type()==='warning')warnings.push(m.text());});
      for(const viewport of viewports)for(const dist of dists){
        const server=await serveDist(dist,PORT);
        try{
          for(const state of STATES){
            errors=[];warnings=[];await page.goto('about:blank');await page.setViewport(viewport);await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});
            const settled=async()=>{await page.waitForFunction(()=>{const m=window.strataSite?.metadata?.();return !!m&&m.loadTimeline.some(x=>x.name==='first-presented')&&m.anchors.mode!=='nearest'&&!m.anchors.refining&&!m.anchors.easing&&!m.residency?.pending&&!m.scheduler?.pendingFrame&&!m.occlusion?.pending;},{polling:100,timeout:60000})
              .catch(async e=>{const s=await page.evaluate(()=>{const m=window.strataSite?.metadata?.();return m?{first:m.loadTimeline.some(x=>x.name==='first-presented'),mode:m.anchors.mode,refining:m.anchors.refining,easing:m.anchors.easing,residency:m.residency?.pending,frame:m.scheduler?.pendingFrame,occlusion:m.occlusion?.pending,visibility:document.visibilityState}:{metadata:null,sceneState:window.strataSite?.sceneState?.()};}).catch(()=>null);errors.push('not settled: '+JSON.stringify(s));});await sleep(700);};
            await settled();if(state.year!==undefined){await page.evaluate(y=>window.strataSite.setYear(y,{instant:true}),state.year);await settled();}
            const s=await page.evaluate(summary).catch(e=>({error:e.message,labels:{}}));
            const row={viewport:`${viewport.width}x${viewport.height}`,dist:path.basename(dist),state:state.name,...s,infeasibleWarnings:warnings.filter(w=>/infeasible/i.test(w)),errors};
            report.rows.push(row);console.log(row.viewport.padEnd(9),row.dist.padEnd(16),state.name.padEnd(10),JSON.stringify({mode:s.mode,k:s.k&&+s.k.toFixed(4),t:s.titleScale,fc:s.framingClearance,hud:s.liveHudClearance,labels:s.labels,scale:s.scaleLabelHudGap}),row.infeasibleWarnings.length?'WARN '+row.infeasibleWarnings.join('|'):'',errors.length?'ERR '+errors.join('|'):'');
          }
        }finally{await server.close();}
      }
    }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}
  });
  // Acceptance per viewport against the first dist (baseline).
  const base=path.basename(dists[0]),checks=[];
  for(const viewport of viewports){const v=`${viewport.width}x${viewport.height}`,portrait=viewport.height>viewport.width;
    for(const dist of dists.slice(1).map(d=>path.basename(d))){
      const b=report.rows.find(r=>r.viewport===v&&r.dist===base&&r.state==='first-view'),c=report.rows.find(r=>r.viewport===v&&r.dist===dist&&r.state==='first-view'),labelRows=report.rows.filter(r=>r.viewport===v&&r.dist===dist);
      const kChange=b?.k&&c?.k?+((c.k/b.k-1)*100).toFixed(2):null,fails=[],notes=[];
      // Every size must start the 3D view; a baseline that did not start is noted, not compared.
      if(!c?.k)fails.push('3D did not start');if(!b?.k)notes.push('baseline 3D did not start');
      // The review set's phones all fit the band; --phones sizes may take the fallback, which must still centre.
      const review=VIEWPORTS.some(x=>x.width===viewport.width&&x.height===viewport.height);
      if(portrait&&review&&c?.mode!=='portrait-band')fails.push('not portrait band: '+c?.mode);
      if(portrait&&!(Math.abs(c?.centreOffsetX)<=2))fails.push('block off centre by '+c?.centreOffsetX+' px');
      if(b?.k&&c?.k&&b.mode!==c.mode)fails.push(`mode ${b.mode} -> ${c.mode}`);
      if(portrait&&(kChange==null||Math.abs(kChange)>3))fails.push('k change '+kChange+'%');
      for(const r of labelRows){if(r.framingClearance&&r.required&&r.framingClearance.clearance<r.required-0.01)fails.push(`${r.state} framing clearance ${r.framingClearance.id} ${r.framingClearance.clearance}<${r.required}`);
        if(r.liveHudClearance&&r.liveHudClearance.clearance<LABEL_CLEARANCE-0.01)fails.push(`${r.state} live HUD clearance ${r.liveHudClearance.id} ${r.liveHudClearance.clearance}`);
        if(r.labels.failures)fails.push(`${r.state} label failures ${r.labels.failures}`);if(r.labels.auditPasses===false)fails.push(`${r.state} label audit fails`);
        if(r.errors.length)fails.push(`${r.state} errors`);
        const warned=r.infeasibleWarnings.filter(w=>review||!/^Portrait band framing infeasible/.test(w));if(warned.length)fails.push(`${r.state} infeasible warning`);
        else if(r.infeasibleWarnings.length&&!notes.includes('portrait fallback'))notes.push('portrait fallback');}
      checks.push({viewport:v,dist,baseMode:b?.mode,mode:c?.mode,baseK:b?.k,k:c?.k,kChangePercent:kChange,titleScale:[b?.titleScale,c?.titleScale],centreOffsetX:[b?.centreOffsetX,c?.centreOffsetX],pass:!fails.length,fails,notes});
    }}
  report.checks=checks;fs.writeFileSync(path.join(out,'framing-sweep.json'),JSON.stringify(report,null,2)+'\n');
  for(const c of checks)console.log('CHECK',c.viewport.padEnd(9),c.pass?'pass':'FAIL',`${c.baseMode} -> ${c.mode}`,`k ${c.baseK?.toFixed(4)} -> ${c.k?.toFixed(4)} (${c.kChangePercent}%)`,'title',c.titleScale.join('->'),'dx',c.centreOffsetX.join('->'),c.fails.join('; '),c.notes.join('; '));
  if(checks.some(c=>!c.pass))process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
