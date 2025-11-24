export class Sound {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  enabled = true;
  constructor() {
    const unlock = async () => {
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
      try { await this.ctx?.resume(); } catch {}
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('click', unlock, { once: true });
  }
  private ensureCtx(): AudioContext | null { return this.ctx && this.enabled ? this.ctx : null; }
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
  async swap(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playOsc(420, 'triangle', 0.08, 0.07, pan); }
  swoosh(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playSweep(900, 220, 0.18, 'sawtooth', 0.06, pan); }
  async match(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playOsc(720, 'sine', 0.12, 0.1, pan); }
  async explode(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playOsc(90, 'sawtooth', 0.25, 0.18, pan); }
  async drop(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playOsc(260, 'square', 0.08, 0.06, pan); }
  select(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playOsc(560, 'triangle', 0.06, 0.06, pan); }
  hover(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playOsc(480, 'sine', 0.04, 0.04, pan); }
  invalid(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playSweep(800, 140, 0.16, 'sawtooth', 0.06, pan); }
  big(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playSweep(340, 140, 0.28, 'triangle', 0.12, pan); }
  laser(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playSweep(1800, 260, 0.18, 'sawtooth', 0.06, pan); }
  score(pos?: {x:number,y:number}) { const pan = this.panFromPos(pos); this.playOsc(880, 'sine', 0.06, 0.05, pan); }
  private panFromPos(pos?: {x:number,y:number}) { if (!pos) return 0; const w = window.innerWidth || 1; const px = Math.max(0, Math.min(w, pos.x)); return Math.max(-1, Math.min(1, (px / w) * 2 - 1)); }
}
