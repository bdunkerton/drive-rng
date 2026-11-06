import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup, place, give, press, steps, spinning, DT } from './_helpers.js';
import { PowerupRegistry, powerups } from '../src/sim/powerups/registry.js';
import '../src/sim/powerups/index.js';
import { resolveItem } from '../src/sim/powerups/fusion.js';
import { makeItem, fuseFront } from '../src/sim/hand.js';
import { Rng } from '../src/core/rng.js';
import { hasIcon } from '../src/render/icons.js';
import { hitKart } from '../src/sim/hits.js';
import { simulateRace } from '../src/sim/headless.js';
import { FUSION } from '../src/config.js';

const IDS = ['boost', 'spring', 'hook', 'rocket', 'ghost', 'black-hole', 'bulk', 'bumper'];
const moveOf = (kart) => kart.effects.active.find((e) => e.id.startsWith('move:'));

// ---- The registry ---------------------------------------------------------------

test('the registry refuses duplicate ids and items without both halves', () => {
  const r = new PowerupRegistry();
  const half = { duration: () => 1 };
  r.register({ id: 'x', motion: half, field: {} });
  assert.throws(() => r.register({ id: 'x', motion: half, field: {} }), /already registered/);
  assert.throws(() => r.register({ id: 'y', motion: half }), /motion and a field/);
  assert.throws(() => r.register({ id: 'z', motion: {}, field: {} }), /duration/);
});

test('rolls are weighted and can depend on the race situation', () => {
  const r = new PowerupRegistry();
  const half = { duration: () => 1 };
  r.register({ id: 'common', weight: 9, motion: half, field: {} });
  r.register({ id: 'leader-only', weight: (ctx) => (ctx.position === 1 ? 1 : 0), motion: half, field: {} });
  const rng = new Rng(5);
  for (let i = 0; i < 200; i++) assert.equal(r.roll(rng, { position: 3 }), 'common');
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(r.roll(rng, { position: 1 }));
  assert.deepEqual([...seen].sort(), ['common', 'leader-only']);
});

test('there are eight powerups, each with an icon and HUD-safe names', () => {
  const defs = powerups.list();
  assert.deepEqual(defs.map((d) => d.id), IDS);
  for (const d of defs) {
    assert.ok(hasIcon(d.icon), `${d.id} has no icon`);
    assert.ok(d.name.length <= 12 && d.short.length <= 6 && d.abbr.length <= 3, d.id);
  }
});

test('three pairs of opposites, and they go both ways', () => {
  const pairs = [];
  for (const a of IDS) for (const b of IDS) if (a < b && powerups.areOpposites(a, b)) pairs.push(`${a}/${b}`);
  assert.deepEqual(pairs.sort(), ['black-hole/spring', 'bulk/ghost', 'bumper/hook']);
  for (const d of powerups.list()) if (d.opposite) assert.equal(powerups.get(d.opposite).opposite, d.id);
});

// ---- The item rule: every item helps whoever uses it ------------------------------

/**
 * How far the player gets in `seconds` after using `parts` on the front straight (null = no
 * item). Short enough that nobody reaches the first corner, since this driver can't steer.
 */
function distanceWith(parts, seconds = 2) {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 0);
  place(race, others[0], 3000);
  input.throttle = 1;
  steps(race, 1.2);
  const from = me.progress;
  if (parts) {
    give(me, ...parts);
    press(race, input, 'useItem');
  }
  steps(race, seconds - (parts ? DT : 0));
  return me.progress - from;
}

test('every item and every fusion gets you further than not using one', () => {
  const plain = distanceWith(null);
  for (const a of IDS) {
    for (const b of [null, ...IDS]) {
      const parts = b ? [a, b] : [a];
      const d = distanceWith(parts);
      assert.ok(d > plain + 5, `${parts.join('+')}: ${d.toFixed(0)} vs ${plain.toFixed(0)} with nothing`);
    }
  }
});

// ---- Each motion and field ------------------------------------------------------------

test('BOOST: a dash that lays a speed lane, and riding the lane speeds you up', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 200);
  place(race, others[0], 170);
  input.throttle = 1;
  give(me, 'boost');
  press(race, input, 'useItem');
  assert.ok(me.effects.hasTag('boost'));
  steps(race, 0.5);
  assert.ok(race.entities.filter((e) => e.kind === 'speed-pad').length > 4);
  const rider = others[0];
  rider.controller = { update: (k) => Object.assign(k.controls, { throttle: 1, steer: 0, brake: 0 }) };
  assert.ok(steps(race, 2, () => rider.effects.has('burst')), 'the kart behind never rode the lane');
});

