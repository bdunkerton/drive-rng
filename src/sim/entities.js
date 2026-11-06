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

export class ItemBox {
  constructor(x, y) {
    this.kind = 'item-box';
    this.x = x;
    this.y = y;
    this.radius = ITEMS.boxRadius;
    this.alive = true;
    this.active = true;
    this.respawnIn = 0;
    this.phase = (x * 7 + y * 13) % 6.28;
    this.hitsAir = true;
    this.hitsPhase = true;
  }

  update(dt) {
    this.phase += dt * 3;
    if (!this.active) {
      this.respawnIn -= dt;
      if (this.respawnIn <= 0) this.active = true;
    }
  }

  onKartTouch(kart, race) {
    if (!this.active) return;
    this.active = false;
    this.respawnIn = ITEMS.boxRespawnSeconds;
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
