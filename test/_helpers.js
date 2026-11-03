// Shared set-up for item tests: a race with no item boxes, idle rivals, and karts you
// can put anywhere on the course.

import { Race } from '../src/sim/race.js';
import { IdleController } from '../src/sim/controllers.js';
import { makeItem } from '../src/sim/hand.js';
import meadow from '../src/tracks/meadow.js';

export const DT = 1 / 60;

export function setup({ karts = 3, seed = 1 } = {}) {
  const input = { throttle: 0, brake: 0, steer: 0, useItem: false, fuse: false, cycle: false };
  const race = new Race({ track: meadow, seed, rivals: karts - 1, countdown: 0, humanInput: input });
  for (const k of race.karts) if (!k.isPlayer) k.controller = new IdleController();
  race.entities = [];
  const me = race.player;
  const others = race.karts.filter((k) => !k.isPlayer);
  return { race, input, me, others };
}

/** Put a kart `s` pixels into the race (laps included), facing along the track. */
export function place(race, kart, s, lateral = 0) {
  const p = race.track.pointAt(s, lateral);
  kart.x = p.x;
  kart.y = p.y;
  kart.heading = p.angle;
  kart.vx = kart.vy = 0;
  kart.trackIndex = -1;
  kart.s = race.track.project(p.x, p.y).s;
  kart.lateral = lateral;
  kart.progress = s;
  kart.lapsDone = Math.max(0, Math.floor(s / race.track.length));
  race.updatePositions();
}

/** Hand a kart an item made of these parts, ready to use. */
export function give(kart, ...parts) {
  const item = makeItem(parts);
  kart.items.push(item);
  return item;
}

/** Press a hand button for one step. */
export function press(race, input, button) {
  input[button] = true;
  race.step(DT);
  input[button] = false;
}

export function steps(race, seconds, until = () => false) {
  for (let i = 0; i < Math.ceil(seconds / DT); i++) {
    race.step(DT);
    if (until()) return true;
  }
  return false;
}

export const spinning = (kart) => kart.effects.has('spinout');
