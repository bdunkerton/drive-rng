// How each kind of entity is drawn. Add a function here when a powerup spawns a new kind.
// Each function gets the 2D context, the entity, and the screen position of its centre.

import { PAL } from './palette.js';
import { drawText } from './font.js';

const BOX_COLOURS = ['#f05a4a', '#f2c14b', '#5ec46a', '#4aa8f0', '#b07af0'];

export const ENTITY_ART = {
  'item-box'(g, box, sx, sy, view) {
    // Boxes are per kart: draw it as the kart we're watching sees it.
    if (!box.availableTo(view.viewer, view.time)) {
      // A faint sparkle while it respawns.
      if (box.respawnIn(view.viewer, view.time) < 0.6 && Math.floor(box.phase * 4) % 2 === 0) {
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

// A speed-lane pad: an orange chevron pointing the way it was laid, fading out.
ENTITY_ART['speed-pad'] = (g, pad, sx, sy) => {
  const left = 1 - pad.age / pad.life;
  if (left < 0.3 && Math.floor(pad.age * 12) % 2) return;
  const fx = Math.cos(pad.angle);
  const fy = Math.sin(pad.angle);
  const px = -fy;
  const py = fx;
  g.globalAlpha = 0.45 + 0.4 * left;
  for (let t = -3; t <= 3; t++) {
    const back = Math.abs(t) * 0.8;
    g.fillStyle = Math.abs(t) < 2 ? PAL.boostHot : PAL.boost;
    g.fillRect(Math.round(sx + px * t - fx * back), Math.round(sy + py * t - fy * back), 1, 1);
  }
  g.globalAlpha = 1;
};

// A black hole: a dark disc with a swirling purple rim that grows, then collapses.
ENTITY_ART.hole = (g, h, sx, sy) => {
  const t = Math.min(1, h.age / h.life);
  const grow = t < 0.2 ? t / 0.2 : t > 0.8 ? (1 - t) / 0.2 : 1;
  const r = Math.max(1, Math.round(9 * h.size * grow));
  g.fillStyle = '#05040a';
  for (let y = -r; y <= r; y++) {
    const w = Math.round(Math.sqrt(r * r - y * y));
    g.fillRect(sx - w, sy + y, w * 2 + 1, 1);
  }
  const n = 20;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + h.age * 7;
    g.fillStyle = i % 3 ? '#9b52d2' : '#d29bff';
    g.fillRect(Math.round(sx + Math.cos(a) * (r + 1)), Math.round(sy + Math.sin(a) * (r + 1)), 1, 1);
  }
};

/** @param {{ viewer: any, time: number }} view  the kart the camera follows, and the race time */
// A stack of tyres, seen from above: a black ring with a red-and-white band so it reads
// against the road, and a hole in the middle. It wobbles when it's been shoved.
const TYRE_ROWS = [
  '...kkkkk...',
  '..kttttttk.',
  '.kttwwwwttk',
  'kttwrrrrwttk',
  'ktwr...rwtk',
  'ktwr...rwtk',
  'ktwr...rwtk',
  'kttwrrrrwttk',
  '.kttwwwwttk',
  '..kttttttk.',
  '...kkkkk...',
];
const TYRE_COLOURS = { k: '#0e0d12', t: '#34333b', w: '#ece7db', r: '#c9443a' };

ENTITY_ART.tires = (g, stack, sx, sy) => {
  const wobble = stack.moving ? Math.round(Math.sin(stack.spin * 6)) : 0;
  g.fillStyle = PAL.shadow;
  g.fillRect(sx - 5, sy + 4, 12, 3);
  for (let y = 0; y < TYRE_ROWS.length; y++) {
    const row = TYRE_ROWS[y];
    for (let x = 0; x < row.length; x++) {
      const col = TYRE_COLOURS[row[x]];
      if (!col) continue;
      g.fillStyle = col;
      g.fillRect(sx - 5 + x + wobble, sy - 6 + y, 1, 1);
    }
  }
  // Highlight on the top tyre.
  g.fillStyle = '#5a5964';
  g.fillRect(sx - 2 + wobble, sy - 5, 3, 1);
};

export function drawEntity(g, entity, sx, sy, view = { viewer: null, time: 0 }) {
  const draw = ENTITY_ART[entity.kind];
  if (draw) draw(g, entity, sx, sy, view);
  else {
    // Unknown kinds still show up, as a magenta blob, so nothing is invisible by accident.
    g.fillStyle = '#ff00ff';
    g.fillRect(sx - 2, sy - 2, 4, 4);
  }
}
