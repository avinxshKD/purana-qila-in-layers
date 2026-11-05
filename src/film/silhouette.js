import * as THREE from 'three';
// CPU raster of the actual visible triangles, not a hull. A covered quarter-
// resolution cell is kept in full, so measured gaps are conservative by at
// most one cell diagonal. No GL calls are made, including during frame audits.
const geometryCache=new WeakMap(),blockRoles=new Set(['cutface','top','floor','feature']);
function indexedGeometry(geometry){
  const attribute=geometry.attributes.position,old=geometryCache.get(geometry);
  if(old?.attribute===attribute&&old.version===attribute.version&&old.indexAttribute===geometry.index&&old.indexVersion===geometry.index?.version)return old;
  let positions,index;
  if(geometry.index){positions=attribute.array;index=geometry.index.array;}
  else{
    const unique=[],lookup=new Map();index=new Uint32Array(attribute.count);
    for(let i=0;i<attribute.count;i++){
      const x=attribute.getX(i),y=attribute.getY(i),z=attribute.getZ(i),key=x+'|'+y+'|'+z;
      let at=lookup.get(key);if(at===undefined){at=unique.length/3;lookup.set(key,at);unique.push(x,y,z);}index[i]=at;
    }positions=new Float64Array(unique);
  }
  const reuse=old?.world.length===positions.length;
  const result={attribute,version:attribute.version,indexAttribute:geometry.index,indexVersion:geometry.index?.version,positions,index,world:reuse?old.world:new Float64Array(positions.length),screen:reuse?old.screen:new Float64Array(positions.length),matrix:[]};
  geometryCache.set(geometry,result);return result;
}
function clipPolygon(points,planes){
  let result=points;
  for(const plane of planes){
    const next=[],distance=p=>plane.normal.x*p[0]+plane.normal.y*p[1]+plane.normal.z*p[2]+plane.constant;
    for(let i=0;i<result.length;i++){
      const a=result[i],b=result[(i+1)%result.length],da=distance(a),db=distance(b);
      if(da>=0)next.push(a);
      if((da>=0)!==(db>=0)){const t=da/(da-db);next.push(a.map((v,k)=>v+(b[k]-v)*t));}
    }result=next;if(!result.length)break;
  }return result;
}
export function createSceneSilhouette(scene,camera,{width=1920,height=1080,cell=4,geometryAdapter}={}){
  const columns=Math.ceil(width/cell),rowCount=Math.ceil(height/cell),bits=new Uint8Array(columns*rowCount),scalePoints=[];
  const pv=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).elements;
  let blockLowestY=-Infinity,triangles=0,vertices=0;
  const project=(x,y,z)=>{
    const w=pv[3]*x+pv[7]*y+pv[11]*z+pv[15];
    if(w<=0)throw new Error('Silhouette triangle crosses the camera plane');
    return [((pv[0]*x+pv[4]*y+pv[8]*z+pv[12])/w+1)*width/2,(1-(pv[1]*x+pv[5]*y+pv[9]*z+pv[13])/w)*height/2,0];
  };
  function raster(a,b,c,role,side,orientation){
    const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(Math.abs(area)<1e-9||side!==THREE.DoubleSide&&(side===THREE.BackSide?area*orientation<=0:area*orientation>=0))return;
    if(blockRoles.has(role))blockLowestY=Math.max(blockLowestY,a[1],b[1],c[1]);triangles++;
    const p=[a,b,c].map(v=>[v[0]/cell,v[1]/cell]),low=Math.min(a[1],b[1],c[1])/cell,high=Math.max(a[1],b[1],c[1])/cell;
    for(let row=Math.max(0,Math.floor(low));row<=Math.min(rowCount-1,Math.floor(high));row++){
      let left=Infinity,right=-Infinity;
      for(let k=0;k<3;k++){
        const u=p[k],v=p[(k+1)%3];
        if(u[1]>=row&&u[1]<=row+1){left=Math.min(left,u[0]);right=Math.max(right,u[0]);}
        for(const y of [row,row+1])if((u[1]<=y&&v[1]>=y||v[1]<=y&&u[1]>=y)&&u[1]!==v[1]){
          const x=u[0]+(v[0]-u[0])*(y-u[1])/(v[1]-u[1]);left=Math.min(left,x);right=Math.max(right,x);
        }
      }
      if(right>=left){const start=Math.max(0,Math.floor(left)),end=Math.min(columns-1,Math.floor(right));if(start<=end)bits.fill(1,row*columns+start,row*columns+end+1);}
    }
  }
  function mesh(object,role,matrix){
    const geometry=geometryAdapter?.geometryFor(object)||object.geometry;
    const cached=indexedGeometry(geometry),m=matrix.elements,world=cached.world,screen=cached.screen;
    if(m.some((v,i)=>v!==cached.matrix[i])){
      for(let i=0;i<cached.positions.length;i+=3){
        const x=cached.positions[i],y=cached.positions[i+1],z=cached.positions[i+2];
        world[i]=m[0]*x+m[4]*y+m[8]*z+m[12];world[i+1]=m[1]*x+m[5]*y+m[9]*z+m[13];world[i+2]=m[2]*x+m[6]*y+m[10]*z+m[14];
      }cached.matrix=[...m];
    }
    for(let i=0;i<world.length;i+=3){const p=project(world[i],world[i+1],world[i+2]);screen[i]=p[0];screen[i+1]=p[1];}
    vertices+=world.length/3;
    if(role==='scale'){for(let i=0;i<screen.length;i+=3)scalePoints.push({x:screen[i],y:screen[i+1]});return;}
    const materials=Array.isArray(object.material)?object.material:[object.material],orientation=Math.sign(matrix.determinant());
    const groups=geometry.groups.length&&materials.length>1?geometry.groups:[{start:0,count:cached.index.length,materialIndex:0}];
    for(const group of groups){
      const material=materials[group.materialIndex||0];if(!material?.visible||material.opacity===0)continue;
      const planes=material.clippingPlanes||[];
      if(material.clipIntersection&&planes.length>1)throw new Error('Silhouette needs union clipping support for this material');
      const start=Math.max(group.start,geometry.drawRange.start),end=Math.min(group.start+group.count,cached.index.length,geometry.drawRange.start+geometry.drawRange.count);
      for(let at=start;at<end;at+=3){
        const ids=[cached.index[at]*3,cached.index[at+1]*3,cached.index[at+2]*3];
        let outside=false,mixed=false;
        for(const plane of planes){
          let count=0;for(const i of ids)if(plane.normal.x*world[i]+plane.normal.y*world[i+1]+plane.normal.z*world[i+2]+plane.constant<0)count++;
          if(count===3){outside=true;break;}if(count)mixed=true;
        }if(outside)continue;
        if(!mixed)raster(...ids.map(i=>[screen[i],screen[i+1]]),role,material.side,orientation);
        else{
          const polygon=clipPolygon(ids.map(i=>[world[i],world[i+1],world[i+2]]),planes).map(p=>project(...p));
          for(let i=1;i+1<polygon.length;i++)raster(polygon[0],polygon[i],polygon[i+1],role,material.side,orientation);
        }
      }
    }
  }
  function visit(object,role='',visible=true){
    visible=visible&&object.visible;if(!visible)return;role=object.userData.sectionRole||role;
    if(object.isMesh&&(blockRoles.has(role)||role==='plinth'||role==='scale')){
      if(object.isInstancedMesh){
        const instance=new THREE.Matrix4(),matrix=new THREE.Matrix4();for(let i=0;i<object.count;i++){object.getMatrixAt(i,instance);matrix.multiplyMatrices(object.matrixWorld,instance);mesh(object,role,matrix);}
      }else mesh(object,role,object.matrixWorld);
    }for(const child of object.children)visit(child,role,visible);
  }
  scene.updateMatrixWorld(true);visit(scene);
  const rows=Array.from({length:rowCount},()=>[]);
  for(let y=0;y<rowCount;y++)for(let x=0;x<columns;){
    if(!bits[y*columns+x]){x++;continue;}const start=x;while(x<columns&&bits[y*columns+x])x++;rows[y].push([start*cell,Math.min(width,x*cell)]);
  }
  const report={method:'Conservative raster of projected visible clipped mesh triangles; no box hull, shadows or HUD',maskWidth:columns,maskHeight:rowCount,cellPixels:cell,maximumRasterOverreachPixels:cell*Math.SQRT2,triangles,uniqueVertices:vertices,blockLowestY};
  return silhouetteFromRows(rows,{cell,blockLowestY,scalePoints,report});
}
// Rebuilds the distance query from serialized runs (for example, rows rastered in a worker).
export function silhouetteFromRows(rows,{cell=4,blockLowestY=-Infinity,scalePoints=[],report={}}={}){
  const rowCount=rows.length;
  function distanceRect(rect,limit=Infinity){
    let result=limit;
    const first=Number.isFinite(limit)?Math.max(0,Math.floor((rect.y-limit)/cell)):0,last=Number.isFinite(limit)?Math.min(rowCount-1,Math.floor((rect.y+rect.height+limit)/cell)):rowCount-1;
    for(let y=first;y<=last;y++){
      const dy=Math.max(y*cell-rect.y-rect.height,rect.y-(y+1)*cell,0);if(dy>result)continue;
      for(const [left,right]of rows[y]){
        const dx=Math.max(left-rect.x-rect.width,rect.x-right,0);result=Math.min(result,Math.hypot(dx,dy));if(result===0)return 0;
      }
    }return result;
  }
  return {distanceRect,blockLowestY,scalePoints,rows,cell,report};
}
