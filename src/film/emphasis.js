import * as THREE from 'three';
import {convexHull,pointSegmentDistance} from './layout.js';
// Stock Three lights/materials only. No soil shader, era state or film renderer dependency.
export const POOL_MARGIN_METRES=.75;
export const POOL_FADE_METRES=.75;
export const POOL_MERGE_METRES=1.5;
function hullDistance(a,b){
  function contains(p,h){if(h.length<3)return false;let positive=false,negative=false;for(let i=0;i<h.length;i++){const q=h[i],r=h[(i+1)%h.length],cross=(r.x-q.x)*(p.y-q.y)-(r.y-q.y)*(p.x-q.x);positive ||= cross>1e-9;negative ||= cross< -1e-9;}return !(positive&&negative);}
  if(a.some(p=>contains(p,b))||b.some(p=>contains(p,a)))return 0;
  let minimum=Infinity;for(const [points,edges]of[[a,b],[b,a]])for(const p of points)for(let i=0;i<edges.length;i++)minimum=Math.min(minimum,pointSegmentDistance(p,edges[i],edges[(i+1)%edges.length]));return minimum;
}
function connectedClusters(points,triangles,labels){
  const parent=points.map((_,i)=>i),find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;},join=(a,b)=>{parent[find(b)]=find(a);};
  for(const[a,b,c]of triangles){join(a,b);join(a,c);}
  const groups=new Map();for(let i=0;i<points.length;i++){const id=find(i);if(!groups.has(id))groups.set(id,{vertices:[],labels:new Set()});const g=groups.get(id);g.vertices.push(points[i]);for(const label of labels[i])g.labels.add(label);}
  const components=[...groups.values()].map(g=>({...g,hull:convexHull(g.vertices.map(p=>({x:p[0],y:p[2]})))})),clusterParent=components.map((_,i)=>i),root=i=>{while(clusterParent[i]!==i){clusterParent[i]=clusterParent[clusterParent[i]];i=clusterParent[i];}return i;};
  for(let i=0;i<components.length;i++)for(let j=i+1;j<components.length;j++)if(root(i)!==root(j)&&hullDistance(components[i].hull,components[j].hull)<=POOL_MERGE_METRES+1e-9)clusterParent[root(j)]=root(i);
  const clusters=new Map();for(let i=0;i<components.length;i++){const id=root(i);if(!clusters.has(id))clusters.set(id,{vertices:[],labels:new Set(),componentCount:0});const c=clusters.get(id);for(const p of components[i].vertices)c.vertices.push(p);for(const label of components[i].labels)c.labels.add(label);c.componentCount++;}
  return [...clusters.values()].map(c=>{const result={partLabels:[...c.labels].sort(),componentCount:c.componentCount,groundHull:convexHull(c.vertices.map(p=>({x:p[0],y:p[2]}))),pointCount:c.vertices.length};Object.defineProperty(result,'vertices',{value:c.vertices});return result;});
}
export function poolWeight(distance,inside=false){
  if(inside||distance<=POOL_MARGIN_METRES)return 1;
  const t=Math.min(1,Math.max(0,(distance-POOL_MARGIN_METRES)/POOL_FADE_METRES));
  return 1-t*t*(3-2*t);
}
export function featureMaskWeights(bytes){
  const indices=[],weights=[];let equivalentPixels=0;
  for(let i=0;i<bytes.length;i+=4){const weight=Math.min(bytes[i],bytes[i+1],bytes[i+2])/255;if(weight>0){indices.push(i);weights.push(weight);equivalentPixels+=weight;}}
  return {indices,weights,equivalentPixels};
}
// Both mapped lights exist even at zero intensity, keeping renderer program keys stable.
// A pool supplies either `bytes` (512x512 grey RGBA, copied into the light's own map) or a `texture` of any size
// (contract v1.2), which becomes the light's map. idleMapSize only sizes the zero map shown before any pool.
export function createCalloutEmphasis(scene,{featureIdFor,featureAreaFor,strength=12000,powers:initialPowers={},pools={},idleMapSize=512}={}){
  const powers={},cache=new Map(Object.entries(pools)),size=512;
  function blankMap(n){const bytes=new Uint8Array(n*n*4);for(let i=3;i<bytes.length;i+=4)bytes[i]=255;const map=new THREE.DataTexture(bytes,n,n,THREE.RGBAFormat);map.minFilter=map.magFilter=THREE.LinearFilter;map.needsUpdate=true;return map;}
  Object.assign(powers,initialPowers);
  let enabled=true;
  let lastCallouts=[],lastAnchors={};
  const lights=Array.from({length:2},(_,slot)=>{
    const light=new THREE.SpotLight(0xffffff,0,0,.15,.5,2);
    light.map=light.userData.ownMap=blankMap(idleMapSize);
    light.name='callout-emphasis-'+slot;light.castShadow=false;
    scene.add(light,light.target);return light;
  });
  function update(callouts,anchors){
    lastCallouts=callouts;lastAnchors=anchors;
    for(let slot=0;slot<2;slot++){
      const light=lights[slot],callout=callouts.find(c=>c.slot===slot),anchor=callout&&anchors?.[featureIdFor(callout)];
      light.intensity=0;
      if(callout&&callout.opacity>0&&anchor?.point){
        const id=featureIdFor(callout);
        if(!cache.has(id)){
          const area=featureAreaFor?.(callout,anchor);
          light.target.position.set(...(area?.target||anchor.point));light.position.copy(light.target.position);
          if(area?.lightPosition)light.position.set(...area.lightPosition);else light.position.add(new THREE.Vector3(40,30,50));
          light.angle=Math.max(.04,Math.atan((Math.hypot(area?.width||.7,area?.height||.7)/2+POOL_MARGIN_METRES+POOL_FADE_METRES+1)/light.position.distanceTo(light.target.position))*2.4);
          scene.updateMatrixWorld(true);light.shadow.updateMatrices(light);
          const planeY=area?.groundY??anchor.point[1],camera=light.shadow.camera,origin=light.position,p=new THREE.Vector3();
          function planePoint(x,y){p.set(x,y,.5).unproject(camera).sub(origin);const t=(planeY-origin.y)/p.y;return {x:origin.x+p.x*t,y:origin.z+p.z*t};}
          const vertices=area?.visibleVertices?.length?area.visibleVertices:area?.vertices;
          let hulls;
          if(area?.clusters?.length)hulls=area.clusters.map(c=>convexHull(c.vertices.map(v=>{p.set(...v).project(camera);return {x:p.x,y:p.y};})).map(v=>planePoint(v.x,v.y)));
          else if(vertices?.length)hulls=[convexHull(vertices.map(v=>{p.set(...v).project(camera);return {x:p.x,y:p.y};})).map(v=>planePoint(v.x,v.y))];
          else {const theta=area?.angle||0,c=Math.cos(theta),s=Math.sin(theta),w=(area?.width||.7)/2,h=(area?.height||.7)/2;hulls=[[[-w,-h],[w,-h],[w,h],[-w,h]].map(([u,v])=>({x:light.target.position.x+u*c-v*s,y:light.target.position.z+u*s+v*c}))];}
          const fields=hulls.map(hull=>{let signed=0;for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];signed+=a.x*b.y-b.x*a.y;}return{hull,signed};});
          const bytes=new Uint8Array(size*size*4);
          for(let y=0;y<size;y++)for(let x=0;x<size;x++){
            const q=planePoint((x+.5)/size*2-1,(y+.5)/size*2-1);let weight=0;
            for(const{hull,signed}of fields){let inside=hull.length>=3,distance=Infinity;
              for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length],dx=b.x-a.x,dy=b.y-a.y;if(((dx*(q.y-a.y)-dy*(q.x-a.x))*signed)<0)inside=false;
                distance=Math.min(distance,pointSegmentDistance(q,a,b));}
              weight=Math.max(weight,poolWeight(distance,inside));if(weight===1)break;
            }
            const value=Math.round(255*weight),at=(y*size+x)*4;bytes[at]=bytes[at+1]=bytes[at+2]=value;bytes[at+3]=255;
          }
          // Hold this world-space pool through its callout instead of rebuilding
          // its map on every frame. The prototype samples the midpoint camera.
          cache.set(id,{bytes,position:light.position.toArray(),target:light.target.position.toArray(),angle:light.angle,hull:hulls.flat(),hulls,clusterCount:hulls.length,planeY,footprint:area?{...area}:null});
        }
        const cached=cache.get(id);light.position.set(...cached.position);light.target.position.set(...cached.target);light.angle=cached.angle;
        if(light.userData.goboId!==id){
          if(cached.texture)light.map=cached.texture;
          else{if(light.userData.ownMap.image.width!==size){light.userData.ownMap.dispose();light.userData.ownMap=blankMap(size);}light.map=light.userData.ownMap;light.map.image.data.set(cached.bytes);light.map.needsUpdate=true;}light.userData.goboId=id;light.userData.pool={featureId:id,hull:cached.hull,hulls:cached.hulls||[cached.hull],clusterCount:cached.clusterCount||1,planeY:cached.planeY,marginMetres:POOL_MARGIN_METRES,fadeMetres:POOL_FADE_METRES};}
        light.intensity=enabled?(powers[callout.id]??strength)*callout.opacity:0;
      }
    }
    scene.updateMatrixWorld(true);
  }
  return {lights,update,poolFor:id=>cache.get(id),addPool(id,pool){cache.set(id,pool);},exportPools:()=>Object.fromEntries(cache),configure(options={}){if(options.enabled!==undefined)enabled=!!options.enabled;if(options.powers)Object.assign(powers,options.powers);update(lastCallouts,lastAnchors);},
    state:()=>lights.map(light=>({name:light.name,type:light.type,intensity:light.intensity,visible:light.visible,castShadow:light.castShadow,penumbra:light.penumbra,angle:light.angle,mapSize:light.map.image.width,goboExteriorFadeMetres:POOL_FADE_METRES,exteriorMarginMetres:POOL_MARGIN_METRES,pool:light.userData.pool,colour:light.color.toArray(),position:light.position.toArray(),target:light.target.position.toArray()}))};
}

