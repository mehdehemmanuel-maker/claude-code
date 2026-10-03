// Ego answers the alien engineer's questions by walking the substrate: every way, every mechanism, every material, what
// makes a thing and what makes those, its analogues, its lineage, what to build it from. Nothing here is a list kept for
// the question; each answer is the traversal, said in words, with what is still unknown said too.
import type { Intent } from './intent';
import { askable, chain, d, decompose, fromRelation, grow as growGrammar, hash, polysemous, r, readings, render, saidOf, sayGrammar, saySenses, senses, settle, speak, symptoms, text as nex, tune, type Grammar, type R, type SettleContext } from '../ganglia/native';
import { LAWS } from '../ganglia/laws';
import { dimensionOf, sameDim } from '../ganglia/units';
import { ruleExpander } from '../ganglia/substrate';
import type { Entity } from '../ganglia/substrate/model';
import type { Structure } from '../ganglia/native';
import { analogues, articled, constructionPath, decomposeThing, dualRole, findByWords, findScaleAnalogues, implementations, indexOf, leavesOf, lineageOf, materialsForRole, mechanismsFor, population, producers, spokenName, substrate, substrateCensus, variantsOf, waysToStore } from '../ganglia';

type Traverse = Extract<Intent, { do: 'traverse' }>;

// a human name where one is given; else the id said as words, without the domain prefix an id carries for uniqueness
const nameOf = spokenName;
/** A thing with its article, a material without: "a bearing", "steel". */
// a material, a quantity and a failure are said bare ("steel", "heat", "wear"); a part with its article ("a bolt")
const art = (e: Entity): string => (e.kinds.includes('material') || e.kinds.includes('quantity') || e.kinds.includes('failure') || e.kinds.includes('law') ? nameOf(e) : articled(nameOf(e)));
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
/** A length or a time in the unit a person reads: 0.1 m is "about 10 cm", 6e-5 s "about 60 µs". */
const human = (x: number, units: [string, number][]) => { const [u, f] = [...units].reverse().find(([, f]) => x >= f) ?? units[0]!; const v = x / f; return `about ${Number(v.toPrecision(v >= 10 ? 2 : 1))} ${u}`; };
const LENGTHS: [string, number][] = [['pm', 1e-12], ['nm', 1e-9], ['µm', 1e-6], ['mm', 1e-3], ['cm', 1e-2], ['m', 1], ['km', 1e3], ['Mm', 1e6]];
const TIMES: [string, number][] = [['ns', 1e-9], ['µs', 1e-6], ['ms', 1e-3], ['s', 1], ['min', 60], ['h', 3600], ['days', 86400], ['years', 3.156e7]];
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
  const w = name.toLowerCase().replace(/^(?:an? |the )/, '').replace(/[^a-z0-9 ]/g, '').trim();
  // a word that names things of more than one sense ("current": the quantity, the ocean current, the sensor) is asked which, never chosen in silence (Nex, section S)
  const rs = w ? readings(substrate(), w) : [];
  const ask = polysemous(rs) ? askable(senses(rs)) : [];
  if (ask.length > 1) return `${cap(w)} names ${ask.length} things to me: ${saySenses(ask)}. Which do you mean?`;
  // things named with the word ("oak": Northern red oak, White oak): asked which, rather than denied
  const like = w ? [...substrate().entities.values()].filter((e) => !/^(?:kind|block|view|cross|fn|role|param|law|scale|observer)\./.test(e.id) && e.name.toLowerCase() !== w && new RegExp(`\\b${w}\\b`).test(e.name.toLowerCase())).slice(0, 4) : [];
  const which = like.length ? ` I know ${like.map(nameOf).join(', ')}: which do you mean?` : '';
  if (p?.connected) {
    p.ask(name);
    return `I know no ${name} yet.${which} I have asked ${p.connector!.name} about it; ask me again in a moment and I will say what it answered, with where it came from.`;
  }
  return `I know no ${name}${which ? ' as such.' : '.'}${which}`;
}

let grammar: { for: unknown; g: Grammar; said: string } | null = null;

/**
 * Influences a law carries where no arrow does. For a thing b (or one of its failure modes), every law that governs
 * it whose input the cause a names gives the sign of the law's output in that input, by finite difference at the
 * law's own worked example: derived, never a guess. When b is itself a quantity of the law, the effect is b: read
 * forward when b is the output, inverted when a names the output and b an input (the inverse has the forward sign),
 * and implicitly when both are inputs (the output held: the sign of db/da is minus the ratio of the two
 * sensitivities, as the book's inverse solve has it).
 */
