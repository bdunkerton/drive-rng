// Everything that can knock a kart about goes through hitKart, so shields, giants
// and spin-outs behave the same whether it was a rocket, a banana or a ram.

import { HITS } from '../config.js';
import { toast } from './toast.js';
import { giveItem, itemName } from './hand.js';

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

/** If the kart has a shield, use up one charge of it and return true. */
export function consumeShield(kart, race) {
  const shield = kart.effects.active.find((e) => e.id === 'shield');
  if (!shield) return false;
  shield.charges = (shield.charges ?? 1) - 1;
  if (shield.charges <= 0) kart.effects.remove('shield', kart, race);
  race.events.emit('shield:pop', { kart, left: Math.max(0, shield.charges) });
  race.events.emit('sfx', { name: 'block', kart });
  toast(race, kart, 'BLOCKED!', 'good');
  return true;
}

/**
 * Take the victim's front item. A shield blocks it (and pops).
 * @returns {'stolen' | 'blocked' | 'empty'}
 */
export function stealItem(thief, victim, race) {
  if (!victim.items.length || thief === victim) return 'empty';
  if (consumeShield(victim, race)) {
    toast(race, thief, `${victim.name} BLOCKED IT`, 'bad');
    return 'blocked';
  }
  const item = victim.items.shift();
  item.roulette = Math.max(item.roulette, 0.3);
  const name = itemName(item);
  const result = giveItem(thief, item, { overflow: 'fuse' });
  race.events.emit('steal', { thief, victim, item, result });
  race.events.emit('sfx', { name: 'steal', kart: thief });
  race.events.emit('sfx', { name: 'steal', kart: victim });
  toast(race, thief, result === 'dropped' ? `GRABBED ${name}, NO ROOM` : `STOLE ${name}!`, 'good');
  toast(race, victim, `${thief.name} STOLE YOUR ${name}`, 'bad');
  return 'stolen';
}

/**
 * Try to spin a kart out.
 * @returns {'hit' | 'blocked' | 'shrugged' | 'already'}
 */
export function hitKart(target, race, { by = null, kind = 'hit' } = {}) {
  if (target.effects.has('spinout')) return 'already';
  if (target.effects.hasTag('giant')) {
    race.events.emit('hit:shrug', { kart: target, by, kind });
    return 'shrugged';
  }
  if (consumeShield(target, race)) {
    if (by && by !== target) toast(race, by, `${target.name} BLOCKED IT`, 'bad');
    return 'blocked';
  }
  target.addEffect(spinoutEffect(), race);
  race.events.emit('hit', { kart: target, by, kind });
  race.events.emit('sfx', { name: 'spin', kart: target });
  if (by && by !== target) {
    toast(race, target, `HIT BY ${by.name}!`, 'bad');
    toast(race, by, `HIT ${target.name}!`, 'good');
  } else {
    toast(race, target, 'SPUN OUT!', 'bad');
  }
  return 'hit';
}
