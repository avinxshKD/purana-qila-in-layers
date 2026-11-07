'use strict';
// Side-by-side review stills of two review-stills.cjs runs of the same shot set (left | right), with the left run's
// label boxes dashed over the right image, and a JSON of per-label shifts, lost labels and layout failures.
// DOM-only (no WebGL), so no GPU lock. Never overwrites an output folder.
// Usage: node scripts/site/side-by-side.cjs --left output/site/review-rc2-cell1 --right output/site/review-rc2-cell4 --out output/site/cell-compare-rc2 [--labels "cell 1,cell 4"]
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs');
const rectShift=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y),Math.abs(a.x+a.width-b.x-b.width),Math.abs(a.y+a.height-b.y-b.height));
const pointShift=(a,b)=>a&&b?Math.hypot((a.x??a[0])-(b.x??b[0]),(a.y??a[1])-(b.y??b[1])):null;
function compare(left,right){
  const byId=new Map(right.layout.placed.map(p=>[p.id,p])),labels=left.layout.placed.map(p=>{const q=byId.get(p.id);
    return q?{id:p.id,rectShift:+rectShift(p.rect,q.rect).toFixed(1),endShift:p.end&&q.end?+pointShift(p.end,q.end).toFixed(1):null,lines:[p.lines,q.lines]}:{id:p.id,lost:true};});
  const minHud=s=>Math.min(...(s.layout.hudClearances||[]).map(h=>h.clearance));
  return {labels,lost:labels.filter(l=>l.lost).map(l=>l.id),added:right.layout.placed.filter(p=>!left.layout.placed.some(q=>q.id===p.id)).map(p=>p.id),
    maxShift:Math.max(0,...labels.filter(l=>!l.lost).map(l=>Math.max(l.rectShift,l.endShift??0))),failures:[left.layout.failures.length,right.layout.failures.length],
    audit:[left.layout.audit,right.layout.audit],minHudClearance:[minHud(left),minHud(right)],errors:[left.errors,right.errors]};
}
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];};
  const leftDir=path.resolve(root,arg('--left')),rightDir=path.resolve(root,arg('--right')),out=path.resolve(root,arg('--out')),[leftName,rightName]=arg('--labels','cell 1,cell 4').split(',');
  if(fs.existsSync(out))throw new Error('Preserve '+out);fs.mkdirSync(out,{recursive:true});
  const read=dir=>JSON.parse(fs.readFileSync(path.join(dir,'review-stills.json'),'utf8')),left=read(leftDir),right=read(rightDir),report={left:leftDir,right:rightDir,shots:[]};
  const browser=await launch({headless:true});
  try{
    const page=await browser.newPage();
    for(const shot of left.shots){
      const other=right.shots.find(s=>s.name===shot.name);if(!other)continue;
      const diff=compare(shot,other),uri=file=>'data:image/jpeg;base64,'+fs.readFileSync(file).toString('base64'),{width,height}=shot.viewport,scale=.5;
      const boxes=shot.layout.placed.map(p=>`<div style="position:absolute;left:${p.rect.x*scale}px;top:${p.rect.y*scale}px;width:${p.rect.width*scale}px;height:${p.rect.height*scale}px;outline:1px dashed #ff3d7f"></div>`).join('');
      const panel=(src,caption,overlay='')=>`<figure style="margin:0;position:relative;width:${width*scale}px"><div style="position:relative;width:${width*scale}px;height:${height*scale}px"><img src="${src}" style="width:100%;height:100%;display:block">${overlay}</div><figcaption>${caption}</figcaption></figure>`;
      await page.setViewport({width:Math.ceil(width*scale*2+30),height:Math.ceil(height*scale+60),deviceScaleFactor:2});
      await page.setContent(`<body style="margin:0;padding:10px;background:#222;color:#eee;font:13px sans-serif;display:flex;gap:10px">${panel(uri(shot.file),leftName)}${panel(uri(other.file),`${rightName} (dashed: ${leftName} label boxes) · max shift ${diff.maxShift} px${diff.lost.length?' · LOST '+diff.lost.join(', '):''}`,boxes)}</body>`,{waitUntil:'load'});
      const file=path.join(out,shot.name+'.jpg');await page.screenshot({path:file,type:'jpeg',quality:90,fullPage:true});
      report.shots.push({name:shot.name,file,...diff});console.log(shot.name,'maxShift',diff.maxShift,'lost',diff.lost.join(',')||'-','failures',diff.failures.join('/'));
    }
  }finally{await browser.close().catch(()=>{});}
  fs.writeFileSync(path.join(out,'side-by-side.json'),JSON.stringify(report,null,2)+'\n');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
