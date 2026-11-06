// The combo lab: tries every item (singles, Megas and every ordered fusion) in lots of
// real race moments and measures what it does, against the exact same race without it.
//
//   npm run lab                        every combo, 24 race moments each
//   npm run lab -- --moments 60        more moments per combo (slower, steadier numbers)
//   npm run lab -- --only hook,boost   just the combos made from these items
//   npm run lab -- --with black-hole   just the combos that have this item in them
//   npm run lab -- --with yank,orbit   ...or any of these
//   npm run lab -- --sort vibe         rank by "vibe" (momentum chaos) instead of score
//   npm run lab -- --out lab.json      also write every number to a file
//
// How a "moment" works: an all-AI race (6 karts) runs to a chosen second, the kart in
// 4th is handed the item, its AI driver uses it when it judges the moment right (or
// after 3 seconds at most), and the race runs on for 8 seconds from the hand-over. The same race is also run with no item. Races are seeded, so everything up
// to that second is identical, and the difference afterwards is the item. While it
// watches, nobody picks up new items (other karts still use what they're holding).
//
// What it measures, per combo (averaged over the moments):
//   gain      places gained versus no item (a few seconds later)
//   dist      pixels gained along the course
//   big       share of moments where it gained 2+ places
//   worse     share of moments where you ended up further back than without it
//   chaos     how many other karts the item touched directly (popped, blasted, flipped,
//             launched, oiled, towed, shoved, or pushed and pulled by its field)
//   ripple    how many other karts ended up 30+ pixels from where they'd have been anyway
//   air       seconds in the air;  back  seconds driving forward while facing backwards
//   top       top speed, as a multiple of normal top speed
//   swing     how much the result varies between moments (standard deviation of gain)
//   score     a rough "is this interesting" number combining the above (see below)

import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const WINDOW = 8;           // seconds watched after the item is handed over
const FORCE_AFTER = 3;      // if the kart hasn't used it by then, it's used for it
const KARTS = 6;
const TARGET_PLACE = 4;     // the kart that gets the item: mid-pack

/** The race moments: [seed, second the item is used]. Spread round the lap and the race. */
export function moments(n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ seed: 1000 + i, at: 6 + ((i * 7.37) % 34) });
  return out;
}

