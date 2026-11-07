// Hero-still placement: the still is a frame of the 3D hero view at a known framing (k, centre at its capture
// size), so the same site framing solved for this viewport says where the block will be once 3D starts. Drawing the
// still with that similarity makes the hand-over a cross-fade in place. Pure; main.js measures the HUD.
import {createReference,rowsWithBar,solveSiteFraming} from './framing.js';
import {calloutMetrics} from './callouts.js';
// Same metrics scale-bar.js uses: label cap and gap scale with min(width/1920, height/1080) above their minimums.
export function scaleLabelBlock(labels,width,height){
  const scale=Math.min(width/1920,height/1080),cap=Math.max(labels.capMinPx,labels.capPx1080*scale),gap=Math.max(labels.gapMinPx,labels.gapPx1080*scale),size=cap/.66;
  return {gap,cap,halfWidth:Math.max(...labels.widthEm)*size/2+2};
}
// Image px -> CSS px: screen = offset + scale * image.
export function posterMapping(image,framing){
  const c=image.capture,ratio=framing.k/c.k,scale=ratio/c.deviceScaleFactor;
  return {scale,x:framing.centre.x-ratio*c.centre.x,y:framing.centre.y-ratio*c.centre.y,mode:'framed'};
}
export function coverMapping(image,width,height){
  const scale=Math.max(width/image.width,height/image.height);return {scale,x:(width-image.width*scale)/2,y:(height-image.height*scale)/2,mode:'cover'};
}
// shipped: framing-reference.json, the raster scene.js frames with.
export function solvePosterPlacement({layout,shipped,image,width,height,hudFor}){
  const raster={rows:shipped.rows,cell:shipped.cell,width:shipped.width,height:shipped.height};
  if(shipped.key!==layout.reference.key||!image.capture)return {mapping:coverMapping(image,width,height),framing:null,reason:'poster layout made for another reference'};
  const labels=scaleLabelBlock(layout.reference.scaleLabels,width,height);
  const {framing}=solveSiteFraming({width,height,hudFor,metrics:calloutMetrics(width,height),referenceFor:k=>createReference({...raster,rows:rowsWithBar(raster,layout.reference.barBox,labels,k)})});
  return framing.feasible?{mapping:posterMapping(image,framing),framing}:{mapping:coverMapping(image,width,height),framing,reason:framing.reason};
}
// Edges of the still that fall inside the viewport fade into the page ground; edges outside it stay hard.
// A small still (phone landscape) fades over a third of its size, so its backdrop reads as a soft glow, not a box.
export function edgeFade(mapping,image,width,height,fade=96){
  const w=image.width*mapping.scale,h=image.height*mapping.scale,f=edge=>edge>.5?Math.min(fade,w/3,h/3):0;
  const left=f(mapping.x),top=f(mapping.y),right=f(width-mapping.x-w),bottom=f(height-mapping.y-h);
  if(!(left||top||right||bottom))return '';
  return `linear-gradient(to right,transparent,#000 ${left}px,#000 calc(100% - ${right}px),transparent),linear-gradient(to bottom,transparent,#000 ${top}px,#000 calc(100% - ${bottom}px),transparent)`;
}
