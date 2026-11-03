import {YEAR_RANGES,clamp} from './timeline.js';
export const MIN_YEAR=-539,MAX_YEAR=2023;
export const EXCAVATION_STOPS=[2013,2014,2018,2023];
export const ERA_BOUNDARIES=[-539,-322,-199,1,200,400,600,1200,1500,1600,1800,...EXCAVATION_STOPS];
export function formatYear(value){
  if(!Number.isFinite(value))throw new TypeError('Finite astronomical year required');
  const year=Math.round(value);return year<=0?`${1-year} BCE`:`${year} CE`;
}
export function normalizeYear(input){
  if(!Number.isFinite(input))throw new TypeError('Finite astronomical year required');
  const year=Math.max(MIN_YEAR,Math.min(MAX_YEAR,input));
  if(year>=2013)return EXCAVATION_STOPS.reduce((nearest,stop)=>Math.abs(stop-year)<=Math.abs(nearest-year)?stop:nearest,2013);
  return year>1500&&year<1600?(year<1550?1500:1600):year;
}
export function stepYear(year,direction){
  const value=normalizeYear(year);
  return direction>0?(ERA_BOUNDARIES.find(boundary=>boundary>value)??MAX_YEAR):([...ERA_BOUNDARIES].reverse().find(boundary=>boundary<value)??MIN_YEAR);
}
export function sceneForYear(input){
  const year=normalizeYear(input),deposits=Array(10).fill(0),features=Array(10).fill(0);
  let eraIndex=0;
  for(let i=0;i<9;i++){
    const [start,end]=YEAR_RANGES[i],progress=clamp((year-start)/(end-start));
    deposits[i]=progress;features[i]=progress;if(year>=start)eraIndex=i;
  }
  // Shell-only interpolation between the last dated era and excavation.
  // These control endpoints are NOT a sourced modern-fill date range.
  deposits[9]=features[9]=clamp((year-1800)/(2013-1800));
  if(year>=1800)eraIndex=9;
  return {schemaVersion:1,eraIndex:year>=2013?null:eraIndex,deposits,features,excavation:year>=2013?EXCAVATION_STOPS.indexOf(year)/3:0};
}
export function sectionForYear(input){
  const year=normalizeYear(input);
  if(year>=2023)return 14;if(year>=2018)return 13;if(year>=2014)return 12;
  if(year>=1800)return 11;
  let era=0;YEAR_RANGES.slice(0,9).forEach(([start],i)=>{if(year>=start)era=i;});
  return era+2;
}
