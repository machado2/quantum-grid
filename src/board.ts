import { Application, Container, Graphics, Sprite, Rectangle, BLEND_MODES, FederatedEvent, IPointData } from 'pixi.js';
import { textures } from './assets';
import { Particles } from './particles';
import { Sound } from './sound';
import type { Color, Piece, Special } from './types';

const Colors: Color[] = ['red','blue','green','yellow','purple','cyan','orange','white','magenta','silver'];
const ColorTex: Record<Color, string> = {
  red: 'piece_red', blue: 'piece_blue', green: 'piece_green', yellow: 'piece_yellow', purple: 'piece_purple', cyan: 'piece_cyan', orange: 'piece_orange', white: 'piece_white', magenta: 'piece_magenta', silver: 'piece_silver'
};
const ColorHex: Record<Color, number> = {
  red: 0xff3b3b, blue: 0x3bb0ff, green: 0x5cf27f, yellow: 0xffd43b, purple: 0x9b6bff, cyan: 0x39e4ff, orange: 0xff8c3b, white: 0xffffff, magenta: 0xff3bf6, silver: 0xb0b8c0
};
const SpecialTex: Record<Special, string> = {
  row: 'special_row', col: 'special_col', nova: 'special_nova', armored: 'special_armored', fixed: 'special_fixed', inert: 'special_inert', multiplier: 'special_multiplier'
};

function randChoice<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
const SPEED = 0.5;
const EXPLOSION_TIME_MS = 600;
function tweenScale(s: Sprite, to: number, time: number, onEnd?: () => void) {
  const from = (s && (s as any).scale && (s as any).scale.x) ?? 1;
  const start = performance.now();
  const tick = () => {
    if (!s || (s as any).destroyed || !(s as any).scale) return;
    const p = Math.min(1, (performance.now() - start) / (time * SPEED));
    const v = from + (to - from) * easeOutCubic(p);
    try { (s as any).scale.set(v); } catch { return; }
    if (p < 1) requestAnimationFrame(tick); else onEnd && onEnd();
  }; requestAnimationFrame(tick);
}
function tween(obj: any, prop: string, to: number, time: number, onEnd?: () => void) {
  const from = (obj && prop in obj) ? obj[prop] : 0;
  const start = performance.now();
  const tick = () => {
    if (!obj || (obj as any).destroyed) return;
    const p = Math.min(1, (performance.now() - start) / (time * SPEED));
    const val = from + (to - from) * easeOutCubic(p);
    try { obj[prop] = val; } catch { return; }
    if (p < 1) requestAnimationFrame(tick); else onEnd && onEnd();
  }; requestAnimationFrame(tick);
}

export class Board {
  app: Application;
  scene: Container;
  particles: Particles;
  sound: Sound;
  addScore: (v: number) => void;
  shake: (i: number, t: number) => void;

  rows = 8;
  cols = 8;
  tile = 96;
  container = new Container();
  fx = new Container();
  highlight = new Graphics();
  tiles = new Graphics();
  grid: (Piece | null)[][] = [];
  busy = false;
  selected: { r: number, c: number } | null = null;
  selectedA: { r: number, c: number } | null = null;
  allowFreeSwap = false;
  dragging = false;
  dragTarget: { r: number, c: number } | null = null;
  origin = { x: 0, y: 0 };
  pad = 16;
  highlightPulse = false;
  highlightTimer: number | null = null;

