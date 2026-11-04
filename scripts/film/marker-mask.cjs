'use strict';
function ghostMask(width,height,boxes,dpr=1){
  const mask=new Uint8Array(width*height);
  for(const box of boxes)for(let y=Math.max(0,Math.floor(box.y*dpr));y<Math.min(height,Math.ceil((box.y+box.height)*dpr));y++){
    mask.fill(1,y*width+Math.max(0,Math.floor(box.x*dpr)),y*width+Math.min(width,Math.ceil((box.x+box.width)*dpr)));
  }
  return mask;
}
function maskedDifference(before,after,width,height,boxes,dpr=1){
  if(before.length!==after.length||before.length!==width*height*4)throw new Error('Image dimensions differ');
  const mask=ghostMask(width,height,boxes,dpr),outside=[];let inside=0;
  for(let pixel=0;pixel<mask.length;pixel++){const i=pixel*4;if(before.subarray(i,i+4).equals(after.subarray(i,i+4)))continue;
    if(mask[pixel])inside++;else outside.push({x:pixel%width,y:Math.floor(pixel/width),before:[...before.subarray(i,i+4)],after:[...after.subarray(i,i+4)]});
  }
  return {onlyGhostBoxesChanged:outside.length===0,insideGhostPixels:inside,outsideGhostPixels:outside.length,outside};
}
module.exports={ghostMask,maskedDifference};
