'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function auditSourceManifest(tree){
  const result={},film=new Set(['camera.js','timeline.js','audit-geometry.js']);
  const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  function walk(folder){
    for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      const file=path.join(folder,entry.name),relative=path.relative(tree,file).replaceAll('\\','/');
      if(relative==='src/site'||relative.startsWith('src/site/'))continue;
      if(relative.startsWith('src/film/')&&!film.has(entry.name))continue;
      if(entry.isDirectory())walk(file);else result[relative]=hash(file);
    }
  }
  walk(path.join(tree,'src'));
  result['reference/film-callouts.json']=hash(path.join(tree,'reference/film-callouts.json'));
  return result;
}
module.exports={auditSourceManifest};
