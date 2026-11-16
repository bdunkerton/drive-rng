// Playing a race: input -> race -> view + HUD, plus the pause menu and results.

import { VIEW, ITEMS, FOCUS } from '../config.js';
import { Race } from '../sim/race.js';
import { RaceView } from '../render/raceView.js';
import { Hud, formatTime, ordinal } from '../render/hud.js';
import { drawText, drawOutlinedText } from '../render/font.js';
import { drawMenu, drawPanel } from '../render/menu.js';
import { PAL, KART_COLOURS } from '../render/palette.js';
import { drawDebugWorld, drawDebugPanel, giveDebugItem } from '../debug/overlay.js';
import { approach } from '../core/math.js';
import meadow from '../tracks/meadow.js';
import { Telemetry } from '../lab/telemetry.js';
import { labStore } from '../lab/store.js';
import { openFeedback } from '../lab/feedback.js';
import { describeRunsShort } from '../lab/runs.js';

const STEER_RATE = 7; // how fast keyboard steering ramps to full lock, per second
const SLOWMO_SECONDS = 0.7; // a WILD item used by the player plays in slow motion for this long
const SLOWMO_RATE = 0.35;   // ...at this fraction of normal speed
const FUSED_KEY = 'drive-rng:has-fused';

// Browser storage can be missing or throw (private windows, sandboxed frames).
function remembered(key) {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function remember(key) {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Nothing to do: the tutorial will just show again next time.
  }
}
const PAUSE_ITEMS = ['RESUME', 'RESTART', 'QUIT TO MENU'];
const LAB_PAUSE_ITEMS = ['RESUME', 'RESTART', 'FEEDBACK', 'BACK TO LAB'];

export class RaceScene {
  /** @param {import('../main.js').Game} game */
  constructor(game, opts) {
    this.game = game;
    this.opts = opts;
    this.start();
  }

  start() {
    this.dispose();
    const o = this.opts;
    this.humanInput = { throttle: 0, brake: 0, steer: 0, useItem: false, fuse: false, cycle: false };
    this.race = new Race({
      track: o.track ?? meadow,
      rules: o.rules,
      seed: o.seed ?? Math.floor(Math.random() * 1e9),
      laps: o.laps,
      rivals: o.rivals,
      humanInput: this.humanInput,
      items: o.items ?? true,
      obstacles: o.obstacles,
      potato: o.potato,
      // Until the player has fused once, their first two boxes set up a WHITE HOLE.
      firstPickups: o.items !== false && (o.tutorial || !remembered(FUSED_KEY)) ? ITEMS.firstPickups : null,
    });
    this.slowmo = 0;
    this.slowAcc = 0;
    this.focusing = false;
    this.overlayOpen = false;
    this.telemetry?.dispose();
    this.telemetry = o.scenario ? new Telemetry(this.race) : null;
    this.recorded = false;
    this.race.events.on('item:fuse', ({ kart }) => kart === this.race.player && remember(FUSED_KEY));
    this.race.events.on('item:use', ({ kart, wild }) => {
      if (wild && kart === this.race.player) this.slowmo = SLOWMO_SECONDS;
    });
    this.view = new RaceView(this.race);
    this.hud = new Hud(this.race);
    this.offSound = this.game.sound.attach(this.race);
    this.paused = false;
    this.pauseIndex = 0;
    this.resultsAt = null;
    this.clock = 0;
  }

