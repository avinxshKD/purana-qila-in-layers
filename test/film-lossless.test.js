import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {losslessEncoder,flipRows} from '../scripts/film/lossless.cjs';
import {bin,run} from '../scripts/media.cjs';
test('FFV1 chunks preserve every RGBA byte with one bottom-up to top-down conversion',async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'strata-ffv1-')),file=path.join(folder,'test.mkv'),width=32,height=24,frames=3;
  try{
    const raw=Buffer.alloc(width*height*4*frames);for(let i=0;i<raw.length;i++)raw[i]=(i*31+Math.floor(i/19)*17)%256;
    const encoder=losslessEncoder(file,width,height);encoder.process.stdin.end(raw);await encoder.finished;
    const decoded=run(bin('ffmpeg'),['-v','error','-i',file,'-f','rawvideo','-pix_fmt','rgba','pipe:1'],{encoding:null,maxBuffer:1024*1024}).stdout;
    assert.equal(decoded.length,raw.length);
    for(let i=0;i<frames;i++)assert.deepEqual(decoded.subarray(i*width*height*4,(i+1)*width*height*4),flipRows(raw.subarray(i*width*height*4,(i+1)*width*height*4),width,height));
    assert.throws(()=>flipRows(Buffer.alloc(4),2,2),/dimensions/);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
