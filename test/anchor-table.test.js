import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ANCHOR_TABLE } from '../src/eras/anchor-table.js';
import { anchorStateKey } from '../src/eras/site-state.js';
import { filmState } from '../src/film/timeline.js';
import { anchorSourceHash } from '../scripts/modelling/anchor-sources.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const copy = JSON.parse(fs.readFileSync(new URL('../reference/film-callouts.json', import.meta.url), 'utf8'));

test('static anchor table is generated from the current sources (rerun scripts/modelling/anchor-table.mjs)', () => {
  assert.ok(ANCHOR_TABLE, 'anchor table missing');
  assert.equal(ANCHOR_TABLE.sourceHash, anchorSourceHash(root));
});

test('every film frame has a table state, and every active callout a visible anchor point', () => {
  for (let frame = 0; frame < 1800; frame++) {
    const st = filmState(frame / 30), entry = ANCHOR_TABLE.states[anchorStateKey(st.scene)];
    assert.ok(entry, `frame ${frame} has no table state`);
    for (const c of st.overlays.callouts) {
      if (!(c.opacity > 0)) continue;
      const id = copy.sections[c.sectionIndex].callouts[c.slot].featureId, i = ANCHOR_TABLE.features.indexOf(id);
      if (i < 0) continue;
      assert.ok(entry[i] >= 0 && (entry[i] & 1) === 1, `frame ${frame}: ${id} has no visible table anchor`);
      assert.ok(ANCHOR_TABLE.points[entry[i] >> 1].slice(0, 6).every(Number.isFinite));
    }
  }
});
