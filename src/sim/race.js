// The race: karts, track, entities and the rules (countdown, laps, positions, finish).
// It runs in fixed steps and has no idea a browser exists, so it runs the same in
// the game, in tests and in the headless simulator (npm run sim).

import { RACE, SURFACE, WALL, BUMP, SIM, DRAFT, RAM, HITS, LEAP, BILLIARDS, FOCUS, SLINGSHOT, HUNT, TIMEBOMB, POTATO, ROYALE } from '../config.js';
import { Rng } from '../core/rng.js';
import { Events } from '../core/events.js';
import { loopDelta, sign } from '../core/math.js';
import { Track } from './track.js';
import { Kart, stepKart } from './kart.js';
import { placeItemBoxes } from './entities.js';
import { placeObstacles, resolveSolids } from './obstacles.js';
import './powerups/index.js';
import { useFrontItem, fuseFront, cycleHand } from './hand.js';
import { HumanController } from './controllers.js';
import { hitKart } from './hits.js';
import { Potato } from './potato.js';
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
  { name: 'ACE', color: 'white' },
  { name: 'ZIP', color: 'lime' },
  { name: 'TANK', color: 'brown' },
  { name: 'NOVA', color: 'navy' },
];

/** Mechanics a race can switch on or off. */
export const DEFAULT_RULES = {
  draft: true,      // slipstream behind other karts
  ram: true,        // nose hits off-centre spin the target
  potato: false,    // the hot potato (default depends on items, see the constructor)
  leapfrog: false,  // drive into a spinning kart to vault over it
  billiards: false, // rams hand your speed to the target, which can spin whoever it hits
  focus: false,     // near misses fill FOCUS; hold it for slow motion
  slingshot: false, // drafting only keeps pace and builds charge; pulling out fires a burst
  hunters: 0,       // this many rivals hunt the player (and their rams can spin you)
  timebomb: false,  // hold FOCUS: the world crawls, karts you touch are charged, then go off
  royale: false,    // potato elimination: a boom knocks you out, last kart standing wins
};

