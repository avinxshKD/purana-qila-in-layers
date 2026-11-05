// Freeze a copy of the files a film build reads, with a sha256 manifest.
// Usage: node scripts/modelling/m2-freeze.mjs --out <new folder> [--audits <audit json>,<audit json>]
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(import.meta.dirname, '../..');
const arg = name => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const out = path.resolve(root, arg('--out') ?? '');
if (!arg('--out')) throw new Error('--out <folder> is required');
if (fs.existsSync(out)) throw new Error(`${out} exists; use a new folder`);
const ENTRIES = ['src', 'public', 'scripts', 'test', 'film.html', 'index.html', 'site.html', 'features.html', 'package.json', 'package-lock.json',
  'reference/film-callouts.json', 'reference/site-drawers.json', 'reference/site-sources.json', 'reference/purana-qila/fig13-walls.json'];
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const files = [];
function walk(rel) {
  const abs = path.join(root, rel), stat = fs.statSync(abs);
  if (stat.isDirectory()) for (const name of fs.readdirSync(abs).sort()) walk(path.join(rel, name));
  else files.push(rel.split(path.sep).join('/'));
}
for (const e of ENTRIES) walk(e);
const auditChecks = {};
const audits = arg('--audits')?.split(',') ?? ['output/lookdev/modelling/m2/feature-timing-m2a.json', 'output/lookdev/modelling/m2/anchor-audit-m2a-official/summary.json'];
for (const rel of audits) {
  const hashes = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')).sourceHashes, changed = [];
  for (const [file, hash] of Object.entries(hashes)) { const p = path.join(root, file); if (!fs.existsSync(p) || sha256(p) !== hash) changed.push(file); }
  auditChecks[rel] = { filesChecked: Object.keys(hashes).length, changedSinceAudit: changed };
}
const rows = [];
for (const rel of files) {
  const src = path.join(root, rel), dst = path.join(out, 'tree', rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  const hash = sha256(src);
  if (sha256(dst) !== hash) throw new Error(`copy mismatch ${rel}`);
  rows.push({ path: rel, bytes: fs.statSync(src).size, sha256: hash, mtime: fs.statSync(src).mtime.toISOString() });
}
const listing = rows.map(r => `${r.sha256}  ${r.path}`).join('\n') + '\n';
fs.writeFileSync(path.join(out, 'SHA256SUMS.txt'), listing);
const manifest = { createdAt: new Date().toISOString(), root, entries: ENTRIES, fileCount: rows.length, totalBytes: rows.reduce((a, r) => a + r.bytes, 0),
  sha256sumsHash: crypto.createHash('sha256').update(listing).digest('hex'), auditChecks, files: rows };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log(JSON.stringify({ fileCount: manifest.fileCount, totalBytes: manifest.totalBytes, sha256sumsHash: manifest.sha256sumsHash, manifestHash: sha256(path.join(out, 'manifest.json')), auditChecks }, null, 1));
