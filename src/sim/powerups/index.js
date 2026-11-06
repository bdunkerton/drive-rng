// Importing this file registers every powerup and the named fusions. Add one import per new file.
// The order here is the order the debug overlay lists them (keys 1-9, 0, then - = [ ] for the rest).
import './boost.js';
import './spring.js';
import './hook.js';
import './rocket.js';
import './ghost.js';
import './blackHole.js';
import './bulk.js';
import './bumper.js';
import './magnet.js';
import './blink.js';
import './moonwalk.js';
import './twister.js';
import './grip.js';
import './ramp.js';
import './fusion.js';

export { powerups } from './registry.js';
export { resolveItem, previewFusion } from './fusion.js';
