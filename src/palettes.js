import { labToHex } from './soil-colour.js';

// D65 Lab albedo look targets, one soil hue family; bands separate by value and texture. Not soil colourimetry.
// Lighting and ACES add roughly +7 L*, +3 a*, +9 b* on the lit front face, so albedos sit below the rendered targets.
export const SOIL_LAB = [[49, 1, 10], [52.4, .6, 4.5], [48, .9, 7], [44, 1.3, 9], [38, .8, 5.5], [42, 1.4, 8], [37, .9, 6]];
export const BASAL_LAB = { pale: [44, 1.4, 9], grey: [38, .6, 3.5] };
export const PALETTES = Object.freeze({
  clay: {
    id: 'clay', name: 'Neutral clay',
    layers: [0xc4bdae, 0xa7a092, 0xb5ab9a, 0x847e73, 0xa49a89, 0x766f64, 0x918777],
    soil: 0xbeb7a8, brick: 0xb1a794, ring: 0xa89b86, stone: 0x9d978b, damp: 0x766f64
  },
  photo: {
    id: 'photo', name: 'Photo-informed soil and terracotta',
    layers: SOIL_LAB.map(labToHex),
    soil: labToHex(SOIL_LAB[0]), brick: labToHex([47, 7, 12]), ring: 0x9a8771, stone: labToHex([54, 1, 5]), damp: labToHex([43, 1.2, 7]),
    lime: labToHex([63, 2, 9]), burnt: 0x625244, plinth: 0x252522, mud: labToHex([40, 1.2, 6]), sherd: labToHex([60, 2, 6]),
    basal: { pale: labToHex(BASAL_LAB.pale), grey: labToHex(BASAL_LAB.grey) }
  }
});