  constructor({ app, scene, particles, sound, addScore, shake }: { app: Application, scene: Container, particles: Particles, sound: Sound, addScore: (v:number)=>void, shake: (i:number,t:number)=>void }) {
    this.app = app; this.scene = scene; this.particles = particles; this.sound = sound; this.addScore = addScore; this.shake = shake;
    this.container.sortableChildren = true; this.scene.addChild(this.container);
    this.container.zIndex = 1;
    this.tiles.zIndex = -1; this.scene.addChild(this.tiles);
    this.fx.zIndex = 2; this.scene.addChild(this.fx);
    this.highlight.zIndex = 3; this.fx.addChild(this.highlight);
  }
  layout() {
    const availW = Math.max(0, this.app.renderer.width - this.pad*2);
    const availH = Math.max(0, this.app.renderer.height - this.pad*2);
    const tile = Math.floor(Math.min(availW / this.cols, availH / this.rows));
    this.tile = Math.max(24, tile);
    const w = this.cols * this.tile, h = this.rows * this.tile;
    this.origin.x = Math.floor((this.app.renderer.width - w) / 2);
    this.origin.y = Math.floor((this.app.renderer.height - h) / 2);
    this.container.x = this.origin.x; this.container.y = this.origin.y;
    this.container.hitArea = new Rectangle(0,0,w,h); this.container.eventMode = 'dynamic';
    this.highlight.x = this.container.x; this.highlight.y = this.container.y;
    this.tiles.x = this.container.x; this.tiles.y = this.container.y;
    this.drawTiles();
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const cell = this.grid[r]?.[c]; if (cell?.sprite) {
        const mw = this.tile*0.9, mh = this.tile*0.9;
        const fit = Math.min(mw/cell.sprite.texture.width, mh/cell.sprite.texture.height);
        cell.baseScale = fit; cell.sprite.scale.set(fit);
        cell.sprite.position.set(c*this.tile + this.tile/2, r*this.tile + this.tile/2);
      }
    }
  }
  fxColor(p: Piece) { if (p.kind==='normal') return ColorHex[p.color]; if (p.kind==='special' && p.color) return ColorHex[p.color]; return 0x39e4ff; }
  async init() {
    for (let r=0;r<this.rows;r++) this.grid[r] = new Array(this.cols).fill(null);
    this.layout();
    for (let r=0;r<this.rows;r++) for (let c=0;c<this.cols;c++) { const p = this.spawnRandom(r,c,true); this.place(r,c,p,false); }
    await this.ensureInitialClean();
    
    this.container.on('pointerdown', this.onDown.bind(this));
    this.container.on('pointertap', this.onDown.bind(this));
    this.container.on('pointerup', this.onUp.bind(this));
    this.container.on('pointerupoutside', this.onUp.bind(this));
    this.container.on('pointermove', this.onMove.bind(this));
  }
  posToRC(x: number, y: number) { const cx = x - this.container.x, cy = y - this.container.y; const c = Math.floor(cx/this.tile), r = Math.floor(cy/this.tile); if (r<0||c<0||r>=this.rows||c>=this.cols) return null; return { r, c }; }
  rcToPos(r: number, c: number) { return { x: c*this.tile + this.tile/2, y: r*this.tile + this.tile/2 }; }
  texForPiece(p: Piece) { return p.kind === 'normal' ? textures[ColorTex[p.color]] : textures[SpecialTex[p.special]]; }
  spriteForPiece(p: Piece) {
    const s = new Sprite(this.texForPiece(p)); s.anchor.set(0.5);
    const mw = this.tile*0.9, mh = this.tile*0.9; const fit = Math.min(mw/s.texture.width, mh/s.texture.height); p.baseScale = fit; s.scale.set(fit);
    s.filters = [];
    s.zIndex = 1; s.cursor = 'pointer'; return s;
  }
  place(r: number, c: number, p: Piece, animate: boolean) {
    const pos = this.rcToPos(r,c); const s = this.spriteForPiece(p); s.position.set(pos.x, pos.y); this.container.addChild(s); p.sprite = s; this.grid[r][c] = p;
    if (animate) { s.alpha = 0; tween(s,'alpha',1,260); const wx = this.container.x+pos.x, wy = this.container.y+pos.y; this.sound.drop({ x: wx, y: wy }); const color = this.fxColor(p); this.particles.burst(wx, wy, color, 14, 3.5); this.particles.sparkBurst(wx, wy, color, 10, 4); }
  }
  removeAt(r: number, c: number) { const p = this.grid[r][c]; if (!p) return; const s = p.sprite; if (s) { this.container.removeChild(s); s.destroy(); } this.grid[r][c] = null; }
  spawnRandom(r: number, c: number, initial: boolean): Piece {
    const specialChance = initial ? 0.0 : 0.08;
    if (Math.random() < specialChance) {
      const t: Special = randChoice(['row','col','nova','armored','fixed','inert','multiplier']);
      if (t === 'armored') { const color = randChoice(Colors); return { kind: 'special', special: 'armored', color, hp: 3, falls: true }; }
      if (t === 'fixed') return { kind: 'special', special: 'fixed', falls: true, hp: 2 };
      if (t === 'inert') return { kind: 'special', special: 'inert', falls: true };
      if (t === 'multiplier') return { kind: 'special', special: 'multiplier', color: randChoice(Colors), value: 2, falls: true };
      if (t === 'row') return { kind: 'special', special: 'row', color: randChoice(Colors), falls: true };
      if (t === 'col') return { kind: 'special', special: 'col', color: randChoice(Colors), falls: true };
      if (t === 'nova') return { kind: 'special', special: 'nova', color: randChoice(Colors), falls: true };
    }
    const color = randChoice(Colors); return { kind: 'normal', color, falls: true };
  }
  onDown(e: FederatedEvent) { if (this.busy) return; const p = (e as any).data.global as IPointData; const rc = this.posToRC(p.x,p.y); if (!rc) return; const cur = this.grid[rc.r][rc.c]; if (!cur) return; const bs = cur.baseScale || 1;
    if (!this.selectedA) { this.selectedA = rc; this.selected = rc; cur.sprite!.scale.set(bs*1.05); this.drawHighlight(rc); this.startHighlightPulse(); this.dragging = true; this.dragTarget = null; const pos = this.rcToPos(rc.r,rc.c); this.sound.select({ x: this.container.x+pos.x, y: this.container.y+pos.y }); return; }
    const prev = this.grid[this.selectedA.r][this.selectedA.c]; const adj = (rc.r===this.selectedA.r && Math.abs(rc.c-this.selectedA.c)===1) || (rc.c===this.selectedA.c && Math.abs(rc.r-this.selectedA.r)===1);
    if (adj) { if (prev?.sprite) prev.sprite.scale.set((prev.baseScale||1)); this.trySwap(this.selectedA, rc); this.selectedA = null; this.selected = null; this.clearHighlight(); this.dragging=false; this.dragTarget=null; return; }
    if (prev?.sprite) prev.sprite.scale.set((prev.baseScale||1)); this.selectedA = rc; this.selected = rc; cur.sprite!.scale.set(bs*1.05); this.drawHighlight(rc); this.startHighlightPulse(); this.dragging = true; this.dragTarget = null;
  }
  onMove(e: FederatedEvent) { if (!this.selectedA || this.busy || !this.dragging) return; const p = (e as any).data.global as IPointData; const rc = this.posToRC(p.x,p.y); if (!rc) { this.dragTarget = null; return; }
    const a = this.selectedA; const prev = this.dragTarget; const adj = (rc.r===a.r && Math.abs(rc.c-a.c)===1) || (rc.c===a.c && Math.abs(rc.r-a.r)===1); const next = adj ? rc : null; this.dragTarget = next; if (!prev && next) { const pos = this.rcToPos(next.r,next.c); this.sound.hover({ x: this.container.x+pos.x, y: this.container.y+pos.y }); }
  }
  onUp() { if (this.busy) return; if (!this.selected && !this.selectedA) return; if (this.dragging && this.dragTarget && this.selectedA) { const prev = this.grid[this.selectedA.r][this.selectedA.c]; if (prev?.sprite) prev.sprite.scale.set((prev.baseScale||1)); this.trySwap(this.selectedA, this.dragTarget); this.selectedA = null; this.clearHighlight(); }
    else if (this.selected) { const cur = this.grid[this.selected.r][this.selected.c]; if (cur?.sprite) cur.sprite.scale.set((cur.baseScale||1)); if (!this.selectedA) this.clearHighlight(); }
    this.selected = null; this.dragging=false; this.dragTarget=null; }
  swapCells(a: {r:number,c:number}, b: {r:number,c:number}) { const pa = this.grid[a.r][a.c]; const pb = this.grid[b.r][b.c]; if (!pa || !pb || !pa.sprite || !pb.sprite) return; this.grid[a.r][a.c] = pb; this.grid[b.r][b.c] = pa; const posa = this.rcToPos(a.r,a.c), posb = this.rcToPos(b.r,b.c); const saSprite = pa.sprite as Sprite; const sbSprite = pb.sprite as Sprite; tween(saSprite,'x',posb.x,180); tween(saSprite,'y',posb.y,180); tween(sbSprite,'x',posa.x,180); tween(sbSprite,'y',posa.y,180); const sa = pa.baseScale||1; const sb = pb.baseScale||1; tweenScale(saSprite, sa*1.08, 160, () => tweenScale(saSprite, sa, 160)); tweenScale(sbSprite, sb*1.08, 160, () => tweenScale(sbSprite, sb, 160)); }
  async trySwap(a: {r:number,c:number}, b: {r:number,c:number}) { if (this.busy) return; this.busy=true; const posa = this.rcToPos(a.r,a.c), posb = this.rcToPos(b.r,b.c); const mx = this.container.x + (posa.x + posb.x)/2, my = this.container.y + (posa.y + posb.y)/2; await this.sound.swap({ x: mx, y: my }); this.sound.swoosh({ x: mx, y: my }); this.swapCells(a,b); const wa = { x: this.container.x+posa.x, y: this.container.y+posa.y }; const wb = { x: this.container.x+posb.x, y: this.container.y+posb.y }; this.particles.trail(wa.x, wa.y, wb.x, wb.y, 0x39e4ff, 24); this.particles.sparkBurst(wb.x, wb.y, 0x39e4ff, 12, 5); await new Promise(r=>setTimeout(r,180*SPEED)); const groups = this.groups(); const involves = groups.some(g => g.some(it => (it.r===a.r && it.c===a.c) || (it.r===b.r && it.c===b.c)));
    if (involves) await this.resolveMatches(false); else if (!this.allowFreeSwap) { this.swapCells(a,b); await new Promise(r=>setTimeout(r,220*SPEED)); this.invalidSwapFlash(a,b); this.sound.invalid({ x: mx, y: my }); }
    this.busy=false; this.selected=null; }
  groups() {
    const groups: { r:number,c:number,p:Piece }[] [] = [] as any;
    const matchable = (p: Piece | null) => { if (!p) return false; if (p.kind==='special' && (p.special==='fixed' || p.special==='inert')) return false; return true; };
    const key = (p: Piece | null) => { if (!p) return ''; if (p.kind==='normal') return p.color; if (p.kind==='special') return p.color || ''; return ''; };
    const visited = Array.from({length:this.rows}, ()=>Array(this.cols).fill(false));
    for (let r=0;r<this.rows;r++) for (let c=0;c<this.cols;c++) { const p0 = this.grid[r][c]; if (!matchable(p0) || visited[r][c]) continue; const k = key(p0); const q = [{r,c}]; const comp: {r:number,c:number,p:Piece}[] = []; visited[r][c]=true;
      while (q.length) { const {r:rr,c:cc} = q.pop()!; const pp = this.grid[rr][cc]; if (!pp || key(pp)!==k || !matchable(pp)) continue; comp.push({r:rr,c:cc,p:pp}); const nbs = [[1,0],[-1,0],[0,1],[0,-1]] as const; for (const d of nbs) { const nr = rr+d[0], nc = cc+d[1]; if (nr<0||nc<0||nr>=this.rows||nc>=this.cols) continue; if (visited[nr][nc]) continue; const np = this.grid[nr][nc]; if (matchable(np) && key(np)===k) { visited[nr][nc]=true; q.push({r:nr,c:nc}); } } }
      if (comp.length>=3) groups.push(comp);
    }
    return groups;
  }
  async resolveMatches(initial: boolean) { const groups = this.groups(); if (groups.length===0) return false; for (const g of groups) { let factor = 1; const rowExploders: {r:number,c:number,p:Piece}[] = []; const colExploders: {r:number,c:number,p:Piece}[] = []; const areaExploders: {r:number,c:number,p:Piece}[] = [];
      for (const it of g) { const p = it.p; if (p.kind==='special') { if (p.special==='multiplier') factor *= p.value || 2; if (p.special==='row') rowExploders.push(it); if (p.special==='col') colExploders.push(it); if (p.special==='nova') areaExploders.push(it); } }
      const base = g.length*10; const sc = Math.floor(base*factor); this.addScore(sc); this.sound.score(); await this.sound.match(); if (sc>=40) { this.sound.big(); this.screenFlash(0x39e4ff, 0.35, EXPLOSION_TIME_MS); } for (const it of g) this.destroyPieceAt(it.r,it.c, sc>=40); for (const it of rowExploders) await this.explodeRow(it.r, this.fxColor(it.p)); for (const it of colExploders) await this.explodeCol(it.c, this.fxColor(it.p)); for (const it of areaExploders) await this.explodeArea(it.r,it.c, this.fxColor(it.p)); await new Promise(r=>setTimeout(r,EXPLOSION_TIME_MS*SPEED));
      this.affectFixedAdjacency(g);
    }
    await this.dropAndFill(); if (!initial) await this.resolveMatches(false); return true;
  }
  private pickColorAvoid(r:number,c:number): Color {
    const nbs = [[1,0],[-1,0],[0,1],[0,-1]] as const;
    const scores = Colors.map(color => {
      let cnt = 0;
      for (const d of nbs) { const nr = r+d[0], nc = c+d[1]; if (nr<0||nc<0||nr>=this.rows||nc>=this.cols) continue; const p = this.grid[nr][nc]; if (p && p.kind==='normal' && p.color===color) cnt++; }
      return { color, cnt };
    }).sort((a,b)=>a.cnt-b.cnt);
    const best = scores.filter(it => it.cnt<2);
    const list = best.length ? best : scores;
    const idx = Math.floor(Math.random()*list.length);
    return list[idx].color;
  }
  private async ensureInitialClean() {
    let tries = 0;
    while (tries<24) {
      const groups = this.groups();
      if (groups.length===0) break;
      for (const g of groups) {
        for (const it of g) {
          const r = it.r, c = it.c;
          const color = this.pickColorAvoid(r,c);
          this.removeAt(r,c);
          const p: Piece = { kind:'normal', color, falls:true } as any;
          this.place(r,c,p,false);
        }
      }
      tries++;
      await new Promise(r=>setTimeout(r,0));
    }
  }
  destroyPieceAt(r: number, c: number, big: boolean) { const p = this.grid[r][c]; if (!p) return; if (p.kind==='special' && p.special==='inert') return; if (p.kind==='special' && p.special==='fixed' && !(p as any).kill) return; if (p.kind==='special' && p.special==='armored') { p.hp = (p.hp||1) - 1; p.sprite && (p.sprite.tint = 0x999999); if ((p.hp||0) > 0) return; }
    const pos = this.rcToPos(r,c); const x = this.container.x+pos.x, y = this.container.y+pos.y; const color = this.fxColor(p); this.pulse(x,y,big?this.tile*0.9:this.tile*0.7, EXPLOSION_TIME_MS); this.particles.ringShockwave(x, y, color, this.tile*0.45, EXPLOSION_TIME_MS); this.particles.sparkBurst(x, y, color, big?22:14, big?7:5); this.particles.burst(x, y, color, big?48:24, big?10:6); this.sound.explode({ x, y }); this.shake(big?8:4, (big?200:120)*SPEED); this.removeAt(r,c);
  }
  laser(x1:number,y1:number,x2:number,y2:number,color:number) { const g = new Graphics(); g.blendMode = BLEND_MODES.ADD; g.lineStyle(6,color,0.9); g.moveTo(x1,y1); g.lineTo(x2,y2); g.alpha=1; this.fx.addChild(g); tween(g,'alpha',0,EXPLOSION_TIME_MS,()=>{ this.fx.removeChild(g); g.destroy(); }); }
  pulse(x:number,y:number, size:number, time:number) { const g = new Graphics(); g.blendMode = BLEND_MODES.ADD; g.beginFill(0x39e4ff, 0.7); g.drawCircle(0,0, size*0.35); g.endFill(); g.x=x; g.y=y; g.scale.set(0.9); this.fx.addChild(g); tweenScale(g as any, 1.4, time, () => { this.fx.removeChild(g); g.destroy(); }); tween(g,'alpha',0,time); }
  drawTiles() { this.tiles.clear(); for (let r=0;r<this.rows;r++) for (let c=0;c<this.cols;c++) { const x = c*this.tile, y = r*this.tile; this.tiles.lineStyle(2, 0x4fb8ff, 0.7); this.tiles.beginFill(0x1b2a38, 0.35); this.tiles.drawRoundedRect(x+4, y+4, this.tile-8, this.tile-8, 12); this.tiles.endFill(); } }
  drawHighlight(rc: { r:number, c:number }) { this.highlight.clear(); this.highlight.lineStyle(3, 0x39e4ff, 0.8); const x = rc.c*this.tile, y = rc.r*this.tile; this.highlight.drawRoundedRect(x, y, this.tile, this.tile, 12); }
  clearHighlight() { this.highlightPulse = false; if (this.highlightTimer!==null) { window.clearTimeout(this.highlightTimer); this.highlightTimer = null; } this.highlight.alpha = 0.8; this.highlight.clear(); }
  startHighlightPulse() { if (this.highlightTimer!==null) return; this.highlightPulse = true; const run = () => { if (!this.highlightPulse) { this.highlightTimer=null; return; } const a = this.highlight.alpha || 0.8; const target = a>0.6 ? 0.3 : 0.8; tween(this.highlight,'alpha',target,280, () => { this.highlightTimer = window.setTimeout(run, 0); }); }; run(); }
  screenFlash(color:number, alpha:number, time:number) { const g = new Graphics(); g.blendMode = BLEND_MODES.ADD; g.beginFill(color, alpha); g.drawRect(0,0,this.app.renderer.width,this.app.renderer.height); g.endFill(); g.x=0; g.y=0; this.fx.addChild(g); tween(g,'alpha',0,time,()=>{ this.fx.removeChild(g); g.destroy(); }); }
  invalidSwapFlash(a: {r:number,c:number}, b: {r:number,c:number}) { const s1 = this.grid[a.r][a.c]?.sprite; const s2 = this.grid[b.r][b.c]?.sprite; if (!s1 || !s2) return; const flash = (s: Sprite) => { const start = s.alpha; tween(s, 'alpha', 0.4, 140, () => tween(s, 'alpha', start, 140)); }; flash(s1); flash(s2); }
  async explodeRow(r:number, color:number) { const y = this.container.y + this.rcToPos(r,0).y; const x1 = this.container.x + this.rcToPos(r,0).x - this.tile/2; const x2 = this.container.x + this.rcToPos(r,this.cols-1).x + this.tile/2; this.laser(x1,y,x2,y,color); this.sound.laser({ x: (x1+x2)/2, y }); for (let c=0;c<this.cols;c++) this.destroyPieceAt(r,c,true); await new Promise(r => setTimeout(r,EXPLOSION_TIME_MS*SPEED)); }
  async explodeCol(c:number, color:number) { const x = this.container.x + this.rcToPos(0,c).x; const y1 = this.container.y + this.rcToPos(0,c).y - this.tile/2; const y2 = this.container.y + this.rcToPos(this.rows-1,c).y + this.tile/2; this.laser(x,y1,x,y2,color); this.sound.laser({ x, y: (y1+y2)/2 }); for (let r=0;r<this.rows;r++) this.destroyPieceAt(r,c,true); await new Promise(r => setTimeout(r,EXPLOSION_TIME_MS*SPEED)); }
  async explodeArea(r0:number,c0:number,color:number) { const p = this.rcToPos(r0,c0); this.particles.burst(this.container.x+p.x, this.container.y+p.y, color, 48, 14); for (let r=r0-1;r<=r0+1;r++) for (let c=c0-1;c<=c0+1;c++) { if (r<0||c<0||r>=this.rows||c>=this.cols) continue; this.destroyPieceAt(r,c,true); } await new Promise(r=>setTimeout(r,EXPLOSION_TIME_MS*SPEED)); }
  affectFixedAdjacency(group: {r:number,c:number,p:Piece}[]) { const adj = new Set<string>(); for (const it of group) { const dirs = [[1,0],[-1,0],[0,1],[0,-1]] as const; for (const d of dirs) { const r = it.r + d[0], c = it.c + d[1]; if (r<0||c<0||r>=this.rows||c>=this.cols) continue; const p = this.grid[r][c]; if (p && p.kind==='special' && p.special==='fixed') adj.add(r+','+c); } } for (const id of adj) { const [r,c] = id.split(',').map(Number); const p = this.grid[r][c] as any; p.hp = (p.hp||1) - 1; if (p.sprite) p.sprite.alpha = 0.6 + Math.random()*0.2; if ((p.hp||0) <= 0) { p.kill = true; this.destroyPieceAt(r,c,true); } } }
  async dropAndFill() { for (let c=0;c<this.cols;c++) { let write = this.rows-1; for (let r=this.rows-1;r>=0;r--) { const p = this.grid[r][c]; if (p) { if (write!==r) { this.grid[write][c] = p; this.grid[r][c] = null; const pos = this.rcToPos(write,c); const s = p.sprite!; tween(s,'x',pos.x,360); tween(s,'y',pos.y,360); } write--; } } for (let r=write;r>=0;r--) { const p = this.spawnRandom(r,c,false); this.place(r,c,p,true); } } await new Promise(r=>setTimeout(r,420*SPEED)); }
}
