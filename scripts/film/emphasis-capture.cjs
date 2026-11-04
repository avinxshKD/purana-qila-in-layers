'use strict';
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs'),{sha256,rawPng,ffmpeg}=require('../media.cjs');
const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];},out=path.resolve(get('--out')||path.join(root,'output/film/f2/emphasis-r1'));
const cases=[{id:'maur-drain',featureId:'mauryan-drain',seconds:14.65},{id:'kushan-rooms',featureId:'kushan-house',seconds:22.4}];
async function main(){
  if(fs.existsSync(path.join(out,'results.json')))throw new Error('Preserve completed emphasis proof');
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'snapshot-manifest.json')));
  for(const[file,hash]of Object.entries(manifest.files))if(sha256(fs.readFileSync(path.join(out,'snapshot',file)))!==hash)throw new Error('Frozen snapshot changed');
  const raw=path.join(out,'raw'),stills=path.join(out,'stills');fs.mkdirSync(raw,{recursive:true});fs.mkdirSync(stills,{recursive:true});
  const server=await servePinned({folder:path.join(out,'snapshot'),port:5188,middleware(req,res,next){
    const match=/^\/__emphasis\/([a-z-]+)$/.exec(req.url);if(!match)return next();if(req.method!=='POST'){res.writeHead(405).end();return;}
    const chunks=[];let length=0;req.on('data',bytes=>{length+=bytes.length;if(length>1920*1080*4)req.destroy();else chunks.push(bytes);});
    req.on('end',()=>{const bytes=Buffer.concat(chunks);if(bytes.length!==1920*1080*4){res.writeHead(400).end();return;}fs.writeFileSync(path.join(raw,match[1]+'.rgba'),bytes);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({sha256:sha256(bytes)}));});
  }});
  const results={snapshotSHA256:manifest.snapshotSHA256,cases,phases:{},timingMethod:'performance.now wall time: renderer submission and synchronized one-pixel readback completion, including CPU/GPU/readback overhead, not hardware GPU-only timing',measurement:'Mean per-pixel CIE L* difference over the full visible feature ID mask at native 1920x1080. Independent depth-tested CPU-displacement mask, coverage >=250/255; HUD excluded from brightness measurement.'};
  try{for(const phase of['control','prototype'])for(const selectedCase of cases){
    await withGpu('film:emphasis-'+phase+'-'+selectedCase.id,async()=>{
      let browser;const started=performance.now(),deadline=setTimeout(()=>browser?.close().catch(()=>{}),110000);
      try{
        browser=await launch();const page=(await browser.pages())[0]||await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});page.setDefaultTimeout(100000);
        const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(server.url+'/film.html?capture&backend=m1&emphasis='+(phase==='control'?'absent':'on'));await page.waitForFunction(()=>window.strataEmphasis&&window.strataFilm?.ready);
        results.phases[phase]??={device:await page.evaluate(()=>window.strataFilm.device()),cases:[],turns:[],turnSeconds:0};
        for(const item of[selectedCase]){
          const row=await page.evaluate(async({item,phase})=>{
            const api=window.strataEmphasis,film=window.strataFilm,gl=document.querySelector('canvas').getContext('webgl2');
            const save=async(name,bytes)=>{const response=await fetch('/__emphasis/'+name,{method:'POST',body:bytes});if(!response.ok)throw new Error('Raw write failed');return response.json();};
            const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
            function bench(){api.draw();const rows=Array.from({length:10},()=>api.draw());return {samples:rows.length,submitMedianMs:median(rows.map(r=>r.submitMs)),completionMedianMs:median(rows.map(r=>r.synchronizedReadbackMs)),programCount:rows.at(-1).programs,raw:rows};}
            api.configure({enabled:false});api.prepare(item.seconds);api.draw();
            if(phase==='control'){const timing=bench();film.render(item.seconds);return {id:item.id,seconds:item.seconds,timing,lights:api.state(),capture:await save(item.id+'-without',film.readPixels())};}
            const baseline=api.scenePixels(),mask=api.mask(item.featureId),indices=[];let x0=1920,y0=1080,x1=0,y1=0;
            for(let i=0;i<mask.length;i+=4)if(mask[i]>=250&&mask[i+1]>=250&&mask[i+2]>=250){indices.push(i);const p=i/4,x=p%1920,y=1079-Math.floor(p/1920);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
            if(!indices.length)throw new Error('No visible feature pixels: '+item.id);
            await save(item.id+'-feature-mask',mask);
            const linear=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
            function L(bytes,i){const y=.2126*linear(bytes[i])+.7152*linear(bytes[i+1])+.0722*linear(bytes[i+2]);return y>216/24389?116*Math.cbrt(y)-16:24389/27*y;}
            const baseMean=indices.reduce((sum,i)=>sum+L(baseline,i),0)/indices.length;
            function delta(bytes){return indices.reduce((sum,i)=>sum+L(bytes,i)-L(baseline,i),0)/indices.length;}
            function attempt(power){api.configure({enabled:true,powers:{[item.id]:power}});api.prepare(item.seconds);return delta(api.scenePixels());}
            let low=0,high=16384,value=attempt(high);const trials=[{power:high,deltaL:value}];
            while(value<10&&high<262144){high*=2;value=attempt(high);trials.push({power:high,deltaL:value});}
            for(let step=0;step<8;step++){const power=(low+high)/2,d=attempt(power);trials.push({power,deltaL:d});if(d<10)low=power;else high=power;}
            const power=(low+high)/2,deltaL=attempt(power),lit=api.scenePixels(),deltas=indices.map(i=>L(lit,i)-L(baseline,i)).sort((a,b)=>a-b);
            const deltaLPercentiles=Object.fromEntries([10,50,90,99,100].map(p=>['p'+p,deltas[Math.min(deltas.length-1,Math.floor(deltas.length*p/100))]]));
            const coverage=deltas.filter(d=>d>=deltaL*.7&&d<=deltaL*1.3).length/deltas.length,featureLit=indices.map(i=>L(lit,i)).sort((a,b)=>a-b);
            const poolL=[];let poolClippedPixels=0,featureClippedPixels=0;
            for(const i of indices)if(Math.max(lit[i],lit[i+1],lit[i+2])===255)featureClippedPixels++;
            for(let i=0;i<lit.length;i+=4){const value=L(lit,i);if(value-L(baseline,i)>.25){poolL.push(value);if(Math.max(lit[i],lit[i+1],lit[i+2])===255)poolClippedPixels++;}}
            poolL.sort((a,b)=>a-b);
            const clipping={featureP99L:featureLit[Math.floor(featureLit.length*.99)],featureMaximumL:featureLit.at(-1),featureClippedPixels,poolPixels:poolL.length,poolP99L:poolL[Math.floor(poolL.length*.99)],poolMaximumL:poolL.at(-1),poolClippedPixels};
            const falloff=api.falloffSamples(item.featureId).map(sample=>{
              if(!sample.visible)return sample;const x=Math.round(sample.pixel.x),y=Math.round(sample.pixel.y),values=[];
              for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<1920&&yy>=0&&yy<1080){const i=((1079-yy)*1920+xx)*4;values.push(L(lit,i)-L(baseline,i));}}
              return {...sample,deltaL:median(values)};
            });
            api.configure({enabled:false});api.prepare(item.seconds);api.draw();
            const idleTiming=bench();film.render(item.seconds);await save(item.id+'-idle',film.readPixels());
            let compileCalls=0,linkCalls=0;const compile=gl.compileShader,link=gl.linkProgram;
            gl.compileShader=function(...a){compileCalls++;return compile.apply(this,a);};gl.linkProgram=function(...a){linkCalls++;return link.apply(this,a);};
            const programsBefore=api.programs();api.configure({enabled:true});api.prepare(item.seconds);const timing=bench();film.render(item.seconds);
            const capture=await save(item.id+'-with',film.readPixels()),lights=api.state(),programsAfter=api.programs();
            gl.compileShader=compile;gl.linkProgram=link;
            return {id:item.id,seconds:item.seconds,powerCandela:power,deltaL,deltaLPercentiles,coverageWithin30Percent:coverage,clipping,footprint:api.footprint(item.featureId),falloff,baselineMeanL:baseMean,emphasisMeanL:baseMean+deltaL,maskPixels:indices.length,maskBox:{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1},trials,idleTiming,timing,lights,capture,shaderStability:{compileCalls,linkCalls,programsBefore,programsAfter}};
          },{item,phase});
          results.phases[phase].cases.push(row);fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(results,null,2)+'\n');console.log(phase+' '+item.id+' ΔL* '+(row.deltaL??'control'));
          if(errors.length)throw new Error(errors.join('\n'));
        }
        const duration=(performance.now()-started)/1000;results.phases[phase].turns.push({id:selectedCase.id,seconds:duration});results.phases[phase].turnSeconds+=duration;
      }finally{clearTimeout(deadline);await browser?.close();}
    });
  }}finally{await server.close();}
  for(const item of cases){
    for(const mode of['without','with'])rawPng(path.join(raw,item.id+'-'+mode+'.rgba'),path.join(stills,item.id+'-'+mode+'.png'));
    const row=results.phases.prototype.cases.find(r=>r.id===item.id),a=fs.readFileSync(path.join(raw,item.id+'-without.rgba')),b=fs.readFileSync(path.join(raw,item.id+'-idle.rgba'));let pixels=0,maxDelta=0;
    for(let i=0;i<a.length;i+=4){let changed=false;for(let c=0;c<3;c++){const d=Math.abs(a[i+c]-b[i+c]);changed||=d>0;maxDelta=Math.max(maxDelta,d);}pixels+=changed?1:0;}row.idleVsNoSpotlights={changedPixels:pixels,maxCodeValueDelta:maxDelta};
    rawPng(path.join(raw,item.id+'-feature-mask.rgba'),path.join(out,item.id+'-feature-mask.png'));
    const box=row.maskBox,x=Math.max(0,box.x-30),y=Math.max(0,box.y-30),w=Math.min(1920-x,box.width+60),h=Math.min(1080-y,box.height+60);
    for(const mode of['without','with'])ffmpeg(['-i',path.join(stills,item.id+'-'+mode+'.png'),'-vf',`crop=${w}:${h}:${x}:${y},scale=iw*3:ih*3:flags=neighbor`,'-frames:v','1',path.join(out,item.id+'-'+mode+'-crop.png')]);
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');console.log('Completed four emphasis test stills: '+out);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
