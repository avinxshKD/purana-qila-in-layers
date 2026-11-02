import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayerTable, validateLayerTable, subtractRectangle, subtractConvex, clipDepth, cutOnFace, surfaceHeight, FRACTIONS, lipOverhang } from '../src/layers.js';
import { visibleBoundary } from '../src/strata-surface.js';
import { axisFraction, ERAS } from '../src/labels.js';
import { hexToLab, deltaE2000 } from '../src/soil-colour.js';
import { PALETTES } from '../src/palettes.js';
import { arcAngle } from '../src/museum-scene.js';
import { gradientNoise } from '../src/soil-noise.js';
import { OUTER_EDGES, edgeDeviationMetrics } from '../src/earth-edges.js';
import { addStrata } from '../src/strata-surface.js';
import * as THREE from 'three';

function area(poly) {
  return Math.abs(poly.reduce((sum, a, i) => {
    const b = poly[(i + 1) % poly.length];
    return sum + a[0] * b[1] - a[1] * b[0];
  }, 0) / 2);
}

test('the synthetic layer table has continuous positive-depth bands on every face', () => {
  const table = validateLayerTable(createLayerTable());
  assert.equal(table.layers.at(-1).faces['outer-2'].at(-1).bottomDepth - table.layers[0].faces['outer-2'].at(-1).topDepth, table.proportions.depth);
  assert.equal(table.faces.filter(face => face.inward).length, 15);
  assert.ok(table.layers[1].faces['outer-0'].some((s, i, a) => i && s.topDepth !== a[i - 1].topDepth));
});

test('a cutting feature removes area rather than covering layers with a decal', () => {
  const subject = [[0, 0], [4, 0], [4, 4], [0, 4]];
  const pieces = subtractRectangle(subject, { xmin: 1, xmax: 3, ymin: 1, ymax: 3 });
  assert.equal(pieces.reduce((sum, p) => sum + area(p), 0), 12);
  assert.equal(subtractRectangle(subject, { xmin: -1, xmax: 5, ymin: -1, ymax: 5 }).reduce((s, p) => s + area(p), 0), 0);
  assert.equal(subtractRectangle(subject, { xmin: 6, xmax: 8, ymin: 1, ymax: 3 }).reduce((s, p) => s + area(p), 0), 16);
});

test('trench walls stop at their excavation floor', () => {
  const poly = [[0, 10], [1, 10], [1, 15], [0, 15]];
  const clipped = clipDepth(poly, 13.5);
  assert.ok(clipped.every(p => p[1] <= 13.5));
  assert.equal(area(clipped), 3.5);
});

test('the open-front well pit cuts the face while leaving the convex rings behind it', () => {
  const table = createLayerTable(), shaft = table.proportions.shaft, pit = table.cuts.find(cut => cut.id === 'well-pit'), cut = cutOnFace(pit, table.faces[0]);
  assert.ok(cut.xmin < cut.xmax);
  assert.equal(cut.ymin, pit.topDepth);
  assert.equal(cut.ymax, pit.bottomDepth);
  assert.equal(cutOnFace(pit, table.faces[2]), null);
  assert.ok(Math.abs(8 - shaft.z - shaft.ringRadius - .125) < 1e-12);
  assert.ok(Math.abs((pit.xmax - pit.xmin - .7) / 2 - .175) < 1e-12);
  const samples = table.layers[0].faces['outer-0'];
  const nearest = samples.reduce((best, sample, i) => Math.abs(sample.t - (shaft.x + 12) / 24)
    < Math.abs(samples[best].t - (shaft.x + 12) / 24) ? i : best, 0);
  assert.ok(table.layers.filter(layer => layer.faces['outer-0'][nearest].topDepth < cut.ymax
    && layer.faces['outer-0'][nearest].bottomDepth > cut.ymin).length > 1);
});

test('four square trenches step down-slope with intact baulks', () => {
  const table = createLayerTable(), trenches = table.proportions.trenches;
  assert.equal(trenches.length, 4);
  assert.ok(surfaceHeight(-12, -8) > surfaceHeight(12, 8));
  trenches.forEach((trench, i) => {
    assert.equal(trench.xmax - trench.xmin, trench.zmax - trench.zmin);
    if (i) {
      assert.ok(Math.abs(trench.xmin - trenches[i - 1].xmax - 1) < 1e-8);
      assert.ok(trench.depth > trenches[i - 1].depth);
    }
  });
});

test('a convex shaft opening is actually subtracted from the trench floor', () => {
  const subject = [[0, 0], [4, 0], [4, 4], [0, 4]], hole = [[1, 1], [3, 1], [3, 3], [1, 3]];
  assert.equal(subtractConvex(subject, hole).reduce((s, poly) => s + area(poly), 0), 12);
});