function lawInfluences(a: Entity, b: Entity, modes: string[]): { s: R; law: (typeof LAWS)[number]; sym: string; input: string; effect: string; sign: '+' | '-'; elasticity: number; of: string }[] {
  const s = substrate();
  const words = [...new Set([nameOf(a).toLowerCase(), a.id.split('.').pop()!.replace(/-/g, ' '), ...a.names.map((n) => n.toLowerCase())])].filter((w) => w.length >= 3);
  const names = (name: string): boolean => { const n = name.toLowerCase().replace(/ (?:difference|rise|drop|change|gradient)$/, ''); const head = n.split(/\W+/).filter(Boolean).pop() ?? ''; return words.some((w) => n === w || head === w || head === w.split(' ').pop()); };
  type Out = { s: R; law: (typeof LAWS)[number]; sym: string; input: string; effect: string; sign: '+' | '-'; elasticity: number; of: string };
  const out: Out[] = [];
  const bUnit = b.kinds.includes('quantity') ? b.params?.find((p) => p.sym === 'unit')?.values?.[0] : undefined;
  const same = (u1: string, u2: string): boolean => { try { return sameDim(dimensionOf(u1), dimensionOf(u2)); } catch { return false; } };
  for (const id of [b.id, ...modes]) {
    for (const rel of s.outOf(id, 'governed-by')) {
      const law = LAWS.find((l) => l.id === rel.to);
      if (!law) continue;
      const ex = law.example.inputs;
      // relative sensitivity of the output to one input at the worked example, with its sign; null where it cannot be taken
      const sens = (sym: string): { sign: 1 | -1; rel: number } | null => {
        const x0 = ex[sym];
        if (!x0) return null;
        let y0: number, y1: number;
        try { y0 = law.eval(ex); y1 = law.eval({ ...ex, [sym]: x0 * 1.01 }); } catch { return null; }
        if (!Number.isFinite(y0) || !Number.isFinite(y1) || y0 === y1 || y0 === 0) return null;
        return { sign: y1 > y0 ? 1 : -1, rel: Math.abs((y1 - y0) / y0) / 0.01 };
      };
      const cause = law.inputs.find((x) => names(x.name));
      const causeIsOutput = names(law.output.name);
      // the quantity of b the law reaches: b itself when b is the output or an input of it; else the law's output of the thing
      const bAsOutput = !!bUnit && same(bUnit, law.output.unit);
      const bAsInput = bUnit ? law.inputs.find((x) => x !== cause && same(x.unit, bUnit)) : undefined;
      const of = id === b.id ? nameOf(b) : `${nameOf(b)} (${nameOf(s.get(id)!)})`;
      const push = (sign: 1 | -1, elasticity: number, sym: string, input: string, effect: string, target: Structure, mech: string) => out.push({ s: r('influence', [d(a.id, { en: nameOf(a) }), target], { dir: 1, polarity: sign > 0 ? '+' : '-', necessity: 'contributing', mech, ev: { how: 'derived', src: [law.source.cite] }, dom: [d(`valid:${law.id}`, { en: law.valid })], mode: 'true' }), law, sym, input, effect, sign: sign > 0 ? '+' : '-', elasticity, of });
      if (cause && bUnit && bAsInput) {
        // both inputs: the output held, db/da = -(dy/da)/(dy/db)
        const sa = sens(cause.sym), sb = sens(bAsInput.sym);
        if (sa && sb) push((-sa.sign * sb.sign) as 1 | -1, sa.rel / sb.rel, cause.sym, cause.name, `${bAsInput.name} (${bAsInput.sym})`, d(b.id, { en: nameOf(b) }), `${law.id}/${bAsInput.sym}`);
      } else if (cause && bUnit && bAsOutput) {
        const sa = sens(cause.sym);
        if (sa) push(sa.sign, sa.rel, cause.sym, cause.name, `${law.output.name} (${law.output.sym})`, d(b.id, { en: nameOf(b) }), law.id);
      } else if (cause && !bUnit) {
        const sa = sens(cause.sym);
        if (sa) push(sa.sign, sa.rel, cause.sym, cause.name, `${law.output.name} of ${of}`, r('quantity', [d(id, { en: of }), d(`${law.id}:${law.output.sym}`, { en: `${law.output.name} (${law.output.unit})` })], {}), law.id);
      } else if (causeIsOutput && bUnit && bAsInput) {
        // the law read the other way: the inverse has the forward sign
        const sb = sens(bAsInput.sym);
        if (sb) push(sb.sign, 1 / sb.rel, law.output.sym, `${law.output.name}, the law read the other way`, `${bAsInput.name} (${bAsInput.sym})`, d(b.id, { en: nameOf(b) }), `${law.id}^-1`);
      }
    }
  }
  return out;
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
    if (!w.mechanisms.length) {
      // heat is energy stored as heat: the way of storing energy the word names, and what does it
      const AS: Record<string, string> = { heat: 'thermal', cold: 'thermal', electricity: 'electrochemical', charge: 'electrostatic', motion: 'inertial', momentum: 'inertial', height: 'gravitational', air: 'compressed-gas', gas: 'compressed-gas', fuel: 'chemical' };
      const way = AS[i.of ?? ''] ? s.get(`store.energy.${AS[i.of ?? '']}`) : undefined;
      const doers = way ? [...new Set([...implementations(s, way.id).map((f) => f.entity), ...s.into(way.id, 'is-a').map((r) => s.get(r.from)).filter((x): x is NonNullable<typeof x> => !!x)])] : [];
      if (way && doers.length) return `${cap(i.of ?? '')} is stored as ${nameOf(way)}: ${doers.length} things do it that I know of: ${list(doers.map(nameOf), 10)}.`;
      return `I know no way to store ${i.of}: that is a question for my queue.`;
    }
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
    if (!role.kinds.includes('role')) {
      // a thing, not a role: what it is made of, then what plays the roles it plays
      const mats = s.reach(role.id, 'made-of'), roles = s.reach(role.id, 'plays').map((r) => ({ r, rows: materialsForRole(s, r.id) })).filter((x) => x.rows.length);
      if (!mats.length && !roles.length) return `I know no material for ${art(role)} yet: that is a question on my queue.`;
      const made = mats.length ? `${cap(art(role))} is made of ${list(mats.map(nameOf), 8)}.` : '';
      const plays = roles.length ? `${mats.length ? ' It' : cap(art(role))} plays ${list(roles.map((x) => `${nameOf(x.r)} (also ${list(x.rows.map((y) => nameOf(y.entity)), 5)})`), 4)}.` : '';
      return `${made}${plays}`;
    }
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
    return `${art(e)[0]!.toUpperCase()}${art(e).slice(1)} varies by ${v.parameters.length ? v.parameters.map((p) => `${p.name}${p.values ? ` (${list(p.values, 6)})` : p.low !== undefined && p.high !== undefined ? ` (${p.low} to ${p.high}${p.unit ? ` ${p.unit}` : ''})` : ''}`).join(', ') : 'nothing I have parameters for'}; that is the manifold, and every combination is ${art(e)}. Its named refinements: ${v.kinds.length ? list(v.kinds.map(nameOf), 14) : 'none yet'}. Standards: ${stds.length ? list(stds.map(nameOf)) : 'none'}. It fails by ${fails.length ? list(fails.map(nameOf), 8) : 'nothing I know yet'}.`;
  }
  if (i.query === 'components') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const d = decomposeThing(s, e.id, 3)!;
    // what it is made of, with the arrow's own saying when it has one ("typically made of"), and where that came from
    const mats = s.outOf(e.id, 'made-of').map((r) => ({ r, m: s.get(r.to)! })).filter((x) => x.m);
    const cite = (src: unknown) => { const c = (src as { cite?: string })?.cite; return c ? ` (${c.split(',')[0]})` : ''; };
    const matLine = mats.length ? `${mats.some((x) => /^typically/.test(x.r.says ?? '')) ? 'It is typically made of' : 'It is made of'} ${list(mats.map((x) => nameOf(x.m)), 6)}${cite(mats[0]!.r.source)}.` : '';
    const head = cap(art(e));
    const parts = d.children.filter((c) => !mats.some((x) => x.m.id === c.entity.id));
    if (!parts.length) {
      if (matLine) return `I know no parts of ${art(e)} yet. ${matLine}`;
      const kindMat = s.reach(e.id, 'is-a').map((k) => ({ k, ms: s.reach(k.id, 'made-of') })).find((x) => x.ms.length);
      if (kindMat) return `${head} is ${art(kindMat.k)}, and ${art(kindMat.k)} is typically made of ${list(kindMat.ms.map(nameOf), 6)}; its own material I have not been told.`;
      if (deriveNow(e, ['materials'])) { const now = s.reach(e.id, 'made-of'); if (now.length) return `I had not been asked that. From its kind and its parts, ${art(e)} is made of ${list(now.map(nameOf), 6)}.`; }
      return `I have not decomposed ${art(e)} yet: ${s.get(e.id)!.coverage.unknowns.join('; ') || 'it is a question for my queue'}.`;
    }
    const leaves = leavesOf(d);
    const n = leaves.length;
    return `${head} has ${parts.map((c) => `${nameOf(c.entity)}${c.children.length ? ` (${list(c.children.map((x) => nameOf(x.entity)), 5)})` : ''}`).join('; ')}. Down to the leaves it is ${n} thing${n === 1 ? '' : 's'}, ending in ${list(leaves.map((l) => nameOf(l)), 10)}.${matLine ? ` ${matLine}` : ''}`;
  }
  if (i.query === 'size') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const L = e.params?.find((p) => p.sym === 'L_c')?.low, T = e.params?.find((p) => p.sym === 'T_c')?.low;
    if (L === undefined && T === undefined) return `I have no size or time for ${art(e)} yet: that is a question on my queue.`;
    const size = L !== undefined ? `${cap(art(e))} is ${human(L, LENGTHS)} across` : `${cap(art(e))} has no size I know`;
    const time = T !== undefined ? `${L !== undefined ? ' and' : ''} works on a timescale of ${human(T, TIMES)}` : '';
    // its neighbours on the ladder: things of about that size, within a quarter of a decade
    const near = L !== undefined ? [...s.entities.values()].filter((x) => x.id !== e.id && !x.kinds.includes('scale') && !x.kinds.includes('observer') && !/^(view|cross|fn|role|param|law)\./.test(x.id)).map((x) => ({ x, l: x.params?.find((p) => p.sym === 'L_c')?.low })).filter((y): y is { x: Entity; l: number } => y.l !== undefined && Math.abs(Math.log10(y.l / L)) <= 0.25).sort((p, q) => Math.abs(Math.log10(p.l / L)) - Math.abs(Math.log10(q.l / L))).slice(0, 4) : [];
    const beside = near.length ? ` Beside it at that size: ${list(near.map((y) => nameOf(y.x)), 4)}.` : '';
    return `${size}${time}.${beside}`;
  }
  if (i.query === 'compare') {
    // a word with several senses is settled by the other side: "current" beside a quantity is the quantity (Nex: a comparison is of two things of one kind)
    let a = find(i.of ?? ''), b = find(i.which ?? '');
    let settled = '';
    const by = (word: string, other: typeof a): typeof a => { if (!other) return undefined; const ctx: SettleContext = other.kinds.includes('quantity') || other.kinds.includes('property') ? { kinds: ['quantity', 'property'] } : { kinds: [other.kinds[0]!] }; const got = settle(readings(s, word), ctx); if (got.chosen?.entity) settled += `By ${word} I take ${got.chosen.says}, ${got.why}. `; return got.chosen?.entity; };
    if (!a) a = by(i.of ?? '', b);
    if (!b) b = by(i.which ?? '', a);
    if (!a) return unknown(i.of ?? '');
    if (!b) return unknown(i.which ?? '');
    const tellCompare = (text: string) => `${settled}${text}`;
    if (a.id === b.id) return tellCompare(`${cap(art(a))} and ${art(b)} are the same thing to me: ${nameOf(a)}.`);
    // two quantities are told apart by dimension before anything else (Nex: a comparison across dimensions is undefined)
    const unitOfQ = (e: typeof a) => (e.kinds.includes('quantity') || e.kinds.includes('property') ? e.params?.find((p) => p.sym === 'unit')?.values?.[0] : undefined);
    const ua = unitOfQ(a), ub = unitOfQ(b);
    if (ua && ub) {
      const same = sameDim(dimensionOf(ua), dimensionOf(ub));
      // what each is, as its own saying has it: the first clause, then the rest as written
      const said = (e: typeof a) => `${cap(nameOf(e))}: ${e.says.charAt(0).toLowerCase()}${e.says.slice(1).replace(/\.$/, '')}.`;
      if (!same) return tellCompare(`${cap(nameOf(a))} and ${nameOf(b)} are different kinds of quantity: ${nameOf(a)} is counted in ${ua}, ${nameOf(b)} in ${ub}, and neither can be more or less than the other. ${said(a)} ${said(b)}`);
      return tellCompare(`${cap(nameOf(a))} and ${nameOf(b)} are counted in the same unit, ${ua}, and are not the same thing. ${said(a)} ${said(b)}`);
    }
    // a material is said bare ("steel"), a part with its article ("a bolt")
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
    if (La !== undefined && Lb !== undefined && La !== Lb) parts.push(`${art(a)} lives at ${human(La, LENGTHS)}, ${art(b)} at ${human(Lb, LENGTHS)}`);
    const xa = only(ids(a, 'fails-by'), ids(b, 'fails-by')), xb = only(ids(b, 'fails-by'), ids(a, 'fails-by'));
    if (xa.length || xb.length) parts.push(`${xa.length ? `${art(a)} alone fails by ${names(xa)}` : ''}${xa.length && xb.length ? '; ' : ''}${xb.length ? `${art(b)} alone fails by ${names(xb)}` : ''}`);
    const tell = parts.length ? parts.map(cap).join('. ') + '.' : 'I know nothing they share and nothing that parts them yet.';
    return tellCompare(`${tell} In a word: ${art(a)} is ${first(a)}; ${art(b)} is ${first(b)}.`);
  }
  if (i.query === 'function') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const cite = (src: unknown) => { const c = (src as { cite?: string })?.cite; return c ? ` (${c.split(',')[0]})` : ''; };
    const tell = (fn: ReturnType<typeof find> & object) => { const says = fn.says.replace(/^(?:To [a-z -]+|[a-z -]+ \(function\)): /i, ''); const first = says.split(/(?<=[a-z0-9%°)])[:;.] /)[0]!.replace(/\.$/, ''); const fnLaws = s.reach(fn.id, 'governed-by'), ownLaws = s.reach(e.id, 'governed-by'), shared = fnLaws.filter((l) => ownLaws.some((o) => o.id === l.id)); const laws = (shared.length ? shared : ownLaws.length ? ownLaws.slice(0, 2) : fnLaws).map(nameOf); return `${nameOf(fn).replace(/^fn /, '')}: ${first.charAt(0).toLowerCase()}${first.slice(1)}${laws.length ? `, by ${list(laws, 3)}` : ''}`; };
    const own = s.outOf(e.id, 'does').map((r) => ({ r, fn: s.get(r.to)! })).filter((x) => x.fn);
    if (own.length) return `${cap(art(e))} does ${own.length === 1 ? 'one thing' : `${own.length} things`}: ${own.map((x) => tell(x.fn)).join('; ')}${cite(own[0]!.r.source)}.`;
    const kind = s.reach(e.id, 'is-a').map((k) => ({ k, fns: s.reach(k.id, 'does') })).find((x) => x.fns.length);
    if (kind) return `${cap(art(e))} is ${art(kind.k)}, and ${art(kind.k)} does ${kind.fns.map(tell).join('; ')}.`;
    return `I know no function of ${art(e)} yet: that is a question on my queue.`;
  }
  if (i.query === 'producers' || i.query === 'producers-of-producers') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    let p = producers(s, e.id, i.query === 'producers' ? 2 : 4);
    let first = p.steps[0];
    // not asked yet: what works its material makes it, what makes its kind or its whole makes it, a living part is made by development
    const derivedNow = !first?.by.length && deriveNow(e, ['manufacturing', 'constructors']);
    if (derivedNow) { p = producers(s, e.id, i.query === 'producers' ? 2 : 4); first = p.steps[0]; }
    if (!first?.by.length) return `I know nothing that makes ${art(e)}: that is a question on my queue.`;
    const machines = p.steps.filter((x) => x.depth === 1 && x.by.length);
    const deeper = p.steps.filter((x) => x.depth >= 2 && x.by.length);
    const needs = machines.flatMap((x) => x.by.map(nameOf)).filter((x, k, a) => a.indexOf(x) === k);
    const why = derivedNow ? ` (${list(s.outOf(e.id, 'produced-by').map((r) => spoken(r.says ?? '')).filter((x, k, a) => x && a.indexOf(x) === k), 3)})` : '';
    const head = `${derivedNow ? 'I had not been asked that. ' : ''}${cap(art(e))} is made by ${list(first.by.map(nameOf))}${why}.${needs.length ? ` Those need ${list(needs, 12)}.` : ''}`;
    if (i.query === 'producers') return head;
    return `${head} And those machines are made by ${list(deeper.flatMap((x) => x.by.map(nameOf)).filter((x, k, a) => a.indexOf(x) === k), 14)}${p.cycle.length ? `, which closes on itself: ${p.cycle.map((c) => nameOf(s.get(c)!)).join(', ')} make each other, the machine that makes machines` : ''}.`;
  }
  if (i.query === 'analogues') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const living = i.which === 'living';
    const a = analogues(s, e.id, living ? 'biology' : undefined);
    if (!a.length) return `I know no ${living ? 'living ' : ''}analogue of ${art(e)} yet.`;
    const said = a.filter((x) => !x.why.startsWith('both do')), rest = a.filter((x) => x.why.startsWith('both do'));
    return `${living ? 'Living analogues' : 'Analogues'} of ${art(e)}: ${[...said, ...rest].slice(0, 8).map((x) => `${nameOf(x.entity)} (${spoken(x.why)})`).join('; ')}${a.length > 8 ? `; and ${a.length - 8} more` : ''}.`;
  }
  if (i.query === 'dual-role') {
    const d = dualRole(s, i.of ?? 'bio.human', 'view.mechanical', 'view.anatomical');
    return `${d.length} structures of a human are at once mechanical and anatomical: ${d.map((x) => { const roles = s.reach(x.entity.id, 'plays').map(nameOf); return `${nameOf(x.entity)}${roles.length ? ` (${list(roles, 4)})` : ''}`; }).join('; ')}. Each is in ${[...new Set(d.flatMap((x) => x.views))].length} views in all.`;
  }
  if (i.query === 'lineage') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const l = lineageOf(s, e.id);
    if (l.length < 2) return `I have no lineage for ${art(e)} yet.`;
    return `${cap(art(e))}, generatively: ${l.map(nameOf).join(' → ')}. ${l[0]!.id.startsWith('phys.') ? 'That reaches the physical primitives.' : `That stops at ${nameOf(l[0]!)}: what it is made of is a question on my queue.`}`;
  }
  if (i.query === 'mechanisms-for') {
    let m = mechanismsFor(s, i.of ?? ''), object = '';
    if (!m.function) {
      // "cut steel": the function is the verb; what it is done to is said back, since no arrow carries it
      const words = (i.of ?? '').split(' ');
      for (let k = words.length - 1; k >= 1 && !m.function; k--) { m = mechanismsFor(s, words.slice(0, k).join(' ')); if (m.function) object = words.slice(k).join(' '); }
    }
    if (!m.function) return `I know no function for "${i.of}".`;
    if (!m.mechanisms.length) return `Nothing I know does ${nameOf(m.function)} yet.`;
    return `${m.mechanisms.length} mechanisms ${nameOf(m.function)}: ${list(m.mechanisms.map((f) => nameOf(f.entity)), 16)}.${object ? ` Which of them ${nameOf(m.function)} ${object} I have not been told: no arrow of mine says what a mechanism works on.` : ''}`;
  }
  if (i.query === 'cause') {
    // the arrows that carry influence: X enables Y (+), X prevents Y (−), Y requires X (X necessary for Y), Y fails by X (X lowers Y)
    const correlation = 'Two things rising together would be a correlation, which I hold as support, never as a cause.';
    // a word of two senses beside a quantity is the quantity ("current" beside heat); otherwise it is asked
    const failureOfWhich = /^(?:the )?(?:failure|failing|breaking|death|wear) of (?:an? |the )?(.+)$/.exec(i.which ?? '')?.[1];
    const other = i.which ? find(failureOfWhich ?? i.which) : undefined;
    const asQuantity = (word: string, beside: Entity | undefined): Entity | undefined => (beside?.kinds.includes('quantity') ? settle(readings(s, word), { kinds: ['quantity'] }).chosen?.entity : undefined);
    const a = find(i.of ?? '') ?? asQuantity(i.of ?? '', other);
    // a thing she does not know can be no cause she knows: said with the rule that no correlation would make it one
    if (!a) return `${unknown(i.of ?? '')} ${i.which ? `So I know no mechanism by which it ${i.prevent ? 'prevents' : 'causes'} ${i.which}. ${correlation}` : ''}`.trim();
    const influences = (id: string): R[] => [...s.outOf(id, 'enables'), ...s.outOf(id, 'prevents'), ...s.into(id, 'requires'), ...s.into(id, 'fails-by')].map((rel) => fromRelation(rel, s)).filter((x): x is R => !!x && x.args[0]?.k === 'D' && x.args[0].id === id);
    const intoOf = (id: string): R[] => [...s.into(id, 'enables'), ...s.into(id, 'prevents'), ...s.outOf(id, 'requires'), ...s.outOf(id, 'fails-by')].map((rel) => fromRelation(rel, s)).filter((x): x is R => !!x && x.args[1]?.k === 'D' && x.args[1].id === id);
    if (!i.which) {
      const ins = intoOf(a.id);
      if (!ins.length) return `I know no mechanism that causes ${art(a)}: no arrow of mine runs into it. ${correlation}`;
      const outs = ins.slice(0, 6).map((x) => render(x, 'en', 'engineer'));
      return `${ins.length} influence${ins.length === 1 ? '' : 's'} on ${art(a)} that I know of: ${outs.map((o) => o.text).join(' ')}${ins.length > 6 ? ` And ${ins.length - 6} more.` : ''}`;
    }
    // "the failure of a bearing": the targets are the bearing's failure modes, and the bearing itself when the chain lowers it
    const failureOf = failureOfWhich;
    const b = find(failureOf ?? i.which) ?? asQuantity(failureOf ?? i.which, a);
    if (!b) return `${unknown(i.which)} ${correlation}`;
    const modes = failureOf ? s.reach(b.id, 'fails-by').map((f) => f.id) : [];
    if (failureOf && !modes.length) return `I know no failure of ${art(b)} yet: that is a question on my queue, and until it is answered I know no mechanism by which ${art(a)} ${i.prevent ? 'prevents' : 'causes'} one. ${correlation}`;
    const verb = i.prevent ? 'prevents' : 'causes', said = failureOf ? `the failure of ${art(b)}` : art(b);
    // the shortest chain of influences from a to a target, three steps at most. The sign the question wants: to cause a
    // failure is to raise a failure mode or lower the thing; to prevent it the reverse; to prevent a thing is to lower it
    const prev = new Map<string, { from: string; via: R } | null>([[a.id, null]]);
    const sign = (id: string): number => { let pol = 1; for (let k = id; prev.get(k); k = prev.get(k)!.from) if (prev.get(k)!.via.c.polarity === '-') pol = -pol; return pol; };
    const wanted = (to: string): boolean => {
      if (failureOf) return modes.includes(to) ? sign(to) === (i.prevent ? -1 : 1) : to === b.id && sign(to) === (i.prevent ? 1 : -1);
      return to === b.id && (!i.prevent || sign(to) === -1);
    };
    let frontier = [a.id], found: string | null = null;
    for (let depth = 0; depth < 3 && !found && frontier.length; depth++) {
      const next: string[] = [];
      for (const id of frontier) for (const x of influences(id)) { const to = (x.args[1] as { id: string }).id; if (prev.has(to)) continue; prev.set(to, { from: id, via: x }); next.push(to); if (wanted(to)) { found = to; break; } }
      frontier = next;
    }
    if (!found) {
      // no arrow: a law may still say it. A law governing the thing (or a failure of it) with an input the cause names
      // gives the sign of its output in that input at the law's own worked example: derived, never a guess
      const byLaw = lawInfluences(a, b, modes);
      if (byLaw.length) {
        const outs = byLaw.slice(0, 3).map((x) => `${render(x.s, 'en', 'engineer').text} That is ${x.law.name} (${x.law.formula}): ${x.input} (${x.sym}) ${x.sign === '-' ? 'lowers' : 'raises'} ${x.effect} by ${x.elasticity.toFixed(1)} % a percent at its worked example; derived, not measured here.`);
        return `No arrow of mine runs from ${art(a)} to ${said}, but a law does: ${outs.join(' ')} In Nex: ${nex(byLaw[0]!.s)}`;
      }
      return `I know no mechanism by which ${art(a)} ${verb} ${said}: no arrow of mine runs from one to the other within three steps, and no law governing it has ${art(a)} as an input. ${correlation}`;
    }
    const path: R[] = [];
    for (let id = found; prev.get(id); id = prev.get(id)!.from) path.unshift(prev.get(id)!.via);
    const whole = path.length === 1 ? path[0]! : path.slice(1).reduce((acc, x) => chain(acc, x) ?? acc, path[0]!);
    const out = render(whole, 'en', 'engineer');
    const steps = path.length > 1 ? ` By way of ${list(path.slice(0, -1).map((x) => nameOf(s.get((x.args[1] as { id: string }).id)!)), 4)}: ${path.map((x) => render(x, 'en', 'engineer').text).join(' ')}` : '';
    return `${out.text}${steps}${out.rank ? ` The weakest evidence in that is ${out.rank}.` : ''} In Nex: ${nex(whole)}`;
  }
  if (i.query === 'symptom') {
    // human → native (section M): the word is decomposed into candidate structures from what she knows fails the thing, none chosen
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const word = i.which ?? '';
    const laws = new Map(LAWS.map((l) => [l.id, l]));
    // from what fails it; and, for a motor or a servo, from what the word may mean of a motor's quantities (torque near
    // stall, speed fallen, current near its limit, ...): those readings are a motor's, never a heart's
    const self = d(e.id, { en: nameOf(e) });
    const motorish = /^(?:motor|servo|actuat)/.test(e.id) || s.reach(e.id, 'is-a').some((k) => /^(?:motor|servo|actuat)/.test(k.id));
    const cands = [...symptoms(s, e, word, laws), ...(motorish ? decompose(word, self) : [])];
    if (!cands.length) {
      const modes = [...new Set([...s.reach(e.id, 'fails-by'), ...s.reach(e.id, 'is-a').flatMap((k) => s.reach(k.id, 'fails-by'))].map(nameOf))];
      return `"${word}" names no failure I know of ${art(e)}.${modes.length ? ` What I know fails it: ${list(modes, 8)}; none of them carries that word, so I cannot say which you mean.` : ' I know no failure of it yet.'}`;
    }
    const lines = cands.map((c) => `${c.says} (settled by ${c.settledBy})`);
    const hi = Math.max(...cands.map((c) => c.cert.hi ?? 1));
    return `"${cap(word)}" of ${art(e)} could be ${cands.length === 1 ? 'one thing' : `${cands.length} things`} to me, none chosen: ${lines.join('; ')}. Each is held as not yet measured, certain between 0 and ${Number(hi.toPrecision(2))} until it is; the word is where my certainty is lowest. In Nex: ${nex(cands[0]!.structure)}`;
  }
  if (i.query === 'grammar') {
    // grown once per substrate build: the corpus is everything she holds, and it changes as the queue works
    const laws = new Map(LAWS.map((l) => [l.id, l]));
    if (!grammar || grammar.for !== s) { const g = growGrammar(s, laws); grammar = { for: s, g, said: sayGrammar(s, g) }; }
    return grammar.said;
  }
  if (i.query === 'native') {
    // what she holds of a thing in Nex: its structures, each rendered into English with what the rendering lost
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const laws = new Map(LAWS.map((l) => [l.id, l]));
    const said = saidOf(s, e.id, laws);
    if (!said.length) return `In Nex I hold nothing of ${art(e)} yet: a distinction with no relation, which is a question on my queue.`;
    // the faces first: what it does and is, what lowers it, what law binds it; then the rest, a few of each
    const picked = [...tune(said, 'structure').slice(0, 2), ...said.filter((x) => x.k === 'R' && x.op === 'function').slice(0, 2), ...tune(said, 'failure').slice(0, 2), ...said.filter((x) => x.k === 'R' && x.op === 'constrain').slice(0, 2)];
    const unique = [...new Map(picked.map((x) => [hash(x), x])).values()].slice(0, 6);
    const outs = unique.map((x) => render(x, 'en', 'engineer'));
    const present = outs.reduce((n, o) => n + o.present.length, 0), dropped = outs.reduce((n, o) => n + o.dropped.length, 0);
    const kinds = [...new Set(outs.flatMap((o) => o.dropped.map((p) => p.replace(/^\$(\[\d+\]|\.[a-z]+\[\d+\])*\.?/, '').split('.')[0] ?? p)))].filter(Boolean);
    const weakest = outs.map((o) => o.rank).filter((x): x is NonNullable<typeof x> => !!x).sort()[0];
    // each structure as Nex writes it (its compact text, read back to the same hash), then as English says it
    // aloud: the same structures spoken, one word per glyph, nothing dropped (native/spoken.ts)
    const aloud = i.which === 'aloud';
    const both = unique.map((x, k) => `${aloud ? speak(x) : nex(x)} = ${outs[k]!.text}`);
    return `In Nex I hold ${art(e)} as ${said.length} structures, hashed and compared without a word in them; ${unique.length} of them, each as Nex ${aloud ? 'says it aloud' : 'writes it'} and then in English: ${both.join(' ')} English carried ${present - dropped} of ${present} pieces of those structures${kinds.length ? ` and lost ${kinds.join(', ')}` : ''}${weakest ? `; the weakest evidence among them is ${weakest}` : ''}. Their hashes: ${unique.map((x) => `#${hash(x).slice(0, 8)}`).join(', ')}.`;
  }
  if (i.query === 'kinds') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const up = s.reach(e.id, 'is-a'), down = s.into(e.id, 'is-a').map((r) => s.get(r.from)).filter((x): x is NonNullable<typeof x> => !!x);
    if (!up.length && !down.length) return `I know no kind ${art(e)} is, nor any kind of it: that is a question on my queue.`;
    return `${up.length ? `${cap(art(e))} is a kind of ${list(up.map(nameOf), 6)}.` : `${cap(art(e))} is a kind of nothing I know.`}${down.length ? ` Kinds of ${nameOf(e)}: ${list(down.map(nameOf), 10)}.` : ''}`;
  }
  if (i.query === 'standards') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const own = s.reach(e.id, 'standardized-by'), viaKind = s.reach(e.id, 'is-a').flatMap((k) => s.reach(k.id, 'standardized-by').map((st) => `${articled(nameOf(k))}: ${nameOf(st)}`));
    if (!own.length && !viaKind.length) return `I know no standard for ${art(e)} yet: that is a question on my queue.`;
    return `${cap(art(e))} is standardized ${own.length ? `by ${list(own.map(nameOf), 8)}` : ''}${viaKind.length ? `${own.length ? ', and ' : ''}as ${list([...new Set(viaKind)], 6)}` : ''}.`;
  }
  if (i.query === 'interfaces') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const to = s.reach(e.id, 'connects-to'), works = s.reach(e.id, 'interacts-with'), from = s.into(e.id, 'connects-to').map((r) => s.get(r.from)).filter((x): x is NonNullable<typeof x> => !!x && x.id !== e.id);
    if (!to.length && !works.length && !from.length) return `I know nothing ${art(e)} connects to yet: that is a question on my queue.`;
    return `${cap(art(e))} connects to ${to.length ? list(to.map(nameOf), 8) : 'nothing I know'}${from.length ? `; ${list(from.map(nameOf), 6)} connect to it` : ''}${works.length ? `; it works with ${list(works.map(nameOf), 8)}` : ''}.`;
  }
  if (i.query === 'construction-path') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    const cp = constructionPath(s, e.id, 3);
    const make = cp.steps.filter((x) => x.need === 'make'), acquire = cp.steps.filter((x) => x.need === 'acquire');
    return `To build ${art(e)}: make ${list(make.map((x) => `${nameOf(x.entity)}${x.by.length ? ` by ${list(x.by.map(nameOf), 3)}` : ''}`), 10)}; acquire ${list(acquire.map((x) => nameOf(x.entity)), 10)}. ${cp.gaps.length ? `Gaps, where I know no way yet: ${list(cp.gaps.map(nameOf), 10)}.` : 'No gaps.'}`;
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
    const num = (x: number, unit?: string) => (unit === 'Pa' ? (x >= 1e9 ? `${+(x / 1e9).toPrecision(3)} GPa` : x >= 1e6 ? `${+(x / 1e6).toPrecision(3)} MPa` : `${+x.toPrecision(3)} Pa`) : unit === 'K' ? `${+(x - 273.15).toPrecision(4)} °C` : `${+x.toPrecision(3)}${unit ? ` ${unit}` : ''}`);
    const range = (p: P) => (p.low !== undefined && p.high !== undefined && p.low !== p.high ? `${num(p.low, p.unit)} to ${num(p.high, p.unit)}` : p.low !== undefined ? num(p.low, p.unit) : p.values ? p.values.join(', ') : 'no number');
    const from = (of: P['of']) => ('cite' in of ? `${of.cite}${of.url ? `, ${of.url}` : ''}` : 'derived' in of ? `derived from ${of.derived}` : 'estimate' in of ? `an estimate: ${of.estimate}` : 'a stub');
    const lines: string[] = [];
    const say = (owner: E, how: string) => { for (const p of (owner.params ?? []).filter((p) => want.syms.includes(p.sym) || want.names.test(p.name))) lines.push(`${how}${p.name} ${range(p)} (${from(p.of)})`); };
    say(e, '');
    for (const k of s.reach(e.id, 'is-a')) say(k, `as ${articled(nameOf(k))}: `);
    if (!lines.length) return `I have no ${want.label} for ${art(e)}: that is a question on my queue.`;
    return `${nameOf(e)}: ${lines.join('; ')}.`;
  }
  if (i.query === 'failures') {
    const e = find(i.of ?? '');
    if (!e) return unknown(i.of ?? '');
    type E = NonNullable<ReturnType<typeof find>>;
    const own = s.reach(e.id, 'fails-by');
    const seen = new Set(own.map((f) => f.id));
    const viaKind = s.reach(e.id, 'is-a').flatMap((k) => s.reach(k.id, 'fails-by').map((f) => ({ f, via: `as ${art(k)} does` })));
    const viaMaterial = s.reach(e.id, 'made-of').flatMap((m) => s.reach(m.id, 'fails-by').map((f) => ({ f, via: `as ${nameOf(m)} does` })));
    let inherited = [...viaKind, ...viaMaterial].filter((x) => !seen.has(x.f.id) && !!seen.add(x.f.id));
    // not asked yet: derive it now by the same rules the queue runs (what it is made of, what it does, whether it lives), and say so
    const derivedNow = !own.length && !inherited.length && deriveNow(e, ['failures']);
    if (derivedNow) { own.push(...s.reach(e.id, 'fails-by').filter((f) => !seen.has(f.id) && !!seen.add(f.id))); inherited = []; }
    if (!own.length && !inherited.length) return `I know no failure mode of ${art(e)} yet: that is a question on my queue.`;
    // the mechanism is the failure's first clause; the law behind it is what it is governed by
    const mech = (f: E) => { const laws = s.reach(f.id, 'governed-by').map(nameOf); const first = f.says.split(/(?<=[a-z0-9%°)])[:;.] /)[0]!.replace(/\.$/, ''); return `${nameOf(f)}, ${first.charAt(0).toLowerCase()}${first.slice(1)}${laws.length ? ` (${list(laws, 3)})` : ''}`; };
    const how = (f: E) => spoken(s.relations.find((r) => r.from === e.id && r.kind === 'fails-by' && r.to === f.id)?.says ?? '');
    // how each failure is known, from its arrow's structure in Nex: the tally of evidence, and the first arrow as Nex writes it
    const arrows = [...own.map((f) => s.relations.find((rel) => rel.from === e.id && rel.kind === 'fails-by' && rel.to === f.id)), ...inherited.map((x) => s.relations.find((rel) => rel.kind === 'fails-by' && rel.to === x.f.id && (s.reach(e.id, 'is-a').some((k) => k.id === rel.from) || s.reach(e.id, 'made-of').some((m) => m.id === rel.from))))].filter((x): x is NonNullable<typeof x> => !!x).map((rel) => fromRelation(rel, s)).filter((x): x is R => !!x);
    const tally = new Map<string, number>();
    for (const x of arrows) { const h = x.c.ev?.how ?? 'assumed'; tally.set(h, (tally.get(h) ?? 0) + 1); }
    const known = arrows.length ? ` ${[...tally].map(([h, n]) => `${n} ${h}`).join(', ')}; none measured in my world. In Nex: ${nex(arrows[0]!)}` : '';
    if (derivedNow) return `I had not been asked that. From what ${art(e)} is made of, what it does and whether it lives, it fails ${own.length} way${own.length === 1 ? '' : 's'}: ${own.map((f) => `${mech(f)} (${how(f)})`).join('; ')}. Each is a mechanism with a law behind it, not a label.${known}`;
    const ownSaid = own.length ? `${cap(art(e))} fails by ${own.length} way${own.length === 1 ? '' : 's'} of its own: ${own.map(mech).join('; ')}.` : `${cap(art(e))} fails in no way of its own that I know.`;
    return `${ownSaid}${inherited.length ? ` ${own.length ? 'And ' : ''}${inherited.length} ${own.length ? 'more ' : ''}it inherits: ${inherited.map((x) => `${mech(x.f)}, ${x.via}`).join('; ')}.` : ''} Each is a mechanism with a law behind it, not a label.${known}`;
  }
  const e = find(i.of ?? '');
  if (!e) return unknown(i.of ?? '');
  const ix = indexOf(s, e.id)!;
  const cov = e.coverage;
  const L = e.params?.find((p) => p.sym === 'L_c')?.low, T = e.params?.find((p) => p.sym === 'T_c')?.low;
  const scaleLine = L !== undefined ? ` It lives at ${human(L, LENGTHS)}${T !== undefined ? ` and ${human(T, TIMES)}` : ''}.` : '';
  const all = analogues(s, e.id), said = all.filter((x) => !x.why.startsWith('both do'));
  const ana = (said.length ? said : all).slice(0, 4);
  const far = findScaleAnalogues(s, e.id, { limit: 3 })?.analogues ?? [];
  const anaLine = ana.length ? ` Analogues: ${ana.map((x) => `${nameOf(x.entity)} (${spoken(x.why)})`).join('; ')}.` : '';
  const farLine = far.length ? ` At other scales it looks like ${far.map((x) => `${nameOf(x.entity)} (${human(x.length, LENGTHS)}, ${x.decades.toFixed(0)} decades away)`).join('; ')}.` : '';
  return `${nameOf(e)}: ${e.says}${scaleLine} ${ix.answers.map((a) => `${a.backwards ? `is ${a.kind} of` : a.kind}: ${list(a.entities.map(nameOf), 6)}`).join('; ')}.${anaLine}${farLine} Known to depth ${cov.depth} at confidence ${cov.confidence.toFixed(2)} from ${cov.sourceKind}${cov.unknowns.length ? `; unknown: ${cov.unknowns.join('; ')}` : ''}.`;
}
