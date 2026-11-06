// Site tier fixed soil geometry: the block's fixed top, margin top and outer faces (soil-block.js fixedGeometry, M1)
// packed as lattice indices and rebuilt exactly at load. Every vertex of these meshes lies on the 2.5 cm lattice, so x
// and z come back from their lattice index; the height (the exact uncut ground, or its blend along a coarse edge) ships
// as float32 bits, since recomputing uncutGround costs about 0.8 s of main thread for the top alone (measured in Node,
// on battery). The rebuilt position, normal, eraSampleA/B, eraBlend and index arrays are bit-identical to fixedGeometry's.
// Shared by the Node builder and the browser; imports nothing but three.
import * as THREE from 'three';

// Lattice coordinates exactly as soil-block.js X/Z (correctly rounded decimals of the 25 mm steps).
const coordinate = (i, min) => (i * 25 + min * 1000) / 1000;
const BLEND_FIXED = 255;
// Int32 differences of consecutive values (float32 bit patterns or indices): neighbouring vertices are close, so the
// differences are small and deflate well.
const delta = values => { const out = new Int32Array(values.length); let previous = 0; for (let i = 0; i < values.length; i++) { out[i] = values[i] - previous; previous = values[i]; } return out; };

// geometry: a fixedGeometry mesh. block: { xmin, zmin } of the lattice (excavation.js BLOCK); bottomY: the fixed
// vertices' height. Returns the arrays to pack and their meta; throws if a vertex or sample is off the lattice, a blend
// is not a quarter, or a fixed vertex is not at bottomY.
export function encodeFixedSoil(geometry, block, bottomY) {
  const a = geometry.attributes, p = a.position.array, A = a.eraSampleA.array, B = a.eraSampleB.array, t = a.eraBlend.array, n = t.length;
  const lattice = new Uint16Array(2 * n), blend = new Uint8Array(n), heights = [], pairs = [], pairHeights = [];
  const ix = x => { const i = Math.round((x - block.xmin) / .025); if (Math.fround(coordinate(i, block.xmin)) !== x) throw new Error(`fixed soil: x ${x} off the lattice`); return i; };
  const iz = z => { const i = Math.round((z - block.zmin) / .025); if (Math.fround(coordinate(i, block.zmin)) !== z) throw new Error(`fixed soil: z ${z} off the lattice`); return i; };
  for (let v = 0; v < n; v++) {
    lattice[2 * v] = ix(p[3 * v]); lattice[2 * v + 1] = iz(p[3 * v + 2]);
    if (t[v] < 0) {
      if (p[3 * v + 1] !== Math.fround(bottomY) || A[3 * v] !== p[3 * v] || A[3 * v + 1] !== p[3 * v + 2] || A[3 * v + 2] !== 0) throw new Error(`fixed soil: fixed vertex ${v} not at the block base`);
      blend[v] = BLEND_FIXED; continue;
    }
    const code = Math.round(t[v] * 4);
    if (code / 4 !== t[v]) throw new Error(`fixed soil: blend ${t[v]} not a quarter`);
    blend[v] = code; heights.push(p[3 * v + 1]);
    if (code === 0) {
      if (A[3 * v] !== p[3 * v] || A[3 * v + 1] !== p[3 * v + 2] || A[3 * v + 2] !== p[3 * v + 1] || B.subarray(3 * v, 3 * v + 3).some((b, c) => b !== A[3 * v + c])) throw new Error(`fixed soil: vertex ${v} sample is not its own position`);
      continue;
    }
    pairs.push(v, ix(A[3 * v]), iz(A[3 * v + 1]), ix(B[3 * v]), iz(B[3 * v + 1])); pairHeights.push(A[3 * v + 2], B[3 * v + 2]);
  }
  const normal = Int8Array.from(a.normal.array, x => { const q = Math.round(x * 127); if (q / 127 !== x && Math.fround(q / 127) !== x) throw new Error(`fixed soil: normal ${x} not exact in int8`); return q; });
  return {
    arrays: { lattice, blend, normal, index: delta(geometry.index.array), heights: delta(new Int32Array(Float32Array.from(heights).buffer)), pairs: Uint32Array.from(pairs), pairHeights: Float32Array.from(pairHeights) },
    meta: { vertices: n, index16: geometry.index.array instanceof Uint16Array, block: { xmin: block.xmin, zmin: block.zmin }, bottomY }
  };
}

// Rebuilds the BufferGeometry from the packed arrays: decodeFixedSoil(encodeFixedSoil(g, ...)) equals g bit for bit.
export function decodeFixedSoil(arrays, meta) {
  const steps = decodeFixedSoilSteps(arrays, meta);
  let r; while (!(r = steps.next()).done);
  return r.value;
}
// The same decode as a generator for slicing it across tasks: it yields whenever over() is true (checked every 1024
// elements) and returns the geometry.
function* undeltaSteps(d, out, over) {
  let v = 0;
  for (let i = 0; i < d.length; i++) { v = (v + d[i]) | 0; out[i] = v; if ((i & 1023) === 1023 && over()) yield; }
  return out;
}
export function* decodeFixedSoilSteps({ lattice, blend, normal, index, heights, pairs, pairHeights }, { vertices: n, index16, block, bottomY }, over = () => false) {
  const position = new Float32Array(3 * n), A = new Float32Array(3 * n), B = new Float32Array(3 * n), t = new Float32Array(n);
  const y = new Float32Array((yield* undeltaSteps(heights, new Int32Array(heights.length), over)).buffer);
  const pair = new Map();
  for (let q = 0; q < pairs.length; q += 5) { pair.set(pairs[q], q); if (q % 5120 === 5115 && over()) yield; }
  for (let v = 0, h = 0; v < n; v++) {
    if ((v & 1023) === 1023 && over()) yield;
    const x = coordinate(lattice[2 * v], block.xmin), z = coordinate(lattice[2 * v + 1], block.zmin), code = blend[v], o = 3 * v;
    position[o] = x; position[o + 2] = z;
    if (code === BLEND_FIXED) { position[o + 1] = bottomY; A[o] = B[o] = x; A[o + 1] = B[o + 1] = z; t[v] = -1; continue; }
    const height = y[h++];
    position[o + 1] = height;
    if (code === 0) { A[o] = B[o] = x; A[o + 1] = B[o + 1] = z; A[o + 2] = B[o + 2] = height; continue; }
    const q = pair.get(v), r = 2 * (q / 5);
    t[v] = code / 4;
    A[o] = coordinate(pairs[q + 1], block.xmin); A[o + 1] = coordinate(pairs[q + 2], block.zmin); A[o + 2] = pairHeights[r];
    B[o] = coordinate(pairs[q + 3], block.xmin); B[o + 1] = coordinate(pairs[q + 4], block.zmin); B[o + 2] = pairHeights[r + 1];
  }
  // A plain loop: Float32Array.from with a map callback is much slower (pack.js).
  const normals = new Float32Array(normal.length);
  for (let i = 0; i < normal.length; i++) { normals[i] = normal[i] / 127; if ((i & 1023) === 1023 && over()) yield; }
  const indices = yield* undeltaSteps(index, index16 ? new Uint16Array(index.length) : new Uint32Array(index.length), over);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  g.setAttribute('eraSampleA', new THREE.BufferAttribute(A, 3));
  g.setAttribute('eraSampleB', new THREE.BufferAttribute(B, 3));
  g.setAttribute('eraBlend', new THREE.BufferAttribute(t, 1));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  return g;
}
