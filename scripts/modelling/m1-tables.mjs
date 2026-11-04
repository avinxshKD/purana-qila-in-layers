// M1 tables (CPU): the anchors JSON for every hero-still state and the feature provenance table (feature, source,
// geometry status, M decisions), from the layout, the era pack and the kit. Writes output/lookdev/modelling/m1/.
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createEraSite } from '../../src/eras/site-state.js';
import { FEATURES, RING_WELL, CONTROLLED_PIT } from '../../src/eras/layout.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = root + 'output/lookdev/modelling/m1/';
mkdirSync(out, { recursive: true });
const ERAS = ['pre-mauryan', 'mauryan', 'sunga', 'kushan', 'gupta', 'post-gupta', 'rajput', 'sultanate', 'mughal', 'modern-fill'];
const ones = Array(10).fill(1), upTo = n => ERAS.map((_, i) => i <= n ? 1 : 0);
const FINAL = { schemaVersion: 1, eraIndex: 9, deposits: ones, features: ones, excavation: 1 };
const STATES = { 'cold-open': FINAL,
  ...Object.fromEntries(ERAS.map((id, i) => [`era-${String(i + 1).padStart(2, '0')}-${id}`, { schemaVersion: 1, eraIndex: i, deposits: upTo(i), features: upTo(i), excavation: 0 }])),
  ...Object.fromEntries([1, 2, 3].map(s => [`season-${s}-end`, { ...FINAL, excavation: s * 4 / 12 }])) };
const round = v => Array.isArray(v) ? v.map(round) : typeof v === 'number' ? Math.round(v * 1e4) / 1e4 : v;

const site = createEraSite();
const anchors = {};
for (const [name, scene] of Object.entries(STATES)) {
  const r = site.applyState(scene);
  anchors[name] = { scene, cutStep: r.cutStep, activeTopAnchor: round(r.activeTopAnchor.point),
    featureAnchors: Object.fromEntries(Object.entries(r.featureAnchors).map(([id, a]) => [id, { point: round(a.point), normal: round(a.normal), visible: a.visible }])) };
}
writeFileSync(out + 'm1-anchors.json', JSON.stringify({ method: 'createEraSite().applyState(scene) per hero-still state; world metres, y up; featureAnchors keyed by featureId (src/eras/site-state.js).', states: anchors }, null, 1) + '\n');

const pack = JSON.parse(readFileSync(root + 'reference/era-model.json', 'utf8'));
const packFeatures = new Map();
for (const layer of pack.layers) for (const f of layer.features ?? []) packFeatures.set(f.id, { ...f, layer: layer.id });
for (const f of pack.captionOnly ?? []) packFeatures.set(f.id, { ...f, layer: null });
// Kit identity: the frozen K2e manifest's tree hash method (sorted "<sha256>  <path>" lines) over src/features now.
const kit = JSON.parse(readFileSync(root + 'output/lookdev/features/kit-k2e.json', 'utf8'));
const featureFiles = readdirSync(root + 'src/features', { withFileTypes: true }).filter(d => d.isFile()).map(d => d.name).sort();
const sha = b => createHash('sha256').update(b).digest('hex');
const kitTree = sha(featureFiles.map(f => `${sha(readFileSync(root + 'src/features/' + f))}  src/features/${f}\n`).sort().join(''));
const evidence = f => (f?.evidence ?? []).map(e => `${e.sourceId} p.${e.page}`).filter((v, i, a) => a.indexOf(v) === i).join('; ');
const decisions = r => [r.centre && `centre [${r.centre.join(', ')}]`, r.fig13 && 'Fig.13 offset (FIG13_OFFSET)', r.rotate && `rotate ${r.rotate} deg`,
  `seating rule '${r.rule}'${r.host ? ` on era ${r.host}` : ''}`, r.floorOf && `stands on ${r.floorOf} floor`, r.overrides && `overrides ${JSON.stringify(r.overrides)}`,
  r.intoGupta && `base ${r.intoGupta} m into Gupta`, r.optional && 'optional', r.aboveFloor && `>= ${r.aboveFloor.clearance} m above ${r.aboveFloor.trench} floor`,
  r.postholeClearance && `posthole clearance ${r.postholeClearance} m`].filter(Boolean).join('; ');
