// Kits: makers of things, each a set of choices (a tree's species, height, season; a house's storeys, roof, walls; a car's
// body, colour, wheels) and a way of building what is chosen as a tree of parts, every part made of a material the
// inventory knows down to its elements. A kit can use other kits (a street is a road, its lamp posts, the houses along
// it, trees and cars), so the things there are multiply: the count of each kit is the product of its choices, times the
// count of every kit it uses, as many times as it uses it (counted exactly, as a power of ten). Nothing is drawn here
// (src/nexus/view/kit3d.ts draws it).
//
// Sizes are real where they have a source (named), else typical; masses are worked out from each part's shape and its
// material's density (estimates: the shapes are simple). A prop blaster is a shape only: it does not work as a weapon.

import { VEHICLE_KITS, useMass } from './machines';
import { latheArea, latheVolume, loftArea, loftVolume, tubeLength, tubeVolume, type Lathe, type Loft, type Tube } from './form';

export type V3 = [number, number, number];
export type Shape =
  | { box: V3 } | { cyl: [r: number, h: number, r2?: number] } | { sphere: number } | { cone: [r: number, h: number] }
  | { torus: [R: number, r: number] } | { capsule: [r: number, h: number] }
  /** a body through cross-sections along x (src/nexus/form.ts) */ | { loft: Loft }
  /** a round tube along a path, bent round at its corners */ | { tube: Tube }
  /** a profile of [radius, height] spun about y */ | { lathe: Lathe }
  | { stars: { n: number; arms: number; pitch: number; radius: number; bulge: number; kind: 'spiral' | 'barred' | 'elliptical' | 'lenticular' | 'irregular'; flat: number; tint: number; seed: number } }
  | { field: { size: number; relief: number; kind: string; water: number; seed: number; color: number } }
  /** a heap of like things: so many, each its size, piled in a cone so wide and high (drawn as up to 20,000 of them) */
  | { heap: { n: number; size: V3; r: number; h: number; colors: number[]; seed: number } };
/** What a part offers another where they meet, or asks of it: a shaft and the bore it goes in, studs and the nuts on
 *  them, a drive and the shaft it turns. Checked where they meet, with numbers (src/nexus/make/critic.ts contracts). */
export interface Iface {
  kind: 'shaft' | 'studs' | 'drive' | 'chain'; role: 'provides' | 'requires';
  /** a shaft's or a stud's diameter, or a chain's pitch, m */ d?: number; /** how many (studs) */ n?: number;
  /** N·m: what a drive delivers (provides), or the most a driven shaft carries (requires) */ torque?: number;
  /** the part it goes to by name, where they do not touch (a chain drive and the axle it turns) */ to?: string; says?: string;
}
export interface Part {
  name: string; shape?: Shape; at?: V3; rot?: V3; color?: number; mat?: string;
  /** a hollow shape's wall, m (its mass is its surface times this) */ shell?: number;
  /** the share of its shape that is solid (a vented disc, an engine's block round its cavities) */ fill?: number;
  /** grows from its base, not its middle (a branch from the trunk): its shape stands on its own origin */ base?: boolean;
  /** a limb that swings as it moves: about which axis, how far (radians), at what point in the stride (0–1) */ swing?: { axis: 'x' | 'z'; amp: number; phase: number };
  /** its mass taken as typical where its shape does not say it (a car's wiring, its fluids), kg */ kg?: number;
  /** how it is made where its material alone does not say (a car's pressed panels, round as they are styled) */ make?: 'pressed';
  /** it gives light: lumens, and the colour of it */ light?: { lm: number; color: number };
  /** it goes round its holder's middle once in so many seconds (an orbit) */ spin?: number;
  /** what it gives as food, kcal */ kcal?: number;
  /** a round part drawn with so many flat sides (a hex head: 6) */ facets?: number;
  /** it glows (a lamp's light, lit or not) */ glow?: boolean;
  /** how its surface looks at its true size, as its material and making leave it: grain, brick, tread, weave… */ finish?: string;
  /** how worn it is, 0 new to 1 derelict */ wear?: number;
  /** it goes on public roads (and so carries number plates and mirrors) */ road?: boolean;
  /** made as one piece with what holds it (a tyre's tread blocks, a casting's fins): held by being part of it */ one?: boolean;
  /** what it offers or asks of the parts it meets */ iface?: Iface[];
  /** its maker's published mass, kg: what is not drawn (its part named "the rest of it") makes up the difference */ published?: number;
  /** the kit that made it, on the root of each thing a kit makes (a street's cars and houses each carry theirs) */ kit?: string;
  /** what it is in the inventory (an item's id) or the words its family makes it from ("bolt M12x40", "tube 32x2"): so it
   *  opens into what it is made of, down to the elements, and is drawn as that item looks where it has no shape of its own */ item?: string;
  /** added by the make pipeline's attention to detail, and by which rule (so it can be taken off and added again) */ detail?: string;
  parts?: Part[]; says?: string;
}
export type Pick = Record<string, string | number>;
export interface Choice { key: string; name: string; options: readonly (string | number)[]; unit?: string }
export interface Kit {
  id: string; name: string; words: RegExp; choices: Choice[];
  /** the kits it uses, and how many of each (counted into the kinds there are) */ uses?: { kit: string; n: number }[];
  build(c: Pick, r: () => number, sub: (kit: string, over?: Pick) => Part): Part;
  says: string;
  /** how what it makes moves, where it moves: walking, waddling, swimming or flying, at what speed and stride rate */
  moves?: (c: Pick) => { kind: 'walk' | 'waddle' | 'swim' | 'fly'; speed: number; freq: number; height: number; says: string };
  /** what it does when nothing else is asked: follows you, wanders, swims past */
  does?: 'follow' | 'wander' | 'swim past' | 'hover';
}

/** Densities, kg/m³ (typical values). */
export const DENSITY: Record<string, number> = {
  'steel-low': 7850, 'steel-tool': 7850, 'steel-spring': 7850, 'steel-alloy': 7850, 'stainless-304': 8000, 'cast-iron': 7200, 'al-6061': 2700, 'al-6063': 2700, copper: 8960,
  wood: 500, oak: 750, glass: 2500, brick: 1900, concrete: 2400, granite: 2700, rubber: 1150, abs: 1050, pp: 905, pc: 1200, pmma: 1190, nylon: 1140,
  cotton: 80, foam: 35, leather: 860, asphalt: 2300, water: 1000, soil: 1500, leaf: 600, render: 1800, tile: 2000, silk: 1300, stingray: 1100,
  pe: 950, pu: 1200, fibreglass: 1850, 'al-a380': 2710, 'al-5052': 2680,
  tissue: 1050, foliage: 1.5, battery: 1500, petrol: 740, diesel: 840, bread: 250, cheese: 1100, ham: 1050, tomato: 1000, lettuce: 400, butter: 911, chicken: 1050, egg: 1030, avocado: 1000, bacon: 1000,
};
const vol = (s: Shape): number => {
  if ('box' in s) return s.box[0] * s.box[1] * s.box[2];
  if ('cyl' in s) { const [r, h, r2 = r] = s.cyl; return (Math.PI * h * (r * r + r * r2 + r2 * r2)) / 3; }
  if ('sphere' in s) return (4 / 3) * Math.PI * s.sphere ** 3;
  if ('cone' in s) return (Math.PI * s.cone[0] ** 2 * s.cone[1]) / 3;
  if ('torus' in s) return 2 * Math.PI ** 2 * s.torus[0] * s.torus[1] ** 2;
  if ('capsule' in s) return Math.PI * s.capsule[0] ** 2 * (s.capsule[1] + (4 / 3) * s.capsule[0]);
  if ('loft' in s) return loftVolume(s.loft);
  if ('tube' in s) return tubeVolume(s.tube);
  if ('lathe' in s) return latheVolume(s.lathe);
  // a heap: each brick's solid plastic, 0.386 of its box (a 2×4 brick's 2.3 g of ABS at 1,050 kg/m³ in its 31.8 × 11.3 × 15.8 mm)
  if ('heap' in s) return s.heap.n * s.heap.size[0] * s.heap.size[1] * s.heap.size[2] * 0.386;
  return 0;
};
const area = (s: Shape): number => {
  if ('box' in s) { const [a, b, c] = s.box; return 2 * (a * b + a * c + b * c); }
  if ('cyl' in s) { const [r, h] = s.cyl; return 2 * Math.PI * r * (r + h); }
  if ('sphere' in s) return 4 * Math.PI * s.sphere ** 2;
  if ('torus' in s) return 4 * Math.PI ** 2 * s.torus[0] * s.torus[1];
  if ('loft' in s) return loftArea(s.loft);
  if ('tube' in s) return tubeLength(s.tube) * 2 * Math.PI * s.tube.r;
  if ('lathe' in s) return latheArea(s.lathe);
  return 0;
};
/** A part's mass, kg: its own (shape and material's density, or its wall where it is hollow) and its parts'. */
export function massOf(p: Part): number {
  const own = p.kg !== undefined ? p.kg : p.shape && p.mat && DENSITY[p.mat] ? (p.shell ? area(p.shape) * p.shell : vol(p.shape)) * DENSITY[p.mat]! * (p.fill ?? 1) : 0;
  return own + (p.parts ?? []).reduce((a, q) => a + massOf(q), 0);
}
/** How many parts it has, all the way down. */
export const countParts = (p: Part): number => 1 + (p.parts ?? []).reduce((a, q) => a + countParts(q), 0);

const COLOURS: [string, number][] = [['white', 0xf2f2ee], ['black', 0x17181a], ['silver', 0xb8bcc2], ['grey', 0x6c7076], ['red', 0xb3202a], ['blue', 0x1f4fa8], ['green', 0x2f6a3a], ['yellow', 0xe8c22a], ['orange', 0xe0702a], ['brown', 0x6a4426], ['beige', 0xd8c8a4], ['purple', 0x5a2a7a]];
const darken = (c: number, k: number): number => (Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k);
const colour = (name: string | number): number => (typeof name === 'number' ? name : COLOURS.find(([n]) => n === name)?.[1] ?? 0x888888);
const P = (name: string, shape: Shape | undefined, at: V3, more: Partial<Part> = {}): Part => ({ name, ...(shape ? { shape } : {}), at, ...more });
const range = (lo: number, hi: number, step: number): number[] => { const out: number[] = []; for (let x = lo; x <= hi + 1e-9; x += step) out.push(+x.toFixed(4)); return out; };
const seeds = (n: number) => range(1, n, 1);

export const KITS: Kit[] = [];
const kit = (k: Kit) => { KITS.push(k); return k; };
/** A kit made elsewhere (creatures.ts) added to the rest. */
export const addKit = (k: Kit): Kit => kit(k);

