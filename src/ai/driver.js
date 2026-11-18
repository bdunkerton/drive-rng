// The rivals' brain. Each step it looks a little way up the road, aims at a point
// on (roughly) the racing line, slows for bends it can see coming, and plays its
// hand: fusing sometimes, using items when they'd do something. It also backs out if
// it gets stuck.

import { AI, KART, POTATO, SLINGSHOT, HUNT, HEIST } from '../config.js';
import { clamp, angleDiff, lerp, loopDelta } from '../core/math.js';
import { isReady, canFuse, aiWantsItem } from '../sim/hand.js';
import { powerups } from '../sim/powerups/index.js';
import { solidAhead } from '../sim/obstacles.js';

export class AIDriver {
  /**
   * @param {import('../core/rng.js').Rng} rng
   * @param {{ skill?: number }} [opts]
   */
  constructor(rng, opts = {}) {
    this.rng = rng;
    this.skill = opts.skill ?? rng.range(AI.skillMin, AI.skillMax);
    this.traffic = !!opts.traffic; // Heist traffic: keeps its lane, ignores the racing line
    // Each rival prefers its own lane a bit, and wanders around it slowly.
    this.laneBias = rng.range(-6, 6);
    this.lane = this.laneBias;
    this.laneTarget = this.laneBias;
    this.laneTimer = rng.range(1, 3);
    this.stuckFor = 0;
    this.reverseFor = 0;
    this.pullOutFor = 0;
    // Slingshot v2: how much charge this rival waits for before pulling out (over 1 = it
    // always waits for the full, automatic slingshot).
    this.patience = rng.range(0.6, 1.2);
    this.pullOutLane = 0;
    this.itemDelay = null;
    this.holdingFor = 0;
    this.fuseRoll = undefined;
    // Debug view reads these.
    this.debug = { tx: 0, ty: 0, targetSpeed: 0 };
  }

