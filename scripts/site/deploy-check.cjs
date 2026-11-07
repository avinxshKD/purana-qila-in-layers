'use strict';
// Deploy check for the production site build: serves the build folder under the GitHub Pages project path (404 for
// anything else, byte ranges for video), then checks every URL the page, its CSS and JS chunks name, every pool field
// and site-tier pack against its manifest, the video, the poster and the social meta URLs. --browser adds one bounded
// GPU turn loading the page under the sub-path and recording any failed request, the site-tier files fetched before
// ready (first view only), and the shipped framing reference against a live raster. Fails on any placeholder text
// (placeholder-audit.cjs, CPU) and, with --browser, on any in the live 3D page after each step and after a lost
// WebGL context. Never overwrites a report.
// Usage: node scripts/site/deploy-check.cjs --dist dist --out output/site/deploy-check-r1 [--browser [--headed]]
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),zlib=require('node:zlib'),{root,launch}=require('../browser.cjs'),placeholders=require('./placeholder-audit.cjs');
const BASE='/purana-qila-in-layers/',ORIGIN='https://avinxshkd.github.io',PORT=5188,CAP_MS=540000,STEP_YEARS=[2013,2014,2018,2023,150,-400,1650];
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.woff2':'font/woff2','.bin':'application/octet-stream','.rgba':'application/octet-stream','.txt':'text/plain','.md':'text/markdown'};
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function walk(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name),prefix+e.name+'/'):[{file:prefix+e.name,bytes:fs.statSync(path.join(dir,e.name)).size}]);}
function serveDist(dist,port){
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url,'http://x');let rel=decodeURIComponent(url.pathname);
    if(!rel.startsWith(BASE)){res.writeHead(404).end();return;}
    rel=rel.slice(BASE.length)||'index.html';if(rel.endsWith('/'))rel+='index.html';
    const file=path.resolve(dist,rel);if(!file.startsWith(path.resolve(dist)+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
    const size=fs.statSync(file).size,type=TYPES[path.extname(file)]||'application/octet-stream',range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),size-1):size-1;
      res.writeHead(206,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res);return;}
    res.writeHead(200,{'Content-Type':type,'Accept-Ranges':'bytes','Content-Length':size});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve({url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))}));});
}
// Chunks the entry reaches through static imports only; the native world chunk may be reached by dynamic import alone.
function staticChunks(dist,page){
  const entry=/<script type="module"[^>]*src="[^"]*\/assets\/([^"]+\.js)"/.exec(page)?.[1],seen=new Map();
  (function visit(file){
    if(seen.has(file))return;const text=fs.readFileSync(path.join(dist,'assets',file),'utf8');seen.set(file,text.length);
    for(const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*)["']\.\/([^"']+\.js)["']/g))visit(m[1]);
  })(entry);
  return {entry,chunks:Object.fromEntries(seen),native:[...seen.keys()].filter(f=>/^museum-scene-/.test(f))};
}
async function httpChecks(dist,origin){
  const checks=[],failures=[],seen=new Map();
  async function get(urlPath,{expectType,bytes,sha256,range}={}){
    const key=urlPath+(range?'#range':'');if(seen.has(key))return seen.get(key);
    const response=await fetch(origin+urlPath,range?{headers:{Range:range}}:{}),body=Buffer.from(await response.arrayBuffer()),type=response.headers.get('content-type');
    const row={url:urlPath,status:response.status,type,bytes:body.length};
    if(!(response.ok||response.status===206))failures.push(`${urlPath}: HTTP ${response.status}`);
    if(range&&response.status!==206)failures.push(`${urlPath}: range request returned ${response.status}`);
    if(expectType&&!String(type).startsWith(expectType))failures.push(`${urlPath}: type ${type}, expected ${expectType}`);
    if(bytes!==undefined&&body.length!==bytes)failures.push(`${urlPath}: ${body.length} bytes, manifest ${bytes}`);
    if(sha256&&sha(body)!==sha256)failures.push(`${urlPath}: sha256 differs from manifest`);
    checks.push(row);seen.set(key,body);return body;
  }
  const page=(await get(BASE,{expectType:'text/html'})).toString('utf8');
  const absolute=(u,from)=>new URL(u,origin+from).pathname;
  const htmlRefs=[...page.matchAll(/\s(?:src|href|poster|data-poster|srcset)="([^"]+)"/g)].map(m=>m[1]).filter(u=>!/^https?:/.test(u));
  for(const still of ['site-poster/hero-landscape.jpg','site-poster/hero-portrait.jpg'])if(!htmlRefs.some(u=>u.endsWith(still)))failures.push('No hero still in page: '+still);
  const meta=Object.fromEntries([...page.matchAll(/<meta (?:property|name)="((?:og|twitter):[^"]+)" content="([^"]+)"/g)].map(m=>[m[1],m[2]]));
  const wrongRoot=[];
  const rootRef=/["'(`]\/(?!purana-qila-in-layers\/)(film|fonts|site-tier|site-poster|favicon|og-image|film-emphasis|assets|src)[^"'`)]*/g;
  for(const m of page.matchAll(rootRef))wrongRoot.push('index.html: '+m[0].slice(1));
  for(const ref of htmlRefs){const p=absolute(ref,BASE),ext=path.extname(p);await get(p,{expectType:TYPES[ext]?.split(';')[0],range:ext==='.mp4'?'bytes=0-1':undefined});}
  const video=htmlRefs.find(u=>u.endsWith('.mp4'));if(video)await get(absolute(video,BASE),{expectType:'video/mp4'});else failures.push('No video source in page');
  if(!htmlRefs.some(u=>/poster\.jpg$/.test(u)))failures.push('No poster in page');
  for(const asset of walk(path.join(dist,'assets'))){
    const urlPath=BASE+'assets/'+asset.file,text=(await get(urlPath,{expectType:TYPES[path.extname(asset.file)]?.split(';')[0]})).toString('utf8');
    for(const m of text.matchAll(rootRef))wrongRoot.push(asset.file+': '+m[0].slice(1));
    if(asset.file.endsWith('.css'))for(const m of text.matchAll(/url\(["']?([^"')]+)["']?\)/g))if(!m[1].startsWith('data:'))await get(absolute(m[1],urlPath),{expectType:TYPES[path.extname(m[1])]});
    if(asset.file.endsWith('.js'))for(const m of text.matchAll(/["'`](\/purana-qila-in-layers\/[^"'`]+)["'`]/g))if(path.extname(m[1]))await get(m[1]);
  }
  for(const w of wrongRoot)failures.push('Root-absolute URL outside the base: '+w);
  const pool=JSON.parse((await get(BASE+'site-pools-m2b/manifest.json',{expectType:'application/json'})).toString('utf8'));
  if(pool.format!=='r8-crop')failures.push('Site pool manifest format '+pool.format);
  for(const record of Object.values(pool.fields))await get(BASE+'site-pools-m2b/'+record.file,{bytes:record.crop.width*record.crop.height,sha256:record.sha256});
  const tier=JSON.parse((await get(BASE+'site-tier/manifest.json',{expectType:'application/json'})).toString('utf8'));
  for(const entry of Object.values(tier.packs))await get(BASE+'site-tier/'+entry.file,{bytes:entry.bytes});
  const expectedPage=ORIGIN+BASE;
  if(meta['og:url']!==expectedPage)failures.push(`og:url ${meta['og:url']}, expected ${expectedPage}`);
  for(const key of ['og:image','twitter:image']){const u=meta[key];if(!u?.startsWith(expectedPage)){failures.push(`${key} ${u} is not under ${expectedPage}`);continue;}await get(new URL(u).pathname,{expectType:'image/jpeg'});}
  const entryGraph=staticChunks(dist,page);if(!entryGraph.entry)failures.push('No module entry in page');
  for(const file of entryGraph.native)failures.push('Native world chunk on the static entry path: '+file);
  const stray=await fetch(origin+'/site.html');if(stray.status!==404)failures.push('Server answers outside the base');
  return {checks,failures,meta,htmlRefs,entryGraph};
}
// Bytes over the wire for the files fetched before ready, from the build files: gzip (zlib default level, as a static
// host compresses text) for text types, raw for packs, pages, pools, fonts and images. The page itself is not a
// resource timing entry, so index.html is always counted.
const GZIPPED=new Set(['.html','.js','.css','.json','.svg','.txt','.md']);
function wireCategory(rel){const ext=path.extname(rel);
  if(GZIPPED.has(ext))return ext.slice(1);if(rel.startsWith('site-tier/'))return ext==='.bin'?'tier-packs':'tier-pages';
  if(rel.startsWith('site-pools'))return 'pools';if(ext==='.woff2')return 'fonts';if(/^\.(jpe?g|png|webp)$/.test(ext))return 'images';return 'other';}
function wireBytes(dist,paths){
  const rels=[...new Set(['index.html',...paths.filter(p=>p.startsWith(BASE)).map(p=>decodeURIComponent(p.slice(BASE.length))||'index.html')])],files=[],byCategory={};
  for(const rel of rels){const file=path.join(dist,rel);if(!fs.existsSync(file))continue;const body=fs.readFileSync(file),ext=path.extname(rel),category=wireCategory(rel);
    const wire=GZIPPED.has(ext)?zlib.gzipSync(body).length:body.length;files.push({file:rel,category,raw:body.length,wire});
    const c=byCategory[category]??={files:0,raw:0,wire:0};c.files++;c.raw+=body.length;c.wire+=wire;}
  return {method:'gzip (zlib level 6) for html/js/css/json/svg; raw for packs, pages, pools, fonts, images',files:files.length,raw:files.reduce((s,f)=>s+f.raw,0),wire:files.reduce((s,f)=>s+f.wire,0),byCategory,list:files};
}
// Site-tier files allowed before ready: the manifest's first-view packs and the maps of its first-view pages.
function firstViewFiles(dist){
  const manifest=JSON.parse(fs.readFileSync(path.join(dist,'site-tier','manifest.json'),'utf8'));
  return new Set(['manifest.json',...manifest.firstView.map(name=>manifest.packs[name].file),...manifest.firstViewPages.flatMap(name=>Object.values(manifest.pages[name]?.maps??{}).map(map=>map.file))]);
}
async function browserCheck(origin,out,dist,{headless=true}={}){
  const {withGpu}=require('../gpu-lock.cjs');
  return withGpu('site:deploy-check',async()=>{
    const result={requests:0,failed:[],errors:[]},start=performance.now();let browser;const stop=setTimeout(()=>browser?.close().catch(()=>{}),CAP_MS);
    try{
      browser=await launch({headless});const page=(await browser.pages())[0]||await browser.newPage();await page.setViewport({width:1440,height:900,deviceScaleFactor:1});page.setDefaultTimeout(300000);
      page.on('requestfinished',r=>{result.requests++;const s=r.response()?.status();if(s>=400)result.failed.push(`${s} ${r.url()}`);});
      page.on('requestfailed',r=>{const reason=r.failure()?.errorText;if(reason!=='net::ERR_ABORTED')result.failed.push(`${reason} ${r.url()}`);});
      page.on('pageerror',e=>result.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')result.errors.push(m.text());});
      // A visitor's browser is already running: fresh profile (cache-cold), about:blank and ~2 s idle first. A cold
      // browser launch delays the first compositor frame by over a second; site-perf.cjs reports that as info.
      await page.goto('about:blank');await new Promise(r=>setTimeout(r,2000));
      await page.goto(origin+BASE,{waitUntil:'domcontentloaded'});
      // What a visitor sees one second after navigation starts: the hero still and the title must already be up.
      await page.waitForFunction(()=>performance.now()>=1000,{polling:20,timeout:10000});
      result.atOneSecond=await page.evaluate(()=>{const img=document.querySelector('#scene-poster img');
        return {atMs:+performance.now().toFixed(0),title:document.querySelector('#site-title')?.textContent??'',posterLoaded:!!img&&img.complete&&img.naturalWidth>0,poster:img?.currentSrc??null,status:document.querySelector('.scene-load-status')?.textContent??null};});
      // A screenshot needs a frame, so a blocked main thread delays it; shotAtMs shows when it was actually taken.
      await page.screenshot({path:path.join(out,'still-1s.png')});result.atOneSecond.shotAtMs=await page.evaluate(()=>+performance.now().toFixed(0));
      if(!result.atOneSecond.title)result.errors.push('No title at 1 s');if(!result.atOneSecond.posterLoaded)result.errors.push('Hero still not shown at 1 s');
      await page.waitForFunction(()=>window.strataSite?.ready,{timeout:360000});result.readySeconds=+((performance.now()-start)/1000).toFixed(1); // from browser launch, including the 2 s idle; page-relative ready is beforeReady.readyAtMs
      const beforeReady=await page.evaluate(()=>{const ready=window.strataSite.metadata()?.loadTimeline?.find(m=>m.name==='ready')?.atMs??performance.now();
        return {readyAtMs:ready,posterPaintedAtMs:window.strataSite.metadata()?.loadTimeline?.find(m=>m.name==='poster-painted')?.atMs??null,resources:performance.getEntriesByType('resource').filter(e=>e.startTime<ready).map(e=>({path:new URL(e.name).pathname,bytes:e.encodedBodySize||e.transferSize||0}))};});
      const allowed=firstViewFiles(dist),tierBefore=beforeReady.resources.filter(r=>r.path.includes('/site-tier/'));
      result.beforeReady={readyAtMs:beforeReady.readyAtMs,bytes:beforeReady.resources.reduce((s,r)=>s+r.bytes,0),siteTier:tierBefore.map(r=>r.path.split('/').pop()),resources:beforeReady.resources,wire:wireBytes(dist,beforeReady.resources.map(r=>r.path))};
      for(const r of tierBefore)if(!allowed.has(r.path.split('/').pop()))result.errors.push('Fetched before ready, not first view: '+r.path);
      for(const r of beforeReady.resources)if(r.path.startsWith(BASE+'film/'))result.errors.push('Film file fetched before ready: '+r.path);
      result.framing=await page.evaluate(()=>window.strataSite.verifyFraming?.().then(({liveRecord,...rest})=>rest)??null);
      if(!result.framing)result.errors.push('verifyFraming missing');
      else{if(result.framing.source!=='shipped')result.errors.push('Framing reference was rastered live, not shipped');if(!(result.framing.displacementPx<=.5))result.errors.push(`Shipped framing reference is ${result.framing.displacementPx} px from the live one`);}
      // The screenshot waits for a frame, which the WebGL context creation can hold up; what the visitor sees at 1 s is
      // the poster, painted before that work starts (scene mark poster-painted).
      // The scene's poster-painted mark only runs once the scene chunk has loaded, so it is a late bound. The browser's
      // element timing entry for the hero still is its actual first paint, and is the 1 s criterion.
      result.atOneSecond.posterPaintedAtMs=beforeReady.posterPaintedAtMs;
      result.atOneSecond.heroStillPaint=await page.evaluate(()=>new Promise(resolve=>{const timer=setTimeout(()=>resolve(null),2000);new PerformanceObserver((list,observer)=>{const e=list.getEntries().find(x=>x.identifier==='hero-still');if(!e)return;clearTimeout(timer);observer.disconnect();resolve({renderTimeMs:+e.renderTime.toFixed(1),loadTimeMs:+e.loadTime.toFixed(1),url:e.url});}).observe({type:'element',buffered:true});}));
      const heroPaint=result.atOneSecond.heroStillPaint?.renderTimeMs;if(!(heroPaint>0&&heroPaint<=1000))result.errors.push(`Hero still first painted at ${heroPaint??'unknown'} ms, not within 1 s`);
      result.fonts=await page.evaluate(async()=>{await document.fonts.ready;return [...document.fonts].map(f=>`${f.family} ${f.weight} ${f.status}`);});
      result.video=await page.evaluate(()=>new Promise(resolve=>{const v=document.querySelector('#film-video');v.preload='auto';
        v.addEventListener('loadeddata',()=>resolve({currentSrc:v.currentSrc,width:v.videoWidth,height:v.videoHeight,duration:v.duration}),{once:true});
        v.addEventListener('error',()=>resolve({error:v.error?.message??'video error',currentSrc:v.currentSrc}),{once:true});v.load();}));
      // Scripted step changes: every excavation stop and two eras, so lazily fetched packs go through the base.
      result.steps=[];result.placeholders={scenarios:[],hits:[]};
      const audit=async scenario=>{const entries=await page.evaluate(placeholders.collectPage);result.placeholders.scenarios.push({scenario,entries:entries.length});result.placeholders.hits.push(...placeholders.flag(entries,scenario));};
      await audit('live first view');
      for(const year of STEP_YEARS){
        await page.evaluate(y=>window.strataSite.setYear(y,{instant:true}),year);
        await page.waitForFunction(()=>{const m=window.strataSite.metadata();return m&&!m.residency?.pending&&!m.scheduler.pendingFrame;},{timeout:120000,polling:100});
        const m=await page.evaluate(()=>{const m=window.strataSite.metadata();return {residency:m.residency,resident:m.resident??null};});
        result.steps.push({year,failed:m.residency.failed,resident:m.resident});if(m.residency.failed)result.errors.push(`Step ${year} failed: ${JSON.stringify(m.residency.failed)}`);
        await audit(`live year ${year}`);
      }
      result.urls=await page.evaluate(()=>performance.getEntriesByType('resource').map(e=>new URL(e.name).pathname));
      result.filmPosterPrefetched=result.urls.some(u=>u===BASE+'film/strata-web-poster.jpg');if(!result.filmPosterPrefetched)result.errors.push('Film poster not prefetched after ready');
      result.packFetches=result.urls.filter(u=>/\/site-tier\//.test(u));result.poolFetches=result.urls.filter(u=>/\/site-pools-m2b\//.test(u));
      const outside=[...result.packFetches,...result.poolFetches].filter(u=>!u.startsWith(BASE));if(outside.length)result.errors.push('Fetched outside the base: '+outside.join(', '));
      // Last, since it ends the 3D view: the context-lost note must carry no placeholder text either.
      result.contextLost=await page.evaluate(()=>{const ext=document.querySelector('#scene').getContext('webgl2')?.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;});
      if(!result.contextLost)result.errors.push('WEBGL_lose_context unavailable');
      else{await page.waitForFunction(()=>window.strataSite.metadata()?.contextLost&&document.body.textContent.includes('The 3D view stopped.'),{timeout:10000}).catch(()=>result.errors.push('No context-lost note'));await audit('live context lost');}
      for(const h of result.placeholders.hits)result.errors.push(`Placeholder ${h.pattern} in ${h.kind} "${h.text}" at ${h.where} (${h.scenario})`);
    }finally{clearTimeout(stop);await browser?.close().catch(()=>{});}
    return result;
  });
}
async function main(){
  const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
  const dist=path.resolve(root,arg('--dist','dist')),out=path.resolve(root,arg('--out','output/site/deploy-check-r1')),reportFile=path.join(out,'deploy-check.json');
  if(fs.existsSync(reportFile))throw new Error('Preserve deploy check '+reportFile);if(!fs.existsSync(path.join(dist,'index.html')))throw new Error('No build at '+dist);
  fs.mkdirSync(out,{recursive:true});
  const files=walk(dist).sort((a,b)=>b.bytes-a.bytes),totalBytes=files.reduce((s,f)=>s+f.bytes,0);
  const unexpected=files.filter(f=>/(^|\/)(film|features|site)\.html$|^src\/|^scripts\/|^film-emphasis[^/]*\/|\.map$/.test(f.file)).map(f=>f.file);
  // The browser turn uses the shared capture port; an HTTP-only check takes any free port.
  const server=await serveDist(dist,args.includes('--browser')?PORT:0);let report;
  try{
    const http_=await httpChecks(dist,server.url);
    const failures=[...http_.failures,...unexpected.map(f=>'Unexpected file in build: '+f)];
    let browser=null;if(args.includes('--browser')){browser=await browserCheck(server.url,out,dist,{headless:!args.includes('--headed')});failures.push(...browser.failed.map(f=>'Browser: '+f),...browser.errors.map(e=>'Browser error: '+e));
      if(browser.video?.error||browser.video?.width!==1920)failures.push('Browser video: '+JSON.stringify(browser.video));}
    // After the timed browser turn, never alongside it.
    const audit=await placeholders.auditSite(server.url,BASE);
    failures.push(...audit.hits.map(h=>`Placeholder ${h.pattern} in ${h.kind} "${h.text}" at ${h.where} (${h.scenario})`),...audit.errors.map(e=>'Placeholder audit: '+e));
    report={dist,base:BASE,origin:ORIGIN,totalBytes,totalMegabytes:+(totalBytes/1e6).toFixed(2),fileCount:files.length,largest:files.slice(0,10),files,http:http_,placeholderAudit:{patterns:audit.patterns,scenarios:audit.scenarios.length,hits:audit.hits,errors:audit.errors},browser,failures,pass:failures.length===0};
  }finally{await server.close();}
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({pass:report.pass,files:report.fileCount,totalMB:report.totalMegabytes,urlsChecked:report.http.checks.length,placeholderAudit:{scenarios:report.placeholderAudit.scenarios,hits:report.placeholderAudit.hits.length,live:report.browser?.placeholders&&{scenarios:report.browser.placeholders.scenarios.length,hits:report.browser.placeholders.hits.length},contextLost:report.browser?.contextLost},largest:report.largest.slice(0,5).map(f=>`${f.file} ${(f.bytes/1e6).toFixed(2)}MB`),browser:report.browser&&{atOneSecond:report.browser.atOneSecond,beforeReady:report.browser.beforeReady&&(({resources,wire,...rest})=>({...rest,wire:wire&&{method:wire.method,raw:wire.raw,wire:wire.wire,byCategory:wire.byCategory}}))(report.browser.beforeReady),framing:report.browser.framing&&{source:report.browser.framing.source,rowsEqual:report.browser.framing.rowsEqual,displacementPx:report.browser.framing.displacementPx},readyAtMs:report.browser.beforeReady?.readyAtMs,launchToReadySeconds:report.browser.readySeconds,requests:report.browser.requests,video:report.browser.video,steps:report.browser.steps?.length,packFetches:report.browser.packFetches?.length,poolFetches:report.browser.poolFetches?.length},failures:report.failures}));
  if(!report.pass)process.exitCode=1;
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={BASE,ORIGIN,serveDist};