// ---- a tree: its trunk as thick as its height asks (D ∝ H^1.5: McMahon 1973, elastic similarity; the coefficient an
// estimate), branches in two orders, its crown by species and season ----
// a palm does not thicken as it grows (a monocot: no secondary growth), its trunk about 35 cm across at any height (typical of a coconut palm)
const SPECIES: Record<string, { bark: number; leaf: number; crown: 'round' | 'cone' | 'palm' | 'drooping' | 'flat'; fall: number; bloom?: number; ever?: boolean; fat?: number; D?: number }> = {
  oak: { bark: 0x5a4632, leaf: 0x3e6a2c, crown: 'round', fall: 0x9a6a2a }, pine: { bark: 0x5c3e2a, leaf: 0x24502c, crown: 'cone', fall: 0x24502c, ever: true },
  birch: { bark: 0xe8e4dc, leaf: 0x6a9a3a, crown: 'round', fall: 0xe0b030 }, palm: { bark: 0x8a6a48, leaf: 0x3a7a34, crown: 'palm', fall: 0x3a7a34, ever: true, D: 0.35 },
  maple: { bark: 0x5a4a3a, leaf: 0x4a7a2e, crown: 'round', fall: 0xc8381e }, willow: { bark: 0x5a4a34, leaf: 0x7a9a44, crown: 'drooping', fall: 0xb0a040 },
  baobab: { bark: 0x8a7a68, leaf: 0x5a7a34, crown: 'flat', fall: 0x8a7a40, fat: 3 }, cherry: { bark: 0x4a2a24, leaf: 0x4a7a34, crown: 'round', fall: 0xb04a24, bloom: 0xf4b8c8 },
};
kit({
  id: 'tree', name: 'tree', words: /\b(trees?|oak|pine|birch|palm tree|maple|willow|baobab|cherry tree|sapling)\b/, says: 'a tree: its trunk thickness from its height by elastic similarity (McMahon 1973), branches in two orders, its crown by species and season',
  choices: [{ key: 'species', name: 'species', options: Object.keys(SPECIES) }, { key: 'height', name: 'height', options: range(4, 30, 1), unit: 'm' }, { key: 'season', name: 'season', options: ['spring', 'summer', 'autumn', 'winter'] },
    { key: 'lean', name: 'lean', options: [0, 4, 8, 12], unit: '°' }, { key: 'crown', name: 'crown', options: ['sparse', 'normal', 'dense'] }, { key: 'seed', name: 'shape', options: seeds(1000) }],
  build(c, r) {
    const sp = SPECIES[c.species as string]!, H = c.height as number, D = sp.D ?? 0.006 * H ** 1.5 * (sp.fat ?? 1), season = c.season as string, dense = { sparse: 0.6, normal: 1, dense: 1.4 }[c.crown as string]!;
    const leafC = season === 'autumn' ? sp.fall : season === 'spring' && sp.bloom ? sp.bloom : sp.leaf, bare = season === 'winter' && !sp.ever;
    const trunkH = sp.crown === 'palm' ? H : sp.crown === 'cone' ? H * 0.95 : H * 0.55, lean = ((c.lean as number) * Math.PI) / 180;
    const trunk = P('trunk', { cyl: [D / 2 * (sp.crown === 'palm' ? 0.8 : 0.55), trunkH, D / 2] }, [0, trunkH / 2, 0], { color: sp.bark, mat: 'wood', rot: [0, 0, lean] });
    const crown: Part[] = [];
    if (sp.crown === 'palm') for (let k = 0; k < 9; k++) crown.push(P(`frond ${k + 1}`, { box: [0.35, 0.02, H * 0.22] }, [0, H, 0], { color: sp.leaf, mat: 'leaf', rot: [-0.6, (k / 9) * Math.PI * 2, 0] }));
    else if (sp.crown === 'cone') for (let k = 0; k < 6; k++) crown.push(P(`whorl ${k + 1}`, { cone: [H * (0.24 - k * 0.032) * dense ** 0.3, H * 0.22] }, [0, H * (0.22 + k * 0.13), 0], { color: leafC, mat: 'foliage' }));
    else {
      const branches: Part[] = [], nb = Math.round(5 + 3 * dense);
      for (let k = 0; k < nb; k++) {
        const a = (k / nb) * Math.PI * 2 + r(), y = trunkH * (0.8 + 0.25 * r()), L = H * (sp.crown === 'flat' ? 0.35 : 0.28) * (0.8 + 0.4 * r()), tilt = sp.crown === 'drooping' ? 0.9 : sp.crown === 'flat' ? 1.3 : 0.75;
        const twigs: Part[] = []; for (let j = 0; j < 3; j++) twigs.push(P(`twig ${j + 1}`, { cyl: [D * 0.03, L * 0.45, D * 0.06] }, [0, L * (0.45 + 0.18 * j), 0], { color: sp.bark, mat: 'wood', base: true, rot: [0, j * 2.1, 0.6] }));
        // the leaves in clumps at the twigs' ends and the branch's, as a crown is
        if (!bare) for (let j = 0; j < 4; j++) twigs.push(P(`leaf clump ${j + 1}`, sp.crown === 'drooping' ? { cone: [L * 0.3, H * 0.35] } : { sphere: L * (0.22 + 0.08 * r()) * dense ** 0.4 }, j === 3 ? [0, L, 0] : [Math.sin(j * 2.1 + 0.6) * L * 0.25, L * (0.75 + 0.1 * j), Math.cos(j * 2.1) * L * 0.2], { color: leafC, mat: 'foliage', ...(sp.crown === 'drooping' ? { rot: [Math.PI, 0, 0] } : {}) }));
        branches.push(P(`branch ${k + 1}`, { cyl: [D * 0.06, L, D * 0.13] }, [0, y, 0], { color: sp.bark, mat: 'wood', base: true, rot: [0, a, tilt], parts: twigs }));
      }
      crown.push(...branches);
      if (!bare) crown.push(P('crown', { sphere: H * (sp.crown === 'flat' ? 0.22 : 0.17) * dense ** 0.35 }, [0, trunkH + H * 0.22, 0], { color: leafC, mat: 'foliage' }));
    }
    return P(`${season} ${c.species} tree, ${H} m`, undefined, [0, 0, 0], { parts: [trunk, ...crown, P('roots', { cone: [D * 1.6, D * 1.2] }, [0, 0.05, 0], { color: sp.bark, mat: 'wood', fill: 0.3 })], says: sp.D ? `trunk ${(D * 100).toFixed(0)} cm across at any height (a palm does not thicken)` : `trunk ${(D * 100).toFixed(0)} cm across at the ground for its ${H} m (D ∝ H^1.5)` });
  },
});

// ---- a plant ----
const PLANTS: Record<string, { stem: number; head: 'flower' | 'disc' | 'cup' | 'fronds' | 'blades' | 'ball' | 'column' | 'rosette' | 'spike'; h: [number, number] }> = {
  rose: { stem: 0x2e5a24, head: 'cup', h: [0.4, 1.5] }, tulip: { stem: 0x4a7a2a, head: 'cup', h: [0.25, 0.6] }, sunflower: { stem: 0x4a7a2a, head: 'disc', h: [1, 3] }, daisy: { stem: 0x4a7a2a, head: 'flower', h: [0.15, 0.6] },
  fern: { stem: 0x3a6a2a, head: 'fronds', h: [0.3, 1.2] }, grass: { stem: 0x5a8a34, head: 'blades', h: [0.1, 0.8] }, bush: { stem: 0x3a5a2a, head: 'ball', h: [0.5, 2] },
  cactus: { stem: 0x3f7a3a, head: 'column', h: [0.2, 2.5] }, succulent: { stem: 0x6a9a7a, head: 'rosette', h: [0.05, 0.3] }, lavender: { stem: 0x5a7a4a, head: 'spike', h: [0.3, 0.9] },
};
kit({
  id: 'plant', name: 'plant', words: /\b(plants?|flowers?|rose|tulip|sunflower|daisy|fern|grass|bush|shrub|cactus|succulent|lavender|potted plant)\b/, says: 'a plant: its kind, its height within that kind\'s (typical), its flower\'s colour, a clump of them, a pot',
  choices: [{ key: 'kind', name: 'kind', options: Object.keys(PLANTS) }, { key: 'size', name: 'size', options: [0, 0.25, 0.5, 0.75, 1] }, { key: 'colour', name: 'flower colour', options: ['red', 'yellow', 'white', 'purple', 'orange', 'blue', 'pink', 'magenta'] },
    { key: 'clump', name: 'how many', options: [1, 3, 5, 9] }, { key: 'pot', name: 'pot', options: ['none', 'clay pot', 'ceramic pot'] }, { key: 'seed', name: 'shape', options: seeds(100) }],
  build(c, r) {
    const k = PLANTS[c.kind as string]!, h = k.h[0] + (k.h[1] - k.h[0]) * (c.size as number), col = { pink: 0xf08ab0, magenta: 0xc8288a }[c.colour as string] ?? colour(c.colour as string), n = c.clump as number, out: Part[] = [];
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = n > 1 ? 0.06 + 0.12 * Math.sqrt(r()) * Math.sqrt(n) : 0, hh = h * (0.8 + 0.4 * r()), at: V3 = [Math.cos(a) * d, 0, Math.sin(a) * d], parts: Part[] = [];
      if (k.head === 'column') parts.push(P('body', { capsule: [hh * 0.12, hh * 0.8] }, [0, hh / 2, 0], { color: k.stem, mat: 'leaf' }));
      else if (k.head === 'ball') parts.push(P('foliage', { sphere: hh / 2 }, [0, hh / 2, 0], { color: k.stem, mat: 'foliage' }));
      else if (k.head === 'rosette') for (let j = 0; j < 8; j++) parts.push(P(`leaf ${j + 1}`, { cone: [hh * 0.25, hh] }, [0, hh * 0.3, 0], { color: k.stem, mat: 'leaf', rot: [1.1, (j / 8) * 6.28, 0] }));
      else if (k.head === 'fronds' || k.head === 'blades') for (let j = 0; j < (k.head === 'blades' ? 12 : 7); j++) parts.push(P(`${k.head === 'blades' ? 'blade' : 'frond'} ${j + 1}`, { box: [k.head === 'blades' ? 0.006 : 0.08, hh, 0.003] }, [0, hh / 2, 0], { color: k.stem, mat: 'leaf', rot: [0.25 + 0.3 * r(), r() * 6.28, 0] }));
      else {
        parts.push(P('stem', { cyl: [0.004 * (k.head === 'disc' ? 4 : 1), hh] }, [0, hh / 2, 0], { color: k.stem, mat: 'leaf' }));
        parts.push(P(k.head === 'spike' ? 'flower spike' : 'flower', k.head === 'disc' ? { cyl: [hh * 0.1, 0.03] } : k.head === 'spike' ? { capsule: [0.008, hh * 0.25] } : k.head === 'cup' ? { cone: [0.03, 0.05] } : { cyl: [0.022, 0.006] }, [0, hh, 0], { color: k.head === 'disc' ? 0xe8c22a : k.head === 'spike' ? 0x8a6ac8 : col, mat: 'leaf', ...(k.head === 'cup' ? { rot: [Math.PI, 0, 0] } : {}) }));
        if (k.head === 'disc') parts.push(P('seed head', { cyl: [hh * 0.05, 0.035] }, [0, hh + 0.005, 0], { color: 0x4a2a14, mat: 'leaf' }));
      }
      out.push(P(`${c.kind} ${i + 1}`, undefined, at, { parts }));
    }
    if (c.pot !== 'none') out.push(P(c.pot as string, { cyl: [0.12 + 0.05 * Math.sqrt(n), 0.2, 0.09 + 0.04 * Math.sqrt(n)] }, [0, -0.1, 0], { color: c.pot === 'clay pot' ? 0xb0603a : 0xe8e4dc, mat: 'brick' }));
    return P(`${n > 1 ? `${n} ` : ''}${c.kind}${n > 1 ? 's' : ''}${c.pot !== 'none' ? ` in a ${c.pot}` : ''}`, undefined, [0, c.pot !== 'none' ? 0.2 : 0, 0], { parts: out });
  },
});

