import * as THREE from 'three';
import { createLayerTable, surfaceHeight, lipOverhang } from './layers.js';
import { addStrata, noiseMaterial } from './strata-surface.js';
import { sectionTop, excavationFloor, ringSection, sectionFeatures, topDebris } from './section-geometry.js';
import { createLabels } from './labels.js';
import { PALETTES } from './palettes.js';
import { seamCandidates, octaveProjection, bandCells, inclusionDensity } from './look-metrics.js';
import { createEraSite, siteBoundaryGrids } from './eras/site-state.js';
import { createSoilBlock } from './eras/soil-block.js';
import { createEraDisplacement } from './eras/soil-displace.js';
import { stepOf } from './eras/excavation.js';
import { LIGHT_COLOURS, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN, TOP_CHARACTER, FLOOR_CHARACTER, arcAngle, BACKDROP, SCALE_BAR, GROUND, backdrop, addLookLights, addLookPlinth } from './look-stage.js';

// The look constants and the stage now live in look-stage.js (shared with the site tier); re-exported for existing callers.
export { LIGHT_COLOURS, TOP_ALBEDO_MULTIPLIER, TOP_SLOPE_DARKEN, TOP_CHARACTER, FLOOR_CHARACTER, arcAngle, BACKDROP, SCALE_BAR, GROUND };

