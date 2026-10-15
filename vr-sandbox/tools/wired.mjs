#!/usr/bin/env node
// `node tools/wired.mjs` — WHAT IS ACTUALLY CONNECTED TO WHAT.
//
// The question "are all the systems merged together?" was answered by opinion three times before this existed,
// and opinion is exactly what drifts: a file can know everything about its own half of a machine and be an
// island, and nothing about reading it says so. This reads every import under src/ and answers it as a fact.
//
//   node tools/wired.mjs                 every module, with how many things reach it and how many it reaches
//   node tools/wired.mjs islands         the modules nothing reaches, which is where the drift collects
//   node tools/wired.mjs <name>          one module: who reaches it, what it reaches, and what it cannot see
//   node tools/wired.mjs path <a> <b>    whether a chain of imports joins two modules at all, and the chain
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..'), SRC = join(ROOT, 'src');
const walk = (d) => readdirSync(d).flatMap((n) => {
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) && !/\.d\.ts$/.test(p) ? [p] : [];
});
const files = walk(SRC);
const key = (p) => relative(SRC, p).replace(/\.tsx?$/, '');

/** Every import one file makes that lands on another file under src/. A bare package is not an edge here: the
 *  question is how the tree's own parts reach each other, and `three` reaching everything says nothing. */
const out = new Map(), into = new Map();
for (const f of files) { out.set(key(f), new Set()); into.set(key(f), new Set()); }
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"]+)['"]/g)) {
    const raw = resolve(dirname(f), m[1]);
    const hit = [raw, `${raw}.ts`, `${raw}.tsx`, join(raw, 'index.ts')].find((c) => files.includes(c));
    if (!hit || hit === f) continue;
    out.get(key(f)).add(key(hit));
    into.get(key(hit)).add(key(f));
  }
}

const [cmd, a, b] = process.argv.slice(2);
const reach = (from, dir) => { // everything a module can see, transitively
  const seen = new Set(), q = [from];
  while (q.length) for (const n of dir.get(q.shift()) ?? []) if (!seen.has(n)) { seen.add(n); q.push(n); }
  return seen;
};
const find = (name) => {
  const hits = [...out.keys()].filter((k) => k === name || k.endsWith(`/${name}`) || k.includes(name));
  if (!hits.length) { console.log(`nothing under src/ is called "${name}"`); process.exit(1); }
  return hits.sort((x, y) => x.length - y.length)[0];
};

if (cmd === 'islands') {
  // A module nothing imports is reachable only by its own door, so nothing it learns reaches anything else.
  const lonely = [...into].filter(([k, v]) => v.size === 0 && !/^nexus\/cli\//.test(k) && !/main$/.test(k));
  console.log(`${lonely.length} of ${files.length} modules are reached by nothing else under src/:\n`);
  for (const [k] of lonely.sort()) console.log(`  ${k}  (reaches ${out.get(k).size})`);
  console.log(`\nA CLI door and a *-main are meant to be leaves and are left out. Anything else here is a thing`);
  console.log(`the rest of the tree cannot use, however good it is on its own.`);
} else if (cmd === 'path') {
  const [x, y] = [find(a), find(b)];
  const prev = new Map([[x, null]]), q = [x];
  while (q.length) { const c = q.shift(); if (c === y) break; for (const n of out.get(c) ?? []) if (!prev.has(n)) { prev.set(n, c); q.push(n); } }
  if (!prev.has(y)) {
    console.log(`${x} cannot see ${y}: no chain of imports gets there.`);
    const back = new Map([[y, null]]), q2 = [y];
    while (q2.length) { const c = q2.shift(); for (const n of out.get(c) ?? []) if (!back.has(n)) { back.set(n, c); q2.push(n); } }
    console.log(back.has(x) ? `It goes the OTHER way: ${y} reaches ${x}.` : `Neither reaches the other. They are two islands, and something has to join them.`);
  } else {
    const chain = []; for (let c = y; c; c = prev.get(c)) chain.unshift(c);
    console.log(`${x} reaches ${y} in ${chain.length - 1}:\n  ${chain.join('\n    → ')}`);
  }
} else if (cmd) {
  const k = find(cmd), sees = reach(k, out), seen = reach(k, into);
  console.log(`${k}\n`);
  console.log(`  imports directly (${out.get(k).size}): ${[...out.get(k)].sort().join(', ') || '— nothing in the tree'}`);
  console.log(`  imported by     (${into.get(k).size}): ${[...into.get(k)].sort().join(', ') || '— NOTHING: this is an island'}`);
  console.log(`\n  can reach ${sees.size} of ${files.length} modules; ${seen.size} can reach it.`);
  const blind = files.map(key).filter((x) => x !== k && !sees.has(x) && !seen.has(x) && !/main$/.test(x));
  console.log(`  ${blind.length} modules it neither reaches nor is reached by — the part of the tree it cannot be part of.`);
} else {
  const rows = [...out.keys()].map((k) => ({ k, out: out.get(k).size, in: into.get(k).size })).sort((x, y) => y.in - x.in || y.out - x.out);
  console.log(`${files.length} modules under src/.  "in" is how many import it; "out" is how many it imports.\n`);
  console.log(`  in  out  module`);
  for (const r of rows) console.log(`  ${String(r.in).padStart(3)}  ${String(r.out).padStart(3)}  ${r.k}`);
  const islands = rows.filter((r) => r.in === 0 && !/^nexus\/cli\//.test(r.k) && !/main$/.test(r.k)).length;
  console.log(`\n${islands} are reached by nothing (node tools/wired.mjs islands).`);
}
