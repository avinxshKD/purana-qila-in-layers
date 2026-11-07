import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
// A synchronous exact apply of a year outside the anchor table can take seconds on the main thread, so the site
// only applies nearest anchors and gets exact ones through the async refinement (backend.commitAnchors).
const dir=new URL('../src/site/',import.meta.url);
const sources=fs.readdirSync(dir).filter(name=>name.endsWith('.js')&&name!=='backend.js').map(name=>({name,code:fs.readFileSync(new URL(name,dir),'utf8')}));
function calls(code,name){
  const found=[];let at=-1;
  while((at=code.indexOf(name+'(',at+1))>=0){let depth=0,end=at+name.length;for(;end<code.length;end++){if(code[end]==='(')depth++;else if(code[end]===')'&&--depth===0)break;}found.push(code.slice(at,end+1));}
  return found;
}
test('every site applyState call asks for nearest anchors',()=>{
  const applies=sources.flatMap(({name,code})=>calls(code,'applyState').map(call=>({name,call})));
  assert.ok(applies.length>=4,'the scan finds the scene applies');
  for(const {name,call} of applies)assert.match(call,/\{anchors:'nearest'\}\)$/,`${name}: ${call}`);
});
test('the site never uses the backend shortcuts that apply exact anchors',()=>{
  for(const {name,code} of sources)assert.doesNotMatch(code,/backend\.(setYear|setEra)\(|anchors:\s*'exact'/,name);
});
test('a failed refinement keeps nearest anchors instead of applying exact',()=>{
  const scene=sources.find(s=>s.name==='scene.js').code,fallback=scene.slice(scene.indexOf("if(outcome==='fallback')"),scene.indexOf("const from=new Map()"));
  assert.ok(fallback.length>0);assert.doesNotMatch(fallback,/applyState/);
});
test('camera input aborts a running refinement and frame() restarts it only at rest',()=>{
  const scene=sources.find(s=>s.name==='scene.js').code,start=scene.slice(scene.indexOf("listen(controls,'start'"));
  assert.match(start.slice(0,start.indexOf('\n')),/refineController\.abort\(\);refineController=null/);
  assert.match(scene,/if\(!moving&&!orbitMoving&&!resolution\.isActive\('orbit'\)&&!refineController&&backend\.anchorMode\(\)==='nearest'/);
});