export async function runMoment(sim, combo, m) {
  const { Race, meadow, useFrontItem, makeItem, angleDiff } = sim;
  const dt = 1 / 60;
  const build = () => new Race({ track: meadow, seed: m.seed, rivals: KARTS - 1, humanInput: null, countdown: 0, laps: 9 });
  const run = (withItem) => {
    const race = build();
    while (race.time < m.at) race.step(dt);
    const target = race.order[TARGET_PLACE - 1];
    target.items = [];
    // No new pickups while we watch, so the only new thing in the race is this item.
    race.itemsOff = true;
    const watch = { air: 0, back: 0, top: 0, walls: 0, places: [] };
    race.events.on('wall', ({ kart }) => kart === target && watch.walls++);
    race.events.on('tires:hit', ({ kart }) => kart === target && watch.walls++);
    // Karts this item touched directly: popped, blasted, flipped, launched, oiled, towed,
    // shoved, or yanked about by its field.
    const touched = (watch.touched = new Set());
    const mark = (k) => k && k !== target && touched.add(k.id);
    const by = (who, victim) => who === target && mark(victim);
    race.events.on('pop', (e) => by(e.by, e.kart));
    race.events.on('hit', (e) => by(e.by, e.kart));
    race.events.on('flipped', (e) => by(e.by, e.kart));
    race.events.on('blast', (e) => e.owner === target && e.karts.forEach(mark));
    race.events.on('slipstream', (e) => e.kart === target && e.karts.forEach(mark));
    race.events.on('shove', (e) => by(e.kart, e.other));
    race.events.on('pad:ride', (e) => by(e.pad.owner, e.kart));
    race.events.on('oil:slip', (e) => by(e.slick.owner, e.kart));
    race.events.on('ramp:launch', (e) => by(e.ramp.owner, e.kart));
    race.events.on('tires:hit', (e) => by(e.tires.owner, e.kart));
    race.events.on('ricochet', (e) => e.kart === target && mark(e.by));
    race.events.on('vault', (e) => by(e.kart, e.over));
    race.events.on('siphon', (e) => by(e.kart, e.other));
    race.events.on('cannon:hit', (e) => by(e.kart, e.other));
    race.events.on('yank', (e) => by(e.kart, e.target));
    race.events.on('lasso', (e) => by(e.kart, e.other));
    race.events.on('orbit', (e) => by(e.kart, e.pole));
    race.events.on('fling', (e) => e.kart === target && (e.karts ?? [e.other]).forEach(mark));
    race.events.on('bands:snap', (e) => e.kart === target && e.karts.forEach(mark));
    race.events.on('stomp', (e) => e.kart === target && e.karts.forEach(mark));
    // Collisions the item's kart was in, and karts sent flying near it.
    race.events.on('bump', ({ a, b, impact }) => (a === target || b === target) && impact > 30 && (watch.bumps = (watch.bumps ?? 0) + 1));
    watch.flung = new Set();
    race.events.on('effect:start', ({ kart, effect }) => {
      // Fields that push and pull loosen the tyres of whoever they move.
      if ((effect.id === 'loose' || effect.id === 'phased') && target.effects.hasTag('move') && Math.hypot(kart.x - target.x, kart.y - target.y) < 110) mark(kart);
    });
    if (withItem) {
      target.items = [makeItem(combo.parts)];
      target.items[0].wild = !!combo.wild;
    }
    const handedAt = race.time;
    const start = { progress: target.progress };
    const end = race.time + WINDOW;
    let lastProgress = target.progress;
    while (race.time < end && race.phase !== 'done') {
      // The kart's own driver picks the moment (as it would in a race), within reason.
      if (withItem && target.items.length && race.time - handedAt >= FORCE_AFTER) useFrontItem(target, race);
      race.step(dt);
      if (withItem && watch.usedAt === undefined && !target.items.length) watch.usedAt = race.time - handedAt;
      if (target.effects.hasTag('air')) watch.air += dt;
      const forward = target.progress > lastProgress;
      lastProgress = target.progress;
      if (forward && Math.abs(angleDiff(target.heading, race.track.headingAt(target.s))) > 2.2 && target.speed > 40) watch.back += dt;
      watch.top = Math.max(watch.top, target.speed / target.base.maxSpeed);
      if (withItem && target.effects.hasTag('move')) {
        for (const o of race.karts) {
          if (o === target || watch.flung.has(o.id)) continue;
          const near = Math.hypot(o.x - target.x, o.y - target.y) < 90;
          if (near && (o.speed > o.base.maxSpeed * 1.35 || (o.effects.hasTag('air') && !o.effects.hasTag('move')))) watch.flung.add(o.id);
        }
      }
    }
    return { race, target, start, watch, others: race.karts.filter((k) => k !== target).map((k) => ({ id: k.id, progress: k.progress })) };
  };
  const control = run(false);
  const treat = run(true);
  const otherBase = new Map(control.others.map((o) => [o.id, o.progress]));
  const ripple = treat.others.filter((o) => Math.abs(o.progress - otherBase.get(o.id)) > 30).length;
  const chaos = treat.watch.touched.size;
  return {
    gain: control.target.position - treat.target.position,
    dist: treat.target.progress - control.target.progress,
    endPlace: treat.target.position,
    chaos,
    ripple,
    bumps: treat.watch.bumps ?? 0,
    flung: treat.watch.flung.size,
    air: treat.watch.air,
    back: treat.watch.back,
    top: treat.watch.top,
    walls: treat.watch.walls - control.watch.walls,
    seed: m.seed,
    at: m.at,
    usedAfter: treat.watch.usedAt ?? null,
    targetId: treat.target.id,
  };
}

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** Roll a combo's moments up into one row. */
export function summarise(combo, rows) {
  const gains = rows.map((r) => r.gain);
  const s = {
    key: combo.key,
    name: combo.name,
    kind: combo.kind,
    parts: combo.parts,
    gain: mean(gains),
    dist: mean(rows.map((r) => r.dist)),
    big: mean(rows.map((r) => (r.gain >= 2 ? 1 : 0))),
    worse: mean(rows.map((r) => (r.dist < -10 ? 1 : 0))),
    chaos: mean(rows.map((r) => r.chaos)),
    ripple: mean(rows.map((r) => r.ripple)),
    bumps: mean(rows.map((r) => r.bumps)),
    flung: mean(rows.map((r) => r.flung)),
    air: mean(rows.map((r) => r.air)),
    back: mean(rows.map((r) => r.back)),
    top: mean(rows.map((r) => r.top)),
    walls: mean(rows.map((r) => r.walls)),
    swing: sd(gains),
  };
  // Interesting = it changes the race (places, other karts), it looks like something
  // (air, backwards, speed), and it isn't the same every time. Being strong alone isn't
  // enough, and an item that loses you ground more often than not is penalised.
  // Spectacle is capped, so looking wild can't carry an item that does nothing to the race.
  const spectacle = Math.min(1.5, s.air + s.back + Math.min(1, Math.max(0, s.top - 1.6)));
  s.score = Math.max(0, s.gain) * 1.5 + s.big * 2 + s.chaos * 0.8 + spectacle * 0.8 + s.swing * 0.5 - Math.max(0, s.worse - 0.25) * 3;
  // "Vibe": the PINBALL feel. Karts pulled in, bounced off, sent flying, and you coming
  // out of it ahead. Rewards contact and flung karts, still wants you to gain.
  s.vibe = Math.max(0, s.gain) * 1.2 + s.big * 1.5 + s.chaos * 0.9 + s.flung * 1.2 + Math.min(3, s.bumps) * 0.35 + s.swing * 0.3 - Math.max(0, s.worse - 0.3) * 3;
  // The single moment that best shows it off, for a clip.
  const showy = (r) => Math.max(0, r.gain) * 2 + r.chaos + r.air + r.back * 2 + (r.flung ?? 0) + Math.min(3, r.bumps ?? 0) * 0.5;
  s.best = rows.reduce((a, b) => (showy(b) > showy(a) ? b : a));
  return s;
}

