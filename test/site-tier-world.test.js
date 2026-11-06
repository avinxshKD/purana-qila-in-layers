import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// The tier world replaces the native build, so it must not evaluate the modules that build the M1 kit.
const NATIVE=/(?:^|\/)(?:museum-scene|seating|excavation|soil-block|site-state)\.js$/;
function staticGraph(entry,seen=new Set()){
  if(seen.has(entry.href))return seen;seen.add(entry.href);
  const source=readFileSync(entry,'utf8');
  for(const m of source.matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]/gm)){
    const next=new URL(m[1],entry);
    if(next.pathname.endsWith('.js'))staticGraph(next,seen);
  }
  return seen;
}

test('site tier world static module graph does not reach the native world modules',()=>{
  const graph=[...staticGraph(new URL('../src/site-tier/world.js',import.meta.url))];
  assert.ok(graph.some(href=>href.endsWith('/src/site-tier/features.js')));
  assert.deepEqual(graph.filter(href=>NATIVE.test(new URL(href).pathname)),[]);
});
