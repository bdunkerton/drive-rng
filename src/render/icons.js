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
  spring: {
    rows: [
      '..rrrrrrrr..',
      '..rrrrrrrr..',
      '...ssssss...',
      '..s......s..',
      '...ssssss...',
      '..s......s..',
      '...ssssss...',
      '..s......s..',
      '...ssssss...',
      '..dddddddd..',
      '..dddddddd..',
      '............',
    ],
    colours: { r: '#e0463a', s: '#c8ccd6', d: '#6a6e78' },
  },
  hook: {
    rows: [
      '.....bb.....',
      '.....bb.....',
      '.....bb.....',
      '....ssss....',
      '.....ss.....',
      '.....ss.....',
      's....ss....s',
      'ss...ss...ss',
      '.ss..ss..ss.',
      '..ssssssss..',
      '...ssssss...',
      '............',
    ],
    colours: { b: '#a5743e', s: '#c8ccd6' },
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
  ghost: {
    rows: [
      '....wwww....',
      '..wwwwwwww..',
      '.wwwwwwwwww.',
      '.wwkkwwkkww.',
      '.wwkkwwkkww.',
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '.wwwwwwwwww.',
      '.ww.www.www.',
      '.w...w...w..',
    ],
    colours: { w: '#dfe8ff', k: '#3a3a5a' },
  },
  'black-hole': {
    rows: [
      '....pppp....',
      '..ppllllpp..',
      '.pllkkkkllp.',
      '.plkkkkkklp.',
      'plkkkkkkkklp',
      'plkkkkkkkklp',
      'plkkkkkkkklp',
      'plkkkkkkkklp',
      '.plkkkkkklp.',
      '.pllkkkkllp.',
      '..ppllllpp..',
      '....pppp....',
    ],
    colours: { p: '#9b52d2', l: '#d29bff', k: '#05040a' },
  },
  bulk: {
    rows: [
      '...dddddd...',
      '..dd....dd..',
      '..d......d..',
      '..dd....dd..',
      '.gggggggggg.',
      'gglggggggggg',
      'glgggggggggg',
      'gggggggggggg',
      'gggggggggggg',
      'gggggggggggg',
      '.gggggggggg.',
      '..gggggggg..',
    ],
    colours: { g: '#7fe05a', l: '#f2efe6', d: '#3f8f2c' },
  },
  bumper: {
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
