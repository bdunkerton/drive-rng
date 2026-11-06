// MAGNET. Motion DRAFT: tuck in behind a kart ahead and you get pulled along much
// faster (a bit faster even on your own). Field COLLECT: item boxes near you fly to you,
// so you pick up powerups without driving through them. Collateral: whoever you're
// drafting gets you sitting right on their bumper.

import { powerups } from './registry.js';
import { floorIt } from './kit.js';

export const MAGNET = {
  duration: 3,
  draftReach: 90,       // drafts a kart up to this far ahead along the course...
  draftLane: 16,        // ...and this far to either side
  draftSpeed: 1.38,
  collectRadius: 60,
};

/** The kart this kart would be drafting right now, or null. */
export function draftTarget(race, kart) {
  return race.kartsAhead(kart).find((k) => k.progress - kart.progress <= MAGNET.draftReach && Math.abs(k.lateral - kart.lateral) <= MAGNET.draftLane) ?? null;
}

export const draft = {
  name: 'DRAFT',
  tags: ['draft'],
  duration: (p) => MAGNET.duration * (1 + 0.4 * (p - 1)),
  modifiers: () => ({ maxSpeed: 1.1, accel: 1.4 }),
  start(m) {
    m.race.events.emit('sfx', { name: 'magnet', kart: m.kart });
  },
  tick(m) {
    const k = m.kart;
    floorIt(k);
    const t = draftTarget(m.race, k);
    m.effect.target = null;
    if (!t) return;
    m.effect.draftOf = t;
    k.addEffect({ id: 'drafting', duration: 0.15, modifiers: { maxSpeed: 1 + (MAGNET.draftSpeed - 1) * Math.sqrt(m.power), accel: 2.5 }, tags: ['boost'] }, m.race);
  },
};

export const collect = {
  name: 'COLLECT',
  tick(m) {
    const k = m.kart;
    const reach = MAGNET.collectRadius * Math.sqrt(m.fieldPower);
    for (const e of m.race.entities) {
      if (e.kind !== 'item-box' || !e.availableTo(k, m.race.time)) continue;
      if (Math.hypot(e.x - k.x, e.y - k.y) > reach) continue;
      m.race.events.emit('magnet:grab', { kart: k, box: e });
      e.onKartTouch(k, m.race);
    }
  },
};

powerups.register({
  id: 'magnet',
  name: 'MAGNET',
  short: 'MAGNET',
  abbr: 'MAG',
  description: 'Draft karts ahead for a big tow, and pull nearby item boxes to you.',
  icon: 'magnet',
  weight: 1,
  motion: draft,
  field: collect,
});
