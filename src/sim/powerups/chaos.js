import { powerups } from './registry.js';
import { makeItem } from '../hand.js';
import { toast } from '../toast.js';

export const CHAOS = {
  // Chance each roll goes off for a random rival instead of you.
  backfire: 0.25,
};

/**
 * Rolls a random other powerup and fires it. A quarter of the time it backfires and a
 * random rival gets it instead. SUPER CHAOS rolls two different ones, ULTRA three...
 */
powerups.register({
  id: 'chaos',
  name: 'CHAOS',
  short: 'CHAOS',
  abbr: 'CHS',
  description: 'Fires a random powerup. Sometimes a random rival gets it instead.',
  icon: 'chaos',
  weight: 0.6,
  order: 60,
  use({ race, kart, power, rng }) {
    const pool = powerups.list().filter((d) => d.id !== 'chaos');
    const picks = [];
    for (let i = 0; i < power && pool.length; i++) picks.push(pool.splice(Math.floor(rng.next() * pool.length), 1)[0]);
    race.events.emit('sfx', { name: 'chaos', kart });
    for (const def of picks) {
      const rivals = race.stillRacing().filter((k) => k !== kart);
      const backfire = rivals.length > 0 && rng.chance(CHAOS.backfire);
      const who = backfire ? rng.pick(rivals) : kart;
      race.events.emit('chaos', { kart, rolled: def.id, who });
      if (backfire) {
        toast(race, kart, `CHAOS: ${def.name} FOR ${who.name}?!`, 'bad');
        toast(race, who, `${kart.name}'S CHAOS GAVE YOU ${def.name}`, 'good');
      } else {
        toast(race, kart, `CHAOS: ${def.name}!`, 'gold');
      }
      def.use(race.context(who, { power: 1, item: makeItem([def.id]) }));
    }
  },
});
