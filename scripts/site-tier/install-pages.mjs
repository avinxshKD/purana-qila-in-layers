// Installs the baked soil texture pages (scripts/site-tier/bake.cjs output, WebP) next to the site packs and lists them
// in manifest.json under `pages` (content-hashed files, byte counts, SHA-256, the mapping each page needs). Atlas pages
// must come from the bake of the same build: their sizes are checked against the core pack's atlas table.
// Usage: node scripts/site-tier/install-pages.mjs --planes <bake dir> --top <bake dir> --core <bake dir> --steps <bake dir>
//   [--assets <dir, default public/site-tier/>] [--quality 90]
import { readFileSync, writeFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadSiteTierAssets } from '../../src/site-tier/assets.js';

const root = fileURLToPath(new URL('../../', import.meta.url));
const arg = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const dir = p => p && p.replace(/[\\/]?$/, '/');
const OUT = dir(arg('--assets', root + 'public/site-tier/')), Q = Number(arg('--quality', 90));
const SRC = { planes: dir(arg('--planes')), top: dir(arg('--top')), core: dir(arg('--core')), steps: dir(arg('--steps')) };
for (const [k, v] of Object.entries(SRC)) if (!v) throw new Error(`--${k} <bake dir> required`);
const manifestPath = OUT + 'manifest.json', manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const assets = await loadSiteTierAssets({ base: OUT, fetch: async p => { try { return new Response(readFileSync(p)); } catch { return new Response(null, { status: 404 }); } } });
const atlases = (await assets.core()).meta.atlases;
// File names avoid '+' (plane z+ -> zp).
const slug = name => name.replace(/^([xz])\+$/, '$1p').replace(/^([xz])-$/, '$1n');
const keep = new Set();
function map(folder, name, mapName, meta, colorSpace) {
  const file = `${folder}${name}-${mapName}-q${Q}.webp`, bytes = readFileSync(file), sha = createHash('sha256').update(bytes).digest('hex');
  const page = meta.pages.find(p => p.map === mapName);
  if (!page) throw new Error(`${folder}: no ${mapName} page for ${name}`);
  const out = `page-${slug(name)}-${mapName}.${sha.slice(0, 16)}.webp`;
  writeFileSync(OUT + out, bytes); keep.add(out);
  return [mapName, { file: out, bytes: bytes.length, sha256: sha, width: page.width, height: page.height, colorSpace }];
}
const json = f => JSON.parse(readFileSync(f, 'utf8'));
const pages = {};
for (const name of ['z+', 'z-', 'x+', 'x-']) {
  const meta = json(`${SRC.planes}plane-${name}.json`);
  pages[name] = { kind: 'plane', group: 'first', plane: meta.plane, texelMetres: meta.texelMetres, maps: Object.fromEntries([map(SRC.planes, name, 'albedo', meta, 'srgb'), map(SRC.planes, name, 'normal', meta, 'linear')]) };
}
{
  const meta = json(`${SRC.top}top-all.json`);
  pages.top = { kind: 'top', group: 'first', plane: meta.plane, texelMetres: meta.texelMetres, gradientMax: meta.gradientMax, variationScale: meta.variationScale, activeEra: meta.activeEra,
    maps: Object.fromEntries(['variation', 'gradX', 'gradZ'].map(m => map(SRC.top, 'top', m, meta, 'linear'))) };
}
for (const name of Object.keys(atlases)) {
  const folder = name === 'core' ? SRC.core : SRC.steps, meta = json(`${folder}atlas-${name}.json`), a = atlases[name];
  if (meta.width !== a.width || meta.height !== a.height) throw new Error(`atlas ${name}: bake ${meta.width}x${meta.height}, build ${a.width}x${a.height} (bake from another build)`);
  pages[name] = { kind: 'atlas', group: name === 'core' ? 'first' : name, width: a.width, height: a.height, maps: Object.fromEntries([map(folder, name, 'albedo', meta, 'srgb'), map(folder, name, 'normal', meta, 'linear')]) };
}
for (const f of readdirSync(OUT)) if (/^page-.*\.[0-9a-f]{16}\.webp$/.test(f) && !keep.has(f)) rmSync(OUT + f);
manifest.pages = pages;
manifest.firstViewPages = Object.keys(pages).filter(n => pages[n].group === 'first');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
const sum = names => names.reduce((s, n) => s + Object.values(pages[n].maps).reduce((t, m) => t + m.bytes, 0), 0);
const firstPacks = manifest.firstView.reduce((s, p) => s + manifest.packs[p].bytes, 0), firstPages = sum(manifest.firstViewPages);
console.log(JSON.stringify({ pages: Object.keys(pages).length, firstViewPages: manifest.firstViewPages, firstViewPageBytes: firstPages, firstViewPackBytes: firstPacks, firstViewBytes: firstPacks + firstPages,
  stepPageBytes: sum(Object.keys(pages).filter(n => pages[n].group !== 'first')) }));
