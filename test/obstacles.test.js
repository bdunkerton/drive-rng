import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, place, give, press, steps } from './_helpers.js';
import { TireStack, placeObstacles } from '../src/sim/obstacles.js';
import { simulateRace } from '../src/sim/headless.js';
import meadow from '../src/tracks/meadow.js';

/** A race with one tyre stack 60px ahead of the player, who drives straight at it. */
function stackAhead() {
  const t = setup({ karts: 1 });
  place(t.race, t.me, 300);
  const stack = t.race.spawn(new TireStack(t.race.track, 360, 0));
  t.input.throttle = 1;
  return { ...t, stack };
}

test('the track lays out its tyre stacks on the road', () => {
  const { race } = setup({ karts: 1 });
  const stacks = placeObstacles(race.track);
  assert.equal(stacks.length, meadow.obstacles.length);
  for (const s of stacks) assert.equal(race.track.surfaceAt(race.track.project(s.x, s.y).lateral), 'road');
});

test('a normal kart bounces off a tyre stack and the stack does not move', () => {
  const { race, me, stack } = stackAhead();
  const hits = [];
  race.events.on('tires:hit', (e) => hits.push(e));
  const { x, y } = stack;
  steps(race, 1.5);
  assert.ok(hits.length > 0, 'never hit the stack');
  assert.equal(stack.x, x);
  assert.equal(stack.y, y);
  assert.ok(me.progress < 360, `drove through it: ${me.progress}`);
});

test('a BULK giant shoves a tyre stack out of the way', () => {
  const { race, input, me, stack } = stackAhead();
  give(me, 'bulk');
  press(race, input, 'useItem');
  const { x, y } = stack;
  steps(race, 1.5);
  assert.ok(Math.hypot(stack.x - x, stack.y - y) > 10, 'the stack did not move');
  assert.ok(me.progress > 360, 'the giant did not get past');
});

test('a SPRING jump flies over a tyre stack', () => {
  const { race, input, me, stack } = stackAhead();
  const hits = [];
  race.events.on('tires:hit', (e) => hits.push(e));
  steps(race, 0.15);
  give(me, 'spring');
  press(race, input, 'useItem');
  steps(race, 0.6);
  assert.equal(hits.length, 0);
  assert.ok(me.progress > stack.s, 'did not clear the stack');
});

test('rivals steer round the tyre stacks and still finish', () => {
  let hits = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const { timedOut } = simulateRace({ seed, laps: 3, karts: 4, maxSeconds: 200, onSetup: (r) => r.events.on('tires:hit', () => hits++) });
    assert.equal(timedOut, false, `seed ${seed} timed out`);
  }
  // Some clipping is fine; driving into them every lap is not.
  assert.ok(hits / (5 * 4 * 3) < 4, `${(hits / 60).toFixed(1)} tyre hits per kart per lap`);
});
