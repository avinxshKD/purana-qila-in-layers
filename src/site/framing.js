// Fits the block into the space the HUD leaves free. The camera pose (orbit, distance)
// never changes: only camera.zoom and a pixel view offset, so the live image is an exact
// similarity of one reference raster: screen = centre + offset + k * (reference - referenceCentre).
import {silhouetteFromRows} from '../film/silhouette.js';
export const HUD_CLEARANCE=24,FRAMING_SAFETY=6,REFERENCE_SIZE=Object.freeze({width:2400,height:1200,cell:4});
export function rowsBounds(rows,cell){
  let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
  rows.forEach((runs,y)=>{if(!runs.length)return;y0=Math.min(y0,y*cell);y1=Math.max(y1,(y+1)*cell);for(const [l,r]of runs){x0=Math.min(x0,l);x1=Math.max(x1,r);}});
  return Number.isFinite(x0)?{x0,x1,y0,y1}:null;
}
export function createReference({rows,cell,width,height}){
  const outline=silhouetteFromRows(rows,{cell}),bounds=rowsBounds(rows,cell);if(!bounds)throw new Error('Empty framing silhouette');
  if(bounds.x0<=0||bounds.y0<=0||bounds.x1>=width||bounds.y1>=height)throw new Error('Framing reference clipped by its raster');
  return {outline,distanceRect:blockedDistance(rows,cell),bounds,width,height,centre:{x:width/2,y:height/2}};
}
// The same value as outline.distanceRect, faster for long queries: rows are grouped in bands of 8 and a band whose
// bounding box is already further than the best distance in x or in y is skipped (every run in it is at least as far,
// and a hypot is never below either leg, so the minimum is unchanged).
export function blockedDistance(rows,cell,band=8){
  const bands=[];
  for(let y0=0;y0<rows.length;y0+=band){let x0=Infinity,x1=-Infinity;const y1=Math.min(rows.length,y0+band);
    for(let y=y0;y<y1;y++)for(const [l,r]of rows[y]){x0=Math.min(x0,l);x1=Math.max(x1,r);}if(x0<=x1)bands.push({y0,y1,x0,x1});}
  return function distanceRect(rect,limit=Infinity){
    let result=limit;
    for(const b of bands){
      if(Math.max(b.y0*cell-rect.y-rect.height,rect.y-b.y1*cell)>result||Math.max(b.x0-rect.x-rect.width,rect.x-b.x1)>result)continue;
      for(let y=b.y0;y<b.y1;y++){
        const dy=Math.max(y*cell-rect.y-rect.height,rect.y-(y+1)*cell,0);if(dy>result)continue;
        for(const [left,right]of rows[y]){const dx=Math.max(left-rect.x-rect.width,rect.x-right,0);result=Math.min(result,Math.hypot(dx,dy));if(result===0)return 0;}
      }
    }return result;
  };
}
// The scale bar and its labels frame with the block: the bar's reference-space box, grown by the label block (CSS px,
// so divided by the framing scale k) below it and half a label either side. At a small k (phone landscape) that pad
// can reach past the raster; it is clamped one cell inside, as createReference rejects a clipped silhouette.
export function rowsWithBar({rows,cell,width},barBox,labels,k){
  const padY=(labels.gap+labels.cap+2)/k,padX=labels.halfWidth/k,out=rows.map(runs=>[...runs]);
  const x0=Math.max(cell,barBox.x0-padX),x1=Math.min(width-cell,barBox.x1+padX);
  for(let y=Math.max(0,Math.floor(barBox.y0/cell));y<=Math.min(out.length-2,Math.floor((barBox.y1+padY)/cell));y++)out[y].push([x0,x1]);
  return out;
}
const toReference=(reference,k,c,r)=>({x:(r.x-c.x)/k+reference.centre.x,y:(r.y-c.y)/k+reference.centre.y,width:r.width/k,height:r.height/k});
// Exact screen distance from a CSS rect to the scaled/translated reference outline.
export function screenClearance(reference,k,c,rect,limit=Infinity){return k*reference.distanceRect(toReference(reference,k,c,rect),limit/k);}
export function screenBounds(reference,k,c){const b=reference.bounds,o=reference.centre;return {x:c.x+k*(b.x0-o.x),y:c.y+k*(b.y0-o.y),width:k*(b.x1-b.x0),height:k*(b.y1-b.y0)};}
export function solveFraming({reference,width,height,hud=[],reserve={},clearance=HUD_CLEARANCE+FRAMING_SAFETY,maxHeightFraction=.76,shrink=.97}){
  const R={left:24,right:24,top:24,bottom:24,...reserve},b=reference.bounds,o=reference.centre,bw=b.x1-b.x0,bh=b.y1-b.y0,step=Math.max(4,Math.min(width,height)/120);
  const range=k=>({x0:R.left-k*(b.x0-o.x),x1:width-R.right-k*(b.x1-o.x),y0:R.top-k*(b.y0-o.y),y1:height-R.bottom-k*(b.y1-o.y)});
  // Score = min(HUD slack capped at 400, edge slack). The distance query is limited to what can still change it
  // (edge slack, or only the clearance test when existence is all that matters), which leaves the score unchanged.
  // The +1 keeps a capped distance above the bound it is compared with (k * (limit / k) can round below it).
  // floor: a centre whose edge slack is at most the best score so far cannot replace it, so it is not measured.
  // A failing centre sets deficit (clearance minus its distance) for the skip in best(). Items are tried most recent
  // failure first; any failure gives -1 and a pass takes the min over all, so the order does not change the score.
  const order=[...hud];let deficit=0;
  function score(k,c,any=false,floor=-Infinity){
    const s=screenBounds(reference,k,c),edge=Math.min(s.x-R.left,width-R.right-s.x-s.width,s.y-R.top,height-R.bottom-s.y-s.height);deficit=0;if(edge<0||edge<=floor)return -1;
    let hudSlack=Infinity;const limit=clearance+(any?1:Math.min(400,edge+1));
    for(let i=0;i<order.length;i++){const item=order[i],d=cappedClearance(k,c,item.rect,limit);
      if(d<clearance){deficit=clearance-d;if(i){order.splice(i,1);order.unshift(item);}return -1;}hudSlack=Math.min(hudSlack,d-clearance);}
    return Math.min(hudSlack,edge);
  }
  // screenClearance, skipping the outline query when the rect is at least the limit from the outline's bounding box:
  // every run lies inside it, so the query would return the limit unchanged.
  function cappedClearance(k,c,rect,limit){
    const r=toReference(reference,k,c,rect),L=limit/k,dx=Math.max(b.x0-r.x-r.width,r.x-b.x1,0),dy=Math.max(b.y0-r.y-r.height,r.y-b.y1,0);
    return Math.hypot(dx,dy)>=L?k*L:k*reference.distanceRect(r,L);
  }
  // any: stop at the first feasible centre (the scale search only needs existence; the same grid order keeps the
  // answer identical to a full search).
  // A centre's distance to a rect changes by at most how far the centre moves (the outline moves rigidly with it), so a
  // clearance failure with deficit d also fails every grid point closer than d. lb holds a lower bound on each point's
  // deficit: carried to the next column less the column step, and down/up the column less the row distance. Points
  // with lb above a 1e-6 px rounding margin are skipped; they could never score >= 0, so the result is the same as
  // scoring every point.
  function best(k,any=false){
    const r=range(k);if(r.x1<r.x0||r.y1<r.y0)return null;let found=null;
    const ys=[];for(let y=r.y0;y<=r.y1+1e-9;y+=step)ys.push(y);
    const n=ys.length,lb=new Float64Array(n);let px=NaN;
    for(let x=r.x0;x<=r.x1+1e-9;x+=step){
      const dx=x-px;for(let i=0;i<n;i++)lb[i]=lb[i]>dx?lb[i]-dx:0;
      for(let i=0;i<n;i++){
        if(i)lb[i]=Math.max(lb[i],lb[i-1]-(ys[i]-ys[i-1]));if(lb[i]>1e-6)continue;
        const c={x,y:ys[i]},s=score(k,c,any,found?found.score:-Infinity);
        if(s<0){lb[i]=deficit;continue;}
        if(!found||s>found.score){found={c,score:s};if(any)return found;}
      }
      for(let i=n-2;i>=0;i--)lb[i]=Math.max(lb[i],lb[i+1]-(ys[i+1]-ys[i]));
      px=x;
    }
    // Single-point ranges still need evaluating.
    if(!found){const c={x:(r.x0+r.x1)/2,y:(r.y0+r.y1)/2},s=score(k,c);if(s>=0)found={c,score:s};}
    return found;
  }
  let lo=0,hi=Math.min(maxHeightFraction*height/bh,(width-R.left-R.right)/bw,(height-R.top-R.bottom)/bh);
  if(best(hi,true))lo=hi;else for(let n=0;n<16;n++){const mid=(lo+hi)/2;if(best(mid,true))lo=mid;else hi=mid;}
  if(!(lo>0))return {feasible:false,reason:'No scale fits the block between the HUD zones'};
  const k=lo*shrink,atK=best(k),found=atK||best(lo);if(!found)return {feasible:false,reason:'Framing search lost feasibility after shrink'};
  const c=found.c,used=atK?k:lo,zoom=used*reference.height/height;
  return {feasible:true,k:used,zoom,centre:c,offset:{x:c.x-width/2,y:c.y-height/2},bounds:screenBounds(reference,used,c),
    clearances:hud.map(item=>({id:item.id,clearance:screenClearance(reference,used,c,item.rect)})),required:clearance,reserve:R};
}
// Shift by (x,y) CSS px and scale about the viewport centre; orbit/dolly stay untouched.
export function applyFraming(camera,framing,width,height){
  camera.aspect=width/height;camera.zoom=framing?.zoom??1;
  if(framing)camera.setViewOffset(width,height,-framing.offset.x,-framing.offset.y,width,height);else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}
