// Drawing a held item (one powerup, a MEGA, a fusion or a fizzle) in an 18x18 slot.

import { icon } from './icons.js';
import { PAL } from './palette.js';
import { drawText } from './font.js';
import { powerups, resolveItem } from '../sim/powerups/index.js';

export const SLOT = 18;
export const WILD_COLOURS = ['#f2c14b', '#d29bff', '#5fd8f0', '#f07ab8'];

/** Draw an item's picture with its top-left at (x, y). Spinning items flicker through icons. */
export function drawItemPicture(g, item, x, y, clock = 0) {
  if (item.roulette > 0) {
    const all = powerups.list();
    const def = all[Math.floor(clock * 16 + item.roulette * 7) % all.length];
    g.drawImage(icon(def.icon), x + 2, y + 2);
    return;
  }
  const r = resolveItem(item);
  if (r.kind === 'single') {
    g.drawImage(icon(r.a.icon), x + 2, y + 2);
    return;
  }
  if (r.showcase) {
    // Named fusions get a gold glow.
    g.fillStyle = 'rgba(242,193,75,0.35)';
    g.fillRect(x + 1, y + 1, SLOT - 2, SLOT - 2);
  }
  if (r.kind === 'mega') {
    g.drawImage(icon(r.a.icon), x + 2, y + 2);
    drawText(g, '2', x + SLOT - 5, y + SLOT - 7, { color: PAL.gold, shadow: PAL.black });
  } else {
    // Motion item top-left, field item bottom-right.
    g.drawImage(icon(r.a.icon), x, y);
    g.drawImage(icon(r.b.icon), x + 4, y + 4);
  }
  if (r.kind === 'fizzle') {
    g.fillStyle = 'rgba(40,38,48,0.6)';
    g.fillRect(x + 1, y + 1, SLOT - 2, SLOT - 2);
    drawText(g, 'X', x + 7, y + 6, { color: PAL.danger, shadow: PAL.black });
  }
  if (item.wild) {
    // A sparkling rainbow frame.
    const c = WILD_COLOURS[Math.floor(clock * 10) % WILD_COLOURS.length];
    g.fillStyle = c;
    g.fillRect(x + 1, y + 1, SLOT - 2, 1);
    g.fillRect(x + 1, y + SLOT - 2, SLOT - 2, 1);
    g.fillRect(x + 1, y + 1, 1, SLOT - 2);
    g.fillRect(x + SLOT - 2, y + 1, 1, SLOT - 2);
  }
}
