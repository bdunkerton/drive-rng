import { powerups } from './registry.js';
import { copyItem, giveItem } from '../hand.js';
import { toast } from '../toast.js';

/**
 * COPY duplicates everything else in your hand. Copies go into free slots; once you're
 * full, each copy fuses onto your last item instead, so it powers that item up.
 * Empty hand? It copies the hand of the kart just ahead of you (or just behind, if you lead).
 * SUPER COPY makes two copies of each.
 */
powerups.register({
  id: 'copy',
  name: 'COPY',
  short: 'COPY',
  abbr: 'CPY',
  description: 'Duplicates every other item you hold. Empty hand? Copies the hand of the kart ahead.',
  icon: 'copy',
  weight: 0.7,
  // Runs last in a fused item, so it copies what you have after everything else has happened.
  order: 90,
  aiWants({ race, kart }) {
    if (kart.items.length > 0) return true;
    const near = race.kartsAhead(kart)[0] ?? race.kartsBehind(kart)[0];
    return !!near && near.items.length > 0;
  },
  use({ race, kart, power }) {
    let source = kart.items;
    let from = null;
    if (source.length === 0) {
      from = race.kartsAhead(kart)[0] ?? race.kartsBehind(kart)[0] ?? null;
      source = from?.items ?? [];
    }
    if (source.length === 0) {
      toast(race, kart, 'NOTHING TO COPY', 'bad');
      return;
    }
    const originals = source.map((it) => copyItem(it, 0.3));
    let made = 0;
    for (let p = 0; p < power; p++) {
      for (const it of originals) if (giveItem(kart, copyItem(it), { overflow: 'fuse' }) !== 'dropped') made++;
    }
    race.events.emit('copy', { kart, from, count: made });
    race.events.emit('sfx', { name: 'copy', kart });
    toast(race, kart, from ? `COPIED ${from.name}'S HAND!` : made ? `COPIED X${made}!` : 'NO ROOM TO COPY', made ? 'gold' : 'bad');
  },
});