// Oriented footprint of actual visible, revealed kit geometry, not a guessed
// archaeological outline. Used only to size the prototype's light field.
export function featureFootprint(items,featureId,{fullGeometry=false,clusters=false}={}){
  const points=[],p=new THREE.Vector3(),instance=new THREE.Matrix4(),matrix=new THREE.Matrix4(),welded=[],triangles=[],labels=[],weld=new Map();
  for(const item of items.filter(item=>item.featureId===featureId))item.handle.object.traverse(mesh=>{
    if(!mesh.isMesh||(!fullGeometry&&!mesh.visible))return;const a=mesh.geometry.attributes.position,index=mesh.geometry.index,draw=fullGeometry?{start:0,count:Infinity}:mesh.geometry.drawRange,end=Math.min(draw.start+draw.count,index?.count??a.count);
    for(let n=0;n<(mesh.isInstancedMesh?mesh.count:1);n++){
      if(mesh.isInstancedMesh){mesh.getMatrixAt(n,instance);matrix.multiplyMatrices(mesh.matrixWorld,instance);}else matrix.copy(mesh.matrixWorld);
      const face=[];for(let i=draw.start;i<end;i++){p.fromBufferAttribute(a,index?index.getX(i):i).applyMatrix4(matrix);const point=[p.x,p.y,p.z];points.push(point);
        if(clusters){const key=point.map(v=>Math.round(v*1e5)).join(',');if(!weld.has(key)){weld.set(key,welded.length);welded.push(point);labels.push(new Set());}const id=weld.get(key);labels[id].add(item.part||item.key||featureId);face.push(id);if(face.length===3){triangles.push([...face]);face.length=0;}}
      }
    }
  });
  if(!points.length)return null;
  const mean=points.reduce((s,p)=>[s[0]+p[0]/points.length,s[1]+p[2]/points.length],[0,0]);let xx=0,xz=0,zz=0,maxY=-Infinity;
  for(const[x,y,z]of points){xx+=(x-mean[0])**2;xz+=(x-mean[0])*(z-mean[1]);zz+=(z-mean[1])**2;maxY=Math.max(maxY,y);}
  const angle=.5*Math.atan2(2*xz,xx-zz),c=Math.cos(angle),s=Math.sin(angle);let u0=Infinity,u1=-Infinity,v0=Infinity,v1=-Infinity;
  for(const[x,,z]of points){const u=x*c+z*s,v=-x*s+z*c;u0=Math.min(u0,u);u1=Math.max(u1,u);v0=Math.min(v0,v);v1=Math.max(v1,v);}
  const u=(u0+u1)/2,v=(v0+v1)/2;
  const area={target:[u*c-v*s,maxY,u*s+v*c],maxY,width:u1-u0,height:v1-v0,angle};
  Object.defineProperty(area,'vertices',{value:points});
  if(clusters){area.clusters=connectedClusters(welded,triangles,labels);area.nativePartCount=items.filter(it=>it.featureId===featureId).length;area.clusterCount=area.clusters.length;area.connectedComponentCount=area.clusters.reduce((n,c)=>n+c.componentCount,0);}
  return area;
}