  update(kart, race, dt) {
    const c = kart.controls;
    const track = race.track;
    const stats = kart.stats();
    const speed = kart.forwardSpeed;

    // --- Lane wandering and simple overtaking --------------------------------
    this.laneTimer -= dt;
    if (this.laneTimer <= 0) {
      this.laneTimer = this.rng.range(1.5, 4);
      this.laneTarget = this.laneBias + this.rng.range(-5, 5);
    }
    const blocker = this.findBlocker(kart, race);
    if (blocker) {
      const side = blocker.lateral > kart.lateral ? -1 : 1;
      this.laneTarget = clamp(blocker.lateral + side * 14, -track.halfWidth + 6, track.halfWidth - 6);
    }
    // Tyre stacks: if the planned line goes through one, pick a side and commit.
    const look = AI.lookaheadBase + Math.max(0, speed) * AI.lookaheadPerSpeed;
    const avoid = this.planAroundSolids(kart, race, 60 + Math.max(0, speed) * 1.3);
    // Hot potato: chase someone when holding it, get out of the way when the holder's close.
    const tag = race.phase === 'racing' && !kart.finished && !this.traffic ? this.playTag(kart, race) ?? (kart.hunter ? this.playHunt(kart, race) : null) : null;
    if (tag) this.laneTarget = clamp(tag.lane, -track.halfWidth + 6, track.halfWidth - 6);
    // Slingshot drafting: charged up behind someone, pull out to the side with more room.
    const pullAt = race.rules?.slingshot === 2 ? this.patience : SLINGSHOT.aiPullOutAt;
    if (!tag && !this.traffic && race.rules?.slingshot && kart.draftingBehind && kart.draft >= pullAt) {
      const l = kart.draftingBehind;
      const side = l.lateral > 0 ? -1 : 1;
      this.pullOutFor = 1.2;
      this.pullOutLane = clamp(l.lateral + side * 20, -track.halfWidth + 6, track.halfWidth - 6);
    }
    if (this.pullOutFor > 0) {
      this.pullOutFor -= dt;
      if (!tag) this.laneTarget = this.pullOutLane;
    }
    const laneRate = avoid !== null ? 8 : tag ? 2 + 3 * this.skill : this.pullOutFor > 0 ? 5 : 1.5;
    this.lane = lerp(this.lane, this.laneTarget, clamp(dt * laneRate, 0, 1));

    // --- Steering -------------------------------------------------------------
    // Swerving round a stack, it aims at the gap itself rather than far up the road.
    const aheadS = kart.s + (avoid !== null ? clamp(avoid, 30, look) : look);
    const line = this.traffic ? 0 : track.racingLineAt(aheadS) * this.skill;
    const offset = clamp(line + this.lane, -track.halfWidth + 5, track.halfWidth - 5);
    let target = track.pointAt(aheadS, offset);
    // Close enough to tag: drive straight at them (leading them a touch).
    if (tag?.mode === 'chase' && tag.gap < 70) {
      target = { x: tag.kart.x + tag.kart.vx * 0.15, y: tag.kart.y + tag.kart.vy * 0.15 };
    }
    // Hunting: close in, then drive at a rear corner.
    if (tag?.mode === 'hunt' && tag.aim) target = tag.aim;
    const desired = Math.atan2(target.y - kart.y, target.x - kart.x);
    const turn = angleDiff(kart.heading, desired);
    let steer = clamp(turn * 2.8, -1, 1);

    // --- Speed planning -------------------------------------------------------
    let targetSpeed = Math.min(stats.maxSpeed * this.skill, this.planSpeed(kart, race, stats));
    if (Math.abs(turn) > 0.7) targetSpeed *= 0.7;
    // Leading with the potato and nobody ahead: lift and let the kart behind run into you.
    if (tag?.mode === 'brake-check' && tag.gap < 45) targetSpeed *= 0.75;
    targetSpeed = Math.max(targetSpeed, 34);
    // A cop that's ahead of you waits: crawls when you're close behind, stops when far.
    if (tag?.mode === 'wait') targetSpeed = tag.gap > 120 ? 0 : 50;

    let throttle = 1;
    let brake = 0;
    if (speed > targetSpeed + 10) {
      throttle = 0;
      brake = 0.7;
    } else if (speed > targetSpeed) {
      throttle = 0;
    }

    // Royale: backing into the kart behind with the potato.
    if (tag?.mode === 'back') {
      throttle = 0;
      brake = 1;
      if (kart.forwardSpeed < 5) steer = 0; // reversing: don't steer it round
    }

    // --- Getting unstuck ------------------------------------------------------
    if (race.phase === 'racing' && this.reverseFor <= 0) {
      if (speed < 6) this.stuckFor += dt;
      else this.stuckFor = 0;
      if (this.stuckFor > AI.stuckSeconds) {
        this.reverseFor = AI.reverseSeconds;
        this.stuckFor = 0;
      }
    }
    if (this.reverseFor > 0) {
      this.reverseFor -= dt;
      throttle = 0;
      brake = 1;
      steer = -steer;
    }

    // --- Items ----------------------------------------------------------------
    const hand = this.decideItems(kart, race, dt);

    c.throttle = throttle;
    c.brake = brake;
    c.steer = steer;
    c.useItem = hand.useItem;
    c.fuse = hand.fuse;
    c.cycle = hand.cycle;
    this.debug.tx = target.x;
    this.debug.ty = target.y;
    this.debug.targetSpeed = targetSpeed;
  }

  /**
   * A hunter's plan: get behind the player and drive into a rear corner (a PIT); if it's
   * just ahead of the player instead, sit in the player's lane. Backs off for a while
   * after a successful hit.
   */
  playHunt(kart, race) {
    const p = race.player;
    if (!p || p.finished || p.effects.has('spinout') || race.time < (kart.huntCooldownUntil ?? 0)) return null;
    const gap = p.progress - kart.progress;
    const cop = kart.cop;
    if (gap < 0 && -gap < HUNT.blockRange) return { mode: 'block', kart: p, gap: -gap, lane: p.lateral };
    // A cop that's got ahead of you waits for you to come by (then chases again).
    if (cop && gap < 0) return { mode: 'wait', kart: p, gap: -gap, lane: p.lateral };
    // Cops chase you wherever you are; hunters only once they're close.
    if (gap <= 0 || (!cop && gap > HUNT.range)) return null;
    // Pick a corner and stick with it for the attempt.
    if (this.huntSide === undefined || gap > HUNT.range * 0.8) this.huntSide = kart.lateral >= p.lateral ? 1 : -1;
    const side = this.huntSide;
    const lane = p.lateral + side * 6;
    if (gap > (cop ? HEIST.copAimFrom : HUNT.aimFrom)) return { mode: 'hunt', kart: p, gap, lane };
    const fx = Math.cos(p.heading);
    const fy = Math.sin(p.heading);
    const aim = { x: p.x - fx * 6 - fy * side * 5 + p.vx * 0.12, y: p.y - fy * 6 + fx * side * 5 + p.vy * 0.12 };
    return { mode: 'hunt', kart: p, gap, lane, aim };
  }

