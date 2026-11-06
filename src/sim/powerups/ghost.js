// GHOST. Motion PHASE: you go see-through. Karts, blasts and pops pass straight through
// you, and grass doesn't slow you, so you can cut corners. Field VANISH: karts near you
// phase out too, so whatever was in your way ghosts out of it. Collateral: they can use
// the gap you opened.

import { powerups } from './registry.js';
import { kartsNear } from './kit.js';

export const GHOST = {
  duration: 2.4,
  vanishRadius: 32,
  vanishSeconds: 0.5,
};

export const phase = {
  name: 'PHASE',
  tags: ['phase'],
  duration: (p) => GHOST.duration * (1 + 0.4 * (p - 1)),
  modifiers: () => ({ maxSpeed: 1.15, accel: 1.3 }),
  start(m) {
    m.race.events.emit('sfx', { name: 'ghost', kart: m.kart });
  },
};

export const vanish = {
  name: 'VANISH',
  start(m) {
    m.race.events.emit('vanish', { kart: m.kart });
  },
  tick(m) {
    const k = m.kart;
    for (const { kart } of kartsNear(m.race, k.x, k.y, GHOST.vanishRadius * Math.sqrt(m.fieldPower), k)) {
      kart.addEffect({ id: 'phased', duration: GHOST.vanishSeconds, tags: ['phase'] }, m.race);
    }
  },
};

powerups.register({
  id: 'ghost',
  name: 'GHOST',
  short: 'GHOST',
  abbr: 'GST',
  description: 'Go see-through: nothing can touch you and grass does not slow you.',
  icon: 'ghost',
  weight: 1,
  opposite: 'bulk',
  motion: phase,
  field: vanish,
});
