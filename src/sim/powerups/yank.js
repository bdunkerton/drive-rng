// YANK. Motion TUG: hook the kart ahead with an elastic line. The line pulls both ways:
// it drags them back and hauls you forward, so their speed becomes yours. When you draw
// level the line snaps and flicks you on. Field LASSO: rope the nearest other kart to
// you; it gets swung about on the end of the rope wherever you go, and flung when the
// rope comes off. Collateral: what you swing can swing into you.

import { powerups } from './registry.js';
import { floorIt, kartsNear, loosen } from './kit.js';
import { hookTarget } from './hook.js';

export const YANK = {
  reach: 170,           // hooks a kart this far ahead along the course
  duration: 1.3,
  rest: 18,             // the line's slack length
  stiffness: 9,         // pull per pixel of stretch, per second
  maxPull: 520,         // the most the line can pull, pixels per second per second
  yourShare: 1.25,      // you get a bit more of the pull than they do: it's your hook
  snapKick: 45,
  lassoReach: 80,
  lassoLength: 30,
  fling: 1.6,           // how much the lassoed kart's swing speed is multiplied when it's let go
};

export const tug = {
  name: 'TUG',
  tags: ['tug'],
  duration: (p) => YANK.duration * (1 + 0.2 * (p - 1)),
  modifiers: () => ({ maxSpeed: 1.45, accel: 2 }),
  start(m) {
    const target = hookTarget(m.race, m.kart, YANK.reach);
    m.data.target = target;
    m.effect.rope = target;
    if (!target) m.kart.kick(30 * m.power);
    m.race.events.emit('yank', { kart: m.kart, target });
    m.race.events.emit('sfx', { name: 'hook', kart: m.kart });
  },
  tick(m, dt) {
    const k = m.kart;
    const t = m.data.target;
    floorIt(k);
    if (!t) return;
    if (t.finished || k.progress >= t.progress + 2) return m.stop();
    const dx = t.x - k.x;
    const dy = t.y - k.y;
    const d = Math.hypot(dx, dy) || 1;
    const stretch = d - YANK.rest;
    if (stretch <= 0) return;
    const pull = Math.min(YANK.maxPull, stretch * YANK.stiffness) * m.power * dt;
    // Equal and opposite, more or less: their loss is your gain.
    k.vx += (dx / d) * pull * YANK.yourShare;
    k.vy += (dy / d) * pull * YANK.yourShare;
    t.vx -= (dx / d) * pull;
    t.vy -= (dy / d) * pull;
    loosen(t, m.race, 0.2);
  },
  end(m) {
    m.effect.rope = null;
    if (!m.data.target) return;
    m.kart.kick(YANK.snapKick * m.power);
    m.race.events.emit('yank:snap', { kart: m.kart, target: m.data.target });
    m.race.events.emit('sfx', { name: 'boost', kart: m.kart });
  },
};

export const lasso = {
  name: 'LASSO',
  start(m) {
    const k = m.kart;
    const near = kartsNear(m.race, k.x, k.y, YANK.lassoReach * Math.sqrt(m.fieldPower), k).find(({ kart }) => kart !== m.data.target && !kart.effects.hasTag('phase'));
    if (!near) return;
    m.data.lassoed = near.kart;
    m.data.length = Math.max(YANK.rest, Math.min(YANK.lassoLength, near.d));
    m.effect.lasso = near.kart;
    m.race.events.emit('lasso', { kart: k, other: near.kart });
  },
  tick(m) {
    const k = m.kart;
    const o = m.data.lassoed;
    if (!o) return;
    const dx = o.x - k.x;
    const dy = o.y - k.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d <= m.data.length) return;
    // The rope's taut: put them back on the end of it, and keep only the speed that swings round you.
    const nx = dx / d;
    const ny = dy / d;
    o.x = k.x + nx * m.data.length;
    o.y = k.y + ny * m.data.length;
    o.trackIndex = -1;
    const rvx = o.vx - k.vx;
    const rvy = o.vy - k.vy;
    const out = rvx * nx + rvy * ny;
    if (out > 0) {
      o.vx -= out * nx;
      o.vy -= out * ny;
    }
    loosen(o, m.race, 0.2);
  },
  release(m) {
    const k = m.kart;
    const o = m.data.lassoed;
    m.effect.lasso = null;
    if (!o) return;
    // Let go: whatever speed it had swinging round you, it keeps, and then some.
    o.vx = k.vx + (o.vx - k.vx) * YANK.fling;
    o.vy = k.vy + (o.vy - k.vy) * YANK.fling;
    loosen(o, m.race, 0.5);
    m.race.events.emit('fling', { kart: k, other: o });
  },
};

powerups.register({
  id: 'yank',
  name: 'YANK',
  short: 'YANK',
  abbr: 'YNK',
  description: 'Hook the kart ahead with an elastic line: it drags them back and hauls you forward.',
  icon: 'yank',
  weight: 1,
  aiWants: ({ race, kart }) => !!hookTarget(race, kart, YANK.reach),
  motion: tug,
  field: lasso,
});
