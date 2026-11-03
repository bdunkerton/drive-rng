import { powerups } from './registry.js';
import { dropBanana } from '../hazards.js';
import { behind } from './helpers.js';

/** Drop `power` bananas in a row across the road just behind the kart. */
export function dropBananas({ race, kart, power }, { at = kart.s - 14, lateral = kart.lateral } = {}) {
  for (let i = 0; i < power; i++) {
    const offset = (i - (power - 1) / 2) * 12;
    const lim = race.track.halfWidth - 4;
    dropBanana(race, kart, at, Math.max(-lim, Math.min(lim, lateral + offset)));
  }
  race.events.emit('sfx', { name: 'drop', kart });
}

powerups.register({
  id: 'banana',
  name: 'BANANA',
  short: 'BANANA',
  abbr: 'BAN',
  description: 'Drops a peel behind you. Anyone who drives over it spins out. SUPER drops a row of them.',
  icon: 'banana',
  weight: (ctx) => 1.2 - 0.6 * behind(ctx),
  aiWants({ race, kart }) {
    const chaser = race.kartsBehind(kart)[0];
    // Drop it when someone is close behind, or just get rid of it on a straight.
    return (!!chaser && kart.progress - chaser.progress < 80) || race.track.bendBetween(kart.s - 60, kart.s) < 0.2;
  },
  use(ctx) {
    dropBananas(ctx);
  },
});
