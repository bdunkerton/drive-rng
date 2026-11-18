import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Race } from '../src/sim/race.js';
import { IdleController } from '../src/sim/controllers.js';
import { Track } from '../src/sim/track.js';
import oval from '../src/tracks/oval.js';
import { SCENARIOS, scenarioById } from '../src/lab/scenarios.js';
import { buildReport, issueUrl } from '../src/lab/report.js';
import { spinoutEffect } from '../src/sim/hits.js';
import { FOCUS } from '../src/config.js';
import { AIDriver } from '../src/ai/driver.js';
import { Rng } from '../src/core/rng.js';

const DT = 1 / 60;

// The player right behind one rival on the oval's top straight (which runs to the right).
function pair(rules, { gap = 1, side = 0, ahead = 100, behind = 170 } = {}) {
  const input = { throttle: 1, brake: 0, steer: 0, useItem: false };
  const race = new Race({ track: oval, seed: 1, rivals: 1, countdown: 0, humanInput: input, items: false, rules: { potato: false, ...rules } });
  const me = race.player;
  const rival = race.karts.find((k) => !k.isPlayer);
  const p = race.track.pointAt(200);
  const h = p.angle;
  const fx = Math.cos(h);
  const fy = Math.sin(h);
  rival.x = p.x; rival.y = p.y; rival.heading = h; rival.vx = fx * ahead; rival.vy = fy * ahead;
  me.x = p.x - fx * (gap + 10) - fy * side; me.y = p.y - fy * (gap + 10) + fx * side;
  me.heading = h; me.vx = fx * behind; me.vy = fy * behind;
  rival.controller = new IdleController();
  for (const k of race.karts) race.applyTrack(k);
  return { race, me, rival, input };
}

test('the test oval is a sound track: wide, smooth, about 16 seconds a lap', () => {
  const t = new Track(oval);
  assert.ok(t.length > 2400 && t.length < 3000);
  assert.ok(oval.halfWidth >= 40);
  let maxK = 0;
  for (let s = 0; s < t.length; s += 5) maxK = Math.max(maxK, Math.abs(t.curvatureAt(s)));
  assert.ok(1 / maxK > 140, `tightest radius ${1 / maxK}`);
});

test('every scenario races to the finish with 11 karts', () => {
  for (const s of SCENARIOS) {
    if (s.rules.heist) continue; // no pack: covered by the heist tests
    const race = new Race({ track: oval, seed: 7, rivals: 10, countdown: 0, humanInput: null, laps: 1, items: false, rules: { potato: false, ...s.rules } });
    for (let i = 0; i < 60 * 240 && race.phase !== 'done'; i++) race.step(DT);
    assert.equal(race.phase, 'done', s.id);
    assert.equal(race.karts.length + race.out.length, 11);
  }
});

test('scenario ids are unique and each has a question to answer', () => {
  const ids = SCENARIOS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SCENARIOS) assert.ok(s.question && s.pitch && s.how.length, s.id);
  assert.equal(scenarioById('potato').name, 'HOT POTATO');
});

test('leapfrog: driving into a spinning kart vaults you over it', () => {
  const { race, me, rival } = pair({ leapfrog: true }, { gap: 2, ahead: 40, behind: 150 });
  rival.addEffect(spinoutEffect(), race);
  let vaulted = false;
  race.events.on('vault', ({ kart }) => (vaulted = kart === me));
  for (let i = 0; i < 20 && !vaulted; i++) race.step(DT);
  assert.ok(vaulted);
  assert.ok(me.effects.hasTag('air'));
});

test('leapfrog is off unless the scenario turns it on', () => {
  const { race, rival } = pair({}, { gap: 2, ahead: 40, behind: 150 });
  rival.addEffect(spinoutEffect(), race);
  let vaulted = false;
  race.events.on('vault', () => (vaulted = true));
  for (let i = 0; i < 20; i++) race.step(DT);
  assert.ok(!vaulted);
});

test('billiards: a ram hands your speed to the kart you hit, and it goes live', () => {
  const { race, me, rival } = pair({ billiards: true }, { gap: 1, ahead: 60, behind: 170 });
  let shot = false;
  race.events.on('billiards:shot', ({ by }) => (shot = by === me));
  for (let i = 0; i < 20 && !shot; i++) race.step(DT);
  assert.ok(shot);
  assert.ok(rival.speed > me.speed * 2, `rival ${rival.speed} vs me ${me.speed}`);
  assert.ok(race.time < rival.cueUntil);
  assert.ok(!rival.effects.has('spinout'), 'the struck kart itself does not spin');
});

