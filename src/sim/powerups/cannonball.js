// CANNONBALL. Motion ROLL: you become a heavy iron ball, faster than you drive. Any kart
// you hit is knocked flying (into the air, at your speed) and you barely slow down.
// Field RUBBER: karts near you go rubbery: when they bump into each other, they bounce
// off harder than they hit. Collateral: one hit can set off a chain, and things fly
// everywhere, including back at you.

import { powerups } from './registry.js';
import { floorIt, kartsNear, popKart, onceEach } from './kit.js';

export const CANNONBALL = {
  duration: 2.6,
  mass: 6,
  scale: 1.3,
  maxSpeed: 1.3,
  launch: 0.9,          // a kart you hit leaves at this share of your speed
  rubberRadius: 70,
};

export const roll = {
  name: 'ROLL',
  tags: ['cannon', 'armour'],
  duration: (p) => CANNONBALL.duration * (1 + 0.3 * (p - 1)),
  modifiers: (p) => ({ mass: CANNONBALL.mass, scale: CANNONBALL.scale, maxSpeed: CANNONBALL.maxSpeed + 0.1 * (p - 1), accel: 2 }),
  start(m) {
    m.race.events.emit('sfx', { name: 'bulk', kart: m.kart });
  },
  tick(m) {
    floorIt(m.kart);
  },
  onBump(m, other) {
    if (!onceEach(m, 'cannon', other, 0.6)) return;
    const k = m.kart;
    const speed = Math.max(80, k.speed) * CANNONBALL.launch * Math.sqrt(m.power);
    const dx = other.x - k.x;
    const dy = other.y - k.y;
    const d = Math.hypot(dx, dy) || 1;
    // Knock it along your line, angled off where it was hit.
    const vx = Math.cos(k.heading) * 0.6 + (dx / d) * 0.4;
    const vy = Math.sin(k.heading) * 0.6 + (dy / d) * 0.4;
    const n = Math.hypot(vx, vy) || 1;
    other.vx = (vx / n) * speed;
    other.vy = (vy / n) * speed;
    popKart(other, m.race, { by: k, power: m.power });
    m.race.events.emit('cannon:hit', { kart: k, other });
  },
};

export const rubber = {
  name: 'RUBBER',
  tick(m) {
    const k = m.kart;
    for (const { kart } of kartsNear(m.race, k.x, k.y, CANNONBALL.rubberRadius * Math.sqrt(m.fieldPower), k)) {
      kart.addEffect({ id: 'rubber', duration: 0.3, tags: ['rubber'], bounce: 1 + 0.4 * m.fieldPower }, m.race);
    }
  },
};

powerups.register({
  id: 'cannonball',
  name: 'CANNONBALL',
  short: 'CANNON',
  abbr: 'CNB',
  description: 'Become a heavy iron ball: anything you hit goes flying, and you keep rolling.',
  icon: 'cannonball',
  weight: 1,
  motion: roll,
  field: rubber,
});
