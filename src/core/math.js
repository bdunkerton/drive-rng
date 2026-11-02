export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const sign = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);

/** Wrap an angle into (-PI, PI]. */
export function wrapAngle(a) {
  a = ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return a === -Math.PI ? Math.PI : a;
}

/** Smallest signed turn from angle a to angle b. */
export const angleDiff = (a, b) => wrapAngle(b - a);

export const dist2 = (ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
};

export const dist = (ax, ay, bx, by) => Math.sqrt(dist2(ax, ay, bx, by));

/** Move value toward target by at most step. */
export function approach(value, target, step) {
  if (value < target) return Math.min(value + step, target);
  return Math.max(value - step, target);
}

/** Wrap a distance along a loop of the given length into [0, length). */
export const wrapLoop = (s, length) => ((s % length) + length) % length;

/** Signed shortest step from loop position a to loop position b. */
export function loopDelta(a, b, length) {
  let d = b - a;
  if (d > length / 2) d -= length;
  if (d < -length / 2) d += length;
  return d;
}
