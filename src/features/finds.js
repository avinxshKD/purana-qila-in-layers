import { rng, unitLab, SOIL_LAB } from './colour.js';
import { prism, transformSolid } from './solid.js';
import { rectangle, triangulateFootprint } from './masonry.js';
import { stonePieces } from './stone.js';
import { potteryLens } from './pottery-lens.js';
export function findPieces(spec) {
 if(spec.kind==='pottery-lens')return potteryLens(spec);
 const r=rng(spec.seed??spec.id),base=spec.base??0,material=spec.material??'pgw',pieces=[],units=[];let paint;
 if(spec.kind==='modern-brick') {
  const size=spec.size??[.23,.11,.065],poly=rectangle(size[0],size[1]);
  const faces=prism(poly,base-size[2]*.5,base+size[2]*.5);
  const lab=unitLab('fired-brick',r);pieces.push({faces,tier:1,lab,material:'fired-brick',unitId:spec.id,featureId:spec.id,base:base-size[2]*.5});
  units.push({id:spec.id,lab,size,centre:[size[0]/2,base,size[1]/2],course:1});
 } else if(spec.kind==='traced-stone') {
  const poly=spec.footprint,height=spec.height??.12,lab=unitLab('stone',r);
  lab[0]=SOIL_LAB[0]-3;lab[2]=11.8; // Dark end of the accepted rubble palette, not a new hue.
  const stone=stonePieces(spec,lab);paint=stone.paint;pieces.push(...stone);
  units.push({id:spec.id,lab,size:[.4,.4,height],centre:[poly[0][0],base+height/2,poly[0][1]],course:1});
 } else {
  const count=spec.count??(material==='glass'?5:8),sizes=spec.size??[.018,.055],spread=spec.spread??[.5,.2];
  for(let i=0;i<count;i++) {
   const cx=(r()-.5)*spread[0],cz=(r()-.5)*spread[1],size=sizes[0]+r()*(sizes[1]-sizes[0]),lab=unitLab(material,r),unitId=spec.id+':'+i;
   if(material==='glass'){
    const radius=i<3?.034:.011,thick=.0025,arc=.5+r()*.8,angle=r()*Math.PI*2,height=i<3?.009:.028;
    const poly=[];
    for(let j=0;j<=4;j++){const a=angle+arc*j/4;poly.push([cx+Math.cos(a)*radius,cz+Math.sin(a)*radius]);}
    for(let j=4;j>=0;j--){const a=angle+arc*j/4;poly.push([cx+Math.cos(a)*(radius-thick),cz+Math.sin(a)*(radius-thick)]);}
    for(const t of triangulateFootprint(poly)){
      let faces=prism(t,base-.006,base+height);
      if(i>=3)faces=transformSolid(faces,([x,y,z])=>[cx-y+base+height/2,base+(x-cx)*.65+.003,z]);
      pieces.push({faces,tier:1,lab,material,unitId,featureId:spec.id,base:base-.006});
    }
    units.push({id:unitId,lab,size:[radius*2,radius*2,height],centre:[cx,base+height/2,cz],course:1});
   }else{
    const n=5+Math.floor(r()*3),angle=r()*Math.PI*2;
    const poly=Array.from({length:n},(_,j)=>{const a=angle+j/n*Math.PI*2,k=.65+r()*.35;return[cx+Math.cos(a)*size*k,cz+Math.sin(a)*size*.55*k];});
    const triangles=triangulateFootprint(poly),thick=.003+r()*.005;
    for(const t of triangles){
     // Slight curvature and a low bedding tilt, not randomly upright confetti.
     const faces=transformSolid(prism(t,base-thick*.65,base+thick*.35),([x,y,z])=>[x,y+(x-cx)*.07+(z-cz)**2*.9,z]);
     const faceLabs=faces.map(()=>null);
     if(material==='porcelain'&&r()<.35)faceLabs[1]=[37,1,-18];
     if(material==='pgw'&&i%3===0&&r()<.4)faceLabs[1]=[26,1,3];
     pieces.push({faces,tier:1,lab,faceLabs,material,unitId,featureId:spec.id,base:base-thick});
    }
    units.push({id:unitId,lab,size:[2*size,size,thick],centre:[cx,base,cz],course:1});
   }
  }
 }
 const range=spec.burial??(spec.kind==='modern-brick'?[.3,.5]:[.3,.7]);
 for(const unit of units){
  const members=pieces.filter(p=>p.unitId===unit.id),ys=members.flatMap(p=>p.faces.flat().map(v=>v[1]));
  const low=Math.min(...ys),high=Math.max(...ys),fraction=Array.isArray(range)?range[0]+r()*(range[1]-range[0]):range;
  if(!(fraction>=0&&fraction<=1))throw new Error('Find burial must be a fraction between zero and one');
  const delta=base-low-fraction*(high-low);
  for(const p of members){p.faces=transformSolid(p.faces,([x,y,z])=>[x,y+delta,z]);p.base=low+delta;p.dustCoat=spec.dustCoat??.45;}
  unit.centre[1]+=delta;unit.burial=fraction;
 }
 return {pieces,units,paint,courseCount:1,provenance:{source:'era-model.json / Fig.13 for as-drawn stones',M:spec.M??['unsourced find dimensions and scatter M; 30–70% burial (modern brick 30–50%) and exposed-face dust M; generic pigment patches M, no inferred motif']}};
}
