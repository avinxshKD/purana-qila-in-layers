import test from 'node:test';
import assert from 'node:assert/strict';
import { timeState } from '../src/time.js';
import { mulberry32 } from '../src/rng.js';

test('seeded sequences repeat and stay in the unit interval', () => {
  const a = mulberry32(513), b = mulberry32(513), c = mulberry32(514);
  const first = Array.from({ length: 1000 }, a);
  assert.deepEqual(first, Array.from({ length: 1000 }, b));
  assert.notDeepEqual(first, Array.from({ length: 1000 }, c));
  assert.ok(first.every(value => value >= 0 && value < 1));
});

test('time state does not depend on evaluation order', () => {
  const initial = timeState(57, 7.25);
  timeState(100, 30);
  timeState(0, -12);
  assert.deepEqual(timeState(57, 7.25), initial);
});

test('placeholder transitions reach both endpoints', () => {
  const early = timeState(0, 0), late = timeState(100, 30);
  assert.equal(early.construction, 0);
  assert.equal(early.collapse, 0);
  assert.equal(early.soilHeight, 0);
  assert.equal(late.construction, 1);
  assert.equal(late.collapse, 1);
  assert.equal(late.soilHeight, 8);
  assert.equal(timeState(20, 0).scaffold, true);
  assert.equal(late.scaffold, false);
});

test('invalid time inputs are rejected', () => {
  for (const invalid of [NaN, Infinity, -Infinity, undefined, '32']) {
    assert.throws(() => timeState(invalid, 0), TypeError);
    assert.throws(() => timeState(0, invalid), TypeError);
  }
});
