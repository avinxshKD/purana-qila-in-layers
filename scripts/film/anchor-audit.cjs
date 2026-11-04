'use strict';
const fs=require('node:fs'),path=require('node:path'),{root}=require('../browser.cjs'),{loadCpuWorld}=require('./cpu-world.cjs'),{auditSourceManifest}=require('./audit-manifest.cjs');
const args=process.argv.slice(2),get=key=>{const i=args.indexOf(key);return i<0?undefined:args[i+1];};
async function main(){
  if(args.includes('--below-normal')){const os=require('node:os');os.setPriority(0,os.constants.priority.PRIORITY_BELOW_NORMAL);}
  const tree=path.resolve(get('--root')||root),out=path.resolve(get('--out')||path.join(root,'output/film/f2/anchor-audit-worktree'));
  if(fs.existsSync(path.join(out,'summary.json')))throw new Error('Preserve completed audit; pass a new --out');
  const selected=get('--frames'),indices=selected?selected.split(',').map(Number):Array.from({length:1800},(_,i)=>i);if(indices.some(f=>!Number.isInteger(f)||f<0||f>1799))throw new Error('Invalid frame index');
  const sourceManifest=()=>auditSourceManifest(tree);
  const sourceHashes=sourceManifest();
  fs.mkdirSync(out,{recursive:true});const copy=JSON.parse(fs.readFileSync(path.join(tree,'reference/film-callouts.json'))),world=await loadCpuWorld(tree);
  const rows=new Map(),samples=[];let minimumPlinthMargin=Infinity;
  try{for(const frame of indices){
    const {state,applied}=world.apply(frame),visible=world.meshes();minimumPlinthMargin=Math.min(minimumPlinthMargin,world.plinthMargin());
    for(const c of state.overlays.callouts.filter(c=>c.opacity>0)){
      const featureId=copy.sections[c.sectionIndex].callouts[c.slot].featureId,anchor=applied.featureAnchors[featureId],missing=!anchor?.point||anchor.visible===false;
      const result={frame,id:c.id,featureId,opacity:c.opacity,missing,offFrame:false,occluded:false,reason:missing?(anchor?.visible===false?'M1 anchor visible=false':'M1 anchor missing'):null};
      if(!missing){const point=new world.THREE.Vector3(...anchor.point),p=point.clone().project(world.camera),direction=point.clone().sub(world.camera.position),distance=direction.length(),ray=new world.THREE.Raycaster(world.camera.position,direction.normalize(),0,Math.max(0,distance-.0001));
        const hits=world.adapter.intersect(ray,visible.meshes).filter(hit=>{const material=(Array.isArray(hit.object.material)?hit.object.material:[hit.object.material])[hit.face?.materialIndex||0];return material.visible&&material.opacity!==0&&!material.clippingPlanes?.some(plane=>plane.distanceToPoint(hit.point)<0);});
        result.point=anchor.point;result.offFrame=Math.abs(p.x)>1||Math.abs(p.y)>1||Math.abs(p.z)>1;result.occluded=hits.length>0;
        if(hits[0]){const hit=hits[0];result.reason='Surface occludes returned anchor';result.firstBlocker={...visible.contexts.get(hit.object),distanceMetres:hit.distance,metresBeforeAnchor:distance-hit.distance};}
      }
      if(!rows.has(c.id))rows.set(c.id,{id:c.id,featureId,samples:0,occluded:0,missing:0,offFrame:0,occludedFrames:[],missingFrames:[],offFrameFrames:[],firstFailure:null});
      const row=rows.get(c.id);row.samples++;for(const flag of['occluded','missing','offFrame'])if(result[flag]){row[flag]++;row[flag+'Frames'].push(frame);}if(!row.firstFailure&&(result.occluded||result.missing||result.offFrame))row.firstFailure=result;
      samples.push(result);
    }
    if(frame%150===0)console.log('CPU anchor audit '+frame+'/1800');
  }}finally{await world.close();}
  const summary={root:tree,cpuOnly:true,webglContexts:0,framesAudited:indices.length,anchorSamples:samples.length,rayToleranceMetres:.0001,minimumPlinthMargin,sourceHashes,sourceConsistent:JSON.stringify(sourceHashes)===JSON.stringify(sourceManifest()),
    missingAnchorIsNotProjectedOffFrame:true,counts:{occluded:samples.filter(s=>s.occluded).length,missing:samples.filter(s=>s.missing).length,offFrame:samples.filter(s=>s.offFrame).length},perId:[...rows.values()]};
  if(get('--compare')){
    const baseline=JSON.parse(fs.readFileSync(path.resolve(get('--compare')))),expected=new Map(baseline.flatMap(row=>row.anchorVisibility.map(a=>[row.frame+':'+a.id,a]))),differences=[];
    let maxBlockerDistanceDelta=0;
    for(const sample of samples){const old=expected.get(sample.frame+':'+sample.id);if(!old){differences.push({frame:sample.frame,id:sample.id,reason:'No baseline sample'});continue;}
      if(!!old.missing!==sample.missing||!!old.occluded!==sample.occluded||(!old.missing&&!!old.offFrame)!==sample.offFrame)differences.push({frame:sample.frame,id:sample.id,reason:'Visibility differs'});
      if(old.firstBlockingHit&&sample.firstBlocker){const delta=Math.abs(old.firstBlockingHit.distance-sample.firstBlocker.distanceMetres);maxBlockerDistanceDelta=Math.max(maxBlockerDistanceDelta,delta);if(delta>1e-7)differences.push({frame:sample.frame,id:sample.id,reason:'First-blocker distance differs',delta});}
      if(old.point&&sample.point&&Math.hypot(...old.point.map((v,i)=>v-sample.point[i]))>1e-7)differences.push({frame:sample.frame,id:sample.id,reason:'Anchor point differs'});
    }
    summary.baselineComparison={file:path.resolve(get('--compare')),samplesCompared:samples.length,maxBlockerDistanceDelta,differences};
  }
  fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');fs.writeFileSync(path.join(out,'samples.json'),JSON.stringify(samples,null,2)+'\n');
  const csv=['id,featureId,samples,occluded,missing,offFrame,firstFailureFrame,firstBlockerMetresBeforeAnchor'];for(const r of rows.values())csv.push([r.id,r.featureId,r.samples,r.occluded,r.missing,r.offFrame,r.firstFailure?.frame??'',r.firstFailure?.firstBlocker?.metresBeforeAnchor??''].join(','));
  fs.writeFileSync(path.join(out,'per-id.csv'),csv.join('\n')+'\n');console.log(JSON.stringify({frames:indices.length,...summary.counts,minimumPlinthMargin,out}));
  if(!summary.sourceConsistent||summary.baselineComparison?.differences.length)throw new Error('Source changed or baseline parity failed; see summary.json');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
