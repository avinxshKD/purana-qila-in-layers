// Site tier asset loader: fetches manifest.json (served uncached) and the content-hashed packs it names, inflates and
// parses them (pack.js). Works in browsers and in Node 18+ with a fetch replacement.
import { readPack, inflatePack, decodeGrids } from './pack.js';
import { decodeFixedSoil } from './fixed-soil.js';

const now = () => globalThis.performance?.now() ?? Date.now();
// Under Vite the site may be served from a sub-path; Node callers have no import.meta.env and keep '/site-tier/'.
const DEFAULT_BASE = (import.meta.env?.BASE_URL ?? '/') + 'site-tier/';

export async function loadSiteTierAssets({ base = DEFAULT_BASE, fetch: get = globalThis.fetch.bind(globalThis), onTask = null } = {}) {
  const t0 = now(), response = await get(base + 'manifest.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`site-tier manifest: HTTP ${response.status}`);
  const manifest = await response.json();
  if (manifest.format !== 'strata-site-tier' || manifest.version !== 1) throw new Error('site-tier manifest: unknown format');
  onTask?.({ name: 'site-tier-manifest', durationMs: now() - t0 });
  const packs = new Map(), timings = {};
  // Packs are fetched once and kept; a failed fetch is not cached, so a later call retries.
  function pack(name) {
    if (packs.has(name)) return packs.get(name);
    const entry = manifest.packs[name];
    if (!entry) throw new Error(`site-tier: no pack ${name}`);
    const promise = (async () => {
      const start = now(), r = await get(base + entry.file);
      if (!r.ok) throw new Error(`site-tier ${name}: HTTP ${r.status}`);
      const compressed = new Uint8Array(await r.arrayBuffer()), fetched = now();
      if (compressed.byteLength !== entry.bytes) throw new Error(`site-tier ${name}: ${compressed.byteLength} bytes, manifest says ${entry.bytes}`);
      const raw = await inflatePack(compressed), inflated = now(), parsed = readPack(raw), done = now();
      timings[name] = { fetchMs: fetched - start, inflateMs: inflated - fetched, parseMs: done - inflated, bytes: entry.bytes, inflatedBytes: raw.byteLength };
      onTask?.({ name: `site-tier-pack-${name}`, durationMs: done - start });
      return parsed;
    })();
    promise.catch(() => packs.delete(name));
    packs.set(name, promise);
    return promise;
  }
  const packFor = (core, id) => core.meta.geometryPack[id];
  return {
    manifest, timings, pack, base, fetch: get,
    // Drops a pack from the cache (residency eviction); the next pack(name) fetches it again.
    evict(name) { packs.delete(name); delete timings[name]; },
    core: () => pack('core'),
    async grids() { const p = await pack('grids'), a = p.header.arrays.grids; return decodeGrids(p.arrays.grids, a.grid); },
    // Every pack a cut step needs (core plus the step's own pack, if any).
    async step(k) {
      const core = await pack('core'), names = new Set(['core']);
      for (const id of core.meta.soilSteps[k] ?? []) names.add(packFor(core, id));
      for (const slots of Object.values(core.meta.featureSteps[k] ?? {})) for (const id of slots) if (id) names.add(packFor(core, id));
      for (const f of Object.values(core.meta.fixedSoil ?? {})) if (f.shown === 'always' || k === 0) names.add(f.pack);
      const loaded = await Promise.all([...names].map(pack));
      const geometry = id => { for (const p of loaded) { const g = p.geometries.get(id); if (g) return g; } throw new Error(`site-tier: geometry ${id} missing`); };
      return { core, packs: [...names], geometry };
    },
    // Fixed soil mesh (top, faces, marginTop, marginFaces), rebuilt exactly from its lattice arrays.
    async fixedSoil(name) {
      const core = await pack('core'), meta = core.meta.fixedSoil[name], p = await pack(meta.pack), get = key => p.arrays[`fixed:${name}:${key}`];
      return decodeFixedSoil({ lattice: get('lattice'), blend: get('blend'), normal: get('normal'), index: get('index'), heights: get('heights'), pairs: get('pairs'), pairHeights: get('pairHeights') }, meta);
    }
  };
}
