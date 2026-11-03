// Drawing a held item (one powerup, a SUPER one, or a fused combo) in an 18x18 slot.

import { icon } from './icons.js';
import { PAL } from './palette.js';
import { drawText } from './font.js';
import { describeItem } from '../sim/hand.js';
import { powerups } from '../sim/powerups/index.js';

export const SLOT = 18;

/** Draw an item's picture with its top-left at (x, y). Spinning items flicker through icons. */
export function drawItemPicture(g, item, x, y, clock = 0) {
  if (item.roulette > 0) {
    const all = powerups.list();
    const def = all[Math.floor(clock * 16 + item.roulette * 7) % all.length];
    g.drawImage(icon(def.icon), x + 2, y + 2);
    return;
  }
  const { groups, recipe } = describeItem(item);
  if (recipe) {
    // Named combos get a gold glow behind their parts.
    g.fillStyle = 'rgba(242,193,75,0.35)';
    g.fillRect(x + 1, y + 1, SLOT - 2, SLOT - 2);
  }
  if (groups.length === 1) {
    g.drawImage(icon(groups[0].def?.icon ?? groups[0].id), x + 2, y + 2);
    if (groups[0].power > 1) drawText(g, String(groups[0].power), x + SLOT - 4, y + SLOT - 6, { color: PAL.gold, shadow: PAL.black });
    return;
  }
  // Combos: the first two parts, overlapping; a digit for how many parts it holds.
  g.drawImage(icon(groups[0].def?.icon ?? groups[0].id), x, y);
  g.drawImage(icon(groups[1].def?.icon ?? groups[1].id), x + 4, y + 4);
  if (item.parts.length > 2) drawText(g, String(item.parts.length), x + 1, y + SLOT - 6, { color: PAL.gold, shadow: PAL.black });
}
