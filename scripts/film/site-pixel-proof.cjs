'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs'),{bin,sha256}=require('../media.cjs'),{difference}=require('../capture-session.cjs');
const {installCanvasReadback,packCanvasReadback,topDownRGBA}=require('./canvas-readback.cjs'),{ghostMask,maskedDifference}=require('./marker-mask.cjs');
const base=path.join(root,'output','site','perf-r2-r1'),out=path.join(base,'pixel-isolation-r1'),captures=[],proofs=[];
function gateInitialRaf(){const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),held=new Map();let gated=true,fake=-1;
  window.requestAnimationFrame=callback=>{if(!gated)return request(callback);const id=fake--;held.set(id,{callback});return id;};
  window.cancelAnimationFrame=id=>{const item=held.get(id);if(item){if(item.nativeId)cancel(item.nativeId);held.delete(id);}else cancel(id);};
  window.__releaseSiteRaf=()=>{gated=false;for(const [id,item]of held)item.nativeId=request(time=>{held.delete(id);item.callback(time);});};}
function write(name,data){fs.writeFileSync(path.join(out,name),JSON.stringify(data,null,2)+'\n');}
function encode(rgba,width,height,file){const r=spawnSync(bin('ffmpeg'),['-v','error','-f','rawvideo','-pix_fmt','rgba','-s',`${width}x${height}`,'-i','pipe:0','-frames:v','1',file],{input:rgba,maxBuffer:4*1024*1024});if(r.status!==0)throw new Error(r.stderr.toString());}
function decode(file){const r=spawnSync(bin('ffmpeg'),['-v','error','-i',file,'-f','rawvideo','-pix_fmt','rgba','pipe:1'],{maxBuffer:64*1024*1024});if(r.status!==0)throw new Error(r.stderr.toString());return r.stdout;}
async function settle(page){await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.waitForFunction(()=>{const m=window.strataSite.metadata();if(m?.occlusion?.error)throw new Error(m.occlusion.error);return !m?.scheduler||!m.scheduler.pendingFrame&&!m.resolution.interacting&&!m.occlusion?.pending;},{polling:50});}
async function save(page,key){
  const result=await page.evaluate(packCanvasReadback),raw=topDownRGBA(result),canvasFile=path.join(out,key+'-canvas.png'),domFile=path.join(out,key+'-dom.png');
  encode(raw,result.width,result.height,canvasFile);await page.screenshot({path:domFile});
  const boxes=await page.$$eval('.marker',nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {id:node.dataset.featureId,hidden:node.hidden,display:getComputedStyle(node).display,x:r.x,y:r.y,width:r.width,height:r.height};}));
  const row={key,width:result.width,height:result.height,canvasFile,domFile,sha256:sha256(raw),state:result.state,matrices:result.matrices,boxes};captures.push(row);write('captures.json',captures);return row;
}
async function main(){
  if(fs.existsSync(out))throw new Error('Preserve existing pixel isolation folder');fs.mkdirSync(out,{recursive:true});
  for(const file of ['site-pixel-proof.cjs','canvas-readback.cjs','marker-mask.cjs'])fs.copyFileSync(path.join(__dirname,file),path.join(out,file));
  for(const stage of ['baseline','candidate-r4']){const manifest=JSON.parse(fs.readFileSync(path.join(base,stage,'snapshot-manifest.json')));for(const[file,hash]of Object.entries(manifest.files))if(sha256(fs.readFileSync(path.join(base,stage,'snapshot',file)))!==hash)throw new Error('Frozen input changed');}
  const server=await servePinned({folder:base,port:5188,middleware(req,res,next){const match=/^\/(baseline|candidate-r4)\/(.*)$/.exec(req.url);if(match)req.url='/'+match[1]+'/snapshot/'+match[2];else if(req.url.startsWith('/fonts/'))req.url='/baseline/snapshot'+req.url;next();}});
  let browser,page,deadline;const errors=[];
  async function turn(name,callback){await withGpu('site:pixels:'+name,async()=>{const start=performance.now();deadline=setTimeout(()=>browser?.close().catch(()=>{}),110000);
    try{await callback();if(errors.length)throw new Error(errors.join('\n'));}finally{clearTimeout(deadline);console.log(name+' lock seconds '+((performance.now()-start)/1000).toFixed(2));}});}
  try{
    browser=await launch();page=(await browser.pages())[0]||await browser.newPage();page.setDefaultTimeout(100000);page.on('pageerror',e=>errors.push(e.message));
    await page.evaluateOnNewDocument(gateInitialRaf);await page.evaluateOnNewDocument(installCanvasReadback);
    for(const dpr of [1,2])for(const stage of ['baseline','candidate-r4']){
      const prefix=stage+'-dpr'+dpr;
      await turn(prefix+'-construct',async()=>{await page.bringToFront();await page.setViewport({width:1440,height:900,deviceScaleFactor:dpr});await page.goto(server.url+'/'+stage+'/site.html');await page.waitForFunction(()=>window.strataSite?.ready,{polling:100});});
      await turn(prefix+'-first',async()=>{await page.evaluate(()=>window.__releaseSiteRaf());await settle(page);await save(page,prefix+'-first');});
      await turn(prefix+'-static-views',async()=>{
        for(let repeat=0;repeat<3;repeat++){await page.evaluate(dpr=>window.strataSite.benchmark({frames:1,warmup:0,dpr,pauseAfter:true}),dpr);await settle(page);await save(page,prefix+'-repeat'+repeat);}
        await page.evaluate(()=>window.strataSite.setYear(100,{instant:true}));await page.evaluate(dpr=>window.strataSite.benchmark({frames:1,warmup:0,dpr,pauseAfter:true}),dpr);await settle(page);await save(page,prefix+'-kushan');
      });
      if(stage==='candidate-r4'){
        await turn(prefix+'-resume',async()=>{await page.evaluate(()=>window.strataSite.setYear(2023,{instant:true}));await page.evaluate(dpr=>window.strataSite.benchmark({frames:1,warmup:0,dpr,pauseAfter:false}),dpr);await settle(page);});
        for(const kind of ['orbit','zoom','scrub'])await turn(prefix+'-'+kind,async()=>{
          const r=await page.$eval('#scene',node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
          if(kind==='orbit'){await page.mouse.move(r.x+r.width*.8,r.y+r.height*.55);await page.mouse.down();await page.mouse.move(r.x+r.width*.8+32,r.y+r.height*.55+8,{steps:3});}
          if(kind==='zoom'){await page.mouse.move(r.x+r.width*.8,r.y+r.height*.55);await page.mouse.wheel({deltaY:45});}
          if(kind==='scrub'){const t=await page.$eval('#timeline',node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width};});await page.mouse.move(t.x+t.width*.5,t.y+12);await page.mouse.down();await page.mouse.move(t.x+t.width*.55,t.y+12,{steps:3});}
          if(kind!=='zoom')await page.mouse.up();await settle(page);
          if(kind==='scrub'){await save(page,prefix+'-restored');for(let repeat=0;repeat<3;repeat++){await page.evaluate(dpr=>window.strataSite.benchmark({frames:1,warmup:0,dpr,pauseAfter:true}),dpr);await settle(page);await save(page,prefix+'-full'+repeat);}}
        });
      }
    }
  }finally{clearTimeout(deadline);if(browser)await browser.close();await server.close();}
  for(const dpr of [1,2]){
    const before=captures.find(c=>c.key===`baseline-dpr${dpr}-kushan`),after=captures.find(c=>c.key===`candidate-r4-dpr${dpr}-kushan`),boxes=before.boxes.filter(b=>b.hidden&&b.width&&b.height);
    const mask=ghostMask(before.width,before.height,boxes,dpr),rgba=Buffer.alloc(mask.length*4);for(let i=0;i<mask.length;i++){rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=mask[i]*255;rgba[i*4+3]=255;}encode(rgba,before.width,before.height,path.join(out,`ghost-mask-dpr${dpr}.png`));
    const result=maskedDifference(decode(before.domFile),decode(after.domFile),before.width,before.height,boxes,dpr);
    proofs.push({dpr,ghostBoxes:boxes,ghostProof:result,canvasDifference:difference(decode(before.canvasFile),decode(after.canvasFile))});
  }
  write('ghost-proof.json',proofs);
  const repeatProof=[];
  for(const capture of captures.filter(c=>c.key.endsWith('-first')||c.key.endsWith('-restored'))){
    const prefix=capture.key.replace(/-(first|restored)$/,''),suffix=capture.key.endsWith('first')?'repeat':'full';
    for(let i=0;i<3;i++){const reference=captures.find(c=>c.key===prefix+'-'+suffix+i);repeatProof.push({before:capture.key,after:reference.key,canvasDifference:difference(decode(capture.canvasFile),decode(reference.canvasFile)),domDifference:difference(decode(capture.domFile),decode(reference.domFile)),stateIdentical:JSON.stringify(capture.state)===JSON.stringify(reference.state),matricesIdentical:JSON.stringify(capture.matrices)===JSON.stringify(reference.matrices)});}
  }
  write('canvas-repeat-proof.json',repeatProof);console.log(JSON.stringify({ghost:proofs.map(p=>({dpr:p.dpr,inside:p.ghostProof.insideGhostPixels,outside:p.ghostProof.outsideGhostPixels,canvas:p.canvasDifference})),repeatProof},null,2));
}
module.exports={gateInitialRaf,settle,decode,encode};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
