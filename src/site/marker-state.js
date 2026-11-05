// Shared by worker eligibility and the sanity report, not inferred from CSS.
export function markerStatus({anchor,featureOpacity=0,projected,workerVisible}){
  if(featureOpacity<=.03||anchor?.revealed===false)return{reason:'unrevealed',detail:'Era/feature reveal has not reached this marker',eligible:false};
  if(!anchor)return{reason:'missing-native-anchor',detail:'Provider did not return an anchor record',eligible:false};
  if(anchor.visible===false)return{reason:'occluded',detail:'Native exposure/anchor table marks the feature hidden by soil or cuts',eligible:false};
  if(!anchor.point?.length||!projected)return{reason:'missing-native-anchor',detail:'Visible native anchor has no finite point',eligible:false};
  if(Math.abs(projected.x)>.95||Math.abs(projected.y)>.95||Math.abs(projected.z)>1)return{reason:'off-screen',detail:'Native anchor lies outside the marker viewport margin',eligible:false};
  if(workerVisible===undefined)return{reason:'pending-occlusion',detail:'Awaiting current-state worker ray result',eligible:true};
  return workerVisible?{reason:'visible',detail:'Revealed, exposed, in-frame and worker ray clear',eligible:true}:{reason:'occluded',detail:'Current-state CPU-displaced worker ray is blocked',eligible:true};
}
