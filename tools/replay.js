// Replays one combo-lab moment with the camera on the kart that got the item.
// Open tools/replay.html?seed=1003&at=12.4&combo=hook+boost (add &wild=1 for a WILD one).
// The race is the same seeded all-AI race the lab ran, so it plays out identically.
// The lab's clip recorder also drives this page frame by frame (window.replay).

import { VIEW, SIM } from '../src/config.js';
import { Race } from '../src/sim/race.js';
import meadow from '../src/tracks/meadow.js';
import { makeItem, useFrontItem, itemName } from '../src/sim/hand.js';
import { RaceView } from '../src/render/raceView.js';
import { Hud, ordinal } from '../src/render/hud.js';
import { drawText, drawOutlinedText } from '../src/render/font.js';
import { PAL } from '../src/render/palette.js';

const DT = 1 / SIM.hz;
const FORCE_AFTER = 3;
const TARGET_PLACE = 4;

export class Replay {
  constructor(canvas, { seed, at, parts, wild = false, caption = '' }) {
    this.canvas = canvas;
    canvas.width = VIEW.width;
    canvas.height = VIEW.height;
    this.g = canvas.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.caption = caption;
    const race = new Race({ track: meadow, seed, rivals: 5, humanInput: null, countdown: 0, laps: 9 });
    while (race.time < at) race.step(DT);
    const target = race.order[TARGET_PLACE - 1];
    target.items = [];
    race.itemsOff = true;
    if (parts) {
      target.items = [makeItem(parts)];
      target.items[0].wild = wild;
    }
    this.name = parts ? itemName(target.items[0]) : 'NO ITEM';
    race.player = target; // camera and HUD follow it
    this.race = race;
    this.target = target;
    this.handedAt = race.time;
    this.startPlace = target.position;
    this.view = new RaceView(race);
    this.hud = new Hud(race);
    this.slowmo = 0;
    this.slowAcc = 0;
    race.events.on('item:use', ({ kart, wild: w }) => {
      if (kart === target && w) this.slowmo = 0.7;
    });
    // Let the camera settle on the target.
    for (let i = 0; i < 40; i++) this.view.update(DT);
  }

  get elapsed() {
    return this.race.time - this.handedAt;
  }

  /** Advance one video frame of `seconds` (two race steps at 30 fps). */
  frame(seconds = 1 / 30) {
    const steps = Math.round(seconds / DT);
    for (let i = 0; i < steps; i++) {
      if (this.slowmo > 0) {
        this.slowmo -= DT;
        this.slowAcc += 0.35;
        if (this.slowAcc < 1) continue;
        this.slowAcc -= 1;
      }
      if (this.target.items.length && this.elapsed >= FORCE_AFTER) useFrontItem(this.target, this.race);
      this.race.step(DT);
    }
    this.view.update(seconds);
    this.hud.update(seconds);
    this.draw();
  }

  draw() {
    const g = this.g;
    this.view.draw(g);
    this.hud.draw(g);
    // A marker over the kart we're following.
    const t = this.target;
    const mx = Math.round(t.x - this.view.drawCamX);
    const my = Math.round(t.y - this.view.drawCamY - t.height) - 11 - Math.round(4 * (t.scale - 1));
    g.fillStyle = PAL.black;
    g.fillRect(mx - 3, my - 1, 7, 4);
    g.fillStyle = PAL.gold;
    g.fillRect(mx - 2, my, 5, 1);
    g.fillRect(mx - 1, my + 1, 3, 1);
    g.fillRect(mx, my + 2, 1, 1);
    // Caption: what this is, and how it's going.
    g.fillStyle = 'rgba(10,8,16,0.75)';
    g.fillRect(0, 122, 112, 20);
    drawText(g, this.caption || this.name, 5, 125, { color: PAL.gold });
    const now = t.position;
    drawText(g, `${ordinal(this.startPlace)} > ${ordinal(now)}`, 5, 134, { color: now < this.startPlace ? '#7fe05a' : now > this.startPlace ? PAL.danger : PAL.white });
    if (this.elapsed < 0.6) drawOutlinedText(g, this.name, VIEW.width / 2, 70, { color: PAL.gold, scale: 2, align: 'center' });
  }
}

// Standalone page: read the URL and play it in real time.
if (typeof window !== 'undefined' && document.getElementById('replay')) {
  const q = new URLSearchParams(location.search);
  const combo = q.get('combo');
  const opts = {
    seed: Number(q.get('seed') ?? 1000),
    at: Number(q.get('at') ?? 10),
    parts: combo && combo !== 'none' ? combo.split(/[+ ]/) : null,
    wild: q.get('wild') === '1',
    caption: q.get('caption') ?? '',
  };
  window.Replay = Replay;
  if (!q.has('manual')) {
    const replay = (window.replay = new Replay(document.getElementById('replay'), opts));
    let last = performance.now();
    let acc = 0;
    const tick = (now) => {
      acc += Math.min(0.25, (now - last) / 1000);
      last = now;
      while (acc >= 1 / 30) {
        if (replay.elapsed < 9) replay.frame(1 / 30);
        acc -= 1 / 30;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
