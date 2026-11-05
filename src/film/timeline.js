import {END_CARD} from './end-card.js';
export const FPS = 30;
export const BAR_FRAMES = 60;
export const BEAT_FRAMES = 15;
export const SECTION_FRAMES = [0,120,240,360,480,600,720,840,960,1080,1200,1320,1440,1500,1560,1620,1800];
export const SECTION_IDS = ['cold-open','rewind','pre-mauryan','mauryan','sunga','kushan','gupta','post-gupta','rajput','sultanate','mughal','modern-fill','excavation-2013-14','excavation-2017-18','excavation-2022-23','end-card'];
export const YEAR_RANGES = [[-539,-322],[-322,-199],[-199,1],[1,200],[200,400],[400,600],[600,1200],[1200,1500],[1600,1800],null];
export const CALLOUT_IDS = [['pre-pgw','pre-soil'],['maur-rings','maur-drain'],['sunga-wall','sunga-patches'],['kushan-rooms','kushan-brick'],['gupta-floors','gupta-wall'],['post-ns','post-ew'],['rajput-width','rajput-holes'],['sultanate-corner','sultanate-floor'],['mughal-porcelain','mughal-glass'],['modern-1948','modern-1955']];
export const CAPTION_IDS = ['dig-2014-pgw','dig-2017-pgw','dig-2023-structures'];
export const PEEL_TIMES = [4.5,4.8,5.45,6,6.45,6.83,7.15,7.43,7.66,7.85,8];
export const REWIND_GAP_TIME = 4+4*Math.acos(1-2*(2023-1600)/(2023+539-100))/Math.PI;
export const clamp = x => Math.max(0,Math.min(1,x));
export const easeOut = x => 1-(1-clamp(x))**3;
export const smooth = x => { const t=clamp(x); return t*t*t*(10+t*(-15+6*t)); };
const lerp = (a,b,p) => a+(b-a)*p;
export const fade = (time,start,end,duration=.2) => clamp((time-start)/duration)*clamp((end+duration-time)/duration);

export function filmState(inputSeconds) {
  if (!Number.isFinite(inputSeconds)) throw new TypeError('Finite film seconds required');
  const seconds=Math.max(0,Math.min(60,inputSeconds)), frame=seconds*FPS;
  const nextBoundary=SECTION_FRAMES.findIndex((end,i)=>i>0&&frame<end);
  const sectionIndex=nextBoundary<0?15:nextBoundary-1;
  const startFrame=SECTION_FRAMES[sectionIndex],endFrame=SECTION_FRAMES[sectionIndex+1],local=(frame-startFrame)/FPS;
  const eraIndex=sectionIndex>=2&&sectionIndex<=11?sectionIndex-2:null;
  const deposits=Array(10).fill(0),features=Array(10).fill(0);
  let excavation=0,year=null;
  const rewind={progress:clamp((seconds-4)/4),refillProgress:clamp((seconds-4)/.5),peelProgress:clamp((seconds-4.5)/3.5)};
  let depositRise=0,featureRise=0;
  if(sectionIndex===0) {deposits.fill(1);features.fill(1);excavation=1;year=2023;}
  else if(sectionIndex===1) {
    excavation=1-smooth(rewind.refillProgress);
    for(let i=0;i<10;i++) {const n=9-i,p=1-smooth((seconds-PEEL_TIMES[n])/(PEEL_TIMES[n+1]-PEEL_TIMES[n]));deposits[i]=p;features[i]=p;}
    const compressedYear=2023-(2023+539-100)*(1-Math.cos(Math.PI*rewind.progress))/2;
    year=compressedYear<=1600?compressedYear-100:compressedYear;
  } else if(eraIndex!==null) {
    depositRise=easeOut(local/1.5);
    featureRise=Math.min(4,Math.max(0,Math.floor((local+1e-10)/.5)))/4;
    for(let i=0;i<10;i++){deposits[i]=i<eraIndex?1:i===eraIndex?depositRise:0;features[i]=i<eraIndex?1:i===eraIndex?featureRise:0;}
    const range=YEAR_RANGES[eraIndex];year=range?lerp(...range,local/4):null;
  } else {deposits.fill(1);features.fill(1);}
  const seasonIndex=sectionIndex>=12&&sectionIndex<=14?sectionIndex-12:null;
  const cutStep=seasonIndex===null?(sectionIndex===15?12:0):seasonIndex*4+Math.min(4,Math.floor((local+1e-10)/.5)+1);
  if(seasonIndex!==null) {excavation=cutStep/12;const start=[2013,2017,2022][seasonIndex];year=start+local/2;}
  if(sectionIndex===15)excavation=1;
  const crossfade=clamp(local/.25);
  const titles=sectionIndex===1?[]:[{sectionIndex,opacity:sectionIndex===0?1:crossfade}];
  if(sectionIndex>0&&sectionIndex!==2&&crossfade<1)titles.unshift({sectionIndex:sectionIndex-1,opacity:1-crossfade});
  const callouts=eraIndex===null?[]:CALLOUT_IDS[eraIndex].map((id,slot)=>({id,sectionIndex,slot,opacity:fade(local,1+slot*.5,3.6),placeholderAnchor:true}));
  const caption=seasonIndex===null?null:{id:CAPTION_IDS[seasonIndex],sectionIndex,opacity:fade(local,.25,1.6),leaderLine:false};
  return {seconds,frame,bar:Math.min(30,Math.floor(frame/60)+1),beat:Math.floor(frame%60/15)+1,
    section:{index:sectionIndex,id:SECTION_IDS[sectionIndex],startFrame,endFrame,progress:clamp((frame-startFrame)/(endFrame-startFrame))},
    eraIndex,depositRise,featureRise,rewind,dig:{seasonIndex,progress:seasonIndex===null?0:clamp(local/2),cutStep},
    marker:{year:sectionIndex===11&&crossfade<1?1800:year,opacity:sectionIndex===15?0:sectionIndex===11?1-crossfade:sectionIndex===12?crossfade:1,gapJump:frame===1200||Math.abs(seconds-REWIND_GAP_TIME)<1e-9},
    scene:{schemaVersion:1,eraIndex,deposits,features,excavation},
    overlays:{titles,callouts,caption,endCard:{opacity:sectionIndex===15?crossfade:0,copyId:'end-b'}}};
}

