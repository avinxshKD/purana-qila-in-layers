import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core'),{root,executable}=require('../scripts/browser.cjs');
test('shared scale drawing stays inside the film24px reservation on all1800F2 camera frames',{timeout:90000},async()=>{
  const html=fs.readFileSync(path.join(root,'film.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  const server=await createServer({root,cacheDir:root+'/output/film/scale-reserve-vite-cache',server:{host:'127.0.0.1',port:0,strictPort:true,watch:null,hmr:false},logLevel:'warn',
    plugins:[{name:'scale-test-page',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__film-scale-test.html')return next();res.setHeader('Content-Type','text/html');res.end(html);});}}]});
  let browser;
  try{
    await server.listen();browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu']});
    const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__film-scale-test.html`);
    const report=await page.evaluate(async()=>{
      const THREE=await import('/node_modules/three/build/three.module.js'),{loadLabelFont}=await import('/src/labels.js'),{createFilmOverlays}=await import('/src/film/overlays.js'),{applyCamera}=await import('/src/film/camera.js');
      const {siteBoundaryGrids}=await import('/src/eras/site-state.js'),{blockLevels}=await import('/src/eras/soil-block.js');
      await loadLabelFont();const base=-blockLevels(siteBoundaryGrids()).bottomY,results=[],failures=[];
      const original=CanvasRenderingContext2D.prototype.fillText;let glyphs=[];
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y){const m=this.measureText(text);glyphs.push({text,x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent});};
      try{for(const height of [1080,2160]){
        const width=height*16/9,camera=new THREE.PerspectiveCamera(25,width/height,.1,180),overlay=createFilmOverlays(width,height,camera),frames=[];let minimumPadding=Infinity;
        const state={section:{index:15},overlays:{titles:[],caption:null,endCard:{opacity:0},callouts:[]}};
        const framing={silhouette:{scalePoints:[],distanceRect:()=>1e6,blockLowestY:height}};
        for(let frame=0;frame<1800;frame++){
          applyCamera(camera,frame/30,base,0);const layout=overlay.plan(state,framing,false,{},base);glyphs=[];overlay.draw(layout,state);
          if(glyphs.map(g=>g.text).join('')!=='05 m'||layout.report.scaleLabelsDrawn.length!==2)failures.push({height,frame,reason:'Expected only0/5m scale glyphs'});
          const pads=glyphs.filter(g=>g.width&&g.height).map(g=>Math.max(...layout.scaleReservations.map(({reserve:r})=>Math.min(g.x-r.x,g.y-r.y,r.x+r.width-g.x-g.width,r.y+r.height-g.y-g.height))));
          const padding=Math.min(...pads,layout.report.minimumScaleReservePadding);minimumPadding=Math.min(minimumPadding,padding);
          if(padding<24-1e-6)failures.push({height,frame,padding,...(frame===0?{glyphs}:{} )});
          frames.push({frame,minimumPadding:padding,labels:layout.report.scaleLabelsDrawn,reserves:layout.scaleReservations.map(r=>r.reserve)});
        }
        results.push({height,width,frames,minimumPadding});
      }}finally{CanvasRenderingContext2D.prototype.fillText=original;}
      return {base,totalCameraFrames:1800,cases:results,failures};
    });
    const out=path.join(root,'output','film','f2','scale-reserve-r1');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'all-frame-containment.json'),JSON.stringify(report,null,2)+'\n');
    assert.equal(report.failures.length,0,JSON.stringify(report.failures.slice(0,5)));assert.equal(report.cases.length,2);assert.ok(report.cases.every(c=>c.frames.length===1800&&c.minimumPadding>=24-1e-6));
  }finally{if(browser)await browser.close();await server.close();}
});
