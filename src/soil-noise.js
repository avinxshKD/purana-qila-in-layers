// Seeded gradient noise, used only for schematic surface relief and erosion.
const mix = (a, b, f) => a + (b - a) * f;
export function gradientNoise(x, y = 0, z = 0, seed = 411) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), p = [x - ix, y - iy, z - iz];
  const fade = p.map(v => v ** 3 * (v * (v * 6 - 15) + 10));
  const dot = (a, b, c) => {
    let h = Math.imul(ix + a, 374761393) ^ Math.imul(iy + b, 668265263) ^ Math.imul(iz + c, 2147483647) ^ seed;
    h = Math.imul(h ^ h >>> 13, 1274126177); h ^= h >>> 16;
    const angle = (h >>> 0) / 4294967296 * Math.PI * 2, height = ((h >>> 8) & 65535) / 32767.5 - 1;
    const radius = Math.sqrt(1 - height * height);
    return radius * Math.cos(angle) * (p[0] - a) + height * (p[1] - b) + radius * Math.sin(angle) * (p[2] - c);
  };
  return mix(mix(mix(dot(0, 0, 0), dot(1, 0, 0), fade[0]), mix(dot(0, 1, 0), dot(1, 1, 0), fade[0]), fade[1]),
    mix(mix(dot(0, 0, 1), dot(1, 0, 1), fade[0]), mix(dot(0, 1, 1), dot(1, 1, 1), fade[0]), fade[1]), fade[2]) * 1.7;
}
