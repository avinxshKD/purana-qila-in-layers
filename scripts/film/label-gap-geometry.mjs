// CPU geometry for the label audit: per film frame, the real silhouette raster rows,
// block lowest y, scale points and visible feature anchors, from the pinned tree.
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{loadCpuWorld}=require('./cpu-world.cjs');
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1],tree=path.resolve(get('--tree')),from=Number(get('--from')),to=Number(get('--to')),out=path.resolve(get('--out'));
if(fs.existsSync(out))throw new Error('Preserve geometry chunk '+out);
const warn=console.warn;console.warn=(...a)=>{if(!String(a[0]).includes('already non-indexed'))warn(...a);};
const world=await loadCpuWorld(tree),{sceneFraming}=await import(new URL('../../src/film/framing.js',import.meta.url).href);// same raster as the tree; this copy also returns its rows
const copy=JSON.parse(fs.readFileSync(path.join(tree,'reference/film-callouts.json')));
const frames=[],started=performance.now();
for(let frame=from;frame<to;frame++){
  const {state,applied}=world.apply(frame),framing=sceneFraming(world.scene,world.camera,1920,1080,{geometryAdapter:world.adapter}),anchors={};
  for(const c of state.overlays.callouts){const id=copy.sections[c.sectionIndex].callouts[c.slot].featureId,a=applied.featureAnchors?.[id];if(a?.visible!==false&&a?.point)anchors[id]=a.point;}
  const s=framing.silhouette;if(!s.rows)throw new Error('Silhouette rows missing');frames.push({frame,rows:s.rows,cell:s.cell,blockLowestY:s.blockLowestY,scalePoints:s.scalePoints.map(p=>[p.x,p.y]),anchors,cameraPosition:world.camera.position.toArray(),minimumMargin:framing.minimumMargin});
}
fs.writeFileSync(out,JSON.stringify({tree,from,to,base:world.block.base,seconds:(performance.now()-started)/1000,frames}));
console.log(JSON.stringify({from,to,seconds:(performance.now()-started)/1000}));
