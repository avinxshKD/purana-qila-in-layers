import * as THREE from 'three';
import { box } from './geometry.js';
import { screenLines } from './wide-lines.js';

export const GHOST_VARIANTS = Object.freeze([{ id: 'edges', name: 'Wall outlines', opacity: 0 }]);
export function createGhost(choice, height) {
  const group = new THREE.Group(), geometry = box(4, 2.8, 3, 0, 1.4, 0);
  const depth = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide, colorWrite: false, depthWrite: true
  }));
  depth.renderOrder = 2;
  group.add(depth);
  const edges = new THREE.EdgesGeometry(geometry, 25);
  for (const [opacity, depthFunc, order] of [[.3, THREE.GreaterDepth, 4], [1, THREE.LessEqualDepth, 5]]) {
    const lines = screenLines(edges.attributes.position.array, {
      color: 0xb9cbd2, width: 2 * height / 1080, opacity, depthFunc
    });
    Object.assign(lines.material, { transparent: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    lines.renderOrder = order;
    group.add(lines);
  }
  edges.dispose();
  return group;
}
