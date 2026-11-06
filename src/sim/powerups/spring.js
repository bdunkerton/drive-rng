// SPRING. Motion LEAP: a big hop. While you're up you fly faster than you drive,
// nothing can touch you, and grass doesn't slow you. Field BOUNCE: pops into the air anyone you land on or pass
// over, and everyone near where you come down. Collateral: a popped kart keeps its
// speed and might land ahead of you.

import { powerups } from './registry.js';
import { kartsNear, popKart, onceEach } from './kit.js';

export const SPRING = {
  duration: 0.6,
  height: 12,
  kick: 30,
  airSpeed: 1.25,       // you fly faster than you drive
  touchReach: 8,        // BOUNCE pops karts this close while the motion lasts
  landRadius: 40,       // and everyone this close when it ends
};

export const leap = {
  name: 'LEAP',
  tags: ['air'],
  height: SPRING.height,
  duration: (p) => SPRING.duration * (1 + 0.25 * (p - 1)),
  modifiers: (p) => ({ maxSpeed: SPRING.airSpeed + 0.1 * (p - 1), turnRate: 1, grip: 0.9 }),
  start(m) {
    m.kart.kick(SPRING.kick * m.power);
    m.race.events.emit('sfx', { name: 'spring', kart: m.kart });
  },
  tick(m) {
    m.kart.controls.brake = 0;
  },
  end(m) {
    m.race.events.emit('land', { kart: m.kart, big: true });
    m.race.events.emit('sfx', { name: 'land', kart: m.kart });
  },
};

export const bounce = {
  name: 'BOUNCE',
  tick(m) {
    const k = m.kart;
    for (const { kart } of kartsNear(m.race, k.x, k.y, k.radius + SPRING.touchReach * Math.sqrt(m.fieldPower), k)) {
      if (onceEach(m, 'bounce', kart)) popKart(kart, m.race, { by: k, power: m.fieldPower });
    }
  },
  release(m) {
    const k = m.kart;
    const radius = SPRING.landRadius * Math.sqrt(m.fieldPower);
    for (const { kart } of kartsNear(m.race, k.x, k.y, radius, k)) {
      if (onceEach(m, 'bounce-land', kart)) popKart(kart, m.race, { by: k, power: m.fieldPower });
    }
    m.race.events.emit('bounce', { kart: k, x: k.x, y: k.y, radius });
  },
};

powerups.register({
  id: 'spring',
  name: 'SPRING',
  short: 'SPRING',
  abbr: 'SPR',
  description: 'A big hop. Pops anyone you land on into the air.',
  icon: 'spring',
  weight: 1,
  opposite: 'black-hole',
  // You can't steer much in the air: jump on the straights.
  aiWants: ({ race, kart }) => race.track.bendBetween(kart.s, kart.s + 200) < 0.4,
  motion: leap,
  field: bounce,
});
