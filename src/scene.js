import * as THREE from 'three';
import { geometry, quad, box, merged, roof } from './geometry.js';
import { mulberry32, modulo } from './rng.js';
import { timeState } from './time.js';

const HALF = 80;
const BAND_Y = [-32, -26, -20, -14, -8, -3, 0];
const BAND_COLORS = [0x56514b, 0x777067, 0x969087, 0x6e6962, 0xa6a096, 0xc0baae];
const matrixObject = new THREE.Object3D();

function edgePoint(side, u, y, outward = 0) {
  if (side === 0) return [u, y, HALF + outward];
  if (side === 1) return [HALF + outward, y, -u];
  if (side === 2) return [-u, y, -HALF - outward];
  return [-HALF - outward, y, u];
}

function boundary(layer, x, z) {
  if (layer === 0 || layer === 6) return BAND_Y[layer];
  return BAND_Y[layer] + 0.55 * Math.sin(x * 0.073 + layer * 1.7)
    + 0.38 * Math.cos(z * 0.09 - layer * 0.8);
}

function bandGeometry(layer) {
  const v = [];
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < 80; i++) {
      const u = -HALF + i * 2, next = u + 2;
      const p = edgePoint(side, u, 0), q = edgePoint(side, next, 0);
      quad(v, edgePoint(side, u, boundary(layer, p[0], p[2])),
        edgePoint(side, next, boundary(layer, q[0], q[2])),
        edgePoint(side, next, boundary(layer + 1, q[0], q[2])),
        edgePoint(side, u, boundary(layer + 1, p[0], p[2])));
    }
  }
  return geometry(v);
}

function clippedPolygon(poly) {
  let out = poly;
  for (const [axis, sign] of [[0, 1], [0, -1], [2, 1], [2, -1]]) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i], b = input[(i + 1) % input.length];
      const da = HALF - a[axis] * sign, db = HALF - b[axis] * sign;
      if (da >= 0) out.push(a);
      if ((da < 0) !== (db < 0)) {
        const t = da / (da - db);
        out.push(a.map((v, j) => v + (b[j] - v) * t));
      }
    }
  }
  return out;
}

function buriedRing() {
  const v = [], inner = [96, 81], outer = [100, 85], bottom = -22, top = -11;
  const push = poly => {
    const p = clippedPolygon(poly);
    for (let i = 1; i < p.length - 1; i++) v.push(...p[0], ...p[i], ...p[i + 1]);
  };
  const at = (r, a, y) => [r[0] * Math.cos(a), y, r[1] * Math.sin(a)];
  for (let i = 0; i < 256; i++) {
    const a = i / 256 * Math.PI * 2, b = (i + 1) / 256 * Math.PI * 2;
    push([at(outer, a, bottom), at(outer, b, bottom), at(outer, b, top), at(outer, a, top)]);
    push([at(inner, b, bottom), at(inner, a, bottom), at(inner, a, top), at(inner, b, top)]);
    push([at(inner, a, top), at(outer, a, top), at(outer, b, top), at(inner, b, top)]);
  }
  // Expose the solid wall section where each clipping plane crosses the ellipse.
  for (let side = 0; side < 4; side++) {
    const fixedAxis = side % 2 === 0 ? 1 : 0, varyingAxis = 1 - fixedAxis;
    const cut = r => r[varyingAxis] * Math.sqrt(1 - (HALF / r[fixedAxis]) ** 2);
    const lo = cut(inner), hi = cut(outer);
    for (const sign of [-1, 1]) {
      const a = sign > 0 ? lo : -hi, b = sign > 0 ? hi : -lo;
      quad(v, edgePoint(side, a, bottom, 0.025), edgePoint(side, b, bottom, 0.025),
        edgePoint(side, b, top, 0.025), edgePoint(side, a, top, 0.025));
    }
  }
  return geometry(v);
}

function rectangle(distance, half) {
  const edge = half * 2, p = modulo(distance, edge * 4);
  if (p < edge) return [-half + p, -half, Math.PI / 2];
  if (p < 2 * edge) return [half, -half + p - edge, 0];
  if (p < 3 * edge) return [half - (p - 2 * edge), half, -Math.PI / 2];
  return [-half, half - (p - 3 * edge), Math.PI];
}

function instance(mesh, i, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  matrixObject.position.set(x, y, z);
  matrixObject.rotation.set(rx, ry, rz);
  matrixObject.scale.set(sx, sy, sz);
  matrixObject.updateMatrix();
  mesh.setMatrixAt(i, matrixObject.matrix);
}

