import * as THREE from 'three';
import { noiseMaterial } from '../strata-surface.js';
import { labColour,SOIL_LAB } from './colour.js';
import { faceNormal, dot, cross, sub, norm, add, mul, intersectSolid, subtractSolid } from './solid.js';
import { masonryPieces } from './masonry.js';
import { surfacePieces } from './surfaces.js';
import { findPieces } from './finds.js';
import { featureFinish } from './finish.js';
export { KUSHAN_BRICK_SIZES, rectangle } from './masonry.js';
export { buildEraFeature, fig13Specs, eraFeatureSpec } from './presets.js';
const canonical=value=>Array.isArray(value)?'['+value.map(canonical).join(',')+']':value&&typeof value==='object'?'{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}':JSON.stringify(value);
function stableHash(text) {let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619)>>>0;return h.toString(16).padStart(8,'0');}

function createMaterial(outputScale,glass=false,masonry=false,fill=false) {
  return noiseMaterial(new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:glass?.5:1,metalness:0}),
    {seed:6917,outputScale,amplitude:fill?.45:masonry?.045:.12,normalStrength:fill?.1:masonry?.08:.35,ring:!masonry&&!fill});
}
function pieceData(piece) {
  if(piece.render)return piece.render;
  const positions=[],normals=[],colours=[],finish=[];
  const bb=[Infinity,Infinity,Infinity,-Infinity,-Infinity,-Infinity];
  const dustColour=labColour(...SOIL_LAB);
  let anchor=null;
      const colour=labColour(...piece.lab);
      for(const [faceIndex,f] of piece.faces.entries()) {
        const faceColour=piece.faceLabs?.[faceIndex]?labColour(...piece.faceLabs[faceIndex]):!f.surface&&piece.bodyLab?labColour(...piece.bodyLab):colour;
        const n=faceNormal(f);
        for(let i=1;i<f.length-1;i++) {
          const tri=[f[0],f[i],f[i+1]];
          if(Math.hypot(...cross(sub(tri[1],tri[0]),sub(tri[2],tri[0])))<1e-10)continue;
          for(const p of tri) {
            for(let axis=0;axis<3;axis++){bb[axis]=Math.min(bb[axis],p[axis]);bb[axis+3]=Math.max(bb[axis+3],p[axis]);}
            positions.push(...p);normals.push(...(f.surface&&piece.surfaceNormal?piece.surfaceNormal(p[0],p[2]):n));if(piece.finish)finish.push(...(piece.paintDust?[3,f.surface?1:0]:piece.finish));
            const dust=piece.paintDust?0:piece.dustAt?(f.surface||piece.dustAll?piece.dustAt(p[0],p[2],p[1]):0):piece.fadeCentre?((p[0]===piece.fadeCentre[0]&&p[2]===piece.fadeCentre[1])?0:1):
              piece.dustCoat!==undefined?piece.dustCoat*(.35+.65*(.5+.5*Math.sin(p[0]*7.13+Math.sin(p[2]*9.31)*1.7))):Math.max(0,n[1])*.24*(.55+.45*Math.sin(p[0]*29+p[2]*23)**2);
            colours.push(faceColour.r+(dustColour.r-faceColour.r)*dust,faceColour.g+(dustColour.g-faceColour.g)*dust,faceColour.b+(dustColour.b-faceColour.b)*dust);
          }
          const point=mul(add(add(tri[0],tri[1]),tri[2]),1/3),score=point[1]+point[2]*.15+Math.max(0,n[2])*.15;
          if(!anchor||score>anchor.score)anchor={point,normal:n,tier:piece.tier,score};
        }
      }
  piece.faces._bounds=bb;
  return piece.render={positions:new Float32Array(positions),normals:new Float32Array(normals),colours:new Float32Array(colours),finish:piece.finish?new Float32Array(finish):null,anchor};
}
function buildMeshData(pieces,courseCount,materialSlot,compact=false) {
  let selected=pieces.filter(p=>(p.material==='mud'?1:0)===materialSlot).sort((a,b)=>a.tier-b.tier);
  if(compact){
    const key=f=>f.map(v=>v.map(n=>n.toFixed(8)).join(',')).sort().join('|'),counts=new Map();
    for(const p of selected)for(const f of p.faces){const k=key(f);counts.set(k,(counts.get(k)??0)+1);}
    selected=selected.map(p=>({...p,render:null,faces:p.faces.filter(f=>counts.get(key(f))===1)}));
  }
  let length=0;for(const p of selected)length+=pieceData(p).positions.length;
  const positions=new Float32Array(length),normals=new Float32Array(length),colours=new Float32Array(length),finish=selected.some(p=>p.finish)?new Float32Array(length/3*2):null,ends=Array(courseCount+1).fill(0),anchors={};
  let at=0,index=0;const ranges=[];
  for(let tier=1;tier<=courseCount;tier++) {
    while(index<selected.length && selected[index].tier===tier) {
      const p=selected[index++],d=pieceData(p);ranges.push({start:at/3,end:(at+d.positions.length)/3,unitId:p.unitId});positions.set(d.positions,at);normals.set(d.normals,at);colours.set(d.colours,at);if(d.finish)finish.set(d.finish,at/3*2);at+=d.positions.length;
      const key=p.featureId+'@'+tier,prev=anchors[key];
      if(d.anchor&&(!prev||d.anchor.score>prev.score))anchors[key]={...d.anchor,id:p.featureId};
    }
    ends[tier]=at/3;
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));
  if(selected.some(p=>p.finish))g.setAttribute('featureFinish',new THREE.Float32BufferAttribute(finish,2));
  g.computeBoundingBox();g.computeBoundingSphere();
  return {geometry:g,ends,anchors,ranges};
}