  frame(dt, input) {
    const game = this.game;
    this.clock += dt;
    if (input.wasPressed('mute')) game.sound.toggleMute();
    if (input.wasPressed('debug')) game.debug = !game.debug;
    if (game.debug) {
      const n = input.digitPressed();
      if (n) giveDebugItem(this.race, n);
    }

    if (this.overlayOpen) return;
    const scenario = this.opts.scenario;
    const showingResults = this.resultsAt !== null && this.clock >= this.resultsAt;
    if (showingResults) {
      game.sound.stopEngine();
      if (input.wasPressed('confirm')) {
        game.sound.play('select');
        this.start();
      } else if (scenario && input.wasPressed('feedback')) {
        game.sound.play('select');
        this.openFeedback();
      } else if (input.wasPressed('back')) {
        this.quit();
      }
      return;
    }

    if (input.wasPressed('pause')) {
      this.paused = !this.paused;
      this.pauseIndex = 0;
      game.sound.play('menu');
      if (this.paused) game.sound.stopEngine();
      return;
    }

    if (this.paused) {
      if (input.wasPressed('up')) this.pauseIndex = (this.pauseIndex + this.pauseItems.length - 1) % this.pauseItems.length;
      if (input.wasPressed('down')) this.pauseIndex = (this.pauseIndex + 1) % this.pauseItems.length;
      if (input.wasPressed('up') || input.wasPressed('down')) game.sound.play('menu');
      if (input.wasPressed('confirm')) {
        game.sound.play('select');
        if (this.pauseIndex === 0) this.paused = false;
        else if (this.pauseIndex === 1) this.start();
        else if (this.pauseIndex === 2 && scenario) this.openFeedback();
        else this.quit();
      }
      return;
    }

    // Driving.
    const h = this.humanInput;
    h.throttle = input.isDown('up') ? 1 : 0;
    h.brake = input.isDown('down') ? 1 : 0;
    const want = (input.isDown('right') ? 1 : 0) - (input.isDown('left') ? 1 : 0);
    // Snap back to centre faster than steering out, which feels better on a keyboard.
    const rate = want === 0 || Math.sign(want) !== Math.sign(h.steer) ? STEER_RATE * 1.6 : STEER_RATE;
    h.steer = approach(h.steer, want, rate * dt);
    // TIME BOMB: the race reads this and does the rest.
    h.focus = input.isDown('focus');
    // FOCUS (bullet time): hold the key while there's focus in the bar.
    const p0 = this.race.player;
    this.focusing = !!(this.race.rules.focus && p0 && !p0.finished && this.race.phase === 'racing' && p0.focus > 0 && input.isDown('focus'));
    if (this.focusing) {
      p0.focus = Math.max(0, p0.focus - FOCUS.drainPerSecond * dt);
      this.telemetry?.addFocus(dt);
    }
    if (input.wasPressed('item')) h.useItem = true;
    if (input.wasPressed('fuse')) h.fuse = true;
    if (input.wasPressed('cycle')) h.cycle = true;

    const p = this.race.player;
    if (p && this.race.phase !== 'countdown' && !p.finished) game.sound.setEngine(Math.max(0, p.forwardSpeed) / p.base.maxSpeed);
    else game.sound.setEngine(0);
  }

  update(dt) {
    if (this.paused || this.overlayOpen) return;
    if (this.slowmo > 0 || this.focusing) {
      // Slow motion: only some frames step the race (the race itself always steps at 60 Hz).
      if (this.slowmo > 0) this.slowmo -= dt;
      this.slowAcc += this.focusing ? FOCUS.timeScale : SLOWMO_RATE;
      if (this.slowAcc < 1) return;
      this.slowAcc -= 1;
    }
    this.race.step(dt);
    this.telemetry?.step(dt);
    if (this.telemetry && !this.recorded && this.race.phase === 'done') {
      this.recorded = true;
      labStore.recordPlay(this.opts.scenario.id, this.telemetry.summary());
    }
    // A hand press (use, fuse, next) lasts until one step has seen it.
    this.humanInput.useItem = false;
    this.humanInput.fuse = false;
    this.humanInput.cycle = false;
    if (this.race.phase === 'done' && this.resultsAt === null) this.resultsAt = this.clock + 1.2;
  }

  animate(dt) {
    if (this.paused) return;
    this.view.update(dt);
    this.hud.update(dt);
  }

  draw(g) {
    this.view.draw(g);
    if (this.focusing || this.race.bullet?.active) {
      // Bullet time: the world goes cool and dim at the edges.
      g.fillStyle = 'rgba(40, 20, 90, 0.18)';
      g.fillRect(0, 0, VIEW.width, VIEW.height);
      g.fillStyle = 'rgba(20, 10, 50, 0.35)';
      g.fillRect(0, 0, VIEW.width, 8);
      g.fillRect(0, VIEW.height - 8, VIEW.width, 8);
    }
    if (this.game.debug) drawDebugWorld(g, this.race, this.view.drawCamX, this.view.drawCamY);
    const showingResults = this.resultsAt !== null && this.clock >= this.resultsAt;
    if (!showingResults) this.hud.draw(g);
    if (this.game.debug) drawDebugPanel(g, this.race, this.game.fps);
    if (this.paused) this.drawPause(g);
    if (showingResults) this.drawResults(g);
  }

