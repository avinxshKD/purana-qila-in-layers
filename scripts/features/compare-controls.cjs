const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'output/lookdev/features'),ff=path.join(root,'tools/ffmpeg/bin/ffmpeg.exe');
const sets=[
 ['k2b',process.argv[2]||'k2c',[['postholes',0,1],['sealed-pit',1,1],['burnt-patches',0,2]]],
 ['k3b',process.argv[3]||'k3c',[['pgw',0,0],['porcelain',1,0],['glass',2,0],['china',0,1],['modern-brick',1,1]]]
];
for(const[a,b]of sets){for(const folder of[a,b])if(!fs.existsSync(path.join(base,folder,'contact.png')))throw new Error('Capture not yet available: '+folder);if(fs.existsSync(path.join(base,b,'accepted-control-comparison.json')))throw new Error('Control evidence already exists: '+b);}
const reports=sets.map(([previous,current,regions])=>{
 const decode=folder=>execFileSync(ff,['-v','error','-i',path.join(base,folder,'contact.png'),'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:30*1024*1024}),a=decode(previous),b=decode(current);
 const controls=regions.map(([id,col,row])=>{
  let changed=0,maximum=0;
  for(let y=row*360;y<(row+1)*360;y++)for(let x=col*640;x<(col+1)*640;x++){
   const i=(y*1920+x)*3;let different=false;for(let c=0;c<3;c++){const d=Math.abs(a[i+c]-b[i+c]);maximum=Math.max(maximum,d);if(d)different=true;}if(different)changed++;
  }
  return{id,pixelExact:changed===0,changedPixels:changed,totalPixels:640*360,maxChannelDelta:maximum};
 });
 return{previous,current,method:'Decoded RGB comparison of unchanged accepted contact tiles, including labels and soil. No new rendering.',controls};
});
for(const report of reports)fs.writeFileSync(path.join(base,report.current,'accepted-control-comparison.json'),JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify(reports,null,2));
