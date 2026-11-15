// Test Oval: the playtest lab's canvas. Two long straights and two wide, even bends, a
// road wide enough for a pack of eleven to run four or five abreast, and nothing else.
// Mechanics get tried out here before they go anywhere fancier.

const STRAIGHT = 760;   // length of each straight
const RADIUS = 190;     // radius of the bends (centreline)
const MARGIN = 150;     // world space around the outside of the track
const CX = MARGIN + RADIUS;
const CY = MARGIN + RADIUS;

// Control points every ~60 px round a stadium shape, clockwise, starting just past the
// middle of the top straight (going right), so the whole grid sits on the straight.
// Dense points keep the spline from pinching the bends.
function stadium() {
  const step = 60;
  const arc = Math.PI * RADIUS;
  const total = 2 * STRAIGHT + 2 * arc;
  const n = Math.round(total / step);
  const pts = [];
  for (let i = 0; i < n; i++) {
    let d = ((i * total) / n + STRAIGHT * 0.6) % total;
    let x;
    let y;
    if (d < STRAIGHT) {
      x = CX + d;
      y = CY - RADIUS;
    } else if ((d -= STRAIGHT) < arc) {
      const a = -Math.PI / 2 + d / RADIUS;
      x = CX + STRAIGHT + Math.cos(a) * RADIUS;
      y = CY + Math.sin(a) * RADIUS;
    } else if ((d -= arc) < STRAIGHT) {
      x = CX + STRAIGHT - d;
      y = CY + RADIUS;
    } else {
      d -= STRAIGHT;
      const a = Math.PI / 2 + d / RADIUS;
      x = CX + Math.cos(a) * RADIUS;
      y = CY + Math.sin(a) * RADIUS;
    }
    pts.push([Math.round(x), Math.round(y)]);
  }
  return pts;
}

export default {
  id: 'test-oval',
  name: 'TEST OVAL',
  world: { width: STRAIGHT + RADIUS * 2 + MARGIN * 2, height: RADIUS * 2 + MARGIN * 2 },
  halfWidth: 46,
  curbWidth: 3,
  grassWidth: 34,
  points: stadium(),
  itemRows: [],
  obstacles: [],
  scenery: {
    pond: { x: CX + STRAIGHT / 2, y: CY, rx: 150, ry: 55 },
    trees: 150,
    flowers: 260,
  },
};
