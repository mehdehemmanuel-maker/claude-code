import { it } from 'vitest';
import '../../src/nexus/seeds';
import { Engine, Memo, digest } from '../../src/nexus/dataflow';
import { starterBoards } from '../../src/nexus/starters';
import { run } from '../../src/nexus/view/code-worker';
const env = { code: async (lang: string, code: string, inputs: Record<string, unknown>) => (await (run as any)({ id: 0, lang, code, facts: {}, input: '', vars: inputs })).value };
const diff = (a: unknown, b: unknown, path = ''): string[] => {
  if (digest(a) === digest(b)) return [];
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) return [...new Set([...Object.keys(a), ...Object.keys(b as object)])].flatMap((k) => diff((a as any)[k], (b as any)[k], `${path}.${k}`));
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.flatMap((x, i) => diff(x, b[i], `${path}[${i}]`)).slice(0, 4);
  return [`${path}: ${digest(a).slice(0, 120)}  VS  ${digest(b).slice(0, 120)}`];
};
it('probe', async () => {
  for (const [t, labels] of [['The 6502 from its transistors', /primes/i], ['The gauntlet as nodes', /Research loop|approved/i]] as const) {
    const mk = starterBoards().find(([x]) => x.startsWith(t))![1];
    const A = new Engine(mk(), env as any, new Memo()); await A.run();
    const B = new Engine(mk(), env as any, new Memo()); await B.run();
    for (const [id, s] of A.state) { const n = A.board.nodes[id]!; if (!labels.test(n.label ?? '')) continue; console.log(t, n.label, n.block, diff(s.out, B.state.get(id)?.out).slice(0, 6)); }
  }
}, 120000);