export async function loadSim() {
  const root = new URL('../', import.meta.url);
  const { Race } = await import(new URL('src/sim/race.js', root));
  const meadow = (await import(new URL('src/tracks/meadow.js', root))).default;
  const { useFrontItem, makeItem } = await import(new URL('src/sim/hand.js', root));
  const { powerups, resolveItem } = await import(new URL('src/sim/powerups/index.js', root));
  const { angleDiff } = await import(new URL('src/core/math.js', root));
  return { Race, meadow, useFrontItem, makeItem, powerups, resolveItem, angleDiff };
}

/** Every item there is: singles, Megas, and every ordered pair (fusions and fizzles). */
export function allCombos(sim, only = null, withId = null) {
  const ids = sim.powerups.list().map((d) => d.id).filter((id) => !only || only.includes(id));
  const out = [];
  for (const a of ids) {
    for (const b of [null, ...ids]) {
      const parts = b ? [a, b] : [a];
      if (withId && !withId.some((id) => parts.includes(id))) continue;
      const r = sim.resolveItem({ parts });
      out.push({ key: parts.join('+'), parts, name: r.name, kind: r.kind });
    }
  }
  return out;
}

if (!isMainThread) {
  const sim = await loadSim();
  const { combos, n } = workerData;
  for (const combo of combos) {
    const rows = [];
    for (const m of moments(n)) rows.push(await runMoment(sim, combo, m));
    parentPort.postMessage(summarise(combo, rows));
  }
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
  };
  const n = Number(opt('moments', 24));
  const only = opt('only', null)?.split(',');
  const withId = opt('with', null)?.split(',');
  const out = opt('out', null);
  const sim = await loadSim();
  const combos = allCombos(sim, only, withId);
  const threads = Math.max(1, Math.min(cpus().length, 8));
  console.log(`\nDrive RNG combo lab  ·  ${combos.length} combos  ·  ${n} race moments each  ·  ${threads} threads\n`);
  const results = [];
  const started = Date.now();
  await Promise.all(
    Array.from({ length: threads }, (_, t) => new Promise((resolve, reject) => {
      const share = combos.filter((_, i) => i % threads === t);
      const w = new Worker(fileURLToPath(import.meta.url), { workerData: { combos: share, n } });
      w.on('message', (s) => {
        results.push(s);
        if (results.length % 20 === 0) process.stdout.write(`  ${results.length}/${combos.length} combos  (${((Date.now() - started) / 1000).toFixed(0)}s)\n`);
      });
      w.on('error', reject);
      w.on('exit', resolve);
    })),
  );
  const sortBy = opt('sort', 'score');
  results.sort((a, b) => b[sortBy] - a[sortBy]);
  const f = (x, d = 1) => x.toFixed(d).padStart(5);
  const pct = (x) => `${Math.round(x * 100)}%`.padStart(4);
  console.log(`\n  ${sortBy.toUpperCase().padStart(5)}  COMBO                      GAIN  BIG  WORSE CHAOS FLUNG BUMPS   AIR  BACK SWING`);
  for (const s of results.slice(0, 40)) {
    console.log(`  ${f(s[sortBy])}  ${`${s.name} (${s.key})`.padEnd(26).slice(0, 26)} ${f(s.gain)} ${pct(s.big)} ${pct(s.worse)} ${f(s.chaos)} ${f(s.flung)} ${f(s.bumps)} ${f(s.air)} ${f(s.back)} ${f(s.swing)}`);
  }
  const breakers = results.filter((s) => s.dist <= 0);
  console.log(`\n  ${breakers.length} combos lose ground on average: ${breakers.map((s) => s.name).join(', ') || 'none'}`);
  if (out) {
    writeFileSync(out, JSON.stringify({ moments: n, window: WINDOW, karts: KARTS, results }, null, 1));
    console.log(`  wrote ${out}`);
  }
  console.log('');
}
