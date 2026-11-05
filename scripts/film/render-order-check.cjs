'use strict';
// Film overlay render-order determinism check on a pinned freeze (default: M2b).
// prepare: freeze tree + owned src/film overlay, built to a static snapshot (CPU).
// capture: one locked GPU turn (<= 5 min). Three fresh pages; each renders a different frame
// first, then the same frames in shuffled orders. Every render of a frame must be byte-identical.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs'),{fileSHA256}=require('./f2-contract.cjs');
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined,mode=args[0];
const freeze=path.resolve(get('--freeze')||path.join(root,'output/lookdev/modelling/m2/source-m2b')),out=path.resolve(get('--out')||path.join(root,'output/film/render-order-m2b-r1'));
const expectedSums=(get('--sums-sha256')||'9bb007b32905a32fabbb00878f3d0bcc654542ec28dbb875da881f4c5d768be0').toLowerCase();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
// 34.5 s (frame 1035) is the reported case; the rest span the film.
// Two control pages use the untouched freeze build (snapshot/control/) to show the defect.
const PRESETS={full:[{first:1035,then:[300,1530,1150,1000,1035,300]},{first:1150,then:[1035,1000,300,1530,1035]},{first:300,then:[1530,1000,1035,1150,1035]},{control:true,first:1035,then:[]},{control:true,first:300,then:[1530,1035,1150]}],
 // Two page loads: the reported case (34.5 s fresh, then after two other frames) on the control and on the fix.
 pair:[{control:true,first:1035,then:[300,1530,1035]},{first:1035,then:[300,1530,1035,1150]}],
 // Control only: a cold load can take over 2 minutes, so one page per turn.
 control:[{control:true,first:1035,then:[300,1530,1035,1150]}],
 fixed:[{first:1035,then:[300,1530,1035,1150]}]};
