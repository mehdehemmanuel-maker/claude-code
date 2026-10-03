// The translation layer (sections L, M, N of docs/EGO-NATIVE-LANGUAGE.md): a human language is a tuner on a native
// structure. Rendering keeps count of what it carried and what it dropped (semantic loss), never raises how well a
// thing is known (a hypothesis cannot come out as a fact), and says when a thing has no word (a coined term, flagged).
// The same renderer reads its own sentences back (parse), so the round trip native → English → native can be measured.

import { EVIDENCE, evidenceRank, type C, type Coords, type D, type E, type Evidence, type Mode, type Q, type R, type Structure, type T, d, q, r } from './core';
import { sayTerm } from './terms';

export type Lang = 'en' | 'es';
export type Audience = 'child' | 'technician' | 'engineer' | 'physicist';

export interface Rendering {
  text: string;
  /** Every piece of structure present (operators, arguments, coordinates), by path. */
  present: string[];
  rendered: string[];
  dropped: string[];
  /** dropped / present: 0 is a faithful rendering, 1 says nothing of it. */
  loss: number;
  /** Distinctions that had no word in this language: a term was coined for each. */
  coined: string[];
  /** The weakest kind of evidence the sentence rests on, as rendered: never stronger than the native one. */
  rank: Evidence | null;
}

const UNIT_OF_DIM: [string, number[]][] = [
  ['m', [0, 1, 0, 0, 0]], ['kg', [1, 0, 0, 0, 0]], ['s', [0, 0, 1, 0, 0]], ['A', [0, 0, 0, 1, 0]], ['K', [0, 0, 0, 0, 1]],
  ['N', [1, 1, -2, 0, 0]], ['J', [1, 2, -2, 0, 0]], ['W', [1, 2, -3, 0, 0]], ['Pa', [1, -1, -2, 0, 0]], ['m/s', [0, 1, -1, 0, 0]], ['m/s^2', [0, 1, -2, 0, 0]],
  ['kg/m^3', [1, -3, 0, 0, 0]], ['N m', [1, 2, -2, 0, 0]], ['V', [1, 2, -3, -1, 0]], ['Hz', [0, 0, -1, 0, 0]], ['T', [1, 0, -2, -1, 0]], ['N m/A', [1, 2, -2, -1, 0]], ['W/m K', [1, 1, -3, 0, -1]], ['J/kg K', [0, 2, -2, 0, -1]], ['C', [0, 0, 1, 1, 0]], ['Ω', [1, 2, -3, -2, 0]], ['', [0, 0, 0, 0, 0]],
];
export const unitOf = (dim: number[]): string => UNIT_OF_DIM.find(([, dd]) => dd.every((v, i) => v === dim[i]))?.[0] ?? `[${dim.join(' ')}]`;

