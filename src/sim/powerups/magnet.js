import { powerups } from './registry.js';
import { behind } from './helpers.js';
import { stealItem } from '../hits.js';
import { toast } from '../toast.js';

/** Karts worth robbing, best targets first: the nearest ahead, then the nearest behind. */
export const magnetTargets = (race, kart) =>
  [...race.kartsAhead(kart), ...race.kartsBehind(kart)].filter((k) => k.items.length > 0);

powerups.register({
  id: 'magnet',
  name: 'MAGNET',
  short: 'MAGNET',
  abbr: 'MAG',
  description: "Steals the front item of the nearest kart ahead that has one. SUPER robs two karts.",
  icon: 'magnet',
  weight: (ctx) => 0.4 + 0.6 * behind(ctx),
  aiWants: ({ race, kart }) => magnetTargets(race, kart).length > 0,
  use({ race, kart, power }) {
    const victims = magnetTargets(race, kart);
    let stolen = 0;
    for (let i = 0; i < power && i < victims.length; i++) {
      if (stealItem(kart, victims[i], race) === 'stolen') stolen++;
    }
    if (victims.length === 0) {
      // Nothing to grab: the magnet yanks you toward the pack instead.
      kart.kick(35 * power);
      toast(race, kart, 'NOTHING TO GRAB', 'bad');
    }
    race.events.emit('magnet', { kart, stolen, victims: victims.slice(0, power) });
    race.events.emit('sfx', { name: 'magnet', kart });
  },
});
