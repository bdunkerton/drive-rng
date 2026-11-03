import { powerups } from './registry.js';
import { toast } from '../toast.js';

export const GROW = {
  duration: 5,
  scale: 2,         // twice the size, twice the collision radius
  mass: 4,          // shoves everyone else around
  maxSpeed: 1.08,
};

export const growDuration = (power = 1) => GROW.duration * (1 + 0.5 * (power - 1));

/** Make a kart giant. Giants can't be spun out and squash bananas. Recipes use this too. */
export function applyGrow(kart, race, power = 1) {
  kart.addEffect(
    {
      id: 'giant',
      duration: growDuration(power),
      modifiers: { scale: GROW.scale, mass: GROW.mass, maxSpeed: GROW.maxSpeed },
      tags: ['giant'],
    },
    race,
  );
  race.events.emit('sfx', { name: 'grow', kart });
  toast(race, kart, 'GIANT!', 'gold');
}

powerups.register({
  id: 'grow',
  name: 'GROW',
  short: 'GROW',
  abbr: 'GRW',
  description: "Turns you giant for 5 seconds: heavy, a bit faster, can't be spun out, squashes bananas.",
  icon: 'grow',
  weight: 0.8,
  use({ kart, race, power }) {
    applyGrow(kart, race, power);
  },
});
