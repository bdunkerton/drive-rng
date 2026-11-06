// BOOST. Motion DASH: a straight burst of speed. Field SLIPSTREAM: leaves a speed lane
// behind you that anyone can ride, and when the motion ends, everyone close to you
// (you included) gets a shove of speed. Collateral: whoever's behind gets a free ride.

import { powerups } from './registry.js';
import { floorIt, kartsNear, speedBurst } from './kit.js';
import { SpeedPad } from '../hazards.js';

export const BOOST = {
  duration: 1.5,
  maxSpeed: 1.55,
  accel: 3,
  kick: 45,
  padEvery: 0.07,       // seconds between speed-lane pads
  padLife: 2.2,
  releaseRadius: 38,    // the end-of-motion speed burst reaches this far
};

export const boostDuration = (power = 1) => BOOST.duration * (1 + 0.5 * (power - 1));

export const dash = {
  name: 'DASH',
  tags: ['boost'],
  duration: boostDuration,
  modifiers: (p) => ({ maxSpeed: BOOST.maxSpeed + 0.15 * (p - 1), accel: BOOST.accel }),
  start(m) {
    m.kart.kick(BOOST.kick * m.power);
    m.race.events.emit('sfx', { name: 'boost', kart: m.kart });
  },
  tick(m) {
    floorIt(m.kart);
  },
};

export const slipstream = {
  name: 'SLIPSTREAM',
  tick(m, dt) {
    m.data.padIn = (m.data.padIn ?? 0) - dt;
    if (m.data.padIn > 0) return;
    m.data.padIn = BOOST.padEvery;
    const k = m.kart;
    const fx = Math.cos(k.heading);
    const fy = Math.sin(k.heading);
    m.race.spawn(new SpeedPad({ owner: k, x: k.x - fx * 7, y: k.y - fy * 7, angle: k.heading, life: BOOST.padLife * Math.sqrt(m.fieldPower), power: m.fieldPower }));
  },
  release(m) {
    const k = m.kart;
    const fp = m.fieldPower;
    const near = kartsNear(m.race, k.x, k.y, BOOST.releaseRadius * Math.sqrt(fp), k);
    speedBurst(k, m.race, 0.6 * Math.sqrt(fp), 1.4, 20 * fp);
    for (const { kart } of near) speedBurst(kart, m.race, 0.7, 1.4, 30 * fp);
    m.race.events.emit('slipstream', { kart: k, x: k.x, y: k.y, radius: BOOST.releaseRadius * Math.sqrt(fp), karts: near.map((n) => n.kart) });
  },
};

powerups.register({
  id: 'boost',
  name: 'BOOST',
  short: 'BOOST',
  abbr: 'BST',
  description: 'A burst of speed that leaves a speed lane behind you. Anyone can ride the lane.',
  icon: 'boost',
  weight: 1,
  aiWants: ({ race, kart }) => race.track.bendBetween(kart.s, kart.s + 140) < 0.45,
  motion: dash,
  field: slipstream,
});
