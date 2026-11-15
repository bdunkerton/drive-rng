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
    const race = new Race({ track: oval, seed: 7, rivals: 10, countdown: 0, humanInput: null, laps: 1, items: false, rules: { potato: false, ...s.rules } });
    for (let i = 0; i < 60 * 60 && race.phase !== 'done'; i++) race.step(DT);
    assert.equal(race.phase, 'done', s.id);
    assert.equal(race.karts.length, 11);
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
  assert.ok(url.length <= 7800, `url ${url.length}`);
  assert.match(url, /labels=playtest/);
});