export function pictureEvents() {
  const events=[];
  const add=(type,seconds,data={})=>events.push({type,frame:seconds*FPS,timeSeconds:seconds,...data});
  SECTION_FRAMES.slice(0,-1).forEach((frame,sectionIndex)=>add('section-start',frame/FPS,{sectionIndex,id:SECTION_IDS[sectionIndex]}));
  for(let bar=0;bar<30;bar++)add('bar-line',bar*2,{bar:bar+1});
  for(let i=0;i<10;i++){
    const t=8+i*4;add('era-switch',t,{eraIndex:i});add('deposit-rise-start',t,{eraIndex:i});add('deposit-rise-end',t+1.5,{eraIndex:i});
    for(let course=1;course<=4;course++)add('feature-course-step',t+course*.5,{eraIndex:i,course,progress:course/4,provisionalCourseCount:true});
    CALLOUT_IDS[i].forEach((id,slot)=>{
      const data={id,eraIndex:i,slot,placeholderAnchor:true,...(id==='kushan-brick'?{copyVariant:'fallback'}:{})};
      add('callout-in',t+1+slot*.5,data);add('callout-in-complete',t+1.2+slot*.5,data);add('callout-out',t+3.6,data);add('callout-out-complete',t+3.8,data);
    });
  }
  for(let season=0;season<3;season++) {
    const t=48+season*2,data={id:CAPTION_IDS[season],seasonIndex:season,leaderLine:false};
    for(let beat=0;beat<4;beat++)add('cut-step',t+beat*.5,{seasonIndex:season,cutStep:season*4+beat+1,schematicNotSeasonGeometry:true});
    add('caption-in',t+.25,data);add('caption-in-complete',t+.45,data);add('caption-out',t+1.6,data);add('caption-out-complete',t+1.8,data);
  }
  add('refill-start',4);add('refill-complete',4.5);
  for(let i=0;i<10;i++){add('rewind-peel-start',PEEL_TIMES[i],{eraIndex:9-i});add('rewind-peel-end',PEEL_TIMES[i+1],{eraIndex:9-i});}
  add('marker-gap-jump',40,{fromYear:1500,toYear:1600});
  add('marker-gap-jump',REWIND_GAP_TIME,{fromYear:1600,toYear:1500,direction:'rewind',subframe:true});
  add('marker-fade-out',44,{durationFrames:7.5});add('marker-fade-in',48,{year:2013,durationFrames:7.5});
  add('end-card-in',54,{copyId:END_CARD.copyId,sourcesUrl:END_CARD.sourcesUrl,reconstructionLegendOmitted:true});
  return events.sort((a,b)=>a.frame-b.frame||a.type.localeCompare(b.type));
}
