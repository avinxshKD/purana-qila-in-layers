// Site pool fields: the film's 512x512 RGBA grey light fields stored as 8-bit single-channel rasters at a
// lower resolution. Box-downsampled texel centres line up with the source pixel centres, so bilinear
// upsampling reproduces the same placement; the fields are soft (0.75 m smoothstep fades), not detail.
export function downsampleField(rgba,size,factor){
  if(rgba.length!==size*size*4||size%factor)throw new Error('Pool field size differs');
  const out=size/factor,data=new Uint8Array(out*out),area=factor*factor;
  for(let y=0;y<out;y++)for(let x=0;x<out;x++){
    let sum=0;for(let dy=0;dy<factor;dy++)for(let dx=0;dx<factor;dx++)sum+=rgba[((y*factor+dy)*size+x*factor+dx)*4];
    data[y*out+x]=Math.round(sum/area);
  }
  return data;
}
// Grey RGBA (alpha 255) at `target` size: the layout the shared spotlight gobo copies into its map.
export function upsampleField(data,size,target){
  if(data.length!==size*size)throw new Error('Pool field size differs');
  const rgba=new Uint8Array(target*target*4),scale=size/target,last=size-1,axis=new Float64Array(target),lo=new Int32Array(target),hi=new Int32Array(target);
  for(let i=0;i<target;i++){const u=Math.min(last,Math.max(0,(i+.5)*scale-.5)),a=Math.floor(u);lo[i]=a;hi[i]=Math.min(last,a+1);axis[i]=u-a;}
  for(let y=0;y<target;y++){
    const fy=axis[y],r0=lo[y]*size,r1=hi[y]*size;
    for(let x=0;x<target;x++){
      const fx=axis[x],a=data[r0+lo[x]],b=data[r0+hi[x]],c=data[r1+lo[x]],d=data[r1+hi[x]];
      const v=Math.round((a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy),at=(y*target+x)*4;rgba[at]=rgba[at+1]=rgba[at+2]=v;rgba[at+3]=255;
    }
  }
  return rgba;
}
// Pool weights are zero outside a small lit box, so the site keeps that box at full resolution plus a
// one-texel zero border: clamp-to-edge sampling then returns zero outside it and the result is exact.
export function cropField(rgba,size){
  if(rgba.length!==size*size*4)throw new Error('Pool field size differs');
  let x0=size,y0=size,x1=-1,y1=-1;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(rgba[(y*size+x)*4]>0){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  if(x1<0)throw new Error('Pool field is empty');
  const x=Math.max(0,x0-1),y=Math.max(0,y0-1),width=Math.min(size,x1+2)-x,height=Math.min(size,y1+2)-y,data=new Uint8Array(width*height);
  for(let r=0;r<height;r++)for(let c=0;c<width;c++)data[r*width+c]=rgba[((y+r)*size+x+c)*4];
  return {data,crop:{x,y,width,height}};
}
export function expandCrop(data,crop,size){
  const {x,y,width,height}=crop;if(data.length!==width*height||x<0||y<0||x+width>size||y+height>size)throw new Error('Pool crop differs');
  const rgba=new Uint8Array(size*size*4);for(let i=3;i<rgba.length;i+=4)rgba[i]=255;
  for(let r=0;r<height;r++)for(let c=0;c<width;c++){const v=data[r*width+c],at=((y+r)*size+x+c)*4;rgba[at]=rgba[at+1]=rgba[at+2]=v;}
  return rgba;
}
// Projector uv (data-row order, as the gobo DataTexture uses) of the crop: uvCrop = (uv - offset) / scale.
export const cropTransform=(crop,size)=>({offset:[crop.x/size,crop.y/size],scale:[crop.width/size,crop.height/size]});