test('invalid or discontinuous layer data is rejected', () => {
  const table = createLayerTable();
  table.layers[1].faces['outer-0'][2].topDepth += 1;
  assert.throws(() => validateLayerTable(table), /Non-contiguous/);
});

test('ring nesting preserves all three reported approximate dimensions', () => {
  const shaft = createLayerTable().proportions.shaft;
  assert.equal(shaft.ringRadius * 2, .7);
  assert.ok(shaft.radius > shaft.ringRadius);
  assert.equal(shaft.rings, 18);
  assert.equal(shaft.ringHeight, .15);
  assert.ok(Math.abs((shaft.rings - 1) * shaft.visiblePitch + shaft.ringHeight - 2.2) < 1e-10);
  assert.ok(shaft.visiblePitch < shaft.ringHeight);
  assert.match(shaft.modellingAssumption, /nested/);
});

test('material variation is seeded and inclusions require explicit support', () => {
  const a = createLayerTable(), b = createLayerTable();
  assert.deepEqual(a, b);
  assert.ok(a.layers.some(layer => layer.lenses.length));
  for (const layer of a.layers) {
    assert.equal(layer.noise.amplitude, 1);
    assert.ok(layer.noise.character && layer.noise.character.mottle > 0);
    if (!layer.description.inclusion) assert.equal(layer.inclusions.densityPerSquareMetre, 0);
    if (layer.description.inclusion) assert.ok(layer.description.sourceId && layer.description.support);
  }
});

test('section boundary lines are clipped at cuts and excavation floors', () => {
  assert.deepEqual(visibleBoundary([0, 5], [1, 5], 10, [{ xmin: .25, xmax: .75, ymin: 4, ymax: 6 }]),
    [[[0, 5], [.25, 5]], [[.75, 5], [1, 5]]]);
  assert.deepEqual(visibleBoundary([0, 12], [1, 12], 10, []), []);
});

test('baulks follow the near-planar slope without a crown or false peaks', () => {
  const p = createLayerTable().proportions;
  assert.deepEqual([p.width, p.length, p.slopeRise], [24, 16, 5]);
  for (let x = -11; x < 11; x++) assert.ok(Math.abs(surfaceHeight(x, 0) - (2.5 - x * 5 / 48)) < .04);
  assert.ok(surfaceHeight(-5.5, 4.2) - surfaceHeight(-5.5, 7.8) > .3);
});

test('soil albedos share one hue family and neighbours separate by value, not hue', () => {
  const thickness = FRACTIONS.slice(1).map((f, i) => f - FRACTIONS[i]);
  assert.ok(Math.max(...thickness) / Math.min(...thickness) >= 4);
  const labs = PALETTES.photo.layers.map(hexToLab).map(lab => [lab.L, lab.a, lab.b]);
  for (const [L, a, b] of labs) {
    const hue = Math.atan2(b, a) * 180 / Math.PI;
    assert.ok(hue >= 70 && hue <= 85 && Math.hypot(a, b) <= 22, `hue ${hue}`);
  }
  for (let i = 1; i < labs.length - 1; i++) {
    assert.ok(Math.abs(labs[i][0] - labs[i - 1][0]) >= 3 && Math.abs(labs[i][1] - labs[i - 1][1]) <= 4 && Math.abs(labs[i][2] - labs[i - 1][2]) <= 6);
    assert.ok(deltaE2000(labs[i - 1], labs[i]) >= 3 && deltaE2000(labs[i - 1], labs[i]) <= 8);
  }
  assert.ok(labs[0][2] > labs[1][2]);
  assert.ok(labs[6][0] < labs[5][0]);
  assert.ok(createLayerTable().layers[3].lenses.some(lens => lens.faceId === 'outer-0'));
});

test('erosion only truncates bands and no lip overhangs the face below', () => {
  const table = createLayerTable();
  for (const face of table.faces) for (const [i, sample] of table.layers[0].faces[face.id].entries()) {
    const x = face.from[0] + sample.t * (face.to[0] - face.from[0]), z = face.from[1] + sample.t * (face.to[1] - face.from[1]);
    assert.ok(Math.abs(sample.topDepth + surfaceHeight(x, z)) < 1e-12);
    assert.ok(table.layers[1].faces[face.id][i].topDepth > sample.topDepth);
  }
  assert.ok(lipOverhang(table).maximumMetres <= .005);
});

