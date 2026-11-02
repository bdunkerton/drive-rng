// The whole game draws from this palette. Track art is snapped to it after drawing,
// which is what keeps edges crisp.

export const PAL = {
  black: '#14121a',
  white: '#f2efe6',
  shadow: 'rgba(10, 8, 16, 0.38)',

  forest: '#23432a',
  forestLight: '#2f5a33',
  treeDark: '#1d3a22',
  treeMid: '#2f6a34',
  treeLight: '#4c8f3e',
  trunk: '#5a3b22',

  grass: '#5ea53f',
  grassDark: '#539536',
  fence: '#7a5532',
  fencePost: '#4a321e',

  curbRed: '#c9443a',
  curbWhite: '#ece7db',

  road: '#5a5c66',
  roadLight: '#666873',
  roadDark: '#4d4f58',

  water: '#3a78bd',
  waterLight: '#6ba5dd',
  sand: '#d8c288',

  flowerYellow: '#f2d14b',
  flowerPink: '#ec7fb2',
  flowerWhite: '#f6f3ea',

  hudBg: 'rgba(16, 14, 24, 0.72)',
  hudEdge: '#e8e2d0',
  gold: '#f2c14b',
  silver: '#c8ccd6',
  bronze: '#d08a4c',
  danger: '#f05a4a',
  boost: '#ff9a3c',
  boostHot: '#ffe066',
};

// Track art is quantised to these colours.
export const TRACK_COLOURS = [
  PAL.forest, PAL.grass, PAL.fence, PAL.curbRed, PAL.curbWhite, PAL.road,
];

export const KART_COLOURS = {
  red:    { body: '#dc4b3e', dark: '#8f2a22', light: '#ff8a6e' },
  blue:   { body: '#3f73dc', dark: '#24428c', light: '#86b0ff' },
  green:  { body: '#3fae52', dark: '#226b30', light: '#8fe08a' },
  yellow: { body: '#e9c33b', dark: '#9c7d1c', light: '#fff08a' },
  purple: { body: '#9b52d2', dark: '#5c2c86', light: '#d29bff' },
  orange: { body: '#ea843b', dark: '#9a4f1c', light: '#ffc08a' },
  cyan:   { body: '#3cc8da', dark: '#1f7c88', light: '#9ff2ff' },
  pink:   { body: '#ea70b0', dark: '#9a3a6c', light: '#ffb3dc' },
  grey:   { body: '#9aa0aa', dark: '#5a5f68', light: '#d6dae0' },
};

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
