'use strict';
const fs=require('node:fs'),path=require('node:path');
const {ffmpeg}=require('../media.cjs'),{pictureEncodeArgs}=require('./encode.cjs'),{patchNoise,stretch}=require('./f2-quality.cjs'),{decodeFrames}=require('./f2-seams.cjs'),{fileSHA256}=require('./f2-contract.cjs');
const args=process.argv.slice(2),i=args.indexOf('--out');if(i<0)throw new Error('Supply F2 --out');
const fractional=args.includes('--fractional'),strong=args.includes('--strong'),out=path.resolve(args[i+1]),master=path.join(out,'picture-lossless.mkv'),folder=path.join(out,fractional?'quality-dither-r3':strong?'quality-dither-r2':'quality-dither-r1');if(fs.existsSync(folder))throw new Error('Preserve dither candidates');fs.mkdirSync(folder);
const suffix=',format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv';
const filters={
  'swscale-ed':'scale=1920:1080:flags=lanczos+accurate_rnd+full_chroma_int:out_color_matrix=bt709:out_range=tv:sws_dither=ed'+suffix,
  'zscale-ed':'format=gbrp16le,zscale=matrixin=gbr:matrix=709:rangein=full:range=limited:dither=error_diffusion'+suffix
};
const profiles=fractional?[10.25,10.5,10.75].map(crf=>({name:'z-ed'+String(crf).replace('.','p')+'-ip1',crf,conversion:'zscale-ed'})):strong?[{name:'plain11-ip1',crf:11,conversion:'plain'},{name:'z-ed11-ip1',crf:11,conversion:'zscale-ed'},{name:'z-ed10-ip1',crf:10,conversion:'zscale-ed'}]:[{name:'sw-ed14-ip1',crf:14,conversion:'swscale-ed'},{name:'z-ed14-ip1',crf:14,conversion:'zscale-ed'},{name:'z-ed12-ip1',crf:12,conversion:'zscale-ed'},{name:'plain12-ip1',crf:12,conversion:'plain'}],rows=[];
for(const p of profiles){
  const file=path.join(folder,p.name+'.mp4'),settings={crf:p.crf,aqMode:3,tune:'grain',ipRatio:1,pbRatio:1,conversion:p.conversion},argv=pictureEncodeArgs(['-i',master],90,settings);
  argv[argv.indexOf('-x264-params')+1]='aq-mode=3:ipratio=1.0:pbratio=1.0';if(filters[p.conversion])argv[argv.indexOf('-vf')+1]=filters[p.conversion];ffmpeg([...argv,file]);
  const frames=[];for(const frame of[0,45]){stretch(file,frame,path.join(folder,p.name+'-'+frame+'-6x.png'));frames.push({frame,noiseRMS:patchNoise(decodeFrames(file,frame,1)[0])});}
  const row={name:p.name,settings,filter:argv[argv.indexOf('-vf')+1],frames,bytes:fs.statSync(file).size,sha256:fileSHA256(file)};rows.push(row);fs.writeFileSync(path.join(folder,p.name+'.json'),JSON.stringify(row,null,2)+'\n');
}
fs.writeFileSync(path.join(folder,'comparison.json'),JSON.stringify({masterSHA256:fileSHA256(master),frames:90,rows},null,2)+'\n');console.log(JSON.stringify(rows,null,2));
