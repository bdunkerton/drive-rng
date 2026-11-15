// Controllers write a kart's `controls` each step.
// The human controller copies from a plain input object that the browser keeps
// up to date (see src/scenes/raceScene.js); the simulation never touches the DOM.

import { STEER } from '../config.js';
import { clamp, approach } from '../core/math.js';

export class HumanController {
  /** @param {{ throttle: number, brake: number, steer: number, useItem: boolean, fuse?: boolean, cycle?: boolean }} input */
  constructor(input) {
    this.input = input;
    this.steer = 0;
  }

  update(kart, race, dt = 1 / 60) {
    const c = kart.controls;
    c.throttle = this.input.throttle;
    c.brake = this.input.brake;
    // Keys are all-or-nothing; ease the steering in and out so a tap is a small correction
    // and holding a key winds on lock. Letting go (or swapping sides) unwinds faster.
    const want = clamp(this.input.steer, -1, 1);
    const winding = want !== 0 && (this.steer === 0 || Math.sign(want) === Math.sign(this.steer));
    this.steer = approach(this.steer, want, (winding ? STEER.attack : STEER.release) * dt);
    c.steer = this.steer;
    c.useItem = this.input.useItem;
    c.fuse = !!this.input.fuse;
    c.cycle = !!this.input.cycle;
  }
}

/** Does nothing; the kart coasts. Handy in tests. */
export class IdleController {
  update(kart) {
    const c = kart.controls;
    c.throttle = 0;
    c.brake = 0;
    c.steer = 0;
    c.useItem = false;
    c.fuse = false;
    c.cycle = false;
  }
}
