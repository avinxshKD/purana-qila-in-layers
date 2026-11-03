'use strict';
// CPU integration test: decode completed F1 chunk 0 to PNG, then run the F2 encoder
// with exactly score samples 0–143999. This tests the pipeline, not master-image quality.
const fs=require('node:fs');
const path=require('node:path');
const {root}=require('../browser.cjs');
const {ffmpeg}=require('../media.cjs');
const {encodeAndMux}=require('./encode.cjs');
const out=path.resolve(process.argv[2]||path.join(root,'output','film','encode-test-r1'));
if(fs.existsSync(path.join(out,'test-3s.mp4')))throw new Error('Preserve previous encode test; choose a new output folder');
const frames=path.join(out,'frames');fs.mkdirSync(frames,{recursive:true});
const pattern=path.join(frames,'frame-%06d.png'),source=path.join(root,'output','film','f1','pinned-chunks','part-0.mp4');
ffmpeg(['-i',source,'-frames:v','90','-fps_mode','passthrough','-start_number','0',pattern]);
const report=encodeAndMux({framePattern:pattern,outputFile:path.join(out,'test-3s.mp4'),durationSeconds:3});
fs.writeFileSync(path.join(out,'README.md'),'# F2/final encoder integration test\n\nSource: decoded F1 chunk 0, 90 frames. Audio: the first 144000 samples (3 seconds) of the complete SHA-256-verified locked score. Both streams start at zero and last exactly 3.000000 s. The encoded picture uses H.264 High, 1080p30, yuv420p, CRF16, BT.709 and +faststart; audio uses AAC-LC 48 kHz stereo. This is a pipeline test from an already compressed draft, not the F2 picture master.\n');
console.log(JSON.stringify({output:path.join(out,'test-3s.mp4'),...report.verification,scoreSHA256:report.scoreSHA256},null,2));
