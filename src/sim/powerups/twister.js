// TWISTER. Motion SPIN: you become a spinning top. You keep going (a bit faster) in the
// direction you were heading, steering gently, and nothing can spin you out or pop you.
// Field WHIRL: karts near you get flung round you sideways. Collateral: you might
// fling someone forward.

import { powerups } from './registry.js';
import { kartsNear, loosen } from './kit.js';
import { angleDiff, clamp, approach } from '../../core/math.js';

export const TWISTER = {
  duration: 1.8,
  speed: 1.15,          // times base top speed
  steer: 3,             // radians per second you can bend your path
  spinRate: 16,         // how fast it twirls (drawn)
  whirlRadius: 40,
  whirl: 260,
};

export const spin = {
  name: 'SPIN',
  tags: ['scripted', 'armour', 'twister'],
  duration: (p) => TWISTER.duration * (1 + 0.35 * (p - 1)),
  start(m) {
    const k = m.kart;
    m.data.dir = k.speed > 10 ? Math.atan2(k.vy, k.vx) : k.heading;
    m.data.speed = Math.max(k.speed, 60);
    m.race.events.emit('sfx', { name: 'twister', kart: k });
  },
  tick(m, dt) {
    const k = m.kart;
    const race = m.race;
    // Path: the player bends it with the steering; rivals bend it toward the road ahead.
    let turn = k.controls.steer * TWISTER.steer;
    if (!k.isPlayer) {
      const aim = race.track.pointAt(k.s + 50, k.lateral * 0.5);
      turn = clamp(angleDiff(m.data.dir, Math.atan2(aim.y - k.y, aim.x - k.x)) * 4, -TWISTER.steer, TWISTER.steer);
    }
    m.data.dir += turn * dt;
    // Grass and walls still slow you.
    const top = k.base.maxSpeed * TWISTER.speed * (1 + 0.1 * (m.power - 1)) * (k.surface === 'grass' ? 0.6 : 1);
    m.data.speed = approach(m.data.speed, top, 220 * dt);
    // Off the fence (or a tyre stack): carry on the way it bounced you, slower.
    if (k.lastWallHit > 0 && k.lastWallHit !== m.data.lastWall && race.time - k.lastWallHit < 0.05) {
      m.data.lastWall = k.lastWallHit;
      m.data.dir = Math.atan2(k.vy, k.vx);
      m.data.speed *= 0.6;
    }
    k.vx = Math.cos(m.data.dir) * m.data.speed;
    k.vy = Math.sin(m.data.dir) * m.data.speed;
    k.heading += TWISTER.spinRate * dt;
  },
  end(m) {
    // Come out pointing the way you're going.
    m.kart.heading = m.data.dir;
  },
};

export const whirl = {
  name: 'WHIRL',
  tick(m, dt) {
    const k = m.kart;
    for (const { kart, d } of kartsNear(m.race, k.x, k.y, TWISTER.whirlRadius * Math.sqrt(m.fieldPower), k)) {
      if (kart.effects.hasTag('air') || kart.effects.hasTag('phase')) continue;
      // Push round you (sideways to the line between you), plus a little outward.
      const dx = (kart.x - k.x) / (d || 1);
      const dy = (kart.y - k.y) / (d || 1);
      const a = TWISTER.whirl * m.fieldPower * dt;
      kart.vx += (-dy + dx * 0.4) * a;
      kart.vy += (dx + dy * 0.4) * a;
      loosen(kart, m.race, 0.3);
    }
  },
};

powerups.register({
  id: 'twister',
  name: 'TWISTER',
  short: 'TWIST',
  abbr: 'TWS',
  description: 'Spin like a top: unstoppable, and anyone near you gets flung round you.',
  icon: 'twister',
  weight: 1,
  opposite: 'grip',
  motion: spin,
  field: whirl,
});