// An independent depth-tested measurement scene. CPU-displaced proxies match
// the validated M1 surface; no source material, geometry or visibility changes.
export function featureMeasurementScene(scene,items,adapter,featureId){
  const mask=new THREE.Scene(),owners=new WeakMap(items.map(item=>[item.handle.object,item.featureId])),materials=[];
  mask.background=new THREE.Color(0);
  function visit(node,visible=true,role='',owner=null){
    visible=visible&&node.visible;if(!visible)return;
    role=node.userData.sectionRole||role;owner=owners.get(node)||owner;
    if(node.isMesh&&role!=='ground'){
      const mapMaterial=source=>{const material=new THREE.MeshBasicMaterial({color:owner===featureId?0xffffff:0,side:source.side,clippingPlanes:source.clippingPlanes,visible:source.visible,opacity:source.opacity});materials.push(material);return material;};
      const material=Array.isArray(node.material)?node.material.map(mapMaterial):mapMaterial(node.material),geometry=adapter.geometryFor(node);
      const mesh=node.isInstancedMesh?new THREE.InstancedMesh(geometry,material,node.count):new THREE.Mesh(geometry,material);
      if(node.isInstancedMesh)mesh.instanceMatrix=node.instanceMatrix;
      mesh.matrixAutoUpdate=false;mesh.matrix.copy(node.matrixWorld);mesh.layers.mask=node.layers.mask;mask.add(mesh);
    }
    for(const child of node.children)visit(child,visible,role,owner);
  }
  visit(scene);mask.updateMatrixWorld(true);
  return {scene:mask,dispose(){for(const material of materials)material.dispose();}};
}
