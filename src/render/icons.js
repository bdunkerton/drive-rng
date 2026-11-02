// Item icons for the HUD, 12x12 pixel art. Add one per powerup, keyed by the
// powerup's `icon` field. A dark outline is added automatically around lit pixels.
// Unknown icons draw a "?" so a new powerup is never invisible.

import { makeCanvas, paintRows } from './canvas.js';
import { PAL } from './palette.js';
import { drawText } from './font.js';

const ICONS = {
  boost: {
    rows: [
      '......yyy...',
      '.....yyyo...',
      '....yyyo....',
      '...yyyo.....',
      '..yyyyyyyo..',
      '..oooyyyo...',
      '....yyyo....',
      '...yyyo.....',
      '..yyo.......',
      '..yo........',
      '.yo.........',
      '............',
    ],
    colours: { y: PAL.boostHot, o: PAL.boost },
  },
};

const cache = new Map();

function build(name) {
  const { canvas, g } = makeCanvas(14, 14);
  const def = ICONS[name];
  if (!def) {
    drawText(g, '?', 4, 3, { color: PAL.white, scale: 2, shadow: null });
    return canvas;
  }
  // Outline: any empty pixel next to a lit one.
  const lit = (x, y) => y >= 0 && y < def.rows.length && x >= 0 && x < def.rows[y].length && def.rows[y][x] !== '.';
  g.fillStyle = PAL.black;
  for (let y = -1; y <= def.rows.length; y++) {
    for (let x = -1; x <= 12; x++) {
      if (lit(x, y)) continue;
      if (lit(x - 1, y) || lit(x + 1, y) || lit(x, y - 1) || lit(x, y + 1)) g.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  paintRows(g, def.rows, def.colours, 1, 1);
  return canvas;
}

/** A 14x14 canvas for an icon name. */
export function icon(name) {
  if (!cache.has(name)) cache.set(name, build(name));
  return cache.get(name);
}

export function hasIcon(name) {
  return name in ICONS;
}
