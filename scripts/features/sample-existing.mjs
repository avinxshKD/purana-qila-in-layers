// CPU-only measurements of actual visible, sufficiently large surfaces in saved PNGs.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import * as THREE from 'three';
import {buildEraFeature,eraFeatureSpec} from '../../src/features/index.js';
import {surfacePieces} from '../../src/features/surfaces.js';
const root=path.resolve(import.meta.dirname,'../..'),out=path.join(root,'output/lookdev/features',process.argv[2]),batch=process.argv[3];
if(!['k2','k3'].includes(batch))throw new Error('Use k2 or k3');
const target=path.join(out,'surface-metrics.json');if(fs.existsSync(target))throw new Error('Surface evidence already exists');
const captures=JSON.parse(fs.readFileSync(path.join(out,'capture-stats.json'),'utf8')),report={},raw=[];
const ff=path.join(root,'tools/ffmpeg/bin/ffmpeg.exe'),ps=path.join(root,'output/review/look-stats/colour.ps1');
const lin=v=>v/255<=.04045?v/255/12.92:((v/255+.055)/1.055)**2.4,F=t=>t>.008856?Math.cbrt(t):7.787*t+16/116;
function lab(rgb){const[r,g,b]=rgb.map(lin),x=F((.4124*r+.3576*g+.1805*b)/.95047),y=F(.2126*r+.7152*g+.0722*b),z=F((.0193*r+.1192*g+.9505*b)/1.08883);return[116*y-16,500*(x-y),200*(y-z)];}
function stats(rows){if(!rows.length)return{n:0};const m=[0,1,2].map(i=>rows.reduce((s,r)=>s+r[i],0)/rows.length);return{n:rows.length,L:m[0],a:m[1],b:m[2],C:Math.hypot(m[1],m[2]),sdL:Math.sqrt(rows.reduce((s,r)=>s+(r[0]-m[0])**2,0)/rows.length)};}
function inside(p,a,b,c){const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),d=[cross(a,b,p),cross(b,c,p),cross(c,a,p)];return d.every(v=>v>=0)||d.every(v=>v<=0);}
function box(x0,x1,y0,y1,z0,z1,shear=false){
 const g=new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0);g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);
 if(shear)g.applyMatrix4(new THREE.Matrix4().set(1,0,0,0,0,1,0,0,0,.05234,1,0,0,0,0,1));
 return new THREE.Mesh(g,new THREE.MeshBasicMaterial());
}
const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7);
const ids=process.argv.find(a=>a.startsWith('--ids='))?.slice(6).split(',');
for(const[name,entry]of Object.entries(captures).filter(([name])=>!only||name===only)){
 if(entry.cameras?.some(c=>c.ppm))continue; // Scale views have a separate fixed-footprint gate.
 const image=path.join(out,name+'.png'),rgb=execFileSync(ff,['-v','error','-i',image,'-f','rawvideo','-pix_fmt','rgb24','-'],{maxBuffer:100*1024*1024}),groups=[],regions=[];
 const pixel=point=>{const rows=[];for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){const at=((Math.round(point.y)+y)*entry.width+Math.round(point.x)+x)*3;rows.push(lab([...rgb.subarray(at,at+3)]));}const s=stats(rows);return[s.L,s.a,s.b];};
 for(const[groupIndex,group]of entry.samples.entries()){
  if(ids&&!ids.includes(group.id))continue;
  if(batch==='k2'&&group.id==='mauryan-drain')continue; // Face variance belongs to measure-d, not this top-face sampler.
  const spec=eraFeatureSpec(group.id),defaultMaterial=spec.material??(spec.kind==='modern-brick'?'fired-brick':spec.kind==='traced-stone'?'stone':spec.kind);
  const lime=spec.kind==='lime-floor',dustAt=lime?surfacePieces(spec).dustAt:null;
  const h=buildEraFeature(group.id),bb=h.bounds.clone(),centre=bb.getCenter(new THREE.Vector3()),size=bb.getSize(new THREE.Vector3()),fill=['rajput-postholes','rajput-sealed-pit','rajput-pottery-dump'].includes(group.id),hosts=[];
  if(fill){h.setCuts({keep:[{normal:[0,.05234,-1],constant:0}]});size.y=-bb.min.y;centre.y=-size.y/2;
   const wide=size.x+.45,deep=size.z+.25;for(let j=0;j<3;j++)hosts.push(box(centre.x-wide/2,centre.x+wide/2,-size.y*(j+1)/3,-size.y*j/3,-deep/2,0,true));
  }else{const pad=['traced-stone','modern-brick','sherd-scatter'].includes(spec.kind)?.1:.48;hosts.push(box(bb.min.x-pad/2,bb.max.x+pad/2,-.16,0,bb.min.z-pad/2,bb.max.z+pad/2));}
  const cols=entry.columns??(name==='contact'?3:1),rows=Math.ceil(entry.samples.length/cols),w=entry.width/cols,hh=entry.height/rows,left=groupIndex%cols*w,top=Math.floor(groupIndex/cols)*hh;
  const theta=35*Math.PI/180,elevation=27*Math.PI/180,target=centre.clone();if(!fill)target.y=Math.max(.05,centre.y*.9);
  const pw=size.x*Math.cos(theta)+size.z*Math.sin(theta),ph=size.y*Math.cos(elevation)+(size.x*Math.sin(theta)+size.z*Math.cos(theta))*Math.sin(elevation);
  const distance=Math.max(pw/(w/hh),ph)*.64/Math.tan(12.5*Math.PI/180)+.5,camera=new THREE.PerspectiveCamera(25,w/hh,.1,180);
  camera.position.set(target.x+distance*Math.cos(elevation)*Math.sin(theta),target.y+distance*Math.sin(elevation),target.z+distance*Math.cos(elevation)*Math.cos(theta));camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  const objects=[...h.object.children,...hosts];objects.forEach(m=>m.updateMatrixWorld(true));
  const project=p=>{const q=p.clone().project(camera);return{x:left+(q.x+1)/2*w,y:top+(1-q.y)/2*hh};};
  const ray=new THREE.Raycaster(),key=new THREE.Vector3(20,34,44),units=new Map(),surfaces=[],meta=new Map(h.stats.unitColours.map(u=>[u.id,u]));
  for(const mesh of h.object.children){
   const pos=mesh.geometry.attributes.position,nor=mesh.geometry.attributes.normal;
   for(const range of mesh.userData.unitRanges??[])for(let i=range.start;i<range.end;i+=3){
    const n=[0,1,2].reduce((v,j)=>v.add(new THREE.Vector3().fromBufferAttribute(nor,i+j)),new THREE.Vector3()).normalize();if(fill?(n.z<.99||Math.abs(n.y)>.1):n.y<(lime?.995:.7))continue;
    const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,i+j)),p=vertices[0].clone().add(vertices[1]).add(vertices[2]).multiplyScalar(1/3);
    if(!fill&&p.y<.0001)continue;
    const direction=p.clone().sub(camera.position);ray.set(camera.position,direction.clone().normalize());ray.far=direction.length()+.0001;
    const hits=ray.intersectObjects(objects,false);if(!hits.length||Math.abs(hits[0].distance-direction.length())>.00005)continue;
    const toKey=key.clone().sub(p);ray.set(p.clone().addScaledVector(n,.0002),toKey.clone().normalize());ray.far=toKey.length();
    if(ray.intersectObjects(h.object.children.filter(m=>m.castShadow),false).length)continue;
    const point=project(p),screen=vertices.map(project);if(point.y>top+hh-60||![-1.5,1.5].every(x=>[-1.5,1.5].every(y=>inside({x:point.x+x,y:point.y+y},...screen))))continue;
    const area=Math.abs((screen[1].x-screen[0].x)*(screen[2].y-screen[0].y)-(screen[1].y-screen[0].y)*(screen[2].x-screen[0].x));
    const sample={...point,area,normal:n.toArray(),worldPoint:p.toArray(),...(dustAt?{dustFraction:vertices.reduce((s,v)=>s+dustAt(v.x,v.z),0)/3}:{})};
    if(range.unitId){if(!units.has(range.unitId)||area>units.get(range.unitId).area)units.set(range.unitId,sample);}else surfaces.push(sample);
   }
  }
  const soilPoint=fill?new THREE.Vector3(bb.min.x-.1,centre.y,.05234*centre.y):new THREE.Vector3(bb.max.x+(['traced-stone','modern-brick','sherd-scatter'].includes(spec.kind)?.025:.12),0,centre.z);
  const soil=project(soilPoint),soilControls=lime?[.15,.25,.35].flatMap(x=>[.25,.5,.75].map(z=>project(new THREE.Vector3(bb.max.x+.48*x,0,bb.min.z+size.z*z)))).filter(p=>p.y<top+hh-60).map(p=>({...p,Lab:pixel(p)})):[];
  const soilStats=stats(soilControls.map(p=>p.Lab)),soilLab=soilControls.length?[soilStats.L,soilStats.a,soilStats.b]:pixel(soil);
  const readings=[...units].map(([id,p])=>({id,material:meta.get(id)?.material??defaultMaterial,dusty:meta.get(id)?.dusty??null,...p,Lab:pixel(p)}));
  surfaces.sort((a,b)=>b.area-a.area);
  const surfaceReadings=(lime?[...surfaces.filter(p=>p.dustFraction<.1).slice(0,4),...surfaces.filter(p=>p.dustFraction>.85).slice(0,4)]:surfaces.slice(0,4)).map(p=>({...p,Lab:pixel(p)}));
  const surfaceStats=stats(surfaceReadings.map(p=>p.Lab)),unitStats=stats(readings.map(p=>p.Lab));
  const relative=rows=>{const s=stats(rows);return{...s,deltaL:s.n?s.L-soilLab[0]:null,deltaC:s.n?s.C-Math.hypot(soilLab[1],soilLab[2]):null};};
  const result={id:group.id,method:'CPU reprojection into unchanged PNG. True scene/soil occlusion, lit key-ray, top faces (or flat cut fill), complete 3x3 pixel footprint and no caption overlap. Largest eligible triangle per unit; four largest non-unit surfaces. Lime: nearly horizontal normals y>.995, four clean (interpolated dust<.1) and four coated (dust>.85) faces, versus an unselected grid of up to nine 3x3 lit soil controls.',soil:{...soil,Lab:soilLab,...(soilControls.length?{controls:soilControls}:{} )},units:{...unitStats,clean:stats(readings.filter(p=>p.dusty===false).map(p=>p.Lab)),dusty:stats(readings.filter(p=>p.dusty===true).map(p=>p.Lab)),samples:readings},surface:{...surfaceStats,deltaL:surfaceStats.n?surfaceStats.L-soilLab[0]:null,deltaC:surfaceStats.n?surfaceStats.C-Math.hypot(soilLab[1],soilLab[2]):null,...(lime?{clean:relative(surfaceReadings.filter(p=>p.dustFraction<.1).map(p=>p.Lab)),dusty:relative(surfaceReadings.filter(p=>p.dustFraction>.85).map(p=>p.Lab))}:{}),samples:surfaceReadings}};
  groups.push(result);
  const selected=[...(soilControls.length?soilControls.map((p,i)=>({name:group.id+'-soil'+i,...p})):[{name:group.id+'-soil',...soil}]),...surfaceReadings.map((p,i)=>({name:group.id+'-'+(lime?(p.dustFraction<.1?'clean':'dusty'):'surface')+i,...p})),...['clean','dusty'].flatMap(kind=>{const p=readings.find(p=>p.dusty===(kind==='dusty'));return p?[{name:group.id+'-'+kind,...p}]:[];}),...[...new Set(readings.map(p=>p.material))].map(material=>({name:group.id+'-'+material,...readings.find(p=>p.material===material)}))];
  regions.push(...selected.map(p=>`${p.name}:${Math.round(p.x)-1}:${Math.round(p.y)-1}:3:3`));
  h.dispose();for(const m of hosts){m.geometry.dispose();m.material.dispose();}
 }
 report[name]=groups;
 if(regions.length)raw.push('## '+name+'\n'+execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',ps,'-Image',image,'-Regions',regions.join(';')],{encoding:'utf8'}));
}
fs.writeFileSync(target,JSON.stringify(report,null,2));fs.writeFileSync(path.join(out,'colour-surfaces.txt'),raw.join('\n'));
if(batch==='k3')fs.writeFileSync(path.join(out,'front-surface-samples.json'),JSON.stringify(Object.fromEntries(Object.entries(report).map(([name,groups])=>[name,groups.map(g=>({id:g.id,units:g.units.samples,soil:g.soil,sampleMethod:g.method}))])),null,2),{flag:'wx'});
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([name,groups])=>[name,groups.map(g=>({id:g.id,units:g.units.n,surface:{n:g.surface.n,L:g.surface.L,C:g.surface.C,deltaL:g.surface.deltaL,deltaC:g.surface.deltaC,clean:g.surface.clean,dusty:g.surface.dusty},soil:g.soil.Lab}))])),null,2));
