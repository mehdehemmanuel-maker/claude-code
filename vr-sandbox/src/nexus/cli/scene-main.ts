// The scene, written for the viewer: everything generated from nothing, now.
//
//   npm run nexus:scene   writes view/public/world.json

import { mkdirSync, writeFileSync } from 'node:fs';
import { buildWorld } from '../substrate/scene';
import type { Jolt } from '../substrate/realize';

const out = process.argv[2] ?? 'view/public/world.json';
const J = (await import('jolt-physics/wasm-compat').then((m) => m.default())) as Jolt;
const t0 = performance.now();
const world = await buildWorld(J);
mkdirSync(out.replace(/\/[^/]*$/, ''), { recursive: true });
writeFileSync(out, JSON.stringify(world));
process.stdout.write(`wrote ${out}: ${world.ladder.levels.length} levels, ${world.ladder.boundaries.length} boundaries, ${world.descents.length} descents, ${world.bodies.length} branches of cold bodies, ${world.places.length} places, an intent of ${world.intent.nodes.length} nodes (${((performance.now() - t0) / 1000).toFixed(1)} s)\n`);
