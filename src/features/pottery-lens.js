import { rng, unitLab, SOIL_LAB } from './colour.js';
import { gridTriangles, heightSolid, noise2, smooth } from './patch-geometry.js';
import { prism, transformSolid } from './solid.js';
import { triangulateFootprint, clipToFootprint } from './masonry.js';
export function potteryLens(spec){
 const r=rng(spec.seed??spec.id),base=spec.base??0,width=spec.width??.8,length=spec.length??.3,depth=spec.height??.12,pieces=[],units=[];
 const poly=Array.from({length:28},(_,i)=>[Math.cos(i/28*Math.PI*2)*width/2,Math.sin(i/28*Math.PI*2)*length/2]),footprint=triangulateFootprint(poly);
 const half=(x,z)=>depth/2*Math.sqrt(Math.max(0,1-(x/(width/2))**2-(z/(length/2))**2))*(.9+.1*noise2(x/.06,z/.05,713));
 // Retain the true 12 cm centre while keeping a softly ragged envelope.
 const triangles=gridTriangles(poly,.025),scale=depth/2/Math.max(...triangles.flatMap(t=>t.map(p=>half(...p)))),envelope=(x,z)=>half(x,z)*scale;
 for(const t of triangles)pieces.push({faces:heightSolid(t,(x,z)=>base-depth/2-envelope(x,z),(x,z)=>base-depth/2+envelope(x,z)),tier:1,lab:[SOIL_LAB[0]-4,.5,8],material:'earth',featureId:spec.id,base:base-depth,dustAll:true,dustAt:(x,z,y)=>smooth(.7,.99,(x/(width/2))**2+(z/(length/2))**2+((y-base+depth/2)/(depth/2))**2)});
 for(let i=0;i<(spec.count??850);i++){
  const angle=r()*Math.PI*2,rad=Math.sqrt(r())*.88,cx=Math.cos(angle)*width/2*rad,cz=Math.sin(angle)*length/2*rad,shardLength=.02+r()*.04,breadth=.018+r()*.014,turn=(r()-.5)*.45;
  const outline=[[-.5,-.5],[.5,-.4],[.45,.5],[-.5,.4]].map(([x,z])=>[cx+x*shardLength*Math.cos(turn)-z*breadth*Math.sin(turn),cz+x*shardLength*Math.sin(turn)+z*breadth*Math.cos(turn)]);
  const thick=.005+r()*.005,tilt=r()<.2?(r()-.5)*.32:(r()-.5)*.08,limit=Math.max(0,Math.min(...outline.map(p=>envelope(...p)))-thick/2-.006),cy=base-depth/2+(r()*2-1)*limit;
  const material=i%4===0?'pgw':'terracotta',lab=material==='pgw'?[43+r()*10,.5,4]:[45+r()*12,8+r()*7,14+r()*7],unitId=spec.id+':sherd:'+i;
  const faces=transformSolid(prism(outline,cy-thick/2,cy+thick/2),([x,y,z])=>[x,y+(x-cx)*tilt,z]);
  pieces.push({faces,tier:1,lab,material,unitId,featureId:spec.id,base:base-depth,dustCoat:.08,relief:.004});
  units.push({id:unitId,lab,material,dusty:false,size:[shardLength,breadth,thick],centre:[cx,cy,cz],course:1});
 }
 return {pieces,units,courseCount:1,provenance:{source:'era-model.json',M:spec.M??['.8 × .3 m lens, .12 m central thickness thinning to irregular soft edges; density, true-size terracotta/grey sherds, soil matrix and packing M']}};
}
