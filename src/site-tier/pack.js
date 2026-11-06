// Site tier asset packs: one deflate-raw file per pack holding a JSON header and typed-array blobs. Shared by the Node
// builder (scripts/site-tier/build-assets.mjs) and the browser loader (assets.js). Layout after inflating:
// 'STP1', uint32 header length, UTF-8 JSON header, zero padding to 4 bytes, then the blobs at the header's offsets.
import * as THREE from 'three';

const MAGIC = 'STP1';
const toSrgb = c => c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055;
const toLinear = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const SRGB8_LUT = Float32Array.from({ length: 256 }, (_, i) => toLinear(i / 255));
const TYPES = { f32: Float32Array, u32: Uint32Array, i32: Int32Array, u16: Uint16Array, i16: Int16Array, i8: Int8Array, u8: Uint8Array };

// Attribute codecs. Positions and feature finish (category, height): uint16 inside the attribute's own box (decoded
// error at most half a step per component; finish categories 0-3 decode exactly since 65535 = 3 x 21845).
// exactPositions keeps float32 positions (meshes that share border vertices with other meshes, so seams stay closed).
// Normals: int8 per component. Colours (linear): 8-bit sRGB-encoded per component, so dark tones keep their steps.
// uv inside [0, 1]: uint16 (atlas pages are at most 16384 texels, so the step is under a quarter texel).
// Anything else: float32 as is.
function encodeAttribute(name, attribute, exactPositions) {
  const n = attribute.count, k = attribute.itemSize, src = attribute.array;
  if ((name === 'position' && !exactPositions) || name === 'featureFinish') {
    const min = Array(k).fill(Infinity), max = Array(k).fill(-Infinity);
    for (let i = 0; i < n * k; i++) { const a = i % k; if (src[i] < min[a]) min[a] = src[i]; if (src[i] > max[a]) max[a] = src[i]; }
    const out = new Uint16Array(n * k);
    for (let i = 0; i < n * k; i++) { const a = i % k, span = max[a] - min[a]; out[i] = span > 0 ? Math.round((src[i] - min[a]) / span * 65535) : 0; }
    return { codec: 'u16box', itemSize: k, count: n, box: [min, max], data: out };
  }
  if (name === 'normal') return { codec: 'i8n', itemSize: k, count: n, data: Int8Array.from(src, v => Math.round(Math.max(-1, Math.min(1, v)) * 127)) };
  if (name === 'uv' && src.every(v => v >= 0 && v <= 1)) return { codec: 'u16n', itemSize: k, count: n, data: Uint16Array.from(src, v => Math.round(v * 65535)) };
  if (name === 'color') return { codec: 'srgb8', itemSize: k, count: n, data: Uint8Array.from(src, v => Math.round(toSrgb(Math.max(0, Math.min(1, v))) * 255)) };
  return { codec: 'f32', itemSize: k, count: n, data: Float32Array.from(src) };
}
function decodeAttribute(a, data) {
  if (a.codec === 'u16box') {
    const out = new Float32Array(data.length), [min, max] = a.box;
    for (let i = 0; i < data.length; i++) { const c = i % a.itemSize; out[i] = min[c] + data[i] / 65535 * (max[c] - min[c]); }
    return new THREE.BufferAttribute(out, a.itemSize);
  }
  // Plain loops: Float32Array.from with a map callback measured ~90 ms each for the core's normals and colours.
  if (a.codec === 'i8n') { const out = new Float32Array(data.length); for (let i = 0; i < data.length; i++) out[i] = data[i] / 127; return new THREE.BufferAttribute(out, a.itemSize); }
  if (a.codec === 'srgb8') { const out = new Float32Array(data.length); for (let i = 0; i < data.length; i++) out[i] = SRGB8_LUT[data[i]]; return new THREE.BufferAttribute(out, a.itemSize); }
  if (a.codec === 'u16n') { const out = new Float32Array(data.length); for (let i = 0; i < data.length; i++) out[i] = data[i] / 65535; return new THREE.BufferAttribute(out, a.itemSize); }
  return new THREE.BufferAttribute(data, a.itemSize);
}