const PAGES=PRESETS[get('--preset')||'full'];if(!PAGES)throw Error('Unknown preset');
async function prepare(){
 if(fs.existsSync(out))throw Error('Preserve prior render-order check');
 if(fileSHA256(path.join(freeze,'SHA256SUMS.txt'))!==expectedSums)throw Error('Freeze SHA256SUMS differs');
 const sums=fs.readFileSync(path.join(freeze,'SHA256SUMS.txt'),'utf8').trim().split(/\r?\n/).map(l=>{const m=/^([0-9a-f]{64}) [ *]?(.+)$/i.exec(l);return [m[2].replaceAll('\\','/'),m[1].toLowerCase()];}),frozen=new Map(sums);
 const source=path.join(out,'source'),snapshot=path.join(out,'snapshot');fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(freeze,'tree'),source,{recursive:true});
 for(const [r,h] of sums)if(fileSHA256(path.join(source,r))!==h)throw Error('Copied freeze differs: '+r);
 const overlay={};for(const name of fs.readdirSync(path.join(root,'src/film'))){const r='src/film/'+name,mine=fileSHA256(path.join(root,r)),old=frozen.get(r)||null;if(mine!==old){fs.copyFileSync(path.join(root,r),path.join(source,r));overlay[r]={freeze:old,candidate:mine};}}
 const {build}=await import('vite');await build({root:source,configFile:false,base:'./',logLevel:'warn',build:{outDir:snapshot,emptyOutDir:false,target:'esnext',rolldownOptions:{input:path.join(source,'film.html')}}});
 // Control: the untouched freeze, built into snapshot/control/ (served from the same origin).
 const control=path.join(out,'control-source');fs.cpSync(path.join(freeze,'tree'),control,{recursive:true});
 await build({root:control,configFile:false,base:'./',logLevel:'warn',build:{outDir:path.join(snapshot,'control'),emptyOutDir:false,target:'esnext',rolldownOptions:{input:path.join(control,'film.html')}}});
 const files={};(function list(f){for(const e of fs.readdirSync(f,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(f,e.name);if(e.isDirectory())list(p);else files[path.relative(snapshot,p).replaceAll('\\','/')]=fileSHA256(p);}})(snapshot);
 fs.writeFileSync(path.join(out,'candidate-source.json'),JSON.stringify({freeze,freezeSHA256SUMS:expectedSums,ownedFilmOverlay:overlay,snapshotSHA256:sha(JSON.stringify(files)),files},null,2)+'\n');
 console.log(JSON.stringify({out,overlaid:Object.keys(overlay),snapshotSHA256:sha(JSON.stringify(files))}));
}
async function capture(){
 const preset=get('--preset')||'full',reportFile=path.join(out,preset==='full'||preset==='control'?'render-order-report.json':`render-order-report-${preset}.json`);if(fs.existsSync(reportFile))throw Error('Preserve completed render-order check');
 const candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate-source.json'),'utf8')),raw=path.join(out,'raw');fs.mkdirSync(raw,{recursive:true});
 const result={preset:get('--preset')||'full',snapshotSHA256:candidate.snapshotSHA256,url:'film.html?capture&backend=m1&emphasis=absent',harness:'No getContext injection and no warm-up: the overlay code itself must be order-independent',pages:[],errors:[]};
 await withGpu('film:overlay-render-order',async()=>{
  const start=performance.now(),seconds=()=>+((performance.now()-start)/1000).toFixed(2);let browser,server,expired=false;
  const stop=setTimeout(()=>{expired=true;browser?.close().catch(()=>{});},285000);
  try{
   server=await servePinned({folder:path.join(out,'snapshot'),port:5188,middleware(req,res,next){
    const m=/^\/__order\/([a-z0-9-]+)$/.exec(req.url);if(!m)return next();const chunks=[];req.on('data',c=>chunks.push(c));
    req.on('end',()=>{const b=Buffer.concat(chunks);fs.writeFileSync(path.join(raw,m[1]+'.rgba'),b,{flag:'wx'});res.setHeader('Content-Type','application/json');res.end(JSON.stringify({sha256:sha(b),bytes:b.length}));});
   }});
   for(let p=0;p<PAGES.length;p++){
    if(expired||seconds()>240)throw Error('Stopping before the 5-minute GPU cap');
    browser=await launch();const page=(await browser.pages())[0]||await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});page.setDefaultTimeout(Number(get('--page-timeout')||120)*1000);
    page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
    await page.goto(server.url+(PAGES[p].control?'/control':'')+'/film.html?capture&backend=m1&emphasis=absent');await page.waitForFunction(()=>window.strataFilm?.ready);await page.evaluate(()=>document.fonts.ready);
    const order=[PAGES[p].first,...PAGES[p].then],renders=[];
    for(let i=0;i<order.length;i++){
     const label=`${PAGES[p].control?'control':'fixed'}-p${p}-${String(i).padStart(2,'0')}-f${order[i]}`;
     const row=await page.evaluate(async({frame,label})=>{const film=window.strataFilm;film.render(frame/30);const bytes=film.readPixels();const r=await fetch('/__order/'+label,{method:'POST',body:bytes});if(!r.ok)throw Error(await r.text());return {frame,...await r.json()};},{frame:order[i],label});
     renders.push({...row,label,first:i===0});
    }
    result.pages.push({page:p,build:PAGES[p].control?'control (freeze overlays.js)':'fixed',order,renders,seconds:seconds()});console.log(`page ${p} at ${seconds()}s`);
    await browser.close();browser=null;
   }
  }catch(error){result.failure={message:error.message,seconds:seconds()};throw error;}
  finally{try{await browser?.close();}finally{await server?.close();clearTimeout(stop);result.gpuTurnSeconds=seconds();result.expired=expired;
   const summarise=build=>{const byFrame={};for(const pg of result.pages.filter(pg=>pg.build.startsWith(build)))for(const r of pg.renders)(byFrame[r.frame]||=[]).push({label:r.label,sha256:r.sha256,first:r.first});
   return Object.entries(byFrame).map(([frame,list])=>{
    const hashes=[...new Set(list.map(x=>x.sha256))],row={frame:+frame,seconds:+frame/30,renders:list.length,freshRenders:list.filter(x=>x.first).length,distinctHashes:hashes.length,identical:hashes.length===1,renderList:list};
    if(hashes.length>1){const ref=fs.readFileSync(path.join(raw,list[0].label+'.rgba'));row.differences=list.slice(1).map(x=>{const b=fs.readFileSync(path.join(raw,x.label+'.rgba'));let pixels=0,max=0;for(let i=0;i<ref.length;i+=4){let d=0;for(let k=0;k<3;k++)d=Math.max(d,Math.abs(ref[i+k]-b[i+k]));if(d){pixels++;max=Math.max(max,d);}}return {label:x.label,pixels,maximumCode:max};});}
    return row;});};
   result.frames=summarise('fixed');result.control=summarise('control');
   result.passes=!result.failure&&!result.errors.length&&result.frames.length>0&&result.frames.every(f=>f.identical);
   fs.writeFileSync(reportFile,JSON.stringify(result,null,2)+'\n');}}
 });
 console.log(JSON.stringify({passes:result.passes,gpuTurnSeconds:result.gpuTurnSeconds,frames:result.frames.map(f=>[f.frame,f.renders,f.freshRenders,f.distinctHashes]),control:result.control.map(f=>[f.frame,f.renders,f.distinctHashes,f.differences])}));
}
(mode==='prepare'?prepare():mode==='capture'?capture():Promise.reject(Error('usage: render-order-check.cjs prepare|capture [--out dir]'))).catch(e=>{console.error(e);process.exitCode=1;});
