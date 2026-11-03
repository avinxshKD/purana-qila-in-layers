// Screen angle (1080) of world-horizontal lines on the front face z = 8 and on the side face x = 12 in a given view.
import * as THREE from 'three';
const views = { cut: { target: [7, -7, 7.6], distance: 8.2, elevation: 13, azimuth: 16 }, 'side-square': { target: [12, -3.4, 0], distance: 18, elevation: 0, azimuth: 90 },
  turntable6: { target: [-1.4, -3.85, 0], distance: 74, elevation: 27, azimuth: 35 } };
for (const [name, v] of Object.entries(views)) {
  const camera = new THREE.PerspectiveCamera(25, 16 / 9, .1, 180), t = new THREE.Vector3(...v.target), e = v.elevation * Math.PI / 180, a = v.azimuth * Math.PI / 180;
  camera.position.set(t.x + v.distance * Math.cos(e) * Math.sin(a), t.y + v.distance * Math.sin(e), t.z + v.distance * Math.cos(e) * Math.cos(a));
  camera.lookAt(t); camera.updateMatrixWorld();
  const px = p => { const q = new THREE.Vector3(...p).project(camera); return [(q.x + 1) * 960, (1 - q.y) * 540]; };
  const ang = (p, q) => { const A = px(p), B = px(q); return { from: A.map(Math.round), to: B.map(Math.round), degreesDownRight: +(Math.atan2(B[1] - A[1], B[0] - A[0]) * 180 / Math.PI).toFixed(1) }; };
  const out = {};
  if (name === 'cut') for (const y of [-6, -7, -8]) out[`front z=8 y=${y} x 8..11`] = ang([8, y, 8], [11, y, 8]);
  if (name === 'side-square') for (const y of [-2, -4]) out[`side x=12 y=${y} z 2..-2`] = ang([12, y, 2], [12, y, -2]);
  if (name === 'turntable6') { out['side x=12 y=-3 z 6..-6'] = ang([12, -3, 6], [12, -3, -6]); out['front z=8 y=-3 x -8..8'] = ang([-8, -3, 8], [8, -3, 8]); }
  console.log(name, JSON.stringify(out));
}
