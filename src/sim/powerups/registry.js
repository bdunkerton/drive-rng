// The powerup registry. Each powerup is one file in this folder that calls
// `powerups.register({...})`, plus one import line in ./index.js.
//
// A powerup definition:
//
//   {
//     id: 'speed-boost',              // unique, kebab-case
//     name: 'BOOST',                  // shown in the HUD (pixel font: A-Z, 0-9, a little punctuation)
//     description: 'One line.',       // for menus and docs
//     icon: 'boost',                  // key into src/render/icons.js
//     weight: 1,                      // how often it rolls; a number, or (ctx) => number
//     use(ctx) {},                    // what happens when the holder presses the item button
//   }
//
// `use` and a function `weight` receive a context:
//   ctx.race     the Race
//   ctx.kart     the kart using (or rolling for) the item
//   ctx.rng      the race's seeded Rng — use this, never Math.random, so seeds replay
//   ctx.events   the race's event bus
//   ctx.spawn(e) add an entity to the race (see src/sim/entities.js)

export class PowerupRegistry {
  constructor() {
    /** @type {Map<string, any>} */
    this.byId = new Map();
  }

  register(def) {
    if (!def || typeof def.id !== 'string' || !def.id) throw new Error('powerup needs an id');
    if (this.byId.has(def.id)) throw new Error(`powerup "${def.id}" is already registered`);
    if (typeof def.use !== 'function') throw new Error(`powerup "${def.id}" needs a use(ctx) function`);
    const full = {
      name: def.id.toUpperCase(),
      description: '',
      icon: def.id,
      weight: 1,
      ...def,
    };
    this.byId.set(def.id, full);
    return full;
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
