// Screen-space geometry shared by drawing, the frame report and CPU tests.
export const LABEL_CLEARANCE=24,MAX_LEADER=400,MIN_LABEL_GAP=8,LABEL_GAP_EM=1,LABEL_GAP_LINE_GAPS=2;
// Two labels must read as two: their ink boxes stay at least 1 em of the label font
// apart and at least twice either label's internal line gap (ink to ink between lines).
export function labelGap(a,b){return Math.max(MIN_LABEL_GAP,LABEL_GAP_EM*Math.max(a.em||0,b.em||0),LABEL_GAP_LINE_GAPS*Math.max(a.lineGap||0,b.lineGap||0));}
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export const rectPoints=r=>[{x:r.x,y:r.y},{x:r.x+r.width,y:r.y},{x:r.x+r.width,y:r.y+r.height},{x:r.x,y:r.y+r.height}];
export function convexHull(points){
  const p=[...points].sort((a,b)=>a.x-b.x||a.y-b.y),half=values=>{const h=[];for(const v of values){while(h.length>1&&cross(h.at(-2),h.at(-1),v)<=0)h.pop();h.push(v);}return h;};
  if(p.length<3)return p;return [...half(p).slice(0,-1),...half(p.reverse()).slice(0,-1)];
}
export function pointSegmentDistance(p,a,b){
  const dx=b.x-a.x,dy=b.y-a.y,n=dx*dx+dy*dy,t=n?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/n)):0;
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function segmentsCross(a,b,c,d){
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);
  if(x*y<0&&z*w<0)return true;
  return Math.min(pointSegmentDistance(a,c,d),pointSegmentDistance(b,c,d),pointSegmentDistance(c,a,b),pointSegmentDistance(d,a,b))<1e-6;
}
export function inside(p,poly){
  let result=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)result=!result;}return result;
}
export function polygonDistance(a,b){
  if(!a.length||!b.length)return Infinity;
  if(inside(a[0],b)||inside(b[0],a))return 0;
  let distance=Infinity;
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
    const p=a[i],q=a[(i+1)%a.length],r=b[j],s=b[(j+1)%b.length];
    if(segmentsCross(p,q,r,s))return 0;
    distance=Math.min(distance,pointSegmentDistance(p,r,s),pointSegmentDistance(q,r,s),pointSegmentDistance(r,p,q),pointSegmentDistance(s,p,q));
  }return distance;
}
export const rectDistance=(r,poly)=>polygonDistance(rectPoints(r),poly);
export function lineHitsRect(a,b,rect){
  const p=rectPoints(rect);return inside(a,p)||inside(b,p)||p.some((c,i)=>segmentsCross(a,b,c,p[(i+1)%4]));
}
const endpoint=(p,r)=>({x:Math.max(r.x,Math.min(r.x+r.width,p.x)),y:Math.max(r.y,Math.min(r.y+r.height,p.y))});
export function labelCandidates(item,hull,obstacles,{width=1920,height=1080,margin=48,maxLabelBottom=height-margin,rectScaleDistance=()=>Infinity,lineScaleDistance=()=>Infinity}={}){
  const {anchor,boxWidth:boxW,boxHeight:boxH}=item;if(!anchor)return [];
  const distance=(rect,limit)=>hull.distanceRect?hull.distanceRect(rect,limit):rectDistance(rect,hull);
  const bottom=Math.min(height-margin,maxLabelBottom);
  const values=new Set([anchor.y-boxH/2,anchor.y,anchor.y-boxH,bottom-boxH,Math.min(bottom-boxH,Math.max(margin,anchor.y-boxH/2))]);
  for(let y=margin;y<=height-margin-boxH;y+=12)values.add(y);
  for(const r of obstacles){values.add(r.y-boxH-8);values.add(r.y+r.height+8);}
  const candidates=[];
  function add(y,side){
    if(y<margin||y+boxH>bottom)return;
    let lo=margin,hi=width-margin-boxW;
    if(side==='left')hi=Math.min(hi,anchor.x-boxW);else lo=Math.max(lo,anchor.x);
    if(hi<lo)return;
    const box=x=>({x,y,width:boxW,height:boxH});
    const clear=x=>distance(box(x),LABEL_CLEARANCE+.01)>=LABEL_CLEARANCE+.01;
    if(!clear(side==='left'?lo:hi))return;
    for(let n=0;n<13;n++){const mid=(lo+hi)/2,valid=clear(mid);if(side==='left'?valid:!valid)lo=mid;else hi=mid;}
    const rect=box(side==='left'?lo:hi),end=endpoint(anchor,rect),length=Math.hypot(anchor.x-end.x,anchor.y-end.y);
    const labelScale=rectScaleDistance(rect),leaderScale=lineScaleDistance(end,anchor)-1.5;
    if(length>MAX_LEADER||labelScale<LABEL_CLEARANCE||leaderScale<LABEL_CLEARANCE||obstacles.some(r=>polygonDistance(rectPoints(rect),rectPoints(r))<8||lineHitsRect(end,anchor,r)))return;
    candidates.push({...item,rect,end,length,clearance:distance(rect),scaleLabelClearance:labelScale,scaleLeaderClearance:leaderScale,labelBottom:y+boxH,maxLabelBottom:bottom});
  }
  for(const y of values)for(const side of ['left','right'])add(y,side);
  const order=(a,b)=>a.length-b.length||Math.abs(a.rect.y+boxH/2-anchor.y)-Math.abs(b.rect.y+boxH/2-anchor.y)||a.rect.x-b.rect.x;
  candidates.sort(order);
  const coarse=candidates.slice(0,64);
  // Refine the shortest positions to one-pixel vertical resolution.
  for(const candidate of candidates.slice(0,4))for(let dy=-11;dy<=11;dy++)for(const side of ['left','right'])add(candidate.rect.y+dy,side);
  const sorted=candidates.sort(order);
  const unique=new Map();for(const c of [...coarse,...sorted.slice(0,48)])unique.set(c.rect.x.toFixed(1)+':'+c.rect.y.toFixed(1),c);
  return [...unique.values()].sort(order);
}
// Every single-callout gate labelCandidates applies, evaluated at a given label box.
// reason is null when the box is valid. Used to verify pinned callout tracks.
export function evaluateCallout(item,rect,hull,obstacles,{width=1920,height=1080,margin=48,maxLabelBottom=height-margin,rectScaleDistance=()=>Infinity,lineScaleDistance=()=>Infinity}={}){
  const {anchor}=item,bottom=Math.min(height-margin,maxLabelBottom),distance=r=>hull.distanceRect?hull.distanceRect(r):rectDistance(r,hull);
  const end=endpoint(anchor,rect),length=Math.hypot(anchor.x-end.x,anchor.y-end.y),clearance=distance(rect);
  const labelScale=rectScaleDistance(rect),leaderScale=lineScaleDistance(end,anchor)-1.5,eps=1e-9;
  let reason=null;
  if(rect.x<margin-eps||rect.x+rect.width>width-margin+eps||rect.y<margin-eps)reason='Label outside the 48px frame margin';
  else if(rect.y+rect.height>bottom+eps)reason='Label below the block';
  else if(clearance<LABEL_CLEARANCE+.01)reason='Label within 24px of the block';
  else if(length>MAX_LEADER)reason='Leader longer than 400px';
  else if(labelScale<LABEL_CLEARANCE||leaderScale<LABEL_CLEARANCE)reason='Label or leader within 24px of the scale bar';
  else if(obstacles.some(r=>polygonDistance(rectPoints(rect),rectPoints(r))<8))reason='Label within 8px of protected text';
  else if(obstacles.some(r=>lineHitsRect(end,anchor,r)))reason='Leader crosses protected text';
  return {...item,rect,end,length,clearance,scaleLabelClearance:labelScale,scaleLeaderClearance:leaderScale,labelBottom:rect.y+rect.height,maxLabelBottom:bottom,reason};
}
export function compatibleCallouts(a,b){
  return polygonDistance(rectPoints(a.rect),rectPoints(b.rect))>=labelGap(a,b)&&!segmentsCross(a.end,a.anchor,b.end,b.anchor)
    &&!lineHitsRect(a.end,a.anchor,b.rect)&&!lineHitsRect(b.end,b.anchor,a.rect)
    &&pointSegmentDistance(b.anchor,a.end,a.anchor)>5&&pointSegmentDistance(a.anchor,b.end,b.anchor)>5;
}
export function placeCallouts(items,hull,obstacles,viewport){
  const lists=items.map(item=>labelCandidates(item,hull,obstacles,viewport)),failures=[];
  for(let i=0;i<items.length;i++)if(!lists[i].length)failures.push({id:items[i].id,reason:items[i].anchor?'No label position satisfies frame,24px clearance, protected text and400px leader constraints':'Missing feature-surface anchor'});
  if(failures.length)return {placed:[],failures};
  if(items.length<2)return {placed:lists.map(list=>list[0]),failures};
  let best;
  for(const a of lists[0])for(const b of lists[1])if((!best||a.length+b.length<best[0].length+best[1].length)&&compatibleCallouts(a,b))best=[a,b];
  return best?{placed:best,failures}: {placed:[],failures:items.map(item=>({id:item.id,reason:'Individually feasible labels have no non-crossing two-callout arrangement'}))};
}