// ---- a house: storeys 2.7 m (typical), doors 0.9 by 2.1 m, sills at 0.9 m (typical) ----
kit({
  id: 'house', name: 'house', words: /\b(houses?|home|cottage|bungalow|villa|townhouse|mansion house)\b/, says: 'a house: its storeys 2.7 m each, its walls of brick, timber, stone, render or glass, its roof, windows, door, chimney, porch and garage',
  choices: [{ key: 'storeys', name: 'storeys', options: [1, 2, 3] }, { key: 'w', name: 'width', options: [6, 8, 10, 12], unit: 'm' }, { key: 'd', name: 'depth', options: [6, 8, 10], unit: 'm' },
    { key: 'roof', name: 'roof', options: ['gable', 'hip', 'flat', 'mansard', 'shed'] }, { key: 'walls', name: 'walls', options: ['brick', 'timber', 'stone', 'render', 'glass'] },
    { key: 'colour', name: 'wall colour', options: ['white', 'beige', 'grey', 'red', 'blue', 'green', 'yellow', 'brown'] }, { key: 'roofColour', name: 'roof colour', options: ['grey', 'black', 'red', 'brown', 'green', 'blue'] },
    { key: 'windows', name: 'windows across', options: [2, 3, 4, 5] }, { key: 'door', name: 'door', options: ['single', 'double'] }, { key: 'chimney', name: 'chimney', options: ['no', 'yes'] }, { key: 'porch', name: 'porch', options: ['no', 'yes'] }, { key: 'garage', name: 'garage', options: ['no', 'yes'] }],
  build(c) {
    const n = c.storeys as number, W = c.w as number, D = c.d as number, sh = 2.7, wall = c.walls as string, mat = { brick: 'brick', timber: 'wood', stone: 'granite', render: 'render', glass: 'glass' }[wall]!;
    const wc = wall === 'brick' && c.colour === 'white' ? 0xa8502e : wall === 'stone' ? 0x9a948a : wall === 'glass' ? 0x9ac8e0 : colour(c.colour as string), rc = colour(c.roofColour as string), t = wall === 'glass' ? 0.02 : 0.25, nw = c.windows as number;
    const storeys: Part[] = [];
    for (let s = 0; s < n; s++) {
      const y = s * sh, walls: Part[] = [];
      for (const [side, len, at, rotY] of [['front', W, [0, y + sh / 2, D / 2], 0], ['back', W, [0, y + sh / 2, -D / 2], Math.PI], ['left', D, [-W / 2, y + sh / 2, 0], -Math.PI / 2], ['right', D, [W / 2, y + sh / 2, 0], Math.PI / 2]] as const) {
        const openings: Part[] = [], cols = side === 'front' || side === 'back' ? nw : Math.max(1, nw - 1);
        for (let k = 0; k < cols; k++) {
          const x = (k - (cols - 1) / 2) * (len / cols);
          if (s === 0 && side === 'front' && k === Math.floor(cols / 2)) { openings.push(P(`${c.door} front door`, { box: [c.door === 'double' ? 1.6 : 0.9, 2.1, 0.06] }, [x, 2.1 / 2 - sh / 2, t / 2 + 0.01], { color: 0x5a3018, mat: 'wood' })); continue; }
          openings.push(P(`window ${k + 1}`, undefined, [x, 0.9 + 0.65 - sh / 2, t / 2 + 0.01], { parts: [P('frame', { box: [1.2, 1.3, 0.08] }, [0, 0, 0], { color: 0xf2f2ee, mat: 'wood' }), P('glass', { box: [1.05, 1.15, 0.01] }, [0, 0, 0.045], { color: 0x9ac8e0, mat: 'glass' })] }));
        }
        // a wall's solid share: a brick or stone cavity wall about 0.8 masonry, a timber frame about a quarter wood (the rest
        // insulation; typical), less what its windows and doors take out of it
        const holes = openings.reduce((a, o) => a + (o.name.includes('door') ? (c.door === 'double' ? 1.6 : 0.9) * 2.1 : 1.2 * 1.3), 0), solid = wall === 'timber' ? 0.25 : wall === 'glass' ? 1 : 0.8;
        walls.push(P(`${side} wall`, { box: [len, sh, t] }, at as unknown as V3, { rot: [0, rotY, 0], color: wc, mat, fill: solid * (1 - holes / (len * sh)), parts: openings }));
      }
      // the ground floor a concrete slab on the ground; the floors above timber joists under boards (about 15 % wood by volume, typical)
      storeys.push(P(s === 0 ? 'ground floor' : `floor ${s + 1}`, undefined, [0, 0, 0], { parts: [s === 0 ? P('floor slab', { box: [W, 0.15, D] }, [0, y + 0.075, 0], { color: 0x8a8a84, mat: 'concrete' }) : P('joists and boards', { box: [W, 0.25, D] }, [0, y + 0.125, 0], { color: 0xb08a5a, mat: 'wood', fill: 0.15 }), ...walls] }));
    }
    const top = n * sh, roof: Part[] = [], rk = c.roof as string;
    if (rk === 'flat') roof.push(P('flat roof', { box: [W + 0.4, 0.3, D + 0.4] }, [0, top + 0.15, 0], { color: rc, mat: 'concrete', fill: 0.5 }));
    else if (rk === 'shed') roof.push(P('shed roof', { box: [W + 0.6, 0.15, D + 0.6] }, [0, top + 0.7, 0], { color: rc, mat: 'tile', fill: 0.25, rot: [0.2, 0, 0] }));
    else if (rk === 'mansard') { roof.push(P('mansard', { cyl: [Math.hypot(W, D) / 2 * 0.62, 1.6, Math.hypot(W, D) / 2 * 0.72] }, [0, top + 0.8, 0], { color: rc, mat: 'tile', fill: 0.05, rot: [0, Math.PI / 4, 0] })); }
    else if (rk === 'hip') roof.push(P('hip roof', { cone: [Math.hypot(W, D) / 2 * 1.02, Math.min(W, D) * 0.4] }, [0, top + Math.min(W, D) * 0.2, 0], { color: rc, mat: 'tile', fill: 0.02, rot: [0, Math.PI / 4, 0] }));
    else { const pitch = 0.6, half = W / 2 / Math.cos(pitch); for (const sgn of [1, -1]) roof.push(P(`roof slope ${sgn > 0 ? 'left' : 'right'}`, { box: [half + 0.3, 0.12, D + 0.5] }, [(-sgn * W) / 4, top + (W / 4) * Math.tan(pitch), 0], { color: rc, mat: 'tile', fill: 0.25, rot: [0, 0, sgn * pitch] })); }
    const extra: Part[] = [];
    if (c.chimney === 'yes') extra.push(P('chimney', { box: [0.7, 2.2, 0.7] }, [W * 0.3, top + 1.2, -D * 0.2], { color: 0x8a3a24, mat: 'brick' }));
    if (c.porch === 'yes') extra.push(P('porch', undefined, [0, 0, D / 2 + 1], { parts: [P('porch floor', { box: [3, 0.15, 2] }, [0, 0.075, 0], { color: 0x6a4426, mat: 'wood' }), P('porch roof', { box: [3.2, 0.1, 2.2] }, [0, 2.5, 0], { color: rc, mat: 'tile' }), ...[-1.4, 1.4].map((x, i) => P(`post ${i + 1}`, { box: [0.12, 2.4, 0.12] }, [x, 1.2, 0.9], { color: 0xf2f2ee, mat: 'wood' }))] }));
    if (c.garage === 'yes') extra.push(P('garage', undefined, [W / 2 + 3, 0, 0], { parts: [P('garage walls', { box: [6, 2.6, 6.5] }, [0, 1.3, 0], { color: wc, mat, shell: 0.2 }), P('garage door', { box: [2.6, 2.1, 0.05] }, [0, 1.05, 3.27], { color: 0xd8d8d0, mat: 'steel-low' }), P('garage roof', { box: [6.3, 0.2, 6.8] }, [0, 2.7, 0], { color: rc, mat: 'concrete' })] }));
    return P(`${n}-storey ${wall} house with a ${rk} roof`, undefined, [0, 0, 0], { parts: [P('foundation', { box: [W + 0.3, 0.5, D + 0.3] }, [0, -0.15, 0], { color: 0x6a6a64, mat: 'concrete', fill: 0.25, says: 'strip footings under the walls (about a quarter of the footprint, an estimate)' }), ...storeys, P('roof', undefined, [0, 0, 0], { parts: roof }), ...extra], says: `${W} by ${D} m, ${n} storey${n > 1 ? 's' : ''} of 2.7 m` });
  },
});

// cars, karts, ATVs, motorcycles, forklifts, trucks and lawn tractors: one maker for every wheeled machine
// (src/nexus/machines.ts), each kit only what can be chosen
for (const k of VEHICLE_KITS) kit(k);
useMass(massOf);

// ---- a lamp post: its light by its lamp (high-pressure sodium about 100 lm/W at 2,000 K; LED street lights about 140
// lm/W, typical), spaced about three times its height along a road (typical) ----
const LAMPS: Record<string, { lmPerW: number; W: number; color: number }> = { 'sodium lamp': { lmPerW: 100, W: 150, color: 0xffa040 }, 'warm LED': { lmPerW: 140, W: 80, color: 0xffd8a8 }, 'cool LED': { lmPerW: 140, W: 80, color: 0xe8f0ff }, globe: { lmPerW: 120, W: 60, color: 0xfff0d8 }, lantern: { lmPerW: 120, W: 40, color: 0xffe0b0 } };
kit({
  id: 'lamp post', name: 'lamp post', words: /\b(lamp ?posts?|street ?lights?|street ?lamps?|light ?posts?|lampposts?)\b/, says: 'a lamp post: its height, its arm, its lamp (and so its lumens and colour), its pole',
  choices: [{ key: 'h', name: 'height', options: [4, 6, 8, 10, 12], unit: 'm' }, { key: 'arm', name: 'arm', options: ['none', 'single', 'double', 'crook', 'bracket'] }, { key: 'lamp', name: 'lamp', options: Object.keys(LAMPS) },
    { key: 'pole', name: 'pole', options: ['galvanised steel', 'cast iron', 'aluminium', 'wood', 'concrete'] }, { key: 'colour', name: 'colour', options: ['grey', 'black', 'green', 'white', 'silver'] }],
  build(c) {
    const h = c.h as number, L = LAMPS[c.lamp as string]!, mat = { 'galvanised steel': 'steel-low', 'cast iron': 'cast-iron', aluminium: 'al-6063', wood: 'wood', concrete: 'concrete' }[c.pole as string]!, col = c.pole === 'wood' ? 0x6a4a2a : c.pole === 'concrete' ? 0x9a9a94 : colour(c.colour as string);
    const r0 = mat === 'wood' || mat === 'concrete' ? 0.12 : 0.08, heads: Part[] = [], lm = L.lmPerW * L.W;
    const head = (x: number, nm: string) => P(nm, c.lamp === 'globe' ? { sphere: 0.22 } : c.lamp === 'lantern' ? { box: [0.3, 0.45, 0.3] } : { box: [0.6, 0.12, 0.28] }, [x, h - 0.1, 0], { color: L.color, mat: c.lamp === 'globe' ? 'pmma' : 'al-6063', light: { lm, color: L.color } });
    const arms = c.arm === 'double' ? [-1, 1] : c.arm === 'none' ? [] : [1];
    for (const s of arms) { const len = c.arm === 'bracket' ? 0.6 : 1.4; heads.push(P(`arm${arms.length > 1 ? (s > 0 ? ' right' : ' left') : ''}`, { cyl: [0.035, len] }, [s * len / 2, h - (c.arm === 'crook' ? 0.3 : 0.25), 0], { color: col, mat, rot: [0, 0, Math.PI / 2] }), head(s * len, `luminaire${arms.length > 1 ? (s > 0 ? ' right' : ' left') : ''}`)); }
    if (!arms.length) heads.push(head(0, 'luminaire'));
    return P(`${h} m ${c.pole} lamp post`, undefined, [0, 0, 0], { parts: [P('base', { cyl: [r0 * 1.8, 0.6, r0 * 2.2] }, [0, 0.3, 0], { color: col, mat: mat === 'wood' ? 'concrete' : mat }), P('pole', { cyl: [r0 * 0.6, h, r0] }, [0, h / 2, 0], { color: col, mat, shell: mat === 'wood' || mat === 'concrete' ? undefined : 0.004 }), ...heads, P('foundation', { cyl: [0.4, 1.2] }, [0, -0.6, 0], { color: 0x7a7a74, mat: 'concrete' })],
      says: `${L.W} W ${c.lamp}: about ${Math.round(lm / 100) * 100} lm each at ${c.lamp === 'sodium lamp' ? '2,000' : c.lamp === 'cool LED' ? '4,000' : '3,000'} K; spaced about ${3 * h} m apart (typical)` });
  },
});

