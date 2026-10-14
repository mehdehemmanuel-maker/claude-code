#!/usr/bin/env node
// `node tools/bundle.mjs` — builds the door bundle, and only when something it is built from changed.
//
// Every door runs `vite build && node dist-nexus/<door>.mjs`. The build is a second of a three-second command
// (`node tools/cost.mjs` measures it: 36% of a second run), so every round pays it on every door, usually to
// produce a bundle byte-identical to the one already there.
//
// Run 7x declined to cache it, on the grounds that a cache would add "a staleness bug to every tool". That was the
// right fear of the wrong cache. A cache is stale only when its key is a PROXY for the inputs — a timestamp, a
// marker file, a list of directories someone remembered to update. This one's key is the inputs: the SHA-256 of
// every file the bundle can be built from, which is enumerable here because nothing under `src/` imports outside it
// (checked by a tidy rule, so it stays true). Change any byte of any of them, or of the config, the lockfile or this
// file, and the key differs and vite runs. There is no window in which the key matches and the output is wrong.
//
//   node tools/bundle.mjs            build if needed   (every `npm run <door>` goes through this)
//   node tools/bundle.mjs --force    build regardless
//   node tools/bundle.mjs --why      say what it would do, and what changed, without building
//
// Not to be confused with `tools/doors.mjs`, which is the MAP of the doors (what each one opens). This one only
// builds them. The first draft of this tool was written straight over that one, because I did not check whether the
// name was taken — the fault CLAUDE.md's "check that it does not already exist" exists to stop (ROUNDS 7y).
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const argv = process.argv.slice(2), force = argv.includes('--force'), why = argv.includes('--why');
const STAMP = `${ROOT}/dist-nexus/.inputs.json`;
const BUILD = 'npx vite build --config vite.nexus.config.ts --logLevel error';

// EVERY FILE THE BUNDLE CAN BE BUILT FROM. src/ is the whole module graph (no import under src/ leaves it), and
// beside it the things that change what vite emits from the same sources: its config, the lockfile (a dependency's
// own code), the tsconfig, and this file. A file that belongs here and is missing is the one way this could go
// stale, so the src/ side is a directory walk and not a list of names anyone has to maintain.
const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const inputs = () => {
  const files = walk(`${ROOT}/src`).sort();
  for (const n of ['vite.nexus.config.ts', 'package.json', 'package-lock.json', 'tsconfig.json', 'tools/bundle.mjs']) {
    if (existsSync(`${ROOT}/${n}`)) files.push(`${ROOT}/${n}`);
  }
  const h = createHash('sha256');
  for (const f of files) { h.update(f.slice(ROOT.length)); h.update(readFileSync(f)); }
  return { key: h.digest('hex'), count: files.length };
};

const { key, count } = inputs();
let had = null;
try { had = JSON.parse(readFileSync(STAMP, 'utf8')); } catch { had = null; }
// THE OUTPUTS MUST ALL BE THERE, BY NAME. The first version of this counted them and asked for more than zero,
// which is a floor, and a floor cannot catch a number wrong in the admissible direction: deleting `moves.mjs` left
// fifteen bundles, the count passed, and the tool reported "up to date" with the door's own bundle missing — the
// check could not fail in the one case it exists for (ROUNDS 7q, #37; the same shape as `joints >= 23`). So the
// stamp records the names it emitted and every one of them must still be on disk.
const present = existsSync(`${ROOT}/dist-nexus`) ? readdirSync(`${ROOT}/dist-nexus`).filter((n) => n.endsWith('.mjs')) : [];
const missing = (had?.bundles ?? []).filter((n) => !present.includes(n));
const hit = !force && had?.key === key && (had.bundles?.length ?? 0) > 0 && missing.length === 0;

if (why) {
  console.log(`bundle: ${count} input files, key ${key.slice(0, 12)}`);
  console.log(had ? `        built from ${had.key.slice(0, 12)} (${had.count} files) at ${had.at}` : '        no stamp: never built here');
  console.log(`        ${present.length} bundles on disk${missing.length ? `, ${missing.length} of the stamped ones gone: ${missing.join(', ')}` : ''}`);
  console.log(hit ? 'bundle: up to date — would not build' : `bundle: would build — ${!had ? 'nothing built yet' : had.key !== key ? 'an input changed' : missing.length ? `${missing.join(', ')} is missing from the bundle` : 'the stamp names no bundles'}`);
  process.exit(0);
}
if (hit) process.exit(0);
execSync(BUILD, { cwd: ROOT, stdio: 'inherit' });
const built = readdirSync(`${ROOT}/dist-nexus`).filter((n) => n.endsWith('.mjs')).sort();
writeFileSync(STAMP, JSON.stringify({ key, count, bundles: built, at: new Date().toISOString() }, null, 2));
