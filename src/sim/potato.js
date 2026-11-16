// The hot potato: one in every race (when it's switched on). Whoever holds it is faster
// but has a fuse. Touch another kart and it's theirs, with a fresh fuse; they can't hand
// it straight back to you. If the fuse runs out, the holder spins, and after a moment the
// potato turns up again: at the start with whoever's last, after that with whoever's
// closest behind another kart (so there's always someone to chase, and a kart stuck at
// the back doesn't get it over and over).

import { POTATO, HITS, ROYALE } from '../config.js';
import { spinoutEffect } from './hits.js';
import { toast } from './toast.js';

export class Potato {
  /** @param {{ royale?: boolean, respawnIn?: number }} [opts] */
  constructor(race, opts = {}) {
    this.race = race;
    this.royale = !!opts.royale;
    this.keepFuse = !!opts.keepFuse; // royale 2: passing doesn't reset the fuse
    this.fullFuse = 0;
    this.lockedFrom = null;   // royale: the kart that just gave it; no passing back until apart
    this.retired = false;
    /** @type {import('./kart.js').Kart|null} */
    this.holder = null;
    this.fuse = 0;
    this.giver = null;        // who passed it to the holder
    this.immune = new Map();  // kart -> race time until which it can't be handed the potato
    this.heldFor = 0;
    this.respawnIn = opts.respawnIn ?? POTATO.firstDelay;
    this.passes = 0;
    this.booms = 0;
  }

  /** Seconds of fuse left as a fraction of a full fuse (1 = fresh). */
  get fuseFraction() {
    return this.holder ? Math.max(0, this.fuse / (this.fullFuse || this.fuseSeconds)) : 0;
  }

  get fuseSeconds() {
    return this.royale ? ROYALE.fuseSeconds : POTATO.fuseSeconds;
  }

  /** Can this kart be handed the potato right now? */
  canTake(kart) {
    if (kart.finished || kart.out || kart.hasPotato || kart.effects.hasTag('air') || kart.effects.hasTag('phase')) return false;
    if (this.royale) return kart !== this.lockedFrom;
    return (this.immune.get(kart) ?? -Infinity) <= this.race.time;
  }

  step(dt) {
    const race = this.race;
    if (race.phase !== 'racing' || this.retired) return;
    if (!this.holder) {
      this.respawnIn -= dt;
      if (this.respawnIn <= 0) this.give(this.booms === 0 && this.passes === 0 ? this.lastPlace() : this.closestChaser(this.lastBoomed), null);
      return;
    }
    // A holder that finishes hands it to the back of the pack (no boom).
    if (this.holder.finished) {
      this.give(this.closestChaser(this.holder), null);
      return;
    }
    // Royale: once the giver and the holder have separated, it can go back.
    const lf = this.lockedFrom;
    if (lf && (lf.out || Math.hypot(lf.x - this.holder.x, lf.y - this.holder.y) > lf.radius + this.holder.radius + 4)) this.lockedFrom = null;
    this.heldFor += dt;
    const before = Math.ceil(this.fuse);
    this.fuse -= dt;
    if (Math.ceil(this.fuse) !== before && this.fuse > 0 && this.fuse < 3) this.race.events.emit('sfx', { name: 'tick', kart: this.holder });
    if (this.fuse <= 0) this.boom();
  }

  /** The holder left the race (royale): the potato goes back into the air. */
  drop() {
    if (this.holder) this.holder.hasPotato = false;
    this.holder = null;
    this.lockedFrom = null;
    this.respawnIn = POTATO.respawnSeconds;
  }

  /** Called by the race for every pair of karts touching this step. */
  touch(a, b) {
    if (!this.holder || (!this.royale && this.heldFor < POTATO.holdMinSeconds)) return;
    if (a === this.holder && this.canTake(b)) this.pass(b);
    else if (b === this.holder && this.canTake(a)) this.pass(a);
  }

