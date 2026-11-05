import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSiteBackend} from '../src/site/backend.js';
import {sceneForYear} from '../src/film/scene-year.js';
function fixture(){
 const scene=new THREE.Scene(),group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshStandardMaterial({side:THREE.DoubleSide}));group.userData.sectionRole='feature';group.add(mesh);scene.add(group);let calls=0;
 const world={scene,eraBlock:{base:10,top:0,bottomY:-10},eraSite:()=>({items:[{featureId:'a',handle:{object:group}}]}),eraDisplacement:{resolve(m,state){if(m!==mesh)return null;const positions=m.geometry.attributes.position.array.slice();for(let i=2;i<positions.length;i+=3)positions[i]=state.excavation;return{positions};}},
  applyState(state){calls++;group.position.x=state.excavation;return{activeTopAnchor:{point:[0,0,0]},featureAnchors:{a:{point:[3,4,5],normal:[0,1,0],visible:state.features[0]>0,revealed:state.features[0]>0,part:'real'}}};},warmState:state=>({totalMs:1,state})};
 return{world,mesh,group,calls:()=>calls,backend:createSiteBackend(world)};
}
test('real backend uses native anchors, maps year/era/excavation, and never invents markers',()=>{
 const f=fixture();f.backend.setYear(2023);assert.deepEqual(f.backend.marker('a').point,[3,4,5]);assert.equal(f.backend.marker('missing'),null);assert.equal(f.backend.metadata().placeholderAnchors,false);
 const count=f.calls();f.backend.applyState(sceneForYear(2023));assert.equal(f.calls(),count);
 f.backend.setEra(2);assert.equal(f.backend.marker('a').visible,true);assert.throws(()=>f.backend.setEra(10),/Invalid era/);
 const state=sceneForYear(-539);state.features.fill(0);f.backend.applyState(state);assert.equal(f.backend.marker('a').visible,false);
 assert.throws(()=>createSiteBackend({}),/real era backend/);f.backend.dispose();
});
test('v1.1 residency: omitted methods mean resident; provider methods pass through with cloned states',async()=>{
 const f=fixture(),s=sceneForYear(1951);assert.equal(f.backend.isResident(s),true);await f.backend.ensureState(s);assert.equal(f.backend.metadata().resident,null);
 const seen=[];f.world.isResident=state=>state.excavation===0;f.world.ensureState=async state=>{seen.push(state);};f.world.metadata=()=>({resident:{packs:2,pending:1,failed:0}});
 const g=fixture();Object.assign(g.world,{isResident:f.world.isResident,ensureState:f.world.ensureState,metadata:f.world.metadata});
 const cut=sceneForYear(2023);cut.excavation=.5;assert.equal(g.backend.isResident(cut),false);await g.backend.ensureState(cut);assert.notEqual(seen[0],cut);assert.deepEqual(seen[0],cut);
 assert.deepEqual(g.backend.metadata().resident,{packs:2,pending:1,failed:0});f.backend.dispose();g.backend.dispose();
});
test('worker proxies follow nested geometry, current matrices and CPU displacement without source mutation',()=>{
 const f=fixture(),source=f.mesh.geometry.attributes.position.array.slice();f.backend.setYear(2023);const first=f.backend.occluders()[0],version=first.geometry.attributes.position.version;
 assert.notEqual(first,f.mesh);assert.equal(first.geometry.attributes.position.getZ(0),1);assert.equal(first.matrixWorld.elements[12],1);
 const state=sceneForYear(2023);state.excavation=.5;f.backend.applyState(state);const second=f.backend.occluders()[0];assert.equal(second.geometry.attributes.position.getZ(0),.5);assert.equal(second.matrixWorld.elements[12],.5);assert.ok(second.geometry.attributes.position.version>version);
 assert.deepEqual(f.mesh.geometry.attributes.position.array,source);f.group.visible=false;assert.equal(f.backend.occluders().length,0);f.group.visible=true;f.mesh.geometry.setDrawRange(0,0);assert.equal(f.backend.occluders().length,0);f.backend.dispose();
});
