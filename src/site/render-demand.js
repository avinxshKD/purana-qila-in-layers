// Interaction caps the pixel ratio at 1 (absolute): DPR1 keeps full resolution, higher DPRs render at 1 until restored.
export const INTERACTION_PIXEL_RATIO=1,RESTORE_DELAY_MS=150;
// The drawing buffer never exceeds 2 device pixels per CSS pixel (memory profile); the tier world guards the same cap.
export const MAX_PIXEL_RATIO=2;
export const cappedPixelRatio=raw=>Math.min(Number.isFinite(raw)&&raw>0?raw:1,MAX_PIXEL_RATIO);
export function createDemandScheduler(frame,{request=callback=>requestAnimationFrame(callback),cancel=id=>cancelAnimationFrame(id)}={}){
  let handle=0,dirty=false,paused=false,running=false,frames=0;
  function queue(){if(!handle&&!paused&&!running&&dirty)handle=request(tick);}
  function tick(time){handle=0;if(paused)return;dirty=false;running=true;try{frame(time);frames++;}finally{running=false;queue();}}
  return {invalidate(){dirty=true;queue();},pause(){paused=true;if(handle)cancel(handle);handle=0;},resume(){paused=false;queue();},
    metadata:()=>({pendingFrame:!!handle,dirty,paused,frames})};
}
export function createInteractionResolution(onChange,{setTimer=(callback,delay)=>setTimeout(callback,delay),clearTimer=id=>clearTimeout(id),now=()=>performance.now(),interactionRatio=INTERACTION_PIXEL_RATIO,restoreDelay=RESTORE_DELAY_MS}={}){
  const active=new Set();let timer,low=false,lastInputEnd=null,lastRestored=null;const defaultRatio=interactionRatio;
  function clear(){if(timer!==undefined)clearTimer(timer);timer=undefined;}
  function change(value){if(low!==value){low=value;if(!value)lastRestored=now();onChange();}}
  function restore(delay=restoreDelay){clear();if(!active.size)timer=setTimer(()=>{timer=undefined;if(!active.size)change(false);},delay);}
  return {begin(source){active.add(source);lastRestored=null;clear();change(true);},end(source,delay){active.delete(source);if(!active.size)lastInputEnd=now();restore(delay);},
    pulse(){clear();lastInputEnd=now();lastRestored=null;change(true);restore();},
    ratio:full=>low?Math.min(full,interactionRatio):full,isActive:source=>active.has(source),inputActive:()=>active.size>0,
    // Benchmarks measure other interaction scales (such as 0.55); undefined restores the default.
    setInteractionRatio(value){interactionRatio=value===undefined?defaultRatio:value;if(low)onChange();},
    metadata:()=>({interacting:low,activeInputs:[...active],interactionPixelRatio:interactionRatio,restoreDelayMs:restoreDelay,lastRestorationDelayMs:lastInputEnd!==null&&lastRestored!==null?lastRestored-lastInputEnd:null})};
}
