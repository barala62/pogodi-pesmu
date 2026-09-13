// High-Precision Web Audio API Snippet Engine
// Rebuilt completely from scratch with sample-accurate hardware timing

export class SnippetAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentGain: GainNode | null = null;

  // Active state
  private isPlaying = false;
  private currentTime = 0;
  private maxDuration = 0.5; // Starts at 0.5s
  private startOffset = 0; // The detected musical onset time (in seconds)

  // Tracking
  private playStartTime = 0;
  private playStartOffset = 0;
  private animFrameId: number | null = null;
  private currentTrackId = '';

  // Fallback Synth Mode
  private isSynthMode = false;
  private synthOscillators: OscillatorNode[] = [];
  private synthGain: GainNode | null = null;

  // Callbacks
  private onTimeUpdateCallback: ((time: number, max: number) => void) | null = null;
  private onStateChangeCallback: ((isPlaying: boolean) => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private onOffsetDetectedCallback: ((offset: number) => void) | null = null;

  constructor() {
    // Lazy AudioContext initialization on user interaction or first call
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    return this.audioCtx;
  }

  public setCallbacks(
    onTimeUpdate: (time: number, max: number) => void,
    onStateChange: (isPlaying: boolean) => void,
    onEnd?: () => void,
    onOffsetDetected?: (offset: number) => void
  ) {
    this.onTimeUpdateCallback = onTimeUpdate;
    this.onStateChangeCallback = onStateChange;
    this.onEndCallback = onEnd || null;
    this.onOffsetDetectedCallback = onOffsetDetected || null;
  }

  /**
   * Completely loads and decodes the audio track into memory.
   * Immediately analyzes the waveform to find the musical onset (eliminating silence),
   * and prepares the 0.5s snippet right at the start of the music.
   */
  public async loadTrack(
    url: string,
    directUrl?: string,
    useSynth: boolean = false,
    explicitStartOffset: number = 0,
    songId?: string
  ): Promise<boolean> {
    this.stop();

    this.audioBuffer = null;
    this.currentTime = 0;
    this.startOffset = explicitStartOffset || 0;
    this.currentTrackId = songId || url || directUrl || '';
    this.isSynthMode = useSynth || (!url && !directUrl);

    this.triggerTimeUpdate();

    if (this.isSynthMode) {
      return true;
    }

    const targetUrl = url || directUrl;
    if (!targetUrl) {
      this.isSynthMode = true;
      return true;
    }

    try {
      const ctx = this.getAudioContext();

      // Fetch the audio file into an ArrayBuffer
      let response: Response;
      try {
        response = await fetch(targetUrl);
        if (!response.ok && directUrl && directUrl !== targetUrl) {
          response = await fetch(directUrl);
        }
      } catch (fetchErr) {
        if (directUrl && directUrl !== targetUrl) {
          response = await fetch(directUrl);
        } else {
          throw fetchErr;
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to download audio: ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

      this.audioBuffer = decodedBuffer;
      this.isSynthMode = false;

      // Detect musical onset (skip intro silence) if not explicitly set
      if (explicitStartOffset > 0) {
        this.startOffset = explicitStartOffset;
      } else {
        this.startOffset = this.detectOnset(decodedBuffer);
      }

      this.onOffsetDetectedCallback?.(this.startOffset);
      this.triggerTimeUpdate();

      return true;
    } catch (err) {
      console.warn('[SnippetAudioPlayer] Falling back to synth mode due to load failure:', err);
      this.isSynthMode = true;
      this.audioBuffer = null;
      this.triggerTimeUpdate();
      return false;
    }
  }

  /**
   * Scans PCM audio data to find where audible sound starts.
   */
  private detectOnset(buffer: AudioBuffer): number {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const maxScanSamples = Math.min(channelData.length, Math.floor(sampleRate * 3.5));

    // Measure silence baseline in first 60ms
    const noiseSamples = Math.min(maxScanSamples, Math.floor(sampleRate * 0.06));
    let noiseSum = 0;
    for (let i = 0; i < noiseSamples; i++) {
      noiseSum += Math.abs(channelData[i]);
    }
    const noiseFloor = noiseSum / (noiseSamples || 1);
    const threshold = Math.max(0.015, noiseFloor * 2.8);

    // 10ms moving window, stepped every 3ms
    const windowSize = Math.floor(sampleRate * 0.01);
    const stepSize = Math.floor(sampleRate * 0.003);

    for (let i = 0; i < maxScanSamples - windowSize; i += stepSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        sum += Math.abs(channelData[i + j]);
      }
      const avgAmp = sum / windowSize;
      if (avgAmp > threshold) {
        // Leave 20ms lead-in so note attack / transient is not clipped
        const onsetSec = Math.max(0, i / sampleRate - 0.02);
        return Math.round(onsetSec * 100) / 100;
      }
    }

    return 0;
  }

  public getStartOffset(): number {
    return this.startOffset;
  }

  public setLimitDuration(duration: number) {
    this.maxDuration = Math.max(0.2, duration);
    if (!this.isPlaying) {
      this.triggerTimeUpdate();
    }
  }

  /**
   * Play from current position or from the beginning (startOffset)
   * Plays EXACTLY for the remaining duration using Web Audio API hardware scheduling.
   */
  public async play(fromBeginning: boolean = false): Promise<void> {
    this.stopActivePlayback();

    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    if (fromBeginning || this.currentTime >= this.maxDuration - 0.05) {
      this.currentTime = 0;
    }

    const durationToPlay = Math.max(0.05, this.maxDuration - this.currentTime);

    this.playStartTime = ctx.currentTime;
    this.playStartOffset = this.currentTime;
    this.isPlaying = true;
    this.onStateChangeCallback?.(true);

    if (this.isSynthMode || !this.audioBuffer) {
      this.playSynthMode(durationToPlay);
      this.startAnimationLoop();
      return;
    }

    // Hardware-accurate Web Audio playback from AudioBuffer
    const source = ctx.createBufferSource();
    source.buffer = this.audioBuffer;

    const gain = ctx.createGain();
    const now = ctx.currentTime;

    // Smooth envelope: 5ms fade-in, flat, then 15ms fade-out at cutoff to prevent speaker pops
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(1.0, now + 0.005);
    gain.gain.setValueAtTime(1.0, now + durationToPlay - 0.015);
    gain.gain.linearRampToValueAtTime(0.001, now + durationToPlay);

    source.connect(gain);
    gain.connect(ctx.destination);

    const actualOffset = Math.max(0, this.startOffset + this.currentTime);

    // Native Web Audio start(when, offset, duration)
    // The browser audio thread stops playback EXACTLY after durationToPlay seconds!
    source.start(now, actualOffset, durationToPlay);

    this.currentSource = source;
    this.currentGain = gain;

    source.onended = () => {
      if (this.currentSource === source) {
        this.isPlaying = false;
        this.currentTime = this.maxDuration;
        this.stopAnimationLoop();
        this.currentSource = null;
        this.currentGain = null;
        this.onStateChangeCallback?.(false);
        this.triggerTimeUpdate();
        this.onEndCallback?.();
      }
    };

    this.startAnimationLoop();
  }

  public pause() {
    if (!this.isPlaying) return;

    if (this.audioCtx) {
      const elapsed = Math.max(0, this.audioCtx.currentTime - this.playStartTime);
      this.currentTime = Math.min(this.maxDuration, this.playStartOffset + elapsed);
    }

    this.stopActivePlayback();
    this.isPlaying = false;
    this.stopAnimationLoop();
    this.onStateChangeCallback?.(false);
    this.triggerTimeUpdate();
  }

  public stop() {
    this.stopActivePlayback();
    this.isPlaying = false;
    this.currentTime = 0;
    this.stopAnimationLoop();
    this.onStateChangeCallback?.(false);
    this.triggerTimeUpdate();
  }

  private stopActivePlayback() {
    if (this.currentSource) {
      try {
        this.currentSource.onended = null;
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }

    if (this.currentGain) {
      try {
        this.currentGain.disconnect();
      } catch {}
      this.currentGain = null;
    }

    this.stopSynth();
  }

  private startAnimationLoop() {
    this.stopAnimationLoop();

    const update = () => {
      if (!this.isPlaying || !this.audioCtx) return;

      const elapsed = Math.max(0, this.audioCtx.currentTime - this.playStartTime);
      const displayTime = Math.min(this.maxDuration, this.playStartOffset + elapsed);

      this.currentTime = displayTime;
      this.onTimeUpdateCallback?.(displayTime, this.maxDuration);

      if (displayTime < this.maxDuration && this.isPlaying) {
        this.animFrameId = requestAnimationFrame(update);
      }
    };

    this.animFrameId = requestAnimationFrame(update);
  }

  private stopAnimationLoop() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private triggerTimeUpdate() {
    this.onTimeUpdateCallback?.(this.currentTime, this.maxDuration);
  }

  // Fallback Web Audio Synthesizer
  private playSynthMode(duration: number) {
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const rootFreq = 220; // A3
    const chordFreqs = [rootFreq, rootFreq * (5 / 4), rootFreq * (3 / 2)];

    this.synthGain = ctx.createGain();
    this.synthGain.gain.setValueAtTime(0.001, now);
    this.synthGain.gain.linearRampToValueAtTime(0.18, now + 0.05);
    this.synthGain.gain.setValueAtTime(0.18, now + duration - 0.02);
    this.synthGain.gain.linearRampToValueAtTime(0.001, now + duration);
    this.synthGain.connect(ctx.destination);

    this.synthOscillators = chordFreqs.map((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.connect(this.synthGain!);
      osc.start(now);
      osc.stop(now + duration);
      return osc;
    });

    const primaryOsc = this.synthOscillators[0];
    primaryOsc.onended = () => {
      this.isPlaying = false;
      this.currentTime = this.maxDuration;
      this.stopAnimationLoop();
      this.stopSynth();
      this.onStateChangeCallback?.(false);
      this.triggerTimeUpdate();
      this.onEndCallback?.();
    };
  }

  private stopSynth() {
    this.synthOscillators.forEach((osc) => {
      try {
        osc.onended = null;
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.synthOscillators = [];

    if (this.synthGain) {
      try {
        this.synthGain.disconnect();
      } catch {}
      this.synthGain = null;
    }
  }

  // Web Audio UI Sound Effects
  public playEffect(type: 'correct' | 'wrong' | 'skip') {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      if (type === 'correct') {
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          osc.connect(gain);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.2);
        });
      } else if (type === 'wrong') {
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(90, now + 0.3);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'skip') {
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {}
  }

  public destroy() {
    this.stop();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch {}
    }
    this.audioCtx = null;
    this.audioBuffer = null;
  }
}
