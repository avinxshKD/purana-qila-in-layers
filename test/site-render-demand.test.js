import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemandScheduler,createInteractionResolution,cappedPixelRatio,MAX_PIXEL_RATIO} from '../src/site/render-demand.js';
function clock(){
  let time=0,id=0;const tasks=new Map();
  return {setTimer(callback,delay){const key=++id;tasks.set(key,{at:time+delay,callback});return key;},clearTimer:key=>tasks.delete(key),
    advance(delta){const end=time+delta;for(;;){const entry=[...tasks].filter(([,task])=>task.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!entry)break;time=entry[1].at;tasks.delete(entry[0]);entry[1].callback();}time=end;}};
}
test('on-demand scheduler coalesces invalidations and submits zero idle frames',()=>{
  let id=0,draws=0;const callbacks=new Map(),scheduler=createDemandScheduler(()=>draws++,{request:callback=>{callbacks.set(++id,callback);return id;},cancel:key=>callbacks.delete(key)});
  for(let i=0;i<5;i++)scheduler.invalidate();assert.equal(callbacks.size,1);
  const first=[...callbacks][0];callbacks.delete(first[0]);first[1](16.7);
  assert.equal(draws,1);assert.equal(callbacks.size,0);assert.equal(scheduler.metadata().pendingFrame,false);
  assert.equal(draws-1,0,'No timer or free-running RAF submits idle frames');
});
test('camera/state continuation runs only until settled and pause prevents background GL work',()=>{
  let id=0,draws=0;const callbacks=new Map();
  const scheduler=createDemandScheduler(()=>{draws++;if(draws<3)scheduler.invalidate();},{request:callback=>{callbacks.set(++id,callback);return id;},cancel:key=>callbacks.delete(key)});
  scheduler.invalidate();while(callbacks.size){const [key,callback]=[...callbacks][0];callbacks.delete(key);callback(draws*16.7);}
  assert.equal(draws,3);scheduler.pause();scheduler.invalidate();assert.equal(callbacks.size,0);scheduler.resume();assert.equal(callbacks.size,1);
  scheduler.pause();assert.equal(callbacks.size,0);
});
test('DPR above 1 renders at ratio 1 while interacting, then full quality after 150 ms; DPR1 stays full',()=>{
  for(const full of [1,1.5,2]){
    const timers=clock(),low=Math.min(full,1);let changes=0;const resolution=createInteractionResolution(()=>changes++,timers);
    assert.equal(resolution.ratio(full),full);resolution.begin('orbit');assert.equal(resolution.ratio(full),low);
    timers.advance(1000);assert.equal(resolution.ratio(full),low);
    resolution.end('orbit');timers.advance(149);assert.equal(resolution.ratio(full),low);
    timers.advance(1);assert.equal(resolution.ratio(full),full);assert.equal(changes,2);assert.equal(resolution.inputActive(),false);
  }
});
test('device pixel ratio is capped at 2 before the interaction ratio',()=>{
  assert.equal(MAX_PIXEL_RATIO,2);assert.equal(cappedPixelRatio(3),2);assert.equal(cappedPixelRatio(2.625),2);assert.equal(cappedPixelRatio(1.5),1.5);assert.equal(cappedPixelRatio(undefined),1);assert.equal(cappedPixelRatio(0),1);
  const timers=clock(),resolution=createInteractionResolution(()=>{},timers);assert.equal(resolution.ratio(cappedPixelRatio(3)),2);resolution.begin('orbit');assert.equal(resolution.ratio(cappedPixelRatio(3)),1);
});
test('benchmark interaction ratios apply at any DPR and reset to the default',()=>{
  const timers=clock(),resolution=createInteractionResolution(()=>{},timers);resolution.begin('benchmark');
  resolution.setInteractionRatio(.55);assert.equal(resolution.ratio(1),.55);assert.equal(resolution.ratio(2),.55);
  resolution.setInteractionRatio(.75);assert.equal(resolution.ratio(1),.75);assert.equal(resolution.ratio(2),.75);
  resolution.setInteractionRatio(undefined);assert.equal(resolution.ratio(1),1);assert.equal(resolution.ratio(2),1);
  assert.equal(resolution.isActive('benchmark'),true);resolution.end('benchmark',0);assert.equal(resolution.isActive('benchmark'),false);
});
test('scrub/key/wheel pulses extend restoration and overlapping gestures cannot restore early',()=>{
  const timers=clock(),resolution=createInteractionResolution(()=>{},timers);
  resolution.pulse();assert.equal(resolution.inputActive(),false);timers.advance(100);resolution.pulse();timers.advance(149);assert.equal(resolution.ratio(2),1);timers.advance(1);assert.equal(resolution.ratio(2),2);
  resolution.begin('scrub');resolution.begin('orbit');resolution.end('orbit');assert.equal(resolution.inputActive(),true);timers.advance(500);assert.equal(resolution.ratio(2),1);
  resolution.end('scrub');timers.advance(150);assert.equal(resolution.ratio(2),2);
});
