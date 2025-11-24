export class Sound {
  private ctx: AudioContext | null = null;
  private buffers: Record<string, AudioBuffer | null> = {};
  enabled = true;
  constructor() {
    window.addEventListener('pointerdown', () => {
      if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }, { once: true });
  }
  private ensureCtx(): AudioContext | null { return this.ctx && this.enabled ? this.ctx : null; }
  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    try {
      const ctx = this.ensureCtx(); if (!ctx) return null;
      if (this.buffers[url]) return this.buffers[url];
      const resp = await fetch(url);
      const data = await resp.arrayBuffer();
      const buf = await ctx.decodeAudioData(data);
      this.buffers[url] = buf; return buf;
    } catch { return null; }
  }
  private playOsc(freq: number, type: OscillatorType, duration: number, gain: number) {
    const ctx = this.ensureCtx(); if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    o.connect(g).connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + duration);
  }
  private async playUrl(url: string, gain = 0.2, rate = 1) {
    const ctx = this.ensureCtx(); if (!ctx) throw new Error('noctx');
    const buf = await this.loadBuffer(url);
    if (!buf) throw new Error('nobuf');
    const src = ctx.createBufferSource();
    src.buffer = buf; src.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(g).connect(ctx.destination);
    src.start();
  }
  async swap() { if (!(await this.try('swap'))) this.playOsc(420, 'triangle', 0.12, 0.08); }
  async match() { if (!(await this.try('match'))) this.playOsc(720, 'sine', 0.18, 0.12); }
  async explode() { if (!(await this.try('explode'))) this.playOsc(90, 'sawtooth', 0.35, 0.2); }
  async drop() { if (!(await this.try('drop'))) this.playOsc(260, 'square', 0.12, 0.06); }
  private async try(kind: 'swap' | 'match' | 'explode' | 'drop'): Promise<boolean> {
    if (!this.ensureCtx()) return false;
    const urls: Record<typeof kind, string> = {
      swap: 'https://opengameart.org/sites/default/files/button.mp3',
      match: 'https://opengameart.org/sites/default/files/success.mp3',
      explode: 'https://opengameart.org/sites/default/files/Chunky%20Explosion.mp3',
      drop: 'https://opengameart.org/sites/default/files/click_sound_1.mp3'
    } as any;
    try { await this.playUrl(urls[kind], kind==='explode'?0.25:0.18, kind==='match'?1.15:1); return true; } catch { return false; }
  }
}
