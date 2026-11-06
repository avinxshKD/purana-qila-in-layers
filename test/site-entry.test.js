import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('site scale bar is the look stage scale bar',async()=>{
  const {SCALE_BAR}=await import('../src/site/scale-bar.js'),stage=await import('../src/look-stage.js');
  assert.equal(SCALE_BAR,stage.SCALE_BAR);
});

const NATIVE=/(?:^|\/)(?:museum-scene|seating|excavation|soil-block|site-state)\.js$/;
function staticGraph(entry,seen=new Set()){
  if(seen.has(entry))return seen;seen.add(entry);
  const source=readFileSync(entry,'utf8');
  for(const m of source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]/gm)){
    const next=new URL(m[1],entry);
    if(next.pathname.endsWith('.js'))staticGraph(next,seen);
  }
  return seen;
}

test('site static module graph does not reach the native world modules',()=>{
  const graph=[...staticGraph(new URL('../src/site/main.js',import.meta.url)),...staticGraph(new URL('../src/site/scene.js',import.meta.url))];
  const native=graph.map(url=>url.pathname).filter(path=>NATIVE.test(path));
  assert.deepEqual(native,[]);
});
