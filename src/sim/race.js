// The race: karts, track, entities and the rules (countdown, laps, positions, finish).
// It runs in fixed steps and has no idea a browser exists, so it runs the same in
// the game, in tests and in the headless simulator (npm run sim).

import { RACE, SURFACE, WALL, BUMP, SIM } from '../config.js';
import { Rng } from '../core/rng.js';
import { Events } from '../core/events.js';
import { loopDelta, sign } from '../core/math.js';
import { Track } from './track.js';
import { Kart, stepKart } from './kart.js';
import { placeItemBoxes } from './entities.js';
import './powerups/index.js';
import { useFrontItem, fuseFront, cycleHand } from './hand.js';
import { HumanController } from './controllers.js';
import { AIDriver } from '../ai/driver.js';

export const ROSTER = [
  { name: 'YOU', color: 'red' },
  { name: 'BOLT', color: 'blue' },
  { name: 'MOSS', color: 'green' },
  { name: 'SUNNY', color: 'yellow' },
  { name: 'PLUM', color: 'purple' },
  { name: 'RUST', color: 'orange' },
  { name: 'FROST', color: 'cyan' },
  { name: 'PIP', color: 'pink' },
  { name: 'DASH', color: 'grey' },
];

export class Race {
  /**
   * @param {object} opts
   * @param {object} opts.track      a track definition (src/tracks/*.js) or a Track
   * @param {number|string} [opts.seed]
   * @param {number} [opts.laps]
   * @param {number} [opts.rivals]   AI karts besides the human (or total karts minus one with no human)
   * @param {object|null} [opts.humanInput]  live input object; null makes every kart AI
   * @param {number} [opts.countdown] seconds of countdown (0 to start immediately)
   * @param {string[]|null} [opts.firstPickups] the human's first item boxes give these (first race)
   */
  constructor(opts) {
    this.track = opts.track instanceof Track ? opts.track : new Track(opts.track);
    this.seed = opts.seed ?? Math.floor(Math.random() * 1e9);
    this.rng = new Rng(this.seed);
    this.events = new Events();
    this.laps = opts.laps ?? RACE.laps;
    this.humanInput = opts.humanInput ?? null;

    this.phase = 'countdown'; // 'countdown' | 'racing' | 'done'
    this.countdownLeft = opts.countdown ?? RACE.countdownSeconds;
    if (this.countdownLeft <= 0) this.phase = 'racing';
    this.time = 0;            // race clock, starts at GO
    this.steps = 0;
    this.graceLeft = null;    // set when the human finishes
    this.finishOrder = [];

    const rivals = opts.rivals ?? RACE.rivals;
    const total = rivals + 1;
    const grid = this.track.startGrid(total);
    const aiRng = this.rng.fork('ai');
    this.karts = [];
    // The human starts at the back of the grid; rivals fill the front.
    for (let i = 0; i < total; i++) {
      const isPlayer = this.humanInput !== null && i === 0;
      const slot = grid[isPlayer ? total - 1 : this.humanInput ? i - 1 : i];
      const who = ROSTER[this.humanInput ? i : i + 1] ?? { name: `CPU${i}`, color: 'grey' };
      const kart = new Kart({ id: i, name: who.name, color: who.color, isPlayer, x: slot.x, y: slot.y, heading: slot.heading });
      kart.progress = slot.s;
      kart.s = this.track.project(slot.x, slot.y).s;
      kart.controller = isPlayer ? new HumanController(this.humanInput) : new AIDriver(aiRng.fork(`kart${i}`));
      this.karts.push(kart);
    }
    this.player = this.karts.find((k) => k.isPlayer) ?? null;
    if (this.player && opts.firstPickups?.length) {
      this.player.scriptedPickups = [...opts.firstPickups];
      this.player.tutorialFuse = true;
    }
    for (const kart of this.karts) this.applyTrack(kart);

    /** @type {any[]} */
    this.entities = [];
    for (const box of placeItemBoxes(this.track)) this.spawn(box);
    this.updatePositions();
  }

