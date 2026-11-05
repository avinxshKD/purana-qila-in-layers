'use strict';
// CPU only. Evidence for flagged F3 lossless seams: where the boundary difference sits versus its
// neighbour pairs, and whether per-frame pose/overlay metadata moves continuously across the boundary.
const fs=require('node:fs'),path=require('node:path'),{root}=require('../browser.cjs'),{ffmpeg}=require('../media.cjs'),{decodeFrames}=require('./f2-seams.cjs');
const args=process.argv.slice(2),get=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1];};
const out=path.resolve(get('--out')||path.join(root,'output/film/f3/run-r1')),read=p=>JSON.parse(fs.readFileSync(path.join(out,p)));
const W=1920,H=1080,GX=16,GY=9;
function diff(a,b){
  let count=0,strong=0,x0=W,y0=H,x1=-1,y1=-1;const grid=new Float64Array(GX*GY),max=Buffer.alloc(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4,d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));
    if(d){count++;grid[Math.floor(y*GY/H)*GX+Math.floor(x*GX/W)]+=d;}if(d>8){strong++;if(x<x0)x0=x;if(y<y0)y0=y;if(x>x1)x1=x;if(y>y1)y1=y;}
    const v=Math.min(255,d*16);max[i]=v;max[i+1]=v;max[i+2]=v;max[i+3]=255;}
  const cell=W*H/(GX*GY),cells=[...grid].map((v,i)=>({x:i%GX,y:Math.floor(i/GX),mean:v/cell})).sort((p,q)=>q.mean-p.mean).slice(0,4).map(c=>({...c,mean:+c.mean.toFixed(3)}));
  return {changedPixels:count,strongPixels:strong,strongBox:x1<0?null:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1},topCells:cells,image:max};
}
function poseDelta(a,b){const pa=a.pose||{},pb=b.pose||{},keys=Object.keys(pa).filter(k=>Array.isArray(pa[k])||Number.isFinite(pa[k]));
  const out={};for(const k of keys){const x=[].concat(pa[k]),y=[].concat(pb[k]);out[k]=+Math.sqrt(x.reduce((n,v,i)=>n+(v-(y[i]??0))**2,0)).toFixed(6);}return out;}
function leaderDelta(a,b){const la=a.overlayReport?.leaders||[],lb=b.overlayReport?.leaders||[];return la.map(l=>{const m=lb.find(x=>x.id===l.id);return m?{id:l.id,moved:+Math.hypot((l.end?.x??l.x??0)-(m.end?.x??m.x??0),(l.end?.y??l.y??0)-(m.end?.y??m.y??0)).toFixed(3)}:{id:l.id,moved:null};});}
const audit=read('seam-audit.json'),folder=path.join(out,'seam-evidence');if(fs.existsSync(path.join(folder,'evidence.json')))throw new Error('Preserve seam evidence');fs.mkdirSync(folder,{recursive:true});
const chunks=fs.readdirSync(path.join(out,'chunks')).filter(f=>f.endsWith('.json')).map(f=>read('chunks/'+f));
const stat=frame=>chunks.find(c=>c.startFrame<=frame&&c.endFrame>frame).stats.find(s=>s.frame===frame);
const frameOf=frame=>{const c=chunks.find(c=>c.startFrame<=frame&&c.endFrame>frame);return decodeFrames(path.join(out,c.video),frame-c.startFrame,1)[0];};
const cases=[];
for(const flag of audit.flags){
  const b=flag.boundary,frames=[b-2,b-1,b,b+1].map(frameOf),rows=[b-2,b-1,b,b+1].map(stat),pairs=[['left',0,1],['seam',1,2],['right',2,3]];
  const item={boundary:b,ratio:flag.ratio,coincidentEvents:flag.coincidentEvents.map(e=>e.name||e.id||e.type),pairs:{}};
  for(const[name,i,j]of pairs){const d=diff(frames[i],frames[j]);const raw=path.join(folder,`diff-${b}-${name}.rgba`);fs.writeFileSync(raw,d.image);
    ffmpeg(['-f','rawvideo','-pixel_format','rgba','-video_size','1920x1080','-i',raw,'-vf','scale=960:540','-frames:v','1',path.join(folder,`diff-${b}-${name}.png`)]);fs.unlinkSync(raw);
    delete d.image;item.pairs[name]={...d,poseDelta:poseDelta(rows[i],rows[j]),leaderDelta:leaderDelta(rows[i],rows[j])};}
  const c=chunks.find(c=>c.startFrame===b),l=chunks.find(c=>c.endFrame===b);
  for(const[record,first]of[[l,l.frames-2],[c,0]])ffmpeg(['-i',path.join(out,record.video),'-vf',`select=between(n\\,${first}\\,${first+1}),scale=960:540`,'-fps_mode','vfr','-frames:v','2','-start_number',String(record.startFrame+first),path.join(folder,'frame-%04d.png')]);
  ffmpeg(['-framerate','1','-start_number',String(b-2),'-i',path.join(folder,'frame-%04d.png'),'-vf','scale=480:270,tile=2x2','-frames:v','1',path.join(folder,`boundary-${b}.png`)]);
  cases.push(item);console.log(JSON.stringify({boundary:b,seam:{changed:item.pairs.seam.changedPixels,strong:item.pairs.seam.strongPixels,box:item.pairs.seam.strongBox,top:item.pairs.seam.topCells[0]},left:{changed:item.pairs.left.changedPixels,strong:item.pairs.left.strongPixels,box:item.pairs.left.strongBox},right:{changed:item.pairs.right.changedPixels,strong:item.pairs.right.strongPixels},pose:{left:item.pairs.left.poseDelta,seam:item.pairs.seam.poseDelta,right:item.pairs.right.poseDelta}}));
}
fs.writeFileSync(path.join(folder,'evidence.json'),JSON.stringify({snapshotSHA256:audit.snapshotSHA256,cases,method:'Decoded lossless frames n-2..n+1 per flagged boundary. Per pair: changed/strong(>8 code) pixel counts, strong-difference box, top 16x9 grid cells, x16 difference images; pose and leader deltas from capture metadata. Seam pair compared with both neighbour pairs.'},null,2)+'\n');
fs.writeFileSync(path.join(folder,'review.html'),`<!doctype html><meta charset="utf-8"><title>F3 lossless seam evidence</title><style>body{background:#191b1c;color:#eee4d2;font:16px sans-serif;margin:30px}img{width:640px;max-width:100%}.row{display:flex;gap:8px}</style><h1>Flagged F3 lossless boundaries</h1>${cases.map(c=>`<h2>Frame ${c.boundary}, ${c.ratio.toFixed(2)}× ${c.coincidentEvents.join(', ')}</h2><img src="boundary-${c.boundary}.png"><div class="row">${['left','seam','right'].map(n=>`<figure><figcaption>${n} ×16</figcaption><img src="diff-${c.boundary}-${n}.png"></figure>`).join('')}</div>`).join('')}`);
