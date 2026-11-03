import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as THREE from 'three';
const root=path.resolve(import.meta.dirname,'../..'),mode=process.argv[2],out=path.join(root,'output/lookdev/features',process.argv[3]??'k2e-cpu');
const hash=v=>createHash('sha256').update(v).digest('hex'),files=fs.readdirSync(path.join(root,'src/features')).filter(p=>p.endsWith('.js')),sources={};
for(const p of files)sources[p]=fs.readFileSync(path.join(root,'src/features',p),'utf8');
if(mode==='before'){
 const swap=(file,a,b)=>{if(!sources[file].includes(a))throw new Error('Cannot restore K2d source: '+file);sources[file]=sources[file].replace(a,b);};
 sources['stone.js']=fs.readFileSync(path.join(import.meta.dirname,'k2d-stone-baseline.txt'),'utf8');
 swap('finds.js',"pieces=[],units=[];let paint;","pieces=[],units=[];");
 swap('finds.js',"lab[0]=SOIL_LAB[0]-3;lab[2]=11.8; // Dark end of the accepted rubble palette, not a new hue.\n  const stone=stonePieces(spec,lab);paint=stone.paint;pieces.push(...stone);","lab[0]=SOIL_LAB[0]+9; // Same grey-buff rubble family; separation gate on the soil host.\n  pieces.push(...stonePieces(spec,lab));");
 swap('finds.js',"return {pieces,units,paint,courseCount:1,","return {pieces,units,courseCount:1,");
 swap('index.js',"if(piece.finish)finish.push(...(piece.paintDust?[3,f.surface?1:0]:piece.finish));","if(piece.finish)finish.push(...piece.finish);");
 swap('index.js',"const dust=piece.paintDust?0:piece.dustAt?","const dust=piece.dustAt?");
 swap('finish.js',"if((vFeatureFinish.x>.5&&vFeatureFinish.x<1.5)||(vFeatureFinish.x>2.5&&vFeatureFinish.y>.5)){","if(vFeatureFinish.x>.5&&vFeatureFinish.x<1.5){");
 swap('finish.js',"float low=1.0-smoothstep(.1,.4,(strataPosition.y-vFeatureFinish.y+.065)/.13);\n    float fine=strataOctave(strataPosition+vec3(2,8,5),.018,footprint);\n    diffuseColor.rgb*=exp(.50*mottling+.14*fine-.42*low);","float low=1.0-smoothstep(.22,.44,(strataPosition.y-vFeatureFinish.y+.065)/.13);\n    diffuseColor.rgb*=exp(.34*clamp(3.0*mottling,-1.0,1.0)-.42*low);");
 registerHooks({load(url,ctx,next){
  if(url.startsWith(pathToFileURL(path.join(root,'src/features')+path.sep).href)){
   const name=path.basename(fileURLToPath(url));if(sources[name]!==undefined)return{format:'module',source:sources[name],shortCircuit:true};
  }return next(url,ctx);
 }});
}
const {buildEraFeature}=await import('../../src/features/index.js');
function serial(v){
 if(v===null||v===undefined)return v??null;
 if(v.isTexture){const image=v.image;return{kind:'texture',format:v.format,type:v.type,wrap:[v.wrapS,v.wrapT],filter:[v.minFilter,v.magFilter],mipmaps:v.generateMipmaps,flipY:v.flipY,colorSpace:v.colorSpace,premultiplyAlpha:v.premultiplyAlpha,image:image?{width:image.width,height:image.height,data:image.data?hash(Buffer.from(image.data.buffer,image.data.byteOffset,image.data.byteLength)):null}:null};}
 if(ArrayBuffer.isView(v))return{type:v.constructor.name,length:v.length,hash:hash(Buffer.from(v.buffer,v.byteOffset,v.byteLength))};
 if(v.toArray)return v.toArray();if(Array.isArray(v))return v.map(serial);
 if(typeof v==='object')return Object.fromEntries(Object.keys(v).sort().filter(k=>!['uuid','id'].includes(k)).map(k=>[k,serial(v[k])]));
 return v;
}
const controls=['rajput-postholes','rajput-sealed-pit','sunga-burnt-patches','pre-mauryan-sherds','mughal-porcelain','mughal-glass','modern-china-1955','modern-brick-1948'],report=[];
for(const id of controls){
 const h=buildEraFeature(id),states=[];
 for(const cut of[{},...(['rajput-postholes','rajput-sealed-pit'].includes(id)?[{keep:[{normal:[0,.05234,-1],constant:0}]}]:[])]){
  h.setCuts(cut);states.push(h.object.children.map(m=>{
   const attributes=Object.fromEntries([...new Set(['position','normal','uv',...Object.keys(m.geometry.attributes)])].sort().map(k=>[k,m.geometry.attributes[k]?serial(m.geometry.attributes[k].array):null]));
   const shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:THREE.UniformsUtils.clone(THREE.ShaderLib.standard.uniforms)};m.material.onBeforeCompile(shader,{});
   const parameters=Object.fromEntries(['type','color','roughness','metalness','emissive','emissiveIntensity','opacity','transparent','side','shadowSide','depthWrite','depthTest','colorWrite','flatShading','vertexColors','alphaTest','blending','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','map','normalMap','bumpMap','alphaMap','envMap','displacementMap','aoMap','lightMap','roughnessMap','metalnessMap'].map(k=>[k,serial(m.material[k])]));
   return{attributes,index:m.geometry.index?serial(m.geometry.index.array):null,drawRange:m.geometry.drawRange,castShadow:m.castShadow,receiveShadow:m.receiveShadow,material:{parameters,programKey:m.material.customProgramCacheKey(),vertexShader:hash(shader.vertexShader),fragmentShader:hash(shader.fragmentShader),uniforms:serial(shader.uniforms)}};
  }));
 }
 const record={id,states};report.push({...record,hash:hash(JSON.stringify(record))});h.dispose();
}
fs.mkdirSync(out,{recursive:true});
const file=path.join(out,'control-'+mode+'.json');fs.writeFileSync(file,JSON.stringify({mode,method:mode==='before'?'K2d baseline reconstructed from exact pre-correction module versions in an isolated Node loader. No production rollback. All other feature modules were still at K2d when snapshotted.':'Current production source in a fresh Node process.',sourceHashes:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,hash(v)])),controls:report},null,2),{flag:'wx'});
console.log(JSON.stringify({file,controls:report.map(({id,hash})=>({id,hash}))}));
