import { gradientNoise } from './soil-noise.js';
import { mulberry32 } from './rng.js';

function profile(id, from, to, seed, count) {
  const random = mulberry32(seed), length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  return { id, from, to, length, seed, bites: Array.from({ length: count }, (_, i) => ({
    at: length * ((i + .6 + random() * .3) / count), radius: .20 + random() * .20, depth: .20 + random() * .20
  })) };
}
export const OUTER_EDGES = [
  profile('front', [-12, 8], [12, 8], 5181, 3), profile('right', [12, 8], [12, -8], 5182, 2),
  profile('back', [12, -8], [-12, -8], 5183, 3), profile('left', [-12, -8], [-12, 8], 5184, 2)
];
const LIPS = Array.from({ length: 4 }, (_, i) => {
  const x = -10 + i * 5;
  return [profile(`lip-${i}-left`, [x, 8], [x, 4], 5300 + i * 3, 2),
    profile(`lip-${i}-back`, [x, 4], [x + 4, 4], 5301 + i * 3, 2),
    profile(`lip-${i}-right`, [x + 4, 4], [x + 4, 8], 5302 + i * 3, 2)];
}).flat();
function erosion(edge, along) {
  return .09 + .055 * gradientNoise(along * 2.9, .37, .73, edge.seed)
    + edge.bites.reduce((sum, bite) => sum + bite.depth * Math.exp(-(((along - bite.at) / bite.radius) ** 2)), 0);
}
// Crumbled lip: removal-only notches and facets 2–10 cm along and across the edge, sharp at the lip.
export const LIP_NOTCH = { reachMetres: [.04, .10], depthMetres: [.01, .07], alongPeriodsMetres: [.11, .045, .02] };
function notch(edge, along, distance) {
  const reach = .04 + .06 * (.5 + .5 * gradientNoise(along / .23, .91, .17, edge.seed + 7));
  if (distance >= reach) return 0;
  const bite = Math.max(0, gradientNoise(along / .11, .29, .61, edge.seed + 11)) * .045
    + Math.abs(gradientNoise(along / .045, .53, .37, edge.seed + 13)) * .018 + Math.abs(gradientNoise(along / .02, .71, .83, edge.seed + 17)) * .007;
  const across = 1 - distance / reach;
  return (bite + .004) * across * Math.sqrt(across);
}
export function edgeErosion(x, z) {
  let amount = 0;
  for (const edge of [...OUTER_EDGES, ...LIPS]) {
    const dx = edge.to[0] - edge.from[0], dz = edge.to[1] - edge.from[1];
    const along = ((x - edge.from[0]) * dx + (z - edge.from[1]) * dz) / edge.length;
    if (along < -.2 || along > edge.length + .2) continue;
    const s = Math.max(0, Math.min(edge.length, along));
    const distance = Math.hypot(x - edge.from[0] - dx * s / edge.length, z - edge.from[1] - dz * s / edge.length);
    if (distance >= .35) continue;
    // Concave falloff concentrates loss at the lip (broken edge) instead of a rounded, draped shoulder.
    const f = distance / .35, falloff = (1 - f) ** 2.2;
    amount += erosion(edge, s) * falloff + notch(edge, s, distance);
  }
  return amount;
}
// The same erosion split by edge family: the block's outer edges, and the trench lips (only cut ground has lips).
function erosionOver(edges, x, z) {
  let amount = 0;
  for (const edge of edges) {
    const dx = edge.to[0] - edge.from[0], dz = edge.to[1] - edge.from[1];
    const along = ((x - edge.from[0]) * dx + (z - edge.from[1]) * dz) / edge.length;
    if (along < -.2 || along > edge.length + .2) continue;
    const s = Math.max(0, Math.min(edge.length, along));
    const distance = Math.hypot(x - edge.from[0] - dx * s / edge.length, z - edge.from[1] - dz * s / edge.length);
    if (distance >= .35) continue;
    const f = distance / .35, falloff = (1 - f) ** 2.2;
    amount += erosion(edge, s) * falloff + notch(edge, s, distance);
  }
  return amount;
}
export const outerErosion = (x, z) => erosionOver(OUTER_EDGES, x, z);
// Per-lip contributions [lipIndex, metres]; lip 3i, 3i+1, 3i+2 are the west, back and east lips of trench i.
export function lipErosionParts(x, z) {
  const out = [];
  LIPS.forEach((edge, index) => { const a = erosionOver([edge], x, z); if (a > 0) out.push([index, a]); });
  return out;
}
export const lipErosion = (x, z) => erosionOver(LIPS, x, z);
// Lip break for the era soil block (M2b, M): the same lips and bites, but the loss stays within a narrow strip with the
// crumbled notches, so a 1 m baulk keeps a flat top and a broken edge. The 0.35 m falloff above (kept for the Round 6
// look) rounded both sides of each baulk top into a soft lump.
export const LIP_BREAK = Object.freeze({ reachMetres: .14, baseMetres: .035, noiseMetres: .02, biteScale: .35, falloffPower: 1.6 });
function lipBreak(edge, x, z) {
  const dx = edge.to[0] - edge.from[0], dz = edge.to[1] - edge.from[1];
  const along = ((x - edge.from[0]) * dx + (z - edge.from[1]) * dz) / edge.length;
  if (along < -.2 || along > edge.length + .2) return 0;
  const s = Math.max(0, Math.min(edge.length, along));
  const distance = Math.hypot(x - edge.from[0] - dx * s / edge.length, z - edge.from[1] - dz * s / edge.length), B = LIP_BREAK;
  if (distance >= B.reachMetres) return 0;
  const loss = B.baseMetres + B.noiseMetres * gradientNoise(s * 2.9, .37, .73, edge.seed)
    + B.biteScale * edge.bites.reduce((sum, bite) => sum + bite.depth * Math.exp(-(((s - bite.at) / bite.radius) ** 2)), 0);
  return Math.max(0, loss) * (1 - distance / B.reachMetres) ** B.falloffPower + notch(edge, s, distance);
}
// Per-lip lip-break contributions [lipIndex, metres], indexed as lipErosionParts.
export function lipBreakParts(x, z) {
  const out = [];
  LIPS.forEach((edge, index) => { const a = lipBreak(edge, x, z); if (a > 0) out.push([index, a]); });
  return out;
}
export const LIP_STRIP_METRES = .3;
export function edgeDeviationMetrics(height) {
  return OUTER_EDGES.map(edge => {
    const windows = [];
    for (let start = 0; start <= edge.length - 2; start += .25) {
      const samples = Array.from({ length: 201 }, (_, i) => {
        const t = start + i * .01;
        return { t: i * .01, y: height(edge.from[0] + (edge.to[0] - edge.from[0]) * t / edge.length,
          edge.from[1] + (edge.to[1] - edge.from[1]) * t / edge.length) };
      });
      const mean = samples.reduce((s, p) => s + p.y, 0) / samples.length;
      const slope = samples.reduce((s, p) => s + (p.t - 1) * (p.y - mean), 0) / samples.reduce((s, p) => s + (p.t - 1) ** 2, 0);
      windows.push(Math.sqrt(samples.reduce((s, p) => s + (p.y - mean - slope * (p.t - 1)) ** 2, 0) / samples.length));
    }
    return { edge: edge.id, rmsMetres: { minimum: Math.min(...windows), mean: windows.reduce((a, b) => a + b) / windows.length,
      maximum: Math.max(...windows) }, biteCount: edge.bites.length, bites: edge.bites, windows: windows.length,
    method: '1 cm samples; 2 m least-squares straight-line windows every 0.25 m on the nominal outer edge before trench clipping.' };
  });
}
