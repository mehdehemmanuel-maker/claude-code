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

import { FAMILIES, callFamily } from '../parts/families';
import { catalogueItem, searchCatalogue } from '../parts/catalogue';
import { component, componentOf, missingIn } from '../parts/components';
import { INVENTORY, itemOf } from '../parts/inventory';
import { massOf, massWhy, whySaid } from '../parts/mass';
import { cheapest, priceKeyOf, usd } from '../parts/prices';

const args = process.argv.slice(2);
const like = args.includes('--like');
const audit = args.includes('--audit');
const words = args.filter((a) => !a.startsWith('--')).join(' ').trim();

// ---- --audit: how much of the library the two-mass check can actually check -----------------------------------------
// The two masses above are only a check when they are two numbers. For most of the library there is one (nothing is
// drawn), and for some of the rest the second is the first (a declared `kg` echoed, or a `fill` solved backwards out of
// a published mass). Judging the instrument needed that split counted, not sampled by hand (docs/MANNY.md SIGHT #55).
// The second half is #50's question, free in the same pass: an item whose declared mass is less than the masses of the
// children its own `of` names is contradicting itself, and the worst ratios are where a fabricated law is hiding.
if (audit) {
  const CLASS = {
    undrawn: 'NOT DRAWN — the check is silent here',
    summed: 'summed from its solids — a real check',
    declared: 'drawn, but the drawing declares its mass — the same number twice',
    solved: 'drawn, but its fill was solved back from a published mass — the same number twice, hidden',
    mixed: 'part summed, part declared or solved — only the summed share checks anything',
  };
  const count: Record<string, number> = { undrawn: 0, summed: 0, declared: 0, solved: 0, mixed: 0 };
  const worst: { id: string; share: number; kg: number; why: string }[] = [];
  const lighter: { id: string; g: number; of: number; ratio: number; names: string }[] = [];
  let byWords = 0;

  for (const [id, it] of INVENTORY) {
    // #50's column first, because it needs no drawing: what this item SAYS it is made of, against what it says it weighs
    if (it.of?.length && it.g) {
      let sum = 0; const names: string[] = [];
      for (const c of it.of) { const ci = itemOf(c.id); if (ci?.g) { sum += ci.g * c.n; names.push(`${c.n} × ${c.id} ${ci.g} g`); } }
      if (sum > it.g * 1.01) lighter.push({ id, g: it.g, of: sum, ratio: sum / it.g, names: names.join(', ') });
    }
    // `componentOf` finds what is keyed by item id or designed from a family; a maker file (`headset.ts`,
    // `franka.ts`, `lab.ts`) registers its drawing only when something asks for it BY WORDS, so asking by id alone
    // reported the Quest 3 as undrawn - the very item whose 515 g / 515 g raised #49. Both doors are tried, and how
    // many only the second found is printed, because a sweep that silently misses a class is the fault being audited.
    let c = null; try { c = componentOf(id); } catch { c = null; }
    if (!c) { try { const w = component(it.name); if (typeof w === 'object') { c = w; byWords += 1; } } catch { c = null; } }
    if (!c) { count.undrawn! += 1; continue; }
    let w; try { w = massWhy(c.part); } catch { count.undrawn! += 1; continue; }
    count[w.from]! += 1;
    if (w.from !== 'summed' && w.kg > 0) worst.push({ id, share: w.summed / w.kg, kg: w.kg, why: whySaid(w) });
  }

  // The families, which is the other half of the population and the half the examples in #49 came from: the Quest 3,
  // the centrifuge and the drone are catalogue FAMILIES, not inventory items, so a sweep over `INVENTORY` alone
  // reported none of them. One example line each, the same door `npm run part` takes.
  const fam: Record<string, number> = { undrawn: 0, summed: 0, declared: 0, solved: 0, mixed: 0 };
  const famWorst: { words: string; share: number; g: number }[] = [];
  for (const f of FAMILIES) {
    const words = f.examples[0]; if (!words) continue;
    let c = null; try { const r = component(words); if (typeof r === 'object') c = r; } catch { c = null; }
    if (!c) { fam.undrawn! += 1; continue; }
    let w; try { w = massWhy(c.part); } catch { fam.undrawn! += 1; continue; }
    fam[w.from]! += 1;
    if (w.from !== 'summed' && w.kg > 0) famWorst.push({ words, share: w.summed / w.kg, g: w.kg * 1000 });
  }

  const total = Object.values(count).reduce((a, b) => a + b, 0);
  console.log(`WHAT THE TWO-MASS CHECK CAN CHECK, over all ${total} inventory items`);
  console.log(`(${byWords} of the drawn ones are found only by asking for them by words, not by id)\n`);
  for (const k of ['undrawn', 'summed', 'declared', 'solved', 'mixed'] as const) {
    console.log(`  ${String(count[k]).padStart(5)}  ${((count[k]! / total) * 100).toFixed(1).padStart(5)} %  ${CLASS[k]}`);
  }
  const cannot = count.declared! + count.solved!;
  console.log(`\n  of the ${total - count.undrawn!} items that ARE drawn, ${cannot} (${((cannot / Math.max(1, total - count.undrawn!)) * 100).toFixed(1)} %) report a mass that cannot disagree with the declared one.`);
  console.log(`  "the third and fourth classes together" = ${cannot}.`);

  console.log(`\nTHE DRAWN ITEMS WHOSE FIGURE IS NOT INDEPENDENT, least independent first (${worst.length}):`);
  for (const w of worst.sort((a, b) => a.share - b.share).slice(0, 25)) {
    console.log(`  ${w.id.padEnd(28)} ${(w.share * 100).toFixed(0).padStart(3)} % summed   ${(w.kg * 1000).toFixed(0).padStart(7)} g   ${w.why.slice(0, 96)}`);
  }

  const ftot = Object.values(fam).reduce((a, b) => a + b, 0);
  console.log(`\nTHE SAME, over the ${ftot} catalogue FAMILIES at one example line each (where #49's own examples live):`);
  for (const k of ['undrawn', 'summed', 'declared', 'solved', 'mixed'] as const) {
    console.log(`  ${String(fam[k]).padStart(5)}  ${((fam[k]! / ftot) * 100).toFixed(1).padStart(5)} %  ${CLASS[k]}`);
  }
  const fcannot = fam.declared! + fam.solved! + fam.mixed!;
  console.log(`  of the ${ftot - fam.undrawn!} families drawn, ${fcannot} report a figure that is wholly or partly the declared one coming back.`);
  for (const w of famWorst.sort((a, b) => a.share - b.share).slice(0, 15)) {
    console.log(`    ${w.words.padEnd(30)} ${(w.share * 100).toFixed(0).padStart(3)} % summed   ${w.g.toFixed(0).padStart(7)} g`);
  }

  console.log(`\n#50: ITEMS LIGHTER THAN THE PARTS THEY SAY THEY CONTAIN, worst ratio first (${lighter.length}):`);
  for (const l of lighter.sort((a, b) => b.ratio - a.ratio).slice(0, 25)) {
    console.log(`  ${l.id.padEnd(28)} declares ${String(Math.round(l.g)).padStart(7)} g, its own list sums to ${String(Math.round(l.of)).padStart(7)} g  (× ${l.ratio.toFixed(2)})`);
    console.log(`      ${l.names.slice(0, 150)}`);
  }
  if (!lighter.length) console.log('  none');
  process.exit(0);
}

