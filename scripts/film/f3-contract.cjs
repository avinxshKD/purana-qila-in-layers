'use strict';
// F3 contract: pinned M2b freeze, final copy hashes, end-card sources URL and cold-open tagline.
// Copy text is always read from the pinned JSON fields, never hard-coded here.
const fs=require('node:fs'),path=require('node:path'),{fileSHA256,LOCKED_SCORE}=require('./f2-contract.cjs');
const {END_CARD,COLD_OPEN_ID,END_CARD_STYLE,taglineLines,checkEndCard}=require('../../src/film/end-card.js');
const FREEZE={folder:'output/lookdev/modelling/m2/source-m2b',sumsSHA256:'9bb007b32905a32fabbb00878f3d0bcc654542ec28dbb875da881f4c5d768be0',files:398};
const COPY={'reference/film-callouts.json':'485bb408b67c1b2e7f3d30a5f05b44099cbecf1257352729cbdd7c2e5a8a7464','reference/site-drawers.json':'4e18b58c9c19d356fcd04b29bcc662e1a9e5fae60dbad118352ffe842f6caee0'};
// Tagline timing: with the title, fully readable >= 3.0 s, out over 0.25 s from 4.0 s.
const TAGLINE_TIMING={fadeInLatestSeconds:.3,minimumReadableSeconds:3,fadeOutStart:4,fadeOutSeconds:.25};
function verifyCopy(tree){
  const result={};
  for(const [file,hash]of Object.entries(COPY)){const actual=fileSHA256(path.join(tree,file));if(actual!==hash)throw new Error('F3 copy hash differs: '+file);result[file]=actual;}
  return result;
}
function coldOpenCopy(tree){
  const copy=JSON.parse(fs.readFileSync(path.join(tree,'reference/film-callouts.json'),'utf8')),cold=copy.coldOpenOptions.find(c=>c.id===COLD_OPEN_ID);
  if(!cold?.tagline)throw new Error('cold-a tagline missing');
  const site=JSON.parse(fs.readFileSync(path.join(tree,'reference/site-drawers.json'),'utf8'));
  return {title:cold.title,tagline:cold.tagline,lines:taglineLines(cold.tagline),siteTagline:site.tagline??null};
}
// Per-frame HUD checks for the cold open; report = overlay report of one frame.
function checkColdOpen(report,{expectTagline}){
  const failures=[],c=report.coldOpen;
  if(!expectTagline){if(c)failures.push('Tagline shown outside the cold open');return failures;}
  if(!c)return ['Tagline missing'];
  if(c.lines.length!==2)failures.push('Tagline must be two lines, one sentence each');
  if(c.moved)failures.push('Tagline moved by the HUD clearance pass');
  if(c.bodyStyle.cap!==END_CARD_STYLE.body.cap||c.bodyStyle.family!==END_CARD_STYLE.body.family||c.headlineToBody!==END_CARD_STYLE.headlineToBody)failures.push('Tagline style differs from the end-card body');
  return failures;
}
// Chunks 0-21 were captured at 30 frames (frames 0-659); throughput variance then required
// 20-frame chunks from 660. 660 + 48 x 20 = 1620 keeps the end card on a chunk boundary.
const CHUNK_TABLE=Object.freeze([...Array.from({length:22},(_,i)=>({index:i,start:i*30,frames:30})),...Array.from({length:57},(_,i)=>({index:22+i,start:660+i*20,frames:20}))].map(Object.freeze));
const CHUNKS=CHUNK_TABLE.length;
function chunkSpec(index){const spec=CHUNK_TABLE[index];if(!spec)throw new Error('Invalid F3 chunk '+index);return spec;}
function checkContinuity(records,total=1800){
  let next=0;records.forEach((r,i)=>{const spec=chunkSpec(i);if(r.startFrame!==spec.start||r.startFrame!==next||r.frames!==spec.frames||r.endFrame!==r.startFrame+r.frames)throw new Error(`F3 chunk ${i} breaks continuity at frame ${next}`);next=r.endFrame;});
  if(next!==total)throw new Error(`F3 chunks end at ${next}, expected ${total}`);return true;
}
module.exports={CHUNK_TABLE,CHUNKS,chunkSpec,checkContinuity,FREEZE,COPY,TAGLINE_TIMING,END_CARD,LOCKED_SCORE,verifyCopy,coldOpenCopy,checkColdOpen,checkEndCard};
