'use strict';
const fs=require('node:fs'),path=require('node:path'),{root,launch}=require('../browser.cjs'),{withGpu}=require('../gpu-lock.cjs'),{servePinned}=require('./static-server.cjs'),{verifySnapshot}=require('./f2-contract.cjs'),{sha256}=require('../media.cjs');
const {expectedPoolFields,assertPoolFields}=require('./pool-fields.cjs');
async function main(){
 const args=process.argv.slice(2),i=args.indexOf('--out'),out=path.resolve(i<0?path.join(root,'output/film/f2/emphasis-r5-r2b'):args[i+1]),manifest=verifySnapshot(out),file=path.join(out,'gpu-results.json');
 if(fs.existsSync(file))throw new Error('Preserve completed emphasis capture');const raw=path.join(out,'raw');fs.mkdirSync(raw,{recursive:true});
 const copy=JSON.parse(fs.readFileSync(path.join(out,'source/reference/film-callouts.json'))),cases=Array.from({length:10},(_,n)=>({id:copy.sections[n+2].id||['pre-mauryan','mauryan','sunga','kushan','gupta','post-gupta','rajput','sultanate','mughal','modern-fill'][n],section:n+2,seconds:10.5+n*4,callouts:copy.sections[n+2].callouts.map((c,slot)=>({...c,slot,id:['pre-pgw','pre-soil','maur-rings','maur-drain','sunga-wall','sunga-patches','kushan-rooms','kushan-brick','gupta-floors','gupta-wall','post-ns','post-ew','rajput-width','rajput-holes','sultanate-corner','sultanate-floor','mughal-porcelain','mughal-glass','modern-1948','modern-1955'][n*2+slot]}))}));
 const multi=args.includes('--multi'),directory=fs.readFileSync(path.join(out,'source/src/film/emphasis-fields.js'),'utf8').match(/POOL_FIELD_DIRECTORY='([^']+)'/)[1],fieldsManifest=JSON.parse(fs.readFileSync(path.join(out,'source/public',directory,'manifest.json'))),selectedCases=multi?cases.map(c=>({...c,callouts:c.callouts.filter(c=>fieldsManifest.featureClusters[c.featureId].multiPart)})).filter(c=>c.callouts.length):cases,limitSeconds=multi?300:540;
 const expectedFields=expectedPoolFields(path.join(out,'source')),results={snapshotSHA256:manifest.snapshotSHA256,baseline:JSON.parse(fs.readFileSync(path.join(out,'candidate-source.json'))),cases:[],multiPartOnly:multi,featureClusters:fieldsManifest.featureClusters,expectedPoolFieldHashes:expectedFields,captureProtocol:'F2 native launcher/profile, CPU Canvas2D/font-ready and300/1530/0 priming;1920x1080,DPR1,MSAA4; coverage-weighted partial MSAA masks',gates:'mean feature deltaL8..12; positive-delta weighted footprint coverage>=99.99%; no channel255 in affected pool; neutral white lights/no material tint; no shadows;>=0.75m full-strength exterior margin plus soft fade; compile/link0 and stable programs within each warmed still'};
 await withGpu(multi?'film:emphasis-r6-multi-parts':'film:emphasis-r5-ten-eras',async()=>{
  const started=performance.now();let browser,server,expired=false;const deadline=setTimeout(()=>{expired=true;browser?.close().catch(()=>{});},limitSeconds*1000);
  try{
   server=await servePinned({folder:path.join(out,'snapshot'),port:5188,middleware(req,res,next){const m=/^\/__pool\/([a-z0-9-]+)$/.exec(req.url);if(!m)return next();if(req.method!=='POST'){res.writeHead(405).end();return;}let length=0;const chunks=[];req.on('data',b=>{length+=b.length;if(length>1920*1080*4)req.destroy();else chunks.push(b);});req.on('end',()=>{const b=Buffer.concat(chunks);if(b.length!==1920*1080*4){res.writeHead(400).end();return;}fs.writeFileSync(path.join(raw,m[1]+'.rgba'),b);res.end(sha256(b));});}});
   const profile='f2-'+sha256(out).slice(0,16);browser=await launch({profile});const page=(await browser.pages())[0]||await browser.newPage();await page.setViewport({width:1920,height:1080,deviceScaleFactor:1});page.setDefaultTimeout(100000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.evaluateOnNewDocument(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,options){return original.call(this,kind,kind==='2d'?{...options,willReadFrequently:true}:options);};});
   await page.goto(server.url+'/film.html?capture&backend=m1');await page.waitForFunction(()=>window.strataFilm?.ready&&window.strataEmphasis);await page.evaluate(()=>document.fonts.ready);
   results.device=await page.evaluate(()=>window.strataFilm.device());if(!(results.device.samples>0))throw new Error('Native multisampling required');results.profile=profile;
   assertPoolFields(expectedFields,await page.evaluate(()=>window.strataEmphasis.fieldHashes()));fs.writeFileSync(path.join(out,'capture-start.json'),JSON.stringify(results,null,2)+'\n');
   if(multi)await page.evaluate(ids=>window.strataEmphasis.configure({powers:Object.fromEntries(ids.map(id=>[id,0]))}),cases.flatMap(c=>c.callouts.map(c=>c.id)));
   await page.evaluate(()=>{for(const frame of[300,1530,0]){window.strataFilm.render(frame/30);window.strataFilm.readPixels();}});
   for(const item of selectedCases){
    if(expired||performance.now()-started>(limitSeconds-15)*1000)throw new Error('One-turn deadline; partial evidence preserved');
    const row=await page.evaluate(async item=>{
     const api=window.strataEmphasis,gl=document.querySelector('canvas').getContext('webgl2'),save=async(name,bytes)=>{const response=await fetch('/__pool/'+name,{method:'POST',body:bytes});if(!response.ok)throw new Error('Raw upload failed');return response.text();};
     const linear=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;},L=(bytes,i)=>{const y=.2126*linear(bytes[i])+.7152*linear(bytes[i+1])+.0722*linear(bytes[i+2]);return y>216/24389?116*Math.cbrt(y)-16:24389/27*y;};
     api.configure({enabled:false});const state=api.prepare(item.seconds),baseline=api.scenePixels(),features=[];
     for(const callout of item.callouts){const mask=api.mask(callout.featureId),weighted=api.maskWeights(mask);await save(item.id+'-slot'+callout.slot+'-mask',mask);features.push({...callout,...weighted,maskPixels:weighted.indices.length,poolBox:api.poolBox(callout.slot),clusterBoxes:Array.from({length:api.state()[callout.slot].pool.clusterCount},(_,n)=>api.poolBox(callout.slot,n)),footprint:api.footprint(callout.featureId)});}
     if(features.some(f=>!f.indices.length))throw new Error('Empty feature mask at '+item.id);
     const means=bytes=>features.map(f=>f.indices.reduce((s,i,n)=>s+(L(bytes,i)-L(baseline,i))*f.weights[n],0)/f.equivalentPixels),P=16384,powerNames=features.map(f=>f.id);
     function attempt(p){api.configure({enabled:true,powers:Object.fromEntries(powerNames.map((id,i)=>[id,p[i]]))});return api.scenePixels();}
     const responses=features.map((_,j)=>means(attempt(features.map((_,i)=>i===j?P:0)))),matrix=features.map((_,i)=>features.map((_,j)=>responses[j][i]/P));
     function solve(v){if(features.length===1)return[v[0]/Math.max(matrix[0][0],1e-6)];const det=matrix[0][0]*matrix[1][1]-matrix[0][1]*matrix[1][0];return Math.abs(det)>1e-12?[(v[0]*matrix[1][1]-v[1]*matrix[0][1])/det,(matrix[0][0]*v[1]-matrix[1][0]*v[0])/det]:[v[0]/Math.max(matrix[0][0],1e-6)/2,v[1]/Math.max(matrix[1][1],1e-6)/2];}
     let powers=solve(features.map(()=>10)).map(p=>Math.max(0,Math.min(262144,p))),lit,trials=[];
     for(let n=0;n<4;n++){lit=attempt(powers);const deltas=means(lit);trials.push({powers:[...powers],deltaL:deltas});if(deltas.every(d=>Math.abs(d-10)<.15))break;const update=solve(deltas.map(d=>10-d));powers=powers.map((p,i)=>Math.max(0,Math.min(262144,p+update[i])));}
     lit=attempt(powers);
     const pool={pixels:0,clippedPixels:0,maximumL:0};for(let i=0;i<lit.length;i+=4){const l=L(lit,i);if(l-L(baseline,i)>.25){pool.pixels++;pool.maximumL=Math.max(pool.maximumL,l);if(Math.max(lit[i],lit[i+1],lit[i+2])===255)pool.clippedPixels++;}}
     for(const [index,f]of features.entries()){const values=f.indices.map(i=>L(lit,i)-L(baseline,i));f.meanDeltaL=values.reduce((s,d,n)=>s+d*f.weights[n],0)/f.equivalentPixels;f.coverage=values.reduce((s,d,n)=>s+(d>.25?f.weights[n]:0),0)/f.equivalentPixels;f.uniformWithin30Percent=values.reduce((s,d,n)=>s+(Math.abs(d-f.meanDeltaL)<=f.meanDeltaL*.3?f.weights[n]:0),0)/f.equivalentPixels;f.maximumL=Math.max(...f.indices.map(i=>L(lit,i)));f.power=powers[index];delete f.indices;delete f.weights;}
     await save(item.id+'-scene-without',baseline);await save(item.id+'-scene-with',lit);
     api.configure({enabled:false});await save(item.id+'-without',api.draw());const before=api.programs();let compileCalls=0,linkCalls=0;const compile=gl.compileShader,link=gl.linkProgram;gl.compileShader=function(...a){compileCalls++;return compile.apply(this,a);};gl.linkProgram=function(...a){linkCalls++;return link.apply(this,a);};
     api.configure({enabled:true});await save(item.id+'-with',api.draw());const after=api.programs();gl.compileShader=compile;gl.linkProgram=link;
     return {...item,features,pool,trials,lights:api.state(),poolFieldHashes:api.fieldHashes(),shaderStability:{compileCalls,linkCalls,before,after},calloutOpacities:state.overlays.callouts.map(c=>c.opacity),programs:after.length};
    },item);
    assertPoolFields(expectedFields,row.poolFieldHashes);results.cases.push(row);fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(results,null,2)+'\n');console.log(item.id+' '+row.features.map(f=>f.id+' ΔL'+f.meanDeltaL.toFixed(2)+' cov'+(f.coverage*100).toFixed(4)+'%').join('; '));
    if(errors.length)throw new Error(errors.join('\n'));
   }
  }catch(error){results.failure=error.message;throw error;}finally{await browser?.close();await server?.close();clearTimeout(deadline);results.gpuTurnSeconds=(performance.now()-started)/1000;if(results.failure)fs.writeFileSync(path.join(out,'failed-gpu-turn.json'),JSON.stringify(results,null,2)+'\n');}
  if(expired||results.gpuTurnSeconds>limitSeconds)throw new Error('GPU turn exceeded'+limitSeconds+'s');
 });
 fs.writeFileSync(file,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({out,cases:results.cases.length,gpuTurnSeconds:results.gpuTurnSeconds}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
