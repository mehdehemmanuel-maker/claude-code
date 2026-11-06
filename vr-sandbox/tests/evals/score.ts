// How a build the AI made is scored, with no model (decision 0026, step 4; decision 0027): its board runs with every node
// ok, uses a block of each kind it names (its id, on the board or inside a folded block on it, read down to the bottom:
// a seed's or a saved block's own board, and a group's board folded in place), or a piece of its build by that name, and
// gives one thing (its pieces joined by the faces the operations wrote, one group) of at least so many pieces. Shared by
// the forty builds (builds.eval.ts) and the compound requests built from their parts (compose.eval.ts).
import { Engine } from '../../src/nexus/dataflow';
import { block } from '../../src/nexus/blocks';
import { nodesOf, type Board } from '../../src/nexus/boards';

/** What a request asks for: the kinds of block its board must use (each a pattern on block ids), and its least pieces. */
export interface Want { uses: RegExp[]; pieces: number }
export const W = (pieces: number, ...uses: RegExp[]): Want => ({ uses, pieces });

type RoomLike = { pieces: readonly { name: string }[]; faces: readonly { a: number; b: number }[] };
/** How many groups a block's pieces fall in, joined by the faces the operations wrote. */
const groups = (b: RoomLike) => { const up = b.pieces.map((_, i) => i), find = (i: number): number => (up[i] === i ? i : (up[i] = find(up[i]!)));
  for (const f of b.faces) up[find(f.a)] = find(f.b); return new Set(b.pieces.map((_, i) => find(i))).size; };
/** Every block id a board uses, down to the bottom: a node's block and the board inside it (a seed's, a saved block's, a
 *  group's folded in place), each block's board read once. */
export function usedIn(b: Board | undefined, seen = new Set<string>()): string[] {
  return Object.values(b?.nodes ?? {}).flatMap((n) => { if (n.deleted) return []; const id = n.block ?? '';
    // (a group folded in place has no block id: its own board is read)
    if (!id) return n.inner ? usedIn(n.inner, seen) : [];
    if (seen.has(id)) return [id]; seen.add(id); return [id, ...usedIn(n.inner ?? block(id)?.graph, seen)]; });
}
/** Why a board is not what was asked (null: it is). Its biggest block: the build. */
export function score(board: Board, e: Engine, w: Want): string | null {
  const ns = nodesOf(board); if (!ns.length) return 'the board is empty';
  const bad = ns.filter((n) => e.state.get(n.id)?.status !== 'ok'); if (bad.length) return `${bad.length} nodes not ok: ${bad[0]!.id} ${e.state.get(bad[0]!.id)?.status ?? 'not run'} ${e.state.get(bad[0]!.id)?.error?.slice(0, 90) ?? ''}`;
  const blocks = ns.map((n) => e.state.get(n.id)?.out?.block as RoomLike | undefined).filter((b): b is RoomLike => !!b?.pieces);
  if (!blocks.length) return 'no block made';
  const big = blocks.reduce((a, b) => (b.pieces.length > a.pieces.length ? b : a)), g = groups(big);
  const used = [...usedIn(board), ...big.pieces.map((p) => p.name)], miss = w.uses.filter((u) => !used.some((b) => u.test(b)));
  if (miss.length) return `no ${miss.map(String).join(', ')} on the board (it used ${[...new Set(used)].join(', ').slice(0, 160)})`;
  if (big.pieces.length < w.pieces) return `its build has ${big.pieces.length} pieces, fewer than ${w.pieces}`;
  return g === 1 ? null : `its build falls in ${g} groups, not one thing`;
}
