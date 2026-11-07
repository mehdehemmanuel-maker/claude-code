// Where a place is still written by hand (decision 0021): nothing checks for overlap, so what is not yet placed by the
// operations that cannot write one is counted instead, builder by builder. A place written by hand is a property `at`
// or `rot` in an object literal handed to a room operation or written as a Part (root 8: a data row keyed `at` is not
// one), read from the syntax tree of each file under src/nexus (oxc's parser, as the bundler rolldown carries it; the
// views' own panels and cameras, src/nexus/view, are not builds and are not counted, nor
// src/nexus/room.ts, the operations themselves, where every place is what an operation gives). Each count
// may only fall: a builder moved onto the operations counts 0 (scripts/by-hand.json holds the counts it may not rise
// above).
//
//   node scripts/by-hand.mjs           each builder still placing by hand, with its count, most first
//   node scripts/by-hand.mjs --write   the counts written to scripts/by-hand.json (only when they fell)

import { parseSync } from 'rolldown/utils';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const LIMITS = join(root, 'scripts/by-hand.json');

const files = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? (f === 'view' ? [] : files(p)) : /\.ts$/.test(f) && !(f === 'room.ts' && dir.endsWith('nexus')) ? [p] : []; });

/** Each file under src/nexus with a place written by hand, and how many. */
export function byHand() {
  const out = {};
  for (const p of files(join(root, 'src/nexus'))) {
    const { program, errors } = parseSync(p, readFileSync(p, 'utf8'), { lang: 'ts' }); let n = 0;
    if (errors.length) throw new Error(`${relative(root, p)}: ${errors[0].message}`);
    // (root 8, decision 0029: a place is an `at` or `rot` on an object handed to a room operation (any name imported from
    // room.ts, inside its call's arguments) or on a Part (an object named or copied from one, `name` or a spread, or with a
    // Part's own keys, `shape`, `parts`, `item` or `cuts`; one in a `parts` list; one written `as Part`, `satisfies Part`
    // or into a `Part`); a data row keyed `at` in a table (a stop `{ at: 50, axis }`) is not a place)
    const roomNames = new Set(program.body.filter((s) => s.type === 'ImportDeclaration' && /(^|\/)room$/.test(s.source.value)).flatMap((s) => s.specifiers.map((x) => x.local.name)));
    const keyOf = (q) => (q.type === 'Property' && !q.computed && q.key?.type === 'Identifier' ? q.key.name : undefined);
    const typed = (t) => t?.type === 'TSTypeReference' && t.typeName?.type === 'Identifier' && t.typeName.name === 'Part';
    const partLike = (o, up) => { if (o.properties.some((q) => q.type === 'SpreadElement' || ['name', 'shape', 'parts', 'item', 'cuts'].includes(keyOf(q)))) return true;
      const [a, b] = up; if (a?.type === 'ArrayExpression' && keyOf(b ?? {}) === 'parts') return true;
      if ((a?.type === 'TSAsExpression' || a?.type === 'TSSatisfiesExpression') && typed(a.typeAnnotation)) return true;
      return a?.type === 'VariableDeclarator' && typed(a.id?.typeAnnotation?.typeAnnotation); };
    const inRoomCall = (o, up) => { let c = o; for (const a of up) { if (a.type === 'CallExpression' && a.arguments.includes(c) && a.callee?.type === 'Identifier' && roomNames.has(a.callee.name)) return true; c = a; } return false; };
    const walk = (node, up) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { for (const x of node) walk(x, up); return; }
      if (node.type === 'ObjectExpression') { const k = node.properties.filter((q) => keyOf(q) === 'at' || keyOf(q) === 'rot').length; if (k && (partLike(node, up) || inRoomCall(node, up))) n += k; }
      const next = [node, ...up];
      for (const k in node) if (k !== 'parent' && node[k] && typeof node[k] === 'object') walk(node[k], next);
    };
    walk(program, []);
    if (n) out[relative(root, p)] = n;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const now = byHand(), was = JSON.parse(readFileSync(LIMITS, 'utf8')), total = Object.values(now).reduce((a, b) => a + b, 0);
  for (const [f, n] of Object.entries(now)) console.log(`${String(n).padStart(5)}  ${f}  (not yet moved)${was[f] !== undefined && n < was[f] ? `, down from ${was[f]}` : ''}`);
  console.log(`${total} places written by hand in ${Object.keys(now).length} files`);
  if (process.argv.includes('--write')) {
    const rose = Object.entries(now).filter(([f, n]) => n > (was[f] ?? 0));
    if (rose.length) { console.error(`not written: ${rose.map(([f, n]) => `${f} ${was[f] ?? 0} → ${n}`).join(', ')} rose`); process.exit(1); }
    writeFileSync(LIMITS, JSON.stringify(now, null, 1) + '\n'); console.log(`written to ${relative(root, LIMITS)}`);
  }
}
