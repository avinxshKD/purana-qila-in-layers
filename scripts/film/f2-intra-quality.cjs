'use strict';
const fs=require('node:fs'),path=require('node:path');
const {ffmpeg}=require('../media.cjs'),{pictureEncodeArgs}=require('./encode.cjs'),{patchNoise,stretch}=require('./f2-quality.cjs'),{decodeFrames}=require('./f2-seams.cjs'),{fileSHA256}=require('./f2-contract.cjs');
const args=process.argv.slice(2),i=args.indexOf('--out');if(i<0)throw new Error('Supply F2 --out');
const out=path.resolve(args[i+1]),master=path.join(out,'picture-lossless.mkv'),folder=path.join(out,'quality-intra-r1');if(fs.existsSync(folder))throw new Error('Preserve intra-quality evidence');fs.mkdirSync(folder);
const source={};for(const frame of[0,45]){source[frame]=patchNoise(decodeFrames(master,frame,1)[0]);stretch(master,frame,path.join(folder,'source-'+frame+'-6x.png'));}
const rows=[];for(const crf of[14,10,8,4]){
  const name='grain'+crf+'-ip14',file=path.join(folder,name+'.mp4'),settings={crf,aqMode:3,tune:'grain',ipRatio:1.4},argv=pictureEncodeArgs(['-i',master],90,settings);argv[argv.indexOf('-x264-params')+1]='aq-mode=3:ipratio=1.4';ffmpeg([...argv,file]);
  const frames=[];for(const frame of[0,45]){stretch(file,frame,path.join(folder,name+'-'+frame+'-6x.png'));const noise=patchNoise(decodeFrames(file,frame,1)[0]);frames.push({frame,sourceNoiseRMS:source[frame],decodedNoiseRMS:noise,ratio:noise/source[frame]});}
  rows.push({name,settings,bytes:fs.statSync(file).size,sha256:fileSHA256(file),frames});
}
fs.writeFileSync(path.join(folder,'comparison.json'),JSON.stringify({masterSHA256:fileSHA256(master),framesEncodedPerCandidate:90,rows,method:'CPU-only candidates inspect both first I-frame0 and later frame45; stronger I:P weighting and lower CRF. Numeric high-frequency RMS is not visual acceptance.'},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
