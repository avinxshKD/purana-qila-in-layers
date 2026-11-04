'use strict';
// Capture-only. Distinguishes timer restoration from the first native-size
// frame's CPU submission. This is not GPU completion or physical presentation.
function installGestureTelemetry(){
  const trace={stopAt:null,frame:0,firstFullFrame:null,firstFullStart:null,firstFullSubmit:null};
  window.__siteGestureTrace=trace;
  function reset(stopAt){trace.stopAt=stopAt;trace.firstFullFrame=null;trace.firstFullStart=null;trace.firstFullSubmit=null;}
  window.addEventListener('pointerdown',()=>reset(null),true);
  window.addEventListener('pointerup',()=>reset(performance.now()),true);
  window.addEventListener('wheel',()=>reset(performance.now()),true);
  let framebuffer=null;
  const prototype=WebGL2RenderingContext.prototype,bind=prototype.bindFramebuffer,clear=prototype.clear;
  prototype.bindFramebuffer=function(target,value){if(target===this.FRAMEBUFFER||target===this.DRAW_FRAMEBUFFER)framebuffer=value;return bind.call(this,target,value);};
  prototype.clear=function(mask){
    if(framebuffer===null&&(mask&this.COLOR_BUFFER_BIT)){
      trace.frame++;
      const nativeSize=this.canvas.width===Math.round(this.canvas.clientWidth*devicePixelRatio)&&this.canvas.height===Math.round(this.canvas.clientHeight*devicePixelRatio);
      if(nativeSize&&trace.stopAt!==null&&trace.firstFullFrame===null){trace.firstFullFrame=trace.frame;trace.firstFullStart=performance.now();}
    }return clear.call(this,mask);
  };
  for(const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']){
    const original=prototype[name];prototype[name]=function(...args){
      const result=original.apply(this,args);
      if(framebuffer===null&&trace.firstFullFrame===trace.frame)trace.firstFullSubmit=performance.now();
      return result;
    };
  }
}
module.exports={installGestureTelemetry};
