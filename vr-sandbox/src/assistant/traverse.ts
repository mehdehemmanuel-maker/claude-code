// Ego answers the alien engineer's questions by walking the substrate: every way, every mechanism, every material, what
// makes a thing and what makes those, its analogues, its lineage, what to build it from. Nothing here is a list kept for
// the question; each answer is the traversal, said in words, with what is still unknown said too.
import type { Intent } from './intent';
import { analogues, constructionPath, decomposeThing, dualRole, implementations, indexOf, leavesOf, lineageOf, materialsForRole, mechanismsFor, population, producers, substrate, substrateCensus, variantsOf, waysToStore, type SubstrateEntity } from '../ganglia';

type Traverse = Extract<Intent, { do: 'traverse' }>;

// a human name where one is given; else the id said as words, without the domain prefix an id carries for uniqueness
const PREFIX = /^(bio|material|process|machine|chem|phys|element|std|failure|role|fn|param|view|circuit|robot|vehicle|earth|energy|tool|block|kind|way|flow|domain|cross|group|scale|observer) /;
const nameOf = (e: SubstrateEntity) => (e.names.find((n) => !PREFIX.test(n) && n !== e.name) ?? e.name).replace(PREFIX, '');
const an = (name: string) => `${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`;
const list = (xs: string[], max = 12) => (xs.length <= max ? xs.join(', ') : `${xs.slice(0, max).join(', ')} and ${xs.length - max} more`);
const sci = (x: number) => x.toExponential(1).replace('e+', 'e');

/** Find the thing a word names: by a human name, by id, by the id with a usual prefix, or by the word in an id. */
function find(word: string): SubstrateEntity | undefined {
  const s = substrate();
  const w = word.trim().toLowerCase().replace(/\s+/g, ' ');
  // an id is identity; a human name is a name over it: the exact id wins over whatever borrowed the word as a name
  const id = w.replace(/\s+/g, '.');
  const direct = s.get(w) ?? s.get(id) ?? s.byWord(w);
  if (direct) return direct;
  for (const cand of [id, w.replace(/\s+/g, '-'), `motor.${w.replace(/^(electric|electrical) motor$/, 'electric')}`, w.replace(/^(an? |the )/, '')]) { const e = s.byWord(cand); if (e) return e; }
  const singular = w.replace(/s$/, '');
  for (const cand of [singular, singular.replace(/\s+/g, '.')]) { const e = s.byWord(cand); if (e) return e; }
  // a role said as a phrase: "electrical conductor" is role.electrical-conductor; a function: "store energy" is store.energy
  for (const prefix of ['role.', 'fn.', 'bio.', 'material.', 'process.', 'machine.', 'vehicle.', 'robot.', 'chem.', 'circuit.']) { const e = s.get(prefix + w.replace(/\s+/g, '-')) ?? s.get(prefix + w.replace(/\s+/g, '.')); if (e) return e; }
  const words = w.split(' ');
  if (words.length === 2) { const e = s.get(`${words[1]}.${words[0]}`) ?? s.get(`${words[0]}.${words[1]}`); if (e) return e; }
  // the last resort: the one entity whose id ends in the word
  const hits = [...s.entities.values()].filter((e) => e.id.endsWith(`.${singular}`) || e.id === singular);
  return hits.length === 1 ? hits[0] : undefined;
}

/** What to say of a thing I do not know: asked outside when a source is connected, else a question for the packs. */
function unknown(name: string): string {
  const p = population();
  if (p?.connected) {
    p.ask(name);
    return `I know no ${name} yet. I have asked ${p.connector!.name} about it; ask me again in a moment and I will say what it answered, with where it came from.`;
  }
  return `I know no ${name}.`;
}

