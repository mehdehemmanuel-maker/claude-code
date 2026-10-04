// Structures from function and constraints. Not one generator per thing: a small grammar of what a structure is made
// of, each piece sized by the laws for the load it carries, composed by relation into whatever was asked.
//
//   deck    a sheet that carries the load across a span: sized for bending and sag (stress.bending, beam.simply-supported.udl)
//   post    a column that carries its share to the ground: sized for crushing and buckling (stress.axial, buckling.euler)
//   rail    a beam between two posts, under a deck or flush with their tops: sized for bending and sag on edge
//   brace   a diagonal across a bay, so a frame of posts and rails does not rack (racking is a mechanism, not a strength)
//   stile   a leaning post of a ladder; rung, a rail between two stiles
//
// What comes out is an assembly (construct/assembly.ts): members with roles, and relations. Only the roots relate to
// the environment: posts stand on the ground under their footprint corners (their length from the ground there),
// stiles run from foot to apex, a deck lies on a slope. Everything else is on, under, between, across others, and the
// host resolves it from the parts that are there, so a rail is exactly as long as the gap it spans, a cap rests on
// its posts, a rung meets leaning stiles where they are at its height, a brace lies flat on the faces it ties.
// Nothing is placed by arithmetic that could leave a gap. Every design goes to her stand (src/mind) to be tested,
// where racking gets its bracing (mechanical.triangulation).

import { getMaterial, STANDARD_GRAVITY as g, type Material } from '../data/materials';
import { LUMBER } from '../parts/registry';
import { DEFAULTS, f, isMetal, isWood, legFor, mm, SAFETY, SAG, sheetFor, sheets, sizeOf, type DesignSpec } from './designer';
import type { Assembly, Member, Relation, Role } from '../construct/assembly';
import { defaultOf, derive, stockFor } from '../construct/laws';

const PERSON_SUBJECT = { kinds: ['artefact'], roles: [], flows: [], materials: [], forPerson: true };
/** The buckling length factor for a post, from mechanical.end-fixity: braced against sway or free to sway at the top. */
const fixity = (braced: boolean): number => { const d = derive({ kinds: ['post'], roles: braced ? ['support', 'braced'] : ['support'], flows: ['load'], materials: [] }).find((x) => x.out.kind === 'factor' && x.out.what === 'K'); return d && d.out.kind === 'factor' ? d.out.value : 2; };

export const STRUCTURES = ['bridge', 'frame', 'stand', 'ramp', 'ladder', 'chair'] as const;
export type Structure = (typeof STRUCTURES)[number];

/** A rail on edge between two supports carrying w N spread along a span L (m): the smallest stock that neither breaks nor sags past L/300. */
export function railFor(m: Material, L: number, w: number) {
  const M = (w * L) / 8;
  if (isWood(m)) {
    for (const size of ['1x4', '2x4', '2x6', '2x8']) {
      const [t, h] = LUMBER[size]!;
      const S = (t * h * h) / 6, I = (t * h ** 3) / 12;
      const self = m.density * g * t * h * L;
      const stress = ((w + self) * L) / 8 / S, sag = (5 * (w + self) * L ** 3) / (384 * m.E * I);
      if (stress * SAFETY <= m.ultimate && sag <= L * SAG) return { kind: 'lumber', params: `size=${size}`, t, h, label: `${size} lumber on edge` };
    }
    const [t, h] = LUMBER['2x8']!;
    return { kind: 'lumber', params: 'size=2x8', t, h, label: '2x8 lumber on edge (at its limit)' };
  }
  for (const side of [0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1]) {
    const wall = Math.max(0.0015, side / 16);
    const I = (side ** 4 - (side - 2 * wall) ** 4) / 12, S = (2 * I) / side;
    const self = m.density * g * (side ** 2 - (side - 2 * wall) ** 2) * L;
    const stress = ((w + self) * L) / 8 / S, sag = (5 * (w + self) * L ** 3) / (384 * m.E * I);
    if (stress * SAFETY <= m.ultimate && sag <= L * SAG) return { kind: 'tube.square', params: `side=${f(side)} wall=${f(wall)}`, t: side, h: side, label: `${mm(side)} square tube` };
  }
  void M;
  return { kind: 'tube.square', params: 'side=0.1 wall=0.006', t: 0.1, h: 0.1, label: '100 mm square tube (at its limit)' };
}

