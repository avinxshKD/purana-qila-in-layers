'use strict';
const fs=require('node:fs'),path=require('node:path'),{fileSHA256}=require('./f2-contract.cjs');
function expectedPoolFields(source){
 const config=path.join(source,'src/film/emphasis-fields.js'),directory=fs.existsSync(config)?fs.readFileSync(config,'utf8').match(/POOL_FIELD_DIRECTORY='([^']+)'/)[1]:'film-emphasis/';
 const file=path.join(source,'public',directory,'manifest.json');if(!fs.existsSync(file))return {};
 const manifest=JSON.parse(fs.readFileSync(file)),out={};for(const[id,row]of Object.entries(manifest.fields)){const hash=fileSHA256(path.join(path.dirname(file),row.file));if(hash!==row.sha256)throw new Error('Pinned pool bytes differ: '+id);out[id]=hash;}return out;
}
function assertPoolFields(expected,actual={}){
 const stable=o=>JSON.stringify(Object.entries(o).sort(([a],[b])=>a.localeCompare(b)));
 if(stable(expected)!==stable(actual))throw new Error('Chunk/browser pool field hashes differ from pinned field set');
}
module.exports={expectedPoolFields,assertPoolFields};
