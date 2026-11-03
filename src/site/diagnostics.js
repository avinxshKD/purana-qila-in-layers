import * as THREE from 'three';
export function diagnosticOptions(search=location.search,options=globalThis.__STRATA_SITE_DIAGNOSTIC__){
  return new URLSearchParams(search).has('diagnose')?(options||{}):{};
}
export function rendererIdentity(renderer){
  const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
  return {unmaskedRenderer:gl.getParameter(extension?extension.UNMASKED_RENDERER_WEBGL:gl.RENDERER),samples:gl.getParameter(gl.SAMPLES)};
}
export function applyDiagnosticOverrides(world,options){
  const report={requested:options,shadows:[],heaviestMaterial:null};
  if(!Object.keys(options).length)return report;
  if(options.halfShadows)world.scene.traverse(light=>{
    if(!light.isLight||!light.castShadow||!light.shadow)return;
    const before=[light.shadow.mapSize.x,light.shadow.mapSize.y];
    light.shadow.map?.dispose();light.shadow.mapPass?.dispose();light.shadow.map=null;light.shadow.mapPass=null;
    light.shadow.mapSize.set(Math.max(1,Math.floor(before[0]/2)),Math.max(1,Math.floor(before[1]/2)));light.shadow.needsUpdate=true;
    report.shadows.push({before,after:[light.shadow.mapSize.x,light.shadow.mapSize.y]});
  });
  if(options.plainHeaviest){
    const totals=new Map(),meshes=[];
    world.scene.traverse(mesh=>{
      if(!mesh.isMesh||!mesh.visible||!mesh.geometry||!mesh.material)return;meshes.push(mesh);
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],groups=Array.isArray(mesh.material)&&mesh.geometry.groups.length?mesh.geometry.groups:[{materialIndex:0,count:mesh.geometry.index?.count||mesh.geometry.attributes.position.count}];
      for(const group of groups){const material=materials[group.materialIndex];if(!material)continue;const row=totals.get(material)||{material,triangles:0,roles:new Set()};row.triangles+=group.count/3;row.roles.add(mesh.userData.sectionRole||mesh.name||'mesh');totals.set(material,row);}
    });
    const heavy=[...totals.values()].sort((a,b)=>b.triangles-a.triangles)[0];
    if(heavy){
      const source=heavy.material,plain=new THREE.MeshBasicMaterial({color:source.color?.clone()||new THREE.Color(0x888888),map:source.map,vertexColors:source.vertexColors,side:source.side,transparent:source.transparent,opacity:source.opacity,depthTest:source.depthTest,depthWrite:source.depthWrite,clippingPlanes:source.clippingPlanes,clipShadows:source.clipShadows});
      for(const mesh of meshes)mesh.material=Array.isArray(mesh.material)?mesh.material.map(material=>material===source?plain:material):mesh.material===source?plain:mesh.material;
      report.heaviestMaterial={name:source.name||source.type,triangles:heavy.triangles,roles:[...heavy.roles],replacement:'MeshBasicMaterial',selection:'largest sum of submitted triangles using one material'};
    }
  }
  return report;
}
