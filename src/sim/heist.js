// Heist: sets up the traffic and the cops, and keeps count of busts. See HEIST in
// src/config.js. Traffic and cops aren't racers: they don't count for positions.

import { HEIST } from '../config.js';
import { Kart } from './kart.js';
import { AIDriver } from '../ai/driver.js';
import { TireStack } from './obstacles.js';

const TRAFFIC_COLOURS = ['grey', 'brown', 'white', 'lime', 'cyan', 'yellow', 'green', 'orange', 'pink', 'purple'];

/** Add the traffic and the cops to a race (after its own karts exist). */
export function setupHeist(race, aiRng) {
  const track = race.track;
  const rng = aiRng.fork('heist');
  const start = race.player ? race.player.s : 0;
  let id = race.karts.length;
  // Traffic, spread round the lap (but not on top of the start), in random lanes.
  const n = HEIST.traffic;
  // (behind the start, leave room for the cops too)
  const usable = track.length - HEIST.clearStart - (HEIST.copStartGap + HEIST.cops * 30 + 80);
  for (let i = 0; i < n; i++) {
    const s = start + HEIST.clearStart + ((i + rng.range(0.2, 0.8)) / n) * usable;
    const lateral = rng.range(-track.halfWidth + 8, track.halfWidth - 8);
    const p = track.pointAt(s, lateral);
    const kart = new Kart({ id: id++, name: 'CAR', color: rng.pick(TRAFFIC_COLOURS), x: p.x, y: p.y, heading: p.angle });
    kart.traffic = true;
    kart.base.maxSpeed = rng.range(HEIST.trafficSpeedMin, HEIST.trafficSpeedMax);
    kart.vx = Math.cos(p.angle) * kart.base.maxSpeed;
    kart.vy = Math.sin(p.angle) * kart.base.maxSpeed;
    kart.progress = s - start;
    kart.s = track.project(p.x, p.y).s;
    const driver = new AIDriver(rng.fork(`car${i}`), { skill: 1, traffic: true });
    driver.laneBias = driver.lane = driver.laneTarget = lateral;
    kart.controller = driver;
    race.karts.push(kart);
  }
  // Cops, lined up behind you, parked until a few seconds after GO.
  const v2 = race.rules.heist >= 2;
  const v3 = race.rules.heist === 3;
  race.heist = { rng, nextId: id, cops: 0, lap: 0, speedUp: 1 };
  const copsAtStart = v2 ? HEIST.startCops2 : HEIST.cops;
  for (let i = 0; i < copsAtStart; i++) {
    // Heist 3: every other cop starts up the road ahead (and comes at you the wrong way).
    if (v3 && i % 2 === 1) addCop(race, start + HEIST.copAheadGap + i * 220, ((i % 3) - 1) * 14, HEIST.copDelay);
    else addCop(race, start - HEIST.copStartGap - i * 30, ((i % 3) - 1) * 14, HEIST.copDelay);
  }
  if (race.player) race.player.busts = 0;
  // Heist 2: every new lap brings more (and faster) cops, and roadblocks.
  if (v2 && race.player) {
    race.events.on('lap', ({ kart, lap }) => {
      if (kart !== race.player || kart.finished || lap >= race.laps) return;
      escalate(race, lap);
    });
  }
}

function addCop(race, s, lateral, parkedFor = 0) {
  const h = race.heist;
  const track = race.track;
  const start = race.player ? race.player.s - race.player.progress : 0; // where progress 0 is
  const p = track.pointAt(s, lateral);
  h.cops++;
  const kart = new Kart({ id: h.nextId++, name: `COP${h.cops}`, color: 'navy', x: p.x, y: p.y, heading: p.angle });
  kart.cop = true;
  kart.hunter = true;
  kart.base.maxSpeed *= HEIST.copSpeed * h.speedUp;
  kart.base.mass = HEIST.copMass;
  kart.s = track.project(p.x, p.y).s;
  kart.progress = race.player ? race.player.progress + (s - race.player.s) : s - start;
  kart.controller = new AIDriver(h.rng.fork(`cop${h.cops}`), { skill: HEIST.copSkill });
  const speed = parkedFor > 0 ? 0 : kart.base.maxSpeed * 0.8;
  kart.vx = Math.cos(p.angle) * speed;
  kart.vy = Math.sin(p.angle) * speed;
  if (parkedFor > 0) {
    kart.addEffect({
      id: 'parked',
      duration: parkedFor,
      onTick(k) {
        k.controls.throttle = 0;
        k.controls.brake = 1;
      },
    }, race);
  }
  race.karts.push(kart);
  return kart;
}

