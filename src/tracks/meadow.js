// Meadow Loop: the first (and so far only) track. About 3,200 pixels round, so a good
// lap is a little over 20 seconds: a long front straight, a fast right sweeper, a left-right
// chicane, a tight hairpin at the bottom, and a long left side back up to the line.
// Control points run clockwise. The start/finish line sits at the first point.
// The layout is drawn at SCALE 1 and blown up by SCALE, which gives gentler corners and a
// wider road (more room to pick a line, pull out of a draft, or line up a hit).

const SCALE = 1.2;
const at = ([x, y]) => [Math.round(x * SCALE), Math.round(y * SCALE)];

export default {
  id: 'meadow-loop',
  name: 'MEADOW LOOP',
  world: { width: Math.round(1240 * SCALE), height: Math.round(900 * SCALE) },
  halfWidth: 30,
  curbWidth: 3,
  grassWidth: 30,
  points: [
    [350, 140],
    [700, 130],
    [980, 150],
    [1120, 260],
    [1110, 430],
    [980, 520],
    [820, 470],
    [680, 540],
    [650, 700],
    [540, 790],
    [400, 740],
    [380, 600],
    [290, 450],
    [200, 320],
    [230, 190],
  ].map(at),
  // Rows of item boxes, as a fraction of the lap from the start line. Every kart can
  // take every box (they respawn for each kart separately), so the pack isn't starved.
  itemRows: [
    { at: 0.04, boxes: 4 },
    { at: 0.15, boxes: 4 },
    { at: 0.26, boxes: 4 },
    { at: 0.36, boxes: 4 },
    { at: 0.46, boxes: 4 },
    { at: 0.56, boxes: 4 },
    { at: 0.64, boxes: 4 },
    { at: 0.74, boxes: 4 },
    { at: 0.82, boxes: 4 },
    { at: 0.92, boxes: 4 },
  ],
  // Stacks of tyres: solid for normal karts, but a BULK giant can shove them about.
  // `at` is a fraction of the lap, `lateral` is pixels right of the centreline.
  obstacles: [
    // A wall across the left half of the front straight: pick a side.
    { at: 0.08, lateral: -8 },
    { at: 0.08, lateral: -22 },
    // On the apex of the right sweeper: you can't clip it.
    { at: 0.37, lateral: 21 },
    // Right in the middle of the chicane.
    { at: 0.526, lateral: 0 },
    // On the inside of the hairpin.
    { at: 0.667, lateral: 22 },
    // A pair on the right of the back section.
    { at: 0.835, lateral: 15 },
    { at: 0.835, lateral: 0 },
  ],
  // Purely decorative, drawn on the infield. Positions in world pixels.
  scenery: {
    pond: { x: 700 * SCALE, y: 320 * SCALE, rx: 110 * SCALE, ry: 60 * SCALE },
    trees: 130,
    flowers: 245,
  },
};