// ---- a road: lanes 3.65 m on a highway (12 ft, FHWA), 3.0–3.3 m on a street (typical) ----
kit({
  id: 'road', name: 'road', words: /\b(roads?|streets?|highway|motorway|avenue|lane|track|boulevard)\b/, says: 'a road: its kind, its lanes (3.65 m each on a highway, FHWA), its markings, pavements, and lamp posts along it',
  choices: [{ key: 'kind', name: 'kind', options: ['street', 'avenue', 'highway', 'country lane', 'dirt track', 'cobbled street'] }, { key: 'lanes', name: 'lanes', options: [1, 2, 3, 4, 6] }, { key: 'L', name: 'length', options: [50, 100, 200], unit: 'm' },
    { key: 'walk', name: 'pavements', options: ['none', 'one side', 'both sides'] }, { key: 'marks', name: 'markings', options: ['none', 'centre line', 'dashed lanes', 'double yellow'] }, { key: 'lamps', name: 'lamp posts', options: ['no', 'yes'] }],
  uses: [{ kit: 'lamp post', n: 8 }],
  build(c, _r, sub) {
    const kind = c.kind as string, lanes = kind === 'dirt track' || kind === 'country lane' ? Math.min(2, c.lanes as number) : (c.lanes as number), lw = kind === 'highway' ? 3.65 : kind === 'avenue' ? 3.3 : 3.0, L = c.L as number, W = lanes * lw;
    const surf = kind === 'dirt track' ? { color: 0x8a6a44, mat: 'soil' } : kind === 'cobbled street' ? { color: 0x6a6660, mat: 'granite' } : { color: 0x2a2b2e, mat: 'asphalt' };
    const parts: Part[] = [P(`${kind} surface`, { box: [W, 0.1, L] }, [0, 0.05, 0], surf)];
    if (c.marks !== 'none' && kind !== 'dirt track') {
      const yellow = c.marks === 'double yellow', dash = c.marks === 'dashed lanes', lines: Part[] = [];
      for (let k = 1; k < lanes; k++) { const x = -W / 2 + k * lw, centre = k === lanes / 2 || lanes === 1; if (!centre && !dash) continue;
        if (dash && !centre) for (let z = -L / 2 + 1.5; z < L / 2; z += 12) lines.push(P('dash', { box: [0.15, 0.01, 3] }, [x, 0.105, z], { color: 0xf2f2ee, mat: 'abs' }));
        else for (const o of yellow ? [-0.15, 0.15] : [0]) lines.push(P(yellow ? 'yellow line' : 'centre line', { box: [0.12, 0.01, L] }, [x + o, 0.105, 0], { color: yellow ? 0xe8c22a : 0xf2f2ee, mat: 'abs' })); }
      parts.push(P('markings', undefined, [0, 0, 0], { parts: lines }));
    }
    const sides = c.walk === 'both sides' ? [-1, 1] : c.walk === 'one side' ? [1] : [];
    for (const s of sides) parts.push(P(`pavement ${s > 0 ? 'right' : 'left'}`, undefined, [s * (W / 2 + 1), 0, 0], { parts: [P('kerb', { box: [0.15, 0.15, L] }, [-s * 0.95, 0.075, 0], { color: 0x9a9a94, mat: 'concrete' }), P('slabs', { box: [1.8, 0.12, L] }, [0, 0.06, 0], { color: 0xb0aea8, mat: 'concrete' })] }));
    if (c.lamps === 'yes') { const lp: Part[] = [], h = 8, step = 3 * h, side = sides.length ? sides : [1]; for (let z = -L / 2 + step / 2, i = 0; z < L / 2 && i < 8; z += step, i++) { const q = sub('lamp post', { h, arm: 'single' }); for (const s of side.slice(0, 1)) lp.push({ ...q, name: `lamp post ${i + 1}`, at: [s * (W / 2 + 0.6), 0, z], rot: [0, s > 0 ? Math.PI : 0, 0] }); } parts.push(P('lamp posts', undefined, [0, 0, 0], { parts: lp })); }
    return P(`${lanes}-lane ${kind}, ${L} m`, undefined, [0, 0, 0], { parts, says: `${lanes} lane${lanes > 1 ? 's' : ''} of ${lw} m: ${W.toFixed(1)} m of carriageway` });
  },
});

// ---- a bed: its mattress by the size named (UK: single 90 × 190 cm, double 135 × 190, king 150 × 200, super king
// 180 × 200; US queen 152 × 203, king 193 × 203) ----
const BEDS: Record<string, [number, number]> = { single: [0.9, 1.9], 'small double': [1.2, 1.9], double: [1.35, 1.9], queen: [1.52, 2.03], king: [1.93, 2.03], 'super king': [1.8, 2.0] };
kit({
  id: 'bed', name: 'bed', words: /\b(beds?|bunk ?bed|four[- ]poster|mattress)\b/, says: 'a bed: its size as the sizes are named, its frame, headboard, mattress and bedding',
  choices: [{ key: 'size', name: 'size', options: Object.keys(BEDS) }, { key: 'frame', name: 'frame', options: ['wooden', 'metal', 'upholstered', 'platform', 'four-poster', 'bunk'] }, { key: 'head', name: 'headboard', options: ['none', 'panel', 'slatted', 'padded', 'spindle'] },
    { key: 'mattress', name: 'mattress', options: [0.15, 0.2, 0.25, 0.3, 0.35], unit: 'm' }, { key: 'bedding', name: 'bedding', options: ['white', 'grey', 'blue', 'green', 'red', 'beige', 'black', 'yellow', 'purple', 'brown'] }, { key: 'pillows', name: 'pillows', options: [1, 2, 4, 6] }],
  build(c) {
    const [W, L] = BEDS[c.size as string]!, f = c.frame as string, fm = f === 'metal' ? 'steel-low' : 'wood', tube = f === 'metal' ? 0.0015 : undefined, fc = f === 'metal' ? 0x2a2a2a : f === 'upholstered' ? 0x6a6a74 : 0x8a5a32, mt = c.mattress as number, deck = f === 'platform' ? 0.2 : 0.35;
    // pillows in a row against the headboard, a second row in front when there are more than two
    const pillows = (n: number, y0: number, tag: string): Part[] => { const perRow = n > 2 ? Math.ceil(n / 2) : n, pw = Math.min(0.7, (W - 0.1) / perRow); return Array.from({ length: n }, (_, i) => P(`${tag}pillow ${i + 1}`, { box: [pw, 0.14, 0.45] }, [(((i % perRow) + 0.5) / perRow - 0.5) * (W - 0.1), y0 + deck + mt + 0.07 + (i >= perRow ? 0.1 : 0), -L / 2 + 0.3 + (i >= perRow ? 0.25 : 0)], { color: 0xf2f2ee, mat: 'cotton', fill: 0.25 })); };
    const one = (y0: number, tag: string): Part[] => {
      const slats = Array.from({ length: 14 }, (_, i) => P(`slat ${i + 1}`, { box: [W, 0.02, 0.07] }, [0, y0 + deck - 0.02, -L / 2 + 0.1 + i * ((L - 0.2) / 13)], { color: 0xc8a070, mat: 'wood' }));
      const legs = f === 'platform' ? [] : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => P(`leg ${i + 1}`, { box: [0.06, deck, 0.06] }, [x! * (W / 2 - 0.03), y0 + deck / 2, z! * (L / 2 - 0.03)], { color: fc, mat: fm, shell: tube }));
      const bedC = colour(c.bedding as string);
      return [P(`${tag}frame`, undefined, [0, 0, 0], { parts: [P('side rail left', { box: [0.04, 0.2, L] }, [-W / 2, y0 + deck - 0.1, 0], { color: fc, mat: fm, shell: tube }), P('side rail right', { box: [0.04, 0.2, L] }, [W / 2, y0 + deck - 0.1, 0], { color: fc, mat: fm, shell: tube }), ...legs, ...slats] }),
        P(`${tag}mattress`, undefined, [0, y0 + deck + mt / 2, 0], { parts: [P('pocket springs', { box: [W - 0.04, mt * 0.6, L - 0.04] }, [0, -mt * 0.15, 0], { color: 0xb8bcc2, mat: 'steel-spring', shell: 0.00005 }), P('comfort foam', { box: [W - 0.04, mt * 0.3, L - 0.04] }, [0, mt * 0.3, 0], { color: 0xf2eedc, mat: 'foam' }), P('cover', { box: [W, mt, L] }, [0, 0, 0], { color: 0xf2f2ee, mat: 'cotton', shell: 0.003 })] }),
        P(`${tag}duvet`, { box: [W + 0.1, 0.06, L * 0.75] }, [0, y0 + deck + mt + 0.03, L * 0.12], { color: bedC, mat: 'cotton', fill: 0.15, says: 'its filling mostly air: a duvet weighs 1–3 kg (typical)' }),
        ...pillows(Math.min(c.pillows as number, W < 1 ? 2 : 6), y0, tag)];
    };
    const parts = one(0, '');
    if (f === 'bunk') parts.push(...one(1.5, 'top bunk ').map((q) => ({ ...q })), P('ladder', { box: [0.4, 1.9, 0.04] }, [W / 2 + 0.05, 0.95, L / 2 - 0.3], { color: fc, mat: fm, rot: [0, Math.PI / 2, 0] }));
    if (f === 'four-poster') parts.push(...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => P(`post ${i + 1}`, { cyl: [0.04, 2.1] }, [x! * (W / 2), 1.05, z! * (L / 2)], { color: fc, mat: 'wood' })), P('canopy frame', { box: [W, 0.05, L] }, [0, 2.1, 0], { color: fc, mat: 'wood', shell: 0.01 }));
    if (c.head !== 'none') parts.push(P(`${c.head} headboard`, { box: [W + 0.08, c.head === 'padded' ? 0.7 : 0.55, c.head === 'padded' ? 0.1 : 0.04] }, [0, deck + mt + 0.25, -L / 2 - 0.03], { color: c.head === 'padded' ? 0x6a6a74 : fc, mat: c.head === 'padded' ? 'foam' : fm, ...(c.head !== 'padded' && tube ? { shell: tube } : c.head === 'slatted' || c.head === 'spindle' ? { fill: 0.4 } : {}) }));
    return P(`${c.size} ${f} bed`, undefined, [0, 0, 0], { parts, says: `mattress ${(W * 100).toFixed(0)} by ${(L * 100).toFixed(0)} cm, ${(mt * 100).toFixed(0)} cm deep` });
  },
});