  drawPause(g) {
    g.fillStyle = 'rgba(10,8,16,0.55)';
    g.fillRect(0, 0, VIEW.width, VIEW.height);
    const n = this.pauseItems.length;
    drawPanel(g, VIEW.width / 2 - 60, 50, 120, 46 + n * 10);
    drawOutlinedText(g, 'PAUSED', VIEW.width / 2, 58, { color: PAL.white, scale: 2, align: 'center' });
    drawMenu(g, this.pauseItems, this.pauseIndex, VIEW.width / 2, 82, { clock: this.clock });
    drawText(g, 'M MUTE', VIEW.width / 2, 86 + n * 10, { color: PAL.silver, align: 'center' });
  }

  drawResults(g) {
    const results = this.race.results();
    g.fillStyle = 'rgba(10,8,16,0.45)';
    g.fillRect(0, 0, VIEW.width, VIEW.height);
    const w = 220;
    const rowH = results.length > 8 ? 9 : 11;
    const h = 40 + results.length * rowH + 22;
    const x = Math.round(VIEW.width / 2 - w / 2);
    const y = Math.round(VIEW.height / 2 - h / 2);
    drawPanel(g, x, y, w, h);
    drawOutlinedText(g, 'RESULTS', VIEW.width / 2, y + 7, { color: PAL.gold, scale: 2, align: 'center' });
    drawText(g, 'POS', x + 10, y + 26, { color: PAL.silver });
    drawText(g, 'RACER', x + 36, y + 26, { color: PAL.silver });
    drawText(g, 'TIME', x + 118, y + 26, { color: PAL.silver });
    drawText(g, 'BEST LAP', x + 166, y + 26, { color: PAL.silver });
    results.forEach((r, i) => {
      const yy = y + 37 + i * rowH;
      if (r.isPlayer) {
        g.fillStyle = 'rgba(242,193,75,0.18)';
        g.fillRect(x + 4, yy - 2, w - 8, 9);
      }
      const colour = r.isPlayer ? PAL.gold : PAL.white;
      drawText(g, ordinal(r.position), x + 10, yy, { color: colour });
      g.fillStyle = KART_COLOURS[r.color]?.body ?? PAL.white;
      g.fillRect(x + 36, yy, 3, 5);
      drawText(g, r.name, x + 43, yy, { color: colour });
      drawText(g, r.out ? 'OUT' : r.finished ? formatTime(r.time) : `LAP ${r.lapsDone + 1}`, x + 118, yy, { color: colour });
      drawText(g, formatTime(r.bestLap), x + 166, yy, { color: colour });
    });
    if (Math.floor(this.clock * 2) % 2 === 0) {
      const hint = this.opts.scenario ? 'ENTER AGAIN   F FEEDBACK   ESC LAB' : 'ENTER RACE AGAIN   ESC MENU';
      drawText(g, hint, VIEW.width / 2, y + h - 12, { color: PAL.white, align: 'center' });
    }
  }

  get pauseItems() {
    return this.opts.scenario ? LAB_PAUSE_ITEMS : PAUSE_ITEMS;
  }

  /** Leave the race: back to the lab for a scenario, else the title screen. */
  quit() {
    if (this.opts.scenario) this.game.toLab(this.opts.scenario.id);
    else this.game.toTitle();
  }

  /** The lab's feedback form, over the results (or the pause menu). */
  openFeedback() {
    const scenario = this.opts.scenario;
    this.overlayOpen = true;
    this.paused = false;
    this.game.sound.stopEngine();
    // A race quit part-way still counts as a play for the feedback.
    if (this.telemetry && !this.recorded) {
      this.recorded = true;
      labStore.recordPlay(scenario.id, this.telemetry.summary());
    }
    openFeedback({
      scenario,
      runsText: describeRunsShort(labStore.pendingRuns(scenario.id)),
      onClose: (next) => {
        this.overlayOpen = false;
        this.game.canvas.focus();
        if (next === 'again') this.start();
        else if (next === 'lab') this.game.toLab(scenario.id);
      },
    });
  }

  dispose() {
    this.telemetry?.dispose();
    this.view?.dispose();
    this.hud?.dispose();
    this.offSound?.();
  }
}
