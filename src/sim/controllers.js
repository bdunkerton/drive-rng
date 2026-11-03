// Controllers write a kart's `controls` each step.
// The human controller copies from a plain input object that the browser keeps
// up to date (see src/scenes/raceScene.js); the simulation never touches the DOM.

export class HumanController {
  /** @param {{ throttle: number, brake: number, steer: number, useItem: boolean, fuse?: boolean, cycle?: boolean }} input */
  constructor(input) {
    this.input = input;
  }

  update(kart) {
    const c = kart.controls;
    c.throttle = this.input.throttle;
    c.brake = this.input.brake;
    c.steer = this.input.steer;
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