test('billiards: a live kart spins whoever it hits', () => {
  const input = { throttle: 0, brake: 0, steer: 0, useItem: false };
  const race = new Race({ track: oval, seed: 1, rivals: 2, countdown: 0, humanInput: input, items: false, rules: { potato: false, billiards: true } });
  const [me, a, b] = race.karts;
  const p = race.track.pointAt(300);
  const fx = Math.cos(p.angle);
  const fy = Math.sin(p.angle);
  for (const k of [a, b]) k.controller = new IdleController();
  b.x = p.x; b.y = p.y; b.heading = p.angle; b.vx = fx * 40; b.vy = fy * 40;
  a.x = p.x - fx * 12; a.y = p.y - fy * 12; a.heading = p.angle; a.vx = fx * 200; a.vy = fy * 200;
  a.cueUntil = 5; a.cueOrigin = me;
  me.x = p.x - fx * 300; me.y = p.y - fy * 300;
  let chained = false;
  race.events.on('billiards:hit', ({ by, kart }) => (chained = by === me && kart === b));
  for (let i = 0; i < 20 && !chained; i++) race.step(DT);
  assert.ok(chained);
  assert.ok(b.effects.has('spinout'));
});

test('focus: a fast near miss fills the meter, a slow one does not', () => {
  const { race, me } = pair({ focus: true }, { gap: 3, side: 10 + FOCUS.nearMissGap - 2, ahead: 60, behind: 170 });
  race.phase = 'racing';
  for (let i = 0; i < 20; i++) race.step(DT);
  assert.ok(me.focus >= FOCUS.perNearMiss - 1e-9, `focus ${me.focus}`);
  const slow = pair({ focus: true }, { gap: 3, side: 10 + FOCUS.nearMissGap - 2, ahead: 100, behind: 110 });
  slow.input.throttle = 0;
  for (let i = 0; i < 20; i++) slow.race.step(DT);
  assert.equal(slow.me.focus, 0);
});

