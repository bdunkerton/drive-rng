// A kart: where it is, how it's moving, what it's holding, how its race is going.
// `stepKart` is the driving physics. It knows nothing about the track; race.js
// applies surfaces and the fence after each step.

import { KART } from '../config.js';
import { clamp, approach } from '../core/math.js';
import { EffectList, STAT_KEYS } from './effects.js';

export class Kart {
  constructor({ id, name, color, isPlayer = false, x, y, heading }) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.isPlayer = isPlayer;

    // Motion
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.heading = heading;
    this.base = { ...KART };

    // What the driver is asking for this step. Controllers write this; effects may override it.
    this.controls = { throttle: 0, brake: 0, steer: 0, useItem: false };
    this.controller = null;

    this.effects = new EffectList();

    // Items
    this.item = null;          // powerup id, or null
    this.itemRoulette = 0;     // seconds left on the "spinning" animation; can't use until 0
    this.itemHeld = 0;         // seconds since the item settled

    // Track position (filled in by the race)
    this.s = 0;
    this.lateral = 0;
    this.trackIndex = -1;
    this.surface = 'road';
    this.progress = 0;         // total distance along the course since the start line, can be negative
    this.lapsDone = 0;
    this.lapTimes = [];
    this.lapStartedAt = 0;
    this.position = 0;
    this.finished = false;
    this.finishTime = null;

    // Bookkeeping for effects and rendering
    this.lastWallHit = -1;
    this.lastBump = -1;
  }

  /** Base stats with every active effect's multipliers applied. */
  stats() {
    const out = { ...this.base };
    for (const key of STAT_KEYS) out[key] = this.base[key] * this.effects.multiplier(key);
    return out;
  }

  /** Speed along the direction the kart is facing (negative when reversing). */
  get forwardSpeed() {
    return this.vx * Math.cos(this.heading) + this.vy * Math.sin(this.heading);
  }

  get speed() {
    return Math.hypot(this.vx, this.vy);
  }

  /** Can the held item be used right now? */
  get itemReady() {
    return this.item !== null && this.itemRoulette <= 0;
  }

  addEffect(effect, race) {
    return this.effects.add(effect, this, race);
  }

  /** Add speed in the facing direction (instant kick, e.g. a boost). */
  kick(amount) {
    this.vx += Math.cos(this.heading) * amount;
    this.vy += Math.sin(this.heading) * amount;
  }

  /** Current lap number to show (1-based, never past the last lap). */
  currentLap(totalLaps) {
    return Math.min(this.lapsDone + 1, totalLaps);
  }
}

/**
 * Driving physics for one fixed step.
 * @param {Kart} kart
 * @param {{ maxSpeed: number, drag: number }} surface multipliers for the ground under the kart
 */
export function stepKart(kart, dt, surface) {
  const st = kart.stats();
  const c = kart.controls;
  const throttle = clamp(c.throttle, 0, 1);
  const brake = clamp(c.brake, 0, 1);
  const steer = clamp(c.steer, -1, 1);

  const fx = Math.cos(kart.heading);
  const fy = Math.sin(kart.heading);
  // Split velocity into forward and sideways (to the right) parts.
  let fwd = kart.vx * fx + kart.vy * fy;
  let side = kart.vx * -fy + kart.vy * fx;

  const topSpeed = st.maxSpeed * surface.maxSpeed;

  if (brake > 0 && fwd > 1) {
    fwd = Math.max(0, fwd - st.brake * brake * dt);
  } else if (brake > 0) {
    // Holding brake when stopped reverses.
    fwd = Math.max(-st.reverseMaxSpeed, fwd - st.accel * 0.6 * brake * dt);
  } else if (throttle > 0) {
    if (fwd < topSpeed) fwd = Math.min(topSpeed, fwd + st.accel * throttle * dt);
  } else {
    fwd -= fwd * st.coastDrag * dt;
  }

  // Rough ground drags; going over the top speed (e.g. a boost wearing off,
  // or rolling onto grass) bleeds off quickly but not instantly.
  fwd -= fwd * surface.drag * dt;
  if (fwd > topSpeed) fwd = approach(fwd, topSpeed, 190 * dt);

  // Sideways slide dies out according to grip.
  side *= Math.exp(-st.grip * dt);

  // Rebuild velocity from the pre-turn axes, then turn. Turning therefore creates a
  // little sideways slide on the next step, which grip cleans up: an arcade drift feel.
  kart.vx = fx * fwd - fy * side;
  kart.vy = fy * fwd + fx * side;

  const turnScale = clamp(Math.abs(fwd) / st.turnFullAt, 0, 1);
  const direction = fwd >= 0 ? 1 : -1;
  kart.heading += steer * st.turnRate * turnScale * direction * dt;

  kart.x += kart.vx * dt;
  kart.y += kart.vy * dt;
}
