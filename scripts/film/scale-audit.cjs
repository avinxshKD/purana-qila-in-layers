'use strict';
// Frozen-source, DOM/Canvas2D-only audit. No main module or WebGL context.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {root,executable}=require('../browser.cjs'),puppeteer=require('puppeteer-core');
const {verifySource,verifySnapshot}=require('./f2-contract.cjs');
async function main(){
  const args=process.argv.slice(2),i=args.indexOf('--out');if(i<0)throw new Error('Supply frozen preflight --out');
  const out=path.resolve(args[i+1]),target=path.join(out,'scale-label-all-frame-containment.json');
  if(fs.existsSync(target))throw new Error('Preserve completed frozen scale audit');
  if(args.includes('--below-normal'))os.setPriority(0,os.constants.priority.PRIORITY_BELOW_NORMAL);
  const source=verifySource(out),manifest=verifySnapshot(out),tree=path.join(out,'source'),{createServer}=await import('vite');
  const html=fs.readFileSync(path.join(tree,'film.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'');
  const server=await createServer({root:tree,cacheDir:path.join(out,'scale-audit-vite-cache'),server:{host:'127.0.0.1',port:0,strictPort:true,watch:null,hmr:false,fs:{allow:[root,tree]}},logLevel:'warn',
    plugins:[{name:'frozen-scale-page',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__film-scale-test.html')return next();res.setHeader('Content-Type','text/html');res.end(html);});}}]});
  let browser;
  try{
    await server.listen();browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu']});
    const page=await browser.newPage();page.setDefaultTimeout(120000);await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__film-scale-test.html`);
    const report=await page.evaluate(async threeURL=>{
      const THREE=await import(threeURL),{loadLabelFont}=await import('/src/labels.js'),{createFilmOverlays}=await import('/src/film/overlays.js'),{applyCamera}=await import('/src/film/camera.js');
      const {siteBoundaryGrids}=await import('/src/eras/site-state.js'),{blockLevels}=await import('/src/eras/soil-block.js');
      await loadLabelFont();const base=-blockLevels(siteBoundaryGrids()).bottomY,results=[],failures=[];
      const original=CanvasRenderingContext2D.prototype.fillText;let glyphs=[];
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y){const m=this.measureText(text);glyphs.push({text,x:x-m.actualBoundingBoxLeft,y:y-m.actualBoundingBoxAscent,width:m.actualBoundingBoxLeft+m.actualBoundingBoxRight,height:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent});};
      try{for(const height of[1080,2160]){
        const width=height*16/9,camera=new THREE.PerspectiveCamera(25,width/height,.1,180),overlay=createFilmOverlays(width,height,camera),frames=[];let minimumPadding=Infinity;
        const state={section:{index:15},overlays:{titles:[],caption:null,endCard:{opacity:0},callouts:[]}},framing={silhouette:{scalePoints:[],distanceRect:()=>1e6,blockLowestY:height}};
        for(let frame=0;frame<1800;frame++){
          applyCamera(camera,frame/30,base,0);const layout=overlay.plan(state,framing,false,{},base);glyphs=[];overlay.draw(layout,state);
          if(glyphs.map(g=>g.text).join('')!=='05 m'||layout.report.scaleLabelsDrawn.length!==2)failures.push({height,frame,reason:'Expected only0/5m glyphs'});
          const pads=glyphs.filter(g=>g.width&&g.height).map(g=>Math.max(...layout.scaleReservations.map(({reserve:r})=>Math.min(g.x-r.x,g.y-r.y,r.x+r.width-g.x-g.width,r.y+r.height-g.y-g.height))));
          const padding=Math.min(...pads,layout.report.minimumScaleReservePadding);minimumPadding=Math.min(minimumPadding,padding);
          if(padding<24-1e-6)failures.push({height,frame,padding,glyphs});
          frames.push({frame,minimumPadding:padding,labels:layout.report.scaleLabelsDrawn,reserves:layout.scaleReservations.map(r=>r.reserve)});
        }
        results.push({height,width,frames,minimumPadding});
      }}finally{CanvasRenderingContext2D.prototype.fillText=original;}
      return {base,totalCameraFrames:1800,cases:results,failures};
    },'/@fs/'+path.join(root,'node_modules/three/build/three.module.js').replaceAll('\\','/'));
    verifySource(out);verifySnapshot(out);Object.assign(report,{snapshotSHA256:manifest.snapshotSHA256,sourceSHA256:source.sha256,gpuUsed:false,browserArgs:['--disable-gpu'],source:'Frozen r2b source, real M1 base; native font ink versus actual24px reserves at1080/2160'});
    fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
    if(report.failures.length||report.cases.some(c=>c.frames.length!==1800||c.minimumPadding<24-1e-6))throw new Error('Frozen scale containment audit failed');
    console.log(JSON.stringify({report:target,snapshotSHA256:report.snapshotSHA256,minimumPadding:report.cases.map(c=>({height:c.height,value:c.minimumPadding})),failures:report.failures.length,gpuUsed:false}));
  }finally{if(browser)await browser.close();await server.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
