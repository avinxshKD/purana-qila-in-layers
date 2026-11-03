'use strict';
async function installStartupTrace(page){
  await page.evaluateOnNewDocument(()=>{
    const events=[];
    function mark(name,data={}){
      const event={name,ms:performance.now(),...data};events.push(event);
      console.log('[startup]',event.ms.toFixed(3),name,JSON.stringify(data));
    }
    window.__filmStartup={events};mark('document-start');
    const load=document.fonts.load.bind(document.fonts);let firstFont=true;
    document.fonts.load=(...args)=>{
      if(firstFont){mark('script-first-observable-operation/font-initialization');firstFont=false;}
      mark('font-load-start',{font:args[0]});
      return load(...args).then(result=>{mark('font-load-end',{font:args[0]});return result;});
    };
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      if(type==='webgl2')mark('scene-build-start/renderer-context-start');
      const value=getContext.call(this,type,...args);
      if(type==='webgl2')mark('renderer-context-end');
      return value;
    };
    Object.defineProperty(window,'strataFilm',{configurable:true,enumerable:true,set(value){
      mark('scene-and-film-setup-end/API-assigned');
      Object.defineProperty(window,'strataFilm',{value,configurable:true,enumerable:true,writable:true});
    }});
    for(const name of ['compileShader','linkProgram','getProgramParameter']){
      const method=WebGL2RenderingContext.prototype[name];let index=0;
      WebGL2RenderingContext.prototype[name]=function(...args){
        const id=index++,start=performance.now();mark(name+'-start',{id});
        const value=method.apply(this,args);mark(name+'-end',{id,durationMs:performance.now()-start});return value;
      };
    }
    let firstDraw=true;
    for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
      const method=WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name]=function(...args){
        const first=firstDraw;firstDraw=false;if(first)mark('first-render/draw-submission-start',{method:name});
        const value=method.apply(this,args);if(first)mark('first-draw-submission-end');return value;
      };
    }
  });
}
async function readStartupTrace(page){
  return page.evaluate(()=>{
    const resources=performance.getEntriesByType('resource').map(entry=>({path:new URL(entry.name).pathname,startMs:entry.startTime,responseEndMs:entry.responseEnd,durationMs:entry.duration}));
    for(const resource of resources)console.log('[startup]',resource.responseEndMs.toFixed(3),'asset-fetch-end',resource.path);
    return {timeOrigin:performance.timeOrigin,readyObservedMs:performance.now(),resources,events:window.__filmStartup?.events||[],note:'Scene-build start is the renderer-context boundary; setup end includes stand-in and overlay construction. Ready-observed follows the initial render submission; GPU completion may be deferred.'};
  });
}
module.exports={installStartupTrace,readStartupTrace};
