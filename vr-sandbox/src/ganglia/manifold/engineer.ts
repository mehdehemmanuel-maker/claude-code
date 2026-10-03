// The omni-engineer's entry: a contract in, lawful configurations out, each reached only by construction actions.
// It never answers a contract with a name. It selects the behaviour, refines to the function, and for every
// mechanism under it composes the transformations that bring the contract's domain to the mechanism's, connects
// their ports, parameterises a member by the contract, and tests the contract's constraints; what survives is
// ranked by what the contract asks to minimise (mass), and what does not is reported with the step that refused it.
import { DOMAINS, WH, type Contract, type Domain, type Environment, type Manifold, type Member } from './language';
import { descendantsOf, lineage, manifoldById, transformations } from './manifolds';
import { ActionRefused, Construction, type Step } from './actions';

export interface Candidate {
  store: Manifold;
  member: Member;
  /** Converters composed, each with its member: the one bringing energy in, the one taking it out (one when reversible). */
  converters: { manifold: Manifold; member: Member; role: 'in' | 'out' | 'both' }[];
  mass: [number, number];
  /** Every constraint held with the whole family's range. */
  certain: boolean;
  instantiable: boolean;
  steps: Step[];
}

export interface Refusal { store: Manifold; step: ActionRefused; steps: Step[] }

export interface Engineered {
  contract: Contract;
  env: Environment;
  candidates: Candidate[];
  refused: Refusal[];
  chosen: Candidate | null;
}

export const DEFAULT_ENV: Environment = { height: 2, radiusMax: 0.25, ambient: 293.15 };

const mid = (m: [number, number]) => Math.sqrt(Math.max(m[0], 1e-9) * Math.max(m[1], 1e-9));

/** The shortest chains of transformations that bring one domain to another, up to three long. */
function bridge(from: Domain, to: Domain, maxLen = 3): { manifold: Manifold; forward: boolean }[][] {
  if (from === to) return [[]];
  let frontier: { chain: { manifold: Manifold; forward: boolean }[]; at: Domain }[] = [{ chain: [], at: from }];
  for (let depth = 0; depth < maxLen; depth++) {
    const found: { manifold: Manifold; forward: boolean }[][] = [];
    const next: typeof frontier = [];
    for (const f of frontier) {
      for (const d of DOMAINS) {
        if (d === f.at || f.chain.some((x) => x.manifold.transformation!.from === d || x.manifold.transformation!.to === d)) continue;
        for (const t of transformations(f.at, d)) {
          const chain = [...f.chain, t];
          if (d === to) found.push(chain);
          else next.push({ chain, at: d });
        }
      }
    }
    if (found.length) return found;
    frontier = next;
  }
  return [];
}

