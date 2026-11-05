'use strict';
// CPU-only (GPU disabled) probe of the HUD type layout for given frames on a blank silhouette:
// cold-open tagline and end-card reports with real Canvas2D fonts. Prints JSON.
const path=require('node:path'),fs=require('node:fs'),{root,executable}=require('../browser.cjs'),puppeteer=require('puppeteer-core');
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined,frames=(get('--frames')||'60,1700').split(',').map(Number);
async function main(){
 const {createServer}=await import('vite'),html=fs.readFileSync(path.join(root,'film.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
 const server=await createServer({root,cacheDir:path.join(root,'node_modules/.vite-type-probe'),server:{host:'127.0.0.1',port:0,strictPort:true,watch:null,hmr:false},logLevel:'warn',
  plugins:[{name:'type-probe',configureServer(s){s.middlewares.use((req,res,next)=>{if(req.url!=='/__type-probe.html')return next();res.setHeader('Content-Type','text/html');res.end(html);});}}]});
 let browser;
 try{
  await server.listen();browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu','--force-color-profile=srgb']});
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__type-probe.html`);
  const rows=await page.evaluate(async frames=>{
   const THREE=await import('/node_modules/three/build/three.module.js'),{createFilmOverlays}=await import('/src/film/overlays.js'),{filmState}=await import('/src/film/timeline.js'),{loadLabelFont}=await import('/src/labels.js');
   await loadLabelFont();await document.fonts.ready;const camera=new THREE.PerspectiveCamera(25,16/9,.1,180);camera.position.set(0,0,60);camera.updateMatrixWorld();
   const overlays=createFilmOverlays(1920,1080,camera),framing={silhouette:{scalePoints:[],distanceRect:()=>1e6,blockLowestY:1080}};
   return frames.map(frame=>{const r=overlays.plan(filmState(frame/30),framing,false,{},10).report;return {frame,coldOpen:r.coldOpen,endCard:r.endCard,text:r.textClearances.map(t=>({id:t.id,kind:t.kind,text:t.text,rect:t.rect})),failures:r.failures};});
  },frames);
  if(errors.length)throw new Error(errors.join('\n'));console.log(JSON.stringify(rows,null,1));
 }finally{await browser?.close();await server.close();}
}
main().catch(e=>{console.error(e);process.exit(1);});
