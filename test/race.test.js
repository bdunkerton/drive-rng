import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Race } from '../src/sim/race.js';
import { IdleController } from '../src/sim/controllers.js';
import { simulateRace } from '../src/sim/headless.js';
import meadow from '../src/tracks/meadow.js';

const DT = 1 / 60;

function soloRace(opts = {}) {
  const input = { throttle: 0, brake: 0, steer: 0, useItem: false };
  const race = new Race({ track: meadow, seed: 1, rivals: 0, countdown: 0, humanInput: input, ...opts });
  return { race, input, kart: race.player };
}

/** Put a kart at a loop distance and lateral offset, facing along the track. */
function place(race, kart, s, lateral = 0) {
  const p = race.track.pointAt(s, lateral);
  kart.x = p.x;
  kart.y = p.y;
  kart.heading = p.angle;
  kart.vx = kart.vy = 0;
  kart.trackIndex = -1;
}

test('nobody moves during the countdown', () => {
  const { race, input, kart } = soloRace({ countdown: 3 });
  input.throttle = 1;
  const x = kart.x;
  for (let i = 0; i < 60; i++) race.step(DT);
  assert.equal(race.phase, 'countdown');
  assert.equal(kart.x, x);
  for (let i = 0; i < 150; i++) race.step(DT);
  assert.equal(race.phase, 'racing');
  assert.notEqual(kart.x, x);
});

test('holding the throttle on a straight reaches top speed and no more', () => {
  const { race, input, kart } = soloRace();
  input.throttle = 1;
  for (let i = 0; i < 180; i++) race.step(DT);
  assert.ok(kart.forwardSpeed > kart.base.maxSpeed * 0.95, `speed ${kart.forwardSpeed}`);
  assert.ok(kart.forwardSpeed <= kart.base.maxSpeed + 0.01);
});

test('grass slows you down', () => {
  const road = soloRace();
  const grass = soloRace();
  place(grass.race, grass.kart, 0, grass.race.track.halfWidth + 15);
  grass.race.applyTrack(grass.kart);
  assert.equal(grass.kart.surface, 'grass');
  for (const r of [road, grass]) {
    r.input.throttle = 1;
    for (let i = 0; i < 90; i++) r.race.step(DT);
  }
  assert.ok(grass.kart.forwardSpeed < road.kart.forwardSpeed * 0.65);
});

test('the fence keeps karts on the course', () => {
  const { race, input, kart } = soloRace();
  input.throttle = 1;
  input.steer = 1; // turn hard right forever
  for (let i = 0; i < 600; i++) {
    race.step(DT);
    assert.ok(Math.abs(kart.lateral) <= race.track.fenceOffset);
  }
});

test('crossing the line backwards and forwards again does not count a lap', () => {
  const { race, kart } = soloRace();
  kart.controller = new IdleController();
  const L = race.track.length;
  // Drive the kart's position along by hand, just past the line, back, and past again.
  for (const s of [-30, -10, 10, 30, 10, -10, -30, -10, 10, 30]) {
    place(race, kart, s);
    race.step(DT);
  }
  assert.equal(kart.lapsDone, 0);
  // Now go all the way round.
  for (let s = 30; s <= L + 20; s += 10) {
    place(race, kart, s);
    race.step(DT);
  }
  assert.equal(kart.lapsDone, 1);
});

test('finishing every lap ends the race with a result for everyone', () => {
  const { race, kart } = soloRace({ laps: 2 });
  kart.controller = new IdleController();
  const L = race.track.length;
  const ends = [];
  race.events.on('finish', (e) => ends.push(e));
  for (let s = 0; s <= 2 * L + 20; s += 10) {
    place(race, kart, s);
    race.step(DT);
  }
  assert.equal(kart.finished, true);
  assert.equal(ends.length, 1);
  assert.equal(race.phase, 'done');
  assert.equal(race.results()[0].lapTimes.length, 2);
});

test('positions follow distance travelled', () => {
  const input = { throttle: 0, brake: 0, steer: 0, useItem: false };
  const race = new Race({ track: meadow, seed: 3, rivals: 2, countdown: 0, humanInput: input });
  race.karts.forEach((k) => (k.controller = new IdleController()));
  const [a, b, c] = race.karts;
  place(race, a, 300);
  place(race, b, 900);
  place(race, c, 600);
  race.step(DT);
  assert.deepEqual([a.position, b.position, c.position], [3, 1, 2]);
});

test('AI rivals finish a three-lap race on their own, on several seeds', () => {
  for (const seed of [1, 2, 3, 'chaos']) {
    const { results, timedOut } = simulateRace({ seed, laps: 3, karts: 4, maxSeconds: 240 });
    assert.equal(timedOut, false, `seed ${seed} timed out`);
    assert.ok(results.every((r) => r.finished));
    // Sanity: laps take between 20 and 60 seconds.
    for (const r of results) for (const t of r.lapTimes) assert.ok(t > 20 && t < 60, `${r.name} lap ${t}`);
  }
});

test('the same seed replays the same AI race exactly', () => {
  const a = simulateRace({ seed: 99, laps: 1 }).results.map((r) => [r.name, r.time]);
  const b = simulateRace({ seed: 99, laps: 1 }).results.map((r) => [r.name, r.time]);
  assert.deepEqual(a, b);
});
