// The framing reference is the full pre-excavation block (sceneForYear(2013)) rastered at the hero pose. It is
// shipped precomputed so that framing needs no step geometry before ready; verifyFraming in scene.js recomputes it
// live and compares, and deploy-check runs that comparison. The shipped record is framing-reference.json.

const round=value=>+value.toFixed(6);
// Everything the raster depends on besides the block geometry: camera pose, projection and raster size.
export function referenceKey(camera,size){
  return JSON.stringify({position:camera.position.toArray().map(round),quaternion:camera.quaternion.toArray().map(round),fov:round(camera.fov),aspect:round(size.width/size.height),width:size.width,height:size.height,cell:size.cell});
}
export function shippedReference(key,source){
  if(!source?.rows||source.key!==key)return null;
  return {rows:source.rows.map(runs=>runs.map(run=>[...run])),cell:source.cell,width:source.width,height:source.height};
}
export function referenceRecord(key,raster,from){return {key,from,cell:raster.cell,width:raster.width,height:raster.height,rows:raster.rows};}
export function rowsEqual(a,b){
  if(a.cell!==b.cell||a.width!==b.width||a.height!==b.height||a.rows.length!==b.rows.length)return false;
  return a.rows.every((runs,y)=>runs.length===b.rows[y].length&&runs.every((run,i)=>run[0]===b.rows[y][i][0]&&run[1]===b.rows[y][i][1]));
}
// Silhouette boundary samples in reference pixels: both ends of every run, at the top and bottom of its row.
function boundary({rows,cell}){
  const points=[];rows.forEach((runs,y)=>{for(const [l,r] of runs)for(const yy of [y*cell,(y+1)*cell])points.push([l,yy],[r,yy]);});return points;
}
const toScreen=(points,reference,framing)=>points.map(([x,y])=>[framing.centre.x+framing.k*(x-reference.centre.x),framing.centre.y+framing.k*(y-reference.centre.y)]);
// Symmetric Hausdorff distance, in CSS px, between two framed silhouettes (raster + its framing solution).
export function silhouetteDisplacement(a,b){
  const pa=toScreen(boundary(a.raster),a.reference,a.framing),pb=toScreen(boundary(b.raster),b.reference,b.framing);
  const directed=(p,q)=>{let worst=0;for(const [x,y] of p){let best=Infinity;for(const [u,v] of q){const d=(x-u)**2+(y-v)**2;if(d<best){best=d;if(best===0)break;}}worst=Math.max(worst,best);}return Math.sqrt(worst);};
  return Math.max(directed(pa,pb),directed(pb,pa));
}
