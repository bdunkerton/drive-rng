// Timed status effects on a kart. Powerups mostly work by adding an effect.
//
// An effect is a plain object:
//
//   {
//     id: 'boost',                // same id twice follows `stacking` below
//     duration: 1.5,              // seconds; Infinity for "until removed"
//     modifiers: {                // multiplied into the kart's stats while active
//       maxSpeed: 1.5, accel: 2, turnRate: 1, grip: 1, mass: 1,
//     },
//     tags: ['boost'],            // free-form labels; rendering and other effects read them
//     stacking: 'refresh',        // 'refresh' (default) | 'stack' | 'ignore'
//     onStart(kart, race) {},     // optional hooks
//     onTick(kart, dt, race) {},  // runs every step BEFORE physics; may change kart.controls
//     onEnd(kart, race) {},
//     onBump(kart, other, race) {},   // this kart bumped another one
//     onWall(kart, race, impact) {},  // this kart hit the fence
//   }
//
// Hooks are optional. `remaining` is filled in when the effect is added.

export const STAT_KEYS = ['maxSpeed', 'accel', 'turnRate', 'grip', 'mass'];

export class EffectList {
  constructor() {
    /** @type {any[]} */
    this.active = [];
  }

  add(effect, kart, race) {
    const stacking = effect.stacking ?? 'refresh';
    const existing = this.active.find((e) => e.id === effect.id);
    if (existing && stacking === 'ignore') return existing;
    if (existing && stacking === 'refresh') {
      existing.remaining = Math.max(existing.remaining, effect.duration);
      existing.duration = Math.max(existing.duration, effect.duration);
      return existing;
    }
    const e = { tags: [], modifiers: {}, ...effect, remaining: effect.duration, age: 0 };
    this.active.push(e);
    e.onStart?.(kart, race);
    race?.events.emit('effect:start', { kart, effect: e });
    return e;
  }

  remove(id, kart, race) {
    const gone = this.active.filter((e) => e.id === id);
    this.active = this.active.filter((e) => e.id !== id);
    for (const e of gone) {
      e.onEnd?.(kart, race);
      race?.events.emit('effect:end', { kart, effect: e });
    }
  }

  tick(kart, dt, race) {
    for (const e of [...this.active]) {
      e.age += dt;
      e.remaining -= dt;
      e.onTick?.(kart, dt, race);
    }
    if (this.active.some((e) => e.remaining <= 0)) {
      // Take the finished ones out first: an onEnd may add a new effect (a pop-out boost).
      const ended = this.active.filter((e) => e.remaining <= 0);
      this.active = this.active.filter((e) => e.remaining > 0);
      for (const e of ended) {
        e.onEnd?.(kart, race);
        race?.events.emit('effect:end', { kart, effect: e });
      }
    }
  }

  /** Call an optional hook (onBump, onWall, onHit...) on every active effect that has it. */
  notify(hook, ...args) {
    for (const e of [...this.active]) e[hook]?.(...args);
  }

  /** Product of every active effect's modifier for one stat. */
  multiplier(stat) {
    let m = 1;
    for (const e of this.active) {
      const v = e.modifiers[stat];
      if (typeof v === 'number') m *= v;
    }
    return m;
  }

  has(id) {
    return this.active.some((e) => e.id === id);
  }

  hasTag(tag) {
    return this.active.some((e) => e.tags.includes(tag));
  }

  clear(kart, race) {
    for (const e of this.active) e.onEnd?.(kart, race);
    this.active = [];
  }
}
