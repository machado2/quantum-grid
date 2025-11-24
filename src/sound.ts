export class Sound {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private buffers: Record<string, AudioBuffer | null> = {};
  private sources: Set<AudioBufferSourceNode> = new Set();
  enabled = false;
  constructor() {}
  enable() {
    this.enabled = true;
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (this.ctx && !this.masterGain) {
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.9;
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 20;
      this.compressor.ratio.value = 3;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;
      this.masterGain.connect(this.compressor).connect(this.ctx.destination);
    }
    try { this.ctx?.resume(); } catch {}
    this.preload();
  }
  disable() {
    this.enabled = false;
    for (const s of Array.from(this.sources)) { try { s.stop(); } catch {} }
  }
  private ensureCtx(): AudioContext | null { return this.ctx && this.enabled ? this.ctx : null; }
  private url(name: string) {
    const m: Record<string,string> = {
      hover: new URL('../assets/audio/hover.wav', import.meta.url).href,
      select: new URL('../assets/audio/select.wav', import.meta.url).href,
      swap: new URL('../assets/audio/swap.wav', import.meta.url).href,
      swoosh: new URL('../assets/audio/swoosh.wav', import.meta.url).href,
      invalid: new URL('../assets/audio/invalid.wav', import.meta.url).href,
      match: new URL('../assets/audio/match.wav', import.meta.url).href,
      explode: new URL('../assets/audio/explode.wav', import.meta.url).href,
      drop: new URL('../assets/audio/drop.wav', import.meta.url).href,
      laser: new URL('../assets/audio/laser.wav', import.meta.url).href,
      score: new URL('../assets/audio/score.wav', import.meta.url).href
    };
    return m[name];
  }
  private async loadBuffer(name: string): Promise<AudioBuffer | null> {
    if (this.buffers[name]) return this.buffers[name] || null;
    if (!this.enabled) return null;
    const ctx = this.ctx || (this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)());
    try {
      const url = this.url(name);
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      this.buffers[name] = buf;
      return buf;
    } catch {
      this.buffers[name] = null;
      return null;
    }
  }
  private playBuffer(name: string, gain: number, pan = 0) {
    const ctx = this.ensureCtx(); if (!ctx) return false;
    const buf = this.buffers[name]; if (!buf) return false;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = false;
    const g = ctx.createGain(); g.gain.value = gain;
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    const dest = this.masterGain || ctx.destination;
    src.connect(g).connect(p).connect(dest);
    src.start();
    this.sources.add(src);
    src.onended = () => { try { src.disconnect(); } catch {} this.sources.delete(src); };
    return true;
  }
  private playOsc(freq: number, type: OscillatorType, duration: number, gain: number, pan = 0) {
    const ctx = this.ensureCtx(); if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    const dest = this.masterGain || ctx.destination;
    o.connect(g).connect(p).connect(dest);
    o.start(); o.stop(ctx.currentTime + duration);
  }
  private playSweep(from: number, to: number, duration: number, type: OscillatorType, gain: number, pan = 0) {
    const ctx = this.ensureCtx(); if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    o.type = type; o.frequency.setValueAtTime(from, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, to), ctx.currentTime + duration);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    const dest = this.masterGain || ctx.destination;
    o.connect(g).connect(p).connect(dest);
    o.start(); o.stop(ctx.currentTime + duration);
  }
  private async playNamed(name: string, vol: number, pan: number) {
    const buf = await this.loadBuffer(name);
    if (buf && this.playBuffer(name, vol, pan)) return;
    if (name === 'swap') this.playOsc(420, 'triangle', 0.08, 0.07, pan);
    else if (name === 'swoosh') this.playSweep(900, 220, 0.18, 'sawtooth', 0.06, pan);
    else if (name === 'match') this.playOsc(720, 'sine', 0.12, 0.1, pan);
    else if (name === 'explode') this.playOsc(90, 'sawtooth', 0.25, 0.18, pan);
    else if (name === 'drop') this.playOsc(260, 'square', 0.08, 0.06, pan);
    else if (name === 'select') this.playOsc(560, 'triangle', 0.06, 0.06, pan);
    else if (name === 'hover') this.playOsc(480, 'sine', 0.04, 0.04, pan);
    else if (name === 'invalid') this.playSweep(800, 140, 0.16, 'sawtooth', 0.06, pan);
    else if (name === 'big') this.playSweep(340, 140, 0.28, 'triangle', 0.12, pan);
    else if (name === 'laser') this.playSweep(1800, 260, 0.18, 'sawtooth', 0.06, pan);
    else if (name === 'score') this.playOsc(880, 'sine', 0.06, 0.05, pan);
  }
  private async preload() {
    const names = ['hover','select','swap','swoosh','invalid','match','explode','drop','laser','score'];
    for (const n of names) { try { await this.loadBuffer(n); } catch {} }
  }
  async swap(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); await this.playNamed('swap', 0.22, pan); }
  swoosh(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playNamed('swoosh', 0.18, pan); }
  async match(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); await this.playNamed('match', 0.2, pan); }
  async explode(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); await this.playNamed('explode', 0.28, pan); }
  async drop(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); await this.playNamed('drop', 0.2, pan); }
  select(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playNamed('select', 0.18, pan); }
  hover(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playNamed('hover', 0.14, pan); }
  invalid(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playNamed('invalid', 0.2, pan); }
  big(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playNamed('big', 0.24, pan); }
  laser(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playNamed('laser', 0.2, pan); }
  score(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playNamed('score', 0.16, pan); }
  private panFromPos(pos?: {x:number,y:number}) { if (!pos) return 0; const w = window.innerWidth || 1; const px = Math.max(0, Math.min(w, pos.x)); return Math.max(-1, Math.min(1, (px / w) * 2 - 1)); }
}
