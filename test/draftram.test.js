import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Race } from '../src/sim/race.js';
import { IdleController } from '../src/sim/controllers.js';
import meadow from '../src/tracks/meadow.js';
import { DRAFT } from '../src/config.js';

// Two karts on the front straight (it runs roughly east from the start line).
function pair({ gap = 20, side = 0, speedAhead = 150, speedBehind = 150, headingBehind = 0 } = {}) {
  const input = { throttle: 1, brake: 0, steer: 0, useItem: false };
  const race = new Race({ track: meadow, seed: 1, rivals: 1, countdown: 0, humanInput: input, items: false });
  const [me, rival] = [race.player, race.karts.find((k) => !k.isPlayer)];
  const start = race.track.pointAt(race.track.length * 0.02);
  const h = start.angle;
  const fx = Math.cos(h), fy = Math.sin(h);
  rival.x = start.x + fx * 40; rival.y = start.y + fy * 40; rival.heading = h;
  rival.vx = fx * speedAhead; rival.vy = fy * speedAhead;
  me.x = rival.x - fx * (gap + 10) - fy * side; me.y = rival.y - fy * (gap + 10) + fx * side;
  me.heading = h + headingBehind; me.vx = Math.cos(me.heading) * speedBehind; me.vy = Math.sin(me.heading) * speedBehind;
  rival.controller = new IdleController();
  for (const k of race.karts) race.applyTrack(k);
  return { race, me, rival, input };
}

test('sitting in the wake fills the draft and raises top speed', () => {
  const { race, me, rival } = pair({ gap: 30 });
  rival.controller = { update(k) { k.controls.throttle = 1; k.controls.steer = 0; k.controls.brake = 0; } };
  const plain = me.stats().maxSpeed;
  for (let i = 0; i < 30; i++) race.step(1 / 60);
  assert.ok(me.draft > 0.3, `draft ${me.draft}`);
  assert.equal(me.draftingBehind, rival);
  assert.ok(me.stats().maxSpeed > plain);
  assert.equal(rival.draft, 0, 'the leader gets nothing');
});

test('out of the wake the draft fades (the slingshot), it does not vanish at once', () => {
  const { race, me } = pair({ gap: 30 });
  me.draft = 1;
  me.x += 0; me.y += 60; // well off to the side
  race.applyTrack(me);
  race.updateDrafts(1 / 60);
  assert.ok(me.draft > 0.9 && me.draft < 1);
  race.updateDrafts(DRAFT.fadeSeconds);
  assert.equal(me.draft, 0);
});

test('a hit on the rear quarter spins the kart ahead', () => {
  const { race, me, rival } = pair({ gap: 1, side: 6, speedAhead: 100, speedBehind: 170 });
  let rammed = false;
  race.events.on('ram', ({ by, kart }) => { rammed = by === me && kart === rival; });
  for (let i = 0; i < 20 && !rammed; i++) race.step(1 / 60);
  assert.ok(rammed, 'rammed');
  assert.ok(rival.effects.has('spinout'));
  assert.ok(!me.effects.has('spinout'));
  assert.ok(me.forwardSpeed > 120, `rammer kept its speed: ${me.forwardSpeed}`);
});

test('a dead-centre hit from behind only shoves', () => {
  const { race, rival } = pair({ gap: 1, side: 0, speedAhead: 100, speedBehind: 170 });
  for (let i = 0; i < 20; i++) race.step(1 / 60);
  assert.ok(!rival.effects.has('spinout'));
});

test('a gentle nudge does not count', () => {
  const { race, me, rival, input } = pair({ gap: 1, side: 6, speedAhead: 150, speedBehind: 160 });
  input.throttle = 0;
  rival.controller = { update(k) { k.controls.throttle = 1; k.controls.steer = 0; k.controls.brake = 0; } };
  assert.ok(me);
  for (let i = 0; i < 30; i++) race.step(1 / 60);
  assert.ok(!rival.effects.has('spinout'));
});

test('a kart that just spun cannot be spun again straight away', () => {
  const { race, me, rival } = pair({ gap: 1, side: 6, speedAhead: 100, speedBehind: 170 });
  rival.spunAt = 0;
  race.time = 0.5;
  for (let i = 0; i < 20; i++) race.step(1 / 60);
  assert.ok(!rival.effects.has('spinout'));
  assert.ok(me);
});
