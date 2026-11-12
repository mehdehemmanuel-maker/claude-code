// Energy, solids, and the conductors between them (the user, 2026-11-12: "you need to code energy, and solids and in
// between stands conductors"). A solid moves only where energy reaches it through an unbroken chain of conductors from
// something that holds energy. This file is the chain as data, for any machine: what kinds of part hold, convert, control
// or use energy, in which form, what may carry each form, and the rule that closes every chain or says where it is open.
// Nothing here is about one kind of machine: an excavator's cylinder, a drone's motor and a lathe's spindle are all a part
// that takes a form of energy and so calls for what gives it.
//
// What a thing calls for (the user: "there things that call for things"): a part that takes a form calls for a part that
// gives that form and a conductor of that form between them; an actuator worked by a fluid or by air calls for a valve
// before it, one worked by electricity for a controller before it; and so on up the chain until a part that holds energy
// (a tank, a battery) is reached. What the machine's own parts do not supply is called for by name and marked so.

/** A form energy is carried in. */
export type Form = 'fuel' | 'electric' | 'shaft' | 'fluid' | 'air';
export type Role = 'store' | 'converter' | 'control' | 'actuator';
/** A kind of energy part: what it does, the form it takes, the form it gives (a store takes none; an actuator that only
 *  moves a solid gives none). */
export interface EnergyKind { role: Role; takes?: Form; gives?: Form; says: string }
export const ENERGY_KINDS: Record<string, EnergyKind> = {
  fueltank: { role: 'store', gives: 'fuel', says: 'holds fuel' }, battery: { role: 'store', gives: 'electric', says: 'holds electricity' }, mains: { role: 'store', gives: 'electric', says: 'the mains supply' },
  airtank: { role: 'store', gives: 'air', says: 'holds compressed air' },
  engine: { role: 'converter', takes: 'fuel', gives: 'shaft', says: 'burns fuel to turn a shaft' }, motor: { role: 'converter', takes: 'electric', gives: 'shaft', says: 'turns a shaft by electricity' },
  generator: { role: 'converter', takes: 'shaft', gives: 'electric', says: 'makes electricity from a turning shaft' }, gearbox: { role: 'converter', takes: 'shaft', gives: 'shaft', says: 'changes a shaft\'s speed and torque' },
  pump: { role: 'converter', takes: 'shaft', gives: 'fluid', says: 'puts a fluid under pressure' }, compressor: { role: 'converter', takes: 'shaft', gives: 'air', says: 'compresses air' },
  hydraulicmotor: { role: 'converter', takes: 'fluid', gives: 'shaft', says: 'turns a shaft by fluid under pressure' },
  valve: { role: 'control', takes: 'fluid', gives: 'fluid', says: 'lets fluid through, or holds it' }, airvalve: { role: 'control', takes: 'air', gives: 'air', says: 'lets air through, or holds it' },
  controller: { role: 'control', takes: 'electric', gives: 'electric', says: 'switches or meters electricity' },
  cylinder: { role: 'actuator', takes: 'fluid', says: 'pushes by fluid under pressure' }, aircylinder: { role: 'actuator', takes: 'air', says: 'pushes by air' },
  wheel: { role: 'actuator', takes: 'shaft', says: 'is turned to drive' }, track: { role: 'actuator', takes: 'shaft', says: 'is turned to drive' }, propeller: { role: 'actuator', takes: 'shaft', says: 'is turned to thrust' },
  spindle: { role: 'actuator', takes: 'shaft', says: 'is turned to work' }, lamp: { role: 'actuator', takes: 'electric', says: 'lights' }, heater: { role: 'actuator', takes: 'electric', says: 'heats' },
};
/** What may carry each form from one part to the next. */
export const CONDUCTORS: Record<Form, readonly string[]> = { fuel: ['fuelline', 'hose', 'pipe'], electric: ['wire', 'cable'], shaft: ['shaft', 'belt', 'chain', 'gear', 'coupling'], fluid: ['hose', 'pipe'], air: ['airline', 'hose', 'pipe'] };
/** The control an actuator of a form is worked through, and the part that is called for where nothing gives a form. */
const CONTROL: Partial<Record<Form, string>> = { fluid: 'valve', air: 'airvalve', electric: 'controller' };
const GIVER: Record<Form, string> = { fuel: 'fueltank', electric: 'battery', shaft: 'motor', fluid: 'pump', air: 'compressor' };

export interface EnergyPart { name: string; kind: string; called?: true }
export interface EnergyFeed { from: string; to: string; by: string; form: Form; called?: true }
export interface EnergyChain { parts: EnergyPart[]; feeds: EnergyFeed[]; /** each actuator's chain back to what holds its energy, as names */ chains: string[][]; called: string[]; unmet: string[]; says: string }

/** The chain closed by rule. `parts` and `feeds` are what the machine is said to have; whatever a part calls for and is
 *  not there is added and marked called (it is not yet a solid in the machine: that is said). A feed whose conductor
 *  cannot carry the form asked, or whose giver does not give it, is unmet. */
