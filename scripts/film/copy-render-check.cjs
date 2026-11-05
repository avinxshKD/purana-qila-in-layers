'use strict';
// CPU check: does a film-callouts.json edit change anything the film render path reads?
// Mirrors every read in src/film (overlays.js, main.js, emphasis-film.js) and diffs the full JSON.
const fs=require('node:fs'),path=require('node:path'),{root}=require('../browser.cjs'),{fileSHA256}=require('./f2-contract.cjs');
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
const oldFile=path.resolve(get('--old')),newFile=path.resolve(get('--new')),out=path.resolve(get('--out'));
if(fs.existsSync(out))throw new Error('Preserve existing copy check');
const metrics=args.includes('--frame-metrics')?JSON.parse(fs.readFileSync(path.resolve(get('--frame-metrics')))):null;
function renderInputs(copy,hasOutline){
 const record=i=>{const s=copy.sections[i];if(i===0)return{title:copy.coldOpenOptions[0].title,dates:''};if(i===15)return{title:'',dates:''};if(i>=2&&i<=10){const k=s.section.indexOf(', ');return{title:s.section.slice(0,k),dates:s.section.slice(k+2)};}return{title:s.section,dates:''};};
 return {titles:copy.sections.map((_,i)=>record(i)),
  captions:copy.sections.map(s=>s.callouts?.[0]?.label??null),
  callouts:copy.sections.map(s=>(s.callouts||[]).map(c=>({drawn:c.fallback?.label||c.label,featureId:c.featureId}))),
  timelineYears:copy.sections.slice(2,11).map(s=>{const r=s.section.split(', ')[1],n=Number(r.match(/^(\d+)/)[1]);return r.includes('BCE')?-n+1:n;}),
  endCard:copy.endCardOptions.find(c=>c.id==='end-b').lines.filter(l=>hasOutline||!l.startsWith('solid =')).map(l=>l.replace('[SITE URL]','[TBD]'))};
}
function diff(a,b,at='',rows=[]){if(JSON.stringify(a)===JSON.stringify(b))return rows;if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],at+(Array.isArray(a)?`[${k}]`:'.'+k),rows);}else rows.push({path:at,old:a,new:b});return rows;}
const oldCopy=JSON.parse(fs.readFileSync(oldFile)),newCopy=JSON.parse(fs.readFileSync(newFile));
const filmSources=['src/film/overlays.js','src/film/main.js','src/film/emphasis-film.js','src/film/timeline.js','src/film/camera.js'].map(f=>({file:f,text:fs.readFileSync(path.join(root,f),'utf8')}));
const changed=diff(oldCopy,newCopy),changedKeys=[...new Set(changed.map(r=>r.path.split('.').pop().replace(/\[\d+\]$/,'')))];
const keyReads=Object.fromEntries(changedKeys.map(k=>[k,filmSources.filter(s=>new RegExp('\\b'+k+'\\b').test(s.text)).map(s=>s.file)]));
const outlineFlags=metrics?[...new Set(metrics.map(f=>f.hasReconstructionOutline??f.overlayReport?.hasReconstructionOutline))]:null;
const result={old:{file:oldFile,sha256:fileSHA256(oldFile)},new:{file:newFile,sha256:fileSHA256(newFile)},changedPaths:changed,changedLeafKeys:changedKeys,filmSourceReadsOfChangedKeys:keyReads,
 renderInputsEqual:{withoutOutline:JSON.stringify(renderInputs(oldCopy,false))===JSON.stringify(renderInputs(newCopy,false)),withOutline:JSON.stringify(renderInputs(oldCopy,true))===JSON.stringify(renderInputs(newCopy,true))},
 endCard:{old:renderInputs(oldCopy,false).endCard,new:renderInputs(newCopy,false).endCard,oldRawLines:oldCopy.endCardOptions.find(c=>c.id==='end-b').lines,newRawLines:newCopy.endCardOptions.find(c=>c.id==='end-b').lines},
 f2HasReconstructionOutlineValues:outlineFlags,
 method:'Mirrors every film-callouts.json read in src/film; overlay layout/drawing is a pure function of these strings given unchanged code and fonts'};
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'copy-render-check.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({renderInputsEqual:result.renderInputsEqual,changedPaths:changed.map(r=>r.path),filmSourceReadsOfChangedKeys:keyReads,f2HasReconstructionOutlineValues:outlineFlags,endCard:result.endCard.new},null,1));
