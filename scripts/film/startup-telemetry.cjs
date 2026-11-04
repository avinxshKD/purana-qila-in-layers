'use strict';
function installStartupTelemetry(){
  const trace=window.__siteStartup={programs:[],firstFrameEndMs:null,firstInteractiveFrameEndMs:null,inputAtMs:null,measuringInput:false},programs=new WeakMap(),shaders=new WeakMap(),proto=WebGL2RenderingContext.prototype;
  let framebuffer=null,currentProgram=null,queued=false;
  function wrap(name,callback){const original=proto[name];proto[name]=function(...args){return callback.call(this,original,args);};}
  wrap('createProgram',function(original,args){const program=original.apply(this,args),record={id:trace.programs.length+1,linkCallMs:0,linkStatusMs:0,otherProgramQueriesMs:0,firstUseMs:0,maxDrawCallMs:0,shaders:[]};programs.set(program,record);trace.programs.push(record);return program;});
  wrap('createShader',function(original,args){const shader=original.apply(this,args);shaders.set(shader,{type:args[0],compileCallMs:0,compileStatusMs:0});return shader;});
  wrap('shaderSource',function(original,args){const record=shaders.get(args[0]);if(record){record.sourceCharacters=args[1].length;record.name=/^#define SHADER_NAME (.*)$/m.exec(args[1])?.[1]||'unnamed';}return original.apply(this,args);});
  wrap('attachShader',function(original,args){const record=programs.get(args[0]);if(record)record.shaders.push(shaders.get(args[1]));return original.apply(this,args);});
  wrap('compileShader',function(original,args){const start=performance.now(),result=original.apply(this,args),record=shaders.get(args[0]);if(record)record.compileCallMs+=performance.now()-start;return result;});
  wrap('getShaderParameter',function(original,args){const start=performance.now(),result=original.apply(this,args),record=shaders.get(args[0]);if(record&&args[1]===this.COMPILE_STATUS)record.compileStatusMs+=performance.now()-start;return result;});
  wrap('linkProgram',function(original,args){const start=performance.now(),result=original.apply(this,args),record=programs.get(args[0]);if(record)record.linkCallMs+=performance.now()-start;return result;});
  wrap('getProgramParameter',function(original,args){const start=performance.now(),result=original.apply(this,args),record=programs.get(args[0]);if(record)record[args[1]===this.LINK_STATUS?'linkStatusMs':'otherProgramQueriesMs']+=performance.now()-start;return result;});
  wrap('useProgram',function(original,args){const start=performance.now(),result=original.apply(this,args);currentProgram=programs.get(args[0]);if(currentProgram&&!currentProgram.used){currentProgram.firstUseMs=performance.now()-start;currentProgram.used=true;}return result;});
  wrap('bindFramebuffer',function(original,args){if(args[0]===this.FRAMEBUFFER||args[0]===this.DRAW_FRAMEBUFFER)framebuffer=args[1];return original.apply(this,args);});
  for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced'])wrap(name,function(original,args){
    const start=performance.now(),result=original.apply(this,args);if(currentProgram)currentProgram.maxDrawCallMs=Math.max(currentProgram.maxDrawCallMs,performance.now()-start);
    if(framebuffer===null&&!queued){queued=true;queueMicrotask(()=>{queued=false;const time=performance.now();trace.firstFrameEndMs??=time;if(trace.inputAtMs!==null)trace.firstInteractiveFrameEndMs??=time;});}return result;
  });
  window.addEventListener('pointermove',event=>{if(trace.measuringInput&&event.buttons===1)trace.inputAtMs??=performance.now();},true);
}
module.exports={installStartupTelemetry};
