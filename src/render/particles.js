// Cosmetic particles: dust, boost flames, sparks, box confetti. Lives entirely in
// the render layer and uses Math.random — it never affects the race.

const MAX = 600;

export class Particles {
  constructor() {
    this.list = [];
  }

  emit({ x, y, vx = 0, vy = 0, life = 0.4, colour = '#fff', size = 1, drag = 3 }) {
    if (this.list.length >= MAX) this.list.shift();
    this.list.push({ x, y, vx, vy, life, maxLife: life, colour, size, drag });
  }

  burst(x, y, count, colours, speed = 40, life = 0.5) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.6);
      this.emit({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.6 + Math.random() * 0.6), colour: colours[i % colours.length] });
    }
  }

  update(dt) {
    for (const p of this.list) {
      p.life -= dt;
      p.vx -= p.vx * p.drag * dt;
      p.vy -= p.vy * p.drag * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
  }

  draw(g, camX, camY) {
    for (const p of this.list) {
      g.globalAlpha = Math.min(1, (p.life / p.maxLife) * 1.5);
      g.fillStyle = p.colour;
      g.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size);
    }
    g.globalAlpha = 1;
  }

  clear() {
    this.list = [];
  }
}
