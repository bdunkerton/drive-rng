// A 3x5 pixel font. Lower-case text is drawn as upper case. Unknown characters draw as blanks.
// Each glyph is five rows of three columns; '#' is a lit pixel.

const GLYPHS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'],
  1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['##.', '..#', '.#.', '#..', '###'],
  3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'],
  5: ['###', '#..', '##.', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'],
  7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'],
  9: ['###', '#.#', '###', '..#', '##.'],
  '.': ['...', '...', '...', '...', '.#.'],
  ',': ['...', '...', '...', '.#.', '#..'],
  ':': ['...', '.#.', '...', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '=': ['...', '###', '...', '###', '...'],
  '[': ['##.', '#..', '#..', '#..', '##.'],
  ']': ['.##', '..#', '..#', '..#', '.##'],
  ';': ['...', '.#.', '...', '.#.', '#..'],
  "'": ['.#.', '.#.', '...', '...', '...'],
  '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  "'": ['.#.', '.#.', '...', '...', '...'],
  '(': ['..#', '.#.', '.#.', '.#.', '..#'],
  ')': ['#..', '.#.', '.#.', '.#.', '#..'],
  '<': ['..#', '.#.', '#..', '.#.', '..#'],
  '>': ['#..', '.#.', '..#', '.#.', '#..'],
  '%': ['#.#', '..#', '.#.', '#..', '#.#'],
  '#': ['#.#', '###', '#.#', '###', '#.#'],
  '_': ['...', '...', '...', '...', '###'],
  ' ': ['...', '...', '...', '...', '...'],
};

export const GLYPH_W = 3;
export const GLYPH_H = 5;
const ADVANCE = 4;

/** Width in pixels of text at a scale. */
export function textWidth(text, scale = 1) {
  const n = String(text).length;
  return n === 0 ? 0 : (n * ADVANCE - 1) * scale;
}

/**
 * Draw text. align: 'left' | 'center' | 'right'. shadow: colour or null.
 * @param {CanvasRenderingContext2D} g
 */
export function drawText(g, text, x, y, { color = '#fff', scale = 1, align = 'left', shadow = 'rgba(10,8,16,0.85)' } = {}) {
  const str = String(text).toUpperCase();
  let cx = Math.round(x);
  if (align === 'center') cx = Math.round(x - textWidth(str, scale) / 2);
  else if (align === 'right') cx = Math.round(x - textWidth(str, scale));
  const cy = Math.round(y);
  if (shadow) paint(g, str, cx + scale, cy + scale, shadow, scale);
  paint(g, str, cx, cy, color, scale);
}

function paint(g, str, x, y, color, scale) {
  g.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const glyph = GLYPHS[str[i]] ?? GLYPHS[' '];
    for (let row = 0; row < GLYPH_H; row++) {
      const line = glyph[row];
      for (let col = 0; col < GLYPH_W; col++) {
        if (line[col] === '#') g.fillRect(x + (i * ADVANCE + col) * scale, y + row * scale, scale, scale);
      }
    }
  }
}

/** Big outlined text for titles and banners. */
export function drawOutlinedText(g, text, x, y, { color = '#fff', outline = '#14121a', scale = 2, align = 'left' } = {}) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    drawText(g, text, x + dx, y + dy, { color: outline, scale, align, shadow: null });
  }
  drawText(g, text, x, y + 1, { color: outline, scale, align, shadow: null });
  drawText(g, text, x, y, { color, scale, align, shadow: null });
}
