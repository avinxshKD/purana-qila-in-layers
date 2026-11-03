import { Color } from 'three';
export function labColour(L,a,b) {
  const fy=(L+16)/116, fx=fy+a/500, fz=fy-b/200;
  const inv=t=>t**3>.008856?t**3:(t-16/116)/7.787;
  const x=.95047*inv(fx),y=inv(fy),z=1.08883*inv(fz);
  return new Color().setRGB(Math.max(0,3.2404542*x-1.5371385*y-.4985314*z),
    Math.max(0,-.969266*x+1.8760108*y+.041556*z),
    Math.max(0,.0556434*x-.2040259*y+1.0572252*z));
}
export function rng(seed) {
  let a=typeof seed==='number'?seed>>>0:[...String(seed)].reduce((h,c)=>(Math.imul(h,16777619)^c.charCodeAt(0))>>>0,2166136261);
  return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
}
export const gaussian=r=>Math.sqrt(-2*Math.log(Math.max(1e-9,r())))*Math.cos(2*Math.PI*r());
export const SOIL_LAB=[44.88026250861551,.7239764217857325,13.403804353791205];
export function unitLab(material,r,dusty=null) {
  const l=Math.max(29,Math.min(66,48+7.5*gaussian(r)));
  if(['fired-brick','brickbat','terracotta'].includes(material)) {
    const coated=dusty??r()<.7;
    return coated?[SOIL_LAB[0]-.4+(r()-.5)*1.2,SOIL_LAB[1]+.25,SOIL_LAB[2]+.2]:
      [SOIL_LAB[0]-3.8+(r()-.5)*1.0,4.5+(r()-.5)*.5,14+(r()-.5)*.6];
  }
  if(material==='mudbrick'||material==='mud')return [SOIL_LAB[0]+.6+(r()-.5)*1.4,SOIL_LAB[1]+.15,SOIL_LAB[2]];
  if(material==='stone')return [SOIL_LAB[0]-1+(r()-.5)*4,1.1,12.2+(r()-.5)*.8];
  if(material==='lime') return [54+(r()-.5)*6,1.7,10];
  if(material==='burnt') return [33+(r()-.5)*10,2,7];
  if(material==='porcelain'||material==='china') return [73+(r()-.5)*7,.5,4];
  if(material==='glass') return [34+(r()-.5)*13,-10,12];
  if(material==='pgw') return [42+(r()-.5)*13,1,4];
  return [l,2.3+(r()-.5),13+(r()-.5)*3];
}
