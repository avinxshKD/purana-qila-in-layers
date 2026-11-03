'use strict';
// CPU only. node scripts/film/review-pack.cjs --chunk 0 --out <new-folder>
// Omit --chunk to include every completed chunk. Partial/incomplete chunks are ignored.
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const puppeteer=require('puppeteer-core');
const {root,executable}=require('../browser.cjs');
const {bin,run,ffmpeg,sha256}=require('../media.cjs');
const args=process.argv.slice(2),get=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
const chunkFolder=path.resolve(get('--chunks')||path.join(root,'output','film','f1','pinned-chunks'));
const out=path.resolve(get('--out')||path.join(root,'output','film','f1-review-r1'));
const selected=get('--chunk');
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const json=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n');
const csv=(name,headers,rows)=>fs.writeFileSync(path.join(out,name),[headers.join(','),...rows.map(row=>row.join(','))].join('\n')+'\n');
function pixels(file,index){
  return run(bin('ffmpeg'),['-hide_banner','-loglevel','error','-i',file,'-vf',`select=eq(n\\,${index})`,'-frames:v','1','-f','rawvideo','-pix_fmt','rgba','pipe:1'],{encoding:null,maxBuffer:16*1024*1024}).stdout;
}
function pixelDiff(a,b){
  if(a.length!==b.length||!a.length)throw new Error('Decoded frame lengths differ');
  let sum=0,squares=0,pixelsChanged=0,maxChannelDifference=0;
  for(let at=0;at<a.length;at+=4){let changed=false;for(let c=0;c<3;c++){const d=Math.abs(a[at+c]-b[at+c]);sum+=d;squares+=d*d;changed||=d!==0;maxChannelDifference=Math.max(maxChannelDifference,d);}pixelsChanged+=Number(changed);}
  return {meanAbsoluteRGBDifference:sum/(a.length/4*3),rmsRGBDifference:Math.sqrt(squares/(a.length/4*3)),maxChannelDifference,pixelsChanged,pixels:a.length/4};
}
function compareWithNeighbours(diff,leftNeighbour,rightNeighbour){
  const baseline=(leftNeighbour.meanAbsoluteRGBDifference+rightNeighbour.meanAbsoluteRGBDifference)/2;
  return {...diff,expectedNeighbourMeanAbsoluteRGBDifference:baseline,seamToNeighbourRatio:baseline?diff.meanAbsoluteRGBDifference/baseline:null,reviewFlag:baseline>0&&diff.meanAbsoluteRGBDifference/baseline>3};
}
function svgPlot({title,points,series,min,max,reference}){
  const width=1440,height=260,left=84,right=24,top=42,bottom=38,x0=points[0]?.frame??0,x1=points.at(-1)?.frame??1;
  const values=points.flatMap(point=>series.map(item=>item.value(point))).filter(Number.isFinite);
  min=min??Math.min(...values);max=max??Math.max(...values);
  if(!Number.isFinite(min)||!Number.isFinite(max)){min=0;max=1;}
  if(max-min<1e-7){min-=.5;max+=.5;}else{const pad=(max-min)*.1;min-=pad;max+=pad;}
  const x=frame=>left+(frame-x0)/Math.max(1,x1-x0)*(width-left-right),y=value=>height-bottom-(value-min)/(max-min)*(height-top-bottom);
  const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fff"/><g font-family="Arial,sans-serif" font-size="14" fill="#222"><text x="${left}" y="24" font-size="18">${esc(title)}</text>`];
  for(let n=0;n<=4;n++){const value=min+(max-min)*n/4,yy=y(value);parts.push(`<path d="M${left} ${yy}H${width-right}" stroke="#ddd"/><text x="${left-8}" y="${yy+5}" text-anchor="end">${value.toFixed(max-min<.01?6:3)}</text>`);}
  for(let n=0;n<=4;n++){const frame=x0+(x1-x0)*n/4;parts.push(`<text x="${x(frame)}" y="${height-10}" text-anchor="middle">${Math.round(frame)}</text>`);}
  if(reference!==undefined)parts.push(`<path d="M${left} ${y(reference)}H${width-right}" stroke="#777" stroke-dasharray="6 4"/><text x="${width-right}" y="${y(reference)-5}" text-anchor="end">57.5% reference (growth only)</text>`);
  series.forEach((item,index)=>{const valid=points.filter(point=>Number.isFinite(item.value(point)));if(valid.length)parts.push(`<polyline points="${valid.map(point=>`${x(point.frame)},${y(item.value(point))}`).join(' ')}" fill="none" stroke="${item.color}" stroke-width="2"/>`);parts.push(`<text x="${left+index*240}" y="${height-26}" fill="${item.color}">${esc(item.label)}</text>`);});
  parts.push('</g></svg>');return parts.join('');
}
async function main(){
  if(fs.existsSync(path.join(out,'review.html')))throw new Error('Preserve previous review pack; choose a new folder');
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(path.join(out,'thumbs'),{recursive:true});
  const records=fs.readdirSync(chunkFolder).filter(name=>/^part-\d+\.json$/.test(name)).map(name=>{
    const index=Number(name.match(/\d+/)[0]),report=JSON.parse(fs.readFileSync(path.join(chunkFolder,name),'utf8'));return {index,...report,video:path.join(chunkFolder,`part-${index}.mp4`)};
  }).filter(record=>selected===undefined||record.index===Number(selected)).sort((a,b)=>a.startFrame-b.startFrame);
  if(!records.length)throw new Error('No completed chunk matches');
  const manifestFile=path.join(path.dirname(chunkFolder),'snapshot-manifest.json');
  const manifest=fs.existsSync(manifestFile)?JSON.parse(fs.readFileSync(manifestFile,'utf8')):null;
  if(manifest?.snapshotSHA256){
    if(sha256(JSON.stringify(manifest.files))!==manifest.snapshotSHA256)throw new Error('Snapshot manifest digest differs');
    if(records.some(record=>record.snapshotSHA256!==manifest.snapshotSHA256))throw new Error('Review chunks have mixed snapshot hashes');
    json('snapshot-manifest.json',manifest);
  }
  const stats=records.flatMap(record=>record.stats),thumbnails=[],insideMotion=[],seams=[],internalTurnSeams=[];
  const knownIssues=manifest?.sourceArchive?['Inherited accepted A3 issue: the 5 m scale-bar label overlaps the bar end. The M1 labels.js fix is intentionally excluded from the frozen F1-a3 snapshot.']:[];
  json('known-issues.json',knownIssues);
  for(const record of records){
    const localStart=(15-record.startFrame%15)%15,pattern=path.join(out,'thumbs',`part-${record.index}-%03d.png`);
    ffmpeg(['-i',record.video,'-vf',`select=not(mod(n-${localStart}\\,15)),scale=480:270`,'-fps_mode','vfr','-start_number','0',pattern]);
    for(let local=localStart,index=0;local<record.stats.length;local+=15,index++)thumbnails.push({frame:record.startFrame+local,file:`thumbs/part-${record.index}-${String(index).padStart(3,'0')}.png`});
    const head=pixelDiff(pixels(record.video,0),pixels(record.video,1)),tail=pixelDiff(pixels(record.video,record.stats.length-2),pixels(record.video,record.stats.length-1));
    insideMotion.push({chunk:record.index,startFrames:[record.startFrame,record.startFrame+1],head,endFrames:[record.endFrame-2,record.endFrame-1],tail});
    const turnStarts=record.gpuTurnStartFrames||(record.gpuTurnsSeconds?.length===2?[record.startFrame,record.startFrame+45]:[]);
    for(const boundary of turnStarts.slice(1)){
      const local=boundary-record.startFrame;
      const beforePrevious=pixels(record.video,local-2),before=pixels(record.video,local-1),after=pixels(record.video,local),afterNext=pixels(record.video,local+1);
      internalTurnSeams.push({chunk:record.index,frames:[boundary-1,boundary],...compareWithNeighbours(pixelDiff(before,after),pixelDiff(beforePrevious,before),pixelDiff(after,afterNext))});
    }
  }
  for(let index=0;index<records.length-1;index++){
    const left=records[index],right=records[index+1];if(left.endFrame!==right.startFrame)continue;
    const diff=pixelDiff(pixels(left.video,left.stats.length-1),pixels(right.video,0));
    seams.push({frames:[left.endFrame-1,right.startFrame],leftChunk:left.index,rightChunk:right.index,...compareWithNeighbours(diff,insideMotion[index].tail,insideMotion[index+1].head)});
  }
  const flags=stats.map(sample=>({frame:sample.frame,offFrame:sample.anchorVisibility.filter(anchor=>anchor.offFrame).length,occluded:sample.anchorVisibility.filter(anchor=>anchor.occluded).length,anchors:sample.anchorVisibility}));
  csv('camera.csv',['frame','azimuth_degrees','elevation_degrees','distance_metres','active_top_optical_depth_metres','active_top_px_per_metre','world_vertical_px_per_metre','vertical_FOV_degrees'],stats.map(sample=>[sample.frame,sample.pose.azimuthDegrees,sample.pose.elevationDegrees,sample.pose.distanceMetres,sample.activeTopDepthMetres??'',sample.pixelsPerMetreAtActiveTop??'',sample.worldVerticalPixelsPerMetreAtActiveTop??'',sample.verticalFovDegrees??'']));
  csv('top-line.csv',['frame','measured_percent_down_frame','reference_percent','growth_target_applies'],stats.map(sample=>[sample.frame,sample.activeTopFrameY*100,57.5,sample.frame>=240&&sample.frame<1440]));
  csv('callout-flags.csv',['frame','off_frame_count','occluded_count'],flags.map(sample=>[sample.frame,sample.offFrame,sample.occluded]));
  json('callout-flags.json',flags);json('seam-diffs.json',{insideChunkNeighbourMotion:insideMotion,seams,internalGpuTurnSeams:internalTurnSeams,pendingNextChunk:records.at(-1).endFrame<1800?{afterFrame:records.at(-1).endFrame-1,nextFrame:records.at(-1).endFrame,reason:'Adjacent completed chunk not included/present; no seam result invented.'}:null,method:'Decoded H.264 RGB pixel differences. All recorded GPU-turn boundaries, including raw-recovery turns, compared with immediate inside-chunk neighbours on both sides; >3x is a review flag, not proof of a jump.'});
  const specs=[
    {id:'azimuth',title:'Camera azimuth (degrees) per frame',points:stats,series:[{label:'azimuth',color:'#215e9c',value:s=>s.pose.azimuthDegrees}]},
    {id:'elevation',title:'Camera elevation (degrees) per frame',points:stats,series:[{label:'elevation',color:'#215e9c',value:s=>s.pose.elevationDegrees}]},
    {id:'distance',title:'Camera distance (metres) per frame',points:stats,series:[{label:'distance',color:'#215e9c',value:s=>s.pose.distanceMetres}]},
    {id:'pixels-per-metre',title:'Pixels per metre at active top (camera image-plane metre, 25° vertical FOV)',points:stats,series:[{label:'px per metre',color:'#215e9c',value:s=>s.pixelsPerMetreAtActiveTop}]},
    {id:'top-line',title:'Measured central active-top position (% down frame)',points:stats,min:20,max:65,reference:57.5,series:[{label:'measured top',color:'#215e9c',value:s=>s.activeTopFrameY*100}]},
    {id:'callout-flags',title:'Callout visibility flags per frame',points:flags,min:0,max:Math.max(1,...flags.map(s=>s.offFrame+s.occluded)),series:[{label:'off-frame anchors',color:'#bc3f2f',value:s=>s.offFrame},{label:'occluded anchors',color:'#ad7400',value:s=>s.occluded}]}
  ];
  const plots=specs.map(spec=>{const body=svgPlot(spec);fs.writeFileSync(path.join(out,`${spec.id}.svg`),body);return `<section id="${spec.id}" class="plot">${body}</section>`;}).join('');
  const html=`<!doctype html><meta charset="utf-8"><title>F1 review pack</title><style>body{margin:24px;background:#fff;color:#222;font:16px Arial,sans-serif}h1{font-size:24px}.contact{display:grid;grid-template-columns:repeat(3,480px);gap:12px;width:1464px}.contact figure{margin:0}.contact img{width:480px;height:270px;display:block}.contact figcaption{padding:6px 0}.plot{width:1440px;margin-top:24px}svg{display:block}</style><h1>F1 review: frames ${stats[0].frame}–${stats.at(-1).frame}</h1><p>Snapshot SHA-256: ${esc(manifest?.snapshotSHA256??'unavailable for older capture')}</p><p>CPU-only, decoded chunk video. The 57.5% top target applies during growth (frames 240–1439), not the cold-open hero view. Per-frame distance and px/m are listed in camera.csv. Px/m = 1080 / (2 tan(25°/2) × optical depth at the central active-top anchor); the separate world-vertical column includes foreshortening.</p><section id="contact" class="contact">${thumbnails.map(item=>`<figure><img src="${item.file}"><figcaption>Frame ${item.frame} · ${(item.frame/30).toFixed(3)} s</figcaption></figure>`).join('')}</section>${plots}<p>Seams available: ${seams.length}. Missing adjacent chunks remain pending in seam-diffs.json. No callouts occur during the cold open.</p>`;
  fs.writeFileSync(path.join(out,'review.html'),html);
  if(knownIssues.length)fs.appendFileSync(path.join(out,'review.html'),`<section><h2>Known inherited issue</h2><p>${knownIssues.map(esc).join('</p><p>')}</p></section>`);
  const startupFolder=path.join(path.dirname(chunkFolder),'startup'),startupReports=[];
  if(fs.existsSync(startupFolder)){
    fs.mkdirSync(path.join(out,'startup'),{recursive:true});
    for(const name of fs.readdirSync(startupFolder).filter(name=>name.endsWith('.json'))){
      const report=JSON.parse(fs.readFileSync(path.join(startupFolder,name),'utf8'));
      json('startup/'+name,report);
      startupReports.push({file:'startup/'+name,persistentProfile:report.persistentProfile,readySeconds:report.nodeMilestones.find(mark=>mark.name==='film-ready-observed')?.ms/1000,browser:report.browser});
    }
    json('startup-summary.json',startupReports);
    fs.appendFileSync(path.join(out,'review.html'),`<section><h2>Startup breakdown</h2><p>Timestamped node/browser phases and asset fetches: <a href="startup-summary.json">startup-summary.json</a>.</p><ul>${startupReports.map(report=>`<li>${esc(report.file)}: ready ${report.readySeconds?.toFixed(3)} s; persistent profile ${report.persistentProfile}.</li>`).join('')}</ul></section>`);
  }
  const browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--hide-scrollbars']});
  try{const page=await browser.newPage();await page.setViewport({width:1512,height:1000,deviceScaleFactor:1});await page.goto(pathToFileURL(path.join(out,'review.html')).href);await page.waitForFunction(()=>[...document.images].every(image=>image.complete));await (await page.$('#contact')).screenshot({path:path.join(out,'contact-every-15.png')});for(const spec of specs)await (await page.$(`#${spec.id}`)).screenshot({path:path.join(out,`${spec.id}.png`)});}
  finally{await browser.close();}
  const growth=stats.filter(sample=>sample.frame>=240&&sample.frame<1440);
  const range=values=>values.length?{min:Math.min(...values),max:Math.max(...values)}:null;
  const determinismFile=path.join(path.dirname(chunkFolder),'determinism-post.json'),determinism=fs.existsSync(determinismFile)?JSON.parse(fs.readFileSync(determinismFile,'utf8')):null;
  if(determinism)json('determinism-post.json',determinism);
  json('summary.json',{frames:stats.length,chunks:records.map(record=>record.index),snapshotSHA256:manifest?.snapshotSHA256??null,sourceArchiveSHA256:manifest?.sourceArchive?.sha256??null,staticInputsSHA256:manifest?.staticInputsSHA256??null,contactFrames:thumbnails.map(item=>item.frame),seamsAvailable:seams.length,internalGpuTurnSeamsAvailable:internalTurnSeams.length,seamReviewFlags:[...seams,...internalTurnSeams].filter(seam=>seam.reviewFlag),determinismStatus:determinism?(determinism.samples.every(sample=>sample.equal&&sample.matchesChunkCapture)?'pixel-exact repeated scrubs and captured frames':'failed'):'pending',growthCameraDistanceMetres:range(growth.map(sample=>sample.pose.distanceMetres)),growthPixelsPerMetreAtActiveTop:range(growth.map(sample=>sample.pixelsPerMetreAtActiveTop).filter(Number.isFinite)),maximumGpuTurnSeconds:Math.max(...records.map(record=>record.gpuTurnSeconds??0)),coldOpenTopReferenceApplies:false,gpuUsed:false,report:'review.html'});
  console.log(`Review pack: ${out}`);
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={pixelDiff,compareWithNeighbours,svgPlot};
