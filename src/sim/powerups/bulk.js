// BULK. Motion CHARGE: you grow huge and heavy, a bit faster, and nothing spins you out
// or pops you. Field SHOVE: anyone who touches you bounces off hard. Collateral: you
// might shove someone onto a speed lane.

import { powerups } from './registry.js';
import { kartsNear, pushAway, onceEach } from './kit.js';

export const BULK = {
  duration: 3.5,
  scale: 1.8,
  mass: 4,
  maxSpeed: 1.1,
  shoveReach: 6,
  shove: 120,
};

export const charge = {
  name: 'CHARGE',
  tags: ['giant'],
  duration: (p) => BULK.duration * (1 + 0.4 * (p - 1)),
  modifiers: (p) => ({ scale: Math.min(2.4, BULK.scale + 0.2 * (p - 1)), mass: BULK.mass, maxSpeed: BULK.maxSpeed }),
  start(m) {
    m.race.events.emit('sfx', { name: 'bulk', kart: m.kart });
  },
};

export const shove = {
  name: 'SHOVE',
  tick(m) {
    const k = m.kart;
    const reach = k.radius + BULK.shoveReach * Math.sqrt(m.fieldPower);
    for (const { kart } of kartsNear(m.race, k.x, k.y, reach, k)) {
      if (kart.effects.hasTag('phase') || kart.effects.hasTag('air')) continue;
      if (!onceEach(m, 'shove', kart, 0.35)) continue;
      pushAway(kart, k.x, k.y, BULK.shove * m.fieldPower, m.race);
      m.race.events.emit('shove', { kart: k, other: kart });
      m.race.events.emit('sfx', { name: 'bump', kart: k });
    }
  },
};

powerups.register({
  id: 'bulk',
  name: 'BULK',
  short: 'BULK',
  abbr: 'BLK',
  description: 'Grow huge and heavy. Nothing knocks you about, and anyone who touches you bounces off.',
  icon: 'bulk',
  weight: 1,
  opposite: 'ghost',
  motion: charge,
  field: shove,
});
