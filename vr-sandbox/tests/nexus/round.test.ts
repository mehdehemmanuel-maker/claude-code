// Rounds the manifold draws for itself (src/nexus/substrate/draw.ts, src/nexus/substrate/round.ts): intents composed at random from its own
// carriers, region roles and want forms, every magnitude from what the kept laws cover pushed past it by the bar, each
// generated from nothing. What these tests hold is the mathematics a round must reproduce, never what one draw said.

import { describe, expect, it } from 'vitest';
import { drawIntent, knownSpans } from '../../src/nexus/substrate/draw';
import { parseUnit } from '../../src/ganglia/units';
import { dimText } from '../../src/nexus/lang/dimension';
import { runRound } from '../../src/nexus/substrate/round';
import { generate } from '../../src/nexus/substrate/manifold';
import { scaleOf } from '../../src/nexus/lang/dimension';
import { reach } from '../../src/nexus/substrate/tuner';

describe('a round draws its own intents', () => {
  it('the same seed draws the same intent, another seed another: a round can be run again exactly', () => {
    expect(JSON.stringify(drawIntent(7).intent)).toBe(JSON.stringify(drawIntent(7).intent));
    expect(JSON.stringify(drawIntent(7).intent)).not.toBe(JSON.stringify(drawIntent(8).intent));
  });

  it('every magnitude drawn lies within what the book covers in its dimension, widened by the bar and no more', () => {
    const spans = knownSpans(), bar = 2;
    for (let s = 1; s <= 60; s++) {
      const { intent } = drawIntent(s, bar, spans);
      const leaves = [intent.duration, ...intent.regions.flatMap((r) => Object.values(r.quantities)), ...intent.wants.flatMap((w) => [w.lo, w.hi].filter((x) => !!x))];
      for (const l of leaves) {
        if (!l!.value) continue;
        // a size is drawn over what the scale tuner reaches, not over what the book's examples cover
        if (l!.name.startsWith('size of ')) {
          const { least, most } = reach();
          expect(Math.log10(l!.value)).toBeGreaterThanOrEqual(Math.log10(least) - bar);
          expect(Math.log10(l!.value)).toBeLessThanOrEqual(Math.log10(most) + bar);
          continue;
        }
        const p = parseUnit(l!.unit), sp = spans.get(dimText(p.dim))!;
        const v = Math.abs(l!.value * p.scale);
        // a growth target is its start times up to a million; a band's ends sit within a tenth of the drawn value
        expect(Math.log10(v)).toBeGreaterThanOrEqual(Math.log10(sp.lo) - bar - 0.05);
        expect(Math.log10(v)).toBeLessThanOrEqual(Math.log10(sp.hi) + bar + 6.05);
      }
    }
  });
});

describe('what a round must reproduce', () => {
  const round = runRound(1, 120, 2);

  it('nothing drawn makes the generator fail to represent it', () => {
    expect(round.crashes).toEqual([]);
  });

  it('a matter that grows without being brought is made in proportion to itself: it doubles at least every T / log2(Q / Q0)', () => {
    let checked = 0;
    for (const d of round.draws) for (const f of d.drawn.forms.filter((x) => x.form === 'grow')) {
      // two wants on one matter in one region share the store and the making; their values are the first want's
      const make = d.structure!.elements.find((e) => e.why.want === f.want && e.id.endsWith(':itself'));
      const store = d.structure!.elements.find((e) => e.why.want === f.want && e.kind === 'store');
      if (!make || !store) continue;
      const Q = store.values.find((v) => v.name === 'content held by the end')!.value, Q0 = store.values.find((v) => v.name === 'content it starts with')!.value;
      const tau = make.values.find((v) => v.name === 'longest doubling time')!.value;
      expect(tau).toBeCloseTo(d.drawn.intent.duration.value! / Math.log2(Q / Q0), 6);
      // and what it is made of is the gap, located at the making
      expect(d.structure!.gaps.some((g) => g.element === make.id && /what .* is made of is not stated/.test(g.lacks))).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('a content brought in by the end comes at least at what is added over how long, and a reservoir that gives less refuses it', () => {
    let brought = 0, refused = 0;
    for (const d of round.draws) for (const f of d.drawn.forms.filter((x) => x.form === 'reach')) {
      const store = d.structure!.elements.find((e) => e.why.want === f.want && e.kind === 'store');
      const path = d.structure!.elements.find((e) => e.why.want === f.want && e.kind === 'path' && e.why.parent === store?.id);
      if (!store || !path) continue;
      const Q = store.values.find((v) => v.name === 'content held by the end')!.value;
      const needs = path.values.find((v) => v.name.startsWith('least mean flux'))!.value;
      expect(needs).toBeCloseTo(Q / d.drawn.intent.duration.value!, 9);
      brought++;
      // the same intent, with what its reservoir gives set below what the path needs: the reservoir refuses it. Whether
      // a draw happens to hold such a reservoir is the draw's; that one refuses it is the law's
      const reservoir = d.drawn.intent.regions.find((r) => r.environment && r.carriers?.F === f.carrier && (r.limits ?? []).includes('F'));
      if (!reservoir || refused >= 5) continue;
      const scarce = structuredClone(d.drawn.intent);
      const r = scarce.regions.find((x) => x.id === reservoir.id)!;
      r.quantities.F = { ...r.quantities.F!, value: (needs / 10) / scaleOf(r.quantities.F!.unit) };
      expect(generate(scarce).gaps.some((g) => g.want === f.want && /gives at most/.test(g.lacks))).toBe(true);
      refused++;
    }
    expect(brought).toBeGreaterThan(10);
    expect(refused).toBeGreaterThan(0);
  });
});
