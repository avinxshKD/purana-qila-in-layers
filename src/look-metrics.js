import * as THREE from 'three';
import { surfaceHeight, earthPoint, cutOnFace } from './layers.js';
import { SOIL_OCTAVES } from './strata-surface.js';

const project = (point, camera) => {
  const p = new THREE.Vector3(...point).project(camera);
  return { x: (p.x + 1) * 960, y: (1 - p.y) * 540, z: p.z };
};
function visible(point, camera, table) {
  const direction = camera.position.clone().sub(new THREE.Vector3(...point)), length = direction.length();
  direction.normalize();
  const voids = table.cuts.filter(cut => cut.id.startsWith('square-') || cut.id === 'well-pit');
  const shaft = table.proportions.shaft, ringTop = surfaceHeight(shaft.x, shaft.z) - shaft.localTopDepth;
  for (let distance = .05; distance < length; distance += .08) {
    const x = point[0] + direction.x * distance, y = point[1] + direction.y * distance, z = point[2] + direction.z * distance;
    if (y < ringTop + .02 && y > ringTop - shaft.span - .02 && Math.hypot(x - shaft.x, z - shaft.z) < .365) return false;
    if (x < -12 || x > 12 || z < -8 || z > 8 || y < -table.proportions.bottomDepth) continue;
    if (y >= surfaceHeight(x, z) - .004) continue;
    if (!voids.some(cut => x > cut.xmin - .003 && x < cut.xmax + .003 && z > cut.zmin - .003 && z < cut.zmax + .003
      && -y > cut.topDepth - .003 && -y < cut.bottomDepth + .003)) return false;
  }
  return true;
}
export function seamCandidates(table, camera, exclusions = []) {
  const groups = [];
  for (const face of table.faces) {
    const entries = [], normal = new THREE.Vector3(-(face.to[1] - face.from[1]), 0, face.to[0] - face.from[0]).multiplyScalar(face.inward ? -1 : 1);
    const center = new THREE.Vector3((face.from[0] + face.to[0]) / 2, -3, (face.from[1] + face.to[1]) / 2);
    if (normal.dot(camera.position.clone().sub(center)) <= 0) continue;
    const cuts = table.cuts.map(cut => cutOnFace(cut, face)).filter(Boolean);
    for (let index = 1; index < table.layers.length; index++) {
      const samples = table.layers[index].faces[face.id];
      for (let j = 1; j < 400; j++) {
        const t = j / 400, at = Math.min(samples.length - 2, Math.floor(t * (samples.length - 1))), f = t * (samples.length - 1) - at;
        const depth = samples[at].topDepth + (samples[at + 1].topDepth - samples[at].topDepth) * f;
        if (depth > face.floorDepth - .10 || depth < (face.topDepth ?? -Infinity) + .10) continue;
        if (cuts.some(cut => t > cut.xmin - .008 && t < cut.xmax + .008 && depth > cut.ymin - .1 && depth < cut.ymax + .1)) continue;
        const x = face.from[0] + t * (face.to[0] - face.from[0]), z = face.from[1] + t * (face.to[1] - face.from[1]);
        const world = earthPoint(x, -depth, z), p = project(world, camera), upper = project([world[0], world[1] + .1, world[2]], camera);
        if (p.x < 12 || p.x > 1908 || p.y < 12 || p.y > 1068 || p.z < -1 || p.z > 1) continue;
        if (exclusions.some(b => p.x > b.x - 28 && p.x < b.x + b.width + 28 && p.y > b.y - 28 && p.y < b.y + b.height + 28)) continue;
        if (!visible(world, camera, table)) continue;
        const length = Math.hypot(upper.x - p.x, upper.y - p.y);
        const offset = .6 / length, worldUpper = [world[0], world[1] + offset, world[2]], worldLower = [world[0], world[1] - offset, world[2]];
        if (!visible(worldUpper, camera, table) || !visible(worldLower, camera, table)) continue;
        const upperSample = project(worldUpper, camera), lowerSample = project(worldLower, camera);
        entries.push({ face: face.id, boundary: index, world, x: p.x, y: p.y, dx: (upper.x - p.x) / length, dy: (upper.y - p.y) / length,
          upper: { x: upperSample.x, y: upperSample.y }, lower: { x: lowerSample.x, y: lowerSample.y } });
      }
    }
    if (entries.length) groups.push(entries);
  }
  const interleaved = [];
  for (let j = 0; j < Math.max(0, ...groups.map(group => group.length)); j++) for (const group of groups) if (group[j]) interleaved.push(group[j]);
  if (interleaved.length < 50) throw new Error(`Only ${interleaved.length} geometrically visible seam candidates`);
  return { points: Array.from({ length: 50 }, (_, i) => interleaved[Math.floor((i + .5) / 50 * interleaved.length)]),
    available: interleaved.length, method: '50 deterministic evenly selected boundary points, interleaved across facing planes; cuts/HUD excluded; centre and ±6px neighbours pass 8cm solid/void ray-step visibility including the column; projected into final 1920×1080 coordinates.' };
}
function interpolate(samples, t) {
  const at = Math.min(samples.length - 2, Math.floor(t * (samples.length - 1))), f = t * (samples.length - 1) - at;
  return [samples[at].topDepth + (samples[at + 1].topDepth - samples[at].topDepth) * f,
    samples[at].bottomDepth + (samples[at + 1].bottomDepth - samples[at].bottomDepth) * f];
}
// Three 40×20 final-1080 cells per band on the exposed front face, ≥3 px inside the band, clear of cuts, lenses,
// the lime horizon, brick walls and HUD, with every corner passing the solid/void visibility test.
export function bandCells(table, camera, exclusions = [], perBand = 3, { width = 40, height = 20, faceId = 'outer-0' } = {}) {
  const face = table.faces.find(item => item.id === faceId), cuts = table.cuts.map(cut => cutOnFace(cut, face)).filter(Boolean);
  const lime = table.proportions.features.find(feature => feature.material === 'lime');
  const bricks = table.proportions.features.filter(feature => feature.material === 'brick');
  const lenses = table.layers.flatMap(layer => layer.lenses.filter(lens => lens.faceId === face.id));
  const steps = 2400, bands = [], faceLength = Math.hypot(face.to[0] - face.from[0], face.to[1] - face.from[1]);
  for (const [index, layer] of table.layers.entries()) {
    const columns = Array.from({ length: steps + 1 }, (_, j) => {
      const t = j / steps, x = face.from[0] + (face.to[0] - face.from[0]) * t, z = face.from[1] + (face.to[1] - face.from[1]) * t;
      const [rawTop, rawBottom] = interpolate(layer.faces[face.id], t);
      const top = Math.max(rawTop, face.topDepth ?? -Infinity), bottom = Math.min(rawBottom, face.floorDepth);
      const a = project(earthPoint(x, -top, z), camera), b = project(earthPoint(x, -bottom, z), camera);
      return { t, x, z, top, bottom, sx: (a.x + b.x) / 2, syTop: a.y, syBottom: b.y };
    });
    const candidates = [];
    for (let j = 0; j <= steps; j += 6) {
      const c = columns[j], window = columns.filter(column => Math.abs(column.sx - c.sx) <= width / 2 + 3);
      if (c.sx < width / 2 + 10 || c.sx > 1910 - width / 2 || window.length < 3) continue;
      if (window.some(column => column.bottom - column.top < .005)) continue;
      const top = Math.max(...window.map(column => column.syTop)) + 3, bottom = Math.min(...window.map(column => column.syBottom)) - 3;
      if (bottom - top < height) continue;
      if (Math.min(...window.map(column => column.sx)) > c.sx - width / 2 + 1 || Math.max(...window.map(column => column.sx)) < c.sx + width / 2 - 1) continue;
      const margin = height >= 20 ? 1 : .4;
      const y = Math.round((top + bottom) / 2 - height / 2), x = Math.round(c.sx - width / 2), fraction = (y - c.syTop) / (c.syBottom - c.syTop);
      const depthAt = py => c.top + (c.bottom - c.top) * (py - c.syTop) / (c.syBottom - c.syTop);
      const dTop = depthAt(y - 3), dBottom = depthAt(y + height + 3), tMin = Math.min(...window.map(w => w.t)), tMax = Math.max(...window.map(w => w.t));
      if (y < 12 || y + height > 1068) continue;
      if (cuts.some(cut => tMax > cut.xmin - .004 && tMin < cut.xmax + .004 && dBottom > cut.ymin - .05 * margin && dTop < cut.ymax + .05 * margin)) continue;
      if (lenses.some(lens => Math.abs((tMin + tMax) / 2 - lens.centerT) * faceLength < lens.radiusMetres + .3 * margin)) continue;
      if (lime && dTop < lime.bottomDepth + .12 * margin && dBottom > lime.topDepth - .12 * margin && c.x > lime.xmin - .2 && c.x < lime.xmax + .2) continue;
      if (bricks.some(brick => c.x > brick.xmin - .4 && c.x < brick.xmax + .4 && dBottom > brick.topDepth - .3 && dTop < brick.bottomDepth + .3)) continue;
      if (exclusions.some(e => x + width > e.x - 6 && x < e.x + e.width + 6 && y + height > e.y - 6 && y < e.y + e.height + 6)) continue;
      const corners = [[0, 0], [1, 0], [0, 1], [1, 1], [.5, .5]].map(([u, v]) => {
        const column = columns.reduce((best, item) => Math.abs(item.sx - (x + width * u)) < Math.abs(best.sx - (x + width * u)) ? item : best, c);
        const depth = column.top + (column.bottom - column.top) * (y + height * v - column.syTop) / (column.syBottom - column.syTop);
        return earthPoint(column.x, -depth, column.z);
      });
      if (!corners.every(corner => visible(corner, camera, table))) continue;
      candidates.push({ x, y, width, height, t: c.t, depthMetres: [dTop + 0, dBottom], fraction });
    }
    const chosen = [];
    for (const q of perBand === 3 ? [.2, .5, .8] : Array.from({ length: perBand }, (_, i) => (i + .5) / perBand)) {
      const pick = candidates[Math.min(candidates.length - 1, Math.floor(q * candidates.length))];
      if (pick && !chosen.some(item => Math.abs(item.x - pick.x) < width + 20)) chosen.push(pick);
    }
    const thickness = columns.filter(column => column.sx > 0 && column.sx < 1920).map(column => column.syBottom - column.syTop).sort((p, q) => p - q);
    bands.push({ band: index + 1, cells: chosen, available: candidates.length,
      projectedThicknessPx: thickness.length ? { median: thickness[thickness.length >> 1], max: thickness[thickness.length - 1] } : null,
      reason: candidates.length ? undefined : `band projects thinner than ${height + 6} px or is covered by cuts/features/HUD` });
  }
  return { bands, width, height, faceId, method: `Face ${faceId} sampled at 1/2400; cells ${width}×${height} final-1080 px, ≥3 px inside both boundaries across the cell width; clear of cuts (±0.05 m), lenses (+0.3 m), the lime horizon (±0.12 m), brick walls (±0.3–0.4 m) and HUD (6 px); corners ray-visible; picks at 20/50/80% of candidates.` };
}
// Inclusions whose projected diameter is ≥ minimumPixels at final 1080, per square metre of visible exposed face, per band.
export function inclusionDensity(table, camera, records, minimumPixels = 3, step = .05) {
  const area = new Array(table.layers.length).fill(0), counts = new Array(table.layers.length).fill(0);
  const pixelsPerMetre = point => {
    const a = project(point, camera), b = project([point[0], point[1] + .01, point[2]], camera);
    return Math.hypot(b.x - a.x, b.y - a.y) / .01;
  };
  for (const face of table.faces) {
    const normal = new THREE.Vector3(-(face.to[1] - face.from[1]), 0, face.to[0] - face.from[0]).multiplyScalar(face.inward ? -1 : 1);
    const length = Math.hypot(face.to[0] - face.from[0], face.to[1] - face.from[1]), cuts = table.cuts.map(cut => cutOnFace(cut, face)).filter(Boolean);
    for (let s = step / 2; s < length; s += step) {
      const t = s / length, x = face.from[0] + t * (face.to[0] - face.from[0]), z = face.from[1] + t * (face.to[1] - face.from[1]);
      if (normal.dot(camera.position.clone().sub(new THREE.Vector3(x, -3, z))) <= 0) break;
      const first = project([x, -6, z], camera);
      if (first.x < -400 || first.x > 2320) continue;
      for (const [index, layer] of table.layers.entries()) {
        const [top, bottom] = interpolate(layer.faces[face.id], t);
        for (let depth = Math.max(top, face.topDepth ?? -Infinity) + step / 2; depth < Math.min(bottom, face.floorDepth); depth += step) {
          if (cuts.some(cut => t > cut.xmin && t < cut.xmax && depth > cut.ymin && depth < cut.ymax)) continue;
          const world = earthPoint(x, -depth, z), p = project(world, camera);
          if (p.x < 0 || p.x > 1920 || p.y < 0 || p.y > 1080 || p.z > 1 || !visible(world, camera, table)) continue;
          area[index] += step * step;
        }
      }
    }
  }
  const sizes = [];
  for (const [band, x, y, z, diameter] of records) {
    const p = project([x, y, z], camera);
    if (p.x < 0 || p.x > 1920 || p.y < 0 || p.y > 1080 || p.z > 1) continue;
    const pixels = diameter * pixelsPerMetre([x, y, z]);
    if (pixels < minimumPixels || !visible([x, y, z], camera, table)) continue;
    counts[band]++; sizes.push(pixels);
  }
  return { minimumPixels, bands: table.layers.map((layer, i) => ({ band: i + 1, visibleFaceSquareMetres: area[i], counted: counts[i],
    perSquareMetre: area[i] > .05 ? counts[i] / area[i] : null, generatedDensity: layer.inclusions?.densityPerSquareMetre ?? 0 })),
  method: `Generated inclusion centres projected to final 1080; counted when the vertical projected diameter is ≥${minimumPixels} px and the centre passes the solid/void ray test. Visible face area from a ${step * 100} cm (t, depth) grid with the same tests.` };
}
export function octaveProjection(scene, camera, table) {
  const candidates = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), center = new THREE.Vector3(), projected = new THREE.Vector3();
  for (const object of scene.children) {
    if (!['cutface', 'top'].includes(object.userData.sectionRole)) continue;
    const position = object.geometry.attributes.position;
    for (let i = 0; i < position.count; i += 3) {
      a.fromBufferAttribute(position, i); b.fromBufferAttribute(position, i + 1); c.fromBufferAttribute(position, i + 2);
      center.copy(a).add(b).add(c).multiplyScalar(1 / 3); projected.copy(center).project(camera);
      if (Math.abs(projected.x) > .99 || Math.abs(projected.y) > .99 || Math.abs(projected.z) > 1) continue;
      const distance = center.distanceTo(camera.position);
      if (candidates.length >= 40 && distance >= candidates.at(-1).distance) continue;
      candidates.push({ distance, center: center.toArray(), triangle: [a.toArray(), b.toArray(), c.toArray()], role: object.userData.sectionRole });
      candidates.sort((a, b) => a.distance - b.distance);
      if (candidates.length > 40) candidates.pop();
    }
  }
  const nearest = candidates.find(candidate => visible(candidate.center, camera, table));
  if (!nearest) throw new Error('No nearest visible soil triangle');
  const [wa, wb, wc] = nearest.triangle, pa = project(wa, camera), pb = project(wb, camera), pc = project(wc, camera);
  const sx = pb.x - pa.x, sy = pb.y - pa.y, tx = pc.x - pa.x, ty = pc.y - pa.y, determinant = sx * ty - sy * tx;
  const u = new THREE.Vector3(...wb).sub(new THREE.Vector3(...wa)), v = new THREE.Vector3(...wc).sub(new THREE.Vector3(...wa));
  const dx = u.clone().multiplyScalar(ty).addScaledVector(v, -sy).divideScalar(determinant);
  const dy = v.clone().multiplyScalar(sx).addScaledVector(u, -tx).divideScalar(determinant);
  const footprint = Math.max(dx.length(), dy.length());
  return { nearest: { point: nearest.center, role: nearest.role, cameraDistanceMetres: nearest.distance }, metresPerOutputPixel: footprint,
    octaves: SOIL_OCTAVES.map(octave => {
      const periodPixels1080 = octave.periodMetres / footprint, f = Math.max(0, Math.min(1, (periodPixels1080 - 3.5) / 1.5));
      return { ...octave, periodPixels1080, retainedWeight: f * f * (3 - 2 * f), faded: f === 0 ? 'fully' : f === 1 ? 'no' : 'partly' };
    }), scraping: [.04, .10].map(periodMetres => ({ periodMetres, periodPixels1080: periodMetres / footprint })),
    method: 'World-to-final-1080 triangle Jacobian at the nearest visible soil-triangle centroid; conservative max world-space derivative, matching the shader filter convention.' };
}
