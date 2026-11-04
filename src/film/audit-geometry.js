import * as THREE from 'three';
function needsDisplacedPositions(mesh){
  const blend=mesh.geometry.attributes.eraBlend;
  if(blend)for(let i=0;i<blend.count;i++)if(blend.getX(i)>=0)return true;
  return false;
}
// CPU-only bridge. resolve(mesh, state) returns {positions, normals?} packed
// float arrays in the original vertex order, or null for an undisplaced mesh.
// Call beginFrame after applyState. Never attach these proxies to the scene:
// the renderer must retain its original geometry, materials and shader path.
export function createAuditGeometryAdapter(resolve=()=>null,{requiresOverride=needsDisplacedPositions}={}){
  const records=new WeakMap();let frame=0,state;
  function floats(array,count,label){
    if(!(array instanceof Float32Array||array instanceof Float64Array)||array.length!==count*3)throw new Error(`CPU audit ${label} must contain ${count*3} packed float values`);
  }
  function attribute(geometry,name,array){
    let value=geometry.getAttribute(name);
    if(value){value.array=array;value.count=array.length/3;value.needsUpdate=true;}
    else geometry.setAttribute(name,new THREE.BufferAttribute(array,3));
  }
  function meshFor(mesh){
    const old=records.get(mesh);
    if(old?.frame===frame&&old.source===mesh.geometry)return old.mesh;
    const values=resolve(mesh,state);
    if(!values){
      if(requiresOverride(mesh))throw new Error(`CPU audit requires displaced positions for ${mesh.name||mesh.type}`);
      records.set(mesh,{frame,source:mesh.geometry,mesh});return mesh;
    }
    if(mesh.isSkinnedMesh)throw new Error('CPU audit adapter does not support skinned overrides');
    const source=mesh.geometry,count=source.attributes.position.count;
    floats(values.positions,count,'positions');if(values.normals)floats(values.normals,count,'normals');
    let proxy=old?.mesh!==mesh&&old?.source===source?old.mesh:null;
    if(!proxy){
      const geometry=new THREE.BufferGeometry();
      proxy=mesh.isInstancedMesh?new THREE.InstancedMesh(geometry,mesh.material,mesh.count):new THREE.Mesh(geometry,mesh.material);
    }
    const geometry=proxy.geometry;
    attribute(geometry,'position',values.positions);
    if(values.normals)attribute(geometry,'normal',values.normals);else geometry.deleteAttribute('normal');
    for(const name of ['uv','uv1']){if(source.attributes[name])geometry.setAttribute(name,source.attributes[name]);else geometry.deleteAttribute(name);}
    geometry.setIndex(source.index);geometry.groups=source.groups.map(group=>({...group}));geometry.setDrawRange(source.drawRange.start,source.drawRange.count);
    geometry.boundingBox=null;geometry.boundingSphere=null;proxy.material=mesh.material;proxy.matrixWorld.copy(mesh.matrixWorld);proxy.layers.mask=mesh.layers.mask;
    if(mesh.isInstancedMesh){proxy.instanceMatrix=mesh.instanceMatrix;proxy.count=mesh.count;proxy.boundingBox=null;proxy.boundingSphere=null;}
    records.set(mesh,{frame,source,mesh:proxy});return proxy;
  }
  return {beginFrame(nextState){state=nextState;frame++;},meshFor,geometryFor:mesh=>meshFor(mesh).geometry,
    intersect(raycaster,meshes){
      const hits=[];
      for(const source of meshes){
        if(!source.layers.test(raycaster.layers))continue;
        const target=meshFor(source),start=hits.length;target.raycast(raycaster,hits);
        for(let i=start;i<hits.length;i++)hits[i].object=source;
      }
      return hits.sort((a,b)=>a.distance-b.distance);
    }};
}
