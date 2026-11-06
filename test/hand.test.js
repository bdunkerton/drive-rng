import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, give, press, DT } from './_helpers.js';
import { ItemBox, ROULETTE_SECONDS } from '../src/sim/entities.js';
import { makeItem, itemName, giveItem } from '../src/sim/hand.js';
import { powerups } from '../src/sim/powerups/index.js';
import { ITEMS } from '../src/config.js';

test('karts start with two empty slots', () => {
  const { me } = setup();
  assert.equal(me.slots, ITEMS.slots);
  assert.equal(me.slots, 2);
  assert.deepEqual(me.items, []);
});

test('driving through an item box fills a slot after the roulette', () => {
  const { race, me } = setup();
  const box = race.spawn(new ItemBox(me.x, me.y));
  race.step(DT);
  assert.equal(me.items.length, 1);
  assert.equal(me.itemReady, false);
  assert.equal(box.active, false);
  for (let i = 0; i < Math.ceil(ROULETTE_SECONDS / DT) + 1; i++) race.step(DT);
  assert.equal(me.itemReady, true);
});

test('a full hand just smashes the box', () => {
  const { race, me } = setup();
  give(me, 'bulk');
  give(me, 'bulk');
  const pickups = [];
  race.events.on('item:pickup', (e) => pickups.push(e));
  const box = race.spawn(new ItemBox(me.x, me.y));
  race.step(DT);
  assert.equal(box.active, false);
  assert.equal(pickups.length, 0);
  assert.equal(me.items.length, 2);
  assert.equal(giveItem(me, makeItem(['boost'])), 'dropped');
});

test('space uses the front item only', () => {
  const { race, input, me } = setup();
  give(me, 'bumper');
  give(me, 'ghost');
  press(race, input, 'useItem');
  assert.ok(me.effects.hasTag('bumper'));
  assert.deepEqual(me.items.map((i) => i.parts), [['ghost']]);
});

test('C moves the front item to the back', () => {
  const { race, input, me } = setup();
  give(me, 'bumper');
  give(me, 'ghost');
  press(race, input, 'cycle');
  assert.deepEqual(me.items.map((i) => i.parts[0]), ['ghost', 'bumper']);
});

test('F fuses the front two in order, and a fused item cannot fuse again', () => {
  const { race, input, me } = setup();
  give(me, 'black-hole');
  give(me, 'boost');
  press(race, input, 'fuse');
  assert.equal(me.items.length, 1);
  assert.deepEqual(me.items[0].parts, ['black-hole', 'boost']);
  assert.equal(itemName(me.items[0]), 'WHITE HOLE');
  give(me, 'spring');
  press(race, input, 'fuse');
  assert.equal(me.items.length, 2, 'fused a fused item');
});

test('items still spinning in the roulette cannot be used or fused', () => {
  const { race, input, me } = setup();
  me.items.push(makeItem(['bumper'], ROULETTE_SECONDS));
  me.items.push(makeItem(['bumper'], ROULETTE_SECONDS));
  press(race, input, 'fuse');
  assert.equal(me.items.length, 2);
  press(race, input, 'useItem');
  assert.equal(me.effects.hasTag('bumper'), false);
});

test('a first race scripts the first two boxes, then it is random again', () => {
  const { race, me } = setup({ firstPickups: ITEMS.firstPickups });
  assert.equal(me.tutorialFuse, true);
  for (let i = 0; i < 2; i++) {
    race.spawn(new ItemBox(me.x, me.y));
    race.step(DT);
    race.entities = [];
  }
  assert.deepEqual(me.items.map((it) => it.parts[0]), ITEMS.firstPickups);
  assert.deepEqual(me.scriptedPickups, []);
});

test('every possible item has a name the HUD can draw', () => {
  const ids = powerups.list().map((d) => d.id);
  for (const a of ids) {
    for (const b of [null, ...ids]) {
      const name = itemName(makeItem(b ? [a, b] : [a]));
      assert.ok(name.length <= 12, `${name} is too long`);
      assert.match(name, /^[A-Z0-9 .,:!?'\-+=/()<>%#_]+$/);
    }
  }
});
