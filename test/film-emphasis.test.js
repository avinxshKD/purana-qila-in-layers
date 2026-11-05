import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import crypto from 'node:crypto';
import {createCalloutEmphasis,featureMeasurementScene,featureFootprint,featureMaskWeights,poolWeight,POOL_MARGIN_METRES,POOL_FADE_METRES} from '../src/film/emphasis.js';
import {assertPoolFields} from '../scripts/film/pool-fields.cjs';
test('two permanent neutral shadowless mapped spots track opacity without visibility or scene changes',()=>{
  const scene=new THREE.Scene(),effect=createCalloutEmphasis(scene,{featureIdFor:c=>c.id,strength:100}),children=[...scene.children];
  const callouts=[{id:'a',slot:0,opacity:.25},{id:'b',slot:1,opacity:.8}],anchors={a:{point:[1,2,3]},b:{point:[4,5,6]}};
  effect.update(callouts,anchors);assert.deepEqual(effect.lights.map(l=>l.intensity),[25,80]);
  for(const l of effect.lights){assert.equal(l.castShadow,false);assert.equal(l.visible,true);assert.equal(l.isSpotLight,true);assert.equal(l.penumbra,.5);assert.ok(l.map);assert.deepEqual(l.color.toArray(),[1,1,1]);}
  effect.configure({powers:{a:200}});effect.update(callouts,anchors);assert.equal(effect.lights[0].intensity,50);
  effect.configure({enabled:false});effect.update(callouts,anchors);assert.deepEqual(effect.lights.map(l=>l.intensity),[0,0]);
  effect.update([],{});assert.deepEqual(scene.children,children);
});
test('feature measurement uses separate depth-tested proxies without changing rendered geometry or materials',()=>{
  const scene=new THREE.Scene(),group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());group.add(mesh);scene.add(group);scene.updateMatrixWorld(true);
  const material=mesh.material,geometry=mesh.geometry,mask=featureMeasurementScene(scene,[{featureId:'target',handle:{object:group}}],{geometryFor:m=>m.geometry},'target');
  assert.equal(mask.scene.children.length,1);assert.equal(mask.scene.children[0].material.color.getHex(),0xffffff);
  assert.equal(mesh.material,material);assert.equal(mesh.geometry,geometry);assert.equal(mesh.parent,group);mask.dispose();
});
test('optional true-footprint target sizes the mapped field without changing feature geometry',()=>{
  const scene=new THREE.Scene(),effect=createCalloutEmphasis(scene,{featureIdFor:c=>c.id,featureAreaFor:()=>({target:[2,3,4],width:10,height:.5,angle:.25,maxY:3})});
  effect.update([{id:'a',slot:0,opacity:1}],{a:{point:[5,3,4]}});
  assert.deepEqual(effect.lights[0].target.position.toArray(),[2,3,4]);
  assert.ok(effect.lights[0].angle>.1);assert.equal(effect.lights[1].intensity,0);
});
test('oriented footprint follows actual translated and rotated feature vertices',()=>{
  const group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(8,.2,.5));group.add(mesh);group.rotation.y=.3;group.position.set(2,3,4);group.updateMatrixWorld(true);
  const area=featureFootprint([{featureId:'a',handle:{object:group}}],'a');
  assert.ok(Math.abs(area.width-8)<1e-5);assert.ok(Math.abs(area.height-.5)<1e-5);assert.ok(Math.abs(area.target[0]-2)<1e-5);assert.ok(Math.abs(area.maxY-3.1)<1e-5);
});
test('gobo source starts at supplied film-camera position and keeps light/map objects permanent',()=>{
  const scene=new THREE.Scene(),area={target:[2,3,4],width:3,height:.5,angle:0,maxY:3,lightPosition:[40,30,50]},effect=createCalloutEmphasis(scene,{featureIdFor:c=>c.id,featureAreaFor:()=>area}),light=effect.lights[0],map=light.map;
  effect.update([{id:'a',slot:0,opacity:1}],{a:{point:[2,3,4]}});
  assert.deepEqual(light.position.toArray(),[40,30,50]);effect.configure({enabled:false});effect.update([{id:'a',slot:0,opacity:.2}],{a:{point:[2,3,4]}});
  assert.equal(effect.lights[0],light);assert.equal(light.map,map);assert.equal(light.intensity,0);assert.equal(map.image.data.length,512*512*4);
});
test('all pool footprints retain at least0.75m full strength plus a separate smooth exterior fade',()=>{
  assert.ok(POOL_MARGIN_METRES>=.75);assert.ok(POOL_FADE_METRES>0);
  assert.equal(poolWeight(0),1);assert.equal(poolWeight(.75),1);assert.equal(poolWeight(100,true),1);
  assert.equal(poolWeight(POOL_MARGIN_METRES+POOL_FADE_METRES/2),.5);assert.equal(poolWeight(POOL_MARGIN_METRES+POOL_FADE_METRES),0);
  assert.ok(Math.abs(poolWeight(.75+1e-6)-1)<1e-8);
});
test('full-course footprint covers later geometry while an invisible callout never primes a narrow cached pool',()=>{
  const group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(4,.2,.2));group.add(mesh);group.updateMatrixWorld(true);mesh.geometry.setDrawRange(0,0);mesh.visible=false;
  assert.equal(featureFootprint([{featureId:'thin',handle:{object:group}}],'thin'),null);
  const full=featureFootprint([{featureId:'thin',handle:{object:group}}],'thin',{fullGeometry:true});assert.ok(full.width>3.99);
  let calls=0;const effect=createCalloutEmphasis(new THREE.Scene(),{featureIdFor:c=>c.id,featureAreaFor(){calls++;return full;}});
  effect.update([{id:'thin',slot:0,opacity:0}],{thin:{point:[0,0,0]}});assert.equal(calls,0);
  effect.update([{id:'thin',slot:0,opacity:1}],{thin:{point:[0,0,0]}});assert.equal(calls,1);assert.equal(effect.state()[0].exteriorMarginMetres,.75);
});
test('partial MSAA sherd pixels are coverage weighted, not discarded by an opaque-pixel cutoff',()=>{
  const bytes=Uint8Array.from([64,64,64,255,128,128,128,255,191,191,191,255,0,0,0,255]),result=featureMaskWeights(bytes);
  assert.deepEqual(result.indices,[0,4,8]);assert.equal(result.equivalentPixels,(64+128+191)/255);
});
test('independent prebakes match and preloaded chunk pools cannot depend on first camera/area',()=>{
  const bake=()=>{const effect=createCalloutEmphasis(new THREE.Scene(),{featureIdFor:c=>c.id,featureAreaFor:()=>({target:[2,3,4],width:3,height:.5,lightPosition:[40,30,50]})});effect.update([{id:'a',slot:0,opacity:1}],{a:{point:[2,3,4]}});return effect.exportPools();};
  const a=bake(),b=bake(),hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');assert.equal(hash(a.a.bytes),hash(b.a.bytes));
  const loaded=createCalloutEmphasis(new THREE.Scene(),{featureIdFor:c=>c.id,pools:a,featureAreaFor(){throw Error('A loaded pool must not rebake');}});loaded.update([{id:'a',slot:0,opacity:1}],{a:{point:[100,100,100]}});assert.deepEqual(loaded.lights[0].position.toArray(),[40,30,50]);
  assertPoolFields({b:'2',a:'1'},{a:'1',b:'2'});assert.throws(()=>assertPoolFields({a:'1'},{a:'changed'}),/hashes differ/);
});
test('separated connected parts retain dark empty soil; parts within1.5m merge',()=>{
  function areaAt(gap){const items=[0,1].map((n)=>{const object=new THREE.Group();object.add(new THREE.Mesh(new THREE.BoxGeometry(1,.1,1)));object.position.x=n*(1+gap);object.updateMatrixWorld(true);return{featureId:'a',part:String(n),handle:{object}};});return featureFootprint(items,'a',{fullGeometry:true,clusters:true});}
  assert.equal(areaAt(1.49).clusterCount,1);assert.equal(areaAt(1.51).clusterCount,2);
  const area=areaAt(7);area.lightPosition=[4,30,0];const effect=createCalloutEmphasis(new THREE.Scene(),{featureIdFor:c=>c.id,featureAreaFor:()=>area});effect.update([{id:'a',slot:0,opacity:1}],{a:{point:area.target}});
  assert.equal(effect.poolFor('a').clusterCount,2);assert.equal(effect.poolFor('a').bytes[(256*512+256)*4],0);
  for(const c of area.clusters)assert.equal(c.componentCount,1);
});
