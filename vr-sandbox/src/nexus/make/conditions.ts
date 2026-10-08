// Conditions on anything made, read from whatever is said with it, and applied to whatever is made: how old and worn it
// is, where it stands (indoors, outdoors, by the sea, in the cold, in space), what it is made of, how big, who it is for.
// None of this is about one thing: a condition changes parts by their materials and their sizes, so "an old rusty car",
// "a bed made of gold", "a tiny house", "a lamp post by the sea" all come out of the same few rules.
//
// Densities added for materials that may be asked for (typical values): gold 19,300, silver 10,490, titanium 4,500,
// carbon fibre composite 1,600, marble 2,700, ice 917, bamboo 700, chocolate 1,300, cardboard 690 kg/m³.

import type { Surface } from '../surface';
import { DENSITY, type Part } from '../kits';

export interface Conditions {
  /** 0 new … 1 derelict */ age: number;
  env: 'indoor' | 'outdoor' | 'marine' | 'cold' | 'hot' | 'space' | null;
  /** what its structure is made of, if said */ material: string | null;
  /** its size over what it would be */ scale: number;
  /** for a child: sized to one (about 0.7 of an adult's reach, typical) */ child: boolean;
  said: string[];
}
for (const [m, d] of [['gold', 19300], ['silver', 10490], ['titanium', 4500], ['carbon-fibre', 1600], ['marble', 2700], ['ice', 917], ['bamboo', 700], ['chocolate', 1300], ['cardboard', 690]] as const) DENSITY[m] ??= d;

const MATERIAL_WORDS: [RegExp, string, number][] = [
  [/\b(gold|golden)\b/, 'gold', 0xd4af37], [/\bsilver\b/, 'silver', 0xc0c0c8], [/\btitanium\b/, 'titanium', 0x8a8f96], [/\bcarbon[- ]?fib(?:re|er)\b/, 'carbon-fibre', 0x1c1d20],
  [/\bmarble\b/, 'marble', 0xece8e0], [/\b(ice(?! ?cream)|frozen)\b/, 'ice', 0xcfe8f6], [/\bbamboo\b/, 'bamboo', 0xc8b06a], [/\bchocolate\b/, 'chocolate', 0x4a2a18], [/\b(cardboard|carton)\b/, 'cardboard', 0xb08a5a],
  [/\b(oak|oaken)\b/, 'oak', 0x9a7448], [/\b(wood|wooden|timber)\b/, 'wood', 0xa07848], [/\b(steel|iron)\b/, 'steel-low', 0x8a8f96], [/\b(alumin(?:i)?um)\b/, 'al-6061', 0xc8ccd2],
  [/\b(glass)\b/, 'glass', 0xcfe4ee], [/\b(concrete)\b/, 'concrete', 0xa8a49c], [/\b(stone|granite)\b/, 'granite', 0x8a8682], [/\b(plastic)\b/, 'abs', 0xe8e8e8], [/\b(copper)\b/, 'copper', 0xb87333], [/\b(brick)\b/, 'brick', 0xa0482c],
];
// named as what it is made of even without "made of": not silver (a colour of paint as often as a metal)
const EXOTIC = new Set(['gold', 'titanium', 'carbon-fibre', 'marble', 'ice', 'bamboo', 'chocolate', 'cardboard']);
/** Conditions read from the words. */
export function readConditions(words: string): Conditions {
  const t = words.toLowerCase(), said: string[] = [];
  const age = /\b(derelict|abandoned|ruined|wreck(?:ed)?|rotting|decrepit)\b/.test(t) ? 0.95 : /\b(rusty|rusted|weathered|worn out|beat up|beaten up|battered)\b/.test(t) ? 0.8 : /\b(old|vintage|antique|aged|used|second.?hand)\b/.test(t) ? 0.55 : /\b(brand new|new|pristine|mint|showroom)\b/.test(t) ? 0 : 0.12;
  if (age >= 0.5) said.push(age > 0.9 ? 'derelict: rusted through, faded and dirty' : age > 0.7 ? 'weathered: rust where steel is bare, its paint faded' : 'old: worn where it is touched, its paint dulled');
  else if (age === 0) said.push('brand new: not a mark on it');
  const env = /\b(underwater|under the sea|by the sea|seaside|beach|marine|salt|ocean|harbou?r|boat)\b/.test(t) ? 'marine' : /\b(arctic|antarctic|frozen|snow|winter|−\d+ ?°c|-\d+ ?°c|cold)\b/.test(t) ? 'cold' : /\b(desert|hot|tropical|sahara)\b/.test(t) ? 'hot' : /\b(space|orbit|moon|mars|vacuum)\b/.test(t) ? 'space' : /\b(outdoors?|outside|garden|street|park|yard|field)\b/.test(t) ? 'outdoor' : /\b(indoors?|inside|room|kitchen|bedroom|office|house)\b/.test(t) ? 'indoor' : null;
  if (env) said.push(`for ${env === 'marine' ? 'salt air and water: stainless fasteners, sealed joints' : env === 'cold' ? 'the cold' : env === 'hot' ? 'heat and sun' : env === 'space' ? 'vacuum' : env === 'outdoor' ? 'outdoors: rain runs off it' : 'indoors'}`);
  // said outright ("made of oak", "built from stone"), or an unusual material named as what it is ("a golden bed", "an ice
  // castle", "a chocolate house"): not "steel rims", which is a choice of its parts
  const m = /\b(?:made (?:of|from|out of)|built (?:of|from|out of)|carved (?:from|out of)|cast in)\s+(?:solid |pure |real )?(\w+(?:[- ]\w+)?)\b/.exec(t);
  const named = m ? MATERIAL_WORDS.find(([re]) => re.test(m[1]!)) : MATERIAL_WORDS.filter(([, x]) => EXOTIC.has(x)).find(([re]) => re.test(t)) ?? (/\bwooden\b/.test(t) ? MATERIAL_WORDS.find(([, x]) => x === 'wood') : undefined);
  const material = named ? named[1] : null; if (material) said.push(`its structure made of ${material.replace('-', ' ')}`);
  const scale = /\b(tiny|miniature|mini|toy|pocket)\b/.test(t) ? 0.1 : /\b(giant|gigantic|huge|enormous|colossal)\b/.test(t) ? 10 : /\b(small|little)\b/.test(t) ? 0.6 : /\b(big|large)\b/.test(t) ? 1.5 : 1;
  if (scale !== 1) said.push(`${scale < 1 ? 'made small' : 'made big'}: ${scale}× its usual size (and its mass ${+(scale ** 3).toPrecision(2)}× with it)`);
  const child = /\b(for (?:a |my )?(?:kid|child|toddler|baby)|kid'?s|children'?s|child'?s)\b/.test(t); if (child) said.push('sized for a child: about 0.7 of an adult\'s reach (typical)');
  return { age, env, material, scale, child, said };
}

