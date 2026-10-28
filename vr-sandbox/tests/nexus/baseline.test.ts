// The baseline (docs/REALITY.md, step 0): what Nexus gives today, recorded so every later step can show each thing it
// changed and why. Every starter board run headless, each node's outputs digested (numbers to ten figures, a thing by
// its mass and its pieces, anything else by a hash of its content); every law node's worked example; every seed's mass.
// A difference fails the test and is listed (all of them in a file with BASELINE_DIFFS=path); when every difference is
// explained, write it again:
//   UPDATE_BASELINE=1 npx vitest run tests/nexus/baseline.test.ts

import { describe, expect, it } from 'vitest';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import '../../src/nexus/seeds';
import { Engine, runBlock } from '../../src/nexus/dataflow';
import { LIBRARY, defaultsOf, type BlockDef } from '../../src/nexus/blocks';
import { starterBoards } from '../../src/nexus/starters';
import { isAssembly, massOfAll, placedCount } from '../../src/nexus/assembly';
import { fnv64 } from '../../src/nexus/identity';
import type { Part } from '../../src/nexus/kits';

const FILE = join(__dirname, 'baseline.json'), update = !!process.env['UPDATE_BASELINE'];
type Rec = Record<string, string>;

/** How long a run took on this machine is not a result: timings are left out of what is compared (an output named for
 *  one, a field named for one, a duration or a clock rate written in text). */
const TIMING_OUT = /^(hz|modelHz|ms|took|elapsed)$/i, TIMING_KEY = /^(ms|took|elapsed|hz|modelHz)$/i;
const untimed = (t: string) => t.replace(/\d[\d.,]*\s*(cycles|instructions|steps) a second/g, '#').replace(/\d[\d.,]*\s*% of the real chip/g, '#').replace(/\d[\d.,]*\s*(ms|µs|kHz|MHz|GHz)\b/g, '#').replace(/\d[\d.,]*\s*Hz\b(?= (on|switch|at switch))/g, '#');
/** A value as a short, stable digest: a number to ten figures; a part or an assembly by its mass and its pieces; the
 *  rest by a hash of its content (numbers in it to ten figures, functions and cycles left out). */
function digest(v: unknown): string {
  if (typeof v === 'number') return Number.isFinite(v) ? String(Number(v.toPrecision(10))) : String(v);
  if (typeof v === 'string') { const t = untimed(v); return t.length <= 160 ? JSON.stringify(t) : `text:${fnv64(t)}:${t.length}`; }
  if (typeof v === 'boolean' || v === null || v === undefined) return String(v);
  if (typeof v === 'object' && (isAssembly(v) || ('name' in (v as object) && ('shape' in (v as object) || 'parts' in (v as object))))) {
    try { const th = v as Part; return `thing ${Number(massOfAll(th).toPrecision(8))} kg, ${placedCount(th)} pieces`; } catch { /* fall through */ }
  }
  const seen = new WeakSet<object>();
  let s = '';
  try { s = JSON.stringify(v, (k, x) => { if (typeof x === 'function' || TIMING_KEY.test(k)) return undefined; if (typeof x === 'string') return untimed(x); if (typeof x === 'number') return Number.isFinite(x) ? Number(x.toPrecision(10)) : String(x); if (x && typeof x === 'object') { if (seen.has(x)) return '[again]'; seen.add(x); } return x; }) ?? ''; } catch { s = String(v); }
  return `${Array.isArray(v) ? `list ${v.length}` : 'object'}:${fnv64(s)}`;
}

