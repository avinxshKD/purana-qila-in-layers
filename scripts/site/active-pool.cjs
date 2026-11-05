'use strict';
// Browser-serializable: passed to page.waitForFunction as source. The active fade
// converges to the marker's own reveal opacity (features[eraIndex]), not to 1.
function activePoolSettled(metadata,markers,id){
 const emphasis=metadata?.emphasis,entry=emphasis?.entries?.find(e=>e.id===id),marker=markers?.find(m=>m.featureId===id);
 if(!marker)return{ok:false,reason:'missing-marker'};
 if(!marker.visible)return{ok:false,reason:'marker-'+marker.reason};
 if(emphasis?.activeFeature!==id)return{ok:false,reason:'not-active'};
 if(!entry)return{ok:false,reason:'no-emphasis-slot'};
 if(!(entry.opacity>0))return{ok:false,reason:'fade-not-started'};
 if(Math.abs(entry.opacity-marker.featureOpacity)>1e-4)return{ok:false,reason:'fading',opacity:entry.opacity,target:marker.featureOpacity};
 if(!(emphasis.lights||[]).some(l=>l.intensity>0))return{ok:false,reason:'no-lit-pool'};
 return{ok:true,reason:'settled',opacity:entry.opacity,target:marker.featureOpacity};
}
const activePoolPredicate=id=>`(${activePoolSettled})(window.strataSite.metadata(),window.strataSite.markerReport(),${JSON.stringify(id)}).ok`;
module.exports={activePoolSettled,activePoolPredicate};
