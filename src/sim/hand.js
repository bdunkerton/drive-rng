// The items a kart is holding: its "hand". Two slots, front first.
//
// Each held item is
//
//   { parts: ['boost'], roulette: 0.9, wild: false }
//
// A picked-up item has one part. Fusing the front two joins them, in order:
// BOOST then HOOK becomes { parts: ['boost', 'hook'] }, which runs BOOST's motion with
// HOOK's field (see powerups/fusion.js). A fused item can't be fused again.
// `roulette` counts down after a pickup; the item can't be used or fused until it's 0.

import { FUSION } from '../config.js';
import { resolveItem } from './powerups/fusion.js';
import { runMove } from './powerups/kit.js';
import { toast } from './toast.js';

export function makeItem(parts, roulette = 0) {
  return { parts: Array.isArray(parts) ? [...parts] : [parts], roulette, wild: false };
}

export const isReady = (item) => !!item && item.roulette <= 0;

/** Can a and b be fused into one item? Both ready, and neither fused already. */
export function canFuse(a, b) {
  return isReady(a) && isReady(b) && a.parts.length === 1 && b.parts.length === 1;
}

/** The name the HUD shows: BOOST, MEGA HOOK, WHITE HOLE, SPRING+BULK, FIZZLE... */
export function itemName(item) {
  return resolveItem(item).name;
}

/**
 * Put an item in a kart's hand. With no room it's lost.
 * @returns {'added' | 'dropped'}
 */
export function giveItem(kart, item) {
  if (kart.items.length < kart.slots) {
    kart.items.push(item);
    return 'added';
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
  if (!a || !b || !isReady(a) || !isReady(b)) return false;
  if (!canFuse(a, b)) {
    toast(race, kart, 'ALREADY FUSED', 'bad');
    return false;
  }
  const fused = makeItem([a.parts[0], b.parts[0]]);
  const { kind } = resolveItem(fused);
  if (kind !== 'fizzle' && race.rng.chance(FUSION.wildChance)) fused.wild = true;
  kart.items.splice(0, 2, fused);
  kart.tutorialFuse = false;
  const r = resolveItem(fused);
  race.events.emit('item:fuse', { kart, item: fused, name: r.name, kind, wild: fused.wild, parts: [...fused.parts], showcase: r.showcase?.key ?? null });
  if (kind === 'fizzle') {
    race.events.emit('fizzle', { kart, item: fused });
    race.events.emit('sfx', { name: 'fizzle', kart });
    toast(race, kart, 'FIZZLE... THEY CANCEL OUT', 'bad');
    return true;
  }
  if (kind === 'mega') race.events.emit('mega', { kart, item: fused });
  if (fused.wild) {
    race.events.emit('wild', { kart, item: fused });
    race.events.emit('sfx', { name: 'wild', kart });
    toast(race, kart, `WILD ${r.name}!`, 'gold');
  } else {
    race.events.emit('sfx', { name: 'fuse', kart });
    toast(race, kart, `FUSED: ${r.name}`, 'gold');
  }
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

/** Run an item for a kart (it should already be out of the hand). */
export function activateItem(item, kart, race) {
  const r = resolveItem(item);
  if (!r.motionDef) return;
  runMove(race.context(kart, { power: r.power, item }), {
    motion: r.motionDef.motion,
    field: r.fieldDef.field,
    power: r.power,
    fieldPower: r.fieldPower,
    info: { kind: r.kind, wild: r.wild, name: r.name, parts: [...item.parts] },
  });
  if (r.kind === 'fizzle') toast(race, kart, 'PFFT.', 'bad');
  race.events.emit('item:use', {
    kart,
    item,
    name: r.name,
    parts: [...item.parts],
    kind: r.kind,
    wild: r.wild,
    showcase: r.showcase?.key ?? null,
    motion: r.motionDef.id,
    field: r.fieldDef.id,
  });
}

/** Would a rival want to use this item right now? Asks the powerup whose motion it runs. */
export function aiWantsItem(item, kart, race) {
  const { motionDef } = resolveItem(item);
  return motionDef?.aiWants ? motionDef.aiWants(race.context(kart, { item })) : true;
}

