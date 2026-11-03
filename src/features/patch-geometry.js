import { prism, norm } from './solid.js';
import { triangulateFootprint } from './masonry.js';
export const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
export function noise2(x,z,seed=41){
 const hash=(x,z)=>{let n=Math.imul(x,374761393)^Math.imul(z,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;};
 const i=Math.floor(x),j=Math.floor(z),u=smooth(0,1,x-i),v=smooth(0,1,z-j),a=hash(i,j)*(1-u)+hash(i+1,j)*u,b=hash(i,j+1)*(1-u)+hash(i+1,j+1)*u;
 return a*(1-v)+b*v;
}
export function boundaryDistance(p,poly){
 let d=Infinity;
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],x=b[0]-a[0],z=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*z)/(x*x+z*z||1)));d=Math.min(d,Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*z));}
 return d;
}
export function roughOutline(poly,r,step=.035){
 const out=[];
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],d=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(d/step);
  for(let j=0;j<n;j++){const t=j/n,k=j===0?0:.001+r()*.007;out.push([a[0]+(b[0]-a[0])*t-(b[1]-a[1])/d*k,a[1]+(b[1]-a[1])*t+(b[0]-a[0])/d*k]);}
 }
 return out;
}
function clip2(subject,triangle){
 if((triangle[1][0]-triangle[0][0])*(triangle[2][1]-triangle[0][1])-(triangle[1][1]-triangle[0][1])*(triangle[2][0]-triangle[0][0])<0)triangle=[...triangle].reverse();
 for(let i=0;i<3&&subject.length;i++){
  const a=triangle[i],b=triangle[(i+1)%3],side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]),out=[];
  for(let j=0;j<subject.length;j++){const p=subject[j],q=subject[(j+1)%subject.length],d=side(p),e=side(q);if(d>=-1e-10)out.push(p);if(d>1e-10&&e< -1e-10||d< -1e-10&&e>1e-10){const t=d/(d-e);out.push([p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t]);}}
  subject=out;
 }
 return subject;
}
export function insidePolygon(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
function mergeParts(parts){
 const key=p=>p.map(x=>x.toFixed(9)).join(','),points=new Map(parts.flat().map(p=>[key(p),p])),edges=new Map();
 for(const p of parts)for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;if(length<1e-18)continue;
  const cuts=[...points].map(([k,p])=>({k,t:((p[0]-a[0])*dx+(p[1]-a[1])*dz)/length,p})).filter(v=>v.t>=-1e-7&&v.t<=1+1e-7&&Math.abs((v.p[0]-a[0])*dz-(v.p[1]-a[1])*dx)<1e-9).sort((a,b)=>a.t-b.t);
  for(let j=0;j<cuts.length-1;j++){const a=cuts[j].k,b=cuts[j+1].k;if(a===b)continue;const k=[a,b].sort().join('|');if(edges.has(k))edges.delete(k);else edges.set(k,[a,b]);}
 }
 const out=[];
 while(edges.size){
  const [firstKey,first]=edges.entries().next().value;edges.delete(firstKey);const loop=[points.get(first[0])];let previous=first[0],current=first[1],guard=0;
  while(current!==first[0]&&guard++<10000){
   loop.push(points.get(current));const candidates=[...edges].filter(([,e])=>e[0]===current);if(!candidates.length)throw new Error('Open 2D clipped-patch boundary');
   const a=points.get(previous),b=points.get(current),angle=Math.atan2(b[1]-a[1],b[0]-a[0]);
   candidates.sort(([,e],[,f])=>{const turn=k=>{const p=points.get(k);return((angle+Math.PI-Math.atan2(p[1]-b[1],p[0]-b[0]))%(2*Math.PI)+2*Math.PI)%(2*Math.PI);};return turn(e[1])-turn(f[1]);});
   const[k,e]=candidates[0];edges.delete(k);previous=current;current=e[1];
  }
  for(let i=loop.length-1;i>=0;i--){const a=loop[(i+loop.length-1)%loop.length],b=loop[i],c=loop[(i+1)%loop.length];if(Math.abs((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]))<1e-10)loop.splice(i,1);}
  if(loop.length>=3)out.push(...triangulateFootprint(loop).filter(t=>area(t)>2e-8));
 }
 return out;
}
export function clipTriangle2(triangle,footprintTriangles,poly){
 if(poly){const c=triangle.reduce((p,q)=>[p[0]+q[0]/3,p[1]+q[1]/3],[0,0]),radius=Math.max(...triangle.map(p=>Math.hypot(p[0]-c[0],p[1]-c[1])));if(insidePolygon(c,poly)&&boundaryDistance(c,poly)>radius+1e-8)return[triangle];}
 const parts=[],min=[Math.min(...triangle.map(p=>p[0])),Math.min(...triangle.map(p=>p[1]))],max=[Math.max(...triangle.map(p=>p[0])),Math.max(...triangle.map(p=>p[1]))];
 for(const t of footprintTriangles){
  if(Math.max(...t.map(p=>p[0]))<min[0]||Math.min(...t.map(p=>p[0]))>max[0]||Math.max(...t.map(p=>p[1]))<min[1]||Math.min(...t.map(p=>p[1]))>max[1])continue;
  const p=clip2(triangle,t).map(v=>v.map(x=>Math.round(x*1e9)/1e9));if(p.length>=3&&area(p)>2e-8)parts.push(p);
 }
 return parts.length===1?triangulateFootprint(parts[0]).filter(t=>area(t)>2e-8):mergeParts(parts);
}
export function gridTriangles(poly,step=.07){
 const ts=triangulateFootprint(poly),x0=Math.floor(Math.min(...poly.map(p=>p[0]))/step)*step,z0=Math.floor(Math.min(...poly.map(p=>p[1]))/step)*step,x1=Math.max(...poly.map(p=>p[0])),z1=Math.max(...poly.map(p=>p[1])),out=[];
 for(let x=x0;x<x1;x+=step)for(let z=z0;z<z1;z+=step)for(const t of [[[x,z],[x+step,z],[x+step,z+step]],[[x,z],[x+step,z+step],[x,z+step]]])out.push(...clipTriangle2(t,ts,poly));
 return out;
}
export function heightSolid(t,low,high){
 const f=prism(t,0,1).map(face=>face.map(([x,y,z])=>[x,y===0?low(x,z):high(x,z),z]));
 f[1].surface=true;return f;
}
export function surfaceNormal(height,x,z){
 const d=.0002;return norm([-(height(x+d,z)-height(x-d,z))/(2*d),1,-(height(x,z+d)-height(x,z-d))/(2*d)]);
}
export function dustField(triangles,coverage=.3,smallPatches=false){
 const value=smallPatches?(x,z)=>.65*noise2(x/.085,z/.085,19273)+.35*noise2(x/.17,z/.17,12719):(x,z)=>noise2(x/.19,z/.19,19273),samples=triangles.map(t=>({a:area(t),v:value(t.reduce((s,p)=>s+p[0],0)/3,t.reduce((s,p)=>s+p[1],0)/3)})).sort((a,b)=>a.v-b.v);
 const total=samples.reduce((s,p)=>s+p.a,0);let sum=0,threshold=samples.at(-1)?.v??.5;
 for(const p of samples){sum+=p.a;if(sum>=total*(1-coverage)){threshold=p.v;break;}}
 const at=(x,z)=>smooth(threshold-.055,threshold+.055,value(x,z));
 return {at,coverage:samples.filter(p=>p.v>=threshold).reduce((s,p)=>s+p.a,0)/total,threshold};
}
