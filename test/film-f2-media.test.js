import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {once} from 'node:events';
import {root} from '../scripts/browser.cjs';
import {losslessEncoder} from '../scripts/film/lossless.cjs';
import {sha256,ffmpeg,bin,run} from '../scripts/media.cjs';
import {auditSeams,decodeFrames} from '../scripts/film/f2-seams.cjs';
import {prepareQuality,finalDarkCheck} from '../scripts/film/f2-quality.cjs';
import {encodeAndMux,pictureEncodeArgs} from '../scripts/film/encode.cjs';
test('dark-detail candidate and final picture settings use the exact same color/encoder path',()=>{
  const args=pictureEncodeArgs(['-i','fixture.mkv'],90,{crf:14,aqMode:3,tune:'grain'});
  assert.equal(args[args.indexOf('-crf')+1],'14');assert.equal(args[args.indexOf('-x264-params')+1],'aq-mode=3');assert.equal(args[args.indexOf('-tune')+1],'grain');
  assert.match(args[args.indexOf('-vf')+1],/flags=lanczos:out_color_matrix=bt709/);assert.throws(()=>pictureEncodeArgs([],1,{tune:'unsupported'}),/Unsupported/);
});
test('dither conversion and equal frame weighting remain explicit8-bit High settings',()=>{
  const args=pictureEncodeArgs([],90,{crf:10,aqMode:3,tune:'grain',conversion:'zscale-ed',ipRatio:1,pbRatio:1});
  assert.match(args[args.indexOf('-vf')+1],/format=gbrp16le,zscale=matrixin=gbr:matrix=709:rangein=full:range=limited:dither=error_diffusion,format=yuv420p/);
  assert.equal(args[args.indexOf('-x264-params')+1],'aq-mode=3:ipratio=1.0:pbratio=1.0');assert.equal(args[args.indexOf('-profile:v')+1],'high');assert.equal(args[args.indexOf('-pix_fmt')+1],'yuv420p');
  assert.throws(()=>pictureEncodeArgs([],1,{conversion:'unknown'}),/Unsupported/);assert.throws(()=>pictureEncodeArgs([],1,{ipRatio:Infinity}),/Unsupported/);
});
test('CPU-only native FFV1 concat, decoded seam/pixel proof, three dark-detail candidates and locked-score mux',{timeout:240000,skip:!fs.existsSync(path.join(root,'output/sound/v2.1/strata-score.wav'))},async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'strata-f2-media-')),width=1920,height=1080;
  try{
    fs.mkdirSync(path.join(folder,'source/src/film'),{recursive:true});fs.mkdirSync(path.join(folder,'chunks'));
    fs.writeFileSync(path.join(folder,'source/package.json'),'{"type":"module"}');fs.writeFileSync(path.join(folder,'source/src/film/timeline.js'),'export const pictureEvents=()=>[{frame:45,type:"fixture-motion"}];');
    const raw=Buffer.alloc(width*height*4),records=[],samples=[];
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,v=24+Math.floor(8*x/width)+((x+y)&1);raw.set([v,v+1,v+2,255],i);}
    function rectangle(x,value){for(let y=200;y<240;y++)for(let xx=x;xx<x+40;xx++){const i=(y*width+xx)*4,v=value??24+Math.floor(8*xx/width)+((xx+y)&1);raw.set([v,value===undefined?v+1:v,value===undefined?v+2:v,255],i);}}
    for(let part=0;part<2;part++){
      const video=`chunks/part-${String(part).padStart(2,'0')}.mkv`,encoder=losslessEncoder(path.join(folder,video)),stats=[];
      for(let frame=part*45;frame<(part+1)*45;frame++){
        if(frame)rectangle(100+frame-1);rectangle(100+frame,100);const hash=sha256(raw);
        if(frame===44||frame===45)samples.push({frame,sha256:hash});
        stats.push({frame,sha256:hash,framing:{bbox:{x:100,y:100,width:300,height:300}}});
        if(!encoder.process.stdin.write(raw))await once(encoder.process.stdin,'drain');
      }
      encoder.process.stdin.end();await encoder.finished;records.push({video,startFrame:part*45,endFrame:(part+1)*45,frames:45,stats});
    }
    const manifest={snapshotSHA256:'cpu-fixture',sourceRoot:path.join(folder,'source')},audit=await auditSeams(folder,records,manifest,{samples});
    assert.equal(audit.seams.length,1);assert.equal(audit.seams[0].gateRatio,1.5);assert.equal(audit.flags.length,0);assert.ok(audit.pixelProof.every(p=>p.equal));
    fs.writeFileSync(path.join(folder,'concat.txt'),records.map(r=>`file '${r.video}'`).join('\n')+'\n');const master=path.join(folder,'master.mkv');
    ffmpeg(['-f','concat','-safe','0','-i',path.join(folder,'concat.txt'),'-c','copy',master]);
    const probe=JSON.parse(run(bin('ffprobe'),['-v','error','-count_frames','-show_entries','stream=nb_read_frames:format=duration','-of','json',master]).stdout);
    assert.equal(Number(probe.streams[0].nb_read_frames),90);assert.equal(Number(probe.format.duration),3);
    assert.deepEqual(decodeFrames(master,45,1)[0],decodeFrames(path.join(folder,records[1].video),0,1)[0]);
    const quality=prepareQuality(folder,master,records);assert.equal(quality.candidates.length,3);assert.ok(quality.candidates.every(c=>c.bytes>0&&Number.isFinite(c.grainRetentionRatio)));
    assert.deepEqual(prepareQuality(folder,master,records),quality);
    const encoded=encodeAndMux({videoFile:master,outputFile:path.join(folder,'locked-score.mp4'),durationSeconds:3,crf:14,aqMode:3,tune:'grain'});
    assert.equal(encoded.verification.frames,90);assert.equal(encoded.verification.durationSeconds,3);assert.equal(encoded.verification.avStartOffsetSeconds,0);assert.equal(encoded.settings.tune,'grain');
    assert.deepEqual(encoded.scoreSamples,{first:0,count:144000});
    const dark=finalDarkCheck(folder,master,path.join(folder,'locked-score.mp4'),{frames:[0,45,89]});assert.equal(dark.rows.length,3);assert.ok(dark.rows.every(r=>Number.isFinite(r.grainRetentionRatio)));
    assert.deepEqual(finalDarkCheck(folder,master,path.join(folder,'locked-score.mp4'),{frames:[0,45,89]}),dark);
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
});
