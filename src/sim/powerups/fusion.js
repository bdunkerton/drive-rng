// The fusion rule. Fuse two items (first slot A, second slot B) and you get:
//
//   A + A          MEGA: A's own motion and field, at double strength.
//   A + opposite   FIZZLE: they cancel. You get A alone at half strength, and a sad horn.
//   A + B          FUSION: A's MOTION with B's FIELD. Order matters.
//
// One Mega or Fusion in ten comes out WILD (rolled when you fuse): stronger, with a
// slow-motion moment. Randomness only ever makes a fusion better, never worse.
//
// A few fusions have names (showcases). The name is the only thing special about them:
// the rule above is what they do.

import { FUSION } from '../../config.js';
import { powerups } from './registry.js';

powerups.registerShowcase({ motion: 'black-hole', field: 'boost', name: 'WHITE HOLE', description: 'Fall into the hole, then burst out of it in a speed field that flings everyone nearby forward.' });
powerups.registerShowcase({ motion: 'hook', field: 'boost', name: 'SLINGSHOT', description: 'Latch onto the kart ahead and shoot past it down a speed lane.' });
powerups.registerShowcase({ motion: 'spring', field: 'rocket', name: 'METEOR', description: 'A huge jump, then you slam down with a blast that scatters the pack.' });
powerups.registerShowcase({ motion: 'rocket', field: 'spring', name: 'SKIP STONE', description: 'A rocket run that pops into the air every kart it passes.' });
powerups.registerShowcase({ motion: 'boost', field: 'ghost', name: 'WORMHOLE', description: 'A dash where everything in your way ghosts out of it.' });
powerups.registerShowcase({ motion: 'bumper', field: 'black-hole', name: 'PINBALL', description: 'Karts get dragged into you and bounce off, and every bounce kicks you forward.' });
powerups.registerShowcase({ motion: 'bulk', field: 'hook', name: 'SNOWBALL', description: 'You are huge and dragging karts into you, then shoving them off.' });
powerups.registerShowcase({ motion: 'ghost', field: 'boost', name: 'GHOST LANE', description: 'Phase forward and leave a speed lane others can ride.' });

const NAME_LIMIT = 12;

/**
 * What an item is and how it runs.
 * @param {{ parts: string[], wild?: boolean }} item
 * @returns {{ kind: 'single'|'mega'|'fusion'|'fizzle', a: any, b: any, motionDef: any, fieldDef: any,
 *   power: number, fieldPower: number, showcase: any, wild: boolean, name: string }}
 */
export function resolveItem(item) {
  const [aId, bId] = item.parts;
  const a = powerups.get(aId);
  const b = bId ? powerups.get(bId) : null;
  const wild = !!item.wild;
  const boost = wild ? FUSION.wildPower : 1;
  let kind;
  let motionDef = a;
  let fieldDef = a;
  let power = 1;
  if (!b) kind = 'single';
  else if (aId === bId) {
    kind = 'mega';
    power = FUSION.megaPower;
  } else if (powerups.areOpposites(aId, bId)) {
    kind = 'fizzle';
    power = FUSION.fizzlePower;
  } else {
    kind = 'fusion';
    fieldDef = b;
    power = FUSION.fusionPower;
  }
  const showcase = kind === 'fusion' ? powerups.showcase(aId, bId) : null;
  const r = { kind, a, b, motionDef, fieldDef, power: power * boost, fieldPower: power * boost, showcase, wild };
  r.name = nameFor(r);
  return r;
}

function nameFor({ kind, a, b, showcase }) {
  if (!a) return '?';
  if (kind === 'single') return a.name;
  if (kind === 'mega') {
    const n = `MEGA ${a.name}`;
    return n.length <= NAME_LIMIT ? n : `MEGA ${a.short}`;
  }
  if (kind === 'fizzle') return 'FIZZLE';
  if (showcase) return showcase.name;
  for (const [x, y] of [[a.name, b.name], [a.short, b.short], [a.abbr, b.abbr]]) {
    const n = `${x}+${y}`;
    if (n.length <= NAME_LIMIT) return n;
  }
  return `${a.abbr}+${b.abbr}`;
}

/** What fusing these two items would make (before the WILD roll), for the HUD preview. */
export function previewFusion(aId, bId) {
  return resolveItem({ parts: [aId, bId] });
}
