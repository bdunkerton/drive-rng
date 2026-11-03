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
  swap: {
    rows: [
      '...c........',
      '..cc........',
      '.cccccccccc.',
      '..cc.....cc.',
      '...c.....cc.',
      '..........c.',
      '.p..........',
      '.pp.....p...',
      '.pp.....pp..',
      '.pppppppppp.',
      '........pp..',
      '........p...',
    ],
    colours: { c: '#5fd8f0', p: '#f07ab8' },
  },
  'take-two': {
    rows: [
      '............',
      '............',
      'yy...yy.yyy.',
      '.yy.yy.y...y',
      '..yyy......y',
      '..yyy.....y.',
      '.yy.yy...y..',
      'yy...yy.y...',
      '.......yyyyy',
      '............',
      '............',
      '............',
    ],
    colours: { y: PAL.gold },
  },
  copy: {
    rows: [
      'bbbbbbb.....',
      'bwwwwwb.....',
      'bwlllwb.....',
      'bwwwbbbbbbb.',
      'bwllbwwwwwb.',
      'bwwwbwlllwb.',
      'bbbbbwwwwwb.',
      '....bwlllwb.',
      '....bwwwwwb.',
      '....bwlllwb.',
      '....bwwwwwb.',
      '....bbbbbbb.',
    ],
    colours: { b: '#3f73dc', w: PAL.white, l: '#9ab8e8' },
  },
  rocket: {
    rows: [
      '............',
      '....rr......',
      '....rrr.....',
      '.o.rrrrrrrw.',
      'oorrrrrrrrww',
      'yorrrrrrrrww',
      'yorrrrrrrrww',
      'oorrrrrrrrww',
      '.o.rrrrrrrw.',
      '....rrr.....',
      '....rr......',
      '............',
    ],
    colours: { r: '#e0463a', w: PAL.white, o: PAL.boost, y: PAL.boostHot },
  },
  banana: {
    rows: [
      '.........kk.',
      '.........yk.',
      '........yyy.',
      '........yyy.',
      '.......yyyy.',
      '.......yyyy.',
      '......yyyy..',
      '....yyyyyd..',
      '.yyyyyyydd..',
      'kyyyyyydd...',
      '..ddddd.....',
      '............',
    ],
    colours: { y: '#f5d442', d: '#c9a21e', k: '#5a3b22' },
  },
  shield: {
    rows: [
      '...bbbbbb...',
      '..bllllllb..',
      '.blwwlllllb.',
      'blwwllllllb.',
      'blwlllllllb.',
      'bllllllllllb',
      'bllllllllllb',
      'bllllllllllb',
      '.bllllllllb.',
      '.bllllllllb.',
      '..bllllllb..',
      '...bbbbbb...',
    ],
    colours: { b: '#3c9fe0', l: '#9fe2ff', w: PAL.white },
  },
  magnet: {
    rows: [
      '.gg......gg.',
      '.gg......gg.',
      '.rr......rr.',
      '.rr......rr.',
      '.rr......rr.',
      '.rr......rr.',
      '.rrr....rrr.',
      '..rrrrrrrr..',
      '...rrrrrr...',
      '............',
      '............',
      '............',
    ],
    colours: { r: '#e0463a', g: '#c8ccd6' },
  },
  grow: {
    rows: [
      '.....gg.....',
      '....gggg....',
      '...gggggg...',
      '..gggggggg..',
      '.....gg.....',
      '....gggg....',
      '...gggggg...',
      '..gggggggg..',
      '.gggggggggg.',
      '.....dd.....',
      '.....dd.....',
      '............',
    ],
    colours: { g: '#7fe05a', d: '#3f8f2c' },
  },
  chaos: {
    rows: [
      '.wwwwwwwwww.',
      'wwwwwwwwwwww',
      'wwppwwwwppww',
      'wwppwwwwppww',
      'wwwwwwwwwwww',
      'wwwwwppwwwww',
      'wwwwwppwwwww',
      'wwwwwwwwwwww',
      'wwppwwwwppww',
      'wwppwwwwppww',
      'wwwwwwwwwwww',
      '.wwwwwwwwww.',
    ],
    colours: { w: PAL.white, p: '#9b52d2' },
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

export const ICON_NAMES = Object.keys(ICONS);
