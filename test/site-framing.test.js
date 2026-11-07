import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createReference,rowsWithBar,solveFraming,applyFraming,screenClearance,screenBounds,blockedDistance,REFERENCE_SIZE} from '../src/site/framing.js';
import {calloutMetrics,layoutCallouts,auditCallouts,holdCallouts,offsetsOf} from '../src/site/callouts.js';
import {createSceneSilhouette,silhouetteFromRows} from '../src/film/silhouette.js';
import {createOcclusionKernel} from '../src/site/occlusion-kernel.js';
import {siteHeroPose} from '../src/site/camera.js';
function heroCamera(width,height){const pose=siteHeroPose(),camera=new THREE.PerspectiveCamera(25,width/height,.1,180);camera.position.fromArray(pose.position);camera.lookAt(...pose.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();return camera;}
function blockScene(){const scene=new THREE.Scene(),mesh=new THREE.Mesh(new THREE.BoxGeometry(25,10,17),new THREE.MeshBasicMaterial());mesh.position.set(0,-5,0);mesh.userData.sectionRole='cutface';scene.add(mesh);scene.updateMatrixWorld(true);return scene;}
function reference(){const {width,height,cell}=REFERENCE_SIZE,s=createSceneSilhouette(blockScene(),heroCamera(width,height),{width,height,cell});return createReference({rows:s.rows,cell,width,height});}
test('zoom plus view offset is an exact similarity of the reference projection',()=>{
  const {width:W0,height:H0}=REFERENCE_SIZE,ref=heroCamera(W0,H0),framing={zoom:.83,offset:{x:120,y:-40}};
  for(const [w,h] of [[1440,900],[1280,720],[390,844]]){
    const live=heroCamera(w,h);applyFraming(live,framing,w,h);live.updateMatrixWorld();const k=framing.zoom*h/H0;
    for(const p of [[12,0,8],[-12,-10,-8],[3,-4,8.5]]){
      const a=new THREE.Vector3(...p).project(ref),b=new THREE.Vector3(...p).project(live);
      const ax=(a.x+1)*W0/2,ay=(1-a.y)*H0/2,bx=(b.x+1)*w/2,by=(1-b.y)*h/2;
      assert.ok(Math.abs(bx-(w/2+framing.offset.x+k*(ax-W0/2)))<1e-6&&Math.abs(by-(h/2+framing.offset.y+k*(ay-H0/2)))<1e-6,`${w}x${h} ${p}`);
    }
  }
});
test('solver keeps every HUD rect 24 px + safety from the outline and the block inside its reserve',()=>{
  const r=reference(),w=1440,h=900,hud=[{id:'title',rect:{x:48,y:32,width:420,height:110}},{id:'era',rect:{x:48,y:600,width:420,height:170}},{id:'scrubber',rect:{x:48,y:790,width:1344,height:80}},{id:'nav',rect:{x:1100,y:32,width:292,height:40}}];
  const f=solveFraming({reference:r,width:w,height:h,hud,reserve:{left:330,right:330}});assert.equal(f.feasible,true);
  for(const c of f.clearances)assert.ok(c.clearance>=30-1e-6,JSON.stringify(c));
  assert.ok(f.bounds.x>=330-1e-6&&f.bounds.x+f.bounds.width<=w-330+1e-6);
  // Live raster at the solved framing agrees within the raster overreach.
  const live=heroCamera(w,h);applyFraming(live,f,w,h);live.updateMatrixWorld();const s=createSceneSilhouette(blockScene(),live,{width:w,height:h,cell:4});
  for(const item of hud)assert.ok(s.distanceRect(item.rect)>=24,item.id+' '+s.distanceRect(item.rect));
  assert.ok(Math.abs(screenClearance(r,f.k,f.centre,hud[1].rect)-s.distanceRect(hud[1].rect))<12);
});
test('worker kernel rasters the same outline as the film audit from serialized meshes',()=>{
  const scene=blockScene(),mesh=scene.children[0],camera=heroCamera(800,500),kernel=createOcclusionKernel(),geometry=mesh.geometry;
  kernel.run('build',{geometryId:1,positions:geometry.attributes.position.array.slice(),index:geometry.index.array.slice(),groups:geometry.groups,drawRange:{...geometry.drawRange}});
  const record={geometryId:1,matrixWorld:mesh.matrixWorld.toArray(),materialArray:false,role:'cutface',materials:[{side:THREE.FrontSide,visible:true,opacity:1,clipIntersection:false,planes:[[0,-1,0,-6]]}]};
  mesh.material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,-1,0),-6)];
  const direct=createSceneSilhouette(scene,camera,{width:800,height:500,cell:4}),worker=kernel.run('silhouette',{meshes:[record],projectionMatrix:camera.projectionMatrix.toArray(),matrixWorldInverse:camera.matrixWorldInverse.toArray(),width:800,height:500,cell:4}).silhouette;
  assert.deepEqual(worker.rows,direct.rows);assert.equal(worker.blockLowestY,direct.blockLowestY);
  const rebuilt=silhouetteFromRows(worker.rows,{cell:4}),probe={x:10,y:10,width:30,height:20};assert.equal(rebuilt.distanceRect(probe),direct.distanceRect(probe));
});
test('site callouts use film proportions, keep the label gap and never cross leaders',()=>{
  const m=calloutMetrics(1440,900);assert.equal(m.cap,24);assert.equal(m.lineHeight,34.5);assert.ok(Math.abs(calloutMetrics(1280,720).cap-21.333)<1e-3);assert.equal(calloutMetrics(390,844).cap,12);
  const outline=silhouetteFromRows(Array.from({length:225},(_,y)=>y>=50&&y<180?[[500,1000]]:[]),{cell:4});
  const item=(id,x,y)=>({id,featureId:id,anchor:{x,y},lines:[id],boxWidth:200,boxHeight:62,em:36,lineGap:8});
  const out=layoutCallouts({era:[item('a',700,300),item('b',705,380)],extra:item('c',900,600),silhouette:outline,protectedRects:[],width:1440,height:900,margin:36});
  assert.equal(out.placed.length,3);const audit=auditCallouts(out.placed,outline);assert.equal(audit.passes,true,JSON.stringify(audit));
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++){const a=out.placed[i].rect,b=out.placed[j].rect,dx=Math.max(a.x-b.x-b.width,b.x-a.x-a.width,0),dy=Math.max(a.y-b.y-b.height,b.y-a.y-a.height,0);assert.ok(Math.hypot(dx,dy)>=36-1e-6);}
});
test('site labels ride with their dots during an orbit and keep a still-valid offset when it settles',()=>{
  const outline=silhouetteFromRows(Array.from({length:225},(_,y)=>y>=50&&y<180?[[500,1000]]:[]),{cell:4});
  const item=(id,x,y)=>({id,featureId:id,anchor:{x,y},lines:[id],boxWidth:200,boxHeight:62,em:36,lineGap:8});
  const first=layoutCallouts({era:[item('a',700,300),item('b',705,380)],silhouette:outline,protectedRects:[],width:1440,height:900,margin:36}),offsets=offsetsOf(first.placed);
  // Mid-orbit: anchors moved 6 px; labels keep their offset exactly.
  const moving=holdCallouts([item('a',706,301),item('b',711,381)],offsets);
  for(const p of moving){const o=offsets.get(p.featureId);assert.equal(p.rect.x-p.anchor.x,o.dx);assert.equal(p.rect.y-p.anchor.y,o.dy);}
  // Settled: the block moved with the orbit, the held offset still passes every gate, so nothing jumps.
  const shifted=silhouetteFromRows(Array.from({length:225},(_,y)=>y>=50&&y<180?[[506,1006]]:[]),{cell:4});
  const settled=layoutCallouts({era:[item('a',706,300),item('b',711,380)],silhouette:shifted,protectedRects:[],width:1440,height:900,margin:36,previous:offsets});
  assert.ok(settled.placed.every(p=>p.held));assert.deepEqual([...offsetsOf(settled.placed)],[...offsets]);
  // If the held offset now breaks a gate (label pushed off-frame), the pair is solved again.
  const far=layoutCallouts({era:[item('a',1300,300),item('b',1305,380)],silhouette:outline,protectedRects:[],width:1440,height:900,margin:36,previous:new Map([['a',{dx:200,dy:0}],['b',{dx:200,dy:0}]])});
  assert.ok(far.placed.every(p=>!p.held));
});
test('scale-bar label pad stays inside the reference raster at phone-landscape k (844x390 and up)',async()=>{
  const {readFileSync}=await import('node:fs'),shipped=JSON.parse(readFileSync(new URL('../src/site/framing-reference.json',import.meta.url),'utf8'));
  const raster={rows:shipped.rows,cell:shipped.cell,width:shipped.width,height:shipped.height},bare=createReference(raster),b=bare.bounds;
  // Bar just below the block's lowest cells, spanning its middle third; labels at the phone cap.
  const barBox={x0:b.x0+(b.x1-b.x0)/3,x1:b.x1-(b.x1-b.x0)/3,y0:b.y1-24,y1:b.y1-8},labels={gap:8,cap:12,halfWidth:44};
  for(const [w,h] of [[844,390],[932,430],[1366,657]]){
    const hud=[{id:'title',rect:{x:20,y:16,width:300,height:70}},{id:'scrubber',rect:{x:20,y:h-70,width:w-40,height:54}}];
    const first=solveFraming({reference:bare,width:w,height:h,hud});assert.equal(first.feasible,true,`${w}x${h} bare`);
    const rows=rowsWithBar(raster,barBox,labels,first.k*.9),reference=createReference({...raster,rows});
    assert.ok(reference.bounds.x0>0&&reference.bounds.y1<raster.height&&reference.bounds.x1<raster.width,`${w}x${h} ${JSON.stringify(reference.bounds)}`);
    assert.ok(reference.bounds.y1>b.y1,'label pad extends below the block');
    assert.equal(solveFraming({reference,width:w,height:h,hud}).feasible,true,`${w}x${h} with bar`);
  }
  // Unclamped, the 844x390 pad would leave the raster: the regression the clamp guards.
  const k=solveFraming({reference:bare,width:844,height:390,hud:[]}).k*.9;
  assert.ok(b.y1-8+(labels.gap+labels.cap+2)/k>=raster.height,`k=${k}`);
});
test('banded outline distance equals the silhouette query on random rects and limits',async()=>{
  const {readFileSync}=await import('node:fs'),shipped=JSON.parse(readFileSync(new URL('../src/site/framing-reference.json',import.meta.url),'utf8'));
  const raster={rows:shipped.rows,cell:shipped.cell,width:shipped.width,height:shipped.height},b=createReference(raster).bounds;
  const rows=rowsWithBar(raster,{x0:b.x0+300,x1:b.x1-300,y0:b.y1-24,y1:b.y1-8},{gap:8,cap:12,halfWidth:44},.1),fast=blockedDistance(rows,raster.cell),slow=silhouetteFromRows(rows,{cell:raster.cell});
  let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
  for(let n=0;n<4000;n++){
    const rect={x:-400+rnd()*3200,y:-300+rnd()*1800,width:rnd()*900,height:rnd()*300},limit=n%5?rnd()*3000:Infinity;
    assert.equal(fast(rect,limit),slow.distanceRect(rect,limit),JSON.stringify({rect,limit}));
  }
});
test('pruned framing search returns the same scale and centre as scoring every grid point',async()=>{
  const {readFileSync}=await import('node:fs'),shipped=JSON.parse(readFileSync(new URL('../src/site/framing-reference.json',import.meta.url),'utf8'));
  const reference=createReference({rows:shipped.rows,cell:shipped.cell,width:shipped.width,height:shipped.height});
  // Every grid point scored with full-limit queries (the solver before its pruning).
  function exhaustive({width,height,hud,reserve}){
    const clearance=30,R={left:24,right:24,top:24,bottom:24,...reserve},b=reference.bounds,o=reference.centre,step=Math.max(4,Math.min(width,height)/120);
    const range=k=>({x0:R.left-k*(b.x0-o.x),x1:width-R.right-k*(b.x1-o.x),y0:R.top-k*(b.y0-o.y),y1:height-R.bottom-k*(b.y1-o.y)});
    const score=(k,c)=>{let slack=Infinity;for(const item of hud){const d=screenClearance(reference,k,c,item.rect,clearance+400);if(d<clearance)return -1;slack=Math.min(slack,d-clearance);}
      const s=screenBounds(reference,k,c),edge=Math.min(s.x-R.left,width-R.right-s.x-s.width,s.y-R.top,height-R.bottom-s.y-s.height);return edge<0?-1:Math.min(slack,edge);};
    const best=k=>{const r=range(k);if(r.x1<r.x0||r.y1<r.y0)return null;let found=null;
      for(let x=r.x0;x<=r.x1+1e-9;x+=step)for(let y=r.y0;y<=r.y1+1e-9;y+=step){const s=score(k,{x,y});if(s>=0&&(!found||s>found.score))found={c:{x,y},score:s};}
      if(!found){const c={x:(r.x0+r.x1)/2,y:(r.y0+r.y1)/2},s=score(k,c);if(s>=0)found={c,score:s};}return found;};
    let lo=0,hi=Math.min(.76*height/(b.y1-b.y0),(width-R.left-R.right)/(b.x1-b.x0),(height-R.top-R.bottom)/(b.y1-b.y0));
    if(best(hi))lo=hi;else for(let n=0;n<16;n++){const mid=(lo+hi)/2;if(best(mid))lo=mid;else hi=mid;}
    const k=lo*.97,atK=best(k),found=atK||best(lo);return {k:atK?k:lo,centre:found.c};
  }
  for(const [width,height] of [[844,390],[1366,657]]){
    const hud=[{id:'title',rect:{x:24,y:20,width:360,height:90}},{id:'nav',rect:{x:width-300,y:20,width:270,height:36}},{id:'era',rect:{x:30,y:height-230,width:380,height:120}},{id:'timeline',rect:{x:30,y:height-90,width:width-60,height:70}}];
    const reserve={left:180,right:180,top:16,bottom:16},want=exhaustive({width,height,hud,reserve}),got=solveFraming({reference,width,height,hud,reserve});
    assert.equal(got.feasible,true);assert.equal(got.k,want.k,`${width}x${height} k`);assert.deepEqual(got.centre,want.centre,`${width}x${height} centre`);
  }
});
