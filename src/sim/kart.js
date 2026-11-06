// A kart: where it is, how it's moving, what it's holding, how its race is going.
// `stepKart` is the driving physics. It knows nothing about the track; race.js
// applies surfaces and the fence after each step.

import { KART, ITEMS } from '../config.js';
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
    // useItem / fuse / cycle are one-step presses.
    this.controls = { throttle: 0, brake: 0, steer: 0, useItem: false, fuse: false, cycle: false };
    this.controller = null;

    this.effects = new EffectList();

    // Items: see src/sim/hand.js
    this.items = [];                // held items, front first: { parts: [ids], roulette, wild }
    this.slots = ITEMS.slots;       // how many it can hold
    this.scriptedPickups = null;    // first race only: the boxes give these, in order
    this.tutorialFuse = false;      // first race only: the HUD nags "PRESS F TO FUSE"

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

  /** Collision radius. Effects can scale it (BULK nearly doubles it). */
  get radius() {
    return this.base.radius * this.scale;
  }

  /** Drawing scale: 1 normally, about 2 while giant. */
  get scale() {
    return Math.min(2.5, this.effects.multiplier('scale'));
  }

  /** How high off the ground the kart is (drawn only): the highest airborne effect, in pixels. */
  get height() {
    let h = 0;
    for (const e of this.effects.active) {
      if (!e.height || !e.tags.includes('air')) continue;
      const t = Math.min(1, e.age / Math.max(0.01, e.duration));
      h = Math.max(h, Math.sin(Math.PI * t) * e.height);
    }
    return h;
  }

  /** Can the front item be used right now? */
  get itemReady() {
    const front = this.items[0];
    return !!front && front.roulette <= 0;
  }

  /** Is there room for another item? */
  get hasFreeSlot() {
    return this.items.length < this.slots;
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
  // Some motions (TWISTER) set the velocity themselves: just move.
  if (kart.effects.hasTag('scripted')) {
    kart.x += kart.vx * dt;
    kart.y += kart.vy * dt;
    return;
  }
  const st = kart.stats();
  // GRIP's rails: no sliding, and the steering doesn't get heavy at speed.
  const rails = kart.effects.hasTag('rails');
  // MOONWALK: facing backwards, thrusting the way you're going.
  const moon = kart.effects.hasTag('moonwalk');
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

  if (moon) {
    fwd = Math.max(-topSpeed, fwd - st.accel * 1.5 * dt);
  } else if (brake > 0 && fwd > 1) {
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
  if (fwd < -topSpeed) fwd = approach(fwd, -topSpeed, 190 * dt);

  // Sideways slide dies out according to grip. Past a point the tyres let go and the
  // kart keeps sliding: you have to catch it.
  const grip = !rails && Math.abs(side) > KART.slideAt ? st.grip * KART.slideGrip : st.grip;
  side *= Math.exp(-grip * dt);

  // Rebuild velocity from the pre-turn axes, then turn. Turning therefore creates a
  // little sideways slide on the next step, which grip cleans up: an arcade drift feel.
  kart.vx = fx * fwd - fy * side;
  kart.vy = fy * fwd + fx * side;

  // Steering is sharpest at low-to-middling speed and gets heavier toward (and past) top speed.
  const atSpeed = Math.min(1.5, Math.abs(fwd) / KART.maxSpeed);
  const fade = rails ? 1 : Math.max(0.3, 1 - (1 - KART.turnAtTopSpeed) * atSpeed);
  const turnScale = clamp(Math.abs(fwd) / st.turnFullAt, 0, 1) * fade;
  const direction = fwd >= 0 ? 1 : -1;
  kart.heading += steer * st.turnRate * turnScale * direction * dt;

  kart.x += kart.vx * dt;
  kart.y += kart.vy * dt;
}
