import fs from 'node:fs';
import path from 'node:path';
const folder=path.resolve(import.meta.dirname,'../../output/lookdev/features',process.argv[2]??'k2e-cpu');
const a=JSON.parse(fs.readFileSync(path.join(folder,'control-before.json'),'utf8')),b=JSON.parse(fs.readFileSync(path.join(folder,'control-after.json'),'utf8'));
const controls=a.controls.map(old=>{
 const next=b.controls.find(p=>p.id===old.id),geometry=states=>states.map(s=>s.map(m=>({attributes:m.attributes,index:m.index,drawRange:m.drawRange}))),material=states=>states.map(s=>s.map(m=>({material:m.material,castShadow:m.castShadow,receiveShadow:m.receiveShadow})));
 return{id:old.id,identical:old.hash===next?.hash,before:old.hash,after:next?.hash,geometryIdentical:JSON.stringify(geometry(old.states))===JSON.stringify(geometry(next.states)),materialAndUniformsIdentical:JSON.stringify(material(old.states))===JSON.stringify(material(next.states))};
});
const report={method:'Independent Node processes. Before uses isolated reconstructed K2d modules; no production rollback. Hash all geometry attributes including positions/normals/colours/UVs, indices, draw ranges; material parameters, generated GLSL, procedural program keys, uniforms and any texture bytes. Default state plus actual battered sections for filled cuts.',controls,allIdentical:controls.every(p=>p.identical),changedRuntimeSourceFiles:Object.keys(b.sourceHashes).filter(k=>a.sourceHashes[k]!==b.sourceHashes[k]).map(k=>'src/features/'+k)};
fs.writeFileSync(path.join(folder,'control-hash-comparison.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify(report,null,2));
if(!report.allIdentical)process.exitCode=1;
