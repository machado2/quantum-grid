import { Graphics, Container, Application, BLEND_MODES } from 'pixi.js';

interface Particle {
  g: Graphics;
  vx: number;
  vy: number;
  life: number;
  total: number;
  kind: 'dot' | 'tri' | 'ring';
  vr?: number;
  vs?: number;
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
      const life = Math.random() * 0.5 + 0.25;
      this.items.push({ g, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, total: life, kind: 'dot', vr: (Math.random()-0.5)*0.2 });
      this.container.addChild(g);
    }
  }
  sparkBurst(x: number, y: number, color: number, count = 18, power = 7) {
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      g.beginFill(color, 1);
      const len = Math.random() * 6 + 4;
      g.moveTo(0, 0);
      g.lineTo(len, -len * 0.3);
      g.lineTo(len * 0.6, len * 0.5);
      g.lineTo(0, 0);
      g.endFill();
      g.blendMode = BLEND_MODES.ADD;
      g.x = x; g.y = y; g.rotation = Math.random()*Math.PI*2;
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * power;
      const life = Math.random() * 0.5 + 0.25;
      this.items.push({ g, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, total: life, kind: 'tri', vr: (Math.random()-0.5)*0.6 });
      this.container.addChild(g);
    }
  }
  ringShockwave(x: number, y: number, color: number, radius = 24, durationMs = 1000) {
    const g = new Graphics();
    g.blendMode = BLEND_MODES.ADD;
    g.lineStyle(6, color, 0.9);
    g.drawCircle(0, 0, radius);
    g.x = x; g.y = y; g.scale.set(0.8);
    const life = durationMs / 1000;
    this.items.push({ g, vx: 0, vy: 0, life, total: life, kind: 'ring', vs: 0.8 / life });
    this.container.addChild(g);
  }
  trail(x1: number, y1: number, x2: number, y2: number, color: number, count = 18) {
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      const g = new Graphics();
      g.beginFill(color, 1);
      g.drawCircle(0, 0, Math.random() * 2 + 0.8);
      g.endFill();
      g.blendMode = BLEND_MODES.ADD;
      g.x = x; g.y = y;
      const life = Math.random() * 0.4 + 0.25;
      this.items.push({ g, vx: (Math.random()-0.5)*0.5, vy: (Math.random()-0.5)*0.5, life, total: life, kind: 'dot', vr: (Math.random()-0.5)*0.1 });
      this.container.addChild(g);
    }
  }
  private update(delta: number) {
    const dt = delta / 60;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      if (it.kind !== 'ring') {
        it.vy += 9.8 * 0.35 * dt;
        it.vx *= 0.99; it.vy *= 0.99;
        it.g.x += it.vx;
        it.g.y += it.vy;
        it.g.rotation += it.vr || 0;
      } else {
        const s = (it.vs || 0) * dt;
        const scx = (it.g.scale as any).x || 1;
        const scy = (it.g.scale as any).y || 1;
        it.g.scale.set(scx + s, scy + s);
      }
      it.g.alpha = Math.max(it.life / it.total, 0);
      if (it.life <= 0) {
        this.container.removeChild(it.g);
        it.g.destroy();
        this.items.splice(i, 1);
      }
    }
  }
}
