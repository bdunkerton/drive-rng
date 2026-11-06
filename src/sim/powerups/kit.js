// The toolkit motions and fields are built from: finding karts nearby, pushing and
// pulling them, popping them into the air, short speed bursts, and runMove, which
// runs one motion with one field.

import { HITS } from '../../config.js';
import { angleDiff, clamp } from '../../core/math.js';
import { hitKart } from '../hits.js';

/** Karts within `radius` of (x, y), nearest first. Finished karts and `except` are left out. */
export function kartsNear(race, x, y, radius, except = null) {
  const out = [];
  for (const k of race.karts) {
    if (k === except || k.finished) continue;
    const d = Math.hypot(k.x - x, k.y - y);
    if (d <= radius + k.radius) out.push({ kart: k, d });
  }
  return out.sort((a, b) => a.d - b.d);
}

/**
 * Tyres lose their grip for a moment, so a push or a pull actually moves the kart
 * sideways instead of being scrubbed off straight away.
 */
export function loosen(kart, race, seconds = 0.3) {
  kart.addEffect({ id: 'loose', duration: seconds, modifiers: { grip: 0.2 }, tags: ['loose'] }, race);
}

/** Turn a kart toward (x, y), at most `rate` radians per second. Motions use this to aim you. */
export function steerToward(kart, x, y, rate, dt) {
  const want = Math.atan2(y - kart.y, x - kart.x);
  kart.heading += clamp(angleDiff(kart.heading, want), -rate * dt, rate * dt);
}

/** Add speed to a kart pointing away from (x, y). Pass the race to loosen its grip too. */
export function pushAway(kart, x, y, amount, race = null) {
  if (race) loosen(kart, race, 0.35);
  let dx = kart.x - x;
  let dy = kart.y - y;
  let d = Math.hypot(dx, dy);
  if (d < 0.01) {
    dx = Math.cos(kart.heading);
    dy = Math.sin(kart.heading);
    d = 1;
  }
  kart.vx += (dx / d) * amount;
  kart.vy += (dy / d) * amount;
}

/** Add speed to a kart pointing toward (x, y), never overshooting it. Pass the race to loosen its grip too. */
export function pullToward(kart, x, y, amount, race = null) {
  if (race) loosen(kart, race, 0.2);
  const dx = x - kart.x;
  const dy = y - kart.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return;
  const a = Math.min(amount, d * 3);
  kart.vx += (dx / d) * a;
  kart.vy += (dy / d) * a;
}

/** A short burst of speed (speed lanes, pop-outs, slingshots). Using it again extends it. */
export function speedBurst(kart, race, seconds, maxSpeed = 1.35, kick = 0) {
  if (kick) kart.kick(kick);
  kart.addEffect(
    {
      id: 'burst',
      duration: seconds,
      modifiers: { maxSpeed, accel: 2.5 },
      tags: ['boost'],
      onTick(k) {
        // Full throttle unless you're braking: you can still brake for a corner.
        if (!k.effects.hasTag('air') && !k.controls.brake) k.controls.throttle = 1;
      },
    },
    race,
  );
}

/** Is a kart up in the air or phased out (so most things can't touch it)? */
export const untouchable = (kart) => kart.effects.hasTag('air') || kart.effects.hasTag('phase');

/**
 * Pop a kart into the air for a moment. It keeps its momentum, can barely steer and
 * can't be bumped. Giants and rocket riders don't pop; a bumper bounces it off.
 * @returns {'popped' | 'shrugged' | 'blocked' | 'missed'}
 */
export function popKart(target, race, { by = null, power = 1 } = {}) {
  if (untouchable(target)) return 'missed';
  if (target.effects.hasTag('giant') || target.effects.hasTag('ride') || target.effects.hasTag('armour')) return 'shrugged';
  if (target.effects.hasTag('bumper')) {
    target.kick(30);
    race.events.emit('ricochet', { kart: target, by });
    return 'blocked';
  }
  const seconds = HITS.popSeconds * (0.8 + 0.2 * power);
  target.addEffect(
    {
      id: 'popped',
      duration: seconds,
      height: 6 + 2 * power,
      modifiers: { turnRate: 0.25, grip: 0.4 },
      tags: ['air'],
      stacking: 'ignore',
      onTick(k) {
        k.controls.brake = 0;
      },
      onEnd(k, r) {
        r.events.emit('land', { kart: k });
      },
    },
    race,
  );
  // A little sideways shove so it lands somewhere new.
  const side = race.rng.chance(0.5) ? 1 : -1;
  target.vx += -Math.sin(target.heading) * side * 25;
  target.vy += Math.cos(target.heading) * side * 25;
  race.events.emit('pop', { kart: target, by });
  race.events.emit('sfx', { name: 'pop', kart: target });
  return 'popped';
}

