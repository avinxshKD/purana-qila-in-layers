'use strict';
// Captures the 3D-view fallbacks on the built site: a browser without WebGL2 (hero still + "Watch the film") and a
// lost WebGL context after the first frame (hero still + reload prompt), at the landscape and touch-portrait sizes.
// Records console errors, the scene state and whether each fallback button works. Never overwrites an output folder.
// Usage: node scripts/site/capture-fallback.cjs --dist dist --out output/site/fallback-r1
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{BASE,serveDist}=require('./deploy-check.cjs');
const CAP_MS=480000,PORT=5188,layout=JSON.parse(fs.readFileSync(path.join(root,'src/site/poster-layout.json'),'utf8'));
const VIEWS=[{name:'landscape',width:1440,height:900,deviceScaleFactor:4/3},{name:'portrait',width:390,height:844,deviceScaleFactor:2,touch:true}];
const CASES=['no-webgl2','context-lost'];
function blockWebGL2(){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...rest){return type==='webgl2'?null:original.call(this,type,...rest);};}
async function main(){
  const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/fallback-r1'));
  if(fs.existsSync(out))throw new Error('Preserve '+out);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);
  fs.mkdirSync(out,{recursive:true});
  const server=await serveDist(dist,PORT),report={dist,shots:[]};
  try{
    await withGpu('site:fallback',async()=>{
      let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
      try{
        browser=await launch();
        for(const kind of CASES)for(const view of VIEWS){
          const page=await browser.newPage();page.setDefaultTimeout(120000);const errors=[],warnings=[];
          page.on('pageerror',e=>errors.push('pageerror: '+e.message));
          page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());if(m.type()==='warn')warnings.push(m.text());});
          await page.setViewport({width:view.width,height:view.height,deviceScaleFactor:view.deviceScaleFactor,isMobile:!!view.touch,hasTouch:!!view.touch});
          if(kind==='no-webgl2')await page.evaluateOnNewDocument(blockWebGL2);
          await page.goto(server.url+BASE,{waitUntil:'domcontentloaded'});
          await page.waitForFunction(()=>window.strataSite?.ready,{polling:100});
          if(kind==='context-lost'){
            await page.waitForFunction(()=>window.strataSite.metadata()?.loadTimeline.some(x=>x.name==='first-presented'),{polling:100});
            await new Promise(r=>setTimeout(r,500));
            await page.evaluate(()=>document.querySelector('#scene').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
          }
          await page.waitForFunction(()=>document.querySelector('.scene-fallback')&&document.querySelector('#scene-poster img')?.complete,{polling:100});
          await new Promise(r=>setTimeout(r,600));
          const file=path.join(out,kind+'-'+view.name+'.jpg');await page.screenshot({path:file,type:'jpeg',quality:82});
          const state=await page.evaluate(()=>{const note=document.querySelector('.scene-fallback'),poster=document.querySelector('#scene-poster'),canvas=document.querySelector('#scene');
            return {sceneState:window.strataSite.sceneState(),note:note?.textContent,posterVisible:!!poster&&!poster.classList.contains('gone')&&(img=>!!img&&img.complete&&img.naturalWidth>0&&getComputedStyle(img).visibility!=='hidden'&&+getComputedStyle(img).opacity>0&&img.getBoundingClientRect().width>0)(poster.querySelector('img')),
              canvasHidden:getComputedStyle(canvas).visibility==='hidden',markersHidden:getComputedStyle(document.querySelector('#markers')).visibility==='hidden',contextLost:window.strataSite.metadata()?.contextLost??null,
              // Scene-only controls are gone; Features (a DOM drawer) stays.
              controls:Object.fromEntries(['#marker-hint','#reset','#timeline','#season-labels','.axis-labels','#features','#global-note'].map(s=>{const e=document.querySelector(s),cs=e&&getComputedStyle(e);return [s,!!e&&cs.display!=='none'&&cs.visibility!=='hidden'&&e.getBoundingClientRect().width>0];})),
              year:window.strataSite.getYear(),title:document.querySelector('#era-title').textContent,titleLines:Math.round(document.querySelector('#era-title').getBoundingClientRect().height/parseFloat(getComputedStyle(document.querySelector('#era-title')).lineHeight)),
              titleScale:getComputedStyle(document.querySelector('.era-panel')).getPropertyValue('--title-scale')||'1',noteRect:(r=>({x:+r.x.toFixed(1),y:+r.y.toFixed(1),width:+r.width.toFixed(1),height:+r.height.toFixed(1)}))(note.getBoundingClientRect())};});
          // The note against the still's measured block centre, scale bar/labels and the HUD, in CSS px.
          state.noteCheck=await page.evaluate(layout=>{const v=document.querySelector('#viewport'),image=layout.images[matchMedia('(orientation: portrait)').matches?'portrait':'landscape'],vw=v.clientWidth,vh=v.clientHeight;
            // The still as drawn (placed where the 3D block goes, or covering when no framing fits).
            const ir=document.querySelector('#scene-poster img').getBoundingClientRect(),s=ir.width/image.width,ox=ir.left,oy=ir.top,map=r=>({x:ox+r.x*s,y:oy+r.y*s,width:r.width*s,height:r.height*s}),n=document.querySelector('.scene-fallback').getBoundingClientRect();
            const hit=(a,b)=>a.x<b.x+b.width&&b.x<a.x+a.width&&a.y<b.y+b.height&&b.y<a.y+a.height,hud=window.strataSite.hudRects().filter(h=>h.id!=='timeline');
            return {image:image.file,posterPlaced:!!document.querySelector('#scene-poster.placed'),posterRect:{x:+ir.x.toFixed(1),y:+ir.y.toFixed(1),width:+ir.width.toFixed(1),height:+ir.height.toFixed(1)},blockCentre:[+(ox+image.blockCentroid[0]*s).toFixed(1),+(oy+image.blockCentroid[1]*s).toFixed(1)],noteCentre:[+(n.x+n.width/2).toFixed(1),+(n.y+n.height/2).toFixed(1)],
              overlapsScale:image.keepClear.map(map).some(r=>hit(n,r)),overlapsHud:hud.filter(h=>hit(n,h.rect)).map(h=>h.id),insideViewport:n.x>=0&&n.y>=0&&n.x+n.width<=vw&&n.y+n.height<=vh};},layout);
          // The film button should open the film dialog; the reload button should bring the 3D view back.
          if(kind==='no-webgl2'){await page.click('.scene-fallback button');await new Promise(r=>setTimeout(r,300));state.buttonResult=await page.evaluate(()=>document.querySelector('#film-dialog').open?'film-open':'film-closed');}
          else{await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),page.click('.scene-fallback button')]);
            await page.waitForFunction(()=>window.strataSite?.ready&&window.strataSite.metadata()?.loadTimeline.some(x=>x.name==='first-presented'),{polling:100});
            state.buttonResult='reloaded:'+await page.evaluate(()=>window.strataSite.sceneState()+(document.querySelector('.scene-fallback')?'+note':''));}
          report.shots.push({kind,...view,file,bytes:fs.statSync(file).size,errors,warnings,...state});await page.close();
        }
      }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}
    });
  }finally{await server.close();}
  fs.writeFileSync(path.join(out,'fallback.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report.shots.map(({file,warnings,...s})=>s)));
  if(report.shots.some(s=>s.errors.length||!s.noteCheck.posterPlaced||s.noteCheck.overlapsScale||s.noteCheck.overlapsHud.length||!s.noteCheck.insideViewport))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
