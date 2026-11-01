import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

export function screenLines(positions, { color = 0x536675, width = 2, opacity = 1, depthFunc = THREE.LessEqualDepth } = {}) {
  const geometry = new LineSegmentsGeometry().setPositions(positions);
  const material = new LineMaterial({
    color, linewidth: width, worldUnits: false, transparent: opacity < 1,
    opacity, depthWrite: false, depthFunc, toneMapped: false
  });
  const lines = new LineSegments2(geometry, material);
  lines.frustumCulled = false;
  return lines;
}
