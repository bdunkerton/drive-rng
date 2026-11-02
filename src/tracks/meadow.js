// Meadow Loop: the first (and so far only) track.
// Control points run clockwise. The start/finish line sits at the first point.

export default {
  id: 'meadow-loop',
  name: 'MEADOW LOOP',
  world: { width: 1840, height: 1300 },
  halfWidth: 24,
  curbWidth: 3,
  grassWidth: 30,
  points: [
    [620, 226],
    [900, 215],
    [1400, 255],
    [1620, 440],
    [1580, 700],
    [1360, 830],
    [1160, 760],
    [960, 820],
    [905, 1010],
    [660, 1080],
    [390, 1010],
    [255, 830],
    [390, 640],
    [255, 450],
    [320, 250],
  ],
  // Rows of item boxes, as a fraction of the lap from the start line.
  itemRows: [
    { at: 0.17, boxes: 4 },
    { at: 0.47, boxes: 4 },
    { at: 0.76, boxes: 4 },
  ],
  // Purely decorative, drawn on the infield. Positions in world pixels.
  scenery: {
    pond: { x: 700, y: 560, rx: 120, ry: 70 },
    trees: 140,
    flowers: 260,
  },
};