const rows = [...FEATURES.map(r => ({ ...r, key: r.part ? `${r.id} (${r.part})` : r.id })),
  { ...RING_WELL, key: RING_WELL.id, rule: 'scene-owned ring well', centre: [RING_WELL.x, RING_WELL.z], floorOf: RING_WELL.floorOf, geometry: `scene geometry (section-geometry.js ringSection), radius ${RING_WELL.radius} m, span ${RING_WELL.span} m` },
  { ...CONTROLLED_PIT, key: CONTROLLED_PIT.id, era: null, rule: 'scene-owned cut', centre: round([(CONTROLLED_PIT.xmin + CONTROLLED_PIT.xmax) / 2, (CONTROLLED_PIT.zmin + CONTROLLED_PIT.zmax) / 2]),
    geometry: `scene cut (excavation.js), ${CONTROLLED_PIT.steps} steps, ${round(CONTROLLED_PIT.xmax - CONTROLLED_PIT.xmin)} x ${round(CONTROLLED_PIT.zmax - CONTROLLED_PIT.zmin)} m` }].map(r => {
  const p = packFeatures.get(r.id);
  return { feature: r.key, era: r.era, packTitle: p?.title ?? null, source: p ? evidence(p) || '(no evidence entry)' : 'not in pack (M)',
    packGeometryStatus: p?.geometryStatus ?? null, sourcedSize: p?.sourcedSize ?? null, sourcedDepth: p?.sourcedDepth ?? null,
    geometry: r.geometry ?? (r.fig13 ? 'kit, traced Fig.13 footprints (fig13-walls.json), true scale' : p?.sourcedSize ? 'kit spec with pack size' : 'kit spec, schematic dimensions (buildEraFeature defaults where the pack is null)'),
    decisions: decisions(r) };
});
const md = ['# M1 feature provenance', '', `Kit: ${kit.version} (output/lookdev/features/kit-k2e.json, tree ${kit.treeSha256.slice(0, 16)}); src/features now: ${featureFiles.length} files, tree ${kitTree.slice(0, 16)}, ${kitTree === kit.treeSha256 ? 'matches K2e' : 'DIFFERS from K2e'}.`,
  'Source = evidence entries in reference/era-model.json for that feature id. Every placement value is a modelling decision (M) from src/eras/layout.js.', '',
  '| Feature | Era | Source | Pack geometry status | Model geometry | M decisions |', '|---|---|---|---|---|---|',
  ...rows.map(r => `| ${r.feature} | ${r.era ?? '-'} | ${r.source} | ${r.packGeometryStatus ?? '-'} | ${r.geometry} | ${r.decisions} |`)].join('\n');
