// BUMPER. Motion RICOCHET: a springy bubble. Every bump with a kart or the fence kicks
// you forward, and a blast or pop just bounces off. Field REPEL: pushes nearby karts
// away from you. Collateral: a repelled kart can land ahead of you.

import { powerups } from './registry.js';
import { kartsNear, pushAway, onceEach } from './kit.js';

export const BUMPER = {
  duration: 5,
  bumpKick: 55,
  wallKick: 35,
  cooldown: 0.3,        // seconds between ricochet kicks off the same thing
  repelRadius: 34,
  repel: 260,
};

export const ricochet = {
  name: 'RICOCHET',
  tags: ['bumper'],
  duration: (p) => BUMPER.duration * (1 + 0.4 * (p - 1)),
  // A little faster even with nothing to bounce off, so it always helps.
  modifiers: () => ({ maxSpeed: 1.08, accel: 1.2 }),
  start(m) {
    m.race.events.emit('sfx', { name: 'bumper', kart: m.kart });
  },
  onBump(m, other) {
    if (!onceEach(m, 'ricochet', other, BUMPER.cooldown)) return;
    m.kart.kick(BUMPER.bumpKick * m.power);
    m.race.events.emit('ricochet', { kart: m.kart, by: other });
    m.race.events.emit('sfx', { name: 'ricochet', kart: m.kart });
  },
  onWall(m) {
    if (!onceEach(m, 'ricochet', 'wall', BUMPER.cooldown)) return;
    m.kart.kick(BUMPER.wallKick * m.power);
    m.race.events.emit('ricochet', { kart: m.kart, by: null });
    m.race.events.emit('sfx', { name: 'ricochet', kart: m.kart });
  },
};

export const repel = {
  name: 'REPEL',
  tick(m, dt) {
    const k = m.kart;
    for (const { kart } of kartsNear(m.race, k.x, k.y, BUMPER.repelRadius * Math.sqrt(m.fieldPower), k)) {
      pushAway(kart, k.x, k.y, BUMPER.repel * m.fieldPower * dt, m.race);
    }
  },
};

powerups.register({
  id: 'bumper',
  name: 'BUMPER',
  short: 'BUMPER',
  abbr: 'BMP',
  description: 'A springy bubble: every bump kicks you forward. Pushes nearby karts away.',
  icon: 'bumper',
  weight: 1,
  opposite: 'hook',
  aiWants: ({ race, kart }) => race.karts.some((k) => k !== kart && !k.finished && Math.abs(k.progress - kart.progress) < 90),
  motion: ricochet,
  field: repel,
});
