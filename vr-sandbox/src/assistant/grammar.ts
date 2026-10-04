// Structures from function and constraints. Not one generator per thing: a small grammar of what a structure is made
// of, each piece sized by the laws for the load it carries, composed by relation into whatever was asked.
//
//   deck    a sheet that carries the load across a span: sized for bending and sag (stress.bending, beam.simply-supported.udl)
//   post    a column that carries its share to the ground: sized for crushing and buckling (stress.axial, buckling.euler)
//   rail    a beam between two posts, under a deck or flush with their tops: sized for bending and sag on edge
//   brace   a diagonal across a bay, so a frame of posts and rails does not rack (racking is a mechanism, not a strength)
//   stile   a leaning post of a ladder; rung, a rail between two stiles
//
// Only the roots are placed at coordinates: posts standing on the floor, a deck laid on a slope, stiles from foot to
// apex. Everything else is said by relation in Forge (forge.ts: on, under, between … under/flush/height, across) and the
// host resolves it from the parts that are there, so a rail is exactly as long as the gap it spans, a cap rests on
// its posts, a rung meets leaning stiles where they are at its height, a brace lies flat on the faces it ties. Nothing
// is placed by arithmetic that could leave a gap. Every design goes to her stand (src/mind) to be tested, where
// racking gets its bracing.

import { getMaterial, STANDARD_GRAVITY as g, type Material } from '../data/materials';
import { LUMBER } from '../parts/registry';
import { DEFAULTS, f, isMetal, isWood, legFor, mm, SAFETY, SAG, sheetFor, sheets, sizeOf, type DesignSpec, type Plan } from './designer';

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

/** Posts and rails in the deck's material where it is wood or metal; stone and plastic decks stand on steel. */
const frameMaterial = (deckM: Material) => (isWood(deckM) || isMetal(deckM) ? deckM : getMaterial('steel.a36'));

/** A post standing on the floor at (x, z), its top at h. */
const post = (name: string, p: ReturnType<typeof legFor>, m: Material, x: number, z: number, h: number) => `place ${p.kind} ${p.params} length=${f(h)} mat ${m.id} at ${f(x)} ${f(h / 2)} ${f(z)} rot z 90 as ${name}`;
/** A rail on edge between two posts: under a deck, flush with the posts' tops, or at a height. */
const rail = (name: string, r: { kind: string; params: string }, m: Material, a: string, b: string, at: { under: string } | { flush: string } | { height: number }) =>
  `place ${r.kind} ${r.params} mat ${m.id} between ${a} ${b} ${'under' in at ? `under ${at.under}` : 'flush' in at ? `flush ${at.flush}` : `height ${f(at.height)}`} rot x 90 as ${name}`;
/** A brace flat on the faces of two posts, on one side, low on the first to high on the second. */
const brace = (name: string, b: { kind: string; params: string }, m: Material, a: string, c: string, side: 'x' | '-x' | 'z' | '-z') => `place ${b.kind} ${b.params} mat ${m.id} across ${a} ${c} side ${side} rot x 90 as ${name}`;
const joins = (a: string, ...bs: string[]) => bs.map((b) => `join ${a} ${b}`);
const count = (lines: string[]) => lines.filter((l) => l.startsWith('place')).length;

