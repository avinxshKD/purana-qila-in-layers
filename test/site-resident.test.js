import test from 'node:test';
import assert from 'node:assert/strict';
import {createResidencyGate,NOTE_DELAY_MS} from '../src/site/resident.js';
import {sceneForYear} from '../src/film/scene-year.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness(){
  const resident=new Set(),fetches=[],notes=[],timers=[];let ready=0;
  const key=s=>JSON.stringify([s.deposits,s.features,s.excavation,s.eraIndex]);
  const gate=createResidencyGate({isResident:s=>resident.has(key(s)),
    ensureState:s=>new Promise((resolve,reject)=>fetches.push({key:key(s),resolve:()=>{resident.add(key(s));resolve();},reject})),
    onReady:()=>ready++,onNote:n=>notes.push(n),setTimer:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimer:id=>{timers[id-1].cleared=true;}});
  return {gate,resident,fetches,notes,timers,key,ready:()=>ready,fire(){for(const t of timers)if(!t.cleared&&!t.fired){t.fired=true;t.fn();}}};
}
test('resident states apply synchronously with no fetch or note',()=>{
  const h=harness(),s=sceneForYear(2023);h.resident.add(h.key(s));
  assert.equal(h.gate.check(s),true);assert.equal(h.fetches.length,0);assert.equal(h.timers.length,0);assert.deepEqual(h.notes,[]);
});
test('non-resident state is held, quiet note after the delay, then applied',async()=>{
  const h=harness(),s=sceneForYear(1951);
  assert.equal(h.gate.check(s),false);assert.equal(h.gate.check(s),false);await flush();
  assert.equal(h.fetches.length,1,'repeated frames share one request');assert.equal(h.timers[0].ms,NOTE_DELAY_MS);assert.deepEqual(h.notes,[]);
  h.fire();assert.deepEqual(h.notes,['loading']);
  h.fetches[0].resolve();await flush();
  assert.equal(h.ready(),1);assert.deepEqual(h.notes,['loading',null]);assert.equal(h.gate.check(s),true);
});
test('a fast load shows no note',async()=>{
  const h=harness(),s=sceneForYear(1951);h.gate.check(s);await flush();h.fetches[0].resolve();await flush();h.fire();
  assert.deepEqual(h.notes,[]);assert.equal(h.ready(),1);
});
test('rapid scrub: only the last request wins',async()=>{
  const h=harness(),a=sceneForYear(1951),b=sceneForYear(1970),c=sceneForYear(2013);
  h.gate.check(a);h.gate.check(b);h.gate.check(c);await flush();assert.equal(h.fetches.length,3);
  h.fetches[0].resolve();h.fetches[1].resolve();await flush();assert.equal(h.ready(),0,'stale loads never apply');
  assert.equal(h.gate.metadata().pending,true);
  h.fetches[2].resolve();await flush();assert.equal(h.ready(),1);assert.equal(h.gate.check(c),true);
  const stale=harness();stale.gate.check(a);await flush();stale.resident.add(stale.key(b));assert.equal(stale.gate.check(b),true);
  stale.fetches[0].resolve();await flush();assert.equal(stale.ready(),0,'a resident scrub supersedes the pending load');assert.equal(stale.gate.metadata().pending,false);
});
test('failure keeps the state, shows a retry note, never loops; retry and next scrub refetch',async()=>{
  const h=harness(),s=sceneForYear(1951),other=sceneForYear(1970);
  h.gate.check(s);await flush();const error=Object.assign(new Error('pack step-3 failed'),{pack:'step-3'});h.fetches[0].reject(error);await flush();
  assert.equal(h.ready(),0);assert.equal(h.notes.at(-1),'failed');assert.deepEqual(h.gate.metadata().failed,{pack:'step-3',message:'pack step-3 failed'});
  for(let i=0;i<5;i++)assert.equal(h.gate.check(s),false);await flush();assert.equal(h.fetches.length,1,'no automatic refetch');
  assert.equal(h.gate.retry(),true);assert.equal(h.ready(),1);assert.equal(h.gate.check(s),false);await flush();assert.equal(h.fetches.length,2);
  h.fetches[1].reject(error);await flush();assert.equal(h.notes.at(-1),'failed');
  assert.equal(h.gate.check(other),false);await flush();assert.equal(h.fetches.length,3,'a scrub to another state fetches again');
  h.fetches[2].resolve();await flush();assert.equal(h.gate.metadata().failed,null);assert.equal(h.ready(),2);
});
