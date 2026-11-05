'use strict';
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{root}=require('../browser.cjs'),{loadCpuWorld}=require('./cpu-world.cjs'),{fileSHA256}=require('./f2-contract.cjs'),{sha256}=require('../media.cjs');
async function main(){
 const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1],tree=path.resolve(args.includes('--root')?get('--root'):path.join(root,'output/film/f2/preflight-m1-r2b/source')),out=path.resolve(args.includes('--out')?get('--out'):path.join(root,'public/film-emphasis')),stage=args.includes('--stage')?get('--stage'):null,preserved=args.includes('--preserve-single')?path.resolve(get('--preserve-single')):null,old=preserved?JSON.parse(fs.readFileSync(path.join(preserved,'manifest.json'))):null;
 if(fs.existsSync(out))throw new Error('Preserve prebaked field set');
 const copy=JSON.parse(fs.readFileSync(path.join(tree,'reference/film-callouts.json'))),{createFilmEmphasis}=await import(pathToFileURL(path.join(root,'src/film/emphasis-film.js')).href),{sampleGrid}=await import(pathToFileURL(path.join(tree,'src/eras/stack.js')).href);
 async function bake(){const world=await loadCpuWorld(tree),effect=await createFilmEmphasis({scene:world.scene,camera:world.camera,eraSite:()=>world.features},copy,{prebaked:false,sampleTop:(x,z)=>sampleGrid(world.features.stack,world.features.activeTop,x,z)});
  for(let n=0;n<10;n++){const {state,applied}=world.apply(315+n*120);effect.update(state.overlays.callouts,applied.featureAnchors);}
  const fields=effect.exportPools();await world.close();return fields;
 }
 const first=await bake(),second=await bake(),fields={},featureClusters={};if(Object.keys(first).length!==20)throw new Error('Expected20 pool fields');
 for(const[id,value]of Object.entries(first)){const hash=sha256(value.bytes),other=second[id];if(hash!==sha256(other.bytes)||JSON.stringify({...value,bytes:undefined})!==JSON.stringify({...other,bytes:undefined}))throw new Error('Independent prebakes differ: '+id);
  const area=value.footprint,multiPart=id!=='mauryan-ring-well'&&(area.nativePartCount>1||area.clusterCount>1);
  featureClusters[id]={nativePartCount:area.nativePartCount??6,connectedComponentCount:area.connectedComponentCount??null,clusterCount:area.clusterCount??1,mergeMetres:1.5,clusters:area.clusters||[],multiPart,review:stage||(id==='mauryan-ring-well'?'Deferred to M2a':multiPart?'r6 multi-part GPU review':'r5 unchanged')};
  if(old&&!multiPart){const record=old.fields[id],bytes=fs.readFileSync(path.join(preserved,record.file));if(sha256(bytes)!==record.sha256)throw Error('Preserved pool bytes differ');first[id]={...record,bytes};fields[id]={...record};}else fields[id]={...value,bytes:undefined,file:id+'.rgba',sha256:hash};
 }
 fs.mkdirSync(out,{recursive:true});for(const[id,value]of Object.entries(first))fs.writeFileSync(path.join(out,id+'.rgba'),value.bytes);
 const manifest={schemaVersion:1,sceneRoot:tree,sourceLayoutSHA256:fileSHA256(path.join(tree,'src/eras/layout.js')),midpointFrames:Array.from({length:10},(_,n)=>315+n*120),marginMetres:.75,fadeMetres:.75,mergeMetres:1.5,size:512,fields,featureClusters,preservedSinglePartFieldsFrom:preserved,determinism:{independentBakes:2,allFieldHashesEqual:true,allPosesAndFootprintsEqual:true}};
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify({out,fields:Object.keys(fields).length,independentBakesEqual:true,manifestSHA256:fileSHA256(path.join(out,'manifest.json'))}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
