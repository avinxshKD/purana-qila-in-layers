import { PALETTES } from './palettes.js';
import { mulberry32 } from './rng.js';
import { gradientNoise } from './soil-noise.js';
import { edgeErosion, edgeDeviationMetrics } from './earth-edges.js';
export const FRACTIONS = [0, .038, .24, .30, .56, .62, .84, 1];
// Matches the top-surface lip strip so wall tops and the notched lip share vertices.
export const SAMPLE_STEP = .025;
// Per-band texture character (look decisions, not measurements). Log-amplitude weights of the soil shader terms;
// periods in metres. Silty/loose bands are smooth and laminated, fragment/rubble bands lumpy with rougher relief.
export const BAND_CHARACTER = Object.freeze([
  { name: 'loose fill, grey ash streaks', mottle: 1.1, streak: 1.0, streakThickness: .09, lump: .35, lumpPeriod: .08, speck: .14, patches: .12, ash: .55, relief: 1.0 },
  { name: 'loose grey earth, lime flecks', mottle: 1.3, streak: .3, streakThickness: .07, lump: .3, lumpPeriod: .07, speck: .2, patches: .1, relief: .9 },
  { name: 'compact sealing earth', mottle: .9, streak: .8, streakThickness: .12, lump: .25, lumpPeriod: .10, speck: .08, patches: .08, relief: .6 },
  { name: 'occupation earth, pottery and brick fragments', mottle: 1.25, streak: .6, streakThickness: .10, lump: .7, lumpPeriod: .09, speck: .14, patches: .15, relief: 1.3 },
  { name: 'darker occupation earth, burnt patches', mottle: 1.2, streak: .55, streakThickness: .08, lump: .55, lumpPeriod: .08, speck: .2, patches: .14, burnt: .35, relief: 1.1 },
  { name: 'compact occupation earth, rubble and brick-bats; compact = fewer voids and finer grain, not smooth', mottle: 1.3, streak: .9, streakThickness: .09, lump: .6, lumpPeriod: .08, speck: .3, patches: .14, relief: 1.3 },
  { name: 'thin pale-yellow and greyish beds', mottle: .85, streak: .5, streakThickness: .07, lump: .3, lumpPeriod: .07, speck: .18, patches: .05, beds: 1, relief: .7 }
].map(Object.freeze));
export const BAND_INCLUSIONS = Object.freeze([
  { densityPerSquareMetre: 6, diameterMetres: [.01, .06], mix: { brickbat: .7, ash: .3 } },
  { densityPerSquareMetre: 30, diameterMetres: [.005, .03], mix: { lime: 1 } },
  null,
  { densityPerSquareMetre: 30, diameterMetres: [.01, .12], mix: { brickbat: .55, sherd: .45 }, clusterShare: .4 },
  { densityPerSquareMetre: 10, diameterMetres: [.01, .05], mix: { charcoal: .8, brickbat: .2 } },
  { densityPerSquareMetre: 25, diameterMetres: [.02, .15], mix: { brickbat: .5, rubble: .35, mudbrick: .15 }, clusterShare: .4 },
  { densityPerSquareMetre: 6, diameterMetres: [.01, .05], mix: { sherd: 1 } }
]);
const TRENCHES = Array.from({ length: 4 }, (_, i) => ({
  id: `square-${i + 1}`, xmin: -10 + i * 5, xmax: -6 + i * 5,
  zmin: 4, zmax: 8, depth: 2.4 + i * 1.45
}));
export function surfaceHeight(x, z = 0) {
  const lumps = .025 * gradientNoise(x * 2.1 + z * .7, z * 1.7 - x * .4, .31, 17751)
    + .012 * gradientNoise(x * 4.3 - z * 1.1, z * 3.2 + x * .7, .57, 17752);
  // Compressed crests leave flat trodden patches between hollows instead of pillowy lumps.
  const relief = lumps > 0 ? lumps * .3 : lumps;
  return 2.5 - x * 5 / 48 - z * 5 / 32 + relief - edgeErosion(x, z);
}
// Dug walls lean back 2-5 degrees (look decision). The lean is a horizontal shift that grows with depth below a fixed
// reference height per wall and ramps to zero over CUT_SHAPE.rampMetres into the cut, so floors stay planar and never fold.
export const CUT_SHAPE = Object.freeze({ trenchBatterDegrees: [2.5, 4.5], pitBatterDegrees: [2, 3], rampMetres: .6, pitRampMetres: .2,
  pitRimCrumbleMetres: [.01, .06], pitRimReachMetres: .1, seed: 18401 });
