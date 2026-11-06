// The look-dev stage shared by the M1 world (museum-scene.js createLookWorld) and the site tier world
// (src/site-tier/world.js): look constants, backdrop, lights, plinth, scale bar and shadow-catcher ground. Imports
// nothing that builds era geometry, so the site tier can use it without the M1 kit.
import * as THREE from 'three';
import { box } from './geometry.js';
import { KEY_LIGHT_POSITION } from './strata-surface.js';
import { mulberry32 } from './rng.js';

// Key cooled from Round 5's 0xffe4c1 so soil chroma comes from albedo; the low fill stays warm for trench interiors.
export const LIGHT_COLOURS = Object.freeze({ key: 0xfff2e2, fill: 0xe8d6c0, sky: 0xbab4a8, ground: 0x70634f });
export const TOP_ALBEDO_MULTIPLIER = .8;
// Eroded lip strips tilt toward the key light; darkening them by slope removes the lit rolled-crust rim along every lip.
export const TOP_SLOPE_DARKEN = .3;
export const TOP_CHARACTER = Object.freeze({ name: 'loose top: flat patches, clods, darker patches', mottle: .34, streak: 0, streakThickness: .1,
  lump: .55, lumpPeriod: .1, speck: .25, patches: .12, darkPatches: .05, relief: .8 });
export const FLOOR_CHARACTER = Object.freeze({ name: 'trowelled excavation floor', mottle: .9, streak: 0, streakThickness: .1,
  lump: .5, lumpPeriod: .08, speck: .3, patches: .15, relief: 1.0 });
export const arcAngle = seconds => (-(Math.PI / 6) + Math.PI / 3 * (1 - Math.cos(Math.PI * Math.max(0, Math.min(12, seconds)) / 12)) / 2);

export const BACKDROP = Object.freeze({ inner: [0x39, 0x34, 0x2e], outer: [0x19, 0x1b, 0x1c], from: [256, 205, 15], to: [256, 240, 340], ditherSeed: 60617 });
// The same two-circle radial gradient Canvas drew on a 512 square, evaluated in floating point at output resolution and
// quantized with seeded triangular dither of about one code value, so the 8-bit background shows no contour bands.
// Drawn 1:1 with nearest filtering so the dither is not smoothed away.
export const SCALE_BAR = Object.freeze({ heightMetres: .2, outlineMetres: .034, centreBelowBaseMetres: .21, bone: 0xd8cebb, grey: 0x756d60 });
export const GROUND = Object.freeze({ radiusMetres: 26, fadeMetres: [17, 23] });
export function backdrop(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d'), image = ctx.createImageData(width, height), random = mulberry32(BACKDROP.ditherSeed);
  const [x0, y0, r0] = BACKDROP.from, [x1, y1, r1] = BACKDROP.to, dx = x1 - x0, dy = y1 - y0, dr = r1 - r0;
  const a = dx * dx + dy * dy - dr * dr;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const px = (x + .5) * 512 / width - x0, py = (y + .5) * 512 / height - y0;
    const b = px * dx + py * dy + r0 * dr, c = px * px + py * py - r0 * r0;
    let t = (b + Math.sqrt(Math.max(0, b * b - a * c))) / a;
    if (r0 + t * dr < 0) t = (b - Math.sqrt(Math.max(0, b * b - a * c))) / a;
    t = Math.min(1, Math.max(0, t));
    const at = (y * width + x) * 4;
    for (let k = 0; k < 3; k++) {
      const value = BACKDROP.inner[k] + (BACKDROP.outer[k] - BACKDROP.inner[k]) * t + random() + random() - 1;
      image.data[at + k] = Math.min(255, Math.max(0, Math.round(value)));
    }
    image.data[at + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  return texture;
}

// Hemisphere, key (VSM shadow caster), fill and rim, added to the scene in that order.
export function addLookLights(scene, { eraDebug = null } = {}) {
  const hemisphere = new THREE.HemisphereLight(LIGHT_COLOURS.sky, LIGHT_COLOURS.ground, .4);
  scene.add(hemisphere);
  const key = new THREE.DirectionalLight(LIGHT_COLOURS.key, 2);
  key.position.set(...KEY_LIGHT_POSITION);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -25, right: 25, top: 25, bottom: -25, near: 1, far: 110 });
  // normalBias .08 m (was .025): the block's own cut faces self-shadowed at grazing key incidence near the block
  // foot, printing regular teeth along the plinth line (shadow acne; tested against .025, a 4096 map and key-off).
  Object.assign(key.shadow, { radius: 7, blurSamples: 16, normalBias: .08, bias: -.0004 });
  scene.add(key);
  const fill = new THREE.DirectionalLight(LIGHT_COLOURS.fill, 2.4);
  fill.position.set(18, 5, 32);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xc4c3b5, .3);
  rim.position.set(8, 19, -25);
  scene.add(rim);
  // Diagnostic (eraDebug containing 'nofill'): key light only, no hemisphere, fill or rim.
  if (String(eraDebug ?? '').split(',').includes('nofill')) hemisphere.intensity = fill.intensity = rim.intensity = 0;
  return { hemisphere, key, fill, rim };
}

