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
  maxSpeed: 132,        // top speed on asphalt
  reverseMaxSpeed: 40,
  accel: 105,           // throttle
  brake: 230,           // braking while moving forward
  coastDrag: 0.55,      // speed lost per second off the throttle (fraction)
  turnRate: 2.7,        // radians per second at full steer, at speed
  turnFullAt: 45,       // below this speed, turning scales down (no spinning on the spot)
  grip: 9,              // how fast sideways sliding dies out (higher = grippier)
  mass: 1,
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
  boxRespawnSeconds: 3.5,
  // How long a slot "spins" after a pickup before the item can be used or fused.
  rouletteSeconds: 0.9,
  // Item slots every kart starts with, and the most Take Two can grow a hand to.
  baseSlots: 2,
  maxSlots: 4,
  // Most powerups one fused item can hold (SUPER BOOST is 2, BOOST+SHIELD+ROCKET is 3).
  maxParts: 4,
};

export const HAZARDS = {
  rocketSpeed: 300,     // a boosted kart tops out around 205
  rocketLife: 10,
  rocketHoming: 140,    // sideways pixels per second a rocket can swerve toward its target
  rocketLockOn: 220,    // starts swerving when this close behind its target
  bananaLife: 45,
};

export const HITS = {
  // Getting hit by a rocket, a banana or a ram.
  spinSeconds: 0.9,
  spinRate: 13,         // radians per second the kart twirls
  spinGrip: 0.15,       // grip multiplier while spinning (it slides)
};

export const AI = {
  // Each rival gets a skill between these. Skill scales top speed and cornering judgement.
  skillMin: 0.88,
  skillMax: 0.975,
  // Total turning (radians) a rival can see ahead before it starts lifting off.
  freeBend: 1.0,
  lookaheadBase: 26,
  lookaheadPerSpeed: 0.32,
  // Seconds between deciding to use an item and pressing the button.
  itemDelayMin: 0.4,
  itemDelayMax: 2.2,
  // Chance a rival holding two ready items fuses them instead of using the front one.
  fuseChance: 0.35,
  // A rival that doesn't want its front item for this long cycles past it (or just uses it).
  holdSeconds: 4,
  stuckSeconds: 1.4,
  reverseSeconds: 0.7,
};