export function buildFeature(spec,ctx={}) {
  if(!spec||!spec.id)throw new Error('Feature id is required');
  const outputScale=ctx.outputScale??1;
  let built;
  if(spec.kind==='assembly') {
    const results=spec.children.map(s=>generate(s));
    const levels=[...new Set(results.flatMap(v=>v.levels??[0]).map(y=>Math.round(y*1e6)/1e6))].sort((a,b)=>a-b);
    const pieces=results.flatMap(v=>v.pieces.map(p=>({...p,tier:levels.indexOf(Math.round((v.levels?.[p.tier-1]??0)*1e6)/1e6)+1}))),units=results.flatMap(v=>v.units);
    built={pieces,units,courseCount:Math.max(1,levels.length),provenance:{source:'era-model.json',M:spec.M??[]}};
  } else built=generate(spec);
  const object=new THREE.Group();object.name=spec.id;
  const originals=built.pieces;
  for(const p of originals)p.relief=p.relief??(p.unitId ? .005+.015*(([...p.unitId].reduce((h,c)=>(Math.imul(h,31)+c.charCodeAt(0))>>>0,1)%1000)/999):.003);
  const casts=['assembly','brick-wall','mudbrick-wall','rubble-wall','dressed-wall','brickbat-wall','traced-stone','modern-brick'].includes(spec.kind);
  const fill=['filled-pit','postholes'].includes(spec.kind);
  const fineGrain=casts||['lime-floor','brick-jelly-floor','pottery-lane','tile-drain','pottery-lens'].includes(spec.kind);
  const materials=[createMaterial(outputScale,spec.material==='glass',fineGrain,fill),createMaterial(outputScale,false,true)];
  const disposeFinish=originals.some(p=>p.finish)?featureFinish(materials[0],built.paint):()=>{};
  const meshes=materials.map(m=>{const mesh=new THREE.Mesh(new THREE.BufferGeometry(),m);mesh.castShadow=casts;mesh.receiveShadow=true;mesh.frustumCulled=false;object.add(mesh);return mesh;});
  let data=[],fraction=1,cutsKey=null,disposed=false;
  const bounds=new THREE.Box3(),anchors={};
  const stats={triangles:0,drawCalls:0,generatedTriangles:0,units:built.units.length,unitColours:built.units,provenance:built.provenance,cachedStates:0,cacheBytes:0,cacheStateBytes:[],lastCutCacheHit:false};
  const cache=new Map();
  let revealAnchors=[];
  const handle={object,courseCount:built.courseCount,bounds,anchors,stats,setReveal,setCuts,warmCuts,dispose};
  function refreshReveal() {
    const q=fraction===0?0:Math.min(handle.courseCount,Math.ceil(fraction*handle.courseCount));
    stats.drawCalls=0;stats.triangles=0;
    for(let i=0;i<meshes.length;i++) {
      const count=data[i].ends[q];meshes[i].geometry.setDrawRange(0,count);meshes[i].visible=count>0;
      if(count){stats.drawCalls++;stats.triangles+=count/3;}
    }
    const candidates=revealAnchors[q];
    for(let i=0;i<candidates.length;i++){const a=candidates[i];anchors[a.id]=a;}
  }
  function setReveal(f) {
    if(!Number.isFinite(f))throw new Error('Feature reveal must be finite');
    const next=Math.max(0,Math.min(1,f));
    if(next===fraction)return;fraction=next;refreshReveal();
  }
  function cachedCut({keep=[],trenches=[]}={}) {
    if(disposed)throw new Error('Disposed feature');
    const signature=canonical({keep,trenches}),key=stableHash(signature)+':'+signature;
    const cached=cache.get(key);
    if(cached?.signature===signature){
      cache.delete(key);cache.set(key,cached);return {state:cached,key,hit:true};
    }
    for(const t of trenches)if(!Number.isFinite(t.finalFloor))throw new Error('Trench finalFloor required in local y');
    const pieces=[];
    for(const source of originals) {
      const relief=source.relief;
      // Extend the retained half-space per unit: its solid cap is 5–20 mm proud of the soil cut.
      const proudKeep=keep.map(p=>({normal:p.normal,constant:p.constant+Math.hypot(...p.normal)*relief}));
      let fragments=[intersectSolid(source.faces,proudKeep)].filter(f=>f.length);
      for(const trench of trenches) {
        if(source.base<=trench.finalFloor+1e-8)continue;
        const planes=trench.planes.map(p=>({normal:p.normal,constant:p.constant-Math.hypot(...p.normal)*relief}));
        fragments=fragments.flatMap(f=>subtractSolid(f,planes));
      }
      for(const faces of fragments)pieces.push(faces===source.faces?source:{...source,faces,render:null});
    }
    const next=[0,1].map(slot=>buildMeshData(pieces,handle.courseCount,slot,['lime-floor','traced-stone','pottery-lens'].includes(spec.kind)));
    const nextBounds=new THREE.Box3();
    for(const d of next)nextBounds.union(d.geometry.boundingBox);
    const ids=new Set([spec.id,...originals.map(p=>p.featureId)]);
    const nextAnchors=Array.from({length:handle.courseCount+1},(_,q)=>{
      const found={};let best=null;
      for(const d of next)for(const a of Object.values(d.anchors))if(a.tier<=q&&(!found[a.id]||a.score>found[a.id].score)){
        found[a.id]={...a,visible:true};if(!best||a.score>best.score)best=a;
      }
      return [...ids].map(id=>found[id]??(id===spec.id&&best?{...best,id,visible:true}:{id,point:[0,spec.base??0,0],normal:[0,0,1],visible:false}));
    });
    const bytes=next.reduce((s,d)=>s+Object.values(d.geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0),0);
    const state={signature,data:next,bounds:nextBounds,anchors:nextAnchors,bytes};
    cache.set(key,state);
    while(cache.size>4){
      const oldest=[...cache.keys()].find(k=>k!==cutsKey);
      cache.get(oldest).data.forEach(d=>d.geometry.dispose());cache.delete(oldest);
    }
    return {state,key,hit:false};
  }
  function updateCacheStats(){
    stats.cachedStates=cache.size;stats.cacheBytes=[...cache.values()].reduce((s,v)=>s+v.bytes,0);stats.cacheStateBytes=[...cache.values()].map(v=>v.bytes);
  }
  function setCuts(cuts={}){
    const result=cachedCut(cuts);stats.lastCutCacheHit=result.hit;updateCacheStats();activate(result.state,result.key);
  }
  function warmCuts(cuts={}){
    const start=performance.now();cachedCut(cuts);return performance.now()-start;
  }
  function activate(state,key){
    if(!data.length)meshes.forEach(m=>m.geometry.dispose());
    data=state.data;revealAnchors=state.anchors;cutsKey=key;bounds.copy(state.bounds);
    for(let i=0;i<meshes.length;i++){meshes[i].geometry=data[i].geometry;meshes[i].userData.unitRanges=data[i].ranges;}
    stats.generatedTriangles=data.reduce((s,d)=>s+d.ends.at(-1)/3,0);refreshReveal();
  }
  function dispose() {if(disposed)return;disposed=true;for(const state of cache.values())state.data.forEach(d=>d.geometry.dispose());cache.clear();meshes.forEach(m=>m.material.dispose());disposeFinish();}
  setCuts();
  return handle;
}
function generate(spec) {
  if(['brick-wall','mudbrick-wall','rubble-wall','dressed-wall','brickbat-wall'].includes(spec.kind))return masonryPieces(spec);
  if(['lime-floor','brick-jelly-floor','tile-drain','postholes','filled-pit','pottery-lane','burnt-patches'].includes(spec.kind))return surfacePieces(spec);
  if(['sherd-scatter','modern-brick','traced-stone','pottery-lens'].includes(spec.kind))return findPieces(spec);
  throw new Error(`Unsupported feature kind ${spec.kind}`);
}
