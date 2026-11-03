// Entities that hurt: rockets and bananas. (Entity rules are at the top of ./entities.js.)

import { HAZARDS } from '../config.js';
import { approach, clamp } from '../core/math.js';
import { hitKart, stealItem } from './hits.js';
import { toast } from './toast.js';

/**
 * Flies along the track (it follows the road, never cuts across grass) faster than any
 * kart, and swerves into its target once it's close behind. Hits whoever it touches.
 */
export class Rocket {
  /**
   * @param {object} o
   * @param {import('./race.js').Race} o.race
   * @param {import('./kart.js').Kart} o.owner
   * @param {import('./kart.js').Kart | null} o.target
   * @param {boolean} [o.steal]   HEIST: also takes the victim's front item
   * @param {number} [o.lateral]  start offset across the road
   */
  constructor({ race, owner, target, steal = false, lateral = owner.lateral }) {
    this.kind = 'rocket';
    this.owner = owner;
    this.target = target;
    this.steal = steal;
    this.s = owner.s + 12;
    this.progress = owner.progress + 12;
    this.lateral = lateral;
    this.radius = 4;
    this.age = 0;
    this.alive = true;
    this.place(race.track);
  }

  place(track) {
    const p = track.pointAt(this.s, this.lateral);
    this.x = p.x;
    this.y = p.y;
    this.angle = p.angle;
  }

  update(dt, race) {
    this.age += dt;
    if (this.age > HAZARDS.rocketLife) {
      this.alive = false;
      race.events.emit('rocket:fizzle', { rocket: this });
      return;
    }
    const step = HAZARDS.rocketSpeed * dt;
    this.s += step;
    this.progress += step;
    const t = this.target;
    if (t) {
      const gap = t.progress - this.progress;
      if (t.finished || gap < -30) this.target = null;
      else if (gap < HAZARDS.rocketLockOn) this.lateral = approach(this.lateral, t.lateral, HAZARDS.rocketHoming * dt);
    }
    const edge = race.track.halfWidth + race.track.curbWidth;
    this.lateral = clamp(this.lateral, -edge, edge);
    this.place(race.track);
  }

  onKartTouch(kart, race) {
    if (kart === this.owner && this.age < 1) return;
    this.alive = false;
    const result = hitKart(kart, race, { by: this.owner, kind: 'rocket' });
    race.events.emit('rocket:hit', { rocket: this, kart, result });
    if (this.steal && result !== 'blocked') stealItem(this.owner, kart, race);
  }
}

/** Sits on the track until someone drives over it. Giants squash it. */
export class Banana {
  constructor({ owner, x, y }) {
    this.kind = 'banana';
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.age = 0;
    this.alive = true;
  }

  update(dt) {
    this.age += dt;
    if (this.age > HAZARDS.bananaLife) this.alive = false;
  }

  onKartTouch(kart, race) {
    // The one who dropped it gets a moment to drive away.
    if (kart === this.owner && this.age < 1) return;
    this.alive = false;
    const result = hitKart(kart, race, { by: kart === this.owner ? null : this.owner, kind: 'banana' });
    if (result === 'shrugged') {
      race.events.emit('banana:squash', { banana: this, kart });
      toast(race, kart, 'SQUASH!', 'good');
    }
  }
}

/** Drop a banana on the track at loop distance s and sideways offset lateral. */
export function dropBanana(race, owner, s, lateral) {
  const p = race.track.pointAt(s, lateral);
  const banana = race.spawn(new Banana({ owner, x: p.x, y: p.y }));
  race.events.emit('banana:drop', { banana, kart: owner });
  return banana;
}
