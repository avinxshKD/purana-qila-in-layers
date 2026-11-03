import test from 'node:test';
import assert from 'node:assert/strict';
import {warmExcavationStates,createTaskMonitor,warmStateStub,selectWarmBackend} from '../src/site/tasks.js';
test('M1 method availability alone does not enable warming on the A3 stand-in',()=>{
  const old=selectWarmBackend({eraBlock:null,warmState(){throw new Error('warmState needs soil: eras');}});
  assert.equal(old.backend,'stub');assert.equal(old.warmState({}),0);
  const world={eraBlock:{},duration:3,warmState(){return {totalMs:this.duration};}},actual=selectWarmBackend(world);
  assert.equal(actual.backend,'scene-kit');assert.deepEqual(actual.warmState({}),{totalMs:3});
});
test('M1 structured backend duration is recorded',async()=>{
  const callbacks=[],promise=warmExcavationStates(()=>({totalMs:3.5}),{idle:callback=>callbacks.push(callback)});
  for(let index=0;index<4;index++)callbacks.shift()();
  assert.ok((await promise).every(report=>report.backendDurationMs===3.5));
});
test('M1 warmState stub accepts geometry state without changing it and returns zero ms',()=>{
  const state={schemaVersion:1,deposits:Array(10).fill(1),features:Array(10).fill(1),excavation:1},before=structuredClone(state);
  assert.equal(warmStateStub(state),0);assert.deepEqual(state,before);
});
test('four excavation states warm in four separate idle callbacks',async()=>{
  const callbacks=[],states=[],monitor=createTaskMonitor();let time=0;
  const promise=warmExcavationStates(state=>{states.push(state);time+=states.length===2?51:10;},{idle:callback=>callbacks.push(callback),clock:()=>time,onTask:monitor.record});
  for(let index=0;index<4;index++){assert.equal(callbacks.length,1);callbacks.shift()();assert.equal(states.length,index+1);}
  const reports=await promise;assert.equal(callbacks.length,0);
  assert.deepEqual(states.map(state=>state.excavation),[0,1/3,2/3,1]);
  assert.deepEqual(reports.map(report=>report.cutStep),[0,4,8,12]);
  assert.equal(monitor.report().longTasksOver50ms.length,1);assert.equal(monitor.report().longTasksOver50ms[0].durationMs,51);monitor.dispose();
});