  pass(to) {
    // One hand-off per step, so it can't ripple through a whole bunch in one frame.
    if (this.lastPassStep === this.race.steps) return;
    this.lastPassStep = this.race.steps;
    const from = this.holder;
    this.give(to, from);
    this.passes++;
  }

  give(to, from) {
    if (this.holder) this.holder.hasPotato = false;
    this.holder = to ?? null;
    if (!to) {
      this.respawnIn = POTATO.respawnSeconds;
      return;
    }
    to.hasPotato = true;
    if (!this.keepFuse) this.fuse = this.fullFuse = this.fuseSeconds;
    else if (!from) {
      // Fewer karts left, shorter fuses: the endgame speeds up.
      const race = this.race;
      const scale = Math.max(ROYALE.shortenTo, race.karts.length / (race.karts.length + race.out.length));
      this.fuse = this.fullFuse = race.rng.range(ROYALE.keepFuseMin, ROYALE.keepFuseMax) * scale;
    }
    this.giver = from;
    this.heldFor = 0;
    this.lockedFrom = from;
    if (from && !this.royale) this.immune.set(from, this.race.time + POTATO.noTagBackSeconds);
    const race = this.race;
    race.events.emit('potato:pass', { from, to });
    race.events.emit('sfx', { name: 'potato', kart: to });
    if (from) {
      race.events.emit('sfx', { name: 'potato-off', kart: from });
      toast(race, from, `PASSED IT TO ${to.name}!`, 'good');
      toast(race, to, `${from.name} GOT YOU! HOT POTATO!`, 'bad');
    } else {
      toast(race, to, 'HOT POTATO! PASS IT ON!', 'bad');
    }
  }

  boom() {
    const race = this.race;
    const kart = this.holder;
    kart.hasPotato = false;
    this.holder = null;
    this.giver = null;
    this.respawnIn = POTATO.respawnSeconds;
    this.booms++;
    this.lastBoomed = kart;
    this.lockedFrom = null;
    if (this.royale) {
      race.events.emit('potato:boom', { kart });
      race.events.emit('blast', { x: kart.x, y: kart.y, radius: 26 });
      race.events.emit('sfx', { name: 'blast' });
      race.eliminate(kart);
      // Too many potatoes for the karts left? This one doesn't come back.
      if (race.potatoes.filter((p) => !p.retired).length > race.wantedPotatoes()) this.retired = true;
      return;
    }
    // The boom always lands, whatever the kart is doing (unless it's already spinning).
    if (!kart.effects.has('spinout')) {
      const spin = spinoutEffect();
      spin.duration = HITS.spinSeconds * POTATO.boomSpinScale;
      kart.addEffect(spin, race);
    }
    kart.spunAt = race.time;
    // Knock it sideways a little and take most of its speed.
    kart.vx *= POTATO.boomKeepSpeed;
    kart.vy *= POTATO.boomKeepSpeed;
    race.events.emit('potato:boom', { kart });
    race.events.emit('blast', { x: kart.x, y: kart.y, radius: 26 });
    race.events.emit('sfx', { name: 'blast' });
    toast(race, kart, 'BOOM! TOO SLOW!', 'bad');
  }

  /** The kart with the smallest gap to the kart ahead of it (optionally not this one). */
  closestChaser(not = null) {
    const racing = this.race.order.filter((k) => !k.finished);
    let best = null;
    let bestGap = Infinity;
    for (let i = 1; i < racing.length; i++) {
      const k = racing[i];
      if (k === not || !this.canTake(k)) continue;
      const gap = racing[i - 1].progress - k.progress;
      if (gap < bestGap) {
        bestGap = gap;
        best = k;
      }
    }
    return best ?? this.lastPlace(not);
  }

  /** The kart furthest back that's still racing (optionally not this one). */
  lastPlace(not = null) {
    const racing = this.race.order.filter((k) => !k.finished && k !== not && this.canTake(k));
    return racing.length ? racing[racing.length - 1] : null;
  }
}
