// Heist: sets up the traffic and the cops, and keeps count of busts. See HEIST in
// src/config.js. Traffic and cops aren't racers: they don't count for positions.

import { HEIST } from '../config.js';
import { Kart } from './kart.js';
import { AIDriver } from '../ai/driver.js';

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
  for (let i = 0; i < HEIST.cops; i++) {
    const s = start - HEIST.copStartGap - i * 30;
    const p = track.pointAt(s, (i - 1) * 14);
    const kart = new Kart({ id: id++, name: `COP${i + 1}`, color: 'navy', x: p.x, y: p.y, heading: p.angle });
    kart.cop = true;
    kart.hunter = true;
    kart.base.maxSpeed *= HEIST.copSpeed;
    kart.base.mass = HEIST.copMass;
    kart.progress = s - start;
    kart.s = track.project(p.x, p.y).s;
    kart.controller = new AIDriver(rng.fork(`cop${i}`), { skill: HEIST.copSkill });
    kart.addEffect({
      id: 'parked',
      duration: HEIST.copDelay,
      onTick(k) {
        k.controls.throttle = 0;
        k.controls.brake = 1;
      },
    }, race);
    race.karts.push(kart);
  }
  if (race.player) race.player.busts = 0;
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