const WORDS = {
  en: {
    raises: 'raises', lowers: 'lowers', enough: 'is enough to make', needed: 'is needed for', contributes: 'contributes to',
    strongly: 'strongly', weakly: 'weakly', has: 'has', kind: 'is a kind of', same: 'is the same as', differ: 'differs from', does: 'does',
    must: 'must satisfy', invariant: 'does not change under', greater: 'is greater than', supports: 'supports', contradicts: 'contradicts',
    becomes: 'becomes', when: 'when', after: 'after', relative: 'relative to', at: 'at a scale of', believes: 'believes that', assuming: 'assuming', ifset: 'if', wereset: 'were set then', inworld: 'in', branch: 'in a branch of', is: 'is', of: 'of', the: 'the', thing: 'the thing', and: 'and', approx: 'is about the same as', maps: 'maps to', embeds: 'is embedded in', abstracts: 'abstracts', recurs: 'refers to itself through',
    hedge: { theorem: 'is', derived: 'is', measured: 'is, by measurement,', calibrated: 'is, calibrated,', simulated: 'is, in simulation,', estimated: 'is, by estimate,', extrapolated: 'is, by extrapolation,', hypothesized: 'may be', assumed: 'is assumed to be', fictional: 'is, in fiction,' } as Record<Evidence, string>,
    mode: { true: '', false: 'it is false that', unknown: 'it is not known whether', unobserved: 'it has not been observed whether', unmodelled: 'I have no model of whether', 'impossible-under': 'it is impossible, under the assumptions, that', 'outside-domain': 'it is outside the domain to say whether', undefined: 'it means nothing to say that', contradictory: 'it is contradictory whether', insufficient: 'the evidence is insufficient that', unmeasured: 'it has not been measured whether' } as Record<Mode, string>,
    certainly: 'certainly', probably: 'probably', possibly: 'possibly', unlikely: 'unlikely',
  },
  es: {
    raises: 'aumenta', lowers: 'reduce', enough: 'basta para producir', needed: 'es necesario para', contributes: 'contribuye a',
    strongly: 'fuertemente', weakly: 'débilmente', has: 'tiene', kind: 'es un tipo de', same: 'es lo mismo que', differ: 'difiere de', does: 'hace',
    must: 'debe cumplir', invariant: 'no cambia bajo', greater: 'es mayor que', supports: 'apoya', contradicts: 'contradice',
    becomes: 'se convierte en', when: 'cuando', after: 'tras', relative: 'respecto a', at: 'a una escala de', believes: 'cree que', assuming: 'suponiendo', ifset: 'si', wereset: 'se fijara entonces', inworld: 'en', branch: 'en una rama de', is: 'es', of: 'de', the: 'el', thing: 'la cosa', and: 'y', approx: 'es casi lo mismo que', maps: 'se corresponde con', embeds: 'está incrustado en', abstracts: 'abstrae', recurs: 'se refiere a sí mismo mediante',
    hedge: { theorem: 'es', derived: 'es', measured: 'es, por medición,', calibrated: 'es, calibrado,', simulated: 'es, en simulación,', estimated: 'es, por estimación,', extrapolated: 'es, por extrapolación,', hypothesized: 'puede ser', assumed: 'se supone que es', fictional: 'es, en ficción,' } as Record<Evidence, string>,
    mode: { true: '', false: 'es falso que', unknown: 'no se sabe si', unobserved: 'no se ha observado si', unmodelled: 'no tengo modelo de si', 'impossible-under': 'es imposible, bajo los supuestos, que', 'outside-domain': 'queda fuera del dominio decir si', undefined: 'no significa nada decir que', contradictory: 'es contradictorio si', insufficient: 'la evidencia es insuficiente para que', unmeasured: 'no se ha medido si' } as Record<Mode, string>,
    certainly: 'con certeza', probably: 'probablemente', possibly: 'posiblemente', unlikely: 'improbablemente',
  },
};

/** The word a language has for a distinction, or a term coined from its hash, flagged. */
function word(x: D, lang: Lang, coined: string[]): string {
  const w = x.aliases?.[lang] ?? x.aliases?.['en'];
  if (w) return w;
  const coin = `${WORDS[lang].thing} #${x.id.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'x'}`;
  if (!coined.includes(coin)) coined.push(coin);
  return coin;
}

const num = (v: number): string => (Number.isInteger(v) ? String(v) : Number(v.toPrecision(3)).toString());
/** The unit a quantity was given, else the SI unit of its dimension. */
export const unitSaid = (x: Q): string => { const u = x.unit ?? unitOf(x.dim); return u === '-' || u === '1' ? '' : u; };
export const sayQ = (x: Q): string => `${num(x.v)}${unitSaid(x) ? ` ${unitSaid(x)}` : ''}`;

function certWord(c: Coords['cert'], lang: Lang, audience: Audience): string {
  if (!c) return '';
  const W = WORDS[lang];
  if (c.kind === 'exact') return '';
  const mid = c.lo !== undefined && c.hi !== undefined ? (c.lo + c.hi) / 2 : undefined;
  const adverb = mid === undefined ? W.possibly : mid >= 0.9 ? W.certainly : mid >= 0.6 ? W.probably : mid >= 0.3 ? W.possibly : W.unlikely;
  const range = audience === 'engineer' || audience === 'physicist' ? (c.lo !== undefined && c.hi !== undefined ? ` (${num(c.lo)} to ${num(c.hi)})` : '') : '';
  return `${adverb}${range}`;
}

