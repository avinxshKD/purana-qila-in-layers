// M2b probe: lip loss across the three 1 m baulks between trenches, Round 6 profile (lipErosionParts) vs lip break.
import { lipErosionParts, lipBreakParts } from '../../src/earth-edges.js';
const sum = parts => parts.reduce((s, [, a]) => s + a, 0);
for (const [name, f] of [['round6', lipErosionParts], ['break', lipBreakParts]]) {
  for (const x0 of [-6, -1, 4]) {
    let maxLoss = 0, flat = [], at = { '.05': [], '.10': [], '.20': [], '.30': [] };
    for (let z = 4.6; z <= 7.95; z += .05) {
      let w = 0;
      for (let x = x0; x <= x0 + 1 + 1e-9; x += .01) { const l = sum(f(x, z)); maxLoss = Math.max(maxLoss, l); if (l < .01) w += .01; }
      flat.push(w);
      for (const k of Object.keys(at)) at[k].push(sum(f(x0 + Number(k), z)));
    }
    const mean = a => (a.reduce((p, q) => p + q, 0) / a.length).toFixed(3);
    console.log(name, `baulk x ${x0}..${x0 + 1}`, 'max loss', maxLoss.toFixed(3), 'mean loss at', Object.entries(at).map(([k, a]) => `${k} m ${mean(a)}`).join(', '), 'flat width (loss<1 cm) mean', mean(flat), 'min', Math.min(...flat).toFixed(2));
  }
}
