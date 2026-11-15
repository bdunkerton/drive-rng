// What happened to the player in one lab race, so feedback comes with facts attached
// ("felt random" reads differently next to "passed the potato 6 times").

export class Telemetry {
  constructor(race) {
    this.race = race;
    const p = race.player;
    this.t = {
      place: null, of: race.karts.length, time: null,
      rams: 0, spunOut: 0, bumps: 0, wallHits: 0,
      draftSeconds: 0, slingshots: 0,
      potatoGot: 0, potatoPassed: 0, potatoBooms: 0, potatoSeconds: 0,
      vaults: 0,
      shots: 0, chainHits: 0, bestChain: 0,
      nearMisses: 0, focusSeconds: 0,
    };
    const t = this.t;
    const on = (type, fn) => race.events.on(type, fn);
    this.offs = [
      on('ram', ({ by }) => by === p && t.rams++),
      on('hit', ({ kart }) => kart === p && t.spunOut++),
      on('potato:boom', ({ kart }) => {
        if (kart === p) {
          t.potatoBooms++;
          t.spunOut++;
        }
      }),
      on('bump', ({ a, b }) => (a === p || b === p) && t.bumps++),
      on('wall', ({ kart }) => kart === p && t.wallHits++),
      on('draft:slingshot', ({ kart }) => kart === p && t.slingshots++),
      on('potato:pass', ({ from, to }) => {
        if (to === p) t.potatoGot++;
        if (from === p) t.potatoPassed++;
      }),
      on('vault', ({ kart }) => kart === p && t.vaults++),
      on('billiards:shot', ({ by }) => by === p && t.shots++),
      on('billiards:hit', ({ by, chain }) => {
        if (by !== p) return;
        t.chainHits++;
        t.bestChain = Math.max(t.bestChain, chain);
      }),
      on('nearmiss', ({ kart }) => kart === p && t.nearMisses++),
      on('finish', ({ kart, place, time }) => {
        if (kart !== p) return;
        t.place = place;
        t.time = Math.round(time * 10) / 10;
      }),
    ];
  }

  /** Call once per race step. */
  step(dt) {
    const p = this.race.player;
    if (!p || p.finished || this.race.phase !== 'racing') return;
    if (p.draft > 0.5) this.t.draftSeconds += dt;
    if (p.hasPotato) this.t.potatoSeconds += dt;
  }

  addFocus(realSeconds) {
    this.t.focusSeconds += realSeconds;
  }

  /** The numbers, rounded, for storing and sending. */
  summary() {
    const out = { ...this.t };
    if (out.place === null && this.race.player) out.place = this.race.player.position;
    for (const k of ['draftSeconds', 'potatoSeconds', 'focusSeconds']) out[k] = Math.round(out[k] * 10) / 10;
    return out;
  }

  dispose() {
    this.offs.forEach((off) => off());
  }
}
