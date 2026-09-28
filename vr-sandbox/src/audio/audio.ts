// Physically driven sound. Impacts use modal synthesis: each material class has resonant mode ratios and a
// loss factor; banks are baked once at startup into small AudioBuffers and pitched to the part's actual
// flexural frequency f1 = (4.73^2 / 2 pi L^2) sqrt(E I / rho A). Gain follows impulse; nothing is canned.

import type { Material, SoundClass } from '../data/materials';
import { freeFreeBarFrequency } from '../engineering/beams';
import type { PartDims } from '../parts/registry';
import type { Vec3 } from '../doc/types';

interface ModalSpec {
  ratios: number[];
  /** Relative amplitudes of each mode. */
  amps: number[];
  noise: number;
  duration: number;
}

const BAR = [1, 2.756, 5.404, 8.933, 13.345];
const PLATE = [1, 1.593, 2.136, 2.296, 2.653, 2.918, 3.156];

const SPECS: Record<SoundClass, ModalSpec> = {
  steel: { ratios: PLATE, amps: [1, 0.7, 0.55, 0.4, 0.3, 0.25, 0.2], noise: 0.08, duration: 1.4 },
  aluminum: { ratios: PLATE, amps: [1, 0.65, 0.5, 0.35, 0.25, 0.2, 0.15], noise: 0.1, duration: 1.0 },
  copper: { ratios: PLATE, amps: [1, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1], noise: 0.08, duration: 1.1 },
  glass: { ratios: BAR, amps: [1, 0.8, 0.6, 0.4, 0.3], noise: 0.05, duration: 0.9 },
  stone: { ratios: BAR, amps: [1, 0.5, 0.3, 0.2, 0.1], noise: 0.6, duration: 0.25 },
  wood: { ratios: BAR, amps: [1, 0.45, 0.25, 0.12, 0.06], noise: 0.35, duration: 0.25 },
  plastic: { ratios: BAR, amps: [1, 0.4, 0.2, 0.1, 0.05], noise: 0.3, duration: 0.18 },
  rubber: { ratios: BAR, amps: [1, 0.2, 0.08, 0.03, 0.01], noise: 0.5, duration: 0.12 },
};

