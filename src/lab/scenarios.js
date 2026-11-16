// The playtest lab's scenarios: small, replayable units, each trying out one mechanic
// (or one combination) on the Test Oval with a big pack. Add new ones to the END of the
// list and bump `batch`, so feedback can say which round of ideas it was about.
// `rules` switches mechanics on for the race (see DEFAULT_RULES in src/sim/race.js).

export const LAB_VERSION = 'lab-2';
/** The lab menu shows this batch (?lab=all shows every scenario, archived ones too). */
export const CURRENT_BATCH = 2;

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
  // --- Batch 2 (after playtest #7): break up the frozen pack, give every mode stakes. ---
  {
    id: 'pack2',
    batch: 2,
    name: 'PACK RACE 2',
    pitch: 'SITTING IN A DRAFT NOW ONLY KEEPS YOU ON THE KART AHEAD WHILE CHARGE BUILDS. PULL OUT TO FIRE IT: A SLINGSHOT PAST. RIVALS DO IT TOO.',
    how: ['TUCK IN, WATCH THE BAR FILL', 'STEER OUT TO SLINGSHOT'],
    rules: { draft: true, ram: true, slingshot: true },
    question: 'DOES THE PACK MOVE NOW? CAN YOU GET BACK INTO IT?',
  },
  {
    id: 'royale',
    batch: 2,
    name: 'POTATO ROYALE',
    pitch: 'NO LAPS. A BOOM KNOCKS YOU OUT. MORE POTATOES JOIN AS KARTS DROP (UP TO 3). SWAPS ARE INSTANT. LAST KART STANDING WINS.',
    how: ['IT STARTS WITH YOU: 7 SECONDS', 'NO PASSING BACK TILL YOU SPLIT'],
    rules: { draft: true, ram: true, slingshot: true, royale: true },
    laps: 99,
    question: 'DOES IT ESCALATE? IS SURVIVING FUN AT THE FRONT TOO?',
  },
  {
    id: 'timebomb',
    batch: 2,
    name: 'TIME BOMB',
    pitch: 'HOLD SHIFT: THE WORLD CRAWLS, YOU KEEP MOST OF YOUR SPEED. EVERY KART YOU TOUCH GETS CHARGED. LET GO AND THEY ALL BLOW, SPINNING WHOEVER IS NEXT TO THEM.',
    how: ['BAR FILLS BY ITSELF AND ON NEAR MISSES', 'TAG A BUNCH, THEN LET GO'],
    rules: { draft: true, ram: true, slingshot: true, timebomb: true },
    question: 'DOES SETTING UP A BIG CHAIN FEEL LIKE YOUR MOVE?',
  },
  {
    id: 'hunted',
    batch: 2,
    name: 'HUNTED',
    pitch: 'THREE RIVALS (RED MARKERS) ARE OUT TO SPIN YOU: THEY CHASE YOU DOWN AND AIM FOR A REAR CORNER. YOU CAN SPIN THEM BACK.',
    how: ['DONT LET ONE SIT ON YOUR BUMPER', 'A HUNTER JUST AHEAD WILL BLOCK'],
    rules: { draft: true, ram: true, slingshot: true, hunters: 3 },
    question: 'DOES BEING HUNTED MAKE DRIVING TENSE IN A GOOD WAY?',
  },
];

export const LAB_DEFAULTS = { laps: 3, rivals: 10 };

export function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
