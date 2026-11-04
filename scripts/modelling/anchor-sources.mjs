// Inputs of the static anchor table (src/eras/anchor-table.js): its hash goes into the table, and the anchor-table
// test fails when a source changed without regenerating it. Line endings are normalized.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function anchorSourceFiles(root) {
  const out = [];
  const walk = dir => { for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) { const rel = `${dir}/${e.name}`; if (e.isDirectory()) walk(rel); else if (rel.endsWith('.js') && rel !== 'src/eras/anchor-table.js') out.push(rel); } };
  walk('src/eras'); walk('src/features');
  out.push('src/layers.js', 'src/earth-edges.js', 'src/soil-noise.js', 'src/palettes.js', 'src/rng.js', 'src/soil-colour.js', 'src/strata-surface.js',
    'src/film/timeline.js', 'src/film/camera.js', 'reference/film-callouts.json', 'reference/purana-qila/fig13-walls.json');
  return out;
}
export function anchorSourceHash(root) {
  const h = crypto.createHash('sha256');
  for (const rel of anchorSourceFiles(root)) h.update(rel + '\n' + fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n') + '\n');
  return h.digest('hex');
}
