import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, place, give, press, DT } from './_helpers.js';
import { ItemBox, ROULETTE_SECONDS } from '../src/sim/entities.js';
import { makeItem, itemName, giveItem, describeItem } from '../src/sim/hand.js';
import { powerups } from '../src/sim/powerups/index.js';
import { boostDuration } from '../src/sim/powerups/speedBoost.js';
import { ITEMS } from '../src/config.js';

test('karts start with two empty slots', () => {
  const { me } = setup();
  assert.equal(me.slots, ITEMS.baseSlots);
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
  give(me, 'banana');
  give(me, 'banana');
  const pickups = [];
  race.events.on('item:pickup', (e) => pickups.push(e));
  const box = race.spawn(new ItemBox(me.x, me.y));
  race.step(DT);
  assert.equal(box.active, false);
  assert.equal(pickups.length, 0);
  assert.equal(me.items.length, 2);
});

test('space uses the front item only', () => {
  const { race, input, me } = setup();
  give(me, 'shield');
  give(me, 'banana');
  press(race, input, 'useItem');
  assert.ok(me.effects.has('shield'));
  assert.deepEqual(me.items.map((i) => i.parts), [['banana']]);
});

test('C moves the front item to the back', () => {
  const { race, input, me } = setup();
  give(me, 'shield');
  give(me, 'banana');
  press(race, input, 'cycle');
  assert.deepEqual(me.items.map((i) => i.parts[0]), ['banana', 'shield']);
});

test('fusing two of the same makes a SUPER, which uses power 2', () => {
  const { race, input, me } = setup();
  give(me, 'speed-boost');
  give(me, 'speed-boost');
  press(race, input, 'fuse');
  assert.equal(me.items.length, 1);
  assert.equal(itemName(me.items[0]), 'SUPER BOOST');
  press(race, input, 'useItem');
  const boost = me.effects.active.find((e) => e.id === 'speed-boost');
  assert.ok(Math.abs(boost.duration - boostDuration(2)) < 1e-9);
  assert.ok(boostDuration(2) > boostDuration(1));
});

test('fusing two different powerups runs both', () => {
  const { race, input, me, others } = setup();
  place(race, me, 500);
  place(race, others[0], 800);
  give(me, 'rocket');
  give(me, 'grow');
  press(race, input, 'fuse');
  assert.equal(itemName(me.items[0]), 'GROW+ROCKET');
  press(race, input, 'useItem');
  assert.ok(me.effects.has('giant'));
  assert.equal(race.entities.filter((e) => e.kind === 'rocket').length, 1);
});

test('items still spinning in the roulette cannot be used or fused', () => {
  const { race, input, me } = setup();
  me.items.push(makeItem(['shield'], ROULETTE_SECONDS));
  me.items.push(makeItem(['shield'], ROULETTE_SECONDS));
  press(race, input, 'fuse');
  assert.equal(me.items.length, 2);
  press(race, input, 'useItem');
  assert.equal(me.effects.has('shield'), false);
});

test('a fused item holds at most four powerups', () => {
  const { race, input, me } = setup();
  give(me, 'banana', 'banana', 'banana');
  give(me, 'banana', 'banana');
  press(race, input, 'fuse');
  assert.equal(me.items.length, 2);
});

test('overflow "fuse" stacks an extra item onto the last one when the hand is full', () => {
  const { me } = setup();
  give(me, 'shield');
  give(me, 'rocket');
  assert.equal(giveItem(me, makeItem(['rocket']), { overflow: 'fuse' }), 'fused');
  assert.equal(itemName(me.items[1]), 'SUPER ROCKET');
  assert.equal(giveItem(me, makeItem(['rocket'])), 'dropped');
});

test('recipes win over plain combos, and extra parts still run', () => {
  assert.equal(describeItem(makeItem(['speed-boost', 'shield'])).recipe.id, 'ram');
  assert.equal(itemName(makeItem(['speed-boost', 'shield'])), 'RAM');
  assert.equal(itemName(makeItem(['shield', 'speed-boost', 'rocket'])), 'RAM+ROCKET');
  assert.equal(itemName(makeItem(['swap', 'banana', 'swap'])), 'SUPER DECOY');
  assert.equal(describeItem(makeItem(['speed-boost', 'rocket'])).recipe, null);
  // Too long to spell out, so the 3-letter names are used.
  assert.equal(itemName(makeItem(['rocket', 'shield'])), 'RKT+SHD');
});

test('every item of up to three parts has a name the HUD can draw', () => {
  const ids = powerups.list().map((d) => d.id);
  for (const a of ids) {
    for (const b of ids) {
      for (const c of [null, ...ids]) {
        const name = itemName(makeItem(c ? [a, b, c] : [a, b]));
        assert.ok(name.length <= 12, `${name} is too long`);
        assert.match(name, /^[A-Z0-9 .,:!?'\-+=/()<>%#_]+$/);
      }
    }
  }
});
