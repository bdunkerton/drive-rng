// Every tunable number in the game lives here. Units are world pixels and seconds.
// The screen is a 320x180 window onto the world, scaled up with crisp pixels.

export const VIEW = {
  width: 320,
  height: 180,
};

export const SIM = {
  // The simulation always steps at this rate, whatever the monitor does.
  hz: 60,
  // If the tab stalls, never try to catch up more than this many steps in one frame.
  maxStepsPerFrame: 5,
};

export const KART = {
  radius: 5,            // collision circle
  maxSpeed: 172,        // top speed on asphalt
  reverseMaxSpeed: 45,
  accel: 125,           // throttle
  brake: 250,           // braking while moving forward
  coastDrag: 0.5,       // speed lost per second off the throttle (fraction)
  turnRate: 3.3,        // radians per second at full steer, at low-to-middling speed
  turnFullAt: 40,       // below this speed, turning scales down (no spinning on the spot)
  // Steering gets heavier the faster you go: at top speed you only have this fraction of
  // turnRate (and less again on a boost). Corners have to be braked for.
  turnAtTopSpeed: 0.45,
  grip: 5.5,            // how fast sideways sliding dies out (higher = grippier)
  // Once a kart is sliding sideways faster than this, it loses more grip and keeps
  // sliding until you straighten it out or slow down.
  slideAt: 65,
  slideGrip: 0.7,      // grip multiplier while sliding
  mass: 1,
};

// Drafting: tuck in behind a kart and its wake pulls you along. Pull out and the extra
// speed fades over a second or so: that's the slingshot.
export const DRAFT = {
  range: 110,           // how far back a kart's wake reaches, in pixels
  minGap: 4,            // closer than this (nose to tail) and you're just touching
  width: 9,             // half-width of the wake right behind a kart...
  spread: 0.1,          // ...widening by this much for every pixel further back
  align: 0.75,          // you have to be pointing roughly the same way (cosine of the angle)
  leaderMinSpeed: 60,   // a kart going slower than this leaves no useful wake
  fillSeconds: 0.9,     // time in the wake to reach a full draft
  fadeSeconds: 1.1,     // time for a full draft to fade once you're out of the wake
  topSpeed: 0.15,       // a full draft raises your top speed by this fraction
  accel: 0.6,           // ...and your acceleration by this fraction
};

// Ramming: hit a kart with your nose, off its centreline, fast enough, and it spins.
// A dead-centre hit from behind just shoves it forward (which helps it: aim better).
export const RAM = {
  minClosing: 28,       // closing speed (px/s) for your hit to count
  // Rivals don't aim; they mostly rear-end each other in braking zones. Only a big hit
  // from a rival spins anyone, so the pack isn't constantly spinning itself out.
  botMinClosing: 80,
  nose: 0.55,           // the hit has to land in front of you (cosine: within about 57 degrees)
  offCentre: 0.3,       // how far off the target's centreline the hit must land (0 centre, 1 side)
  notHeadOn: -0.25,     // the target can't be coming at you (cosine between headings)
  keepSpeed: 0.92,      // on a spin, the rammer keeps this much of its forward speed
  immunity: 1.2,        // seconds after a spin-out ends before that kart can be rammed again
  // Rivals don't aim at you, but they do rear-end you in braking zones. Off for now so
  // the test is whether hunting them feels good, not whether getting punted feels bad.
  botsSpinPlayer: false,
};

// Keyboard steering eases in and out instead of snapping to full lock.
export const STEER = {
  attack: 6,            // per second toward full lock (about 0.17 s from centre)
  release: 12,          // per second back toward centre (and through it when you swap sides)
};

export const SURFACE = {
  // Multipliers applied while a kart's centre is on each surface.
  road:  { maxSpeed: 1.0,  drag: 0 },
  curb:  { maxSpeed: 0.92, drag: 0.2 },
  grass: { maxSpeed: 0.5,  drag: 1.4 },
};

export const WALL = {
  bounce: 0.35,         // how much of the into-the-wall speed comes back out
  scrub: 0.75,          // speed kept along the wall after a hit
};

export const BUMP = {
  restitution: 0.6,     // kart-to-kart bounciness
};

export const RACE = {
  laps: 3,
  countdownSeconds: 3,
  rivals: 3,
  // After the player finishes, the race keeps running this long so rivals can finish too.
  finishGraceSeconds: 12,
};

export const ITEMS = {
  boxRadius: 6,
  // Boxes respawn separately for each kart, so a box the leader took is still there for you.
  boxRespawnSeconds: 1.5,
  // How long a slot "spins" after a pickup before the item can be used or fused.
  rouletteSeconds: 0.5,
  // Item slots every kart has. Fuse turns the front two into one.
  slots: 2,
  // In a player's first race, the first boxes always give these (their first fusion is a WHITE HOLE).
  firstPickups: ['black-hole', 'boost'],
};

export const FUSION = {
  // Strength of each kind of item, as a multiplier ("power") on its Motion and Field.
  megaPower: 2,         // the same item twice
  fusionPower: 1.25,    // two different items
  fizzlePower: 0.5,     // opposites: you get the first item alone, at this strength
  // Chance a Mega or a Fusion comes out WILD, and how much stronger that makes it.
  wildChance: 0.1,
  wildPower: 1.6,
};

export const HITS = {
  // Getting spun out (by a close BLAST).
  spinSeconds: 1.0,
  spinRate: 13,         // radians per second the kart twirls
  spinGrip: 0.15,       // grip multiplier while spinning (it slides)
  // Getting popped into the air (by a BOUNCE).
  popSeconds: 0.55,
};

export const AI = {
  // Each rival gets a skill between these. Skill scales top speed and cornering judgement.
  skillMin: 0.86,
  skillMax: 0.95,
  // How far ahead a rival plans its braking, and how much of its steering it dares use
  // in a corner (scaled by skill: the best rivals use the most).
  planAhead: 320,
  cornerMarginMin: 0.62,
  cornerMarginMax: 0.86,
  brakeMargin: 0.7,     // fraction of real braking power it plans with
  lookaheadBase: 26,
  lookaheadPerSpeed: 0.32,
  // Seconds between deciding to use an item and pressing the button.
  itemDelayMin: 0.2,
  itemDelayMax: 1.2,
  // Chance a rival holding two ready items fuses them instead of using the front one.
  // Rivals never fuse opposites on purpose. Lower = fewer fusions on screen.
  fuseChance: 0.22,
  // A rival that doesn't want its front item for this long cycles past it (or just uses it).
  holdSeconds: 2,
  stuckSeconds: 1.4,
  reverseSeconds: 0.7,
};