function hash01(n) { const s = Math.sin(n * 127.1 + CUT_SHAPE.seed) * 43758.5453; return s - Math.floor(s); }
let cutWalls = null;
function batterWalls() {
  if (cutWalls) return cutWalls;
  const tan = degrees => Math.tan(degrees * Math.PI / 180), [t0, t1] = CUT_SHAPE.trenchBatterDegrees, [p0, p1] = CUT_SHAPE.pitBatterDegrees;
  const uneroded = (x, z) => surfaceHeight(x, z) + edgeErosion(x, z);
  cutWalls = TRENCHES.map((t, i) => ({ ...t, floorY: -trenchFloorDepth(t), ramp: CUT_SHAPE.rampMetres,
    left: { tan: tan(t0 + (t1 - t0) * hash01(i * 3 + 1)), top: uneroded(t.xmin, (t.zmin + t.zmax) / 2) },
    right: { tan: tan(t0 + (t1 - t0) * hash01(i * 3 + 2)), top: uneroded(t.xmax, (t.zmin + t.zmax) / 2) },
    back: { tan: tan(t0 + (t1 - t0) * hash01(i * 3 + 3)), top: uneroded((t.xmin + t.xmax) / 2, t.zmin) } }));
  const pit = wellPit, pitTop = -pit.topDepth, pitFloor = -pit.bottomDepth;
  cutWalls.push({ ...pit, floorY: pitFloor, ramp: CUT_SHAPE.pitRampMetres, pit: true,
    left: { tan: tan(p0 + (p1 - p0) * hash01(31)), top: pitTop }, right: { tan: tan(p0 + (p1 - p0) * hash01(32)), top: pitTop },
    back: { tan: tan(p0 + (p1 - p0) * hash01(33)), top: pitTop } });
  return cutWalls;
}
export function batterShift(x, y, z) {
  let sx = 0, sz = 0;
  for (const w of batterWalls()) {
    // The shift also fades out over the ramp beside the cut, so the open front face leans with the walls instead of
    // tearing at the cut's x boundary below the floor.
    const outside = Math.max(0, w.xmin - x, x - w.xmax);
    if (outside >= w.ramp || z < w.zmin - 1e-7 || z > w.zmax + 1e-7) continue;
    const fade = 1 - outside / w.ramp, cx = Math.min(w.xmax, Math.max(w.xmin, x));
    const lean = side => side.tan * Math.max(0, side.top - Math.max(y, w.floorY));
    sx += fade * (lean(w.left) * Math.max(0, 1 - (cx - w.xmin) / w.ramp) - lean(w.right) * Math.max(0, 1 - (w.xmax - cx) / w.ramp));
    sz += fade * lean(w.back) * Math.max(0, 1 - (z - w.zmin) / w.ramp);
  }
  return [sx, sz];
}
// Removal-only crumble of the pit rim: lowers the rim and the ledge within reach of it, never at the open front.
export function pitRimCrumble(x, y, z) {
  const pit = wellPit, top = -pit.topDepth;
  if (Math.abs(y - top) > 1e-6 || z > 8 - 1e-9) return 0;
  const dx = Math.max(pit.xmin - x, 0, x - pit.xmax), dz = Math.max(pit.zmin - z, 0);
  const inside = x > pit.xmin + 1e-7 && x < pit.xmax - 1e-7 && z > pit.zmin + 1e-7;
  const reach = CUT_SHAPE.pitRimReachMetres, d = inside ? 0 : Math.hypot(dx, dz);
  if (d >= reach) return 0;
  const along = x + z * 1.7, [c0, c1] = CUT_SHAPE.pitRimCrumbleMetres;
  const amount = c0 + (c1 - c0) * Math.max(0, .5 + .5 * gradientNoise(along / .09, .3, .7, CUT_SHAPE.seed + 3) + .25 * gradientNoise(along / .03, .9, .2, CUT_SHAPE.seed + 4));
  return amount * (1 - d / reach) ** 1.5 * Math.min(1, (8 - z) / .1);
}
export function earthPoint(x, y, z) {
  const [bx, bz] = batterShift(x, y, z);
  y -= pitRimCrumble(x, y, z);
  // Shared lip wobble keeps top/walls coincident. The outer section stays at z=8.
  for (const edge of [-10, -6, -5, -1, 0, 4, 5, 9]) {
    const influence = Math.max(0, 1 - Math.abs(x - edge) / .12) * Math.max(0, Math.min(1, (z - 3.8) / .2));
    x += influence * .03 * Math.sin(z * 2.4 + edge);
  }
  if (Math.abs(z - 4) < .12) z += .03 * Math.sin(x * 2.2) * (1 - Math.abs(z - 4) / .12);
  // Corner wobble only pushes outward and only below the lip, so no lip overhangs the face beneath it.
  const corner = Math.max(0, 1 - (12 - Math.abs(x)) / .35) * Math.max(0, 1 - (8 - Math.abs(z)) / .35);
  const below = corner > 0 ? Math.max(0, Math.min(1, (surfaceHeight(x, z) - y) / .4)) : 0;
  x += Math.sign(x) * corner * below * .0225 * (1 + gradientNoise(y * .7, .31, .53, 17753));
  z += Math.sign(z) * corner * below * .0225 * (1 + gradientNoise(y * .7, .73, .19, 17754));
  const r = .035, dx = Math.abs(x) - (12 - r), dz = Math.abs(z) - (8 - r);
  if (dx > 0 && dz > 0) {
    const length = Math.hypot(dx, dz);
    x = Math.sign(x) * (12 - r + dx / length * r);
    z = Math.sign(z) * (8 - r + dz / length * r);
  }
  return [x + bx, y, z + bz];
}
export const trenchFloorDepth = trench => trench.depth - surfaceHeight((trench.xmin + trench.xmax) / 2, (trench.zmin + trench.zmax) / 2);
const ringX = 7, ringZ = 7.525, ringTop = surfaceHeight(ringX, ringZ) + trenchFloorDepth(TRENCHES[3]);
const ringBottomDepth = ringTop + 2.2 - surfaceHeight(ringX, ringZ), baseDepth = ringBottomDepth + 1.5;
const wellPit = { id: 'well-pit', kind: 'rectangle', xmin: ringX - .525, xmax: ringX + .525, zmin: ringZ - .525, zmax: 8,
  topDepth: ringTop - surfaceHeight(ringX, ringZ), bottomDepth: ringBottomDepth + .12 };