/** Engineer a store for a contract: every lawful way, by its numbers, with the trace of how each was reached. */
export function engineer(contract: Contract, env: Environment = DEFAULT_ENV): Engineered {
  const inDomain: Domain = contract.in ?? 'electrical', outDomain: Domain = contract.out ?? 'electrical';
  const candidates: Candidate[] = [], refused: Refusal[] = [];
  const fn = manifoldById('store.energy')!;
  // every sizable manifold under the function, by mechanism
  const leaves = descendantsOf(fn.id).filter((m) => m.member);
  for (const store of leaves) {
    const d = store.domain!;
    // a store that need not refill arrives full (a tank filled, a primary cell bought): it needs a way in only when
    // the contract says what comes in
    const needsIn = contract.rechargeable || contract.in !== undefined;
    const ways = { in: needsIn ? bridge(inDomain, d) : [[]], out: bridge(d, outDomain) };
    // every pairing of a way in and a way out is a construction of its own; the first lawful one stands, and when
    // none is, the first's refusal is reported
    let first: Refusal | null = null, made: Candidate | null = null;
    const chainsIn = ways.in.length ? ways.in : [null], chainsOut = ways.out.length ? ways.out : [null];
    for (const chainIn of chainsIn) {
      for (const chainOut of chainsOut) {
        if (made) break;
        const c = new Construction();
        try {
          c.select('behavior.store').refine(fn.id).specialize(store.id);
          c.satisfy({ id: 'rechargeable', says: contract.rechargeable ? 'refillable in place' : 'need not be refillable', holds: () => !contract.rechargeable || store.reversible === true || `${store.name} is spent once: it cannot be refilled in place` });
          if (!chainIn) throw new ActionRefused('COMPOSE', store.id, `no transformation known from ${inDomain} to ${d}`);
          if (!chainOut) throw new ActionRefused('COMPOSE', store.id, `no transformation known from ${d} to ${outDomain}`);
          made = attempt(c, store, chainIn, chainOut);
        } catch (e) {
          if (!(e instanceof ActionRefused)) throw e;
          first ??= { store, step: e, steps: c.steps };
        }
      }
    }
    if (made) candidates.push(made);
    else if (first) refused.push(first);
  }

  function attempt(c: Construction, store: Manifold, chainIn: { manifold: Manifold; forward: boolean }[], chainOut: { manifold: Manifold; forward: boolean }[]): Candidate {
    const d = store.domain!;
    const needsIn = contract.rechargeable || contract.in !== undefined;
    const converters: Candidate['converters'] = [];
    const seen = new Set<string>();
    const envHere: Environment = { ...env };
    const add = (t: { manifold: Manifold; forward: boolean }, role: 'in' | 'out') => {
      if (seen.has(t.manifold.id)) { converters.find((x) => x.manifold.id === t.manifold.id)!.role = 'both'; return; }
      seen.add(t.manifold.id);
      const member = c.parameterize(t.manifold, contract, env);
      const w = member.parameters['speedMax'];
      if (w !== undefined && Number.isFinite(w) && w > 0) envHere.speedMax = Math.min(envHere.speedMax ?? Infinity, w);
      converters.push({ manifold: t.manifold, member, role });
    };
    let at: Domain = inDomain, prev = 'contract';
    for (const t of chainIn) { at = c.compose(at, prev, t.manifold, t.forward); prev = t.manifold.id; add(t, 'in'); }
    if (needsIn && at !== d) throw new ActionRefused('COMPOSE', store.id, `the chain in ends in ${at}, not ${d}`);
    at = d; prev = store.id;
    for (const t of chainOut) { at = c.compose(at, prev, t.manifold, t.forward); prev = t.manifold.id; add(t, 'out'); }
    if (at !== outDomain) throw new ActionRefused('COMPOSE', store.id, `the chain out ends in ${at}, not ${outDomain}`);
    // the store itself, sized with its converters' limits known, to deliver the contract's energy through the
    // converters on its way out at their least efficiency
    const effOut = chainOut.reduce((e, t) => e * (t.manifold.parameters.find((x) => x.sym === 'eff')?.low ?? 1), 1);
    const member = c.parameterize(store, { ...contract, stores: (contract.stores ?? 0) / effOut }, envHere);
    // ports: the store's energy ports to the converters' ports in its domain, and the converters' to the contract's domain
    const portIn = (m: Manifold, domain: Domain, dir: 'in' | 'out') => m.ports.find((x) => x.quantity === 'energy' && x.domain === domain && (x.direction === 'inout' || x.direction === dir))?.name;
    if (chainIn.length) {
      const last = chainIn.at(-1)!.manifold;
      c.connect({ manifold: last, port: portIn(last, d, 'out') ?? last.ports[0]!.name }, { manifold: store, port: 'energy_in' });
    }
    if (chainOut.length) {
      const firstOut = chainOut[0]!.manifold;
      c.connect({ manifold: store, port: 'energy_out' }, { manifold: firstOut, port: portIn(firstOut, d, 'in') ?? firstOut.ports[0]!.name });
    }
    // constraints
    if (contract.window) {
      const [lo, hi] = contract.window;
      for (const m of [store, ...converters.map((x) => x.manifold)]) {
        c.satisfy({ id: `window:${m.id}`, says: `${m.name} works from ${(lo - 273.15).toFixed(0)} to ${(hi - 273.15).toFixed(0)} °C`, holds: () => !m.window || (m.window[0] <= lo && m.window[1] >= hi) || `${m.name} works only from ${(m.window![0] - 273.15).toFixed(0)} to ${(m.window![1] - 273.15).toFixed(0)} °C, not ${(lo - 273.15).toFixed(0)} to ${(hi - 273.15).toFixed(0)}` });
      }
    }
    const low = member.mass[0] + converters.reduce((s, x) => s + x.member.mass[0], 0);
    const high = member.mass[1] + converters.reduce((s, x) => s + x.member.mass[1], 0);
    if (contract.massMax !== undefined) {
      const max = contract.massMax;
      c.satisfy({ id: 'mass', says: `under ${max} kg (${low.toFixed(2)} to ${high.toFixed(2)} kg)`, holds: () => low <= max || `${low.toFixed(1)} kg at the least, over ${max} kg`, law: member.laws[0] });
    }
    return { store, member, converters, mass: [low, high], certain: contract.massMax === undefined || high <= contract.massMax, instantiable: member.instantiable && converters.every((x) => x.member.instantiable), steps: c.steps };
  }

  candidates.sort((a, b) => Number(b.certain) - Number(a.certain) || mid(a.mass) - mid(b.mass));
  return { contract, env, candidates, refused, chosen: candidates[0] ?? null };
}