/** A brace: the lightest stock of the frame's family (a diagonal carries little, it only turns a mechanism into a truss). */
function braceFor(m: Material) {
  return isWood(m) ? { kind: 'lumber', params: 'size=1x4', label: '1x4 lumber' } : { kind: 'tube.square', params: 'side=0.02 wall=0.0015', label: '20 mm square tube' };
}

const deg = (rad: number) => +((rad * 180) / Math.PI).toFixed(3);

/** Posts and rails in the deck's material where its stock can be worked into members (manufacturing.stock); else steel. */
const frameMaterial = (deckM: Material) => (stockFor(deckM).some((k) => k === 'lumber' || k === 'tube.square') && (isWood(deckM) || isMetal(deckM)) ? deckM : getMaterial('steel.a36'));

/** What is said: the assembly, the laws it rests on, and the notes. */
export interface Structured { assembly: Assembly; laws: string[]; notes: string[] }

/** A small builder for an assembly: members by role, relations in the order they are said. */
class Plan_ {
  members: Member[] = [];
  relations: Relation[] = [];
  constructor(readonly tag: string) {}
  member(name: string, kind: string, params: string, material: string, role: Role): string { this.members.push({ name: `${this.tag}${name}`, kind, params, material, role }); return `${this.tag}${name}`; }
  /** A post standing on the ground at (x, z), its top `top` above the reference plane. */
  post(name: string, p: ReturnType<typeof legFor>, m: Material, x: number, z: number, top: number, role: Role = 'support'): string {
    const n = this.member(name, p.kind, p.params, m.id, role);
    this.relations.push({ how: 'stands', member: n, at: [x, z], top });
    return n;
  }
  /** A rail on edge between two posts: under a deck, flush with the posts' tops, or at a height. */
  rail(name: string, r: { kind: string; params: string }, m: Material, a: string, b: string, at: { under: string } | { flush: string } | { height: number }, role: Role = 'spans'): string {
    const n = this.member(name, r.kind, r.params, m.id, role);
    this.relations.push({ how: 'between', member: n, a, b, ...('under' in at ? { under: at.under } : 'flush' in at ? { flush: at.flush } : { height: at.height }), rot: 'rot x 90' });
    return n;
  }
  /** A brace flat on the faces of two posts, on one side, low on the first to high on the second. */
  brace(name: string, b: { kind: string; params: string }, m: Material, a: string, c: string, side: 'x' | '-x' | 'z' | '-z'): string {
    const n = this.member(name, b.kind, b.params, m.id, 'braces');
    this.relations.push({ how: 'across', member: n, a, b: c, side, rot: 'rot x 90' });
    return n;
  }
  on(name: string, kind: string, params: string, m: Material, onto: string[], role: Role, opts: { offset?: [number, number]; rot?: string } = {}): string {
    const n = this.member(name, kind, params, m.id, role);
    this.relations.push({ how: 'on', member: n, onto, ...opts });
    return n;
  }
  join(a: string, ...bs: string[]) { for (const b of bs) this.relations.push({ how: 'join', a, b }); }
  done(laws: string[], notes: string[]): Structured { return { assembly: { members: this.members, relations: this.relations }, laws, notes }; }
}

/** A structure for what was asked, its footprint centred on (ox, oz). */
export function structure(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  switch (spec.what as Structure) {
    case 'bridge': return bridge(spec, ox, oz, tag);
    case 'frame': case 'stand': return frame(spec, ox, oz, tag);
    case 'ramp': return ramp(spec, ox, oz, tag);
    case 'ladder': return ladder(spec, ox, oz, tag);
    case 'chair': return chair(spec, ox, oz, tag);
    default: throw new Error(`no structure for ${spec.what}`);
  }
}

