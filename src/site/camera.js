export function siteHeroPose(mobile=false){
  const azimuth=35*Math.PI/180,elevation=27*Math.PI/180,distance=mobile?104:74,target=[-1.4,-3.85,0];
  return {target,distance,position:[target[0]+distance*Math.cos(elevation)*Math.sin(azimuth),target[1]+distance*Math.sin(elevation),target[2]+distance*Math.cos(elevation)*Math.cos(azimuth)]};
}
