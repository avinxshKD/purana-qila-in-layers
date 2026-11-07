'use strict';
// Measures the shipped hero stills (public/site-poster) for the no-3D fallback note: the block's visual centre
// (centroid of the block's pixels), its box, and the scale bar and scale labels the note must keep clear of, in
// image pixels. Writes src/site/poster-layout.json with each image's SHA-256 (test/site-poster-layout.test.js fails
// when a still changes without a new layout). CPU only (canvas decode in a GPU-disabled browser).
// --hero is the capture's record (hero-still.json from capture-hero-still.cjs, or hero-framing-probe.cjs output): the
// framing each still was taken at, and the scale bar, from which the site places the still on any viewport (poster.js).
// Usage: node scripts/site/poster-layout.cjs --hero output/site/hero-still-r3/hero-still.json [--out src/site/poster-layout.json]
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),puppeteer=require('puppeteer-core'),{root,executable}=require('../browser.cjs');
const IMAGES={landscape:'public/site-poster/hero-landscape.jpg',portrait:'public/site-poster/hero-portrait.jpg'};
function analyse(){
  // Runs in the page on the decoded image. Block: saturated or mid-bright pixels, largest 4-connected component on a
  // 4 px grid. Keep-clear: near-white pixels (scale bar, digits) outside the block mask, grouped into padded boxes.
  const img=document.querySelector('img'),w=img.naturalWidth,h=img.naturalHeight,c=document.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0);const d=g.getImageData(0,0,w,h).data,C=4,gw=Math.ceil(w/C),gh=Math.ceil(h/C);
  const content=new Uint8Array(gw*gh),bright=new Uint8Array(gw*gh);
  for(let gy=0;gy<gh;gy++)for(let gx=0;gx<gw;gx++){let n=0,hit=0,lit=0;
    for(let y=gy*C;y<Math.min(h,gy*C+C);y++)for(let x=gx*C;x<Math.min(w,gx*C+C);x++){const i=(y*w+x)*4,r=d[i],gg=d[i+1],b=d[i+2],max=Math.max(r,gg,b),min=Math.min(r,gg,b),lum=.2126*r+.7152*gg+.0722*b;n++;
      if(max-min>=16&&lum>=40||lum>=70)hit++;if(lum>=170&&max-min<60)lit++;}
    content[gy*gw+gx]=hit*2>n?1:0;bright[gy*gw+gx]=lit?1:0;}
  function components(mask){const label=new Int32Array(gw*gh).fill(-1),out=[];
    for(let s=0;s<gw*gh;s++){if(!mask[s]||label[s]>=0)continue;const stack=[s],comp={cells:[],x0:1e9,y0:1e9,x1:-1,y1:-1};label[s]=out.length;
      while(stack.length){const k=stack.pop(),x=k%gw,y=(k-x)/gw;comp.cells.push(k);comp.x0=Math.min(comp.x0,x);comp.y0=Math.min(comp.y0,y);comp.x1=Math.max(comp.x1,x);comp.y1=Math.max(comp.y1,y);
        for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]])if(nx>=0&&ny>=0&&nx<gw&&ny<gh){const m=ny*gw+nx;if(mask[m]&&label[m]<0){label[m]=out.length;stack.push(m);}}}
      out.push(comp);}
    return out;}
  const block=components(content).sort((a,b)=>b.cells.length-a.cells.length)[0],inBlock=new Uint8Array(gw*gh);for(const k of block.cells)inBlock[k]=1;
  let sx=0,sy=0;for(const k of block.cells){sx+=k%gw+.5;sy+=Math.floor(k/gw)+.5;}
  // Bright cells of the block itself (lit top) do not count; dilate so a digit and its bar join.
  const outside=new Uint8Array(gw*gh);for(let k=0;k<gw*gh;k++)if(bright[k]&&!inBlock[k])outside[k]=1;
  const R=3,grown=new Uint8Array(gw*gh);for(let k=0;k<gw*gh;k++)if(outside[k]){const x=k%gw,y=(k-x)/gw;for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<gw&&ny<gh)grown[ny*gw+nx]=1;}}
  const keepClear=components(grown).map(c=>({x:c.x0*C,y:c.y0*C,width:(c.x1-c.x0+1)*C,height:(c.y1-c.y0+1)*C}));
  return {width:w,height:h,blockCentroid:[+(sx/block.cells.length*C).toFixed(1),+(sy/block.cells.length*C).toFixed(1)],blockBox:{x:block.x0*C,y:block.y0*C,width:(block.x1-block.x0+1)*C,height:(block.y1-block.y0+1)*C},keepClear};
}
// The scale bar's box in the framing reference raster (as scene.js computes it for the label pad) and the label
// metrics scale-bar.js uses, so the page can solve the 3D framing before three.js loads.
async function reference(hero){
  const THREE=await import('three'),{pathToFileURL}=require('node:url'),load=file=>import(pathToFileURL(path.join(root,file)).href);
  const [{SCALE_LABEL_STYLE},{SCALE_BAR_SITE}]=await Promise.all([load('src/labels.js'),load('src/site/scale-bar.js')]);
  const shipped=JSON.parse(fs.readFileSync(path.join(root,'src/site/framing-reference.json'),'utf8')),key=JSON.parse(shipped.key);
  const camera=new THREE.PerspectiveCamera(key.fov,key.aspect,.1,180);camera.position.fromArray(key.position);camera.quaternion.fromArray(key.quaternion);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const shot=hero.shots[0],p=shot.scaleBar.placement,corners=[];
  // zBack as scaleBarPlacement sets it.
  for(const x of [p.x0,p.x1])for(const y of [p.bottom,p.top])for(const z of [p.z,p.z-.008]){const q=new THREE.Vector3(x,y,z).project(camera);corners.push({x:(q.x+1)*key.width/2,y:(1-q.y)*key.height/2});}
  const size=shot.scaleBar.cap/.66,widthEm=shot.scaleBar.labelWidths.map(w=>+(w/size).toFixed(4));
  return {key:shipped.key,barBox:{x0:Math.min(...corners.map(c=>c.x)),x1:Math.max(...corners.map(c=>c.x)),y0:Math.min(...corners.map(c=>c.y)),y1:Math.max(...corners.map(c=>c.y))},
    scaleLabels:{capPx1080:SCALE_LABEL_STYLE.capHeightPx1080,gapPx1080:SCALE_LABEL_STYLE.gapPx1080,capMinPx:SCALE_BAR_SITE.labelCapMinPx,gapMinPx:SCALE_BAR_SITE.labelGapMinPx,widthEm}};
}
async function main(){
  const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];},out=path.resolve(root,arg('--out','src/site/poster-layout.json'));
  const heroFile=arg('--hero',null);if(!heroFile)throw new Error('--hero <hero-still.json> is required');const hero=JSON.parse(fs.readFileSync(path.resolve(root,heroFile),'utf8'));
  for(const shot of hero.shots)if(!shot.framing?.feasible||!shot.framing.referenceKeyMatches)throw new Error(shot.name+': capture framing missing, infeasible or for another reference');
  const browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu']}),layout={generatedBy:'scripts/site/poster-layout.cjs',hero:path.relative(root,path.resolve(root,heroFile)).split(path.sep).join('/'),reference:await reference(hero),images:{}};
  try{
    const page=await browser.newPage();
    for(const [name,file] of Object.entries(IMAGES)){
      const bytes=fs.readFileSync(path.join(root,file));
      await page.setContent(`<img src="data:image/jpeg;base64,${bytes.toString('base64')}">`);await page.waitForFunction(()=>document.querySelector('img').complete);
      const shot=hero.shots.find(s=>s.name==='hero-'+name),measured=await page.evaluate(analyse);
      if(Math.abs(measured.width-shot.width*shot.deviceScaleFactor)>1||Math.abs(measured.height-shot.height*shot.deviceScaleFactor)>1)throw new Error(file+' is not the '+shot.name+' capture');
      const capture={width:shot.width,height:shot.height,deviceScaleFactor:shot.deviceScaleFactor,mode:shot.framing.mode,k:shot.framing.k,centre:shot.framing.centre,titleScale:shot.framing.titleScale};
      layout.images[name]={file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),...measured,capture};
    }
  }finally{await browser.close();}
  fs.writeFileSync(out,JSON.stringify(layout,null,2)+'\n');console.log(JSON.stringify(layout));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
