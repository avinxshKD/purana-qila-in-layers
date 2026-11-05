import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{serve,launch}=require('../scripts/browser.cjs');
const PAGE='/__renderer-state-test.html';
// SwiftShader only: no GPU lock is needed and the result does not depend on the display adapter.
test('look-world render and mask passes hand the shared renderer back as they found it',{timeout:600000},async()=>{
  const server=await serve({port:0,middleware:(req,res,next)=>{if(req.url!==PAGE)return next();res.setHeader('Content-Type','text/html');res.end('<!doctype html><canvas></canvas>');}});
  let browser;
  try{
    browser=await launch({software:true});
    const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(300000);
    await page.goto(server.url+PAGE);
    const report=await page.evaluate(async()=>{
      const {createLookWorld}=await import('/src/museum-scene.js');
      const canvas=document.querySelector('canvas'),world=createLookWorld(canvas,{width:160,height:90,view:'turntable',soil:'eras'});
      const {renderer,scene}=world,backdrop=scene.background;
      const read=()=>({autoClear:renderer.autoClear,shadows:renderer.shadowMap.enabled,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,background:scene.background===backdrop?'backdrop':scene.background});
      // 1 = LinearToneMapping, 4 = ACESFilmicToneMapping (the world default).
      const states={site:{autoClear:true,shadows:true,toneMapping:4,exposure:1.2,background:'backdrop'},odd:{autoClear:false,shadows:false,toneMapping:1,exposure:.7,background:null}};
      const set=s=>{renderer.autoClear=s.autoClear;renderer.shadowMap.enabled=s.shadows;renderer.toneMapping=s.toneMapping;renderer.toneMappingExposure=s.exposure;scene.background=s.background==='backdrop'?backdrop:s.background;};
      const passes={render:()=>world.render(38,4),renderUnshadowed:()=>world.render(38,4,{shadows:false}),eraIds:()=>world.eraIds(),coverage:()=>world.coverage(),
        floorLuma:()=>world.floorLuma(),roleMask:()=>world.roleMask(),groupMask:()=>world.groupMask()};
      const results=[];
      for(const [name,run] of Object.entries(passes))for(const [label,state] of Object.entries(states)){set(state);run();results.push({name,label,expected:state,actual:read()});}
      return {results};
    });
    assert.deepEqual(errors,[]);
    for(const r of report.results)assert.deepEqual(r.actual,r.expected,`${r.name} from the ${r.label} state`);
    assert.equal(report.results.length,14);
  }finally{await browser?.close();await server.close();}
});
