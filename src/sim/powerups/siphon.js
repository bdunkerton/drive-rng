// SIPHON. Motion ABSORB: for a few seconds, any kart that touches you gives you its
// speed: you're kicked forward by however fast it was going, and it's left crawling.
// Field UNDERTOW: karts just ahead of you get dragged back toward you. Collateral: you've
// pulled the pack into your lap.

import { powerups } from './registry.js';
import { kartsNear, pullToward, loosen, onceEach } from './kit.js';

export const SIPHON = {
  duration: 4,
  take: 0.7,            // share of the other kart's speed you take
  leave: 0.3,           // share of its speed it keeps
  minKick: 30,
  undertowRadius: 90,
  undertow: 170,
};

export const absorb = {
  name: 'ABSORB',
  tags: ['siphon'],
  duration: (p) => SIPHON.duration * (1 + 0.3 * (p - 1)),
  modifiers: () => ({ maxSpeed: 1.05 }),
  start(m) {
    m.race.events.emit('sfx', { name: 'magnet', kart: m.kart });
  },
  onBump(m, other) {
    if (!onceEach(m, 'absorb', other, 0.5)) return;
    const k = m.kart;
    const speed = Math.hypot(other.vx, other.vy);
    k.kick(Math.max(SIPHON.minKick, speed * SIPHON.take) * Math.sqrt(m.power));
    other.vx *= SIPHON.leave;
    other.vy *= SIPHON.leave;
    loosen(other, m.race, 0.4);
    m.race.events.emit('siphon', { kart: k, other, speed });
    m.race.events.emit('sfx', { name: 'ricochet', kart: k });
  },
};

export const undertow = {
  name: 'UNDERTOW',
  tick(m, dt) {
    const k = m.kart;
    for (const { kart } of kartsNear(m.race, k.x, k.y, SIPHON.undertowRadius * Math.sqrt(m.fieldPower), k)) {
      if (kart.progress <= k.progress) continue; // only the ones ahead
      pullToward(kart, k.x, k.y, SIPHON.undertow * m.fieldPower * dt, m.race);
    }
  },
};

powerups.register({
  id: 'siphon',
  name: 'SIPHON',
  short: 'SIPHON',
  abbr: 'SIP',
  description: 'Anything that touches you gives you its speed. Drags the karts ahead back into you.',
  icon: 'siphon',
  weight: 1,
  aiWants: ({ race, kart }) => race.karts.some((k) => k !== kart && !k.finished && Math.abs(k.progress - kart.progress) < 80),
  motion: absorb,
  field: undertow,
});
