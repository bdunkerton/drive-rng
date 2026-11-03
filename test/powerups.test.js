import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, place, give, press, steps, spinning, DT } from './_helpers.js';
import { PowerupRegistry, powerups } from '../src/sim/powerups/registry.js';
import '../src/sim/powerups/index.js';
import { SPEED_BOOST } from '../src/sim/powerups/speedBoost.js';
import { ItemBox } from '../src/sim/entities.js';
import { Rng } from '../src/core/rng.js';
import { hasIcon } from '../src/render/icons.js';
import { hitKart } from '../src/sim/hits.js';

// ---- The registry -------------------------------------------------------------

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

test('there are ten powerups, each with an icon and HUD-safe names', () => {
  const defs = powerups.list();
  assert.deepEqual(defs.map((d) => d.id), ['speed-boost', 'swap', 'take-two', 'copy', 'rocket', 'banana', 'shield', 'magnet', 'grow', 'chaos']);
  for (const d of defs) {
    assert.ok(hasIcon(d.icon), `${d.id} has no icon`);
    assert.ok(d.name.length <= 12 && d.short.length <= 6 && d.abbr.length <= 3, d.id);
  }
});

test('the leader never rolls a swap', () => {
  const { race, me } = setup({ karts: 4 });
  const rng = new Rng(3);
  for (let i = 0; i < 500; i++) assert.notEqual(powerups.roll(rng, race.context(me, { position: 1 })), 'swap');
});

// ---- BOOST ----------------------------------------------------------------------

test('BOOST raises top speed for its duration, then wears off', () => {
  const { race, input, me } = setup({ karts: 1 });
  input.throttle = 1;
  steps(race, 3);
  const cruising = me.forwardSpeed;
  give(me, 'speed-boost');
  press(race, input, 'useItem');
  let peak = 0;
  for (let i = 0; i < Math.floor(SPEED_BOOST.duration / DT) - 2; i++) {
    race.step(DT);
    peak = Math.max(peak, me.forwardSpeed);
  }
  assert.ok(peak > cruising * 1.3, `peak ${peak} vs cruising ${cruising}`);
  steps(race, 2);
  assert.equal(me.effects.has('speed-boost'), false);
  assert.ok(me.forwardSpeed <= me.base.maxSpeed + 0.5);
});

// ---- SWAP -----------------------------------------------------------------------

test('SWAP trades places with the leader, laps and all', () => {
  const { race, input, me, others } = setup();
  const [leader, third] = others;
  place(race, me, 4500);
  place(race, leader, 5000);
  place(race, third, 300);
  give(me, 'swap');
  press(race, input, 'useItem');
  assert.ok(me.progress > 4990 && leader.progress < 4510, `${me.progress} / ${leader.progress}`);
  assert.equal(me.position, 1);
  assert.equal(me.lapsDone, 1);
  assert.equal(leader.lapsDone, 1);
});

test('SWAP while leading makes 2nd and last trade instead', () => {
  const { race, input, me, others } = setup();
  const [a, b] = others;
  place(race, me, 900);
  place(race, a, 600);
  place(race, b, 300);
  give(me, 'swap');
  press(race, input, 'useItem');
  assert.ok(me.progress > 895);
  assert.ok(a.progress < 310 && b.progress > 590);
});

test('a shield blocks a SWAP (and pops)', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 500);
  place(race, others[0], 900);
  others[0].addEffect({ id: 'shield', duration: 8, charges: 1, tags: ['shield'] }, race);
  give(me, 'swap');
  press(race, input, 'useItem');
  assert.ok(me.progress < 510);
  assert.equal(others[0].effects.has('shield'), false);
});

test('SUPER SWAP trades hands too', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 500);
  place(race, others[0], 900);
  give(others[0], 'grow');
  give(me, 'swap', 'swap');
  give(me, 'banana');
  press(race, input, 'useItem');
  assert.deepEqual(me.items.map((i) => i.parts), [['grow']]);
  assert.deepEqual(others[0].items.map((i) => i.parts), [['banana']]);
});

// ---- TAKE TWO -------------------------------------------------------------------

test('TAKE TWO doubles your slots and your next box gives two', () => {
  const { race, input, me } = setup({ karts: 1 });
  give(me, 'take-two');
  press(race, input, 'useItem');
  assert.equal(me.slots, 4);
  race.spawn(new ItemBox(me.x, me.y));
  race.step(DT);
  assert.equal(me.items.length, 2);
  assert.equal(me.items[0].parts[0], me.items[1].parts[0]);
  assert.equal(me.extraCopies, 0);
});

test('TAKE TWO never goes past four slots; with no room the copy fuses into a SUPER', () => {
  const { race, input, me } = setup({ karts: 1 });
  me.slots = 4;
  give(me, 'take-two');
  give(me, 'banana');
  give(me, 'banana');
  press(race, input, 'useItem');
  assert.equal(me.slots, 4);
  give(me, 'shield');
  race.spawn(new ItemBox(me.x, me.y));
  race.step(DT);
  assert.equal(me.items.length, 4);
  assert.equal(me.items[3].parts.length, 2);
});

// ---- COPY -----------------------------------------------------------------------

test('COPY duplicates the rest of your hand', () => {
  const { race, input, me } = setup({ karts: 1 });
  me.slots = 4;
  give(me, 'copy');
  give(me, 'rocket');
  give(me, 'speed-boost', 'shield');
  press(race, input, 'useItem');
  assert.deepEqual(me.items.map((i) => i.parts.join('+')), ['rocket', 'speed-boost+shield', 'rocket', 'speed-boost+shield']);
});

