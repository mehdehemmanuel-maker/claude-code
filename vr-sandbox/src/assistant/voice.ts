// Ego's voice, and her ears where the browser has them: the headset's own speech synthesis (on the device, no
// service), and speech recognition when the Quest browser offers it. Both are optional; she types when she can't talk.

export class Voice {
  enabled = true;
  private synth: SpeechSynthesis | null = globalThis.speechSynthesis ?? null;
  private voice: SpeechSynthesisVoice | null = null;

  get canSpeak() {
    return !!this.synth;
  }

  /** Say it, cutting off whatever she was saying: the newest thing is what matters. */
  say(text: string) {
    if (!this.enabled || !this.synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      this.voice ??= this.pick();
      this.synth.cancel();
      const u = new SpeechSynthesisUtterance(text.replace(/·/g, ',').replace(/N·m/g, 'newton metres').replace(/\bkN\b/g, 'kilonewtons').replace(/(\d)\s?N\b/g, '$1 newtons').replace(/(\d)\s?mm\b/g, '$1 millimetres'));
      if (this.voice) u.voice = this.voice;
      u.rate = 1.05;
      u.pitch = 1.05;
      this.synth.speak(u);
    } catch {
      /* no voice here */
    }
  }

  private pick(): SpeechSynthesisVoice | null {
    const voices = this.synth?.getVoices() ?? [];
    const en = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    return en.find((v) => /female|samantha|zira|aria|jenny|google uk english female/i.test(v.name)) ?? en[0] ?? voices[0] ?? null;
  }

  /** Speech recognition, if this browser has it. */
  static get canListen() {
    const w = globalThis as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
  }

  /** Listen for one request; `done` gets what was heard (or null). */
  listen(done: (text: string | null) => void) {
    const w = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!R) { done(null); return null; }
    try {
      const r = new R();
      r.lang = 'en-US';
      r.interimResults = false;
      r.maxAlternatives = 1;
      let heard: string | null = null;
      r.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => { heard = e.results[0]?.[0]?.transcript ?? null; };
      r.onerror = () => { /* reported through onend with nothing heard */ };
      r.onend = () => done(heard);
      r.start();
      return r;
    } catch {
      done(null);
      return null;
    }
  }
}

interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
