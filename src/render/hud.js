// The race HUD: lap, timer, position, item slot, standings, speed bar, minimap,
// and big centre banners (countdown, GO!, FINAL LAP!, FINISH!, WRONG WAY).

import { VIEW, HEIST } from '../config.js';
import { loopDelta } from '../core/math.js';
import { PAL, KART_COLOURS } from './palette.js';
import { drawText, drawOutlinedText } from './font.js';
import { paintMinimap } from './trackArt.js';
import { drawItemPicture, SLOT, WILD_COLOURS } from './itemArt.js';
import { itemName, isReady, canFuse } from '../sim/hand.js';
import { previewFusion } from '../sim/powerups/index.js';
import { angleDiff } from '../core/math.js';

export function formatTime(t) {
  if (t === null || t === undefined) return '--:--.--';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  const c = Math.floor((t * 100) % 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}

export function ordinal(n) {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  return `${n}${teen ? 'TH' : ['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH'}`;
}

const PLACE_COLOURS = [PAL.gold, PAL.silver, PAL.bronze];
const TOAST_COLOURS = { white: PAL.white, gold: PAL.gold, good: '#7fe05a', bad: PAL.danger };
const TOAST_SECONDS = 2;
const MAX_TOASTS = 3;

export class Hud {
  constructor(race) {
    this.race = race;
    this.banner = null; // { text, colour, until, scale }
    this.clock = 0;
    this.wrongWayFor = 0;
    this.minimap = paintMinimap(race.track, 70, 52);
    this.toasts = []; // { text, colour, born }
    this.unsubscribe = this.listen(race);
  }

  listen(race) {
    const offs = [];
    const on = (type, fn) => offs.push(race.events.on(type, fn));
    const isPlayer = (k) => k && k === race.player;
    on('countdown', ({ n }) => this.show(String(n), PAL.white, 0.9, 5));
    on('go', () => this.show('GO!', PAL.gold, 1.0, 5));
    on('lap', ({ kart, lap }) => {
      if (isPlayer(kart) && lap < race.laps - 1) this.show(`LAP ${lap + 1}`, PAL.white, 1.2, 3);
    });
    on('final-lap', ({ kart }) => isPlayer(kart) && this.show('FINAL LAP!', PAL.gold, 1.6, 3));
    on('finish', ({ kart, place }) => {
      if (!isPlayer(kart)) return;
      if (race.rules?.heist) this.show('GOT AWAY!', PAL.gold, 3, 3);
      else this.show(`FINISH! ${ordinal(place)}`, PLACE_COLOURS[place - 1] ?? PAL.white, 3, 3);
    });
    on('heist:caught', () => this.show('CAUGHT!', PAL.danger, 3, 3));
    on('heist:escalate', ({ lap }) => this.show(`LAP ${lap}: MORE COPS!`, PAL.danger, 2, 2));
    on('arena:warn', () => this.show('ARENA SHRINKING!', PAL.gold, 1.5, 2));
    on('arena:shrink', ({ track }) => (this.minimap = paintMinimap(track, 70, 52)));
    on('royale:out', ({ kart }) => isPlayer(kart) && this.show('YOU ARE OUT!', PAL.danger, 2.5, 3));
    on('toast', ({ kart, text, colour }) => {
      if (!isPlayer(kart)) return;
      this.toasts.push({ text, colour: TOAST_COLOURS[colour] ?? PAL.white, born: this.clock });
      if (this.toasts.length > MAX_TOASTS) this.toasts.shift();
    });
    return () => offs.forEach((off) => off());
  }

  show(text, colour, seconds, scale) {
    this.banner = { text, colour, until: this.clock + seconds, scale, born: this.clock };
  }

  update(dt) {
    this.clock += dt;
    this.toasts = this.toasts.filter((t) => this.clock - t.born < TOAST_SECONDS);
    const p = this.race.player;
    if (p && this.race.phase === 'racing' && !p.finished) {
      const facing = Math.abs(angleDiff(p.heading, this.race.track.headingAt(p.s)));
      // Facing backwards on purpose (MOONWALK) or spinning (TWISTER) isn't the wrong way.
      const meant = p.effects.hasTag('moonwalk') || p.effects.hasTag('twister');
      const backwards = !meant && facing > 1.9 && p.speed > 15;
      this.wrongWayFor = backwards ? this.wrongWayFor + dt : Math.max(0, this.wrongWayFor - dt * 2);
    } else this.wrongWayFor = 0;
  }

  draw(g) {
    const race = this.race;
    const p = race.player ?? race.order[0];

    // Lap and time, top left.
    if (race.rules?.royale) drawText(g, `${race.karts.length} LEFT`, 6, 6, { color: PAL.gold });
    else drawText(g, `LAP ${p.currentLap(race.laps)}/${race.laps}`, 6, 6, { color: PAL.white });
    drawText(g, formatTime(p.finished ? p.finishTime : race.time), 6, 14, { color: PAL.white });
    const best = p.lapTimes.length ? Math.min(...p.lapTimes) : null;
    if (best !== null) drawText(g, `BEST ${formatTime(best)}`, 6, 22, { color: PAL.silver });

    // Standings, left side (Heist: busts and the cops instead).
    let y = 36;
    if (race.rules?.heist && race.player) {
      const busts = race.player.busts ?? 0;
      drawText(g, `BUSTS ${busts}/${HEIST.busts}`, 6, y, { color: busts ? PAL.danger : PAL.white });
      // The nearest cop, the short way round the loop, ahead or behind.
      const pl = race.player;
      const len = race.track.length;
      let best = null;
      for (const c of race.karts) {
        if (!c.cop) continue;
        const d = loopDelta(pl.s, c.s, len); // > 0: the cop is ahead of you
        if (!best || Math.abs(d) < Math.abs(best)) best = d;
      }
      if (best !== null) {
        const near = Math.abs(best) < 80;
        drawText(g, `COP ${Math.round(Math.abs(best))} ${best > 0 ? 'AHEAD' : 'BEHIND'}`, 6, y + 8, { color: near && Math.floor(this.clock * 6) % 2 ? PAL.danger : PAL.silver });
      }
    }
    for (const k of race.rules?.heist ? [] : race.order) {
      const col = KART_COLOURS[k.color]?.body ?? PAL.white;
      g.fillStyle = PAL.black;
      g.fillRect(5, y - 1, 5, 7);
      g.fillStyle = col;
      g.fillRect(6, y, 3, 5);
      drawText(g, `${k.position} ${k.name}${k.out ? ' OUT' : ''}`, 13, y, { color: k.out ? '#6a6e78' : k.isPlayer ? PAL.gold : PAL.white });
      y += race.order.length > 9 ? 7 : 8;
    }

    // Position, top right.
    if (race.player && !race.rules?.heist) {
      const pos = race.player.position;
      const text = ordinal(pos);
      drawOutlinedText(g, text, VIEW.width - 8, 5, { color: PLACE_COLOURS[pos - 1] ?? PAL.white, scale: 3, align: 'right' });
      drawText(g, `OF ${race.karts.length}`, VIEW.width - 8, 24, { color: PAL.white, align: 'right' });
    }

    // Item hand (or the potato), top centre, and the messages under it.
    if (race.player && race.itemsOn) this.drawHand(g, race.player);
    if (race.potatoes?.length) this.drawPotatoes(g, race);
    this.drawToasts(g);

    // Speed bar, bottom left.
    if (race.player) this.drawSpeed(g, race.player);

    // FOCUS meter, bottom centre (bullet time scenarios).
    if (race.player && (race.rules?.focus || race.rules?.timebomb)) this.drawFocus(g, race.player);

    // Minimap, bottom right.
    this.drawMinimap(g);

    // Centre banners.
    if (this.wrongWayFor > 0.8 && Math.floor(this.clock * 3) % 2 === 0) {
      drawOutlinedText(g, 'WRONG WAY', VIEW.width / 2, 70, { color: PAL.danger, scale: 3, align: 'center' });
    }
    const b = this.banner;
    if (b && this.clock < b.until) {
      const age = this.clock - b.born;
      const pop = age < 0.12 ? 1 : 0;
      drawOutlinedText(g, b.text, VIEW.width / 2, 62 - pop * 2, { color: b.colour, scale: b.scale + pop, align: 'center' });
    }
  }

  drawHand(g, kart) {
    const gap = 2;
    const total = kart.slots * SLOT + (kart.slots - 1) * gap;
    const x0 = Math.round(VIEW.width / 2 - total / 2);
    const y = 4;
    for (let i = 0; i < kart.slots; i++) {
      const x = x0 + i * (SLOT + gap);
      const front = i === 0;
      g.fillStyle = PAL.hudBg;
      g.fillRect(x, y, SLOT, SLOT);
      g.fillStyle = front ? PAL.gold : 'rgba(232,226,208,0.55)';
      g.fillRect(x, y, SLOT, 1);
      g.fillRect(x, y + SLOT - 1, SLOT, 1);
      g.fillRect(x, y, 1, SLOT);
      g.fillRect(x + SLOT - 1, y, 1, SLOT);
      const item = kart.items[i];
      if (item) drawItemPicture(g, item, x, y, this.clock + i * 0.37);
    }
    const front = kart.items[0];
    if (!front) return;
    const ready = isReady(front);
    if (ready) {
      const name = itemName(front);
      if (front.wild) {
        const c = WILD_COLOURS[Math.floor(this.clock * 8) % WILD_COLOURS.length];
        drawText(g, `WILD ${name}`, VIEW.width / 2, y + SLOT + 3, { color: c, align: 'center' });
      } else drawText(g, name, VIEW.width / 2, y + SLOT + 3, { color: PAL.white, align: 'center' });
    }
    // Show what a fuse would make before you press it (minus the WILD roll).
    const second = kart.items[1];
    const keys = ['SPACE USE'];
    if (canFuse(front, second)) {
      const preview = previewFusion(front.parts[0], second.parts[0]);
      keys.push(`F FUSE: ${preview.name}`);
    }
    if (kart.items.length > 1) keys.push('C NEXT');
    drawText(g, keys.join('  '), VIEW.width / 2, y + SLOT + 10, { color: PAL.silver, align: 'center' });

    // First race: nag until they try it.
    if (kart.tutorialFuse && canFuse(front, second)) {
      const colour = Math.floor(this.clock * 4) % 2 ? PAL.gold : PAL.white;
      drawOutlinedText(g, 'PRESS F TO FUSE!', VIEW.width / 2, 120, { color: colour, scale: 2, align: 'center' });
    }
  }

  /** Your potato's fuse if you have one; otherwise who has them. */
  drawPotatoes(g, race) {
    const live = race.potatoes.filter((p) => p.holder);
    const mine = race.player && race.potatoOf(race.player);
    if (mine) return this.drawPotato(g, mine);
    if (live.length === 1) return this.drawPotato(g, live[0]);
    if (live.length > 1) drawText(g, `${live.length} POTATOES IN PLAY`, VIEW.width / 2, 4, { color: '#f0a03a', align: 'center' });
  }

  /** Who has the potato and how long it's got: big and red if it's you. */
  drawPotato(g, potato) {
    const h = potato.holder;
    if (!h) return;
    const mine = h === this.race.player;
    const left = potato.fuse;
    const urgent = left < 2.5;
    const flash = urgent && Math.floor(this.clock * (left < 1.2 ? 10 : 5)) % 2 === 0;
    const w = mine ? 90 : 60;
    const x = Math.round(VIEW.width / 2 - w / 2);
    const y = mine ? 16 : 13;
    if (mine) {
      drawOutlinedText(g, 'HOT POTATO! TAG SOMEONE!', VIEW.width / 2, 4, { color: flash ? PAL.white : '#f0a03a', align: 'center' });
    } else {
      const who = h.name;
      drawText(g, `POTATO: ${who}`, VIEW.width / 2, 4, { color: '#f0a03a', align: 'center' });
    }
    g.fillStyle = PAL.hudBg;
    g.fillRect(x - 1, y - 1, w + 2, mine ? 6 : 4);
    g.fillStyle = flash ? PAL.white : urgent ? PAL.danger : '#f0a03a';
    g.fillRect(x, y, Math.round(w * potato.fuseFraction), mine ? 4 : 2);
  }

  drawToasts(g) {
    this.toasts.forEach((t, i) => {
      const age = this.clock - t.born;
      if (age > TOAST_SECONDS - 0.4 && Math.floor(age * 10) % 2) return; // blink out
      drawText(g, t.text, VIEW.width / 2, 42 + i * 7, { color: t.colour, align: 'center' });
    });
  }

  drawFocus(g, kart) {
    const w = 70;
    const x = Math.round(VIEW.width / 2 - w / 2);
    const y = VIEW.height - 10;
    g.fillStyle = PAL.hudBg;
    g.fillRect(x - 1, y - 1, w + 2, 6);
    g.fillStyle = kart.focus >= 0.999 ? PAL.white : '#a77bff';
    g.fillRect(x, y, Math.round(w * kart.focus), 4);
    const ready = kart.focus > 0.2;
    const bomb = this.race.rules?.timebomb;
    const active = this.race.bullet?.active;
    const charged = this.race.bullet?.charged?.length ?? 0;
    const label = active ? `${charged} CHARGED - LET GO TO BLOW` : ready && Math.floor(this.clock * 3) % 2 === 0 ? 'HOLD SHIFT' : bomb ? 'TIME BOMB' : 'FOCUS';
    drawText(g, label, VIEW.width / 2, y - 8, { color: ready ? '#d2b8ff' : PAL.silver, align: 'center' });
  }

  drawSpeed(g, kart) {
    const x = 6;
    const y = VIEW.height - 10;
    const w = 50;
    // Moonwalking, you're going forward while facing backwards: show the speed anyway.
    const speed = kart.effects.hasTag('moonwalk') || kart.effects.hasTag('scripted') ? kart.speed : Math.max(0, kart.forwardSpeed);
    const frac = speed / kart.base.maxSpeed;
    g.fillStyle = PAL.hudBg;
    g.fillRect(x - 1, y - 1, w + 2, 6);
    g.fillStyle = '#5ec46a';
    g.fillRect(x, y, Math.min(w, Math.round(w * frac)), 4);
    if (frac > 1) {
      g.fillStyle = PAL.boost;
      g.fillRect(x + w - Math.min(w, Math.round(w * (frac - 1))), y, Math.min(w, Math.round(w * (frac - 1))), 4);
    }
    drawText(g, `${Math.round(speed)}`, x + w + 4, y - 1, { color: PAL.white });
    // Draft meter just above: fills in someone's wake, drains after (the slingshot).
    if (kart.draft > 0) {
      const dy = y - 9;
      const full = kart.draft > 0.95;
      g.fillStyle = PAL.hudBg;
      g.fillRect(x - 1, dy - 1, w + 2, 4);
      g.fillStyle = full ? PAL.white : '#5fd8f0';
      g.fillRect(x, dy, Math.round(w * kart.draft), 2);
      const label = kart.draftingBehind ? 'DRAFT' : 'SLINGSHOT';
      const blink = full && kart.draftingBehind && Math.floor(this.clock * 6) % 2 === 0;
      drawText(g, label, x + w + 4, dy - 2, { color: blink ? PAL.white : '#5fd8f0' });
    }
  }

  drawMinimap(g) {
    const m = this.minimap;
    const x = VIEW.width - m.width - 4;
    const y = VIEW.height - m.height - 4;
    g.fillStyle = PAL.hudBg;
    g.fillRect(x - 1, y - 1, m.width + 2, m.height + 2);
    g.drawImage(m.canvas, x, y);
    const karts = [...this.race.karts].sort((a, b) => (a.isPlayer ? 1 : 0) - (b.isPlayer ? 1 : 0));
    for (const k of karts) {
      const [mx, my] = m.toMap(k.x, k.y);
      if (k.traffic) {
        g.fillStyle = '#6a6e78';
        g.fillRect(x + mx, y + my, 1, 1);
        continue;
      }
      if (k.cop) {
        g.fillStyle = Math.floor(this.clock * 6) % 2 ? '#e0463a' : '#3f73dc';
        g.fillRect(x + mx - 1, y + my - 1, 3, 3);
        continue;
      }
      if (k.isPlayer && Math.floor(this.clock * 4) % 2 === 0) {
        g.fillStyle = PAL.white;
        g.fillRect(x + mx - 2, y + my - 2, 5, 5);
      }
      g.fillStyle = PAL.black;
      g.fillRect(x + mx - 1, y + my - 1, 3, 3);
      g.fillStyle = KART_COLOURS[k.color]?.body ?? PAL.white;
      g.fillRect(x + mx - 1, y + my - 1, 2, 2);
    }
    // Potatoes: an orange dot just above whoever has one.
    for (const pot of this.race.potatoes ?? []) {
      const h = pot.holder;
      if (!h) continue;
      const [mx, my] = m.toMap(h.x, h.y);
      g.fillStyle = Math.floor(this.clock * 6) % 2 ? '#f0a03a' : PAL.white;
      g.fillRect(x + mx - 1, y + my - 4, 2, 2);
    }
  }

  dispose() {
    this.unsubscribe();
  }
}
