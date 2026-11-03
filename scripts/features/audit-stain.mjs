// CPU-only audit of the existing, unfiltered drain face masks.
import fs from 'node:fs';
import path from 'node:path';
import * as T from 'three';
import {buildEraFeature} from '../../src/features/index.js';
const dir=path.resolve(import.meta.dirname,'../../output/lookdev/features',process.argv[2]??'k2e-final');
const gate=JSON.parse(fs.readFileSync(path.join(dir,'d-render-gates.json'),'utf8')),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture-stats.json'),'utf8')),c=(capture['drain-1080']??capture['drain-2160']).cameras[0];
const cam=new T.PerspectiveCamera(c.fov,c.aspect,c.near,c.far);cam.position.fromArray(c.position);cam.lookAt(new T.Vector3().fromArray(c.target));cam.updateProjectionMatrix();cam.updateMatrixWorld();
const h=buildEraFeature('mauryan-drain'),ray=new T.Raycaster(),bands=[];
for(const row of gate.drain){
 let largest;
 for(const m of h.object.children){const p=m.geometry.attributes.position,n=m.geometry.attributes.normal;
  for(const r of m.userData.unitRanges??[])if(r.unitId===row.id)for(let i=r.start;i<r.end;i+=3){
   if(n.getZ(i)<.94||Math.abs(n.getY(i))>.12||Math.abs(n.getX(i))>.35)continue;
   const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),d=new T.Vector3().fromBufferAttribute(p,i+2),area=b.clone().sub(a).cross(d.clone().sub(a)).length();
   if(!largest||area>largest.area)largest={area,plane:new T.Plane().setFromNormalAndCoplanarPoint(new T.Vector3().fromBufferAttribute(n,i),a)};
  }
 }
 const samples=row.samples.map(s=>{ray.setFromCamera(new T.Vector2((s.x+.5)/1920*2-1,1-(s.y+.5)/1080*2),cam);return{...s,yWorld:ray.ray.intersectPlane(largest.plane,new T.Vector3()).y};});
 const lo=Math.min(...samples.map(s=>s.yWorld)),hi=Math.max(...samples.map(s=>s.yWorld)),lower=samples.filter(s=>s.yWorld<lo+(hi-lo)/3),upper=samples.filter(s=>s.yWorld>hi-(hi-lo)/3),mean=a=>a.reduce((q,s)=>q+s.Lab[0],0)/a.length;
 bands.push({id:row.id,visibleY:[lo,hi],lowerN:lower.length,upperN:upper.length,lowerThirdL:mean(lower),upperThirdL:mean(upper),upperMinusLower:mean(upper)-mean(lower)});
}
h.dispose();
const result={method:'Same unfiltered, eroded, visible face pixels used in d-render-gates. Recover world-Y via the actual camera and each largest front-face plane. Compare complete lower/upper thirds of the visible world-Y range. No value-based selection.',caveat:'Mottling is included; this does not isolate the stain term. The result tests a whole-visible-band reading of the requested5–10 L separation, not its darkest local peak.',bands,meetsWholeBand5to10:bands.every(b=>b.upperMinusLower>=5&&b.upperMinusLower<=10)};
fs.writeFileSync(path.join(dir,'drain-stain-audit.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result,null,2));
