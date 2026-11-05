// Film callout look at site scale: film sizes are defined at 1920x1080 and scale with the frame.
import {placeCallouts,labelCandidates,compatibleCallouts,evaluateCallout,labelGap} from '../film/layout.js';
import {scaleRectDistance,scaleLineDistance} from '../film/hud.js';
export function calloutMetrics(width,height){
  const scale=Math.min(width/1920,height/1080),cap=Math.max(12,32*scale),ratio=cap/32;
  return {scale,cap,lineHeight:46*ratio,wrapWidth:Math.max(150,340*ratio),margin:Math.max(16,48*scale),haloPixels:1,dotRadius:3};
}
// Labels keep their anchor-relative offset: during an orbit they ride with their dot,
// and after it settles the same offset is kept while it still passes every gate.
const endpoint=(p,r)=>({x:Math.max(r.x,Math.min(r.x+r.width,p.x)),y:Math.max(r.y,Math.min(r.y+r.height,p.y))});
export function holdCallouts(items,previous){
  return items.filter(item=>item.anchor&&previous?.has(item.featureId)).map(item=>{
    const o=previous.get(item.featureId),rect={x:item.anchor.x+o.dx,y:item.anchor.y+o.dy,width:item.boxWidth,height:item.boxHeight},end=endpoint(item.anchor,rect);
    return {...item,rect,end,length:Math.hypot(item.anchor.x-end.x,item.anchor.y-end.y),held:true};
  });
}
export const offsetsOf=placed=>new Map(placed.map(p=>[p.featureId,{dx:p.rect.x-p.anchor.x,dy:p.rect.y-p.anchor.y}]));
// Film layout keeps labels 8px from protected text; site HUD text (titles, era panel) needs 24px,
// so HUD rects are grown by the difference before they reach the film gates.
export const HUD_LABEL_CLEARANCE=24,FILM_TEXT_CLEARANCE=8;
export const inflateRect=(r,d)=>({x:r.x-d,y:r.y-d,width:r.width+2*d,height:r.height+2*d});
// items: [{id,featureId,lines,boxWidth,boxHeight,ascent,lineHeight,anchor:{x,y}}]
// scaleZones: the bar's screen polygon (labels and leaders keep 24px, the film's scale gate).
// scaleLabels: [{rect,em,lineGap}] kept at least 24px and the label-gap distance from every callout label.
export function layoutCallouts({era=[],extra=null,silhouette,protectedRects:hudRects=[],scaleZones=[],scaleLabels=[],width,height,margin,previous=null}){
  const eraItems=era.filter(item=>item.anchor),all=[...eraItems,...(extra?.anchor&&!eraItems.some(i=>i.featureId===extra.featureId)?[extra]:[])];
  const scaleGap=s=>Math.max(HUD_LABEL_CLEARANCE,...all.map(item=>labelGap(item,s)));
  const protectedRects=[...hudRects.map(r=>inflateRect(r,HUD_LABEL_CLEARANCE-FILM_TEXT_CLEARANCE)),...scaleLabels.map(s=>inflateRect(s.rect,scaleGap(s)-FILM_TEXT_CLEARANCE))];
  const viewport={width,height,margin,maxLabelBottom:height-margin,rectScaleDistance:r=>scaleRectDistance(r,scaleZones),lineScaleDistance:(a,b)=>scaleLineDistance(a,b,scaleZones)};
  if(previous&&all.length&&all.every(item=>previous.has(item.featureId))){
    const held=holdCallouts(all,previous).map(p=>evaluateCallout(p,p.rect,silhouette,protectedRects,viewport));
    if(held.every(p=>!p.reason)&&held.every((p,i)=>held.slice(i+1).every(q=>compatibleCallouts(p,q))))return {placed:held.map(p=>({...p,held:true})),failures:[]};
  }
  const result=eraItems.length?placeCallouts(eraItems,silhouette,protectedRects,viewport):{placed:[],failures:[]};
  let placed=result.placed,failures=[...result.failures];
  // If the pair cannot coexist, keep the shorter feasible one rather than none.
  if(!placed.length&&eraItems.length===2){
    const singles=eraItems.map(item=>placeCallouts([item],silhouette,protectedRects,viewport).placed[0]).filter(Boolean).sort((a,b)=>a.length-b.length);
    if(singles.length){placed=[singles[0]];failures=failures.map(f=>({...f,reason:f.reason+'; kept shortest single'}));}
  }
  let extraPlaced=null;
  if(extra?.anchor&&!placed.some(p=>p.featureId===extra.featureId)){
    const obstacles=[...protectedRects,...placed.map(p=>p.rect)];
    extraPlaced=labelCandidates(extra,silhouette,obstacles,viewport).find(candidate=>placed.every(p=>compatibleCallouts(candidate,p)))||null;
    if(!extraPlaced)failures.push({id:extra.id,reason:'Hover/focus label has no clear straight-leader position'});
  }
  return {placed:extraPlaced?[...placed,extraPlaced]:placed,failures};
}
// No pair of leaders may cross; every label rect must clear the outline.
export function auditCallouts(placed,silhouette,clearance=24){
  const crossings=[];for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++)if(!compatibleCallouts(placed[i],placed[j]))crossings.push([placed[i].id,placed[j].id]);
  const clearances=placed.map(p=>({id:p.id,clearance:silhouette.distanceRect(p.rect)}));
  return {crossings,clearances,minimumClearance:clearances.length?Math.min(...clearances.map(c=>c.clearance)):null,passes:!crossings.length&&clearances.every(c=>c.clearance>=clearance)};
}
