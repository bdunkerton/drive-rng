// The rivals' brain. Each step it looks a little way up the road, aims at a point
// on (roughly) the racing line, slows for bends it can see coming, and fires its
// item when the road ahead is straight. It also backs out if it gets stuck.

import { AI } from '../config.js';
import { clamp, angleDiff, lerp } from '../core/math.js';

export class AIDriver {
  /**
   * @param {import('../core/rng.js').Rng} rng
   * @param {{ skill?: number }} [opts]
   */
  constructor(rng, opts = {}) {
    this.rng = rng;
    this.skill = opts.skill ?? rng.range(AI.skillMin, AI.skillMax);
    // Each rival prefers its own lane a bit, and wanders around it slowly.
    this.laneBias = rng.range(-6, 6);
    this.lane = this.laneBias;
    this.laneTarget = this.laneBias;
    this.laneTimer = rng.range(1, 3);
    this.stuckFor = 0;
    this.reverseFor = 0;
    this.itemDelay = null;
    // Debug view reads these.
    this.debug = { tx: 0, ty: 0, targetSpeed: 0 };
  }

  update(kart, race, dt) {
    const c = kart.controls;
    const track = race.track;
    const stats = kart.stats();
    const speed = kart.forwardSpeed;

    // --- Lane wandering and simple overtaking --------------------------------
    this.laneTimer -= dt;
    if (this.laneTimer <= 0) {
      this.laneTimer = this.rng.range(1.5, 4);
      this.laneTarget = this.laneBias + this.rng.range(-5, 5);
    }
    const blocker = this.findBlocker(kart, race);
    if (blocker) {
      const side = blocker.lateral > kart.lateral ? -1 : 1;
      this.laneTarget = clamp(blocker.lateral + side * 14, -track.halfWidth + 6, track.halfWidth - 6);
    }
    this.lane = lerp(this.lane, this.laneTarget, clamp(dt * 1.5, 0, 1));

    // --- Steering -------------------------------------------------------------
    const look = AI.lookaheadBase + Math.max(0, speed) * AI.lookaheadPerSpeed;
    const aheadS = kart.s + look;
    const offset = clamp(track.racingLineAt(aheadS) * this.skill + this.lane, -track.halfWidth + 5, track.halfWidth - 5);
    const target = track.pointAt(aheadS, offset);
    const desired = Math.atan2(target.y - kart.y, target.x - kart.x);
    const turn = angleDiff(kart.heading, desired);
    let steer = clamp(turn * 2.8, -1, 1);

    // --- Speed planning -------------------------------------------------------
    const horizon = 18 + Math.max(0, speed) * 1.05;
    const bend = track.bendBetween(kart.s + 8, kart.s + 8 + horizon);
    // Better drivers brake later and less. Gentle bends don't need any braking at all.
    const caution = lerp(1.0, 0.55, clamp((this.skill - 0.85) / 0.15, 0, 1));
    let targetSpeed = (stats.maxSpeed * this.skill) / (1 + Math.max(0, bend - AI.freeBend) * caution * 0.6);
    if (Math.abs(turn) > 0.7) targetSpeed *= 0.7;
    targetSpeed = Math.max(targetSpeed, 34);

    let throttle = 1;
    let brake = 0;
    if (speed > targetSpeed + 10) {
      throttle = 0;
      brake = 0.7;
    } else if (speed > targetSpeed) {
      throttle = 0;
    }

    // --- Getting unstuck ------------------------------------------------------
    if (race.phase === 'racing' && this.reverseFor <= 0) {
      if (speed < 6) this.stuckFor += dt;
      else this.stuckFor = 0;
      if (this.stuckFor > AI.stuckSeconds) {
        this.reverseFor = AI.reverseSeconds;
        this.stuckFor = 0;
      }
    }
    if (this.reverseFor > 0) {
      this.reverseFor -= dt;
      throttle = 0;
      brake = 1;
      steer = -steer;
    }

    // --- Items ----------------------------------------------------------------
    let useItem = false;
    if (kart.itemReady) {
      if (this.itemDelay === null) this.itemDelay = this.rng.range(AI.itemDelayMin, AI.itemDelayMax);
      this.itemDelay -= dt;
      const straightAhead = track.bendBetween(kart.s, kart.s + 140) < 0.45;
      if (this.itemDelay <= 0 && straightAhead && this.reverseFor <= 0) {
        useItem = true;
        this.itemDelay = null;
      }
    } else {
      this.itemDelay = null;
    }

    c.throttle = throttle;
    c.brake = brake;
    c.steer = steer;
    c.useItem = useItem;
    this.debug.tx = target.x;
    this.debug.ty = target.y;
    this.debug.targetSpeed = targetSpeed;
  }

  /** A kart a short way ahead in roughly the same lane, going slower. */
  findBlocker(kart, race) {
    let best = null;
    let bestGap = Infinity;
    for (const other of race.karts) {
      if (other === kart) continue;
      const gap = other.progress - kart.progress;
      if (gap <= 0 || gap > 30) continue;
      if (Math.abs(other.lateral - kart.lateral) > 11) continue;
      if (other.forwardSpeed > kart.forwardSpeed - 4) continue;
      if (gap < bestGap) {
        bestGap = gap;
        best = other;
      }
    }
    return best;
  }
}