  /** The context object powerups receive (see src/sim/powerups/registry.js). */
  context(kart, extra = {}) {
    return {
      race: this,
      kart,
      rng: this.rng,
      events: this.events,
      spawn: (e) => this.spawn(e),
      position: kart.position,
      racers: this.karts.length,
      power: 1,
      item: null,
      ...extra,
    };
  }

  /** Karts still racing, best first. */
  stillRacing() {
    return this.order.filter((k) => !k.finished);
  }

  /** Karts still racing that are ahead of this one on the course, nearest first. */
  kartsAhead(kart) {
    return this.karts
      .filter((k) => k !== kart && !k.finished && k.progress > kart.progress)
      .sort((a, b) => a.progress - b.progress);
  }

  /** Karts still racing that are behind this one, nearest first. */
  kartsBehind(kart) {
    return this.karts
      .filter((k) => k !== kart && !k.finished && k.progress <= kart.progress)
      .sort((a, b) => b.progress - a.progress);
  }

  spawn(entity) {
    if (entity.alive === undefined) entity.alive = true;
    this.entities.push(entity);
    this.events.emit('entity:spawn', { entity });
    return entity;
  }

  /** Advance the race by one fixed step (normally 1/60 s). */
  step(dt = 1 / SIM.hz) {
    this.steps++;
    if (this.phase === 'countdown') {
      const before = Math.ceil(this.countdownLeft);
      this.countdownLeft -= dt;
      const after = Math.ceil(this.countdownLeft);
      if (after !== before && after > 0) this.events.emit('countdown', { n: after });
      if (this.countdownLeft <= 0) {
        this.phase = 'racing';
        this.events.emit('go', {});
      }
      for (const e of this.entities) e.update(dt, this);
      return;
    }

    this.time += dt;

    for (const kart of this.karts) this.stepOne(kart, dt);
    this.resolveBumps();

    for (const e of this.entities) {
      e.update(dt, this);
      if (e.onKartTouch && e.radius > 0) {
        for (const kart of this.karts) {
          if (!e.alive) break;
          if (!e.hitsAir && kart.effects.hasTag('air')) continue;
          if (!e.hitsPhase && kart.effects.hasTag('phase')) continue;
          const r = e.radius + kart.radius;
          const dx = kart.x - e.x;
          const dy = kart.y - e.y;
          if (dx * dx + dy * dy <= r * r) e.onKartTouch(kart, this);
        }
      }
    }
    if (this.entities.some((e) => !e.alive)) this.entities = this.entities.filter((e) => e.alive);

    for (const kart of this.karts) this.checkLaps(kart);
    this.updatePositions();
    this.checkEnd(dt);
  }

  stepOne(kart, dt) {
    const c = kart.controls;
    c.useItem = false;
    c.fuse = false;
    c.cycle = false;
    kart.controller?.update(kart, this, dt);

    for (const item of kart.items) if (item.roulette > 0) item.roulette = Math.max(0, item.roulette - dt);

    // Effects run after the controller, so they can override what the driver asked for.
    kart.effects.tick(kart, dt, this);

    // Hand actions, in this order, so "fuse then use" can happen in one step.
    if (c.cycle) cycleHand(kart, this);
    if (c.fuse) fuseFront(kart, this);
    if (c.useItem) useFrontItem(kart, this);

    // Karts in the air or phased out don't feel the grass.
    const floating = kart.effects.hasTag('air') || kart.effects.hasTag('phase');
    stepKart(kart, dt, floating ? SURFACE.road : SURFACE[kart.surface]);
    this.applyTrack(kart);
  }

  /** Track position, surface, the fence, and distance travelled. */
  applyTrack(kart) {
    const track = this.track;
    const p = track.project(kart.x, kart.y, kart.trackIndex);
    kart.trackIndex = p.index;
    let lateral = p.lateral;

    const limit = track.fenceOffset - kart.radius;
    if (Math.abs(lateral) > limit) {
      const side = sign(lateral);
      const over = Math.abs(lateral) - limit;
      const n = track.pointAt(p.s);
      kart.x -= n.nx * over * side;
      kart.y -= n.ny * over * side;
      const outward = (kart.vx * n.nx + kart.vy * n.ny) * side;
      if (outward > 0) {
        kart.vx -= (1 + WALL.bounce) * outward * side * n.nx;
        kart.vy -= (1 + WALL.bounce) * outward * side * n.ny;
        kart.vx *= WALL.scrub;
        kart.vy *= WALL.scrub;
        if (outward > 15) {
          kart.lastWallHit = this.time;
          this.events.emit('wall', { kart, impact: outward });
          kart.effects.notify('onWall', kart, this, outward);
        }
      }
      lateral = side * limit;
    }

    const prevS = kart.s;
    kart.s = p.s;
    kart.lateral = lateral;
    kart.surface = track.surfaceAt(lateral);
    kart.progress += loopDelta(prevS, kart.s, track.length);
  }

