import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import {buildEraFeature,eraFeatureSpec} from '../../src/features/index.js';
import {surfacePieces} from '../../src/features/surfaces.js';
import {insidePolygon} from '../../src/features/patch-geometry.js';
const root=path.resolve(import.meta.dirname,'../..'),base=path.join(root,'output/lookdev/features'),ff=path.join(root,'tools/ffmpeg/bin/ffmpeg.exe');
const folders=[process.argv[2]??'k2d-final',process.argv[3]??'k3d-final'];
const linear=v=>v/255<=.04045?v/255/12.92:((v/255+.055)/1.055)**2.4,F=v=>v>.008856?Math.cbrt(v):7.787*v+16/116;
function lab(rgb){const[r,g,b]=rgb.map(linear),x=F((.4124*r+.3576*g+.1805*b)/.95047),y=F(.2126*r+.7152*g+.0722*b),z=F((.0193*r+.1192*g+.9505*b)/1.08883);return[116*y-16,500*(x-y),200*(y-z)];}
function stats(rows){
 const weight=rows.reduce((s,p)=>s+(p.weight??1),0),mean=[0,1,2].map(j=>rows.reduce((s,p)=>s+p.Lab[j]*(p.weight??1),0)/weight);
 return{n:rows.length,weight,L:mean[0],a:mean[1],b:mean[2],C:Math.hypot(mean[1],mean[2]),sdL:Math.sqrt(rows.reduce((s,p)=>s+(p.Lab[0]-mean[0])**2*(p.weight??1),0)/weight)};
}
function image(folder,name,width,height){
 const file=path.join(base,folder,name+'.png'),rgb=execFileSync(ff,['-v','error','-i',file,'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:100*1024*1024});
 return{file,width,height,pixel:(x,y)=>lab([...rgb.subarray((y*width+x)*3,(y*width+x)*3+3)])};
}
function camera(c){const a=new THREE.PerspectiveCamera(c.fov,c.aspect,c.near,c.far);a.position.fromArray(c.position);a.lookAt(new THREE.Vector3().fromArray(c.target));a.updateProjectionMatrix();a.updateMatrixWorld();return a;}
function projector(cam,img){return p=>{const q=new THREE.Vector3(...p).project(cam);return[(q.x+1)/2*img.width,(1-q.y)/2*img.height];};}
function host(h){
 const b=h.bounds,pad=.48,g=new THREE.BoxGeometry(b.max.x-b.min.x+pad,.16,b.max.z-b.min.z+pad);g.translate((b.min.x+b.max.x)/2,-.08,(b.min.z+b.max.z)/2);
 return new THREE.Mesh(g,new THREE.MeshBasicMaterial());
}
function unitAt(hit){
 const r=hit?.object.userData.unitRanges?.find(r=>hit.faceIndex*3>=r.start&&hit.faceIndex*3<r.end);return r?.unitId;
}
const reports=folders.map(folder=>JSON.parse(fs.readFileSync(path.join(base,folder,'capture-stats.json'),'utf8')));
const gate={method:'CPU projection/rays into unchanged PNGs. Lab D65 from decoded sRGB. No brightness selection, postgrading or geometry enlargement.',gupta:[],drain:[],stones:[]};
const source=surfacePieces(eraFeatureSpec('gupta-floor')),poly=source.measurements.sampling[0].outline;
for(const[name,entry]of Object.entries(reports[0]).filter(([name])=>name.startsWith('gupta-'))){
 const img=image(folders[0],name,entry.width,entry.height),cam=camera(entry.cameras[0]),screen=poly.map(p=>projector(cam,img)([p[0],.004,p[1]])),rows=[];
 const x0=Math.floor(Math.min(...screen.map(p=>p[0]))),x1=Math.ceil(Math.max(...screen.map(p=>p[0]))),y0=Math.floor(Math.min(...screen.map(p=>p[1]))),y1=Math.ceil(Math.max(...screen.map(p=>p[1])));
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
  let n=0;for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++)if(insidePolygon([x+(sx+.5)/4,y+(sy+.5)/4],screen))n++;
  if(n)rows.push({x,y,weight:n/16,Lab:img.pixel(x,y)});
 }
 gate.gupta.push({image:name,ppm:entry.cameras[0].ppm,orbitDegrees:entry.cameras[0].orbit,...stats(rows),projectedOutline:screen,samples:rows});
 const crop=path.join(base,folders[0],name+'-native.png');
 if(fs.existsSync(crop))gate.gupta.at(-1).nativeCropReused=true;
 else execFileSync(ff,['-v','error','-i',img.file,'-vf',`crop=${x1-x0+5}:${y1-y0+5}:${x0-2}:${y0-2}`,crop]);
}
const means=gate.gupta.filter(p=>p.ppm===20).map(p=>p.L);gate.guptaOrbitSpanL=Math.max(...means)-Math.min(...means);
{
 const h=buildEraFeature('mauryan-drain'),soil=host(h),img=image(folders[0],'drain-1080',1920,1080),cam=camera((reports[0]['drain-2160']??reports[0]['drain-1080']).cameras[0]),project=projector(cam,img),candidates=new Map();
 const objects=[...h.object.children,soil];objects.forEach(m=>m.updateMatrixWorld(true));
 for(const m of h.object.children){
  const p=m.geometry.attributes.position,n=m.geometry.attributes.normal;
  for(const r of m.userData.unitRanges??[])if(r.unitId)for(let i=r.start;i<r.end;i+=3){
   if(n.getZ(i)<.94||Math.abs(n.getY(i))>.12||Math.abs(n.getX(i))>.35)continue;
   const t=[0,1,2].map(j=>project([p.getX(i+j),p.getY(i+j),p.getZ(i+j)])),a=Math.abs((t[1][0]-t[0][0])*(t[2][1]-t[0][1])-(t[1][1]-t[0][1])*(t[2][0]-t[0][0]));
   if(!candidates.has(r.unitId))candidates.set(r.unitId,{id:r.unitId,area:0,triangles:[]});
   const c=candidates.get(r.unitId);c.area+=a;c.triangles.push(t);
  }
 }
 const selected=[...candidates.values()].sort((a,b)=>b.area-a.area).slice(0,3),ray=new THREE.Raycaster();
 for(const c of selected){
  const pts=c.triangles.flat(),x0=Math.ceil(Math.min(...pts.map(p=>p[0]))),x1=Math.floor(Math.max(...pts.map(p=>p[0]))),y0=Math.ceil(Math.min(...pts.map(p=>p[1]))),y1=Math.floor(Math.max(...pts.map(p=>p[1]))),rows=[];
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   if(![-2,2].every(dx=>[-2,2].every(dy=>c.triangles.some(t=>insidePolygon([x+.5+dx,y+.5+dy],t)))))continue;
   ray.setFromCamera(new THREE.Vector2((x+.5)/img.width*2-1,1-(y+.5)/img.height*2),cam);
   const hit=ray.intersectObjects(objects,false)[0];if(unitAt(hit)!==c.id)continue;
   rows.push({x,y,Lab:img.pixel(x,y)});
  }
  gate.drain.push({id:c.id,image:'drain-1080',...stats(rows),method:'Three largest eligible front faces, selected by projected geometry, >2 px eroded mask, real camera/soil ray visibility. All retained pixels; no value filtering.',samples:rows});
 }
 h.dispose();soil.geometry.dispose();soil.material.dispose();
}
for(const[id,name]of[['pillar-base-as-drawn','pillar-base'],['top-left-stone-as-drawn','top-left-stone']]){
 const h=buildEraFeature(id),soil=host(h),img=image(folders[1],name+'-1080',1920,1080),cam=camera(reports[1][name+'-2160'].cameras[0]),project=projector(cam,img),ray=new THREE.Raycaster(),rows=[],controls=[];
 // The K3 support padding is .1, not .48.
 soil.geometry.dispose();soil.geometry=new THREE.BoxGeometry(h.bounds.max.x-h.bounds.min.x+.1,.16,h.bounds.max.z-h.bounds.min.z+.1);
 soil.geometry.translate((h.bounds.min.x+h.bounds.max.x)/2,-.08,(h.bounds.min.z+h.bounds.max.z)/2);
 const objects=[...h.object.children,soil];objects.forEach(m=>m.updateMatrixWorld(true));
 const corners=[h.bounds.min.x,h.bounds.max.x].flatMap(x=>[h.bounds.min.z,h.bounds.max.z].flatMap(z=>[0,h.bounds.max.y].map(y=>project([x,y,z]))));
 const lo=[Math.floor(Math.min(...corners.map(p=>p[0]))),Math.floor(Math.min(...corners.map(p=>p[1])))],hi=[Math.ceil(Math.max(...corners.map(p=>p[0]))),Math.ceil(Math.max(...corners.map(p=>p[1])))];
 for(let y=lo[1];y<=hi[1];y+=8)for(let x=lo[0];x<=hi[0];x+=8){
  ray.setFromCamera(new THREE.Vector2((x+.5)/1920*2-1,1-(y+.5)/1080*2),cam);const hit=ray.intersectObjects(objects,false)[0];
  if(unitAt(hit)!==id||hit.face.normal.y<.95||hit.point.y<.001)continue;
  rows.push({x,y,Lab:img.pixel(x,y)});
 }
 for(const dx of[.015,.027,.039])for(const f of[.25,.5,.75]){
  const p=project([h.bounds.max.x+dx,0,h.bounds.min.z+(h.bounds.max.z-h.bounds.min.z)*f]),x=Math.round(p[0]),y=Math.round(p[1]);
  ray.setFromCamera(new THREE.Vector2((x+.5)/1920*2-1,1-(y+.5)/1080*2),cam);if(ray.intersectObjects(objects,false)[0]?.object!==soil)continue;
  for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)controls.push({x:x+i,y:y+j,Lab:img.pixel(x+i,y+j)});
 }
 const s=stats(rows),t=stats(controls);gate.stones.push({id,image:name+'-1080',stone:s,soil:t,deltaL:s.L-t.L,deltaC:s.C-t.C,method:'Fixed8 px screen grid, actual visible near-horizontal stone top only. Nine fixed lit-side soil controls,3x3 pixels each. No brightness selection.',samples:rows,soilSamples:controls});
 h.dispose();soil.geometry.dispose();soil.material.dispose();
}
gate.pass={guptaOrbit:means.length===3&&gate.guptaOrbitSpanL<=1.5,drain:gate.drain.length===3&&gate.drain.every(p=>p.n>30&&p.sdL>=3&&p.sdL<=5),stones:gate.stones.every(p=>p.stone.n>30&&Math.abs(p.deltaL)>=4&&p.deltaC<=-3)};
for(let i=0;i<2;i++)fs.writeFileSync(path.join(base,folders[i],'d-render-gates.json'),JSON.stringify(gate,null,2),{flag:'wx'});
console.log(JSON.stringify({gupta:gate.gupta.map(({image,L,ppm,orbitDegrees,n})=>({image,L,ppm,orbitDegrees,n})),spanL:gate.guptaOrbitSpanL,drain:gate.drain.map(({id,n,sdL})=>({id,n,sdL})),stones:gate.stones.map(({id,deltaL,deltaC})=>({id,deltaL,deltaC})),pass:gate.pass},null,2));
if(!Object.values(gate.pass).every(Boolean))process.exitCode=1;
