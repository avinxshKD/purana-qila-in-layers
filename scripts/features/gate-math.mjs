// CPU gate on actual capped geometry, including overlap rather than summed area.
export function lensFaceCoverage(handle,cell=.0005){
 const width=Math.ceil(.8/cell),height=Math.ceil(.12/cell),mask=new Uint8Array(width*height),clay=new Uint8Array(width*height);
 const triangles=[];
 for(const mesh of handle.object.children){
  const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
  for(const range of mesh.userData.unitRanges??[])for(let i=range.start;i<range.end;i+=3){
   if(n.getZ(i)<.99)continue;
   const t=[0,1,2].map(j=>[p.getX(i+j),p.getY(i+j),p.getZ(i+j)]),offset=(range.unitId?.004:.003)*Math.hypot(1,.05234);
   if(!t.every(v=>Math.abs(v[2]-.05234*v[1]-offset)<1e-6))continue;
   triangles.push({t,unit:!!range.unitId});
  }
 }
 function draw({t,unit}){
  const xs=t.map(p=>(p[0]+.4)/cell),ys=t.map(p=>(p[1]+.12)/cell);
  for(let y=Math.max(0,Math.floor(Math.min(...ys)));y<Math.min(height,Math.ceil(Math.max(...ys)));y++)for(let x=Math.max(0,Math.floor(Math.min(...xs)));x<Math.min(width,Math.ceil(Math.max(...xs)));x++){
   const d=t.map((_,j)=>{const k=(j+1)%3;return(xs[k]-xs[j])*(y+.5-ys[j])-(ys[k]-ys[j])*(x+.5-xs[j]);});
   if(!d.every(v=>v>=0)&&!d.every(v=>v<=0))continue;
   (unit?clay:mask)[y*width+x]=1;
  }
 }
 triangles.forEach(draw);let total=0,covered=0;
 for(let i=0;i<mask.length;i++)if(mask[i]){total++;covered+=clay[i];}
 return{fraction:covered/total,coveredCells:covered,lensCells:total,cellMetres:cell,method:'Union of real sherd caps over the real matrix cap in local x/y. Exact batter and separate3/4 mm cap relief; fixed raster, no colour threshold.'};
}
export function limeVisibleDustCoverage(source){
 const clip=(p,axis,value)=>{
  const out=[];for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],d=a[axis]-value,e=b[axis]-value;
   if(d>=0)out.push(a);if(d*e<0){const t=d/(d-e);out.push(a.map((x,j)=>x+(b[j]-x)*t));}}
  return out;
 },area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0))/2;
 let total=0,dust=0;
 for(const p of source.pieces)for(const f of p.faces.filter(f=>f.surface)){
  let q=clip(f.map(v=>[v[0],v[2],v[1],source.dustAt(v[0],v[2])]),2,.0001);
  if(q.length<3)continue;total+=area(q);q=clip(q,3,.5);if(q.length>=3)dust+=area(q);
 }
 return{fraction:dust/total,visibleArea:total,dustArea:dust,method:'Actual visible y>.1 mm top polygons; linearly interpolated vertex dust >=.5, with scalar clipping. Includes breaks/cracks, not just uncut mask proposals.'};
}