  resolveBumps() {
    const karts = this.karts;
    for (let i = 0; i < karts.length; i++) {
      for (let j = i + 1; j < karts.length; j++) {
        const a = karts[i];
        const b = karts[j];
        // Karts in the air fly over everyone; phased karts pass through.
        if (a.effects.hasTag('air') || b.effects.hasTag('air') || a.effects.hasTag('phase') || b.effects.hasTag('phase')) continue;
        // A hooked kart passes through the kart it's hooked to.
        if (a.effects.active.some((e) => e.target === b) || b.effects.active.some((e) => e.target === a)) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const r = a.radius + b.radius;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r * r || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const ma = a.stats().mass;
        const mb = b.stats().mass;
        const overlap = r - d;
        const total = ma + mb;
        a.x -= nx * overlap * (mb / total);
        a.y -= ny * overlap * (mb / total);
        b.x += nx * overlap * (ma / total);
        b.y += ny * overlap * (ma / total);
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const jImp = (-(1 + BUMP.restitution) * rv) / (1 / ma + 1 / mb);
          a.vx -= (jImp / ma) * nx;
          a.vy -= (jImp / ma) * ny;
          b.vx += (jImp / mb) * nx;
          b.vy += (jImp / mb) * ny;
          if (-rv > 12) {
            a.lastBump = b.lastBump = this.time;
            this.events.emit('bump', { a, b, impact: -rv });
          }
          if (-rv > 6) {
            a.effects.notify('onBump', a, b, this);
            b.effects.notify('onBump', b, a, this);
          }
        }
      }
    }
  }

  checkLaps(kart) {
    if (kart.finished) return;
    const laps = Math.floor(kart.progress / this.track.length);
    if (laps <= kart.lapsDone) return;
    kart.lapsDone = laps;
    const lapTime = this.time - kart.lapStartedAt;
    kart.lapStartedAt = this.time;
    kart.lapTimes.push(lapTime);
    this.events.emit('lap', { kart, lap: laps, lapTime });
    if (kart.lapsDone >= this.laps) {
      kart.finished = true;
      kart.finishTime = this.time;
      this.finishOrder.push(kart);
      // Finished karts cruise on autopilot.
      kart.controller = new AIDriver(this.rng.fork('autopilot'), { skill: 0.85 });
      this.events.emit('finish', { kart, place: this.finishOrder.length, time: this.time });
      if (kart.isPlayer) this.graceLeft = RACE.finishGraceSeconds;
    } else if (kart.lapsDone === this.laps - 1) {
      this.events.emit('final-lap', { kart });
    }
  }

  updatePositions() {
    const order = [...this.karts].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
    order.forEach((k, i) => (k.position = i + 1));
    this.order = order;
  }

  checkEnd(dt) {
    if (this.phase !== 'racing') return;
    const allDone = this.karts.every((k) => k.finished);
    if (this.graceLeft !== null) this.graceLeft -= dt;
    if (allDone || (this.graceLeft !== null && this.graceLeft <= 0)) {
      this.phase = 'done';
      this.events.emit('race:end', { results: this.results() });
    }
  }

  /** Standings, best first. */
  results() {
    return this.order.map((k) => ({
      id: k.id,
      name: k.name,
      color: k.color,
      isPlayer: k.isPlayer,
      position: k.position,
      finished: k.finished,
      time: k.finishTime,
      lapTimes: [...k.lapTimes],
      bestLap: k.lapTimes.length ? Math.min(...k.lapTimes) : null,
      lapsDone: k.lapsDone,
    }));
  }
}
