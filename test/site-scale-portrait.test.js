import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {scaleBarPlacement,scaleBarVisibility,scaleBarScreen,SCALE_BAR_SITE} from '../src/site/scale-bar.js';
import {layoutCallouts,HUD_LABEL_CLEARANCE} from '../src/site/callouts.js';
import {polygonDistance,rectPoints,labelGap,pointSegmentDistance} from '../src/film/layout.js';
import {siteHeroPose} from '../src/site/camera.js';
import {createReference,solvePortraitBand,screenClearance,REFERENCE_SIZE,HUD_CLEARANCE,FRAMING_SAFETY} from '../src/site/framing.js';
import {createSceneSilhouette} from '../src/film/silhouette.js';
const plinth=new THREE.Box3(new THREE.Vector3(-12.65,-10.36,-8.65),new THREE.Vector3(12.65,-10,8.65)),groundY=-10.38;
function camera(azimuthDeg=35,elevationDeg=27,width=1440,height=900){
  const t=new THREE.Vector3(-1.4,-3.85,0),a=azimuthDeg*Math.PI/180,e=elevationDeg*Math.PI/180,c=new THREE.PerspectiveCamera(25,width/height,.1,180);
  c.position.set(t.x+74*Math.cos(e)*Math.sin(a),t.y+74*Math.sin(e),t.z+74*Math.cos(e)*Math.cos(a));c.lookAt(t);c.updateProjectionMatrix();c.updateMatrixWorld();return c;
}
const projector=(cam,w,h)=>p=>{const q=p.clone().project(cam);return {x:(q.x+1)*w/2,y:(1-q.y)*h/2};};
test('scale bar stands on the ground, centred under the block and at least 0.5 m clear of the plinth',()=>{
  const p=scaleBarPlacement({plinth,groundY});
  assert.ok(p.plinthGap>=.5,`plinth gap ${p.plinthGap}`);assert.ok(Math.abs((p.x0+p.x1)/2)<1e-9);
  assert.ok(Math.abs(p.x1-p.x0-5-.034)<1e-9);assert.ok(p.bottom>groundY&&p.bottom-groundY<.01);
  // On screen at the hero pose the bar sits wholly below the plinth's front edge.
  const cam=camera(),project=projector(cam,1440,900);
  for(const x of [p.x0,0,p.x1]){
    const barTop=project(new THREE.Vector3(x,p.top,p.zBack)).y,plinthEdge=project(new THREE.Vector3(x,plinth.min.y,plinth.max.z)).y;
    assert.ok(barTop>plinthEdge+2,`x=${x}: bar top ${barTop.toFixed(1)} vs plinth edge ${plinthEdge.toFixed(1)}`);
  }
});
test('foreshortening fades bar and labels together; the hero view is fully opaque, a squashed bar is never shown',()=>{
  const p=scaleBarPlacement({plinth,groundY});
  assert.equal(scaleBarVisibility(camera(35,27).position,p).opacity,1);
  assert.equal(scaleBarVisibility(camera(35,70).position,p).opacity,0,'near top-down: bar height squashed');
  assert.equal(scaleBarVisibility(camera(35+80,27).position,p).opacity,0,'camera behind the bar face');
  const tilted=scaleBarVisibility(camera(35,50).position,p);assert.ok(tilted.opacity>0&&tilted.opacity<1,'steep views fade');
  for(const az of [-45,0,35,80,115])for(const el of [5,27,45,70]){const v=scaleBarVisibility(camera(az,el).position,p);if(v.opacity>0)assert.ok(v.factor>SCALE_BAR_SITE.fade[0]);if(v.opacity===1)assert.ok(v.factor>=SCALE_BAR_SITE.fade[1]);}
});
test('scale labels sit under each bar end, clear of the bar, in the film scale-label size',()=>{
  for(const [w,h] of [[1440,900],[1280,720],[390,844]]){
    const p=scaleBarPlacement({plinth,groundY}),s=scaleBarScreen({placement:p,project:projector(camera(35,27,w,h),w,h),viewportWidth:w,viewportHeight:h,labelWidths:[8,24]});
    assert.deepEqual(s.labels.map(l=>l.text),['0','5 m']);assert.ok(s.cap>=SCALE_BAR_SITE.labelCapMinPx);
    for(const l of s.labels)assert.ok(polygonDistance(rectPoints(l.rect),s.polygon)>=SCALE_BAR_SITE.labelGapMinPx-1e-6);
    assert.ok(s.labels[1].rect.x>s.labels[0].rect.x+s.labels[0].rect.width,'labels do not touch');
  }
});
test('callouts keep 24 px from the scale bar and the label gap from its labels',()=>{
  const hull=[{x:900,y:700},{x:1100,y:700},{x:1100,y:800},{x:900,y:800}],item=(id,x,y)=>({id,featureId:id,lines:[id],boxWidth:180,boxHeight:40,ascent:28,lineHeight:40,em:38,lineGap:0,anchor:{x,y}});
  const bar=[{x:560,y:520},{x:760,y:520},{x:760,y:530},{x:560,y:530}],scaleLabels=[{id:'scale:0',rect:{x:552,y:536,width:10,height:12},em:18,lineGap:0},{id:'scale:5 m',rect:{x:748,y:536,width:28,height:12},em:18,lineGap:0}];
  const r=layoutCallouts({era:[item('a',600,500),item('b',700,560)],silhouette:hull,scaleZones:[bar],scaleLabels,width:1440,height:900,margin:48});
  assert.ok(r.placed.length>0,JSON.stringify(r.failures));
  for(const p of r.placed){
    assert.ok(polygonDistance(rectPoints(p.rect),bar)>=HUD_LABEL_CLEARANCE-1e-6);
    for(const s of scaleLabels)assert.ok(polygonDistance(rectPoints(p.rect),rectPoints(s.rect))>=Math.max(HUD_LABEL_CLEARANCE,labelGap(p,s))-1e-6,`${p.id} vs ${s.id}`);
  }
});
function reference(){
  const pose=siteHeroPose(),{width,height,cell}=REFERENCE_SIZE,cam=new THREE.PerspectiveCamera(25,width/height,.1,180);cam.position.fromArray(pose.position);cam.lookAt(...pose.target);cam.updateProjectionMatrix();cam.updateMatrixWorld();
  const scene=new THREE.Scene(),mesh=new THREE.Mesh(new THREE.BoxGeometry(25,10,17),new THREE.MeshBasicMaterial());mesh.position.set(0,-5,0);mesh.userData.sectionRole='cutface';scene.add(mesh);scene.updateMatrixWorld(true);
  const s=createSceneSilhouette(scene,cam,{width,height,cell});return createReference({rows:s.rows,cell,width,height});
}
test('phone framing: block at 88-90% width, centred in the header/title band, title shrinks only as needed and never past 20%',()=>{
  const ref=reference(),width=390,height=844;
  const hudFor=title=>scale=>[{id:'site-title',rect:{x:20,y:18,width:280,height:28}},{id:'tagline',rect:{x:20,y:50,width:330,height:20}},{id:'nav',rect:{x:20,y:80,width:250,height:26}},
    {id:'era-panel',rect:{x:20,y:title-scale*80,width:350,height:844-180-(title-scale*80)}},{id:'timeline',rect:{x:20,y:740,width:350,height:60}}];
  for(const title of [720,520]){
    const fit=solvePortraitBand({width,height,referenceFor:()=>ref,hudFor:hudFor(title),titleScales:[1,.95,.9,.85,.8],labelRoom:70});
    assert.equal(fit.feasible,true,JSON.stringify(fit.tried?.slice(0,3)));
    const f=fit.framing;assert.ok(f.widthFraction>=.88-1e-6&&f.widthFraction<=.9+1e-6,`width ${f.widthFraction}`);assert.ok(f.titleScale>=.8);
    for(const c of f.clearances)assert.ok(c.clearance>=HUD_CLEARANCE+FRAMING_SAFETY-1e-6,`${c.id} ${c.clearance}`);
    assert.ok(Math.abs(f.bounds.y+f.bounds.height/2-(f.band.top+f.band.bottom)/2)<1e-6,'centred in the band');
    if(title===720)assert.equal(f.titleScale,1,'roomy band keeps the full title');else assert.ok(f.titleScale<1,'tight band shrinks the title');
  }
});
