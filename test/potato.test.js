import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Race } from '../src/sim/race.js';
import meadow from '../src/tracks/meadow.js';
import { POTATO } from '../src/config.js';

const DT = 1 / 60;
const newRace = (opts = {}) => new Race({ track: meadow, seed: 4, rivals: 3, countdown: 0, humanInput: { throttle: 0, brake: 0, steer: 0, useItem: false }, items: false, ...opts });
const run = (race, seconds) => { for (let i = 0; i < seconds * 60; i++) race.step(DT); };

test('the potato is on when items are off, and off with items unless asked for', () => {
  assert.ok(newRace().potato);
  assert.equal(newRace({ items: true }).potato, null);
  assert.equal(newRace({ potato: false }).potato, null);
  assert.ok(newRace({ items: true, potato: true }).potato);
});

test('it turns up with whoever is last, shortly after the start', () => {
  const race = newRace();
  run(race, POTATO.firstDelay - 0.2);
  assert.equal(race.potato.holder, null);
  run(race, 0.4);
  assert.equal(race.potato.holder, race.order[race.order.length - 1]);
  assert.ok(race.potato.holder.hasPotato);
});

test('the holder is faster', () => {
  const race = newRace();
  const k = race.karts[1];
  const plain = k.stats().maxSpeed;
  race.potato.give(k, null);
  assert.ok(k.stats().maxSpeed > plain);
});

test('touching passes it on, with a fresh fuse, and you cannot get it straight back', () => {
  const race = newRace();
  const [a, b] = race.karts;
  race.potato.give(a, null);
  race.potato.heldFor = 1;
  race.potato.fuse = 1.5;
  race.potato.touch(a, b);
  assert.equal(race.potato.holder, b);
  assert.equal(race.potato.fuse, POTATO.fuseSeconds);
  assert.ok(!a.hasPotato && b.hasPotato);
  race.potato.heldFor = 1;
  race.potato.touch(b, a);
  assert.equal(race.potato.holder, b, 'no tag-backs');
});

test('a brand-new holder cannot pass it on instantly', () => {
  const race = newRace();
  const [a, b, c] = race.karts;
  race.potato.give(a, null);
  race.potato.heldFor = 1;
  race.potato.touch(a, b);
  race.potato.touch(b, c);
  assert.equal(race.potato.holder, b);
});

test('when the fuse runs out the holder spins and it comes back with someone else', () => {
  const race = newRace();
  run(race, POTATO.firstDelay + 0.1);
  const victim = race.potato.holder;
  race.potato.fuse = 0.01;
  let boomed = null;
  race.events.on('potato:boom', ({ kart }) => (boomed = kart));
  race.step(DT);
  assert.equal(boomed, victim);
  assert.ok(victim.effects.has('spinout'));
  assert.equal(race.potato.holder, null);
  run(race, POTATO.respawnSeconds + 0.1);
  assert.ok(race.potato.holder && race.potato.holder !== victim);
});

test('AI races with the potato finish, and it changes hands', () => {
  let passes = 0;
  for (const seed of [1, 2, 3]) {
    const race = new Race({ track: meadow, seed, rivals: 5, countdown: 0, humanInput: null, laps: 2, items: false });
    for (let i = 0; i < 60 * 150 && race.phase !== 'done'; i++) race.step(DT);
    assert.equal(race.phase, 'done');
    passes += race.potato.passes;
  }
  assert.ok(passes > 5, `passes ${passes}`);
});