  /**
   * The hot potato, from a rival's point of view. Returns where in the road it wants to be
   * (a lateral offset) and why, or null if the potato's no business of its own right now.
   * Better rivals commit harder: they line up more exactly and run further out of the way.
   */
  playTag(kart, race) {
    const potatoes = race.potatoes?.filter((p) => p.holder) ?? [];
    if (!potatoes.length) return null;
    const edge = race.track.halfWidth - 8;
    const mine = potatoes.find((p) => p.holder === kart);
    if (mine) {
      // Someone up the road it's allowed to tag?
      let best = null;
      let bestGap = Infinity;
      for (const k of race.karts) {
        if (k === kart || !mine.canTake(k)) continue;
        const gap = k.progress - kart.progress;
        if (gap > 0 && gap < POTATO.aiChaseRange && gap < bestGap) {
          best = k;
          bestGap = gap;
        }
      }
      // Royale: someone right behind is a better target than someone far ahead: stop (or
      // back up) into them.
      if (race.rules?.royale) {
        const behind = race.kartsBehind(kart).find((k) => mine.canTake(k));
        const back = behind ? kart.progress - behind.progress : Infinity;
        if (back < 70 && back < bestGap * 0.8) return { mode: 'back', kart: behind, gap: back, lane: lerp(this.laneBias, behind.lateral, this.skill) };
      }
      if (best) return { mode: 'chase', kart: best, gap: bestGap, lane: lerp(this.laneBias, best.lateral, this.skill) };
      // Nobody ahead worth chasing: sit in the line of the nearest kart behind.
      for (const k of race.kartsBehind(kart)) {
        if (!mine.canTake(k)) continue;
        const gap = kart.progress - k.progress;
        if (gap < 90) return { mode: 'brake-check', kart: k, gap, lane: lerp(this.laneBias, k.lateral, this.skill) };
        break;
      }
      return null;
    }
    // Someone else has one. If the nearest holder is close, get to the other side of the road.
    let h = null;
    let nearest = Infinity;
    for (const p of potatoes) {
      if (!p.canTake(kart)) continue;
      const behind = kart.progress - p.holder.progress;
      if (behind < -40 || behind > POTATO.aiFleeRange) continue;
      if (Math.abs(behind) < nearest) {
        nearest = Math.abs(behind);
        h = p.holder;
      }
    }
    if (!h) return null;
    const away = h.lateral > kart.lateral ? -1 : 1;
    return { mode: 'flee', kart: h, gap: nearest, lane: away * edge * (0.5 + 0.5 * this.skill) };
  }

  /**
   * After a short "thinking" delay: maybe fuse the front two items, otherwise use the
   * front one if it's a good moment for it (each powerup's aiWants), otherwise wait.
   * An item it has sat on too long gets cycled to the back, or just used.
   */
  decideItems(kart, race, dt) {
    const out = { useItem: false, fuse: false, cycle: false };
    const [front, second] = kart.items;
    if (kart.finished || race.phase !== 'racing' || !isReady(front) || this.reverseFor > 0) {
      this.itemDelay = null;
      this.holdingFor = 0;
      return out;
    }
    if (this.itemDelay === null) this.itemDelay = this.rng.range(AI.itemDelayMin, AI.itemDelayMax);
    this.itemDelay -= dt;
    if (this.itemDelay > 0) return out;

    // Rivals know which pairs fizzle and never fuse those on purpose.
    const fusable = canFuse(front, second) && !powerups.areOpposites(front.parts[0], second.parts[0]);
    if (fusable && this.fuseRoll === undefined) this.fuseRoll = this.rng.chance(AI.fuseChance);
    if (fusable && this.fuseRoll) out.fuse = true;
    else if (aiWantsItem(front, kart, race)) out.useItem = true;
    else {
      this.holdingFor = (this.holdingFor ?? 0) + dt;
      if (this.holdingFor < AI.holdSeconds) return out;
      if (kart.items.length > 1) out.cycle = true;
      else out.useItem = true;
    }
    this.itemDelay = null;
    this.holdingFor = 0;
    this.fuseRoll = undefined;
    return out;
  }

