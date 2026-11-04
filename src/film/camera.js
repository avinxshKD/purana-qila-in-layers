import {filmState,smooth} from './timeline.js';
const rad=Math.PI/180;
export function growthHeight(seconds,base,top) {
  const values=filmState(seconds).scene.deposits;
  return -base+1+(top+base-1)*values.reduce((a,b)=>a+b,0)/10;
}
export function cameraPose(seconds,base,top) {
  const u=smooth(seconds/60);
  const azimuth=35+13*u,elevation=27+2*u;
  const distance=74-1.5*smooth(seconds/4);
  // Compensate only for the orbit's rising elevation, not the growing deposit.
  // This retains the plinth margin while the active top rises naturally.
  const targetY=-3.85-.97*u,activeY=growthHeight(seconds,base,top);
  const target=[-1.4,targetY,0];
  const position=[target[0]+distance*Math.cos(elevation*rad)*Math.sin(azimuth*rad),
    target[1]+distance*Math.sin(elevation*rad),distance*Math.cos(elevation*rad)*Math.cos(azimuth*rad)];
  return {position,target,azimuthDegrees:azimuth,elevationDegrees:elevation,distanceMetres:distance,activeTopY:activeY};
}
export function applyCamera(camera,seconds,base,top) {
  const pose=cameraPose(seconds,base,top);
  camera.position.set(...pose.position);camera.lookAt(...pose.target);camera.updateMatrixWorld();
  return pose;
}
