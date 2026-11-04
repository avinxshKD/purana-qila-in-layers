import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'vite';
const require=createRequire(import.meta.url),puppeteer=require('puppeteer-core'),{root,executable}=require('../scripts/browser.cjs');
test('real browser worker builds/refits/raycasts with GPU disabled',{timeout:60000},async()=>{
  const server=await createServer({root,cacheDir:root+'/output/site/perf-r3-worker-vite-cache',server:{host:'127.0.0.1',port:0,strictPort:true,watch:null,hmr:false},logLevel:'warn'});
  let browser;
  try{
    await server.listen();browser=await puppeteer.launch({executablePath:executable(),headless:true,args:['--disable-gpu']});
    const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/site.html?dom-only`);await page.waitForFunction(()=>window.strataSite?.ready);
    const result=await page.evaluate(async()=>{
      const {createOcclusionClient}=await import('/src/site/marker-occlusion.js');
      const positions=new Float32Array([-1,-1,0,1,-1,0,0,1,0]),position={array:positions,count:3,version:0},geometry={attributes:{position},index:null,groups:[],drawRange:{start:0,count:Infinity}};
      const mesh={geometry,matrixWorld:{toArray:()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]},material:{side:2}};
      const client=createOcclusionClient();await client.prepare([mesh]);const rays=[{origin:[0,0,5],direction:[0,0,-1],far:4}],before=await client.query([mesh],rays);
      positions[2]=positions[5]=positions[8]=2;position.version++;await client.prepare([mesh]);const after=await client.query([mesh],rays),metadata=client.metadata();
      client.dispose();return {before,after,metadata,positions:[...positions]};
    });
    assert.deepEqual(result.before,[true]);assert.deepEqual(result.after,[false]);assert.equal(result.metadata.builds,1);assert.equal(result.metadata.refits,1);
    assert.match(result.metadata.thirdPartyLicense,/Copyright \(c\) 2018 Garrett Johnson/);assert.match(result.metadata.thirdPartyLicense,/MIT License/);
    assert.equal(result.positions.length,9);assert.equal(result.positions[2],2);
  }finally{if(browser)await browser.close();await server.close();}
});