  /**
   * The fastest speed it can be doing right now and still make every corner in the next
   * stretch of road: for each point ahead, the speed its steering can hold through that
   * curve, plus how much it could brake away before getting there.
   */
  planSpeed(kart, race, stats) {
    const track = race.track;
    const skillT = clamp((this.skill - AI.skillMin) / (AI.skillMax - AI.skillMin || 1), 0, 1);
    // Steering available at low speed, and how much of it fades by top speed.
    const t0 = stats.turnRate * lerp(AI.cornerMarginMin, AI.cornerMarginMax, skillT);
    const fade = (1 - KART.turnAtTopSpeed) / KART.maxSpeed;
    const decel = stats.brake * AI.brakeMargin;
    let best = Infinity;
    for (let d = 0; d <= AI.planAhead; d += 8) {
      // The racing line cuts corners, so the curve it actually drives is a bit gentler.
      const k = Math.abs(track.curvatureAt(kart.s + d)) * 0.8;
      if (k < 1e-4) continue;
      // v * k = t0 * (1 - fade * v)  =>  v = t0 / (k + t0 * fade)
      const corner = t0 / (k + t0 * fade);
      best = Math.min(best, Math.sqrt(corner * corner + 2 * decel * d));
    }
    return best;
  }

  /**
   * If the line it's driving would clip a tyre stack coming up (or a cluster of them),
   * move laneTarget to the nearest gap that's still on the road. Returns how far ahead
   * the stack is if it's steering round one, else null.
   */
  planAroundSolids(kart, race, range) {
    const first = solidAhead(race, kart, range);
    if (!first) return null;
    const track = race.track;
    const line = track.racingLineAt(first.s) * this.skill;
    const planned = line + this.laneTarget;
    // Every stack within a short stretch of the first one blocks a band across the road.
    const bands = [];
    for (const e of race.entities) {
      if (!e.solid || Math.abs(loopDelta(first.s, e.s, track.length)) > 30) continue;
      const clear = kart.radius + e.radius + 6;
      bands.push([e.lateral - clear, e.lateral + clear]);
    }
    const blocked = (v) => bands.some(([a, b]) => v > a && v < b);
    const gap = loopDelta(kart.s, first.s, track.length);
    // Already steering for a gap: keep aiming at it until the stack is passed.
    if (!blocked(planned)) return blocked(kart.lateral) || Math.abs(this.lane - this.laneTarget) > 2 ? gap : null;
    const edge = track.halfWidth - 4;
    const gaps = bands.flat().filter((v) => Math.abs(v) <= edge && !blocked(v));
    if (!gaps.length) return null;
    const pick = gaps.reduce((a, b) => (Math.abs(a - planned) <= Math.abs(b - planned) ? a : b));
    this.laneTarget = pick - line;
    return gap;
  }

  /** A kart a short way ahead in roughly the same lane, going slower. */
  findBlocker(kart, race) {
    let best = null;
    let bestGap = Infinity;
    for (const other of race.karts) {
      if (other === kart) continue;
      const gap = other.progress - kart.progress;
      if (gap <= 0 || gap > 30) continue;
      if (Math.abs(other.lateral - kart.lateral) > 11) continue;
      if (other.forwardSpeed > kart.forwardSpeed - 4) continue;
      if (gap < bestGap) {
        bestGap = gap;
        best = other;
      }
    }
    return best;
  }
}
