// CATAPULT. Motion WIND-UP: a bungee cord ties you to the spot you used it. You keep
// driving and the cord stretches, holding you back... then it lets go and fires you
// forward. Field ELASTIC: karts near you get bungeed to you too: when you're fired off,
// so are they, and when they're faster, they tow you. Collateral: everyone you were tied
// to comes along for the ride.

import { powerups } from './registry.js';
import { floorIt, kartsNear, loosen, speedBurst } from './kit.js';

export const CATAPULT = {
  duration: 0.9,        // seconds of wind-up
  hold: 0.55,           // top speed while the cord holds you
  launch: 150,          // kick when it lets go
  launchSeconds: 0.8,
  bandReach: 60,
  bandRest: 22,
  bandStiffness: 7,
  bandMax: 420,
};

export const windup = {
  name: 'WIND-UP',
  tags: ['windup'],
  duration: (p) => CATAPULT.duration,
  modifiers: () => ({ maxSpeed: CATAPULT.hold }),
  start(m) {
    const k = m.kart;
    m.effect.anchor = { x: k.x, y: k.y };
    m.race.events.emit('sfx', { name: 'grip', kart: k });
  },
  tick(m) {
    floorIt(m.kart);
  },
  end(m) {
    const k = m.kart;
    m.effect.anchor = null;
    // Fire straight down the road.
    const dir = m.race.track.headingAt(k.s);
    const v = Math.max(k.speed, 60);
    k.heading = dir;
    k.vx = Math.cos(dir) * v;
    k.vy = Math.sin(dir) * v;
    speedBurst(k, m.race, CATAPULT.launchSeconds * Math.sqrt(m.power), 1.6, CATAPULT.launch * m.power);
    m.race.events.emit('catapult', { kart: k });
    m.race.events.emit('sfx', { name: 'boost', kart: k });
  },
};

export const elastic = {
  name: 'ELASTIC',
  start(m) {
    const k = m.kart;
    m.data.bands = kartsNear(m.race, k.x, k.y, CATAPULT.bandReach * Math.sqrt(m.fieldPower), k).map((n) => n.kart).slice(0, 3);
    m.effect.bands = m.data.bands;
  },
  tick(m, dt) {
    const k = m.kart;
    for (const o of m.data.bands ?? []) {
      const dx = o.x - k.x;
      const dy = o.y - k.y;
      const d = Math.hypot(dx, dy) || 1;
      const stretch = d - CATAPULT.bandRest;
      if (stretch <= 0) continue;
      const pull = Math.min(CATAPULT.bandMax, stretch * CATAPULT.bandStiffness) * m.fieldPower * dt;
      // A band pulls both ends together.
      o.vx -= (dx / d) * pull;
      o.vy -= (dy / d) * pull;
      k.vx += (dx / d) * pull * 0.5;
      k.vy += (dy / d) * pull * 0.5;
      loosen(o, m.race, 0.2);
    }
  },
  release(m) {
    m.effect.bands = null;
    if (m.data.bands?.length) m.race.events.emit('bands:snap', { kart: m.kart, karts: m.data.bands });
  },
};

powerups.register({
  id: 'catapult',
  name: 'CATAPULT',
  short: 'CATAPT',
  abbr: 'CAT',
  description: 'A bungee holds you back for a moment, then fires you forward. Ties nearby karts to you too.',
  icon: 'catapult',
  weight: 1,
  aiWants: ({ race, kart }) => race.track.bendBetween(kart.s, kart.s + 260) < 0.6,
  motion: windup,
  field: elastic,
});
