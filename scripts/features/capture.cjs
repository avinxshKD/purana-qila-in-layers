'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const puppeteer=require('puppeteer-core');
const {withGpu}=require('../gpu-lock.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'output/lookdev/features',process.argv[2]||'k1'),batch=process.argv[3]||'k1';
const ff=path.join(root,'tools/ffmpeg/bin/ffmpeg.exe');
const edge='C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
let jobs=(batch==='k1'||batch==='k1look')?[
 {name:'contact',view:'contact',w:1920,h:1080},
 {name:'brick-wall-2160',view:'brick',w:3840,h:2160},
 {name:'rubble-wall-2160',view:'rubble',w:3840,h:2160},
 {name:'mudbrick-wall-2160',view:'detail',id:'M01-north-mudbrick-1',w:3840,h:2160},
 {name:'reveal-strip',view:'reveal',w:1920,h:540},
 {name:'capped-section',view:'cut',w:1920,h:1080},
 {name:'grazing-caps-2160',view:'grazing',w:3840,h:2160},
 {name:'fig13-plan',view:'plan',w:1920,h:1080}
 ,{name:'hero-mud-2160',view:'hero-mud',id:'M01-north-mudbrick-1',w:3840,h:2160}
 ,{name:'hero-stone-cap-2160',view:'hero-stone',id:'sultanate-corner',w:3840,h:2160}
]:batch==='k2'?[
 {name:'contact',view:'contact',w:1920,h:1080},
 {name:'lime-floor-2160',view:'detail',id:'sultanate-lime-floor',w:3840,h:2160},
 {name:'filled-pit-section',view:'detail',id:'rajput-sealed-pit',w:1920,h:1080},
 {name:'drain-2160',view:'detail',id:'mauryan-drain',w:3840,h:2160},
 {name:'floor-first-reveal',view:'reveal',id:'mauryan-drain',w:1920,h:540},
]:[
 {name:'contact',view:'contact',w:1920,h:1080},
 {name:'porcelain-2160',view:'detail',id:'mughal-porcelain',w:3840,h:2160},
 {name:'pgw-2160',view:'detail',id:'pre-mauryan-sherds',w:3840,h:2160},
 {name:'glass-2160',view:'detail',id:'mughal-glass',w:3840,h:2160}
];
if(batch==='k1look')jobs=jobs.slice(0,4);
if(batch==='k2c'||batch==='k2d')jobs=[
 {name:'contact',view:'contact',w:1920,h:1080},
 {name:'lime-floor-2160',view:'detail',id:'sultanate-lime-floor',w:3840,h:2160},
 {name:'drain-2160',view:'detail',id:'mauryan-drain',w:3840,h:2160},
 {name:'floor-first-reveal',view:'reveal',id:'mauryan-drain',w:1920,h:540}
];
if(batch==='k2d')jobs.push(
 {name:'gupta-78ppm',view:'scale',id:'gupta-floor',ppm:78,orbit:0,w:1920,h:1080},
 {name:'gupta-20ppm-orbit-0',view:'scale',id:'gupta-floor',ppm:20,orbit:0,w:1920,h:1080},
 {name:'gupta-20ppm-orbit-05',view:'scale',id:'gupta-floor',ppm:20,orbit:.5,w:1920,h:1080},
 {name:'gupta-20ppm-orbit-10',view:'scale',id:'gupta-floor',ppm:20,orbit:1,w:1920,h:1080}
);
if(batch==='k3c'||batch==='k3d')jobs=[
 {name:'contact',view:'contact',w:1920,h:1080},
 {name:'pillar-base-2160',view:'detail',id:'pillar-base-as-drawn',w:3840,h:2160},
 {name:'top-left-stone-2160',view:'detail',id:'top-left-stone-as-drawn',w:3840,h:2160},
 {name:'pottery-lens-section',view:'detail',id:'rajput-pottery-dump',w:1920,h:1080}
];
if(batch==='k2e')jobs=[
 {name:'changed-contact',view:'correction-contact',w:1920,h:1080},
 {name:'lime-floor-1080',view:'detail',id:'sultanate-lime-floor',w:1920,h:1080},
 {name:'drain-1080',view:'detail',id:'mauryan-drain',w:1920,h:1080},
 {name:'pillar-base-2160',view:'detail',id:'pillar-base-as-drawn',batch:'k3e',w:3840,h:2160},
 {name:'top-left-stone-2160',view:'detail',id:'top-left-stone-as-drawn',batch:'k3e',w:3840,h:2160}
];
async function main(){
 const resume=process.argv.includes('--resume');
 if(fs.existsSync(out)&&!resume)throw new Error('Delivery folder exists; choose a new k folder');
 fs.mkdirSync(out,{recursive:true});
 const reports=resume&&fs.existsSync(path.join(out,'capture-stats.json'))?JSON.parse(fs.readFileSync(path.join(out,'capture-stats.json'),'utf8')):{};
 jobs=jobs.filter(j=>!reports[j.name]||!fs.existsSync(path.join(out,j.name+'.png')));
 for(let index=0;index<jobs.length;index++){
  await withGpu('features:'+path.basename(out)+':'+index,async()=>{
   let browser;const started=Date.now(),deadline=setTimeout(()=>{const pid=browser?.process()?.pid;if(pid){try{execFileSync('taskkill.exe',['/PID',String(pid),'/T','/F'],{stdio:'ignore'});}catch{}}},110000);
   try{
    browser=await puppeteer.launch({executablePath:edge,headless:true,timeout:20000,args:['--no-sandbox','--disable-dev-shm-usage','--force-device-scale-factor=1']});
    const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    for(const job of jobs.slice(index,index+1)){
     await page.setViewport({width:job.w,height:job.h,deviceScaleFactor:1});
     await page.goto(`http://127.0.0.1:5198/features.html?view=${job.view}&batch=${job.batch??batch}&width=${job.w}&height=${job.h}${job.id?'&id='+job.id:''}${job.ppm?'&ppm='+job.ppm+'&orbit='+job.orbit:''}`,{waitUntil:'networkidle0'});
     await page.waitForFunction(()=>window.featureGallery?.ready,{timeout:60000});
     await page.evaluate(async()=>{await document.fonts.ready;window.featureGallery.render();});
     await page.screenshot({path:path.join(out,job.name+'.png')});
     reports[job.name]={width:job.w,height:job.h,...await page.evaluate(collect=>({...window.featureGallery.layout,stats:window.featureGallery.stats(),cameras:window.featureGallery.cameras(),samples:collect?window.featureGallery.samples():window.featureGallery.entries.map(e=>({id:e.id,units:[]}))}),job.view!=='plan'&&job.view!=='scale')};
     fs.writeFileSync(path.join(out,'capture-stats.json'),JSON.stringify(reports,null,2));
     if(job.name==='brick-wall-2160'){
      await page.evaluate(()=>{window.featureGallery.setReveal(.25);window.featureGallery.setReveal(1);});
      await page.screenshot({path:path.join(out,'brick-repeat-2160.png')});
     }
     console.log(job.name+' captured');
    }
    if(errors.length)throw new Error(errors.join('\n'));
   }finally{try{if(browser)await browser.close();}finally{clearTimeout(deadline);if(reports[jobs[index].name])reports[jobs[index].name].gpuHoldMs=Date.now()-started;}}
  });
  fs.writeFileSync(path.join(out,'capture-stats.json'),JSON.stringify(reports,null,2));
  if(/[cde]$/.test(batch))await new Promise(resolve=>setTimeout(resolve,5000)); // F1/M1 get the next chunk before another feature frame.
 }
 fs.writeFileSync(path.join(out,'capture-stats.json'),JSON.stringify(reports,null,2));
 for(const name of Object.keys(reports).filter(name=>name.endsWith('-2160')).map(name=>name.replace('-2160',''))){
  if(!fs.existsSync(path.join(out,name+'-1080.png')))execFileSync(ff,['-v','error','-i',path.join(out,name+'-2160.png'),'-vf','scale=1920:1080:flags=lanczos',path.join(out,name+'-1080.png')]);
 }
 if(batch==='k1')for(const name of ['hero-mud','hero-stone-cap']){
  if(!fs.existsSync(path.join(out,name+'-400percent.png')))execFileSync(ff,['-v','error','-i',path.join(out,name+'-1080.png'),'-vf','crop=240:140:840:470,scale=960:560:flags=neighbor',path.join(out,name+'-400percent.png')]);
 }
 if(batch==='k2c'||batch==='k2d')for(const[name,x,y]of[['gupta-floor',640,0],['lane',1280,360]])execFileSync(ff,['-v','error','-i',path.join(out,'contact.png'),'-vf',`crop=640:360:${x}:${y},scale=1280:720:flags=neighbor`,path.join(out,name+'-contact-2x.png')]);
 console.log('Delivered '+out);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
