import { createWorld } from './scene.js';
import { createLookWorld } from './lookdev-scene.js';
import { loadLabelFont } from './labels.js';

const params = new URLSearchParams(location.search);
if (params.has('capture')) document.body.classList.add('capture');
const canvas = document.querySelector('canvas');
const lookdev = params.has('lookdev');
if (lookdev) await loadLabelFont();
const world = (lookdev ? createLookWorld : createWorld)(canvas, {
  width: Number(params.get('width') || 1920), height: Number(params.get('height') || 1080),
  antialias: params.get('aa') !== 'off', preserve: !params.has('live'), load: Number(params.get('load') || 1),
  variant: params.get('variant') || 'edges', view: params.get('view') || 'overview', shadow: params.get('shadow') || 'vsm',
  palette: 'photo', labelMode: params.get('labels') || (params.has('capture') ? 'film' : 'live'),
  era: params.get('era') || 'pre-mauryan', typeface: params.get('typeface') || 'adobe', ao: params.get('ao') || 'off',
  angle: Number(params.get('angle') || 0), soil: params.get('soil') || 'look', eraDebug: params.get('eraDebug')
});
if (params.has('state')) world.applyState(JSON.parse(params.get('state')));
const variantControl = document.querySelector('#variant');
document.querySelector('#variant-label').hidden = true;
variantControl.value = params.get('variant') || 'edges';
variantControl.addEventListener('change', () => { world.setVariant(variantControl.value); controls(); });
document.querySelector('#era-label').hidden = !lookdev;
document.querySelector('#era').value = params.get('era') || 'pre-mauryan';
document.querySelector('#era').addEventListener('change', event => { world.setEra(event.target.value); controls(); });
document.querySelector('#typeface-label').hidden = true;
document.querySelector('#typeface').value = params.get('typeface') || 'adobe';
document.querySelector('#typeface').addEventListener('change', event => { world.setTypeface(event.target.value); controls(); });
document.querySelector('#palette-label').hidden = true;
document.querySelector('#palette').value = 'photo';
document.querySelector('#palette').addEventListener('change', event => {
  params.set('palette', event.target.value);
  location.search = params.toString();
});
const sourceButton = document.querySelector('#source-label'), sourceDialog = document.querySelector('#source-dialog');
function positionLabel() {
  const bounds = world.labelBounds?.();
  sourceButton.hidden = !bounds;
  if (!bounds) return;
  const rect = canvas.getBoundingClientRect(), scale = rect.width / canvas.width;
  Object.assign(sourceButton.style, {
    left: `${rect.left + bounds.x * scale}px`, top: `${rect.top + bounds.y * scale}px`,
    width: `${bounds.width * scale}px`, height: `${bounds.height * scale}px`
  });
  sourceButton.setAttribute('aria-label', `Open placeholder source ${bounds.sourceId}`);
}
sourceButton.addEventListener('click', () => {
  document.querySelector('#source-id').textContent = world.labelBounds().sourceId;
  sourceDialog.showModal();
});
document.querySelector('#close-source').addEventListener('click', () => sourceDialog.close());
window.addEventListener('resize', controls);
const yearControl = document.querySelector('#year'), secondsControl = document.querySelector('#seconds');
let playing = false, benchmarking = false, previousTimestamp;
const frames = [];
function controls() {
  document.querySelector('#year-value').value = yearControl.value;
  document.querySelector('#seconds-value').value = secondsControl.value;
  world.setDisplayWidth?.(canvas.getBoundingClientRect().width);
  world.render(Number(yearControl.value), Number(secondsControl.value));
  positionLabel();
}
yearControl.addEventListener('input', controls);
secondsControl.addEventListener('input', controls);
document.querySelector('#play').addEventListener('click', event => {
  playing = !playing;
  previousTimestamp = undefined;
  event.target.textContent = playing ? 'Pause motion' : 'Play motion';
  if (playing) requestAnimationFrame(animate);
});
function animate(timestamp) {
  if (!playing || benchmarking) return;
  if (previousTimestamp !== undefined) secondsControl.value = (Number(secondsControl.value) + (timestamp - previousTimestamp) / 1000) % 30;
  previousTimestamp = timestamp;
  controls();
  requestAnimationFrame(animate);
}
const percentile = (values, q) => [...values].sort((a, b) => a - b)[Math.ceil(q * values.length) - 1];
async function bench(count = 600, warmup = 120, year = 32) {
  if (benchmarking) throw new Error('Benchmark already running');
  benchmarking = true;
  playing = false;
  frames.length = 0;
  const cpu = [], rawTimestamps = [];
  try {
    await new Promise(resolve => {
      let i = -warmup, previous;
      function frame(timestamp) {
        if (i >= 0 && previous !== undefined) frames.push(timestamp - previous);
        if (i >= 0) rawTimestamps.push(timestamp);
        const t0 = performance.now();
        world.render(year, (i + warmup) / 60);
        if (i >= 0) cpu.push(performance.now() - t0);
        previous = timestamp;
        i++;
        if (i < count) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
    return {
      frames: cpu.length, intervals: frames.length, warmup, year,
      frameMs: { p50: percentile(frames, .5), p95: percentile(frames, .95), p99: percentile(frames, .99) },
      submitMs: { p50: percentile(cpu, .5), p95: percentile(cpu, .95), p99: percentile(cpu, .99) },
      rawFrameMs: [...frames], rawSubmitMs: cpu, rawTimestamps, info: world.info(), device: world.device(),
      caveat: 'Headless requestAnimationFrame timings are approximate and not a headed display measurement.'
    };
  } finally { benchmarking = false; }
}
document.querySelector('#benchmark').addEventListener('click', async () => {
  const results = document.querySelector('#results');
  results.textContent = 'Measuring 600 frames…';
  results.textContent = JSON.stringify(await bench(), null, 2);
});
function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary);
}
window.strata = {
  ready: true, render: (year, seconds, options) => world.render(year, seconds, options),
  raw: () => base64(world.readPixels()), png: () => canvas.toDataURL('image/png'),
  readPixelsForTransport: world.readPixels,
  blobForTransport: () => new Promise(resolve => canvas.toBlob(resolve, 'image/png')),
  finish: () => {
    const gl = world.renderer.getContext();
    gl.finish();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  },
  info: world.info, device: world.device, bench,
  layerTable: world.layerTable,
  labelBounds: world.labelBounds,
  setVariant: world.setVariant,
  titleBounds: world.titleBounds,
  setEra: world.setEra,
  setTypeface: world.setTypeface,
  coverage: world.coverage,
  floorLuma: world.floorLuma,
  roleMask: world.roleMask,
  eraIds: world.eraIds,
  seamCandidates: world.seamCandidates,
  octaveProjection: world.octaveProjection,
  bandCells: world.bandCells,
  inclusionDensity: world.inclusionDensity,
  ringTones: world.ringTones,
  lipOverhang: world.lipOverhang,
  setShadowRoles: world.setShadowRoles,
  setShadowExclusions: world.setShadowExclusions,
  shadowGroups: world.shadowGroups,
  setShadowSides: world.setShadowSides,
  groupMask: world.groupMask,
  applyState: state => world.applyState(state),
  warmState: state => world.warmState(state),
  eraBlock: () => world.eraBlock,
  trenchRules: () => world.eraSite?.()?.trenchRules(),
  capture: async ({ method, year, seconds, shadows = true }) => {
    const t0 = performance.now();
    const info = world.render(year, seconds, { shadows });
    const t1 = performance.now();
    let data;
    if (method === 'png') data = canvas.toDataURL('image/png').split(',')[1];
    else if (method === 'blob') {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      data = base64(new Uint8Array(await blob.arrayBuffer()));
    } else if (method === 'raw') data = base64(world.readPixels());
    else throw new Error(`Unknown capture method: ${method}`);
    return { data, renderSubmitMs: t1 - t0, captureMs: performance.now() - t1, info };
  }
};
controls();
