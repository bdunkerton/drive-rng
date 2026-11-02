// Seeded random numbers. Everything random in a race comes from the race's Rng,
// so the same seed always replays the same race (handy for chaos items later).
// Algorithm: mulberry32.

export class Rng {
  constructor(seed = Date.now()) {
    this.seed = Rng.hashSeed(seed);
    this.state = this.seed;
  }

  static hashSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
    // Strings (e.g. "?seed=banana") hash to a number.
    const s = String(seed);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** A float in [0, 1). */
  next() {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** A float in [min, max). */
  range(min, max) {
    return min + (max - min) * this.next();
  }

  /** An integer in [min, max] inclusive. */
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  pick(list) {
    return list[Math.floor(this.next() * list.length)];
  }

  /**
   * Pick from [{ item, weight }, ...]. Zero or negative weights never win.
   * Returns null if nothing has a positive weight.
   */
  weighted(entries) {
    let total = 0;
    for (const e of entries) if (e.weight > 0) total += e.weight;
    if (total <= 0) return null;
    let roll = this.next() * total;
    for (const e of entries) {
      if (e.weight <= 0) continue;
      roll -= e.weight;
      if (roll < 0) return e.item;
    }
    // Float rounding can leave a sliver; give it to the last valid entry.
    for (let i = entries.length - 1; i >= 0; i--) if (entries[i].weight > 0) return entries[i].item;
    return null;
  }

  /** A child generator, so one system's randomness doesn't shift another's. */
  fork(label = '') {
    return new Rng((this.next() * 4294967296) ^ Rng.hashSeed(label));
  }
}
