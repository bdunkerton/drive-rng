// ORBIT. Motion SWING: grab the nearest kart ahead and swing round it like a pole, then
// let go and shoot off faster than you came in (a gravity assist). The kart you swung
// on is dragged back by it. Field SATELLITE: karts near you are caught circling you, then
// flung outward when it ends. Collateral: the flung karts can land anywhere, including
// ahead of you.

import { powerups } from './registry.js';
import { kartsNear, loosen, speedBurst } from './kit.js';
import { angleDiff } from '../../core/math.js';

export const ORBIT = {
  reach: 140,           // grabs a kart this far ahead along the course
  duration: 1.4,
  minRadius: 16,
  maxRadius: 34,
  spin: 1.2,            // swing speed, as a multiple of normal top speed
  sweep: 2.4,           // radians of swing before letting go
  release: 1.25,        // speed multiplier on letting go
  drag: 60,             // how much the pole kart is slowed
  satelliteRadius: 50,
  satellite: 280,
  flingOut: 120,
};

function swingTarget(race, kart) {
  return race.kartsAhead(kart).find((k) => k.progress - kart.progress <= ORBIT.reach && !k.effects.hasTag('phase')) ?? null;
}

export const swing = {
  name: 'SWING',
  tags: ['scripted', 'swing'],
  duration: (p) => ORBIT.duration,
  start(m) {
    const k = m.kart;
    const t = swingTarget(m.race, k);
    m.data.pole = t;
    m.effect.rope = t;
    m.data.swept = 0;
    if (!t) {
      // Nothing to swing on: a short burst instead.
      m.data.speed = k.speed;
      m.effect.tags = m.effect.tags.filter((tag) => tag !== 'scripted');
      speedBurst(k, m.race, 0.6, 1.3, 40 * m.power);
      return;
    }
    const dx = k.x - t.x;
    const dy = k.y - t.y;
    m.data.radius = Math.max(ORBIT.minRadius, Math.min(ORBIT.maxRadius, Math.hypot(dx, dy)));
    m.data.angle = Math.atan2(dy, dx);
    // Swing round on whichever side gets you going forward: the direction of travel decides.
    const tangent = m.data.angle + Math.PI / 2;
    const forward = Math.cos(tangent) * k.vx + Math.sin(tangent) * k.vy;
    m.data.dir = forward >= 0 ? 1 : -1;
    m.data.speed = Math.max(k.speed, 80);
    m.race.events.emit('orbit', { kart: k, pole: t });
    m.race.events.emit('sfx', { name: 'hook', kart: k });
  },
  tick(m, dt) {
    const k = m.kart;
    const t = m.data.pole;
    if (!t) return;
    if (t.finished) return m.stop();
    const target = k.base.maxSpeed * ORBIT.spin * Math.sqrt(m.power);
    m.data.speed += (target - m.data.speed) * Math.min(1, dt * 4);
    const w = (m.data.speed / m.data.radius) * m.data.dir;
    m.data.angle += w * dt;
    m.data.swept += Math.abs(w * dt);
    const px = t.x + Math.cos(m.data.angle) * m.data.radius;
    const py = t.y + Math.sin(m.data.angle) * m.data.radius;
    // Velocity that carries you to the next point on the circle (plus the pole's own movement).
    k.vx = (px - k.x) / dt;
    k.vy = (py - k.y) / dt;
    k.trackIndex = -1;
    k.heading = Math.atan2(k.vy, k.vx);
    // Swinging on it drags the pole kart back.
    const back = m.race.track.headingAt(t.s) + Math.PI;
    t.vx += Math.cos(back) * ORBIT.drag * dt;
    t.vy += Math.sin(back) * ORBIT.drag * dt;
    loosen(t, m.race, 0.2);
    // Let go once you're pointing down the road and have swung far enough.
    const roadDir = m.race.track.headingAt(k.s);
    const aligned = Math.abs(angleDiff(k.heading, roadDir)) < 0.3;
    if ((m.data.swept > Math.PI * 0.6 && aligned) || m.data.swept > ORBIT.sweep) m.stop();
  },
  end(m) {
    const k = m.kart;
    m.effect.rope = null;
    if (!m.data.pole) return;
    const v = m.data.speed * ORBIT.release;
    // Leave roughly down the road: never more than a little off it, or you'd go straight into the fence.
    const road = m.race.track.headingAt(k.s);
    const off = angleDiff(road, Math.atan2(k.vy, k.vx));
    const h = road + Math.max(-0.25, Math.min(0.25, off));
    k.vx = Math.cos(h) * v;
    k.vy = Math.sin(h) * v;
    k.heading = h;
    speedBurst(k, m.race, 0.5, 1.4, 0);
    m.race.events.emit('orbit:release', { kart: k, pole: m.data.pole });
    m.race.events.emit('sfx', { name: 'boost', kart: k });
  },
};

export const satellite = {
  name: 'SATELLITE',
  tick(m, dt) {
    const k = m.kart;
    for (const { kart, d } of kartsNear(m.race, k.x, k.y, ORBIT.satelliteRadius * Math.sqrt(m.fieldPower), k)) {
      if (kart.effects.hasTag('air') || kart.effects.hasTag('phase')) continue;
      const nx = (kart.x - k.x) / (d || 1);
      const ny = (kart.y - k.y) / (d || 1);
      const a = ORBIT.satellite * m.fieldPower * dt;
      // Round you, and held in toward you.
      kart.vx += (-ny - nx * 0.5) * a + (k.vx - kart.vx) * dt * 2;
      kart.vy += (nx - ny * 0.5) * a + (k.vy - kart.vy) * dt * 2;
      loosen(kart, m.race, 0.3);
      (m.data.caught ??= new Set()).add(kart);
    }
  },
  release(m) {
    const k = m.kart;
    for (const kart of m.data.caught ?? []) {
      const dx = kart.x - k.x;
      const dy = kart.y - k.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > ORBIT.satelliteRadius * 1.6) continue;
      kart.vx += (dx / d) * ORBIT.flingOut * m.fieldPower;
      kart.vy += (dy / d) * ORBIT.flingOut * m.fieldPower;
      loosen(kart, m.race, 0.5);
    }
    if (m.data.caught?.size) m.race.events.emit('fling', { kart: k, karts: [...m.data.caught] });
  },
};

powerups.register({
  id: 'orbit',
  name: 'ORBIT',
  short: 'ORBIT',
  abbr: 'ORB',
  description: 'Swing round the kart ahead like a pole and shoot off faster. Karts near you get flung.',
  icon: 'orbit',
  weight: 1,
  aiWants: ({ race, kart }) => !!swingTarget(race, kart),
  motion: swing,
  field: satellite,
});