export const LOOK_PROPORTIONS = Object.freeze({
  width: 24, length: 16, depth: baseDepth + surfaceHeight(-12, -8), bottomDepth: baseDepth,
  // The base extension starts at the lowest ring; the shader fade starts 0.6 m lower so the basal beds read before it.
  fadeStartDepth: ringBottomDepth, shaderFadeStartDepth: ringBottomDepth + .6, slopeRise: 5, baulkWidth: 1,
  trenches: TRENCHES,
  shaft: { id: 'ring-cut', kind: 'shaft', x: ringX, z: ringZ, radius: .525, pit: wellPit, ringRadius: .35, localTopDepth: ringTop, localBottomDepth: ringTop + 2.2,
    rings: 18, ringHeight: .15, span: 2.2, visiblePitch: (2.2 - .15) / 17, innerRadius: .31, wallThickness: .04,
    offsetsMetres: .01, tiltRadians: .012, crackedCourses: [0, 3, 11],
    sourceId: 'P1:p357', modellingAssumption: '18 nested 0.15m rings span 2.20m: (2.20−0.15)/17 visible pitch. Ring diameter 0.70m includes lips. Wall thickness 0.04m, rectangular excavation 1.05m wide, front setback0.125m, 0.01m offsets, tilts up to0.012rad, chipped/cracked courses, loose fragment, top-only flush fill and placement are assumptions; source wall thickness unknown. Exposed convex-column treatment follows Fig.7 photo observation.' },
  features: [
    { id: 'wall-1', kind: 'rectangle', xmin: -11.8, xmax: -10.2, zmin: 6, zmax: 8, topDepth: 1.1, bottomDepth: 1.85, material: 'brick' },
    { id: 'wall-2', kind: 'rectangle', xmin: 4.08, xmax: 4.92, zmin: 5.4, zmax: 8, topDepth: 3.4, bottomDepth: 4.15, material: 'brick' },
    { id: 'floor-1', kind: 'rectangle', xmin: -12, xmax: 8.8, zmin: 4, zmax: 8, topDepth: 2.2, bottomDepth: 2.275, material: 'lime',
      breaks: [[-8.95, -8.5], [4.3, 4.62]] }
  ]
});

