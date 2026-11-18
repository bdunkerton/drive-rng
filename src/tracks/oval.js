// Test Oval: the playtest lab's canvas. Two long straights and two wide, even bends, a
// road wide enough for a pack of eleven to run four or five abreast, and nothing else.
// Mechanics get tried out here before they go anywhere fancier.

/**
 * A stadium oval: two straights joined by half-circle bends. Control points every ~60 px,
 * clockwise, starting just past the middle of the top straight (going right), so the
 * whole grid sits on the straight. Dense points keep the spline from pinching the bends.
 */
export function makeOval({ id, name, straight, radius, halfWidth, margin = 150, grassWidth = 34, scenery = {} }) {
  const CX = margin + radius;
  const CY = margin + radius;
  const step = 60;
  const arc = Math.PI * radius;
  const total = 2 * straight + 2 * arc;
  const n = Math.round(total / step);
  const points = [];
  for (let i = 0; i < n; i++) {
    let d = ((i * total) / n + straight * 0.6) % total;
    let x;
    let y;
    if (d < straight) {
      x = CX + d;
      y = CY - radius;
    } else if ((d -= straight) < arc) {
      const a = -Math.PI / 2 + d / radius;
      x = CX + straight + Math.cos(a) * radius;
      y = CY + Math.sin(a) * radius;
    } else if ((d -= arc) < straight) {
      x = CX + straight - d;
      y = CY + radius;
    } else {
      d -= straight;
      const a = Math.PI / 2 + d / radius;
      x = CX + Math.cos(a) * radius;
      y = CY + Math.sin(a) * radius;
    }
    points.push([Math.round(x), Math.round(y)]);
  }
  return {
    id,
    name,
    world: { width: straight + radius * 2 + margin * 2, height: radius * 2 + margin * 2 },
    halfWidth,
    curbWidth: 3,
    grassWidth,
    points,
    itemRows: [],
    obstacles: [],
    scenery: {
      pond: { x: CX + straight / 2, y: CY, rx: Math.max(40, straight * 0.2), ry: Math.max(20, radius * 0.29) },
      trees: 150,
      flowers: 260,
      ...scenery,
    },
  };
}

export default makeOval({ id: 'test-oval', name: 'TEST OVAL', straight: 760, radius: 190, halfWidth: 46 });
