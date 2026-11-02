// Things on the track that aren't karts: item boxes today; shells, oil slicks,
// banana peels and whatever else tomorrow.
//
// An entity is any object with:
//   kind            string, used by the renderer to pick a drawing (src/render/entityArt.js)
//   x, y            world position
//   alive           set to false and the race removes it after the step
//   update(dt, race)
// and optionally:
//   onKartTouch(kart, race)   called once per step per kart whose circle overlaps `radius`
//   radius                    touch radius (default 0 = never touched)
//
// The race calls update on every entity each step, then checks touches.

import { ITEMS } from '../config.js';
import { powerups } from './powerups/index.js';

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
    // A kart already holding something just smashes the box.
    if (kart.item !== null) return;
    const id = powerups.roll(race.rng, race.context(kart));
    if (!id) return;
    kart.item = id;
    kart.itemRoulette = ROULETTE_SECONDS;
    kart.itemHeld = 0;
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
