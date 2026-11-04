'use strict';
const fs=require('node:fs'),path=require('node:path');
const {root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs');
const {servePinned}=require('./static-server.cjs'),{sha256,rawPng,ffmpeg}=require('../media.cjs'),{cameraScale}=require('./camera-scale.cjs');
const {verifySnapshot,assertBackend}=require('./f2-contract.cjs');
const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
const out=path.resolve(get('--out')||path.join(root,'output','film','f2','preflight-a3-r1b'));
const backend=get('--backend')||'a3',integrationOnly=backend==='m1';
const sourceInputFile=path.join(out,'source-inputs.json'),sourceInput=fs.existsSync(sourceInputFile)?JSON.parse(fs.readFileSync(sourceInputFile)):null;
const revision=get('--revision')||sourceInput?.revision||(integrationOnly?'r2':'r1b'),corrected=integrationOnly&&revision!=='r2';
if(!['a3','m1'].includes(backend))throw new Error('Unknown preflight backend');
if(!/^[a-z0-9-]+$/.test(revision)||sourceInput&&sourceInput.backend!==backend)throw new Error('Preflight revision/backend provenance differs');
const times=[0,4.5,8,...Array.from({length:10},(_,i)=>8+4*i+(1+3.8)/2),49,51,53,59.7];
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
async function main(){
  if(fs.existsSync(path.join(out,'review.html')))throw new Error('Preserve completed preflight review');
  const manifest=verifySnapshot(out);
  const rawFolder=path.join(out,'raw'),stills=path.join(out,'stills');fs.mkdirSync(rawFolder,{recursive:true});fs.mkdirSync(stills,{recursive:true});
  const server=await servePinned({folder:path.join(out,'snapshot'),port:5188,middleware(req,res,next){
    const match=/^\/__preflight\/(\d+)$/.exec(req.url);if(!match)return next();
    if(req.method!=='POST'){res.writeHead(405).end();return;}
    const chunks=[];let length=0;req.on('data',chunk=>{length+=chunk.length;if(length>1920*1080*4)req.destroy();else chunks.push(chunk);});
    req.on('end',()=>{const bytes=Buffer.concat(chunks);if(bytes.length!==1920*1080*4){res.writeHead(400).end('Raw byte count');return;}
      fs.writeFileSync(path.join(rawFolder,match[1]+'.rgba'),bytes);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({sha256:sha256(bytes)}));});
  }});
  let browser,page,deadline;const samples=[],captures=[],errors=[];
  async function capture(index){
    const result=await page.evaluate(async({seconds,index})=>{
      const data=window.strataFilm.render(seconds),response=await fetch('/__preflight/'+index,{method:'POST',body:window.strataFilm.readPixels()});
      if(!response.ok)throw new Error(await response.text());return {index,seconds,frame:Math.round(seconds*30),...await response.json(),metrics:data};
    },{seconds:times[index],index});
    captures.push(result);write('stills.json',captures);console.log('Preflight still '+index+' at'+times[index]+'s');
    if(errors.length)throw new Error(errors.join('\n'));
  }
  async function gpuTurn(name,callback){
    await withGpu('film:f2-preflight:'+name,async()=>{
      const start=performance.now();
      deadline=setTimeout(()=>{console.error('Preflight GPU deadline: closing our browser');browser?.close().catch(()=>{});},110000);
      try{await callback();}catch(error){await browser?.close();browser=undefined;throw error;}
      finally{clearTimeout(deadline);console.log(name+' GPU turn '+((performance.now()-start)/1000).toFixed(2)+'s');}
    });
  }
  try{
    await gpuTurn(`all17-${backend}-${revision}-stills`,async()=>{
      browser=await launch();page=(await browser.pages())[0]||await browser.newPage();await page.bringToFront();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});
      page.setDefaultTimeout(100000);page.on('pageerror',error=>errors.push(error.message));
      await page.goto(server.url+'/film.html?capture&backend='+backend);await page.waitForFunction(()=>window.strataFilm?.ready);
      if(integrationOnly)assertBackend(await page.evaluate(()=>window.strataFilm.sample(0)));
      for(let index=0;index<times.length;index++)await capture(index);
      write('device.json',await page.evaluate(()=>window.strataFilm.device()));
    });
    // No RAF loop exists in the film. These samples update CPU state only, so
    // another agent may use the GPU while the strict per-frame audit runs.
    for(let first=0;first<1800;first+=15){
      const batch=await page.evaluate(first=>Array.from({length:Math.min(15,1800-first)},(_,i)=>{
        const d=window.strataFilm.sample((first+i)/30);return {frame:first+i,pose:d.pose,framing:d.framing,overlayReport:d.overlayReport,anchorVisibility:d.anchorVisibility,geometryAudit:d.geometryAudit,activeTopFrameY:d.activeTopFrameY,activeTopWorldY:d.activeTopWorldY,backend:d.backend,provisionalGeometry:d.provisionalGeometry};
      }),first);
      for(const sample of batch)samples.push({...sample,...cameraScale(sample.pose,sample.activeTopWorldY)});
      const batchFolder=path.join(out,'cpu-batches');fs.mkdirSync(batchFolder,{recursive:true});fs.writeFileSync(path.join(batchFolder,String(first).padStart(4,'0')+'.json'),JSON.stringify(batch)+'\n');
      if(first%150===0)console.log('CPU-only frame audit '+first+'/1800');
    }
    write('frame-metrics.json',samples);
    // Closing this owned, idle browser releases its context; there is no second
    // render turn. All GL rendering/capture ended before the CPU-only audit.
    await browser.close();browser=undefined;
  }finally{
    clearTimeout(deadline);
    if(browser)await browser.close();
    await server.close();
  }
  for(let index=0;index<times.length;index++)rawPng(path.join(rawFolder,index+'.rgba'),path.join(stills,String(index).padStart(2,'0')+'.png'));
  ffmpeg(['-framerate','1','-start_number','0','-i',path.join(stills,'%02d.png'),'-vf','scale=480:270,tile=4x5','-frames:v','1',path.join(out,'contact-17.png')]);
  const failures=new Map(),anchors=new Map();
  for(const sample of samples){
    for(const failure of sample.overlayReport.failures){if(!failures.has(failure.id))failures.set(failure.id,{...failure,frames:[]});failures.get(failure.id).frames.push(sample.frame);}
    for(const raw of sample.anchorVisibility){const anchor={...raw,frame:sample.frame,offFrame:!raw.missing&&raw.offFrame};if(anchor.offFrame||anchor.occluded||anchor.missing){if(!anchors.has(anchor.id))anchors.set(anchor.id,{id:anchor.id,featureId:anchor.featureId,firstFailure:anchor,occludedFrames:[],offFrameFrames:[],missingFrames:[]});const row=anchors.get(anchor.id);if(anchor.occluded)row.occludedFrames.push(sample.frame);if(anchor.offFrame)row.offFrameFrames.push(sample.frame);if(anchor.missing)row.missingFrames.push(sample.frame);}}
  }
  const summary={timingContract:'film-timing.md v1.3',revision,snapshotSHA256:manifest.snapshotSHA256,backend,geometryProvisional:!integrationOnly,integrationOnly,lookAcceptance:corrected?'Pending corrected-look r2b review; not full-render authorization':integrationOnly?'Pending era-top texture fix and r2b':'A3 stand-in only',stillTimes:times,stillCount:times.length,framesAudited:samples.length,
    distanceMetres:{minimum:Math.min(...samples.map(s=>s.pose.distanceMetres)),maximum:Math.max(...samples.map(s=>s.pose.distanceMetres)),coldOpenEnd:72.5},
    pixelsPerMetre:{minimum:Math.min(...samples.map(s=>s.pixelsPerMetreAtActiveTop)),maximum:Math.max(...samples.map(s=>s.pixelsPerMetreAtActiveTop))},
    minimumFrameMargin:Math.min(...samples.map(s=>s.framing.minimumMargin)),minimumTextClearance:Math.min(...samples.map(s=>s.overlayReport.minimumTextClearance??Infinity)),
    maximumLeaderLength:Math.max(...samples.map(s=>s.overlayReport.maximumLeaderLength??0)),layoutFailures:[...failures.values()],anchorFailures:[...anchors.values()],
    minimumScaleClearance:Math.min(...samples.map(s=>s.overlayReport.minimumScaleClearance??Infinity)),
    minimumScaleGlyphGap1080:Math.min(...samples.flatMap(s=>(s.overlayReport.scaleLabelLayout||[]).map(label=>label.gapPx1080))),
    minimumScaleReservePadding:Math.min(...samples.map(s=>s.overlayReport.minimumScaleReservePadding??Infinity)),
    scaleLabelCountFailures:samples.filter(s=>(s.overlayReport.scaleLabels||[]).length!==2).map(s=>s.frame),
    geometryFailures:samples.filter(s=>integrationOnly&&(s.geometryAudit.standInApplied||s.geometryAudit.visibleLegacyPlaneCaps.length||s.geometryAudit.flatGrowthTops.length)).map(s=>({frame:s.frame,...s.geometryAudit})),
    maximumTopOutsideBlockMetres:Math.max(0,...samples.flatMap(s=>(s.geometryAudit?.topMeshes||[]).map(mesh=>mesh.outsideBlockMetres))),
    labelsBelowBlock:samples.filter(s=>s.overlayReport.maximumLabelBottom!==null&&s.overlayReport.maximumLabelBottom>s.overlayReport.blockLowestY).map(s=>s.frame),
    silhouette:samples[0].framing.silhouetteReport,endCardBoxMaximumWidth:450,
    rayToleranceMetres:.0001,scaleBarGapGate:'Shared full-ink layout/draw; glyph gap≥6px, actual ink reserve≥24px',persistentProfileGate:'Pending fresh/profile final F2 snapshot pixel check',fullRenderAuthorized:false};
  write('summary.json',summary);
  const rows=[['frame','distance_m','active_top_frame_y','active_top_world_y','px_per_m','bbox_x_pct','bbox_y_pct','bbox_width_pct','bbox_height_pct','minimum_margin_pct','minimum_text_clearance_px','maximum_leader_px','layout_failures','occluded_anchors','off_frame_anchors'].join(',')];
  for(const s of samples){const b=s.framing.bboxFraction;rows.push([s.frame,s.pose.distanceMetres,s.activeTopFrameY,s.activeTopWorldY,s.pixelsPerMetreAtActiveTop,b.x*100,b.y*100,b.width*100,b.height*100,s.framing.minimumMargin*100,s.overlayReport.minimumTextClearance,s.overlayReport.maximumLeaderLength,s.overlayReport.failures.length,s.anchorVisibility.filter(a=>a.occluded).length,s.anchorVisibility.filter(a=>a.offFrame).length].join(','));}
  fs.writeFileSync(path.join(out,'frame-metrics.csv'),rows.join('\n')+'\n');
  fs.writeFileSync(path.join(out,'review.html'),`<!doctype html><meta charset="utf-8"><title>F2 ${backend} ${revision} preflight</title><style>body{background:#191b1c;color:#eee4d2;font:16px sans-serif;margin:24px}main{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}img{width:100%}figure{margin:0}pre{white-space:pre-wrap}</style><h1>F2 ${integrationOnly?revision+' M1 candidate':'A3 stand-in'}</h1><p>17 preflight stills only. ${corrected?'Fresh corrected-M1 look, anchors, framing and HUD review. Acceptance remains pending.':integrationOnly?'Real M1 anchors and validated CPU displacement. Integration review only; era-top look awaits r2b.':'A3 geometry and schematic anchors are provisional.'} No full render is authorized.</p><p><a href="summary.json">Summary</a> · <a href="frame-metrics.csv">1800-frame report</a></p><main>${times.map((t,i)=>`<figure><img src="stills/${String(i).padStart(2,'0')}.png"><figcaption>${t.toFixed(1)}s · frame${Math.round(t*30)}</figcaption></figure>`).join('')}</main>`);
  console.log(JSON.stringify({...summary,layoutFailures:summary.layoutFailures.map(f=>({...f,frames:f.frames.length})),anchorFailures:summary.anchorFailures.map(f=>({...f,occludedFrames:f.occludedFrames.length,offFrameFrames:f.offFrameFrames.length,missingFrames:f.missingFrames.length}))},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
