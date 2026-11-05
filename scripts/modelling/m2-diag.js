// M2 diagnostics page: the film's world, backend and camera with an eraDebug string (src/eras/soil-shader.js switches),
// no overlays. ?eraDebug=<terms>. window.diag.render(seconds) -> PNG base64; window.diag.ids(seconds) -> era id pass PNG.
import { createLookWorld } from '../../src/museum-scene.js';
import { filmState } from '../../src/film/timeline.js';
import { createFilmBackend } from '../../src/film/backend.js';
import { applyCamera } from '../../src/film/camera.js';
const params = new URLSearchParams(location.search), canvas = document.querySelector('canvas');
const world = createLookWorld(canvas, { width: 1920, height: 1080, antialias: true, preserve: true, view: 'turntable', shadow: 'vsm', soil: 'eras', eraDebug: params.get('eraDebug') || null });
const backend = createFilmBackend(world, 'm1');
function prepare(seconds) { const state = filmState(seconds); backend.apply(state); applyCamera(world.camera, state.seconds, backend.base, backend.top); return state; }
window.diag = {
  ready: true,
  render(seconds) { const s = prepare(seconds); world.renderer.autoClear = true; world.renderer.render(world.scene, world.camera); return { frame: s.frame, png: canvas.toDataURL('image/png').split(',')[1] }; },
  ids(seconds) { const s = prepare(seconds); return { frame: s.frame, png: world.eraIds().png }; }
};
