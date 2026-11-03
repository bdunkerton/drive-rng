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
    on('item:use', ({ kart, parts }) => {
      if (parts.includes('speed-boost')) this.particles.burst(kart.x, kart.y, 10, [PAL.boost, PAL.boostHot], 35, 0.35);
    });
    on('item:fuse', ({ kart }) => this.particles.burst(kart.x, kart.y, 16, [PAL.gold, PAL.white, '#9b52d2'], 45, 0.5));
    on('hit', ({ kart }) => {
      this.particles.burst(kart.x, kart.y, 14, [PAL.white, PAL.boostHot, PAL.danger], 60, 0.45);
      if (kart === this.target) this.shake = 4;
    });
    on('shield:pop', ({ kart }) => this.particles.burst(kart.x, kart.y, 16, ['#9fe2ff', '#3c9fe0', PAL.white], 55, 0.4));
    on('banana:squash', ({ banana }) => this.particles.burst(banana.x, banana.y, 12, ['#f5d442', '#c9a21e'], 50, 0.4));
    on('rocket:fizzle', ({ rocket }) => this.particles.burst(rocket.x, rocket.y, 8, [PAL.silver, PAL.boost], 30, 0.4));
    on('swap', ({ a, b, from }) => {
      for (const p of [from.a, from.b, a, b]) this.particles.burst(p.x, p.y, 18, ['#5fd8f0', '#f07ab8', PAL.white], 50, 0.6);
    });
    on('steal', ({ thief, victim }) => {
      // A trail of sparks from the victim to the thief.
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        this.particles.emit({ x: lerp(victim.x, thief.x, t), y: lerp(victim.y, thief.y, t), life: 0.25 + t * 0.35, colour: i % 2 ? PAL.silver : '#e0463a', drag: 6 });
      }
    });
    on('chaos', ({ who }) => this.particles.burst(who.x, who.y, 20, ['#9b52d2', PAL.white, PAL.gold, '#5fd8f0'], 60, 0.6));
    on('effect:start', ({ kart, effect }) => {
      if (effect.id === 'giant') this.particles.burst(kart.x, kart.y, 18, ['#7fe05a', PAL.white], 55, 0.5);
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
      if (k.effects.hasTag('ram') && Math.random() < 0.7) {
        this.particles.emit({ x: k.x + fx * 6 * k.scale, y: k.y + fy * 6 * k.scale, vx: fx * 20 + (Math.random() - 0.5) * 30, vy: fy * 20 + (Math.random() - 0.5) * 30, life: 0.2, colour: Math.random() < 0.5 ? PAL.danger : PAL.white });
      }
      if (k.surface === 'grass' && k.speed > 30 && Math.random() < 0.6) {
        this.particles.emit({
          x: k.x - fx * 5, y: k.y - fy * 5,
          vx: -fx * 15 + (Math.random() - 0.5) * 20, vy: -fy * 15 + (Math.random() - 0.5) * 20,
          life: 0.35, colour: Math.random() < 0.5 ? '#8a6a3a' : '#3f7f2c',
        });
      }
    }
    for (const e of race.entities) {
      if (e.kind === 'rocket' && Math.random() < 0.8) {
        this.particles.emit({ x: e.x - Math.cos(e.angle) * 4, y: e.y - Math.sin(e.angle) * 4, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 0.3, colour: Math.random() < 0.5 ? PAL.silver : PAL.boost });
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

    for (const e of this.race.entities) {
      if (onScreen(e.x, e.y)) drawEntity(g, e, Math.round(e.x - camX), Math.round(e.y - camY));
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
      const x = cx - half;
      const y = cy - half;
      g.globalAlpha = 0.35;
      g.drawImage(kartShadow(k.heading), x + scale, y + 2 * scale, size, size);
      g.globalAlpha = 1;
      g.drawImage(kartFrame(k.color, k.heading), x, y, size, size);
      this.drawKartExtras(g, k, cx, cy, scale);
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

  /** Shield bubbles and spin-out stars. */
  drawKartExtras(g, k, cx, cy, scale) {
    const shield = k.effects.active.find((e) => e.id === 'shield');
    if (shield && !(shield.remaining < 1.5 && Math.floor(shield.remaining * 8) % 2)) {
      const r = 9 * scale;
      g.fillStyle = (shield.charges ?? 1) > 1 ? '#fff' : '#9fe2ff';
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2 + this.race.time * 1.5;
        g.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
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
