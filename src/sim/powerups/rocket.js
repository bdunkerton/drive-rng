// ROCKET. Motion RIDE: strap in and go very fast, steering like a rocket (wide), and
// nothing can knock you about. Field BLAST: when the motion ends, a blast in front of
// you throws everyone near it aside, spins out anyone right next to it, and kicks you
// forward. Collateral: aim badly and you've just thrown the pack around for nothing.

import { powerups } from './registry.js';
import { floorIt, blastAt } from './kit.js';

export const ROCKET = {
  duration: 1.3,
  maxSpeed: 1.85,
  kick: 60,
  blastRadius: 55,
  blastPush: 170,
  spinRadius: 22,
  jumpKick: 35,         // the owner's kick forward when the blast goes off
};

export const ride = {
  name: 'RIDE',
  tags: ['boost', 'ride'],
  duration: (p) => ROCKET.duration * (1 + 0.4 * (p - 1)),
  modifiers: (p) => ({ maxSpeed: ROCKET.maxSpeed + 0.15 * (p - 1), accel: 5, turnRate: 0.75, grip: 1.3 }),
  start(m) {
    m.kart.kick(ROCKET.kick * m.power);
    m.race.events.emit('sfx', { name: 'rocket', kart: m.kart });
  },
  tick(m) {
    floorIt(m.kart);
  },
};

export const blast = {
  name: 'BLAST',
  release(m) {
    const k = m.kart;
    const fp = m.fieldPower;
    const r = Math.sqrt(fp);
    blastAt(m.race, k.x + Math.cos(k.heading) * 10, k.y + Math.sin(k.heading) * 10, {
      owner: k,
      radius: ROCKET.blastRadius * r,
      push: ROCKET.blastPush * fp,
      spinRadius: ROCKET.spinRadius * r,
    });
    k.kick(ROCKET.jumpKick * fp);
  },
};

powerups.register({
  id: 'rocket',
  name: 'ROCKET',
  short: 'ROCKET',
  abbr: 'RKT',
  description: 'Ride a rocket, then it blows up in front of you and scatters the pack.',
  icon: 'rocket',
  weight: 1,
  aiWants: ({ race, kart }) => race.track.bendBetween(kart.s, kart.s + 200) < 0.55,
  motion: ride,
  field: blast,
});
