'use strict';
// M2a ten-era spotlight candidate: pinned freeze tree, owned film overlay (recorded),
// freshly baked M2a pool fields, candidate-only field-directory patch, then a pinned snapshot.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),{root}=require('../browser.cjs'),{fileSHA256}=require('./f2-contract.cjs');
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const freeze=path.resolve(get('--freeze')||path.join(root,'output/lookdev/modelling/m2/source-m2a')),out=path.resolve(get('--out')||path.join(root,'output/film/emphasis-m2a-r1')),source=path.join(out,'source');
const expectedSums=(get('--sums-sha256')||'b08b95c5efba5fe6ed50a6920dee66eccbc3ae71efbf41a594d6604ea0ca5eb9').toLowerCase(),fieldDirectory=get('--field-directory')||'film-emphasis-m2a/',stage=get('--stage')||'M2a';
if(fs.existsSync(out))throw new Error('Use a new M2a emphasis candidate folder');
if(fileSHA256(path.join(freeze,'SHA256SUMS.txt'))!==expectedSums)throw new Error('M2a SHA256SUMS hash differs from the pinned freeze');
const sums=fs.readFileSync(path.join(freeze,'SHA256SUMS.txt'),'utf8').trim().split(/\r?\n/).map(line=>{const m=/^([0-9a-f]{64}) [ *]?(.+)$/i.exec(line);if(!m)throw Error('Bad SHA256SUMS line: '+line);return [m[2].replaceAll('\\','/'),m[1].toLowerCase()];});
fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(freeze,'tree'),source,{recursive:true});
for(const [relative,hash]of sums)if(fileSHA256(path.join(source,relative))!==hash)throw new Error('Copied freeze differs: '+relative);
const listed=new Set(sums.map(([r])=>r));
// Owned film overlay: every current src/film file that differs from (or is absent in) the freeze.
const overlay={};for(const name of fs.readdirSync(path.join(root,'src/film'))){const relative='src/film/'+name,mine=fileSHA256(path.join(root,relative)),frozen=listed.has(relative)?sums.find(([r])=>r===relative)[1]:null;if(mine!==frozen){fs.copyFileSync(path.join(root,relative),path.join(source,relative));overlay[relative]={freeze:frozen,overlaid:mine};}}
const prebake=spawnSync(process.execPath,[path.join(__dirname,'emphasis-prebake.cjs'),'--root',source,'--out',path.join(source,'public',fieldDirectory),'--stage',stage+' ten-era GPU review'],{cwd:root,stdio:'inherit'});if(prebake.status!==0)process.exit(prebake.status||1);
const fieldsFile=path.join(source,'src/film/emphasis-fields.js'),before=fileSHA256(fieldsFile),text=fs.readFileSync(fieldsFile,'utf8'),patched=text.replace(/POOL_FIELD_DIRECTORY='[^']+'/,`POOL_FIELD_DIRECTORY='${fieldDirectory}'`);
if(patched===text)throw new Error('Pool field directory constant not found');fs.writeFileSync(fieldsFile,patched);
const manifestFile=path.join(source,'public',fieldDirectory,'manifest.json');
fs.writeFileSync(path.join(out,'candidate-source.json'),JSON.stringify({freeze,freezeSHA256SUMS:expectedSums,freezeFileCount:sums.length,ownedFilmOverlay:overlay,ownedFilmOverlayNote:Object.keys(overlay).length?'Listed src/film files replaced by current owned versions':'Current owned src/film is byte-identical to the freeze; nothing overlaid',
 candidateOnlyPatch:{'src/film/emphasis-fields.js':{freeze:before,patched:fileSHA256(fieldsFile),change:`POOL_FIELD_DIRECTORY -> '${fieldDirectory}'`}},
 addedPoolFields:{directory:'public/'+fieldDirectory,manifestSHA256:fileSHA256(manifestFile),bakedFrom:`this candidate source (${stage} geometry), two independent bakes`},
 geometry:`Pinned ${stage} freeze`,scope:'Ten-era film spotlight review and ring-power calibration only'},null,2)+'\n');
const r=spawnSync(process.execPath,[path.join(__dirname,'snapshot.cjs'),'--source',source,'--out',out,'--frozen-source','--description',`Ten-era film soft pools on pinned ${stage} freeze with ${stage}-baked fields`],{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
