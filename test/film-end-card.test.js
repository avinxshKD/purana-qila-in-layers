import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {END_CARD,COLD_OPEN_ID,taglineLines,endCardLines,wrapUrlLine,urlColumnWidth,urlSegments,checkEndCard} from '../src/film/end-card.js';
import {pictureEvents} from '../src/film/timeline.js';
const copy=JSON.parse(fs.readFileSync(new URL('../reference/film-callouts.json',import.meta.url)));
const mono=s=>s.length*19;
test('sources URL is pinned exactly and replaces the placeholder once',()=>{
  assert.equal(END_CARD.sourcesUrl,'avinxshkd.github.io/purana-qila-in-layers');
  const lines=endCardLines(copy);
  assert.deepEqual(lines.filter(l=>l.url).map(l=>[l.prefix,l.text]),[['Sources:','Sources: avinxshkd.github.io/purana-qila-in-layers']]);
  assert.ok(!lines.some(l=>l.text.includes('[TBD]')||l.text.includes('[SITE URL]')));
  assert.equal(pictureEvents().find(e=>e.type==='end-card-in').sourcesUrl,END_CARD.sourcesUrl);
});
test('URL breaks only after "/", never at a hyphen or inside a word',()=>{
  assert.deepEqual(urlSegments('Sources:',END_CARD.sourcesUrl).tokens,['Sources: avinxshkd.github.io/','purana-qila-in-layers']);
  assert.deepEqual(wrapUrlLine('Sources:',END_CARD.sourcesUrl,450,mono,{labelOwnLine:true}),['Sources:','avinxshkd.github.io/','purana-qila-in-layers']);
  assert.deepEqual(wrapUrlLine('Sources:',END_CARD.sourcesUrl,2000,mono,{labelOwnLine:true}),['Sources:','avinxshkd.github.io/purana-qila-in-layers']);
  const width=urlColumnWidth('Sources:',END_CARD.sourcesUrl,mono);
  assert.equal(width,Math.max(450,mono('Sources: avinxshkd.github.io/')));
  const lines=wrapUrlLine('Sources:',END_CARD.sourcesUrl,width,mono);
  assert.deepEqual(lines,['Sources: avinxshkd.github.io/','purana-qila-in-layers']);
  // Too narrow for an unbreakable piece: fails closed instead of breaking at a hyphen.
  assert.equal(wrapUrlLine('Sources:',END_CARD.sourcesUrl,300,mono),null);
  // Wide enough: one line.
  assert.deepEqual(wrapUrlLine('Sources:',END_CARD.sourcesUrl,2000,mono),['Sources: avinxshkd.github.io/purana-qila-in-layers']);
});
test('end-card check accepts the pinned layout and rejects a hyphen break',()=>{
  const good={sourcesUrl:END_CARD.sourcesUrl,urlPrefix:'Sources:',urlLines:['Sources: avinxshkd.github.io/','purana-qila-in-layers'],lines:['Composite section,','Sources: avinxshkd.github.io/','purana-qila-in-layers'],moved:false};
  assert.deepEqual(checkEndCard(good),[]);
  const bad={...good,urlLines:['Sources: avinxshkd.github.io/purana-','qila-in-layers'],lines:['Sources: avinxshkd.github.io/purana-','qila-in-layers']};
  assert.ok(checkEndCard(bad).includes('URL breaks other than after "/"'));
  assert.ok(checkEndCard({...good,moved:true}).length);
  assert.deepEqual(checkEndCard({...good,urlLines:['Sources:','avinxshkd.github.io/','purana-qila-in-layers'],lines:['Sources:','avinxshkd.github.io/','purana-qila-in-layers']}),[]);
});
test('tagline shares the title fade: in with it, readable >= 3 s, out over 0.25 s from 4.0 s',async()=>{
  const {filmState}=await import('../src/film/timeline.js');
  const cold=s=>filmState(s).overlays.titles.find(t=>t.sectionIndex===0)?.opacity??0;
  let readable=0;for(let f=0;f<=150;f++)if(cold(f/30)>=1)readable+=1/30;
  assert.ok(readable>=3,'readable '+readable);
  assert.equal(cold(0),1);assert.equal(cold(3.99),1);
  assert.ok(Math.abs(cold(4.125)-.5)<1e-9);assert.equal(cold(4.25),0);
  assert.deepEqual(taglineLines(copy.coldOpenOptions.find(c=>c.id===COLD_OPEN_ID).tagline).length,2);
});
