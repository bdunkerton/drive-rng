// The playtest lab: pick a scenario (one mechanic on the Test Oval with a big pack), play
// it as often as you like, leave feedback, and send it all to Claude.

import { VIEW } from '../config.js';
import { Race } from '../sim/race.js';
import { RaceView } from '../render/raceView.js';
import { drawText, drawOutlinedText } from '../render/font.js';
import { drawPanel } from '../render/menu.js';
import { PAL } from '../render/palette.js';
import oval from '../tracks/oval.js';
import { SCENARIOS as ALL_SCENARIOS, LAB_VERSION, LAB_DEFAULTS, CURRENT_BATCH } from '../lab/scenarios.js';
import { labStore } from '../lab/store.js';
import { openFeedback, openSend } from '../lab/feedback.js';
import { describeRunsShort } from '../lab/runs.js';

/** Split text into lines of at most `max` characters, on spaces. */
export function wrap(text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    if (!word) continue;
    if (line && (line + ' ' + word).length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

export class LabScene {
  /** @param {import('../main.js').Game} game */
  constructor(game, { select, all = false } = {}) {
    this.game = game;
    // The current batch, or everything (archived too) with ?lab=all.
    this.scenarios = all ? ALL_SCENARIOS : ALL_SCENARIOS.filter((s) => s.batch === CURRENT_BATCH);
    this.clock = 0;
    const i = this.scenarios.findIndex((s) => s.id === select);
    this.index = i >= 0 ? i : 0;
    this.overlayOpen = false;
    this.attract = new Race({ track: oval, seed: 'lab', laps: 99, rivals: 10, humanInput: null, countdown: 0, items: false, rules: { potato: false } });
    this.view = new RaceView(this.attract);
  }

  get count() {
    return this.scenarios.length + 1; // + "send feedback"
  }

  frame(dt, input) {
    this.clock += dt;
    if (this.overlayOpen) return;
    const sound = this.game.sound;
    if (input.wasPressed('mute')) sound.toggleMute();
    if (input.wasPressed('up')) this.index = (this.index + this.count - 1) % this.count;
    if (input.wasPressed('down')) this.index = (this.index + 1) % this.count;
    if (input.wasPressed('up') || input.wasPressed('down')) sound.play('menu');
    const scenario = this.scenarios[this.index];
    if (input.wasPressed('confirm')) {
      sound.play('select');
      if (scenario) this.game.startScenario(scenario);
      else this.openSend();
    } else if (scenario && input.wasPressed('feedback')) {
      sound.play('select');
      this.overlayOpen = true;
      openFeedback({
        scenario,
        runsText: describeRunsShort(labStore.pendingRuns(scenario.id)),
        onClose: (next) => {
          this.overlayOpen = false;
          this.game.canvas.focus();
          if (next === 'again') this.game.startScenario(scenario);
        },
      });
    }
  }

  openSend() {
    this.overlayOpen = true;
    openSend({
      onClose: () => {
        this.overlayOpen = false;
        this.game.canvas.focus();
      },
    });
  }

  update(dt) {
    this.attract.step(dt);
  }

  animate(dt) {
    this.view.follow(this.attract.order[Math.min(4, this.attract.order.length - 1)]);
    this.view.update(dt);
  }

  draw(g) {
    this.view.draw(g);
    g.fillStyle = 'rgba(10,8,16,0.5)';
    g.fillRect(0, 0, VIEW.width, VIEW.height);

    drawOutlinedText(g, 'PLAYTEST LAB', VIEW.width / 2, 6, { color: PAL.gold, scale: 2, align: 'center' });
    drawText(g, 'ONE MECHANIC AT A TIME  -  11 KARTS  -  TEST OVAL', VIEW.width / 2, 21, { color: PAL.silver, align: 'center' });

    // The list.
    const lx = 6;
    const ly = 30;
    const rowH = 12;
    drawPanel(g, lx, ly, 124, 10 + this.count * rowH);
    this.scenarios.forEach((s, i) => {
      const y = ly + 6 + i * rowH;
      const on = i === this.index;
      if (on) {
        g.fillStyle = 'rgba(242,193,75,0.18)';
        g.fillRect(lx + 3, y - 2, 118, 9);
      }
      drawText(g, `${i + 1} ${s.name}`, lx + 6, y, { color: on ? PAL.gold : PAL.white });
      const v = labStore.votes(s.id);
      const plays = labStore.plays(s.id);
      const tag = v.up || v.down || v.meh ? `+${v.up} -${v.down}` : plays ? `${plays}X` : 'NEW';
      drawText(g, tag, lx + 120, y, { color: v.up > v.down ? '#5ec46a' : v.down > v.up ? PAL.danger : PAL.silver, align: 'right' });
    });
    const unsent = labStore.unsent().length;
    const sy = ly + 6 + this.scenarios.length * rowH;
    const sendOn = this.index === this.scenarios.length;
    if (sendOn) {
      g.fillStyle = 'rgba(242,193,75,0.18)';
      g.fillRect(lx + 3, sy - 2, 118, 9);
    }
    drawText(g, `SEND TO CLAUDE (${unsent})`, lx + 6, sy, { color: sendOn ? PAL.gold : unsent ? '#5fd8f0' : PAL.silver });

    // The selected scenario.
    const px = 136;
    const py = 30;
    const pw = VIEW.width - px - 6;
    drawPanel(g, px, py, pw, 128);
    const s = this.scenarios[this.index];
    let y = py + 6;
    const line = (text, color) => {
      drawText(g, text, px + 6, y, { color });
      y += 7;
    };
    const max = Math.floor((pw - 12) / 4);
    if (s) {
      line(s.name, PAL.gold);
      y += 2;
      for (const l of wrap(s.pitch, max)) line(l, PAL.white);
      y += 3;
      for (const h of s.how) for (const l of wrap(`- ${h}`, max)) line(l, '#5fd8f0');
      y += 3;
      for (const l of wrap(`ASKS: ${s.question}`, max)) line(l, PAL.silver);
      y = py + 128 - 10;
      const plays = labStore.plays(s.id);
      const pending = labStore.pendingRuns(s.id).length;
      line(plays ? `PLAYED ${plays}X  -  ${pending} SINCE FEEDBACK` : 'NOT PLAYED YET', PAL.silver);
    } else {
      line('SEND FEEDBACK TO CLAUDE', PAL.gold);
      y += 2;
      for (const l of wrap(`${unsent} UNSENT ENTR${unsent === 1 ? 'Y' : 'IES'}. POST THEM AS A GITHUB ISSUE ON THE REPO, OR COPY THEM AND PASTE THEM INTO THE CHAT.`, max)) line(l, PAL.white);
    }

    drawText(g, 'UP/DOWN PICK   ENTER PLAY   F FEEDBACK', 6, VIEW.height - 9, { color: PAL.white });
    drawText(g, LAB_VERSION, VIEW.width - 6, VIEW.height - 9, { color: PAL.silver, align: 'right' });
  }

  dispose() {
    this.view.dispose();
  }
}

export { LAB_DEFAULTS };
