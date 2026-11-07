import * as THREE from 'three';
import {MeshBVH,acceleratedRaycast} from 'three-mesh-bvh';
import {createSceneSilhouette} from '../film/silhouette.js';
import {createEraDisplacement} from '../eras/soil-displace.js';
// Runs in a worker. Indirect BVHs retain the original triangle/index order.
export function createOcclusionKernel(){
  const geometries=new Map(),displaced=new Map();let builds=0,refits=0,queries=0,silhouettes=0,displacement=null,resolves=0,resolveMs=0,maxResolveMs=0;
  THREE.Mesh.prototype.raycast=acceleratedRaycast;
  function build({geometryId,positions,index,groups=[],drawRange={start:0,count:Infinity}}){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
    if(index)geometry.setIndex(new THREE.BufferAttribute(index,1));geometry.groups=groups;geometry.setDrawRange(drawRange.start,drawRange.count);
    geometry.boundsTree=new MeshBVH(geometry,{indirect:true,targetLeafSize:10});geometries.set(geometryId,geometry);builds++;
  }
  function refit({geometryId,positions}){
    const geometry=geometries.get(geometryId);if(!geometry)throw new Error('Unknown occlusion geometry');
    geometry.attributes.position.array=positions;geometry.attributes.position.count=positions.length/3;geometry.attributes.position.needsUpdate=true;
    geometry.boundsTree.refit();geometry.boundingBox=null;geometry.boundingSphere=null;refits++;
  }
  // Era-displaced soil (the meshes whose top vertices move on the GPU) is displaced here, from the source attributes
  // and the boundary grids, with the same CPU mirror the main thread used to run. Kept per geometry, so per cut step.
  function setStack({grid}){displacement=createEraDisplacement({stack:grid});}
  // Occlusion needs positions only, and the displaced heights are the same for 'top' and 'face' (the top kind adds
  // just the normal gradients), so every mesh resolves as 'face', without normal data or the top's 22 extra floats
  // per moving vertex. The source kind is kept for reporting.
  function register({geometryId,kind,attributes,index,groups=[],drawRange={start:0,count:Infinity}}){
    const source=new THREE.BufferGeometry();for(const [name,{array,itemSize}] of Object.entries(attributes))source.setAttribute(name,new THREE.BufferAttribute(array,itemSize));
    if(!source.attributes.normal)source.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(0),3));
    displaced.set(geometryId,{mesh:{geometry:source,userData:{eraDisplaced:'face'}},kind,index,groups,drawRange,geometry:null,key:null});
  }
  function displacedGeometry(geometryId,deposits){
    const entry=displaced.get(geometryId);if(!entry)throw new Error('Unregistered displaced geometry');if(!displacement)throw new Error('Boundary grids not loaded');
    const key=deposits.join(',');if(entry.key===key)return entry.geometry;
    const start=performance.now(),values=displacement.resolve(entry.mesh,{deposits}),ms=performance.now()-start;resolves++;resolveMs+=ms;maxResolveMs=Math.max(maxResolveMs,ms);
    if(!entry.geometry){
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(values.positions,3));
      if(entry.index)geometry.setIndex(new THREE.BufferAttribute(entry.index,1));geometry.groups=entry.groups;geometry.setDrawRange(entry.drawRange.start,entry.drawRange.count);
      geometry.boundsTree=new MeshBVH(geometry,{indirect:true,targetLeafSize:10});entry.geometry=geometry;builds++;
    }else{entry.geometry.attributes.position.needsUpdate=true;entry.geometry.boundsTree.refit();entry.geometry.boundingBox=null;entry.geometry.boundingSphere=null;refits++;}
    entry.key=key;return entry.geometry;
  }
  function memory(){
    const bvhBytes=g=>g?.boundsTree?(g.boundsTree._roots??[]).reduce((s,r)=>s+r.byteLength,0)+(g.boundsTree._indirectBuffer?.byteLength??0):0;
    const attributeBytes=g=>g?Object.values(g.attributes).reduce((s,a)=>s+a.array.byteLength,0)+(g.index?.array.byteLength??0):0;
    let displacedBytes=0,moving=0;
    for(const entry of displaced.values()){
      const source=entry.mesh.geometry,blend=source.attributes.eraBlend;let m=0;for(let i=0;i<blend.count;i++)if(blend.getX(i)>=0)m++;moving+=m;
      // Source copies, the displaced positions and the per-vertex height coefficients (11 floats).
      displacedBytes+=attributeBytes(source)+(entry.geometry?source.attributes.position.array.byteLength:0)+m*4*11+bvhBytes(entry.geometry)+(entry.index?.byteLength??0);
    }
    let staticBytes=0;for(const g of geometries.values())staticBytes+=attributeBytes(g)+bvhBytes(g);
    return {displacedGeometries:displaced.size,displacedWarm:[...displaced.values()].filter(e=>e.geometry).length,movingVertices:moving,displacedBytes,staticGeometries:geometries.size,staticBytes};
  }
  function objectsFor(meshes){
    return meshes.map(record=>{
      const geometry=record.deposits?displacedGeometry(record.geometryId,record.deposits):geometries.get(record.geometryId);if(!geometry)throw new Error('Unprepared occlusion geometry');
      const materials=record.materials.map(data=>{const material=new THREE.MeshBasicMaterial({side:data.side,visible:data.visible??true,opacity:data.opacity??1});material.clippingPlanes=data.planes.map(p=>new THREE.Plane(new THREE.Vector3(...p.slice(0,3)),p[3]));material.clipIntersection=!!data.clipIntersection;return material;});
      const material=record.materialArray?materials:materials[0];
      const mesh=record.instances?new THREE.InstancedMesh(geometry,material,record.count):new THREE.Mesh(geometry,material);
      if(record.instances)mesh.instanceMatrix=new THREE.InstancedBufferAttribute(record.instances,16);
      mesh.matrixWorld.fromArray(record.matrixWorld);if(record.role)mesh.userData.sectionRole=record.role;return mesh;
    });
  }
  const disposeAll=objects=>{for(const object of objects)for(const material of Array.isArray(object.material)?object.material:[object.material])material.dispose();};
  // Same conservative triangle raster as the film HUD audit, on the worker's CPU-displaced copies.
  function silhouette({meshes,projectionMatrix,matrixWorldInverse,width,height,cell=4}){
    const objects=objectsFor(meshes),scene=new THREE.Scene();
    for(const object of objects){object.matrixAutoUpdate=false;object.matrix.copy(object.matrixWorld);scene.add(object);}
    const camera={projectionMatrix:new THREE.Matrix4().fromArray(projectionMatrix),matrixWorldInverse:new THREE.Matrix4().fromArray(matrixWorldInverse)};
    try{const result=createSceneSilhouette(scene,camera,{width,height,cell});return {rows:result.rows,cell:result.cell,blockLowestY:result.blockLowestY,scalePoints:result.scalePoints,report:result.report,width,height};}
    finally{disposeAll(objects);}
  }
  function query({meshes,rays}){
    const objects=objectsFor(meshes);
    const raycaster=new THREE.Raycaster();queries+=rays.length;
    const visible=rays.map(record=>{
      raycaster.set(new THREE.Vector3(...record.origin),new THREE.Vector3(...record.direction));raycaster.near=0;raycaster.far=record.far;
      for(const object of objects){
        const hits=[];object.raycast(raycaster,hits);
        if(hits.some(hit=>{const material=Array.isArray(object.material)?object.material[hit.face?.materialIndex||0]:object.material;return material.visible&&material.opacity!==0&&!material.clippingPlanes.some(plane=>plane.distanceToPoint(hit.point)<0);}))return false;
      }return true;
    });
    disposeAll(objects);
    return visible;
  }
  return {run(type,data){const start=performance.now();let visible,outline,stats;if(type==='build')build(data);else if(type==='refit')refit(data);
    else if(type==='stack')setStack(data);else if(type==='register')register(data);else if(type==='release'){geometries.delete(data.geometryId);displaced.delete(data.geometryId);}else if(type==='warm')displacedGeometry(data.geometryId,data.deposits);else if(type==='memory')stats=memory();else if(type==='query')visible=query(data);else if(type==='silhouette'){outline=silhouette(data);silhouettes++;}else throw new Error('Unknown occlusion operation');return {visible,silhouette:outline,memory:stats,workerMs:performance.now()-start,builds,refits,queries,silhouettes,resolves,resolveMs:+resolveMs.toFixed(1),maxResolveMs:+maxResolveMs.toFixed(1)};}};
}
