// BLACK HOLE. Motion FALL: a hole opens on the road ahead and yanks you into it, then
// spits you out the far side with a burst of speed. Field GRAVITY: drags nearby karts
// in toward you while it lasts. Collateral: you pull the pack along with you.

import { powerups } from './registry.js';
import { floorIt, kartsNear, pullToward, speedBurst, steerToward } from './kit.js';
import { HoleMark } from '../hazards.js';

export const BLACK_HOLE = {
  ahead: 120,           // how far up the road the hole opens
  duration: 0.85,
  yank: 600,            // pixels per second per second toward the hole
  aim: 7,               // radians per second the hole turns you to face it
  maxPull: 200,         // the yank stops adding speed past this
  popKick: 45,
  popSeconds: 0.6,
  gravityRadius: 90,
  gravity: 220,
};

export const fall = {
  name: 'FALL',
  tags: ['boost', 'fall'],
  duration: (p) => BLACK_HOLE.duration * (1 + 0.25 * (p - 1)),
  modifiers: () => ({ maxSpeed: 1.5, accel: 3, grip: 1.5 }),
  start(m) {
    const k = m.kart;
    // In a bend the hole opens closer, so the straight line to it stays on the road.
    const bend = m.race.track.bendBetween(k.s, k.s + BLACK_HOLE.ahead);
    const ahead = (BLACK_HOLE.ahead * Math.sqrt(m.power)) / (1 + bend * 1.5);
    const p = m.race.track.pointAt(k.s + ahead, k.lateral * 0.4);
    m.data.hole = { x: p.x, y: p.y };
    m.race.spawn(new HoleMark({ owner: k, x: p.x, y: p.y, life: m.effect.duration + 0.35, size: Math.sqrt(m.power) }));
    m.race.events.emit('sfx', { name: 'hole', kart: k });
  },
  tick(m, dt) {
    const k = m.kart;
    const h = m.data.hole;
    floorIt(k);
    steerToward(k, h.x, h.y, BLACK_HOLE.aim, dt);
    if (k.speed < BLACK_HOLE.maxPull * Math.sqrt(m.power)) pullToward(k, h.x, h.y, BLACK_HOLE.yank * m.power * dt);
    if (Math.hypot(h.x - k.x, h.y - k.y) < 10) m.stop();
  },
  end(m) {
    const k = m.kart;
    // You come out facing, and going, down the road.
    const dir = m.race.track.headingAt(k.s);
    const v = k.speed;
    k.heading = dir;
    k.vx = Math.cos(dir) * v;
    k.vy = Math.sin(dir) * v;
    speedBurst(k, m.race, BLACK_HOLE.popSeconds * Math.sqrt(m.power), 1.3, BLACK_HOLE.popKick * m.power);
    m.race.events.emit('hole:pop', { kart: k, x: m.data.hole.x, y: m.data.hole.y });
    m.race.events.emit('sfx', { name: 'boost', kart: k });
  },
};

export const gravity = {
  name: 'GRAVITY',
  tick(m, dt) {
    const k = m.kart;
    for (const { kart } of kartsNear(m.race, k.x, k.y, BLACK_HOLE.gravityRadius * Math.sqrt(m.fieldPower), k)) {
      pullToward(kart, k.x, k.y, BLACK_HOLE.gravity * m.fieldPower * dt, m.race);
    }
  },
};

powerups.register({
  id: 'black-hole',
  name: 'BLACK HOLE',
  short: 'HOLE',
  abbr: 'BH',
  description: 'Opens a hole ahead that pulls you in and pops you out fast. Drags the pack along.',
  icon: 'black-hole',
  weight: 1,
  opposite: 'spring',
  // You come out of the hole fast: open it where there's road after it, not before a corner.
  aiWants: ({ race, kart }) => race.track.bendBetween(kart.s, kart.s + 300) < 0.6,
  motion: fall,
  field: gravity,
});
