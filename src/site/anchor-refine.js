// One anchor refinement. A superseded run (a newer state, an abort, or a changed backend revision) never applies
// anything; only a run that is still current but produced no anchors falls back to a synchronous exact apply.
export async function runRefinement({refine,signal,isCurrent}){
  let refined=null,failure=null;
  try{refined=await refine({signal});}catch(error){failure=error;}
  if(signal.aborted||!isCurrent())return {outcome:'superseded',failure};
  return refined?{outcome:'commit',refined}:{outcome:'fallback',failure};
}
