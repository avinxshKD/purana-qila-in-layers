'use strict';
// Solves and verifies the pinned film callout track on a frozen tree, CPU only.
// 1. Real per-frame silhouettes/anchors (CPU world, reused from a matching geometry run).
// 2. Real Canvas2D label boxes and protected HUD text in headless Edge with the GPU disabled.
// 3. Node solves one locked-side smooth track per label (src/film/callout-track.js).
// 4. Edge lays out all 1800 frames again reading only the track, and every gate is audited,
//    including anchor-relative label motion <= 4 px per frame for labels shown in both frames.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url'),{root,executable}=require('../browser.cjs'),{fileSHA256}=require('./f2-contract.cjs'),puppeteer=require('puppeteer-core');
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const freeze=path.resolve(get('--freeze')||path.join(root,'output/lookdev/modelling/m2/source-m2a')),out=path.resolve(get('--out')||path.join(root,'output/film/callout-track-m2a-r1'));
const geometryFrom=path.resolve(get('--geometry-from')||path.join(root,'output/film/label-gap-m2a-r1/geometry'));
const expectedSums=(get('--sums-sha256')||'b08b95c5efba5fe6ed50a6920dee66eccbc3ae71efbf41a594d6604ea0ca5eb9').toLowerCase();
const url=p=>'/'+path.relative(root,p).split(path.sep).map(encodeURIComponent).join('/');
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
async function main(){
 if(fs.existsSync(out))throw new Error('Preserve existing callout track run');
 if(fileSHA256(path.join(freeze,'SHA256SUMS.txt'))!==expectedSums)throw new Error('Freeze SHA256SUMS differs');
 const started=performance.now(),tree=path.join(freeze,'tree'),candidate=path.join(out,'candidate');fs.mkdirSync(out,{recursive:true});fs.cpSync(tree,candidate,{recursive:true});
 const overlay={};for(const name of fs.readdirSync(path.join(root,'src/film'))){if(name==='callout-track.json')continue;const rel='src/film/'+name,mine=fileSHA256(path.join(root,rel)),p=path.join(tree,rel),old=fs.existsSync(p)?fileSHA256(p):null;if(mine!==old){fs.copyFileSync(path.join(root,rel),path.join(candidate,rel));overlay[rel]={freeze:old,candidate:mine};}}
 // Geometry depends only on the freeze tree plus src/film framing/silhouette code; reuse when those match.
 const prev=JSON.parse(fs.readFileSync(path.join(geometryFrom,'..','candidate-source.json'),'utf8'));
 for(const rel of ['src/film/framing.js','src/film/silhouette.js'])if(fileSHA256(path.join(geometryFrom,'..','candidate',rel))!==fileSHA256(path.join(candidate,rel)))throw new Error('Geometry source differs: '+rel);
 if(prev.freezeSHA256SUMS!==expectedSums)throw new Error('Geometry run used another freeze');
 const geometryDir=path.join(out,'geometry');fs.mkdirSync(geometryDir);const parts=[],geometryHashes={};
 for(const name of fs.readdirSync(geometryFrom).filter(n=>/^part-\d+\.json$/.test(n)).sort()){const p=path.join(geometryDir,name);fs.copyFileSync(path.join(geometryFrom,name),p);parts.push(p);geometryHashes[name]=fileSHA256(p);}
 fs.writeFileSync(path.join(out,'candidate-source.json'),JSON.stringify({freeze,freezeSHA256SUMS:expectedSums,ownedFilmOverlay:overlay,geometryFrom,geometryHashes},null,2)+'\n');
 const {createServer}=await import('vite'),html=fs.readFileSync(path.join(root,'film.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 const server=await createServer({root,cacheDir:path.join(out,'vite-cache'),server:{host:'127.0.0.1',port:0,strictPort:true,watch:null,hmr:false},logLevel:'warn',
  plugins:[{name:'callout-track-page',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url!=='/__callout-track.html')return next();res.setHeader('Content-Type','text/html');res.end(html);});}}]});
 let browser;const inputs=[],verified=[];let environment,trackText,trackSHA256,solved;
 const geometry=[];for(const file of parts)geometry.push(JSON.parse(fs.readFileSync(file)));
 const base=geometry[0].base;
 try{
  await server.listen();browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--force-color-profile=srgb']});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__callout-track.html`);
  environment=await page.evaluate(async treeBase=>{
   const THREE=await import('/node_modules/three/build/three.module.js'),N=await import(treeBase+'/src/film/overlays.js');
   const {applyCamera}=await import(treeBase+'/src/film/camera.js'),{filmState}=await import(treeBase+'/src/film/timeline.js'),{silhouetteFromRows}=await import(treeBase+'/src/film/silhouette.js'),{loadLabelFont}=await import(treeBase+'/src/labels.js');
   await loadLabelFont();await document.fonts.ready;const camera=new THREE.PerspectiveCamera(25,16/9,.1,180);
   const overlays=N.createFilmOverlays(1920,1080,camera);
   window.__track={camera,overlays,applyCamera,filmState,silhouetteFromRows,
    setup(g,base){const state=filmState(g.frame/30);applyCamera(camera,g.frame/30,base,0);
     const cameraError=Math.hypot(...camera.position.toArray().map((v,i)=>v-g.cameraPosition[i]));
     return {state,cameraError,framing:{silhouette:silhouetteFromRows(g.rows,{cell:g.cell,blockLowestY:g.blockLowestY,scalePoints:g.scalePoints.map(([x,y])=>({x,y}))})}};}};
   return {userAgent:navigator.userAgent,fonts:[...document.fonts].map(f=>f.family+':'+f.status)};
  },url(candidate));
  for(const data of geometry){
   const rows=await page.evaluate(data=>{const T=window.__track;return data.frames.map(g=>{const {state,cameraError,framing}=T.setup(g,data.base);
    const free=T.overlays.plan(state,framing,false,g.anchors,data.base);
    return {frame:g.frame,cameraError,...T.overlays.layoutInputs(state,framing,false,g.anchors,data.base),free:free.placed.filter(c=>c.opacity>0).map(c=>({id:c.id,length:c.length,rect:c.rect,anchor:c.anchor})),freeFailures:free.report.failures.length};});},data);
   if(errors.length)throw new Error(errors.join('\n'));inputs.push(...rows);console.log(`inputs ${inputs.length}/1800`);
  }
  inputs.sort((a,b)=>a.frame-b.frame);if(inputs.length!==1800||inputs.some((f,i)=>f.frame!==i))throw new Error('Expected all 1800 frames');
  // Solve in Node with the candidate's own modules.
  const {silhouetteFromRows}=await import(pathToFileURL(path.join(candidate,'src/film/silhouette.js')).href),T=await import(pathToFileURL(path.join(candidate,'src/film/callout-track.js')).href);
  const byFrame=new Map(geometry.flatMap(g=>g.frames).map(g=>[g.frame,g]));
  const solveStarted=performance.now();
  solved=T.solveCalloutTrack(inputs.map(f=>{const g=byFrame.get(f.frame);return {frame:f.frame,items:f.items,protectedRects:f.protectedRects,scaleZones:f.scaleZones,blockLowestY:f.blockLowestY,silhouette:silhouetteFromRows(g.rows,{cell:g.cell,blockLowestY:g.blockLowestY})};}),{log:console.log});
  const solveSeconds=(performance.now()-solveStarted)/1000;
  if(solved.failures.length)console.log(JSON.stringify(solved.failures,null,1));
  const track={version:1,source:{freeze:path.relative(root,freeze),freezeSHA256SUMS:expectedSums,geometryHashes,overlayHashes:Object.fromEntries(Object.entries(overlay).map(([k,v])=>[k,v.candidate]))},
   rule:{grid:T.TRACK_GRID,maximumRelativeStep:T.MAX_RELATIVE_STEP,lockedSide:true},frames:solved.frames};
  trackText=JSON.stringify(track)+'\n';trackSHA256=sha(trackText);
  fs.writeFileSync(path.join(out,'callout-track.json'),trackText);fs.writeFileSync(path.join(candidate,'src/film/callout-track.json'),trackText);
  fs.writeFileSync(path.join(out,'callout-track.sha256'),`${trackSHA256}  callout-track.json\n`);
  // Verify: every frame reads only the pinned track.
  await page.evaluate(text=>{window.__track.track=JSON.parse(text);},trackText);
  for(const data of geometry){
   const rows=await page.evaluate(data=>{const T=window.__track;return data.frames.map(g=>{const {state,cameraError,framing}=T.setup(g,data.base);
    const layout=T.overlays.plan(state,framing,false,g.anchors,data.base,{track:T.track});
    return {frame:g.frame,cameraError,visible:state.overlays.callouts.filter(c=>c.opacity>0).map(c=>c.id),tracked:layout.report.tracked,failures:layout.report.failures,labelGaps:layout.report.labelGaps,minimumTextClearance:layout.report.minimumTextClearance,
     placed:layout.placed.map(c=>({id:c.id,opacity:c.opacity,side:c.side,rect:c.rect,end:c.end,anchor:c.anchor,length:c.length,clearance:c.clearance,labelBottom:c.labelBottom,maxLabelBottom:c.maxLabelBottom}))};});},data);
   if(errors.length)throw new Error(errors.join('\n'));verified.push(...rows);console.log(`verified ${verified.length}/1800`);
  }
  verified.solveSeconds=solveSeconds;
 }finally{await browser?.close();await server.close();}
 verified.sort((a,b)=>a.frame-b.frame);
 const {segmentsCross}=await import(pathToFileURL(path.join(candidate,'src/film/layout.js')).href);
 const gates={maximumCameraError:0,untrackedFrames:0,failures:[],dropped:[],minimumLabelClearance:Infinity,maximumLeader:0,crossings:[],gapViolations:[],minimumGapSlack:Infinity,labelsBelowBlock:[],maximumRelativeStep:0,relativeStepViolations:[]};
 const labels={},prevBy=new Map();
 for(const f of verified){
  gates.maximumCameraError=Math.max(gates.maximumCameraError,f.cameraError);if(!f.tracked)gates.untrackedFrames++;
  for(const x of f.failures)gates.failures.push({frame:f.frame,...x});
  for(const id of f.visible)if(!f.placed.some(c=>c.id===id))gates.dropped.push({frame:f.frame,id});
  for(const c of f.placed){gates.minimumLabelClearance=Math.min(gates.minimumLabelClearance,c.clearance);gates.maximumLeader=Math.max(gates.maximumLeader,c.length);if(c.labelBottom>c.maxLabelBottom+1e-9)gates.labelsBelowBlock.push({frame:f.frame,id:c.id});}
  for(let i=0;i<f.placed.length;i++)for(let j=i+1;j<f.placed.length;j++)if(segmentsCross(f.placed[i].end,f.placed[i].anchor,f.placed[j].end,f.placed[j].anchor))gates.crossings.push({frame:f.frame,ids:[f.placed[i].id,f.placed[j].id]});
  for(const g of f.labelGaps||[]){gates.minimumGapSlack=Math.min(gates.minimumGapSlack,g.gap-g.required);if(g.gap<g.required-1e-9)gates.gapViolations.push({frame:f.frame,...g});}
  const now=new Map();
  for(const c of f.placed){
   const rel={x:c.rect.x-c.anchor.x,y:c.rect.y-c.anchor.y},p=prevBy.get(c.id),L=labels[c.id]||={id:c.id,sides:new Set(),shownFrames:0,maximumRelativeStep:0,maximumAbsoluteStep:0,maximumLeader:0,sumLeader:0,firstShown:null,lastShown:null};
   L.sides.add(c.side);
   if(c.opacity>0){L.shownFrames++;L.firstShown??=f.frame;L.lastShown=f.frame;L.maximumLeader=Math.max(L.maximumLeader,c.length);L.sumLeader+=c.length;}
   if(p&&p.opacity>0&&c.opacity>0){const d=Math.hypot(rel.x-p.rel.x,rel.y-p.rel.y),a=Math.hypot(c.rect.x-p.rect.x,c.rect.y-p.rect.y);L.maximumRelativeStep=Math.max(L.maximumRelativeStep,d);L.maximumAbsoluteStep=Math.max(L.maximumAbsoluteStep,a);gates.maximumRelativeStep=Math.max(gates.maximumRelativeStep,d);if(d>4+1e-9)gates.relativeStepViolations.push({frame:f.frame,id:c.id,pixels:d});}
   now.set(c.id,{rel,rect:c.rect,opacity:c.opacity});
  }
  prevBy.clear();for(const [k,v] of now)prevBy.set(k,v);
 }
 // Compare with the per-frame free layout (current default) to flag compromises.
 const free={};for(const f of inputs)for(const c of f.free){const F=free[c.id]||={maximumLeader:0,sum:0,n:0};F.maximumLeader=Math.max(F.maximumLeader,c.length);F.sum+=c.length;F.n++;}
 const freeMotion={};{const prev=new Map();for(const f of inputs){const now=new Map();for(const c of f.free){const rel={x:c.rect.x-c.anchor.x,y:c.rect.y-c.anchor.y},p=prev.get(c.id);if(p)freeMotion[c.id]=Math.max(freeMotion[c.id]||0,Math.hypot(rel.x-p.x,rel.y-p.y));now.set(c.id,rel);}prev.clear();for(const [k,v] of now)prev.set(k,v);}}
 const solverById=Object.fromEntries(solved.labels.map(l=>[l.id,l]));
 const perLabel=Object.values(labels).map(L=>{const F=free[L.id],mean=L.sumLeader/Math.max(1,L.shownFrames),freeMean=F?F.sum/F.n:null,s=solverById[L.id];
  const compromise=[];if(F&&mean>freeMean*1.25&&mean-freeMean>30)compromise.push(`mean leader ${mean.toFixed(0)}px vs ${freeMean.toFixed(0)}px per-frame optimum`);if(F&&L.maximumLeader>F.maximumLeader+40)compromise.push(`max leader ${L.maximumLeader.toFixed(0)}px vs ${F.maximumLeader.toFixed(0)}px`);if(L.sides.size>1)compromise.push('side changed');
  return {id:L.id,side:[...L.sides].join('/'),shownFrames:L.shownFrames,firstShown:L.firstShown,lastShown:L.lastShown,trackFrames:s?.frames,maximumRelativeStep:+L.maximumRelativeStep.toFixed(3),maximumAbsoluteStep:+L.maximumAbsoluteStep.toFixed(2),
   maximumLeader:+L.maximumLeader.toFixed(1),meanLeader:+mean.toFixed(1),freeMaximumLeader:F?+F.maximumLeader.toFixed(1):null,freeMeanLeader:freeMean===null?null:+freeMean.toFixed(1),freeMaximumRelativeStep:freeMotion[L.id]!==undefined?+freeMotion[L.id].toFixed(1):null,minimumClearance:s?+s.minimumClearance.toFixed(2):null,compromise};});
 const passes=gates.maximumCameraError<1e-6&&!gates.untrackedFrames&&!gates.failures.length&&!gates.dropped.length&&gates.minimumLabelClearance>=24&&gates.maximumLeader<=400&&!gates.crossings.length&&!gates.gapViolations.length&&!gates.labelsBelowBlock.length&&!gates.relativeStepViolations.length&&!solved.failures.length;
 const summary={freeze,candidate:'candidate/ (freeze + owned src/film overlay + src/film/callout-track.json)',environment,frames:1800,track:{file:'callout-track.json',sha256:trackSHA256,bytes:Buffer.byteLength(trackText)},
  rule:'Each label keeps one side of its anchor for its whole tracked life (including the reserved, not-yet-visible span); anchor-relative offset changes <=4 px per frame; every layout gate re-checked on every frame from the track alone',
  gates:{...gates,passes,minimumLabelClearance:gates.minimumLabelClearance,minimumGapSlack:gates.minimumGapSlack},solverFailures:solved.failures,labels:perLabel.sort((a,b)=>(a.firstShown??0)-(b.firstShown??0)),
  solveSeconds:verified.solveSeconds,totalSeconds:(performance.now()-started)/1000};
 fs.writeFileSync(path.join(out,'verified-frames.json'),JSON.stringify(verified));
 fs.writeFileSync(path.join(out,'callout-track-audit.json'),JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify({passes,track:summary.track,maximumRelativeStep:gates.maximumRelativeStep,minimumLabelClearance:gates.minimumLabelClearance,maximumLeader:gates.maximumLeader,minimumGapSlack:gates.minimumGapSlack,failures:gates.failures.length,dropped:gates.dropped.length,crossings:gates.crossings.length,below:gates.labelsBelowBlock.length,stepViolations:gates.relativeStepViolations.length,solverFailures:solved.failures.length,solveSeconds:summary.solveSeconds,totalSeconds:summary.totalSeconds},null,1));
 console.log(JSON.stringify(perLabel.map(l=>[l.id,l.side,l.maximumRelativeStep,l.maximumAbsoluteStep,l.maximumLeader,l.freeMaximumLeader,l.meanLeader,l.freeMeanLeader,l.freeMaximumRelativeStep,l.compromise.join('; ')])));
 if(!passes)process.exitCode=2;
}
main().catch(e=>{console.error(e);process.exitCode=1;});