// Collects geometries and raw arrays; bytes() returns the uncompressed pack.
export function createPackWriter(meta = {}) {
  const blobs = [], geometries = [], arrays = {};
  let offset = 0;
  const blob = data => { const at = offset, bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength); blobs.push([at, bytes]); offset += Math.ceil(bytes.byteLength / 4) * 4; return at; };
  return {
    geometry(id, geometry, extra = {}, { exactPositions = false } = {}) {
      const record = { id, attributes: {}, ...extra };
      for (const [name, attribute] of Object.entries(geometry.attributes)) {
        const { data, ...rest } = encodeAttribute(name, attribute, exactPositions);
        record.attributes[name] = { ...rest, type: Object.keys(TYPES).find(t => data instanceof TYPES[t]), offset: blob(data), length: data.length };
      }
      if (geometry.index) {
        const src = geometry.index.array, max = src.reduce((m, v) => v > m ? v : m, 0), data = max > 65535 ? Uint32Array.from(src) : Uint16Array.from(src);
        record.index = { type: max > 65535 ? 'u32' : 'u16', offset: blob(data), length: data.length };
      }
      geometries.push(record);
    },
    array(name, data, extra = {}) {
      const type = Object.keys(TYPES).find(t => data instanceof TYPES[t]);
      if (!type) throw new Error(`site-tier pack: array ${name} has no codec type`);
      arrays[name] = { type, offset: blob(data), length: data.length, ...extra };
    },
    bytes() {
      const header = new TextEncoder().encode(JSON.stringify({ format: MAGIC, meta, geometries, arrays }));
      const start = Math.ceil((8 + header.byteLength) / 4) * 4, out = new Uint8Array(start + offset);
      out.set(new TextEncoder().encode(MAGIC), 0); new DataView(out.buffer).setUint32(4, header.byteLength, true); out.set(header, 8);
      for (const [at, bytes] of blobs) out.set(bytes, start + at);
      return out;
    }
  };
}

// Parses an uncompressed pack: { meta, geometries: Map(id -> { geometry, record }), arrays: { name: typed array } }.
// profile (optional object) accumulates ms per stage: header, decode (per codec, and index), bounds, arrays.
const clock = () => globalThis.performance?.now() ?? Date.now();
export function readPack(bytes, profile = null) {
  const add = profile ? (key, t) => { const n = clock(); profile[key] = (profile[key] ?? 0) + n - t; return n; } : (key, t) => t;
  let t = profile ? clock() : 0;
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (new TextDecoder().decode(u8.subarray(0, 4)) !== MAGIC) throw new Error('site-tier pack: bad magic');
  const length = new DataView(u8.buffer, u8.byteOffset).getUint32(4, true), header = JSON.parse(new TextDecoder().decode(u8.subarray(8, 8 + length)));
  const start = Math.ceil((8 + length) / 4) * 4, base = u8.byteOffset + start;
  // Blobs are 4-byte aligned in the pack; copy when the buffer itself is not.
  const view = (type, offset, n) => { const T = TYPES[type], at = base + offset; return at % T.BYTES_PER_ELEMENT === 0 ? new T(u8.buffer, at, n) : new T(u8.slice(start + offset, start + offset + n * T.BYTES_PER_ELEMENT).buffer); };
  t = add('header', t);
  const geometries = new Map();
  for (const record of header.geometries) {
    const g = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(record.attributes)) { g.setAttribute(name, decodeAttribute(a, view(a.type, a.offset, a.length))); t = add(`decode:${a.codec}`, t); }
    if (record.index) g.setIndex(new THREE.BufferAttribute(view(record.index.type, record.index.offset, record.index.length), 1));
    t = add('decode:index', t);
    g.computeBoundingBox(); g.computeBoundingSphere();
    t = add('bounds', t);
    geometries.set(record.id, { geometry: g, record });
  }
  const arrays = Object.fromEntries(Object.entries(header.arrays).map(([name, a]) => [name, view(a.type, a.offset, a.length)]));
  add('arrays', t);
  return { meta: header.meta, geometries, arrays, header };
}

// Inflates a deflate-raw pack with the platform DecompressionStream (browsers and Node 18+).
export async function inflatePack(compressed) {
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// Boundary grids: int16 row deltas of (value - lo) / unit, per boundary, rows along x.
export function encodeGrids(stack, unitMetres) {
  let lo = Infinity; for (const g of stack.grids) for (const v of g) if (v < lo) lo = v;
  const q = new Int16Array(stack.nx * stack.nz * stack.grids.length); let at = 0;
  for (const g of stack.grids) for (let iz = 0; iz < stack.nz; iz++) {
    let previous = 0;
    for (let ix = 0; ix < stack.nx; ix++) {
      const v = Math.round((g[iz * stack.nx + ix] - lo) / unitMetres);
      if (v > 65535) throw new Error('boundary range exceeds the int16 delta code');
      q[at++] = v - previous; previous = v;
    }
  }
  return { data: q, meta: { xmin: stack.xmin, zmin: stack.zmin, width: stack.width, length: stack.length, stepMetres: stack.stepMetres, nx: stack.nx, nz: stack.nz, count: stack.grids.length, lo, unitMetres } };
}
export function decodeGrids(data, m) {
  const grids = [], n = m.nx * m.nz; let at = 0;
  for (let j = 0; j < m.count; j++) {
    const g = new Float32Array(n);
    for (let iz = 0; iz < m.nz; iz++) { let v = 0; for (let ix = 0; ix < m.nx; ix++) { v = (v + data[at++]) & 0xffff; g[iz * m.nx + ix] = m.lo + v * m.unitMetres; } }
    grids.push(g);
  }
  return { xmin: m.xmin, zmin: m.zmin, width: m.width, length: m.length, stepMetres: m.stepMetres, nx: m.nx, nz: m.nz, grids };
}
