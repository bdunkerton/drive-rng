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

// Slingshot drafting (a lab rule): sitting in a wake only keeps you with the kart ahead
// while charge builds. The pay-off is pulling OUT: a burst of speed scaled by the charge.
export const SLINGSHOT = {
  inWake: 0.05,         // top-speed bonus while tucked in (just enough to hang on)
  fillSeconds: 1.6,     // time in a wake to reach full charge
  minCharge: 0.35,      // pull out with at least this much charge to slingshot
  seconds: 1.3,         // how long the burst lasts
  topSpeed: 0.4,        // full charge: +40% top speed during the burst
  accel: 2.5,           // ...and this much harder acceleration
  kick: 45,             // instant extra speed at full charge
  aiPullOutAt: 0.8,     // rivals pull out to pass once they've this much charge
  // Slingshot v2 (rule slingshot: 2, after playtest #9):
  range: 60,            // a shorter wake: you have to be right on the kart ahead
  partialScale: 0.7,    // pulling out before you're full gives a smaller burst
  autoMass: 3,          // a full charge fires by itself and you're heavy: you plough through
  autoSeconds: 1.4,
  // v2 after playtest (lab-3): the pack all fired at once. Charge now fills faster the
  // closer you are, and each kart charges at its own rate.
  closeFill: 1.6,       // fill-rate multiplier right on someone's bumper...
  farFill: 0.6,         // ...and at the far end of the wake
  rateMin: 0.8,         // each kart's own fill rate is somewhere in here
  rateMax: 1.25,
};

// Time Bomb (a lab rule, bullet time v2): hold FOCUS and the world crawls while you keep
// most of your speed. Every kart you touch meanwhile is charged; when you let go (or run
// out) they all go off, and each blast can spin karts next to it.
export const TIMEBOMB = {
  worldScale: 0.25,     // everyone else runs at this speed while you focus...
  playerScale: 1,       // ...and you at full speed (after the lab-4 feedback: 0.85 felt sluggish)
  warpGrip: 1.6,        // while warping you also get this much more grip...
  warpTurn: 1.35,       // ...and this much sharper steering, for threading gaps
  drainPerSecond: 0.28, // a full bar lasts about 3.5 s
  passivePerSecond: 0.035, // the bar also fills slowly on its own
  startWith: 0.4,
  blastRadius: 30,      // karts this close to a detonation get thrown...
  blastPush: 110,
  chainRadius: 20,      // ...and this close also spin (chain reactions)
};

// Heist (a lab rule): you alone, a road full of slow traffic, and cops behind you. A cop
// that spins you is a bust; three busts and you're caught. Finish the laps to get away.
// Weaving close past traffic earns the Time Bomb (no free refills here).
export const HEIST = {
  traffic: 18,
  trafficSpeedMin: 70,
  trafficSpeedMax: 115,
  cops: 3,
  copSpeed: 1.2,        // cops' top speed, as a multiple of yours
  copMass: 1.5,         // they shove traffic out of the way
  copSkill: 0.97,
  copDelay: 1.5,        // seconds after GO before the cops set off
  copStartGap: 180,     // how far behind you they start
  copAimFrom: 75,       // closer than this a cop drives at your rear corner
  copCooldown: 2,       // after busting you, a cop backs off this long
  busts: 3,
  nearMiss: 0.12,       // Time Bomb earned per near miss
  clearStart: 260,      // no traffic this close to the start (ahead or behind)
  // Heist 2 (rule heist: 2, after playtest lab-3): it gets harder every lap.
  startCops2: 4,
  copsPerLap: [0, 2, 3],      // extra cops arriving at the start of laps 1, 2, 3
  copSpeedPerLap: 0.06,       // every cop gets this much faster each new lap
  roadblocksPerLap: [0, 2, 2], // new roadblocks set up at the start of laps 1, 2, 3
  roadblockGap: 30,           // width of the one way through
  roadblockSpacing: 11,       // between tyre stacks in a roadblock
  roadblockAhead: 650,        // the first new roadblock is at least this far ahead of you
  copArriveBehind: 380,       // new cops turn up this far behind you
  // Heist 3 (rule heist: 3, after the lab-4 feedback):
  copAheadGap: 650,           // cops that start (or arrive) up the road ahead of you
  scatterRowGap: 34,          // between the staggered rows of a scattered roadblock
};

