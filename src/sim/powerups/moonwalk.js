// MOONWALK. Motion MOONWALK: you spin round to face backwards and thrust the way you
// were going, faster than you can drive forwards. The steering is reversed while you
// do it. When it ends you spin back round. Field FLIPSIDE: karts near you get spun round
// too, and moonwalk for a moment. Collateral: everyone near you is driving backwards.

import { powerups } from './registry.js';
import { kartsNear, onceEach } from './kit.js';
import { angleDiff, clamp } from '../../core/math.js';

export const MOONWALK = {
  duration: 2.2,
  maxSpeed: 1.3,
  settle: 2.5,          // radians per second it eases your nose to point straight back
  flipRadius: 30,
  flipSeconds: 0.9,
};

/** Turn a kart round to face the other way, without changing where it's going. */
function about(kart) {
  kart.heading += Math.PI;
}

/** The moonwalk itself, as an effect: also used by FLIPSIDE on other karts. */
export function moonwalkEffect(duration, { power = 1, steady = true } = {}) {
  return {
    id: 'moonwalking',
    duration,
    modifiers: { maxSpeed: MOONWALK.maxSpeed + 0.1 * (power - 1), accel: 1.5, turnRate: 0.8 },
    tags: ['moonwalk'],
    stacking: 'ignore',
    onStart(k, race) {
      about(k);
      race.events.emit('moonwalk', { kart: k });
    },
    onTick(k, dt, race) {
      k.controls.brake = 0;
      if (!k.isPlayer || !steady) {
        // Rivals (and karts that got flipped) can't drive backwards on purpose: aim the
        // tail up the road and let the thrust carry them.
        const aim = race.track.pointAt(k.s + 60, k.lateral * 0.5);
        const want = Math.atan2(aim.y - k.y, aim.x - k.x) + Math.PI;
        k.heading += clamp(angleDiff(k.heading, want), -4 * dt, 4 * dt);
        k.controls.steer = 0;
      } else if (k.speed > 20) {
        // Ease the nose to point straight back along where you're going.
        const want = Math.atan2(k.vy, k.vx) + Math.PI;
        k.heading += clamp(angleDiff(k.heading, want), -MOONWALK.settle * dt, MOONWALK.settle * dt);
      }
    },
    onEnd(k, race) {
      about(k);
      race.events.emit('moonwalk:end', { kart: k });
    },
  };
}

export const moonwalk = {
  name: 'MOONWALK',
  tags: [],
  duration: (p) => MOONWALK.duration * (1 + 0.3 * (p - 1)),
  start(m) {
    m.kart.addEffect(moonwalkEffect(m.effect.duration, { power: m.power }), m.race);
    m.race.events.emit('sfx', { name: 'moonwalk', kart: m.kart });
  },
  end(m) {
    m.kart.effects.remove('moonwalking', m.kart, m.race);
  },
};

export const flipside = {
  name: 'FLIPSIDE',
  tick(m) {
    const k = m.kart;
    for (const { kart } of kartsNear(m.race, k.x, k.y, MOONWALK.flipRadius * Math.sqrt(m.fieldPower), k)) {
      if (kart.effects.hasTag('air') || kart.effects.hasTag('phase') || kart.effects.has('moonwalking')) continue;
      if (!onceEach(m, 'flip', kart)) continue;
      kart.addEffect(moonwalkEffect(MOONWALK.flipSeconds, { steady: false }), m.race);
      m.race.events.emit('flipped', { kart, by: k });
    }
  },
};

powerups.register({
  id: 'moonwalk',
  name: 'MOONWALK',
  short: 'MOON',
  abbr: 'MWK',
  description: 'Spin round and thrust backwards, faster than you can drive. Spins anyone near you round too.',
  icon: 'moonwalk',
  weight: 1,
  opposite: 'blink',
  aiWants: ({ race, kart }) => race.track.bendBetween(kart.s, kart.s + 220) < 0.6,
  motion: moonwalk,
  field: flipside,
});
