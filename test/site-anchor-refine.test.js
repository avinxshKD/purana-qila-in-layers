import test from 'node:test';
import assert from 'node:assert/strict';
import {runRefinement} from '../src/site/anchor-refine.js';
import {createDeferredOcclusion} from '../src/site/marker-occlusion.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('a superseded or aborted refinement never falls back to a synchronous exact apply',async()=>{
  for(const [result,error] of [[null,null],[{exact:1},null],[null,new Error('stopped')]]){
    const controller=new AbortController(),refine=async()=>{controller.abort();if(error)throw error;return result;};
    assert.equal((await runRefinement({refine,signal:controller.signal,isCurrent:()=>true})).outcome,'superseded');
    const live=new AbortController(),later=async()=>{if(error)throw error;return result;};
    assert.equal((await runRefinement({refine:later,signal:live.signal,isCurrent:()=>false})).outcome,'superseded');
  }
});
test('a current refinement commits its anchors, and falls back only when it produced none',async()=>{
  const signal=new AbortController().signal,isCurrent=()=>true;
  assert.deepEqual(await runRefinement({refine:async()=>({exact:1}),signal,isCurrent}),{outcome:'commit',refined:{exact:1}});
  assert.equal((await runRefinement({refine:async()=>null,signal,isCurrent})).outcome,'fallback');
  const failed=await runRefinement({refine:async()=>{throw new Error('worker gone');},signal,isCurrent});assert.equal(failed.outcome,'fallback');assert.equal(failed.failure.message,'worker gone');
});
test('dot visibility is previewed before the silhouette, and a stale preview is dropped',async()=>{
  const events=[];let release;
  const work=createDeferredOcclusion({query:async(valid,preview)=>{preview('visible');await new Promise(r=>release=r);return 'layout';},preview:value=>events.push('preview:'+value),commit:value=>events.push('commit:'+value)});
  work.update();await flush();assert.deepEqual(events,['preview:visible']);release();await flush();assert.deepEqual(events,['preview:visible','commit:layout']);
  events.length=0;let blocked=false;
  const stale=createDeferredOcclusion({blocked:()=>blocked,query:async(valid,preview)=>{blocked=true;preview('old');return 'old';},preview:value=>events.push('preview:'+value),commit:value=>events.push('commit:'+value)});
  stale.update();await flush();assert.deepEqual(events,[]);
});
