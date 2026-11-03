// Keyboard input, by action name rather than key. Browser only.
// Keys avoid Ctrl/Shift/Alt combinations so VS Code's built-in browser doesn't eat them.

export const BINDINGS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  item: ['Space', 'KeyE', 'KeyX'],
  fuse: ['KeyF', 'KeyQ'],
  cycle: ['KeyC', 'KeyR'],
  confirm: ['Enter', 'Space'],
  pause: ['Escape', 'KeyP'],
  back: ['Escape', 'Backspace'],
  mute: ['KeyM'],
  debug: ['Backquote'],
};

const GAME_KEYS = new Set(Object.values(BINDINGS).flat());

export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();
    this.onAnyKey = null;
    target.addEventListener('keydown', (e) => {
      if (GAME_KEYS.has(e.code) || /^Digit[0-9]$/.test(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
      this.onAnyKey?.();
    });
    target.addEventListener('keyup', (e) => this.down.delete(e.code));
    target.addEventListener('blur', () => this.down.clear());
  }

  isDown(action) {
    return BINDINGS[action].some((code) => this.down.has(code));
  }

  /** True once per key press (cleared at the end of each frame). */
  wasPressed(action) {
    return BINDINGS[action].some((code) => this.pressed.has(code));
  }

  /** 1-10 if a number key was pressed this frame (0 counts as 10), else null. */
  digitPressed() {
    for (let i = 1; i <= 9; i++) if (this.pressed.has(`Digit${i}`)) return i;
    if (this.pressed.has('Digit0')) return 10;
    return null;
  }

  endFrame() {
    this.pressed.clear();
  }
}
