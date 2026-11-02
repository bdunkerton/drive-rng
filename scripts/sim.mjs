// Run AI-only races with no screen and print what happened.
//
//   npm run sim                         one race, seed 1
//   npm run sim -- --seed 42 --laps 1   a specific race
//   npm run sim -- --runs 50            50 races (seeds 1..50), summary only
//   npm run sim -- --karts 8            a full grid
//
// Useful for checking a new powerup does what it should and isn't wildly unbalanced.

import { simulateRace } from '../src/sim/headless.js';
import { formatTime } from '../src/render/hud.js';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const seedArg = opt('seed', '1');
const laps = Number(opt('laps', 3));
const karts = Number(opt('karts', 4));
const runs = Number(opt('runs', 1));

function runOne(seed) {
  const stats = { pickups: {}, uses: {}, walls: 0, bumps: 0 };
  const { race, results, timedOut } = simulateRace({
    seed,
    laps,
    karts,
    onSetup(r) {
      r.events.on('item:pickup', ({ item }) => (stats.pickups[item] = (stats.pickups[item] ?? 0) + 1));
      r.events.on('item:use', ({ item }) => (stats.uses[item] = (stats.uses[item] ?? 0) + 1));
      r.events.on('wall', () => stats.walls++);
      r.events.on('bump', () => stats.bumps++);
    },
  });
  return { race, results, timedOut, stats };
}

if (runs === 1) {
  const seed = /^\d+$/.test(seedArg) ? Number(seedArg) : seedArg;
  const { race, results, timedOut, stats } = runOne(seed);
  console.log(`\nDrive RNG sim  ·  ${race.track.name}  ·  seed ${seed}  ·  ${laps} laps  ·  ${karts} karts\n`);
  console.log('  POS  RACER    TIME       BEST LAP   LAPS');
  for (const r of results) {
    const time = r.finished ? formatTime(r.time) : 'DNF      ';
    console.log(`  ${String(r.position).padEnd(4)} ${r.name.padEnd(8)} ${time.padEnd(10)} ${formatTime(r.bestLap).padEnd(10)} ${r.lapTimes.map((t) => t.toFixed(2)).join('  ')}`);
  }
  console.log(`\n  items picked up: ${JSON.stringify(stats.pickups)}`);
  console.log(`  items used:      ${JSON.stringify(stats.uses)}`);
  console.log(`  wall hits: ${stats.walls}   bumps: ${stats.bumps}`);
  if (timedOut) console.log('\n  !! The race timed out before every kart finished.');
  console.log('');
  process.exitCode = timedOut ? 1 : 0;
} else {
  const wins = {};
  const totals = {};
  const uses = {};
  let timeouts = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const { results, timedOut, stats } = runOne(seed);
    if (timedOut) timeouts++;
    wins[results[0].name] = (wins[results[0].name] ?? 0) + 1;
    for (const r of results) if (r.finished) (totals[r.name] ??= []).push(r.time);
    for (const [k, v] of Object.entries(stats.uses)) uses[k] = (uses[k] ?? 0) + v;
  }
  console.log(`\nDrive RNG sim  ·  ${runs} races  ·  ${laps} laps  ·  ${karts} karts\n`);
  console.log('  RACER    WINS   AVG TIME');
  for (const name of Object.keys(totals).sort()) {
    const t = totals[name];
    console.log(`  ${name.padEnd(8)} ${String(wins[name] ?? 0).padEnd(6)} ${formatTime(t.reduce((a, b) => a + b, 0) / t.length)}`);
  }
  console.log(`\n  items used per race: ${Object.entries(uses).map(([k, v]) => `${k} ${(v / runs).toFixed(1)}`).join(', ') || 'none'}`);
  console.log(`  timeouts: ${timeouts}\n`);
  process.exitCode = timeouts ? 1 : 0;
}
