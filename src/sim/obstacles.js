// Solid things on the track: stacks of tyres.
//
// A normal kart can't move a stack: it bounces off as if it hit a wall. A heavy kart
// (a BULK giant) shoves it along, and it slides to a stop. Karts in the air fly over
// stacks and phased karts pass through them. Stacks are entities with `solid: true`;
// the race resolves solids against karts after kart-to-kart bumps (see resolveSolids).

import { loopDelta, sign } from '../core/math.js';

export const TIRES = {
  radius: 6,
  mass: 2.5,
  pushMass: 3,          // karts at least this heavy can shove a stack (BULK is 4, normal is 1)
  friction: 3.5,        // how fast a shoved stack slides to a stop
  restitution: 0.35,    // how much speed a kart keeps bouncing off a stack it can't move
  scrub: 0.8,           // speed kept along the stack's surface after a hit
};

export class TireStack {
  constructor(track, s, lateral) {
    const p = track.pointAt(s, lateral);
    this.kind = 'tires';
    this.x = p.x;
    this.y = p.y;
    this.vx = 0;
    this.vy = 0;
    this.s = s;
    this.lateral = lateral;
    this.trackIndex = -1;
    this.radius = TIRES.radius;
    this.mass = TIRES.mass;
    this.solid = true;
    this.alive = true;
    this.spin = 0;
  }

  get moving() {
    return Math.abs(this.vx) + Math.abs(this.vy) > 0.5;
  }

  update(dt, race) {
    if (!this.moving) {
      this.vx = this.vy = 0;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const damp = Math.exp(-TIRES.friction * dt);
    this.vx *= damp;
    this.vy *= damp;
    this.spin += Math.hypot(this.vx, this.vy) * dt * 0.2;
    // Stay inside the fence, like a kart.
    const track = race.track;
    const p = track.project(this.x, this.y, this.trackIndex);
    this.trackIndex = p.index;
    const limit = track.fenceOffset - this.radius;
    if (Math.abs(p.lateral) > limit) {
      const side = sign(p.lateral);
      const n = track.pointAt(p.s);
      const over = Math.abs(p.lateral) - limit;
      this.x -= n.nx * over * side;
      this.y -= n.ny * over * side;
      const outward = (this.vx * n.nx + this.vy * n.ny) * side;
      if (outward > 0) {
        this.vx -= 1.5 * outward * side * n.nx;
        this.vy -= 1.5 * outward * side * n.ny;
      }
    }
    this.s = p.s;
    this.lateral = Math.max(-limit, Math.min(limit, p.lateral));
  }
}

/** Lay out a track's tyre stacks (track.def.obstacles: [{ at, lateral }]). */
export function placeObstacles(track) {
  return (track.def.obstacles ?? []).map((o) => new TireStack(track, o.at * track.length, o.lateral));
}

/** Push karts and solid entities apart. Called by the race every step. */
export function resolveSolids(race) {
  for (const e of race.entities) {
    if (!e.solid) continue;
    for (const kart of race.karts) {
      if (kart.effects.hasTag('air') || kart.effects.hasTag('phase')) continue;
      // A kart can drive out of its own afterimage.
      if (e.owner === kart && e.age < 1) continue;
      const dx = kart.x - e.x;
      const dy = kart.y - e.y;
      const r = kart.radius + e.radius;
      const d2 = dx * dx + dy * dy;
      if (d2 >= r * r) continue;
      const d = Math.sqrt(d2) || 0.01;
      const nx = d2 ? dx / d : Math.cos(kart.heading + Math.PI);
      const ny = d2 ? dy / d : Math.sin(kart.heading + Math.PI);
      const overlap = r - d;
      const km = kart.stats().mass;
      const rv = (kart.vx - e.vx) * nx + (kart.vy - e.vy) * ny; // < 0 when closing
      if (km >= TIRES.pushMass) {
        // Heavy enough to shove it: share the overlap and trade momentum.
        const total = km + e.mass;
        kart.x += nx * overlap * (e.mass / total);
        kart.y += ny * overlap * (e.mass / total);
        e.x -= nx * overlap * (km / total);
        e.y -= ny * overlap * (km / total);
        if (rv < 0) {
          const j = (-(1 + 0.2) * rv) / (1 / km + 1 / e.mass);
          kart.vx += (j / km) * nx;
          kart.vy += (j / km) * ny;
          e.vx -= (j / e.mass) * nx;
          e.vy -= (j / e.mass) * ny;
          if (-rv > 12) race.events.emit('tires:shove', { kart, tires: e, impact: -rv });
        }
        continue;
      }
      // Too light: the stack doesn't budge, the kart bounces off it.
      kart.x += nx * overlap;
      kart.y += ny * overlap;
      if (rv < 0) {
        kart.vx -= (1 + TIRES.restitution) * rv * nx;
        kart.vy -= (1 + TIRES.restitution) * rv * ny;
        // Scrub off some of the speed along the surface too.
        const tx = -ny;
        const ty = nx;
        const along = kart.vx * tx + kart.vy * ty;
        kart.vx -= along * (1 - TIRES.scrub) * tx;
        kart.vy -= along * (1 - TIRES.scrub) * ty;
        if (-rv > 15) {
          kart.lastWallHit = race.time;
          race.events.emit('tires:hit', { kart, tires: e, impact: -rv });
          kart.effects.notify('onWall', kart, race, -rv);
        }
      }
    }
  }
}

/** The nearest solid within `range` ahead of a kart along the course, or null. */
export function solidAhead(race, kart, range) {
  let best = null;
  let bestGap = range;
  for (const e of race.entities) {
    if (!e.solid) continue;
    const gap = loopDelta(kart.s, e.s, race.track.length);
    if (gap > 0 && gap < bestGap) {
      bestGap = gap;
      best = e;
    }
  }
  return best;
}

/**
 * An afterimage left by BLINK: a solid copy of the kart where it was, for a couple of
 * seconds. Karts behind bounce off it like a tyre stack. Giants shove it.
 */
export class Decoy extends TireStack {
  constructor(track, owner, s, lateral, life = 2.5) {
    super(track, s, lateral);
    this.kind = 'decoy';
    this.owner = owner;
    this.color = owner.color;
    this.heading = owner.heading;
    this.radius = owner.base.radius + 1;
    this.life = life;
    this.age = 0;
  }

  update(dt, race) {
    this.age += dt;
    if (this.age > this.life) this.alive = false;
    super.update(dt, race);
  }
}