// Portrait: block (bounding box) at ~89% of the viewport width, centred horizontally and centred vertically in the
// band between the header and the state title. Tries the largest title scale first; a fit must clear every HUD rect
// by HUD_CLEARANCE + safety and stay inside the viewport. Fits with room for a label line above or below are preferred.
export function solvePortraitBand({width,height,referenceFor,hudFor,titleScales=[1],fractions=[.9,.89,.88],labelRoom=0,clearance=HUD_CLEARANCE+FRAMING_SAFETY,side=16,headerIds=['site-title','tagline','nav'],titleId='era-panel'}){
  let fallback=null;const tried=[];
  for(const titleScale of titleScales){
    const hud=hudFor(titleScale),header=hud.filter(h=>headerIds.includes(h.id)),title=hud.find(h=>h.id===titleId);
    if(!header.length||!title)return {feasible:false,reason:'Portrait band needs header and state-title rects'};
    const top=Math.max(...header.map(h=>h.rect.y+h.rect.height)),bottom=title.rect.y;
    for(const fraction of fractions){
      let reference=referenceFor(1),b=reference.bounds,k=fraction*width/(b.x1-b.x0);
      // CSS-px label padding grows as k shrinks; size it at 90% of k so the re-solved box stays conservative.
      reference=referenceFor(k*.9);b=reference.bounds;k=fraction*width/(b.x1-b.x0);
      const o=reference.centre,c={x:width/2-k*((b.x0+b.x1)/2-o.x),y:(top+bottom)/2-k*((b.y0+b.y1)/2-o.y)},bounds=screenBounds(reference,k,c);
      const clearances=hud.map(item=>({id:item.id,clearance:screenClearance(reference,k,c,item.rect)})),worst=Math.min(...clearances.map(x=>x.clearance));
      const inside=bounds.x>=side-1e-6&&bounds.x+bounds.width<=width-side+1e-6&&bounds.y>=0&&bounds.y+bounds.height<=height;
      const spare={top:bounds.y-top,bottom:bottom-bounds.y-bounds.height};tried.push({titleScale,fraction,worst,spare,inside});
      if(!inside||worst<clearance)continue;
      const framing={feasible:true,mode:'portrait-band',k,zoom:k*reference.height/height,centre:c,offset:{x:c.x-width/2,y:c.y-height/2},bounds,clearances,required:clearance,
        titleScale,widthFraction:bounds.width/width,band:{top,bottom},spare,labelRoom:Math.max(spare.top,spare.bottom)>=labelRoom};
      if(framing.labelRoom)return {feasible:true,framing,reference,tried};
      // No fit has label room: keep the one with the most of it (smaller title, then narrower block).
      if(!fallback||Math.max(spare.top,spare.bottom)>Math.max(fallback.framing.spare.top,fallback.framing.spare.bottom))fallback={feasible:true,framing,reference,tried};
    }
  }
  return fallback?{...fallback,tried}:{feasible:false,reason:'No portrait band fit at 88-90% width',tried};
}
// Portrait fallback: the HUD zones span the full width, so every column of the search grid scores the same and the
// search keeps its first, the left edge. Centring keeps the scale and every HUD clearance (checked) and only adds edge room.
// The block is centred, not the framed box: at a small k the scale-label pad reaches past the block's left side.
// block is the reference without that pad (referenceFor(Infinity)); the framed box stays inside the side reserve.
function centreAcross(framing,reference,block,hud,width,height){
  const k=framing.k,o=reference.centre,b=reference.bounds,R=framing.reserve,bb=block.bounds;
  const x=Math.min(Math.max(width/2-k*((bb.x0+bb.x1)/2-o.x),R.left-k*(b.x0-o.x)),width-R.right-k*(b.x1-o.x)),c={x,y:framing.centre.y};
  const clearances=hud.map(item=>({id:item.id,clearance:screenClearance(reference,k,c,item.rect)}));
  if(clearances.some(x=>x.clearance<framing.required-1e-6))return framing;
  return {...framing,centre:c,offset:{x:c.x-width/2,y:c.y-height/2},bounds:screenBounds(reference,k,c),clearances};
}
// The site's framing for a viewport, shared by the 3D view and the hero still shown before it. Phones: the portrait
// band, narrow screens trying smaller state titles; otherwise (or if no band fit exists) the general solver with the
// callout column reserved either side. referenceFor(k) is the reference with the scale-bar label pad sized for scale
// k; hudFor(titleScale) applies that state-title scale and returns the worst-case HUD rects; metrics is calloutMetrics.
// The result's reference is null when no framing fits.
export function solveSiteFraming({width,height,referenceFor,hudFor,metrics,warn=()=>{}}){
  const portrait=height>width;
  if(portrait){
    const fit=solvePortraitBand({width,height,referenceFor,hudFor,titleScales:width<=480?[1,.95,.9,.85,.8]:[1],labelRoom:2*HUD_CLEARANCE+metrics.lineHeight});
    if(fit.feasible)return {framing:fit.framing,reference:fit.reference};
    warn('Portrait band framing infeasible; using the general solver',fit.reason);
  }
  const band=2*metrics.lineHeight+12,hud=hudFor(1).map(item=>{
    if(!portrait)return item;const r=item.rect,top=r.y+r.height/2<height/2;
    // Portrait: keep a two-line label band between the block and the top/bottom HUD.
    return {...item,rect:top?{x:0,y:r.y,width,height:r.height+band}:{x:0,y:r.y-band,width,height:r.height+band}};
  });
  const side=portrait?16:metrics.margin+metrics.wrapWidth+24,reserve={left:side,right:side,top:16,bottom:16};
  const first=solveFraming({reference:referenceFor(1),width,height,hud,reserve});
  // The label block is CSS px; sizing it at 90% of the first k keeps it conservative after the re-solve.
  const reference=first.feasible?referenceFor(first.k*.9):null;
  let framing=first.feasible?solveFraming({reference,width,height,hud,reserve}):first;
  if(framing.feasible){framing={...framing,mode:'general',titleScale:1};if(portrait)framing=centreAcross(framing,reference,referenceFor(Infinity),hud,width,height);}
  else warn('Site framing infeasible; using unframed hero',framing.reason);
  return {framing,reference:framing.feasible?reference:null};
}
