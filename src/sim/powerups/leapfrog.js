// LEAPFROG. Motion VAULT: fire a hook at the kart ahead and reel yourself in hard. When
// you reach it, you vault: you're thrown into the air over it, and it's knocked into a
// spin out ahead of you. Field STOMP: when you come down, everyone near where you land
// bounces away. Collateral: the spinning kart is still ahead of you, and it might land
// in your way.

import { powerups } from './registry.js';
import { floorIt, pullToward, steerToward, kartsNear, pushAway, whenLanded } from './kit.js';
import { hookTarget } from './hook.js';
import { spinoutEffect } from '../hits.js';

export const LEAPFROG = {
  reach: 170,           // latches onto a kart this far ahead along the course
  duration: 1.4,
  reel: 520,            // pixels per second per second toward the target
  maxPull: 260,
  vaultKick: 70,
  vaultSeconds: 0.55,
  vaultHeight: 14,
  shove: 70,            // how hard the vaulted kart is thrown forward
  stompRadius: 36,
  stomp: 150,
};

export const vault = {
  name: 'VAULT',
  tags: ['boost', 'vault'],
  duration: (p) => LEAPFROG.duration * (1 + 0.2 * (p - 1)),
  modifiers: () => ({ maxSpeed: 1.6, accel: 3 }),
  start(m) {
    const target = hookTarget(m.race, m.kart, LEAPFROG.reach);
    m.data.target = target;
    m.effect.target = target;
    if (!target) m.kart.kick(30 * m.power);
    m.race.events.emit('sfx', { name: 'hook', kart: m.kart });
  },
  tick(m, dt) {
    const k = m.kart;
    const t = m.data.target;
    floorIt(k);
    if (!t || m.data.vaulted) return;
    if (t.finished) return m.stop();
    steerToward(k, t.x, t.y, 6, dt);
    if (k.speed < LEAPFROG.maxPull * Math.sqrt(m.power)) pullToward(k, t.x, t.y, LEAPFROG.reel * m.power * dt);
    if (Math.hypot(t.x - k.x, t.y - k.y) < k.radius + t.radius + 7) {
      m.data.vaulted = true;
      m.effect.target = null;
      // Over the top...
      k.addEffect({ id: 'vaulting', duration: LEAPFROG.vaultSeconds, height: LEAPFROG.vaultHeight, tags: ['air'], modifiers: { maxSpeed: 1.5, turnRate: 0.6 } }, m.race);
      k.kick(LEAPFROG.vaultKick * m.power);
      // ...and the kart underneath is sent spinning on ahead (giants and riders shrug it off).
      if (!t.effects.hasTag('giant') && !t.effects.hasTag('ride') && !t.effects.hasTag('armour') && !t.effects.hasTag('air')) {
        const dir = m.race.track.headingAt(t.s);
        t.vx += Math.cos(dir) * LEAPFROG.shove * m.power;
        t.vy += Math.sin(dir) * LEAPFROG.shove * m.power;
        t.addEffect(spinoutEffect(), m.race);
        m.race.events.emit('hit', { kart: t, by: k, kind: 'vault' });
      }
      m.race.events.emit('vault', { kart: k, over: t });
      m.race.events.emit('sfx', { name: 'spring', kart: k });
      m.stop();
    }
  },
};

export const stomp = {
  name: 'STOMP',
  release(m) {
    const k = m.kart;
    whenLanded(k, m.race, () => {
      const radius = LEAPFROG.stompRadius * Math.sqrt(m.fieldPower);
      const hit = [];
      for (const { kart } of kartsNear(m.race, k.x, k.y, radius, k)) {
        if (kart.effects.hasTag('air') || kart.effects.hasTag('phase')) continue;
        pushAway(kart, k.x, k.y, LEAPFROG.stomp * m.fieldPower, m.race);
        hit.push(kart);
      }
      m.race.events.emit('stomp', { kart: k, x: k.x, y: k.y, radius, karts: hit });
      m.race.events.emit('sfx', { name: 'land', kart: k });
    });
  },
};

powerups.register({
  id: 'leapfrog',
  name: 'LEAPFROG',
  short: 'FROG',
  abbr: 'LFG',
  description: 'Hook the kart ahead, reel in, vault over it and leave it spinning.',
  icon: 'leapfrog',
  weight: 1,
  aiWants: ({ race, kart }) => !!hookTarget(race, kart, LEAPFROG.reach),
  motion: vault,
  field: stomp,
});
