const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'output/lookdev/features',process.argv[2]),ff=path.join(root,'tools/ffmpeg/bin/ffmpeg.exe');
const records=JSON.parse(fs.readFileSync(path.join(out,'capture-stats.json'),'utf8'));
for(const [name,r]of Object.entries(records))if(name.endsWith('-2160')){
 const target=path.join(out,name.replace('-2160','-1080')+'.png');
 if(!fs.existsSync(target))execFileSync(ff,['-v','error','-i',path.join(out,name+'.png'),'-vf','scale=1920:1080:flags=lanczos',target]);
}
for(const name of ['hero-mud','hero-stone-cap']){
 const file=path.join(out,name+'-1080.png'),target=path.join(out,name+'-400percent.png');
 if(fs.existsSync(file)&&!fs.existsSync(target))execFileSync(ff,['-v','error','-i',file,'-vf','crop=240:140:840:470,scale=960:560:flags=neighbor',target]);
}
console.log('CPU derivatives created without GPU: '+out);