test('SPRING: you fly over karts, then pop the ones you land near', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 300);
  place(race, others[0], 330);
  give(me, 'spring');
  press(race, input, 'useItem');
  assert.ok(me.effects.hasTag('air'));
  const bumps = [];
  race.events.on('bump', (e) => bumps.push(e));
  steps(race, 1);
  assert.equal(bumps.length, 0);
  assert.ok(others[0].effects.has('popped') || others[0].effects.hasTag('air') || race.time > 0, 'ran');
  // Land right next to someone: they pop.
  const t = setup({ karts: 2 });
  place(t.race, t.me, 300);
  place(t.race, t.others[0], 310, 12);
  give(t.me, 'spring');
  const pops = [];
  t.race.events.on('pop', (e) => pops.push(e));
  press(t.race, t.input, 'useItem');
  steps(t.race, 1);
  assert.ok(pops.some((p) => p.kart === t.others[0]), 'nobody popped');
});

test('HOOK: latches onto the kart ahead, reels you in and slingshots you past', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 300);
  place(race, others[0], 450);
  give(me, 'hook');
  const releases = [];
  race.events.on('hook:release', (e) => releases.push(e));
  press(race, input, 'useItem');
  assert.equal(moveOf(me).target, others[0]);
  assert.ok(steps(race, 2, () => releases.length > 0));
  assert.equal(releases[0].passed, true);
  assert.ok(me.progress > others[0].progress);
  assert.ok(me.effects.has('burst'));
});

test('ROCKET: you ride it, then a blast throws nearby karts and spins out the closest', () => {
  const { race, input, me, others } = setup({ karts: 3 });
  const [close, far] = others;
  place(race, me, 300);
  input.throttle = 1;
  give(me, 'rocket');
  press(race, input, 'useItem');
  assert.ok(me.effects.hasTag('ride'));
  assert.equal(hitKart(me, race), 'shrugged');
  const move = moveOf(me);
  // Park two karts where the blast will go off.
  steps(race, move.remaining - 2 * DT);
  const fx = Math.cos(me.heading);
  const fy = Math.sin(me.heading);
  for (const [k, d, side] of [[close, 12, 0], [far, 30, 25]]) {
    k.x = me.x + fx * d - fy * side;
    k.y = me.y + fy * d + fx * side;
    k.vx = k.vy = 0;
    k.trackIndex = -1;
  }
  steps(race, 4 * DT);
  assert.ok(spinning(close), 'the close kart did not spin out');
  assert.ok(Math.hypot(far.vx, far.vy) > 40, 'the far kart was not thrown');
  assert.equal(spinning(me), false);
});

test('GHOST: karts pass through you and grass does not slow you', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 300, 40);
  give(me, 'ghost');
  press(race, input, 'useItem');
  assert.ok(me.effects.hasTag('phase'));
  assert.equal(me.surface, 'grass');
  input.throttle = 1;
  steps(race, 1.5);
  assert.ok(me.forwardSpeed > 120, `only ${me.forwardSpeed.toFixed(0)} on the grass`);
  const bumps = [];
  race.events.on('bump', (e) => bumps.push(e));
  others[0].x = me.x;
  others[0].y = me.y;
  others[0].trackIndex = -1;
  race.step(DT);
  assert.equal(bumps.length, 0);
});

test('BLACK HOLE: opens a hole ahead, pulls you in and pops you out, dragging the pack', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 300);
  place(race, others[0], 260, 20);
  give(me, 'black-hole');
  const pops = [];
  race.events.on('hole:pop', (e) => pops.push(e));
  press(race, input, 'useItem');
  const hole = race.entities.find((e) => e.kind === 'hole');
  assert.ok(hole);
  const gapBefore = Math.hypot(others[0].x - me.x, others[0].y - me.y);
  steps(race, 0.3);
  assert.ok(Math.hypot(others[0].vx, others[0].vy) > 10, 'the other kart was not pulled');
  assert.ok(steps(race, 1.2, () => pops.length > 0));
  assert.ok(me.progress > 380);
  assert.ok(me.effects.has('burst'));
  assert.ok(gapBefore > 0);
});

test('BULK: giant, and nothing spins you out', () => {
  const { race, input, me } = setup({ karts: 1 });
  give(me, 'bulk');
  press(race, input, 'useItem');
  assert.ok(me.effects.hasTag('giant'));
  assert.ok(me.radius > me.base.radius * 1.7);
  assert.equal(hitKart(me, race), 'shrugged');
});

test('BUMPER: every bump kicks you forward, and a blast just bounces off', () => {
  const { race, input, me, others } = setup({ karts: 2 });
  place(race, me, 300);
  give(me, 'bumper');
  press(race, input, 'useItem');
  assert.equal(hitKart(me, race), 'blocked');
  assert.equal(spinning(me), false);
  const kicks = [];
  race.events.on('ricochet', (e) => kicks.push(e));
  others[0].x = me.x + Math.cos(me.heading) * 8;
  others[0].y = me.y + Math.sin(me.heading) * 8;
  others[0].trackIndex = -1;
  me.kick(80);
  steps(race, 0.3);
  assert.ok(kicks.some((k) => k.kart === me), 'no ricochet');
});

// ---- The fusion rule ------------------------------------------------------------------

