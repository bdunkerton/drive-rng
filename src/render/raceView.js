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
    on('blink', ({ kart, from, to }) => {
      this.particles.burst(from.x, from.y, 14, ['#5fd8f0', PAL.white], 40, 0.4);
      this.particles.burst(to.x, to.y, 14, ['#5fd8f0', PAL.white], 40, 0.4);
      for (let i = 0; i <= 10; i++) this.particles.emit({ x: lerp(from.x, to.x, i / 10), y: lerp(from.y, to.y, i / 10), life: 0.2 + i * 0.02, colour: '#5fd8f0', drag: 6 });
    });
    on('moonwalk', ({ kart }) => this.particles.burst(kart.x, kart.y, 10, ['#f2d14b', PAL.white], 35, 0.4));
    on('flipped', ({ kart }) => this.particles.burst(kart.x, kart.y, 8, ['#f2d14b', '#f07ab8'], 35, 0.35));
    on('oil:slip', ({ kart }) => this.particles.burst(kart.x, kart.y, 6, ['#1a1820', '#6b5a9c'], 30, 0.35));
    on('ramp:launch', ({ kart }) => this.particles.burst(kart.x, kart.y, 10, ['#c08a4a', '#f2d14b'], 40, 0.35));
    on('magnet:grab', ({ kart, box }) => {
      for (let i = 0; i <= 8; i++) this.particles.emit({ x: lerp(box.x, kart.x, i / 8), y: lerp(box.y, kart.y, i / 8), life: 0.15 + (i / 8) * 0.25, colour: i % 2 ? PAL.silver : '#e0463a', drag: 6 });
    });
    on('vault', ({ kart, over }) => this.particles.burst(over.x, over.y, 16, ['#5ec46a', PAL.white, PAL.gold], 55, 0.45));
    on('stomp', ({ x, y, radius }) => ring(x, y, radius, ['#8a6a3a', PAL.silver, PAL.white], 24, 22, 0.35));
    on('yank:snap', ({ kart }) => this.particles.burst(kart.x, kart.y, 12, ['#e0463a', PAL.white], 45, 0.35));
    on('fling', ({ kart }) => this.particles.burst(kart.x, kart.y, 10, ['#f2d14b', PAL.white], 40, 0.35));
    on('siphon', ({ kart, other }) => {
      for (let i = 0; i <= 8; i++) this.particles.emit({ x: lerp(other.x, kart.x, i / 8), y: lerp(other.y, kart.y, i / 8), life: 0.15 + (i / 8) * 0.3, colour: i % 2 ? '#5fd8f0' : '#9b52d2', drag: 6 });
    });
    on('catapult', ({ kart }) => {
      this.particles.burst(kart.x, kart.y, 18, [PAL.gold, PAL.boost, PAL.white], 60, 0.45);
      if (kart === this.target) this.shake = Math.max(this.shake, 3);
    });
    on('cannon:hit', ({ kart, other }) => {
      this.particles.burst(other.x, other.y, 16, ['#4a4a55', PAL.white, PAL.boostHot], 70, 0.4);
      if (kart === this.target || other === this.target) this.shake = Math.max(this.shake, 4);
    });
    on('orbit:release', ({ kart }) => this.particles.burst(kart.x, kart.y, 14, ['#5fd8f0', '#ea843b', PAL.white], 55, 0.4));
    on('potato:pass', ({ to }) => this.particles.burst(to.x, to.y, 14, ['#f0a03a', '#a8662a', PAL.white], 50, 0.35));
    on('potato:boom', ({ kart }) => {
      this.particles.burst(kart.x, kart.y, 26, ['#f0a03a', '#a8662a', PAL.boostHot, PAL.white], 80, 0.5);
      if (kart === this.target) this.shake = Math.max(this.shake, 5);
    });
    on('nearmiss', ({ kart, other }) => {
      const x = (kart.x + other.x) / 2;
      const y = (kart.y + other.y) / 2;
      this.particles.burst(x, y, 6, ['#d2b8ff', PAL.white], 40, 0.25);
    });
    on('billiards:shot', ({ by, kart }) => {
      this.particles.burst((by.x + kart.x) / 2, (by.y + kart.y) / 2, 16, [PAL.white, PAL.gold], 70, 0.35);
      if (by === this.target) this.shake = Math.max(this.shake, 2);
    });
    on('billiards:hit', ({ kart, chain }) => {
      this.particles.burst(kart.x, kart.y, 12 + chain * 4, [PAL.white, PAL.gold, PAL.boostHot], 60 + chain * 10, 0.4);
    });
    on('bomb:charge', ({ kart }) => this.particles.burst(kart.x, kart.y, 8, ['#ffe066', '#e0463a', PAL.white], 40, 0.3));
    on('bomb:detonate', ({ kart, karts }) => {
      if (karts.length && kart === this.target) this.shake = Math.max(this.shake, Math.min(6, 2 + karts.length));
    });
    on('royale:out', ({ kart }) => this.particles.burst(kart.x, kart.y, 30, ['#f0a03a', '#a8662a', PAL.boostHot, '#6a6e78', PAL.white], 90, 0.7));
    on('ram', ({ by, kart }) => {
      this.particles.burst((by.x + kart.x) / 2, (by.y + kart.y) / 2, 18, [PAL.white, PAL.gold, PAL.boostHot], 70, 0.4);
      if (by === this.target) this.shake = Math.max(this.shake, 3);
    });
    on('draft:slingshot', ({ kart }) => {
      if (kart === this.target) this.particles.burst(kart.x, kart.y, 8, ['#9fe2ff', PAL.white], 40, 0.3);
    });
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
      // Billiards: a "live" kart (just struck) trails white and gold.
      if (race.time < k.cueUntil) {
        this.particles.emit({ x: k.x + (Math.random() - 0.5) * 6, y: k.y + (Math.random() - 0.5) * 6, life: 0.3, colour: Math.random() < 0.5 ? PAL.white : PAL.gold, drag: 6 });
      }
      // Drafting: wind lines streaming past either side of the kart.
      if (k.draftingBehind && k.draft > 0.15 && Math.random() < 0.35 + k.draft * 0.5) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const off = 5 + Math.random() * 3;
        this.particles.emit({
          x: k.x + fx * 6 - fy * off * side, y: k.y + fy * 6 + fx * off * side,
          vx: k.vx - fx * 90, vy: k.vy - fy * 90,
          life: 0.12, colour: k.draft > 0.95 ? '#9fe2ff' : PAL.white, drag: 0,
        });
      }
      if (k.effects.hasTag('ride')) {
        for (let i = 0; i < 3; i++) {
          this.particles.emit({ x: k.x - fx * 7, y: k.y - fy * 7, vx: -fx * 60 + (Math.random() - 0.5) * 25, vy: -fy * 60 + (Math.random() - 0.5) * 25, life: 0.25, colour: i === 0 ? PAL.white : Math.random() < 0.5 ? '#e0463a' : PAL.boostHot });
        }
      }
      if (k.effects.hasTag('rubber') && Math.random() < 0.3) {
        this.particles.emit({ x: k.x + (Math.random() - 0.5) * 8, y: k.y + (Math.random() - 0.5) * 8, life: 0.25, colour: '#f07ab8', drag: 6 });
      }
      if (k.effects.hasTag('swing') && Math.random() < 0.8) {
        this.particles.emit({ x: k.x, y: k.y, life: 0.35, colour: Math.random() < 0.5 ? '#5fd8f0' : '#ea843b', drag: 8 });
      }
      if (k.effects.hasTag('twister')) {
        const a = Math.random() * Math.PI * 2;
        this.particles.emit({ x: k.x + Math.cos(a) * 8, y: k.y + Math.sin(a) * 8, vx: -Math.sin(a) * 60, vy: Math.cos(a) * 60, life: 0.25, colour: Math.random() < 0.5 ? '#dfe8ff' : '#8fb4d8' });
      }
      if (k.effects.hasTag('moonwalk') && Math.random() < 0.8) {
        this.particles.emit({ x: k.x + fx * 6, y: k.y + fy * 6, vx: fx * 40 + (Math.random() - 0.5) * 20, vy: fy * 40 + (Math.random() - 0.5) * 20, life: 0.2, colour: Math.random() < 0.5 ? '#f2d14b' : PAL.white });
      }
      if (k.effects.hasTag('rails') && k.speed > 60 && Math.random() < 0.5) {
        this.particles.emit({ x: k.x - fx * 5, y: k.y - fy * 5, life: 0.4, colour: '#f2c14b', drag: 8 });
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

    // Camera: look ahead in the direction of travel so the next corner is on screen in time,
    // but never so far that your own kart ends up hugging the edge. Ease toward it.
    const t = this.target;
    const leadX = clamp(t.vx * 0.55, -VIEW.width * 0.32, VIEW.width * 0.32);
    const leadY = clamp(t.vy * 0.55, -VIEW.height * 0.3, VIEW.height * 0.3);
    const goalX = t.x + leadX - VIEW.width / 2;
    const goalY = t.y + leadY - VIEW.height / 2;
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
    this.drawPotatoPointer(g, camX, camY);
  }

  /** When the potato is off screen, an orange arrow at the edge points at whoever has it. */
  drawPotatoPointer(g, camX, camY) {
    for (const pot of this.race.potatoes ?? []) if (pot.holder) this.drawPointer(g, camX, camY, pot.holder, pot.fuse);
  }

  drawPointer(g, camX, camY, h, fuse) {
    if (h === this.target) return;
    const x = h.x - camX;
    const y = h.y - camY;
    const m = 8;
    if (x > m && x < VIEW.width - m && y > m && y < VIEW.height - m) return;
    const cx = VIEW.width / 2;
    const cy = VIEW.height / 2;
    const a = Math.atan2(y - cy, x - cx);
    // Push out from the centre to the screen edge.
    const t = Math.min((VIEW.width / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (VIEW.height / 2 - m) / Math.abs(Math.sin(a) || 1e-6));
    const px = Math.round(cx + Math.cos(a) * t);
    const py = Math.round(cy + Math.sin(a) * t);
    const blink = fuse < 2.5 && Math.floor(this.race.time * 8) % 2;
    g.fillStyle = blink ? PAL.white : '#f0a03a';
    for (let i = 0; i < 5; i++) {
      // A little triangle: rows get narrower toward the tip.
      const along = 4 - i;
      const half = Math.floor(i / 1.5);
      for (let s = -half; s <= half; s++) {
        g.fillRect(Math.round(px - Math.cos(a) * (4 - along) - Math.sin(a) * s), Math.round(py - Math.sin(a) * (4 - along) + Math.cos(a) * s), 1, 1);
      }
    }
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
    if (k.effects.hasTag('cannon')) {
      // An iron ring round a cannonball.
      g.fillStyle = '#4a4a55';
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        g.fillRect(Math.round(cx + Math.cos(a) * 9), Math.round(cy + Math.sin(a) * 9), 1, 1);
      }
    }
    // Lines: hooks and tugs (to a kart), lassos, bungee bands, and a catapult's anchor.
    const camX = this.drawCamX;
    const camY = this.drawCamY;
    const line = (tx, ty, colours, sagBy = 3) => {
      const n = Math.max(2, Math.round(Math.hypot(tx - cx, ty - cy) / 3));
      for (let i = 0; i <= n; i++) {
        const u = i / n;
        const sag = Math.sin(Math.PI * u) * sagBy;
        g.fillStyle = colours[i % colours.length];
        g.fillRect(Math.round(cx + (tx - cx) * u), Math.round(cy + (ty - cy) * u + sag), 1, 1);
      }
    };
    const to = (o) => [Math.round(o.x - camX), Math.round(o.y - camY - (o.height ?? 0))];
    for (const e of k.effects.active) {
      if (e.target) line(...to(e.target), ['#a5743e', PAL.silver]);
      if (e.rope) line(...to(e.rope), ['#e0463a', PAL.white], 1);
      if (e.lasso) line(...to(e.lasso), ['#f2d14b', '#a5743e'], 2);
      if (e.anchor) line(...to(e.anchor), ['#f2c14b', '#8a6a3a'], 0);
      if (e.bands) for (const b of e.bands) line(...to(b), ['#f07ab8', '#9b52d2'], 0);
    }
    if (k.hasPotato) this.drawPotatoOn(g, k, cx, cy - 11 * scale);
    if (k.hunter) {
      // A red chevron over each hunter; it turns bright when one is right on your tail.
      const p = this.race.player;
      const close = p && p.progress - k.progress > 0 && p.progress - k.progress < 60;
      g.fillStyle = close && Math.floor(this.race.time * 8) % 2 ? '#ffe066' : '#e0463a';
      const top = cy - 13 * scale;
      g.fillRect(cx - 3, top, 7, 1);
      g.fillRect(cx - 2, top + 1, 5, 1);
      g.fillRect(cx - 1, top + 2, 3, 1);
      g.fillRect(cx, top + 3, 1, 1);
    }
    if (k.charged) {
      // Charged by a Time Bomb: fizzing.
      g.fillStyle = Math.floor(this.race.time * 20) % 2 ? '#ffe066' : '#e0463a';
      g.fillRect(cx - 1 + Math.round(Math.random() * 2), cy - 9 * scale + Math.round(Math.random() * 2), 2, 2);
      g.fillStyle = '#ffffff';
      g.fillRect(cx + Math.round((Math.random() - 0.5) * 8), cy + Math.round((Math.random() - 0.5) * 8), 1, 1);
    }
    if (k.effects.has('spinout')) {
      for (let i = 0; i < 3; i++) {
        const a = this.race.time * 9 + (i * Math.PI * 2) / 3;
        g.fillStyle = i % 2 ? PAL.white : PAL.boostHot;
        g.fillRect(Math.round(cx + Math.cos(a) * 6) - 1, Math.round(cy - 9 * scale + Math.sin(a) * 2), 2, 2);
      }
    }
  }

  /** The potato bobbing above its holder, fuse spark fizzing faster as time runs out. */
  drawPotatoOn(g, k, x, y) {
    const left = this.race.potatoOf?.(k)?.fuse ?? 8;
    const bob = Math.round(Math.sin(this.race.time * 10) * 1);
    const hot = left < 2.5 && Math.floor(this.race.time * (left < 1.2 ? 14 : 7)) % 2 === 0;
    const body = hot ? '#e0463a' : '#c98a3c';
    const rows = ['.ooo.', 'ooooo', 'ooooo', '.ooo.'];
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        if (rows[r][c] !== 'o') continue;
        g.fillStyle = r === 0 && c === 1 ? '#f2d6a0' : r === 3 || c === 4 ? '#8a5a2a' : body;
        g.fillRect(x - 2 + c, y + bob + r, 1, 1);
      }
    }
    // The fuse spark.
    if (Math.floor(this.race.time * 16) % 2) {
      g.fillStyle = Math.random() < 0.5 ? PAL.white : '#f2d14b';
      g.fillRect(x + 2, y + bob - 2, 1, 1);
      g.fillRect(x + 1 + Math.round(Math.random() * 2), y + bob - 3, 1, 1);
    }
  }

  dispose() {
    this.unsubscribe();
  }
}
