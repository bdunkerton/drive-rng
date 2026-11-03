import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, place, give, press, steps, spinning, DT } from './_helpers.js';
import { simulateRace } from '../src/sim/headless.js';

test('RAM: a shielded boost that spins out anyone you hit', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 500);
  place(race, others[0], 540);
  give(me, 'speed-boost', 'shield');
  press(race, input, 'useItem');
  assert.ok(me.effects.has('speed-boost') && me.effects.has('shield') && me.effects.has('ram'));
  assert.ok(steps(race, 1.5, () => spinning(others[0])), 'never rammed');
  assert.equal(spinning(me), false);
});

test('STAMPEDE: a boosting giant that spins out whoever it touches', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 500);
  place(race, others[0], 550);
  give(me, 'grow', 'speed-boost');
  press(race, input, 'useItem');
  assert.ok(me.effects.has('giant') && me.effects.has('speed-boost') && me.effects.has('ram'));
  assert.ok(steps(race, 1.5, () => spinning(others[0])));
});

test('HEIST: the rocket steals the front item of whoever it hits', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 500);
  place(race, others[0], 800);
  give(others[0], 'grow');
  give(me, 'rocket', 'magnet');
  press(race, input, 'useItem');
  assert.ok(steps(race, 3, () => spinning(others[0])));
  assert.deepEqual(me.items.map((i) => i.parts), [['grow']]);
  assert.equal(others[0].items.length, 0);
});

test('DECOY: swap with the leader and leave bananas right in front of them', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  const leader = others[0];
  place(race, me, 500);
  place(race, leader, 1200);
  give(me, 'swap', 'banana');
  press(race, input, 'useItem');
  assert.ok(me.progress > 1190 && leader.progress < 510);
  const banana = race.entities.find((e) => e.kind === 'banana');
  const ahead = race.track.project(banana.x, banana.y).s - leader.s;
  assert.ok(ahead > 10 && ahead < 40, `banana is ${ahead} ahead of the leader`);
});

test('combos with no recipe still do every part (and copy runs last)', () => {
  const { race, input, me } = setup({ karts: 1 });
  give(me, 'copy', 'take-two');
  give(me, 'banana');
  press(race, input, 'useItem');
  // TAKE TWO ran first (4 slots), then COPY duplicated the banana into the new room.
  assert.equal(me.slots, 4);
  assert.deepEqual(me.items.map((i) => i.parts), [['banana'], ['banana']]);
});

test('AI races with every powerup in play still finish, on many seeds', () => {
  let fuses = 0;
  let uses = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const { results, timedOut } = simulateRace({
      seed,
      laps: 3,
      karts: 6,
      maxSeconds: 300,
      onSetup(r) {
        r.events.on('item:fuse', () => fuses++);
        r.events.on('item:use', () => uses++);
      },
    });
    assert.equal(timedOut, false, `seed ${seed} timed out`);
    assert.ok(results.every((r) => r.finished && r.lapTimes.length === 3));
  }
  assert.ok(uses > 100, `only ${uses} items used`);
  assert.ok(fuses > 10, `only ${fuses} fuses`);
});
