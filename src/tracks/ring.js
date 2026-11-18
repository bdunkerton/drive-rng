// The shrinking arena for Shrinking Royale: the Bullring, then two smaller rings it
// closes down to as karts drop out.

import { makeOval } from './oval.js';
import bullring from './bullring.js';

export const ringSmall = makeOval({ id: 'ring-small', name: 'SMALL RING', straight: 200, radius: 90, halfWidth: 34, margin: 130, grassWidth: 26, scenery: { trees: 50, flowers: 90 } });
export const ringTiny = makeOval({ id: 'ring-tiny', name: 'TINY RING', straight: 110, radius: 66, halfWidth: 28, margin: 120, grassWidth: 20, scenery: { trees: 40, flowers: 70, pond: null } });

/** The arena stages: [karts left at or below which it switches, track]. */
export const RING_STAGES = [
  [Infinity, bullring],
  [7, ringSmall],
  [4, ringTiny],
];
