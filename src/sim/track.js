// Track geometry. A track is a closed loop: a smooth centreline built from a few
// control points, a road width either side, a curb, a strip of grass, then a fence.
//
// Positions along the loop are measured as `s`, a distance in world pixels from the
// start/finish line (s = 0) in the direction of travel. Sideways offset from the
// centreline is `lateral`: positive is to the driver's right.

import { wrapLoop, wrapAngle, clamp } from '../core/math.js';

const SAMPLE_SPACING = 4;     // world pixels between centreline samples
const LOCAL_SEARCH = 30;      // samples either side of a hint to search when projecting

export class Track {
  /** @param {import('../tracks/meadow.js').default} def */
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.world = { ...def.world };
    this.halfWidth = def.halfWidth;
    this.curbWidth = def.curbWidth;
    this.grassWidth = def.grassWidth;
    this.buildCentreline(def.points);
    this.buildRacingLine();
  }

  /** Lateral distance from the centreline to the fence (where the kart's centre stops). */
  get fenceOffset() {
    return this.halfWidth + this.curbWidth + this.grassWidth;
  }

  buildCentreline(points) {
    // 1. Dense Catmull-Rom samples through the control points.
    const dense = [];
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const p0 = points[(i - 1 + n) % n];
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const p3 = points[(i + 2) % n];
      const steps = 64;
      for (let k = 0; k < steps; k++) {
        const t = k / steps;
        dense.push(catmullRom(p0, p1, p2, p3, t));
      }
    }

    // 2. Measure it.
    const denseS = [0];
    for (let i = 1; i <= dense.length; i++) {
      const a = dense[i - 1];
      const b = dense[i % dense.length];
      denseS.push(denseS[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    const length = denseS[dense.length];

    // 3. Resample at even spacing so sample index * spacing === s.
    const count = Math.round(length / SAMPLE_SPACING);
    this.length = length;
    this.count = count;
    this.spacing = length / count;
    this.xs = new Float64Array(count);
    this.ys = new Float64Array(count);
    let j = 0;
    for (let i = 0; i < count; i++) {
      const s = i * this.spacing;
      while (denseS[j + 1] < s) j++;
      const a = dense[j];
      const b = dense[(j + 1) % dense.length];
      const t = (s - denseS[j]) / (denseS[j + 1] - denseS[j] || 1);
      this.xs[i] = a[0] + (b[0] - a[0]) * t;
      this.ys[i] = a[1] + (b[1] - a[1]) * t;
    }

    // 4. Tangents, normals (pointing to the driver's right) and heading per sample.
    this.tx = new Float64Array(count);
    this.ty = new Float64Array(count);
    this.headings = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const nx = this.xs[(i + 1) % count] - this.xs[(i - 1 + count) % count];
      const ny = this.ys[(i + 1) % count] - this.ys[(i - 1 + count) % count];
      const len = Math.hypot(nx, ny) || 1;
      this.tx[i] = nx / len;
      this.ty[i] = ny / len;
      this.headings[i] = Math.atan2(ny, nx);
    }

    // 5. Curvature: heading change per pixel. Positive = bending right.
    this.curvature = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const d = wrapAngle(this.headings[(i + 1) % count] - this.headings[(i - 1 + count) % count]);
      this.curvature[i] = d / (2 * this.spacing);
    }
  }

  buildRacingLine() {
    // A cheap racing line: lean toward the inside of each bend, smoothed out so the
    // line drifts across the road instead of snapping. Good enough for the rivals.
    const count = this.count;
    const smooth = (src, radius) => {
      const out = new Float64Array(count);
      for (let i = 0; i < count; i++) {
        let sum = 0;
        for (let k = -radius; k <= radius; k++) sum += src[(i + k + count) % count];
        out[i] = sum / (radius * 2 + 1);
      }
      return out;
    };
    const bend = smooth(this.curvature, 14);
    const limit = this.halfWidth - 7;
    const raw = new Float64Array(count);
    for (let i = 0; i < count; i++) raw[i] = clamp(bend[i] * 2600, -limit, limit);
    this.racingLine = smooth(smooth(raw, 10), 10);
    // Smoothed curvature, for planning corner speeds.
    this.smoothCurvature = smooth(this.curvature, 5);
  }

  /** Smoothed curvature (radians per pixel, positive = bending right) at loop distance s. */
  curvatureAt(s) {
    return this.smoothCurvature[this.sampleIndex(s)];
  }

  sampleIndex(s) {
    return Math.floor(wrapLoop(s, this.length) / this.spacing) % this.count;
  }

  /** Point on the centreline (plus an optional sideways offset) at loop distance s. */
  pointAt(s, lateral = 0) {
    const u = wrapLoop(s, this.length) / this.spacing;
    const i = Math.floor(u) % this.count;
    const k = (i + 1) % this.count;
    const t = u - Math.floor(u);
    const x = this.xs[i] + (this.xs[k] - this.xs[i]) * t;
    const y = this.ys[i] + (this.ys[k] - this.ys[i]) * t;
    const tx = this.tx[i] + (this.tx[k] - this.tx[i]) * t;
    const ty = this.ty[i] + (this.ty[k] - this.ty[i]) * t;
    const len = Math.hypot(tx, ty) || 1;
    const ux = tx / len;
    const uy = ty / len;
    // Right-hand normal of (ux, uy) in screen coordinates (y down) is (-uy, ux).
    return {
      x: x - uy * lateral,
      y: y + ux * lateral,
      angle: Math.atan2(uy, ux),
      nx: -uy,
      ny: ux,
    };
  }

  headingAt(s) {
    return this.headings[this.sampleIndex(s)];
  }

  racingLineAt(s) {
    return this.racingLine[this.sampleIndex(s)];
  }

  /** Total turning (radians, unsigned) between loop distances from and to. */
  bendBetween(from, to) {
    let total = 0;
    const step = this.spacing * 2;
    let prev = this.headingAt(from);
    for (let s = from + step; s <= to; s += step) {
      const h = this.headingAt(s);
      total += Math.abs(wrapAngle(h - prev));
      prev = h;
    }
    return total;
  }

  /**
   * Closest centreline position to (x, y).
   * Pass the previous result's index as `hint` so a kart stays attached to its own
   * stretch of road (it can never "jump" to a different part of the track).
   * @returns {{ s: number, lateral: number, index: number, distance: number }}
   */
  project(x, y, hint = -1) {
    const count = this.count;
    let first = 0;
    let span = count;
    if (hint >= 0) {
      first = hint - LOCAL_SEARCH;
      span = LOCAL_SEARCH * 2 + 1;
    }
    let best = Infinity;
    let bestI = 0;
    let bestT = 0;
    for (let k = 0; k < span; k++) {
      const i = ((first + k) % count + count) % count;
      const j = (i + 1) % count;
      const ax = this.xs[i];
      const ay = this.ys[i];
      const dx = this.xs[j] - ax;
      const dy = this.ys[j] - ay;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((x - ax) * dx + (y - ay) * dy) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + dx * t - x;
      const py = ay + dy * t - y;
      const d2 = px * px + py * py;
      if (d2 < best) {
        best = d2;
        bestI = i;
        bestT = t;
      }
    }
    const j = (bestI + 1) % count;
    const cx = this.xs[bestI] + (this.xs[j] - this.xs[bestI]) * bestT;
    const cy = this.ys[bestI] + (this.ys[j] - this.ys[bestI]) * bestT;
    const dx = this.xs[j] - this.xs[bestI];
    const dy = this.ys[j] - this.ys[bestI];
    const len = Math.hypot(dx, dy) || 1;
    // Signed offset along the right-hand normal (-dy, dx).
    const lateral = ((x - cx) * -dy + (y - cy) * dx) / len;
    return {
      s: wrapLoop((bestI + bestT) * this.spacing, this.length),
      lateral,
      index: bestI,
      distance: Math.sqrt(best),
    };
  }

  /** 'road' | 'curb' | 'grass' for a sideways offset from the centreline. */
  surfaceAt(lateral) {
    const a = Math.abs(lateral);
    if (a <= this.halfWidth) return 'road';
    if (a <= this.halfWidth + this.curbWidth) return 'curb';
    return 'grass';
  }

  /**
   * Starting positions, two abreast, behind the start line.
   * @returns {{ x: number, y: number, heading: number, s: number }[]}
   */
  startGrid(count) {
    const slots = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / 2);
      const side = i % 2 === 0 ? -1 : 1;
      const s = -14 - row * 20 - (side > 0 ? 8 : 0);
      const p = this.pointAt(s, side * 11);
      slots.push({ x: p.x, y: p.y, heading: p.angle, s });
    }
    return slots;
  }

  /**
   * Smallest gap between two stretches of road that are far apart along the loop.
   * If this is less than twice the fence offset, the grass areas overlap and the
   * track can be cut. Tests check every track with this.
   */
  minimumSeparation() {
    const minLoopGap = this.fenceOffset * 4;
    const step = 3;
    let best = Infinity;
    for (let i = 0; i < this.count; i += step) {
      for (let j = i + step; j < this.count; j += step) {
        const along = Math.min(j - i, this.count - (j - i)) * this.spacing;
        if (along < minLoopGap) continue;
        const d = Math.hypot(this.xs[i] - this.xs[j], this.ys[i] - this.ys[j]);
        if (d < best) best = d;
      }
    }
    return best;
  }
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a, b, c, d) =>
    0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}
