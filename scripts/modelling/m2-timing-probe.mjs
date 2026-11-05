// M2 probe: feature-timing audit on selected frames of this tree; scene-level cpu-world ring copies reported apart.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { audit } = require(process.env.M2_AUDIT ?? '../film/feature-timing-audit.cjs');
const frames = process.argv[2].split(',').flatMap(s => { const [a, b] = s.split('-').map(Number); return b === undefined ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i); });
const report = await audit({ tree: process.cwd(), frames });
const own = report.flags.filter(f => !(report.parts.find(p => p.key === f.key && p.rule === 'well-lining') && f.featureId === 'mauryan-ring-well' && report.parts.filter(p => p.key === f.key).length > 1 && f._x));
for (const p of report.parts.filter(p => p.dugIn)) console.log(p.key.padEnd(34), p.rule.padEnd(11), 'visible', JSON.stringify(p.visibleRanges), 'max', Object.entries(p.sections).map(([k, s]) => `${k}:${s.maximumHeightMetres?.toFixed(3)}@${s.maximumHeightFrame}`).join(' '));
console.log('FLAGS');
for (const f of report.flags) { const rules = report.parts.filter(p => p.key === f.key).map(p => p.rule).join('/'); console.log(f.key, rules, f.kind, JSON.stringify(f.frames), f.maximumHeightMetres.toFixed(3)); }
console.log('frames', report.framesAudited, 'elapsed', report.elapsedSeconds);
