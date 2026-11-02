import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rng } from '../src/core/rng.js';

test('the same seed gives the same sequence', () => {
  const a = new Rng(42);
  const b = new Rng(42);
  for (let i = 0; i < 100; i++) assert.equal(a.next(), b.next());
});

test('string seeds work and differ from each other', () => {
  assert.equal(new Rng('banana').next(), new Rng('banana').next());
  assert.notEqual(new Rng('banana').next(), new Rng('apple').next());
});

test('values stay in range', () => {
  const r = new Rng(7);
  for (let i = 0; i < 1000; i++) {
    const v = r.next();
    assert.ok(v >= 0 && v < 1);
    const n = r.int(2, 5);
    assert.ok(n >= 2 && n <= 5 && Number.isInteger(n));
  }
});

test('weighted picks respect weights and skip zero weights', () => {
  const r = new Rng(1);
  const counts = { a: 0, b: 0, never: 0 };
  for (let i = 0; i < 4000; i++) {
    counts[r.weighted([{ item: 'a', weight: 3 }, { item: 'b', weight: 1 }, { item: 'never', weight: 0 }])]++;
  }
  assert.equal(counts.never, 0);
  assert.ok(counts.a > counts.b * 2.4 && counts.a < counts.b * 3.6, JSON.stringify(counts));
});

test('weighted returns null when nothing can win', () => {
  assert.equal(new Rng(1).weighted([{ item: 'x', weight: 0 }]), null);
  assert.equal(new Rng(1).weighted([]), null);
});