/** A deck on two piers, each two posts with a cap rail resting on them; the deck rests on the caps. */
function bridge(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  const L = sizeOf(spec, 'width'), W = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height'), load = spec.load ?? DEFAULTS.bridge.load;
  const deckM = getMaterial(spec.material ?? 'wood.douglas-fir'), fm = frameMaterial(deckM);
  const deck = sheetFor(deckM, L, W, load * g, sheets(deckM));
  const deckMass = deckM.density * L * W * deck.t;
  const cap = railFor(fm, W, ((load + deckMass) * g) / 2);
  const postH = H - deck.t - cap.h;
  const p = legFor(fm, postH, ((load + deckMass) * g) / 4);
  const inset = p.wide / 2 + 0.01;
  const a = new Plan_(tag);
  let legs = 0;
  const caps: string[] = [];
  for (const [pier, sx] of [['A', -1], ['B', 1]] as const) {
    const x = ox + sx * (L / 2 - inset);
    const mine = [-1, 1].map((sz) => a.post(`leg${legs++}`, p, fm, x, oz + sz * (W / 2 - inset), postH));
    const c = a.on(`cap${pier}`, cap.kind, `${cap.params} length=${f(W)}`, fm, mine, 'cap', { rot: 'rot x 90 rot y 90' });
    a.join(c, ...mine);
    caps.push(c);
  }
  const d = a.on('deck', 'plate', `length=${f(L)} width=${f(W)} thickness=${f(deck.t)}`, deckM, caps, 'carries');
  a.join(d, ...caps);
  if (spec.aprons) {
    const b = braceFor(fm), yLow = Math.min(0.15, postH / 2);
    a.join(a.rail('railL', b, fm, `${tag}leg0`, `${tag}leg2`, { height: yLow }), `${tag}leg0`, `${tag}leg2`);
    a.join(a.rail('railR', b, fm, `${tag}leg1`, `${tag}leg3`, { height: yLow }), `${tag}leg1`, `${tag}leg3`);
    a.join(a.brace('braceL', b, fm, `${tag}leg0`, `${tag}leg2`, '-z'), `${tag}leg0`, `${tag}leg2`);
    a.join(a.brace('braceR', b, fm, `${tag}leg1`, `${tag}leg3`, 'z'), `${tag}leg1`, `${tag}leg3`);
  }
  return a.done(['stress.bending', 'beam.simply-supported.udl', 'stress.axial', 'buckling.euler'], [
    `Bridge ${mm(L)} long, ${mm(W)} wide, deck ${mm(H)} up, for ${load} kg.`,
    `Deck: ${mm(deck.t)} ${deckM.name}${Number.isFinite(deck.stress) ? `, stress ${(deck.stress / 1e6).toFixed(1)} MPa at full load (${SAFETY}× under its strength), sag ${(deck.sag * 1000).toFixed(1)} mm` : ' (the thickest standard sheet: it will be highly stressed)'}.`,
    `Two piers: ${p.label} posts in ${fm.name} under a ${cap.label} cap, each sized for its share at ${SAFETY}×.`,
    ...(spec.aprons ? ['Low rails and diagonals between the piers, so it does not rack along the span.'] : []),
  ]);
}

/** Four posts with rails between them; a stand carries a deck on top. */
function frame(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  const stand = spec.what === 'stand';
  const W = sizeOf(spec, 'width'), D = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height'), load = spec.load ?? DEFAULTS[spec.what].load;
  const deckM = getMaterial(spec.material ?? (stand ? 'wood.douglas-fir' : 'steel.a36')), fm = frameMaterial(deckM);
  const deck = stand ? sheetFor(deckM, W, D, load * g, sheets(deckM)) : null;
  const deckMass = deck ? deckM.density * W * D * deck.t : 0;
  const r = railFor(fm, Math.max(W, D), ((load + deckMass) * g) / 2);
  const postH = H - (deck?.t ?? 0);
  const bracedFrame = !!spec.aprons || H / Math.min(W, D) > 1.5;
  const p = legFor(fm, postH, ((load + deckMass) * g) / 4, fixity(bracedFrame));
  const inset = p.wide / 2 + 0.01;
  const a = new Plan_(tag);
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const legs = corners.map(([sx, sz], i) => a.post(`leg${i}`, p, fm, ox + sx * (W / 2 - inset), oz + sz * (D / 2 - inset), postH));
  let top: string | null = null;
  if (deck) { top = a.on('deck', 'plate', `length=${f(W)} width=${f(D)} thickness=${f(deck.t)}`, deckM, legs, 'carries'); a.join(top, ...legs); }
  const at = top ? { under: top } : { flush: legs[0]! };
  for (const [name, i, j] of [['railF', 0, 1], ['railB', 3, 2], ['railL', 0, 3], ['railR', 1, 2]] as const) {
    const rail = a.rail(name, r, fm, legs[i]!, legs[j]!, at, top ? 'spans' : 'carries');
    a.join(rail, legs[i]!, legs[j]!, ...(top ? [top] : []));
  }
  const braced = bracedFrame;
  if (braced) {
    const b = braceFor(fm);
    a.join(a.brace('braceF', b, fm, legs[0]!, legs[1]!, '-z'), legs[0]!, legs[1]!);
    a.join(a.brace('braceB', b, fm, legs[3]!, legs[2]!, 'z'), legs[3]!, legs[2]!);
  }
  return a.done([...(deck ? ['stress.bending', 'beam.simply-supported.udl'] : []), 'stress.axial', 'buckling.euler'], [
    `${stand ? 'Stand' : 'Frame'} ${mm(W)} × ${mm(D)}, ${mm(H)} high, for ${load} kg.`,
    ...(deck ? [`Top: ${mm(deck.t)} ${deckM.name}${Number.isFinite(deck.stress) ? `, sag ${(deck.sag * 1000).toFixed(1)} mm at full load` : ''}.`] : []),
    `Posts: ${p.label} in ${fm.name}; rails: ${r.label}; sized at ${SAFETY}×.`,
    ...(braced ? ['Diagonals on the long sides: tall and narrow, it would rack without them.'] : []),
  ]);
}

