// How each kind of entity is drawn. Add a function here when a powerup spawns a new kind.
// Each function gets the 2D context, the entity, and the screen position of its centre.

import { PAL } from './palette.js';
import { drawText } from './font.js';

const BOX_COLOURS = ['#f05a4a', '#f2c14b', '#5ec46a', '#4aa8f0', '#b07af0'];

export const ENTITY_ART = {
  'item-box'(g, box, sx, sy) {
    if (!box.active) {
      // A faint sparkle while it respawns.
      if (box.respawnIn < 0.6 && Math.floor(box.phase * 4) % 2 === 0) {
        g.fillStyle = PAL.white;
        g.fillRect(sx, sy, 1, 1);
      }
      return;
    }
    const bob = Math.round(Math.sin(box.phase) * 1);
    const x = sx - 4;
    const y = sy - 4 + bob;
    g.fillStyle = PAL.shadow;
    g.fillRect(x + 1, sy + 4, 8, 2);
    const colour = BOX_COLOURS[Math.floor(box.phase * 1.5) % BOX_COLOURS.length];
    g.fillStyle = PAL.black;
    g.fillRect(x - 1, y - 1, 10, 10);
    g.fillStyle = colour;
    g.fillRect(x, y, 8, 8);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x, y, 8, 2);
    drawText(g, '?', x + 3, y + 2, { color: PAL.white, shadow: PAL.black });
  },
};

ENTITY_ART.rocket = (g, r, sx, sy) => {
  const cx = Math.cos(r.angle);
  const cy = Math.sin(r.angle);
  g.fillStyle = PAL.shadow;
  g.fillRect(sx - 2, sy + 3, 5, 2);
  for (let t = -3; t <= 3; t++) {
    g.fillStyle = t === 3 ? PAL.white : t <= -3 ? PAL.boostHot : '#e0463a';
    g.fillRect(Math.round(sx + cx * t) - 1, Math.round(sy + cy * t) - 1, 2, 2);
  }
  if (r.steal) {
    // HEIST rockets carry a little magnet tip.
    g.fillStyle = PAL.silver;
    g.fillRect(Math.round(sx + cx * 4) - 1, Math.round(sy + cy * 4) - 1, 2, 2);
  }
};

const BANANA = [
  '...kd',
  '...yd',
  '..yyd',
  'yyyd.',
  '.dd..',
];
const BANANA_COLOURS = { y: '#f5d442', d: '#c9a21e', k: '#5a3b22' };

ENTITY_ART.banana = (g, b, sx, sy) => {
  g.fillStyle = PAL.shadow;
  g.fillRect(sx - 2, sy + 2, 5, 2);
  for (let y = 0; y < BANANA.length; y++) {
    for (let x = 0; x < BANANA[y].length; x++) {
      const col = BANANA_COLOURS[BANANA[y][x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(sx - 2 + x, sy - 3 + y, 1, 1);
    }
  }
};

export function drawEntity(g, entity, sx, sy) {
  const draw = ENTITY_ART[entity.kind];
  if (draw) draw(g, entity, sx, sy);
  else {
    // Unknown kinds still show up, as a magenta blob, so nothing is invisible by accident.
    g.fillStyle = '#ff00ff';
    g.fillRect(sx - 2, sy - 2, 4, 4);
  }
}
