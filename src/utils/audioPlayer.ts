// High-precision audio snippet player with Web Audio fallback

export class SnippetAudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private synthOscillators: OscillatorNode[] = [];
  private synthGain: GainNode | null = null;
  private animFrameId: number | null = null;

  private isPlaying = false;
  private currentTime = 0;
  private maxDuration = 0.5;
  private currentUrl = '';
  private directUrl = '';
  private isSynthMode = false;
  private synthStartTime = 0;
  private playStartTime = 0;
  private audioStartOffset = 0;
  private startOffset = 0; // Skips leading silence/fade-in so sound starts immediately

  private onTimeUpdateCallback: ((time: number, max: number) => void) | null = null;
  private onStateChangeCallback: ((isPlaying: boolean) => void) | null = null;
  private onEndCallback: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = 'auto';

      this.audio.addEventListener('ended', () => {
        this.stop();
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('Audio error on primary URL, attempting direct URL fallback...', e);
        if (this.directUrl && this.audio && this.audio.src !== this.directUrl) {
          this.audio.src = this.directUrl;
          this.audio.currentTime = this.startOffset;
          this.audio.load();
          if (this.isPlaying) {
            this.audio.play().catch((err) => {
              console.warn('Direct URL also failed:', err);
              this.isSynthMode = true;
              this.playSynthMelody();
            });
          }
        } else {
          this.isSynthMode = true;
        }
      });
    }
  }

  public setCallbacks(
    onTimeUpdate: (time: number, max: number) => void,
    onStateChange: (isPlaying: boolean) => void,
    onEnd?: () => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onStateChangeCallback = onStateChange;
    this.onEndCallback = onEnd || null;
  }

  public loadTrack(url: string, directUrl?: string, useSynth: boolean = false, explicitStartOffset: number = 0) {
    this.stop();
    this.currentUrl = url;
    this.directUrl = directUrl || '';
    this.isSynthMode = useSynth || (!url && !directUrl);
    this.startOffset = explicitStartOffset || 0;

    if (this.audio && !this.isSynthMode) {
      // Use proxy or direct URL
      const targetSrc = url || this.directUrl;
      this.audio.src = targetSrc;
      this.audio.currentTime = this.startOffset;
      this.audio.load();

      // Automatically detect and skip dead air / silence at the beginning of the track
      if (url && typeof window !== 'undefined') {
        this.detectAndApplyLeadingSilence(url);
      }
    }
    this.currentTime = 0;
    this.triggerTimeUpdate();
  }

  /**
   * Scans audio buffer to automatically detect leading silence (e.g. 0.5s - 3s of silence)
   * and shifts startOffset so the player hears audible music right on the first 0.5s snippet!
   */
  private async detectAndApplyLeadingSilence(url: string) {
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return;
      const tempCtx = new AudioCtxClass();

      const res = await fetch(url);
      if (!res.ok) {
        tempCtx.close().catch(() => {});
        return;
      }
      const buffer = await res.arrayBuffer();
      const audioBuffer = await tempCtx.decodeAudioData(buffer);
      const data = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      // Scan first 5 seconds
      const maxSamples = Math.min(data.length, sampleRate * 5);
      const windowSize = Math.floor(sampleRate * 0.04); // 40ms window
      const thresholdRms = 0.007; // ~-43dB silence floor

      let silenceSeconds = 0;
      for (let i = 0; i < maxSamples - windowSize; i += windowSize) {
        let sumSquares = 0;
        for (let j = 0; j < windowSize; j++) {
          const val = data[i + j];
          sumSquares += val * val;
        }
        const rms = Math.sqrt(sumSquares / windowSize);
        if (rms > thresholdRms) {
          silenceSeconds = i / sampleRate;
          break;
        }
      }

      tempCtx.close().catch(() => {});

      // If silence is more than 0.25s, apply offset
      if (silenceSeconds >= 0.25) {
        // Back up 0.04s so we don't clip the first note's attack transient
        const autoOffset = Math.max(0, silenceSeconds - 0.04);
        if (!this.startOffset || autoOffset > this.startOffset) {
          this.startOffset = Math.round(autoOffset * 100) / 100;
          if (this.audio && !this.isPlaying && this.currentTime === 0) {
            this.audio.currentTime = this.startOffset;
          }
        }
      }
    } catch {
      // Graceful fallback if decode is unsupported or blocked
    }
  }

  public setLimitDuration(duration: number) {
    this.maxDuration = duration;
    this.triggerTimeUpdate();
  }

  public getLimitDuration(): number {
    return this.maxDuration;
  }

  public getCurrentTime(): number {
    return this.currentTime;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public async play(fromBeginning = true) {
    if (this.isPlaying) return;

    if (fromBeginning || this.currentTime >= this.maxDuration) {
      this.currentTime = 0;
      if (this.audio) {
        this.audio.currentTime = this.startOffset;
      }
    } else if (this.audio) {
      this.audio.currentTime = this.startOffset + this.currentTime;
    }

    this.isPlaying = true;
    this.onStateChangeCallback?.(true);

    if (this.isSynthMode || !this.currentUrl) {
      this.synthStartTime = this.audioCtx ? this.audioCtx.currentTime : 0;
      this.playSynthMelody();
      this.startTimeLoop();
    } else if (this.audio) {
      try {
        await this.audio.play();
        this.audioStartOffset = this.audio.currentTime;
        this.playStartTime = performance.now();
        this.startTimeLoop();
      } catch (err) {
        console.warn('HTML5 play failed (likely autoplay policy or network), using synth mode:', err);
        this.isSynthMode = true;
        this.playSynthMelody();
        this.startTimeLoop();
      }
    }
  }

  public pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.onStateChangeCallback?.(false);

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.audio && !this.isSynthMode) {
      this.audio.pause();
    }

    this.stopSynth();
  }

  public stop() {
    this.pause();
    this.currentTime = 0;
    this.audioStartOffset = this.startOffset;
    this.playStartTime = performance.now();
    if (this.audio) {
      this.audio.currentTime = this.startOffset;
    }
    this.triggerTimeUpdate();
    this.onEndCallback?.();
  }

  public seek(seconds: number) {
    const clamped = Math.max(0, Math.min(seconds, this.maxDuration));
    this.currentTime = clamped;
    const absPos = this.startOffset + clamped;
    this.audioStartOffset = absPos;
    this.playStartTime = performance.now();
    if (this.audio && !this.isSynthMode) {
      this.audio.currentTime = absPos;
    }
    this.triggerTimeUpdate();
  }

  private startTimeLoop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    const checkTime = () => {
      if (!this.isPlaying) return;

      if (this.audio && !this.isSynthMode) {
        // High-precision smooth timestamp calculation (prevents 200ms HTML5 audio.currentTime skipping)
        const elapsed = (performance.now() - this.playStartTime) / 1000;
        let estimatedAbsTime = this.audioStartOffset + elapsed;

        // If audio buffer drifted (e.g. initial buffering), gently reconcile
        const realAbsTime = this.audio.currentTime;
        if (Math.abs(estimatedAbsTime - realAbsTime) > 0.12) {
          this.audioStartOffset = realAbsTime;
          this.playStartTime = performance.now();
          estimatedAbsTime = realAbsTime;
        }

        // Relative musical time
        const relativeTime = Math.max(0, estimatedAbsTime - this.startOffset);
        this.currentTime = Math.min(relativeTime, this.maxDuration);

        if (relativeTime >= this.maxDuration) {
          this.audio.pause();
          this.currentTime = this.maxDuration;
          this.isPlaying = false;
          this.onStateChangeCallback?.(false);
          this.triggerTimeUpdate();
          this.onEndCallback?.();
          return;
        }
      } else if (this.isSynthMode && this.audioCtx) {
        const elapsed = this.audioCtx.currentTime - this.synthStartTime;
        this.currentTime = Math.min(elapsed, this.maxDuration);
        if (this.currentTime >= this.maxDuration) {
          this.stopSynth();
          this.isPlaying = false;
          this.onStateChangeCallback?.(false);
          this.triggerTimeUpdate();
          this.onEndCallback?.();
          return;
        }
      }

      this.triggerTimeUpdate();
      this.animFrameId = requestAnimationFrame(checkTime);
    };

    this.animFrameId = requestAnimationFrame(checkTime);
  }

  private triggerTimeUpdate() {
    this.onTimeUpdateCallback?.(this.currentTime, this.maxDuration);
  }

  // --- Web Audio Synthesizer Fallback ---
  private initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  private playSynthMelody() {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;

      this.stopSynth();

      const ctx = this.audioCtx;
      this.synthStartTime = ctx.currentTime;
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.connect(ctx.destination);
      this.synthGain = gain;

      // Balkan folk-pop style catchy melody notes (frequencies in Hz)
      // D minor / Phrygian dominant feel: D4, Eb4, F#4, G4, A4, Bb4, C5, D5
      const notes = [293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 523.25, 587.33];
      const tempo = 0.25; // quarter second per note

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';

      // Simple lowpass filter for warm synth lead
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);

      osc.connect(filter);
      filter.connect(gain);

      // Program pitch changes
      let timeOffset = 0;
      for (let i = 0; timeOffset < this.maxDuration + 2; i++) {
        const freq = notes[i % notes.length];
        osc.frequency.setValueAtTime(freq, now + timeOffset);
        timeOffset += tempo;
      }

      osc.start(now);
      this.synthOscillators.push(osc);

      // Synth tick loop
      const synthTick = () => {
        if (!this.isPlaying) return;
        const elapsed = (ctx.currentTime - this.synthStartTime);
        this.currentTime = Math.min(elapsed, this.maxDuration);

        if (this.currentTime >= this.maxDuration) {
          this.stopSynth();
          this.isPlaying = false;
          this.onStateChangeCallback?.(false);
          this.triggerTimeUpdate();
          this.onEndCallback?.();
          return;
        }

        this.triggerTimeUpdate();
        this.animFrameId = requestAnimationFrame(synthTick);
      };

      this.animFrameId = requestAnimationFrame(synthTick);
    } catch (e) {
      console.error('Synth playback error:', e);
      this.isPlaying = false;
      this.onStateChangeCallback?.(false);
    }
  }

  private stopSynth() {
    for (const osc of this.synthOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // already stopped
      }
    }
    this.synthOscillators = [];
    if (this.synthGain) {
      this.synthGain.disconnect();
      this.synthGain = null;
    }
  }

  // Sound effects
  public playEffect(type: 'correct' | 'wrong' | 'click' | 'skip') {
    try {
      this.initAudioContext();
      if (!this.audioCtx) return;
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      if (type === 'correct') {
        // Modern, silky, atmospheric success chime (warm chord + delicate shimmer)
        const chimeNotes = [
          { freq: 440.00, delay: 0.00, dur: 0.55, vol: 0.12 }, // A4 warm foundation
          { freq: 659.25, delay: 0.04, dur: 0.60, vol: 0.14 }, // E5
          { freq: 880.00, delay: 0.08, dur: 0.65, vol: 0.15 }, // A5
          { freq: 1108.73, delay: 0.12, dur: 0.70, vol: 0.12 }, // C#6 harmonic sparkle
          { freq: 1318.51, delay: 0.16, dur: 0.75, vol: 0.08 }, // E6 top shimmer
        ];

        // Master lowpass filter to ensure soft, velvety tone without harsh clicks
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.connect(ctx.destination);

        chimeNotes.forEach((n) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.freq, now + n.delay);

          const startTime = now + n.delay;
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(n.vol, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + n.dur);

          osc.connect(gain);
          gain.connect(filter);

          osc.start(startTime);
          osc.stop(startTime + n.dur + 0.05);
        });
      } else if (type === 'wrong') {
        // Low double buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.setValueAtTime(110, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'skip') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(250, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else {
        // Click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      }
    } catch {
      // Audio context might be restricted before first click
    }
  }

  public destroy() {
    this.stop();
    if (this.audio) {
      this.audio.src = '';
      this.audio = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}