export function createLookWorld(canvas, {
  width = 1920, height = 1080, antialias = true, preserve = true, view = 'overview', ao = 'off',
  shadow = 'vsm', labelMode = 'film', era = 'pre-mauryan', typeface = 'adobe', angle = 0, table = createLayerTable(), soil = 'look', eraDebug = null
} = {}) {
  if (!['look', 'eras'].includes(soil)) throw new Error(`Unknown soil model ${soil}`);
  if (ao !== 'off') throw new Error('Look-dev does not permit nondeterministic AO');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias, preserveDrawingBuffer: preserve, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = shadow === 'pcf' ? THREE.PCFShadowMap : THREE.VSMShadowMap;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  scene.background = backdrop(width, height);
  const camera = new THREE.PerspectiveCamera(25, width / height, .1, 180);
  const target = new THREE.Vector3(-1.4, -3.35, 0);
  let distance = view === 'overview-comparison' ? 69 : 72.8, elevation = 27 * Math.PI / 180, azimuth = 35 * Math.PI / 180;
  if (view === 'turntable' || view === 'contact') { distance = 74; target.y = -3.85; }
  if (view === 'trench') { target.set(-.2, -3.1, 6.2); distance = 31; elevation = 22 * Math.PI / 180; azimuth = 20 * Math.PI / 180; }
  if (view === 'cut') { target.set(7, -7, 7.6); distance = 8.2; elevation = 13 * Math.PI / 180; azimuth = 16 * Math.PI / 180; }
  // Square-on to the right side face (x = +12), for checking bedding on faces whose normal runs along the width axis.
  if (view === 'side-square') { target.set(12, -3.4, 0); distance = 18; elevation = 0; azimuth = 90 * Math.PI / 180; }
  if (view === 'front-square') { target.set(-2, -3.4, 8); distance = 18; elevation = 0; azimuth = 0; }
  function placeCamera(seconds) {
    const theta = azimuth + angle * Math.PI / 180 + (view === 'turntable' ? arcAngle(seconds) : 0);
    camera.position.set(target.x + distance * Math.cos(elevation) * Math.sin(theta),
      target.y + distance * Math.sin(elevation), target.z + distance * Math.cos(elevation) * Math.cos(theta));
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }
  placeCamera(0);
  const { key } = addLookLights(scene, { eraDebug });
  const palette = PALETTES.photo;
  let buildingStrata = true;
  function material(color, options = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, ...options });
  }
  const soilMaterial = (mat, configuration = {}) => noiseMaterial(mat, { outputScale: height / 1080, ...configuration });
  function add(geometry, mat, { cast = true, receive = true, role = buildingStrata ? 'cutface' : 'feature', group = role } = {}) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    mesh.userData.sectionRole = role;
    mesh.userData.group = group;
    scene.add(mesh);
    return mesh;
  }
  let strata = null, ring, eraSite = null, eraBlock = null, base = table.proportions.bottomDepth;
  if (soil === 'look') {
    strata = addStrata(table, add, material, height, scene, palette);
    buildingStrata = false;
    const topColour = new THREE.Color(palette.soil).multiplyScalar(TOP_ALBEDO_MULTIPLIER);
    add(sectionTop(table), soilMaterial(material(topColour), { seed: 977, amplitude: 1, character: TOP_CHARACTER, slopeDarken: TOP_SLOPE_DARKEN }), { role: 'top', group: 'top' });
    add(topDebris(table, { brick: palette.brick, sherd: palette.sherd, clod: topColour.getHex() }),
      soilMaterial(material(0xffffff, { vertexColors: true }), { seed: 983, amplitude: .06 }), { role: 'top', group: 'top-debris' });
    for (const trench of table.proportions.trenches) {
      const mesh = add(excavationFloor(trench, table.proportions.shaft),
        soilMaterial(material(palette.damp, { emissive: 0x705339, emissiveIntensity: .06 }), { seed: 991, amplitude: 1, character: FLOOR_CHARACTER }), { role: 'floor', group: `floor-${trench.id}` });
      mesh.userData.trenchId = trench.id;
    }
    ring = ringSection(table.proportions.shaft, 8, { heapColour: palette.damp, fragmentColour: 0x3a322b });
    for (const [key, color] of [['body', 0xffffff], ['lips', 0xffffff], ['gaps', 0xffffff],
      ['soil', 0xffffff], ['fill', 0xffffff], ['cracks', 0x2e2720]]) {
      const vertexColors = ['body', 'lips', 'gaps', 'soil', 'fill'].includes(key);
      add(ring[key], soilMaterial(material(color, { side: THREE.DoubleSide, vertexColors }),
        key === 'soil' ? { seed: 997, amplitude: 1, character: FLOOR_CHARACTER } : { seed: 901 + key.length * 47, amplitude: .04, ring: key === 'body' || key === 'lips' }),
      { receive: false, group: `ring-${key}` });
    }
    add(ring.pitFloor, soilMaterial(material(palette.damp, { emissive: 0x705339, emissiveIntensity: .06 }), { seed: 1003, amplitude: 1, character: FLOOR_CHARACTER }), { role: 'floor', group: 'ring-pit-floor' });
    const features = sectionFeatures(table, { brick: palette.brick, mud: palette.mud });
    add(features.mortar, soilMaterial(material(0xffffff, { vertexColors: true }), { seed: 887, amplitude: 1, character: FLOOR_CHARACTER }), { group: 'mortar' });
    add(features.bricks, soilMaterial(material(0xffffff, { vertexColors: true }), { seed: 891, amplitude: .06, ring: true }), { group: 'bricks' });
  } else {
    // Composite era section (M1): the era soil block, the kit features and the ring well at their seated depths.
    const stack = siteBoundaryGrids();
    eraBlock = createSoilBlock({ stack, outputScale: height / 1080, parent: scene, debug: eraDebug,
      top: { character: TOP_CHARACTER, albedoMultiplier: TOP_ALBEDO_MULTIPLIER, slopeDarken: TOP_SLOPE_DARKEN }, floor: { character: FLOOR_CHARACTER } });
    buildingStrata = false;
    // The ring well is a revealable item of the era site (it shows and sinks with the Mauryan features); same materials.
    eraSite = createEraSite({ outputScale: height / 1080, ringWell: { heapColour: palette.damp, fragmentColour: 0x3a322b, material: key =>
      soilMaterial(material(key === 'cracks' ? 0x2e2720 : 0xffffff, { side: THREE.DoubleSide, vertexColors: key !== 'cracks' }),
        key === 'soil' ? { seed: 997, amplitude: 1, character: FLOOR_CHARACTER } : { seed: 901 + key.length * 47, amplitude: .04, ring: key === 'body' || key === 'lips' }) } });
    eraSite.group.userData.sectionRole = 'feature';
    scene.add(eraSite.group);
    ring = eraSite.ringWell;
    base = eraBlock.base;
  }

  addLookPlinth({ scene, add, material, base, plinthColour: palette.plinth });

  const labels = createLabels({ width, height, camera, callout: view === 'overview' || view === 'overview-comparison', mode: labelMode, era, typeface, baseDepth: base });
  const blockBounds = new THREE.Box3();
  for (const object of scene.children) if (['cutface', 'top'].includes(object.userData.sectionRole)) {
    object.geometry.computeBoundingBox();
    blockBounds.union(object.geometry.boundingBox);
  }
  const blockSize = blockBounds.getSize(new THREE.Vector3());
  table.modellingAssumptions.blockMetres.height = blockSize.y;
  function info() {
    return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, programs: renderer.info.programs.length };
  }
  // The site and film loops and the capture scripts draw with this renderer between these calls, so every pass here
  // hands the renderer back exactly as it found it.
  function rendererState() {
    const saved = { autoClear: renderer.autoClear, shadows: renderer.shadowMap.enabled, toneMapping: renderer.toneMapping,
      exposure: renderer.toneMappingExposure, background: scene.background };
    return () => {
      renderer.autoClear = saved.autoClear; renderer.shadowMap.enabled = saved.shadows; renderer.toneMapping = saved.toneMapping;
      renderer.toneMappingExposure = saved.exposure; scene.background = saved.background;
    };
  }
  let lastYear = 38, lastSeconds = 4;
  function render(year, seconds, { shadows = true } = {}) {
    if (!Number.isFinite(year) || !Number.isFinite(seconds)) throw new TypeError('Finite time required');
    lastYear = year;
    lastSeconds = seconds;
    placeCamera(seconds);
    labels.setTime?.(year);
    labels.redraw();
    const restoreRenderer = rendererState();
    try {
      renderer.shadowMap.enabled = shadows;
      renderer.info.reset();
      renderer.autoClear = true;
      renderer.render(scene, camera);
      renderer.autoClear = false;
      renderer.render(labels.scene, labels.camera);
      return info();
    } finally { restoreRenderer(); }
  }
  function readPixels() {
    const gl = renderer.getContext(), pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels;
  }
  function device() {
    const gl = renderer.getContext(), extension = gl.getExtension('WEBGL_debug_renderer_info');
    return { renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      samples: gl.getParameter(gl.SAMPLES), width, height, shadowMapType: renderer.shadowMap.type,
      palette: 'photo', view, ao, camera: { verticalFov: 25, elevation: elevation * 180 / Math.PI, distance, target: target.toArray() },
      soil, eraBlock: eraBlock ? { ...eraBlock.stats(), levels: eraBlock.levels } : null,
      strata: strata && { ...strata, inclusionRecords: strata.inclusionRecords.length, inclusionValues: (values => {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return { count: values.length, meanAlbedoL: mean, sdAlbedoL: Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length) };
      })(strata.inclusionValues) }, labels: labels.metadata(), blockDimensions: { width: blockSize.x, length: blockSize.z, height: blockSize.y,
        minimumY: blockBounds.min.y, maximumY: blockBounds.max.y, units: 'metres', method: 'Rendered top and strata vertex bounds, excluding overlay features/plinth.' },
      plinthFraming: (() => {
        const bounds = { xmin: width, xmax: 0, ymin: height, ymax: 0 };
        for (const object of scene.children.filter(object => object.userData.sectionRole === 'plinth')) {
          const positions = object.geometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            const p = new THREE.Vector3().fromBufferAttribute(positions, i).project(camera), x = (p.x + 1) * width / 2, y = (1 - p.y) * height / 2;
            bounds.xmin = Math.min(bounds.xmin, x); bounds.xmax = Math.max(bounds.xmax, x); bounds.ymin = Math.min(bounds.ymin, y); bounds.ymax = Math.max(bounds.ymax, y);
          }
        }
        return { bounds, bottomMargin1080: (height - bounds.ymax) * 1080 / height, method: 'Projected actual plinth body/rim vertices, no shadow or HUD.' };
      })(), lights: table.modellingAssumptions.lighting, ghost: false, pit: 'open-front well excavation only' };
  }
  function coverage() {
    const previous = scene.children.map(object => ({ object, visible: object.visible, material: object.material }));
    const restoreRenderer = rendererState(), shadows = renderer.shadowMap.enabled;
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const red = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    try {
      for (const { object } of previous) {
        const role = object.userData.sectionRole;
        object.visible = ['cutface', 'feature', 'top', 'floor'].includes(role);
        if (object.visible) object.material = ['cutface', 'feature'].includes(role) ? white : red;
      }
      scene.background = new THREE.Color(0);
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.shadowMap.enabled = false;
      renderer.autoClear = true;
      renderer.render(scene, camera);
      const pixels = readPixels();
      let blockPixels = 0, cutPixels = 0, xmin = width, xmax = 0, ymin = height, ymax = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 30) {
          blockPixels++;
          const x = i / 4 % width, y = height - 1 - Math.floor(i / 4 / width);
          xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y);
        }
        if (pixels[i] > 200 && pixels[i + 1] > 200 && pixels[i + 2] > 200) cutPixels++;
      }
      return { blockPixels, cutPixels, fraction: cutPixels / blockPixels, bounds: { xmin, xmax, ymin, ymax },
        method: 'White vertical cut surfaces/features divided by white+red block pixels. Top/floors red; set/plinth/ghost/HUD excluded.',
        png: canvas.toDataURL('image/png').split(',')[1] };
    } finally {
      for (const item of previous) { item.object.visible = item.visible; item.object.material = item.material; }
      restoreRenderer();
      white.dispose();
      red.dispose();
      render(lastYear, lastSeconds, { shadows });
    }
  }
  function floorLuma() {
    render(lastYear, lastSeconds);
    const image = readPixels(), previous = scene.children.map(object => ({ object, visible: object.visible, material: object.material }));
    const restoreRenderer = rendererState(), white = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    try {
      for (const { object } of previous) {
        object.visible = ['cutface', 'feature', 'top', 'floor'].includes(object.userData.sectionRole);
        if (object.visible) object.material = object.userData.sectionRole === 'floor' ? white : new THREE.MeshBasicMaterial({ color: 0, side: THREE.DoubleSide });
      }
      scene.background = new THREE.Color(0);
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.autoClear = true;
      renderer.render(scene, camera);
      const mask = readPixels(), lumas = [], rgb = [];
      for (let y = 3; y < height - 3; y++) for (let x = 3; x < width - 3; x++) {
        const at = (y * width + x) * 4;
        if ([-3, 0, 3].every(dy => [-3, 0, 3].every(dx => mask[at + (dy * width + dx) * 4] > 250))) {
          lumas.push((image[at] * .2126 + image[at + 1] * .7152 + image[at + 2] * .0722) / 255);
          rgb.push([image[at], image[at + 1], image[at + 2]]);
        }
      }
      const sorted = [...lumas].sort((a, b) => a - b), minimum = sorted[0];
      return { pixels: sorted.length, minimum, percentile1: sorted[Math.floor(sorted.length * .01)],
        median: sorted[Math.floor(sorted.length * .5)], darkestRGB: rgb[lumas.indexOf(minimum)],
        method: 'Encoded sRGB Rec.709 luma, 3-pixel-eroded visible trench-floor mask; not linear-light luminance.' };
    } finally {
      for (const item of previous) {
        if (item.object.material !== item.material && item.object.material !== white) item.object.material?.dispose();
        item.object.visible = item.visible; item.object.material = item.material;
      }
      white.dispose(); restoreRenderer();
      render(lastYear, lastSeconds);
    }
  }
  // Era id pass (soil 'eras'): soil block pixels carry era index, mode and orientation (soil-shader.js); kit features and
  // the ring are flat blue (0,0,255); everything else is black. Same camera and size as the beauty frame, no HUD.
  function eraIds() {
    if (!eraBlock) throw new Error('eraIds needs soil: eras');
    const restoreRenderer = rendererState(), changed = [];
    const blue = new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide });
    try {
      scene.traverse(object => {
        if (object === scene) return;
        if (object.userData.eraSoil) return;
        if (object.isMesh || object.isLine || object.isPoints || object.isSprite) {
          let role = null;
          for (let o = object; o && o !== scene; o = o.parent) role ??= o.userData.sectionRole;
          changed.push({ object, visible: object.visible, material: object.material });
          if (['feature', 'cutface', 'floor', 'top'].includes(role) && object.isMesh) object.material = blue; else object.visible = false;
        }
      });
      eraBlock.uniforms.eraIdPass.value = 1;
      scene.background = new THREE.Color(0); renderer.toneMapping = THREE.NoToneMapping; renderer.shadowMap.enabled = false;
      renderer.autoClear = true; renderer.render(scene, camera);
      return { png: canvas.toDataURL('image/png').split(',')[1], method: 'Era soil: R = era index x 20 (0 silt, 1 Pre-Mauryan ... 10 Modern fill), G 255, B mode x 4 + orientation (modes outer 0, inner 1, floor 2, top 3; orientation 0 horizontal, 1 facing z, 2 facing x). Features and ring (0,0,255). HUD excluded.' };
    } finally {
      eraBlock.uniforms.eraIdPass.value = 0;
      for (const item of changed) { item.object.visible = item.visible; item.object.material = item.material; }
      blue.dispose(); restoreRenderer();
      render(lastYear, lastSeconds);
    }
  }
  function roleMask() {
    const previous = scene.children.map(object => ({ object, visible: object.visible, material: object.material }));
    const restoreRenderer = rendererState();
    const black = new THREE.MeshBasicMaterial({ color: 0, side: THREE.DoubleSide });
    const red = new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide });
    const green = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
    green.onBeforeCompile = shader => {
      shader.vertexShader = `varying vec3 maskPosition; varying vec3 maskNormal;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nmaskPosition=position;maskNormal=normal;');
      shader.fragmentShader = `varying vec3 maskPosition; varying vec3 maskNormal;\n${shader.fragmentShader}`
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb*=step(7.90,maskPosition.z)*step(.7,abs(normalize(maskNormal).z));');
    };
    try {
      for (const { object } of previous) {
        object.visible = ['cutface', 'feature', 'top', 'floor', 'plinth'].includes(object.userData.sectionRole);
        if (object.visible) object.material = object.userData.sectionRole === 'top' ? red : object.userData.sectionRole === 'cutface' ? green : black;
      }
      scene.background = new THREE.Color(0); renderer.toneMapping = THREE.NoToneMapping; renderer.shadowMap.enabled = false;
      renderer.autoClear = true; renderer.render(scene, camera);
      return { png: canvas.toDataURL('image/png').split(',')[1], method: 'Top red, exposed outer-front cut-face green (world z≥7.90, |normal.z|≥0.7); all occluders black; HUD excluded.' };
    } finally {
      for (const item of previous) { item.object.visible = item.visible; item.object.material = item.material; }
      restoreRenderer();
      black.dispose(); red.dispose(); green.dispose(); render(lastYear, lastSeconds);
    }
  }
  const eraDisplacement = eraBlock ? createEraDisplacement({ stack: eraBlock.stack }) : null;
  return { renderer, scene, camera, render, readPixels, info, device, layerTable: table, labelBounds: labels.bounds,
    titleBounds: labels.titleBounds, setEra: labels.setEra, setTypeface: labels.setTypeface, setDisplayWidth: labels.setDisplayWidth, coverage, floorLuma, roleMask, eraIds,
    seamCandidates: () => seamCandidates(table, camera, [labels.titleBounds(), labels.bounds()].filter(Boolean).map(b => ({
      x: b.x * 1080 / height, y: b.y * 1080 / height, width: b.width * 1080 / height, height: b.height * 1080 / height
    }))), octaveProjection: () => octaveProjection(scene, camera, table),
    bandCells: (perBand = 3, size = {}) => bandCells(table, camera, [labels.titleBounds(), labels.bounds()].filter(Boolean).map(b => ({
      x: b.x * 1080 / height, y: b.y * 1080 / height, width: b.width * 1080 / height, height: b.height * 1080 / height })), perBand, size),
    inclusionDensity: () => inclusionDensity(table, camera, strata.inclusionRecords), ringTones: () => ring.tones,
    // Era section state (soil 'eras'): the film/site scene contract on the soil block and the kit features.
    eraBlock: eraBlock && { base: eraBlock.base, top: surfaceHeight(-12, -8), bottomY: eraBlock.bottomY },
    // CPU positions/normals of the GPU-displaced era meshes for the last applyState: resolve(mesh) -> null when not displaced.
    eraDisplacement,
    applyState(state) {
      if (!eraSite) throw new Error('applyState needs soil: eras');
      const t0 = performance.now(), result = eraSite.applyState(state), t1 = performance.now();
      const block = eraBlock.apply({ deposits: state.deposits, k: stepOf(state.excavation) });
      eraDisplacement.beginFrame(state);
      return { ...result, ...block, timings: { featuresMs: t1 - t0, blockMs: performance.now() - t1 } };
    },
    warmState(state) {
      if (!eraSite) throw new Error('warmState needs soil: eras');
      const t0 = performance.now(), features = eraSite.warmState(state);
      eraBlock.warm(stepOf(state.excavation));
      return { featuresMs: features, totalMs: performance.now() - t0 };
    },
    eraSite: () => eraSite,
    lipOverhang: () => lipOverhang(table),
    // Diagnostic switches for shadow artefacts; capture code never calls these.
    setShadowRoles({ plinthReceive = false, plinthCast = true, groundReceive = true, blockReceive = true, blockCast = true, keyShadow = true, mapSize = 2048, normalBias = .08, bias = -.0004, radius = 7 } = {}) {
      key.castShadow = keyShadow;
      if (key.shadow.mapSize.x !== mapSize) { key.shadow.mapSize.set(mapSize, mapSize); key.shadow.map?.dispose(); key.shadow.map = null; }
      Object.assign(key.shadow, { normalBias, bias, radius });
      for (const object of scene.children) {
        if (['cutface', 'top', 'floor', 'feature'].includes(object.userData.sectionRole) && object.isMesh) {
          object.receiveShadow = blockReceive; object.castShadow = blockCast; object.material.needsUpdate = true;
        }
        if (object.userData.sectionRole === 'plinth') { object.receiveShadow = plinthReceive; object.castShadow = plinthCast; object.material.needsUpdate = true; }
        if (object.userData.sectionRole === 'ground') { object.receiveShadow = groundReceive; object.material.needsUpdate = true; }
      }
    },
    // Under VSM three.js also draws receive-only meshes into the shadow map, so castShadow alone cannot remove a group
    // from it; the shadow camera's layer mask can. Groups whose name matches an excluded pattern leave the map.
    setShadowExclusions(patterns = []) {
      const expressions = patterns.map(pattern => new RegExp(pattern));
      for (const object of scene.children) if (object.isMesh) {
        const excluded = expressions.some(expression => expression.test(object.userData.group ?? ''));
        if (excluded) object.layers.disable(1); else object.layers.enable(1);
      }
      if (patterns.length) key.shadow.camera.layers.set(1); else key.shadow.camera.layers.set(0);
      return scene.children.filter(object => object.isMesh && !object.layers.isEnabled(1)).map(object => object.userData.group);
    },
    // Flat colour per mesh group (back faces at half brightness) for locating surfaces in a frame; returns a PNG and the key.
    groupMask(mode = 'groups') {
      const previous = scene.children.map(object => ({ object, visible: object.visible, material: object.material }));
      const restoreRenderer = rendererState(), materials = [], key = {};
      try {
        for (const { object } of previous) {
          if (!object.isMesh || object.userData.sectionRole === 'ground') { object.visible = false; continue; }
          const group = object.userData.group ?? 'none';
          if (!key[group]) {
            let h = 2166136261; for (const ch of group) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
            key[group] = '#' + (((h >>> 0) & 0xffffff) | 0x404040).toString(16).padStart(6, '0');
          }
          const mat = mode === 'normals' ? new THREE.MeshNormalMaterial({ side: THREE.DoubleSide }) : new THREE.MeshBasicMaterial({ color: key[group], side: THREE.DoubleSide });
          if (mode !== 'normals') mat.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nif(!gl_FrontFacing) diffuseColor.rgb*=.5;'); };
          materials.push(mat); object.material = mat;
        }
        scene.background = new THREE.Color(0); renderer.toneMapping = THREE.NoToneMapping; renderer.shadowMap.enabled = false;
        renderer.autoClear = true; renderer.render(scene, camera);
        return { png: canvas.toDataURL('image/png').split(',')[1], key };
      } finally {
        for (const item of previous) { item.object.visible = item.visible; item.object.material = item.material; }
        restoreRenderer();
        for (const mat of materials) mat.dispose(); render(lastYear, lastSeconds);
      }
    },
    setShadowSides(entries = []) {
      const sides = { front: THREE.FrontSide, back: THREE.BackSide, double: THREE.DoubleSide, material: null };
      for (const object of scene.children) if (object.isMesh) for (const [pattern, side] of entries)
        if (new RegExp(pattern).test(object.userData.group ?? '')) object.material.shadowSide = sides[side];
    },
    shadowGroups: () => scene.children.filter(object => object.isMesh).map(object => ({ group: object.userData.group, cast: object.castShadow,
      receive: object.receiveShadow, side: object.material.side, shadowSide: object.material.shadowSide })),
    setVariant() { throw new Error('Look-dev has no reconstruction gizmos'); } };
}
