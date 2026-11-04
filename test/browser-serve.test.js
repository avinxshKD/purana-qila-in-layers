import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{serve}=require('../scripts/browser.cjs');
test('browser serve keeps fixed-port URL/close compatibility and adds the actual ephemeral port',{timeout:30000},async()=>{
  const ephemeral=await serve({port:0});
  let port;
  try{
    port=ephemeral.port;assert.ok(port>0);assert.equal(ephemeral.url,`http://127.0.0.1:${port}`);assert.equal(typeof ephemeral.close,'function');
    assert.deepEqual(Object.keys(ephemeral).sort(),['close','port','url']);
    const response=await fetch(ephemeral.url+'/site.html');assert.equal(response.status,200);
  }finally{await ephemeral.close();}
  const fixed=await serve({port});
  try{assert.equal(fixed.port,port);assert.equal(fixed.url,`http://127.0.0.1:${port}`);assert.equal(typeof fixed.close,'function');}
  finally{await fixed.close();}
});
