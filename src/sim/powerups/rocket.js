import { powerups } from './registry.js';
import { Rocket } from '../hazards.js';
import { behind } from './helpers.js';

/**
 * Fire `power` rockets, one at each of the next karts ahead. With nobody ahead the rocket
 * just flies down the track (it'll still hit anyone it meets). HEIST uses this with steal.
 */
export function fireRockets({ race, kart, power }, { steal = false } = {}) {
  const ahead = race.kartsAhead(kart);
  for (let i = 0; i < power; i++) {
    const target = ahead[i] ?? ahead[ahead.length - 1] ?? null;
    const lateral = kart.lateral + (i - (power - 1) / 2) * 8;
    race.spawn(new Rocket({ race, owner: kart, target, steal, lateral }));
  }
  race.events.emit('rocket:fire', { kart, count: power });
  race.events.emit('sfx', { name: 'rocket', kart });
}

powerups.register({
  id: 'rocket',
  name: 'ROCKET',
  short: 'ROCKET',
  abbr: 'RKT',
  description: 'Chases down the kart ahead and spins it out. SUPER fires one at each of the next two.',
  icon: 'rocket',
  weight: (ctx) => (ctx.position === 1 ? 0.25 : 0.6 + 0.7 * behind(ctx)),
  aiWants({ race, kart }) {
    const next = race.kartsAhead(kart)[0];
    return !!next && next.progress - kart.progress < 450;
  },
  use(ctx) {
    fireRockets(ctx);
  },
});
