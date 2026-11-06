import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { siteSoilMaterial, siteSoilUnifiedMaterial, splitByPlane } from '../src/site-tier/soil-material.js';

const grid = { xmin: -12, zmin: -8, nx: 97, nz: 65, stepMetres: .25 };
const common = { grid, uniforms: { eraActive: { value: 9 } }, bottomY: -9.6, fadeStartY: -9, top: { albedoMultiplier: .8, slopeDarken: .3, gradientMax: .031 } };
function build(mode, mapping, displaced = false) {
  const pages = { top: new THREE.Texture(), albedo: new THREE.Texture(), normal: new THREE.Texture() };
  const material = siteSoilMaterial({ ...common, mode, mapping, displaced, pages }), lib = THREE.ShaderLib.standard;
  const shader = { uniforms: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
  material.onBeforeCompile(shader);
  return { material, shader, pages };
}
const plane = { u: [1 / 24, 0, 0, .5], v: [0, 1 / 14, 0, .66] };

test('site soil programs read pages and keep the film lighting terms', () => {
  for (const [mode, mapping] of [['outer', plane], ['inner', 'uv'], ['floor', 'uv']]) {
    const { shader, pages } = build(mode, mapping);
    assert.equal(shader.uniforms.siteAlbedo.value, pages.albedo);
    assert.equal(shader.uniforms.siteNormal.value, pages.normal);
    assert.match(shader.fragmentShader, /texture\(siteAlbedo,/);
    assert.match(shader.fragmentShader, /normal=normalize\(mat3\(viewMatrix\)\*siteWorldNormal\)/);
    assert.equal(/totalEmissiveRadiance\+=/.test(shader.fragmentShader), mode === 'inner');
    assert.equal(/siteUv=uv/.test(shader.vertexShader), mapping === 'uv');
    assert.doesNotMatch(shader.fragmentShader, /eraNoiseS|eraPieces/);
  }
});

test('site top keeps era colour, veneer and slope live and reads variation and relief from the page', () => {
  const { shader, pages } = build('top', { u: [1 / 24, 0, 0, .5], v: [0, 0, 1 / 16, .5] }, true);
  assert.equal(shader.uniforms.siteTop.value, pages.top);
  assert.match(shader.fragmentShader, /int e=eraActive/);
  assert.match(shader.fragmentShader, /smoothstep\(0\.0,\.06,P\.y-eb\[e\]\)/);
  assert.match(shader.fragmentShader, /sitePage\.r\*2\.0/);
  assert.match(shader.fragmentShader, /0\.300000\*smoothstep\(\.995,\.8,abs\(flatN\.y\)\)/);
  assert.match(shader.vertexShader, /transformed\.y=eraY/);
  assert.match(shader.vertexShader, /#define ERA_TOP_NORMAL/);
  assert.doesNotMatch(shader.fragmentShader, /eraNoiseS|eraPieces/);
});

test('program keys differ by mode, mapping and displacement; page swaps keep the program', () => {
  const keys = [build('top', plane, true), build('top', plane), build('outer', plane, true), build('inner', 'uv'), build('floor', 'uv'), build('floor', plane)].map(b => b.material.customProgramCacheKey());
  assert.equal(new Set(keys).size, keys.length);
  const { material } = build('inner', 'uv'), key = material.customProgramCacheKey(), next = new THREE.Texture();
  material.userData.siteUniforms.siteAlbedo.value = next;
  assert.equal(material.customProgramCacheKey(), key);
});

test('splitByPlane separates the four outer planes and shares attribute buffers', () => {
  const quad = (a, b, c, d) => [a, b, c, a, c, d];
  const positions = [[-12, 0, 8], [12, 0, 8], [12, 1, 8], [-12, 1, 8], [-12, 0, -8], [-12, 1, -8], [12, 1, -8], [12, 0, -8], [12, 0, -8], [12, 1, -8], [12, 1, 8], [12, 0, 8], [-12, 0, -8], [-12, 0, 8], [-12, 1, 8], [-12, 1, -8], [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]];
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(positions.flat(), 3));
  g.setIndex([...quad(0, 1, 2, 3), ...quad(4, 5, 6, 7), ...quad(8, 9, 10, 11), ...quad(12, 13, 14, 15), ...quad(16, 19, 18, 17)]);
  const parts = splitByPlane(g);
  assert.deepEqual(Object.keys(parts).sort(), ['other', 'x+', 'x-', 'z+', 'z-']);
  for (const p of Object.values(parts)) { assert.equal(p.index.count, 6); assert.equal(p.attributes.position, g.attributes.position); }
});

test('merged soil materials share one program per side and switch mode, mapping and displacement by uniform', () => {
  const merged = (mode, mapping, displaced = false) => {
    const pages = { top: new THREE.Texture(), albedo: new THREE.Texture(), normal: new THREE.Texture() };
    const material = siteSoilUnifiedMaterial({ ...common, mode, mapping, displaced, pages }), lib = THREE.ShaderLib.standard;
    const shader = { uniforms: {}, vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader };
    material.onBeforeCompile(shader);
    return { material, shader };
  };
  const all = [merged('top', plane, true), merged('top', plane), merged('outer', plane, true), merged('inner', 'uv'), merged('floor', 'uv'), merged('floor', plane)];
  assert.equal(new Set(all.map(b => b.material.customProgramCacheKey())).size, 1);
  assert.equal(new Set(all.map(b => b.shader.vertexShader)).size, 1);
  assert.equal(new Set(all.map(b => b.shader.fragmentShader)).size, 1);
  assert.deepEqual(all.map(b => b.material.side), [THREE.FrontSide, THREE.FrontSide, THREE.DoubleSide, THREE.DoubleSide, THREE.FrontSide, THREE.FrontSide]);
  assert.deepEqual(all.map(b => [b.shader.uniforms.siteMode.value, b.shader.uniforms.siteMapping.value, b.shader.uniforms.siteDisplaced.value, b.shader.uniforms.siteTopNormal.value]),
    [[0, 1, 1, 1], [0, 1, 0, 0], [1, 1, 1, 0], [2, 0, 0, 0], [3, 0, 0, 0], [3, 1, 0, 0]]);
  const { shader } = all[0];
  assert.match(shader.vertexShader, /if\(siteDisplaced==1&&eraBlend>=0\.0\)\{/);
  assert.match(shader.vertexShader, /if\(siteTopNormal==1\)\{/);
  assert.doesNotMatch(shader.vertexShader, /ERA_TOP_NORMAL/);
  // The per-mode terms are the split material's, byte for byte.
  const split = build('top', plane, true).shader.fragmentShader, unified = shader.fragmentShader;
  for (const term of ['diffuseColor.rgb=albedo*(sitePage.r*2.0);', 'smoothstep(.995,.8,abs(flatN.y))', 'texture(siteAlbedo,', 'normal=normalize(mat3(viewMatrix)*siteWorldNormal)'])
    assert.ok(unified.includes(term), term);
  assert.ok(split.includes('diffuseColor.rgb=albedo*(sitePage.r*2.0);'));
  assert.doesNotMatch(unified, /eraNoiseS|eraPieces/);
});
