import { SOIL_LAB, labColour, gaussian } from './colour.js';
import { tetraSolid } from './solid.js';
import { area, insidePolygon } from './patch-geometry.js';

// Random proposals, never a displaced lattice. Fine particles are a unique,
// premultiplied, mip-filtered paint field, not sub-pixel geometry.
export function crushedPatches(polygons,base,r,id){
 const vertices=polygons.flat(),min=[Math.min(...vertices.map(p=>p[0])),Math.min(...vertices.map(p=>p[1]))],max=[Math.max(...vertices.map(p=>p[0])),Math.max(...vertices.map(p=>p[1]))];
 const width=1024,height=512,dx=(max[0]-min[0])/width,dz=(max[1]-min[1])/height;
 const mask=new Uint8Array(width*height),owner=new Uint8Array(width*height),data=new Uint8Array(width*height*4),totals=polygons.map(()=>0);
 for(let z=0;z<height;z++)for(let x=0;x<width;x++){
  const p=[min[0]+(x+.5)*dx,min[1]+(z+.5)*dz],i=polygons.findIndex(poly=>insidePolygon(p,poly));
  if(i>=0){owner[z*width+x]=i+1;totals[i]++;}
 }
 const pieces=[],units=[],geometryCoverage=[],speckleCoverage=[],sampling=[];
 function palette(){
  const n=r();
  return n<.125?{lab:[SOIL_LAB[0]+5+r()*5,1.5,12],role:'pale-dusty'}:
   n<.20?{lab:[30+r()*6,3,7],role:'burnt'}:
   {lab:[SOIL_LAB[0]+(r()-.5)*16,7+r()*7,13+r()*8],role:'terracotta'};
 }
 function mark(t,index,kind,lab){
  const lo=[Math.max(0,Math.floor((Math.min(...t.map(p=>p[0]))-min[0])/dx)),Math.max(0,Math.floor((Math.min(...t.map(p=>p[1]))-min[1])/dz))];
  const hi=[Math.min(width-1,Math.ceil((Math.max(...t.map(p=>p[0]))-min[0])/dx)),Math.min(height-1,Math.ceil((Math.max(...t.map(p=>p[1]))-min[1])/dz))];
  const colour=kind===2?labColour(...lab).toArray().map(v=>Math.round(Math.min(1,v)*255)):null;let added=0;
  for(let z=lo[1];z<=hi[1];z++)for(let x=lo[0];x<=hi[0];x++){
   const at=z*width+x;if(owner[at]!==index+1||mask[at]===1||mask[at]===kind)continue;
   const p=[min[0]+(x+.5)*dx,min[1]+(z+.5)*dz],cross=(a,b)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
   const ds=t.map((a,j)=>cross(a,t[(j+1)%3]));if(!ds.every(v=>v>=0)&&!ds.every(v=>v<=0))continue;
   mask[at]=kind;added++;if(colour)data.set([...colour,255],at*4);
  }
  return added;
 }
 for(const[index,poly]of polygons.entries()){
  const lo=[Math.min(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1]))],hi=[Math.max(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[1]))];
  const point=()=>[lo[0]+r()*(hi[0]-lo[0]),lo[1]+r()*(hi[1]-lo[1])];
  const clumps=Array.from({length:3+Math.floor(r()*4)},()=>({p:point(),radius:.07+r()*.09}));
  const gaps=Array.from({length:3},()=>({p:point(),radius:.04+r()*.035}));
  function proposal(fine){
   let p;if(r()<.5){const c=clumps[Math.floor(r()*clumps.length)];p=[c.p[0]+gaussian(r)*c.radius,c.p[1]+gaussian(r)*c.radius];}else p=point();
   if(!insidePolygon(p,poly)||gaps.some(g=>Math.hypot(p[0]-g.p[0],p[1]-g.p[1])<g.radius))return null;
   const size=(fine?.005:.01)*(fine?2:3)**r(),angle=r()*Math.PI*2;
   let t=Array.from({length:3},(_,j)=>{const a=angle+j*Math.PI*2/3+(r()-.5)*.2;return[Math.cos(a),Math.sin(a)];});
   const diameter=Math.max(...t.flatMap(a=>t.map(b=>Math.hypot(a[0]-b[0],a[1]-b[1]))));
   t=t.map(v=>[p[0]+v[0]*size/diameter,p[1]+v[1]*size/diameter]);
   if(!t.every(v=>insidePolygon(v,poly)))return null;
   return{t,p,size,...palette()};
  }
  let covered=0,attempts=0;
  while(covered/totals[index]<.245&&attempts++<50000){
   const q=proposal(false);if(!q)continue;
   const added=mark(q.t,index,1);if(!added)continue;covered+=added;
   const unitId=id+':crushed:'+units.length,top=base+.007+r()*.002;
   pieces.push({faces:tetraSolid([...q.t.map(([x,z])=>[x,top,z]),[q.p[0],base-.006,q.p[1]]]),tier:1,lab:q.lab,material:'terracotta',unitId,featureId:id,base:base-.006,dustCoat:0});
   units.push({id:unitId,lab:q.lab,material:'terracotta',dusty:q.role==='pale-dusty',paletteRole:q.role,size:[q.size,q.size,top-base+.006],centre:[q.p[0],top,q.p[1]],course:1});
  }
  let painted=0,paintCount=0;attempts=0;
  while(painted/totals[index]<.12&&attempts++<150000){
   const q=proposal(true);if(!q)continue;
   const added=mark(q.t,index,2,q.lab);if(added){painted+=added;paintCount++;}
  }
  geometryCoverage.push(covered/totals[index]);speckleCoverage.push(painted/totals[index]);
  sampling.push({method:'seeded random, log-uniform diameters; no proposal grid',outline:poly,clumps,gaps,paintCount,paintSize:[.005,.01],geometricSize:[.01,.03],area:area(poly),rasterCell:[dx,dz]});
 }
 return{pieces,units,paint:{data,width,height,min,max},geometryCoverage,speckleCoverage,sampling};
}
