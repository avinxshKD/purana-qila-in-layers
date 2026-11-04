'use strict';
// Capture-only instrumentation. Reads the default framebuffer at the end of
// its rendering task, before a non-preserved drawing buffer can be discarded.
function installCanvasReadback(){
  window.__siteCanvasReadback=true;let queued=false,framebuffer=null,programId=0;
  const proto=WebGL2RenderingContext.prototype,bind=proto.bindFramebuffer,location=proto.getUniformLocation,matrix=proto.uniformMatrix4fv,programs=new WeakMap(),locations=new WeakMap(),matrices={};
  proto.bindFramebuffer=function(target,value){if(target===this.FRAMEBUFFER||target===this.DRAW_FRAMEBUFFER)framebuffer=value;return bind.call(this,target,value);};
  proto.getUniformLocation=function(program,name){const result=location.call(this,program,name);if(!programs.has(program))programs.set(program,++programId);if(result)locations.set(result,programs.get(program)+':'+name);return result;};
  proto.uniformMatrix4fv=function(target,transpose,value,...rest){const key=locations.get(target);if(key&&['projectionMatrix','viewMatrix','modelViewMatrix'].some(name=>key.endsWith(':'+name)))matrices[key]=Array.from(value);return matrix.call(this,target,transpose,value,...rest);};
  for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
    const original=proto[name];proto[name]=function(...args){
      const result=original.apply(this,args);
      if(!window.__siteCanvasReadback||framebuffer!==null||queued)return result;queued=true;const gl=this;
      queueMicrotask(()=>{
        queued=false;if(!window.__siteCanvasReadback||gl.getParameter(gl.FRAMEBUFFER_BINDING)!==null)return;
        const width=gl.drawingBufferWidth,height=gl.drawingBufferHeight,rgba=new Uint8Array(width*height*4);
        gl.readPixels(0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
        window.__siteLastReadback={width,height,rgba,state:{viewport:Array.from(gl.getParameter(gl.VIEWPORT)),samples:gl.getParameter(gl.SAMPLES),dither:gl.isEnabled(gl.DITHER),
          scissor:gl.isEnabled(gl.SCISSOR_TEST),sampleCoverage:gl.isEnabled(gl.SAMPLE_COVERAGE),alphaToCoverage:gl.isEnabled(gl.SAMPLE_ALPHA_TO_COVERAGE),colorMask:Array.from(gl.getParameter(gl.COLOR_WRITEMASK)),
          depthFunction:gl.getParameter(gl.DEPTH_FUNC),attributes:gl.getContextAttributes(),colorSpace:gl.drawingBufferColorSpace},matrices:structuredClone(matrices)};
      });return result;
    };
  }
}
function packCanvasReadback(){
  const result=window.__siteLastReadback;if(!result)throw new Error('No canvas readback');
  let binary='';for(let i=0;i<result.rgba.length;i+=32768)binary+=String.fromCharCode(...result.rgba.subarray(i,i+32768));
  return {...result,rgba:btoa(binary)};
}
function topDownRGBA(result){
  const bottomUp=Buffer.from(result.rgba,'base64'),rgba=Buffer.alloc(bottomUp.length),stride=result.width*4;
  for(let y=0;y<result.height;y++)bottomUp.copy(rgba,y*stride,(result.height-y-1)*stride,(result.height-y)*stride);
  return rgba;
}
module.exports={installCanvasReadback,packCanvasReadback,topDownRGBA};
