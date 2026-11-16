// The Bullring: a tiny oval, about 8 seconds a lap, so the leaders are always lapping
// the back of the pack and nobody gets clear. Built for Potato Royale.

import { makeOval } from './oval.js';

export default makeOval({ id: 'bullring', name: 'BULLRING', straight: 300, radius: 115, halfWidth: 40, margin: 140, scenery: { trees: 70, flowers: 120 } });
