# Kartwheel

A top-down pixel kart racer. One track, three AI rivals, item boxes and a single item (a speed boost) — built so that the items can grow into a big pile of random, chaotic powerups.

Plain JavaScript in the browser. No build step and no dependencies.

## Play it

You need [Node.js](https://nodejs.org) 18 or newer.

```
npm start
```

Then open the address it prints (normally `http://localhost:8080`).

**In VS Code:** run `npm start` in the integrated terminal (or *Terminal → Run Task → Kartwheel: start game server*), then press `Ctrl+Shift+P`, choose **Simple Browser: Show**, and paste the address. Click inside the game once so it gets the keyboard.

No Node? `python -m http.server 8080` in this folder works too (tests and the simulator need Node). Opening `index.html` straight from disk won't work, because browsers block modules on `file://`.

### Controls

| Key | Does |
| --- | --- |
| Up / W | Accelerate |
| Down / S | Brake, then reverse |
| Left, Right / A, D | Steer |
| Space (or E, X) | Use your item |
| P / Esc | Pause |
| M | Mute |
| ` (backtick) | Debug overlay |

Drive through a **?** box to get an item. It spins for a moment, then shows in the slot at the top of the screen; press Space to use it.

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

Press backtick. You'll see the track centreline (white dots), the racing line the rivals follow (cyan), the fence (red), a yellow line from each rival to the point it's aiming at, and live numbers for your kart. It also lists every powerup: press its number (1–9) to put it straight into your item slot.

## Check it without playing

```
npm test                          # unit tests, a few seconds
npm run sim                       # one AI-only race, seed 1, printed as a table
npm run sim -- --seed 42 --laps 1
npm run sim -- --runs 50          # 50 races: wins, average times, items used
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
    entities.js        things on the track; item boxes are the first kind
    controllers.js     human controller (reads an input object) and an idle one
    headless.js        run a whole race without a screen
    powerups/          registry.js, index.js, one file per powerup
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
   1. its **controller** writes `kart.controls` (`throttle`, `brake`, `steer`, `useItem`);
   2. the item roulette timer counts down;
   3. **effects tick** — they run *after* the controller, so an effect may override controls (the boost forces the throttle on);
   4. if `useItem` and the item is ready, the **powerup's `use(ctx)`** runs;
   5. **physics** moves the kart, then the **track** works out its surface, pushes it off the fence and adds to its distance travelled.
3. **Kart-to-kart bumps.**
4. **Entities** update, and any kart overlapping an entity's `radius` triggers its `onKartTouch`.
5. **Laps**, **positions**, and whether the race is over.

### Events

The race emits events on `race.events`. Rendering, sound and the HUD listen; powerups can emit their own.

`countdown`, `go`, `lap`, `final-lap`, `finish`, `race:end`, `item:box`, `item:pickup`, `item:use`, `effect:start`, `effect:end`, `entity:spawn`, `wall`, `bump`, `sfx` (`{ name, kart }` plays a sound from `audio/sound.js`).

## Adding a powerup

1. Create `src/sim/powerups/<name>.js` and register it:

   ```js
   import { powerups } from './registry.js';

   powerups.register({
     id: 'super-grip',
     name: 'GRIP',                 // HUD text: A–Z, 0–9, basic punctuation, 12 characters max
     description: 'Corners like it is on rails for 4 seconds.',
     icon: 'grip',                 // key in src/render/icons.js
     weight: 1,                    // or (ctx) => number, e.g. more likely when behind
     use({ kart, race, rng, spawn }) {
       kart.addEffect({ id: 'super-grip', duration: 4, modifiers: { grip: 3, turnRate: 1.3 }, tags: ['grip'] }, race);
       race.events.emit('sfx', { name: 'boost', kart });
     },
   });
   ```

2. Add `import './<name>.js';` to `src/sim/powerups/index.js`.
3. Draw a 12×12 icon in `src/render/icons.js` (a missing icon shows as `?`, so it still works).
4. Optional: a sound in `audio/sound.js`, particles in `render/raceView.js`.
5. If it puts something on the track (a shell, an oil slick), make an entity (see the comment at the top of `sim/entities.js`) and add how it looks to `render/entityArt.js`. Unknown entity kinds draw as a magenta square so nothing is invisible by accident.
6. Use `ctx.rng`, never `Math.random`, for anything random, so seeds replay.
7. Try it: `?debug=1`, press its number to get it, use it. Then `npm run sim -- --runs 50` to see it in AI races.

**What effects can change:** `modifiers` multiply the kart's `maxSpeed`, `accel`, `turnRate`, `grip` and `mass`. `onTick(kart, dt, race)` runs every step before physics and can rewrite `kart.controls` (reverse the steering, force a brake…). `tags` are free labels that rendering and other code can check with `kart.effects.hasTag('…')`. `stacking` decides what using the same effect twice does: `'refresh'` (default) extends it, `'stack'` adds a second copy, `'ignore'` does nothing.

**What powerups receive:** `ctx.race`, `ctx.kart`, `ctx.rng`, `ctx.events`, `ctx.spawn(entity)`, `ctx.position` (1 = leading), `ctx.racers`.

## Adding a track

Copy `src/tracks/meadow.js`: a list of control points (clockwise or not, the first point is the start line), road width, curb and grass widths, rows of item boxes as fractions of the lap, and some scenery. Add it to the list in `test/track.test.js`; the tests check that no two stretches of road are close enough to cut between and that it fits in the world. (There's no track picker yet; the race scene uses Meadow Loop.)

## Tuning

Almost every feel number is in `src/config.js`: top speed, acceleration, grip, how much grass slows you, wall bounce, item box respawn time, roulette length, and the AI's skill range and caution.
