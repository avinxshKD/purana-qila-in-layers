import {EXCAVATION_STOPS,sceneForYear} from '../film/scene-year.js';
export const warmStateStub=_sceneState=>0;
export function selectWarmBackend(world){
  return world.eraBlock&&typeof world.warmState==='function'?{backend:'scene-kit',warmState:world.warmState.bind(world)}:{backend:'stub',warmState:warmStateStub};
}
export function warmExcavationStates(warmState,{
  idle=callback=>globalThis.requestIdleCallback?requestIdleCallback(callback,{timeout:2000}):setTimeout(callback,0),
  clock=()=>performance.now(),onTask=()=>{}
}={}){
  return new Promise((resolve,reject)=>{
    const reports=[];let index=0;
    function next(){
      idle(()=>{
        const year=EXCAVATION_STOPS[index],start=clock();
        try{
          const result=warmState(sceneForYear(year)),backendDurationMs=typeof result==='number'?result:result?.totalMs;
          const report={name:'excavation-warm',year,cutStep:index*4,startTimeMs:start,durationMs:clock()-start,...(Number.isFinite(backendDurationMs)?{backendDurationMs}:{})};
          reports.push(report);onTask(report);index++;
          if(index<EXCAVATION_STOPS.length)next();else resolve(reports);
        }catch(error){reject(error);}
      });
    }
    next();
  });
}
export function createTaskMonitor(){
  const tasks=[],longTasks=[];
  const record=task=>{tasks.push(task);if(task.durationMs>50)longTasks.push(task);};
  let observer;
  if(globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')){
    observer=new PerformanceObserver(list=>list.getEntries().forEach(entry=>record({name:entry.name,source:'browser-longtask',startTimeMs:entry.startTime,durationMs:entry.duration})));
    observer.observe({type:'longtask',buffered:true});
  }
  return {record,report:()=>({tasks:[...tasks],longTasksOver50ms:[...longTasks]}),dispose:()=>observer?.disconnect()};
}
