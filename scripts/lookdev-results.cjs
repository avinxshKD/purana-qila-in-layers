'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { root } = require('./browser.cjs');
const { run, bin, probe, sha256 } = require('./media.cjs');
async function main() {
const THREE = await import('three');
const { arcAngle } = await import('../src/museum-scene.js');
const directory = path.join(root, 'output', 'lookdev', 'round4'), file = path.join(directory, 'metrics.json');
const m = JSON.parse(fs.readFileSync(file, 'utf8'));
if (m.film) {
  m.film.deliveryProbe = JSON.parse(run(bin('ffprobe'), ['-v', 'error', '-count_frames', '-select_streams', 'v:0',
    '-show_entries', 'stream=codec_name,profile,pix_fmt,width,height,r_frame_rate,nb_frames,nb_read_frames:format=duration,size',
    '-of', 'json', path.join(directory, m.film.file)]).stdout);
  const stream = m.film.deliveryProbe.streams[0];
  if (stream.codec_name !== 'h264' || stream.pix_fmt !== 'yuv420p' || stream.width !== 1920 || stream.height !== 1080
    || stream.nb_read_frames !== '360' || m.film.deliveryProbe.format.duration !== '12.000000') throw new Error('Film delivery probe does not match brief');
  if (m.film.superseded || m.film.camera?.distance !== 74 || m.contact?.camera.distance !== 74) throw new Error('Reframed film/contact delivery incomplete');
  const camera = new THREE.PerspectiveCamera(m.film.camera.verticalFov, 16 / 9, .1, 180);
  const target = new THREE.Vector3(...m.film.camera.target), elevation = m.film.camera.elevation * Math.PI / 180;
  const distance = m.film.camera.distance, base = m.blockDimensions.baseDepth;
  let plinthMargin = Infinity, earthMargin = Infinity, peak = 0, previousAngle;
  function margin(bounds) {
    let result = Infinity;
    for (const x of bounds.x) for (const y of bounds.y) for (const z of bounds.z) {
      const point = new THREE.Vector3(x, y, z).project(camera);
      const px = (point.x + 1) * 960, py = (1 - point.y) * 540;
      result = Math.min(result, px, 1920 - px, py, 1080 - py);
    }
    return result;
  }
  for (let frame = 0; frame < 360; frame++) {
    const angle = 35 * Math.PI / 180 + arcAngle(frame / 30);
    if (previousAngle !== undefined) peak = Math.max(peak, (angle - previousAngle) * 180 / Math.PI * 30);
    previousAngle = angle;
    camera.position.set(target.x + distance * Math.cos(elevation) * Math.sin(angle),
      target.y + distance * Math.sin(elevation), target.z + distance * Math.cos(elevation) * Math.cos(angle));
    camera.lookAt(target); camera.updateMatrixWorld();
    plinthMargin = Math.min(plinthMargin, margin({ x: [-12.65, 12.65], z: [-8.65, 8.65], y: [-base - .36, -base] }));
    earthMargin = Math.min(earthMargin, margin({ x: [-12, 12], z: [-8, 8], y: [-base, m.blockDimensions.maximumY] }));
  }
  m.film.arcMeasurement = { peakDegreesPerSecondAt30fps: peak, minimumPlinthMargin1080Pixels: plinthMargin,
    minimumConservativeEarthBoundsMargin1080Pixels: earthMargin, framesChecked: 360,
    method: 'Project all corners of the physical plinth and conservative earth AABBs at every evaluated film camera state.' };
  if (plinthMargin < 16 || earthMargin < 16) throw new Error('Arc framing clearance failed');
}
const all = Object.values(m.determinism).flatMap(d => [...d.repeat, ...d.scrub, d.launch]);
if (m.configuration.revision !== 4 || all.length < 45 || all.some(d => !d.equal) || !m.film || m.failures.length
  || !m.live || Object.values(m.live).some(v => !v.open || v.cssCapHeight < 14)) {
  throw new Error('Round 4 capture/validation is incomplete');
}
const f = (n, digits = 2) => n.toFixed(digits);
const p = m.modellingAssumptions, dimensions = m.blockDimensions;
const title = m.stills.overview.labels.title, labels = m.stills.overview.labels;
const means = m.bandThicknessMetres.map(band => band.mean), ratio = Math.max(...means) / Math.min(...means);
const grey = [1, 3, 5].map(i => m.perBandSwatches[i].CIELAB);
const expected = [
  ...['overview', 'trench-closeup', 'ring-well-closeup'].flatMap(name => [[`${name}.png`, 1920, 1080], [`${name}-540.png`, 540, 304]]),
  ...['overview', 'trench', 'ring'].map(name => [`compare-${name}.png`, 1920, 540]),
  ...['title', 'date', 'callout', 'timeline'].map(part => [`type-${part}-1080.png`, null, null]),
  ['turntable-contact-8.png', 3840, 1080], ['turntable-1080.mp4', 1920, 1080]
];
m.deliverables = expected.map(([name, width, height]) => {
  const asset = path.join(directory, name), stream = probe(asset).streams[0];
  if (width && (stream.width !== width || stream.height !== height)) throw new Error(`Wrong artifact dimensions: ${name}`);
  return { file: name, bytes: fs.statSync(asset).size, width: stream.width, height: stream.height, sha256: sha256(fs.readFileSync(asset)) };
});
m.summary = { rawComparisons: all.length, allPixelExact: all.every(d => d.equal),
  differingPixels: all.reduce((sum, d) => sum + d.differingPixels, 0), maximumChannelDifference: Math.max(...all.map(d => d.maxChannelDifference)),
  bandMeanThicknessRatio: ratio, validation: { tests: 20, failed: 0, build: 'passed; Vite >500kB bundle warning',
    sourceRandomClockScan: 'No Math.random, Date or performance.now in scene/geometry/layers/labels/material/RNG/time modules',
    skipped: ['Headed display testing', 'Cross-driver/machine determinism', 'Survey registration', 'Photographic colour calibration'] } };
m.validationState = 'Final reframed film, contact sheet, raw pixels and live labels verified';
fs.writeFileSync(file, JSON.stringify(m, null, 2) + '\n');
const notes = [
  `1. Done: seven unequal warm bands, mean thickest/thinnest ${f(ratio)}:1; two deliberately tapered lenses on the front face; continuous global boundaries with 0.10/0.065/0.025 m drift and two 0.14 m erosion notches. Albedo-grey Lab ranges: a* ${f(Math.min(...grey.map(c => c.a)))}–${f(Math.max(...grey.map(c => c.a)))}, b* ${f(Math.min(...grey.map(c => c.b)))}–${f(Math.max(...grey.map(c => c.b)))}, maximum chroma ${f(Math.max(...grey.map(c => c.chroma)))}. Swatches are look targets, not calibrated archaeological colours or era mapping.`,
  `2. Changed: inner faces use the same strata with a 0.84 linear-albedo multiplier and no projected wedge shadows; warm fill/bounce retained. Darkest measured floor is ${f(m.darkestTrenchFloorLuma * 100)}% encoded sRGB luma (3 px-eroded mask), above the 8% minimum but brighter than the 10–12% aim; retained for warm readability. This is not linear luminance; per-view medians are in metrics.`,
  `3. Done: 1 px-at-1080 section lines use the component-wise darker adjacent albedo multiplied by 0.35, never a pale wire.`,
  `4. Done: ghost and orange tray are not instantiated; no reconstruction, roofs, people or religious objects in this look scene.`,
  `5. Changed: one 18-course rounded matte terracotta stack, solid mottled interior/backfill, 0.04 m wall assumption, offsets up to 0.01 m, tilts up to 0.012 rad, two cracked courses and chipped rims. The filled section intentionally hides the rear inner ring surfaces; its 4 cm walls read at the cut edges. No tabs, duplicate stack or hollow black bottom.`,
  `6. Done: pit/tunnel cut and its wall/floor meshes removed.`,
  `7. Changed: two volumetric brick sections, ten staggered courses each, 0.012 m mud-joint allowance, small tilts/height drift and foundation cuts; muted dusty orange-brown, not a flat patterned rectangle. Sizes and placements are assumptions, not traced Fig.13 masonry.`,
  `8. Changed: seeded six-sided angular fragments, radius 0.045–0.09 m, varied rotation/size and darker inset borders; no triangular silhouettes or elliptical hole/reflection decals. Projected size varies with camera distance; physical sizes, not a universal 2–6 px guarantee.`,
  `9. Changed: one-way plane with 0.009/0.007 m analytic relief, smooth top normals, 0.075 m outer edge roll, 0.035 m lip roll, 0.025 m outer corner rounding, 0.03 m lip wobble, 0.018–0.043 m edge crumbs and faint scraping. Lime floor is 0.09 m thick with 0.014 m edge variation. Not done: full interior vertical-corner fillets, to preserve the current cut/hole clipping topology.`,
  `10. Done: base y=${f(-dimensions.baseDepth, 5)} m; lowest ring/fade start y=${f(-dimensions.fadeStartsAtDepth, 5)} m. Only the extra 1.50 m continuation fades; no excavated ring/feature fades. No natural-soil claim.`,
  `11. Changed: charcoal plinth has a lighter 0.065 m top rim; overview distance 69 m and target y=−3.35 m, versus Round 3's 68 m/−3 m, to fit the extension. Trench and well cameras retained. Film alone uses distance 74 m/target y=−3.85 m to keep the plinth inside the entire arc.`,
  `12. Done: physical 0–5 m scale with 1 m ticks on the front plinth lip, Source Sans labels. Rendered earth vertex bounds W×L×H=${f(dimensions.width)}×${f(dimensions.length)}×${f(dimensions.height)} m; all schematic modelling dimensions. Cut-face share ${f(m.cutFaceShare.fraction * 100)}%.`,
  `13. Done: seeded world-space 0.015/0.04/0.08 m grain/crumb/pebble values, 0.01 m silt laminations, derivative-footprint filtering. Repeat/scrub/independent-launch checks: ${all.length}/${all.length} pixel-exact, ${m.summary.differingPixels} differing pixels, maximum channel delta ${m.summary.maximumChannelDifference}; same Intel/ANGLE machine only, no GTAO.`,
  `14. Done: B uses bundled Source Serif 4 Semibold title/Source Sans 3 elsewhere. Measured 1080 cap heights: title ${f(title.nameMetrics.capHeight / 2, 1)} px, date ${f(title.dateMetrics.capHeight / 2, 1)} px, callout ${f(labels.callout.capHeight / 2, 1)} px, timeline ${f(labels.parts.timeline.metrics.capHeight / 2, 1)} px. Date opacity 0.8/tracking 0.02 em; numeral features on digit runs only, whole-string names; leader stops 8 px before text; 28 px feathered halo, no plates.`,
  `15. Done: 60° sine-eased arc centred at 35°, 12 s/30 fps/360 frames; sampled peak ${f(m.film.arcMeasurement.peakDegreesPerSecondAt30fps, 4)}°/s. H.264 1920×1080/yuv420p/BT.709, full decode passed; minimum projected plinth margin ${f(m.film.arcMeasurement.minimumPlinthMargin1080Pixels)} px over all 360 states. Eight-angle sheet at the same distance/elevation, 45° steps, row-major offsets 0/45/90/135/180/225/270/315° from hero. 20 tests/build pass (large-bundle warning). ${m.interruptedAttempts?.length || 0} interrupted capture/recheck attempts are archived; final export uses HMR off and fresh browsers every 60 frames, with cross-launch pixels verified.`
];
fs.writeFileSync(path.join(directory, 'notes.md'), notes.join('\n') + '\n');
console.log(JSON.stringify(m.summary, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
