// Things items leave on the track. (Entity rules are at the top of ./entities.js.)
// Nothing here hurts anyone: every item helps whoever uses it, and these are the
// collateral that other karts can take advantage of.

import { speedBurst, loosen } from './powerups/kit.js';

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

/**
 * An oil slick left by GRIP's SLICK field. Anyone who drives through it (the kart that
 * laid it included, once it's driven off) loses most of their grip for a moment.
 */
export class OilSlick {
  constructor({ owner, x, y, life = 4, size = 1 }) {
    this.kind = 'oil';
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.radius = 6 * size;
    this.size = size;
    this.life = life;
    this.age = 0;
    this.alive = true;
    this.seed = (x * 13 + y * 7) % 10;
  }

  update(dt) {
    this.age += dt;
    if (this.age > this.life) this.alive = false;
  }

  onKartTouch(kart, race) {
    if (kart === this.owner && this.age < 1.5) return;
    const fresh = !kart.effects.has('oily');
    kart.addEffect({ id: 'oily', duration: 0.7, modifiers: { grip: 0.2, accel: 0.6 }, tags: ['oily'] }, race);
    loosen(kart, race, 0.7);
    if (fresh) {
      race.events.emit('oil:slip', { kart, slick: this });
      race.events.emit('sfx', { name: 'slip', kart });
    }
  }
}

/**
 * A launch ramp left by RAMP's RAMPS field. Anyone who drives over it (not the kart that
 * dropped it) is thrown into the air and forward. It helps them: that's the risk.
 */
export class LaunchRamp {
  constructor({ owner, x, y, angle, life = 5, power = 1 }) {
    this.kind = 'ramp';
    this.owner = owner;
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.radius = 7;
    this.life = life;
    this.power = power;
    this.age = 0;
    this.alive = true;
  }

  update(dt) {
    this.age += dt;
    if (this.age > this.life) this.alive = false;
  }

  onKartTouch(kart, race) {
    if (kart === this.owner && this.age < 2) return;
    if (kart.effects.has('ramped')) return;
    kart.kick(35 * this.power);
    kart.addEffect(
      {
        id: 'ramped',
        duration: 0.7,
        height: 10,
        modifiers: { maxSpeed: 1.3, turnRate: 0.3, grip: 0.5 },
        tags: ['air'],
        onEnd(k, r) {
          r.events.emit('land', { kart: k, big: true });
        },
      },
      race,
    );
    race.events.emit('ramp:launch', { kart, ramp: this });
    race.events.emit('sfx', { name: 'spring', kart });
  }
}
