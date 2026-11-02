// Kart sprites. One small top-down design (facing right), recoloured per kart and
// pre-rotated into 32 directions with nearest-neighbour sampling, so rotation stays
// pixel-crisp.

import { KART_COLOURS, PAL } from './palette.js';
import { makeCanvas } from './canvas.js';
import { TAU } from '../core/math.js';

// w = wheel, d = dark body, b = body, l = light nose, h = helmet, v = visor, s = spoiler
const KART_SHAPE = [
  '.ww....ww..',
  'sdbbbbbbbd.',
  'sbbbhhbbbbl',
  'sbbbhvbbbbl',
  'sbbbhhbbbbl',
  'sdbbbbbbbd.',
  '.ww....ww..',
];

const DIRECTIONS = 32;
const SIZE = 13;
const cache = new Map();

function colourMap(name) {
  const c = KART_COLOURS[name] ?? KART_COLOURS.grey;
  return { w: '#1c1a22', d: c.dark, b: c.body, l: c.light, h: PAL.white, v: '#1c1a22', s: c.dark };
}

function buildSet(colour, silhouette = false) {
  const map = colourMap(colour);
  const shapeH = KART_SHAPE.length;
  const shapeW = KART_SHAPE[0].length;
  const cx = shapeW / 2;
  const cy = shapeH / 2;
  const frames = [];
  for (let i = 0; i < DIRECTIONS; i++) {
    const a = (i / DIRECTIONS) * TAU;
    const cos = Math.cos(-a);
    const sin = Math.sin(-a);
    const { canvas, g } = makeCanvas(SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x + 0.5 - SIZE / 2;
        const dy = y + 0.5 - SIZE / 2;
        const sx = Math.floor(dx * cos - dy * sin + cx);
        const sy = Math.floor(dx * sin + dy * cos + cy);
        if (sx < 0 || sy < 0 || sx >= shapeW || sy >= shapeH) continue;
        const ch = KART_SHAPE[sy][sx];
        if (ch === '.') continue;
        g.fillStyle = silhouette ? '#000' : map[ch];
        g.fillRect(x, y, 1, 1);
      }
    }
    frames.push(canvas);
  }
  return frames;
}

function frameIndex(heading) {
  const t = ((heading % TAU) + TAU) % TAU;
  return Math.round((t / TAU) * DIRECTIONS) % DIRECTIONS;
}

export function kartFrame(colour, heading) {
  if (!cache.has(colour)) cache.set(colour, buildSet(colour));
  return cache.get(colour)[frameIndex(heading)];
}

export function kartShadow(heading) {
  if (!cache.has('__shadow')) cache.set('__shadow', buildSet('grey', true));
  return cache.get('__shadow')[frameIndex(heading)];
}

export const KART_SPRITE_SIZE = SIZE;
