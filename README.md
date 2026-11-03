# Drive RNG

A top-down pixel kart racer where the items are the point. One track, three AI rivals, ten powerups, and a hand of item slots where you can fuse powerups together into combos, copy them, double them and steal them.

Plain JavaScript in the browser. No build step and no dependencies.

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
| C (or R) | Move the front item to the back |
| P / Esc | Pause |
| M | Mute |
| ` (backtick) | Debug overlay |

Drive through a **?** box to get an item. It spins for a moment, then settles into a slot at the top of the screen. The gold-framed slot on the left is your **front** item: Space uses it.

## Powerups

You start with **2 item slots** (TAKE TWO can grow that to 4). A full hand smashes boxes without picking anything up.

| # | Powerup | Does |
| --- | --- | --- |
| 1 | **BOOST** | A burst of speed for 1.5 seconds. |
| 2 | **SWAP** | Trade places with whoever is in 1st, laps and all. In 1st already? The 2nd-place and last-place karts trade instead. Never rolls for the leader. |
| 3 | **TAKE TWO** | Doubles your item slots (2 → 4) and your next box gives you two of whatever it rolls. |
| 4 | **COPY** | Duplicates every other item in your hand. Empty hand? It copies the hand of the kart just ahead. |
| 5 | **ROCKET** | Follows the road, chases down the kart ahead and spins it out. |
| 6 | **BANANA** | Drops a peel behind you. Anyone who drives over it spins out — you too, if you circle back. |
| 7 | **SHIELD** | A bubble for 8 seconds that blocks one hit, swap or steal. |
| 8 | **MAGNET** | Steals the front item of the nearest kart ahead that has one. |
| 9 | **GROW** | Giant for 5 seconds: twice the size, heavy, a bit faster, can't be spun out, squashes bananas. |
| 0 | **CHAOS** | Fires a random other powerup. A quarter of the time it backfires and a random rival gets it instead. |

The numbers are the debug keys (see below).

### Fusing and combos

Press **F** to fuse your front two items into one. Everything fuses with everything (up to 4 powerups in one item):

- **Two of the same** make a stronger one: SUPER (×2), ULTRA (×3), MAX (×4). SUPER BOOST lasts longer and goes faster, SUPER ROCKET fires one at each of the next two karts, SUPER BANANA drops a row, SUPER SHIELD blocks two hits, SUPER MAGNET robs two karts, SUPER SWAP trades hands too, SUPER CHAOS rolls two different powerups, SUPER TAKE TWO makes your next box give three, SUPER COPY copies everything twice.
- **Two different ones** do both at once: BOOST+ROCKET boosts and fires. Order is sensible: TAKE TWO always goes first (so you have room), COPY always goes last (so it copies what's left).
- **Recipes** are named combos that do something neither part does alone:

| Recipe | Fuse | Does |
| --- | --- | --- |
| **RAM** | BOOST + SHIELD | A shielded boost. Anyone you bump while it lasts spins out. |
| **STAMPEDE** | BOOST + GROW | A boosting giant that spins out whoever it touches. |
| **HEIST** | ROCKET + MAGNET | A rocket that also steals the victim's front item. |
| **DECOY** | SWAP + BANANA | Swap with the leader and leave bananas right in front of them. |

A recipe plus anything else still works (RAM+ROCKET is a ram and a rocket), and recipes level up too (SUPER DECOY).

Some things that play together: COPY a fused combo to get two of it; COPY with a full hand fuses the copies onto your last item and powers it up; TAKE TWO then COPY fills all four slots; a MAGNET can steal someone's fused combo; a SHIELD stops a SWAP, a steal and a HEIST; CHAOS can roll any of it, for anyone.

The rivals play the same game: they pick up, fuse, cycle and use items, and each powerup tells them when it's worth using (a rocket when someone's in range, a magnet when someone has something to steal).

### URL options

Add these to the address, e.g. `http://localhost:8080/?quick=1&laps=1&seed=banana`.

| Option | Does |
| --- | --- |
| `quick=1` | Skip the title screen and start racing |
| `laps=N` | Laps per race, 1–9 |
| `rivals=N` | AI rivals, 0–7 |
| `seed=anything` | Fixed seed: rivals and item rolls repeat exactly (as long as you drive the same) |
| `debug=1` | Start with the debug overlay on |

### Debug overlay

Press backtick. You'll see the track centreline (white dots), the racing line the rivals follow (cyan), the fence (red), a yellow line from each rival to the point it's aiming at, and live numbers for your kart. It also lists every powerup: press its number (1–9, and 0 for the tenth) to put it straight into your hand, ready to use. Press the same number twice and then F to make a SUPER. Your hand is listed in the panel too, and a red line shows where each rocket is heading.

## Check it without playing

```
npm test                          # unit tests, a few seconds
npm run sim                       # one AI-only race, seed 1, printed as a table
npm run sim -- --seed 42 --laps 1
npm run sim -- --runs 50          # 50 races: wins, average times, items used, fuses, hits, swaps, steals
npm run sim -- --karts 8
```

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
    effects.js         timed effects on karts (what most powerups add)
    hand.js            the items a kart holds: slots, fusing, cycling, using, combo names
    hits.js            spin-outs, shields and stealing, shared by everything that hurts
    entities.js        things on the track: item boxes
    hazards.js         rockets and bananas
    toast.js           short messages for one driver ("HIT BY BOLT!")
    controllers.js     human controller (reads an input object) and an idle one
    headless.js        run a whole race without a screen
    powerups/          registry.js, index.js, one file per powerup, recipes.js (named combos)
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
3. **Kart-to-kart bumps** (and RAM hits).
4. **Entities** update, and any kart overlapping an entity's `radius` triggers its `onKartTouch`.
5. **Laps**, **positions**, and whether the race is over.

