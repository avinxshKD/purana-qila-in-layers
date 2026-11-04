'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{root}=require('../browser.cjs'),{bin}=require('../media.cjs');
const base=path.join(root,'output','site','perf-r2-r1','pixel-isolation-r1'),out=path.join(base,'crops'),captures=JSON.parse(fs.readFileSync(path.join(base,'captures.json'))),ghost=JSON.parse(fs.readFileSync(path.join(base,'ghost-proof.json')));
if(fs.existsSync(out))throw new Error('Preserve generated pixel crops');fs.mkdirSync(out);
function run(args){const r=spawnSync(bin('ffmpeg'),['-v','error',...args],{maxBuffer:64*1024*1024});if(r.status!==0)throw new Error(r.stderr.toString());return r.stdout;}
function crop(input,rect,file,scale=2){run(['-i',input,'-vf',`crop=${rect.width}:${rect.height}:${rect.x}:${rect.y},scale=iw*${scale}:ih*${scale}:flags=neighbor`,'-frames:v','1',file]);}
const report={ghostCrops:[],residualCrops:[]};
for(const proof of ghost){
  const dpr=proof.dpr,before=captures.find(c=>c.key===`baseline-dpr${dpr}-kushan`),after=captures.find(c=>c.key===`candidate-r4-dpr${dpr}-kushan`);
  for(const side of ['left','right']){
    const boxes=proof.ghostBoxes.filter(b=>(b.x+b.width/2<720)===(side==='left'));if(!boxes.length)continue;
    const x=Math.max(0,Math.floor(Math.min(...boxes.map(b=>b.x))*dpr)-16),y=Math.max(0,Math.floor(Math.min(...boxes.map(b=>b.y))*dpr)-16),
      right=Math.min(before.width,Math.ceil(Math.max(...boxes.map(b=>b.x+b.width))*dpr)+16),bottom=Math.min(before.height,Math.ceil(Math.max(...boxes.map(b=>b.y+b.height))*dpr)+16),rect={x,y,width:right-x,height:bottom-y};
    const beforeFile=path.join(out,`kushan-dpr${dpr}-${side}-before.png`),afterFile=path.join(out,`kushan-dpr${dpr}-${side}-after.png`);
    crop(before.domFile,rect,beforeFile,dpr===1?2:1);crop(after.domFile,rect,afterFile,dpr===1?2:1);report.ghostCrops.push({dpr,side,rect,beforeFile,afterFile});
  }
}
for(const capture of captures.filter(c=>c.key.endsWith('-first')||c.key.endsWith('-restored'))){
  const suffix=capture.key.endsWith('first')?'repeat0':'full0',reference=captures.find(c=>c.key===capture.key.replace(/-(first|restored)$/,'-'+suffix));
  const before=run(['-i',capture.canvasFile,'-f','rawvideo','-pix_fmt','rgba','pipe:1']),after=run(['-i',reference.canvasFile,'-f','rawvideo','-pix_fmt','rgba','pipe:1']),pixels=[];
  for(let i=0;i<before.length;i+=4)if(!before.subarray(i,i+4).equals(after.subarray(i,i+4)))pixels.push({x:i/4%capture.width,y:Math.floor(i/4/capture.width),before:[...before.subarray(i,i+4)],after:[...after.subarray(i,i+4)]});
  report.residualCrops.push({before:capture.key,after:reference.key,pixels});
  for(let index=0;index<pixels.length;index++){
    if(index>=20)break;const p=pixels[index],rect={x:Math.max(0,Math.min(capture.width-32,p.x-16)),y:Math.max(0,Math.min(capture.height-32,p.y-16)),width:32,height:32};
    const first=path.join(out,capture.key+`-pixel${index}-before.png`),last=path.join(out,capture.key+`-pixel${index}-after.png`);
    crop(capture.canvasFile,rect,first,10);crop(reference.canvasFile,rect,last,10);p.crop={rect,before:first,after:last};
  }
}
fs.writeFileSync(path.join(out,'crop-provenance.json'),JSON.stringify(report,null,2)+'\n');
const lines=['# Site ghost markers and canvas-only residuals','','Ghost crops use identical rectangles and nearest-neighbour scaling. The masks in the parent folder come from outward-rounded CSS boxes, with no extra padding in the proof. Crops alone include16px context.',''];
for(const c of report.ghostCrops)lines.push(`## Kushan DPR${c.dpr}, ${c.side}`,'','Before (pre-change S6 app):',`![Before](${c.beforeFile})`,'','After (hidden CSS fixed):',`![After](${c.afterFile})`,'');
for(const r of report.residualCrops){lines.push(`## ${r.before} → ${r.after}`,`Canvas-only differing pixels: ${r.pixels.length}.`,'');for(const p of r.pixels.filter(p=>p.crop))lines.push(`Pixel (${p.x},${p.y}), ${JSON.stringify(p.before)} → ${JSON.stringify(p.after)};32×32 native-pixel crop at10×, unchanged pixel near centre.`,`![Before](${p.crop.before})`,`![After](${p.crop.after})`,'');}
fs.writeFileSync(path.join(out,'review.md'),lines.join('\n')+'\n');console.log(JSON.stringify({ghostCrops:report.ghostCrops.length,residuals:report.residualCrops.map(r=>({before:r.before,pixels:r.pixels.length}))}));