export function rectangleFaces(prefix, bounds, floorDepth, inward = false, owner) {
  const { xmin, xmax, zmin, zmax } = bounds;
  const corners = [[xmin, zmax], [xmax, zmax], [xmax, zmin], [xmin, zmin]];
  return corners.map((from, i) => ({
    id: `${prefix}-${i}`, from, to: corners[(i + 1) % 4], inward, floorDepth, owner
  }));
}

// Irregular boundary profile along the face: sum of seeded gradient octaves, never a single sine.
export function boundaryRoughness(index, x, z) {
  const s = x + z, n = (period, seed) => gradientNoise(s / period, index * 1.37 + .21, .43, seed + index * 101);
  if (index === 1) {
    // Band 1 lower boundary: uneven at 5–20 cm, with abrupt short steps.
    const step = Math.max(0, n(.09, 18113)) * .045;
    return .085 * n(1.3, 18101) + .045 * n(.42, 18107) + .02 * n(.13, 18109) + step;
  }
  // 1-5 cm irregular profile: three octaves down to the 2.5 cm wall sample step, plus short abrupt steps.
  return .016 * n(.55, 18201) + .014 * n(.16, 18203) + .009 * n(.06, 18207) + Math.max(0, n(.11, 18211)) * .018;
}
export const MINIMUM_TRUNCATED_THICKNESS = .002;
export function syntheticBoundary(index, x, z) {
  // Band positions follow the uneroded surface; lip erosion only truncates them from above.
  const eroded = surfaceHeight(x, z), top = eroded + edgeErosion(x, z), base = FRACTIONS[index] * (LOOK_PROPORTIONS.bottomDepth + top) - top;
  if (index === 0) return -eroded;
  if (index === FRACTIONS.length - 1) return (LOOK_PROPORTIONS.bottomDepth + eroded) - eroded;
  const drift = Math.sin(x * .29 + z * .17 + index * 1.3) * .10 + Math.cos(z * .43 - x * .12 - index) * .065;
  const erosion = (index === 2 || index === 4) ? .14 * Math.exp(-(((x + (index === 2 ? 3 : -7)) / .65) ** 2)) * Math.cos(z * .19) : 0;
  return Math.max(base + drift + erosion + boundaryRoughness(index, x, z), -eroded + MINIMUM_TRUNCATED_THICKNESS * index);
}

