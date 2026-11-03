// Title screen: an AI race runs in the background while you pick laps and rivals.

import { VIEW, RACE } from '../config.js';
import { Race } from '../sim/race.js';
import { RaceView } from '../render/raceView.js';
import { drawText, drawOutlinedText } from '../render/font.js';
import { drawMenu, drawPanel } from '../render/menu.js';
import { PAL } from '../render/palette.js';
import { clamp } from '../core/math.js';
import meadow from '../tracks/meadow.js';

export class TitleScene {
  /** @param {import('../main.js').Game} game */
  constructor(game) {
    this.game = game;
    this.clock = 0;
    this.index = 0;
    this.laps = game.options.laps ?? RACE.laps;
    this.rivals = game.options.rivals ?? RACE.rivals;
    this.attract = new Race({ track: meadow, seed: 'attract', laps: 99, rivals: 5, humanInput: null, countdown: 0 });
    this.view = new RaceView(this.attract);
  }

  get lines() {
    return ['START RACE', `LAPS  < ${this.laps} >`, `RIVALS  < ${this.rivals} >`];
  }

  frame(dt, input) {
    this.clock += dt;
    const sound = this.game.sound;
    if (input.wasPressed('mute')) sound.toggleMute();
    if (input.wasPressed('up')) this.index = (this.index + 2) % 3;
    if (input.wasPressed('down')) this.index = (this.index + 1) % 3;
    const dx = (input.wasPressed('right') ? 1 : 0) - (input.wasPressed('left') ? 1 : 0);
    if (dx && this.index === 1) this.laps = clamp(this.laps + dx, 1, 9);
    if (dx && this.index === 2) this.rivals = clamp(this.rivals + dx, 0, 7);
    if (input.wasPressed('up') || input.wasPressed('down') || dx) sound.play('menu');
    if (input.wasPressed('confirm') && this.index === 0) {
      sound.play('select');
      this.game.startRace({ laps: this.laps, rivals: this.rivals });
    }
  }

  update(dt) {
    this.attract.step(dt);
  }

  animate(dt) {
    this.view.follow(this.attract.order[0]);
    this.view.update(dt);
  }

  draw(g) {
    this.view.draw(g);
    g.fillStyle = 'rgba(10,8,16,0.35)';
    g.fillRect(0, 0, VIEW.width, VIEW.height);

    const bob = Math.round(Math.sin(this.clock * 2) * 2);
    drawOutlinedText(g, 'DRIVE RNG', VIEW.width / 2, 24 + bob, { color: PAL.gold, scale: 4, align: 'center' });
    drawText(g, 'PIXEL RACING CHAOS', VIEW.width / 2, 50, { color: PAL.white, align: 'center' });

    drawPanel(g, VIEW.width / 2 - 70, 62, 140, 44);
    drawMenu(g, this.lines, this.index, VIEW.width / 2, 68, { clock: this.clock, spacing: 12 });

    drawPanel(g, VIEW.width / 2 - 110, 112, 220, 56);
    const help = [
      ['ARROWS / WASD', 'DRIVE'],
      ['SPACE', 'USE FRONT ITEM'],
      ['F / Q', 'FUSE FRONT TWO ITEMS'],
      ['C / R', 'NEXT ITEM TO THE FRONT'],
      ['P / ESC', 'PAUSE'],
      ['M', 'MUTE'],
    ];
    help.forEach(([key, what], i) => {
      drawText(g, key, VIEW.width / 2 - 26, 117 + i * 8, { color: PAL.gold, align: 'right' });
      drawText(g, what, VIEW.width / 2 - 14, 117 + i * 8, { color: PAL.white });
    });
    drawText(g, 'CLICK THE GAME FIRST IF KEYS DO NOTHING', VIEW.width / 2, 172, { color: PAL.silver, align: 'center' });
  }

  dispose() {
    this.view.dispose();
  }
}
