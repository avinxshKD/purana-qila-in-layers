import * as THREE from 'three';
import { buildFeature, buildEraFeature, fig13Specs, rectangle } from './index.js';
import { noiseMaterial } from '../strata-surface.js';
import { boxSolid } from './solid.js';
function soilBox(x0,x1,y0,y1,z0,z1) {
 const p=[];
 for(const face of boxSolid(x0,x1,y0,y1,z0,z1))for(let i=1;i<face.length-1;i++)for(const [x,y,z]of [face[0],face[i],face[i+1]])p.push(x,y,z+.05234*y);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;
}

const params=new URLSearchParams(location.search),view=params.get('view')??'contact',batch=(params.get('batch')??'k1').replace(/^k([23])[cde]$/,'k$1');
const width=Number(params.get('width')??1920),height=Number(params.get('height')??1080);
const canvas=document.querySelector('#features'),labels=document.querySelector('#labels');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
renderer.setPixelRatio(1);renderer.setSize(width,height,false);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
const K1=['kushan-bricks','M01-north-mudbrick-1','sultanate-corner','rajput-wall','rajput-rubble','post-gupta-wall-ns','post-gupta-wall-ew','gupta-brickbat-wall','sunga-masonry'];
const K2=['sultanate-lime-floor','gupta-floor','mauryan-drain','rajput-postholes','rajput-sealed-pit','sunga-kushan-lane','sunga-burnt-patches'];
const K3=['pre-mauryan-sherds','mughal-porcelain','mughal-glass','modern-china-1955','modern-brick-1948','pillar-base-as-drawn','top-left-stone-as-drawn'];
const titles={
 'kushan-bricks':['Fired brick','Three sourced sizes mixed within the wall; gallery height M'],
 'M01-north-mudbrick-1':['Fig.13 mud brick','Exact local plan trace; unit size and three courses M'],
 'sultanate-corner':['Sultanate rubble corner','3.75 × .75 m + 1.80 × .75 m, 3 courses'],
 'rajput-wall':['Rajput semi-dressed stone','4.40 × 1.40 × 1 m; axis reading M'],
 'rajput-rubble':['Three rubble phases','Three phases sourced; superposition and remnant sizes M'],
 'post-gupta-wall-ns':['Post-Gupta north–south wall','2.04 × .40 × .10 m; axis reading M'],
 'post-gupta-wall-ew':['Post-Gupta east–west wall','3.50 × .40 m; .10 m surviving height M'],
 'gupta-brickbat-wall':['Gupta brickbats','Broken fragments, low schematic remnant M'],
 'sunga-masonry':['Sunga mud brick + rubble','Materials sourced; surviving sizes and arrangement M'],
 'kushan-house':['All 24 Fig.13 wall traces','Figure-local scale; not a surveyed geographic plan']
};
const entries=[];
function litScene() {
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x252824);
 scene.add(new THREE.HemisphereLight(0xbab4a8,0x70634f,.4));
 const key=new THREE.DirectionalLight(0xfff2e2,2);key.position.set(20,34,44);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
 Object.assign(key.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:1,far:110});
 Object.assign(key.shadow,{radius:7,blurSamples:16,normalBias:.08,bias:-.0004});scene.add(key);
 const fill=new THREE.DirectionalLight(0xe8d6c0,2.4);fill.position.set(18,5,32);scene.add(fill);
 const rim=new THREE.DirectionalLight(0xc4c3b5,.3);rim.position.set(8,19,-25);scene.add(rim);return scene;
}
function panel(id,{reveal=1,cut=false}={}) {
 const scene=litScene(),h=buildEraFeature(id,{}, {outputScale:height/1080});
 const fill=['rajput-postholes','rajput-sealed-pit','rajput-pottery-dump'].includes(id);
 if(cut||fill)h.setCuts({keep:[{normal:[0,.05234,-1],constant:fill?0:.32}]});
 h.setReveal(reveal);scene.add(h.object);
 const bb=h.bounds.clone();
 // The support is soil, not a bevelled picture frame behind a section.
 const full=buildEraFeature(id);const supportBounds=full.bounds.clone();full.dispose();
 const centre=supportBounds.getCenter(new THREE.Vector3()),size=supportBounds.getSize(new THREE.Vector3());
 if(fill){size.y=-supportBounds.min.y;centre.y=-size.y/2;}
 const padding=batch==='k3'||(view==='correction-contact'&&K3.includes(id))?.1:.48;
 const plinth=new THREE.Mesh(new THREE.BoxGeometry(size.x+padding,fill?.02:.16,size.z+padding),
  noiseMaterial(new THREE.MeshStandardMaterial({color:0x746954,roughness:1}),{seed:731,outputScale:height/1080,amplitude:.35}));
 plinth.position.set(centre.x,fill?-.015:-.08,centre.z);plinth.receiveShadow=true;
 if(!fill)scene.add(plinth);
 if(fill){
  const depth=Math.abs(supportBounds.min.y),wide=size.x+.45,deep=size.z+.25;
  for(let j=0;j<3;j++){
   const mat=noiseMaterial(new THREE.MeshStandardMaterial({color:[0x756956,0x8a7c65,0x695e4c][j],roughness:1}),{seed:731+j,outputScale:height/1080,amplitude:.3});
   const band=new THREE.Mesh(soilBox(centre.x-wide/2,centre.x+wide/2,-depth*(j+1)/3,-depth*j/3,-deep/2,0),mat);
   band.receiveShadow=true;scene.add(band);
  }
  // The fill's proud cut face lies just in front of these soil bands.
 }
 if(cut&&!fill){
  const mat=noiseMaterial(new THREE.MeshStandardMaterial({color:0x746954,roughness:1}),{seed:749,outputScale:height/1080,amplitude:.3});
  const soil=new THREE.Mesh(soilBox(supportBounds.min.x-.12,supportBounds.max.x+.12,-.01,supportBounds.max.y-.02,supportBounds.min.z-.08,.32),mat);
  soil.receiveShadow=true;scene.add(soil);
 }
 // src/film/main.js uses createLookWorld; its PerspectiveCamera has near .1, far 180.
 const camera=new THREE.PerspectiveCamera(25,1,.1,180);
 const target=centre.clone();if(!fill)target.y=Math.max(.05,centre.y*.9);
 entries.push({id,h,scene,camera,target,size,bb:supportBounds,cut});
 return entries.at(-1);
}
if(view==='correction-contact')['sultanate-lime-floor','mauryan-drain','pillar-base-as-drawn','top-left-stone-as-drawn'].forEach(id=>panel(id));
else if(view==='contact') (batch==='k2'?K2:batch==='k3'?K3:K1).forEach(id=>panel(id));
else if(view==='plan')panel('kushan-house');
else if(view==='reveal')for(const reveal of [0,.25,.5,.75,1])panel(params.get('id')??'kushan-bricks',{reveal});
else if(view==='rubble')panel('sultanate-corner');
else panel(params.get('id')??'kushan-bricks',{cut:view==='cut'||view==='grazing'||view==='hero-stone'});
const cols=view==='correction-contact'?2:view==='contact'?3:view==='reveal'?5:1,rows=Math.ceil(entries.length/cols);
labels.style.gridTemplateColumns=`repeat(${cols},1fr)`;labels.style.gridTemplateRows=`repeat(${rows},1fr)`;
entries.forEach((e,i)=>{
 const div=document.createElement('div');div.className='label';
 const t=titles[e.id]??[e.id,'Schematic where source sizes are null'];
 div.innerHTML=`<strong>${t[0]}${view==='reveal'?` · ${[0,.25,.5,.75,1][i]}`:''}</strong><small>${t[1]}</small>`;
 labels.append(div);
});
function render() {
 renderer.setScissorTest(true);
 entries.forEach((e,i)=>{
  const x=Math.floor(i%cols*width/cols),y=Math.floor((rows-1-Math.floor(i/cols))*height/rows),w=Math.ceil(width/cols),h=Math.ceil(height/rows);
  const aspect=w/h;renderer.setViewport(x,y,w,h);renderer.setScissor(x,y,w,h);e.camera.aspect=aspect;
  const theta=((view==='grazing'?77:35)+Number(params.get('orbit')??0))*Math.PI/180,elevation=(view==='plan'?82:27)*Math.PI/180;
  if(view==='scale')e.target.set(.55,.004,0);
  const projectedWidth=e.size.x*Math.cos(theta)+e.size.z*Math.sin(theta);
  const projectedHeight=e.size.y*Math.cos(elevation)+(e.size.x*Math.sin(theta)+e.size.z*Math.cos(theta))*Math.sin(elevation);
  const distance=view==='scale'?h/(2*Math.tan(12.5*Math.PI/180)*Number(params.get('ppm'))):view.startsWith('hero')?74:Math.max(projectedWidth/aspect,projectedHeight)*.64/Math.tan(12.5*Math.PI/180)+.5;
  e.camera.position.set(e.target.x+distance*Math.cos(elevation)*Math.sin(theta),e.target.y+distance*Math.sin(elevation),e.target.z+distance*Math.cos(elevation)*Math.cos(theta));
  e.camera.lookAt(e.target);e.camera.updateProjectionMatrix();e.camera.updateMatrixWorld();
  renderer.render(e.scene,e.camera);
 });
 renderer.setScissorTest(false);
}
function projectedSamples() {
 return entries.map((e,index)=>{
  const panelWidth=width/cols,panelHeight=height/rows,panelX=(index%cols)*panelWidth,panelY=Math.floor(index/cols)*panelHeight;
  const project=p=>{const q=p.clone().project(e.camera);return {x:panelX+(q.x+1)/2*panelWidth,y:panelY+(1-q.y)/2*panelHeight};};
  const units=new Map(),ray=new THREE.Raycaster();
  for(const mesh of e.h.object.children){
   const pos=mesh.geometry.attributes.position,nor=mesh.geometry.attributes.normal;
   for(const range of mesh.userData.unitRanges??[]){
    if(!range.unitId)continue;
    const candidates=units.get(range.unitId)??[];
    for(let i=range.start;i<range.end;i+=3){
     const a=new THREE.Vector3().fromBufferAttribute(pos,i),b=new THREE.Vector3().fromBufferAttribute(pos,i+1),c=new THREE.Vector3().fromBufferAttribute(pos,i+2);
     const p=a.clone().add(b).add(c).multiplyScalar(1/3),n=new THREE.Vector3().fromBufferAttribute(nor,i);
     if(n.dot(e.camera.position.clone().sub(p))<=0)continue;
     // Compare like-facing front surfaces, not sunlit tops against shadowed vertical faces.
     // This is per-unit colour variation, separate from variation caused by face orientation.
     if(n.z<.8||Math.abs(n.y)>.25||Math.abs(n.x)>.3)continue;
     const area=b.clone().sub(a).cross(c.clone().sub(a)).length();
     candidates.push({p,area});
    }
    units.set(range.unitId,candidates);
   }
  }
  const samples=[];
  for(const [id,candidates]of units){
   candidates.sort((a,b)=>b.area-a.area);
   for(const candidate of candidates.slice(0,10)){
    const p=candidate.p,dir=p.clone().sub(e.camera.position).normalize();ray.set(e.camera.position,dir);
    const hits=ray.intersectObject(e.h.object,true);
    if(!hits.length||hits[0].point.distanceTo(p)>.0008)continue;
    const first=hits[0],range=first.object.userData.unitRanges.find(r=>first.faceIndex*3>=r.start&&first.faceIndex*3<r.end);
    if(range?.unitId!==id)continue;
    const unit=e.h.stats.unitColours.find(u=>u.id===id);
    samples.push({id,...project(p),material:unit?.material??null,dusty:unit?.dusty??null});break;
   }
  }
  const pad=batch==='k3'?.1:.48,soilFront=new THREE.Vector3(e.bb.min.x-.08,-.08,e.bb.max.z+pad/2);
  return {id:e.id,units:samples,soil:project(soilFront),soilTop:project(new THREE.Vector3(e.bb.min.x-.08,0,e.bb.max.z+.08))};
 });
}
render();
window.featureGallery={ready:true,render,entries,layout:{columns:cols,rows},stats:()=>entries.map(e=>({id:e.id,courseCount:e.h.courseCount,...e.h.stats})),samples:projectedSamples,
 cameras:()=>entries.map(e=>({id:e.id,position:e.camera.position.toArray(),target:e.target.toArray(),fov:e.camera.fov,aspect:e.camera.aspect,near:e.camera.near,far:e.camera.far,ppm:Number(params.get('ppm'))||null,orbit:35+Number(params.get('orbit')??0)})),
 setReveal(f){entries.forEach(e=>e.h.setReveal(f));render();},
 geometrySignature:()=>entries.map(e=>e.h.object.children.map(m=>Array.from(m.geometry.attributes.position.array)))};
