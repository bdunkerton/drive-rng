// Playing a race: input -> race -> view + HUD, plus the pause menu and results.

import { VIEW } from '../config.js';
import { Race } from '../sim/race.js';
import { RaceView } from '../render/raceView.js';
import { Hud, formatTime, ordinal } from '../render/hud.js';
import { drawText, drawOutlinedText } from '../render/font.js';
import { drawMenu, drawPanel } from '../render/menu.js';
import { PAL, KART_COLOURS } from '../render/palette.js';
import { drawDebugWorld, drawDebugPanel, giveDebugItem } from '../debug/overlay.js';
import { approach } from '../core/math.js';
import meadow from '../tracks/meadow.js';

const STEER_RATE = 7; // how fast keyboard steering ramps to full lock, per second
const PAUSE_ITEMS = ['RESUME', 'RESTART', 'QUIT TO MENU'];

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
    this.humanInput = { throttle: 0, brake: 0, steer: 0, useItem: false };
    this.race = new Race({
      track: meadow,
      seed: o.seed ?? Math.floor(Math.random() * 1e9),
      laps: o.laps,
      rivals: o.rivals,
      humanInput: this.humanInput,
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

    const showingResults = this.resultsAt !== null && this.clock >= this.resultsAt;
    if (showingResults) {
      game.sound.stopEngine();
      if (input.wasPressed('confirm')) {
        game.sound.play('select');
        this.start();
      } else if (input.wasPressed('back')) {
        game.toTitle();
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
      if (input.wasPressed('up')) this.pauseIndex = (this.pauseIndex + PAUSE_ITEMS.length - 1) % PAUSE_ITEMS.length;
      if (input.wasPressed('down')) this.pauseIndex = (this.pauseIndex + 1) % PAUSE_ITEMS.length;
      if (input.wasPressed('up') || input.wasPressed('down')) game.sound.play('menu');
      if (input.wasPressed('confirm')) {
        game.sound.play('select');
        if (this.pauseIndex === 0) this.paused = false;
        else if (this.pauseIndex === 1) this.start();
        else game.toTitle();
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
    if (input.wasPressed('item')) h.useItem = true;

    const p = this.race.player;
    if (p && this.race.phase !== 'countdown' && !p.finished) game.sound.setEngine(Math.max(0, p.forwardSpeed) / p.base.maxSpeed);
    else game.sound.setEngine(0);
  }

  update(dt) {
    if (this.paused) return;
    this.race.step(dt);
    // An item press lasts until one step has seen it.
    this.humanInput.useItem = false;
    if (this.race.phase === 'done' && this.resultsAt === null) this.resultsAt = this.clock + 1.2;
  }

  animate(dt) {
    if (this.paused) return;
    this.view.update(dt);
    this.hud.update(dt);
  }

  draw(g) {
    this.view.draw(g);
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
    drawPanel(g, VIEW.width / 2 - 60, 50, 120, 76);
    drawOutlinedText(g, 'PAUSED', VIEW.width / 2, 58, { color: PAL.white, scale: 2, align: 'center' });
    drawMenu(g, PAUSE_ITEMS, this.pauseIndex, VIEW.width / 2, 82, { clock: this.clock });
    drawText(g, 'M MUTE', VIEW.width / 2, 116, { color: PAL.silver, align: 'center' });
  }

  drawResults(g) {
    const results = this.race.results();
    g.fillStyle = 'rgba(10,8,16,0.45)';
    g.fillRect(0, 0, VIEW.width, VIEW.height);
    const w = 220;
    const h = 40 + results.length * 11 + 22;
    const x = Math.round(VIEW.width / 2 - w / 2);
    const y = Math.round(VIEW.height / 2 - h / 2);
    drawPanel(g, x, y, w, h);
    drawOutlinedText(g, 'RESULTS', VIEW.width / 2, y + 7, { color: PAL.gold, scale: 2, align: 'center' });
    drawText(g, 'POS', x + 10, y + 26, { color: PAL.silver });
    drawText(g, 'RACER', x + 36, y + 26, { color: PAL.silver });
    drawText(g, 'TIME', x + 118, y + 26, { color: PAL.silver });
    drawText(g, 'BEST LAP', x + 166, y + 26, { color: PAL.silver });
    results.forEach((r, i) => {
      const yy = y + 37 + i * 11;
      if (r.isPlayer) {
        g.fillStyle = 'rgba(242,193,75,0.18)';
        g.fillRect(x + 4, yy - 2, w - 8, 9);
      }
      const colour = r.isPlayer ? PAL.gold : PAL.white;
      drawText(g, ordinal(r.position), x + 10, yy, { color: colour });
      g.fillStyle = KART_COLOURS[r.color]?.body ?? PAL.white;
      g.fillRect(x + 36, yy, 3, 5);
      drawText(g, r.name, x + 43, yy, { color: colour });
      drawText(g, r.finished ? formatTime(r.time) : `LAP ${r.lapsDone + 1}`, x + 118, yy, { color: colour });
      drawText(g, formatTime(r.bestLap), x + 166, yy, { color: colour });
    });
    if (Math.floor(this.clock * 2) % 2 === 0) {
      drawText(g, 'ENTER RACE AGAIN   ESC MENU', VIEW.width / 2, y + h - 12, { color: PAL.white, align: 'center' });
    }
  }

  dispose() {
    this.view?.dispose();
    this.hud?.dispose();
    this.offSound?.();
  }
}
