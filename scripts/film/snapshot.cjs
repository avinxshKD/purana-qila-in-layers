'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {root}=require('../browser.cjs');
const {sha256}=require('../media.cjs');
async function main(){
  const args=process.argv.slice(2),get=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
  const {build}=await import('vite');
  const delivery=path.resolve(get('--out')||path.join(root,'output','film','f1'));
  const sourceRoot=path.resolve(get('--source')||root),outDir=path.join(delivery,'snapshot');
  if(fs.existsSync(path.join(outDir,'film.html')))throw new Error('Snapshot exists; do not replace a pinned render source.');
  if(sourceRoot!==root&&!args.includes('--frozen-source')){
    for(const file of ['film.html','package.json','package-lock.json'])if(fs.existsSync(path.join(root,file)))fs.copyFileSync(path.join(root,file),path.join(sourceRoot,file));
    for(const folder of ['public','reference'])fs.cpSync(path.join(root,folder),path.join(sourceRoot,folder),{recursive:true});
  }
  await build({root:sourceRoot,configFile:false,base:'./',logLevel:'warn',build:{outDir,emptyOutDir:false,target:'esnext',rollupOptions:{input:path.join(sourceRoot,'film.html')}}});
  const manifest={createdUTC:new Date().toISOString(),description:get('--description')||'Pinned F1 film and scene bundle; source modules may change after this build without changing the render.',files:{}};
  function walk(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(folder,entry.name);if(entry.isDirectory())walk(file);else manifest.files[path.relative(outDir,file).replaceAll('\\','/')]=sha256(fs.readFileSync(file));}}
  walk(outDir);manifest.snapshotSHA256=sha256(JSON.stringify(manifest.files));
  if(get('--archive'))manifest.sourceArchive={path:path.resolve(get('--archive')),sha256:sha256(fs.readFileSync(get('--archive')))};
  manifest.sourceRoot=sourceRoot;
  fs.writeFileSync(path.join(delivery,'snapshot-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`Pinned film snapshot: ${Object.keys(manifest.files).length} files; SHA256 ${manifest.snapshotSHA256}`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
