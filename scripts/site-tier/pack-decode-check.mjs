import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { readPack, inflatePack } from '../../src/site-tier/pack.js';
const toLinear = c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const old = (a, data) => a.codec === 'i8n' ? Float32Array.from(data, v => v / 127) : a.codec === 'srgb8' ? (lut => Float32Array.from(data, v => lut[v]))(Float32Array.from({ length: 256 }, (_, i) => toLinear(i / 255))) : a.codec === 'u16n' ? Float32Array.from(data, v => v / 65535) : null;
const base = new URL('../../public/site-tier/', import.meta.url), manifest = JSON.parse(readFileSync(new URL('manifest.json', base)));
for (const name of Object.keys(manifest.packs)) {
  const raw = await inflatePack(readFileSync(new URL(manifest.packs[name].file, base)));
  const t = performance.now(), pack = readPack(raw), ms = performance.now() - t;
  const u8 = raw, len = new DataView(u8.buffer, u8.byteOffset).getUint32(4, true), start = Math.ceil((8 + len) / 4) * 4;
  let checked = 0, bad = 0;
  for (const record of pack.header.geometries) for (const [attr, a] of Object.entries(record.attributes)) {
    if (!['i8n', 'srgb8', 'u16n'].includes(a.codec)) continue;
    const T = { i8: Int8Array, u8: Uint8Array, u16: Uint16Array }[a.type], src = new T(u8.slice(start + a.offset, start + a.offset + a.length * T.BYTES_PER_ELEMENT).buffer);
    const want = old(a, src), got = pack.geometries.get(record.id).geometry.attributes[attr].array;
    checked++; if (want.length !== got.length || !Buffer.from(want.buffer).equals(Buffer.from(got.buffer, got.byteOffset, got.byteLength))) bad++;
  }
  console.log(name, 'parseMs', ms.toFixed(1), 'attributes checked', checked, 'mismatched', bad);
}
