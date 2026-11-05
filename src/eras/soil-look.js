// Era soil look for the composite section (M1). Every albedo, character and inclusion value here is a look decision (M):
// the pack gives colours only for Modern fill ("yellowish"), Mughal ("light greyish"), Pre-Mauryan ("pale yellow and
// grayish") and the silt ("yellowish clay"). Within the Round 6 colour family the albedos alternate darker and lighter so
// rendered neighbours separate by 5-8 L* (brief section 4, A3 side list item 5); inclusions and texture shift each band's
// rendered mean differently, so the albedos were set from measured M1 band cells, not from a fixed offset. Albedos are D65 Lab targets; lighting and ACES add roughly +7 L*, +3 a*, +9 b* on the
// lit front face (src/palettes.js), so rendered values are measured on the stills, not asserted here.
import { BAND_CHARACTER, BAND_INCLUSIONS } from '../layers.js';
import { BASAL_LAB } from '../palettes.js';

const ch = (base, changes = {}) => Object.freeze({ ...base, ...changes });
// streakLength: horizontal period of the bedding streak in metres (Round 6 used 1.8 everywhere). Shortened so pale marks
// read as short lenses and flecks, not long veins (A3 side list item 2); shortest in the Mughal band (lime flecks).
const STREAK_LENGTH = .35;
export const SILT_LOOK = Object.freeze({
  id: 'silt', lab: [47, 1.6, 11], source: 'P1 "yellowish clay"; texture and value M',
  character: ch({ name: 'fine yellowish clay, few inclusions', mottle: .6, streak: .3, streakThickness: .05, streakLength: STREAK_LENGTH, lump: .12,
    lumpPeriod: .06, speck: .1, patches: .04, relief: .5 }),
  inclusions: { densityPerSquareMetre: 2, diameterMetres: [.004, .015], mix: { charcoal: .5, sherd: .5 } }
});
export const ERA_LOOK = Object.freeze([
  { id: 'pre-mauryan', lab: [37, .9, 6], beds: BASAL_LAB, source: 'pack: "pale yellow and grayish textured soil"; band 7 character',
    character: ch(BAND_CHARACTER[6], { streakLength: STREAK_LENGTH }), inclusions: BAND_INCLUSIONS[6] },
  { id: 'mauryan', lab: [46.7, 1.1, 7.5], source: 'occupation earth (M); sealing floor on top carries the drain (pack); compact with few clods and low relief (M) to part it from the flecked Sunga band',
    character: ch(BAND_CHARACTER[3], { name: 'compact occupation earth, few clods', mottle: 1.0, lump: .3, relief: .6, streakLength: STREAK_LENGTH }),
    seal: { lab: [49, 1, 7], thicknessMetres: [.06, .09], character: ch(BAND_CHARACTER[2], { name: 'compact sealing floor', mottle: .6, streak: .25, lump: .1, speck: .08, patches: .04, relief: .45, streakLength: STREAK_LENGTH }) },
    inclusions: { densityPerSquareMetre: 12, diameterMetres: [.01, .06], mix: { sherd: .5, brickbat: .3, charcoal: .2 } } },
  { id: 'sunga', lab: [41, .8, 5], source: 'band 5 character: darker occupation earth, discrete burnt patches (pack: "a few burnt patches"), no continuous horizon; denser small charcoal flecks, more clods and relief (M)',
    character: ch(BAND_CHARACTER[4], { lump: .8, relief: 1.4, streakLength: STREAK_LENGTH }),
    inclusions: { densityPerSquareMetre: 24, diameterMetres: [.006, .04], mix: { charcoal: .8, brickbat: .2 } } },
  { id: 'kushan', lab: [47.8, 1.4, 9], source: 'occupation earth; burnt-brick fragments the main inclusion (pack: "burnt bricks, which are in the majority")',
    character: ch(BAND_CHARACTER[3], { name: 'occupation earth, burnt-brick fragments', streakLength: STREAK_LENGTH }),
    inclusions: { densityPerSquareMetre: 30, diameterMetres: [.01, .12], mix: { brickbat: .75, sherd: .2, charcoal: .05 }, clusterShare: .4 } },
  { id: 'gupta', lab: [42.5, 1.2, 7.5], source: 'fine crushed-brick grit, compact (M; cue: pack "burnt bricks ... and brick-jelly floors"), against the coarse Kushan brick fragments',
    character: ch(BAND_CHARACTER[3], { name: 'compact earth, fine brick grit', mottle: 1.0, lump: .25, lumpPeriod: .06, speck: .4, streak: .5, patches: .08, relief: .7, streakLength: STREAK_LENGTH }),
    inclusions: { densityPerSquareMetre: 70, diameterMetres: [.005, .025], mix: { brickbat: .8, sherd: .2 } } },
  { id: 'post-gupta', lab: [49.5, 1.3, 9.5], source: 'clotted earth, sparse brick-bats (M; cue: pack walls "made of brick-bats"), against the fine Gupta grit',
    character: ch(BAND_CHARACTER[3], { name: 'clotted earth, sparse brick-bats', lump: 1.05, lumpPeriod: .14, speck: .08, streak: .3, patches: .2, relief: 1.5, streakLength: STREAK_LENGTH }),
    inclusions: { densityPerSquareMetre: 8, diameterMetres: [.03, .10], mix: { brickbat: .6, sherd: .4 } } },
  { id: 'rajput', lab: [39.7, 1.4, 7.5], source: 'band 6 character: occupation earth with rubble (M)', character: ch(BAND_CHARACTER[5], { streakLength: STREAK_LENGTH }), inclusions: BAND_INCLUSIONS[5] },
  { id: 'sultanate', lab: [46, .9, 6.5], source: 'band 3 character: compact sealing earth (pack: seals the Sultanate structures)', character: ch(BAND_CHARACTER[2], { streakLength: STREAK_LENGTH }),
    inclusions: null },
  // M2b: was [54, .6, 4], which rendered 8.5-9.7 L* above both neighbours on the end card (frame 1740) and read as a white
  // streak; lowered towards the 5-8 L* step while staying the lightest, greyest band.
  { id: 'mughal', lab: [51, .7, 5], source: 'pack: "light greyish loose earth mixed with debris of lime floor plasters"; band 2 character, denser lime flecks than Round 6 (M)',
    character: ch(BAND_CHARACTER[1], { streak: .12, streakLength: .3 }), inclusions: { ...BAND_INCLUSIONS[1], densityPerSquareMetre: 70, diameterMetres: [.005, .035] } },
  { id: 'modern-fill', lab: [46, 1, 10.5], source: 'pack: "yellowish loose soil and bands of ash"; band 1 character',
    character: ch(BAND_CHARACTER[0], { streakLength: STREAK_LENGTH }), inclusions: BAND_INCLUSIONS[0] }
].map(Object.freeze));
// Boundaries drawn graded instead of ragged: the base of the Modern fill ("visible in gradient and an uneven manner").
export const GRADED_BOUNDARIES = Object.freeze([9]);
// Seam darkening at ragged boundaries, lowered from Round 6 (.14 over 1-3 cm) so no boundary prints as a thin dark line
// (A3 side list item 5); bands separate by value and texture.
export const SEAM = Object.freeze({ strength: .07, widthMetres: [.02, .04], blendMetres: .012 });
// Weight of the 2.4 m rotated large-mottle octave on the faces (Round 6: .05). Halved as a suspected source of the soft
// diagonal smears (A3 side list item 8); the M1 A/B render with it off is the test, not this comment.
export const LARGE_MOTTLE = .025;
// Face texture (M): octave weights and horizontal stretch of the mottle on vertical faces. Round 6 used weights .55/.36/.13
// and stretch 5.5/5/3, which measured x/y correlation ratios of 6.3-9.9 on the side face (target 2.5-6, A3 items 3-4) and
// gave within-band swings as large as the band steps. The coarse and mid ("cloud") weights were then cut from .36/.3 to
// 70%: they carried most of the soft dark smears in the upper side-face bands (A3 item 8; with both off, the Mughal band's
// low-pass sd fell from 13.0 to 4.2 sRGB codes); with the relief normals off it moved by under 0.2, and with the fill
// lights off the patches stayed and only scaled with the overall brightness.
export const FACE_TEXTURE = Object.freeze({ weights: [.252, .21, .16], stretch: [3.5, 3, 2.5], patchStretch: 3 });
