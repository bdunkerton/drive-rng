// Draws the world for a race: track, entities, karts, particles, through a camera
// that follows one kart. Also turns race events into particles and screen shake.

import { VIEW } from '../config.js';
import { PAL } from './palette.js';
import { paintTrack } from './trackArt.js';
import { kartFrame, kartShadow, KART_SPRITE_SIZE } from './sprites.js';
import { drawEntity } from './entityArt.js';
import { Particles } from './particles.js';
import { clamp, lerp } from '../core/math.js';

const trackArtCache = new Map();

export class RaceView {
  constructor(race) {
    this.race = race;
    const track = race.track;
    if (!trackArtCache.has(track.id)) trackArtCache.set(track.id, paintTrack(track));
    this.trackArt = trackArtCache.get(track.id);
    this.particles = new Particles();
    this.shake = 0;
    this.target = race.player ?? race.karts[0];
    this.camX = this.target.x - VIEW.width / 2;
    this.camY = this.target.y - VIEW.height / 2;
    this.unsubscribe = this.listen(race);
  }

  listen(race) {
    const offs = [];
    const on = (type, fn) => offs.push(race.events.on(type, fn));
    on('item:box', ({ box }) => this.particles.burst(box.x, box.y, 14, ['#f05a4a', '#f2c14b', '#5ec46a', '#4aa8f0', '#fff'], 55));
    on('wall', ({ kart, impact }) => {
      this.particles.burst(kart.x, kart.y, 6, [PAL.white, PAL.silver], 40, 0.3);
      if (kart === this.target) this.shake = Math.min(4, impact / 25);
    });
    on('bump', ({ a, b, impact }) => {
      this.particles.burst((a.x + b.x) / 2, (a.y + b.y) / 2, 6, [PAL.boostHot, PAL.white], 50, 0.25);
      if (a === this.target || b === this.target) this.shake = Math.min(3, impact / 30);
    });
    const ring = (x, y, radius, colours, count = 28, speed = 20, life = 0.35) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        this.particles.emit({ x: x + Math.cos(a) * radius * 0.5, y: y + Math.sin(a) * radius * 0.5, vx: Math.cos(a) * speed * (radius / 20), vy: Math.sin(a) * speed * (radius / 20), life, colour: colours[i % colours.length], drag: 2 });
      }
    };
    const near = (x, y) => Math.hypot(x - this.target.x, y - this.target.y) < 70;
    on('item:use', ({ kart, wild, kind }) => {
      if (wild) {
        ring(kart.x, kart.y, 30, [PAL.gold, '#d29bff', '#5fd8f0', '#f07ab8'], 36, 30, 0.6);
        if (kart === this.target) this.shake = 3;
      }
      if (kind === 'fizzle') this.particles.burst(kart.x, kart.y, 18, ['#f07ab8', '#5fd8f0', PAL.gold, PAL.silver], 30, 0.7);
    });
    on('item:fuse', ({ kart, kind, wild }) => {
      if (kind === 'fizzle') this.particles.burst(kart.x, kart.y, 10, [PAL.silver, '#6a6e78'], 25, 0.5);
      else this.particles.burst(kart.x, kart.y, wild ? 30 : 16, wild ? [PAL.gold, '#d29bff', '#5fd8f0', PAL.white] : [PAL.gold, PAL.white, '#9b52d2'], wild ? 65 : 45, 0.5);
    });
    on('tires:hit', ({ kart, tires, impact }) => {
      this.particles.burst((kart.x + tires.x) / 2, (kart.y + tires.y) / 2, 8, ['#34333b', PAL.white, PAL.silver], 45, 0.3);
      if (kart === this.target) this.shake = Math.min(4, impact / 25);
    });
    on('tires:shove', ({ tires }) => this.particles.burst(tires.x, tires.y, 8, ['#34333b', '#8a6a3a'], 40, 0.35));
    on('hit', ({ kart }) => {
      this.particles.burst(kart.x, kart.y, 14, [PAL.white, PAL.boostHot, PAL.danger], 60, 0.45);
      if (kart === this.target) this.shake = 4;
    });
    on('blast', ({ x, y, radius }) => {
      ring(x, y, radius, [PAL.boostHot, PAL.boost, PAL.danger, PAL.white], 36, 26, 0.4);
      this.particles.burst(x, y, 20, [PAL.white, PAL.boostHot, PAL.boost], 70, 0.4);
      if (near(x, y)) this.shake = Math.max(this.shake, 4);
    });
    on('bounce', ({ x, y, radius }) => ring(x, y, radius, ['#c8ccd6', PAL.white], 24, 18, 0.3));
    on('pop', ({ kart }) => this.particles.burst(kart.x, kart.y, 10, [PAL.white, '#c8ccd6', PAL.gold], 40, 0.35));
    on('land', ({ kart, big }) => {
      this.particles.burst(kart.x, kart.y, big ? 12 : 6, ['#8a6a3a', PAL.silver], 35, 0.3);
      if (big && kart === this.target) this.shake = Math.max(this.shake, 2);
    });
    on('slipstream', ({ x, y, radius }) => ring(x, y, radius, [PAL.boost, PAL.boostHot], 20, 22, 0.3));
    on('hole:pop', ({ kart, x, y }) => {
      ring(x, y, 20, ['#9b52d2', '#d29bff', PAL.white], 24, 30, 0.45);
      if (kart === this.target) this.shake = Math.max(this.shake, 2);
    });
    on('ricochet', ({ kart }) => this.particles.burst(kart.x, kart.y, 10, ['#9fe2ff', '#3c9fe0', PAL.white], 55, 0.3));
    on('hook:release', ({ kart }) => this.particles.burst(kart.x, kart.y, 12, [PAL.silver, PAL.boostHot], 45, 0.35));
    on('vanish', ({ kart }) => this.particles.burst(kart.x, kart.y, 14, ['#dfe8ff', '#9fe2ff'], 35, 0.5));
    on('shove', ({ other }) => this.particles.burst(other.x, other.y, 6, ['#7fe05a', PAL.white], 40, 0.25));
    on('effect:start', ({ kart, effect }) => {
      if (effect.tags.includes('giant')) this.particles.burst(kart.x, kart.y, 18, ['#7fe05a', PAL.white], 55, 0.5);
    });
    return () => offs.forEach((off) => off());
  }

  /** Change which kart the camera follows. */
  follow(kart) {
    this.target = kart;
  }

  update(dt) {
    const race = this.race;
    // Cosmetic emitters driven by kart state.
    for (const k of race.karts) {
      const fx = Math.cos(k.heading);
      const fy = Math.sin(k.heading);
      if (k.effects.hasTag('boost')) {
        for (let i = 0; i < 2; i++) {
          this.particles.emit({
            x: k.x - fx * 6 + (Math.random() - 0.5) * 3,
            y: k.y - fy * 6 + (Math.random() - 0.5) * 3,
            vx: -fx * 30 + (Math.random() - 0.5) * 12,
            vy: -fy * 30 + (Math.random() - 0.5) * 12,
            life: 0.18 + Math.random() * 0.12,
            colour: Math.random() < 0.5 ? PAL.boost : PAL.boostHot,
          });
        }
      }
      if (k.effects.hasTag('ride')) {
        for (let i = 0; i < 3; i++) {
          this.particles.emit({ x: k.x - fx * 7, y: k.y - fy * 7, vx: -fx * 60 + (Math.random() - 0.5) * 25, vy: -fy * 60 + (Math.random() - 0.5) * 25, life: 0.25, colour: i === 0 ? PAL.white : Math.random() < 0.5 ? '#e0463a' : PAL.boostHot });
        }
      }
      if (k.effects.hasTag('fall') && Math.random() < 0.8) {
        this.particles.emit({ x: k.x + (Math.random() - 0.5) * 10, y: k.y + (Math.random() - 0.5) * 10, vx: -k.vx * 0.2, vy: -k.vy * 0.2, life: 0.3, colour: Math.random() < 0.5 ? '#9b52d2' : '#d29bff' });
      }
      if (k.surface === 'grass' && k.speed > 30 && k.height === 0 && !k.effects.hasTag('phase') && Math.random() < 0.6) {
        this.particles.emit({
          x: k.x - fx * 5, y: k.y - fy * 5,
          vx: -fx * 15 + (Math.random() - 0.5) * 20, vy: -fy * 15 + (Math.random() - 0.5) * 20,
          life: 0.35, colour: Math.random() < 0.5 ? '#8a6a3a' : '#3f7f2c',
        });
      }
    }
    this.particles.update(dt);

    // Camera: lead slightly in the direction of travel, ease toward it.
    const t = this.target;
    const goalX = t.x + t.vx * 0.45 - VIEW.width / 2;
    const goalY = t.y + t.vy * 0.45 - VIEW.height / 2;
    const ease = clamp(dt * 6, 0, 1);
    this.camX = lerp(this.camX, goalX, ease);
    this.camY = lerp(this.camY, goalY, ease);
    const { width: W, height: H } = this.race.track.world;
    this.camX = clamp(this.camX, 0, W - VIEW.width);
    this.camY = clamp(this.camY, 0, H - VIEW.height);
    this.shake = Math.max(0, this.shake - dt * 12);
  }

  draw(g) {
    const sx = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake * 2) : 0;
    const sy = this.shake > 0 ? Math.round((Math.random() - 0.5) * this.shake * 2) : 0;
    const camX = Math.round(this.camX) + sx;
    const camY = Math.round(this.camY) + sy;
    this.drawCamX = camX;
    this.drawCamY = camY;

    g.fillStyle = PAL.forest;
    g.fillRect(0, 0, VIEW.width, VIEW.height);
    g.drawImage(this.trackArt, camX, camY, VIEW.width, VIEW.height, 0, 0, VIEW.width, VIEW.height);

    const onScreen = (x, y, m = 16) => x > camX - m && x < camX + VIEW.width + m && y > camY - m && y < camY + VIEW.height + m;

    const view = { viewer: this.target, time: this.race.time };
    for (const e of this.race.entities) {
      if (onScreen(e.x, e.y)) drawEntity(g, e, Math.round(e.x - camX), Math.round(e.y - camY), view);
    }

    const karts = [...this.race.karts].sort((a, b) => a.y - b.y);
    for (const k of karts) {
      if (!onScreen(k.x, k.y, 30)) continue;
      // Giants draw at a whole-number scale so their pixels stay square.
      const scale = Math.max(1, Math.round(k.scale));
      const size = KART_SPRITE_SIZE * scale;
      const half = Math.floor(size / 2);
      const cx = Math.round(k.x - camX);
      const cy = Math.round(k.y - camY);
      const lift = Math.round(k.height);
      const x = cx - half;
      const y = cy - half - lift;
      g.globalAlpha = lift > 0 ? 0.25 : 0.35;
      g.drawImage(kartShadow(k.heading), x + scale + Math.round(lift * 0.3), y + 2 * scale + lift, size, size);
      // Phased karts flicker see-through.
      const ghost = k.effects.hasTag('phase');
      g.globalAlpha = ghost ? (Math.floor(this.race.time * 20) % 2 ? 0.35 : 0.55) : 1;
      g.drawImage(kartFrame(k.color, k.heading), x, y, size, size);
      g.globalAlpha = 1;
      this.drawKartExtras(g, k, cx, cy - lift, scale);
    }

    // A little marker over the player's kart before the start so you can find yourself.
    const p = this.race.player;
    if (p && this.race.phase === 'countdown') {
      const x = Math.round(p.x - camX);
      const y = Math.round(p.y - camY) - 10;
      g.fillStyle = PAL.white;
      g.fillRect(x - 2, y, 5, 1);
      g.fillRect(x - 1, y + 1, 3, 1);
      g.fillRect(x, y + 2, 1, 1);
    }

    this.particles.draw(g, camX, camY);
  }

  /** Bumper bubbles, hook lines and spin-out stars. */
  drawKartExtras(g, k, cx, cy, scale) {
    const bumper = k.effects.active.find((e) => e.tags.includes('bumper'));
    if (bumper && !(bumper.remaining < 1.5 && Math.floor(bumper.remaining * 8) % 2)) {
      const r = 9 * scale;
      g.fillStyle = '#9fe2ff';
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2 + this.race.time * 1.5;
        const wobble = Math.sin(a * 3 + this.race.time * 8) * 0.8;
        g.fillRect(Math.round(cx + Math.cos(a) * (r + wobble)), Math.round(cy + Math.sin(a) * (r + wobble)), 1, 1);
      }
    }
    const tether = k.effects.active.find((e) => e.target);
    if (tether) {
      const t = tether.target;
      const camX = this.drawCamX;
      const camY = this.drawCamY;
      const tx = Math.round(t.x - camX);
      const ty = Math.round(t.y - camY - t.height);
      const n = Math.max(2, Math.round(Math.hypot(tx - cx, ty - cy) / 3));
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const sag = Math.sin(Math.PI * u) * 3;
        g.fillStyle = i % 2 ? '#a5743e' : PAL.silver;
        g.fillRect(Math.round(cx + (tx - cx) * u), Math.round(cy + (ty - cy) * u + sag), 1, 1);
      }
    }
    if (k.effects.has('spinout')) {
      for (let i = 0; i < 3; i++) {
        const a = this.race.time * 9 + (i * Math.PI * 2) / 3;
        g.fillStyle = i % 2 ? PAL.white : PAL.boostHot;
        g.fillRect(Math.round(cx + Math.cos(a) * 6) - 1, Math.round(cy - 9 * scale + Math.sin(a) * 2), 2, 2);
      }
    }
  }

  dispose() {
    this.unsubscribe();
  }
}
