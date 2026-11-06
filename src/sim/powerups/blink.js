// BLINK. Motion WARP: you teleport a short way up the road, keeping your speed and
// the angle you were at, straight through anything in between. Field AFTERIMAGE: a solid
// copy of you is left where you were, for a couple of seconds. Collateral: the kart
// behind you drives into it.

import { powerups } from './registry.js';
import { Decoy } from '../obstacles.js';

export const BLINK = {
  distance: 75,
  duration: 0.3,
  afterimage: 2.5,
};

export const warp = {
  name: 'WARP',
  tags: ['phase', 'warp'],
  duration: (p) => BLINK.duration,
  start(m) {
    const k = m.kart;
    const track = m.race.track;
    m.data.from = { x: k.x, y: k.y, s: k.s, lateral: k.lateral };
    const d = BLINK.distance * Math.sqrt(m.power);
    const lateral = Math.max(-track.halfWidth + 4, Math.min(track.halfWidth - 4, k.lateral));
    const here = track.headingAt(k.s);
    const p = track.pointAt(k.s + d, lateral);
    // Keep your angle to the road and your speed, just further on.
    const turn = p.angle - here;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const vx = k.vx * cos - k.vy * sin;
    const vy = k.vx * sin + k.vy * cos;
    k.x = p.x;
    k.y = p.y;
    k.vx = vx;
    k.vy = vy;
    k.heading += turn;
    k.trackIndex = -1;
    m.race.events.emit('blink', { kart: k, from: m.data.from, to: { x: p.x, y: p.y } });
    m.race.events.emit('sfx', { name: 'blink', kart: k });
  },
};

export const afterimage = {
  name: 'AFTERIMAGE',
  start(m) {
    // Fused onto another motion, the copy goes just behind you.
    const from = m.data.from ?? { s: m.kart.s - 14, lateral: m.kart.lateral };
    m.race.spawn(new Decoy(m.race.track, m.kart, from.s, from.lateral, BLINK.afterimage * Math.sqrt(m.fieldPower)));
  },
};

powerups.register({
  id: 'blink',
  name: 'BLINK',
  short: 'BLINK',
  abbr: 'BLI',
  description: 'Teleport a short way up the road, leaving a solid copy of you behind.',
  icon: 'blink',
  weight: 1,
  opposite: 'moonwalk',
  motion: warp,
  field: afterimage,
});