### Events

The race emits events on `race.events`. Rendering, sound and the HUD listen; powerups can emit their own.

- Race: `countdown`, `go`, `lap`, `final-lap`, `finish`, `race:end`
- Hand: `item:box`, `item:pickup`, `item:use` (`{ kart, item, name, parts, recipe }`), `item:fuse`, `item:cycle`
- Powerups: `swap`, `copy`, `steal`, `magnet`, `chaos`, `rocket:fire`, `rocket:hit`, `rocket:fizzle`, `banana:drop`, `banana:squash`
- Hits: `hit` (a spin-out landed), `hit:shrug` (a giant ignored it), `shield:pop`
- Other: `effect:start`, `effect:end`, `entity:spawn`, `wall`, `bump`
- `sfx` (`{ name, kart }` plays a sound from `audio/sound.js`), `toast` (`{ kart, text, colour }` shows a message if that kart is the player)

## Adding a powerup

1. Create `src/sim/powerups/<name>.js` and register it:

   ```js
   import { powerups } from './registry.js';
   import { toast } from '../toast.js';

   powerups.register({
     id: 'super-grip',
     name: 'GRIP',                 // HUD text: A–Z, 0–9, basic punctuation, 12 characters max
     short: 'GRIP',                // 6 max: used in "SUPER GRIP" and in combo names
     abbr: 'GRP',                  // 3 letters: used when a combo name would be too long
     description: 'Corners like it is on rails for 4 seconds.',
     icon: 'grip',                 // key in src/render/icons.js
     weight: 1,                    // or (ctx) => number, e.g. more likely when behind
     order: 50,                    // inside a fused item, lower runs first
     aiWants: ({ race, kart }) => race.track.bendBetween(kart.s, kart.s + 150) > 1, // optional
     use({ kart, race, power }) {  // power: 1 normally, 2 for SUPER, 3 ULTRA, 4 MAX
       kart.addEffect({ id: 'super-grip', duration: 4 * power, modifiers: { grip: 3, turnRate: 1.3 }, tags: ['grip'] }, race);
       race.events.emit('sfx', { name: 'boost', kart });
       toast(race, kart, 'GRIP!', 'gold');
     },
   });
   ```

2. Add `import './<name>.js';` to `src/sim/powerups/index.js`.
3. Draw a 12×12 icon in `src/render/icons.js` (a missing icon shows as `?`, so it still works).
4. Optional: a sound in `audio/sound.js`, particles in `render/raceView.js`.
5. If it puts something on the track, make an entity (see the comment at the top of `sim/entities.js`; `sim/hazards.js` has the rocket and banana as examples) and add how it looks to `render/entityArt.js`. Unknown entity kinds draw as a magenta square so nothing is invisible by accident.
6. If it knocks karts about, go through `hitKart` in `sim/hits.js` so shields and giants work. To take items, use `stealItem`. To give items, use `giveItem` from `sim/hand.js`.
7. Use `ctx.rng`, never `Math.random`, for anything random, so seeds replay.
8. Try it: `?debug=1`, press its number to get it, use it. Then `npm run sim -- --runs 50` to see it in AI races.

It fuses with everything automatically. Use `power` so SUPER/ULTRA versions mean something.

**Adding a recipe** (a named combo): in `powerups/recipes.js`, `powerups.registerRecipe({ id, name, abbr, parts: ['a', 'b'], description, use(ctx) })`. `ctx.parts` lists the recipe's parts with their power, and `ctx.runParts()` runs the parts' normal effects if you want them as well as your extra.

**What effects can change:** `modifiers` multiply the kart's `maxSpeed`, `accel`, `turnRate`, `grip`, `mass`, and `scale` (size: collision radius and drawing). `onTick(kart, dt, race)` runs every step before physics and can rewrite `kart.controls` (reverse the steering, force a brake…). `tags` are free labels that rendering and other code can check with `kart.effects.hasTag('…')`; the game already reads `boost`, `shield`, `giant`, `spinout` and `ram`. `stacking` decides what using the same effect twice does: `'refresh'` (default) extends it, `'stack'` adds a second copy, `'ignore'` does nothing.

**What powerups receive:** `ctx.race`, `ctx.kart`, `ctx.power`, `ctx.item`, `ctx.rng`, `ctx.events`, `ctx.spawn(entity)`, `ctx.position` (1 = leading), `ctx.racers`. Handy race helpers: `race.stillRacing()`, `race.kartsAhead(kart)`, `race.kartsBehind(kart)` (nearest first).

## Adding a track

Copy `src/tracks/meadow.js`: a list of control points (clockwise or not, the first point is the start line), road width, curb and grass widths, rows of item boxes as fractions of the lap, and some scenery. Add it to the list in `test/track.test.js`; the tests check that no two stretches of road are close enough to cut between and that it fits in the world. (There's no track picker yet; the race scene uses Meadow Loop.)

## Tuning

Almost every feel number is in `src/config.js`: top speed, acceleration, grip, how much grass slows you, wall bounce, item box respawn time, roulette length, slots, rocket speed, spin-out length, and the AI's skill range, caution and how often it fuses. Each powerup's own numbers (boost strength, shield time, giant size, chaos backfire chance) are at the top of its file.
