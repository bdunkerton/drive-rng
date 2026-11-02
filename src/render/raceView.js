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
    on('item:use', ({ kart, item }) => {
      if (item === 'speed-boost') this.particles.burst(kart.x, kart.y, 10, [PAL.boost, PAL.boostHot], 35, 0.35);
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
      if (k.surface === 'grass' && k.speed > 30 && Math.random() < 0.6) {
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

    for (const e of this.race.entities) {
      if (onScreen(e.x, e.y)) drawEntity(g, e, Math.round(e.x - camX), Math.round(e.y - camY));
    }

    const half = Math.floor(KART_SPRITE_SIZE / 2);
    const karts = [...this.race.karts].sort((a, b) => a.y - b.y);
    for (const k of karts) {
      if (!onScreen(k.x, k.y)) continue;
      const x = Math.round(k.x - camX) - half;
      const y = Math.round(k.y - camY) - half;
      g.globalAlpha = 0.35;
      g.drawImage(kartShadow(k.heading), x + 1, y + 2);
      g.globalAlpha = 1;
      g.drawImage(kartFrame(k.color, k.heading), x, y);
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

  dispose() {
    this.unsubscribe();
  }
}
