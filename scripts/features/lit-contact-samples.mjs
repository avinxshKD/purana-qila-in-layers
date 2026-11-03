// Reproject broad, unshadowed top faces into an existing image. No browser or GPU.
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {buildEraFeature} from '../../src/features/index.js';
const root=path.resolve(import.meta.dirname,'../..'),base=path.join(root,'output/lookdev/features');
const source=path.join(base,process.argv[2]??'k1e-r2'),out=path.join(base,process.argv[3]??'k1e-r2-lit-samples');
if(fs.existsSync(out))throw new Error('Use a new supplement folder');
const contact=JSON.parse(fs.readFileSync(path.join(source,'capture-stats.json'),'utf8')).contact;
const id='post-gupta-wall-ns',group=contact.samples.find(s=>s.id===id),h=buildEraFeature(id);
const centre=h.bounds.getCenter(new THREE.Vector3()),size=h.bounds.getSize(new THREE.Vector3()),theta=35*Math.PI/180,elevation=27*Math.PI/180;
const target=centre.clone();target.y=Math.max(.05,centre.y*.9);
const projectedWidth=size.x*Math.cos(theta)+size.z*Math.sin(theta),projectedHeight=size.y*Math.cos(elevation)+(size.x*Math.sin(theta)+size.z*Math.cos(theta))*Math.sin(elevation);
const panelWidth=contact.width/3,panelHeight=contact.height/3,distance=Math.max(projectedWidth/(panelWidth/panelHeight),projectedHeight)*.64/Math.tan(12.5*Math.PI/180)+.5;
const camera=new THREE.PerspectiveCamera(25,panelWidth/panelHeight,.1,180);
camera.position.set(target.x+distance*Math.cos(elevation)*Math.sin(theta),target.y+distance*Math.sin(elevation),target.z+distance*Math.cos(elevation)*Math.cos(theta));
camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();h.object.updateMatrixWorld(true);
const project=p=>{const q=p.clone().project(camera);return{x:panelWidth*2+(q.x+1)/2*panelWidth,y:panelHeight+(1-q.y)/2*panelHeight};};
const ray=new THREE.Raycaster(),key=new THREE.Vector3(20,34,44),candidates=new Map(),metadata=new Map(h.stats.unitColours.map(u=>[u.id,u]));
const contains=(q,a,b,c)=>{
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
 const d=[cross(a,b,q),cross(b,c,q),cross(c,a,q)];return d.every(v=>v>=-1e-6)||d.every(v=>v<=1e-6);
};
for(const mesh of h.object.children){
 const pos=mesh.geometry.attributes.position,nor=mesh.geometry.attributes.normal;
 for(const range of mesh.userData.unitRanges??[]){
  if(!range.unitId)continue;
  for(let i=range.start;i<range.end;i+=3){
   const n=new THREE.Vector3().fromBufferAttribute(nor,i);if(n.y<.999)continue;
   const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,i+j)),p=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3);
   const direction=p.clone().sub(camera.position);ray.set(camera.position,direction.clone().normalize());ray.far=direction.length()+.001;
   const hits=ray.intersectObjects(h.object.children,false);if(!hits.length||Math.abs(hits[0].distance-direction.length())>.001)continue;
   const toKey=key.clone().sub(p),origin=p.clone().addScaledVector(n,.002);ray.set(origin,toKey.clone().normalize());ray.far=toKey.length();
   if(ray.intersectObjects(h.object.children,false).length)continue;
   const screen=project(p),points=v.map(project);
   if(screen.y>panelHeight*2-60)continue; // HTML captions cover the bottom of this panel.
   if(![-1.5,1.5].every(x=>[-1.5,1.5].every(y=>contains({x:screen.x+x,y:screen.y+y},...points))))continue;
   const area=Math.abs((points[1].x-points[0].x)*(points[2].y-points[0].y)-(points[1].y-points[0].y)*(points[2].x-points[0].x));
   if(!candidates.has(range.unitId)||area>candidates.get(range.unitId).area)candidates.set(range.unitId,{area,...screen,normal:n.toArray()});
  }
 }
}
group.units=[...candidates].map(([id,p])=>({id,x:p.x,y:p.y,dusty:metadata.get(id)?.dusty??null,material:metadata.get(id)?.material??null}));
group.soil=project(new THREE.Vector3(h.bounds.max.x+.15,0,centre.z));
group.sampleMethod='CPU reprojected actual top-face triangle centroids: normal.y>.999, camera-visible, unshadowed by key-light ray, 3x3 square wholly inside projected triangle and outside HTML caption. Soil is a lit horizontal top face to the right of the wall. No image edit or re-render.';
fs.mkdirSync(out,{recursive:true});fs.copyFileSync(path.join(source,'contact.png'),path.join(out,'contact.png'));
fs.writeFileSync(path.join(out,'capture-stats.json'),JSON.stringify({contact},null,2));
fs.writeFileSync(path.join(out,'sample-provenance.json'),JSON.stringify({sourceImage:path.relative(root,path.join(source,'contact.png')),id,selectedUnits:group.units.length,soil:group.soil,method:group.sampleMethod},null,2));
console.log(JSON.stringify({out,selectedUnits:group.units.length,soil:group.soil}));
h.dispose();
