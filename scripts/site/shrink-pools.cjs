'use strict';
// Builds the site pool set from the film's M2b pool fields: 8-bit single-channel, cropped to the lit box at
// full resolution (one zero texel of border), verified byte-exact against the source after re-expansion.
// Also records what box downsampling (2x/4x/8x, bilinear back) would cost, for comparison. Never overwrites.
// Usage: node scripts/site/shrink-pools.cjs [--out public/site-pools-m2b]
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url'),{root}=require('../browser.cjs');
const SOURCE=path.join(root,'public/film-emphasis-m2b'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const args=process.argv.slice(2),arg=(n,f)=>{const i=args.indexOf(n);return i<0?f:args[i+1];},out=path.resolve(root,arg('--out','public/site-pools-m2b'));
  if(fs.existsSync(path.join(out,'manifest.json')))throw new Error('Preserve site pool set '+out);
  const {downsampleField,upsampleField,cropField,expandCrop,cropTransform}=await import(pathToFileURL(path.join(root,'src/site/pool-field.js')).href);
  const manifestText=fs.readFileSync(path.join(SOURCE,'manifest.json')),source=JSON.parse(manifestText),size=source.size,ids=Object.keys(source.fields),fields={},trials={},crops={};
  for(const f of [2,4,8])trials[f]={size:size/f,totalFieldBytes:(size/f)**2*ids.length,maxAbsError:0,meanAbsError:0,worstField:null};
  for(const [id,record] of Object.entries(source.fields)){
    const rgba=fs.readFileSync(path.join(SOURCE,record.file));if(sha(rgba)!==record.sha256)throw new Error('Source field hash differs: '+id);
    for(let i=0;i<rgba.length;i+=4)if(rgba[i]!==rgba[i+1]||rgba[i]!==rgba[i+2]||rgba[i+3]!==255)throw new Error('Source field is not grey with opaque alpha: '+id);
    for(const [f,t] of Object.entries(trials)){
      const back=upsampleField(downsampleField(rgba,size,+f),size/f,size);let sum=0,max=0;
      for(let i=0;i<rgba.length;i+=4){const e=Math.abs(back[i]-rgba[i]);sum+=e;if(e>max)max=e;}
      if(max>t.maxAbsError){t.maxAbsError=max;t.worstField=id;}t.meanAbsError+=sum/(size*size)/ids.length;
    }
    const c=cropField(rgba,size);if(sha(expandCrop(c.data,c.crop,size))!==record.sha256)throw new Error('Crop is not exact: '+id);crops[id]=c;
  }
  fs.mkdirSync(out,{recursive:true});let bytes=0;
  for(const [id,record] of Object.entries(source.fields)){
    const {data,crop}=crops[id],file=id+'.r8';fs.writeFileSync(path.join(out,file),data);bytes+=data.length;
    const {file:_f,sha256:_s,...rest}=record;fields[id]={...rest,file,sha256:sha(data),crop,uvTransform:cropTransform(crop,size),sourceFile:record.file,sourceSHA256:record.sha256};
  }
  const manifest={schemaVersion:1,format:'r8-crop',size,
    sampling:'R8, linear filtering, clamp to edge; value/255 is the pool weight. uvCrop = (projectorUV - uvTransform.offset) / uvTransform.scale, in data-row order. The projector (position, target, angle) is unchanged from the source.',
    exact:'Re-expanding each crop into the 512x512 grey RGBA field reproduces sourceSHA256.',
    sourceDirectory:'film-emphasis-m2b/',sourceManifestSHA256:sha(manifestText),sceneRoot:path.relative(root,source.sceneRoot).split(path.sep).join('/'),sourceLayoutSHA256:source.sourceLayoutSHA256,
    marginMetres:source.marginMetres,fadeMetres:source.fadeMetres,mergeMetres:source.mergeMetres,fields};
  const manifestOut=JSON.stringify(manifest)+'\n';fs.writeFileSync(path.join(out,'manifest.json'),manifestOut);
  const sourceBytes=ids.length*size*size*4;
  const report={out,format:'r8-crop',fieldCount:ids.length,fieldBytes:bytes,manifestBytes:Buffer.byteLength(manifestOut),totalBytes:bytes+Buffer.byteLength(manifestOut),
    crops:Object.fromEntries(ids.map(id=>[id,crops[id].crop])),exactAgainstSource:true,
    source:{fieldBytes:sourceBytes,manifestBytes:manifestText.length,totalBytes:sourceBytes+manifestText.length},
    downsampleTrials:Object.fromEntries(Object.entries(trials).map(([f,t])=>[f+'x',{...t,meanAbsError:+t.meanAbsError.toFixed(4)}]))};
  fs.writeFileSync(path.join(root,'output/site',`shrink-pools-${path.basename(out)}.json`),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,crops:undefined}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
