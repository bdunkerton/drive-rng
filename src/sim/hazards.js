// Things items leave on the track. (Entity rules are at the top of ./entities.js.)
// Nothing here hurts anyone: every item helps whoever uses it, and these are the
// collateral that other karts can take advantage of.

import { speedBurst } from './powerups/kit.js';

/**
 * A strip of speed left behind by a SLIPSTREAM. Anyone who drives over it gets a short
 * burst of speed, except the kart that laid it. Phased karts can use it; karts in the
 * air fly over it.
 */
export class SpeedPad {
  constructor({ owner, x, y, angle, life = 2.2, power = 1 }) {
    this.kind = 'speed-pad';
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.radius = 7;
    this.life = life;
    this.power = power;
    this.age = 0;
    this.alive = true;
    this.hitsPhase = true;
  }

  update(dt) {
    this.age += dt;
    if (this.age > this.life) this.alive = false;
  }

  onKartTouch(kart, race) {
    if (kart === this.owner) return;
    const fresh = !kart.effects.has('burst');
    speedBurst(kart, race, 0.45 + 0.1 * this.power, 1.3 + 0.05 * this.power, fresh ? 12 : 0);
    if (fresh) race.events.emit('pad:ride', { kart, pad: this });
  }
}

/** Where a BLACK HOLE opened. Only drawn; the pull is done by the motion itself. */
export class HoleMark {
  constructor({ owner, x, y, life, size = 1 }) {
    this.kind = 'hole';
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.life = life;
    this.size = size;
    this.age = 0;
    this.alive = true;
    this.radius = 0;
  }

  update(dt) {
    this.age += dt;
    if (this.age > this.life) this.alive = false;
  }
}
