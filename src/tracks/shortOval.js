// Short Oval: between the Test Oval and the Bullring, about 11 seconds a lap, so a pack
// of eleven stays bunched up instead of stringing out.

import { makeOval } from './oval.js';

export default makeOval({ id: 'short-oval', name: 'SHORT OVAL', straight: 460, radius: 140, halfWidth: 42, margin: 150, scenery: { trees: 110, flowers: 190 } });