// Plinth, scale bar and shadow-catcher ground under a block whose base is at y = -base. add(geometry, material, options)
// is the world's mesh helper (roles and shadow flags); material(colour) its standard material.
// scaleBar false leaves out the film's plinth-face scale bar (the site draws its own).
export function addLookPlinth({ scene, add, material, base, plinthColour, scaleBar = true }) {
  // The plinth casts but does not receive: at grazing key incidence its own faces self-shadowed through the 2.4 cm
  // shadow-map texels, printing regular teeth along its lower edge.
  add(box(25.3, .30, 17.3, 0, -base - .21, 0), material(plinthColour), { role: 'plinth', receive: false });
  add(box(25.24, .065, 17.24, 0, -base - .0325, 0), material(0x38362f), { role: 'plinth', receive: false });
  // Scale bar sized for 5-7 px at 1080 in the hero and overview (about 29.5 px per metre at the plinth front):
  // 0.2 m segments (about 6 px), a 0.034 m (1 px) bone outline and 1 px ticks that close each dark segment into a box.
  const S = SCALE_BAR, barY = -base - S.centreBelowBaseMetres;
  if (scaleBar) {
    for (let i = 0; i < 5; i++) add(box(1, S.heightMetres, .012, 2.5 + i, barY, 8.66),
      new THREE.MeshBasicMaterial({ color: i % 2 ? S.grey : S.bone }), { role: 'scale', cast: false });
    for (let i = 0; i <= 5; i++) add(box(S.outlineMetres, S.heightMetres + 2 * S.outlineMetres, .014, 2 + i, barY, 8.668),
      new THREE.MeshBasicMaterial({ color: S.bone }), { role: 'scale', cast: false });
    for (const side of [-1, 1]) add(box(5 + S.outlineMetres, S.outlineMetres, .015, 4.5, barY + side * (S.heightMetres + S.outlineMetres) / 2, 8.67),
      new THREE.MeshBasicMaterial({ color: S.bone }), { role: 'scale', cast: false });
  }
  // Shadow catcher: a disc whose alpha fades to zero well inside its edge and inside the key light's shadow frustum,
  // so neither the plane edge nor the frustum boundary can print a line in the background.
  const groundMaterial = new THREE.ShadowMaterial({ color: 0x08090a, opacity: .45 });
  groundMaterial.onBeforeCompile = shader => {
    shader.vertexShader = `varying vec2 groundXZ;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\ngroundXZ=(modelMatrix*vec4(position,1.0)).xz;');
    shader.fragmentShader = `varying vec2 groundXZ;\n${shader.fragmentShader}`.replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );',
      `gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) * (1.0 - smoothstep(${GROUND.fadeMetres[0].toFixed(1)}, ${GROUND.fadeMetres[1].toFixed(1)}, length(groundXZ))) );`);
  };
  groundMaterial.customProgramCacheKey = () => 'faded-ground';
  const ground = new THREE.Mesh(new THREE.CircleGeometry(GROUND.radiusMetres, 128), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -base - .38;
  ground.receiveShadow = true;
  ground.userData.sectionRole = 'ground';
  scene.add(ground);
  return ground;
}