/**
 * Render a structure in a language for an audience, counting what the sentence carried. A child hears no numbers and
 * no intervals; an engineer hears every coordinate that has a word; nothing hears a mechanism's hash.
 */
export function render(s: Structure, lang: Lang = 'en', audience: Audience = 'engineer'): Rendering {
  const present: string[] = [], rendered: string[] = [], dropped: string[] = [], coined: string[] = [];
  let weakest: Evidence | null = null;
  const W = WORDS[lang];
  const note = (path: string, done: boolean) => { present.push(path); (done ? rendered : dropped).push(path); };
  const seeEv = (how: Evidence) => { if (!weakest || evidenceRank(how) > evidenceRank(weakest)) weakest = how; };

  const ORDER: (keyof Coords)[] = ['mode', 'cert', 'strength', 'polarity', 'necessity', 'dir', 'ev', 'time', 'scale', 'frame', 'dom', 'mech', 'under', 'against', 'margin', 'instrument'];
  const coordsText = (c: Coords, path: string, parts: { before: string[]; after: string[]; verb: string }) => {
    for (const key of ORDER) {
      const v = c[key];
      if (v === undefined) continue;
      const p = `${path}.${key}`;
      switch (key) {
        case 'polarity': case 'necessity': case 'dir': note(p, true); break; // said by the verb
        case 'strength': {
          if (typeof v === 'number') { if (audience !== 'child') parts.before.push(v >= 0.67 ? W.strongly : v < 0.33 ? W.weakly : ''); note(p, audience !== 'child' && (v >= 0.67 || v < 0.33)); }
          else { if (audience !== 'child') parts.after.push(`(${sayQ(v as Q)})`); note(p, audience !== 'child'); }
          break;
        }
        case 'cert': { const w = certWord(v as Coords['cert'], lang, audience); if (w) parts.before.push(w); note(p, !!w || (v as Coords['cert'])!.kind === 'exact'); break; }
        case 'ev': { const ev = v as NonNullable<Coords['ev']>; seeEv(ev.how); parts.verb = W.hedge[ev.how]; note(p, true); if (ev.src?.length) { if (audience !== 'child') parts.after.push(`(${ev.src.join('; ')})`); note(`${p}.src`, audience !== 'child'); } break; }
        case 'time': {
          const tm = v as NonNullable<Coords['time']>;
          if (tm.delay) { if (audience !== 'child') parts.after.push(`${W.after} ${sayQ(tm.delay)}`); note(`${p}.delay`, audience !== 'child'); }
          for (const k of ['at', 'dur', 'phase', 'period', 'charT', 'process', 'proper', 'order', 'window'] as const) if (tm[k] !== undefined) note(`${p}.${k}`, false);
          break;
        }
        case 'scale': {
          const sc = v as NonNullable<Coords['scale']>;
          if (sc.L) { if (audience !== 'child') parts.after.push(`${W.at} ${sayQ(sc.L)}`); note(`${p}.L`, audience !== 'child'); }
          for (const k of ['T', 'E', 'res', 'model'] as const) if (sc[k] !== undefined) note(`${p}.${k}`, false);
          break;
        }
        case 'frame': { const f = v as NonNullable<Coords['frame']>; parts.after.push(`${W.relative} ${word(d(f.observer), lang, coined)}`); note(p, true); if (f.rest) note(`${p}.rest`, false); break; }
        case 'mode': { const mm = v as Mode; if (mm !== 'true') parts.before.unshift(W.mode[mm]); note(p, true); break; }
        case 'dom': { note(p, false); break; }
        case 'mech': note(p, false); break;
        case 'under': case 'against': case 'margin': case 'instrument': note(p, false); break;
      }
    }
  };

  const say = (x: Structure, path: string): string => {
    switch (x.k) {
      case 'D': note(path, true); return word(x, lang, coined);
      case 'Q': note(path, audience !== 'child'); if (x.cert && x.cert.kind !== 'exact') note(`${path}.cert`, audience === 'engineer' || audience === 'physicist'); return audience === 'child' ? (lang === 'en' ? 'some amount' : 'cierta cantidad') : `${sayQ(x)}${x.cert?.lo !== undefined && x.cert.hi !== undefined && (audience === 'engineer' || audience === 'physicist') ? ` (${num(x.cert.lo)} to ${num(x.cert.hi)})` : ''}`;
      case 'M': note(path, true); return `${x.id} v${x.version}`;
      case 'E': { note(path, true); seeEv(x.how); return `${say(x.of, `${path}.of`)}, ${x.how} (${x.src})`; }
      case 'C': {
        note(path, true);
        const body = say(x.body, `${path}.body`);
        const holder = x.holder; // an agent, a world, an assumption: named by the system that holds it
        switch (x.kind) {
          case 'believe': return `${holder} ${W.believes} ${body}`;
          case 'assume': return `${W.assuming} ${holder}, ${body}`;
          case 'intervene': return `${W.ifset} ${holder} ${W.wereset} ${body}`;
          case 'world': return `${W.inworld} ${holder}, ${body}`;
          case 'branch': return `${W.branch} ${holder}, ${body}`;
          case 'frame': return `${W.relative} ${holder}, ${body}`;
        }
      }
      // eslint-disable-next-line no-fallthrough
      case 'T': {
        note(path, true);
        const parts = { before: [] as string[], after: [] as string[], verb: W.becomes };
        coordsText(x.c, path, parts);
        const cond = x.cond?.length ? ` ${W.when} ${x.cond.map((y, i) => say(y, `${path}.cond[${i}]`)).join(` ${W.and} `)}` : '';
        // a hedge ("is, in simulation,") qualifies the becoming; it does not replace it
        const hedged = parts.verb === W.becomes || parts.verb === W.is ? W.becomes : `${W.becomes}${parts.verb.replace(/^[^\s,]+/, '')}`;
        return [...parts.before.filter(Boolean), say(x.from, `${path}.from`), hedged, say(x.to, `${path}.to`), ...parts.after].join(' ').replace(/\s+/g, ' ').trim() + cond;
      }
      case 'R': {
        note(path, true);
        const parts = { before: [] as string[], after: [] as string[], verb: '' };
        coordsText(x.c, path, parts);
        const a = x.args.map((y, i) => say(y, `${path}[${i}]`));
        const hedge = parts.verb;
        // a hedge takes the place of the verb's own "is": "is, by measurement, a kind of"
        // a hedge takes the place of the verb's own "is" ("is, by measurement, a kind of"); the plain "is" of a theorem or a derivation adds nothing to "raises"
        const join = (verb: string) => [...parts.before.filter(Boolean), a[0], hedge && hedge !== W.is && verb !== hedge ? `${hedge} ${verb.startsWith(`${W.is} `) ? verb.slice(W.is.length + 1) : verb}` : verb, ...a.slice(1), ...parts.after].join(' ').replace(/\s+/g, ' ').trim();
        switch (x.op) {
          case 'influence': {
            const verb = x.c.necessity === 'sufficient' ? W.enough : x.c.necessity === 'necessary' ? W.needed : x.c.necessity === 'contributing' ? W.contributes : x.c.polarity === '-' ? W.lowers : W.raises;
            const dirWord = x.c.polarity && x.c.necessity ? ` (${x.c.polarity === '-' ? W.lowers : W.raises})` : '';
            return join(verb + dirWord);
          }
          case 'part': return join(W.has);
          case 'kind': return join(W.kind);
          case 'same': return join(W.same);
          case 'approximate': return join(W.approx);
          case 'differ': return join(W.differ);
          case 'function': {
            // a law of the book: its formula over its named quantities, not a verb
            const law = x.args[0], ins = x.args[1], out = x.args[2];
            if (law?.k === 'D' && law.aliases?.['formula'] && ins?.k === 'R' && ins.op === 'state') {
              const name = (y: Structure) => (y.k === 'R' && y.op === 'quantity' && y.args[0]?.k === 'D' ? `${word(y.args[0], lang, coined)}${y.args[1]?.k === 'Q' && unitSaid(y.args[1]) ? ` (${unitSaid(y.args[1])})` : ''}` : '');
              for (const [k, y] of ins.args.entries()) { note(`${path}[1][${k}]`, true); if (y.k === 'R') { note(`${path}[1][${k}][0]`, true); note(`${path}[1][${k}][1]`, true); } }
              if (out?.k === 'R') { note(`${path}[2]`, true); note(`${path}[2][0]`, true); note(`${path}[2][1]`, true); }
              note(`${path}[1]`, true);
              return [...parts.before.filter(Boolean), `${word(law, lang, coined)}: ${law.aliases['formula']}, ${out ? name(out) : ''} ${W.of} ${ins.args.map(name).filter(Boolean).join(`, ${W.and} `)}`, ...parts.after].join(' ').replace(/\s+/g, ' ').trim();
            }
            return join(W.does);
          }
          case 'constrain': return join(W.must);
          case 'invariant': return join(W.invariant);
          case 'compare': return join(W.greater);
          case 'support': return join(W.supports);
          case 'contradict': return join(W.contradicts);
          case 'morphism': return join(W.maps);
          case 'embed': return join(W.embeds);
          case 'abstract': return join(W.abstracts);
          case 'recurse': return join(W.recurs);
          // a quantity with no value is a variable: "the rating life of the bearing", with no "is"
          case 'quantity': return a.length < 3 ? [...parts.before.filter(Boolean), `${a[1] ?? ''} ${W.of} ${a[0] ?? ''}`, ...parts.after].join(' ').replace(/\s+/g, ' ').trim() : [...parts.before.filter(Boolean), `${a[1] ?? ''} ${W.of} ${a[0] ?? ''}`, hedge || W.is, a[2] ?? '', ...parts.after].join(' ').replace(/\s+/g, ' ').trim();
          case 'state': return a.join(`, ${W.and} `);
          // a term (a law's content): said as its formula is written; every symbol in it is carried
          case 'apply': return [...parts.before.filter(Boolean), sayTerm(x), ...parts.after].join(' ').trim();
        }
      }
    }
  };
  const text = say(s, '$');
  const first = text.charAt(0).toUpperCase() + text.slice(1);
  return { text: `${first}.`, present, rendered, dropped, loss: present.length ? dropped.length / present.length : 0, coined, rank: weakest };
}

