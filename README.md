# Drive RNG

A top-down pixel kart racer where the items are the point. One short track (about 20 seconds a lap), three AI rivals, tyre stacks to drive round, twenty powerups, and two item slots you can fuse into something stranger. Every item helps whoever uses it; anything it does to the other karts is collateral, and that's the risk.

Plain JavaScript in the browser. No build step and no dependencies.

Plans for releasing it (CrazyGames first, then other sites, maybe Steam) are in [docs/LAUNCH_PLAN.md](docs/LAUNCH_PLAN.md).

## Play it

**Online:** https://bdunkerton.github.io/drive-rng/ (GitHub Pages, served straight from `main`; a push shows up there within a few minutes). The URL options below work there too, e.g. `https://bdunkerton.github.io/drive-rng/?quick=1&laps=1`.

**Locally:** you need [Node.js](https://nodejs.org) 18 or newer.

```
npm start
```

Then open the address it prints (normally `http://localhost:8080`).

**In VS Code:** run `npm start` in the integrated terminal (or *Terminal → Run Task → Drive RNG: start game server*), then press `Ctrl+Shift+P`, choose **Simple Browser: Show**, and paste the address. Click inside the game once so it gets the keyboard.

No Node? `python -m http.server 8080` in this folder works too (tests and the simulator need Node). Opening `index.html` straight from disk won't work, because browsers block modules on `file://`.

### Controls

| Key | Does |
| --- | --- |
| Up / W | Accelerate |
| Down / S | Brake, then reverse |
| Left, Right / A, D | Steer |
| Space (or E, X) | Use your front item |
| F (or Q) | Fuse your front two items into one |
| C (or R) | Move the front item to the back (changes the fusion order) |
| P / Esc | Pause |
| M | Mute |
| ` (backtick) | Debug overlay |

### Driving

The karts are quick and they don't drive themselves. Steering gets heavier the faster you go (heavier still on a boost), so corners have to be braked for. Turn in too hard and the tyres let go: the kart keeps sliding until you straighten up or slow down. Grass is slow. Finding the line is most of a good lap.

**Tyre stacks** sit on the track: a wall across half the front straight, one on the apex of the right sweeper, one in the middle of the chicane, one on the inside of the hairpin, and a pair on the back section. A normal kart bounces off them. A BULK giant can shove them out of the way, a SPRING jumps over them, and a GHOST passes through.

### Items

Drive through a **?** box to get an item. Boxes are **per kart**: one you've taken is gone for you for a couple of seconds, but it's still there for everyone else, so the back of the pack gets as many items as the leader. It spins for a moment, then settles into a slot at the top of the screen. The gold-framed slot on the left is your **front** item: Space uses it.

## Powerups

You have **2 item slots**. A full hand smashes boxes without picking anything up.

Every powerup has two halves: a **motion** (how it moves you) and a **field** (what it does to the space around you while that happens). Used on its own, an item does both of its own halves.

| # | Powerup | Motion | Field |
| --- | --- | --- | --- |
| 1 | **BOOST** | DASH: a straight burst of speed | SLIPSTREAM: a speed lane behind you anyone can ride, then a burst of speed for everyone close when it ends |
| 2 | **SPRING** | LEAP: a big hop; you fly faster than you drive and nothing can touch you | BOUNCE: pops into the air anyone you pass over or land near |
| 3 | **HOOK** | TETHER: latch onto the kart ahead, get reeled in, slingshot past | PULL: drags nearby karts in toward you |
| 4 | **ROCKET** | RIDE: very fast, steers wide, nothing knocks you about | BLAST: when it ends, throws nearby karts aside and spins out the closest |
| 5 | **GHOST** | PHASE: see-through; karts pass through you and grass doesn't slow you | VANISH: karts near you phase out too |
| 6 | **BLACK HOLE** | FALL: a hole opens ahead, pulls you in and pops you out fast | GRAVITY: drags nearby karts in toward you |
| 7 | **BULK** | CHARGE: huge and heavy; nothing spins you out or pops you | SHOVE: anyone who touches you bounces off hard |
| 8 | **BUMPER** | RICOCHET: a springy bubble; every bump kicks you forward | REPEL: pushes nearby karts away |
| 9 | **MAGNET** | DRAFT: tuck in behind a kart ahead for a big tow | COLLECT: item boxes near you fly to you |
| 0 | **BLINK** | WARP: teleport a short way up the road, keeping your speed | AFTERIMAGE: leaves a solid copy of you behind |
| - | **MOONWALK** | MOONWALK: spin round and thrust backwards, faster than you can drive (steering reversed) | FLIPSIDE: karts near you get spun round too |
| = | **TWISTER** | SPIN: an unstoppable spinning top | WHIRL: flings nearby karts round you |
| [ | **GRIP** | RAILS: no sliding and sharp steering at any speed | SLICK: leaves oil that takes others' grip away |
| ] | **RAMP** | LAUNCH: a long, fast jump off a ramp | RAMPS: leaves ramps that launch whoever follows |
| ; | **LEAPFROG** | VAULT: hook the kart ahead, reel in, jump over it and leave it spinning | STOMP: bounces away whoever's near where you land |
| ' | **YANK** | TUG: an elastic line drags the kart ahead back and hauls you forward | LASSO: ropes a nearby kart, swings it about and flings it |
| | **SIPHON** | ABSORB: any kart that hits you gives you its speed | UNDERTOW: drags the karts just ahead back into you |
| | **CATAPULT** | WIND-UP: a bungee holds you back, then fires you forward | ELASTIC: ties up to three nearby karts to you with bungees |
| | **CANNONBALL** | ROLL: a heavy iron ball; anything you hit is knocked flying | RUBBER: karts near you bounce off each other harder than they hit |
| | **ORBIT** | SWING: swing round the kart ahead like a pole and shoot off faster | SATELLITE: nearby karts circle you, then get flung |

The first column is the debug key (see below); the debug overlay lists the first 16.

### Fusing

Press **F** to fuse your front two items into one. Before you press it, the HUD shows what you'd get (`F FUSE: WHITE HOLE`).

- **The rule:** a fusion has the **motion of the first slot and the field of the second**. HOOK then BOOST is a hook that leaves a speed lane; BOOST then HOOK is a dash that drags karts in. Every one of the 380 pairs works, with no table to write. Press **C** to swap the order before you fuse.
- **The same item twice** is a **MEGA**: its own motion and field at double strength.
- **Opposites cancel** and **FIZZLE**: HOOK and BUMPER, BULK and GHOST, BLACK HOLE and SPRING, BLINK and MOONWALK, GRIP and TWISTER. You get the first item alone at half strength and a sad horn. Fizzles are learnable, not bad luck.
- **One Mega or Fusion in ten comes out WILD**: stronger, with a rainbow frame and a moment of slow motion when you use it. That's the only random part of fusing, and it only ever makes things better.
- A fused item can't be fused again.

Some fusions have names (the rule is still what they do):

| Fuse | Name | What happens |
| --- | --- | --- |
| BLACK HOLE then BOOST | **WHITE HOLE** | Fall into the hole, then burst out in a speed field that flings everyone nearby forward |
| HOOK then BOOST | **SLINGSHOT** | Latch onto the kart ahead and shoot past it down a speed lane |
| SPRING then ROCKET | **METEOR** | A big jump, then you slam down with a blast |
| ROCKET then SPRING | **SKIP STONE** | A rocket run that pops every kart it passes |
| BOOST then GHOST | **WORMHOLE** | A dash where everything in your way ghosts out of it |
| BUMPER then BLACK HOLE | **PINBALL** | Karts get dragged into you and bounce off; every bounce kicks you forward |
| BULK then HOOK | **SNOWBALL** | You're huge and dragging karts in, then shoving them off |
| GHOST then BOOST | **GHOST LANE** | Phase forward and leave a speed lane others can ride |

In your first race, the first two boxes always give BLACK HOLE then BOOST, and the game asks you to press F: your first fusion is a WHITE HOLE. After you've fused once, boxes are random (the game remembers in your browser).

The rivals play the same game: they pick up, fuse, cycle and use items, and each powerup tells them when it's worth using. They never fuse opposites on purpose.

### URL options

Add these to the address, e.g. `http://localhost:8080/?quick=1&laps=1&seed=banana`.

| Option | Does |
| --- | --- |
| `quick=1` | Skip the title screen and start racing |
| `laps=N` | Laps per race, 1–9 |
| `rivals=N` | AI rivals, 0–7 |
| `seed=anything` | Fixed seed: rivals and item rolls repeat exactly (as long as you drive the same) |
| `debug=1` | Start with the debug overlay on |
| `tutorial=1` | First-race item boxes (BLACK HOLE, then BOOST) even if you've fused before |

### Debug overlay

Press backtick. You'll see the track centreline (white dots), the racing line the rivals follow (cyan), the fence (red), a yellow line from each rival to the point it's aiming at, a red line for each hook, and live numbers for your kart. It also lists every powerup: press its key (1–9, 0, then - = [ ] for the rest) to put it straight into your hand, ready to use. Press two numbers then F to try any fusion: the first number is the motion, the second the field.

## Check it without playing

```
npm test                          # unit tests, a few seconds
npm run sim                       # one AI-only race, seed 1, printed as a table
npm run sim -- --seed 42 --laps 1
npm run sim -- --runs 50          # 50 races: wins, average times, items used, fusions, fizzles, wilds, blasts, pops
npm run sim -- --karts 8
npm run lab                       # the combo lab: every item and fusion in 24 race moments each (a few minutes)
npm run lab -- --with grip --moments 60 --out grip.json
npm run lab -- --with siphon,orbit --sort vibe   # rank by "vibe": the Pinball feel (contact, karts flung)
```

**The combo lab** (`scripts/lab.mjs`) drops each item into real race moments (an all-AI race runs to a chosen second, the kart in 4th gets the item) and compares with the same seeded race without it: places gained, how often it gains 2+ places, how often it leaves you worse, how many karts it touched, airtime, time spent driving backwards. The top of the file explains each number.

**Replays:** `tools/replay.html?seed=1003&at=12.4&combo=hook+boost` replays one lab moment with the camera on the kart that got the item. `tools/record_clips.py` renders lab moments to video, side by side with the race without the item (needs Python Playwright, Chrome and ffmpeg).

The simulator runs exactly the same race code as the game, with every kart driven by the AI.

## How the code is organised

```
index.html             page + canvas; loads src/main.js
src/
  main.js              boot, URL options, fixed-step loop, scene switching
  config.js            every tunable number (speeds, grip, laps, item timings, AI)
  core/                rng (seeded), math, events (tiny bus), input (keyboard)
  sim/                 THE GAME RULES — no browser code in here
    race.js            the race: countdown, step order, laps, positions, finish, results
    kart.js            kart state and driving physics
    track.js           track geometry: centreline, projection, surfaces, start grid
    effects.js         timed effects on karts (what every powerup adds)
    hand.js            the items a kart holds: slots, fusing, cycling, using
    hits.js            spin-outs (only a close BLAST causes one)
    entities.js        things on the track: item boxes (taken separately by each kart)
    obstacles.js       tyre stacks: solid for normal karts, shoved by giants
    hazards.js         things items leave behind: speed-lane pads, black-hole marks
    toast.js           short messages for one driver ("HIT BY BOLT!")
    controllers.js     human controller (reads an input object) and an idle one
    headless.js        run a whole race without a screen
    powerups/          registry.js, index.js, kit.js (shared pushes, pulls, pops, blasts and
                       runMove), fusion.js (the fusion rule and the named fusions), one file per powerup
  ai/driver.js         the rivals' driving
  tracks/meadow.js     the Meadow Loop track definition
  render/              everything you see: track art, kart sprites, HUD, font, icons, particles
  scenes/              title screen and race screen (pause menu, results)
  audio/sound.js       synthesised sound effects
  debug/overlay.js     the backtick overlay
scripts/               serve.mjs (local server), sim.mjs (headless races)
test/                  node:test suites
```

The split that matters: **`src/sim` and `src/ai` never touch the browser.** That's why the same race runs in the game, in tests and in `npm run sim`. Rendering and sound only *watch* the race (they read state and listen to events); they never change it.

### One race step, in order

`Race.step(dt)` runs 60 times a second:

1. **Countdown** — until GO, nothing moves.
2. For each kart:
   1. its **controller** writes `kart.controls` (`throttle`, `brake`, `steer`, and the one-step presses `useItem`, `fuse`, `cycle`);
   2. each held item's roulette timer counts down;
   3. **effects tick** — they run *after* the controller, so an effect may override controls (the boost forces the throttle on, a spin-out takes the wheel away);
   4. hand actions: `cycle`, then `fuse`, then `useItem` (see `sim/hand.js`);
   5. **physics** moves the kart, then the **track** works out its surface, pushes it off the fence and adds to its distance travelled.
3. **Kart-to-kart bumps**, then **tyre stacks** against karts.
4. **Entities** update, and any kart overlapping an entity's `radius` triggers its `onKartTouch`.
5. **Laps**, **positions**, and whether the race is over.

### Events

The race emits events on `race.events`. Rendering, sound and the HUD listen; powerups can emit their own.

- Race: `countdown`, `go`, `lap`, `final-lap`, `finish`, `race:end`
- Hand: `item:box`, `item:pickup`, `item:use` (`{ kart, item, name, parts, kind, wild, showcase, motion, field }`), `item:fuse` (`{ kart, item, name, kind, wild, parts, showcase }`), `item:cycle`, `mega`, `fizzle`, `wild`
- Moves: `move:end`, `slipstream`, `pad:ride`, `bounce`, `pop`, `land`, `hook:latch`, `hook:release`, `blast`, `vanish`, `hole:pop`, `shove`, `ricochet`
- Hits: `hit` (a spin-out landed), `hit:shrug` (a giant or rocket rider ignored it)
- Other: `effect:start`, `effect:end`, `entity:spawn`, `wall`, `bump`, `tires:hit` (a kart bounced off a stack), `tires:shove` (a giant pushed one)
- `sfx` (`{ name, kart }` plays a sound from `audio/sound.js`), `toast` (`{ kart, text, colour }` shows a message if that kart is the player)

These are what to hook analytics and clip detection onto: a `finish` shortly after an `item:use` with `wild` or a `showcase`, for example.

## Adding a powerup

1. Create `src/sim/powerups/<name>.js` with a motion and a field, and register it:

   ```js
   import { powerups } from './registry.js';
   import { floorIt, kartsNear, pushAway } from './kit.js';

   powerups.register({
     id: 'tornado',
     name: 'TORNADO',              // HUD text: A–Z, 0–9, basic punctuation, 12 characters max
     short: 'TWISTR',              // 6 max: used in fused names like TWISTR+HOOK
     abbr: 'TOR',                  // 3 max: used when a fused name would be too long
     description: 'Spin forward, flinging everyone near you outward.',
     icon: 'tornado',              // key in src/render/icons.js
     weight: 1,                    // or (ctx) => number, e.g. more likely when behind
     opposite: null,               // an id here (and on the other one) makes the pair fizzle
     aiWants: ({ race, kart }) => race.track.bendBetween(kart.s, kart.s + 150) < 0.5, // optional
     motion: {
       name: 'SPIN',
       tags: ['boost'],
       duration: (power) => 1.2 * power,
       modifiers: (power) => ({ maxSpeed: 1.3 + 0.1 * power }),
       tick(m) { floorIt(m.kart); m.kart.heading += 0.2; },
     },
     field: {
       name: 'FLING',
       tick(m, dt) {
         for (const { kart } of kartsNear(m.race, m.kart.x, m.kart.y, 40 * Math.sqrt(m.fieldPower), m.kart)) {
           pushAway(kart, m.kart.x, m.kart.y, 200 * m.fieldPower * dt, m.race);
         }
       },
     },
   });
   ```

2. Add `import './<name>.js';` to `src/sim/powerups/index.js`.
3. Draw a 12×12 icon in `src/render/icons.js` (a missing icon shows as `?`, so it still works).
4. Optional: a sound in `audio/sound.js`, particles in `render/raceView.js`, a name for a fusion in `powerups/fusion.js` (`registerShowcase`).
5. If it puts something on the track, make an entity (see the comment at the top of `sim/entities.js`; `sim/hazards.js` has examples) and add how it looks to `render/entityArt.js`.
6. **It must help whoever uses it.** The test `every item and every fusion gets you further than not using one` checks that for every single item and every pair.
7. Use `m.rng` (or `ctx.rng`), never `Math.random`, for anything random, so seeds replay.
8. Try it: `?debug=1`, press its number to get it, use it. Then `npm run sim -- --runs 50` to see it in AI races.

It fuses with everything automatically: its motion with every other field, and every other motion with its field. Use `m.power` (motion) and `m.fieldPower` (field) so MEGA and WILD versions mean something.

**What a motion and a field receive:** a move `m` with `m.kart`, `m.race`, `m.rng`, `m.power`, `m.fieldPower`, `m.wild`, `m.data` (scratch space the motion and field share), `m.effect` (the live effect on the kart) and `m.stop()` (end the motion early). A motion can also have `onBump(m, other)` and `onWall(m, impact)`.

**What effects can change:** `modifiers` multiply the kart's `maxSpeed`, `accel`, `turnRate`, `grip`, `mass`, and `scale` (size: collision radius and drawing). `onTick(kart, dt, race)` runs every step before physics and can rewrite `kart.controls`. `tags` are free labels other code checks with `kart.effects.hasTag('…')`; the game reads `boost`, `air` (flies over karts and grass, can't be bumped), `phase` (passes through karts), `giant`, `ride`, `bumper`, `fall`, `spinout`. `stacking` decides what using the same effect twice does: `'refresh'` (default) extends it, `'stack'` adds a second copy, `'ignore'` does nothing.

## Adding a track

Copy `src/tracks/meadow.js`: a list of control points (clockwise or not, the first point is the start line), road width, curb and grass widths, rows of item boxes as fractions of the lap, tyre stacks (`obstacles: [{ at, lateral }]`, a fraction of the lap and pixels right of the centreline; put two at the same `at` to make a wall), and some scenery. Add it to the list in `test/track.test.js`; the tests check that no two stretches of road are close enough to cut between and that it fits in the world. (There's no track picker yet; the race scene uses Meadow Loop.)

## Tuning

Almost every feel number is in `src/config.js`: top speed, acceleration, grip, how heavy the steering gets at speed (`turnAtTopSpeed`), when a slide lets go (`slideAt`, `slideGrip`), how much grass slows you, wall bounce, item box respawn time, roulette length, slots, rocket speed, spin-out length, and the AI's skill range, how hard it dares corner, and how often it fuses. Tyre stack numbers (size, how heavy a kart has to be to shove one) are at the top of `src/sim/obstacles.js`. Fusion strengths (MEGA, FUSION, FIZZLE, WILD chance and power) are in `FUSION`. Each powerup's own numbers (boost strength, hook reach, blast radius, giant size) are at the top of its file.