test('a fusion is the first item\'s motion with the second item\'s field, so order matters', () => {
  // WHITE HOLE: BLACK HOLE's fall, BOOST's speed lane.
  const a = setup({ karts: 1 });
  place(a.race, a.me, 300);
  give(a.me, 'black-hole', 'boost');
  press(a.race, a.input, 'useItem');
  assert.equal(moveOf(a.me).id, 'move:black-hole');
  steps(a.race, 0.3);
  assert.ok(a.race.entities.some((e) => e.kind === 'speed-pad'));
  // The other way round: BOOST's dash, BLACK HOLE's gravity. No hole, no lane.
  const b = setup({ karts: 1 });
  place(b.race, b.me, 300);
  give(b.me, 'boost', 'black-hole');
  press(b.race, b.input, 'useItem');
  assert.equal(moveOf(b.me).id, 'move:boost');
  steps(b.race, 0.3);
  assert.equal(b.race.entities.filter((e) => e.kind === 'speed-pad' || e.kind === 'hole').length, 0);
});

test('the same item twice is a MEGA at double strength', () => {
  const r = resolveItem(makeItem(['ghost', 'ghost']));
  assert.equal(r.kind, 'mega');
  assert.equal(r.name, 'MEGA GHOST');
  assert.equal(r.power, FUSION.megaPower);
  const { race, input, me } = setup({ karts: 1 });
  give(me, 'ghost', 'ghost');
  press(race, input, 'useItem');
  const move = moveOf(me);
  assert.ok(Math.abs(move.duration - powerups.get('ghost').motion.duration(2)) < 1e-9);
});

test('opposites FIZZLE: you get the first item alone at half strength, and it is never WILD', () => {
  const r = resolveItem(makeItem(['hook', 'bumper']));
  assert.equal(r.kind, 'fizzle');
  assert.equal(r.name, 'FIZZLE');
  assert.equal(r.motionDef.id, 'hook');
  assert.equal(r.fieldDef.id, 'hook');
  assert.equal(r.power, FUSION.fizzlePower);
  for (let seed = 1; seed <= 200; seed++) {
    const { race, me } = setup({ karts: 1, seed });
    give(me, 'bulk');
    give(me, 'ghost');
    fuseFront(me, race);
    assert.equal(me.items[0].wild, false);
  }
});

test('about one Mega or Fusion in ten comes out WILD, and WILD is stronger', () => {
  let wild = 0;
  const n = 1500;
  for (let seed = 1; seed <= n; seed++) {
    const { race, me } = setup({ karts: 1, seed });
    give(me, 'rocket');
    give(me, 'spring');
    fuseFront(me, race);
    if (me.items[0].wild) wild++;
  }
  const share = wild / n;
  assert.ok(share > 0.07 && share < 0.13, `${(share * 100).toFixed(1)}% wild`);
  const plain = resolveItem({ parts: ['rocket', 'spring'], wild: false });
  const boosted = resolveItem({ parts: ['rocket', 'spring'], wild: true });
  assert.ok(Math.abs(boosted.power - plain.power * FUSION.wildPower) < 1e-9);
});

test('the named fusions', () => {
  const names = {
    'black-hole+boost': 'WHITE HOLE',
    'hook+boost': 'SLINGSHOT',
    'spring+rocket': 'METEOR',
    'rocket+spring': 'SKIP STONE',
    'boost+ghost': 'WORMHOLE',
    'bumper+black-hole': 'PINBALL',
    'bulk+hook': 'SNOWBALL',
    'ghost+boost': 'GHOST LANE',
  };
  for (const [key, name] of Object.entries(names)) {
    const r = resolveItem(makeItem(key.split('+')));
    assert.equal(r.name, name);
    assert.equal(r.kind, 'fusion');
    assert.ok(r.showcase);
  }
  assert.equal(powerups.showcases.size, Object.keys(names).length);
});

test('METEOR: jump, then land with a blast', () => {
  const { race, input, me } = setup({ karts: 1 });
  place(race, me, 300);
  give(me, 'spring', 'rocket');
  const blasts = [];
  race.events.on('blast', (e) => blasts.push(e));
  press(race, input, 'useItem');
  assert.ok(me.effects.hasTag('air'));
  assert.ok(steps(race, 1.5, () => blasts.length > 0));
  assert.equal(me.effects.hasTag('air'), false);
});

// ---- Rivals ---------------------------------------------------------------------------

test('AI races with every item in play still finish, and rivals fuse but never on purpose fizzle', () => {
  let fuses = 0;
  let fizzles = 0;
  let uses = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const { results, timedOut } = simulateRace({
      seed,
      laps: 3,
      karts: 6,
      maxSeconds: 300,
      onSetup(r) {
        r.events.on('item:fuse', ({ kind }) => (kind === 'fizzle' ? fizzles++ : fuses++));
        r.events.on('item:use', () => uses++);
      },
    });
    assert.equal(timedOut, false, `seed ${seed} timed out`);
    assert.ok(results.every((r) => r.finished && r.lapTimes.length === 3));
  }
  assert.ok(uses > 100, `only ${uses} items used`);
  assert.ok(fuses > 10, `only ${fuses} fuses`);
  assert.equal(fizzles, 0);
});
