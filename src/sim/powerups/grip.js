// GRIP. Motion RAILS: sticky tyres. You corner like you're on rails: no sliding, the
// steering stays sharp at any speed, and you're a little faster. Field SLICK: you leave
// a trail of oil behind you that takes the grip away from anyone who drives through it.
// Collateral: come round again too soon and it's your own oil.

import { powerups } from './registry.js';
import { OilSlick } from '../hazards.js';

export const GRIP = {
  duration: 4,
  grip: 3,
  turnRate: 1.35,
  maxSpeed: 1.12,
  oilEvery: 0.3,
  oilLife: 3,
};

export const rails = {
  name: 'RAILS',
  tags: ['rails'],
  duration: (p) => GRIP.duration * (1 + 0.4 * (p - 1)),
  modifiers: (p) => ({ grip: GRIP.grip, turnRate: GRIP.turnRate + 0.1 * (p - 1), maxSpeed: GRIP.maxSpeed + 0.04 * (p - 1) }),
  start(m) {
    m.race.events.emit('sfx', { name: 'grip', kart: m.kart });
  },
};

export const slick = {
  name: 'SLICK',
  tick(m, dt) {
    m.data.oilIn = (m.data.oilIn ?? 0) - dt;
    if (m.data.oilIn > 0) return;
    m.data.oilIn = GRIP.oilEvery;
    const k = m.kart;
    m.race.spawn(new OilSlick({ owner: k, x: k.x - Math.cos(k.heading) * 8, y: k.y - Math.sin(k.heading) * 8, life: GRIP.oilLife, size: Math.min(1.6, Math.sqrt(m.fieldPower)) }));
  },
};

powerups.register({
  id: 'grip',
  name: 'GRIP',
  short: 'GRIP',
  abbr: 'GRP',
  description: 'Corner on rails for a few seconds, leaving an oil slick behind you.',
  icon: 'grip',
  weight: 1,
  opposite: 'twister',
  // Best saved for the corners.
  aiWants: ({ race, kart }) => race.track.bendBetween(kart.s, kart.s + 200) > 0.8,
  motion: rails,
  field: slick,
});
