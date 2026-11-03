// The items a kart is holding: its "hand".
//
// Every kart has `kart.items` (front first) and `kart.slots` (how many it can hold,
// 2 to start, Take Two grows it). Each held item is
//
//   { parts: ['speed-boost'], roulette: 0.9 }
//
// `parts` is a list of powerup ids. Fusing two items joins their parts, so
// BOOST + BOOST becomes { parts: ['speed-boost', 'speed-boost'] } (SUPER BOOST) and
// BOOST + SHIELD becomes { parts: ['speed-boost', 'shield'] } (the RAM recipe).
// `roulette` counts down after a pickup; the item can't be used or fused until it's 0.
//
// Using an item groups its parts by id. Each id runs its powerup's use(ctx) once with
// ctx.power = how many copies were fused in. If the parts contain a recipe, the recipe
// runs instead of those parts.

import { ITEMS } from '../config.js';
import { powerups } from './powerups/registry.js';
import { toast } from './toast.js';

const LEVELS = ['', '', 'SUPER', 'ULTRA', 'MAX'];
const NAME_LIMIT = 12;

export function makeItem(parts, roulette = 0) {
  return { parts: Array.isArray(parts) ? [...parts] : [parts], roulette };
}

export const copyItem = (item, roulette = item.roulette) => makeItem(item.parts, roulette);

export const isReady = (item) => !!item && item.roulette <= 0;

/** Can a and b be fused into one item? */
export function canFuse(a, b) {
  return isReady(a) && isReady(b) && a.parts.length + b.parts.length <= ITEMS.maxParts;
}

/** Parts grouped by id, in the order they run: [{ id, power, def }]. */
export function groupParts(parts) {
  const counts = new Map();
  for (const id of parts) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts]
    .map(([id, power]) => ({ id, power, def: powerups.get(id) }))
    .sort((a, b) => (a.def?.order ?? 50) - (b.def?.order ?? 50) || (a.id < b.id ? -1 : 1));
}

/** How an item breaks down: its recipe (if any), the parts in it, and the rest. */
export function describeItem(item) {
  const groups = groupParts(item.parts);
  const recipe = groups.length > 1 ? powerups.findRecipe(groups.map((g) => g.id)) : null;
  const inRecipe = recipe ? groups.filter((g) => recipe.parts.includes(g.id)) : [];
  const rest = recipe ? groups.filter((g) => !recipe.parts.includes(g.id)) : groups;
  const recipePower = inRecipe.length ? Math.max(...inRecipe.map((g) => g.power)) : 0;
  return { groups, recipe, inRecipe, rest, recipePower };
}

/** The name the HUD shows: BOOST, SUPER BOOST, RAM, ROCKET+GROW, BSTX2+SHD, 4-WAY COMBO... */
export function itemName(item) {
  const { recipe, rest, recipePower } = describeItem(item);
  const tokens = [];
  if (recipe) tokens.push({ name: recipe.name, short: recipe.name, abbr: recipe.abbr, power: recipePower });
  for (const g of rest) {
    const def = g.def ?? { name: g.id.toUpperCase(), short: g.id.slice(0, 6).toUpperCase(), abbr: g.id.slice(0, 3).toUpperCase() };
    tokens.push({ name: def.name, short: def.short, abbr: def.abbr, power: g.power });
  }
  if (tokens.length === 1) {
    const t = tokens[0];
    if (t.power === 1) return t.name;
    const levelled = `${LEVELS[t.power] ?? 'MAX'} ${t.short}`;
    return levelled.length <= NAME_LIMIT ? levelled : `${t.short} X${t.power}`;
  }
  const suffix = (t) => (t.power > 1 ? `X${t.power}` : '');
  for (const form of [(t) => t.short + suffix(t), (t) => t.abbr + suffix(t)]) {
    const joined = tokens.map(form).join('+');
    if (joined.length <= NAME_LIMIT) return joined;
  }
  return `${item.parts.length}-WAY COMBO`;
}

/**
 * Put an item in a kart's hand.
 * overflow 'drop'  — no room, it's lost.
 * overflow 'fuse'  — no room, it fuses onto the last item instead (if that stays small enough).
 * @returns {'added' | 'fused' | 'dropped'}
 */
export function giveItem(kart, item, { overflow = 'drop' } = {}) {
  if (kart.items.length < kart.slots) {
    kart.items.push(item);
    return 'added';
  }
  if (overflow === 'fuse') {
    const last = kart.items[kart.items.length - 1];
    if (last && last.parts.length + item.parts.length <= ITEMS.maxParts) {
      last.parts.push(...item.parts);
      last.roulette = Math.max(last.roulette, item.roulette);
      return 'fused';
    }
  }
  return 'dropped';
}

/** Use the front item if it's ready. */
export function useFrontItem(kart, race) {
  const front = kart.items[0];
  if (!isReady(front)) return false;
  kart.items.shift();
  activateItem(front, kart, race);
  return true;
}

/** Fuse the front two items into one. */
export function fuseFront(kart, race) {
  const [a, b] = kart.items;
  if (!a || !b) return false;
  if (!canFuse(a, b)) {
    if (isReady(a) && isReady(b)) toast(race, kart, 'TOO BIG TO FUSE', 'bad');
    return false;
  }
  const fused = makeItem([...a.parts, ...b.parts]);
  kart.items.splice(0, 2, fused);
  const name = itemName(fused);
  race.events.emit('item:fuse', { kart, item: fused, name });
  race.events.emit('sfx', { name: 'fuse', kart });
  toast(race, kart, `FUSED: ${name}`, 'gold');
  return true;
}

/** Move the front item to the back. */
export function cycleHand(kart, race) {
  if (kart.items.length < 2) return false;
  kart.items.push(kart.items.shift());
  race.events.emit('item:cycle', { kart });
  race.events.emit('sfx', { name: 'menu', kart });
  return true;
}

/** Run an item's effects for a kart (it should already be out of the hand). */
export function activateItem(item, kart, race) {
  const { recipe, inRecipe, rest, recipePower } = describeItem(item);
  const runGroup = (g) => g.def?.use(race.context(kart, { power: g.power, item }));
  const steps = [];
  if (recipe) {
    steps.push({
      order: Math.min(...inRecipe.map((g) => g.def?.order ?? 50)),
      run: () => recipe.use(race.context(kart, { power: recipePower, item, parts: inRecipe, runParts: () => inRecipe.forEach(runGroup) })),
    });
  }
  for (const g of rest) steps.push({ order: g.def?.order ?? 50, run: () => runGroup(g) });
  steps.sort((a, b) => a.order - b.order).forEach((s) => s.run());
  race.events.emit('item:use', { kart, item, name: itemName(item), parts: [...item.parts], recipe: recipe?.id ?? null });
}

/** Would a rival want to use this item right now? True if any part says so. */
export function aiWantsItem(item, kart, race) {
  const { recipe, rest, recipePower } = describeItem(item);
  const ask = (def, power) => (def?.aiWants ? def.aiWants(race.context(kart, { power, item })) : true);
  if (recipe && ask(recipe, recipePower)) return true;
  return rest.some((g) => ask(g.def, g.power));
}
