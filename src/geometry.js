import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function geometry(vertices) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(vertices.length / 3 * 2), 2));
  g.computeVertexNormals();
  return g;
}

export function quad(v, a, b, c, d) {
  v.push(...a, ...b, ...c, ...a, ...c, ...d);
}

export function box(w, h, d, x, y, z) {
  const indexed = new THREE.BoxGeometry(w, h, d);
  const result = indexed.toNonIndexed().translate(x, y, z);
  indexed.dispose();
  return result;
}

export function merged(parts) {
  const result = mergeGeometries(parts);
  if (!result) throw new Error('Incompatible placeholder geometry');
  for (const g of parts) g.dispose();
  return result;
}

export function roof(w, h, d, x, y, z) {
  const v = [];
  const a = [x - w / 2, y, z - d / 2], b = [x + w / 2, y, z - d / 2];
  const c = [x, y + h, z - d / 2], e = [x - w / 2, y, z + d / 2];
  const f = [x + w / 2, y, z + d / 2], g = [x, y + h, z + d / 2];
  v.push(...a, ...c, ...b, ...e, ...f, ...g);
  quad(v, a, e, g, c);
  quad(v, c, g, f, b);
  quad(v, a, b, f, e);
  return geometry(v);
}
