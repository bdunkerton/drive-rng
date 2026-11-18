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

// Shrinking Royale 2 (after the lab-4 feedback): the middle ring has a much wider road so
// you stop dropping onto the grass, and the last stage is a bowl: the road covers the
// whole infield, so there's no line left to drive, just chicken with the potato.
export const ringWide = makeOval({ id: 'ring-wide', name: 'WIDE RING', straight: 200, radius: 100, halfWidth: 56, margin: 130, grassWidth: 26, scenery: { trees: 50, flowers: 90, pond: null } });
export const bowl = {
  ...makeOval({ id: 'bowl', name: 'THE BOWL', straight: 40, radius: 104, halfWidth: 108, margin: 120, grassWidth: 22, scenery: { trees: 50, flowers: 90, pond: null } }),
  bowl: true, // drive anywhere: rivals chase and flee in straight lines
};

export const BOWL_STAGES = [
  [Infinity, bullring],
  [7, ringWide],
  [4, bowl],
];
