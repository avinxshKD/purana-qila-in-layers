// M2b probe: the drain's open-channel cut on the Mauryan top (boundary 2) across the channel at a few x.
import { SEATING, siteBoundaries } from '../../src/eras/seating.js';
import { siteBoundaryGrids } from '../../src/eras/site-state.js';
import { sampleGrid } from '../../src/eras/stack.js';
const r = SEATING.records.find(x => x.id === 'mauryan-drain'), g = siteBoundaryGrids();
console.log('channelPoly', JSON.stringify(r.channelPoly.map(p => p.map(v => +v.toFixed(4)))), 'localBounds', JSON.stringify(r.localBounds));
for (const x of [5, 7, 9.2]) {
  const s = r.surfacePlane.at(x, 6.4);
  console.log(`x ${x}: surface ${s.toFixed(4)} kit base ${r.plane.at(x, 6.4).toFixed(4)}`);
  for (let dz = -.3; dz <= .3001; dz += .025) {
    const z = 6.4 + dz, node = siteBoundaries(x, z)[2] - r.surfacePlane.at(x, z), grid = sampleGrid(g, g.grids[2], x, z) - r.surfacePlane.at(x, z);
    console.log(`  dz ${dz.toFixed(3)} exact ${node.toFixed(4)} grid ${grid.toFixed(4)}`);
  }
}
