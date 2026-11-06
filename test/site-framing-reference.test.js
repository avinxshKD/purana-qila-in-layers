import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {shippedReference,rowsEqual,silhouetteDisplacement} from '../src/site/framing-reference.js';
import {createReference,REFERENCE_SIZE} from '../src/site/framing.js';
import {siteHeroPose} from '../src/site/camera.js';

const shipped=JSON.parse(readFileSync(new URL('../src/site/framing-reference.json',import.meta.url),'utf8'));
const square={cell:4,width:40,height:40,rows:Array.from({length:10},(_,y)=>y>=2&&y<8?[[8,32]]:[])};
const framed=(raster,k,x,y)=>({raster,reference:createReference(raster),framing:{k,centre:{x,y}}});

test('framed silhouette displacement is zero for identical framings and tracks a shift or a raster change',()=>{
  assert.equal(silhouetteDisplacement(framed(square,1,100,100),framed(square,1,100,100)),0);
  assert.ok(Math.abs(silhouetteDisplacement(framed(square,.5,100,100),framed(square,.5,100.3,100))-.3)<1e-9);
  const wider={...square,rows:square.rows.map((runs,y)=>y===5?[[8,36]]:runs)};
  assert.equal(rowsEqual(square,wider),false);assert.ok(silhouetteDisplacement(framed(square,1,0,0),framed(wider,1,0,0))>=4-1e-9);
});

test('a shipped reference is used only for the camera it was made for',()=>{
  const record={key:'a',...square};
  assert.ok(rowsEqual(shippedReference('a',record),square));assert.equal(shippedReference('b',record),null);assert.equal(shippedReference('a',{key:null}),null);
});

test('the shipped framing reference matches the hero pose and reference raster size',{skip:!shipped.rows&&'no shipped reference yet'},()=>{
  const key=JSON.parse(shipped.key),hero=siteHeroPose();
  assert.deepEqual({width:key.width,height:key.height,cell:key.cell},{width:REFERENCE_SIZE.width,height:REFERENCE_SIZE.height,cell:REFERENCE_SIZE.cell});
  key.position.forEach((value,i)=>assert.ok(Math.abs(value-hero.position[i])<1e-5,`position ${i}`));
  assert.doesNotThrow(()=>createReference(shipped));
});

// Recomputes the reference live in the dev site and compares framed silhouettes at both design viewports.
const enabled=process.env.STRATA_ALLOW_GPU==='1';
test('shipped framing reference stays within 0.5 px of a live raster at 1440x900 and 390x844',{skip:!enabled,timeout:900000},async()=>{
  const require=createRequire(import.meta.url),{withGpu}=require('../scripts/gpu-lock.cjs'),{serve,launch}=require('../scripts/browser.cjs');
  assert.ok(shipped.rows,'no shipped reference');const server=await serve({port:0});
  try{
    await withGpu('site:framing-reference-test',async()=>{
      const browser=await launch();
      try{
        for(const [width,height] of [[1440,900],[390,844]]){
          const page=await browser.newPage();page.setDefaultTimeout(300000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
          await page.setViewport({width,height,deviceScaleFactor:1});await page.goto(`${server.url}/site.html`);
          await page.waitForFunction(()=>window.strataSite?.ready&&window.strataSite.metadata());
          const result=await page.evaluate(()=>window.strataSite.verifyFraming().then(({liveRecord,...rest})=>rest));
          assert.deepEqual(errors,[]);assert.equal(result.source,'shipped');assert.ok(result.displacementPx<=.5,`${width}x${height}: ${result.displacementPx} px`);await page.close();
        }
      }finally{await browser.close();}
    });
  }finally{await server.close();}
});
