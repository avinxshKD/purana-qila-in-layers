'use strict';
// Record the copied, unbundled static inputs alongside the A3 archive hash.
const fs=require('node:fs');
const path=require('node:path');
const {root}=require('../browser.cjs');
const {sha256}=require('../media.cjs');
const out=path.resolve(process.argv[2]||path.join(root,'output','film','f1-a3'));
const file=path.join(out,'snapshot-manifest.json'),manifest=JSON.parse(fs.readFileSync(file,'utf8')),source=manifest.sourceRoot;
if(fs.existsSync(path.join(out,'pinned-chunks')))throw new Error('Record inputs before rendering begins');
const inputs={};
function record(relative){
  const absolute=path.join(source,relative),stat=fs.statSync(absolute);
  if(stat.isDirectory())for(const name of fs.readdirSync(absolute).sort())record(path.join(relative,name));
  else inputs[relative.replaceAll('\\','/')]=sha256(fs.readFileSync(absolute));
}
for(const relative of ['film.html','public','reference','package.json','package-lock.json'])if(fs.existsSync(path.join(source,relative)))record(relative);
manifest.staticInputs=inputs;
manifest.staticInputsSHA256=sha256(JSON.stringify(inputs));
manifest.buildRecipe={entry:'film.html',base:'./',target:'esnext',configFile:false,nodeVersion:process.version,command:'node scripts/film/snapshot.cjs --out <delivery> --source <extracted-source-a3> --archive <source-a3.zip>',builderSHA256:sha256(fs.readFileSync(path.join(__dirname,'snapshot.cjs')))};
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({snapshotSHA256:manifest.snapshotSHA256,sourceArchiveSHA256:manifest.sourceArchive.sha256,staticInputs:Object.keys(inputs).length,staticInputsSHA256:manifest.staticInputsSHA256}));
