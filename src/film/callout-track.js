// Pinned callout track for the film. The layout is solved once on the CPU over the whole
// film; each frame then reads its placement, so frames stay independent of each other.
// A label keeps one side of its anchor for its whole life and its anchor-relative offset
// changes by at most MAX_RELATIVE_STEP px per frame, while every layout gate still holds.
import {LABEL_CLEARANCE,MAX_LEADER,compatibleCallouts,evaluateCallout,labelGap,pointSegmentDistance,segmentsCross,inside} from './layout.js';
import {scaleRectDistance,scaleLineDistance} from './hud.js';
export const TRACK_GRID=2,MAX_RELATIVE_STEP=4,PROTECTED_GAP=8,FRAME_MARGIN=48;
const MOVE_COST=2,CENTRE_COST=.05;
const MOVES=(()=>{const m=[];for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)if((x*x+y*y)*TRACK_GRID*TRACK_GRID<=MAX_RELATIVE_STEP**2+1e-9)m.push([x,y,Math.hypot(x,y)*TRACK_GRID]);return m;})();
const MX=Int8Array.from(MOVES,m=>m[0]),MY=Int8Array.from(MOVES,m=>m[1]),MD=Float64Array.from(MOVES,m=>m[2]*MOVE_COST);
// Fast pre-filter equivalent to (or stricter than) compatibleCallouts; the exact check runs on the chosen path.
function segmentHitsBox(px,py,qx,qy,r){
  const e=1e-6,dx=qx-px,dy=qy-py;let t0=0,t1=1;
  const clip=(p,q)=>{if(p===0)return q>=0;const t=q/p;if(p<0){if(t>t1)return false;if(t>t0)t0=t;}else{if(t<t0)return false;if(t<t1)t1=t;}return true;};
  return clip(-dx,px-(r.x-e))&&clip(dx,r.x+r.width+e-px)&&clip(-dy,py-(r.y-e))&&clip(dy,r.y+r.height+e-py);
}
function fastCompatible(rect,end,anchor,mate,need){
  const b=mate.rect,gx=Math.max(0,rect.x-b.x-b.width,b.x-rect.x-rect.width),gy=Math.max(0,rect.y-b.y-b.height,b.y-rect.y-rect.height);
  if(gx*gx+gy*gy<need*need)return false;
  if(segmentHitsBox(end.x,end.y,anchor.x,anchor.y,b)||segmentHitsBox(mate.end.x,mate.end.y,mate.anchor.x,mate.anchor.y,rect))return false;
  if(pointSegmentDistance(mate.anchor,end,anchor)<=5||pointSegmentDistance(anchor,mate.end,mate.anchor)<=5)return false;
  return !segmentsCross(end,anchor,mate.end,mate.anchor);
}
export const viewportFor=(zones,blockLowestY,width=1920,height=1080)=>({width,height,maxLabelBottom:blockLowestY,rectScaleDistance:r=>scaleRectDistance(r,zones),lineScaleDistance:(a,b)=>scaleLineDistance(a,b,zones)});
// Conservative blocked-cell field: a cell is blocked when any point of it is closer than a
// gate allows to the block silhouette, protected text or a scale zone. A label box that
// touches no blocked cell passes those three gates.
export function blockedField({silhouette,protectedRects=[],scaleZones=[]},{width=1920,height=1080,grid=TRACK_GRID}={}){
  const cols=Math.ceil(width/grid),rows=Math.ceil(height/grid),mask=new Uint8Array(cols*rows);
  function dilateBox(x0,y0,x1,y1,R){
    const a0=Math.max(0,Math.floor((y0-R)/grid)),b0=Math.min(rows-1,Math.floor((y1+R)/grid));
    for(let gy=a0;gy<=b0;gy++){
      const cy0=gy*grid,dy=Math.max(0,y0-cy0-grid,cy0-y1);if(dy>=R)continue;const w=Math.sqrt(R*R-dy*dy);
      const a=Math.max(0,Math.floor((x0-w)/grid)),b=Math.min(cols-1,Math.ceil((x1+w)/grid)-1);if(a<=b)mask.fill(1,gy*cols+a,gy*cols+b+1);
    }
  }
  const cell=silhouette.cell,R=LABEL_CLEARANCE+.02;
  silhouette.rows.forEach((spans,y)=>{for(const [l,r] of spans)dilateBox(l,y*cell,r,(y+1)*cell,R);});
  for(const r of protectedRects)dilateBox(r.x,r.y,r.x+r.width,r.y+r.height,PROTECTED_GAP+.01);
  const half=grid*Math.SQRT1_2,reach=LABEL_CLEARANCE+half+.01;
  for(const poly of scaleZones){
    if(!poly.length)continue;
    const xs=poly.map(p=>p.x),ys=poly.map(p=>p.y);
    const gx0=Math.max(0,Math.floor((Math.min(...xs)-reach)/grid)),gx1=Math.min(cols-1,Math.floor((Math.max(...xs)+reach)/grid));
    const gy0=Math.max(0,Math.floor((Math.min(...ys)-reach)/grid)),gy1=Math.min(rows-1,Math.floor((Math.max(...ys)+reach)/grid));
    for(let gy=gy0;gy<=gy1;gy++)for(let gx=gx0;gx<=gx1;gx++){
      const c={x:(gx+.5)*grid,y:(gy+.5)*grid};let d=inside(c,poly)?0:Infinity;
      if(d)for(let i=0;i<poly.length;i++)d=Math.min(d,pointSegmentDistance(c,poly[i],poly[(i+1)%poly.length]));
      if(d<reach)mask[gy*cols+gx]=1;
    }
  }
  const sat=new Int32Array((cols+1)*(rows+1));
  for(let y=0;y<rows;y++){let run=0;for(let x=0;x<cols;x++){run+=mask[y*cols+x];sat[(y+1)*(cols+1)+x+1]=sat[y*(cols+1)+x+1]+run;}}
  return {clear(x,y,w,h){
    const a=Math.max(0,Math.floor(x/grid)),b=Math.min(cols-1,Math.ceil((x+w)/grid)-1),c=Math.max(0,Math.floor(y/grid)),d=Math.min(rows-1,Math.ceil((y+h)/grid)-1);
    if(a>b||c>d)return true;const W=cols+1;return sat[(d+1)*W+b+1]-sat[c*W+b+1]-sat[(d+1)*W+a]+sat[c*W+a]===0;
  }};
}
// One label, one side, a contiguous run of frames. Optional partner placements must stay
// compatible frame by frame. Returns the minimum-cost smooth path or null.
function solveLabel(run,side,partner,{width=1920,height=1080,maxIterations=200}={}){
  const {W,H}=run,g=TRACK_GRID,nx=Math.floor(MAX_LEADER/g)+1,ny=Math.floor((H+2*MAX_LEADER)/g)+1,N=nx*ny,T=run.frames.length;
  const dxOf=ix=>side==='left'?-W-ix*g:ix*g,dyOf=iy=>-H-MAX_LEADER+iy*g;
  const costs=[];
  for(let t=0;t<T;t++){
    const f=run.frames[t],{anchor}=f.item,cost=new Float32Array(N).fill(Infinity),bottom=Math.min(height-FRAME_MARGIN,f.blockLowestY),mate=partner?.get(f.frame);
    for(let iy=0;iy<ny;iy++){
      const y=anchor.y+dyOf(iy);if(y<FRAME_MARGIN||y+H>bottom)continue;
      const ey=Math.max(y,Math.min(y+H,anchor.y)),vy=anchor.y-ey,centre=CENTRE_COST*Math.abs(y+H/2-anchor.y);
      for(let ix=0;ix<nx;ix++){
        const x=anchor.x+dxOf(ix);if(x<FRAME_MARGIN||x+W>width-FRAME_MARGIN)continue;
        const ex=side==='left'?x+W:x,length=Math.hypot(anchor.x-ex,vy);if(length>MAX_LEADER)continue;
        if(!f.field.clear(x,y,W,H))continue;
        if(mate&&!fastCompatible({x,y,width:W,height:H},{x:ex,y:ey},anchor,mate,labelGap(f.item,mate)))continue;
        cost[iy*nx+ix]=length+centre;
      }
    }
    costs.push(cost);
  }
  const back=Array.from({length:T},()=>new Uint8Array(N)),value=[new Float64Array(N),new Float64Array(N)];
  for(let iteration=0;iteration<maxIterations;iteration++){
    let prev=value[0];prev.set(costs[0]);
    for(let t=1;t<T;t++){
      const cur=value[t&1],cost=costs[t],bk=back[t];prev=value[(t-1)&1];
      for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){
        const s=iy*nx+ix,c=cost[s];if(c===Infinity){cur[s]=Infinity;continue;}
        let best=Infinity,arg=0;
        for(let m=0;m<MX.length;m++){const px=ix-MX[m],py=iy-MY[m];if(px<0||py<0||px>=nx||py>=ny)continue;const v=prev[py*nx+px]+MD[m];if(v<best){best=v;arg=m;}}
        cur[s]=best+c;bk[s]=arg;
      }
    }
    const last=value[(T-1)&1];let end=-1,total=Infinity;for(let s=0;s<N;s++)if(last[s]<total){total=last[s];end=s;}
    if(end<0)return null;
    const states=new Array(T);states[T-1]=end;
    for(let t=T-1;t>0;t--){const s=states[t],[mx,my]=MOVES[back[t][s]];states[t-1]=(Math.floor(s/nx)-my)*nx+(s%nx-mx);}
    // Exact verification with the shared gate code; forbid any failing state and resolve.
    let failed=0;const path=new Map();
    for(let t=0;t<T;t++){
      const f=run.frames[t],s=states[t],ix=s%nx,iy=Math.floor(s/nx),dx=dxOf(ix),dy=dyOf(iy),{anchor}=f.item;
      const placed=evaluateCallout(f.item,{x:anchor.x+dx,y:anchor.y+dy,width:W,height:H},f.silhouette,f.protectedRects,f.viewport),mate=partner?.get(f.frame);
      if(placed.reason||mate&&!compatibleCallouts(placed,mate)){costs[t][s]=Infinity;failed++;continue;}
      path.set(f.frame,{...placed,dx,dy,side,state:s});
    }
    if(!failed)return {side,total,iterations:iteration+1,path};
  }
  return null;
}
function runsOf(frames,id){
  const runs=[];let current=null;
  for(const f of frames){
    const item=f.items.find(i=>i.id===id);
    if(item?.anchor){if(!current||current.last!==f.frame-1){current={frames:[],last:null};runs.push(current);}current.frames.push({...f,item});current.last=f.frame;}
  }
  return runs;
}
// inputs: one entry per film frame {frame,items,silhouette,protectedRects,scaleZones,blockLowestY}.
export function solveCalloutTrack(inputs,{width=1920,height=1080,log=()=>{}}={}){
  const frames={},labels=[],failures=[],episodes=[];
  for(const input of inputs){
    if(!input.items.length)continue;const era=input.items[0].era,last=episodes.at(-1);
    if(last&&last.era===era&&last.frames.at(-1).frame===input.frame-1)last.frames.push(input);else episodes.push({era,frames:[input]});
  }
  for(const episode of episodes){
    const started=Date.now();
    const prepared=episode.frames.map(f=>({...f,field:blockedField(f,{width,height}),viewport:viewportFor(f.scaleZones,f.blockLowestY,width,height)}));
    const ids=[...new Set(prepared.flatMap(f=>f.items.map(i=>i.id)))],runs=new Map();
    for(const id of ids){
      const all=runsOf(prepared,id),visible=prepared.filter(f=>f.items.some(i=>i.id===id&&i.opacity>0));
      const covering=all.filter(r=>r.frames.some(x=>x.item.opacity>0));
      if(covering.length!==1||visible.some(f=>!covering[0].frames.some(x=>x.frame===f.frame)))failures.push({id,era:episode.era,reason:'Visible frames are not one contiguous anchored run'});
      if(covering.length){const run=covering.reduce((a,b)=>a.frames.length>=b.frames.length?a:b);const it=run.frames[0].item;run.W=it.boxWidth;run.H=it.boxHeight;runs.set(id,run);}
    }
    const order=[...runs.keys()];let best=null;const tried=[];
    const sequences=order.length>1?[order,[...order].reverse()]:[order];
    for(const seq of sequences){
      const first=seq[0],second=seq[1];
      for(const s1 of ['left','right']){
        const a=solveLabel(runs.get(first),s1,null,{width,height});tried.push({seq,first:s1,ok:!!a});if(!a)continue;
        if(!second){if(!best||a.total<best.total)best={total:a.total,parts:[[first,a]]};continue;}
        for(const s2 of ['left','right']){
          const b=solveLabel(runs.get(second),s2,a.path,{width,height});tried.push({seq,first:s1,second:s2,ok:!!b});if(!b)continue;
          if(!best||a.total+b.total<best.total)best={total:a.total+b.total,parts:[[first,a],[second,b]]};
        }
      }
    }
    if(!best){failures.push({era:episode.era,ids:order,reason:'No locked-topology smooth track satisfies every gate',tried});continue;}
    for(const [id,solution] of best.parts){
      let maxStep=0,prev=null,maxLength=0,sumLength=0,minClearance=Infinity;
      for(const [frame,p] of solution.path){
        (frames[frame]||={})[id]={dx:p.dx,dy:p.dy,side:p.side,anchor:[p.anchor.x,p.anchor.y],boxWidth:p.rect.width,boxHeight:p.rect.height};
        if(prev)maxStep=Math.max(maxStep,Math.hypot(p.dx-prev.dx,p.dy-prev.dy));prev=p;
        maxLength=Math.max(maxLength,p.length);sumLength+=p.length;minClearance=Math.min(minClearance,p.clearance);
      }
      const run=runs.get(id);
      labels.push({id,era:episode.era,side:solution.side,firstFrame:run.frames[0].frame,lastFrame:run.frames.at(-1).frame,frames:run.frames.length,
        maximumRelativeStep:maxStep,maximumLeader:maxLength,meanLeader:sumLength/solution.path.size,minimumClearance:minClearance,verificationIterations:solution.iterations});
    }
    log(`era ${episode.era}: ${order.join('+')} ${best.parts.map(([id,s])=>id+':'+s.side).join(' ')} in ${((Date.now()-started)/1000).toFixed(1)}s`);
  }
  return {frames,labels,failures};
}
// Reads a pinned track for one frame. Every gate is re-checked; nothing is re-solved.
export function placeFromTrack(items,track,frame,silhouette,obstacles,viewport){
  // filmState(n/30).frame carries float error; the track is keyed by whole frames.
  const key=Math.round(frame),entries=Math.abs(frame-key)<1e-6?track.frames[key]||{}:{},placed=[],failures=[];
  if(Math.abs(frame-key)>=1e-6&&items.some(i=>i.opacity>0))failures.push({id:'frame',reason:'Callout track covers whole frames only'});
  for(const item of items){
    const e=entries[item.id];
    if(!e){if(item.opacity>0)failures.push({id:item.id,reason:'Callout track has no placement for this visible label'});continue;}
    if(!item.anchor){failures.push({id:item.id,reason:'Missing feature-surface anchor'});continue;}
    if(Math.hypot(item.anchor.x-e.anchor[0],item.anchor.y-e.anchor[1])>.01||Math.abs(item.boxWidth-e.boxWidth)>.5||Math.abs(item.boxHeight-e.boxHeight)>.5)failures.push({id:item.id,reason:'Callout track was solved for a different anchor or label box'});
    const c=evaluateCallout(item,{x:item.anchor.x+e.dx,y:item.anchor.y+e.dy,width:item.boxWidth,height:item.boxHeight},silhouette,obstacles,viewport);
    if(c.reason)failures.push({id:item.id,reason:c.reason});
    placed.push({...c,side:e.side,tracked:true});
  }
  if(placed.length===2&&!compatibleCallouts(placed[0],placed[1]))failures.push({id:placed.map(p=>p.id).join('+'),reason:'Tracked labels are too close or their leaders cross'});
  return {placed,failures};
}