const STRUCTURE = new Set(['wood', 'oak', 'steel-low', 'steel-alloy', 'stainless-304', 'al-6061', 'al-6063', 'abs', 'pp', 'nylon', 'concrete', 'brick', 'granite', 'render', 'cast-iron', 'copper']);
const COLOUR: Record<string, number> = Object.fromEntries(MATERIAL_WORDS.map(([, m, c]) => [m, c]));
/** The conditions applied to a thing: its structure's material changed (what is glass, rubber, cloth or food stays so),
 *  its size scaled (every place and shape), for a child scaled to one. Returns the thing changed, and what changed. */
export function applyConditions(root: Part, c: Conditions): { part: Part; did: string[] } {
  const did: string[] = []; let swapped = 0;
  const k = c.scale * (c.child ? 0.7 : 1);
  const walk = (p: Part): Part => {
    const q: Part = { ...p };
    if (c.material && q.mat && STRUCTURE.has(q.mat) && q.mat !== c.material) { q.mat = c.material; q.color = COLOUR[c.material] ?? q.color; swapped++; }
    if (c.env === 'marine' && q.mat === 'steel-low' && !c.material) { q.mat = 'stainless-304'; swapped++; }
    if (k !== 1) { if (q.at) q.at = q.at.map((x) => x * k) as Part['at']; if (q.shape) q.shape = scaleShape(q.shape, k); if (q.shell) q.shell *= k; if (q.kg !== undefined) q.kg *= k ** 3; }
    if (p.parts) q.parts = p.parts.map(walk);
    return q;
  };
  const part = walk(root);
  if (swapped) did.push(`${swapped} parts' material changed (${c.material ?? 'stainless steel for the sea'})`);
  if (k !== 1) did.push(`every part scaled by ${+k.toPrecision(2)}`);
  return { part, did };
}
function scaleShape(s: NonNullable<Part['shape']>, k: number): NonNullable<Part['shape']> {
  if ('box' in s) return { box: s.box.map((x) => x * k) as [number, number, number] };
  if ('cyl' in s) return { cyl: s.cyl[2] !== undefined ? [s.cyl[0] * k, s.cyl[1] * k, s.cyl[2] * k] : [s.cyl[0] * k, s.cyl[1] * k] };
  if ('sphere' in s) return { sphere: s.sphere * k };
  if ('cone' in s) return { cone: [s.cone[0] * k, s.cone[1] * k] };
  if ('torus' in s) return { torus: [s.torus[0] * k, s.torus[1] * k] };
  if ('capsule' in s) return { capsule: [s.capsule[0] * k, s.capsule[1] * k] };
  if ('loft' in s) return { loft: { st: s.loft.st.map((x) => ({ ...x, x: x.x * k, w: x.w * k, lo: x.lo * k, hi: x.hi * k })) } };
  if ('tube' in s) return { tube: { ...s.tube, r: s.tube.r * k, pts: s.tube.pts.map((q) => q.map((v) => v * k) as [number, number, number]), ...(s.tube.wall ? { wall: s.tube.wall * k } : {}), ...(s.tube.bend ? { bend: s.tube.bend * k } : {}) } };
  if ('lathe' in s) return { lathe: s.lathe.map(([r, y]) => [r * k, y * k] as [number, number]) };
  // (a skin scaled as a whole: its net scaled, the same skin at each scale shared, so what is known of it is kept)
  if ('surf' in s) { const pt = s.surf; return { surf: { ...pt, s: scaledSkin(pt.s, k), ...(pt.off !== undefined ? { off: pt.off * k } : {}) } }; }
  return s;
}
const scaled = new WeakMap<Surface, Map<number, Surface>>();
function scaledSkin(sf: Surface, k: number): Surface {
  let m = scaled.get(sf); if (!m) { m = new Map(); scaled.set(sf, m); }
  let out = m.get(k); if (!out) { out = { ...sf, net: sf.net.map((col) => col.map((P) => [P[0] * k, P[1] * k, P[2] * k] as [number, number, number])) }; m.set(k, out); }
  return out;
}
