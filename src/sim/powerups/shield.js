import { powerups } from './registry.js';
import { behind } from './helpers.js';
import { toast } from '../toast.js';

export const SHIELD = { duration: 8 };

/** Put up a shield (or add charges to the one you have). Recipes use this too. */
export function raiseShield(kart, race, power = 1) {
  const existing = kart.effects.active.find((e) => e.id === 'shield');
  if (existing) {
    existing.charges = (existing.charges ?? 1) + power;
    existing.remaining = Math.max(existing.remaining, SHIELD.duration);
  } else {
    kart.addEffect({ id: 'shield', duration: SHIELD.duration, charges: power, tags: ['shield'] }, race);
  }
  race.events.emit('sfx', { name: 'shield', kart });
  const charges = kart.effects.active.find((e) => e.id === 'shield').charges;
  toast(race, kart, charges > 1 ? `SHIELD X${charges}` : 'SHIELD UP', 'good');
}

powerups.register({
  id: 'shield',
  name: 'SHIELD',
  short: 'SHIELD',
  abbr: 'SHD',
  description: 'A bubble for 8 seconds that blocks one hit, swap or steal. SUPER blocks two.',
  icon: 'shield',
  weight: (ctx) => 1.0 - 0.5 * behind(ctx),
  use({ kart, race, power }) {
    raiseShield(kart, race, power);
  },
});
