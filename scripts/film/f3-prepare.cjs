'use strict';
// F3 plan step 1: frozen F3 source. Every world/model file comes from the pinned M2b freeze,
// verified against its SHA256SUMS. Only film-owned changes are overlaid, each listed with its
// hash: src/film/**, the final copy JSONs (F3 contract hashes) and the M2b-baked pool fields.
// Nothing else is ever copied from the live tree. Then one pinned build.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process'),{root}=require('../browser.cjs');
const {fileSHA256}=require('./f2-contract.cjs'),{FREEZE,COPY,END_CARD}=require('./f3-contract.cjs');
const args=process.argv.slice(2),get=k=>args.includes(k)?args[args.indexOf(k)+1]:undefined;
const out=path.resolve(get('--out')||path.join(root,'output/film/f3/run-r1')),poolFrom=get('--pool-from')?path.resolve(get('--pool-from')):null,source=path.join(out,'source');
const sha=text=>crypto.createHash('sha256').update(text).digest('hex');
if(fs.existsSync(out))throw new Error('Use a new F3 folder; earlier attempts are preserved');
const freeze=path.join(root,FREEZE.folder);
if(fileSHA256(path.join(freeze,'SHA256SUMS.txt'))!==FREEZE.sumsSHA256)throw new Error('M2b SHA256SUMS hash differs from the F3 contract');
const sums=new Map(fs.readFileSync(path.join(freeze,'SHA256SUMS.txt'),'utf8').trim().split(/\r?\n/).map(line=>{const m=/^([0-9a-f]{64}) [ *]?(.+)$/i.exec(line);if(!m)throw new Error('Bad SHA256SUMS line');return [m[2].replaceAll('\\','/'),m[1].toLowerCase()];}));
if(sums.size!==FREEZE.files)throw new Error('M2b freeze file count differs');
fs.mkdirSync(out,{recursive:true});fs.cpSync(path.join(freeze,'tree'),source,{recursive:true});
for(const [rel,hash]of sums)if(fileSHA256(path.join(source,rel))!==hash)throw new Error('Copied M2b file differs: '+rel);
const overlay={};
function put(rel,from,reason){
  const allowed=rel.startsWith('src/film/')||rel in COPY||/^public\/film-emphasis-m2b\//.test(rel);
  if(!allowed)throw new Error('Refusing non-film overlay: '+rel);
  const target=path.join(source,rel),before=fs.existsSync(target)?fileSHA256(target):null,hash=fileSHA256(from);
  if(before===hash)return;fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(from,target);overlay[rel]={freeze:before,f3:hash,reason};
}
// Film-owned modules (flat folder).
for(const name of fs.readdirSync(path.join(root,'src/film')).sort())put('src/film/'+name,path.join(root,'src/film',name),'film-owned');
const track=JSON.parse(fs.readFileSync(path.join(source,'src/film/callout-track.json'),'utf8'));
if(track.source?.freezeSHA256SUMS!==FREEZE.sumsSHA256)throw new Error('Pinned callout track was not solved on M2b');
// Final copy, verified against the contract.
for(const [rel,hash]of Object.entries(COPY)){if(fileSHA256(path.join(root,rel))!==hash)throw new Error('Live copy differs from the F3 contract: '+rel);put(rel,path.join(root,rel),'final copy (F3 contract hash)');}
// M2b-baked pool fields from the accepted spotlight candidate.
const directory=fs.readFileSync(path.join(source,'src/film/emphasis-fields.js'),'utf8').match(/POOL_FIELD_DIRECTORY='([^']+)'/)[1];
let poolFields=null;
if(directory!=='film-emphasis-m2b/')throw new Error('F3 film must read film-emphasis-m2b/ pool fields');
{
  if(!poolFrom)throw new Error('--pool-from <accepted M2b spotlight candidate> required');
  const candidate=JSON.parse(fs.readFileSync(path.join(poolFrom,'candidate-source.json'),'utf8')),from=path.join(poolFrom,'source/public',directory);
  if(candidate.freezeSHA256SUMS!==FREEZE.sumsSHA256||fileSHA256(path.join(from,'manifest.json'))!==candidate.addedPoolFields.manifestSHA256)throw new Error('Pool fields are not the accepted M2b bake');
  for(const name of fs.readdirSync(from).sort())put('public/'+directory+name,path.join(from,name),'M2b-baked pool fields');
  poolFields={directory,manifestSHA256:candidate.addedPoolFields.manifestSHA256,from:path.relative(root,poolFrom)};
}
// Every non-overlay file must still equal the freeze.
const files={};(function walk(folder){for(const e of fs.readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(folder,e.name);if(e.isDirectory())walk(p);else files[path.relative(source,p).replaceAll('\\','/')]=fileSHA256(p);}})(source);
for(const [rel,hash]of sums)if(!overlay[rel]&&files[rel]!==hash)throw new Error('World/model file differs from M2b: '+rel);
const extra=Object.keys(files).filter(rel=>!sums.has(rel)&&!overlay[rel]);if(extra.length)throw new Error('Unlisted files: '+extra.join(', '));
const endCardContract={copyId:END_CARD.copyId,sourcesUrl:END_CARD.sourcesUrl,copySHA256:COPY['reference/film-callouts.json']};
const sceneContract={freezeSHA256SUMS:FREEZE.sumsSHA256,worldFiles:Object.fromEntries([...sums].filter(([rel])=>!overlay[rel])),poolFields,calloutTrackSHA256:files['src/film/callout-track.json']};
const record={film:'F3',freeze:{...FREEZE,verified:true},overlay,overlayCount:Object.keys(overlay).length,copy:COPY,poolFields,
  endCardContract,endCardContractSHA256:sha(JSON.stringify(endCardContract)),sceneContractSHA256:sha(JSON.stringify(sceneContract)),
  backend:'m1',files,sha256:sha(JSON.stringify(files)),note:'World/model files are byte-identical to the M2b freeze; overlay lists every other file.'};
fs.writeFileSync(path.join(out,'source-inputs.json'),JSON.stringify(record,null,2)+'\n');
const r=spawnSync(process.execPath,[path.join(__dirname,'snapshot.cjs'),'--source',source,'--out',out,'--frozen-source','--description','F3: pinned M2b world + film overlay, pre-run build'],{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);
console.log(JSON.stringify({out,overlay:Object.fromEntries(Object.entries(overlay).map(([k,v])=>[k,v.f3.slice(0,12)])),sourceSHA256:record.sha256,endCardContractSHA256:record.endCardContractSHA256,sceneContractSHA256:record.sceneContractSHA256}));
