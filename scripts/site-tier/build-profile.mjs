// Main-thread cost of each part of a cut step build (world.js buildStep), per step, from the shipped packs in Node.
// Usage: node scripts/site-tier/build-profile.mjs [rounds]
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { loadSiteTierAssets } from '../../src/site-tier/assets.js';
import { decodeFixedSoil } from '../../src/site-tier/fixed-soil.js';
import { splitByPlane } from '../../src/site-tier/soil-material.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/site-tier/');
const fetch = async url => { const b = await readFile(path.join(root, url.replace(/^\/site-tier\//, ''))); return { ok: true, status: 200, json: async () => JSON.parse(b.toString('utf8')), arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), blob: async () => new Blob([b]) }; };
const now = () => performance.now(), rounds = Number(process.argv[2] ?? 3);
const assets = await loadSiteTierAssets({ base: '/site-tier/', fetch });
const core = await assets.core(), meta = core.meta;
const FIXED = ['lattice', 'blend', 'normal', 'index', 'heights', 'pairs', 'pairHeights'];
const rows = [];
for (let k = 0; k <= meta.cutSteps; k++) {
  if (k === meta.defaultStep) continue;
  const s = await assets.step(k), row = { k, soil: [], margins: null };
  for (const id of meta.soilSteps[k] ?? []) {
    const { geometry: g } = s.geometry(id), times = [];
    for (let r = 0; r < rounds; r++) { const c = g.clone(); c.deleteAttribute('normal'); const t = now(); c.computeVertexNormals(); times.push(now() - t); }
    row.soil.push({ id, vertices: g.attributes.position.count, triangles: (g.index?.count ?? 0) / 3, hadNormals: !!g.attributes.normal, normalsMs: +Math.min(...times).toFixed(2) });
  }
  if (k === 0) {
    const f = meta.fixedSoil.marginTop, pack = await assets.pack(f.pack), get = name => Object.fromEntries(FIXED.map(x => [x, pack.arrays[`fixed:${name}:${x}`]]));
    const m = { top: [], faces: [], split: [] };
    for (let r = 0; r < rounds; r++) {
      let t = now(); decodeFixedSoil(get('marginTop'), meta.fixedSoil.marginTop); m.top.push(now() - t);
      t = now(); const faces = decodeFixedSoil(get('marginFaces'), meta.fixedSoil.marginFaces); m.faces.push(now() - t);
      t = now(); splitByPlane(faces); m.split.push(now() - t);
      m.vertices = [meta.fixedSoil.marginTop.vertices, meta.fixedSoil.marginFaces.vertices]; m.faceTriangles = faces.index.count / 3;
    }
    row.margins = { vertices: m.vertices, faceTriangles: m.faceTriangles, decodeTopMs: +Math.min(...m.top).toFixed(2), decodeFacesMs: +Math.min(...m.faces).toFixed(2), splitMs: +Math.min(...m.split).toFixed(2) };
  }
  rows.push(row);
}
console.log(JSON.stringify(rows, null, 1));
