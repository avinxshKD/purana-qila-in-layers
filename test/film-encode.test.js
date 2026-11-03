import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{verifyMedia,LOCKED_SHA256}=require('../scripts/film/encode.cjs');
const valid=()=>({streams:[{codec_type:'video',codec_name:'h264',profile:'High',width:1920,height:1080,pix_fmt:'yuv420p',r_frame_rate:'30/1',nb_frames:'90',duration:'3.000000',start_time:'0.000000',color_space:'bt709',color_transfer:'bt709',color_primaries:'bt709'},{codec_type:'audio',codec_name:'aac',profile:'LC',sample_rate:'48000',channels:2,duration:'3.000000',start_time:'0.000000'}]});
test('encoder validation accepts exact frame/sample alignment and rejects wrong duration/offset',()=>{
  assert.equal(LOCKED_SHA256,'126440F1B57F14FFDB8FAAC2CA8F3AD0DF8274015AF15617DD18997E0291413B');
  assert.equal(verifyMedia(valid(),3).avStartOffsetSeconds,0);
  const offset=valid();offset.streams[1].start_time='.021333';assert.throws(()=>verifyMedia(offset,3),/starts/);
  const duration=valid();duration.streams[0].duration='2.966667';assert.throws(()=>verifyMedia(duration,3),/duration/);
  const count=valid();count.streams[0].nb_frames='89';assert.throws(()=>verifyMedia(count,3),/frame count/);
  const missing=valid();delete missing.streams[1].duration;assert.throws(()=>verifyMedia(missing,3),/duration/);
});
