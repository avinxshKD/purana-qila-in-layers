import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {contactFilter} from '../scripts/film/f2-delivery-pack.cjs';
import {ffmpeg,run,bin} from '../scripts/media.cjs';
test('CPU every15-frame contact filter labels and tiles120 frames without font/filter escaping errors',{timeout:30000},()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'strata-f2-contact-')),file=path.join(folder,'contact.png');
  try{
    ffmpeg(['-f','lavfi','-i','color=c=black:s=8x8:r=30:d=60','-vf',contactFilter(),'-frames:v','1',file]);
    const media=JSON.parse(run(bin('ffprobe'),['-v','error','-show_entries','stream=width,height','-of','json',file]).stdout);
    assert.equal(media.streams[0].width,3222);assert.equal(media.streams[0].height,2426);assert.ok(fs.statSync(file).size>1000);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
