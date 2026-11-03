import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {filmState,pictureEvents,SECTION_FRAMES,BEAT_FRAMES,PEEL_TIMES,REWIND_GAP_TIME} from '../src/film/timeline.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('section boundaries exactly match timing authority and bar grid',()=>{
  const text=fs.readFileSync(new URL('../output/review/film-timing.md',import.meta.url),'utf8');
  assert.match(text,/v1\.2/);
  const expected=[0,120,240,360,480,600,720,840,960,1080,1200,1320,1440,1500,1560,1620,1800];
  assert.deepEqual(SECTION_FRAMES,expected);
  expected.slice(0,-1).forEach((f,i)=>{assert.equal(f%60,0);assert.equal(filmState(f/30).section.index,i);if(f)assert.equal(filmState((f-.01)/30).section.index,i-1);});
  assert.equal(filmState(60).section.index,15);
});
test('era deposits ease out over 45 frames, four features step only on beats',()=>{
  for(let i=0;i<10;i++) {const t=8+i*4;
    near(filmState(t).depositRise,0);near(filmState(t+1.5).depositRise,1);
    for(let step=1;step<=4;step++){near(filmState(t+step*.5-1e-5).featureRise,(step-1)/4);near(filmState(t+step*.5).featureRise,step/4);}
    for(let f=1;f<120;f++)if(f%15)near(filmState(t+f/30).featureRise,filmState(t+(f-1)/30).featureRise);
  }
});
test('rewind refills first and peels newest first at accelerating endpoints',()=>{
  near(filmState(4).scene.excavation,1);near(filmState(4.5).scene.excavation,0);
  PEEL_TIMES.slice(1).forEach((t,i)=>{near(filmState(t).scene.deposits[9-i],0);});
  assert.deepEqual(filmState(8).scene.deposits,Array(10).fill(0));
});
test('all callout fade boundaries, no captions pointing into geometry',()=>{
  for(let i=0;i<10;i++)for(let slot=0;slot<2;slot++){const t=8+i*4,on=t+1+slot*.5;
    near(filmState(on).overlays.callouts[slot].opacity,0);near(filmState(on+.2).overlays.callouts[slot].opacity,1);
    near(filmState(t+3.6).overlays.callouts[slot].opacity,1);near(filmState(t+3.8).overlays.callouts[slot].opacity,0);
  }
  for(let i=0;i<3;i++){const t=48+i*2;
    near(filmState(t+.25).overlays.caption.opacity,0);near(filmState(t+.45).overlays.caption.opacity,1);near(filmState(t+1.6).overlays.caption.opacity,1);near(filmState(t+1.8).overlays.caption.opacity,0);
    assert.equal(filmState(t+1).overlays.caption.leaderLine,false);
  }
});
test('crossfades use exact 0.25 seconds, including subframe endpoints',()=>{
  SECTION_FRAMES.slice(2,-1).forEach(f=>{const t=f/30;
    near(filmState(t).overlays.titles.at(-1).opacity,0);
    near(filmState(t+.125).overlays.titles.at(-1).opacity,.5);
    near(filmState(t+.25).overlays.titles.at(-1).opacity,1);
  });
  near(filmState(4).overlays.titles[0].opacity,1);near(filmState(4.125).overlays.titles[0].opacity,.5);
  assert.deepEqual(filmState(4.25).overlays.titles,[]);assert.deepEqual(filmState(7.9).overlays.titles,[]);
});
test('cut steps beat-locked with season marker ranges',()=>{
  for(let f=1440;f<1620;f++){const s=filmState(f/30);assert.equal(s.dig.cutStep,Math.floor((f-1440)/15)+1);near(s.scene.excavation,s.dig.cutStep/12);}
  [2013,2017,2022].forEach((year,i)=>near(filmState(48+i*2).marker.year,year));
});
test('proportional astronomical marker jumps over source gap exactly at frame 1200',()=>{
  near(filmState(8).marker.year,-539);near(filmState(12).marker.year,-322);
  assert.ok(filmState(40-1e-8).marker.year<1500);near(filmState(40).marker.year,1600);assert.equal(filmState(40).marker.gapJump,true);
  near(filmState(44).marker.opacity,1);near(filmState(44.125).marker.opacity,.5);near(filmState(44.25).marker.opacity,0);
  assert.equal(filmState(44.25).marker.year,null);assert.equal(filmState(54).marker.opacity,0);
  near(filmState(48).marker.opacity,0);near(filmState(48.125).marker.opacity,.5);near(filmState(48.25).marker.opacity,1);
  near(filmState(4).marker.year,2023);near(filmState(8).marker.year,-539);
  assert.ok(filmState(REWIND_GAP_TIME-1e-6).marker.year>1600);assert.ok(filmState(REWIND_GAP_TIME+1e-6).marker.year<1500);
  for(let f=120;f<240;f++){const year=filmState(f/30).marker.year;assert.ok(year<=1500||year>=1600);}
});
test('events cover every section, beat step, callout and caption; use approved IDs',()=>{
  const events=pictureEvents(),copy=JSON.parse(fs.readFileSync(new URL('../reference/film-callouts.json',import.meta.url),'utf8'));
  assert.equal(events.filter(e=>e.type==='section-start').length,16);
  assert.equal(events.filter(e=>e.type==='era-switch').length,10);
  assert.equal(events.filter(e=>e.type==='feature-course-step').length,40);
  assert.equal(events.filter(e=>e.type==='cut-step').length,12);
  assert.equal(events.filter(e=>e.type==='callout-in').length,20);
  assert.equal(events.filter(e=>e.type==='caption-in').length,3);
  for(const e of events){if(['cut-step','feature-course-step'].includes(e.type))near(e.frame%BEAT_FRAMES,0);if(e.id&&e.type.includes('callout'))assert.ok(copy.sections.flatMap(s=>s.callouts).some(c=>c.id===e.id));}
});
test('arbitrary scrubs deterministic, values finite, scene independent of seconds',()=>{
  const expected=JSON.stringify(filmState(27.3));filmState(55);filmState(0);assert.equal(JSON.stringify(filmState(27.3)),expected);
  for(let f=0;f<=1800;f++){const s=filmState(f/30);assert.ok(s.scene.deposits.every(x=>x>=0&&x<=1));assert.ok(s.scene.features.every(x=>x>=0&&x<=1));assert.equal('seconds' in s.scene,false);assert.equal('year' in s.scene,false);}
  assert.throws(()=>filmState(NaN),TypeError);assert.equal(filmState(-1).seconds,0);assert.equal(filmState(61).seconds,60);
});
test('rewind features stay complete until their own layer starts leaving',()=>{
  PEEL_TIMES.slice(0,-1).forEach((time,index)=>{const era=9-index;near(filmState(time).scene.features[era],1);const mid=(time+PEEL_TIMES[index+1])/2;near(filmState(mid).scene.features[era],filmState(mid).scene.deposits[era]);});
});