export function createLayerTable(proportions = LOOK_PROPORTIONS, palette = 'photo') {
  const halfX = proportions.width / 2, halfZ = proportions.length / 2;
  const faces = [
    ...rectangleFaces('outer', { xmin: -halfX, xmax: halfX, zmin: -halfZ, zmax: halfZ }, proportions.bottomDepth),
    ...proportions.trenches.flatMap(trench => rectangleFaces(trench.id, trench, trenchFloorDepth(trench), true, trench.id)
      .filter(face => !(face.from[1] === halfZ && face.to[1] === halfZ))),
    ...rectangleFaces('well-pit', proportions.shaft.pit, proportions.shaft.pit.bottomDepth, true, 'well-pit')
      .filter(face => !(face.from[1] === halfZ && face.to[1] === halfZ))
      .map(face => ({ ...face, topDepth: proportions.shaft.pit.topDepth }))
  ];
  const random = mulberry32(0x57a7a);
  const descriptions = [
    { text: 'Synthetic yellowish loose soil with ash vocabulary', inclusion: 'brickbat', sourceId: 'P1:pp355-356', support: 'bricks of 1948CE' },
    { text: 'Synthetic light-grey loose earth and lime-plaster vocabulary', inclusion: 'lime', sourceId: 'P1:p356', support: 'mixed with debris of lime floor plasters' },
    { text: 'Sealing relation; colour and thickness assumed; grey-beige lime floor is a photo observation', sourceId: 'P1:p356;Figs14-15' },
    { text: 'Occupation earth with pottery and brick fragments; warm ochre-brown is a modelling assumption', inclusion: 'brickbat', sourceId: 'P1:pp358,362', support: 'fragments of potteries, mixed with earth' },
    { text: 'Occupation earth with burnt patches; darker grey-brown is a modelling assumption', inclusion: 'charcoal', sourceId: 'P1:p358', support: 'a few burnt patches' },
    { text: 'Compact occupation earth; reddish read carried by brick fragments, not soil hue; compaction assumed', inclusion: 'rubble', sourceId: 'P1:p358', support: 'mud-bricks as well as rubble stones' },
    { text: 'Pale yellow and grayish basal beds, count schematic', inclusion: 'sherd', sourceId: 'P1:p357', support: 'blackish-colored ware and red ware fragments; rolled sherds of grey ware and painted grey ware' }
  ];
  const layers = PALETTES[palette].layers.map((color, i) => ({
    id: `sample-layer-${i + 1}`, color,
    description: descriptions[i], noise: { seed: 411 + i * 37, amplitude: 1, bandIndex: i, character: BAND_CHARACTER[i],
      microMetres: [.01, .025, .05], basal: i === 6, fadeStartDepth: proportions.shaderFadeStartDepth ?? proportions.fadeStartDepth, baseDepth: proportions.bottomDepth },
    inclusions: descriptions[i].inclusion ? BAND_INCLUSIONS[i] : { densityPerSquareMetre: 0, diameterMetres: [0, 0], reason: 'no source-supported inclusion vocabulary' },
    lenses: faces.filter(face => (i === 0 || i === 3 || i === 4) && random() < .18).map(face => ({ faceId: face.id,
      centerT: .15 + random() * .7, fraction: .35 + random() * .3, radiusMetres: .4 + random() * .7,
      halfDepth: i === 0 ? .025 : .065 + random() * .055, kind: i === 0 ? 'ash' : 'burnt' })),
    textureType: ['yellow loose fill/ash', 'grey loose plaster debris', 'sealing earth', 'pottery earth', 'burnt occupation', 'compact reddish earth', 'schematic basal beds'][i],
    faces: Object.fromEntries(faces.map(face => {
      const steps = Math.ceil(Math.hypot(face.to[0] - face.from[0], face.to[1] - face.from[1]) / SAMPLE_STEP);
      return [face.id, Array.from({ length: steps + 1 }, (_, j) => {
      const t = j / steps, x = face.from[0] + t * (face.to[0] - face.from[0]);
      const z = face.from[1] + t * (face.to[1] - face.from[1]);
      return { t, topDepth: syntheticBoundary(i, x, z), bottomDepth: syntheticBoundary(i + 1, x, z) };
    })]; }))
  }));
  // Two named tapered lenses terminate within the same exposed front face.
  layers[3].lenses.push({ faceId: 'outer-0', centerT: .22, fraction: .6, radiusMetres: 1.6, halfDepth: .12, kind: 'burnt' });
  layers[4].lenses.push({ faceId: 'outer-0', centerT: .69, fraction: .5, radiusMetres: 1.3, halfDepth: .1, kind: 'burnt' });
  return { units: 'metres', datum: 'Local schematic metre coordinates; depths positive down. Base extends 1.5m below the lowest ring.',
    synthetic: true, framing: 'Composite schematic of documented layers and features, not a cut from one mapped location.',
    palette, materialPlacement: 'Source-supported vocabulary only; seven band positions, thicknesses, burnt/lime lenses and inclusions are schematic, not surveyed period horizons.',
    modellingAssumptions: {
      framing: 'Composite of documented excavation areas, not a registered/surveyed cut; seven bands not era-mapped.',
      blockMetres: { width: proportions.width, length: proportions.length, height: 'set from rendered vertex bounds, including loose top clods', bottomDepth: proportions.bottomDepth },
      slope: { riseMetres: 5, profile: 'one-way plane 2.5−5x/48−5z/32', gradientReliefAmplitudesMetres: [.025, .012] },
      strata: { fractions: FRACTIONS, swellAmplitudesMetres: [.10, .065], erosionAmplitudeMetres: .14, erosionWidthMetres: .65,
        irregularProfileMetres: { band1Lower: [.05, .20], others: [.01, .05], periodsMetres: { band1Lower: [1.3, .42, .13, .09], others: [.55, .19, .07] } },
        truncation: 'positions follow the uneroded surface; lip erosion only removes material, truncated bands keep 2mm×index',
        lenses: 'Schematic tapered pockets, no dated/event interpretation', placementSeed: 0x57a7a, maximumSampleStepMetres: SAMPLE_STEP },
      cuts: { trenches: proportions.trenches, baulkWidthMetres: 1, lipWobbleMetres: .03, cornerRadiusMetres: .035,
        erosionMetres: [.05, .15], largerBitesMetres: [.20, .40], influenceMetres: .35, edgeMetrics: edgeDeviationMetrics(surfaceHeight),
        foundationCuts: 'none drawn: the section is cut exactly to each wall outline, so no border frames the bricks', pit: 'only the schematic narrow excavation surrounding the well; no right tunnel' },
      well: { placementMetres: [ringX, ringZ], wallThicknessMetres: .04, offsetMaximumMetres: .01, tiltMaximumRadians: .012, crackedCourseIndices: [0, 3, 11],
        pit: proportions.shaft.pit, nominalFrontSetbackMetres: .125, nominalSideClearanceMetres: .175,
        profile: 'exposed convex terracotta column, nested lips, upper dusty buff to darker reddish lower third; photo interpretation',
        fill: 'flush top disc only; no front section, halo or void',
        visiblePitchMetres: proportions.shaft.visiblePitch, sourceNumberMismatch: '18×0.15=2.70m; nested profile chosen to span source approximate 2.20m' },
      brick: { sectionRows: 10, horizontalPitchMetres: .235, nominalVerticalPitchMetres: .075, mudJointMetres: .012, tiltMaximumRadians: .0125,
        sizeStatus: 'look-only course dimensions, not assigning a documented Kushan brick size' },
      floor: { limeThicknessMetres: [.055, .095], raggedEdgeAmplitudeMetres: .018, breaksXMetres: proportions.features.find(feature => feature.material === 'lime').breaks,
        extent: 'horizon y=−2.2m for x −12..8.8m, z ≥4m, drawn in the soil shader wherever a cut face crosses it; extent beyond the front face is a modelling assumption',
        warmFloorEmissiveIntensity: .06 },
      interiorOcclusion: { albedoMultiplier: .84, receivesProjectedShadows: false, reason: 'Warm stable occlusion without misleading wedge/gable shadows' },
      materials: { swatches: 'D65 Lab look targets; source order, not calibrated archaeological colours or era mapping',
        gradientNoise: 'rotated 3D quintic gradient octaves, shared world scale on coplanar faces', microMetres: [.01, .025, .05],
        variationAmplitude: .05, scrapingSpacingMetres: [.04, .10], scrapingValueAmplitude: .02,
        normalReliefAmplitudesMetres: [.0022, .0011, .00055], normalFeaturePeriodsMetres: [.05, .025, .01],
        textureFilter: 'each octave fades to mean below 3.5–5 final-1080 pixels; work-resolution derivatives multiplied by downsample factor' },
      edgeCrumbs: { candidates: 360, sizeMetres: [.025, .10], seed: 17751, positions: 'loose top clods/debris, trench openings excluded' },
      inclusions: { diameterMetres: 'per band, see BAND_INCLUSIONS', polygonSides: [7, 10], distribution: 'log-uniform sizes; flat kinds aspect 1.5-3 within 18 degrees of the bedding, others 1.1-1.7 within 35 degrees; 40% clustered in 0.3-0.8 m lines along a bed in bands 4 and 6; albedo L* spread +/-11; host-soil film, one-side dust, lit upper/shaded lower rim, 3.5 mm feathered edge', source: 'material vocabulary only, positions/sizes schematic' },
      base: { extensionBelowLowestRingMetres: 1.5, fadeStartDepth: proportions.fadeStartDepth, shaderFadeStartDepth: proportions.shaderFadeStartDepth, fadeEndDepth: proportions.bottomDepth,
        interpretation: 'Unexcavated cultural deposit continues; never labelled natural soil' },
      plinth: { widthMetres: 25.3, lengthMetres: 17.3, heightMetres: .36, topRimHeightMetres: .065, scaleBarLengthMetres: 5, ticksMetres: 1 },
      lighting: { type: 'museum look, not reconstructed sunlight', keyPosition: [20, 34, 44], keyIntensity: 2,
        fillPosition: [18, 5, 32], warmFillIntensity: 2.4, warmHemisphereIntensity: .4, rimPosition: [8, 19, -25], rimIntensity: .3,
        topLinearAlbedoMultiplier: .65, shadowRadius: 7, blurSamples: 16 },
      cameraAndType: 'presentation choices; actual render/cap metrics stored separately, no archaeological camera claim'
    },
    proportions, faces, layers, cuts: [
      ...proportions.trenches.map(trench => ({ ...trench, kind: 'rectangle', topDepth: -20,
        bottomDepth: trenchFloorDepth(trench) })),
      proportions.shaft.pit,
      ...proportions.features.filter(feature => feature.material === 'brick').map(feature => ({ ...feature }))
    ] };
}

