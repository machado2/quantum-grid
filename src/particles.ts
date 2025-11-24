import { Graphics, Container, Application, BLEND_MODES } from 'pixi.js';

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
}

export class Particles {
  private app: Application;
  private container: Container;
  private items: Particle[] = [];
  constructor(app: Application) {
    this.app = app;
    this.container = new Container();
    this.app.stage.addChild(this.container);
    this.app.ticker.add(this.update.bind(this));
  }
  burst(x: number, y: number, color: number, count = 24, power = 6) {
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      g.beginFill(color, 1);
      g.drawCircle(0, 0, Math.random() * 3 + 1);
      g.endFill();
      g.blendMode = BLEND_MODES.ADD;
      g.x = x; g.y = y;
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * power;
      this.items.push({ g, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: Math.random() * 0.5 + 0.2 });
      this.container.addChild(g);
    }
  }
  private update(delta: number) {
    const dt = delta / 60;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      it.vy += 9.8 * 0.5 * dt;
      it.g.x += it.vx;
      it.g.y += it.vy;
      it.g.alpha = Math.max(it.life, 0);
      if (it.life <= 0) {
        this.container.removeChild(it.g);
        it.g.destroy();
        this.items.splice(i, 1);
      }
    }
  }
}
