import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{installStartupTelemetry}=require('../scripts/film/startup-telemetry.cjs');
test('cold-start telemetry separates link calls/status waits and records an actual input frame',()=>{
  let time=0;const queued=[],events={};
  class GL{
    createProgram(){return {};}createShader(){return {};}shaderSource(){}attachShader(){}
    compileShader(){time+=5;}getShaderParameter(){time+=2;return true;}linkProgram(){time+=20;}getProgramParameter(){time+=50;return true;}
    useProgram(){time+=3;}bindFramebuffer(){}drawArrays(){time+=7;}drawElements(){time+=7;}drawArraysInstanced(){time+=7;}drawElementsInstanced(){time+=7;}
  }
  Object.assign(GL.prototype,{COMPILE_STATUS:1,LINK_STATUS:2,FRAMEBUFFER:3,DRAW_FRAMEBUFFER:4});
  const window={addEventListener:(name,callback)=>events[name]=callback};
  vm.runInNewContext(`(${installStartupTelemetry.toString()})()`,{window,performance:{now:()=>time},WebGL2RenderingContext:GL,queueMicrotask:callback=>queued.push(callback)});
  const gl=new GL(),program=gl.createProgram(),shader=gl.createShader(1);
  gl.shaderSource(shader,'#define SHADER_NAME SoilSurface');gl.attachShader(program,shader);gl.compileShader(shader);gl.getShaderParameter(shader,1);gl.linkProgram(program);gl.getProgramParameter(program,2);gl.useProgram(program);
  gl.bindFramebuffer(3,{});gl.drawArrays();assert.equal(queued.length,0);
  gl.bindFramebuffer(3,null);gl.drawArrays();queued.shift()();assert.equal(window.__siteStartup.firstFrameEndMs,time);
  window.__siteStartup.measuringInput=true;events.pointermove({buttons:1});gl.drawElements();queued.shift()();
  const record=window.__siteStartup.programs[0];assert.equal(record.linkCallMs,20);assert.equal(record.linkStatusMs,50);assert.equal(record.shaders[0].compileCallMs,5);
  assert.equal(record.shaders[0].compileStatusMs,2);assert.equal(record.shaders[0].name,'SoilSurface');assert.equal(record.maxDrawCallMs,7);assert.ok(window.__siteStartup.firstInteractiveFrameEndMs>window.__siteStartup.inputAtMs);
});