test('well wall assumption and faded continuation never affect excavated deposits', () => {
  const p = createLayerTable().proportions;
  assert.equal(p.shaft.wallThickness, .04);
  assert.equal(p.shaft.ringRadius - p.shaft.innerRadius, .03999999999999998);
  assert.ok(Math.abs(p.bottomDepth - p.fadeStartDepth - 1.5) < 1e-12);
  assert.ok(createLayerTable().cuts.every(cut => cut.bottomDepth <= p.fadeStartDepth + .12 + 1e-10));
  assert.equal(p.pit, undefined);
});

test('CIEDE2000 matches published Sharma/Wu/Dalal supplementary fixtures', () => {
  // Retrieved 2026-11-02: https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/dataNprograms/ciede2000testdata.txt
  const fixtures = [
    [50, 2.6772, -79.7751, 50, 0, -82.7485, 2.0425], [50, 3.1571, -77.2803, 50, 0, -82.7485, 2.8615],
    [50, 2.8361, -74.0200, 50, 0, -82.7485, 3.4412], [50, -1.3802, -84.2814, 50, 0, -82.7485, 1],
    [50, 0, 0, 50, -1, 2, 2.3669], [50, -1, 2, 50, 0, 0, 2.3669],
    [50, 2.49, -.001, 50, -2.49, .0009, 7.1792], [50, 2.49, -.001, 50, -2.49, .001, 7.1792],
    [50, 2.49, -.001, 50, -2.49, .0011, 7.2195], [50, -.001, 2.49, 50, .0009, -2.49, 4.8045],
    [50, -.001, 2.49, 50, .0011, -2.49, 4.7461], [50, 2.5, 0, 50, 0, -2.5, 4.3065],
    [50, 2.5, 0, 73, 25, -18, 27.1492], [60.2574, -34.0099, 36.2677, 60.4626, -34.1751, 39.4387, 1.2644],
    [6.7747, -.2908, -2.4247, 5.8714, -.0985, -2.2286, .6377], [2.0776, .0795, -1.1350, .9033, -.0636, -.5514, .9082]
  ];
  for (const fixture of fixtures) assert.ok(Math.abs(deltaE2000(fixture.slice(0, 3), fixture.slice(3, 6)) - fixture[6]) < .00005);
});

test('gradient relief and erosion remain seeded with bounded edge bites', () => {
  assert.equal(gradientNoise(1.23, 4.56, 7.89, 411), gradientNoise(1.23, 4.56, 7.89, 411));
  assert.notEqual(gradientNoise(1.23, 4.56, 7.89, 411), gradientNoise(1.23, 4.56, 7.89, 412));
  for (const edge of OUTER_EDGES) {
    assert.ok(edge.bites.length === 2 || edge.bites.length === 3);
    assert.ok(edge.bites.every(bite => bite.depth >= .2 && bite.depth <= .4));
  }
  for (const metric of edgeDeviationMetrics(surfaceHeight)) assert.ok(metric.rmsMetres.mean > 0 && Number.isFinite(metric.rmsMetres.maximum));
});

test('shader seam distance attributes are finite and aligned to the actual clipped polygons', () => {
  const table = createLayerTable(), meshes = [];
  const stats = addStrata(table, (geometry, material) => meshes.push({ geometry, material }),
    (color, options) => new THREE.MeshStandardMaterial({ color, ...options }), 1080, new THREE.Scene(), PALETTES.photo);
  assert.equal(stats.drawnLines, 0);
  for (const { geometry, material } of meshes) {
    const distance = geometry.attributes.strataDistances;
    if (distance) {
      assert.equal(distance.count, geometry.attributes.position.count);
      assert.ok(Array.from(distance.array).every(value => Number.isFinite(value) && value >= 0));
      assert.ok(Array.from(distance.array).some(value => value === 0));
    }
    for (const attribute of Object.values(geometry.attributes)) assert.ok(Array.from(attribute.array).every(Number.isFinite));
    geometry.dispose(); material.dispose();
  }
});

test('turntable is a centred sixty-degree twelve-second sine arc', () => {
  assert.ok(Math.abs(arcAngle(0) + Math.PI / 6) < 1e-12);
  assert.ok(Math.abs(arcAngle(6)) < 1e-12);
  assert.ok(Math.abs(arcAngle(12) - Math.PI / 6) < 1e-12);
  assert.equal(arcAngle(-1), arcAngle(0));
  assert.equal(arcAngle(100), arcAngle(12));
});

test('the timeline is proportional and preserves the 1500–1600 gap', () => {
  assert.equal(axisFraction(-539), 0);
  assert.equal(axisFraction(2023), 1);
  assert.ok(Math.abs(axisFraction(1600) - axisFraction(1500) - 100 / 2562) < 1e-10);
  assert.equal(ERAS.find(era => era.id === 'sunga').dates, '200 BCE – 1 CE');
});
