// RAMP. Motion LAUNCH: you drop a ramp in front of you and take off: a long, fast jump
// you can barely steer. Field RAMPS: you leave a launch ramp behind you, and anyone who
// drives over it gets thrown forward too. Collateral: you've just built them a ramp.

import { powerups } from './registry.js';
import { LaunchRamp } from '../hazards.js';

export const RAMP = {
  duration: 1.1,
  height: 18,
  kick: 50,
  airSpeed: 1.45,
  rampLife: 5,
};

export const launch = {
  name: 'LAUNCH',
  tags: ['air', 'launch'],
  height: RAMP.height,
  duration: (p) => RAMP.duration * (1 + 0.25 * (p - 1)),
  modifiers: (p) => ({ maxSpeed: RAMP.airSpeed + 0.1 * (p - 1), turnRate: 0.6, grip: 0.7 }),
  start(m) {
    m.kart.kick(RAMP.kick * m.power);
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

export const ramps = {
  name: 'RAMPS',
  start(m) {
    const k = m.kart;
    const s = k.s - 6;
    const p = m.race.track.pointAt(s, k.lateral);
    m.race.spawn(new LaunchRamp({ owner: k, x: p.x, y: p.y, angle: p.angle, life: RAMP.rampLife, power: m.fieldPower }));
  },
  release(m) {
    // A second ramp where the motion ends, for whoever's following.
    const k = m.kart;
    const p = m.race.track.pointAt(k.s - 10, k.lateral);
    m.race.spawn(new LaunchRamp({ owner: k, x: p.x, y: p.y, angle: p.angle, life: RAMP.rampLife, power: m.fieldPower }));
  },
};

powerups.register({
  id: 'ramp',
  name: 'RAMP',
  short: 'RAMP',
  abbr: 'RMP',
  description: 'A long, fast jump off a ramp. Leaves ramps behind that launch anyone following.',
  icon: 'ramp',
  weight: 1,
  aiWants: ({ race, kart }) => race.track.bendBetween(kart.s, kart.s + 220) < 0.5,
  motion: launch,
  field: ramps,
});
