// Convex face clipping. Every output is a closed solid; no renderer clipping planes.
export const EPS = 1e-8;
export const add = (a, b) => a.map((v, i) => v + b[i]);
export const sub = (a, b) => a.map((v, i) => v - b[i]);
export const mul = (a, s) => a.map(v => v * s);
export const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
export const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
export const norm = a => mul(a, 1 / (Math.hypot(...a) || 1));
export const faceNormal = p => {
  for (let i = 1; i < p.length - 1; i++) {
    const n = cross(sub(p[i], p[0]), sub(p[i+1], p[0]));
    if (Math.hypot(...n) > EPS) return norm(n);
  }
  return [0,0,0];
};
const clean = p => p.filter((v,i) => Math.hypot(...sub(v,p[(i+p.length-1)%p.length])) > EPS);
export function clipSolid(faces, plane) {
  const length = Math.hypot(...plane.normal);
  if (!(length > 0) || !Number.isFinite(plane.constant)) throw new Error('Invalid feature cut plane');
  const n = mul(plane.normal,1/length), c = plane.constant/length;
  let bb=faces._bounds;
  if(!bb){
    bb=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
    for(const face of faces)for(const p of face)for(let i=0;i<3;i++){bb[i]=Math.min(bb[i],p[i]);bb[i+3]=Math.max(bb[i+3],p[i]);}
    faces._bounds=bb;
  }
  let minimum=c,maximum=c;
  for(let i=0;i<3;i++){minimum+=n[i]*(n[i]>=0?bb[i]:bb[i+3]);maximum+=n[i]*(n[i]>=0?bb[i+3]:bb[i]);}
  if(minimum>=-EPS)return faces;
  if(maximum < -EPS)return [];
  const out = [], intersections = [];
  let didCut = false, hadInside = false;
  for (const face of faces) {
    const p = [];
    for (let i=0; i<face.length; i++) {
      const a=face[i], b=face[(i+1)%face.length], da=dot(n,a)+c, db=dot(n,b)+c;
      if (da >= -EPS) { p.push(a); hadInside=true; } else didCut=true;
      if ((da > EPS && db < -EPS) || (da < -EPS && db > EPS)) {
        const q=add(a,mul(sub(b,a),da/(da-db))); p.push(q); intersections.push(q);
      } else if (Math.abs(da)<=EPS) intersections.push(a);
    }
    const q=clean(p);
    if (q.length>=3 && Math.hypot(...faceNormal(q))>.5) {if(face.surface)q.surface=true;out.push(q);}
  }
  if (!hadInside) return [];
  if (!didCut) return faces;
  const unique=[];
  for (const p of intersections) if (!unique.some(q=>Math.hypot(...sub(p,q))<EPS*4)) unique.push(p);
  if (unique.length>=3) {
    const centre=mul(unique.reduce((s,p)=>add(s,p),[0,0,0]),1/unique.length), outward=mul(n,-1);
    const u=norm(cross(outward,Math.abs(outward[1])<.9?[0,1,0]:[1,0,0])), v=cross(outward,u);
    unique.sort((a,b)=>Math.atan2(dot(sub(a,centre),v),dot(sub(a,centre),u))-Math.atan2(dot(sub(b,centre),v),dot(sub(b,centre),u)));
    out.push(unique);
  }
  return out;
}
export function intersectSolid(faces,planes) {
  for (const p of planes) { faces=clipSolid(faces,p); if (!faces.length) break; }
  return faces;
}
export function subtractSolid(faces,planes) {
  const outside=[]; let inside=faces;
  for (const p of planes) {
    const q=clipSolid(inside,{normal:mul(p.normal,-1),constant:-p.constant});
    if(q.length) outside.push(q);
    inside=clipSolid(inside,p);
    if(!inside.length) break;
  }
  return outside;
}
export function prism(poly, low, high) {
  // Input footprint is CCW in x/z; its CCW face points downward in y-up.
  let a=poly.filter((p,i)=>i===0 || Math.hypot(p[0]-poly[i-1][0],p[1]-poly[i-1][1])>EPS);
  if(a.length>2 && Math.hypot(a[0][0]-a.at(-1)[0],a[0][1]-a.at(-1)[1])<EPS) a=a.slice(0,-1);
  const area=a.reduce((s,p,i)=>s+p[0]*a[(i+1)%a.length][1]-a[(i+1)%a.length][0]*p[1],0);
  if(area<0) a.reverse();
  if(a.length<3 || Math.abs(area)<EPS) return [];
  const bottom=a.map(([x,z])=>[x,low,z]), top=a.map(([x,z])=>[x,high,z]);
  return [bottom,[...top].reverse(),...bottom.map((p,i)=>[p,top[i],top[(i+1)%a.length],bottom[(i+1)%a.length]])];
}
export function boxSolid(x0,x1,y0,y1,z0,z1) { return prism([[x0,z0],[x1,z0],[x1,z1],[x0,z1]],y0,y1); }
export function tetraSolid(points) {
  return [[0,1,2,3],[0,3,1,2],[0,2,3,1],[1,3,2,0]].map(([a,b,c,opposite])=>{
    const face=[points[a],points[b],points[c]];
    if(dot(faceNormal(face),sub(points[opposite],points[a]))>0)face.reverse();
    return face;
  });
}
export function transformSolid(faces,fn) { return faces.map(face=>{const f=face.map(fn);if(face.surface)f.surface=true;return f;}); }
export function solidVolume(faces) {
  let v=0;
  for(const f of faces) for(let i=1;i<f.length-1;i++) v+=dot(f[0],cross(f[i],f[i+1]))/6;
  return v;
}
