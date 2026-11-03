import fs from 'node:fs';
const c = JSON.parse(fs.readFileSync('reference/film-callouts.json', 'utf8'));
console.log(JSON.stringify(c.rules).slice(0, 1500));
const s = c.sections;
console.log('sections type', Array.isArray(s), Object.keys(s).slice(0, 20));
const arr = Array.isArray(s) ? s : Object.values(s);
console.log('section keys', Object.keys(arr[0]));
for (const sec of arr) {
  const cs = sec.callouts ?? [];
  console.log(`# ${sec.index ?? ''} ${sec.id ?? sec.era ?? ''} ${sec.title ?? ''}`);
  for (const x of cs) console.log('  ', [x.id, x.featureId, x.slot, (x.label ?? x.text ?? '').toString().slice(0, 60)].join(' | '));
}
console.log('modernFill', JSON.stringify(c.modernFill).slice(0, 800));
console.log('depth', JSON.stringify(c.depthCandidates).slice(0, 800));
