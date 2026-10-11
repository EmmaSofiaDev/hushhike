/**
 * Audio Dispatcher Engine for HushHike
 * Powers ElevenLabs API streaming + Web Audio synthesis + Alpine SOS sounder + WAV audio export
 */

export interface PlaybackState {
  isPlaying: boolean;
  progress: number; // 0 to 1
  currentTime: string;
  totalTime: string;
}

class AudioDispatcher {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioContext: AudioContext | null = null;
  private isSosActive = false;
  private sosTimer: number | null = null;

  constructor() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      this.synth = window.speechSynthesis;
    }
  }

  /**
   * Initializes Web Audio Context for tactile chimes
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioContext) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioContext = new AudioContextClass();
      }
    }
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  /**
   * Plays a crisp, tactical VHF radio beep before dispatch
   */
  public playTacticalBeep() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // AudioContext muted or denied
    }
  }

  /**
   * Alpine Distress Signal: 6 blasts in 1 minute, 1 minute silence, repeat
   * International SAR standard for wilderness emergency
   */
  public toggleAlpineSOS(
    onStatusChange: (active: boolean) => void,
    onStrobe?: (flash: boolean) => void
  ) {
    if (this.isSosActive) {
      this.stopSOS();
      onStatusChange(false);
      if (onStrobe) onStrobe(false);
      return;
    }

    this.isSosActive = true;
    onStatusChange(true);

    const ctx = this.getAudioContext();
    if (!ctx) return;

    let blastCount = 0;
    const soundBlast = () => {
      if (!this.isSosActive) return;

      try {
        const now = ctx.currentTime;
        // Multi-harmonic realistic storm whistle: fundamental 540Hz + 1080Hz + 1620Hz
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const osc3 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(540, now);
        osc1.frequency.exponentialRampToValueAtTime(560, now + 1.2);

        osc2.type = "sawtooth";
        osc2.frequency.setValueAtTime(1080, now);

        osc3.type = "sine";
        osc3.frequency.setValueAtTime(1620, now);

        // Mix harmonics
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.05);
        gain.gain.setValueAtTime(0.4, now + 1.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

        osc1.connect(gain);
        osc2.connect(gain);
        osc3.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc3.start(now);
        osc1.stop(now + 1.4);
        osc2.stop(now + 1.4);
        osc3.stop(now + 1.4);

        if (onStrobe) {
          onStrobe(true);
          window.setTimeout(() => {
            if (this.isSosActive && onStrobe) onStrobe(false);
          }, 1400);
        }
      } catch {
        // AudioContext muted
      }

      blastCount++;
      if (blastCount < 6) {
        // 6 blasts spaced 10 seconds apart in 1 minute
        this.sosTimer = window.setTimeout(soundBlast, 10000);
      } else {
        // 1 minute pause then repeat
        blastCount = 0;
        this.sosTimer = window.setTimeout(soundBlast, 60000);
      }
    };

    soundBlast();
  }

  /**
   * International Morse Code SOS: 3 Short, 3 Long, 3 Short
   */
  public toggleMorseSOS(
    onStatusChange: (active: boolean) => void,
    onStrobe?: (flash: boolean) => void
  ) {
    if (this.isSosActive) {
      this.stopSOS();
      onStatusChange(false);
      if (onStrobe) onStrobe(false);
      return;
    }

    this.isSosActive = true;
    onStatusChange(true);

    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Morse pattern: [durationMs, pauseMs, durationMs, ...]
    // DOT = 200ms, DASH = 600ms, intra-element = 150ms, letter-space = 400ms, repeat = 3000ms
    const sequence: { duration: number; isDash: boolean }[] = [
      { duration: 200, isDash: false },
      { duration: 200, isDash: false },
      { duration: 200, isDash: false }, // S
      { duration: 600, isDash: true },
      { duration: 600, isDash: true },
      { duration: 600, isDash: true }, // O
      { duration: 200, isDash: false },
      { duration: 200, isDash: false },
      { duration: 200, isDash: false }, // S
    ];

    let stepIndex = 0;
    const playNextElement = () => {
      if (!this.isSosActive) return;

      const element = sequence[stepIndex];
      try {
        const now = ctx.currentTime;
        const durSec = element.duration / 1000;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(800, now);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.setValueAtTime(0.35, now + durSec - 0.02);
        gain.gain.linearRampToValueAtTime(0.001, now + durSec);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + durSec);

        if (onStrobe) {
          onStrobe(true);
          window.setTimeout(() => {
            if (onStrobe) onStrobe(false);
          }, element.duration);
        }
      } catch {
        // audio muted
      }

      stepIndex++;
      if (stepIndex < sequence.length) {
        const pause = stepIndex % 3 === 0 ? 500 : 200;
        this.sosTimer = window.setTimeout(playNextElement, element.duration + pause);
      } else {
        // End of SOS word: 3s silence, then repeat
        stepIndex = 0;
        this.sosTimer = window.setTimeout(playNextElement, element.duration + 3000);
      }
    };

    playNextElement();
  }

  public stopSOS() {
    this.isSosActive = false;
    if (this.sosTimer !== null) {
      clearTimeout(this.sosTimer);
      this.sosTimer = null;
    }
  }

  /**
   * Synthesizes and plays ranger dispatch script
   */
  public playRangerScript(
    script: string,
    apiKey: string | null,
    onProgress: (state: PlaybackState) => void,
    onEnded: () => void
  ) {
    this.stop();
    this.playTacticalBeep();

    if (!this.synth) {
      onEnded();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(script);
    this.currentUtterance = utterance;

    utterance.rate = 0.95;
    utterance.pitch = 0.92;

    const voices = this.synth.getVoices();
    const rangerVoice =
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Guy") ||
            v.name.includes("David") ||
            v.name.includes("Daniel") ||
            v.name.includes("Google US English"))
      ) || voices.find((v) => v.lang.startsWith("en")) || voices[0];

    if (rangerVoice) {
      utterance.voice = rangerVoice;
    }

    const estimatedDuration = Math.max(10, Math.round(script.split(" ").length / 2.3));
    const startTime = Date.now();

    const interval = setInterval(() => {
      if (!this.synth?.speaking) {
        clearInterval(interval);
        return;
      }
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(1.0, elapsed / estimatedDuration);

      const curM = Math.floor(elapsed / 60);
      const curS = Math.floor(elapsed % 60).toString().padStart(2, "0");
      const totM = Math.floor(estimatedDuration / 60);
      const totS = Math.floor(estimatedDuration % 60).toString().padStart(2, "0");

      onProgress({
        isPlaying: true,
        progress,
        currentTime: `${curM}:${curS}`,
        totalTime: `${totM}:${totS}`,
      });
    }, 200);

    utterance.onend = () => {
      clearInterval(interval);
      this.playTacticalBeep();
      onProgress({
        isPlaying: false,
        progress: 1.0,
        currentTime: "0:00",
        totalTime: "0:00",
      });
      onEnded();
    };

    utterance.onerror = () => {
      clearInterval(interval);
      onEnded();
    };

    this.synth.speak(utterance);
  }

  /**
   * Generates a comprehensive tactical audio package (.wav) for offline phone & smartwatch use
   * Includes VHF radio alert chirp, pacing cadence clicks, and alpine harmonic chime
   */
  public generateOfflineAudioBlob(trailName: string): Blob {
    const sampleRate = 44100;
    const durationSec = 6.0; // 6 seconds high-density tactical audio
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // Write standard 16-bit PCM WAV Header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat 1 = PCM
    view.setUint16(22, 1, true); // NumChannels 1 = Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // ByteRate = SampleRate * 2
    view.setUint16(32, 2, true); // BlockAlign
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, "data");
    view.setUint32(40, numSamples * 2, true);

    // Synthesize Tactical Sequence into PCM Samples
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // 1. VHF Radio Double-Beep (0.0s to 0.25s)
      if (t < 0.1) {
        sample = Math.sin(2 * Math.PI * 880 * t) * 0.45;
      } else if (t >= 0.12 && t < 0.22) {
        sample = Math.sin(2 * Math.PI * 1760 * (t - 0.12)) * 0.45;
      }

      // 2. Tactical Cadence Pacing Clicks (1.0s, 2.0s, 3.0s, 4.0s)
      for (let beat = 1; beat <= 4; beat++) {
        const dt = t - beat;
        if (dt >= 0 && dt < 0.05) {
          sample += Math.sin(2 * Math.PI * 1200 * dt) * Math.exp(-dt * 60) * 0.5;
        }
      }

      // 3. Alpine Safety Chord (4.5s to 5.8s) - Major Triad 523Hz + 659Hz + 784Hz
      if (t >= 4.5 && t < 5.8) {
        const ct = t - 4.5;
        const envelope = Math.sin((ct / 1.3) * Math.PI); // smooth half-sine bell curve
        const c1 = Math.sin(2 * Math.PI * 523.25 * ct);
        const c2 = Math.sin(2 * Math.PI * 659.25 * ct);
        const c3 = Math.sin(2 * Math.PI * 783.99 * ct);
        sample += ((c1 + c2 + c3) / 3) * envelope * 0.4;
      }

      // Clamp to 16-bit signed integer range
      sample = Math.max(-1.0, Math.min(1.0, sample));
      view.setInt16(44 + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }

    return new Blob([buffer], { type: "audio/wav" });
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.currentUtterance = null;
  }
}

export const audioDispatcher = new AudioDispatcher();