test('COPY with nothing else in hand copies the hand of the kart ahead', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 500);
  place(race, others[0], 700);
  give(others[0], 'magnet');
  give(me, 'copy');
  press(race, input, 'useItem');
  assert.deepEqual(me.items.map((i) => i.parts), [['magnet']]);
  assert.equal(others[0].items.length, 1);
});

// ---- ROCKET ---------------------------------------------------------------------

test('ROCKET chases down the kart ahead and spins it out', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 500);
  place(race, others[0], 800, 15);
  give(me, 'rocket');
  press(race, input, 'useItem');
  assert.ok(steps(race, 3, () => spinning(others[0])), 'target was never hit');
  assert.equal(race.entities.filter((e) => e.kind === 'rocket').length, 0);
});

test('a shield blocks a ROCKET', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 500);
  place(race, others[0], 800);
  others[0].addEffect({ id: 'shield', duration: 8, charges: 1, tags: ['shield'] }, race);
  give(me, 'rocket');
  press(race, input, 'useItem');
  steps(race, 3, () => race.entities.length === 0);
  assert.equal(spinning(others[0]), false);
  assert.equal(others[0].effects.has('shield'), false);
});

test('SUPER ROCKET fires one at each of the next two karts', () => {
  const { race, input, me, others } = setup({ karts: 3 });
  place(race, me, 500);
  place(race, others[0], 700, -10);
  place(race, others[1], 900, 10);
  give(me, 'rocket', 'rocket');
  press(race, input, 'useItem');
  assert.ok(steps(race, 4, () => spinning(others[0]) && spinning(others[1])));
});

// ---- BANANA ---------------------------------------------------------------------

test('BANANA drops behind you and spins out whoever drives over it', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 800);
  place(race, others[0], 300);
  give(me, 'banana');
  press(race, input, 'useItem');
  const banana = race.entities.find((e) => e.kind === 'banana');
  assert.ok(banana);
  const p = race.track.project(banana.x, banana.y);
  assert.ok(p.s < me.s && me.s - p.s < 30);
  place(race, others[0], p.s, p.lateral);
  race.step(DT);
  assert.ok(spinning(others[0]));
  assert.equal(race.entities.length, 0);
});

// ---- SHIELD ---------------------------------------------------------------------

test('SHIELD blocks one hit; SUPER SHIELD blocks two', () => {
  const { race, input, me } = setup({ karts: 1 });
  give(me, 'shield', 'shield');
  press(race, input, 'useItem');
  for (let i = 0; i < 2; i++) {
    race.spawn({ kind: 'test-spike', x: me.x, y: me.y, radius: 3, alive: true, update() {}, onKartTouch(k, r) { this.alive = false; hitKart(k, r); } });
    race.step(DT);
    assert.equal(spinning(me), false, `hit ${i + 1} landed`);
  }
  assert.equal(me.effects.has('shield'), false);
});

// ---- MAGNET ---------------------------------------------------------------------

test('MAGNET steals the front item of the nearest kart ahead', () => {
  const { race, input, me, others } = setup({ karts: 3 });
  place(race, me, 500);
  place(race, others[0], 700);
  place(race, others[1], 900);
  give(others[0], 'rocket');
  give(others[0], 'banana');
  give(others[1], 'grow');
  give(me, 'magnet');
  press(race, input, 'useItem');
  assert.deepEqual(me.items.map((i) => i.parts), [['rocket']]);
  assert.deepEqual(others[0].items.map((i) => i.parts), [['banana']]);
  assert.equal(others[1].items.length, 1);
});

// ---- GROW -----------------------------------------------------------------------

test("GROW doubles your size and you can't be spun out", () => {
  const { race, input, me } = setup({ karts: 1 });
  const before = me.radius;
  give(me, 'grow');
  press(race, input, 'useItem');
  assert.equal(me.radius, before * 2);
  assert.equal(hitKart(me, race), 'shrugged');
  assert.equal(spinning(me), false);
});

test('a giant squashes bananas', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, others[0], 800);
  give(others[0], 'banana');
  others[0].controller = { update(k) { k.controls.useItem = true; } };
  race.step(DT);
  const banana = race.entities.find((e) => e.kind === 'banana');
  const p = race.track.project(banana.x, banana.y);
  give(me, 'grow');
  press(race, input, 'useItem');
  place(race, me, p.s, p.lateral);
  race.step(DT);
  assert.equal(spinning(me), false);
  assert.equal(race.entities.filter((e) => e.kind === 'banana').length, 0);
});

// ---- CHAOS ----------------------------------------------------------------------

test('CHAOS fires another powerup, and sometimes a rival gets it instead', () => {
  const outcomes = { mine: 0, backfire: 0 };
  const rolled = new Set();
  for (let seed = 1; seed <= 60; seed++) {
    const { race, input, me, others } = setup({ karts: 3, seed });
    place(race, me, 500);
    place(race, others[0], 800);
    place(race, others[1], 300);
    give(me, 'chaos');
    const events = [];
    race.events.on('chaos', (e) => events.push(e));
    press(race, input, 'useItem');
    assert.equal(events.length, 1);
    assert.notEqual(events[0].rolled, 'chaos');
    rolled.add(events[0].rolled);
    outcomes[events[0].who === me ? 'mine' : 'backfire']++;
  }
  assert.ok(outcomes.mine > 0 && outcomes.backfire > 0, JSON.stringify(outcomes));
  assert.ok(rolled.size >= 6, [...rolled].join());
});

test('SUPER CHAOS rolls two different powerups', () => {
  const { race, input, me, others } = setup({ karts: 2, seed: 4 });
  place(race, me, 500);
  place(race, others[0], 800);
  give(me, 'chaos', 'chaos');
  const events = [];
  race.events.on('chaos', (e) => events.push(e.rolled));
  press(race, input, 'useItem');
  assert.equal(events.length, 2);
  assert.notEqual(events[0], events[1]);
});
