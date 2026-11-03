// Named combos. Fuse items whose parts include a recipe's parts and you get the recipe
// instead of those parts on their own. Anything else fused in still runs as normal, so
// RAM + ROCKET is a ram and a rocket. Every other pairing still works: it just runs
// both parts (BOOST+ROCKET boosts and fires), and two of the same make a SUPER.

import { powerups } from './registry.js';
import { boostDuration } from './speedBoost.js';
import { growDuration } from './grow.js';
import { doSwap } from './swap.js';
import { fireRockets } from './rocket.js';
import { dropBananas } from './banana.js';
import { toast } from '../toast.js';

const partPower = (ctx, id) => ctx.parts.find((p) => p.id === id)?.power ?? 1;

/** While a kart has this, bumping into anyone spins them out (race.resolveBumps). */
export function addRam(kart, race, duration) {
  kart.addEffect({ id: 'ram', duration, tags: ['ram'] }, race);
}

powerups.registerRecipe({
  id: 'ram',
  name: 'RAM',
  abbr: 'RAM',
  parts: ['speed-boost', 'shield'],
  icon: 'ram',
  description: 'BOOST + SHIELD: a shielded charge. Anyone you hit while boosting spins out.',
  use(ctx) {
    ctx.runParts();
    addRam(ctx.kart, ctx.race, boostDuration(partPower(ctx, 'speed-boost')));
    toast(ctx.race, ctx.kart, 'RAM!', 'gold');
  },
});

powerups.registerRecipe({
  id: 'stampede',
  name: 'STAMPEDE',
  abbr: 'STP',
  parts: ['speed-boost', 'grow'],
  icon: 'stampede',
  description: 'BOOST + GROW: a giant at full speed. Anyone you touch while giant spins out.',
  use(ctx) {
    ctx.runParts();
    addRam(ctx.kart, ctx.race, growDuration(partPower(ctx, 'grow')));
    toast(ctx.race, ctx.kart, 'STAMPEDE!', 'gold');
  },
});

powerups.registerRecipe({
  id: 'heist',
  name: 'HEIST',
  abbr: 'HST',
  parts: ['rocket', 'magnet'],
  icon: 'heist',
  description: 'ROCKET + MAGNET: a rocket that steals the victim\'s front item when it hits.',
  use(ctx) {
    fireRockets(ctx, { steal: true });
    toast(ctx.race, ctx.kart, 'HEIST!', 'gold');
  },
});

powerups.registerRecipe({
  id: 'decoy',
  name: 'DECOY',
  abbr: 'DCY',
  parts: ['swap', 'banana'],
  icon: 'decoy',
  description: 'SWAP + BANANA: swap with the leader and leave bananas right in front of them.',
  use(ctx) {
    const { race, kart } = ctx;
    const victim = doSwap({ ...ctx, power: partPower(ctx, 'swap') });
    const bananas = { ...ctx, power: partPower(ctx, 'banana') };
    if (victim) dropBananas(bananas, { at: victim.s + 22, lateral: victim.lateral });
    else dropBananas(bananas);
    toast(race, kart, 'DECOY!', 'gold');
  },
});