if (!words) {
  console.log(`what the library makes of one part's words

  npm run part -- "pulley GT2 60 8"
  npm run part -- "wormset m2 50:1 bronze"
  npm run part -- --like "worm"        the catalogue lines nearest those words
  npm run part -- --audit              how much of the library the two masses can actually check`);
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
const made = componentOf(r.id) ?? (typeof component(words) === 'object' ? (component(words) as { part: Parameters<typeof massOf>[0] }) : null);
const why = made ? massWhy(made.part) : null;
const drawn = why ? +(why.kg * 1000).toFixed(1) : null;
// The percentage is only a check when the two numbers are two numbers. Where the drawing declares its mass, or its
// fill was solved back from the published one, the sum must reproduce the figure above and `0.0 %` reads as the
// strongest possible pass while meaning nothing. It is withheld there, the way `composeMachine` withholds kg for a
// part it has not drawn (docs/MANNY.md #49, #20).
// `mixed` is not a check: the Quest 3 is 63 % summed and 37 % solved back from Meta's own 515 g, so its "0.0 %"
// is mostly the published figure meeting itself. Only a wholly summed mass can disagree, so only it prints a number.
const canFail = why !== null && why.from === 'summed';
console.log(`\nWHAT IT WEIGHS`);
console.log(`  declared  ${r.g ? `${r.g} g` : 'nothing says'}`);
console.log(`  drawn     ${drawn === null ? 'it is not drawn by the library' : `${drawn} g${r.g && canFail ? ` (${((drawn / r.g - 1) * 100).toFixed(1)} % against the declared figure)` : ''}`}`);
if (why) console.log(`  which is  ${whySaid(why)}`);
if (why && r.g && !canFail) console.log(`  NO PERCENTAGE IS PRINTED: these are not two figures to compare, so any agreement between them is arithmetic, not evidence.`);

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