/** A deck laid on an incline from the floor to a height, on caps resting on posts under its high end and every metre along it. */
function ramp(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  const L = sizeOf(spec, 'width'), W = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height'), load = spec.load ?? DEFAULTS.ramp.load;
  const deckM = getMaterial(spec.material ?? 'wood.birch-plywood'), fm = frameMaterial(deckM);
  const ang = Math.atan2(H, L), S = Math.hypot(L, H);
  const bays = Math.max(1, Math.ceil(L / 1));
  const deck = sheetFor(deckM, L / bays, W, (load * g) / bays, sheets(deckM));
  const deckMass = deckM.density * S * W * deck.t;
  const cap = railFor(fm, W, ((load + deckMass) * g) / (bays + 1));
  const p = legFor(fm, H, ((load + deckMass) * g) / (2 * (bays + 1)));
  const inset = p.wide / 2 + 0.01;
  const a = new Plan_(tag);
  // the root: the deck on its slope, its centre half the rise up plus half its thickness (its underside runs through H/2 at the middle)
  const d = a.member('deck', 'plate', `length=${f(S)} width=${f(W)} thickness=${f(deck.t)}`, deckM.id, 'carries');
  a.relations.push({ how: 'laid', member: d, at: [ox, H / 2 + (deck.t / 2) / Math.cos(ang) + 0.0005, oz], rot: `rot z ${deg(ang)}` });
  let legs = 0, stations = 0;
  for (let k = 0; k <= bays; k++) {
    // a station from the high end down; the cap's top meets the deck's underside at the cap's downhill edge
    const x = ox + L / 2 - (k * L) / bays - inset;
    const under = H / 2 + 0.0005 + (x - cap.t / 2 - ox) * (H / L);
    const postH = under - 0.0005 - cap.h;
    if (postH < 0.05) continue;
    const mine = [-1, 1].map((sz) => a.post(`leg${legs++}`, p, fm, x, oz + sz * (W / 2 - inset), postH));
    const c = a.on(`cap${k}`, cap.kind, `${cap.params} length=${f(W)}`, fm, mine, 'cap', { rot: 'rot x 90 rot y 90' });
    a.join(c, ...mine);
    a.join(d, c);
    stations++;
  }
  return a.done(['stress.bending', 'beam.simply-supported.udl', 'stress.axial', 'buckling.euler'], [`Ramp ${mm(L)} long rising ${mm(H)} (${deg(ang)}°), ${mm(W)} wide, for ${load} kg.`, `Deck: ${mm(deck.t)} ${deckM.name} on ${cap.label} caps at ${stations} station${stations === 1 ? '' : 's'}, on ${p.label} posts; the low end rests on the floor.`]);
}

