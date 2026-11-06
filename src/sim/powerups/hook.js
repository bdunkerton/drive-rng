// HOOK. Motion TETHER: latch onto the nearest kart ahead, get reeled in, and slingshot
// past it with a burst of speed when you draw level (or when the line runs out).
// You pass through the kart you're hooked to. Field PULL: drags nearby karts in toward
// you. Collateral: miss, and you've reeled yourself somewhere you didn't want to be.

import { powerups } from './registry.js';
import { floorIt, kartsNear, pullToward, speedBurst, steerToward } from './kit.js';

export const HOOK = {
  reach: 300,           // only latches onto a kart this far ahead along the course
  duration: 1.3,
  reel: 380,            // pixels per second per second toward the target
  aim: 5,               // radians per second the line turns you toward it
  maxPull: 240,         // the reel stops adding speed past this
  slingKick: 50,
  slingSeconds: 0.8,
  pullRadius: 70,
  pull: 150,
};

/** The kart a hook would latch onto right now, or null. */
export function hookTarget(race, kart, reach = HOOK.reach) {
  return race.kartsAhead(kart).find((k) => k.progress - kart.progress <= reach) ?? null;
}

export const tether = {
  name: 'TETHER',
  tags: ['boost', 'tether'],
  duration: (p) => HOOK.duration * (1 + 0.25 * (p - 1)),
  modifiers: (p) => ({ maxSpeed: 1.6 + 0.1 * (p - 1), accel: 3 }),
  start(m) {
    const target = hookTarget(m.race, m.kart);
    m.data.target = target;
    m.effect.target = target;
    if (!target) m.kart.kick(30 * m.power);
    m.race.events.emit('hook:latch', { kart: m.kart, target });
    m.race.events.emit('sfx', { name: 'hook', kart: m.kart });
  },
  tick(m, dt) {
    const k = m.kart;
    const t = m.data.target;
    floorIt(k);
    if (!t) return;
    if (t.finished) return m.stop();
    // Reel in toward a point just beside and ahead of the target, so you go past it, not into it.
    const side = k.lateral >= t.lateral ? 1 : -1;
    const aim = m.race.track.pointAt(t.s + 10, t.lateral + side * 12);
    steerToward(k, aim.x, aim.y, HOOK.aim, dt);
    if (k.speed < HOOK.maxPull * Math.sqrt(m.power)) pullToward(k, aim.x, aim.y, HOOK.reel * m.power * dt);
    if (k.progress >= t.progress + 4) {
      m.data.passed = true;
      m.stop();
    }
  },
  end(m) {
    const k = m.kart;
    m.effect.target = null;
    speedBurst(k, m.race, HOOK.slingSeconds * Math.sqrt(m.power), 1.45, HOOK.slingKick * m.power);
    m.race.events.emit('hook:release', { kart: k, target: m.data.target, passed: !!m.data.passed });
    m.race.events.emit('sfx', { name: 'boost', kart: k });
  },
};

export const pull = {
  name: 'PULL',
  tick(m, dt) {
    const k = m.kart;
    for (const { kart } of kartsNear(m.race, k.x, k.y, HOOK.pullRadius * Math.sqrt(m.fieldPower), k)) {
      pullToward(kart, k.x, k.y, HOOK.pull * m.fieldPower * dt, m.race);
    }
  },
};

powerups.register({
  id: 'hook',
  name: 'HOOK',
  short: 'HOOK',
  abbr: 'HK',
  description: 'Latches onto the kart ahead, reels you in and slingshots you past.',
  icon: 'hook',
  weight: 1,
  opposite: 'bumper',
  aiWants: ({ race, kart }) => !!hookTarget(race, kart),
  motion: tether,
  field: pull,
});
