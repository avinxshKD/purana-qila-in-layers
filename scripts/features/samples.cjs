'use strict';
const fs=require('node:fs'),path=require('node:path'),puppeteer=require('puppeteer-core');
const {withGpu}=require('../gpu-lock.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'output/lookdev/features',process.argv[2]);
withGpu('features:front-surface-samples',async()=>{
 const browser=await puppeteer.launch({executablePath:'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',headless:true,args:['--no-sandbox','--force-device-scale-factor=1']});
 const samples={};
 try{const page=await browser.newPage();await page.setViewport({width:3840,height:2160,deviceScaleFactor:1});
  for(const [name,view]of [['brick-wall-2160','brick'],['rubble-wall-2160','rubble']]){
   await page.goto(`http://127.0.0.1:5198/features.html?view=${view}&width=3840&height=2160`,{waitUntil:'networkidle0'});
   await page.waitForFunction(()=>window.featureGallery?.ready);
   samples[name]=await page.evaluate(()=>window.featureGallery.samples());
  }
 }finally{await browser.close();}
 fs.writeFileSync(path.join(out,'front-surface-samples.json'),JSON.stringify(samples,null,2));
 console.log('Front-surface samples written: '+out);
}).catch(e=>{console.error(e);process.exitCode=1;});
