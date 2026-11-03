import { powerups } from './registry.js';

export const SPEED_BOOST = {
  duration: 1.5,
  maxSpeed: 1.55,
  accel: 3,
  kick: 45,
};

/** Seconds a boost of this power lasts. */
export const boostDuration = (power = 1) => SPEED_BOOST.duration * (1 + 0.6 * (power - 1));

/** Give a kart a boost. Recipes use this too. */
export function applyBoost(kart, race, power = 1) {
  kart.kick(SPEED_BOOST.kick * power);
  kart.addEffect(
    {
      id: 'speed-boost',
      duration: boostDuration(power),
      modifiers: { maxSpeed: SPEED_BOOST.maxSpeed + 0.2 * (power - 1), accel: SPEED_BOOST.accel },
      tags: ['boost'],
      // A boost drives you forward even if you let go of the throttle.
      onTick(k) {
        k.controls.throttle = 1;
        k.controls.brake = 0;
      },
    },
    race,
  );
  race.events.emit('sfx', { name: 'boost', kart });
}

powerups.register({
  id: 'speed-boost',
  name: 'BOOST',
  short: 'BOOST',
  abbr: 'BST',
  description: 'A burst of speed. SUPER lasts longer and goes faster.',
  icon: 'boost',
  weight: 1.2,
  aiWants({ race, kart }) {
    return race.track.bendBetween(kart.s, kart.s + 140) < 0.45;
  },
  use({ kart, race, power }) {
    applyBoost(kart, race, power);
  },
});
