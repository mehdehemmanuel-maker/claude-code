// Ego answers the alien engineer's questions by walking the substrate: every way, every mechanism, every material, what
// makes a thing and what makes those, its analogues, its lineage, what to build it from. Nothing here is a list kept for
// the question; each answer is the traversal, said in words, with what is still unknown said too.
import type { Intent } from './intent';
import { ruleExpander } from '../ganglia/substrate';
import { analogues, articled, constructionPath, decomposeThing, dualRole, findByWords, findScaleAnalogues, implementations, indexOf, leavesOf, lineageOf, materialsForRole, mechanismsFor, population, producers, spokenName, substrate, substrateCensus, variantsOf, waysToStore } from '../ganglia';

type Traverse = Extract<Intent, { do: 'traverse' }>;

// a human name where one is given; else the id said as words, without the domain prefix an id carries for uniqueness
const nameOf = spokenName;
const an = articled;
const list = (xs: string[], max = 12) => (xs.length <= max ? xs.join(', ') : `${xs.slice(0, max).join(', ')} and ${xs.length - max} more`);
const sci = (x: number) => x.toExponential(1).replace('e+', 'e');
const find = (word: string) => findByWords(substrate(), word);

/** What to say of a thing I do not know: asked outside when a source is connected, else a question for the packs. */
/** The queue's own rules, run now for one thing and the facets asked, their arrows kept: Ego asks herself before saying she does not know. */
function deriveNow(e: NonNullable<ReturnType<typeof find>>, facets: ('failures' | 'manufacturing' | 'constructors' | 'materials' | 'functions')[]): boolean {
  const s = substrate();
  let kept = false;
  for (const facet of facets) {
    const d = ruleExpander().expand(e, facet, s);
    if (!d || d instanceof Promise) continue;
    for (const r of d.relations) if (r.from === e.id && r.to !== e.id && s.has(r.to) && s.relate(r)) kept = true;
  }
  return kept;
}
/** A rule's saying names things by id; said aloud, by name. */
function spoken(says: string): string {
  const s = substrate();
  return says.replace(/[a-z][a-z0-9]*(?:[.-][a-z0-9]+)+/g, (id) => (s.has(id) ? nameOf(s.get(id)!).replace(/^fn /, '') : id));
}

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
    // what it is made of, with the arrow's own saying when it has one ("typically made of"), and where that came from
    const mats = s.outOf(e.id, 'made-of').map((r) => ({ r, m: s.get(r.to)! })).filter((x) => x.m);
    const cite = (src: unknown) => { const c = (src as { cite?: string })?.cite; return c ? ` (${c.split(',')[0]})` : ''; };
    const matLine = mats.length ? `${mats.some((x) => /^typically/.test(x.r.says ?? '')) ? 'It is typically made of' : 'It is made of'} ${list(mats.map((x) => nameOf(x.m)), 6)}${cite(mats[0]!.r.source)}.` : '';
    const head = an(nameOf(e)).replace(/^a/, 'A');
    const parts = d.children.filter((c) => !mats.some((x) => x.m.id === c.entity.id));
    if (!parts.length) {
      if (matLine) return `I know no parts of ${an(nameOf(e))} yet. ${matLine}`;
      const kindMat = s.reach(e.id, 'is-a').map((k) => ({ k, ms: s.reach(k.id, 'made-of') })).find((x) => x.ms.length);
      if (kindMat) return `${head} is ${an(nameOf(kindMat.k))}, and ${an(nameOf(kindMat.k))} is typically made of ${list(kindMat.ms.map(nameOf), 6)}; its own material I have not been told.`;
      if (deriveNow(e, ['materials'])) { const now = s.reach(e.id, 'made-of'); if (now.length) return `I had not been asked that. From its kind and its parts, ${an(nameOf(e))} is made of ${list(now.map(nameOf), 6)}.`; }
      return `I have not decomposed ${an(nameOf(e))} yet: ${s.get(e.id)!.coverage.unknowns.join('; ') || 'it is a question for my queue'}.`;
    }
    const leaves = leavesOf(d);
    const n = leaves.length;
    return `${head} has ${parts.map((c) => `${nameOf(c.entity)}${c.children.length ? ` (${list(c.children.map((x) => nameOf(x.entity)), 5)})` : ''}`).join('; ')}. Down to the leaves it is ${n} thing${n === 1 ? '' : 's'}, ending in ${list(leaves.map((l) => nameOf(l)), 10)}.${matLine ? ` ${matLine}` : ''}`;
  }
  if (i.query === 'compare') {
    const a = find(i.of ?? ''), b = find(i.which ?? '');
    if (!a) return unknown(i.of ?? '');
    if (!b) return unknown(i.which ?? '');
    if (a.id === b.id) return `${an(nameOf(a)).replace(/^a/, 'A')} and ${an(nameOf(b))} are the same thing to me: ${nameOf(a)}.`;
    // a material is said bare ("steel"), a part with its article ("a bolt")
    const art = (e: typeof a) => (e.kinds.includes('material') ? nameOf(e) : an(nameOf(e)));
    const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
    // what a thing does includes what its kinds do: a bolt clamps as a screw does
    const ids = (e: typeof a, kind: 'is-a' | 'made-of' | 'fails-by') => s.reach(e.id, kind).map((x) => x.id);
    const does = (e: typeof a) => [...new Set([...s.reach(e.id, 'does'), ...s.reach(e.id, 'is-a').flatMap((k) => s.reach(k.id, 'does'))].map((x) => x.id))];
    const names = (xs: string[]) => list(xs.map((id) => nameOf(s.get(id)!).replace(/^fn /, '')), 4);
    const both = <T,>(xs: T[], ys: T[]) => xs.filter((x) => ys.includes(x)), only = <T,>(xs: T[], ys: T[]) => xs.filter((x) => !ys.includes(x));
    const kinds = both(ids(a, 'is-a'), ids(b, 'is-a')), fns = both(does(a), does(b));
    const aIsB = ids(a, 'is-a').includes(b.id), bIsA = ids(b, 'is-a').includes(a.id);
    // the first clause of what a thing is, or the second when the first is only its name
    const first = (e: typeof a) => { const cs = e.says.split(/(?<=[a-z0-9%°)])[:;.] /).map((c) => c.replace(/\.$/, '')); const bare = (x: string) => x.toLowerCase().replace(/^(?:an? |the )/, ''); const c = cs.find((x) => bare(x) !== bare(nameOf(e)) && bare(x) !== bare(e.name)) ?? cs[0]!; return `${c.charAt(0).toLowerCase()}${c.slice(1)}`; };
    const parts: string[] = [];
    if (aIsB) parts.push(`${art(a)} is a kind of ${nameOf(b)}`);
    else if (bIsA) parts.push(`${art(b)} is a kind of ${nameOf(a)}`);
    else if (kinds.length) parts.push(`both are a kind of ${list(kinds.map((id) => nameOf(s.get(id)!)), 3)}`);
    if (fns.length) parts.push(`both ${names(fns)}`);
    const fa = only(does(a), does(b)), fb = only(does(b), does(a));
    if (fa.length || fb.length) parts.push(`${fa.length ? `what only ${art(a)} does: ${names(fa)}` : ''}${fa.length && fb.length ? '; ' : ''}${fb.length ? `what only ${art(b)} does: ${names(fb)}` : ''}`);
    const ma = ids(a, 'made-of'), mb = ids(b, 'made-of');
    if (ma.length && mb.length && (only(ma, mb).length || only(mb, ma).length)) parts.push(`${art(a)} is made of ${names(ma)}, ${art(b)} of ${names(mb)}`);
    const La = a.params?.find((p) => p.sym === 'L_c')?.low, Lb = b.params?.find((p) => p.sym === 'L_c')?.low;
    if (La !== undefined && Lb !== undefined && La !== Lb) parts.push(`${art(a)} lives at about ${sci(La)} m, ${art(b)} at ${sci(Lb)} m`);
    const xa = only(ids(a, 'fails-by'), ids(b, 'fails-by')), xb = only(ids(b, 'fails-by'), ids(a, 'fails-by'));
    if (xa.length || xb.length) parts.push(`${xa.length ? `${art(a)} alone fails by ${names(xa)}` : ''}${xa.length && xb.length ? '; ' : ''}${xb.length ? `${art(b)} alone fails by ${names(xb)}` : ''}`);
    const tell = parts.length ? parts.map(cap).join('. ') + '.' : 'I know nothing they share and nothing that parts them yet.';
    return `${tell} In a word: ${art(a)} is ${first(a)}; ${art(b)} is ${first(b)}.`;
  }
  if (i.query === 'function') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const cite = (src: unknown) => { const c = (src as { cite?: string })?.cite; return c ? ` (${c.split(',')[0]})` : ''; };
    const tell = (fn: ReturnType<typeof find> & object) => { const says = fn.says.replace(/^(?:To [a-z -]+|[a-z -]+ \(function\)): /i, ''); const first = says.split(/(?<=[a-z0-9%°)])[:;.] /)[0]!.replace(/\.$/, ''); const laws = s.reach(fn.id, 'governed-by').map(nameOf); return `${nameOf(fn).replace(/^fn /, '')}: ${first.charAt(0).toLowerCase()}${first.slice(1)}${laws.length ? `, by ${list(laws, 3)}` : ''}`; };
    const own = s.outOf(e.id, 'does').map((r) => ({ r, fn: s.get(r.to)! })).filter((x) => x.fn);
    if (own.length) return `${an(nameOf(e)).replace(/^a/, 'A')} does ${own.length === 1 ? 'one thing' : `${own.length} things`}: ${own.map((x) => tell(x.fn)).join('; ')}${cite(own[0]!.r.source)}.`;
    const kind = s.reach(e.id, 'is-a').map((k) => ({ k, fns: s.reach(k.id, 'does') })).find((x) => x.fns.length);
    if (kind) return `${an(nameOf(e)).replace(/^a/, 'A')} is ${an(nameOf(kind.k))}, and ${an(nameOf(kind.k))} does ${kind.fns.map(tell).join('; ')}.`;
    return `I know no function of ${an(nameOf(e))} yet: that is a question on my queue.`;
  }
  if (i.query === 'producers' || i.query === 'producers-of-producers') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    let p = producers(s, e.id, i.query === 'producers' ? 2 : 4);
    let first = p.steps[0];
    // not asked yet: what works its material makes it, what makes its kind or its whole makes it, a living part is made by development
    const derivedNow = !first?.by.length && deriveNow(e, ['manufacturing', 'constructors']);
    if (derivedNow) { p = producers(s, e.id, i.query === 'producers' ? 2 : 4); first = p.steps[0]; }
    if (!first?.by.length) return `I know nothing that makes ${an(nameOf(e))}: that is a question on my queue.`;
    const machines = p.steps.filter((x) => x.depth === 1 && x.by.length);
    const deeper = p.steps.filter((x) => x.depth >= 2 && x.by.length);
    const needs = machines.flatMap((x) => x.by.map(nameOf)).filter((x, k, a) => a.indexOf(x) === k);
    const why = derivedNow ? ` (${list(s.outOf(e.id, 'produced-by').map((r) => spoken(r.says ?? '')).filter((x, k, a) => x && a.indexOf(x) === k), 3)})` : '';
    const head = `${derivedNow ? 'I had not been asked that. ' : ''}${an(nameOf(e)).replace(/^a/, 'A')} is made by ${list(first.by.map(nameOf))}${why}.${needs.length ? ` Those need ${list(needs, 12)}.` : ''}`;
    if (i.query === 'producers') return head;
    return `${head} And those machines are made by ${list(deeper.flatMap((x) => x.by.map(nameOf)).filter((x, k, a) => a.indexOf(x) === k), 14)}${p.cycle.length ? `, which closes on itself: ${p.cycle.map((c) => nameOf(s.get(c)!)).join(', ')} make each other, the machine that makes machines` : ''}.`;
  }
  if (i.query === 'analogues') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const living = i.which === 'living';
    const a = analogues(s, e.id, living ? 'biology' : undefined);
    if (!a.length) return `I know no ${living ? 'living ' : ''}analogue of ${an(nameOf(e))} yet.`;
    const said = a.filter((x) => !x.why.startsWith('both do')), rest = a.filter((x) => x.why.startsWith('both do'));
    return `${living ? 'Living analogues' : 'Analogues'} of ${an(nameOf(e))}: ${[...said, ...rest].slice(0, 8).map((x) => `${nameOf(x.entity)} (${spoken(x.why)})`).join('; ')}${a.length > 8 ? `; and ${a.length - 8} more` : ''}.`;
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
  if (i.query === 'property') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    type E = NonNullable<ReturnType<typeof find>>;
    type P = NonNullable<E['params']>[number];
    const w = (i.which ?? '').toLowerCase();
    const want = /dens|heavy/.test(w) ? { syms: ['rho'], names: /density/, label: 'density' } : /modul|stiff/.test(w) ? { syms: ['E'], names: /modulus/, label: 'modulus' }
      : /yield/.test(w) ? { syms: ['sigma_y'], names: /yield/, label: 'yield strength' } : /strength|strong/.test(w) ? { syms: ['sigma_u', 'sigma_y'], names: /strength/, label: 'strength' }
      : /conduct/.test(w) ? { syms: ['k', 'sigma'], names: /conductivity/, label: 'conductivity' } : /melt/.test(w) ? { syms: ['T_melt'], names: /melting/, label: 'melting point' }
      : /friction/.test(w) ? { syms: ['mu'], names: /friction/, label: 'friction coefficient' } : { syms: [], names: new RegExp(w.replace(/[^a-z ]/g, '')), label: w };
    // a number said in the unit a person reads: pascals as GPa or MPa, the rest as given
    const num = (x: number, unit?: string) => (unit === 'Pa' ? (x >= 1e9 ? `${+(x / 1e9).toPrecision(3)} GPa` : x >= 1e6 ? `${+(x / 1e6).toPrecision(3)} MPa` : `${+x.toPrecision(3)} Pa`) : `${+x.toPrecision(3)}${unit ? ` ${unit}` : ''}`);
    const range = (p: P) => (p.low !== undefined && p.high !== undefined && p.low !== p.high ? `${num(p.low, p.unit)} to ${num(p.high, p.unit)}` : p.low !== undefined ? num(p.low, p.unit) : p.values ? p.values.join(', ') : 'no number');
    const from = (of: P['of']) => ('cite' in of ? `${of.cite}${of.url ? `, ${of.url}` : ''}` : 'derived' in of ? `derived from ${of.derived}` : 'estimate' in of ? `an estimate: ${of.estimate}` : 'a stub');
    const lines: string[] = [];
    const say = (owner: E, how: string) => { for (const p of (owner.params ?? []).filter((p) => want.syms.includes(p.sym) || want.names.test(p.name))) lines.push(`${how}${p.name} ${range(p)} (${from(p.of)})`); };
    say(e, '');
    for (const k of s.reach(e.id, 'is-a')) say(k, `as ${an(nameOf(k))}: `);
    if (!lines.length) return `I have no ${want.label} for ${an(nameOf(e))}: that is a question on my queue.`;
    return `${nameOf(e)}: ${lines.join('; ')}.`;
  }
  if (i.query === 'failures') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    type E = NonNullable<ReturnType<typeof find>>;
    const own = s.reach(e.id, 'fails-by');
    const seen = new Set(own.map((f) => f.id));
    const viaKind = s.reach(e.id, 'is-a').flatMap((k) => s.reach(k.id, 'fails-by').map((f) => ({ f, via: `as ${an(nameOf(k))} does` })));
    const viaMaterial = s.reach(e.id, 'made-of').flatMap((m) => s.reach(m.id, 'fails-by').map((f) => ({ f, via: `as ${nameOf(m)} does` })));
    let inherited = [...viaKind, ...viaMaterial].filter((x) => !seen.has(x.f.id) && !!seen.add(x.f.id));
    // not asked yet: derive it now by the same rules the queue runs (what it is made of, what it does, whether it lives), and say so
    const derivedNow = !own.length && !inherited.length && deriveNow(e, ['failures']);
    if (derivedNow) { own.push(...s.reach(e.id, 'fails-by').filter((f) => !seen.has(f.id) && !!seen.add(f.id))); inherited = []; }
    if (!own.length && !inherited.length) return `I know no failure mode of ${an(nameOf(e))} yet: that is a question on my queue.`;
    // the mechanism is the failure's first clause; the law behind it is what it is governed by
    const mech = (f: E) => { const laws = s.reach(f.id, 'governed-by').map(nameOf); const first = f.says.split(/(?<=[a-z0-9%°)])[:;.] /)[0]!.replace(/\.$/, ''); return `${nameOf(f)}, ${first.charAt(0).toLowerCase()}${first.slice(1)}${laws.length ? ` (${list(laws, 3)})` : ''}`; };
    const how = (f: E) => spoken(s.relations.find((r) => r.from === e.id && r.kind === 'fails-by' && r.to === f.id)?.says ?? '');
    if (derivedNow) return `I had not been asked that. From what ${an(nameOf(e))} is made of, what it does and whether it lives, it fails ${own.length} way${own.length === 1 ? '' : 's'}: ${own.map((f) => `${mech(f)} (${how(f)})`).join('; ')}. Each is a mechanism with a law behind it, not a label.`;
    return `${an(nameOf(e)).replace(/^a/, 'A')} fails by ${own.length} ways of its own: ${own.map(mech).join('; ')}.${inherited.length ? ` And ${inherited.length} more it inherits: ${inherited.map((x) => `${mech(x.f)}, ${x.via}`).join('; ')}.` : ''} Each is a mechanism with a law behind it, not a label.`;
  }
  const e = find(i.of ?? '');
  if (!e) return unknown(i.of ?? '');
  const ix = indexOf(s, e.id)!;
  const cov = e.coverage;
  const L = e.params?.find((p) => p.sym === 'L_c')?.low, T = e.params?.find((p) => p.sym === 'T_c')?.low;
  const scaleLine = L !== undefined ? ` It lives at about ${sci(L)} m${T !== undefined ? ` and ${sci(T)} s` : ''}.` : '';
  const all = analogues(s, e.id), said = all.filter((x) => !x.why.startsWith('both do'));
  const ana = (said.length ? said : all).slice(0, 4);
  const far = findScaleAnalogues(s, e.id, { limit: 3 })?.analogues ?? [];
  const anaLine = ana.length ? ` Analogues: ${ana.map((x) => `${nameOf(x.entity)} (${spoken(x.why)})`).join('; ')}.` : '';
  const farLine = far.length ? ` At other scales it looks like ${far.map((x) => `${nameOf(x.entity)} (${sci(x.length)} m, ${x.decades.toFixed(0)} decades away)`).join('; ')}.` : '';
  return `${nameOf(e)}: ${e.says}${scaleLine} ${ix.answers.map((a) => `${a.backwards ? `is ${a.kind} of` : a.kind}: ${list(a.entities.map(nameOf), 6)}`).join('; ')}.${anaLine}${farLine} Known to depth ${cov.depth} at confidence ${cov.confidence.toFixed(2)} from ${cov.sourceKind}${cov.unknowns.length ? `; unknown: ${cov.unknowns.join('; ')}` : ''}.`;
}
