'use strict';
// Local projected scale at the central active-top anchor (0, activeY, 0).
// px/m means a metre in the camera image plane at the anchor's optical depth.
function cameraScale(pose,activeY,{height=1080,fov=25}={}){
  const forward=pose.target.map((v,i)=>v-pose.position[i]),length=Math.hypot(...forward);
  for(let i=0;i<3;i++)forward[i]/=length;
  const offset=[-pose.position[0],activeY-pose.position[1],-pose.position[2]];
  const depth=offset.reduce((sum,v,i)=>sum+v*forward[i],0),focalPixels=height/(2*Math.tan(fov*Math.PI/360));
  if(!(depth>0))throw new Error('Active-top anchor behind camera');
  const right=[-forward[2],0,forward[0]],rightLength=Math.hypot(...right);for(let i=0;i<3;i++)right[i]/=rightLength;
  const up=[right[1]*forward[2]-right[2]*forward[1],right[2]*forward[0]-right[0]*forward[2],right[0]*forward[1]-right[1]*forward[0]];
  const cy=offset.reduce((sum,v,i)=>sum+v*up[i],0);
  return {verticalFovDegrees:fov,activeTopWorldY:activeY,activeTopDepthMetres:depth,pixelsPerMetreAtActiveTop:focalPixels/depth,
    worldVerticalPixelsPerMetreAtActiveTop:Math.abs(focalPixels*((cy+.5*up[1])/(depth+.5*forward[1])-(cy-.5*up[1])/(depth-.5*forward[1])))};
}
module.exports={cameraScale};