// ---- a sword: its blade's length and width by type (typical of surviving and made examples), its mass from its steel
// (7,850 kg/m³) and its shape ----
const SWORDS: Record<string, { L: number; w: number; t: number; grip: number; curve: number; guard: string; pommel: string; grip0: string }> = {
  longsword: { L: 0.95, w: 0.048, t: 0.0034, grip: 0.24, curve: 0, guard: 'cross', pommel: 'wheel', grip0: 'leather' }, katana: { L: 0.71, w: 0.032, t: 0.0045, grip: 0.27, curve: 0.016, guard: 'disc (tsuba)', pommel: 'kashira cap', grip0: 'ray skin and silk' },
  gladius: { L: 0.55, w: 0.055, t: 0.0045, grip: 0.1, curve: 0, guard: 'disc', pommel: 'ball', grip0: 'wood' }, rapier: { L: 1.04, w: 0.024, t: 0.004, grip: 0.12, curve: 0, guard: 'swept hilt', pommel: 'scent-stopper', grip0: 'wire' },
  claymore: { L: 1.07, w: 0.052, t: 0.0042, grip: 0.36, curve: 0, guard: 'cross', pommel: 'wheel', grip0: 'leather' }, sabre: { L: 0.85, w: 0.032, t: 0.004, grip: 0.12, curve: 0.04, guard: 'basket', pommel: 'cap', grip0: 'leather' },
  scimitar: { L: 0.8, w: 0.04, t: 0.0042, grip: 0.12, curve: 0.08, guard: 'cross', pommel: 'cap', grip0: 'wood' }, 'viking sword': { L: 0.8, w: 0.052, t: 0.0035, grip: 0.1, curve: 0, guard: 'cross', pommel: 'lobed', grip0: 'leather' },
};
kit({
  id: 'sword', name: 'sword', words: /\b(swords?|katana|gladius|rapier|claymore|sabre|saber|scimitar|longsword|blade)\b/, says: 'a sword: its blade\'s length and width by type (typical), its steel, guard, grip and pommel, its mass from its shape',
  choices: [{ key: 'type', name: 'type', options: Object.keys(SWORDS) }, { key: 'len', name: 'blade length', options: [0.9, 0.95, 1, 1.05, 1.1] }, { key: 'steel', name: 'steel', options: ['1095 high-carbon', '1060', 'pattern-welded', 'T10', '5160 spring'] },
    { key: 'guard', name: 'guard', options: ['its own', 'cross', 'disc', 'S-curve', 'swept'] }, { key: 'grip', name: 'grip', options: ['its own', 'leather', 'wire', 'wood', 'cord'] }, { key: 'pommel', name: 'pommel', options: ['its own', 'wheel', 'ring', 'fishtail', 'ball'] }],
  build(c) {
    const s = SWORDS[c.type as string]!, L = s.L * (c.len as number), steelC = c.steel === 'pattern-welded' ? 0x9aa0a8 : c.steel === 'T10' ? 0xc0c4ca : 0xb4b8be, guard = c.guard === 'its own' ? s.guard : (c.guard as string), grip = c.grip === 'its own' ? s.grip0 : (c.grip as string), pommel = c.pommel === 'its own' ? s.pommel : (c.pommel as string);
    const segs = 6, blade: Part[] = []; for (let i = 0; i < segs; i++) { const t = (i + 0.5) / segs, wide = s.w * (1 - 0.55 * t); blade.push(P(i === segs - 1 ? 'point' : `blade section ${i + 1}`, i === segs - 1 ? { cone: [wide / 2, L / segs] } : { box: [wide, L / segs, s.t * (1 - 0.4 * t)] }, [s.curve * t * t * L, (i + 0.5) * (L / segs), 0], { color: steelC, mat: 'steel-tool', rot: [0, 0, -s.curve * 2 * t] })); }
    const gp = grip === 'leather' ? 'leather' : grip === 'wood' ? 'wood' : grip === 'wire' ? 'copper' : grip === 'ray skin and silk' ? 'silk' : 'cotton';
    return P(`${c.type}`, undefined, [0, 0, 0], { parts: [
      P('blade', undefined, [0, 0, 0], { parts: [...blade, ...(s.curve === 0 ? [P('fuller', { box: [s.w * 0.25, L * 0.7, s.t * 1.05] }, [0, L * 0.38, 0], { color: 0x8a8e94 })] : [])] }),
      P(`${guard} guard`, guard.startsWith('disc') ? { cyl: [0.04, 0.008] } : guard === 'basket' || guard === 'swept' || guard === 'swept hilt' ? { sphere: 0.06 } : { box: [guard === 'S-curve' ? 0.24 : 0.2, 0.02, 0.025] }, [0, -0.01, 0], { color: 0x8a7a5a, mat: 'steel-low' }),
      P(`${grip} grip`, { cyl: [0.014, s.grip] }, [0, -s.grip / 2 - 0.02, 0], { color: grip === 'ray skin and silk' ? 0x1a1a3a : grip === 'wire' ? 0xb08a4a : 0x4a2a14, mat: gp }),
      P(`${pommel} pommel`, pommel === 'wheel' ? { cyl: [0.03, 0.02] } : pommel === 'ring' ? { torus: [0.025, 0.007] } : { sphere: 0.025 }, [0, -s.grip - 0.04, 0], { color: 0x8a7a5a, mat: 'steel-low', ...(pommel === 'wheel' ? { rot: [Math.PI / 2, 0, 0] } : {}) }),
    ], says: `blade ${(L * 100).toFixed(0)} cm of ${c.steel} steel` });
  },
});

// ---- a prop blaster: a shape for play, not a weapon ----
kit({
  id: 'blaster', name: 'prop blaster', words: /\b(guns?|blasters?|pistols?|rifles?|ray ?guns?|laser ?guns?|water ?guns?|water ?pistols?|nerf|laser ?tag|flintlock)\b/, says: 'a prop blaster: a toy\'s shape (a sci-fi blaster, a water pistol, a laser-tag gun, a dart blaster, a flintlock replica); it does not work as a weapon',
  choices: [{ key: 'kind', name: 'kind', options: ['sci-fi blaster', 'water pistol', 'laser-tag gun', 'dart blaster', 'flintlock replica'] }, { key: 'colour', name: 'colour', options: ['orange', 'blue', 'green', 'yellow', 'white', 'purple', 'red', 'black'] },
    { key: 'size', name: 'size', options: ['small', 'medium', 'large'] }, { key: 'sight', name: 'sight', options: ['none', 'fixed sight', 'toy scope', 'glow dot'] }, { key: 'stock', name: 'stock', options: ['none', 'short', 'long'] }],
  build(c) {
    const k = { small: 0.75, medium: 1, large: 1.4 }[c.size as string]!, col = colour(c.colour as string), m = c.kind === 'flintlock replica' ? 'wood' : 'abs', parts: Part[] = [];
    parts.push(P('body', { box: [0.22 * k, 0.07 * k, 0.045 * k] }, [0, 0.03 * k, 0], { color: col, mat: m }), P('grip', { box: [0.04 * k, 0.11 * k, 0.035 * k] }, [-0.07 * k, -0.04 * k, 0], { color: 0x2a2a2a, mat: m, rot: [0, 0, -0.25] }));
    parts.push(P(c.kind === 'water pistol' ? 'nozzle' : 'muzzle', { cyl: [0.014 * k, 0.12 * k] }, [0.16 * k, 0.04 * k, 0], { color: c.kind === 'sci-fi blaster' ? 0x4dd0e1 : 0x2a2a2a, mat: m, rot: [0, 0, Math.PI / 2] }));
    if (c.kind === 'water pistol') parts.push(P('water tank', { cyl: [0.035 * k, 0.09 * k] }, [0.02 * k, 0.11 * k, 0], { color: 0x9ac8e0, mat: 'pp', rot: [0, 0, Math.PI / 2] }));
    if (c.kind === 'dart blaster') parts.push(P('dart drum', { cyl: [0.045 * k, 0.04 * k] }, [0.03 * k, -0.01 * k, 0], { color: 0xe8c22a, mat: 'abs', rot: [Math.PI / 2, 0, 0] }));
    if (c.kind === 'sci-fi blaster' || c.kind === 'laser-tag gun') parts.push(P('glow strip', { box: [0.16 * k, 0.008, 0.047 * k] }, [0, 0.055 * k, 0], { color: 0x4dd0e1, mat: 'pmma', light: { lm: 20, color: 0x4dd0e1 } }));
    if (c.sight !== 'none') parts.push(P(c.sight as string, c.sight === 'toy scope' ? { cyl: [0.015 * k, 0.1 * k] } : { box: [0.02 * k, 0.02 * k, 0.01 * k] }, [0.02 * k, 0.08 * k, 0], { color: c.sight === 'glow dot' ? 0xff3a3a : 0x2a2a2a, mat: 'abs', ...(c.sight === 'toy scope' ? { rot: [0, 0, Math.PI / 2] } : {}) }));
    if (c.stock !== 'none') parts.push(P(`${c.stock} stock`, { box: [(c.stock === 'long' ? 0.24 : 0.12) * k, 0.06 * k, 0.035 * k] }, [-(0.11 + (c.stock === 'long' ? 0.12 : 0.06)) * k, 0.01 * k, 0], { color: col, mat: m }));
    return P(`${c.colour} ${c.kind} (a prop)`, undefined, [0, 1, 0], { parts, says: 'a prop: a shape for play, not a weapon' });
  },
});

// ---- a galaxy: its stars on logarithmic spiral arms (r = a e^(θ tan φ), φ the pitch angle), turning with a flat rotation
// curve (the Milky Way about 220 km/s at the Sun's distance; so the inner stars go round faster: ω = v / r) ----
kit({
  id: 'galaxy', name: 'galaxy', words: /\b(galax(?:y|ies)|milky way|nebula|spiral galaxy|andromeda)\b/, says: 'a galaxy you can hold: its stars on logarithmic spiral arms, its bulge, its kind (Hubble\'s: spiral, barred, elliptical, lenticular, irregular), turning faster inside (a flat rotation curve)',
  choices: [{ key: 'kind', name: 'kind', options: ['spiral', 'barred', 'elliptical', 'lenticular', 'irregular'] }, { key: 'arms', name: 'arms', options: [2, 3, 4] }, { key: 'pitch', name: 'pitch', options: [10, 15, 20, 25, 30, 35], unit: '°' },
    { key: 'stars', name: 'stars drawn', options: [20000, 40000, 80000] }, { key: 'bulge', name: 'bulge', options: ['small', 'medium', 'large'] }, { key: 'tint', name: 'stars', options: ['young blue', 'mixed', 'old red'] }, { key: 'flat', name: 'flattening', options: [0, 3, 7] }, { key: 'seed', name: 'shape', options: seeds(1000) }],
  build(c) {
    const kind = c.kind as 'spiral', bulge = { small: 0.12, medium: 0.22, large: 0.35 }[c.bulge as string]!, tint = { 'young blue': 0, mixed: 1, 'old red': 2 }[c.tint as string]!;
    return P(`${kind} galaxy`, undefined, [0, 1.3, 0], { parts: [
      P('stars', { stars: { n: c.stars as number, arms: c.arms as number, pitch: c.pitch as number, radius: 1.5, bulge, kind, flat: c.flat as number, tint, seed: c.seed as number } }, [0, 0, 0]),
      P('central black hole', { sphere: 0.01 }, [0, 0, 0], { color: 0x000000, says: 'like Sagittarius A*, about 4 million suns (GRAVITY Collaboration 2019)' }),
    ], says: '1.5 m across for about 100,000 light-years (the Milky Way\'s disc, an estimate): 1 m here is about 33,000 light-years' });
  },
});

