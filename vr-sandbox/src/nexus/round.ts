// A round (docs/NEXUS-FROM-REALITY.md, section 21): intents drawn by the manifold itself at a high bar, each generated
// from nothing, and what stopped each one gathered across the round. A crash is a finding like any gap: the language
// met something it could not even represent. Nothing from one draw is kept for the next.

import { drawIntent, knownSpans, type Drawn } from './draw';
import { generate, lacking, type Structure } from './manifold';

export interface DrawResult { drawn: Drawn; structure: Structure | null; crash: string | null; ms: number }

export interface Round {
  seed: number; bar: number; draws: DrawResult[];
  /** Per form of want: how many were drawn, how many some element answers, how many the generator left as a gap. */
  forms: Record<string, { drawn: number; answered: number; gapped: number }>;
  crashes: { message: string; count: number; seeds: number[] }[];
  lacks: ReturnType<typeof lacking>;
}

/** Run a round: `count` intents drawn from `seed` on, each generated from nothing. */
export function runRound(seed: number, count: number, bar = 2): Round {
  const spans = knownSpans();
  const draws: DrawResult[] = [];
  for (let i = 0; i < count; i++) {
    const drawn = drawIntent(seed + i, bar, spans);
    const t0 = performance.now();
    try { draws.push({ drawn, structure: generate(drawn.intent), crash: null, ms: performance.now() - t0 }); }
    catch (err) { draws.push({ drawn, structure: null, crash: String((err as Error).message ?? err).split('\n')[0]!, ms: performance.now() - t0 }); }
  }
  const forms: Round['forms'] = {};
  for (const d of draws) for (const f of d.drawn.forms) {
    const e = (forms[f.form] ??= { drawn: 0, answered: 0, gapped: 0 });
    e.drawn++;
    if (!d.structure) continue;
    if (d.structure.elements.some((el) => [el.why, ...el.also].some((l) => l.want === f.want))) e.answered++;
    if (d.structure.gaps.some((g) => g.want === f.want)) e.gapped++;
  }
  // a crash's message, with what varies from draw to draw (numbers, quoted names) taken out, so like crashes gather
  const shape = (m: string) => m.replace(/-?\d[\d.e+-]*/g, '#').replace(/"[^"]*"/g, '"…"');
  const crashes = new Map<string, { message: string; count: number; seeds: number[] }>();
  for (const d of draws) if (d.crash) { const k = shape(d.crash); const c = crashes.get(k) ?? { message: d.crash, count: 0, seeds: [] }; c.count++; c.seeds.push(d.drawn.seed); crashes.set(k, c); }
  const ok = draws.filter((d) => d.structure);
  return { seed, bar, draws, forms, crashes: [...crashes.values()].sort((a, b) => b.count - a.count), lacks: lacking(ok.map((d) => d.drawn.intent), ok.map((d) => d.structure!)) };
}

/** A round as lines of text. */
export function report(r: Round): string[] {
  const ok = r.draws.filter((d) => d.structure);
  const out = [`round from seed ${r.seed}: ${r.draws.length} intents drawn at a bar of ${r.bar} decades beyond the book; ${ok.length} generated, ${r.draws.length - ok.length} crashed; ${ok.reduce((a, d) => a + d.structure!.elements.length, 0)} elements, ${ok.reduce((a, d) => a + d.structure!.gaps.length, 0)} gaps, ${ok.reduce((a, d) => a + d.structure!.unused.length, 0)} quantities unread; ${(r.draws.reduce((a, d) => a + d.ms, 0) / 1000).toFixed(2)} s`];
  out.push('wants by form: drawn, answered by some element, left as a gap');
  for (const [f, v] of Object.entries(r.forms)) out.push(`  ${f.padEnd(8)} ${String(v.drawn).padStart(4)} ${String(v.answered).padStart(4)} ${String(v.gapped).padStart(4)}`);
  if (r.crashes.length) { out.push('crashes:'); for (const c of r.crashes) out.push(`  ${c.count} × ${c.message}  (seeds ${c.seeds.slice(0, 5).join(', ')}${c.seeds.length > 5 ? ', …' : ''})`); }
  out.push('what is missing, by how many intents it stops:');
  for (const l of r.lacks.slice(0, 14)) out.push(`  ${String(l.inventions.length).padStart(4)} intents, ${String(l.gaps).padStart(4)} gaps, ${String(l.unread).padStart(4)} unread: ${l.distinction.slice(0, 200)}`);
  return out;
}
