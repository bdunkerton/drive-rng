// Things on the track that aren't karts: item boxes here; speed pads and black-hole
// marks in ./hazards.js; whatever else tomorrow.
//
// An entity is any object with:
//   kind            string, used by the renderer to pick a drawing (src/render/entityArt.js)
//   x, y            world position
//   alive           set to false and the race removes it after the step
//   update(dt, race)
// and optionally:
//   onKartTouch(kart, race)   called once per step per kart whose circle overlaps `radius`
//   radius                    touch radius (default 0 = never touched)
//   hitsAir, hitsPhase        set true to touch karts that are in the air / phased out
//                             (by default those karts pass over or through it)
//
// The race calls update on every entity each step, then checks touches.

import { ITEMS } from '../config.js';
import { powerups } from './powerups/index.js';
import { makeItem, giveItem } from './hand.js';

export const ROULETTE_SECONDS = ITEMS.rouletteSeconds;

/**
 * A box of items. Each kart takes its own copy: once you've smashed a box it's gone for
 * you until it respawns, but it's still there for everyone else. So a kart at the back
 * of the pack gets as many items as the leader.
 */
export class ItemBox {
  constructor(x, y) {
    this.kind = 'item-box';
    this.x = x;
    this.y = y;
    this.radius = ITEMS.boxRadius;
    this.alive = true;
    this.phase = (x * 7 + y * 13) % 6.28;
    this.hitsAir = true;
    this.hitsPhase = true;
    /** @type {Map<number, number>} kart id -> race time the box comes back for that kart */
    this.backAt = new Map();
  }

  /** Can this kart take the box right now? */
  availableTo(kart, time) {
    if (!kart) return true;
    const t = this.backAt.get(kart.id);
    return t === undefined || time >= t;
  }

  /** Seconds until the box is back for this kart (0 if it's there). */
  respawnIn(kart, time) {
    const t = kart ? this.backAt.get(kart.id) : undefined;
    return t === undefined ? 0 : Math.max(0, t - time);
  }

  update(dt) {
    this.phase += dt * 3;
  }

  onKartTouch(kart, race) {
    // race.itemsOff: the combo lab turns pickups off while it measures one item.
    if (race.itemsOff || !this.availableTo(kart, race.time)) return;
    this.backAt.set(kart.id, race.time + ITEMS.boxRespawnSeconds);
    race.events.emit('item:box', { kart, box: this });
    // A full hand (or a finished kart) just smashes the box.
    if (!kart.hasFreeSlot || kart.finished) return;
    // A first-race kart gets its scripted items first (see ITEMS.firstPickups).
    const id = kart.scriptedPickups?.length ? kart.scriptedPickups.shift() : powerups.roll(race.rng, race.context(kart));
    if (!id) return;
    giveItem(kart, makeItem([id], ROULETTE_SECONDS));
    race.events.emit('item:pickup', { kart, item: id });
  }
}

/** Lay out the track's rows of item boxes. */
export function placeItemBoxes(track) {
  const boxes = [];
  for (const row of track.def.itemRows ?? []) {
    const s = row.at * track.length;
    const n = row.boxes;
    const span = track.halfWidth * 2 - 14;
    for (let i = 0; i < n; i++) {
      const lateral = n === 1 ? 0 : -span / 2 + (span * i) / (n - 1);
      const p = track.pointAt(s, lateral);
      boxes.push(new ItemBox(p.x, p.y));
    }
  }
  return boxes;
}
