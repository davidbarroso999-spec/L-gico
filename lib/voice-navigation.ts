// Web Audio API Synthesizer & SpeechSynthesis Voice Navigation Engine for Harpia Orion
// Complete turn-by-turn spoken directions and audible chimes (Waze / Google Maps style)

export type VoiceNavigationMode = 'all' | 'alerts_only' | 'mute';

class VoiceNavigationManager {
  private mode: VoiceNavigationMode = 'all';
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('harpia_voice_nav_mode');
      if (savedMode === 'all' || savedMode === 'alerts_only' || savedMode === 'mute') {
        this.mode = savedMode;
      }
    }
  }

  public getMode(): VoiceNavigationMode {
    return this.mode;
  }

  public setMode(mode: VoiceNavigationMode) {
    this.mode = mode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('harpia_voice_nav_mode', mode);
    }
    if (mode === 'all') {
      this.playChime();
      this.speak("Orientação por voz ativada.");
    } else if (mode === 'alerts_only') {
      this.playChime();
      this.speak("Apenas alertas ativado.");
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Play pleasant synthesizer tones for turn approach, radar warnings, speed limit exceed, and rerouting
  public playTone(frequencies: number[], type: OscillatorType = 'sine', noteDuration = 0.12, volume = 0.15) {
    if (this.mode === 'mute') return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      frequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * noteDuration);

        gain.gain.setValueAtTime(volume, ctx.currentTime + idx * noteDuration);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * noteDuration + noteDuration - 0.01);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * noteDuration);
        osc.stop(ctx.currentTime + idx * noteDuration + noteDuration);
      });
    } catch (e) {
      console.warn("AudioContext tone failed:", e);
    }
  }

  // Two-tone chime when preparing for turn (ding-dong)
  public playTurnChime() {
    this.playTone([523.25, 659.25], 'sine', 0.12, 0.18); // C5 -> E5
  }

  // Urgent double beep for nearby radar detection
  public playRadarWarningBeep() {
    this.playTone([880, 880], 'triangle', 0.09, 0.22); // A5 double beep
  }

  // Soft low-pitch beep when over speed limit
  public playSpeedLimitBeep() {
    this.playTone([493.88, 440], 'sine', 0.14, 0.15); // B4 -> A4
  }

  // Cheerful arrival chord
  public playArrivalChime() {
    this.playTone([392.00, 523.25, 659.25, 783.99], 'triangle', 0.14, 0.2); // G4 C5 E5 G5
  }

  // Dynamic recalculating tone
  public playRerouteChime() {
    this.playTone([349.23, 440.00, 523.25, 659.25], 'sine', 0.08, 0.16);
  }

  // General positive confirmation chime
  public playChime() {
    this.playTone([440, 554.37], 'sine', 0.1, 0.15);
  }

  // Spoken direction through SpeechSynthesis
  public speak(text: string, isAlert: boolean = false, minIntervalMs: number = 3500) {
    if (this.mode === 'mute') return;
    if (this.mode === 'alerts_only' && !isAlert) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const now = Date.now();
    // Avoid repeating identical sentence within minIntervalMs
    if (this.lastSpokenText === text && (now - this.lastSpokenTime) < minIntervalMs) {
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Cancel stale queued phrases for responsive real-time feedback

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.08; // slightly brisk natural navigation pace
      utterance.pitch = 1.02;

      // Select Brazilian Portuguese voice if available in user's OS
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(v => (v.lang === 'pt-BR' || v.lang.startsWith('pt')) && !v.name.includes('Portugal'));
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      this.lastSpokenText = text;
      this.lastSpokenTime = now;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("SpeechSynthesis error:", err);
    }
  }
}

export const voiceNav = new VoiceNavigationManager();
