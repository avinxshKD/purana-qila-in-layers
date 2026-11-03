import {MIN_YEAR,MAX_YEAR,EXCAVATION_STOPS,normalizeYear} from '../film/scene-year.js';
export function scrubberGeometry(width){
  if(!Number.isFinite(width)||width<=112)throw new RangeError('Track width must exceed 112 CSS pixels');
  const excavationWidth=Math.max(96,Math.min(160,width*.12)),breakWidth=16,mainWidth=width-breakWidth-excavationWidth;
  return {width,mainWidth,breakWidth,excavationWidth,excavationStart:mainWidth+breakWidth};
}
const bound=(value,min,max)=>Math.max(min,Math.min(max,value));
export function yearToX(input,width){
  const g=scrubberGeometry(width),year=bound(input,MIN_YEAR,MAX_YEAR);
  if(year<2013)return (year-MIN_YEAR)/(2013-MIN_YEAR)*g.mainWidth;
  for(let i=0;i<3;i++)if(year<=EXCAVATION_STOPS[i+1]){
    const fraction=(year-EXCAVATION_STOPS[i])/(EXCAVATION_STOPS[i+1]-EXCAVATION_STOPS[i]);
    return g.excavationStart+g.excavationWidth*(i+fraction)/3;
  }
  return width;
}
export function xToYear(input,width){
  const g=scrubberGeometry(width),x=bound(input,0,width);
  if(x<g.mainWidth)return MIN_YEAR+x/g.mainWidth*(2013-MIN_YEAR);
  if(x<g.excavationStart)return 2013;
  const segment=bound((x-g.excavationStart)/g.excavationWidth*3,0,3),index=Math.min(2,Math.floor(segment));
  return EXCAVATION_STOPS[index]+(segment-index)*(EXCAVATION_STOPS[index+1]-EXCAVATION_STOPS[index]);
}
export function snappedYearAtX(input,width){
  const g=scrubberGeometry(width);
  if(input<g.mainWidth)return normalizeYear(Math.round(xToYear(input,width)));
  const stop=bound(Math.round((input-g.excavationStart)/g.excavationWidth*3),0,3);
  return EXCAVATION_STOPS[stop];
}
