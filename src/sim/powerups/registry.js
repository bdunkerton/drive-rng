// The powerup registry. Each powerup is one file in this folder that calls
// `powerups.register({...})`, plus one import line in ./index.js.
//
// A powerup definition:
//
//   {
//     id: 'speed-boost',              // unique, kebab-case
//     name: 'BOOST',                  // shown in the HUD (pixel font: A-Z, 0-9, a little punctuation)
//     short: 'BOOST',                 // 6 chars max, used in SUPER BOOST and in combo names
//     abbr: 'BST',                    // 3 chars, used when a combo name would be too long
//     description: 'One line.',       // for menus and docs
//     icon: 'boost',                  // key into src/render/icons.js
//     weight: 1,                      // how often it rolls; a number, or (ctx) => number
//     order: 50,                      // when a fused item runs its parts, lower goes first
//     aiWants(ctx) {},                // optional: should a rival use it right now? (default yes)
//     use(ctx) {},                    // what happens when the holder uses it
//   }
//
// `use`, `aiWants` and a function `weight` receive a context:
//   ctx.race     the Race
//   ctx.kart     the kart using (or rolling for) the item
//   ctx.power    1 normally; 2 for SUPER (two fused together), 3 for ULTRA, 4 for MAX
//   ctx.item     the held item being used ({ parts: [...ids] })
//   ctx.rng      the race's seeded Rng — use this, never Math.random, so seeds replay
//   ctx.events   the race's event bus
//   ctx.spawn(e) add an entity to the race (see src/sim/entities.js)
//   ctx.position / ctx.racers   where the kart is running, and out of how many
//
// A recipe is a named combo: when a fused item contains all of a recipe's parts, the
// recipe's `use` runs instead of those parts' own uses (any other parts still run
// normally). See ./recipes.js.

export class PowerupRegistry {
  constructor() {
    /** @type {Map<string, any>} */
    this.byId = new Map();
    /** @type {any[]} */
    this.recipes = [];
  }

  register(def) {
    if (!def || typeof def.id !== 'string' || !def.id) throw new Error('powerup needs an id');
    if (this.byId.has(def.id)) throw new Error(`powerup "${def.id}" is already registered`);
    if (typeof def.use !== 'function') throw new Error(`powerup "${def.id}" needs a use(ctx) function`);
    const name = def.name ?? def.id.toUpperCase();
    const full = {
      name,
      short: name.slice(0, 6),
      abbr: name.replace(/[^A-Z0-9]/g, '').slice(0, 3),
      description: '',
      icon: def.id,
      weight: 1,
      order: 50,
      ...def,
    };
    this.byId.set(def.id, full);
    return full;
  }

  /**
   * A named combo.
   * { id, name, abbr, parts: [ids], description, icon?, use(ctx) }
   * The recipe's ctx is like a powerup's, plus ctx.parts ({ id, power } for each recipe
   * part) and ctx.runParts(), which runs the parts' normal uses if the recipe wants them.
   */
  registerRecipe(recipe) {
    if (!recipe?.id || !Array.isArray(recipe.parts) || recipe.parts.length < 2) throw new Error('recipe needs an id and two or more parts');
    if (this.recipes.some((r) => r.id === recipe.id)) throw new Error(`recipe "${recipe.id}" is already registered`);
    const full = { abbr: recipe.name.slice(0, 3), description: '', ...recipe, parts: [...new Set(recipe.parts)].sort() };
    this.recipes.push(full);
    // Bigger recipes are checked first, so a three-part recipe beats a two-part one inside it.
    this.recipes.sort((a, b) => b.parts.length - a.parts.length);
    return full;
  }

  /** The best recipe whose parts are all in `ids`, or null. */
  findRecipe(ids) {
    const have = new Set(ids);
    return this.recipes.find((r) => r.parts.every((p) => have.has(p))) ?? null;
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
