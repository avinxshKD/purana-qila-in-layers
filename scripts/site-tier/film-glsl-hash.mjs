// G3 film guard (CPU): SHA-256 of the generated GLSL (ShaderLib source after onBeforeCompile, includes unexpanded) and
// the program cache key of every material in the M1 era composite as museum-scene.js builds it (soil block, all cut
// steps at output scales 1 and 2, the soil depth material, the feature materials, the default noise material). Run
// before and after any change near the film path; the two JSON files must be identical.
// Usage: node scripts/site-tier/film-glsl-hash.mjs <out.json>
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { siteBoundaryGrids, createEraSite } from '../../src/eras/site-state.js';
import { createSoilBlock } from '../../src/eras/soil-block.js';
import { noiseMaterial } from '../../src/strata-surface.js';
import { TOP_CHARACTER, FLOOR_CHARACTER, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN } from '../../src/museum-scene.js';

const outFile = process.argv[2];
if (!outFile) throw new Error('usage: film-glsl-hash.mjs <out.json>');
const LIB = { MeshStandardMaterial: 'standard', MeshBasicMaterial: 'basic', ShadowMaterial: 'shadow', MeshDepthMaterial: 'depth', MeshDistanceMaterial: 'distanceRGBA' };
const hashes = {};
function note(label, mat) {
  const lib = THREE.ShaderLib[LIB[mat.type]], shader = { uniforms: {}, defines: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
  mat.onBeforeCompile?.(shader, null);
  const h = createHash('sha256').update(mat.type).update('\0').update(mat.customProgramCacheKey?.() ?? '').update('\0').update(shader.vertexShader).update('\0').update(shader.fragmentShader).digest('hex');
  (hashes[label] ??= new Set()).add(h);
}
const scene = new THREE.Scene(), stack = siteBoundaryGrids();
for (const outputScale of [1, 2]) {
  const block = createSoilBlock({ stack, outputScale, parent: scene, top: { character: TOP_CHARACTER, albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN }, floor: { character: FLOOR_CHARACTER } });
  for (const [k, m] of Object.entries(block.materials)) note(`soil:${k}:x${outputScale}`, m);
  for (const m of block.meshes()) if (m.customDepthMaterial) note(`soil-depth:x${outputScale}`, m.customDepthMaterial);
}
const site = createEraSite({ outputScale: 1 });
site.group.traverse(o => { if (o.isMesh) note(`feature:${o.parent?.name ?? o.name}`, o.material); });
note('noise:default', noiseMaterial(new THREE.MeshStandardMaterial({ color: 0xffffff }), { outputScale: 1 }));
const out = Object.fromEntries(Object.entries(hashes).sort().map(([k, v]) => [k, [...v].sort()]));
out._all = createHash('sha256').update(JSON.stringify(out)).digest('hex');
writeFileSync(outFile, JSON.stringify(out, null, 1) + '\n');
console.log('materials', Object.keys(out).length - 1, 'digest', out._all);