// Outward overhang of each lip (wall top and top-surface points up to 10 cm behind it) beyond the face below, along the face normal.
export function lipOverhang(table, stride = 4) {
  let maximum = 0, at = null, columns = 0;
  for (const face of table.faces) {
    const dx = face.to[0] - face.from[0], dz = face.to[1] - face.from[1], length = Math.hypot(dx, dz), sign = face.inward ? -1 : 1;
    const nx = -dz / length * sign, nz = dx / length * sign, samples = table.layers[0].faces[face.id];
    for (let i = 0; i < samples.length; i += stride) {
      const x = face.from[0] + samples[i].t * dx, z = face.from[1] + samples[i].t * dz;
      const lipDepth = Math.max(samples[i].topDepth, face.topDepth ?? -Infinity), outward = p => p[0] * nx + p[2] * nz;
      const lips = [outward(earthPoint(x, -lipDepth, z)), ...[.0125, .025, .05, .1].map(d => {
        const px = x - nx * d, pz = z - nz * d;
        return face.topDepth === undefined ? outward(earthPoint(px, surfaceHeight(px, pz), pz)) : -Infinity;
      })];
      const lip = Math.max(...lips);
      for (let depth = lipDepth + .02; depth < face.floorDepth; depth += .05) {
        const value = lip - outward(earthPoint(x, -depth, z));
        if (value > maximum) { maximum = value; at = { face: face.id, t: samples[i].t, depth }; }
      }
      columns++;
    }
  }
  return { maximumMetres: maximum, at, columns, method: 'Wall-top and top-surface points 1.25–10 cm behind every 4th lip sample versus the face every 5 cm below, along the outward face normal.' };
}

