// A vertical list of menu lines with a blinking cursor on the selected one.

import { PAL } from './palette.js';
import { drawText, textWidth } from './font.js';

/**
 * @param {CanvasRenderingContext2D} g
 * @param {string[]} lines
 * @param {number} selected
 */
export function drawMenu(g, lines, selected, cx, y, { clock = 0, spacing = 10 } = {}) {
  lines.forEach((line, i) => {
    const active = i === selected;
    const yy = y + i * spacing;
    drawText(g, line, cx, yy, { color: active ? PAL.gold : PAL.white, align: 'center' });
    if (active && Math.floor(clock * 3) % 2 === 0) {
      const w = textWidth(line);
      drawText(g, '>', cx - w / 2 - 8, yy, { color: PAL.gold });
      drawText(g, '<', cx + w / 2 + 5, yy, { color: PAL.gold });
    }
  });
}

/** A dark rounded-ish panel with a light edge. */
export function drawPanel(g, x, y, w, h) {
  g.fillStyle = PAL.hudBg;
  g.fillRect(x + 1, y, w - 2, h);
  g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle = PAL.hudEdge;
  g.fillRect(x + 1, y, w - 2, 1);
  g.fillRect(x + 1, y + h - 1, w - 2, 1);
  g.fillRect(x, y + 1, 1, h - 2);
  g.fillRect(x + w - 1, y + 1, 1, h - 2);
}