const kg = (m: [number, number]) => (Math.abs(m[0] - m[1]) < 1e-9 ? `${m[0].toFixed(2)} kg` : `${m[0].toFixed(2)} to ${m[1].toFixed(2)} kg`);

/** The engineering, said: what was asked, every lawful way by its numbers, what was refused and by which step. */
export function engineeredReport(r: Engineered): string {
  const c = r.contract;
  const asked = [c.stores !== undefined ? `hold ${(c.stores / 1000).toFixed(1)} kJ (${(c.stores / WH).toFixed(1)} Wh)` : null, c.releases ? `give ${c.releases.toFixed(0)} W` : null, c.window ? `work from ${(c.window[0] - 273.15).toFixed(0)} to ${(c.window[1] - 273.15).toFixed(0)} °C` : null, c.massMax !== undefined ? `weigh under ${c.massMax} kg` : null, c.rechargeable ? 'be refillable in place' : null].filter(Boolean).join(', ');
  const lines = [`Asked to ${asked}, taken in and given out as ${c.in ?? 'electrical'} energy. I began at the behaviour "store", refined it to energy, and tried every mechanism under it.`];
  if (r.candidates.length) {
    lines.push(`${r.candidates.length} lawful way${r.candidates.length > 1 ? 's' : ''}, lightest first:`);
    for (const k of r.candidates) {
      const via = k.converters.length ? ` through ${k.converters.map((x) => `${x.manifold.name} (${x.member.says})`).join(' and ')}` : '';
      const called = lineage(k.store.id).filter((m) => m.names?.length).map((m) => m.names![0]!);
      const name = called.length ? ` (what people call a ${[...new Set(called)].reverse().join(' ')})` : '';
      lines.push(`- ${k.store.mechanism}, ${k.store.name}${name}: ${k.member.says}${via}: ${kg(k.mass)}${k.certain ? '' : ' (within its family\'s range at best; not certain)'}${k.instantiable ? '; I can place it here' : '; constructible, but a part of it is not stocked here'}.`);
    }
    const ch = r.chosen!;
    lines.push(`By the numbers, ${ch.store.name} (${ch.store.mechanism})${ch.certain ? '' : ', though not certainly'}: ${kg(ch.mass)}. Its path: ${ch.steps.map((s) => `${s.verb.toLowerCase().replace('_', ' ')} ${s.to}`).join(' → ')}.`);
  } else lines.push('No lawful way: every mechanism was refused.');
  if (r.refused.length) lines.push(`Refused: ${r.refused.map((x) => `${x.store.name} at ${x.step.verb.toLowerCase().replace('_', ' ')} (${x.step.why}${x.step.law ? `, by ${x.step.law}` : ''})`).join('; ')}.`);
  return lines.join(' ');
}