const rubberOf = (k) => k.effects.active.find((e) => e.id === 'rubber')?.bounce ?? 0;

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
   * @param {boolean} [opts.items]  false: no item boxes at all, just driving (default true)
   * @param {boolean} [opts.potato]  the hot potato mode (default: on when items are off)
   * @param {object} [opts.rules]  which mechanics are on: draft, ram, potato, leapfrog,
   *   billiards, focus (see DEFAULT_RULES). The playtest lab's scenarios set these.
   * @param {boolean} [opts.obstacles]  tyre stacks on the track (default: only when items are on)
   */
  constructor(opts) {
    this.track = opts.track instanceof Track ? opts.track : new Track(opts.track);
    this.seed = opts.seed ?? Math.floor(Math.random() * 1e9);
    this.rng = new Rng(this.seed);
    this.events = new Events();
    this.laps = opts.laps ?? RACE.laps;
    this.humanInput = opts.humanInput ?? null;
    this.itemsOn = opts.items ?? true;
    // Tyre stacks are there for items to play with (giants shove them, springs clear them).
    this.obstaclesOn = opts.obstacles ?? this.itemsOn;
    this.rules = { ...DEFAULT_RULES, potato: opts.potato ?? !this.itemsOn, ...opts.rules };
    // Potatoes: one normally; Potato Royale adds more as karts drop out (see eliminate).
    if (this.rules.royale) this.laps = 999; // royale ends when one kart is left, not on laps
    this.potatoes = this.rules.potato || this.rules.royale ? [new Potato(this, { royale: this.rules.royale })] : [];
    this.potato = this.potatoes[0] ?? null;
    this.out = []; // Royale: karts knocked out, in order

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
    if (this.rules.slingshot) for (const k of this.karts) k.draftTop = SLINGSHOT.inWake;
    this.bullet = { active: false, charged: [] };
    if (this.rules.timebomb && this.player) this.player.focus = TIMEBOMB.startWith;
    // Hunters: the rivals starting nearest the back (closest to you) come after you.
    if (this.rules.hunters && this.player) {
      const rivals = this.karts.filter((k) => !k.isPlayer).sort((a, b) => a.progress - b.progress);
      for (const k of rivals.slice(0, this.rules.hunters)) {
        k.hunter = true;
        k.controller = new AIDriver(aiRng.fork(`hunter${k.id}`), { skill: HUNT.skill });
      }
    }
    if (this.player && opts.firstPickups?.length) {
      this.player.scriptedPickups = [...opts.firstPickups];
      this.player.tutorialFuse = true;
    }
    for (const kart of this.karts) this.applyTrack(kart);

    /** @type {any[]} */
    this.entities = [];
    if (this.itemsOn) for (const box of placeItemBoxes(this.track)) this.spawn(box);
    if (this.obstaclesOn) for (const stack of placeObstacles(this.track)) this.spawn(stack);
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

  /** The potato this kart is holding, if any. */
  potatoOf(kart) {
    return kart.hasPotato ? (this.potatoes.find((p) => p.holder === kart) ?? null) : null;
  }

  /** Royale: how many potatoes there should be for the karts still in. */
  wantedPotatoes() {
    const left = this.karts.length;
    return Math.max(1, Math.min(1 + this.out.length, ROYALE.maxPotatoes, Math.floor(left / ROYALE.kartsPerPotato)));
  }

  /** Royale: knock a kart out of the race. It leaves the track; more potatoes may join. */
  eliminate(kart) {
    if (kart.out) return;
    for (const p of this.potatoes) if (p.holder === kart) p.drop();
    kart.out = true;
    kart.outAt = this.time;
    kart.hasPotato = false;
    this.karts = this.karts.filter((k) => k !== kart);
    this.out.push(kart);
    const left = this.karts.length;
    this.events.emit('royale:out', { kart, left });
    if (this.player && !kart.isPlayer) this.events.emit('toast', { kart: this.player, text: `${kart.name} IS OUT! ${left} LEFT`, colour: 'gold' });
    if (kart.isPlayer) this.events.emit('toast', { kart, text: 'BOOM! YOU ARE OUT!', colour: 'bad' });
    // Escalate: add potatoes up to the number wanted for the karts left.
    const live = this.potatoes.filter((p) => !p.retired).length;
    for (let i = live; i < this.wantedPotatoes(); i++) {
      this.potatoes.push(new Potato(this, { royale: true, respawnIn: POTATO.respawnSeconds + 0.5 * i }));
      this.events.emit('royale:potato', { count: i + 1 });
    }
    if (left <= 1 || kart.isPlayer) this.endRoyale();
  }

  /** Royale is over (one kart left, or the player is out): the survivors finish in order. */
  endRoyale() {
    this.updatePositions();
    for (const k of this.order) {
      if (k.out || k.finished) continue;
      k.finished = true;
      k.finishTime = this.time;
      this.finishOrder.push(k);
    }
    this.phase = 'done';
    this.updatePositions();
    this.events.emit('race:end', { results: this.results() });
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
        if (this.rules.hunters && this.player) this.events.emit('toast', { kart: this.player, text: `${this.rules.hunters} HUNTERS ARE AFTER YOU!`, colour: 'bad' });
      }
      for (const e of this.entities) e.update(dt, this);
      return;
    }

    this.time += dt;

    if (this.rules.draft) this.updateDrafts(dt);
    if (this.rules.timebomb) this.updateTimeBomb(dt);
    const slow = this.bullet.active;
    for (const kart of this.karts) {
      const scale = !slow ? 1 : kart === this.player ? TIMEBOMB.playerScale : TIMEBOMB.worldScale;
      this.stepOne(kart, dt * scale);
    }
    this.resolveBumps();
    if (this.rules.focus || (this.rules.timebomb && !this.bullet.active)) this.updateFocus(dt);
    for (const p of this.potatoes) p.step(dt);
    resolveSolids(this);

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

  /**
   * Drafting. Every kart leaves a wake behind it: a narrow cone that widens further back.
   * A kart sitting in someone's wake, pointing the same way, fills its draft; out of the
   * wake the draft fades. Draft raises top speed and acceleration (see Kart.stats).
   */
  updateDrafts(dt) {
    for (const k of this.karts) {
      let leader = null;
      let bestAlong = Infinity;
      const grounded = !k.effects.hasTag('air') && !k.effects.has('spinout');
      if (grounded && !k.finished) {
        const hk = k.heading;
        for (const l of this.karts) {
          if (l === k || l.effects.hasTag('air') || l.effects.has('spinout')) continue;
          if (l.speed < DRAFT.leaderMinSpeed) continue;
          const fx = Math.cos(l.heading);
          const fy = Math.sin(l.heading);
          if (Math.cos(hk - l.heading) < DRAFT.align) continue;
          const dx = k.x - l.x;
          const dy = k.y - l.y;
          const along = -(dx * fx + dy * fy) - k.radius - l.radius; // gap behind l's tail
          if (along < -k.radius || along > DRAFT.range) continue;
          const lateral = Math.abs(dx * -fy + dy * fx);
          if (lateral > DRAFT.width + Math.max(0, along) * DRAFT.spread) continue;
          if (along < bestAlong) {
            bestAlong = along;
            leader = l;
          }
        }
      }
      const was = k.draftingBehind;
      k.draftingBehind = leader;
      const fill = this.rules.slingshot ? SLINGSHOT.fillSeconds : DRAFT.fillSeconds;
      if (leader) k.draft = Math.min(1, k.draft + dt / fill);
      else k.draft = Math.max(0, k.draft - dt / DRAFT.fadeSeconds);
      if (leader && !was) this.events.emit('draft:start', { kart: k, leader });
      if (this.rules.slingshot) {
        // Pulling out with charge fires the slingshot (and spends the charge).
        if (!leader && was && k.draft >= SLINGSHOT.minCharge) {
          const charge = k.draft;
          k.draft = 0;
          k.addEffect({ id: 'slingshot', duration: SLINGSHOT.seconds, tags: ['boost'], stacking: 'refresh', modifiers: { maxSpeed: 1 + SLINGSHOT.topSpeed * charge, accel: 1 + (SLINGSHOT.accel - 1) * charge } }, this);
          k.kick(SLINGSHOT.kick * charge);
          this.events.emit('draft:slingshot', { kart: k, from: was, charge });
          this.events.emit('sfx', { name: 'boost', kart: k });
        }
      } else if (!leader && was && k.draft > 0.5) this.events.emit('draft:slingshot', { kart: k, from: was });
    }
  }

  /**
   * Did `attacker` just ram `target`? `nx, ny` points from attacker to target at contact,
   * `closing` is how fast they came together. Returns true if the target spun.
   */
  tryRam(attacker, target, nx, ny, closing, attackerFwdBefore) {
    const aimed = attacker.isPlayer || (attacker.hunter && target.isPlayer);
    if (closing < (aimed ? RAM.minClosing : RAM.botMinClosing)) return false;
    if (attacker.effects.has('spinout') || target.finished) return false;
    if (!RAM.botsSpinPlayer && target.isPlayer && !attacker.isPlayer && !attacker.hunter) return false;
    if (this.time - target.spunAt < HITS.spinSeconds + RAM.immunity) return false;
    const ax = Math.cos(attacker.heading);
    const ay = Math.sin(attacker.heading);
    const bx = Math.cos(target.heading);
    const by = Math.sin(target.heading);
    // The hit lands on the attacker's nose...
    if (nx * ax + ny * ay < RAM.nose) return false;
    // ...the two aren't meeting head-on...
    if (ax * bx + ay * by < RAM.notHeadOn) return false;
    // ...and it lands off the target's centreline (a rear quarter or a side), not dead centre.
    const offCentre = Math.abs(nx * -by + ny * bx);
    if (offCentre < RAM.offCentre) {
      if (nx * bx + ny * by > 0) this.events.emit('ram:shove', { by: attacker, kart: target });
      return false;
    }
    const result = hitKart(target, this, { by: attacker, kind: 'ram' });
    if (result !== 'hit') return false;
    // A clean hit costs the rammer very little: put back most of its forward speed.
    const fwd = attacker.forwardSpeed;
    const keep = attackerFwdBefore * RAM.keepSpeed;
    if (fwd < keep) attacker.kick(keep - fwd);
    this.events.emit('ram', { by: attacker, kart: target, closing });
    if (attacker.hunter && target.isPlayer) attacker.huntCooldownUntil = this.time + HUNT.cooldown;
    return true;
  }

  /** LEAPFROG rule: drive nose-first into a spinning kart and you vault over it. */
  tryVault(k, spinner) {
    if (!spinner.effects.has('spinout') || k.effects.has('spinout') || k.effects.hasTag('air') || k.finished) return false;
    const fx = Math.cos(k.heading);
    const fy = Math.sin(k.heading);
    const dx = spinner.x - k.x;
    const dy = spinner.y - k.y;
    const d = Math.hypot(dx, dy) || 1;
    if ((dx * fx + dy * fy) / d < LEAP.nose) return false;
    const closing = ((k.vx - spinner.vx) * dx + (k.vy - spinner.vy) * dy) / d;
    if (closing < LEAP.minClosing) return false;
    k.addEffect({ id: 'vaulting', duration: LEAP.seconds, height: LEAP.height, tags: ['air'], stacking: 'ignore', modifiers: { maxSpeed: LEAP.airSpeed, turnRate: 0.7 } }, this);
    k.kick(LEAP.kick);
    this.events.emit('vault', { kart: k, over: spinner });
    this.events.emit('sfx', { name: 'spring', kart: k });
    if (k.isPlayer) this.events.emit('toast', { kart: k, text: `LEAPFROGGED ${spinner.name}!`, colour: 'good' });
    return true;
  }

  /**
   * BILLIARDS rule, the first hit: ram a kart nose-first and your speed goes into it, along
   * the line of the hit (so an off-centre hit sends it off at an angle). It doesn't spin;
   * it becomes "live" for a moment and spins whoever it hits. You nearly stop.
   */
  tryShot(attacker, target, nx, ny, closing) {
    if (closing < (attacker.isPlayer ? RAM.minClosing : RAM.botMinClosing)) return false;
    if (attacker.effects.has('spinout') || target.finished || this.time < target.cueUntil) return false;
    if (!RAM.botsSpinPlayer && target.isPlayer && !attacker.isPlayer) return false;
    const ax = Math.cos(attacker.heading);
    const ay = Math.sin(attacker.heading);
    if (nx * ax + ny * ay < RAM.nose) return false;
    const push = closing * BILLIARDS.transfer + attacker.speed * 0.25;
    target.vx += nx * push;
    target.vy += ny * push;
    attacker.vx *= BILLIARDS.keep;
    attacker.vy *= BILLIARDS.keep;
    target.cueUntil = this.time + BILLIARDS.cueSeconds;
    target.cueOrigin = attacker;
    target.cueChain = 0;
    this.events.emit('billiards:shot', { by: attacker, kart: target, speed: push });
    this.events.emit('sfx', { name: 'bump' });
    return true;
  }

  /** BILLIARDS rule, the follow-through: a live kart that hits another spins it and passes on its speed. */
  tryCueHit(cue, target, nx, ny, closing) {
    if (this.time >= cue.cueUntil || closing < BILLIARDS.chainClosing) return false;
    const origin = cue.cueOrigin;
    if (target === origin || target.finished) return false;
    if (!RAM.botsSpinPlayer && target.isPlayer && origin && !origin.isPlayer) return false;
    const result = hitKart(target, this, { by: origin, kind: 'ram' });
    if (result !== 'hit') return false;
    target.vx += nx * closing * 0.7;
    target.vy += ny * closing * 0.7;
    cue.vx *= BILLIARDS.keep;
    cue.vy *= BILLIARDS.keep;
    cue.cueUntil = -Infinity;
    const chain = cue.cueChain + 1;
    // The spun kart carries on live too: chain reactions.
    target.cueUntil = this.time + BILLIARDS.cueSeconds * 0.8;
    target.cueOrigin = origin;
    target.cueChain = chain;
    this.events.emit('billiards:hit', { by: origin, cue, kart: target, chain });
    if (origin?.isPlayer && chain >= 2) this.events.emit('toast', { kart: origin, text: `${chain}X CHAIN!`, colour: 'good' });
    return true;
  }

  /**
   * TIME BOMB rule: holding FOCUS (humanInput.focus) with focus in the bar slows everyone
   * but the player; letting go, or running dry, sets off every kart charged meanwhile.
   */
  updateTimeBomb(dt) {
    const p = this.player;
    if (!p) return;
    const want = this.phase === 'racing' && !p.finished && !!this.humanInput?.focus && p.focus > 0;
    if (want) {
      if (!this.bullet.active) this.events.emit('bomb:start', { kart: p });
      this.bullet.active = true;
      p.focus = Math.max(0, p.focus - TIMEBOMB.drainPerSecond * dt);
      return;
    }
    if (this.bullet.active) {
      this.bullet.active = false;
      this.detonate();
    }
    if (this.phase === 'racing' && !p.finished) p.focus = Math.min(1, p.focus + TIMEBOMB.passivePerSecond * dt);
  }

  /** Every charged kart goes off; each blast throws its neighbours and spins the closest. */
  detonate() {
    const p = this.player;
    const charged = this.bullet.charged;
    this.bullet.charged = [];
    let spun = 0;
    let chained = 0;
    const blasted = new Set();
    for (const k of charged) {
      k.charged = false;
      if (hitKart(k, this, { by: p, kind: 'bomb' }) === 'hit') spun++;
      blasted.add(k);
      this.events.emit('blast', { x: k.x, y: k.y, radius: TIMEBOMB.blastRadius });
      for (const o of this.karts) {
        if (o === k || o === p || o.finished) continue;
        const d = Math.hypot(o.x - k.x, o.y - k.y);
        if (d > TIMEBOMB.blastRadius) continue;
        const push = TIMEBOMB.blastPush * (1 - d / TIMEBOMB.blastRadius);
        o.vx += ((o.x - k.x) / (d || 1)) * push;
        o.vy += ((o.y - k.y) / (d || 1)) * push;
        if (d < TIMEBOMB.chainRadius && !blasted.has(o) && !o.charged && hitKart(o, this, { by: p, kind: 'bomb' }) === 'hit') chained++;
      }
    }
    this.events.emit('bomb:detonate', { kart: p, karts: charged, spun, chained });
    if (charged.length) {
      this.events.emit('sfx', { name: 'blast' });
      const total = spun + chained;
      this.events.emit('toast', { kart: p, text: chained ? `${total}X BOOM! (${chained} CHAINED)` : `${total}X BOOM!`, colour: 'good' });
    }
  }

  /** FOCUS rule: near misses with other karts (and hugging the fence fast) fill the player's FOCUS. */
  updateFocus(dt) {
    const p = this.player;
    if (!p || p.finished || this.phase !== 'racing') return;
    this.nearMissAt ??= new Map();
    for (const k of this.karts) {
      if (k === p) continue;
      const gap = Math.hypot(k.x - p.x, k.y - p.y) - p.radius - k.radius;
      if (gap <= 0 || gap > FOCUS.nearMissGap) continue;
      const rel = Math.hypot(k.vx - p.vx, k.vy - p.vy);
      if (rel < FOCUS.nearMissSpeed) continue;
      if (this.time - (this.nearMissAt.get(k) ?? -Infinity) < FOCUS.sameKartCooldown) continue;
      this.nearMissAt.set(k, this.time);
      p.focus = Math.min(1, p.focus + FOCUS.perNearMiss);
      this.events.emit('nearmiss', { kart: p, other: k });
      this.events.emit('sfx', { name: 'grab', kart: p });
    }
    // Riding the curb at speed (right on the edge of the road) trickles some in too.
    const toEdge = this.track.halfWidth + this.track.curbWidth - Math.abs(p.lateral);
    if (toEdge > 0 && toEdge < FOCUS.wallGap && p.speed > FOCUS.wallSpeed) p.focus = Math.min(1, p.focus + FOCUS.wallPerSecond * dt);
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
        for (const p of this.potatoes) p.touch(a, b);
        if (this.bullet.active) {
          const p = this.player;
          const other = a === p ? b : b === p ? a : null;
          if (other && !other.charged && !other.finished) {
            other.charged = true;
            this.bullet.charged.push(other);
            this.events.emit('bomb:charge', { kart: other, count: this.bullet.charged.length });
            this.events.emit('sfx', { name: 'grab', kart: p });
          }
        }
        if (this.rules.leapfrog && (this.tryVault(a, b) || this.tryVault(b, a))) continue;
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
          const aFwd = a.forwardSpeed;
          const bFwd = b.forwardSpeed;
          // RUBBER (from CANNONBALL) makes karts bounce off harder than they hit.
          const bounce = Math.max(BUMP.restitution, rubberOf(a), rubberOf(b));
          const jImp = (-(1 + bounce) * rv) / (1 / ma + 1 / mb);
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
          // Ramming: either kart may have hit the other with its nose.
          if (this.rules.billiards) {
            if (!this.tryCueHit(a, b, nx, ny, -rv) && !this.tryCueHit(b, a, -nx, -ny, -rv)) {
              if (this.rules.ram && !this.tryShot(a, b, nx, ny, -rv)) this.tryShot(b, a, -nx, -ny, -rv);
            }
          } else if (this.rules.ram && !this.tryRam(a, b, nx, ny, -rv, aFwd)) this.tryRam(b, a, -nx, -ny, -rv, bFwd);
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
    const racing = [...this.karts].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.progress - a.progress;
    });
    // Royale: knocked-out karts go to the bottom, the most recent highest.
    const order = [...racing, ...[...(this.out ?? [])].reverse()];
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
      out: !!k.out,
    }));
  }
}
