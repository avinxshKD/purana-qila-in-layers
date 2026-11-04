import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const {installGestureTelemetry}=createRequire(import.meta.url)('../scripts/film/gesture-telemetry.cjs');
test('restore telemetry ignores low-res/shadow frames and timestamps the first full submission',()=>{
  let now=0;const events={};
  class FakeGL{
    constructor(){this.FRAMEBUFFER=1;this.DRAW_FRAMEBUFFER=2;this.COLOR_BUFFER_BIT=4;this.canvas={width:55,height:55,clientWidth:100,clientHeight:100};}
    bindFramebuffer(){}clear(){}drawArrays(){}drawElements(){}drawArraysInstanced(){}drawElementsInstanced(){}
  }
  const window={addEventListener:(type,callback)=>events[type]=callback},context=vm.createContext({window,WebGL2RenderingContext:FakeGL,performance:{now:()=>now},devicePixelRatio:2});
  vm.runInContext(`(${installGestureTelemetry.toString()})()`,context);const gl=new FakeGL();
  now=10;events.pointerup();now=30;gl.clear(4);gl.drawArrays();assert.equal(window.__siteGestureTrace.firstFullSubmit,null);
  gl.canvas.width=gl.canvas.height=200;gl.bindFramebuffer(1,{});now=50;gl.clear(4);gl.drawArrays();assert.equal(window.__siteGestureTrace.firstFullSubmit,null);
  gl.bindFramebuffer(1,null);now=170;gl.clear(4);now=171;gl.drawArrays();now=173;gl.drawElements();assert.equal(window.__siteGestureTrace.firstFullStart,170);assert.equal(window.__siteGestureTrace.firstFullSubmit,173);
  now=200;gl.clear(4);gl.drawElements();assert.equal(window.__siteGestureTrace.firstFullSubmit,173);
  events.pointerdown();assert.equal(window.__siteGestureTrace.stopAt,null);assert.equal(window.__siteGestureTrace.firstFullSubmit,null);
});
