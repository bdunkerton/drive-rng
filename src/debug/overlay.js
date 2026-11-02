// Developer overlay, toggled with the backtick key (`) or ?debug=1 in the URL.
// Shows the centreline, racing line, fence, AI aim points and live numbers, and
// lists every registered powerup: press its number to put it in your item slot.

import { VIEW } from '../config.js';
import { PAL } from '../render/palette.js';
import { drawText } from '../render/font.js';
import { powerups } from '../sim/powerups/index.js';
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
  for (const k of race.karts) {
    if (!(k.controller instanceof AIDriver)) continue;
    const { tx, ty } = k.controller.debug;
    g.strokeStyle = '#ffe066';
    g.beginPath();
    g.moveTo(Math.round(k.x - camX) + 0.5, Math.round(k.y - camY) + 0.5);
    g.lineTo(Math.round(tx - camX) + 0.5, Math.round(ty - camY) + 0.5);
    g.stroke();
  }
}

export function drawDebugPanel(g, race, fps) {
  const p = race.player ?? race.order[0];
  const lines = [
    `FPS ${Math.round(fps)}  SEED ${race.seed}`,
    `S ${p.s.toFixed(0)}/${race.track.length.toFixed(0)}  LAT ${p.lateral.toFixed(1)}`,
    `PROG ${p.progress.toFixed(0)}  LAPS ${p.lapsDone}`,
    `SPD ${p.forwardSpeed.toFixed(0)}  ${p.surface.toUpperCase()}`,
    `FX ${p.effects.active.map((e) => e.id).join(',') || '-'}`,
    'GIVE ITEM:',
    ...powerups.list().slice(0, 9).map((d, i) => `${i + 1} ${d.name}`),
  ];
  const x = 6;
  const y = VIEW.height - 16 - lines.length * 7;
  g.fillStyle = 'rgba(0,0,0,0.6)';
  g.fillRect(x - 2, y - 2, 120, lines.length * 7 + 3);
  lines.forEach((line, i) => drawText(g, line, x, y + i * 7, { color: i >= 5 ? '#00e5ff' : PAL.white, shadow: null }));
}

/** Put the nth registered powerup straight into the player's slot (no roulette). */
export function giveDebugItem(race, n) {
  const def = powerups.list()[n - 1];
  if (!def || !race.player) return;
  race.player.item = def.id;
  race.player.itemRoulette = 0;
  race.player.itemHeld = 1;
}
