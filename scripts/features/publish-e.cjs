'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'output/lookdev/features'),ff=path.join(root,'tools/ffmpeg/bin/ffmpeg.exe');
const fresh=path.join(base,process.argv[2]||'k2e-frames'),k2=path.join(base,'k2e-final'),k3=path.join(base,'k3e-final'),stage=path.join(base,'k2e-cpu'),d2=path.join(base,'k2d-final'),d3=path.join(base,'k3d-final');
for(const out of[k2,k3])if(fs.existsSync(out))throw new Error('Never overwrite a delivery: '+out);
for(const out of[k2,k3])fs.mkdirSync(out,{recursive:true});
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),frames=read(path.join(fresh,'capture-stats.json')),old2=read(path.join(d2,'capture-stats.json')),old3=read(path.join(d3,'capture-stats.json'));
const copy=(from,to)=>fs.copyFileSync(from,to),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const out of[k2,k3])for(const file of['cpu-validation.json','control-before.json','control-after.json','control-hash-comparison.json','test-output.txt'])copy(path.join(stage,file),path.join(out,file));
for(const file of fs.readdirSync(d2).filter(n=>n.startsWith('gupta-')&&n.endsWith('.png')))copy(path.join(d2,file),path.join(k2,file));
copy(path.join(d3,'pottery-lens-section.png'),path.join(k3,'pottery-lens-section.png'));
for(const out of[k2,k3])copy(path.join(fresh,'changed-contact.png'),path.join(out,'changed-contact.png'));
for(const name of['lime-floor-1080','drain-1080'])copy(path.join(fresh,name+'.png'),path.join(k2,name+'.png'));
for(const name of['pillar-base-2160','pillar-base-1080','top-left-stone-2160','top-left-stone-1080'])copy(path.join(fresh,name+'.png'),path.join(k3,name+'.png'));
const filter=[
 '[0:v]split=4[a][b][c][d]',
 '[a]crop=960:540:0:0,scale=640:360:flags=lanczos[lime]',
 '[b]crop=960:540:960:0,scale=640:360:flags=lanczos[drain]',
 '[c]crop=960:540:0:540,scale=640:360:flags=lanczos[pillar]',
 '[d]crop=960:540:960:540,scale=640:360:flags=lanczos[stone]',
 "[1:v]crop=640:360:640:0,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='reused K2d':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.55[gupta]",
 "[2:v]scale=640:360:flags=lanczos,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='reused K2d':x=8:y=8:fontsize=16:fontcolor=white:box=1:boxcolor=black@0.55[lens]",
 '[lime][gupta][drain]hstack=inputs=3[top]',
 '[pillar][stone][lens]hstack=inputs=3[bottom]',
 '[top][bottom]vstack=inputs=2[out]'
].join(';');
execFileSync(ff,['-v','error','-i',path.join(fresh,'changed-contact.png'),'-i',path.join(d2,'contact.png'),'-i',path.join(d3,'pottery-lens-section.png'),'-filter_complex',filter,'-map','[out]','-frames:v','1',path.join(k2,'contact.png')]);
copy(path.join(k2,'contact.png'),path.join(k3,'contact.png'));
const slots=[
 ['sultanate-lime-floor',frames['changed-contact'],0,0,0,0,0,2/3],
 ['gupta-floor',old2.contact,1,640,0,640,0,1],
 ['mauryan-drain',frames['changed-contact'],1,960,0,1280,0,2/3],
 ['pillar-base-as-drawn',frames['changed-contact'],2,0,540,0,360,2/3],
 ['top-left-stone-as-drawn',frames['changed-contact'],3,960,540,640,360,2/3],
 ['rajput-pottery-dump',old3['pottery-lens-section'],0,0,0,1280,360,1/3]
];
const samples=slots.map(([id,e,i,x,y,xx,yy,s])=>{
 const group=e.samples[i],point=p=>p?{...p,x:xx+(p.x-x)*s,y:yy+(p.y-y)*s}:p;
 return{...group,id,units:group.units.map(point),soil:point(group.soil),soilTop:point(group.soilTop)};
});
const contact={width:1920,height:720,columns:3,rows:2,stats:slots.map(([id,e])=>e.stats.find(p=>p.id===id)),cameras:slots.map(([id,e,i])=>e.cameras?.[i]??null),samples,gpuHoldMs:frames['changed-contact'].gpuHoldMs,composition:'Plain2D contact assembly,4 fresh views plus accepted Gupta from K2d and lens from K3d. Both reused tiles labelled reused K2d as requested. No colour grading.'};
const stats2={contact,'changed-contact':frames['changed-contact'],'lime-floor-1080':frames['lime-floor-1080'],'drain-1080':frames['drain-1080'],...Object.fromEntries(Object.entries(old2).filter(([name])=>name.startsWith('gupta-')))};
const stats3={contact,'changed-contact':frames['changed-contact'],'pillar-base-2160':frames['pillar-base-2160'],'top-left-stone-2160':frames['top-left-stone-2160'],'pottery-lens-section':old3['pottery-lens-section']};
fs.writeFileSync(path.join(k2,'capture-stats.json'),JSON.stringify(stats2,null,2));fs.writeFileSync(path.join(k3,'capture-stats.json'),JSON.stringify(stats3,null,2));
const references=[];
for(const[source,cells]of[[d2,[['postholes',0,1],['sealed-pit',1,1],['burnt-patches',0,2]]],[d3,[['pgw',0,0],['porcelain',1,0],['glass',2,0],['china',0,1],['modern-brick',1,1]]]]){
 for(const[id,col,row]of cells){
  const dir=path.join(k2,'reused-controls');fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,id+'.png');execFileSync(ff,['-v','error','-i',path.join(source,'contact.png'),'-vf',`crop=640:360:${col*640}:${row*360}`,file]);
  const old=execFileSync(ff,['-v','error','-i',path.join(source,'contact.png'),'-vf',`crop=640:360:${col*640}:${row*360}`,'-f','rawvideo','-pix_fmt','rgb24','-']);
  const now=execFileSync(ff,['-v','error','-i',file,'-f','rawvideo','-pix_fmt','rgb24','-']);
  references.push({id,source:path.relative(base,source),decodedRgbIdentical:old.equals(now),sha256:sha(file)});
 }
}
const reuse={method:'References are reused PNG crops, not new rendered regression proof. See control-hash-comparison.json for the independent CPU regression check.',references,accepted:{Gupta:{source:'k2d-final',rerendered:false},lens:{source:'k3d-final',rerendered:false}},frames:Object.keys(frames),holds:Object.fromEntries(Object.entries(frames).map(([k,v])=>[k,v.gpuHoldMs]))};
for(const out of[k2,k3])fs.writeFileSync(path.join(out,'reuse-manifest.json'),JSON.stringify(reuse,null,2));
console.log(JSON.stringify({folders:[k2,k3],frames:Object.keys(frames),controlsExact:references.every(p=>p.decodedRgbIdentical)}));
