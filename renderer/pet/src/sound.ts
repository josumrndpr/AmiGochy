// ─── Sonidos sintetizados con WebAudio (sin assets) ───

class AmiSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.7;

  init(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  resume(): void {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  private tone(opts: {
    freq: number;
    freqEnd?: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
    delay?: number;
  }): void {
    if (!this.enabled || !this.ctx || !this.master) return;
    const { freq, freqEnd, dur, type = 'sine', gain = 0.12, delay = 0 } = opts;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // ── efectos ──
  eat(): void {
    this.tone({ freq: 420, freqEnd: 180, dur: 0.13, type: 'triangle', gain: 0.16 });
    this.tone({ freq: 520, freqEnd: 240, dur: 0.12, type: 'triangle', gain: 0.13, delay: 0.11 });
  }

  drink(): void {
    this.tone({ freq: 300, freqEnd: 620, dur: 0.18, type: 'sine', gain: 0.12 });
    this.tone({ freq: 240, freqEnd: 500, dur: 0.14, type: 'sine', gain: 0.1, delay: 0.16 });
  }

  play(): void {
    this.tone({ freq: 660, freqEnd: 990, dur: 0.09, type: 'square', gain: 0.07 });
    this.tone({ freq: 880, freqEnd: 1320, dur: 0.1, type: 'square', gain: 0.07, delay: 0.09 });
  }

  clean(): void {
    this.tone({ freq: 1400, freqEnd: 1800, dur: 0.12, type: 'sine', gain: 0.06 });
    this.tone({ freq: 1700, freqEnd: 2100, dur: 0.1, type: 'sine', gain: 0.05, delay: 0.1 });
  }

  hug(): void {
    this.tone({ freq: 392, dur: 0.18, type: 'sine', gain: 0.1 });
    this.tone({ freq: 494, dur: 0.2, type: 'sine', gain: 0.1, delay: 0.14 });
    this.tone({ freq: 587, dur: 0.28, type: 'sine', gain: 0.1, delay: 0.3 });
  }

  sleep(): void {
    this.tone({ freq: 520, freqEnd: 240, dur: 0.5, type: 'sine', gain: 0.09 });
  }

  levelUp(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.16, type: 'triangle', gain: 0.12, delay: i * 0.11 }));
  }

  attention(): void {
    this.tone({ freq: 740, dur: 0.09, type: 'triangle', gain: 0.11 });
    this.tone({ freq: 740, dur: 0.09, type: 'triangle', gain: 0.11, delay: 0.13 });
    this.tone({ freq: 988, dur: 0.16, type: 'triangle', gain: 0.13, delay: 0.26 });
  }

  birth(): void {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.2, type: 'triangle', gain: 0.13, delay: i * 0.13 }));
  }

  death(): void {
    this.tone({ freq: 330, freqEnd: 110, dur: 1.1, type: 'sawtooth', gain: 0.09 });
    this.tone({ freq: 275, freqEnd: 92, dur: 1.2, type: 'triangle', gain: 0.1, delay: 0.15 });
  }

  chatPing(): void {
    this.tone({ freq: 1245, dur: 0.07, type: 'sine', gain: 0.06 });
  }
}

export const sound = new AmiSound();

export function soundForAction(type: string): void {
  switch (type) {
    case 'feed':
      sound.eat();
      break;
    case 'drink':
      sound.drink();
      break;
    case 'play':
      sound.play();
      break;
    case 'clean':
      sound.clean();
      break;
    case 'hug':
      sound.hug();
      break;
    case 'sleep':
      sound.sleep();
      break;
    case 'wake':
      sound.play();
      break;
    case 'revive':
      sound.birth();
      break;
    default:
      break;
  }
}