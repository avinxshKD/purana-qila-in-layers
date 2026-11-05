import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {addLegacyRings} from '../scripts/film/cpu-world.cjs';
import {createWorldVertexCache} from '../scripts/film/feature-timing-audit.cjs';
const names=['body','lips','gaps','soil','fill','cracks'];
test('legacy r2b with no site ring items retains all six scene-level rings',()=>{
 const scene=new THREE.Scene(),meshes=names.map(name=>{const mesh=new THREE.Mesh();mesh.name='ring-'+name;return mesh;});
 const added=addLegacyRings(scene,{items:[{featureId:'mauryan-drain'}]},()=>meshes);
 assert.deepEqual(added,meshes);assert.equal(scene.children.length,6);assert.ok(scene.children.every(m=>m.userData.sectionRole==='feature'));
});
test('M2 site-provided ring items never create duplicate always-visible scene rings',()=>{
 const scene=new THREE.Scene(),group=new THREE.Group();scene.add(group);
 const items=names.map(part=>{const object=new THREE.Group();object.visible=false;group.add(object);return{featureId:'mauryan-ring-well',part,rule:'opening',handle:{object}};});
 assert.deepEqual(addLegacyRings(scene,{items},()=>{throw Error('Must not construct legacy ring geometry');}),[]);
 assert.equal(scene.children.length,1);assert.equal(group.children.length,6);assert.ok(group.children.every(m=>!m.visible));
});
test('timing audit follows M2 ring world-matrix movement rather than retaining the first pose',()=>{
 const group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1,1));group.add(mesh);group.updateMatrixWorld(true);
 const data=createWorldVertexCache(THREE),first=data(mesh);assert.equal(data(mesh),first);
 group.position.y=-2;group.updateMatrixWorld(true);const moved=data(mesh);assert.notEqual(moved,first);
 assert.equal(moved.vertices[1],first.vertices[1]-2);assert.equal(mesh.geometry.attributes.position.getY(0),first.vertices[1]);
});
