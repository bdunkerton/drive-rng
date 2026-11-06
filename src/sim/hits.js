// Spin-outs. Only one thing spins karts out now: being right next to a BLAST. Every
// spin-out goes through hitKart, so giants, rocket riders, bumpers and karts in the air
// behave the same whatever caused it.

import { HITS } from '../config.js';
import { toast } from './toast.js';

export function spinoutEffect() {
  return {
    id: 'spinout',
    duration: HITS.spinSeconds,
    modifiers: { grip: HITS.spinGrip },
    tags: ['spinout'],
    stacking: 'ignore',
    onTick(k, dt) {
      k.controls.throttle = 0;
      k.controls.brake = 0;
      k.controls.steer = 0;
      k.heading += HITS.spinRate * dt;
      const damp = Math.exp(-2.2 * dt);
      k.vx *= damp;
      k.vy *= damp;
    },
  };
}

/**
 * Try to spin a kart out.
 * @returns {'hit' | 'blocked' | 'shrugged' | 'missed' | 'already'}
 */
export function hitKart(target, race, { by = null, kind = 'hit' } = {}) {
  if (target.effects.has('spinout')) return 'already';
  if (target.effects.hasTag('air') || target.effects.hasTag('phase')) return 'missed';
  if (target.effects.hasTag('giant') || target.effects.hasTag('ride') || target.effects.hasTag('armour')) {
    race.events.emit('hit:shrug', { kart: target, by, kind });
    return 'shrugged';
  }
  if (target.effects.hasTag('bumper')) {
    // A bumper turns the hit into a bounce forward.
    target.kick(40);
    race.events.emit('ricochet', { kart: target, by });
    race.events.emit('sfx', { name: 'ricochet', kart: target });
    toast(race, target, 'BOING!', 'good');
    return 'blocked';
  }
  target.addEffect(spinoutEffect(), race);
  race.events.emit('hit', { kart: target, by, kind });
  race.events.emit('sfx', { name: 'spin', kart: target });
  if (by && by !== target) {
    toast(race, target, `BLASTED BY ${by.name}!`, 'bad');
    toast(race, by, `BLASTED ${target.name}!`, 'good');
  } else {
    toast(race, target, 'SPUN OUT!', 'bad');
  }
  return 'hit';
}