/** The rank a sentence's hedge admits: the strongest evidence it could be read as. A rendering must never read stronger than its structure. */
export function rankOfText(text: string, lang: Lang = 'en'): Evidence | null {
  const W = WORDS[lang];
  const found = EVIDENCE.filter((how) => text.includes(W.hedge[how])).sort((a, b) => evidenceRank(a) - evidenceRank(b));
  return found.length ? found[found.length - 1]! : null;
}

// ---- reading our own sentences back (the round trip of section N)

/** The lexicon for reading back: words to distinctions, as the renderer wrote them. */
export type Lexicon = Record<string, D>;

/** Parse a sentence the renderer wrote (simple relations between named things) back into a structure; null when it cannot. */
export function parse(text: string, lang: Lang, lexicon: Lexicon): Structure | null {
  const W = WORDS[lang];
  let s = text.trim().replace(/\.$/, '');
  s = s.charAt(0).toLowerCase() + s.slice(1); // the renderer capitalised the first word
  const c: Coords = {};
  for (const [mode, phrase] of Object.entries(W.mode) as [Mode, string][]) if (phrase && s.toLowerCase().startsWith(phrase)) { c.mode = mode; s = s.slice(phrase.length).trim(); break; }
  const certs: [string, [number, number]][] = [[W.certainly, [0.9, 1]], [W.probably, [0.6, 0.9]], [W.possibly, [0.3, 0.6]], [W.unlikely, [0, 0.3]]];
  for (const [w, [lo, hi]] of certs) if (s.startsWith(w)) { const mm = new RegExp(`^${w}\\s+\\(([\\d.]+) to ([\\d.]+)\\)`).exec(s); c.cert = mm ? { kind: 'interval', lo: Number(mm[1]), hi: Number(mm[2]), source: 'epistemic' } : { kind: 'interval', lo, hi, source: 'epistemic' }; s = s.slice(mm ? mm[0].length : w.length).trim(); break; }
  if (s.startsWith(W.strongly)) { c.strength = 0.8; s = s.slice(W.strongly.length).trim(); } else if (s.startsWith(W.weakly)) { c.strength = 0.2; s = s.slice(W.weakly.length).trim(); }
  const delay = new RegExp(`\\s${W.after}\\s([\\d.]+)\\s(\\S+)$`).exec(s);
  if (delay) { c.time = { delay: q(Number(delay[1]), delay[2]!) }; s = s.slice(0, delay.index); }
  const frame = new RegExp(`\\s${W.relative}\\s(.+)$`).exec(s);
  if (frame) { const obs = lexicon[frame[1]!.trim()]; if (obs) c.frame = { observer: obs.id }; s = s.slice(0, frame.index); }
  const src = /\s\(([^()]+)\)$/.exec(s);
  let evSrc: string[] | undefined;
  if (src && !/^[\d.]+ to [\d.]+$/.test(src[1]!)) { evSrc = src[1]!.split('; '); s = s.slice(0, src.index); }
  for (const how of EVIDENCE) { const h = W.hedge[how]; if (h !== W.is && s.includes(` ${h} `)) { c.ev = { how, ...(evSrc ? { src: evSrc } : {}) }; s = s.replace(` ${h} `, ' '); break; } }
  if (!c.ev && evSrc) c.ev = { how: 'derived', src: evSrc };
  const verbs: [string, (a: D, b: D) => R][] = [
    [`${W.enough} (${W.lowers})`, (a, b) => r('influence', [a, b], { ...c, dir: 1, necessity: 'sufficient', polarity: '-' })],
    [`${W.enough} (${W.raises})`, (a, b) => r('influence', [a, b], { ...c, dir: 1, necessity: 'sufficient', polarity: '+' })],
    [`${W.needed} (${W.lowers})`, (a, b) => r('influence', [a, b], { ...c, dir: 1, necessity: 'necessary', polarity: '-' })],
    [`${W.needed} (${W.raises})`, (a, b) => r('influence', [a, b], { ...c, dir: 1, necessity: 'necessary', polarity: '+' })],
    [`${W.contributes} (${W.lowers})`, (a, b) => r('influence', [a, b], { ...c, dir: 1, necessity: 'contributing', polarity: '-' })],
    [`${W.contributes} (${W.raises})`, (a, b) => r('influence', [a, b], { ...c, dir: 1, necessity: 'contributing', polarity: '+' })],
    [W.enough, (a, b) => r('influence', [a, b], { ...c, dir: 1, necessity: 'sufficient' })],
    [W.needed, (a, b) => r('influence', [a, b], { ...c, dir: 1, necessity: 'necessary' })],
    [W.contributes, (a, b) => r('influence', [a, b], { ...c, dir: 1, necessity: 'contributing' })],
    [W.lowers, (a, b) => r('influence', [a, b], { ...c, dir: 1, polarity: '-' })],
    [W.raises, (a, b) => r('influence', [a, b], { ...c, dir: 1, polarity: '+' })],
    [W.has, (a, b) => r('part', [a, b], c)], [W.kind, (a, b) => r('kind', [a, b], c)], [W.same, (a, b) => r('same', [a, b], c)], [W.approx, (a, b) => r('approximate', [a, b], c)],
    [W.differ, (a, b) => r('differ', [a, b], c)], [W.does, (a, b) => r('function', [a, b], c)], [W.must, (a, b) => r('constrain', [a, b], c)], [W.invariant, (a, b) => r('invariant', [a, b], c)],
    [W.greater, (a, b) => r('compare', [a, b], c)], [W.supports, (a, b) => r('support', [a, b], c)], [W.contradicts, (a, b) => r('contradict', [a, b], c)],
  ];
  for (const [verb, make] of verbs) {
    const at = s.indexOf(` ${verb} `);
    if (at < 0) continue;
    const left = s.slice(0, at).trim(), right = s.slice(at + verb.length + 2).trim();
    const a = lexicon[left] ?? lexicon[left.toLowerCase()], b = lexicon[right];
    if (!a || !b) return null;
    return make(a, b);
  }
  return null;
}