/** Base pitches of the baked banks; playback rate bridges to the exact frequency. */
const BUCKETS = [110, 220, 440, 880, 1760, 3520];
const SAMPLE_RATE = 22050;

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private banks = new Map<string, AudioBuffer[]>();
  private noiseBuf: AudioBuffer | null = null;
  private voices = 0;
  private lastPlay = new Map<string, number>();
  private creaks: { src: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode; panner: PannerNode }[] = [];
  private motor: { osc: OscillatorNode; gain: GainNode; panner: PannerNode } | null = null;
  volume = 0.8;
  static readonly MAX_VOICES = 24;

  /** Must be called from a user gesture. */
  async start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    this.master.connect(comp).connect(ctx.destination);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.workshopImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.18;
    this.reverb.connect(wet).connect(this.master);
    this.noiseBuf = this.makeNoise(ctx, 1.0);
    this.bake(ctx);
    this.startCreaks(ctx);
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  private bake(ctx: AudioContext) {
    let seed = 1234;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const cls of Object.keys(SPECS) as SoundClass[]) {
      const spec = SPECS[cls];
      const loss = { steel: 0.0006, aluminum: 0.0009, copper: 0.0008, glass: 0.0012, stone: 0.02, wood: 0.012, plastic: 0.02, rubber: 0.1 }[cls];
      const buffers = BUCKETS.map((f0) => {
        const n = Math.floor(spec.duration * SAMPLE_RATE);
        const buf = ctx.createBuffer(1, n, SAMPLE_RATE);
        const d = buf.getChannelData(0);
        spec.ratios.forEach((r, k) => {
          const f = f0 * r * (1 + (rnd() - 0.5) * 0.01);
          if (f > SAMPLE_RATE / 2.2) return;
          // modal decay time from the structural loss factor: tau = 1 / (pi f eta)
          const tau = Math.min(spec.duration / 2, 1 / (Math.PI * f * loss));
          const a = spec.amps[k] ?? 0.1;
          const ph = rnd() * Math.PI * 2;
          const w = (2 * Math.PI * f) / SAMPLE_RATE;
          for (let i = 0; i < n; i++) d[i]! += a * Math.sin(w * i + ph) * Math.exp(-i / (tau * SAMPLE_RATE));
        });
        // contact transient: a few ms of filtered noise
        const nt = Math.floor(0.006 * SAMPLE_RATE);
        let lp = 0;
        for (let i = 0; i < nt; i++) {
          lp += (rnd() * 2 - 1 - lp) * 0.5;
          d[i]! += spec.noise * lp * (1 - i / nt);
        }
        let peak = 0;
        for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]!));
        for (let i = 0; i < Math.min(n, 44); i++) d[i]! *= i / 44; // 2 ms attack, no click
        for (let i = 0; i < n; i++) d[i]! /= peak || 1;
        return buf;
      });
      this.banks.set(cls, buffers);
    }
  }

  private makeNoise(ctx: AudioContext, seconds: number) {
    const n = Math.floor(seconds * SAMPLE_RATE);
    const b = ctx.createBuffer(1, n, SAMPLE_RATE);
    const d = b.getChannelData(0);
    let seed = 99;
    for (let i = 0; i < n; i++) d[i] = ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
    return b;
  }

  private workshopImpulse(ctx: AudioContext) {
    const n = Math.floor(0.9 * ctx.sampleRate);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    let seed = 7;
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1) * Math.exp(-i / (0.18 * ctx.sampleRate));
    }
    return b;
  }

  private panner(p: Vec3) {
    const ctx = this.ctx!;
    const pn = ctx.createPanner();
    pn.panningModel = this.voices < 8 ? 'HRTF' : 'equalpower';
    pn.distanceModel = 'inverse';
    pn.refDistance = 0.6;
    pn.rolloffFactor = 1.2;
    pn.positionX.value = p[0];
    pn.positionY.value = p[1];
    pn.positionZ.value = p[2];
    return pn;
  }

  updateListener(pos: Vec3, forward: Vec3, up: Vec3) {
    const l = this.ctx?.listener;
    if (!l) return;
    if (l.positionX) {
      l.positionX.value = pos[0]; l.positionY.value = pos[1]; l.positionZ.value = pos[2];
      l.forwardX.value = forward[0]; l.forwardY.value = forward[1]; l.forwardZ.value = forward[2];
      l.upX.value = up[0]; l.upY.value = up[1]; l.upZ.value = up[2];
    }
  }

  /** Characteristic ring frequency of a part (first free-free flexural mode, clamped to the audible band). */
  static partFrequency(m: Material, dims: PartDims) {
    const h = Math.max(dims.b, 0.001);
    const w = Math.max(dims.a, h);
    const I = (w * h ** 3) / 12;
    const f = freeFreeBarFrequency(Math.max(dims.length, h * 2), m.E, I, m.density, w * h);
    return Math.min(6000, Math.max(90, f));
  }

  private play(buf: AudioBuffer, rate: number, gain: number, p: Vec3, dry = 1, wet = 0.6) {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.voices >= AudioEngine.MAX_VOICES) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = gain;
    const pn = this.panner(p);
    src.connect(g).connect(pn);
    const d = ctx.createGain();
    d.gain.value = dry;
    pn.connect(d).connect(this.master);
    if (this.reverb && wet > 0) {
      const w = ctx.createGain();
      w.gain.value = wet;
      pn.connect(w).connect(this.reverb);
    }
    this.voices++;
    src.onended = () => { this.voices--; };
    src.start();
  }

  /** A contact between parts: each body rings at its own pitch, scaled by the impulse. */
  impact(key: string, m: Material, dims: PartDims, impulse: number, speed: number, p: Vec3) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if ((this.lastPlay.get(key) ?? 0) > now - 0.05) return; // debounce chatter
    this.lastPlay.set(key, now);
    const f = AudioEngine.partFrequency(m, dims);
    const bank = this.banks.get(m.sound);
    if (!bank) return;
    let i = 0;
    while (i < BUCKETS.length - 1 && BUCKETS[i + 1]! <= f) i++;
    const rate = f / BUCKETS[i]!;
    const gain = Math.min(1, 0.08 * Math.log10(1 + impulse * 40) * Math.min(1, speed / 0.6));
    if (gain < 0.005) return;
    this.play(bank[i]!, rate, gain, p);
  }

  /** Crack / snap of a failing joint. Brittle and metal failures sound different by material. */
  breakSound(m: Material | null, load: number, p: Vec3) {
    if (!this.ctx || !this.noiseBuf) return;
    const ctx = this.ctx;
    const g = Math.min(1, 0.25 + Math.log10(1 + load / 200) * 0.25);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = m?.sound === 'wood' ? 900 : m?.sound === 'steel' ? 3200 : 1800;
    bp.Q.value = 0.9;
    const env = ctx.createGain();
    env.gain.setValueAtTime(g, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (m?.sound === 'wood' ? 0.18 : 0.08));
    const pn = this.panner(p);
    src.connect(bp).connect(env).connect(pn).connect(this.master!);
    src.start();
    src.stop(ctx.currentTime + 0.3);
    if (m && (m.sound === 'steel' || m.sound === 'aluminum')) {
      const bank = this.banks.get(m.sound)!;
      this.play(bank[4]!, 1.1, g * 0.6, p);
    }
  }

  slip(p: Vec3) {
    if (!this.ctx) return;
    const bank = this.banks.get('steel')!;
    this.play(bank[3]!, 0.72, 0.25, p, 1, 0.3);
  }

  splash(speed: number, size: number, p: Vec3) {
    if (!this.ctx || !this.noiseBuf) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900 + 400 / Math.max(size, 0.05);
    const env = ctx.createGain();
    const g = Math.min(1, 0.1 * speed * Math.sqrt(size + 0.05));
    env.gain.setValueAtTime(g, ctx.currentTime);
    env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    src.connect(lp).connect(env).connect(this.panner(p)).connect(this.master!);
    src.start();
    src.stop(ctx.currentTime + 0.6);
  }

  /** UI / tool feedback: short tuned blips so every action is heard. */
  ui(kind: 'place' | 'connect' | 'delete' | 'freeze' | 'unfreeze' | 'grab' | 'drop' | 'click' | 'error' | 'weld' | 'ratchet' | 'save', p?: Vec3) {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const tone = (f: number, dur: number, type: OscillatorType, gain: number, at = 0, slide?: number) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.setValueAtTime(f, t + at);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + at + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(gain, t + at + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g);
      if (p) g.connect(this.panner(p)).connect(this.master!);
      else g.connect(this.master!);
      o.start(t + at);
      o.stop(t + at + dur + 0.02);
    };
    switch (kind) {
      case 'place': tone(420, 0.09, 'triangle', 0.18, 0, 620); break;
      case 'connect': tone(180, 0.05, 'square', 0.12); tone(260, 0.07, 'triangle', 0.15, 0.04); break;
      case 'delete': tone(520, 0.12, 'sine', 0.14, 0, 180); break;
      case 'freeze': tone(900, 0.08, 'sine', 0.1); tone(1350, 0.1, 'sine', 0.08, 0.05); break;
      case 'unfreeze': tone(1350, 0.08, 'sine', 0.08); tone(900, 0.1, 'sine', 0.1, 0.05); break;
      case 'grab': tone(300, 0.05, 'triangle', 0.1, 0, 380); break;
      case 'drop': tone(380, 0.06, 'triangle', 0.08, 0, 260); break;
      case 'click': tone(1200, 0.025, 'square', 0.05); break;
      case 'error': tone(160, 0.18, 'sawtooth', 0.08); break;
      case 'save': tone(660, 0.07, 'triangle', 0.1); tone(990, 0.09, 'triangle', 0.1, 0.06); break;
      case 'ratchet': for (let i = 0; i < 5; i++) tone(2400 + i * 60, 0.012, 'square', 0.06, i * 0.035); break;
      case 'weld': {
        if (!this.noiseBuf) break;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 2500;
        const g = ctx.createGain();
        // arc crackle: rapid random gain steps
        g.gain.setValueAtTime(0, t);
        for (let i = 0; i < 40; i++) g.gain.setValueAtTime(Math.random() * 0.25, t + i * 0.012);
        g.gain.setValueAtTime(0, t + 0.5);
        src.connect(hp).connect(g);
        if (p) g.connect(this.panner(p)).connect(this.master!);
        else g.connect(this.master!);
        src.start(t);
        src.stop(t + 0.52);
        break;
      }
    }
  }

  /** A spring plucked: sound at its real surge frequency. */
  boing(freq: number, gain: number, p: Vec3) {
    const ctx = this.ctx;
    if (!ctx || freq < 30 || freq > 8000) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * 1.04, t);
    o.frequency.exponentialRampToValueAtTime(freq, t + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(Math.min(0.3, gain), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    o.connect(g).connect(this.panner(p)).connect(this.master!);
    o.start(t);
    o.stop(t + 1);
  }

  private startCreaks(ctx: AudioContext) {
    for (let i = 0; i < 3; i++) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 12;
      filter.frequency.value = 300;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const panner = this.panner([0, 0, 0]);
      src.connect(filter).connect(gain).connect(panner).connect(this.master!);
      src.start();
      this.creaks.push({ src, gain, filter, panner });
    }
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    const panner = this.panner([0, 0, 0]);
    osc.connect(lp).connect(gain).connect(panner).connect(this.master!);
    osc.start();
    this.motor = { osc, gain, panner };
  }

  /** Structures groan before they go: the three most loaded joints above 80% utilisation creak. */
  updateCreaks(items: { u: number; p: Vec3; wood: boolean }[]) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const top = items.filter((i) => i.u > 0.8).sort((a, b) => b.u - a.u).slice(0, 3);
    this.creaks.forEach((c, i) => {
      const it = top[i];
      const target = it ? Math.min(0.35, (it.u - 0.8) * 1.5) * (0.6 + 0.4 * Math.sin(t * 7 + i)) : 0;
      c.gain.gain.setTargetAtTime(target, t, 0.05);
      if (it) {
        c.filter.frequency.setTargetAtTime(it.wood ? 260 + it.u * 80 : 520 + it.u * 200, t, 0.1);
        c.panner.positionX.value = it.p[0]; c.panner.positionY.value = it.p[1]; c.panner.positionZ.value = it.p[2];
      }
    });
  }

  /** Motor whine: commutator frequency of the fastest motor, level with load. */
  updateMotor(freq: number, level: number, p: Vec3) {
    if (!this.ctx || !this.motor) return;
    const t = this.ctx.currentTime;
    this.motor.osc.frequency.setTargetAtTime(Math.max(20, Math.min(4000, freq)), t, 0.05);
    this.motor.gain.gain.setTargetAtTime(Math.min(0.08, level), t, 0.08);
    this.motor.panner.positionX.value = p[0]; this.motor.panner.positionY.value = p[1]; this.motor.panner.positionZ.value = p[2];
  }
}