// ---- terrain: a table you can look down on, at 1:50 ----
kit({
  id: 'terrain', name: 'terrain', words: /\b(terrain|landscape|hills|island|mesa|dunes|valley|mountain range|diorama|map)\b/, says: 'terrain on a table at 1:50: its land, its relief, water, its biome\'s colour, trees and plants on it',
  choices: [{ key: 'kind', name: 'land', options: ['hills', 'mountains', 'dunes', 'plains', 'islands', 'canyon', 'mesa', 'glacier', 'volcanic'] }, { key: 'size', name: 'size', options: [50, 100, 200], unit: 'm' },
    { key: 'relief', name: 'relief', options: ['low', 'medium', 'high', 'extreme'] }, { key: 'water', name: 'water', options: ['none', 'lake', 'sea'] }, { key: 'biome', name: 'biome', options: ['temperate', 'desert', 'arctic', 'tropical', 'alpine'] },
    { key: 'trees', name: 'trees', options: ['none', 'sparse', 'lush'] }, { key: 'seed', name: 'shape', options: seeds(10000) }],
  uses: [{ kit: 'tree', n: 12 }],
  build(c, r, sub) {
    const size = c.size as number, k = 1 / 50, relief = { low: 0.05, medium: 0.12, high: 0.25, extreme: 0.4 }[c.relief as string]! * size * (c.kind === 'plains' ? 0.2 : c.kind === 'mountains' ? 1.6 : 1);
    const col = { temperate: 0x4f7a3a, desert: 0xd9b27a, arctic: 0xf1f4f8, tropical: 0x3a8a3a, alpine: 0x7a8a6a }[c.biome as string]!, water = { none: 0, lake: 0.25, sea: 0.4 }[c.water as string]!;
    const trees: Part[] = []; const nt = { none: 0, sparse: 5, lush: 12 }[c.trees as string]!;
    for (let i = 0; i < nt; i++) { const t = sub('tree', { height: 6 + Math.round(r() * 14) }), a = r() * 6.28, d = Math.sqrt(r()) * size * 0.4 * k; trees.push({ ...t, name: `tree ${i + 1}`, at: [Math.cos(a) * d, 0.82 + 0.02, Math.sin(a) * d], rot: [0, 0, 0], says: `${t.name} (at 1:50)` }); }
    return P(`${c.biome} ${c.kind}, ${size} m`, undefined, [0, 0, 0], { parts: [
      P('table', { box: [size * k + 0.1, 0.8, size * k + 0.1] }, [0, 0.4, 0], { color: 0x3a2a1e, mat: 'wood' }),
      P('land', { field: { size: size * k, relief: relief * k, kind: c.kind as string, water, seed: c.seed as number, color: col } }, [0, 0.82, 0], { mat: 'soil' }),
      P('trees', undefined, [0, 0, 0], { parts: trees.map((t) => ({ ...t, parts: [{ name: 'model', at: [0, 0, 0], parts: t.parts }], })) }),
    ], says: `${size} by ${size} m at 1:50 (${(size * k).toFixed(1)} m across), relief up to ${relief.toFixed(0)} m` });
  },
});

// ---- a prop light sword: a hilt and a blade of light (a toy's), its colour the light's ----
kit({
  id: 'lightsaber', name: 'light sword (a prop)', words: /\b(light ?sabers?|light ?sabres?|laser swords?|light swords?|beam swords?)\b/, says: 'a prop light sword: a metal hilt and a glowing blade, as the replica toys are made (a polycarbonate tube lit by LEDs)',
  choices: [{ key: 'colour', name: 'blade colour', options: ['blue', 'green', 'red', 'purple', 'yellow', 'white', 'orange'] }, { key: 'hilt', name: 'hilt', options: ['ribbed', 'smooth', 'curved', 'double-bladed'] }, { key: 'L', name: 'blade length', options: [0.7, 0.8, 0.9], unit: 'm' }],
  build(c) {
    const col = { blue: 0x3a7aff, green: 0x3aff6a, red: 0xff2a2a, purple: 0xb04aff, yellow: 0xffe03a, white: 0xf4f4ff, orange: 0xff8a2a }[c.colour as string]!, L = c.L as number, dbl = c.hilt === 'double-bladed', hl = dbl ? 0.4 : 0.28;
    // a replica's blade is a polycarbonate tube with a 1 mm wall, its hilt a 2 mm aluminium tube round its battery (typical)
    const blade = (dir: number, nm: string) => P(nm, { cyl: [0.0125, L] }, [0, dir * (hl / 2 + L / 2), 0], { color: col, mat: 'pc', shell: 0.001, light: { lm: 200, color: col } });
    return P(`${c.colour} light sword (a prop)`, undefined, [0, 1.0, 0], { parts: [P('battery and LEDs', undefined, [0, 0, 0], { kg: 0.15, says: 'an 18650 cell and the LED strip (typical)' }), P(`${c.hilt} hilt`, { cyl: [0.019, hl] }, [0, 0, 0], { color: 0xb8bcc2, mat: 'al-6061', shell: 0.002, rot: c.hilt === 'curved' ? [0, 0, 0.12] : [0, 0, 0], parts: c.hilt === 'ribbed' ? Array.from({ length: 6 }, (_, i) => P(`grip ring ${i + 1}`, { torus: [0.02, 0.003] }, [0, -hl / 3 + i * 0.03, 0], { color: 0x1a1a1a, mat: 'rubber', rot: [Math.PI / 2, 0, 0] })) : [] }),
      P('emitter', { cyl: [0.022, 0.03] }, [0, hl / 2 + 0.01, 0], { color: 0x2a2a2a, mat: 'al-6061' }), blade(1, 'blade'), ...(dbl ? [blade(-1, 'second blade')] : [])], says: `a ${(L * 100).toFixed(0)} cm blade of light: a prop, not a weapon` });
  },
});

// ---- a sandwich: slices about 12 by 12 by 1.2 cm (a sandwich loaf, typical); its energy from USDA FoodData Central's
// values per 100 g (white bread 266 kcal, wholemeal 252, rye 259, sourdough 272; cheddar 403, ham 145, chicken 165,
// bacon 541, egg 143, avocado 160, tomato 18, lettuce 15, butter 717) ----
const FILL: Record<string, { mat: string; t: number; color: number; kcal: number }> = {
  // a layer as thick as it is laid (a cheese slice about 2 mm, 20–28 g; ham about 2 mm; bacon three strips, 3 mm; typical)
  cheese: { mat: 'cheese', t: 0.002, color: 0xf2b830, kcal: 403 }, ham: { mat: 'ham', t: 0.002, color: 0xe89a9a, kcal: 145 }, chicken: { mat: 'chicken', t: 0.006, color: 0xf0e0c8, kcal: 165 },
  bacon: { mat: 'bacon', t: 0.003, color: 0xa83a2a, kcal: 541 }, egg: { mat: 'egg', t: 0.005, color: 0xfff4c8, kcal: 143 }, avocado: { mat: 'avocado', t: 0.005, color: 0x9ac85a, kcal: 160 },
  tomato: { mat: 'tomato', t: 0.005, color: 0xd83a2a, kcal: 18 }, lettuce: { mat: 'lettuce', t: 0.002, color: 0x6ac84a, kcal: 15 },
};
const BREAD: Record<string, { color: number; kcal: number }> = { white: { color: 0xf2e2c0, kcal: 266 }, wholemeal: { color: 0xb08a5a, kcal: 252 }, rye: { color: 0x7a5a3a, kcal: 259 }, sourdough: { color: 0xe8d0a0, kcal: 272 } };
kit({
  id: 'sandwich', name: 'sandwich', words: /\b(sandwich(?:es)?|sub|blt|club sandwich|toastie|sarnie)\b/, says: 'a sandwich: its bread, its fillings in layers, how it is cut; its energy worked out from what is in it (USDA values)',
  choices: [{ key: 'bread', name: 'bread', options: Object.keys(BREAD) }, { key: 'a', name: 'first filling', options: Object.keys(FILL) }, { key: 'b', name: 'second filling', options: Object.keys(FILL) }, { key: 'c', name: 'third filling', options: ['none', ...Object.keys(FILL)] },
    { key: 'butter', name: 'butter', options: ['no', 'yes'] }, { key: 'cut', name: 'cut', options: ['whole', 'halves', 'triangles'] }, { key: 'toasted', name: 'toasted', options: ['no', 'yes'] }],
  build(c) {
    const b = BREAD[c.bread as string]!, s = 0.12, t = 0.012, layers: Part[] = [], toast = c.toasted === 'yes', bc = toast ? darken(b.color, 0.75) : b.color;
    const slice = (y: number, nm: string): Part => { const m = s * s * t * DENSITY.bread!; return P(nm, { box: [s, t, s] }, [0, y, 0], { color: bc, mat: 'bread', kcal: (m * 1000 * b.kcal) / 100, parts: [P('crust', { box: [s + 0.004, t * 0.9, s + 0.004] }, [0, 0, 0], { color: toast ? 0x8a5a2a : 0xb07a3a, mat: 'bread', shell: 0.0015 })] }); };
    let y = t / 2; layers.push(slice(y, 'bottom slice')); y += t / 2;
    if (c.butter === 'yes') { layers.push(P('butter', { box: [s * 0.95, 0.0005, s * 0.95] }, [0, y + 0.00025, 0], { color: 0xfff0a0, mat: 'butter', kcal: (s * s * 0.0005 * DENSITY.butter! * 1000 * 717) / 100 })); y += 0.0005; }
    for (const k of [c.a, c.b, c.c]) { if (k === 'none') continue; const f = FILL[k as string]!; layers.push(P(k as string, { box: [s * 0.96, f.t, s * 0.96] }, [0, y + f.t / 2, 0], { color: f.color, mat: f.mat, kcal: (s * s * f.t * (DENSITY[f.mat] ?? 1000) * 1000 * f.kcal) / 100 })); y += f.t; }
    layers.push(slice(y + t / 2, 'top slice'));
    const kcal = (p: Part): number => (p.kcal ?? 0) + (p.parts ?? []).reduce((a, q) => a + kcal(q), 0), all = P('', undefined, [0, 0, 0], { parts: layers }), K = kcal(all);
    const whole = P(`${toast ? 'toasted ' : ''}${[c.a, c.b, c.c].filter((x) => x !== 'none').join(', ')} sandwich on ${c.bread}`, undefined, [0, 0.9, 0], { parts: layers, says: `about ${Math.round(K)} kcal (USDA values for what is in it)` });
    if (c.cut === 'whole') return whole;
    const halves = [-1, 1].map((sg, i) => ({ ...P(c.cut === 'halves' ? `half ${i + 1}` : `triangle ${i + 1}`, undefined, [sg * 0.008, 0, 0], { rot: [0, c.cut === 'triangles' ? Math.PI / 4 : 0, 0] as V3, parts: layers.map((l) => ({ ...l, shape: l.shape && 'box' in l.shape ? { box: [l.shape.box[0] / 2, l.shape.box[1], l.shape.box[2]] as V3 } : l.shape, at: [sg * s / 4, l.at![1], 0] as V3, kcal: (l.kcal ?? 0) / 2 })) }) }));
    return { ...whole, parts: halves };
  },
});

