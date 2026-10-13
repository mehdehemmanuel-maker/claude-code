// `npm run part` — what the library makes of one part's words, printed.
//
//   npm run part -- "pulley GT2 60 8"       what it resolves to, drawn or refused, with its figures
//   npm run part -- "wormset m2 50:1 bronze"
//   npm run part -- "a thing nobody makes"  the refusal, in the family's own words
//   npm run part -- --like "worm"           the catalogue lines nearest those words
//
// This exists because there was no door at all. Every other question has one — `machine`, `plan`, `works`, `invent`,
// `breakdown`, `pack` — and the commonest question of all, "what does this library make of these words, and can I
// believe it", could only be answered by bundling `src/` with esbuild and calling `catalogue()` by hand in a scratch
// directory. The critic did exactly that to check whether a worm reducer exists, and three of the four hardest numbers
// in his run came out of a probe nobody could repeat (docs/MANNY.md SIGHT #48). `tools/manny-see.mjs --part` named
// this gap in its own output and could only show the picture.
//
// It prints what a claim about a part can be checked against: the id and the kind, the mass BOTH as the inventory
// declares it and as the drawing actually weighs (the two disagreeing is the finding), the box, what it is made of
// with each child's mass, what its drawing is missing against its own inventory list (`missingIn`), and the cheapest
// real offer with the page and the day it was read. Where it is refused, the refusal is the answer and is printed
// whole rather than summarised.

import { callFamily } from '../parts/families';
import { catalogueItem, searchCatalogue } from '../parts/catalogue';
import { component, componentOf, missingIn } from '../parts/components';
import { itemOf } from '../parts/inventory';
import { massOf } from '../parts/mass';
import { cheapest, priceKeyOf, usd } from '../parts/prices';

const args = process.argv.slice(2);
const like = args.includes('--like');
const words = args.filter((a) => !a.startsWith('--')).join(' ').trim();

if (!words) {
  console.log(`what the library makes of one part's words

  npm run part -- "pulley GT2 60 8"
  npm run part -- "wormset m2 50:1 bronze"
  npm run part -- --like "worm"        the catalogue lines nearest those words`);
  process.exit(1);
}

if (like) {
  const hits = searchCatalogue(words, 40);
  console.log(`${hits.length} catalogue lines near "${words}":`);
  for (const h of hits) { const it = catalogueItem(h); console.log(`  ${h.padEnd(34)} ${it ? `${it.name}${it.g ? `, ${it.g} g` : ''}` : '(reads back as nothing)'}`); }
  process.exit(0);
}

const r = callFamily(words);
console.log(`ASKED: ${words}\n`);
if (r === null) { console.log(`No family makes this. Nothing here is called "${words.split(/\s+/)[0]}".\n\nTry: npm run part -- --like "${words}"`); process.exit(0); }
if (typeof r === 'string') { console.log(`REFUSED, and the refusal is the answer:\n  ${r}`); process.exit(0); }

const item = itemOf(r.id) ?? r;
console.log(`IT IS: ${r.name}`);
console.log(`  id        ${r.id}`);
console.log(`  kind      ${r.kind}, made by ${r.make}${r.sized ? `, sized by the ${r.sized.family} family` : ''}`);
console.log(`  where     ${r.path.join(' / ')}`);
if (r.sized) console.log(`  sizes     ${Object.entries(r.sized.params).map(([k, v]) => `${k} ${v}`).join(', ')}`);
if (r.size) console.log(`  box       ${r.size.map((x) => +x.toFixed(2)).join(' × ')} mm`);
console.log(`  says      ${r.says}`);
if (r.spec) console.log(`  spec      ${r.spec}`);

// the two masses. They are worked out two different ways — one declared on the item, one summed from the solids the
// drawing actually makes — and a claim about a part is only as good as their agreeing.
const drawn = (() => { const c = componentOf(r.id) ?? (typeof component(words) === 'object' ? (component(words) as { part: Parameters<typeof massOf>[0] }) : null); return c ? +(massOf(c.part) * 1000).toFixed(1) : null; })();
console.log(`\nWHAT IT WEIGHS`);
console.log(`  declared  ${r.g ? `${r.g} g` : 'nothing says'}`);
console.log(`  drawn     ${drawn === null ? 'it is not drawn by the library' : `${drawn} g${r.g ? ` (${((drawn / r.g - 1) * 100).toFixed(1)} % against the declared figure)` : ''}`}`);

if (r.of?.length) {
  console.log(`\nWHAT IT IS MADE OF`);
  for (const c of r.of) { const ci = itemOf(c.id); console.log(`  ${String(c.n).padStart(3)} × ${c.id.padEnd(26)} ${ci ? `${ci.name}${ci.g ? `, ${ci.g} g each` : ''}` : '(not in the inventory)'}`); }
}

const comp = component(words);
if (typeof comp === 'string') console.log(`\nNOT DRAWN: ${comp}`);
else {
  const miss = missingIn(comp.part, item);
  console.log(`\nWHAT ITS DRAWING IS MISSING against its own inventory list: ${miss.length ? '' : 'nothing'}`);
  for (const m of miss) console.log(`  - ${m}`);
}

const key = priceKeyOf(r.id);
const offer = key ? cheapest(key) : null;
console.log(`\nWHAT IT COSTS`);
if (!offer) console.log(`  no price here. ${key ? 'its key is priced at no quantity' : 'no seller\'s page in prices.ts names it'} — said, not guessed`);
else console.log(`  ${usd(offer.usd)}  ${offer.offer.name}\n  ${offer.offer.seller}, read ${offer.offer.seen}\n  ${offer.offer.url}${offer.offer.note ? `\n  (${offer.offer.note})` : ''}`);
