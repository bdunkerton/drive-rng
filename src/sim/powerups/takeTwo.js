import { powerups } from './registry.js';
import { ITEMS } from '../../config.js';
import { toast } from '../toast.js';

powerups.register({
  id: 'take-two',
  name: 'TAKE TWO',
  short: 'TAKE2',
  abbr: 'TK2',
  description: 'Doubles your item slots (up to 4), and your next box gives you two of whatever it rolls.',
  icon: 'take-two',
  weight: 0.7,
  // Runs first in a fused item, so the new slots are there for anything after it (like COPY).
  order: 10,
  use({ kart, race, power }) {
    const before = kart.slots;
    kart.slots = Math.min(ITEMS.maxSlots, kart.slots * 2 ** power);
    // SUPER TAKE TWO: the next box gives three, ULTRA four, and so on.
    kart.extraCopies += power;
    race.events.emit('sfx', { name: 'take-two', kart });
    const slots = kart.slots > before ? `${kart.slots} SLOTS! ` : '';
    toast(race, kart, `${slots}NEXT BOX X${kart.extraCopies + 1}`, 'gold');
  },
});