/** A radial blast: pushes everyone near (x, y) away; very close karts spin out. */
export function blastAt(race, x, y, { owner = null, radius = 55, push = 170, spinRadius = 22 } = {}) {
  const hit = [];
  for (const { kart, d } of kartsNear(race, x, y, radius, owner)) {
    if (untouchable(kart)) continue;
    pushAway(kart, x, y, push * (1 - Math.min(1, d / radius) * 0.6), race);
    if (d <= spinRadius) hitKart(kart, race, { by: owner, kind: 'blast' });
    hit.push(kart);
  }
  race.events.emit('blast', { x, y, radius, owner, karts: hit });
  race.events.emit('sfx', { name: 'blast', kart: owner });
  return hit;
}

/** Boosts and rides drive you forward: full throttle, unless you're braking for a corner. */
export function floorIt(kart) {
  if (!kart.controls.brake) kart.controls.throttle = 1;
}

/**
 * Run a motion with a field on a kart. The motion becomes an effect on the kart for
 * its duration; the field's tick runs alongside it and its release runs when it ends.
 * @param {object} ctx      the race context for the kart (Race.context)
 * @param {object} o
 * @param {object} o.motion a powerup's motion
 * @param {object} o.field  a powerup's field
 * @param {number} o.power      motion strength
 * @param {number} o.fieldPower field strength
 * @param {object} [o.info]     extra fields copied onto the move (kind, wild, name...) for rendering
 */
export function runMove(ctx, { motion, field, power, fieldPower, info = {} }) {
  const { kart, race } = ctx;
  const m = {
    kart,
    race,
    rng: race.rng,
    power,
    fieldPower,
    data: {},
    effect: null,
    motion,
    field,
    ...info,
    stop() {
      if (m.effect) m.effect.remaining = 0;
    },
  };
  const modifiers = motion.modifiers ? motion.modifiers(power) : {};
  m.effect = kart.addEffect(
    {
      id: `move:${motion.id}`,
      duration: motion.duration(power),
      modifiers,
      tags: [...motion.tags, 'move'],
      height: motion.height ? motion.height * Math.sqrt(power) : 0,
      stacking: 'stack',
      move: m,
      onTick(k, dt) {
        motion.tick?.(m, dt);
        field.tick?.(m, dt);
      },
      onEnd() {
        motion.end?.(m);
        field.release?.(m);
        race.events.emit('move:end', { kart, move: m });
      },
      onBump: motion.onBump ? (k, other) => motion.onBump(m, other) : undefined,
      onWall: motion.onWall ? (k, r, impact) => motion.onWall(m, impact) : undefined,
    },
    race,
  );
  motion.start?.(m);
  field.start?.(m);
  return m;
}

/**
 * Do something to each kart in range at most once per move (or once per `every`
 * seconds). Fields use this so a kart isn't hit 60 times a second.
 */
export function onceEach(m, key, kart, every = Infinity) {
  const seen = (m.data[key] ??= new Map());
  const t = m.race.time;
  const last = seen.get(kart);
  if (last !== undefined && t - last < every) return false;
  seen.set(kart, t);
  return true;
}

/** Run fn once the kart is back on the ground (straight away if it isn't in the air). */
export function whenLanded(kart, race, fn) {
  if (!kart.effects.hasTag('air')) return fn();
  kart.addEffect(
    {
      id: 'land-watch',
      duration: 3,
      stacking: 'stack',
      onTick(k) {
        if (k.effects.hasTag('air')) return;
        this.remaining = 0;
        this.landed = true;
        fn();
      },
      onEnd() {
        if (!this.landed) fn();
      },
    },
    race,
  );
}
