// The playtest lab's scenarios: small, replayable units, each trying out one mechanic
// (or one combination) on the Test Oval with a big pack. Add new ones to the END of the
// list and bump `batch`, so feedback can say which round of ideas it was about.
// `rules` switches mechanics on for the race (see DEFAULT_RULES in src/sim/race.js).

export const LAB_VERSION = 'lab-5';
/** The lab menu shows this batch (?lab=all shows every scenario, archived ones too). */
export const CURRENT_BATCH = 5;

/** Is this scenario in the given batch (its own, or carried over with `also`)? */
export const inBatch = (s, batch) => s.batch === batch || (s.also ?? []).includes(batch);

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
  // --- Batch 3 (after playtest #9): Pack Race 2 won; Royale needs a tiny track and a fuse
  // that keeps burning; Time Bomb needs a reason (the heist); Hunted parked. ---
  {
    id: 'pack3',
    batch: 3,
    name: 'PACK RACE 3',
    pitch: 'SHORTER WAKES: YOU HAVE TO BE RIGHT ON SOMEONE. A FULL CHARGE FIRES BY ITSELF AND MAKES YOU HEAVY, SO YOU SLAM THROUGH THE PACK. PULL OUT EARLY FOR A SMALLER BURST.',
    how: ['TUCK IN TIGHT, LET IT FIRE', 'OR STEER OUT EARLY ON PURPOSE'],
    rules: { draft: true, ram: true, slingshot: 2 },
    question: 'DOES SLAMMING THROUGH ON A FULL CHARGE FEEL GOOD EVERY TIME?',
  },
  {
    id: 'royale2',
    batch: 3,
    name: 'BULLRING ROYALE',
    pitch: 'POTATO ROYALE ON A TINY OVAL (8 SECOND LAPS), SO THE LEADERS ARE ALWAYS IN THE PACK. A FUSE KEEPS BURNING WHEN IT IS PASSED: WHOEVER HOLDS IT AT ZERO IS OUT.',
    how: ['IT STARTS WITH YOU', 'FUSES GET SHORTER AS KARTS DROP'],
    rules: { draft: true, ram: true, slingshot: 2, royale: 2 },
    track: 'bullring',
    laps: 99,
    question: 'IS THERE NOWHERE TO HIDE NOW? DOES THE END STAY TENSE?',
  },
  {
    id: 'heist',
    batch: 3,
    name: 'HEIST',
    pitch: 'GETAWAY: JUST YOU, A ROAD FULL OF SLOW TRAFFIC, AND THREE FAST COPS. A COP THAT SPINS YOU IS A BUST; 3 BUSTS AND YOU ARE CAUGHT. SCRAPE PAST TRAFFIC TO EARN THE TIME BOMB, THEN BLOW THE COPS AWAY.',
    how: ['3 LAPS TO GET AWAY', 'HOLD SHIFT: TAG COPS AND CARS, LET GO'],
    rules: { draft: true, ram: true, slingshot: 2, timebomb: true, heist: true },
    rivals: 0,
    question: 'IS WEAVING, EARNING THE BOMB AND BLOWING THE COPS A LOOP?',
  },
  // --- Batch 4 (after the lab-3 feedback): tighter tracks, no synchronised slingshots,
  // a shrinking arena, and a heist that gets harder every lap. ---
  {
    id: 'pack4',
    batch: 4,
    name: 'PACK RACE 4',
    pitch: 'PACK RACE 3 ON THE SHORT OVAL (11 SECOND LAPS) SO THE PACK STAYS BUNCHED. CHARGE FILLS FASTER THE CLOSER YOU ARE, AND EVERY KART CHARGES AT ITS OWN RATE, SO THEY DONT ALL FIRE AT ONCE.',
    how: ['GET RIGHT ON A BUMPER', 'FULL CHARGE FIRES BY ITSELF'],
    rules: { draft: true, ram: true, slingshot: 2 },
    track: 'shortOval',
    also: [5], // no feedback on it yet: carried into batch 5
    question: 'DOES THE PACK STAY TIGHT AND BUSY ALL RACE?',
  },
  {
    id: 'shrink',
    batch: 4,
    name: 'SHRINKING ROYALE',
    pitch: 'BULLRING ROYALE, BUT THE ARENA CLOSES IN: AT 7 KARTS LEFT IT DROPS TO A SMALLER RING, AT 4 TO A TINY ONE. POTATO HOLDERS NOW GO FOR WHOEVER IS CLOSEST, AHEAD OR BEHIND, AND WILL BRAKE OR BACK INTO YOU.',
    how: ['WATCH YOUR MIRRORS TOO', 'THE FINAL FEW FIGHT ON A TINY RING'],
    rules: { draft: true, ram: true, slingshot: 2, royale: 2, shrink: true },
    track: 'bullring',
    laps: 99,
    question: 'DOES THE SHRINK KEEP THE ENDGAME TENSE?',
  },
  {
    id: 'heist2',
    batch: 4,
    name: 'HEIST 2',
    pitch: 'FOUR COPS TO START. EVERY NEW LAP: MORE COPS (+2, THEN +3), ALL OF THEM FASTER, AND ROADBLOCKS ACROSS THE ROAD WITH ONE GAP. TIME WARP THROUGH THE GAP, OR SLAM A FULL SLINGSHOT THROUGH THE TYRES.',
    how: ['SCRAPE PAST TRAFFIC TO EARN THE BOMB', 'HOLD SHIFT TO THREAD A ROADBLOCK'],
    rules: { draft: true, ram: true, slingshot: 2, timebomb: true, heist: 2 },
    rivals: 0,
    question: 'DOES EACH LAP FEEL HARDER, AND IS THE TIME WARP NOW WORTH IT?',
  },
  // --- Batch 5 (after #13 and the first focus-group round: Royale is the focus, the
  // arena ends as a bowl, cops come from both directions). ---
  {
    id: 'bowl',
    batch: 5,
    name: 'BOWL ROYALE',
    pitch: 'ONE POTATO PER THREE KARTS FROM THE START (4 OF THEM). AT 7 LEFT THE ARENA DROPS TO A WIDE RING, AT 4 IT BECOMES A BOWL: ALL ROAD, NO LINE, JUST CHICKEN WITH THE POTATO.',
    how: ['FUSES KEEP BURNING WHEN PASSED', 'IN THE BOWL THEY COME STRAIGHT AT YOU'],
    rules: { draft: true, ram: true, slingshot: 2, royale: 3, shrink: 2 },
    track: 'bullring',
    laps: 99,
    question: 'IS THE BOWL A GOOD FINALE? ENOUGH POTATOES EARLY ON?',
  },
  {
    id: 'heist3',
    batch: 5,
    name: 'HEIST 3',
    pitch: 'COPS COME FROM BOTH DIRECTIONS: SOME START UP THE ROAD AND DRIVE THE WRONG WAY STRAIGHT AT YOU. ROADBLOCKS ARE SCATTERED, STAGGERED TYRES YOU WEAVE THROUGH. TIME WARP NOW KEEPS YOUR FULL SPEED AND SHARPENS YOUR STEERING.',
    how: ['HEAD-ON COPS BUST YOU TOO', 'WARP TO WEAVE A ROADBLOCK'],
    rules: { draft: true, ram: true, slingshot: 2, timebomb: true, heist: 3 },
    rivals: 0,
    question: 'DO HEAD-ON COPS AND MESSY ROADBLOCKS MAKE THE WARP MATTER?',
  },
];

export const LAB_DEFAULTS = { laps: 3, rivals: 10 };

export function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id) ?? null;
}