/** Two leaning sides of stiles and rungs meeting at the top: it stands as a triangle. */
function ladder(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  const H = sizeOf(spec, 'height'), W = sizeOf(spec, 'width'), load = spec.load ?? DEFAULTS.ladder.load;
  const m = getMaterial(spec.material ?? 'wood.douglas-fir');
  const fm = frameMaterial(m);
  const lean = Math.PI / 12; // 15° from vertical each side
  const S = H / Math.cos(lean);
  const stile = legFor(fm, S, (load * g) / 2);
  const rung = railFor(fm, W, load * g);
  const pitch = defaultOf(PERSON_SUBJECT, 'rung pitch') ?? 0.3;
  const n = Math.max(2, Math.floor(H / pitch));
  const a = new Plan_(tag);
  for (const [side, sx] of [['A', 1], ['B', -1]] as const) {
    // the front side's stiles W apart outside to outside; the back side's just outside them, so the two meet face to face at the top
    const half = side === 'A' ? W / 2 - stile.side / 2 : W / 2 + stile.side / 2 + 0.0005;
    const foot = ox + sx * H * Math.tan(lean);
    const stiles = [-half, half].map((z, i) => { const nm = a.member(`stile${side}${i}`, stile.kind, stile.params, fm.id, 'support'); a.relations.push({ how: 'from-to', member: nm, from: [foot, 0, oz + z], to: [ox, H, oz + z] }); return nm; });
    for (let k = 1; k <= n; k++) {
      const y = (k * H) / (n + 1);
      const r = a.member(`rung${side}${k}`, rung.kind, rung.params, fm.id, 'stood-on');
      a.relations.push({ how: 'between', member: r, a: stiles[0]!, b: stiles[1]!, height: y });
      a.join(r, ...stiles);
    }
  }
  a.join(`${tag}stileA0`, `${tag}stileB0`);
  a.join(`${tag}stileA1`, `${tag}stileB1`);
  return a.done(['stress.axial', 'buckling.euler', 'stress.bending', 'beam.simply-supported.udl'], [`Stepladder ${mm(H)} high, ${mm(W)} wide, ${n} rungs a side, for ${load} kg on a rung.`, `Stiles: ${stile.label} in ${fm.name} leaning ${deg(lean)}° each way; rungs: ${rung.label}.`]);
}

/** A seat on four legs with aprons; the rear legs stand just behind the seat and rise to carry a back. */
function chair(spec: DesignSpec, ox: number, oz: number, tag: string): Structured {
  const W = sizeOf(spec, 'width'), D = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height'), load = spec.load ?? DEFAULTS.chair.load;
  const seatM = getMaterial(spec.material ?? 'wood.douglas-fir'), fm = frameMaterial(seatM);
  const seat = sheetFor(seatM, W, D, load * g, sheets(seatM));
  const seatMass = seatM.density * W * D * seat.t;
  const legL = H - seat.t;
  const leg = legFor(fm, legL, ((load + seatMass) * g) / 4);
  const back = 0.4, backT = isWood(seatM) ? 0.012 : 0.003;
  const inset = leg.wide / 2 + 0.01;
  const zRear = oz + D / 2 + leg.wide / 2 + 0.0005;
  const a = new Plan_(tag);
  const legs = ([[-1, -1, false], [1, -1, false], [1, 1, true], [-1, 1, true]] as const).map(([sx, sz, rear], i) =>
    a.post(`leg${i}`, leg, fm, ox + sx * (W / 2 - inset), rear ? zRear : oz + sz * (D / 2 - inset), rear ? H + back : legL));
  // the seat on the front legs' tops, centred on its own footprint (the rear legs stand behind it, taller)
  const s = a.on('seat', 'plate', `length=${f(W)} width=${f(D)} thickness=${f(seat.t)}`, seatM, [legs[0]!, legs[1]!], 'seat', { offset: [0, D / 2 - inset] });
  a.join(s, ...legs);
  const apron = railFor(fm, Math.max(W, D), ((load + seatMass) * g) / 4);
  a.join(a.rail('apronF', apron, fm, legs[0]!, legs[1]!, { under: s }), legs[0]!, legs[1]!, s);
  a.join(a.rail('apronB', apron, fm, legs[3]!, legs[2]!, { height: legL - apron.h / 2 - 0.0005 }), legs[3]!, legs[2]!);
  a.join(a.rail('apronL', apron, fm, legs[0]!, legs[3]!, { under: s }), legs[0]!, legs[3]!, s);
  a.join(a.rail('apronR', apron, fm, legs[1]!, legs[2]!, { under: s }), legs[1]!, legs[2]!, s);
  // the back: a board between the rear legs, upright, at the height of the shoulders
  const b = a.member('back', 'plate', `width=${f(back * 0.6)} thickness=${f(backT)}`, seatM.id, 'back');
  a.relations.push({ how: 'between', member: b, a: legs[3]!, b: legs[2]!, height: H + back - (back * 0.6) / 2, rot: 'rot x 90' });
  a.join(b, legs[2]!, legs[3]!);
  return a.done(['stress.bending', 'beam.simply-supported.udl', 'stress.axial', 'buckling.euler'], [`Chair: seat ${mm(W)} × ${mm(D)} at ${mm(H)}, back ${mm(back)} up, for ${load} kg.`, `Seat: ${mm(seat.t)} ${seatM.name}; legs: ${leg.label} in ${fm.name}; aprons: ${apron.label}; sized at ${SAFETY}×.`]);
}
