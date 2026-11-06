// The powerup registry. Each powerup is one file in this folder that calls
// `powerups.register({...})`, plus one import line in ./index.js.
//
// Every powerup is two halves:
//
//   motion   how it moves YOU (a dash, a jump, a hook, a rocket ride...)
//   field    what it does to the space around you while that happens (a speed lane,
//            a pull, a blast when it ends...)
//
// Used alone, an item does its own motion and its own field. Fusing two items gives
// the MOTION of the first and the FIELD of the second (see ./fusion.js), so every pair
// works with no table to write. The rule every item follows: it always helps whoever
// uses it. Anything it does to other karts is collateral, and that's the risk.
//
// A powerup definition:
//
//   {
//     id: 'boost',                    // unique, kebab-case
//     name: 'BOOST',                  // HUD text (pixel font: A-Z, 0-9, a little punctuation), 12 max
//     short: 'BOOST',                 // 6 max: used in fused names like BOOST+HOOK
//     abbr: 'BST',                    // 3 max: used when a fused name would be too long
//     description: 'One line.',
//     icon: 'boost',                  // key into src/render/icons.js
//     weight: 1,                      // how often it rolls; a number, or (ctx) => number
//     opposite: 'other-id',           // optional: fusing with this one fizzles (set on both sides)
//     aiWants(ctx) {},                // optional: is now a good moment for a rival to use it? (default yes)
//     motion: {
//       name: 'DASH',
//       duration(power) {},           // seconds
//       tags: ['boost'],              // effect tags while it lasts (rendering and rules read them)
//       modifiers(power) {},          // optional: stat multipliers while it lasts (see effects.js)
//       height: 0,                    // optional: how high it lifts the kart (drawn only)
//       start(m) {}, tick(m, dt) {}, end(m) {},   // all optional
//     },
//     field: {
//       name: 'SLIPSTREAM',
//       start(m) {}, tick(m, dt) {}, release(m) {},  // all optional; release runs when the motion ends
//     },
//   }
//
// Motion and field hooks receive a "move" object m (see ./kit.js runMove):
//   m.kart, m.race, m.rng, m.power (motion strength), m.fieldPower (field strength),
//   m.wild, m.data (scratch space shared by the motion and field), m.effect (the live
//   effect on the kart), m.stop() (end the motion early).
//
// `aiWants` and a function `weight` receive the race context (see Race.context).

export class PowerupRegistry {
  constructor() {
    /** @type {Map<string, any>} */
    this.byId = new Map();
    /** @type {Map<string, any>} named fusions, keyed "motionId+fieldId" */
    this.showcases = new Map();
  }

  register(def) {
    if (!def || typeof def.id !== 'string' || !def.id) throw new Error('powerup needs an id');
    if (this.byId.has(def.id)) throw new Error(`powerup "${def.id}" is already registered`);
    if (!def.motion || !def.field) throw new Error(`powerup "${def.id}" needs a motion and a field`);
    if (typeof def.motion.duration !== 'function') throw new Error(`powerup "${def.id}" motion needs duration(power)`);
    const name = def.name ?? def.id.toUpperCase();
    const full = {
      name,
      short: name.slice(0, 6),
      abbr: name.replace(/[^A-Z0-9]/g, '').slice(0, 3),
      description: '',
      icon: def.id,
      weight: 1,
      opposite: null,
      ...def,
      motion: { id: def.id, tags: [], ...def.motion },
      field: { id: def.id, ...def.field },
    };
    this.byId.set(def.id, full);
    return full;
  }

  /**
   * A named fusion: the motion of one item with the field of another. It only changes
   * the name, description and (in the renderer) how it looks; the rule does the work.
   * { motion: id, field: id, name, description }
   */
  registerShowcase(showcase) {
    const key = `${showcase.motion}+${showcase.field}`;
    if (this.showcases.has(key)) throw new Error(`showcase "${key}" is already registered`);
    this.showcases.set(key, { ...showcase, key });
    return showcase;
  }

  showcase(motionId, fieldId) {
    return this.showcases.get(`${motionId}+${fieldId}`) ?? null;
  }

  /** Do these two cancel out when fused? */
  areOpposites(a, b) {
    const da = this.get(a);
    const db = this.get(b);
    return !!da && !!db && (da.opposite === b || db.opposite === a);
  }

  get(id) {
    return this.byId.get(id) ?? null;
  }

  list() {
    return [...this.byId.values()];
  }

  /** Weighted random powerup id for this context, or null if nothing can roll. */
  roll(rng, ctx) {
    const entries = this.list().map((def) => ({
      item: def.id,
      weight: typeof def.weight === 'function' ? def.weight(ctx) : def.weight,
    }));
    return rng.weighted(entries);
  }
}

/** The registry the game uses. */
export const powerups = new PowerupRegistry();
