// Feature layout for the composite section (M0.1). Every position, rotation and override here is a modelling decision
// (M) unless a kit spec field says otherwise; see output/lookdev/modelling/m0.1/. Coordinates: +x east, -z north,
// the front face z = +8 faces south. `centre` is the world [x, z] of the kit's local footprint centre.
export const TRENCHES = Object.freeze([
  { id: 'square-1', xmin: -10, xmax: -6, zmin: 4, zmax: 8 },
  { id: 'square-2', xmin: -5, xmax: -1, zmin: 4, zmax: 8 },
  { id: 'square-3', xmin: 0, xmax: 4, zmin: 4, zmax: 8 },
  { id: 'square-4', xmin: 5, xmax: 9, zmin: 4, zmax: 8 }
].map(Object.freeze));
// Fig.13 placement: true scale, page-up = north (-z), figure-local coordinates shifted by this offset.
export const FIG13_OFFSET = Object.freeze([-2.6, -4.1]);
// rule: 'wall' stands proud of its era top by the exposure rule; 'surface' lies on its host surface; 'find' sits in the
// front-face band of its deposit; 'bed' is a scatter lying along a bed inside its deposit (at FIND_BAND_FRACTION);
// 'opening' is a cut whose opening lies on its host boundary.
// host: 'top' (era top) or 'base' (era base). floorOf: the trench whose floor the feature stands on.
// flush: a feature laid in a cut (the drain) is lowered by its own height, so its top is flush with its host surface.
// channel: an open channel along the kit's local x axis; between its walls the host is cut, without feather, down to
// floorMetres in kit-local y, out to halfWidthMetres from the local centre line.
export const FEATURES = Object.freeze([
  { id: 'modern-brick-1948', era: 'modern-fill', rule: 'find', centre: [10.6, 8] },
  { id: 'modern-china-1955', era: 'modern-fill', rule: 'find', centre: [-11, 8] },
  // M1: centred in the T2/T3 baulk at its level (battered walls at x -0.83 and -0.22).
  { id: 'mughal-porcelain', era: 'mughal', rule: 'find', centre: [-0.52, 8] },
  // M1: moved from x 4.5, where the battered T4 west wall (3.9 deg) reaches x 4.67 at the Mughal level and would slice it.
  { id: 'mughal-glass', era: 'mughal', rule: 'find', centre: [-5.52, 8] },
  { id: 'sultanate-corner', era: 'sultanate', rule: 'wall', centre: [-2.725, 3.8] },
  { id: 'sultanate-lime-floor', part: 'A', era: 'sultanate', rule: 'surface', centre: [-3.1, 4.17] },
  { id: 'sultanate-lime-floor', part: 'B', era: 'sultanate', rule: 'surface', centre: [1.8, 3.9] },
  { id: 'rajput-wall', era: 'rajput', rule: 'wall', centre: [-8.7, 5.5], floorOf: 'square-1' },
  { id: 'rajput-postholes', era: 'rajput', rule: 'opening', host: 'top', centre: [-7.9, 3.85], postholeClearance: .10 },
  { id: 'rajput-rubble', era: 'rajput', rule: 'wall', centre: [-11.225, 7.0], rotate: 90 },
  { id: 'rajput-pottery-dump', era: 'rajput', rule: 'bed', centre: [-10.0, 7.7], rotate: 90, optional: true, aboveFloor: { trench: 'square-1', clearance: .10 } },
  { id: 'rajput-sealed-pit', era: 'rajput', rule: 'opening', host: 'base', centre: [-5.5, 7.8], overrides: { base: 0, width: .8 }, intoGupta: .15, optional: true },
  { id: 'post-gupta-wall-ns', era: 'post-gupta', rule: 'wall', centre: [-0.5, 7.08] },
  { id: 'post-gupta-wall-ew', era: 'post-gupta', rule: 'wall', centre: [-4.65, 5.6] },
  { id: 'gupta-floor', part: 'A', era: 'gupta', rule: 'surface', centre: [-3.5, 6.65], floorOf: 'square-2' },
  { id: 'gupta-floor', part: 'B', era: 'gupta', rule: 'surface', centre: [-1.75, 3.9], rotate: 90, floorOf: 'square-2' },
  { id: 'gupta-brickbat-wall', era: 'gupta', rule: 'wall', centre: [-3.5, 4.825], floorOf: 'square-2' },
  { id: 'kushan-house', era: 'kushan', rule: 'wall', fig13: true, floorOf: 'square-3' },
  { id: 'pillar-base-as-drawn', era: 'kushan', rule: 'wall', fig13: true },
  { id: 'top-left-stone-as-drawn', era: 'kushan', rule: 'wall', fig13: true },
  { id: 'kushan-bricks', era: 'kushan', rule: 'wall', centre: [11.225, 6.8], rotate: 90 },
  { id: 'sunga-masonry', era: 'sunga', rule: 'wall', centre: [7.75, 4.3], rotate: 90 },
  { id: 'sunga-burnt-patches', part: 'at masonry', era: 'sunga', rule: 'surface', centre: [6.95, 2.25] },
  { id: 'sunga-burnt-patches', part: 'isolated 1', era: 'sunga', rule: 'surface', centre: [-3.05, -4.15] },
  { id: 'sunga-burnt-patches', part: 'isolated 2', era: 'sunga', rule: 'surface', centre: [-10.9, 7.33] },
  { id: 'sunga-kushan-lane', era: 'sunga', rule: 'surface', centre: [9.9, 6.9], rotate: 90 },
  { id: 'mauryan-drain', era: 'mauryan', rule: 'surface', centre: [7, 6.4], overrides: { polyline: [[0, 0], [4.8, 0]] }, floorOf: 'square-4', flush: true,
    // M2b: the kit bed (the channel floor) is at local y 0.0015 and the tiles span 0.14-0.185 m from the centre line,
    // displaced up to 0.019 m. The cut stops 9.5 mm under the bed, so the bed is the visible floor, and reaches the
    // 5 cm boundary-grid nodes 0.15 m from the centre line (z 6.4 is a node) but not those at 0.20 m outside the tiles.
    channel: { halfWidthMetres: .16, floorMetres: -.008 } },
  { id: 'pre-mauryan-sherds', era: 'pre-mauryan', rule: 'find', centre: [2, 8] }
].map(Object.freeze));
// Scene-owned cuts and the ring well (not kit features).
export const RING_WELL = Object.freeze({ id: 'mauryan-ring-well', era: 'mauryan', x: 7, z: 7.525, radius: .35, span: 2.2, floorOf: 'square-4', pit: { xmin: 6.475, xmax: 7.525, zmin: 7, zmax: 8, belowRings: .12 } });
// M1: moved from x 7.7-8.9, z 4.3-5.9 to stay on the T4 floor once its walls lean inward from the top (floor about
// x 5.44-8.58, z from 4.43); clear of the drain (z 6.14-6.66) and the ring-well pit.
export const CONTROLLED_PIT = Object.freeze({ id: 'controlled-pit', xmin: 7.2, xmax: 8.4, zmin: 4.55, zmax: 6.05, steps: 2, stepInset: .2, inside: 'square-4' });
// Front-face finds: share of the band thickness above the band base where the find centre sits (M).
export const FIND_BAND_FRACTION = .4;
// Exposure rule (orchestrator M0 review): proud by max(0.15 m, 2 courses), capped at half the surviving height for walls
// taller than 0.30 m; walls 0.15 m or lower sit on the era top at full height.
export function exposure(height, courses) {
  if (height <= .15) return height;
  const e = Math.max(.15, 2 * height / Math.max(1, courses));
  return Math.min(height, height > .30 ? Math.min(e, height / 2) : e);
}
// Surface-seated features flatten their host boundary to the seat plane under the footprint, blending back over this width.
export const FLATTEN_FEATHER_METRES = .3;
