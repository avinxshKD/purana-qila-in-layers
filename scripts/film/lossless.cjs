'use strict';
const {spawn}=require('node:child_process'),{bin}=require('../media.cjs');
function flipRows(bytes,width,height){
  const row=width*4;if(bytes.length!==row*height)throw new Error('RGBA dimensions differ');
  const result=Buffer.allocUnsafe(bytes.length);for(let y=0;y<height;y++)Buffer.from(bytes.buffer,bytes.byteOffset+y*row,row).copy(result,(height-1-y)*row);return result;
}
function losslessEncoder(file,width=1920,height=1080,{fps=30,bottomUp=true}={}){
  const args=['-hide_banner','-loglevel','error','-n','-f','rawvideo','-pixel_format','rgba','-video_size',`${width}x${height}`,'-framerate',String(fps),'-i','pipe:0',...(bottomUp?['-vf','vflip']:[]),'-c:v','ffv1','-level','3','-coder','1','-context','1','-g','1','-slicecrc','1','-pix_fmt','bgra','-an',file];
  const process=spawn(bin('ffmpeg'),args,{stdio:['pipe','ignore','pipe']});let stderr='';
  process.stderr.on('data',bytes=>{stderr+=bytes;});process.stdin.on('error',()=>{});
  const finished=new Promise((resolve,reject)=>{process.on('error',reject);process.on('close',code=>code===0?resolve():reject(new Error(`Lossless ffmpeg ${code}: ${stderr}`)));});
  return {process,finished,args};
}
module.exports={losslessEncoder,flipRows};