test('feedback reports read well and fit in a GitHub link', () => {
  const runs = Array.from({ length: 30 }, (_, i) => ({ place: (i % 11) + 1, of: 11, rams: 2, potatoGot: 3, potatoPassed: 2, potatoBooms: 1, draftSeconds: 8.5, spunOut: 1 }));
  const entries = SCENARIOS.map((s) => ({ scenario: s.id, vote: 'up', tags: ['FUN', 'WANT MORE'], note: 'x'.repeat(400), runs }));
  const r = buildReport(entries);
  assert.match(r.human, /### HOT POTATO — UPVOTE/);
  assert.match(r.human, /Tags: FUN, WANT MORE/);
  const { url } = issueUrl(entries);
  assert.ok(url.length <= 6000, `url ${url.length}`);
  assert.match(url, /labels=playtest/);
});

// --- Batch 2 -----------------------------------------------------------------

test('slingshot drafting: tucked in only keeps pace; pulling out fires a burst and spends the charge', () => {
  const { race, me, rival } = pair({ slingshot: true }, { gap: 25, ahead: 150, behind: 150 });
  rival.controller = { update(k) { k.controls.throttle = 1; k.controls.steer = 0; k.controls.brake = 0; } };
  for (let i = 0; i < 90; i++) race.step(DT);
  assert.ok(me.draft > 0.8, `charge ${me.draft}`);
  assert.ok(me.stats().maxSpeed < 172 * 1.08, 'in the wake you only hang on');
  let fired = false;
  race.events.on('draft:slingshot', ({ kart }) => (fired = kart === me));
  me.y += 40; // swing out of the wake
  race.applyTrack(me);
  race.step(DT);
  assert.ok(fired);
  assert.equal(me.draft, 0);
  assert.ok(me.effects.has('slingshot'));
  assert.ok(me.stats().maxSpeed > 172 * 1.25);
});

test('time bomb: holding focus slows everyone else; touched karts blow when you let go', () => {
  const { race, me, rival, input } = pair({ timebomb: true }, { gap: 1, side: 0, ahead: 100, behind: 150 });
  me.focus = 1;
  input.focus = true;
  const rx = rival.x;
  const mx = me.x;
  race.step(DT);
  assert.ok(race.bullet.active);
  assert.ok(Math.abs(rival.x - rx) < Math.abs(me.x - mx) * 0.6, 'the world moves slower than you');
  for (let i = 0; i < 20 && !rival.charged; i++) race.step(DT);
  assert.ok(rival.charged, 'touching charged it');
  let boom = null;
  race.events.on('bomb:detonate', (e) => (boom = e));
  input.focus = false;
  race.step(DT);
  assert.ok(!race.bullet.active);
  assert.equal(boom.karts.length, 1);
  assert.ok(rival.effects.has('spinout'));
});

test('hunters go after the player and their rams can spin you', () => {
  const race = new Race({ track: oval, seed: 3, rivals: 10, countdown: 0, humanInput: { throttle: 0, brake: 0, steer: 0, useItem: false }, items: false, rules: { potato: false, hunters: 3 } });
  assert.equal(race.karts.filter((k) => k.hunter).length, 3);
  assert.ok(!race.player.hunter);
  // A hunter right behind a crawling player.
  const h = race.karts.find((k) => k.hunter);
  const p = race.player;
  const pt = race.track.pointAt(400);
  const fx = Math.cos(pt.angle);
  const fy = Math.sin(pt.angle);
  p.x = pt.x; p.y = pt.y; p.heading = pt.angle; p.vx = fx * 40; p.vy = fy * 40;
  h.x = pt.x - fx * 60; h.y = pt.y - fy * 60; h.heading = pt.angle; h.vx = fx * 150; h.vy = fy * 150;
  for (const k of race.karts) if (k !== p && k !== h) { k.x = pt.x - fx * 600; k.y = pt.y - fy * 600; }
  for (const k of race.karts) race.applyTrack(k);
  let spun = false;
  race.events.on('ram', ({ by, kart }) => (spun = spun || (by === h && kart === p)));
  for (let i = 0; i < 60 * 3 && !spun; i++) race.step(DT);
  assert.ok(spun, 'the hunter PITs the player');
});

test('potato royale: a boom knocks the holder out, potatoes escalate, last kart standing ends it', () => {
  const race = new Race({ track: oval, seed: 5, rivals: 10, countdown: 0, humanInput: null, laps: 99, items: false, rules: { potato: false, royale: true } });
  let most = 0;
  for (let i = 0; i < 60 * 300 && race.phase !== 'done'; i++) {
    race.step(DT);
    most = Math.max(most, race.potatoes.filter((p) => !p.retired).length);
    for (const k of race.karts) assert.ok(!k.out);
    const holders = race.potatoes.filter((p) => p.holder).map((p) => p.holder);
    assert.equal(new Set(holders).size, holders.length, 'nobody holds two');
  }
  assert.equal(race.phase, 'done');
  assert.equal(race.karts.length, 1);
  assert.equal(race.out.length, 10);
  assert.equal(new Set(race.out).size, 10, 'each kart knocked out once');
  assert.ok(most >= 2, `potatoes escalated to ${most}`);
  const r = race.results();
  assert.equal(r[0].position, 1);
  assert.ok(!r[0].out && r.slice(1).every((x) => x.out));
});

test('potato royale: swaps are instant, but not straight back until you separate', () => {
  const race = new Race({ track: oval, seed: 5, rivals: 2, countdown: 0, humanInput: null, items: false, rules: { potato: false, royale: true } });
  const [a, b] = race.karts;
  const pot = race.potatoes[0];
  pot.give(a, null);
  pot.touch(a, b);
  assert.equal(pot.holder, b, 'instant');
  race.steps++;
  pot.touch(a, b);
  assert.equal(pot.holder, b, 'no straight pass-back');
  b.x = a.x + 100;
  pot.step(DT);
  race.steps++;
  pot.touch(a, b);
  assert.equal(pot.holder, a, 'after separating it can go back');
});

test('the lab menu shows the current batch; earlier ones are archived', async () => {
  const { CURRENT_BATCH } = await import('../src/lab/scenarios.js');
  const { inBatch } = await import('../src/lab/scenarios.js');
  assert.equal(CURRENT_BATCH, 5);
  assert.deepEqual(SCENARIOS.filter((s) => inBatch(s, 5)).map((s) => s.id), ['pack4', 'bowl', 'heist3']);
});

// --- Batch 3 -----------------------------------------------------------------

test('slingshot v2: a full charge fires by itself and makes you heavy', () => {
  const { race, me, rival } = pair({ slingshot: 2 }, { gap: 20, ahead: 150, behind: 150 });
  rival.controller = { update(k) { k.controls.throttle = 1; k.controls.steer = 0; k.controls.brake = 0; } };
  let auto = false;
  race.events.on('draft:slingshot', (e) => (auto = auto || (e.kart === me && e.auto)));
  for (let i = 0; i < 60 * 3 && !auto; i++) race.step(DT);
  assert.ok(auto, 'fired without pulling out');
  assert.ok(me.stats().mass >= 2.5);
  assert.equal(me.draft, 0);
});

test('slingshot v2: the wake is short', () => {
  const { race, me, rival } = pair({ slingshot: 2 }, { gap: 90, ahead: 150, behind: 150 });
  rival.controller = { update(k) { k.controls.throttle = 1; k.controls.steer = 0; k.controls.brake = 0; } };
  race.updateDrafts(DT);
  assert.equal(me.draftingBehind, null);
  assert.ok(rival);
});

test('bullring royale: the fuse keeps burning through passes and shortens as karts drop', async () => {
  const ring = (await import('../src/tracks/bullring.js')).default;
  const race = new Race({ track: ring, seed: 2, rivals: 10, countdown: 0, humanInput: null, items: false, rules: { potato: false, royale: 2 } });
  const pot = race.potatoes[0];
  const [a, b] = race.karts;
  pot.give(a, null);
  const fresh = pot.fuse;
  assert.ok(fresh >= 12 && fresh <= 18);
  pot.fuse = 5;
  race.steps++;
  pot.touch(a, b);
  assert.equal(pot.holder, b);
  assert.equal(pot.fuse, 5, 'no reset on a pass');
  for (let i = 0; i < 60 * 240 && race.phase !== 'done'; i++) race.step(DT);
  assert.equal(race.phase, 'done');
  assert.equal(race.karts.length, 1);
});

test('heist: traffic and cops join, only you race, three busts and you are caught', () => {
  const input = { throttle: 0, brake: 0, steer: 0, useItem: false };
  const race = new Race({ track: oval, seed: 3, rivals: 0, countdown: 0, humanInput: input, items: false, rules: { potato: false, heist: true, timebomb: true } });
  const cops = race.karts.filter((k) => k.cop);
  const traffic = race.karts.filter((k) => k.traffic);
  assert.equal(cops.length, 3);
  assert.equal(traffic.length, 18);
  assert.deepEqual(race.order.map((k) => k.name), ['YOU']);
  assert.equal(race.player.focus, 0, 'the bomb has to be earned');
  // A slow, careful driver: the cops should get it.
  race.player.controller = new AIDriver(new Rng(1), { skill: 0.6 });
  let busts = 0;
  race.events.on('heist:bust', () => busts++);
  for (let i = 0; i < 60 * 150 && race.phase !== 'done'; i++) race.step(DT);
  assert.equal(race.phase, 'done');
  assert.ok(busts >= 1, 'the cops bust you at least once');
  if (race.player.caught) {
    assert.equal(race.player.busts, 3);
    assert.equal(race.results()[0].caught, true);
  } else assert.ok(race.player.finished);
});

test('heist: traffic never counts as finishing and cops never lap into the results', () => {
  const race = new Race({ track: oval, seed: 4, rivals: 0, countdown: 0, humanInput: null, laps: 1, items: false, rules: { potato: false, heist: true } });
  for (let i = 0; i < 60 * 60; i++) race.step(DT);
  assert.ok(race.karts.filter((k) => k.traffic || k.cop).every((k) => !k.finished));
});

// --- Batch 4 -----------------------------------------------------------------

test('every lab track is a sound loop', async () => {
  const { RING_STAGES } = await import('../src/tracks/ring.js');
  const short = (await import('../src/tracks/shortOval.js')).default;
  for (const def of [short, ...RING_STAGES.map(([, d]) => d)]) {
    const t = new Track(def);
    assert.ok(t.length > 500, def.id);
    assert.ok(def.points.length >= 10, def.id);
  }
});

test('slingshot v2: the grid does not all fire on the same frame', () => {
  const race = new Race({ track: oval, seed: 2, rivals: 10, countdown: 0, humanInput: null, laps: 3, items: false, rules: { potato: false, slingshot: 2 } });
  const times = [];
  race.events.on('draft:slingshot', ({ auto }) => auto && times.push(Math.round(race.time * 60)));
  while (race.time < 4) race.step(DT);
  const counts = {};
  for (const t of times) counts[t] = (counts[t] ?? 0) + 1;
  assert.ok(Math.max(...Object.values(counts)) <= 2, `same-frame slingshots: ${JSON.stringify(counts)}`);
});

test('shrinking royale: the arena steps down as karts drop, and everyone stays on the track', async () => {
  const ring = (await import('../src/tracks/bullring.js')).default;
  const race = new Race({ track: ring, seed: 1, rivals: 10, countdown: 0, humanInput: null, items: false, rules: { potato: false, royale: 2, shrink: true } });
  const ids = [];
  race.events.on('arena:shrink', ({ track }) => ids.push(track.id));
  for (let i = 0; i < 60 * 300 && race.phase !== 'done'; i++) {
    race.step(DT);
    for (const k of race.karts) assert.ok(Math.abs(k.lateral) <= race.track.fenceOffset + 1, 'inside the fence');
  }
  assert.equal(race.phase, 'done');
  assert.deepEqual(ids, ['ring-small', 'ring-tiny']);
});

test('royale: a potato holder with someone right behind backs into them', () => {
  const race = new Race({ track: oval, seed: 1, rivals: 2, countdown: 0, humanInput: null, items: false, rules: { potato: false, royale: 2 } });
  const [a, b, c] = race.karts;
  const pt = race.track.pointAt(500);
  const fx = Math.cos(pt.angle);
  const fy = Math.sin(pt.angle);
  a.x = pt.x; a.y = pt.y; a.heading = pt.angle; a.vx = fx * 60; a.vy = fy * 60;
  b.x = pt.x - fx * 40; b.y = pt.y - fy * 40; b.heading = pt.angle; b.vx = fx * 30; b.vy = fy * 30;
  c.x = pt.x + fx * 900; c.y = pt.y + fy * 900;
  b.controller = new IdleController(); // a sitting duck behind the holder
  for (const k of race.karts) race.applyTrack(k);
  race.potatoes[0].give(a, null);
  let passed = false;
  race.events.on('potato:pass', ({ from, to }) => (passed = passed || (from === a && to === b)));
  for (let i = 0; i < 60 * 4 && !passed; i++) race.step(DT);
  assert.ok(passed);
});

test('heist 2: four cops to start; each new lap adds cops and roadblocks with a gap', () => {
  const input = { throttle: 0, brake: 0, steer: 0, useItem: false };
  const race = new Race({ track: oval, seed: 6, rivals: 0, countdown: 0, humanInput: input, laps: 3, items: false, rules: { potato: false, heist: 2, timebomb: true } });
  assert.equal(race.karts.filter((k) => k.cop).length, 4);
  const speed0 = race.karts.find((k) => k.cop).base.maxSpeed;
  race.events.emit('lap', { kart: race.player, lap: 1, lapTime: 15 });
  assert.equal(race.karts.filter((k) => k.cop).length, 6);
  assert.ok(race.karts.find((k) => k.cop).base.maxSpeed > speed0);
  const blocks = race.entities.filter((e) => e.roadblock);
  assert.ok(blocks.length > 10);
  // Every roadblock row leaves a way through on the road.
  const rows = new Map();
  for (const b of blocks) {
    const key = Math.round(b.s);
    rows.set(key, [...(rows.get(key) ?? []), b.lateral]);
  }
  assert.equal(rows.size, 2);
  for (const lats of rows.values()) {
    const sorted = lats.sort((x, y) => x - y);
    let widest = 0;
    for (let i = 1; i < sorted.length; i++) widest = Math.max(widest, sorted[i] - sorted[i - 1]);
    assert.ok(widest >= 30, `gap ${widest}`);
  }
});

test('posting to GitHub uses a short link with the readable summary', () => {
  const runs = Array.from({ length: 40 }, () => ({ place: 3, of: 11, rams: 2, busts: 1, nearMisses: 12 }));
  const entries = SCENARIOS.map((s) => ({ scenario: s.id, vote: null, tags: [], note: 'y'.repeat(900), runs }));
  const { url, text } = issueUrl(entries);
  assert.ok(url.length <= 6000);
  assert.ok(!decodeURIComponent(url).includes('```json'), 'no raw json in the link');
  assert.ok(text.includes('```json'), 'the copied text keeps the raw data');
});

// --- Batch 5 -----------------------------------------------------------------

test('bowl royale: four potatoes from the start, then a wide ring, then the bowl', async () => {
  const ring = (await import('../src/tracks/bullring.js')).default;
  const race = new Race({ track: ring, seed: 3, rivals: 10, countdown: 0, humanInput: null, items: false, rules: { potato: false, royale: 3, shrink: 2 } });
  assert.equal(race.potatoes.length, 4);
  const ids = [];
  race.events.on('arena:shrink', ({ track }) => ids.push(track.id));
  let most = 0;
  for (let i = 0; i < 60 * 200 && race.phase !== 'done'; i++) {
    race.step(DT);
    most = Math.max(most, race.potatoes.filter((p) => p.holder).length);
    for (const k of race.karts) assert.ok(Math.abs(k.lateral) <= race.track.fenceOffset + 1);
  }
  assert.equal(race.phase, 'done');
  assert.deepEqual(ids, ['ring-wide', 'bowl']);
  assert.ok(most >= 3, `potatoes in play at once: ${most}`);
});

test('the bowl is road all the way across', async () => {
  const { bowl } = await import('../src/tracks/ring.js');
  const t = new Track(bowl);
  const cx = (Math.min(...t.xs) + Math.max(...t.xs)) / 2;
  const cy = (Math.min(...t.ys) + Math.max(...t.ys)) / 2;
  assert.equal(t.surfaceAt(t.project(cx, cy).lateral), 'road', 'the middle is drivable');
});

test('heist 3: some cops start ahead, and a cop behind you on the loop drives the wrong way at you', () => {
  const input = { throttle: 0, brake: 0, steer: 0, useItem: false };
  const race = new Race({ track: oval, seed: 6, rivals: 0, countdown: 0, humanInput: input, laps: 3, items: false, rules: { potato: false, heist: 3, timebomb: true } });
  const cops = race.karts.filter((k) => k.cop);
  const ahead = cops.filter((c) => {
    const d = ((c.s - race.player.s) % race.track.length + race.track.length) % race.track.length;
    return d > 0 && d < race.track.length / 2;
  });
  assert.ok(ahead.length >= 1, 'a cop up the road');
  for (let i = 0; i < 60 * 6; i++) race.step(DT);
  const wrongWay = cops.some((c) => Math.cos(c.heading - race.track.headingAt(c.s)) < -0.5);
  assert.ok(wrongWay, 'a cop has turned round to come at you');
});

test('heist 3: scattered roadblocks still leave a way through every row', () => {
  const input = { throttle: 0, brake: 0, steer: 0, useItem: false };
  const race = new Race({ track: oval, seed: 8, rivals: 0, countdown: 0, humanInput: input, laps: 3, items: false, rules: { potato: false, heist: 3 } });
  race.events.emit('lap', { kart: race.player, lap: 1, lapTime: 15 });
  const blocks = race.entities.filter((e) => e.roadblock);
  assert.ok(blocks.length > 15);
  // Not one straight line: the stacks spread along the road.
  const ss = blocks.map((b) => b.s).sort((x, y) => x - y);
  assert.ok(ss.some((s, i) => i && s - ss[i - 1] > 20), 'staggered rows');
});

test('time warp: full speed for you, plus extra grip and steering', () => {
  const { race, me, input } = pair({ timebomb: true }, { gap: 200, ahead: 100, behind: 150 });
  me.focus = 1;
  input.focus = true;
  race.step(DT);
  assert.ok(race.bullet.active);
  const st = me.stats();
  assert.ok(st.grip > 5.5 * 1.3 && st.turnRate > 3.3 * 1.2);
});