// ---- bricks: a 2×4 brick 31.8 by 15.8 by 9.6 mm (11.3 with its studs; studs 8 mm apart: LEGO's own dimensions), 2.3 g
// of ABS (typical); a heap of them loose fills about a third of its volume (an estimate), so a heap the size of a house
// holds millions ----
kit({
  id: 'bricks', name: 'toy bricks', words: /\b(lego|toy bricks?|building bricks?|duplo|bricks? pile|pile of bricks)\b/, says: 'toy bricks: a 2×4 brick 31.8 × 15.8 × 9.6 mm, 2.3 g of ABS; a heap of them as big as asked, its count from its volume (a loose heap about a third bricks, an estimate)',
  choices: [{ key: 'heap', name: 'heap', options: ['a handful', 'a box', 'a bathtub', 'a car', 'a house'] }, { key: 'colours', name: 'colours', options: ['classic', 'pastel', 'one colour', 'greys'] }, { key: 'seed', name: 'shape', options: seeds(1000) }],
  build(c) {
    const size: [number, number] = { 'a handful': [0.06, 0.04], 'a box': [0.2, 0.15], 'a bathtub': [0.8, 0.5], 'a car': [2.2, 1.5], 'a house': [6, 7] }[c.heap as string]! as [number, number], [R, Hh] = size;
    const brickV = 0.0318 * 0.0158 * 0.0113, heapV = (Math.PI * R * R * Hh) / 3, n = Math.max(1, Math.round((heapV * 0.33) / brickV));
    const colors = { classic: [0xc81e1e, 0x1a4fa8, 0xf2c200, 0xf2f2ee, 0x1a1a1a, 0x2a7a3a], pastel: [0xf4b8c8, 0xa8d8f0, 0xf4e8a0, 0xc8f0c8, 0xd8c8f0], 'one colour': [0xc81e1e], greys: [0x6c7076, 0xa0a4aa, 0x2a2a2a] }[c.colours as string]!;
    return P(`${n.toLocaleString('en-US')} toy bricks, a heap the size of ${c.heap}`, undefined, [0, 0, 0], { parts: [P('heap', { heap: { n, size: [0.0318, 0.0113, 0.0158], r: R, h: Hh, colors, seed: c.seed as number } }, [0, 0, -Math.max(1.5, R + 1)], { mat: 'abs' })], says: `${n.toLocaleString('en-US')} bricks of 2.3 g: ${n * 2.3 > 1e6 ? `${((n * 2.3) / 1e6).toFixed(1)} t` : n * 2.3 > 1000 ? `${((n * 2.3) / 1000).toFixed(1)} kg` : `${(n * 2.3).toFixed(0)} g`} (a loose heap about a third bricks, an estimate)` });
  },
});

// ---- a solar system to hold: the planets' sizes to each other as they are (NASA's fact sheets; the Sun shown at a tenth of
// its size to them, or it would be 1.1 m across), their distances on a square-root scale so the inner planets show, each
// going round in its own year (Kepler's third law, T² ∝ a³; a year here 12 s) ----
const PLANETS: [string, number, number, number, number][] = [['Mercury', 0.387, 2440, 0x9a948a, 0.241], ['Venus', 0.723, 6052, 0xe8c890, 0.615], ['Earth', 1, 6371, 0x3a7ad8, 1], ['Mars', 1.524, 3390, 0xc8603a, 1.881], ['Jupiter', 5.203, 69911, 0xd8b08a, 11.86], ['Saturn', 9.537, 58232, 0xe8d0a0, 29.46], ['Uranus', 19.19, 25362, 0x9ad8e0, 84.01], ['Neptune', 30.07, 24622, 0x3a5ad8, 164.8]];
kit({
  id: 'solar system', name: 'solar system', words: /\b(solar system|planets|orrery|the planets)\b/, says: 'a solar system to hold: the planets\' sizes as they are to each other (NASA), their distances on a square-root scale, each round in its own year by Kepler\'s third law',
  choices: [{ key: 'size', name: 'across', options: [0.6, 1, 1.6], unit: 'm' }, { key: 'year', name: 'a year takes', options: [6, 12, 30], unit: 's' }, { key: 'rings', name: 'Saturn\'s rings', options: ['yes', 'no'] }],
  build(c) {
    const across = c.size as number, year = c.year as number, k = across / 2 / Math.sqrt(30.07), earthR = across * 0.008, parts: Part[] = [P('Sun', { sphere: (earthR * 109) / 10 }, [0, 0, 0], { color: 0xffd060, light: { lm: 4000, color: 0xfff0d0 }, says: 'the Sun, 1.39 million km across, shown at a tenth of its size to the planets' })];
    for (const [nm, a, r, col, T] of PLANETS) parts.push(P(`${nm}'s orbit`, undefined, [0, 0, 0], { spin: T * year, parts: [P(nm, { sphere: Math.max(0.0015, (earthR * r) / 6371) }, [k * Math.sqrt(a), 0, 0], { color: col, says: `${nm}: ${a} AU out, ${(r * 2).toLocaleString('en-US')} km across, its year ${T} Earth years`, parts: nm === 'Saturn' && c.rings === 'yes' ? [P('rings', { torus: [(earthR * r) / 6371 * 1.8, (earthR * r) / 6371 * 0.35] }, [0, 0, 0], { color: 0xd8c8a0, rot: [Math.PI / 2 - 0.47, 0, 0] })] : [] })] }));
    return P('the solar system', undefined, [0, 1.2, 0], { parts, says: `${across} m across Neptune's orbit; a year ${year} s` });
  },
});

// ---- a treehouse: a tree, a platform in it, a hut on that, a ladder, a slide, a hammock, lights strung along ----
kit({
  id: 'treehouse', name: 'treehouse', words: /\b(tree ?houses?|tree ?forts?)\b/, says: 'a treehouse: a tree, its platform and hut, a ladder up, a slide down, a hammock and string lights',
  choices: [{ key: 'h', name: 'platform height', options: [2.5, 3, 3.5, 4], unit: 'm' }, { key: 'size', name: 'platform', options: [2, 2.5, 3], unit: 'm' }, { key: 'roof', name: 'roof', options: ['none', 'gable', 'flat'] },
    { key: 'slide', name: 'slide', options: ['yes', 'no'] }, { key: 'hammock', name: 'hammock', options: ['yes', 'no'] }, { key: 'lights', name: 'string lights', options: ['none', 'warm', 'coloured'] }],
  uses: [{ kit: 'tree', n: 1 }],
  build(c, _r, sub) {
    const h = c.h as number, S = c.size as number, tree = sub('tree', { species: 'oak', height: 14, season: 'summer' }), parts: Part[] = [{ ...tree, name: `the tree: ${tree.name}` }];
    parts.push(P('platform', { box: [S, 0.12, S] }, [0, h, 0], { color: 0x8a6a44, mat: 'wood' }), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => P(`post ${i + 1}`, { box: [0.12, h, 0.12] }, [x! * (S / 2 - 0.1), h / 2, z! * (S / 2 - 0.1)], { color: 0x6a4a2a, mat: 'wood' })));
    parts.push(P('railing', undefined, [0, 0, 0], { parts: [[0, S / 2], [0, -S / 2], [S / 2, 0], [-S / 2, 0]].map(([x, z], i) => P(`rail ${i + 1}`, { box: [x === 0 ? S : 0.06, 0.06, x === 0 ? 0.06 : S] }, [x!, h + 0.9, z!], { color: 0x8a6a44, mat: 'wood' })) }));
    if (c.roof !== 'none') parts.push(P(`${c.roof} hut roof`, c.roof === 'gable' ? { cone: [S * 0.75, 1.2] } : { box: [S + 0.3, 0.1, S + 0.3] }, [0, h + 2.2, 0], { color: 0x5a3a24, mat: 'wood', rot: [0, Math.PI / 4, 0] }), P('hut walls', { box: [S * 0.8, 1.8, S * 0.8] }, [0, h + 0.96, -S * 0.05], { color: 0xa07a50, mat: 'wood', shell: 0.02 }));
    parts.push(P('ladder', undefined, [S / 2 + 0.2, 0, S / 4], { parts: [P('stile left', { box: [0.05, h + 0.6, 0.05] }, [0, (h + 0.6) / 2, -0.2], { color: 0x8a6a44, mat: 'wood' }), P('stile right', { box: [0.05, h + 0.6, 0.05] }, [0, (h + 0.6) / 2, 0.2], { color: 0x8a6a44, mat: 'wood' }), ...Array.from({ length: Math.floor(h / 0.3) }, (_, i) => P(`rung ${i + 1}`, { cyl: [0.018, 0.4] }, [0, 0.3 * (i + 1), 0], { color: 0x8a6a44, mat: 'wood', rot: [Math.PI / 2, 0, 0] }))] }));
    if (c.slide === 'yes') { const L = h / Math.sin(0.6); parts.push(P('slide', { box: [0.5, 0.04, L] }, [-S / 2 - (L * Math.cos(0.6)) / 2 + 0.2, h / 2, 0], { color: 0xd8382a, mat: 'pp', rot: [0, Math.PI / 2, 0.6] })); }
    if (c.hammock === 'yes') parts.push(P('hammock', { cyl: [0.45, 2.2] }, [S / 2 + 1.5, 1.0, -S / 2], { color: 0xd8c8a0, mat: 'cotton', shell: 0.002, rot: [0, 0, Math.PI / 2] }));
    if (c.lights !== 'none') { const bulbs: Part[] = []; for (let i = 0; i < 18; i++) { const t = i / 17, x = -S / 2 - 1 + t * (S + 4), y = h + 1.4 - Math.sin(Math.PI * t) * 0.5; bulbs.push(P(`bulb ${i + 1}`, { sphere: 0.03 }, [x, y, S / 2 + 0.05], { color: c.lights === 'warm' ? 0xffd890 : [0xff4a4a, 0x4aff6a, 0x4a8aff, 0xffe04a][i % 4]!, mat: 'glass', light: { lm: 30, color: c.lights === 'warm' ? 0xffd890 : 0xffffff } })); } parts.push(P('string lights', undefined, [0, 0, 0], { parts: bulbs })); }
    return P(`a treehouse ${h} m up`, undefined, [0, 0, 0], { parts, says: `a ${S} m platform ${h} m up in a 14 m oak` });
  },
});

// ---- scenes: kits of kits ----
const scene = (id: string, name: string, words: RegExp, says: string, uses: { kit: string; n: number }[], lay: (sub: (kit: string, over?: Pick) => Part, r: () => number) => Part[]) =>
  kit({ id, name, words, says, uses, choices: [{ key: 'seed', name: 'arrangement', options: seeds(1000) }], build: (_c, r, sub) => P(name, undefined, [0, 0, 0], { parts: lay(sub, r) }) });
