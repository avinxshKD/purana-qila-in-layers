'use strict';
const fs=require('node:fs'),path=require('node:path'),{root}=require('../browser.cjs'),{verifySource,verifySnapshot,fileSHA256}=require('../film/f2-contract.cjs'),{sha256}=require('../media.cjs');
async function main(){
 const args=process.argv.slice(2),i=args.indexOf('--out'),out=path.resolve(i<0?path.join(root,'output/site/sanity-m1-r1'):args[i+1]),baseline=path.join(root,'output/film/f2/preflight-m1-r2b'),source=path.join(out,'source'),snapshot=path.join(out,'snapshot');
 if(fs.existsSync(out))throw Error('Preserve prior site sanity candidate');const pinned=verifySnapshot(baseline),inputs=verifySource(baseline);fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(baseline,'source'),source,{recursive:true});
 fs.cpSync(path.join(root,'src/site'),path.join(source,'src/site'),{recursive:true});fs.copyFileSync(path.join(root,'site.html'),path.join(source,'site.html'));
 const shared=['emphasis.js','emphasis-fields.js','emphasis-powers.js'];for(const name of shared)fs.copyFileSync(path.join(root,'src/film',name),path.join(source,'src/film',name));
 for(const file of['site-drawers.json','site-sources.json'])fs.copyFileSync(path.join(root,'reference',file),path.join(source,'reference',file));
 const directory=fs.readFileSync(path.join(root,'src/film/emphasis-fields.js'),'utf8').match(/POOL_FIELD_DIRECTORY='([^']+)'/)[1];fs.cpSync(path.join(root,'public',directory),path.join(source,'public',directory),{recursive:true});
 const allowed=new Set(shared.map(n=>'src/film/'+n));for(const[relative,hash]of Object.entries(inputs.files))if(!relative.startsWith('src/site/')&&!allowed.has(relative)&&!['reference/site-drawers.json','reference/site-sources.json'].includes(relative)&&fileSHA256(path.join(source,relative))!==hash)throw Error('Unrelated frozen-M1 source changed: '+relative);
 const {build}=await import('vite');await build({root:source,configFile:false,base:'./',logLevel:'warn',build:{outDir:snapshot,emptyOutDir:false,target:'esnext',rolldownOptions:{input:path.join(source,'site.html')}}});
 const files={};function walk(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(folder,entry.name);if(entry.isDirectory())walk(file);else files[path.relative(snapshot,file).replaceAll('\\','/')]=fileSHA256(file);}}walk(snapshot);
 const manifest={description:'Current real-backend site adapter on immutable accepted-M1 r2b geometry, not in-progress M2a',sourceRoot:source,files,snapshotSHA256:sha256(JSON.stringify(files))};
 fs.writeFileSync(path.join(out,'snapshot-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(out,'candidate-source.json'),JSON.stringify({baseline,baselineSnapshotSHA256:pinned.snapshotSHA256,baselineSourceSHA256:inputs.sha256,nativeM1Unchanged:true,anchorTableSHA256:fileSHA256(path.join(source,'src/eras/anchor-table.js')),sharedEmphasisSHA256:fileSHA256(path.join(source,'src/film/emphasis.js')),scope:'Site adapter/diagnostics, accepted r6 pool fields and provisional r2b powers only; no M2a worktree geometry.'},null,2)+'\n');
 console.log(JSON.stringify({out,snapshotSHA256:manifest.snapshotSHA256,nativeM1Unchanged:true}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