/** A structure for what was asked, placed with its footprint centred on (ox, oz) on the floor. */
export function structure(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
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
function bridge(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
  const L = sizeOf(spec, 'width'), W = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height'), load = spec.load ?? DEFAULTS.bridge.load;
  const deckM = getMaterial(spec.material ?? 'wood.douglas-fir'), fm = frameMaterial(deckM);
  const deck = sheetFor(deckM, L, W, load * g, sheets(deckM));
  const deckMass = deckM.density * L * W * deck.t;
  const cap = railFor(fm, W, ((load + deckMass) * g) / 2);
  const postH = H - deck.t - cap.h;
  const p = legFor(fm, postH, ((load + deckMass) * g) / 4);
  const inset = p.wide / 2 + 0.01;
  const lines: string[] = [];
  let legs = 0;
  for (const [pier, sx] of [['A', -1], ['B', 1]] as const) {
    const x = ox + sx * (L / 2 - inset);
    const mine = [-1, 1].map((sz) => { const name = `${tag}leg${legs++}`; lines.push(post(name, p, fm, x, oz + sz * (W / 2 - inset), postH)); return name; });
    // the cap: the pier's rail, resting on its two posts, across the pier
    lines.push(`place ${cap.kind} ${cap.params} length=${f(W)} mat ${fm.id} on ${mine.join(' ')} rot x 90 rot y 90 as ${tag}cap${pier}`);
    lines.push(...joins(`${tag}cap${pier}`, ...mine));
  }
  lines.push(`place plate length=${f(L)} width=${f(W)} thickness=${f(deck.t)} mat ${deckM.id} on ${tag}capA ${tag}capB as ${tag}deck`);
  lines.push(...joins(`${tag}deck`, `${tag}capA`, `${tag}capB`));
  if (spec.aprons) {
    // low rails between the piers on each side, and a diagonal on each side: the piers cannot rack along the span
    const b = braceFor(fm);
    const yLow = Math.min(0.15, postH / 2);
    lines.push(rail(`${tag}railL`, b, fm, `${tag}leg0`, `${tag}leg2`, { height: yLow }), ...joins(`${tag}railL`, `${tag}leg0`, `${tag}leg2`));
    lines.push(rail(`${tag}railR`, b, fm, `${tag}leg1`, `${tag}leg3`, { height: yLow }), ...joins(`${tag}railR`, `${tag}leg1`, `${tag}leg3`));
    lines.push(brace(`${tag}braceL`, b, fm, `${tag}leg0`, `${tag}leg2`, '-z'), ...joins(`${tag}braceL`, `${tag}leg0`, `${tag}leg2`));
    lines.push(brace(`${tag}braceR`, b, fm, `${tag}leg1`, `${tag}leg3`, 'z'), ...joins(`${tag}braceR`, `${tag}leg1`, `${tag}leg3`));
  }
  return {
    forge: lines.join('\n'), laws: ['stress.bending', 'beam.simply-supported.udl', 'stress.axial', 'buckling.euler'],
    notes: [
      `Bridge ${mm(L)} long, ${mm(W)} wide, deck ${mm(H)} up, for ${load} kg.`,
      `Deck: ${mm(deck.t)} ${deckM.name}${Number.isFinite(deck.stress) ? `, stress ${(deck.stress / 1e6).toFixed(1)} MPa at full load (${SAFETY}× under its strength), sag ${(deck.sag * 1000).toFixed(1)} mm` : ' (the thickest standard sheet: it will be highly stressed)'}.`,
      `Two piers: ${p.label} posts in ${fm.name} under a ${cap.label} cap, each sized for its share at ${SAFETY}×.`,
      ...(spec.aprons ? ['Low rails and diagonals between the piers, so it does not rack along the span.'] : []),
    ],
    parts: count(lines),
  };
}

/** Four posts with rails between them; a stand carries a deck on top. */
function frame(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
  const stand = spec.what === 'stand';
  const W = sizeOf(spec, 'width'), D = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height'), load = spec.load ?? DEFAULTS[spec.what].load;
  const deckM = getMaterial(spec.material ?? (stand ? 'wood.douglas-fir' : 'steel.a36')), fm = frameMaterial(deckM);
  const deck = stand ? sheetFor(deckM, W, D, load * g, sheets(deckM)) : null;
  const deckMass = deck ? deckM.density * W * D * deck.t : 0;
  const r = railFor(fm, Math.max(W, D), ((load + deckMass) * g) / 2);
  const postH = H - (deck?.t ?? 0);
  const p = legFor(fm, postH, ((load + deckMass) * g) / 4);
  const inset = p.wide / 2 + 0.01;
  const lines: string[] = [];
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const legs = corners.map(([sx, sz], i) => { const name = `${tag}leg${i}`; lines.push(post(name, p, fm, ox + sx * (W / 2 - inset), oz + sz * (D / 2 - inset), postH)); return name; });
  if (deck) { lines.push(`place plate length=${f(W)} width=${f(D)} thickness=${f(deck.t)} mat ${deckM.id} on ${legs.join(' ')} as ${tag}deck`); lines.push(...joins(`${tag}deck`, ...legs)); }
  const at = deck ? { under: `${tag}deck` } : { flush: legs[0]! };
  for (const [name, a, b] of [['railF', 0, 1], ['railB', 3, 2], ['railL', 0, 3], ['railR', 1, 2]] as const) {
    lines.push(rail(`${tag}${name}`, r, fm, legs[a]!, legs[b]!, at), ...joins(`${tag}${name}`, legs[a]!, legs[b]!, ...(deck ? [`${tag}deck`] : [])));
  }
  const braced = spec.aprons || H / Math.min(W, D) > 1.5;
  if (braced) {
    // diagonals on the two long sides: a frame of posts and rails is a mechanism until something triangulates it
    const b = braceFor(fm);
    lines.push(brace(`${tag}braceF`, b, fm, legs[0]!, legs[1]!, '-z'), ...joins(`${tag}braceF`, legs[0]!, legs[1]!));
    lines.push(brace(`${tag}braceB`, b, fm, legs[3]!, legs[2]!, 'z'), ...joins(`${tag}braceB`, legs[3]!, legs[2]!));
  }
  return {
    forge: lines.join('\n'), laws: [...(deck ? ['stress.bending', 'beam.simply-supported.udl'] : []), 'stress.axial', 'buckling.euler'],
    notes: [
      `${stand ? 'Stand' : 'Frame'} ${mm(W)} × ${mm(D)}, ${mm(H)} high, for ${load} kg.`,
      ...(deck ? [`Top: ${mm(deck.t)} ${deckM.name}${Number.isFinite(deck.stress) ? `, sag ${(deck.sag * 1000).toFixed(1)} mm at full load` : ''}.`] : []),
      `Posts: ${p.label} in ${fm.name}; rails: ${r.label}; sized at ${SAFETY}×.`,
      ...(braced ? ['Diagonals on the long sides: tall and narrow, it would rack without them.'] : []),
    ],
    parts: count(lines),
  };
}

/** A deck laid on an incline from the floor to a height, on caps resting on posts under its high end and every metre along it. */
function ramp(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
  const L = sizeOf(spec, 'width'), W = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height'), load = spec.load ?? DEFAULTS.ramp.load;
  const deckM = getMaterial(spec.material ?? 'wood.birch-plywood'), fm = frameMaterial(deckM);
  const a = Math.atan2(H, L), S = Math.hypot(L, H);
  const bays = Math.max(1, Math.ceil(L / 1));
  const deck = sheetFor(deckM, L / bays, W, (load * g) / bays, sheets(deckM));
  const deckMass = deckM.density * S * W * deck.t;
  const cap = railFor(fm, W, ((load + deckMass) * g) / (bays + 1));
  const p = legFor(fm, H, ((load + deckMass) * g) / (2 * (bays + 1)));
  const inset = p.wide / 2 + 0.01;
  // the root: the deck on its slope, its centre half the rise up plus half its thickness (its underside runs through H/2 at the middle)
  const lines = [`place plate length=${f(S)} width=${f(W)} thickness=${f(deck.t)} mat ${deckM.id} at ${f(ox)} ${f(H / 2 + (deck.t / 2) / Math.cos(a) + 0.0005)} ${f(oz)} rot z ${deg(a)} as ${tag}deck`];
  let legs = 0, stations = 0;
  for (let k = 0; k <= bays; k++) {
    // a station from the high end down; the cap's top meets the deck's underside at the cap's downhill edge
    const x = ox + L / 2 - (k * L) / bays - inset;
    const under = H / 2 + 0.0005 + (x - cap.t / 2 - ox) * (H / L);
    const postH = under - 0.0005 - cap.h;
    if (postH < 0.05) continue;
    const mine = [-1, 1].map((sz) => { const name = `${tag}leg${legs++}`; lines.push(post(name, p, fm, x, oz + sz * (W / 2 - inset), postH)); return name; });
    lines.push(`place ${cap.kind} ${cap.params} length=${f(W)} mat ${fm.id} on ${mine.join(' ')} rot x 90 rot y 90 as ${tag}cap${k}`);
    lines.push(...joins(`${tag}cap${k}`, ...mine), `join ${tag}deck ${tag}cap${k}`);
    stations++;
  }
  return {
    forge: lines.join('\n'), laws: ['stress.bending', 'beam.simply-supported.udl', 'stress.axial', 'buckling.euler'],
    notes: [`Ramp ${mm(L)} long rising ${mm(H)} (${deg(a)}°), ${mm(W)} wide, for ${load} kg.`, `Deck: ${mm(deck.t)} ${deckM.name} on ${cap.label} caps at ${stations} station${stations === 1 ? '' : 's'}, on ${p.label} posts; the low end rests on the floor.`],
    parts: count(lines),
  };
}

/** Two leaning sides of stiles and rungs meeting at the top: it stands as a triangle. */
function ladder(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
  const H = sizeOf(spec, 'height'), W = sizeOf(spec, 'width'), load = spec.load ?? DEFAULTS.ladder.load;
  const m = getMaterial(spec.material ?? 'wood.douglas-fir');
  const fm = frameMaterial(m);
  const lean = Math.PI / 12; // 15° from vertical each side
  const S = H / Math.cos(lean);
  const stile = legFor(fm, S, (load * g) / 2);
  const rung = railFor(fm, W, load * g);
  const n = Math.max(2, Math.floor(H / 0.3));
  const lines: string[] = [];
  for (const [side, sx] of [['A', 1], ['B', -1]] as const) {
    // the front side's stiles W apart outside to outside; the back side's just outside them, so the two meet face to face at the top
    const half = side === 'A' ? W / 2 - stile.side / 2 : W / 2 + stile.side / 2 + 0.0005;
    const foot = ox + sx * H * Math.tan(lean);
    const stiles = [-half, half].map((z, i) => { const name = `${tag}stile${side}${i}`; lines.push(`place ${stile.kind} ${stile.params} mat ${fm.id} from ${f(foot)} 0 ${f(oz + z)} to ${f(ox)} ${f(H)} ${f(oz + z)} as ${name}`); return name; });
    for (let k = 1; k <= n; k++) {
      const y = (k * H) / (n + 1);
      lines.push(`place ${rung.kind} ${rung.params} mat ${fm.id} between ${stiles[0]} ${stiles[1]} height ${f(y)} as ${tag}rung${side}${k}`, ...joins(`${tag}rung${side}${k}`, ...stiles));
    }
  }
  // the two sides meet at the top
  lines.push(`join ${tag}stileA0 ${tag}stileB0`, `join ${tag}stileA1 ${tag}stileB1`);
  return {
    forge: lines.join('\n'), laws: ['stress.axial', 'buckling.euler', 'stress.bending', 'beam.simply-supported.udl'],
    notes: [`Stepladder ${mm(H)} high, ${mm(W)} wide, ${n} rungs a side, for ${load} kg on a rung.`, `Stiles: ${stile.label} in ${fm.name} leaning ${deg(lean)}° each way; rungs: ${rung.label}.`],
    parts: count(lines),
  };
}

/** A seat on four legs with aprons; the rear legs stand just behind the seat and rise to carry a back. */
function chair(spec: DesignSpec, ox: number, oz: number, tag: string): Plan {
  const W = sizeOf(spec, 'width'), D = sizeOf(spec, 'depth'), H = sizeOf(spec, 'height'), load = spec.load ?? DEFAULTS.chair.load;
  const seatM = getMaterial(spec.material ?? 'wood.douglas-fir'), fm = frameMaterial(seatM);
  const seat = sheetFor(seatM, W, D, load * g, sheets(seatM));
  const seatMass = seatM.density * W * D * seat.t;
  const legL = H - seat.t;
  const leg = legFor(fm, legL, ((load + seatMass) * g) / 4);
  const back = 0.4, backT = isWood(seatM) ? 0.012 : 0.003;
  const inset = leg.wide / 2 + 0.01;
  const zRear = oz + D / 2 + leg.wide / 2 + 0.0005;
  const lines: string[] = [];
  const legs = ([[-1, -1, false], [1, -1, false], [1, 1, true], [-1, 1, true]] as const).map(([sx, sz, rear], i) => {
    const name = `${tag}leg${i}`;
    lines.push(post(name, leg, fm, ox + sx * (W / 2 - inset), rear ? zRear : oz + sz * (D / 2 - inset), rear ? H + back : legL));
    return name;
  });
  // the seat on the front legs' tops, centred on its own footprint (the rear legs stand behind it, taller)
  lines.push(`place plate length=${f(W)} width=${f(D)} thickness=${f(seat.t)} mat ${seatM.id} on ${legs[0]} ${legs[1]} offset 0 ${f(D / 2 - inset)} as ${tag}seat`);
  lines.push(...joins(`${tag}seat`, ...legs));
  const apron = railFor(fm, Math.max(W, D), ((load + seatMass) * g) / 4);
  lines.push(rail(`${tag}apronF`, apron, fm, legs[0]!, legs[1]!, { under: `${tag}seat` }), ...joins(`${tag}apronF`, legs[0]!, legs[1]!, `${tag}seat`));
  lines.push(rail(`${tag}apronB`, apron, fm, legs[3]!, legs[2]!, { height: legL - apron.h / 2 - 0.0005 }), ...joins(`${tag}apronB`, legs[3]!, legs[2]!));
  lines.push(rail(`${tag}apronL`, apron, fm, legs[0]!, legs[3]!, { under: `${tag}seat` }), ...joins(`${tag}apronL`, legs[0]!, legs[3]!, `${tag}seat`));
  lines.push(rail(`${tag}apronR`, apron, fm, legs[1]!, legs[2]!, { under: `${tag}seat` }), ...joins(`${tag}apronR`, legs[1]!, legs[2]!, `${tag}seat`));
  // the back: a board between the rear legs, upright, at the height of the shoulders
  lines.push(`place plate width=${f(back * 0.6)} thickness=${f(backT)} mat ${seatM.id} between ${legs[3]} ${legs[2]} height ${f(H + back - (back * 0.6) / 2)} rot x 90 as ${tag}back`, ...joins(`${tag}back`, legs[2]!, legs[3]!));
  return {
    forge: lines.join('\n'), laws: ['stress.bending', 'beam.simply-supported.udl', 'stress.axial', 'buckling.euler'],
    notes: [`Chair: seat ${mm(W)} × ${mm(D)} at ${mm(H)}, back ${mm(back)} up, for ${load} kg.`, `Seat: ${mm(seat.t)} ${seatM.name}; legs: ${leg.label} in ${fm.name}; aprons: ${apron.label}; sized at ${SAFETY}×.`],
    parts: count(lines),
  };
}
