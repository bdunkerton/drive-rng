import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PowerupRegistry, powerups } from '../src/sim/powerups/registry.js';
import '../src/sim/powerups/index.js';
import { SPEED_BOOST } from '../src/sim/powerups/speedBoost.js';
import { Race } from '../src/sim/race.js';
import { ItemBox, ROULETTE_SECONDS } from '../src/sim/entities.js';
import { Rng } from '../src/core/rng.js';
import { ITEMS } from '../src/config.js';
import meadow from '../src/tracks/meadow.js';

const DT = 1 / 60;

function soloRace() {
  const input = { throttle: 0, brake: 0, steer: 0, useItem: false };
  const race = new Race({ track: meadow, seed: 1, rivals: 0, countdown: 0, humanInput: input });
  return { race, input, kart: race.player };
}

test('the registry refuses duplicate ids and missing use functions', () => {
  const r = new PowerupRegistry();
  r.register({ id: 'x', use() {} });
  assert.throws(() => r.register({ id: 'x', use() {} }), /already registered/);
  assert.throws(() => r.register({ id: 'y' }), /use\(ctx\)/);
});

test('rolls are weighted and can depend on the race situation', () => {
  const r = new PowerupRegistry();
  r.register({ id: 'common', weight: 9, use() {} });
  r.register({ id: 'leader-only', weight: (ctx) => (ctx.position === 1 ? 1 : 0), use() {} });
  const rng = new Rng(5);
  for (let i = 0; i < 200; i++) assert.equal(r.roll(rng, { position: 3 }), 'common');
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(r.roll(rng, { position: 1 }));
  assert.deepEqual([...seen].sort(), ['common', 'leader-only']);
});

test('every registered powerup has a name the HUD font can draw', () => {
  for (const def of powerups.list()) {
    assert.match(def.name, /^[A-Z0-9 .,:!?'\-+=/()<>%#_]+$/, def.id);
    assert.ok(def.name.length <= 12, `${def.id} name is too long for the HUD`);
  }
});

test('driving through an item box gives an item after the roulette', () => {
  const { race, kart } = soloRace();
  const box = new ItemBox(kart.x, kart.y);
  race.spawn(box);
  race.step(DT);
  assert.equal(kart.item, 'speed-boost');
  assert.equal(kart.itemReady, false);
  assert.equal(box.active, false);
  for (let i = 0; i < Math.ceil(ROULETTE_SECONDS / DT) + 1; i++) race.step(DT);
  assert.equal(kart.itemReady, true);
});

test('a kart already holding an item just smashes the box', () => {
  const { race, kart } = soloRace();
  kart.item = 'speed-boost';
  const box = new ItemBox(kart.x, kart.y);
  race.spawn(box);
  const pickups = [];
  race.events.on('item:pickup', (e) => pickups.push(e));
  race.step(DT);
  assert.equal(box.active, false);
  assert.equal(pickups.length, 0);
});

test('boxes come back after the respawn time', () => {
  const { race, kart } = soloRace();
  const box = new ItemBox(kart.x + 500, kart.y);
  race.spawn(box);
  box.onKartTouch(kart, race);
  assert.equal(box.active, false);
  for (let i = 0; i < Math.ceil(ITEMS.boxRespawnSeconds / DT) + 1; i++) race.step(DT);
  assert.equal(box.active, true);
});

test('speed boost raises top speed for its duration, then wears off', () => {
  const { race, input, kart } = soloRace();
  input.throttle = 1;
  for (let i = 0; i < 180; i++) race.step(DT);
  const cruising = kart.forwardSpeed;

  kart.item = 'speed-boost';
  kart.itemHeld = 1;
  input.useItem = true;
  race.step(DT);
  input.useItem = false;
  assert.equal(kart.item, null);
  assert.ok(kart.effects.has('speed-boost'));

  let peak = 0;
  for (let i = 0; i < Math.floor(SPEED_BOOST.duration / DT) - 2; i++) {
    race.step(DT);
    peak = Math.max(peak, kart.forwardSpeed);
  }
  assert.ok(peak > cruising * 1.3, `peak ${peak} vs cruising ${cruising}`);

  for (let i = 0; i < 120; i++) race.step(DT);
  assert.equal(kart.effects.has('speed-boost'), false);
  assert.ok(kart.forwardSpeed <= kart.base.maxSpeed + 0.5);
});

test('items cannot be used during the roulette', () => {
  const { race, input, kart } = soloRace();
  kart.item = 'speed-boost';
  kart.itemRoulette = ROULETTE_SECONDS;
  input.useItem = true;
  race.step(DT);
  assert.equal(kart.item, 'speed-boost');
});
