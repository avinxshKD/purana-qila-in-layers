import { Vector2, ShapeUtils } from 'three';
import { rng, unitLab, SOIL_LAB } from './colour.js';
import { prism, clipSolid, intersectSolid, transformSolid } from './solid.js';

export const KUSHAN_BRICK_SIZES = [[.39,.27,.06],[.37,.22,.055],[.33,.22,.05]];
export const rectangle = (length,width,x=0,z=0) => [[x,z],[x+length,z],[x+length,z+width],[x,z+width]];
export function footprintOf(spec) {
  if(spec.footprint) return spec.footprint;
  if(!spec.polyline || !(spec.width>0)) throw new Error('Feature needs footprint or polyline with positive width');
  if(spec.polyline.length!==2) throw new Error('Wall polyline uses two points; use assembly for turns');
  const [a,b]=spec.polyline, d=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/d*spec.width/2,nz=(b[0]-a[0])/d*spec.width/2;
  return [[a[0]+nx,a[1]+nz],[a[0]-nx,a[1]-nz],[b[0]-nx,b[1]-nz],[b[0]+nx,b[1]+nz]];
}
function planesOf(poly) {
  const area=poly.reduce((s,p,i)=>s+p[0]*poly[(i+1)%poly.length][1]-poly[(i+1)%poly.length][0]*p[1],0);
  const p=area<0?[...poly].reverse():poly;
  return p.map((a,i)=>{const b=p[(i+1)%p.length],n=[a[1]-b[1],0,b[0]-a[0]];return {normal:n,constant:-n[0]*a[0]-n[2]*a[1]};});
}
export function triangulateFootprint(poly) {
  const p=poly.map(v=>new Vector2(...v)); const t=ShapeUtils.triangulateShape(p,[]);
  return t.map(ids=>ids.map(i=>[p[i].x,p[i].y]));
}
export function clipToFootprint(faces, triangles) {
  const vertices=faces.flat(),x0=Math.min(...vertices.map(p=>p[0])),x1=Math.max(...vertices.map(p=>p[0])),z0=Math.min(...vertices.map(p=>p[2])),z1=Math.max(...vertices.map(p=>p[2]));
  return triangles.filter(t=>Math.max(...t.map(p=>p[0]))>=x0 && Math.min(...t.map(p=>p[0]))<=x1 && Math.max(...t.map(p=>p[1]))>=z0 && Math.min(...t.map(p=>p[1]))<=z1)
    .map(t=>intersectSolid(faces,planesOf(t))).filter(f=>f.length);
}
function bounds(poly) {return {x0:Math.min(...poly.map(p=>p[0])),x1:Math.max(...poly.map(p=>p[0])),z0:Math.min(...poly.map(p=>p[1])),z1:Math.max(...poly.map(p=>p[1]))};}
function inside([x,z],poly) {
  let ok=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++) if((poly[i][1]>z)!==(poly[j][1]>z)&&x<(poly[j][0]-poly[i][0])*(z-poly[i][1])/(poly[j][1]-poly[i][1])+poly[i][0]) ok=!ok;
  return ok;
}
export function masonryPieces(spec) {
  const r=rng(spec.seed??spec.id),raw=footprintOf(spec), base=spec.base??0;
  let angle=spec.angle;
  if(angle===undefined) {
    const mx=raw.reduce((s,p)=>s+p[0],0)/raw.length,mz=raw.reduce((s,p)=>s+p[1],0)/raw.length;
    let xx=0,zz=0,xz=0;for(const p of raw){xx+=(p[0]-mx)**2;zz+=(p[1]-mz)**2;xz+=(p[0]-mx)*(p[1]-mz);}
    angle=.5*Math.atan2(2*xz,xx-zz);
  }
  const c=Math.cos(angle),s=Math.sin(angle),toLocal=([x,z])=>[c*x+s*z,-s*x+c*z],toWorld=([x,y,z])=>[c*x-s*z,y,s*x+c*z];
  const poly=raw.map(toLocal),bb=bounds(poly),triangles=triangulateFootprint(poly),kind=spec.kind;
  const orientation=poly.reduce((sum,p,i)=>sum+p[0]*poly[(i+1)%poly.length][1]-poly[(i+1)%poly.length][0]*p[1],0)<0?-1:1;
  const edgeKey=(a,b)=>[a.join(','),b.join(',')].sort().join('|'),boundaryPlanes=new Map();
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],n=[(a[1]-b[1])*orientation,0,(b[0]-a[0])*orientation],length=Math.hypot(...n);
    if(length>1e-8)boundaryPlanes.set(edgeKey(a,b),{normal:n,constant:-n[0]*a[0]-n[2]*a[1]-.006*length});
  }
  const brick=kind==='brick-wall'||kind==='mudbrick-wall',bat=kind==='brickbat-wall';
  const sizes=spec.brickSizes??(kind==='mudbrick-wall'?[[.38,.23,.09],[.35,.24,.085]]:KUSHAN_BRICK_SIZES);
  const material=spec.material??(kind==='brick-wall'?'fired-brick':kind==='mudbrick-wall'?'mudbrick':bat?'brickbat':'stone');
  const courseHeight=brick?Math.max(...sizes.map(q=>q[2]))+.011:bat?.055:kind==='dressed-wall'?.25:.22;
  const courseCount=spec.courses??Math.max(1,Math.ceil((spec.height??(brick?.22:bat?.11:.65))/courseHeight));
  const height=spec.height??courseCount*courseHeight,pieces=[],units=[];
  let id=0;
  function append(faces,tier,lab,isMortar=false,unitId=null) {
    if(!faces.length)return;
    for(const solid of clipToFootprint(faces,triangles)) pieces.push({faces:transformSolid(solid,toWorld),tier,lab,material:isMortar?'mud':material,unitId,featureId:spec.id,base});
  }
  for(let course=0;course<courseCount;course++) {
    const y=base+height*course/courseCount,courseTop=base+height*(course+1)/courseCount;
    // Continuous soil-coloured mortar backs the units. It is inset a few mm, not an empty
    // shadow slot. The top course keeps only a low bed, so missing units lower the outline.
    const coreTop=course===courseCount-1&&!spec.buriedTop?Math.min(courseTop,y+(brick?.009:.035)):courseTop-.003;
    for(const t of triangles){
      // Recess only actual contour edges. Internal triangulation edges stay shared, so
      // there is no expensive triangle-against-triangle overlay and no diagonal grout grid.
      const planes=t.map((a,i)=>boundaryPlanes.get(edgeKey(a,t[(i+1)%3]))).filter(Boolean);
      const faces=intersectSolid(prism(t,y,coreTop),planes);
      if(faces.length)pieces.push({faces:transformSolid(faces,toWorld),tier:course+1,lab:SOIL_LAB,material:'mud',unitId:null,featureId:spec.id,base});
    }
    const depth=brick?Math.max(...sizes.map(q=>q[1]))+.012:bat?.13:kind==='dressed-wall'?.34:.31;
    let row=0;
    for(let z=bb.z0;z<bb.z1;z+=depth,row++) {
      let x=bb.x0-(course%2?.18:0)-(row%2?.1:0);
      while(x<bb.x1) {
        const size=brick?sizes[Math.floor(r()*sizes.length)]:bat?[.07+r()*.15,.07+r()*.07,.025+r()*.025]:
          [kind==='dressed-wall'?.28+r()*.27:.17+r()*.32,depth-.018,Math.min(courseTop-y-.01,.13+r()*.11)];
        const gap=brick?.009+r()*.009:.012+r()*.018;
        const nx=x+size[0],z1=z+size[1];
        let outline;
        if(brick) {
          const chip=kind==='mudbrick-wall'?.018+r()*.018:.003+r()*.009;
          outline=[[x+chip,z],[nx-chip,z],[nx,z+chip],[nx,z1-chip],[nx-chip,z1],[x+chip,z1],[x,z1-chip],[x,z+chip]];
        } else {
          // Irregular angular six-sided fragments; never rounded pill silhouettes.
          outline=[[x+.02,z+.015],[nx-.02,z],[nx,z+(z1-z)*(.25+r()*.3)],[nx-.015,z1],[x+.02,z1-.01],[x,z+(z1-z)*(.3+r()*.3)]];
        }
        const topMissing=course===courseCount-1 && r()<(brick?.17:.11);
        if(!topMissing) {
          const dusty=units.length%10<7,lab=unitLab(material,r,dusty),unitId=`${spec.id}:${id++}`;
          const y0=y+(brick?.008:.018),y1=Math.min(courseTop-.003,y0+size[2]);
          let solid=prism(outline,y0,y1);
          if(kind==='mudbrick-wall'&&solid.length){
            const cx=(x+nx)/2,cz=(z+z1)/2;
            solid=transformSolid(solid,([px,py,pz])=>py>y0?[cx+(px-cx)*.97,py,cz+(pz-cz)*.94]:[px,py,pz]);
          }
          if(kind==='rubble-wall'&&solid.length) {
            // Random-rubble faces are angular broken stones, not extruded rectangular tiles.
            // Tilt each unit around its own centre and shear the sloping, fractured upper face.
            const tiltX=(r()-.5)*.32,tiltZ=(r()-.5)*.30,midY=(y0+y1)/2,cx=(x+nx)/2,cz=(z+z1)/2;
            solid=transformSolid(solid,([px,py,pz])=>{
              const yy=py-midY,xx=px-cx,zz=pz-cz;
              return [cx+xx+yy*tiltZ,midY+yy+xx*tiltZ+zz*tiltX,cz+zz+yy*tiltX];
            });
            const bnx=(r()-.5)*.7,bnz=(r()-.5)*.7;
            solid=clipSolid(solid,{normal:[bnx,-1,bnz],constant:y1-.015-bnx*cx-bnz*cz});
          }
          // A small sloped spall, not a uniform bevelled border.
          if(solid.length && r()<.32){
            const nxp=(r()-.5)*.04,nzp=(r()-.5)*.04;
            solid=clipSolid(solid,{normal:[nxp,-1,nzp],constant:y1+.003-nxp*(x+nx)/2-nzp*(z+z1)/2});
          }
          const centre=[(x+nx)/2,(z+z1)/2];
          const clear=outline.every(p=>inside(p,poly))&&!poly.some(p=>p[0]>x&&p[0]<nx&&p[1]>z&&p[1]<z1);
          const fragments=clear?[solid]:clipToFootprint(solid,triangles);
          if(fragments.length) {
            units.push({id:unitId,lab,material,dusty:material==='fired-brick'||material==='brickbat'?dusty:null,size:[...size],course:course+1,centre:toWorld([centre[0],(y0+y1)/2,centre[1]])});
            for(const f of fragments) pieces.push({faces:transformSolid(f,toWorld),tier:course+1,lab,material,unitId,featureId:spec.id,base});
          }
        }
        x=nx+gap;
      }
    }
  }
  return {pieces,units,courseCount,levels:Array.from({length:courseCount},(_,i)=>base+height*i/courseCount),provenance:{source:spec.source??'era-model.json',M:spec.M??['packing, joints, missing units, dust and relief; unknown surviving heights schematic']}};
}