export function energyOf(partsIn: readonly { name: string; kind: string }[], feedsIn: readonly { from: string; to: string; by: string }[]): EnergyChain {
  const parts: EnergyPart[] = [], called: string[] = [], unmet: string[] = [], feeds: EnergyFeed[] = [], lc = (s: string) => s.trim().toLowerCase();
  for (const p of partsIn) { const kind = lc(p.kind); if (!ENERGY_KINDS[kind]) { unmet.push(`${p.name}: "${p.kind}" is not a kind of energy part known here`); continue; } if (!parts.some((q) => lc(q.name) === lc(p.name))) parts.push({ name: p.name.trim(), kind }); }
  const find = (nm: string) => parts.find((q) => lc(q.name) === lc(nm)), K = (p: EnergyPart) => ENERGY_KINDS[p.kind]!;
  for (const f of feedsIn) { const a = find(f.from), b = find(f.to), by = lc(f.by); if (!a || !b) { unmet.push(`a ${f.by} from ${f.from} to ${f.to}: one end is not an energy part of this machine`); continue; }
    const form = K(b).takes; if (!form) { unmet.push(`${b.name} takes no energy, yet a ${f.by} feeds it`); continue; }
    if (K(a).gives !== form) { unmet.push(`${a.name} gives ${K(a).gives ?? 'nothing'}, and ${b.name} takes ${form}: a ${f.by} between them carries nothing it can use`); continue; }
    if (!CONDUCTORS[form].includes(by)) { unmet.push(`a ${f.by} cannot carry ${form} from ${a.name} to ${b.name} (it wants ${CONDUCTORS[form].join(' or ')})`); continue; }
    feeds.push({ from: a.name, to: b.name, by, form }); }
  // (what each part calls for, until nothing is left uncalled; a shaft is given by an engine where the machine has fuel and
  // by a motor otherwise)
  const add = (kind: string, why: string): EnergyPart => { const n = parts.filter((q) => q.kind === kind).length, p: EnergyPart = { name: `${kind}${n ? ` ${n + 1}` : ''} (called for)`, kind, called: true }; parts.push(p); called.push(`a ${kind}, ${why}`); return p; };
  const link = (a: EnergyPart, b: EnergyPart, form: Form) => { const by = CONDUCTORS[form][0]!; feeds.push({ from: a.name, to: b.name, by, form, called: true }); called.push(`a ${by} from ${a.name} to ${b.name}`); };
  for (let guard = 0; guard < 200; guard++) { const p = parts.find((q) => { const k = K(q); return !!k.takes && !feeds.some((f) => f.to === q.name); }); if (!p) break;
    const form = K(p).takes!, ctl = K(p).role === 'actuator' ? CONTROL[form] : undefined;
    const want = ctl ?? (form === 'shaft' ? (parts.some((q) => q.kind === 'engine' || q.kind === 'fueltank') ? 'engine' : 'motor') : GIVER[form]);
    const giver = parts.find((q) => q !== p && q.kind === want) ?? parts.find((q) => q !== p && !ctl && K(q).gives === form && K(q).role !== 'actuator') ?? add(want, `because ${p.name} takes ${form}`);
    link(giver, p, form); }
  // (an actuator worked by a fluid, by air or by electricity is worked through its control: one fed straight from a pump or
  // a battery has nothing to start, stop or hold it)
  for (const p of parts.filter((q) => K(q).role === 'actuator')) { const form = K(p).takes!, ctl = CONTROL[form]; if (!ctl) continue;
    for (const f of feeds.filter((x) => x.to === p.name)) { const g = find(f.from)!; if (g.kind === ctl) continue; const c = parts.find((q) => q.kind === ctl) ?? add(ctl, `because ${p.name} must be started, stopped and held`);
      f.from = c.name; if (!feeds.some((x) => x.from === g.name && x.to === c.name)) link(g, c, form); if (!f.called) called.push(`${p.name} is fed through the ${c.name}, not straight from the ${g.name}`); } }
  for (let guard = 0; guard < 200; guard++) { const p = parts.find((q) => { const k = K(q); return !!k.takes && !feeds.some((f) => f.to === q.name); }); if (!p) break; const form = K(p).takes!, want = form === 'shaft' ? (parts.some((q) => q.kind === 'engine' || q.kind === 'fueltank') ? 'engine' : 'motor') : GIVER[form];
    link(parts.find((q) => q !== p && K(q).gives === form && K(q).role !== 'actuator' && K(q).role !== 'control') ?? add(want, `because ${p.name} takes ${form}`), p, form); }
  // (each actuator's chain back to a store; one that does not reach a store is open)
  const chains: string[][] = [];
  for (const p of parts.filter((q) => K(q).role === 'actuator')) { const chain = [p.name], seen = new Set([p.name]); let cur = p, closed = false;
    for (let hop = 0; hop < 20; hop++) { const f = feeds.find((x) => x.to === cur.name && !seen.has(x.from)); if (!f) break; const g = find(f.from)!; chain.push(`${f.by}${f.called ? '*' : ''}`, g.name); seen.add(g.name); cur = g; if (K(g).role === 'store') { closed = true; break; } }
    chains.push(chain); if (!closed) unmet.push(`${p.name}: its energy does not reach back to anything that holds energy (${chain.join(' < ')})`); }
  const n = (k: Role) => parts.filter((q) => K(q).role === k).length;
  const says = `energy: ${n('actuator')} thing${n('actuator') === 1 ? '' : 's'} worked by it, ${n('control')} control${n('control') === 1 ? '' : 's'}, ${n('converter')} converter${n('converter') === 1 ? '' : 's'}, ${n('store')} store${n('store') === 1 ? '' : 's'}, joined by ${feeds.length} conductor${feeds.length === 1 ? '' : 's'}; ${called.length} called for by rule, ${unmet.length} unmet`;
  return { parts, feeds, chains, called, unmet, says };
}
