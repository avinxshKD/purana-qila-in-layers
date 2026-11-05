'use strict';
// CPU-only film label audit on a pinned tree: real silhouettes/anchors from the CPU world (Node),
// real Canvas2D text in headless Edge with the GPU disabled. Lays out every frame with the
// pinned tree's overlays (before) and with the candidate overlay (after) and lists every move.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{root,executable}=require('../browser.cjs'),{fileSHA256}=require('./f2-contract.cjs'),puppeteer=require('puppeteer-core');
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const freeze=path.resolve(get('--freeze')||path.join(root,'output/lookdev/modelling/m2/source-m2a')),out=path.resolve(get('--out')||path.join(root,'output/film/label-gap-m2a-r1')),workers=Number(get('--workers')||6),geometryFrom=get('--geometry-from')?path.resolve(get('--geometry-from')):null;
const expectedSums=(get('--sums-sha256')||'b08b95c5efba5fe6ed50a6920dee66eccbc3ae71efbf41a594d6604ea0ca5eb9').toLowerCase();
const url=p=>'/'+path.relative(root,p).split(path.sep).map(encodeURIComponent).join('/');
async function main(){
 if(fs.existsSync(out))throw new Error('Preserve existing label audit');
 if(fileSHA256(path.join(freeze,'SHA256SUMS.txt'))!==expectedSums)throw new Error('Freeze SHA256SUMS differs');
 const tree=path.join(freeze,'tree'),candidate=path.join(out,'candidate');fs.mkdirSync(out,{recursive:true});fs.cpSync(tree,candidate,{recursive:true});
 const overlay={};for(const name of fs.readdirSync(path.join(root,'src/film'))){const rel='src/film/'+name,mine=fileSHA256(path.join(root,rel)),p=path.join(tree,rel),old=fs.existsSync(p)?fileSHA256(p):null;if(mine!==old){fs.copyFileSync(path.join(root,rel),path.join(candidate,rel));overlay[rel]={freeze:old,candidate:mine};}}
 // F3: final copy (cold-open tagline) from the live tree, verified against the contract hashes.
 const copyOverlay={};if(args.includes('--f3-copy')){const {COPY}=require('./f3-contract.cjs');for(const [rel,hash]of Object.entries(COPY)){const from=path.join(root,rel);if(fileSHA256(from)!==hash)throw new Error('Live copy differs from the F3 contract: '+rel);const p=path.join(tree,rel);copyOverlay[rel]={freeze:fs.existsSync(p)?fileSHA256(p):null,candidate:hash};fs.copyFileSync(from,path.join(candidate,rel));}}
 fs.writeFileSync(path.join(out,'candidate-source.json'),JSON.stringify({freeze,freezeSHA256SUMS:expectedSums,ownedFilmOverlay:overlay,copyOverlay,geometry:'M2a freeze; src/film overlay does not touch geometry'},null,2)+'\n');
 const started=performance.now(),geometryDir=path.join(out,'geometry');fs.mkdirSync(geometryDir);
 const per=Math.ceil(1800/workers),parts=[];
 // Geometry depends only on the freeze tree and src/film/framing.js; reuse a previous run's parts when both match.
 if(geometryFrom){const prev=JSON.parse(fs.readFileSync(path.join(geometryFrom,'..','candidate-source.json'),'utf8'));if(prev.freezeSHA256SUMS!==expectedSums||fileSHA256(path.join(geometryFrom,'..','candidate','src/film/framing.js'))!==fileSHA256(path.join(candidate,'src/film/framing.js'))||fileSHA256(path.join(geometryFrom,'..','candidate','src/film/silhouette.js'))!==fileSHA256(path.join(candidate,'src/film/silhouette.js')))throw new Error('Geometry source differs');
  for(const name of fs.readdirSync(geometryFrom).filter(n=>/^part-\d+\.json$/.test(n))){fs.copyFileSync(path.join(geometryFrom,name),path.join(geometryDir,name));parts.push(path.join(geometryDir,name));}}
 else await Promise.all(Array.from({length:workers},(_,n)=>new Promise((resolve,reject)=>{
  const from=n*per,to=Math.min(1800,from+per),file=path.join(geometryDir,`part-${n}.json`);parts.push(file);
  const child=spawn(process.execPath,['--max-old-space-size=6144',path.join(__dirname,'label-gap-geometry.mjs'),'--tree',candidate,'--from',String(from),'--to',String(to),'--out',file],{cwd:root,stdio:['ignore','pipe','pipe']});
  let log='';child.stdout.on('data',d=>log+=d);child.stderr.on('data',d=>{const s=String(d);if(!s.includes('already non-indexed'))log+=s;});
  child.on('exit',code=>{fs.writeFileSync(file+'.log',log);code===0?resolve():reject(new Error(`geometry part ${n} exit ${code}: ${log.slice(-500)}`));});
 })));
 const geometrySeconds=(performance.now()-started)/1000;parts.sort();
 const {createServer}=await import('vite'),html=fs.readFileSync(path.join(root,'film.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 const server=await createServer({root,cacheDir:path.join(out,'vite-cache'),server:{host:'127.0.0.1',port:0,strictPort:true,watch:null,hmr:false},logLevel:'warn',
  plugins:[{name:'label-audit-page',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url!=='/__label-audit.html')return next();res.setHeader('Content-Type','text/html');res.end(html);});}}]});
 let browser;const frames=[];let environment;
 try{
  await server.listen();browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--force-color-profile=srgb']});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__label-audit.html`);
  environment=await page.evaluate(async(oldBase,newBase)=>{
   const THREE=await import('/node_modules/three/build/three.module.js'),O=await import(oldBase+'/src/film/overlays.js'),N=await import(newBase+'/src/film/overlays.js');
   const {applyCamera}=await import(newBase+'/src/film/camera.js'),{filmState}=await import(newBase+'/src/film/timeline.js'),{silhouetteFromRows}=await import(newBase+'/src/film/silhouette.js'),{loadLabelFont}=await import(newBase+'/src/labels.js');
   await loadLabelFont();await document.fonts.ready;const camera=new THREE.PerspectiveCamera(25,16/9,.1,180);
   window.__audit={THREE,camera,before:O.createFilmOverlays(1920,1080,camera),after:N.createFilmOverlays(1920,1080,camera),applyCamera,filmState,silhouetteFromRows};
   return {userAgent:navigator.userAgent,fonts:[...document.fonts].map(f=>f.family+':'+f.status)};
  },url(tree),url(candidate));
  for(const file of parts){
   const data=JSON.parse(fs.readFileSync(file));
   const rows=await page.evaluate(data=>{
    const A=window.__audit,pick=layout=>({placed:layout.placed.map(c=>({id:c.id,featureId:c.featureId,rect:c.rect,end:c.end,anchor:c.anchor,length:c.length,clearance:c.clearance,labelBottom:c.labelBottom,maxLabelBottom:c.maxLabelBottom,lines:c.lines,em:c.em,lineGap:c.lineGap,opacity:c.opacity??1})),
     failures:layout.report.failures,minimumTextClearance:layout.report.minimumTextClearance,labelGaps:layout.report.labelGaps||null,callouts:null,
     blocks:(layout.report.textBlocks||[]).map(b=>({id:b.id,joints:b.joints,rects:b.rects,minimumJointSlack:b.minimumJointSlack})),minimumBlockSeparationSlack:layout.report.minimumBlockSeparationSlack??null,
     coldOpenLines:layout.report.coldOpen?.lines||null,endCardUrlLines:layout.report.endCard?.urlLines||null,textClearances:(layout.report.textClearances||[]).filter(t=>['tagline','end-card','title'].includes(t.kind)).map(t=>({id:t.id,kind:t.kind,clearance:t.clearance}))});
    return data.frames.map(g=>{
     const state=A.filmState(g.frame/30);A.applyCamera(A.camera,g.frame/30,data.base,0);
     const cameraError=Math.hypot(...A.camera.position.toArray().map((v,i)=>v-g.cameraPosition[i]));
     const framing={silhouette:A.silhouetteFromRows(g.rows,{cell:g.cell,blockLowestY:g.blockLowestY,scalePoints:g.scalePoints.map(([x,y])=>({x,y}))})};
     const visible=state.overlays.callouts.filter(c=>c.opacity>0).map(c=>c.id);
     return {frame:g.frame,cameraError,visibleCallouts:visible,before:pick(A.before.plan(state,framing,false,g.anchors,data.base)),after:pick(A.after.plan(state,framing,false,g.anchors,data.base))};
    });
   },data);
   frames.push(...rows);if(errors.length)throw new Error(errors.join('\n'));console.log(`${path.basename(file)} laid out (${frames.length}/1800)`);
  }
 }finally{await browser?.close();await server.close();}
 frames.sort((a,b)=>a.frame-b.frame);if(frames.length!==1800||frames.some((f,i)=>f.frame!==i))throw new Error('Expected all 1800 frames');
 // Summary
 const {segmentsCross}=await import(require('node:url').pathToFileURL(path.join(candidate,'src/film/layout.js')).href);
 const dist=(a,b)=>{const dx=Math.max(a.x-b.x-b.width,b.x-a.x-a.width,0),dy=Math.max(a.y-b.y-b.height,b.y-a.y-a.height,0);return Math.hypot(dx,dy);};
 const moves={},gates={maximumCameraError:0,minimumLabelClearance:Infinity,maximumLeader:0,labelsBelowBlock:[],crossings:[],gapViolationsAfter:[],gapViolationsBefore:[],blocks:{},droppedAfter:[],failuresAfter:[],failuresBefore:[],minimumTextClearanceAfter:Infinity,minimumGapSlackAfter:Infinity};
 for(const f of frames){
  gates.maximumCameraError=Math.max(gates.maximumCameraError,f.cameraError);
  for(const side of ['before','after'])for(const x of f[side].failures)(side==='after'?gates.failuresAfter:gates.failuresBefore).push({frame:f.frame,...x});
  for(const b of f.after.blocks||[]){const g=gates.blocks[b.id]||={frames:0,firstFrame:f.frame,lastFrame:f.frame,minimumJointSlack:Infinity,minimumSeparationSlack:Infinity,minimumClearance:Infinity};g.frames++;g.lastFrame=f.frame;if(b.minimumJointSlack!==null)g.minimumJointSlack=Math.min(g.minimumJointSlack,b.minimumJointSlack);if(f.after.minimumBlockSeparationSlack!==null)g.minimumSeparationSlack=Math.min(g.minimumSeparationSlack,f.after.minimumBlockSeparationSlack);for(const t of f.after.textClearances.filter(t=>(b.id==='end-card'?t.kind==='end-card':t.kind!=='end-card')))g.minimumClearance=Math.min(g.minimumClearance,t.clearance);}
  const a=f.after;if(a.minimumTextClearance!==null)gates.minimumTextClearanceAfter=Math.min(gates.minimumTextClearanceAfter,a.minimumTextClearance);
  for(const c of a.placed){gates.minimumLabelClearance=Math.min(gates.minimumLabelClearance,c.clearance);gates.maximumLeader=Math.max(gates.maximumLeader,c.length);if(c.labelBottom>c.maxLabelBottom+1e-9)gates.labelsBelowBlock.push({frame:f.frame,id:c.id});}
  for(let i=0;i<a.placed.length;i++)for(let j=i+1;j<a.placed.length;j++)if(segmentsCross(a.placed[i].end,a.placed[i].anchor,a.placed[j].end,a.placed[j].anchor))gates.crossings.push({frame:f.frame,ids:[a.placed[i].id,a.placed[j].id]});
  for(const g of a.labelGaps||[]){gates.minimumGapSlackAfter=Math.min(gates.minimumGapSlackAfter,g.gap-g.required);if(g.gap<g.required-1e-9)gates.gapViolationsAfter.push({frame:f.frame,...g});}
  const required=Object.fromEntries((a.labelGaps||[]).map(g=>[g.ids.join('+'),g.required]));
  const b=f.before;for(let i=0;i<b.placed.length;i++)for(let j=i+1;j<b.placed.length;j++){const key=[b.placed[i].id,b.placed[j].id].join('+'),gap=dist(b.placed[i].rect,b.placed[j].rect),need=required[key]??Math.max(a.placed.find(x=>x.id===b.placed[i].id)?.em||0,48);if(gap<need-1e-9)gates.gapViolationsBefore.push({frame:f.frame,ids:[b.placed[i].id,b.placed[j].id],gap,required:need});}
  const shown=list=>list.filter(c=>c.opacity>0);
  const ids=new Set([...shown(b.placed).map(c=>c.id),...shown(a.placed).map(c=>c.id)]);
  for(const id of ids){const p=shown(b.placed).find(c=>c.id===id),q=shown(a.placed).find(c=>c.id===id),m=moves[id]||={id,featureId:(p||q).featureId,lines:(q||p).lines,framesPlaced:0,framesMoved:0,maximumMovePixels:0,firstMovedFrame:null,lastMovedFrame:null,droppedFrames:0,addedFrames:0,examples:[]};
   m.framesPlaced++;if(p&&!q){m.droppedFrames++;gates.droppedAfter.push({frame:f.frame,id});continue;}if(!p&&q){m.addedFrames++;continue;}
   const d=Math.hypot(q.rect.x-p.rect.x,q.rect.y-p.rect.y);if(d>.5){m.framesMoved++;m.maximumMovePixels=Math.max(m.maximumMovePixels,d);m.firstMovedFrame??=f.frame;m.lastMovedFrame=f.frame;if(m.examples.length<3||d>=m.maximumMovePixels)m.examples=[...m.examples.slice(0,2),{frame:f.frame,before:p.rect,after:q.rect,leaderBefore:p.length,leaderAfter:q.length}];}
  }
 }
 // Frame-to-frame motion of each shown label; an entry jump is one that happens on the
 // frame the visible set changes (a partner appearing), which the pair layout must avoid.
 const motion={};for(const side of ['before','after']){const prev=new Map(),jumps=[];let prevVisible='';
  for(const f of frames){const now=new Map(),visible=f.visibleCallouts.join('+');for(const c of f[side].placed.filter(c=>c.opacity>0)){now.set(c.id,c.rect);const q=prev.get(c.id);if(q){const d=Math.hypot(c.rect.x-q.x,c.rect.y-q.y);if(d>24)jumps.push({frame:f.frame,id:c.id,pixels:+d.toFixed(1),entry:visible!==prevVisible});}}prev.clear();for(const [k,v] of now)prev.set(k,v);prevVisible=visible;}
  motion[side]={jumpsOver24px:jumps.length,entryJumps:jumps.filter(j=>j.entry),largestJumps:[...jumps].sort((x,y)=>y.pixels-x.pixels).slice(0,12)};}
 gates.entryJumpsAfter=motion.after.entryJumps;
 const moved=Object.values(moves).filter(m=>m.framesMoved||m.droppedFrames).sort((x,y)=>y.maximumMovePixels-x.maximumMovePixels);
 const summary={freeze,candidate:'candidate/ (freeze + owned src/film overlay)',overlay,environment,geometrySeconds,totalSeconds:(performance.now()-started)/1000,frames:1800,
  rule:'Label ink boxes >= max(1 em of the label font, 2 x either label internal ink-to-ink line gap); existing gates kept (24 px block clearance, leaders <= 400 px, no crossings, no labels below block)',
  gates:{...gates,passes:gates.maximumCameraError<1e-6&&gates.minimumLabelClearance>=24&&gates.maximumLeader<=400&&!gates.labelsBelowBlock.length&&!gates.crossings.length&&!gates.gapViolationsAfter.length&&!gates.droppedAfter.length&&!gates.failuresAfter.length&&!gates.entryJumpsAfter.length},motion,
  gapViolationsBeforeCount:gates.gapViolationsBefore.length,gapViolationsBeforeByPair:Object.entries(gates.gapViolationsBefore.reduce((o,v)=>{const k=v.ids.join('+');(o[k]||={frames:0,minimumGap:Infinity,required:v.required});o[k].frames++;o[k].minimumGap=Math.min(o[k].minimumGap,v.gap);return o;},{})).map(([pair,v])=>({pair,...v})),
  movedLabels:moved,unmovedLabels:Object.values(moves).filter(m=>!m.framesMoved&&!m.droppedFrames).map(m=>m.id)};
 summary.gates.gapViolationsBefore=undefined;
 fs.writeFileSync(path.join(out,'frames.json'),JSON.stringify(frames));
 fs.writeFileSync(path.join(out,'label-gap-audit.json'),JSON.stringify(summary,null,2)+'\n');
 console.log(JSON.stringify({passes:summary.gates.passes,minimumLabelClearance:gates.minimumLabelClearance,maximumLeader:gates.maximumLeader,minimumGapSlackAfter:gates.minimumGapSlackAfter,crossings:gates.crossings.length,below:gates.labelsBelowBlock.length,dropped:gates.droppedAfter.length,failuresAfter:gates.failuresAfter.length,failuresBefore:gates.failuresBefore.length,entryJumpsAfter:gates.entryJumpsAfter.length,jumpsOver24:{before:motion.before.jumpsOver24px,after:motion.after.jumpsOver24px},gapViolationsBefore:summary.gapViolationsBeforeByPair,moved:moved.map(m=>({id:m.id,framesMoved:m.framesMoved,of:m.framesPlaced,maximumMovePixels:+m.maximumMovePixels.toFixed(1),dropped:m.droppedFrames})),totalSeconds:summary.totalSeconds},null,1));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
