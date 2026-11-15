// The playtest lab's scenarios: small, replayable units, each trying out one mechanic
// (or one combination) on the Test Oval with a big pack. Add new ones to the END of the
// list and bump `batch`, so feedback can say which round of ideas it was about.
// `rules` switches mechanics on for the race (see DEFAULT_RULES in src/sim/race.js).

export const LAB_VERSION = 'lab-1';

/**
 * @typedef {{ id: string, batch: number, name: string, pitch: string, how: string[],
 *   rules: object, laps?: number, rivals?: number, question: string }} Scenario
 */

/** @type {Scenario[]} */
export const SCENARIOS = [
  {
    id: 'pack',
    batch: 1,
    name: 'PACK RACE',
    pitch: 'THE CONTROL. ELEVEN KARTS, DRAFTING AND RAMMING, NOTHING ELSE. EVERYTHING ELSE GETS COMPARED TO THIS.',
    how: ['SIT BEHIND A KART TO DRAFT', 'HIT A REAR CORNER TO SPIN IT'],
    rules: { draft: true, ram: true },
    question: 'IS RACING IN A BIG PACK FUN ON ITS OWN?',
  },
  {
    id: 'potato',
    batch: 1,
    name: 'HOT POTATO',
    pitch: 'ONE POTATO, ALWAYS IN PLAY. WHOEVER HAS IT IS FASTER BUT HAS 8 SECONDS. TOUCH ANYONE TO PASS IT.',
    how: ['IT STARTS WITH YOU', 'NO TAG-BACKS FOR 2 SECONDS'],
    rules: { draft: true, ram: true, potato: true },
    question: 'DOES PASSING IT FEEL LIKE A HUNT, OR A RANDOM BUMP?',
  },
  {
    id: 'leapfrog',
    batch: 1,
    name: 'LEAPFROG',
    pitch: 'A SPINNING KART IS A RAMP. RAM ONE, THEN DRIVE INTO IT TO VAULT OVER IT, AND OVER ANYONE IN YOUR WAY.',
    how: ['RAM A REAR CORNER, KEEP GOING', 'IN THE AIR NOBODY CAN TOUCH YOU'],
    rules: { draft: true, ram: true, leapfrog: true },
    question: 'DOES RAM-THEN-HOP FEEL LIKE A MOVE YOU PULLED OFF?',
  },
  {
    id: 'billiards',
    batch: 1,
    name: 'BILLIARDS',
    pitch: 'RAMS HAND YOUR SPEED TO THE KART YOU HIT. YOU STOP; IT SHOOTS OFF AND SPINS WHOEVER IT HITS. LINE UP POOL SHOTS.',
    how: ['HIT ANGLE SETS WHERE IT GOES', 'MISS THE PACK AND YOU JUST HELPED IT'],
    rules: { draft: true, ram: true, billiards: true },
    question: 'IS AIMING A KART INTO THE PACK WORTH STOPPING FOR?',
  },
  {
    id: 'focus',
    batch: 1,
    name: 'BULLET TIME',
    pitch: 'SCRAPE PAST KARTS (AND RIDE THE CURB) TO FILL FOCUS. HOLD SHIFT TO SLOW THE WORLD AND THREAD THE PACK.',
    how: ['NEAR MISSES FILL THE BAR', 'HOLD SHIFT (OR SPACE) TO FOCUS'],
    rules: { draft: true, ram: true, focus: true },
    question: 'DOES SLOW-MO MAKE YOU FEEL COOL, OR JUST SLOW?',
  },
];

export const LAB_DEFAULTS = { laps: 3, rivals: 10 };

export function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
