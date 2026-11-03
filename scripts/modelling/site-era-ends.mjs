import fs from 'node:fs';
import { createEraSite } from '../../src/eras/site-state.js';
import { sceneForYear } from '../../src/film/scene-year.js';
import { YEAR_RANGES } from '../../src/film/timeline.js';
const callouts = JSON.parse(fs.readFileSync(new URL('../../reference/film-callouts.json', import.meta.url), 'utf8'));
const site = createEraSite();
const ends = YEAR_RANGES.slice(0, 9).map(r => r[1]).concat([2013]);
callouts.sections.slice(2, 12).forEach((section, era) => {
  const out = site.applyState(sceneForYear(ends[era]));
  const ids = section.callouts.map(c => c.featureId);
  console.log(era, ends[era], ids.map(id => { const a = out.featureAnchors[id]; return a ? id + (a.visible ? ' OK' : ' HIDDEN') + ' ' + JSON.stringify(a.point?.map(v => +v.toFixed(2))) + ' n' + JSON.stringify(a.normal?.map(v => +v.toFixed(2))) + ' part ' + a.part : id + ' MISSING'; }).join(' | '));
});