writeFileSync(out + 'm1-provenance.json', JSON.stringify(rows, null, 1) + '\n');
console.log(md);
// Era soil bands: how each neighbouring pair is told apart, with the pack text behind it (verbatim from era-model.json),
// the hero-camera cell dE76 (m1-metrics.json bandCells) and full-band texture numbers (band-texture.cjs) on the stills.
const require = createRequire(import.meta.url);
const { bandTexture } = require('./band-texture.cjs');
const layerOf = id => pack.layers.find(l => l.id === id) ?? (() => { throw new Error(`pack layer ${id} missing`); })();
function quote(era, where, contains) {
  const layer = layerOf(era);
  const pool = where === 'colour' ? [layer.colour?.evidence].filter(Boolean) : where === 'deposit' ? layer.deposit ?? [] : where === 'texture' ? layer.texture?.evidence ?? []
    : (layer.features ?? []).find(f => f.id === where.slice(8))?.evidence ?? [];
  const e = pool.find(e => !contains || e.text.includes(contains));
  if (!e) throw new Error(`no pack text for ${era} ${where} ${contains ?? ''}`);
  return `${era}: "${e.text}" (${e.sourceId} p.${e.page})${where === 'colour' ? ` [colour "${layer.colour.value}"]` : ''}`;
}
const SEPARATION = [
  ['silt', 'pre-mauryan', 'colour (pack) + texture (M)', [['silt', 'colour'], ['pre-mauryan', 'colour']], 'fine clay, few inclusions / thin pale-yellow and greyish beds'],
  ['pre-mauryan', 'mauryan', 'value (M) + texture (M)', [['pre-mauryan', 'colour']], 'beds / compact occupation earth, few clods, low relief'],
  ['mauryan', 'sunga', 'texture (M)', [['sunga', 'feature:sunga-burnt-patches', 'a few burnt patches']], 'compact, few clods, low relief / clods, high relief, charcoal flecks, burnt patches'],
  ['sunga', 'kushan', 'value (M) + texture (M)', [['kushan', 'feature:kushan-bricks', 'burnt bricks, which are in the majority']], 'charcoal flecks, clods / coarse burnt-brick fragments up to 12 cm'],
  ['kushan', 'gupta', 'texture (M)', [['kushan', 'feature:kushan-bricks', 'burnt bricks, which are in the majority'], ['gupta', 'feature:gupta-floor', 'brick-jelly floors']], 'coarse brick fragments / compact earth, fine brick grit, low relief'],
  ['gupta', 'post-gupta', 'texture (M)', [['gupta', 'feature:gupta-floor', 'brick-jelly floors'], ['post-gupta', 'feature:post-gupta-wall-ns', 'made of brick-bats']], 'fine brick grit, low relief / clotted earth, sparse brick-bats, high relief'],
  ['post-gupta', 'rajput', 'value (M) + texture (M)', [['rajput', 'feature:rajput-rubble', 'random rubble masonry']], 'clotted earth / compact occupation earth with rubble and brick-bats'],
  ['rajput', 'sultanate', 'value (M) + texture (M)', [['sultanate', 'deposit', 'seals the structures']], 'rubble and brick-bats / compact sealing earth, no inclusions'],
  ['sultanate', 'mughal', 'colour (pack) + texture', [['mughal', 'colour']], 'compact sealing earth / loose earth with lime-plaster flecks'],
  ['mughal', 'modern-fill', 'colour (pack) + texture', [['mughal', 'colour'], ['modern-fill', 'colour']], 'lime-plaster flecks / loose soil with ash bands']
];
const metrics = JSON.parse(readFileSync(out + 'm1-metrics.json', 'utf8'));
const CELL_VIEWS = [['cold-open', 1], ['cold-open', 2], ['trench-closeup', 1], ['trench-closeup', 5], ['side-square', 2]];
const TEXTURE_VIEWS = [['side-square', 2], ['trench-closeup', 1], ['trench-closeup', 5]];
const textures = Object.fromEntries(TEXTURE_VIEWS.map(([name, s]) => [`${name} s${s}`, bandTexture(`${out}work/${name}-ids-1080.png`, `${out}${name}.png`, [s])[s]]));
const bandRows = SEPARATION.map(([a, b, by, quotes, texture]) => {
  const cells = CELL_VIEWS.map(([name, s]) => { const n = metrics.bandCells?.[name]?.neighbours?.find(n => n.surface === s && n.pair[0] === a && n.pair[1] === b); return n ? { view: `${name} s${s}`, dE76: +n.dE76.toFixed(1) } : null; }).filter(Boolean);
  const tex = Object.entries(textures).map(([view, t]) => { const p = t?.pairs.find(p => p.pair[0] === a && p.pair[1] === b); return p ? { view, fullBandDE76: +p.dE76.toFixed(1), fleckPercent: p.fleck.map(v => +(100 * v).toFixed(1)), hpSd: p.hpSd.map(v => +v.toFixed(2)) } : null; }).filter(Boolean);
  const minCell = cells.length ? cells.reduce((m, c) => c.dE76 < m.dE76 ? c : m) : null;
  return { pair: `${a}/${b}`, separatedBy: by, pack: quotes.map(q => quote(...q)), texture, cells, minCell, cellPass: minCell ? minCell.dE76 >= 5 : null, texture1080: tex };
});
const fmtTex = r => r.texture1080.map(t => `${t.view}: fleck ${t.fleckPercent.join('→')}%, full-band dE ${t.fullBandDE76}`).join('; ');
const bandMd = ['', '## Era soil bands: neighbour separation', '',
  'Colour is used only where the pack gives one (silt, Pre-Mauryan, Mughal, Modern fill). Every other value step and every texture is a modelling decision (M); the pack text cited for M rows is the cue the texture follows, not a stated deposit texture. Cell dE76 = hero-camera 40x20 cells (m1-metrics.json bandCells, minimum over views); texture = band-texture.cjs on the final 1080 stills (fleck = share of pixels more than 6 L* from their 15x15 mean).', '',
  '| Pair | Separated by | Pack text | Texture change (M) | Min cell dE76 | Texture on the stills |', '|---|---|---|---|---|---|',
  ...bandRows.map(r => `| ${r.pair} | ${r.separatedBy} | ${r.pack.join('; ')} | ${r.texture} | ${r.minCell ? `${r.minCell.dE76} (${r.minCell.view})${r.cellPass ? '' : ', under 5: texture-separated'}` : '-'} | ${fmtTex(r)} |`)].join('\n');