async function boardRecords(title: string, make: () => import('../../src/nexus/boards').Board): Promise<Rec> {
  const b = make(), e = new Engine(b); await e.run();
  const out: Rec = {}, seen = new Map<string, number>();
  for (const [id, n] of Object.entries(b.nodes)) {
    if (n.deleted) continue;
    const base = `${n.block ?? n.inner ? n.block ?? 'group' : 'note'}:${n.label}`, k = (seen.get(base) ?? 0) + 1; seen.set(base, k);
    const key = k > 1 ? `${base} #${k}` : base, st = e.state.get(id);
    if (!st) { out[key] = 'not run'; continue; }
    if (st.status !== 'ok') { out[key] = `${st.status}: ${(st.error ?? '').slice(0, 160)}`; continue; }
    for (const [o, v] of Object.entries(st.out ?? {})) if (!TIMING_OUT.test(o)) out[`${key} → ${o}`] = digest(v);
  }
  void title; return out;
}

function compare(name: string, now: Rec, was: Rec | undefined): string[] {
  if (!was) return [`${name}: not in the baseline`];
  const diffs: string[] = [];
  for (const k of new Set([...Object.keys(now), ...Object.keys(was)])) if (now[k] !== was[k]) diffs.push(`${name} | ${k}: ${was[k] ?? '(absent)'} → ${now[k] ?? '(absent)'}`);
  return diffs;
}

const stored: Record<string, Rec> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
const fresh: Record<string, Rec> = {};
const finish = (name: string, rec: Rec) => {
  fresh[name] = rec;
  if (update) { stored[name] = rec; writeFileSync(FILE, JSON.stringify(stored, Object.keys(stored).sort().reduce<string[]>((a, k) => a.concat(k, Object.keys(stored[k]!)), []), 1)); return; }
  const diffs = compare(name, rec, stored[name]);
  // every difference, to read in full: BASELINE_DIFFS=path
  if (process.env['BASELINE_DIFFS'] && diffs.length) appendFileSync(process.env['BASELINE_DIFFS'], diffs.join('\n') + '\n');
  expect(diffs, `${diffs.length} differences from the baseline (explain each, then UPDATE_BASELINE=1):\n${diffs.slice(0, 40).join('\n')}`).toEqual([]);
};

describe('the baseline: what Nexus gives today', () => {
  for (const [title, make] of starterBoards()) {
    const name = `board: ${title.split(':')[0]}${title.includes(':') ? `: ${title.split(':')[1]!.trim().slice(0, 40)}` : ''}`;
    it(name, async () => finish(name, await boardRecords(title, make)), 600_000);
  }
  it('law nodes: each one\'s worked example', async () => {
    const rec: Rec = {};
    for (const d of [...LIBRARY.values()].filter((x: BlockDef) => x.kind === 'law').sort((a, b) => a.id.localeCompare(b.id))) {
      const t = d.tests?.[0]; if (!t) { rec[d.id] = 'no example'; continue; }
      try { const out = await runBlock(d.id, { ...(t.set ?? {}), ...t.inputs }); for (const [o, v] of Object.entries(out)) rec[`${d.id} → ${o}`] = digest(v); } catch (e) { rec[d.id] = `failed: ${(e as Error).message.slice(0, 120)}`; }
    }
    finish('laws', rec);
  }, 600_000);
  it('seeds: what each makes, as it is set by default', async () => {
    const rec: Rec = {};
    for (const d of [...LIBRARY.values()].filter((x) => x.id.startsWith('seed.')).sort((a, b) => a.id.localeCompare(b.id))) {
      try { const out = await runBlock(d.id, defaultsOf(d)); for (const [o, v] of Object.entries(out)) rec[`${d.id} → ${o}`] = digest(v); } catch (e) { rec[d.id] = `failed: ${(e as Error).message.slice(0, 120)}`; }
    }
    finish('seeds', rec);
  }, 600_000);
  it('real models: each vehicle as its maker\'s figures make it', async () => {
    const d = LIBRARY.get('vehicle.model')!, s = d.settings!.find((x) => x.key === 'model')!, rec: Rec = {};
    for (const m of s.choices ?? []) { try { const out = await runBlock('vehicle.model', { model: m }); for (const [o, v] of Object.entries(out)) rec[`${m} → ${o}`] = digest(v); } catch (e) { rec[String(m)] = `failed: ${(e as Error).message.slice(0, 120)}`; } }
    finish('real models', rec);
  }, 600_000);
});