/** What `render` cannot carry of a structure, by design (the coordinates no sentence has words for), as paths. */
export const untranslatable = (s: Structure, lang: Lang = 'en', audience: Audience = 'engineer'): string[] => render(s, lang, audience).dropped;

// ---- human → native (section M): a phrase is not one concept but candidates, each with its uncertainty

export interface CandidateReading { structure: Structure; cert: NonNullable<Coords['cert']>; settledBy: string; says: string }

/** Phrases people say of a thing, and the structures each may mean, with what would settle it. */
const PHRASES: Record<string, { what: string; polarity: '+' | '-'; of: string; instrument: string; says: string }[]> = {
  struggling: [
    { what: 'torque demanded', polarity: '+', of: 'load', instrument: 'a torque reading against the stall torque', says: 'the torque asked of it is near what it can give' },
    { what: 'speed', polarity: '-', of: 'load', instrument: 'a tachometer against the no-load speed', says: 'its speed has fallen under its load' },
    { what: 'current', polarity: '+', of: 'load', instrument: 'a current reading against the rated current', says: 'its current is near its limit' },
    { what: 'temperature', polarity: '+', of: 'heat', instrument: 'a thermometer on the winding against its class', says: 'its temperature is rising' },
    { what: 'command', polarity: '+', of: 'controller', instrument: 'the controller output against its full scale', says: 'its controller is saturated' },
  ],
  overheating: [
    { what: 'temperature', polarity: '+', of: 'heat', instrument: 'a thermometer against the rated temperature', says: 'its temperature is above what it is rated for' },
    { what: 'current', polarity: '+', of: 'load', instrument: 'a current reading against the rated current', says: 'too much current is heating it' },
  ],
  slipping: [
    { what: 'friction', polarity: '-', of: 'contact', instrument: 'the ratio of tangential to normal force against the friction coefficient', says: 'its grip is less than the force across it' },
    { what: 'speed', polarity: '-', of: 'load', instrument: 'the speed of the driven part against the driver', says: 'the driven part lags the driver' },
  ],
  stuck: [
    { what: 'speed', polarity: '-', of: 'obstruction', instrument: 'a tachometer: zero under command', says: 'it does not move though commanded' },
    { what: 'torque demanded', polarity: '+', of: 'obstruction', instrument: 'a current reading at stall', says: 'something holds it past its stall torque' },
  ],
};