export function answerTraversal(i: Traverse): string {
  const s = substrate();
  if (i.query === 'census') {
    const c = substrateCensus();
    const o = c.outside;
    const outside = o ? (o.connector ? ` Outside, ${o.connector.name} is connected: ${o.connector.lookups} lookups so far, ${o.connector.hits} answered, ${o.connector.misses} unknown to it, ${o.connector.failures} failed; ${o.learnedOutside.records} records gave me ${o.learnedOutside.entities} things and ${o.learnedOutside.relations} arrows, kept between sessions.` : ' No outside source is connected: what I have is what the packs and the rules give.') : '';
    return `My substrate holds ${c.entities} things joined by ${c.relations} arrows across ${Object.keys(c.byDomain).length} domains; ${c.stubs} of them are stubs, questions I have been asked by other things and not answered yet, and ${c.queued} questions are queued${o?.running ? `, worked in the background (${o.totals.processed} answered so far, ${o.totals.slices} slices)` : ''}. The next are ${c.next.slice(0, 3).join('; ')}.${outside}`;
  }
  if (i.query === 'ways-to-store') {
    const w = waysToStore(s, i.of ?? 'energy');
    if (!w.mechanisms.length) return `I know no way to store ${i.of}: that is a question for my queue.`;
    const mech = w.mechanisms.filter((m) => m.id.startsWith('store.'));
    const byDomain = new Map<string, string[]>();
    for (const f of w.implementations) { const d = f.entity.domains[0] ?? 'unplaced'; (byDomain.get(d) ?? byDomain.set(d, []).get(d)!).push(nameOf(f.entity)); }
    return `${mech.length} mechanisms store ${i.of ?? 'energy'}: ${mech.map(nameOf).join(', ')}. Under them, ${w.implementations.length} things do it that I know of: ${[...byDomain].map(([d, xs]) => `in ${d}, ${list(xs, 8)}`).join('; ')}. I know these by walking from the function, not from a list, so a new thing that stores energy joins the answer the moment it is described.`;
  }
  if (i.query === 'implementations') {
    const fnId = i.of ?? '';
    const fn = s.get(fnId) ?? find(fnId);
    if (!fn) return unknown(`function called ${i.of}`);
    const found = implementations(s, fn.id);
    const stocked = found.filter((f) => f.entity.domains.includes('catalogue')), bio = found.filter((f) => f.entity.domains.includes('biology')), rest = found.filter((f) => !stocked.includes(f) && !bio.includes(f));
    return `${found.length} mechanisms ${nameOf(fn)}: ${list(rest.map((f) => `${nameOf(f.entity)} (${f.how})`), 10)}. In biology: ${bio.length ? list(bio.map((f) => nameOf(f.entity))) : 'none described yet'}. In stock here: ${stocked.length ? list(stocked.map((f) => nameOf(f.entity))) : 'none'}.`;
  }
  if (i.query === 'materials-for') {
    const role = find(i.of ?? '');
    if (!role) return unknown(i.of ?? '');
    const rows = materialsForRole(s, role.id);
    if (!rows.length) return `Nothing I know plays ${nameOf(role)} yet.`;
    const numbered = rows.filter((r) => r.conductivity !== undefined && !r.derivedFrom), families = rows.filter((r) => r.derivedFrom), bare = rows.filter((r) => r.conductivity === undefined);
    const line = (r: typeof rows[number]) => `${nameOf(r.entity)} ${r.conductivity !== undefined ? `${sci(r.conductivity)} S/m` : ''}${r.density ? `, ${r.density} kg/m³` : ''}${r.perMass ? `, ${sci(r.perMass)} S·m²/kg` : ''}`;
    return `${rows.length} materials play ${nameOf(role)}. Ranked by conductivity: ${numbered.map(line).join('; ')}. The tradeoff is conductance per kilogram against conductance per volume and cost: ${numbered.length > 1 ? `${nameOf(numbered.reduce((a, b) => ((b.perMass ?? 0) > (a.perMass ?? 0) ? b : a)).entity)} wins per kilogram, ${nameOf(numbered[0]!.entity)} per volume` : ''}. Families stand on their best member: ${list(families.map((r) => `${nameOf(r.entity)} (${r.derivedFrom!.length} members)`))}. Without numbers yet: ${bare.length ? list(bare.map((r) => nameOf(r.entity))) : 'none'}.`;
  }
  if (i.query === 'variants') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const v = variantsOf(s, e.id)!;
    const stds = s.reach(e.id, 'standardized-by'), fails = s.reach(e.id, 'fails-by');
    return `${an(nameOf(e))[0]!.toUpperCase()}${an(nameOf(e)).slice(1)} varies by ${v.parameters.length ? v.parameters.map((p) => `${p.name}${p.values ? ` (${list(p.values, 6)})` : p.low !== undefined && p.high !== undefined ? ` (${p.low} to ${p.high}${p.unit ? ` ${p.unit}` : ''})` : ''}`).join(', ') : 'nothing I have parameters for'}; that is the manifold, and every combination is ${an(nameOf(e))}. Its named refinements: ${v.kinds.length ? list(v.kinds.map(nameOf), 14) : 'none yet'}. Standards: ${stds.length ? list(stds.map(nameOf)) : 'none'}. It fails by ${fails.length ? list(fails.map(nameOf), 8) : 'nothing I know yet'}.`;
  }
  if (i.query === 'components') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const d = decomposeThing(s, e.id, 3)!;
    if (!d.children.length) return `I have not decomposed ${an(nameOf(e))} yet: ${s.get(e.id)!.coverage.unknowns.join('; ') || 'it is a question for my queue'}.`;
    const leaves = leavesOf(d);
    return `${an(nameOf(e)).replace(/^a/, 'A')} has ${d.children.map((c) => `${nameOf(c.entity)}${c.children.length ? ` (${list(c.children.map((x) => nameOf(x.entity)), 5)})` : ''}`).join('; ')}. Down to the leaves it is ${leaves.length} things, ending in ${list([...new Set(leaves.map(nameOf))], 10)}.`;
  }
  if (i.query === 'producers' || i.query === 'producers-of-producers') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const p = producers(s, e.id, i.query === 'producers' ? 2 : 4);
    const first = p.steps[0];
    if (!first?.by.length) return `I know nothing that makes ${an(nameOf(e))}: that is a question on my queue.`;
    const machines = p.steps.filter((x) => x.depth === 1 && x.by.length);
    const deeper = p.steps.filter((x) => x.depth >= 2 && x.by.length);
    const head = `${an(nameOf(e)).replace(/^a/, 'A')} is made by ${list(first.by.map(nameOf))}. Those need ${list(machines.flatMap((x) => x.by.map(nameOf)).filter((x, k, a) => a.indexOf(x) === k), 12)}.`;
    if (i.query === 'producers') return head;
    return `${head} And those machines are made by ${list(deeper.flatMap((x) => x.by.map(nameOf)).filter((x, k, a) => a.indexOf(x) === k), 14)}${p.cycle.length ? `, which closes on itself: ${p.cycle.map((c) => nameOf(s.get(c)!)).join(', ')} make each other, the machine that makes machines` : ''}.`;
  }
  if (i.query === 'analogues') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const a = analogues(s, e.id, 'biology');
    if (!a.length) return `I know no living analogue of ${an(nameOf(e))} yet.`;
    return `Living analogues of ${an(nameOf(e))}: ${a.map((x) => `${nameOf(x.entity)} (${x.why})`).join('; ')}.`;
  }
  if (i.query === 'dual-role') {
    const d = dualRole(s, i.of ?? 'bio.human', 'view.mechanical', 'view.anatomical');
    return `${d.length} structures of a human are at once mechanical and anatomical: ${d.map((x) => { const roles = s.reach(x.entity.id, 'plays').map(nameOf); return `${nameOf(x.entity)}${roles.length ? ` (${list(roles, 4)})` : ''}`; }).join('; ')}. Each is in ${[...new Set(d.flatMap((x) => x.views))].length} views in all.`;
  }
  if (i.query === 'lineage') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const l = lineageOf(s, e.id);
    if (l.length < 2) return `I have no lineage for ${an(nameOf(e))} yet.`;
    return `${an(nameOf(e)).replace(/^a/, 'A')}, generatively: ${l.map(nameOf).join(' → ')}. ${l[0]!.id.startsWith('phys.') ? 'That reaches the physical primitives.' : `That stops at ${nameOf(l[0]!)}: what it is made of is a question on my queue.`}`;
  }
  if (i.query === 'mechanisms-for') {
    const m = mechanismsFor(s, i.of ?? '');
    if (!m.function) return `I know no function for "${i.of}".`;
    if (!m.mechanisms.length) return `Nothing I know does ${nameOf(m.function)} yet.`;
    return `${m.mechanisms.length} mechanisms ${nameOf(m.function)}: ${list(m.mechanisms.map((f) => nameOf(f.entity)), 16)}.`;
  }
  if (i.query === 'construction-path') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const cp = constructionPath(s, e.id, 3);
    const make = cp.steps.filter((x) => x.need === 'make'), acquire = cp.steps.filter((x) => x.need === 'acquire');
    return `To build ${an(nameOf(e))}: make ${list(make.map((x) => `${nameOf(x.entity)}${x.by.length ? ` by ${list(x.by.map(nameOf), 3)}` : ''}`), 10)}; acquire ${list(acquire.map((x) => nameOf(x.entity)), 10)}. ${cp.gaps.length ? `Gaps, where I know no way yet: ${list(cp.gaps.map(nameOf), 10)}.` : 'No gaps.'}`;
  }
  const e = find(i.of ?? '');
  if (!e) return unknown(i.of ?? '');
  const ix = indexOf(s, e.id)!;
  const cov = e.coverage;
  return `${nameOf(e)}: ${e.says} ${ix.answers.map((a) => `${a.backwards ? `is ${a.kind} of` : a.kind}: ${list(a.entities.map(nameOf), 6)}`).join('; ')}. Known to depth ${cov.depth} at confidence ${cov.confidence.toFixed(2)} from ${cov.sourceKind}${cov.unknowns.length ? `; unknown: ${cov.unknowns.join('; ')}` : ''}.`;
}
