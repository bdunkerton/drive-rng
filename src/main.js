// Boots the game: canvas, fixed-step loop, scenes, URL options.
//
// URL options (all optional):
//   ?quick=1     skip the title and start a race
//   ?seed=abc    fixed race seed (same seed = same rival behaviour and item rolls)
//   ?laps=1      laps per race (1-9)
//   ?rivals=3    number of AI rivals (0-7)
//   ?debug=1     start with the debug overlay on (toggle any time with the ` key)

import { VIEW, SIM } from './config.js';
import { Input } from './core/input.js';
import { Sound } from './audio/sound.js';
import { TitleScene } from './scenes/titleScene.js';
import { RaceScene } from './scenes/raceScene.js';

function readOptions() {
  const q = new URLSearchParams(location.search);
  const int = (name, lo, hi) => {
    if (!q.has(name)) return undefined;
    const n = parseInt(q.get(name), 10);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : undefined;
  };
  return {
    quick: q.get('quick') === '1',
    seed: q.has('seed') ? q.get('seed') : undefined,
    laps: int('laps', 1, 9),
    rivals: int('rivals', 0, 7),
    debug: q.get('debug') === '1',
  };
}

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = VIEW.width;
    canvas.height = VIEW.height;
    this.g = canvas.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.options = readOptions();
    this.debug = this.options.debug;
    this.input = new Input(window);
    this.sound = new Sound();
    this.input.onAnyKey = () => this.sound.unlock();
    canvas.addEventListener('pointerdown', () => {
      canvas.focus();
      this.sound.unlock();
    });
    this.fps = 60;
    this.scene = null;
    if (this.options.quick) this.startRace({});
    else this.toTitle();
    this.fit();
    window.addEventListener('resize', () => this.fit());
  }

  setScene(scene) {
    this.scene?.dispose?.();
    this.scene = scene;
  }

  toTitle() {
    this.setScene(new TitleScene(this));
  }

  startRace({ laps, rivals }) {
    const o = this.options;
    this.setScene(new RaceScene(this, { laps: laps ?? o.laps, rivals: rivals ?? o.rivals, seed: o.seed }));
  }

  /** Scale the 320x180 canvas up to fill the window, in whole pixels when there's room. */
  fit() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let scale = Math.min(w / VIEW.width, h / VIEW.height);
    if (scale >= 2) scale = Math.floor(scale);
    this.canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
    this.canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
  }

  run() {
    const step = 1 / SIM.hz;
    let last = performance.now();
    let acc = 0;
    const frame = (now) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      if (dt > 0) this.fps += (1 / dt - this.fps) * 0.05;
      const scene = this.scene;
      scene.frame(dt, this.input);
      this.input.endFrame();
      acc += dt;
      let steps = 0;
      while (acc >= step && steps < SIM.maxStepsPerFrame) {
        this.scene.update(step);
        acc -= step;
        steps++;
      }
      if (steps === SIM.maxStepsPerFrame) acc = 0;
      this.scene.animate(dt);
      this.scene.draw(this.g);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
game.run();
// Handy in the browser console: window.kartwheel.scene.race
window.kartwheel = game;
