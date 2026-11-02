// Run a whole race with no screen: every kart is AI. Used by `npm run sim` and tests.

import { Race } from './race.js';
import { SIM } from '../config.js';
import meadow from '../tracks/meadow.js';

/**
 * @param {object} [opts]
 * @param {object} [opts.track]
 * @param {number|string} [opts.seed]
 * @param {number} [opts.laps]
 * @param {number} [opts.karts]     total karts (all AI)
 * @param {number} [opts.maxSeconds] give up after this much race time
 * @param {(race: Race) => void} [opts.onSetup] hook to attach listeners before the start
 */
export function simulateRace(opts = {}) {
  const race = new Race({
    track: opts.track ?? meadow,
    seed: opts.seed ?? 1,
    laps: opts.laps,
    rivals: (opts.karts ?? 4) - 1,
    humanInput: null,
    countdown: 0,
  });
  opts.onSetup?.(race);
  const dt = 1 / SIM.hz;
  const maxSteps = Math.ceil((opts.maxSeconds ?? 600) * SIM.hz);
  while (race.phase !== 'done' && race.steps < maxSteps) race.step(dt);
  return { race, results: race.results(), timedOut: race.phase !== 'done' };
}
