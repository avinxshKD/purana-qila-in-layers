'use strict';
// Site sanity candidate on the pinned M2a freeze: freeze tree + current src/site and site.html,
// owned src/film overlay (recorded), current site drawer/source copy, the accepted M2a pool
// fields (copied, hash-checked) and M2a callout powers, built into a pinned static snapshot.
const fs=require('node:fs'),path=require('node:path'),{root}=require('../browser.cjs'),{fileSHA256}=require('../film/f2-contract.cjs'),{sha256}=require('../media.cjs');
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const freeze=path.resolve(get('--freeze')||path.join(root,'output/lookdev/modelling/m2/source-m2a')),out=path.resolve(get('--out')||path.join(root,'output/site/sanity-m2a-r1'));
const expectedSums=(get('--sums-sha256')||'b08b95c5efba5fe6ed50a6920dee66eccbc3ae71efbf41a594d6604ea0ca5eb9').toLowerCase();
const fieldsRun=path.resolve(get('--fields-from')||path.join(root,'output/film/emphasis-m2a-r1')),fieldDirectory='film-emphasis-m2a/';
async function main(){
 if(fs.existsSync(out))throw Error('Preserve prior site sanity candidate');
 if(fileSHA256(path.join(freeze,'SHA256SUMS.txt'))!==expectedSums)throw Error('M2a SHA256SUMS hash differs from the pinned freeze');
 const sums=fs.readFileSync(path.join(freeze,'SHA256SUMS.txt'),'utf8').trim().split(/\r?\n/).map(line=>{const m=/^([0-9a-f]{64}) [ *]?(.+)$/i.exec(line);if(!m)throw Error('Bad SHA256SUMS line: '+line);return [m[2].replaceAll('\\','/'),m[1].toLowerCase()];}),frozen=new Map(sums);
 const source=path.join(out,'source'),snapshot=path.join(out,'snapshot');fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(freeze,'tree'),source,{recursive:true});
 for(const [relative,hash] of sums)if(fileSHA256(path.join(source,relative))!==hash)throw Error('Copied freeze differs: '+relative);
 const overlay={},put=relative=>{const mine=fileSHA256(path.join(root,relative)),old=frozen.get(relative)||null;if(mine!==old){fs.mkdirSync(path.dirname(path.join(source,relative)),{recursive:true});fs.copyFileSync(path.join(root,relative),path.join(source,relative));overlay[relative]={freeze:old,candidate:mine};}};
 const walk=(folder,list=[])=>{for(const e of fs.readdirSync(path.join(root,folder),{withFileTypes:true}))e.isDirectory()?walk(folder+'/'+e.name,list):list.push(folder+'/'+e.name);return list;};
 for(const relative of [...walk('src/site'),...walk('src/film').filter(r=>!r.endsWith('callout-track.json')),'site.html','reference/site-drawers.json','reference/site-sources.json'])put(relative);
 if(Object.keys(overlay).some(r=>r.startsWith('src/eras/')))throw Error('Site candidate must not change src/eras');
 // Accepted M2a pool fields, byte-for-byte.
 const runSource=JSON.parse(fs.readFileSync(path.join(fieldsRun,'candidate-source.json'),'utf8')),fieldsFrom=path.join(fieldsRun,'source','public',fieldDirectory);
 fs.cpSync(fieldsFrom,path.join(source,'public',fieldDirectory),{recursive:true});
 const manifestSHA256=fileSHA256(path.join(source,'public',fieldDirectory,'manifest.json'));if(manifestSHA256!==runSource.addedPoolFields.manifestSHA256)throw Error('M2a pool field manifest differs from the accepted run');
 // Candidate-only patches: M2a field directory and M2a calibrated powers (repo defaults stay until the F3 switch).
 const patch=(relative,from,to,change)=>{const file=path.join(source,relative),before=fileSHA256(file),text=fs.readFileSync(file,'utf8'),next=text.replace(from,to);if(next===text)throw Error('Patch target not found in '+relative);fs.writeFileSync(file,next);return {before,patched:fileSHA256(file),change};};
 const patches={'src/film/emphasis-fields.js':patch('src/film/emphasis-fields.js',/POOL_FIELD_DIRECTORY='[^']+'/,`POOL_FIELD_DIRECTORY='${fieldDirectory}'`,`POOL_FIELD_DIRECTORY -> '${fieldDirectory}'`),
  'src/site/scene.js':patch('src/site/scene.js',"import {CALLOUT_POWERS,CALIBRATION_STATUS} from '../film/emphasis-powers.js';","import {M2A_CALLOUT_POWERS as CALLOUT_POWERS,M2A_CALIBRATION_STATUS as CALIBRATION_STATUS} from '../film/emphasis-powers.js';",'CALLOUT_POWERS/CALIBRATION_STATUS -> M2A_* (accepted M2a spotlight)')};
 const {build}=await import('vite');await build({root:source,configFile:false,base:'./',logLevel:'warn',build:{outDir:snapshot,emptyOutDir:false,target:'esnext',rolldownOptions:{input:path.join(source,'site.html')}}});
 const files={};(function list(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(folder,entry.name);if(entry.isDirectory())list(file);else files[path.relative(snapshot,file).replaceAll('\\','/')]=fileSHA256(file);}})(snapshot);
 const manifest={description:'Site design pass on the pinned M2a freeze (M2a geometry, M2a pool fields and powers)',sourceRoot:source,files,snapshotSHA256:sha256(JSON.stringify(files))};
 fs.writeFileSync(path.join(out,'snapshot-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(out,'candidate-source.json'),JSON.stringify({freeze,freezeSHA256SUMS:expectedSums,freezeFileCount:sums.length,overlay,candidateOnlyPatches:patches,
  poolFields:{directory:'public/'+fieldDirectory,manifestSHA256,copiedFrom:fieldsFrom},filmCalloutsJSON:{freeze:frozen.get('reference/film-callouts.json'),current:fileSHA256(path.join(root,'reference/film-callouts.json')),used:'freeze'},
  srcErasUnchanged:true,scope:'Site design pass: film-style callouts, title/subtitle from data, framing solver, held labels during orbit; M2a geometry.'},null,2)+'\n');
 console.log(JSON.stringify({out,snapshotSHA256:manifest.snapshotSHA256,overlaid:Object.keys(overlay).length,manifestSHA256}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
