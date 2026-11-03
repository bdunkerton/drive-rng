import { powerups } from './registry.js';
import { consumeShield } from '../hits.js';
import { toast } from '../toast.js';
import { behind } from './helpers.js';

// Everything that says where a kart is in the race. Effects, items and the driver stay put.
const PLACE_FIELDS = ['x', 'y', 'vx', 'vy', 'heading', 's', 'lateral', 'trackIndex', 'surface', 'progress', 'lapsDone', 'lapStartedAt', 'lapTimes'];

/** Trade two karts' places on the course, laps and all. */
export function swapPlaces(a, b, race) {
  const from = { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } };
  for (const f of PLACE_FIELDS) [a[f], b[f]] = [b[f], a[f]];
  race.updatePositions();
  race.events.emit('swap', { a, b, from });
  race.events.emit('sfx', { name: 'swap', kart: a });
  race.events.emit('sfx', { name: 'swap', kart: b });
}

/**
 * The SWAP move. Returns the kart you traded with (or null). DECOY uses this too.
 *  - Behind: you trade places with whoever is leading.
 *  - Leading: you stay put and the 2nd-place kart trades with the last.
 *  - SUPER and up: you trade hands as well.
 */
export function doSwap({ race, kart, power }) {
  const racing = race.stillRacing().filter((k) => k !== kart);
  if (racing.length === 0) {
    toast(race, kart, 'NOBODY TO SWAP WITH', 'bad');
    return null;
  }
  const leader = race.stillRacing()[0];
  if (leader === kart) {
    const second = racing[0];
    const last = racing[racing.length - 1];
    if (second === last) {
      toast(race, kart, 'NOBODY TO SWAP WITH', 'bad');
      return null;
    }
    swapPlaces(second, last, race);
    toast(race, kart, `${second.name} AND ${last.name} SWAPPED!`, 'gold');
    toast(race, second, `SWAPPED WITH ${last.name}!`, 'bad');
    toast(race, last, `SWAPPED WITH ${second.name}!`, 'good');
    return null;
  }
  if (consumeShield(leader, race)) {
    toast(race, kart, `${leader.name} BLOCKED THE SWAP`, 'bad');
    return null;
  }
  swapPlaces(kart, leader, race);
  if (power >= 2) [kart.items, leader.items] = [leader.items, kart.items];
  toast(race, kart, power >= 2 ? `SWAPPED WITH ${leader.name} + HANDS!` : `SWAPPED WITH ${leader.name}!`, 'gold');
  toast(race, leader, `${kart.name} SWAPPED YOU!`, 'bad');
  return leader;
}

powerups.register({
  id: 'swap',
  name: 'SWAP',
  short: 'SWAP',
  abbr: 'SWP',
  description: 'Trade places with whoever is in 1st. In 1st? The 2nd and last karts trade instead.',
  icon: 'swap',
  weight: (ctx) => (ctx.position === 1 ? 0 : 0.15 + 0.85 * behind(ctx)),
  aiWants: ({ race, kart }) => race.stillRacing()[0] !== kart || race.stillRacing().length > 2,
  use(ctx) {
    doSwap(ctx);
  },
});
