// Synthesised sound effects (no audio files). Browser only.
// The audio context starts on the first key press, as browsers require.

export class Sound {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engine = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, duration, { type = 'square', volume = 0.15, slideTo = null, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  noise(duration, { volume = 0.2, filter = 800, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const len = Math.ceil(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = filter;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(lp).connect(gain).connect(this.master);
    src.start(t);
  }

  play(name) {
    switch (name) {
      case 'menu': return this.tone(660, 0.06, { volume: 0.08 });
      case 'select': return this.tone(880, 0.1, { volume: 0.1, slideTo: 1320 });
      case 'countdown': return this.tone(440, 0.18, { volume: 0.12 });
      case 'go': return this.tone(880, 0.4, { volume: 0.14 });
      case 'box': return this.noise(0.12, { volume: 0.12, filter: 3000 });
      case 'pickup': return [0, 0.05, 0.1].forEach((d, i) => this.tone(660 + i * 220, 0.06, { volume: 0.08, delay: d }));
      case 'ready': return this.tone(1320, 0.08, { volume: 0.08 });
      case 'boost':
        this.noise(0.5, { volume: 0.18, filter: 1800 });
        return this.tone(180, 0.5, { type: 'sawtooth', volume: 0.1, slideTo: 720 });
      case 'rocket':
        this.noise(0.4, { volume: 0.14, filter: 2500 });
        return this.tone(300, 0.35, { type: 'sawtooth', volume: 0.07, slideTo: 900 });
      case 'spin': return this.tone(900, 0.5, { type: 'triangle', volume: 0.12, slideTo: 120 });
      case 'spring': return this.tone(220, 0.25, { type: 'triangle', volume: 0.12, slideTo: 880 });
      case 'land': return this.noise(0.12, { volume: 0.18, filter: 500 });
      case 'pop': return this.tone(600, 0.12, { type: 'triangle', volume: 0.1, slideTo: 1400 });
      case 'hook':
        this.noise(0.08, { volume: 0.1, filter: 4000 });
        return this.tone(1400, 0.15, { type: 'square', volume: 0.06, slideTo: 500 });
      case 'ghost': return this.tone(520, 0.5, { type: 'sine', volume: 0.12, slideTo: 260 });
      case 'hole':
        this.tone(90, 0.7, { type: 'sawtooth', volume: 0.1, slideTo: 40 });
        return this.noise(0.6, { volume: 0.08, filter: 300 });
      case 'bulk': return this.tone(110, 0.6, { type: 'square', volume: 0.1, slideTo: 55 });
      case 'bumper': return this.tone(400, 0.3, { type: 'triangle', volume: 0.1, slideTo: 1200 });
      case 'ricochet': return [0, 0.05].forEach((d, i) => this.tone(900 + i * 500, 0.07, { type: 'triangle', volume: 0.09, delay: d }));
      case 'blast':
        this.noise(0.45, { volume: 0.3, filter: 900 });
        return this.tone(160, 0.35, { type: 'square', volume: 0.08, slideTo: 40 });
      case 'fuse': return [0, 0.08].forEach((d, i) => this.tone(660 * (i + 1), 0.15, { type: 'triangle', volume: 0.1, delay: d }));
      case 'wild': return [0, 0.06, 0.12, 0.18, 0.24, 0.3].forEach((d, i) => this.tone(523 * [1, 1.25, 1.5, 2, 2.5, 3][i], 0.12, { type: 'square', volume: 0.08, delay: d }));
      // The sad horn: two flat honks sliding down.
      case 'fizzle': return [0, 0.22].forEach((d, i) => this.tone([330, 262][i], 0.3, { type: 'sawtooth', volume: 0.09, slideTo: [300, 180][i], delay: d }));
      case 'wall': return this.noise(0.15, { volume: 0.25, filter: 400 });
      case 'tires':
        this.noise(0.12, { volume: 0.2, filter: 300 });
        return this.tone(90, 0.15, { type: 'square', volume: 0.1, slideTo: 60 });
      case 'bump': return this.tone(140, 0.1, { volume: 0.12, slideTo: 70 });
      case 'lap': return [0, 0.09].forEach((d, i) => this.tone(784 + i * 262, 0.12, { volume: 0.1, delay: d }));
      case 'final-lap': return [0, 0.1, 0.2].forEach((d, i) => this.tone(523 * [1, 1.25, 1.5][i], 0.15, { volume: 0.12, delay: d }));
      case 'finish': return [0, 0.12, 0.24, 0.36].forEach((d, i) => this.tone(523 * [1, 1.25, 1.5, 2][i], 0.22, { volume: 0.12, delay: d }));
      default: return undefined;
    }
  }

  /** A quiet engine hum that follows the player's speed (0..1+). */
  setEngine(level) {
    if (!this.ctx) return;
    if (!this.engine) {
      const osc = this.ctx.createOscillator();
      const lp = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      lp.type = 'lowpass';
      lp.frequency.value = 500;
      gain.gain.value = 0;
      osc.connect(lp).connect(gain).connect(this.master);
      osc.start();
      this.engine = { osc, gain };
    }
    const t = this.ctx.currentTime;
    this.engine.osc.frequency.setTargetAtTime(55 + level * 95, t, 0.05);
    this.engine.gain.gain.setTargetAtTime(level > 0.01 ? 0.035 : 0.012, t, 0.1);
  }

  stopEngine() {
    if (!this.engine) return;
    this.engine.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  /** Wire race events to sounds. Returns an unsubscribe function. */
  attach(race) {
    const offs = [];
    const on = (type, fn) => offs.push(race.events.on(type, fn));
    const mine = (k) => k && k === race.player;
    on('countdown', () => this.play('countdown'));
    on('go', () => this.play('go'));
    on('item:box', ({ kart }) => mine(kart) && this.play('box'));
    on('item:pickup', ({ kart }) => mine(kart) && this.play('pickup'));
    on('sfx', ({ name, kart }) => (!kart || mine(kart)) && this.play(name));
    on('wall', ({ kart }) => mine(kart) && this.play('wall'));
    on('tires:hit', ({ kart }) => mine(kart) && this.play('tires'));
    on('tires:shove', ({ kart }) => mine(kart) && this.play('bump'));
    on('bump', ({ a, b }) => (mine(a) || mine(b)) && this.play('bump'));
    on('lap', ({ kart, lap }) => mine(kart) && lap < race.laps - 1 && this.play('lap'));
    on('final-lap', ({ kart }) => mine(kart) && this.play('final-lap'));
    on('finish', ({ kart }) => mine(kart) && this.play('finish'));
    return () => offs.forEach((off) => off());
  }
}