// Hunters (a lab rule): a few rivals come after the player and aim for a rear corner.
export const HUNT = {
  range: 220,           // a hunter goes after you from this far back (course distance)
  aimFrom: 55,          // closer than this it drives straight at your rear corner
  blockRange: 50,       // a hunter just ahead of you moves into your lane
  cooldown: 5,          // after spinning you, a hunter backs off this long
  skill: 0.95,          // hunters drive at this skill
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

// Playtest-lab mechanics (each one is a rule a scenario can switch on).
export const LEAP = {
  minClosing: 15,       // drive into a spinning kart at least this fast and you vault it
  nose: 0.4,            // ...nose first (cosine)
  seconds: 0.6,         // time in the air
  height: 16,
  kick: 45,             // extra forward speed on take-off
  airSpeed: 1.25,       // top-speed multiplier while airborne
};

export const BILLIARDS = {
  transfer: 0.95,       // fraction of the closing speed handed to the kart you hit
  keep: 0.3,            // fraction of your own speed you keep (the cue ball stops)
  cueSeconds: 1.0,      // how long a struck kart stays "live" and spins whoever it hits
  chainClosing: 35,     // a live kart has to hit this hard to spin someone
};

export const FOCUS = {
  nearMissGap: 7,       // edge-to-edge gap (px) that counts as a near miss
  nearMissSpeed: 40,    // relative speed needed for it to count
  perNearMiss: 0.2,     // focus gained per near miss
  sameKartCooldown: 1.2,
  wallGap: 5,           // riding the very edge of the road (on the curb) this close...
  wallSpeed: 140,       // ...at this speed...
  wallPerSecond: 0.15,  // ...trickles in this much focus per second
  drainPerSecond: 0.45, // holding focus uses this much per real second (about 2.2 s from full)
  timeScale: 0.35,      // the world runs at this speed while you're focusing
};

// The hot potato (a race mode, on whenever items are off): one potato in play at all times.
export const POTATO = {
  firstDelay: 2,        // seconds after GO before it appears (with whoever's last)
  fuseSeconds: 8,       // a fresh fuse; every pass starts a new one
  noTagBackSeconds: 2,  // after passing it on, nobody can hand it back to you for this long
  holdMinSeconds: 0.6,  // a new holder can't pass it on this quickly (no pinballing through a pack)
  topSpeed: 0.12,       // the holder is this much faster...
  accel: 0.3,           // ...and accelerates this much harder
  boomSpinScale: 1.5,   // the boom spins you for longer than a ram
  boomKeepSpeed: 0.35,  // and leaves you with this much of your speed
  respawnSeconds: 1.5,  // after a boom, it turns up with the last-place kart this much later
  // Rivals: how far up the road (in course distance) a holder looks for someone to tag,
  // and how close the holder has to be behind before a rival starts running.
  aiChaseRange: 220,
  aiFleeRange: 110,
};

// Potato Royale (a lab rule): a boom knocks the holder out of the race; more potatoes join
// as karts drop out; swaps are instant (you just can't pass straight back to the kart that
// gave it to you until you've separated). Last kart standing wins.
export const ROYALE = {
  fuseSeconds: 7,
  maxPotatoes: 3,
  kartsPerPotato: 3,    // at most one potato per this many karts still in
  // Royale 2 (rule royale: 2, after playtest #9): a potato's fuse keeps burning through
  // passes, so somebody is just out of luck. Each new potato gets a fuse in this range.
  keepFuseMin: 12,
  keepFuseMax: 18,
  shortenTo: 0.45,      // fuses shrink as karts drop, down to this fraction (a faster endgame)
  // Royale 3 (rule royale: 3): about one potato per this many karts, from the very start.
  dense: 3,
  denseMax: 4,
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
