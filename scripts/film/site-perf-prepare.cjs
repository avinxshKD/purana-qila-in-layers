'use strict';
const fs=require('node:fs'),path=require('node:path');
const {root}=require('../browser.cjs'),{sha256}=require('../media.cjs');
async function main(){
  const args=process.argv.slice(2),stage=args[0]||'baseline';
  if(stage!=='baseline'&&!/^candidate(?:-[a-z0-9-]+)?$/.test(stage))throw new Error('Use baseline or a candidate revision');
  const isCandidate=stage!=='baseline',out=path.join(root,'output','site','perf-r2-r1',stage),source=path.join(out,'source'),base=isCandidate?path.join(root,'output','site','perf-r2-r1','baseline','source'):root;
  if(fs.existsSync(source))throw new Error('Preserve frozen source; use a new delivery');
  fs.mkdirSync(source,{recursive:true});
  for(const folder of ['src','reference','public'])fs.cpSync(path.join(base,folder),path.join(source,folder),{recursive:true});
  for(const file of ['site.html','package.json','package-lock.json'])fs.copyFileSync(path.join(base,file),path.join(source,file));
  if(isCandidate){fs.cpSync(path.join(root,'src','site'),path.join(source,'src','site'),{recursive:true});for(const file of ['package.json','package-lock.json'])fs.copyFileSync(path.join(root,file),path.join(source,file));}
  const files={};
  function walk(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(folder,entry.name);if(entry.isDirectory())walk(file);else files[path.relative(source,file).replaceAll('\\','/')]=sha256(fs.readFileSync(file));}}
  walk(source);fs.writeFileSync(path.join(out,'source-inputs.json'),JSON.stringify({stage,description:isCandidate?'Same frozen scene/static inputs, with owned site behaviour modules and explicitly authorized pinned MIT BVH dependency':'Pre-change current S6 application; no production performance changes',sha256:sha256(JSON.stringify(files)),files},null,2)+'\n');
  const {build}=await import('vite'),outDir=path.join(out,'snapshot');
  await build({root:source,configFile:false,base:'./',logLevel:'warn',build:{outDir,emptyOutDir:false,target:'esnext',rollupOptions:{input:path.join(source,'site.html')}}});
  const bundle={};function hashBundle(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())hashBundle(file);else bundle[path.relative(outDir,file).replaceAll('\\','/')]=sha256(fs.readFileSync(file));}}
  hashBundle(outDir);fs.writeFileSync(path.join(out,'snapshot-manifest.json'),JSON.stringify({stage,sha256:sha256(JSON.stringify(bundle)),files:bundle},null,2)+'\n');console.log(stage+' source frozen; '+Object.keys(bundle).length+' bundle files');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
