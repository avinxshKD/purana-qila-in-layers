import test from 'node:test';
import assert from 'node:assert/strict';
import {siteHeroPose} from '../src/site/camera.js';
test('site initializes the35degree hero, not the turntable arc-start angle',()=>{
  for(const mobile of [false,true]){
    const pose=siteHeroPose(mobile),delta=pose.position.map((value,i)=>value-pose.target[i]);
    assert.ok(Math.abs(Math.atan2(delta[0],delta[2])*180/Math.PI-35)<1e-10);
    assert.ok(Math.abs(Math.hypot(...delta)-(mobile?104:74))<1e-10);
    assert.ok(Math.abs(Math.asin(delta[1]/pose.distance)*180/Math.PI-27)<1e-10);
  }
});