export function validateLayerTable(table) {
  for (const face of table.faces) {
    for (let l = 0; l < table.layers.length; l++) {
      const samples = table.layers[l].faces[face.id];
      if (!samples || samples.length < 2 || samples[0].t !== 0 || samples.at(-1).t !== 1) throw new Error('Face needs endpoint samples');
      for (let i = 0; i < samples.length; i++) {
        const s = samples[i];
        if (![s.t, s.topDepth, s.bottomDepth].every(Number.isFinite) || s.topDepth >= s.bottomDepth) throw new Error('Invalid layer depths');
        if (i && s.t <= samples[i - 1].t) throw new Error('Unordered face samples');
        if (l && (samples.length !== table.layers[l - 1].faces[face.id].length
          || Math.abs(s.topDepth - table.layers[l - 1].faces[face.id][i].bottomDepth) > 1e-8)) throw new Error('Non-contiguous layers');
      }
    }
  }
  return table;
}

function clipHalf(poly, axis, bound, keepLess) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = (a[axis] - bound) * (keepLess ? 1 : -1), db = (b[axis] - bound) * (keepLess ? 1 : -1);
    if (da <= 0) out.push(a);
    if ((da <= 0) !== (db <= 0)) {
      const t = da / (da - db);
      out.push(a.map((v, j) => v + (b[j] - v) * t));
    }
  }
  return out;
}