// Reveal of walls with a buried base and the static anchors (both M, src/eras/site-state.js and anchor-picker.js).
const revealRows = site.items.filter(it => it.rule === 'wall').map(it => ({ key: it.key, era: ERAS[it.era], courses: it.handle.courseCount, buried: it.buried }));
const revealMd = ['', '## Feature reveal and anchors (M)', '',
  'Reveal (M): features[era] = f > 0 shows q = ceil((b + f (1 - b)) n) of a feature\'s n courses, where b is the share of the wall\'s height below its era top at its centre (the part seated under the deposit). The buried courses come with the first step and the four film steps build the part above the deposit; f = 0 hides the feature and f = 1 shows every course, as before. b = 0 (unchanged reveal) for every non-wall feature and for walls that sit on the top at full height.', '',
  'Anchors (M): candidates are camera-facing triangle centroids of the displayed kit geometry, offset 1 cm out along the normal. A candidate is open when the lines to five eyes on the film orbit (azimuth 35 + 13u, elevation 27 + 2u, target (-1.4, -3.85 - 0.95u, 0), 72.5 m; u = 0, .25, .5, .75, 1) miss every displayed feature triangle and the soil. Every film state reads its anchors from the static table src/eras/anchor-table.js (scripts/modelling/anchor-table.mjs), which keeps a feature\'s point while it stays open; states outside the film pick at run time with quantized scores and triangle-order ties.', '',
  '| Wall | Era | Courses | b (buried share) |', '|---|---|---|---|',
  ...revealRows.filter(r => r.buried > 0).map(r => `| ${r.key} | ${r.era} | ${r.courses} | ${r.buried.toFixed(3)} |`), '',
  `Walls with b = 0 (reveal unchanged): ${revealRows.filter(r => r.buried === 0).map(r => r.key).join(', ')}.`].join('\n');
writeFileSync(out + 'm1-provenance.md', md + '\n' + bandMd + '\n' + revealMd + '\n');
writeFileSync(out + 'm1-band-separation.json', JSON.stringify(bandRows, null, 1) + '\n');
console.log(bandMd);
console.log('anchor states', Object.keys(anchors).length, 'features at cold open', Object.keys(anchors['cold-open'].featureAnchors).length);
