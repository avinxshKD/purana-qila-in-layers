import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const {servePinned}=createRequire(import.meta.url)('../scripts/film/static-server.cjs');
test('frozen server returns its own HTML/JS/fonts without Vite',{timeout:10000},async()=>{
  const server=await servePinned({folder:path.resolve('output/film/f1-a3/snapshot'),port:0});
  try{
    const html=await fetch(server.url+'/film.html');assert.equal(html.status,200);assert.match(html.headers.get('content-type'),/text\/html/);
    const body=await html.text(),script=body.match(/src="\.\/([^"]+\.js)"/)[1];
    const js=await fetch(server.url+'/'+script);assert.equal(js.status,200);assert.match(js.headers.get('content-type'),/javascript/);
    assert.equal((await fetch(server.url+'/fonts/Inter-SemiBold.woff2')).status,200);
    assert.equal((await fetch(server.url+'/src/museum-scene.js')).status,404);
  }finally{await server.close();}
});
test('frozen site stylesheets have the CSS MIME type',{timeout:10000},async()=>{
  const server=await servePinned({folder:path.resolve('src/site'),port:0});
  try{const css=await fetch(server.url+'/site.css');assert.equal(css.status,200);assert.match(css.headers.get('content-type'),/^text\/css/);}
  finally{await server.close();}
});