/** Decompose "that motor is struggling" into candidate native structures, none chosen, each with its uncertainty and what would settle it. */
/** Words that say one of the phrases another way: the human side of the lexicon. */
const PHRASE_WORDS: Record<string, string> = { hot: 'overheating', warm: 'overheating', smoking: 'overheating', weak: 'struggling', straining: 'struggling', labouring: 'struggling', laboring: 'struggling', jammed: 'stuck', seized: 'stuck', slips: 'slipping', slipped: 'slipping' };

export function decompose(phrase: string, thing: D): CandidateReading[] {
  const low = phrase.toLowerCase();
  const key = Object.keys(PHRASES).find((k) => low.includes(k)) ?? Object.entries(PHRASE_WORDS).find(([w]) => new RegExp(`\\b${w}\\b`).test(low))?.[1];
  if (!key) return [];
  const list = PHRASES[key]!;
  const share = 1 / list.length;
  return list.map((p) => {
    const cert: NonNullable<Coords['cert']> = { kind: 'interval', lo: 0, hi: Math.min(1, share * 2), source: 'epistemic' };
    const structure = r('influence', [d(p.of, { en: p.of }), r('quantity', [thing, d(p.what, { en: p.what })], {})], { dir: 1, polarity: p.polarity, cert, mode: 'unmeasured', instrument: p.instrument, ev: { how: 'hypothesized', src: [`said: "${phrase}"`] } });
    return { structure, cert, settledBy: p.instrument, says: p.says };
  });
}

/** The rendering an audience gets: the same structure, chosen words (section M's last point). */
export const forAudience = (s: Structure, audience: Audience, lang: Lang = 'en'): string => render(s, lang, audience).text;

export const _words = WORDS;
export type { C as Context, E as EvidenceLeaf, T as Transformation };