/** A new lap of a Heist 2: more cops, all of them faster, and roadblocks up ahead. */
function escalate(race, lap) {
  const h = race.heist;
  const p = race.player;
  const track = race.track;
  h.speedUp += HEIST.copSpeedPerLap;
  for (const k of race.karts) if (k.cop) k.base.maxSpeed *= (h.speedUp) / (h.speedUp - HEIST.copSpeedPerLap);
  const newCops = HEIST.copsPerLap[lap] ?? HEIST.copsPerLap[HEIST.copsPerLap.length - 1];
  const v3 = race.rules.heist === 3;
  for (let i = 0; i < newCops; i++) {
    if (v3 && i % 2 === 1) addCop(race, p.s + HEIST.copAheadGap + i * 180, ((i % 3) - 1) * 16);
    else addCop(race, p.s - HEIST.copArriveBehind - i * 30, ((i % 3) - 1) * 16);
  }
  const blocks = HEIST.roadblocksPerLap[lap] ?? HEIST.roadblocksPerLap[HEIST.roadblocksPerLap.length - 1];
  const span = track.length - HEIST.roadblockAhead - 300;
  for (let i = 0; i < blocks; i++) addRoadblock(race, p.s + HEIST.roadblockAhead + ((i + h.rng.range(0.2, 0.8)) / blocks) * span);
  race.events.emit('heist:escalate', { lap: lap + 1, cops: race.karts.filter((k) => k.cop).length, roadblocks: blocks });
  race.events.emit('toast', { kart: p, text: `LAP ${lap + 1}: +${newCops} COPS, ${blocks} ROADBLOCKS AHEAD`, colour: 'bad' });
}

/** A row of tyre stacks right across the track (curb to fence) with one gap in it. */
function addRoadblock(race, s) {
  if (race.rules.heist === 3) return addScatteredRoadblock(race, s);
  const track = race.track;
  const h = race.heist;
  const edge = track.fenceOffset - 4;
  const gapAt = h.rng.range(-track.halfWidth + HEIST.roadblockGap / 2 + 4, track.halfWidth - HEIST.roadblockGap / 2 - 4);
  for (let lat = -edge; lat <= edge; lat += HEIST.roadblockSpacing) {
    if (Math.abs(lat - gapAt) < HEIST.roadblockGap / 2 + 6) continue;
    const stack = new TireStack(track, s, lat);
    stack.roadblock = true;
    race.spawn(stack);
  }
}

/** A cop spun the player: count the bust, and end the run on the last one. */
export function bust(race, cop) {
  const p = race.player;
  p.busts = (p.busts ?? 0) + 1;
  cop.huntCooldownUntil = race.time + HEIST.copCooldown;
  race.events.emit('heist:bust', { kart: p, by: cop, busts: p.busts, of: HEIST.busts });
  if (p.busts >= HEIST.busts) {
    p.caught = true;
    race.events.emit('heist:caught', { kart: p });
    race.phase = 'done';
    race.updatePositions();
    race.events.emit('race:end', { results: race.results() });
  } else {
    race.events.emit('toast', { kart: p, text: `BUSTED! ${p.busts}/${HEIST.busts}`, colour: 'bad' });
  }
}

/**
 * Heist 3 roadblock: not a neat line. Two or three staggered rows, each with its gap in a
 * different place, every stack nudged about, and a few loose ones in between: you have to
 * weave through it (which is what the time warp is for).
 */
function addScatteredRoadblock(race, s) {
  const track = race.track;
  const h = race.heist;
  const rng = h.rng;
  const edge = track.fenceOffset - 4;
  const rows = rng.int(2, 3);
  const half = HEIST.roadblockGap / 2 + 6;
  let lastGap = null;
  for (let r = 0; r < rows; r++) {
    const rowS = s + r * HEIST.scatterRowGap;
    // A gap on the other side of the road from the last row's, so the way through zigzags.
    const reach = track.halfWidth - half;
    const gapAt = lastGap === null ? rng.range(-reach, reach) : -Math.sign(lastGap || 1) * rng.range(reach * 0.3, reach);
    lastGap = gapAt;
    for (let lat = -edge; lat <= edge; lat += HEIST.roadblockSpacing) {
      if (Math.abs(lat - gapAt) < half) continue;
      if (rng.chance(0.15)) continue; // the odd missing stack
      const stack = new TireStack(track, rowS + rng.range(-6, 6), lat + rng.range(-3, 3));
      stack.roadblock = true;
      race.spawn(stack);
    }
  }
  // A few loose stacks between the rows.
  for (let i = 0; i < 3; i++) {
    const stack = new TireStack(track, s + rng.range(8, (rows - 1) * HEIST.scatterRowGap), rng.range(-track.halfWidth + 10, track.halfWidth - 10));
    stack.roadblock = true;
    race.spawn(stack);
  }
}