scene('street', 'a street', /\b(street scene|streets? with (?:houses|cars|lamp|lights|trees)|neighbou?rhood|suburb|city street|street at night|main street|residential street)\b/, 'a street: a road with lamp posts, four houses either side, trees and cars', [{ kit: 'road', n: 1 }, { kit: 'house', n: 8 }, { kit: 'tree', n: 6 }, { kit: 'car', n: 3 }], (sub, r) => {
  const road = sub('road', { L: 100, lanes: 2, walk: 'both sides', lamps: 'yes', marks: 'centre line', kind: 'street' }), out: Part[] = [{ ...road, at: [0, 0, -40] }];
  for (let i = 0; i < 8; i++) { const s = i < 4 ? -1 : 1, h = sub('house'); out.push({ ...h, name: `house ${i + 1}: ${h.name}`, at: [s * 16, 0, -80 + (i % 4) * 22], rot: [0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0] }); }
  for (let i = 0; i < 6; i++) { const t = sub('tree'); out.push({ ...t, name: `tree ${i + 1}: ${t.name}`, at: [(i % 2 ? 1 : -1) * 6.5, 0, -70 + i * 12] }); }
  for (let i = 0; i < 3; i++) { const cr = sub('car'); out.push({ ...cr, name: `car ${i + 1}: ${cr.name}`, at: [(i % 2 ? 1 : -1) * 1.5, 0, -30 - i * 18 - r() * 4], rot: [0, i % 2 ? Math.PI / 2 : -Math.PI / 2, 0] }); }
  return out;
});
scene('village', 'a village', /\b(village|hamlet|town|settlement)\b/, 'a village: houses round a green, a lane, trees, plants', [{ kit: 'house', n: 9 }, { kit: 'road', n: 1 }, { kit: 'tree', n: 10 }, { kit: 'plant', n: 12 }], (sub, r) => {
  const out: Part[] = [{ ...sub('road', { kind: 'country lane', L: 100, lanes: 2, lamps: 'no', walk: 'none', marks: 'none' }), at: [0, 0, -45] }];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, h = sub('house', { storeys: 1 + Math.floor(r() * 2) }); out.push({ ...h, name: `house ${i + 1}: ${h.name}`, at: [Math.cos(a) * 30 + 12, 0, Math.sin(a) * 30 - 45], rot: [0, -a + Math.PI / 2, 0] }); }
  for (let i = 0; i < 10; i++) { const t = sub('tree'); out.push({ ...t, name: `tree ${i + 1}: ${t.name}`, at: [(r() - 0.5) * 80, 0, -45 + (r() - 0.5) * 80] }); }
  for (let i = 0; i < 12; i++) { const p = sub('plant'); out.push({ ...p, name: `plant ${i + 1}: ${p.name}`, at: [10 + (r() - 0.5) * 14, 0, -45 + (r() - 0.5) * 14] }); }
  return out;
});
scene('park', 'a park', /\b(park|playground|green space)\b/, 'a park: paths, trees, flower beds and lamp posts', [{ kit: 'road', n: 2 }, { kit: 'tree', n: 12 }, { kit: 'plant', n: 16 }, { kit: 'lamp post', n: 4 }], (sub, r) => {
  const out: Part[] = [{ ...sub('road', { kind: 'dirt track', L: 50, lanes: 1, walk: 'none', lamps: 'no' }), at: [0, 0, -25] }, { ...sub('road', { kind: 'dirt track', L: 50, lanes: 1, walk: 'none', lamps: 'no' }), at: [0, 0, -25], rot: [0, Math.PI / 2, 0] }];
  for (let i = 0; i < 12; i++) { const t = sub('tree'); out.push({ ...t, name: `tree ${i + 1}: ${t.name}`, at: [(r() - 0.5) * 50, 0, -25 + (r() - 0.5) * 50] }); }
  for (let i = 0; i < 16; i++) { const p = sub('plant', { kind: ['rose', 'tulip', 'sunflower', 'daisy', 'lavender'][i % 5]!, pot: 'none' }); out.push({ ...p, name: `flower bed ${i + 1}: ${p.name}`, at: [(i % 2 ? 1 : -1) * (2.5 + r() * 3), 0, -25 + (r() - 0.5) * 40] }); }
  for (let i = 0; i < 4; i++) { const l = sub('lamp post', { h: 4 }); out.push({ ...l, name: `lamp post ${i + 1}`, at: [i % 2 ? 1.5 : -1.5, 0, -10 - i * 10] }); }
  return out;
});
scene('forest', 'a forest', /\b(forest of trees|woodland|grove|orchard|lots of trees|many trees)\b/, 'a forest: thirty trees and the plants between them', [{ kit: 'tree', n: 30 }, { kit: 'plant', n: 30 }], (sub, r) => {
  const out: Part[] = []; for (let i = 0; i < 30; i++) { const t = sub('tree'); out.push({ ...t, name: `tree ${i + 1}: ${t.name}`, at: [(r() - 0.5) * 60, 0, -8 - r() * 60] }); }
  for (let i = 0; i < 30; i++) { const p = sub('plant', { kind: ['fern', 'grass', 'bush'][i % 3]!, pot: 'none' }); out.push({ ...p, name: `plant ${i + 1}: ${p.name}`, at: [(r() - 0.5) * 50, 0, -5 - r() * 50] }); }
  return out;
});
scene('car park', 'a car park', /\b(car park|parking lot|parking|car show|garage full)\b/, 'a car park: eight cars in their bays, lamp posts', [{ kit: 'car', n: 8 }, { kit: 'lamp post', n: 2 }], (sub) => {
  const out: Part[] = [{ name: 'tarmac', shape: { box: [24, 0.05, 14] }, at: [0, 0.025, -10], color: 0x2a2b2e, mat: 'asphalt' }];
  for (let i = 0; i < 8; i++) { const cr = sub('car'); out.push({ ...cr, name: `bay ${i + 1}: ${cr.name}`, at: [-9 + (i % 4) * 6, 0, i < 4 ? -6 : -14], rot: [0, i < 4 ? -Math.PI / 2 : Math.PI / 2, 0] }); }
  for (let i = 0; i < 2; i++) out.push({ ...sub('lamp post', { h: 8, arm: 'double' }), name: `lamp post ${i + 1}`, at: [i ? 11 : -11, 0, -10] });
  return out;
});
scene('flower garden', 'a flower garden', /\b(flower garden|flower bed|garden of flowers|greenhouse)\b/, 'a flower garden: twenty plants and two trees', [{ kit: 'plant', n: 20 }, { kit: 'tree', n: 2 }], (sub, r) => {
  const out: Part[] = []; for (let i = 0; i < 20; i++) { const p = sub('plant'); out.push({ ...p, name: `plant ${i + 1}: ${p.name}`, at: [(i % 5) * 1.2 - 2.4, 0, -2 - Math.floor(i / 5) * 1.2] }); }
  for (let i = 0; i < 2; i++) out.push({ ...sub('tree', { height: 5 + Math.round(r() * 4) }), name: `tree ${i + 1}`, at: [i ? 5 : -5, 0, -5] });
  return out;
});
scene('armoury', 'a sword rack', /\b(sword rack|armou?ry|swords on a rack|collection of swords|weapon rack)\b/, 'a sword rack: six swords of six kinds', [{ kit: 'sword', n: 6 }], (sub) => {
  const out: Part[] = [{ name: 'rack', shape: { box: [2.2, 0.05, 0.3] }, at: [0, 1.4, -2], color: 0x4a2a14, mat: 'oak' }];
  for (let i = 0; i < 6; i++) { const s = sub('sword', { type: Object.keys(SWORDS)[i]! }); out.push({ ...s, name: `${s.name} ${i + 1}`, at: [-0.9 + i * 0.36, 1.45, -2], rot: [Math.PI, 0, 0] }); }
  return out;
});

// ---- counting what there is, and choosing from words ----
const byId = { get: (id: string) => KITS.find((k) => k.id === id) };
export const kitById = (id: string): Kit | undefined => byId.get(id);
/** How many different things a kit makes, as a power of ten: the product of its choices, times every kit it uses to the
 *  number of times it uses it. */
export function log10Kinds(k: Kit, seen = new Set<string>()): number {
  if (seen.has(k.id)) return 0; const s = new Set(seen).add(k.id);
  return k.choices.reduce((a, ch) => a + Math.log10(ch.options.length), 0) + (k.uses ?? []).reduce((a, u) => a + u.n * log10Kinds(byId.get(u.kit)!, s), 0);
}
/** How many things all the kits make between them, as a power of ten. */
export function log10All(): number { const ls = KITS.map((k) => log10Kinds(k)), m = Math.max(...ls); return m + Math.log10(ls.reduce((a, l) => a + 10 ** (l - m), 0)); }
/** A kit's thing named in the plural: a galaxy's galaxies, a sandwich's sandwiches, a scene's without its "a". */
export const plural = (name: string): string => { const n = name.replace(/^an? /, ''); const m = /^(.*?)( \(a prop\))?$/.exec(n)!; const w = m[1]!; return `${/(s|x|ch|sh)$/.test(w) ? `${w}es` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : /s$/.test(w) ? w : `${w}s`}${m[2] ?? ''}`; };
export const sayKinds = (l: number): string => (l < 6 ? Math.round(10 ** l).toLocaleString('en-US') : l < 15 ? `${(10 ** (l - Math.floor(l))).toFixed(1)} × 10^${Math.floor(l)}` : `about 10^${Math.round(l)}`);

/** The kit the words name: a scene before the things in it ("a street with lamp posts" is the street), else the first named. */
export function kitFor(words: string): Kit | null {
  const t = words.toLowerCase(), hits = KITS.map((k) => ({ k, m: k.words.exec(t) })).filter((x) => x.m);
  if (!hits.length) return null; const scenes = hits.filter((x) => x.k.uses && x.k.choices.length === 1);
  return (scenes[0] ?? hits.sort((a, b) => a.m!.index - b.m!.index)[0]!).k;
}
/** The choices the words make (an option named, or a number with the choice's unit), the rest drawn at random. */
export function choose(k: Kit, words: string, r: () => number): Pick {
  const t = ` ${words.toLowerCase()} `, out: Pick = {}, taken = new Set<string | number>();
  for (const ch of k.choices) {
    let hit: string | number | undefined;
    // the options named, in the order they are said; one already taken by a choice like this one is not taken again
    const named = ch.options.filter((o) => typeof o === 'string' && o.length > 2 && new RegExp(`\\b${o.toLowerCase().replace(/[()]/g, '\\$&')}s?\\b`).test(t)).sort((a, b) => t.indexOf(String(a).toLowerCase()) - t.indexOf(String(b).toLowerCase()) || String(b).length - String(a).length);
    hit = named.find((o) => !taken.has(o) && !named.some((x) => x !== o && String(x).includes(String(o)) && !taken.has(x)));
    if (hit === undefined && named.length && ch.options.includes('none')) hit = 'none';
    if (hit !== undefined) taken.add(hit);
    if (hit === undefined && typeof ch.options[0] === 'number') {
      const unit = ch.unit === 'm' ? '(?:m|metres?|meters?)' : ch.unit === 'in' ? '(?:in|inch|inches|")' : ch.unit === '°' ? '(?:°|degrees?)' : ch.unit === 'kg' ? '(?:kg|kilos?|kilograms?)' : ch.unit === 's' ? '(?:s|seconds?)' : '';
      const m = unit ? new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unit}\\b`).exec(t) : ch.key === 'storeys' ? /(\d)[- ]?(?:storey|story|stories|floor)/.exec(t) : ch.key === 'pillows' ? /(\d+)\s*pillows?/.exec(t) : ch.key === 'lanes' ? /(\d+)[- ]?lanes?/.exec(t) : ch.key === 'arms' ? /(\d)[- ]?arm/.exec(t) : ch.key === 'clump' ? /(\d+)\s+(?:of them|plants|flowers)/.exec(t) : null;
      if (m) { const v = Number(m[1]); hit = (ch.options as number[]).reduce((a, o) => (Math.abs(o - v) < Math.abs(a - v) ? o : a), ch.options[0] as number); }
    }
    out[ch.key] = hit ?? ch.options[Math.floor(r() * ch.options.length) % ch.options.length]!;
  }
  // a few words that pick by meaning
  if (k.id === 'car' && /\b(electric|ev|tesla)\b/.test(t)) out.power = 'electric';
  if (k.id === 'tree' && /\bfall\b/.test(t)) out.season = 'autumn';
  if (k.id === 'house' && /\bbungalow\b/.test(t)) out.storeys = 1;
  if (k.id === 'road' && /\b(lamp|light)/.test(t)) out.lamps = 'yes';
  if (k.id === 'bed' && /\bbunk\b/.test(t)) out.frame = 'bunk';
  if (k.id === 'sword' && /\bsaber\b/.test(t)) out.type = 'sabre';
  if (k.id === 'dragon' && /\b(saddle|ride|rider|riding|fly on|mount)\b/.test(t)) out.rider = 'yes';
  if (k.id === 'dog' && /\bpupp/.test(t)) out.age = 'puppy';
  return out;
}
/** A thing made by a kit from words: its choices, its parts, its mass. */
export function makeKit(k: Kit, words: string, seed: number): { kit: Kit; pick: Pick; part: Part } {
  let s = seed >>> 0 || 1; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const sub = (id: string, over: Pick = {}): Part => { const kk = byId.get(id)!; const pick = { ...choose(kk, '', r), ...over }; return { ...kk.build(pick, r, sub), kit: kk.id }; };
  const pick = choose(k, words, r); return { kit: k, pick, part: { ...k.build(pick, r, sub), kit: k.id } };
}
