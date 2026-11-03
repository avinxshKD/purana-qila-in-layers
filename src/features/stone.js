import { rng, labColour, SOIL_LAB } from './colour.js';
import { noise2, smooth, insidePolygon, area } from './patch-geometry.js';
import { prism, intersectSolid, subtractSolid, faceNormal, dot } from './solid.js';
import { triangulateFootprint } from './masonry.js';

function upperPlanes(poly,centre,base,height,r){
 const raw=[{a:.045,b:.012,c:.007},...Array.from({length:6},(_,i)=>{const a=i*Math.PI/3+.17;return{a:.045+.07*Math.cos(a),b:.012+.07*Math.sin(a),c:.011+(r()-.5)*.002};})];
 const value=p=>Math.min(...raw.map(q=>q.a*(p[0]-centre[0])+q.b*(p[1]-centre[1])+q.c)),candidates=[...poly,centre];
 for(let i=0;i<raw.length;i++)for(let j=i+1;j<raw.length;j++){
  const a=raw[i].a-raw[j].a,b=raw[i].b-raw[j].b,c=raw[i].c-raw[j].c;
  for(let k=j+1;k<raw.length;k++){
   const d=raw[i].a-raw[k].a,e=raw[i].b-raw[k].b,f=raw[i].c-raw[k].c,det=a*e-b*d;if(Math.abs(det)<1e-10)continue;
   const p=[centre[0]+(b*f-c*e)/det,centre[1]+(c*d-a*f)/det];if(insidePolygon(p,poly))candidates.push(p);
  }
  for(let k=0;k<poly.length;k++){
   const p=poly[k],q=poly[(k+1)%poly.length],v=a*(p[0]-centre[0])+b*(p[1]-centre[1])+c,w=a*(q[0]-centre[0])+b*(q[1]-centre[1])+c;
   if(v*w<0){const t=v/(v-w);candidates.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}
  }
 }
 const low=Math.min(...poly.map(value)),high=Math.max(...candidates.map(value)),scale=.025/(high-low);
 const planes=raw.map(p=>({normal:[p.a*scale,-1,p.b*scale],constant:base+height+(p.c-high)*scale-p.a*scale*centre[0]-p.b*scale*centre[1]}));
 return{planes,heightAt:(x,z)=>base+height+(value([x,z])-high)*scale};
}
function planesOf(faces){return faces.map(f=>{const n=faceNormal(f);return{normal:n.map(v=>-v),constant:dot(n,f[0])};});}
export function stonePieces(spec,lab){
 const base=spec.base??0,height=spec.height??.12,raw=spec.footprint,poly=raw[0][0]===raw.at(-1)[0]&&raw[0][1]===raw.at(-1)[1]?raw.slice(0,-1):raw;
 const centre=poly.reduce((a,p)=>[a[0]+p[0]/poly.length,a[1]+p[1]/poly.length],[0,0]),r=rng((spec.seed??spec.id)+':slab');
 const top=upperPlanes(poly,centre,base,height,r),info={mainPlanes:top.planes,relief:.025,chamfers:[],chips:6,spikeChip:false};
 let pieces=triangulateFootprint(poly).map(t=>({faces:intersectSolid(prism(t,base,base+height+.01),top.planes),tier:1,lab,material:'stone',unitId:spec.id,featureId:spec.id,base,finish:[3,0],paintDust:true,stoneInfo:info}));
 function remove(planes,bounds){
  pieces=pieces.flatMap(p=>{
   const v=p.faces.flat();if(bounds&&(Math.max(...v.map(p=>p[0]))<bounds[0]||Math.min(...v.map(p=>p[0]))>bounds[1]||Math.max(...v.map(p=>p[2]))<bounds[2]||Math.min(...v.map(p=>p[2]))>bounds[3]))return[p];
   if(!intersectSolid(p.faces,planes).length)return[p];
   return subtractSolid(p.faces,planes).map(faces=>({...p,faces}));
  });
 }
 const sign=Math.sign(poly.reduce((s,a,i)=>{const b=poly[(i+1)%poly.length];return s+a[0]*b[1]-b[0]*a[1];},0));
 const segments=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),d=[(b[0]-a[0])/length,(b[1]-a[1])/length],n=[-d[1]*sign,d[0]*sign];
  let at=0;while(at<length-1e-8){
   const end=Math.min(length,at+.045+r()*.075),p=[a[0]+d[0]*at,a[1]+d[1]*at],q=[a[0]+d[0]*end,a[1]+d[1]*end],mid=[(p[0]+q[0])/2,(p[1]+q[1])/2],width=.005+r()*.025;
   const edge=n[0]*a[0]+n[1]*a[1],breakY=top.heightAt(...mid)-width;
   remove([{normal:[-n[0],1,-n[1]],constant:edge-breakY},{normal:[d[0],0,d[1]],constant:-d[0]*p[0]-d[1]*p[1]},{normal:[-d[0],0,-d[1]],constant:d[0]*q[0]+d[1]*q[1]},{normal:[n[0],0,n[1]],constant:-edge+.025},{normal:[-n[0],0,-n[1]],constant:edge+.045},{normal:[0,1,0],constant:-base-.055}],
    [Math.min(p[0],q[0])-.06,Math.max(p[0],q[0])+.06,Math.min(p[1],q[1])-.06,Math.max(p[1],q[1])+.06]);
   info.chamfers.push(width);segments.push({p:mid,n,d,length:end-at});at=end;
  }
 }
 for(let i=0;i<6;i++){
  const s=segments[Math.floor((i+r()*.6)/6*segments.length)%segments.length],length=.015+r()*.02,depth=.01+r()*.01;
  const t=[[-length/2,-.015],[length/2,-.015],[(r()-.5)*length,depth]].map(([x,z])=>[s.p[0]+s.d[0]*x+s.n[0]*z,s.p[1]+s.d[1]*x+s.n[1]*z]);
  const y=Math.max(base+height-.03,top.heightAt(...s.p)-.006-r()*.012);
  remove(planesOf(prism(t,y,base+height+.02)),[Math.min(...t.map(p=>p[0])),Math.max(...t.map(p=>p[0])),Math.min(...t.map(p=>p[1])),Math.max(...t.map(p=>p[1]))]);
 }
 if(spec.id==='top-left-stone-as-drawn'){
  // The nearly edge-on diagonal shoulder was the apparent dark needle. Shorten
  // its upper part into the buried zone; retain every point of the traced base.
  const t=[[.750,.490],[.870,.490],[.870,.630]];
  remove(planesOf(prism(t,base+.065,base+height+.02)),[.750,.870,.490,.630]);
  info.chips++;info.spikeChip=true;
 }
 for(const p of pieces)for(const f of p.faces){
  const index=top.planes.findIndex(q=>f.every(v=>Math.abs(dot(q.normal,v)+q.constant)<1e-6));
  if(index>=0){f.surface=true;f.stoneFacet=index;}
 }
 const min=[Math.min(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1]))],max=[Math.max(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[1]))],width=128,depth=128,values=[];
 const score=(x,z)=>noise2(x/.065,z/.065,719)+.6*(base+height-top.heightAt(x,z))/.025;
 for(let z=0;z<depth;z++)for(let x=0;x<width;x++){
  const p=[min[0]+(x+.5)/width*(max[0]-min[0]),min[1]+(z+.5)/depth*(max[1]-min[1])];if(insidePolygon(p,poly))values.push(score(...p));
 }
 values.sort((a,b)=>a-b);const threshold=values[Math.floor(values.length*.8)],data=new Uint8Array(width*depth*4),soil=labColour(...SOIL_LAB).toArray();let dusty=0,total=0;
 for(let z=0;z<depth;z++)for(let x=0;x<width;x++){
  const p=[min[0]+(x+.5)/width*(max[0]-min[0]),min[1]+(z+.5)/depth*(max[1]-min[1])];if(!insidePolygon(p,poly))continue;
  total++;const alpha=(spec.dustCoat??.65)*smooth(threshold,threshold+.12,score(...p));if(alpha>0)dusty++;
  data.set([...soil.map(v=>Math.round(v*alpha*255)),Math.round(alpha*255)],(z*width+x)*4);
 }
 info.dustCoverage=dusty/total;info.dustMethod='20% low-height-biased support, soft local6.5 cm mask; premultiplied mip-filtered soil film on top facets only. Not an all-top coating.';
 pieces.paint={data,width,height:depth,min,max};return pieces;
}
