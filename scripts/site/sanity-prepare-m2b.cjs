'use strict';
// Site sanity candidate on the pinned M2b freeze: freeze tree + current src/site and site.html,
// owned src/film overlay (recorded), current site drawer/source copy and the accepted M2b pool
// fields (copied, hash-checked). Live code already points at M2b fields and powers, so no patches.
const fs=require('node:fs'),path=require('node:path'),{root}=require('../browser.cjs'),{fileSHA256}=require('../film/f2-contract.cjs'),{sha256}=require('../media.cjs');
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const freeze=path.resolve(get('--freeze')||path.join(root,'output/lookdev/modelling/m2/source-m2b')),out=path.resolve(get('--out')||path.join(root,'output/site/sanity-m2b-r1'));
const expectedSums=(get('--sums-sha256')||'9bb007b32905a32fabbb00878f3d0bcc654542ec28dbb875da881f4c5d768be0').toLowerCase();
const fieldsRun=path.resolve(get('--fields-from')||path.join(root,'output/film/emphasis-m2b-r1')),fieldDirectory='film-emphasis-m2b/';
async function main(){
 if(fs.existsSync(out))throw Error('Preserve prior site sanity candidate');
 if(fileSHA256(path.join(freeze,'SHA256SUMS.txt'))!==expectedSums)throw Error('M2b SHA256SUMS hash differs from the pinned freeze');
 const fieldsSource=fs.readFileSync(path.join(root,'src/film/emphasis-fields.js'),'utf8'),sceneSource=fs.readFileSync(path.join(root,'src/site/scene.js'),'utf8');
 if(!fieldsSource.includes(`POOL_FIELD_DIRECTORY='${fieldDirectory}'`))throw Error('Live POOL_FIELD_DIRECTORY is not '+fieldDirectory);
 if(!sceneSource.includes("import {CALLOUT_POWERS,CALIBRATION_STATUS} from '../film/emphasis-powers.js';"))throw Error('Site scene does not use the live (M2b) callout powers');
 const sums=fs.readFileSync(path.join(freeze,'SHA256SUMS.txt'),'utf8').trim().split(/\r?\n/).map(line=>{const m=/^([0-9a-f]{64}) [ *]?(.+)$/i.exec(line);if(!m)throw Error('Bad SHA256SUMS line: '+line);return [m[2].replaceAll('\\','/'),m[1].toLowerCase()];}),frozen=new Map(sums);
 const source=path.join(out,'source'),snapshot=path.join(out,'snapshot');fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(freeze,'tree'),source,{recursive:true});
 for(const [relative,hash] of sums)if(fileSHA256(path.join(source,relative))!==hash)throw Error('Copied freeze differs: '+relative);
 const overlay={},put=relative=>{const mine=fileSHA256(path.join(root,relative)),old=frozen.get(relative)||null;if(mine!==old){fs.mkdirSync(path.dirname(path.join(source,relative)),{recursive:true});fs.copyFileSync(path.join(root,relative),path.join(source,relative));overlay[relative]={freeze:old,candidate:mine};}};
 const walk=(folder,list=[])=>{for(const e of fs.readdirSync(path.join(root,folder),{withFileTypes:true}))e.isDirectory()?walk(folder+'/'+e.name,list):list.push(folder+'/'+e.name);return list;};
 for(const relative of [...walk('src/site'),...walk('src/film').filter(r=>!r.endsWith('callout-track.json')),'site.html','reference/site-drawers.json','reference/site-sources.json'])put(relative);
 if(Object.keys(overlay).some(r=>r.startsWith('src/eras/')))throw Error('Site candidate must not change src/eras');
 const runSource=JSON.parse(fs.readFileSync(path.join(fieldsRun,'candidate-source.json'),'utf8')),fieldsFrom=path.join(fieldsRun,'source','public',fieldDirectory);
 fs.cpSync(fieldsFrom,path.join(source,'public',fieldDirectory),{recursive:true});
 const manifestSHA256=fileSHA256(path.join(source,'public',fieldDirectory,'manifest.json'));if(manifestSHA256!==runSource.addedPoolFields.manifestSHA256)throw Error('M2b pool field manifest differs from the accepted run');
 const {build}=await import('vite');await build({root:source,configFile:false,base:'./',logLevel:'warn',build:{outDir:snapshot,emptyOutDir:false,target:'esnext',rolldownOptions:{input:path.join(source,'site.html')}}});
 const files={};(function list(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(folder,entry.name);if(entry.isDirectory())list(file);else files[path.relative(snapshot,file).replaceAll('\\','/')]=fileSHA256(file);}})(snapshot);
 const manifest={description:'Site design pass on the pinned M2b freeze (M2b geometry, M2b pool fields and powers)',sourceRoot:source,files,snapshotSHA256:sha256(JSON.stringify(files))};
 fs.writeFileSync(path.join(out,'snapshot-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(out,'candidate-source.json'),JSON.stringify({freeze,freezeSHA256SUMS:expectedSums,freezeFileCount:sums.length,overlay,candidateOnlyPatches:{},
  poolFields:{directory:'public/'+fieldDirectory,manifestSHA256,copiedFrom:fieldsFrom},filmCalloutsJSON:{freeze:frozen.get('reference/film-callouts.json'),current:fileSHA256(path.join(root,'reference/film-callouts.json')),used:'freeze'},
  srcErasUnchanged:true,scope:'Site design pass: tagline hierarchy, film-style callouts with 24px HUD clearance, framing solver, held labels during orbit, async-pack UI; M2b geometry.'},null,2)+'\n');
 console.log(JSON.stringify({out,snapshotSHA256:manifest.snapshotSHA256,overlaid:Object.keys(overlay).length,manifestSHA256}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
