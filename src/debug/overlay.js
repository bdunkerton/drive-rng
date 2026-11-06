// Developer overlay, toggled with the backtick key (`) or ?debug=1 in the URL.
// Shows the centreline, racing line, fence, AI aim points, hook lines and live
// numbers, and lists every registered powerup: press its number (1-8) to put it in
// your hand. Press two numbers and fuse (F) to try any fusion: the first number is the
// motion, the second the field. The same number twice makes a MEGA.

import { VIEW } from '../config.js';
import { PAL } from '../render/palette.js';
import { drawText } from '../render/font.js';
import { powerups } from '../sim/powerups/index.js';
import { makeItem, giveItem, itemName } from '../sim/hand.js';
import { AIDriver } from '../ai/driver.js';

export function drawDebugWorld(g, race, camX, camY) {
  const t = race.track;
  const inView = (x, y) => x >= camX && y >= camY && x < camX + VIEW.width && y < camY + VIEW.height;
  for (let i = 0; i < t.count; i += 2) {
    const s = i * t.spacing;
    const c = t.pointAt(s);
    if (inView(c.x, c.y)) {
      g.fillStyle = '#ffffff';
      g.fillRect(Math.round(c.x - camX), Math.round(c.y - camY), 1, 1);
    }
    const r = t.pointAt(s, t.racingLineAt(s));
    if (inView(r.x, r.y)) {
      g.fillStyle = '#00e5ff';
      g.fillRect(Math.round(r.x - camX), Math.round(r.y - camY), 1, 1);
    }
    for (const side of [-1, 1]) {
      const f = t.pointAt(s, side * t.fenceOffset);
      if (inView(f.x, f.y)) {
        g.fillStyle = '#ff3b6b';
        g.fillRect(Math.round(f.x - camX), Math.round(f.y - camY), 1, 1);
      }
    }
  }
  const line = (ax, ay, bx, by, colour) => {
    g.strokeStyle = colour;
    g.beginPath();
    g.moveTo(Math.round(ax - camX) + 0.5, Math.round(ay - camY) + 0.5);
    g.lineTo(Math.round(bx - camX) + 0.5, Math.round(by - camY) + 0.5);
    g.stroke();
  };
  for (const k of race.karts) {
    if (k.controller instanceof AIDriver) line(k.x, k.y, k.controller.debug.tx, k.controller.debug.ty, '#ffe066');
  }
  for (const k of race.karts) {
    const tether = k.effects.active.find((e) => e.target);
    if (tether) line(k.x, k.y, tether.target.x, tether.target.y, '#ff3b6b');
  }
}

export function drawDebugPanel(g, race, fps) {
  const p = race.player ?? race.order[0];
  const status = [
    `FPS ${Math.round(fps)}  SEED ${race.seed}`,
    `S ${p.s.toFixed(0)}/${race.track.length.toFixed(0)}  LAT ${p.lateral.toFixed(1)}`,
    `PROG ${p.progress.toFixed(0)}  LAPS ${p.lapsDone}`,
    `SPD ${p.forwardSpeed.toFixed(0)}  ${p.surface.toUpperCase()}`,
    `FX ${p.effects.active.map((e) => e.id).join(',') || '-'}`,
    `HAND ${p.items.length}/${p.slots}  ${p.items.map(itemName).join(', ') || '-'}`,
    'GIVE ITEM:',
  ];
  const defs = powerups.list().slice(0, 10);
  const rows = Math.ceil(defs.length / 2);
  const x = 6;
  const y = VIEW.height - 16 - (status.length + rows) * 7;
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(x - 2, y - 2, 150, (status.length + rows) * 7 + 3);
  status.forEach((line, i) => drawText(g, line, x, y + i * 7, { color: i === status.length - 1 ? '#00e5ff' : PAL.white, shadow: null }));
  defs.forEach((d, i) => {
    const col = i < rows ? 0 : 1;
    const row = i % rows;
    drawText(g, `${(i + 1) % 10} ${d.name}`, x + col * 62, y + (status.length + row) * 7, { color: '#00e5ff', shadow: null });
  });
}

/** Put the nth registered powerup straight into the player's hand, ready to use (bumping the back one if full). */
export function giveDebugItem(race, n) {
  const def = powerups.list()[n - 1];
  const p = race.player;
  if (!def || !p) return;
  if (p.items.length >= p.slots) p.items.pop();
  giveItem(p, makeItem([def.id]));
}
