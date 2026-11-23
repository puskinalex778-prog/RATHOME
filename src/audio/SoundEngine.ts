// Procedural cozy Web Audio API sound & music engine (works 100% offline, zero external files needed)

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicVolume = 0.35;
  private sfxVolume = 0.65;
  private musicTimer: number | null = null;
  private musicRunning = false;
  private noteIndex = 0;

  // Warm cozy pentatonic melody (C major / A minor acoustic kalimba/music-box feel)
  private readonly melody = [
    523.25, 659.25, 587.33, 440.0, 523.25, 392.0, 440.0, 0,
    587.33, 659.25, 783.99, 659.25, 587.33, 523.25, 440.0, 0,
    493.88, 587.33, 523.25, 392.0, 440.0, 523.25, 587.33, 0,
    659.25, 587.33, 523.25, 440.0, 392.0, 440.0, 523.25, 0,
  ];
  private readonly bass = [261.63, 220.0, 174.61, 196.0];

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
    if (!this.musicRunning && this.musicVolume > 0.01) {
      this.startMusic();
    }
  }

  public setVolumes(music: number, sfx: number): void {
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    if (this.musicVolume <= 0.01) {
      this.stopMusic();
    } else if (!this.musicRunning && this.ctx) {
      this.startMusic();
    }
  }

  public startMusic(): void {
    if (this.musicRunning || this.musicVolume <= 0.01) return;
    this.musicRunning = true;
    this.scheduleNextNote();
  }

  public stopMusic(): void {
    this.musicRunning = false;
    if (this.musicTimer !== null) {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public pause(): void {
    this.stopMusic();
    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend().catch(() => {});
    }
  }

  public resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.musicVolume > 0.01) {
      this.startMusic();
    }
  }

  private scheduleNextNote(): void {
    if (!this.musicRunning) return;
    const ctx = this.ctx;
    if (ctx && ctx.state === 'running' && this.musicVolume > 0.01) {
      const freq = this.melody[this.noteIndex % this.melody.length];
      if (freq > 0) {
        this.playTone(freq, 0.42, 'sine', 0.09 * this.musicVolume, 0.015);
        this.playTone(freq * 2, 0.18, 'triangle', 0.022 * this.musicVolume, 0.01);
      }
      if (this.noteIndex % 8 === 0) {
        const bFreq = this.bass[Math.floor(this.noteIndex / 8) % this.bass.length];
        this.playTone(bFreq, 1.4, 'sine', 0.075 * this.musicVolume, 0.06);
      }
      this.noteIndex++;
    }
    this.musicTimer = window.setTimeout(() => this.scheduleNextNote(), 520);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
    attack = 0.01,
    freqEnd?: number
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || gainPeak <= 0.0005) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick(): void {
    this.playTone(540, 0.065, 'triangle', 0.14 * this.sfxVolume, 0.004, 340);
  }

  public playSqueak(): void {
    const v = 0.14 * this.sfxVolume;
    this.playTone(1750, 0.09, 'sine', v, 0.01, 2350);
    setTimeout(() => this.playTone(2150, 0.07, 'sine', v * 0.75, 0.008, 1850), 95);
  }

  public playBrux(): void {
    // Soft happy tooth-grinding purr
    const v = 0.08 * this.sfxVolume;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.playTone(320 + i * 25, 0.045, 'triangle', v, 0.004, 240), i * 75);
    }
  }

  public playCallWhistle(): void {
    // Gentle melodic two-note call signal (instead of cage tapping!)
    const v = 0.18 * this.sfxVolume;
    this.playTone(784, 0.18, 'sine', v, 0.02, 988);
    setTimeout(() => this.playTone(988, 0.24, 'sine', v * 0.9, 0.02, 1175), 170);
  }

  public playCrunch(): void {
    const v = 0.13 * this.sfxVolume;
    for (let i = 0; i < 3; i++) {
      setTimeout(() => this.playTone(220 + Math.random() * 140, 0.04, 'square', v * 0.4, 0.002, 120), i * 90);
    }
  }

  public playWater(): void {
    const v = 0.15 * this.sfxVolume;
    this.playTone(620, 0.09, 'sine', v, 0.006, 980);
    setTimeout(() => this.playTone(760, 0.1, 'sine', v * 0.8, 0.006, 1180), 110);
  }

  public playCoin(): void {
    const v = 0.18 * this.sfxVolume;
    this.playTone(880, 0.11, 'sine', v, 0.005);
    setTimeout(() => this.playTone(1318.5, 0.24, 'sine', v, 0.005), 85);
  }

  public playSuccess(): void {
    const v = 0.17 * this.sfxVolume;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.22, 'triangle', v, 0.01), idx * 95);
    });
  }

  public playShutter(): void {
    const v = 0.2 * this.sfxVolume;
    this.playTone(1200, 0.03, 'square', v * 0.5, 0.002, 300);
    setTimeout(() => this.playTone(600, 0.05, 'triangle', v * 0.6, 0.002, 200), 40);
  }

  public playCleanBrush(): void {
    const v = 0.12 * this.sfxVolume;
    this.playTone(380, 0.1, 'sine', v, 0.01, 560);
  }
}

export const soundEngine = new SoundEngine();