export function clipDepth(poly, depth) { return clipHalf(poly, 1, depth, true); }
export function clipDepthRange(poly, minimum, maximum) { return clipHalf(clipHalf(poly, 1, minimum, false), 1, maximum, true); }

export function subtractRectangle(poly, { xmin, xmax, ymin, ymax }) {
  let inside = poly;
  const outside = [];
  for (const [axis, bound, keepLess] of [[0, xmin, false], [0, xmax, true], [1, ymin, false], [1, ymax, true]]) {
    const fragment = clipHalf(inside, axis, bound, !keepLess);
    if (fragment.length >= 3) outside.push(fragment);
    inside = clipHalf(inside, axis, bound, keepLess);
    if (inside.length < 3) break;
  }
  return outside;
}

export function cutOnFace(cut, face) {
  if (cut.id === face.owner) return null;
  const [x, z] = face.from, [x2, z2] = face.to;
  const axis = x === x2 ? 1 : 0, fixed = axis === 1 ? x : z;
  let minFixed = axis === 1 ? cut.xmin : cut.zmin, maxFixed = axis === 1 ? cut.xmax : cut.zmax;
  let a = axis === 1 ? cut.zmin : cut.xmin, b = axis === 1 ? cut.zmax : cut.xmax;
  if (cut.kind === 'shaft') {
    const delta = fixed - (axis === 1 ? cut.x : cut.z);
    if (Math.abs(delta) >= cut.radius) return null;
    const half = Math.sqrt(cut.radius ** 2 - delta ** 2), center = axis === 1 ? cut.z : cut.x;
    a = center - half; b = center + half;
    minFixed = -Infinity; maxFixed = Infinity;
  }
  if (fixed < minFixed || fixed > maxFixed) return null;
  const start = face.from[axis], length = face.to[axis] - start;
  const ta = (a - start) / length, tb = (b - start) / length;
  const xmin = Math.max(0, Math.min(ta, tb)), xmax = Math.min(1, Math.max(ta, tb));
  if (xmin >= xmax || cut.topDepth >= face.floorDepth) return null;
  return { xmin, xmax,
    ymin: cut.topDepth, ymax: Math.min(cut.bottomDepth, face.floorDepth) };
}

export function subtractConvex(poly, cutter) {
  let inside = poly;
  const outside = [];
  const side = (p, a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  function half(input, a, b, keepInside) {
    const out = [];
    for (let i = 0; i < input.length; i++) {
      const p = input[i], q = input[(i + 1) % input.length];
      const dp = side(p, a, b) * (keepInside ? 1 : -1), dq = side(q, a, b) * (keepInside ? 1 : -1);
      if (dp >= 0) out.push(p);
      if ((dp >= 0) !== (dq >= 0)) {
        const t = dp / (dp - dq);
        out.push(p.map((value, j) => value + (q[j] - value) * t));
      }
    }
    return out;
  }
  for (let i = 0; i < cutter.length; i++) {
    const a = cutter[i], b = cutter[(i + 1) % cutter.length];
    const fragment = half(inside, a, b, false);
    if (fragment.length >= 3) outside.push(fragment);
    inside = half(inside, a, b, true);
    if (inside.length < 3) break;
  }
  return outside;
}
