import { rng, unitLab, SOIL_LAB } from './colour.js';
import { prism, transformSolid, subtractSolid, tetraSolid, intersectSolid, faceNormal, dot } from './solid.js';
import { rectangle, triangulateFootprint, clipToFootprint } from './masonry.js';
import { area, boundaryDistance, roughOutline, gridTriangles, heightSolid, surfaceNormal, noise2, smooth, dustField, clipTriangle2 } from './patch-geometry.js';
import { crushedPatches } from './crushed.js';

function jagged(cx,cz,rx,rz,r,count=15) {
 return Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2,k=.78+r()*.22;return [cx+Math.cos(a)*rx*k,cz+Math.sin(a)*rz*k];});
}
function convexHull(points){
 const p=[...points].sort((a,b)=>a[0]-b[0]||a[1]-b[1]),turn=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 const lower=[],upper=[];for(const v of p){while(lower.length>=2&&turn(lower.at(-2),lower.at(-1),v)<=0)lower.pop();lower.push(v);}
 for(const v of [...p].reverse()){while(upper.length>=2&&turn(upper.at(-2),upper.at(-1),v)<=0)upper.pop();upper.push(v);}
 return lower.slice(0,-1).concat(upper.slice(0,-1));
}
function beddedPatch(poly,base,height,lab,material,id,breaks=[],dustAt,patch=0){
 const centre=poly.reduce((a,p)=>[a[0]+p[0]/poly.length,a[1]+p[1]/poly.length],[0,0]);
 const lime=material==='lime',heightAt=(x,z)=>{
  let d=boundaryDistance([x,z],poly),breakDistance=Infinity;for(const[a,b]of breaks)breakDistance=Math.min(breakDistance,Math.abs(x-a),Math.abs(x-b));d=Math.min(d,breakDistance);
  const angle=Math.atan2(z-centre[1],x-centre[0]),apart=a=>Math.abs(Math.atan2(Math.sin(angle-a),Math.cos(angle-a)));
  const proud=lime?Math.max(1-smooth(.25,.55,apart(-Math.PI/2)),1-smooth(.2,.45,apart(Math.PI)))*smooth(.015,.04,breakDistance):0;
  return base-.003+smooth(0,lime?.14:.06,d)*((lime?.0135:.006)+noise2(x/.11,z/.11,4319)*(lime?.009:.003))+proud*(1-smooth(0,.04,d))*(.008+.015*noise2(x/.035,z/.045,2711));
 };
 return gridTriangles(poly,lime?.05:.18).map(t=>({faces:heightSolid(t,()=>base-height,heightAt),tier:1,lab,material,featureId:id,base:base-height,dustAt,dustAll:lime,bodyLab:lime?[SOIL_LAB[0]-2,.8,6]:undefined,surfaceNormal:(x,z)=>surfaceNormal(heightAt,x,z)}));
}
function brokenOutline(poly,r){
 const out=[];
 for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  let t=0;while(t<1-1e-9){
   const end=Math.min(1,t+(.01+r()*.04)/length),u=t+(end-t)*(.2+r()*.6),notch=.01+r()*.025;
   out.push([a[0]+dx*t,a[1]+dz*t],[a[0]+dx*u-dz/length*notch,a[1]+dz*u+dx/length*notch]);
   t=end;
  }
 }
 return out;
}
function roundedTile(length,r){
 let faces=prism(rectangle(length,.045,-length/2,-.0225),-.065,.065);
 const ext=[length/2,.065,.0225],radius=.011;
 for(const[a,b]of[[0,1],[0,2],[1,2]])for(const sa of[-1,1])for(const sb of[-1,1])for(const angle of[Math.PI/8,Math.PI/4,Math.PI*3/8]){
  const normal=[0,0,0],c=Math.cos(angle),s=Math.sin(angle);normal[a]=-sa*c;normal[b]=-sb*s;
  faces=intersectSolid(faces,[{normal,constant:c*ext[a]+s*ext[b]-radius*(c+s-1)}]);
 }
 for(let i=0;i<2;i++){
  const sx=r()<.5?-1:1,sz=r()<.5?-1:1,c=.25+r()*.3;
  faces=intersectSolid(faces,[{normal:[-sx,-c,-sz],constant:length/2+.0225+.065*c-(.009+r()*.009)}]);
 }
 const cx=(r()-.5)*length*.5;
 const chip=tetraSolid([[cx-.018,.078,.040],[cx+.018,.078,.040],[cx,.078,.006],[cx,.048,.018]]);
 return subtractSolid(faces,chip.map(f=>{const n=faceNormal(f);return{normal:n.map(v=>-v),constant:dot(n,f[0])};}));
}
function fragmentsIn(poly,base,count,size,r,material,id,start=0,greyFraction=0) {
 const ts=triangulateFootprint(poly),pieces=[],units=[];
 const bb={x0:Math.min(...poly.map(p=>p[0])),x1:Math.max(...poly.map(p=>p[0])),z0:Math.min(...poly.map(p=>p[1])),z1:Math.max(...poly.map(p=>p[1]))};
 for(let i=0;i<count;i++){
  const x=bb.x0+r()*(bb.x1-bb.x0),z=bb.z0+r()*(bb.z1-bb.z0),s=size[0]+r()*(size[1]-size[0]);
  const actualMaterial=greyFraction>0&&r()<greyFraction?'pgw':material;
  const outline=convexHull(jagged(x,z,s,s*(.4+r()*.3),r,5+Math.floor(r()*3))),dusty=units.length%10<7,lab=unitLab(actualMaterial,r,dusty),unitId=id+':fragment:'+(start+i);
  const faces=prism(outline,base-.012,base+.003+r()*.01);
  const clipped=clipToFootprint(faces,ts);
  if(clipped.length){for(const f of clipped)pieces.push({faces:f,tier:1,lab,material:actualMaterial,unitId,featureId:id,base:base-.012});units.push({id:unitId,lab,material:actualMaterial,dusty:actualMaterial==='brickbat'?dusty:null,size:[2*s,s,.02],centre:[x,base,z],course:1});}
 }
 return {pieces,units};
}
function fillBowl(spec,r) {
 const radius=spec.radius??.35,depth=spec.depth??.75,base=spec.base??0,cx=spec.centre?.[0]??0,cz=spec.centre?.[1]??0;
 const n=15,rings=7,pieces=[];
 const outline=jagged(cx,cz,1,1,r,n);
 for(let j=0;j<rings;j++) {
  const y0=base-depth+depth*j/rings,y1=base-depth+depth*(j+1)/rings;
  // Half-ellipsoid section: broad upper opening and a rounded U at its base.
  const rad=t=>radius*Math.sqrt(Math.max(.008,1-(1-t)**2));
  const a=rad(j/rings),b=rad((j+1)/rings);
  const outer=outline.map(([x,z])=>[cx+(x-cx)*b,cz+(z-cz)*b]);
  // One convex tapered ring segment per centre-to-rim wedge.
  for(let i=0;i<n;i++) {
   const k=(i+1)%n;
   const f=prism([[cx,cz],outer[i],outer[k]],y0,y1).map(face=>face.map(([x,y,z])=>{
    if(y===y0){const factor=a/b;return [cx+(x-cx)*factor,y,cz+(z-cz)*factor];}return[x,y,z];
   }));
   // One shared albedo and local-coordinate material across every wedge and ring:
   // the planar cut has no per-wedge colour fan and no repeated stratigraphic bands.
   pieces.push({faces:f,tier:1,lab:[SOIL_LAB[0]-7.5,SOIL_LAB[1],SOIL_LAB[2]-1],material:'fill',featureId:spec.id,base:base-depth});
  }
 }
 return pieces;
}
export function surfacePieces(spec) {
 const r=rng(spec.seed??spec.id),base=spec.base??0,pieces=[],units=[],coverage=[];
 const breaks=spec.breaks??(spec.kind==='lime-floor'?[[.58,.86],[1.94,2.19]]:[]);
 let limeDust,crushed;
 const material=spec.material??(spec.kind==='lime-floor'?'lime':spec.kind==='burnt-patches'?'burnt':'earth');
 let polygons;
 if(spec.kind==='postholes') {
  for(const centre of spec.centres??[[0,0],[.9,.05]])pieces.push(...fillBowl({...spec,centre,radius:spec.radius??.27,depth:spec.depth??.6},r));
 } else if(spec.kind==='filled-pit') {
  const f=fillBowl({...spec,radius:(spec.width??1.6)/2,depth:spec.depth??1.45},r);
  const zScale=(spec.length??1.1)/(spec.width??1.6);
  pieces.push(...f.map(p=>({...p,faces:transformSolid(p.faces,([x,y,z])=>[x,y,z*zScale])})));
 } else if(spec.kind==='tile-drain') {
  const line=spec.polyline??[[0,0],[2.4,0]],width=spec.width??.28;
  for(let seg=0;seg<line.length-1;seg++){
   const a=line[seg],b=line[seg+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
   const transform=([x,y,z])=>[a[0]+x*dx-z*dz,y,a[1]+x*dz+z*dx];
   const earth=prism(rectangle(length,width+.24,0,-width/2-.12),base-.045,base+.0015);
   pieces.push({faces:transformSolid(earth,transform),tier:1,lab:[SOIL_LAB[0]-3.5,SOIL_LAB[1],SOIL_LAB[2]],material:'earth',featureId:spec.id,base:base-.045});
   for(const side of [-1,1])for(let x=0;x<length;x+=.315){
    const l=Math.min(.3,length-x),z=side*width/2-(side<0?.045:0);
    const dusty=units.length%10<7,lab=unitLab('terracotta',r,dusty),unitId=spec.id+':tile:'+side+':'+x;
    const tilt=(1+r()*2)*(r()<.5?-1:1),angle=tilt*Math.PI/180,yaw=(r()-.5)*3*Math.PI/180,offset=[(r()-.5)*.008,(r()-.5)*.004,(.011+r()*.008)*(r()<.5?-1:1)];
    let tileParts=roundedTile(l,r);
    const broken=units.length===2||units.length===11;
    if(broken)tileParts=tileParts.map(faces=>intersectSolid(faces,[{normal:[-1,-.27,.42],constant:l/2-.035}])).filter(f=>f.length);
    const place=([px,py,pz])=>{const xx=px*Math.cos(angle)-py*Math.sin(angle),yy=px*Math.sin(angle)+py*Math.cos(angle);return transform([x+l/2+offset[0]+xx*Math.cos(yaw)-pz*Math.sin(yaw),base+.04+offset[1]+yy,z+.0225+offset[2]+xx*Math.sin(yaw)+pz*Math.cos(yaw)]);};
    const centre=place([0,0,0]);
    for(const faces of tileParts)pieces.push({faces:transformSolid(faces,place),tier:2,lab,material:'terracotta',unitId,featureId:spec.id,base:base-.045,finish:[2,centre[1]],dustCoat:0});
    if(x>0){const joint=prism(rectangle(.019,.045,x-.016,z),base-.025,base+.087);pieces.push({faces:transformSolid(joint,transform),tier:2,lab:SOIL_LAB,material:'earth',featureId:spec.id,base:base-.045});}
    units.push({id:unitId,lab,material:'terracotta',dusty,size:[l,.045,.13],centre,course:2,tiltDegrees:tilt,displacement:offset,brokenEnd:broken});
   }
  }
 } else {
  polygons=spec.patches??(spec.footprint?[spec.footprint]:
   spec.kind==='lime-floor'?[jagged(.55,0,.7,.52,r,19),jagged(2.05,.06,.65,.46,r,18)]:
   spec.kind==='brick-jelly-floor'?[jagged(.55,0,.66,.48,r,17),jagged(1.95,.08,.58,.4,r,16)]:
   spec.kind==='burnt-patches'?[jagged(.3,0,.4,.23,r,17),jagged(1.2,.16,.23,.16,r,14),jagged(1.85,-.13,.36,.22,r,16)]:
   [jagged(1.35,0,1.4,.48,r,21)]);
  if(spec.kind==='lime-floor')polygons=polygons.map(p=>brokenOutline(p,r));
  else if(['brick-jelly-floor','pottery-lane'].includes(spec.kind))polygons=polygons.map(p=>roughOutline(p,r));
  if(spec.kind==='brick-jelly-floor')crushed=crushedPatches(polygons,base,r,spec.id);
  if(spec.kind==='lime-floor'){const ts=polygons.flatMap(p=>gridTriangles(p,.05)).filter(t=>!breaks.some(([a,b])=>{const x=t.reduce((s,p)=>s+p[0],0)/3;return x>a&&x<b;}));limeDust=dustField(ts,.3,true);}
  for(const [i,poly] of polygons.entries()) {
   const height=spec.height??(spec.kind==='lime-floor'?.075:spec.kind==='burnt-patches'?.025:.03);
   const lab=spec.kind==='brick-jelly-floor'?[SOIL_LAB[0]+2,SOIL_LAB[1]+2,SOIL_LAB[2]-1]:
     spec.kind==='lime-floor'?[55,.8,3.5]:
     spec.kind==='pottery-lane'?SOIL_LAB:unitLab(material,r);
   if(spec.kind==='burnt-patches'){
    const centre=poly.reduce((p,q)=>[p[0]+q[0]/poly.length,p[1]+q[1]/poly.length],[0,0]);
    for(let j=0;j<poly.length;j++){
     const t=[centre,poly[j],poly[(j+1)%poly.length]];
     const faces=prism(t,base,base+height).map(f=>f.map(([x,y,z])=>[x,y>base?(x===centre[0]&&z===centre[1]?base+height:base+.001):y,z]));
     pieces.push({faces,tier:1,lab,material,featureId:spec.id,base,fadeCentre:centre});
    }
   }else{
    const matrix=beddedPatch(poly,base,height,lab,material,spec.id,breaks,limeDust?.at,i);
    if(crushed)for(const p of matrix)p.finish=[1,0];
    pieces.push(...matrix);
   }
   if(spec.kind==='brick-jelly-floor'){
    coverage.push(crushed.geometryCoverage[i]+crushed.speckleCoverage[i]);
   }
   if(spec.kind==='lime-floor'){
    // Detached, angular body crumbs concentrated along two broken stretches.
    for(let j=0;j<10;j++){
     const at=Math.floor((j/10*.4+(i?.5:.1))*poly.length/2)*2%poly.length,a=poly[at],b=poly[(at+1)%poly.length],s=.01+r()*.03,angle=r()*Math.PI*2;
     const len=Math.hypot(b[0]-a[0],b[1]-a[1]),c=[a[0]+(b[1]-a[1])/len*(.02+s),a[1]-(b[0]-a[0])/len*(.02+s)],top=base+.004+r()*.005;
     const tri=Array.from({length:3},(_,k)=>[c[0]+Math.cos(angle+k*Math.PI*2/3)*s/Math.sqrt(3),c[1]+Math.sin(angle+k*Math.PI*2/3)*s/Math.sqrt(3)]);
     pieces.push({faces:heightSolid(tri,()=>base-.008,()=>top),tier:1,lab,material:'lime',featureId:spec.id,base:base-.008,dustAt:limeDust?.at,dustAll:true,bodyLab:[SOIL_LAB[0]-2,.8,6]});
    }
   }
   if(spec.kind==='pottery-lane') {
    const f=fragmentsIn(poly,base+.003,70,[.02,.055],r,'brickbat',spec.id,i*100,.2);
    pieces.push(...f.pieces);units.push(...f.units);
   }
   if(spec.kind==='burnt-patches') {
    const f=fragmentsIn(poly,base+height,16,[.006,.018],r,'burnt',spec.id,i*100);pieces.push(...f.pieces);units.push(...f.units);
   }
  }
  if(crushed){pieces.push(...crushed.pieces);units.push(...crushed.units);}
  if(spec.kind==='lime-floor'){
   const cuts=[];
   for(let patch=0;patch<2;patch++)for(let crack=0;crack<3;crack++){
    const plate=crack===0&&patch===0,cx=plate?.2:(patch?1.55:-.01)+crack*.13,cz=plate?-.7:-.32+crack*.22,w=plate?.009:.002+r()*.003;
    for(let j=0;j<(plate?16:4);j++){
     const z=cz+j*.09,x=cx+.015*Math.sin(j*1.7+crack);
     const zz=z+.095,xx=cx+.015*Math.sin((j+1)*1.7+crack),dx=xx-x,dz=zz-z,len=Math.hypot(dx,dz);
     cuts.push({normal:[-dz/len,0,dx/len],constant:(x*dz-z*dx)/len+w/2});
     const planes=[cuts.pop(),{normal:[dz/len,0,-dx/len],constant:-(x*dz-z*dx)/len+w/2},{normal:[dx/len,0,dz/len],constant:-(x*dx+z*dz)/len},{normal:[-dx/len,0,-dz/len],constant:(xx*dx+zz*dz)/len}];
     const next=pieces.flatMap(p=>{
      const v=p.faces.flat();
      if(Math.max(...v.map(p=>p[0]))<Math.min(x,xx)-w||Math.min(...v.map(p=>p[0]))>Math.max(x,xx)+w||Math.max(...v.map(p=>p[2]))<z-w||Math.min(...v.map(p=>p[2]))>zz+w||!intersectSolid(p.faces,planes).length)return[p];
      return subtractSolid(p.faces,planes).map(faces=>({...p,faces}));
     });pieces.splice(0,pieces.length,...next);
    }
   }
  }
 }
 if(breaks.length) {
  for(const [a,b]of breaks){
   const next=pieces.flatMap(p=>subtractSolid(p.faces,[{normal:[1,0,0],constant:-a},{normal:[-1,0,0],constant:b}]).map(faces=>({...p,faces})));
   pieces.splice(0,pieces.length,...next);
  }
 }
 return {pieces,units,paint:crushed?.paint,dustAt:limeDust?.at,measurements:{crushedCoverage:coverage,geometryCoverage:crushed?.geometryCoverage,speckleCoverage:crushed?.speckleCoverage,sampling:crushed?.sampling,limeDustCoverage:limeDust?.coverage},courseCount:spec.kind==='tile-drain'?2:1,provenance:{source:'era-model.json',M:spec.M??['unknown footprint, thickness, fragment sizes, fill profile, dust and packing are modelling decisions']}};
}
