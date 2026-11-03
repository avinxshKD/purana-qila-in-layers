import {createStandIn} from './stand-in.js';
export function createFilmBackend(world,mode){
  if(mode==='m1'){
    if(!world.eraBlock||typeof world.applyState!=='function')throw new Error('M1 needs the accepted era block and applyState API');
    return {mode,base:world.eraBlock.base,top:world.eraBlock.top,provisional:false,apply(state){
      const result=world.applyState(state.scene);
      if(!result.activeTopAnchor?.point)throw new Error('M1 did not return its active-top anchor');
      return {...result,activeTopY:result.activeTopAnchor.point[1],provisional:false};
    }};
  }
  if(mode!=='a3')throw new Error(`Unknown film backend ${mode}`);
  return {mode,...createStandIn(world),provisional:true};
}