export function createWorld(canvas, { width = 1920, height = 1080, antialias = true, preserve = true, load = 1 } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias, alpha: false, preserveDrawingBuffer: preserve, powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.info.autoReset = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e5df);
  const span = 237;
  const camera = new THREE.OrthographicCamera(-span * width / height / 2, span * width / height / 2, span / 2, -span / 2, 1, 1000);
  camera.position.set(220, 185, 250);
  camera.lookAt(0, -5, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x827565, 2.0));
  const sun = new THREE.DirectionalLight(0xfff6e6, 3.2);
  sun.position.set(-100, 180, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 1, far: 450 });
  sun.shadow.normalBias = 0.12;
  sun.shadow.bias = -0.001;
  sun.shadow.radius = 3;
  sun.shadow.blurSamples = 12;
  scene.add(sun);
  const materials = [];
  function clay(color, side = THREE.FrontSide) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0, side });
    materials.push(m);
    return m;
  }
  const bodyMat = clay(0xaba69e), roofMat = clay(0x88847c), darkMat = clay(0x575751);
  function add(g, material, { cast = true, receive = true, parent = scene } = {}) {
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  }
  const bands = BAND_COLORS.map((c, i) => add(bandGeometry(i), clay(c), { cast: false }));
  add(buriedRing(), clay(0xd8d1c3, THREE.DoubleSide), { cast: false });
  const ground = add(box(160, 0.2, 160, 0, -0.1, 0), clay(0xbab6aa));
  const roads = new THREE.Group();
  scene.add(roads);
  add(merged([
    box(128, 0.04, 7, 0, 0.04, -61), box(128, 0.04, 7, 0, 0.04, 61),
    box(7, 0.04, 115, -61, 0.04, 0), box(7, 0.04, 115, 61, 0.04, 0),
    box(7, 0.04, 115, 0, 0.04, 0), box(115, 0.04, 7, 0, 0.04, 0)
  ]), clay(0x9f9c93), { parent: roads, cast: false });
  const staticGroup = new THREE.Group();
  scene.add(staticGroup);
  const bodies = [], roofs = [];
  for (const [x, z, w, d, h] of [
    [-34, -34, 22, 20, 10], [30, -33, 24, 16, 14], [-28, 47, 19, 12, 7],
    [-18, -48, 10, 8, 5], [45, -44, 10, 10, 7], [-46, 15, 9, 14, 6]
  ]) {
    bodies.push(box(w, h, d, x, h / 2, z));
    roofs.push(roof(w + 1, 3, d + 1, x, h, z));
  }
  add(merged(bodies), bodyMat, { parent: staticGroup });
  add(merged(roofs), roofMat, { parent: staticGroup });
  const construction = new THREE.Group();
  construction.position.set(31, 0, 25);
  scene.add(construction);
  add(box(22, 20, 17, 0, 10, 0), bodyMat, { parent: construction });
  add(roof(23, 4, 18, 0, 20, 0), roofMat, { parent: construction });
  add(box(25, 0.7, 20, 31, 0.35, 25), darkMat);
  const scaffoldParts = [];
  for (const x of [17, 45]) {
    for (const z of [14, 24, 36]) scaffoldParts.push(box(0.3, 25, 0.3, x, 12.5, z));
  }
  for (const y of [4, 9, 14, 19, 24]) {
    for (const z of [14, 36]) scaffoldParts.push(box(28, 0.25, 0.25, 31, y, z));
    for (const x of [17, 45]) scaffoldParts.push(box(0.25, 0.25, 22, x, y, 25));
  }
  const scaffold = add(merged(scaffoldParts), darkMat);
  const rng = mulberry32(0x719baac5);
  const pieces = [];
  for (let x = 0; x < 6; x++) for (let z = 0; z < 4; z++) for (let y = 0; y < 4; y++) {
    pieces.push({
      x: -43 + x * 2.8, y: 1.5 + y * 3, z: 27 + z * 2.8,
      dx: (rng() - 0.5) * 22, dz: (rng() - 0.5) * 22,
      rx: (rng() - 0.5) * 4, ry: (rng() - 0.5) * 4, rz: (rng() - 0.5) * 4,
      delay: rng() * 0.12
    });
  }
  function instanced(g, material, count) {
    const mesh = new THREE.InstancedMesh(g, material, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  }
  const rubble = instanced(new THREE.BoxGeometry(2.75, 2.95, 2.75), bodyMat, pieces.length);
  const people = instanced(new THREE.CapsuleGeometry(0.28, 0.9, 2, 6), darkMat, 200);
  const peopleData = Array.from({ length: 200 }, (_, i) => ({
    phase: rng() * 544, speed: 0.8 + rng() * 0.6, half: 66.5 + (i % 2) * 2,
    height: 0.88 + rng() * 0.24, direction: i % 2 ? 1 : -1
  }));
  const vehicles = instanced(new THREE.BoxGeometry(1.8, 1.6, 4), roofMat, 20);
  const vehicleData = Array.from({ length: 20 }, (_, i) => ({
    phase: i * 24.4 + rng() * 7, speed: 5 + rng() * 2, direction: i % 2 ? 1 : -1
  }));
  const extras = [];
  // Stress tiers duplicate real draw and triangle workloads, not an inferred budget.
  for (let n = 1; n < load; n++) {
    for (const source of [people, vehicles, rubble]) {
      const clone = instanced(source.geometry, source.material, source.count);
      extras.push({ clone, source });
    }
  }
  let lastState;
  function setTime(year, seconds) {
    const state = timeState(year, seconds);
    const soil = state.soilHeight;
    ground.position.y = soil;
    roads.position.y = soil;
    staticGroup.position.y = soil;
    const topPosition = bands[5].geometry.attributes.position;
    for (let i = 0; i < topPosition.count; i++) {
      if (topPosition.array[i * 3 + 1] >= -0.01) topPosition.array[i * 3 + 1] = soil;
    }
    topPosition.needsUpdate = true;
    construction.scale.y = Math.max(0.0001, state.construction);
    scaffold.visible = state.scaffold;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i], t = Math.max(0, (state.collapse - p.delay) / (1 - p.delay));
      const arc = Math.sin(t * Math.PI) * 5;
      instance(rubble, i, p.x + p.dx * t, p.y * (1 - t) + 1.6 * t + arc,
        p.z + p.dz * t, p.rx * t, p.ry * t, p.rz * t);
    }
    rubble.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < peopleData.length; i++) {
      const p = peopleData[i];
      const [x, z, heading] = rectangle(p.phase + seconds * p.speed * p.direction, p.half);
      const gait = Math.sin(seconds * 8 + p.phase);
      instance(people, i, x, soil + 0.73 * p.height + Math.abs(gait) * 0.035, z,
        gait * 0.045, heading + (p.direction < 0 ? Math.PI : 0), 0, 1, p.height, 1);
    }
    people.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < vehicleData.length; i++) {
      const p = vehicleData[i], half = p.direction > 0 ? 59.3 : 62.2;
      const [x, z, heading] = rectangle(p.phase + seconds * p.speed * p.direction, half);
      instance(vehicles, i, x, soil + 0.87, z, 0, heading);
    }
    vehicles.instanceMatrix.needsUpdate = true;
    for (const { clone, source } of extras) {
      clone.instanceMatrix.array.set(source.instanceMatrix.array);
      clone.instanceMatrix.needsUpdate = true;
    }
    lastState = state;
    return state;
  }
  function info() {
    return {
      calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
      programs: renderer.info.programs.length
    };
  }
  function render(year, seconds, { shadows = true } = {}) {
    setTime(year, seconds);
    renderer.shadowMap.enabled = shadows;
    renderer.info.reset();
    renderer.render(scene, camera);
    return info();
  }
  function readPixels() {
    const gl = renderer.getContext(), bytes = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    return bytes;
  }
  function device() {
    const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      threeRevision: THREE.REVISION,
      webgl: gl.getParameter(gl.VERSION),
      renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      samples: gl.getParameter(gl.SAMPLES),
      sampleBuffers: gl.getParameter(gl.SAMPLE_BUFFERS),
      maxSamples: gl.getParameter(gl.MAX_SAMPLES),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      attributes: gl.getContextAttributes(),
      width, height, pixelRatio: renderer.getPixelRatio(),
      colorManagement: THREE.ColorManagement.enabled,
      outputColorSpace: renderer.outputColorSpace, toneMapping: renderer.toneMapping,
      shadowMapType: renderer.shadowMap.type, shadowMapSize: sun.shadow.mapSize.toArray(),
      counts: { people: people.count, vehicles: vehicles.count, rubble: rubble.count, soilBands: bands.length, load }
    };
  }
  setTime(32, 4);
  return { renderer, scene, camera, render, readPixels, info, device, get state() { return lastState; } };
}
