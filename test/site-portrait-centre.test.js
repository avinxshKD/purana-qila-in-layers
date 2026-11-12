import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {solveSiteFraming,createReference,rowsWithBar,screenBounds,HUD_CLEARANCE,FRAMING_SAFETY} from '../src/site/framing.js';
import {scaleLabelBlock} from '../src/site/poster.js';
import {calloutMetrics} from '../src/site/callouts.js';
const layout=JSON.parse(fs.readFileSync(new URL('../src/site/poster-layout.json',import.meta.url))),shipped=JSON.parse(fs.readFileSync(new URL('../src/site/framing-reference.json',import.meta.url)));
const raster={rows:shipped.rows,cell:shipped.cell,width:shipped.width,height:shipped.height};
// Phone HUD as site.css lays it out at 100% text (measured on the built page at 412 px wide): header to y 124, the
// worst-case state panel ending 130 px above the bottom (two title lines down to scale 0.85, one at 0.8), the
// timeline and composite note at the bottom.
const hudFor=(width,height)=>scale=>{const era=scale>.8?185.6:142.7;return [
  {id:'site-title',rect:{x:20,y:18,width:width-40,height:39}},{id:'tagline',rect:{x:20,y:60,width:width-40,height:26}},{id:'nav',rect:{x:20,y:96,width:230,height:28}},
  {id:'era-panel',rect:{x:20,y:height-130-era,width:width-40,height:era}},{id:'timeline',rect:{x:20,y:height-122,width:width-40,height:54}},{id:'subtitle',rect:{x:20,y:height-60,width:width-40,height:34}}];};
// The block itself, without the scale-label pad (which reaches past its left side at a small k).
const block=createReference(raster);
function solve(width,height){
  const labels=scaleLabelBlock(layout.reference.scaleLabels,width,height);
  return solveSiteFraming({width,height,hudFor:hudFor(width,height),metrics:calloutMetrics(width,height),referenceFor:k=>createReference({...raster,rows:rowsWithBar(raster,layout.reference.barBox,labels,k)})}).framing;
}
const range=(a,b,step)=>{const out=[];for(let v=a;v<=b;v+=step)out.push(v);return out;};
test('every portrait phone size centres the block horizontally within 2 px, band or fallback, HUD clearances kept',()=>{
  const modes={};
  for(const width of [...range(360,428,4),430])for(const height of range(640,940,10)){
    const f=solve(width,height),at=`${width}x${height}`;
    assert.equal(f.feasible,true,at);modes[f.mode]=(modes[f.mode]||0)+1;
    const b=screenBounds(block,f.k,f.centre),dx=b.x+b.width/2-width/2;
    assert.ok(Math.abs(dx)<=2,`${at} ${f.mode} off centre by ${dx.toFixed(1)} px`);
    assert.ok(f.bounds.x>=16-1e-6&&f.bounds.x+f.bounds.width<=width-16+1e-6,`${at} framed box inside the side margins`);
    for(const c of f.clearances)assert.ok(c.clearance>=HUD_CLEARANCE+FRAMING_SAFETY-1e-6,`${at} ${c.id} ${c.clearance}`);
    if(f.mode==='general')assert.equal(f.titleScale,1,`${at} fallback keeps the full title`);
  }
  // The sweep must reach both paths, or it does not test the fallback.
  assert.ok(modes['portrait-band']>0&&modes.general>0,JSON.stringify(modes));
});
