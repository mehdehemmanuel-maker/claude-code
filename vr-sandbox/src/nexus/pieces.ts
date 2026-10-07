// What anything in the inventory looks like in three dimensions, and how it comes apart. An item's look is the shape
// of its kind (a screw is a shank under a head, a bearing two rings round a row of balls, a gear a toothed disc, a
// spring a helix of its wire, a cable a coil, a chip a black body with its legs …) at its real size, in the finish of
// what it is mostly made of. Taken apart, its parts are laid round where it was, each in its own look and at the same
// scale as the whole, so their sizes stay true to each other (one too small to see is shown at a size you can, and
// says so). A material comes apart into what it is made of, an element into the materials it is in: so pointing at a
// part and then at its part leads, every time, down to the same few dozen elements. Where each part sits inside the
// whole is not in the inventory: they are laid round it, not placed in it, and it says so.

import { ELEMENTS } from './elements';
import { INVENTORY, countSays, type Item } from './inventory';
import { lookRow } from './looks';

export type V3 = [number, number, number];
/** Axial shapes (screw, rod, can, tube, spring, motor, dome) are a × b across and c along their axis, shown upright;
 *  disc shapes (ring, bearing, torus, gear, wheel, fan, blade, loop) a × b across their face and c thick, shown facing
 *  you; the rest are x wide, y high, z deep. */
export type ShapeKind = 'screw' | 'hex' | 'ring' | 'bearing' | 'torus' | 'gear' | 'spring' | 'sheet' | 'tslot' | 'coil' | 'loop' | 'can' | 'chip' | 'dome' | 'rod' | 'tube' | 'box' | 'swatch' | 'atom' | 'motor' | 'ball' | 'wheel' | 'board' | 'frame' | 'case' | 'blade' | 'fan' | 'vehicle';
export const SHAPES: ShapeKind[] = ['screw', 'hex', 'ring', 'bearing', 'torus', 'gear', 'spring', 'sheet', 'tslot', 'coil', 'loop', 'can', 'chip', 'dome', 'rod', 'tube', 'box', 'swatch', 'atom', 'motor', 'ball', 'wheel', 'board', 'frame', 'case', 'blade', 'fan', 'vehicle'];
export interface Finish { color: number; metal: number; rough: number; clear?: boolean }
export interface Look { kind: ShapeKind; /** its box, metres */ size: V3; teeth?: number; coils?: number; /** a spring's or a cable's wire, metres */ wire?: number; /** a bore as a share of its outside */ bore?: number; /** an element's symbol, a chip's legs … */ mark?: string; finish: Finish }
export interface Piece { id: string; name: string; n: number; look: Look; /** where it sits whole, and laid out, metres from the centre */ whole: V3; apart: V3; /** its display size over its true size (1 is true to the whole's scale) */ shown: number; note: string }
export interface Plan { id: string; name: string; says: string; whole: Look; pieces: Piece[]; more: number; /** display metres for each real metre */ scale: number; deeper: boolean }

/** The inventory's material for each matter the generator builds with (src/data/materials.ts), so a shape made in the
 *  room opens into what it is made of, then its elements. A matter with none here (textiles, leather, soil) has none. */
export const MATTER_TO_INVENTORY: Record<string, string> = {
  'steel.a36': 'steel-low', 'steel.1018-cd': 'steel-low', 'steel.4140-ann': 'steel-alloy', 'steel.52100': 'steel-chrome', 'steel.music-wire': 'steel-spring', 'stainless.304': 'stainless-304', 'stainless.316': 'stainless-316',
  'cast-iron.gray-30': 'cast-iron', 'aluminum.6061-t6': 'al-6061', 'aluminum.7075-t6': 'al-7075', 'aluminum.5052-h32': 'al-5052', 'aluminum.2024-t3': 'al-2024', 'copper.c110': 'copper', 'brass.c360': 'brass',
  'titanium.ti6al4v': 'ti-6al4v', 'wood.birch-plywood': 'wood-veneer', 'wood.mdf': 'wood', 'polymer.nylon-microcarbon': 'nylon', 'polymer.pmma': 'pmma', 'rubber.natural': 'rubber', 'glass.soda-lime': 'glass',
  'concrete.c30': 'concrete', 'ceramic.clay-brick': 'brick', 'textile.canvas': 'paper', 'textile.nylon-ripstop': 'nylon', 'foam.eva': 'eva', 'composite.cfrp': 'cfrp', 'composite.gfrp': 'fr4', 'polymer.phenolic': 'phenolic', 'ground.sand-dry': 'quartz',
  'wood.douglas-fir': 'wood', 'wood.southern-pine': 'wood', 'wood.white-pine': 'wood', 'wood.red-oak': 'wood', 'wood.white-oak': 'wood', 'wood.hard-maple': 'wood', 'wood.balsa': 'wood', 'wood.c24': 'wood',
  'polymer.abs': 'abs', 'polymer.pla': 'pla', 'polymer.nylon66': 'nylon', 'polymer.pom': 'pom', 'polymer.pc': 'pc', 'polymer.hdpe': 'pe', 'polymer.ptfe': 'ptfe',
  'stone.slate': 'slate', 'stone.granite': 'granite', 'stone.marble': 'marble', 'magnet.n35': 'ndfeb', 'magnet.n42': 'ndfeb', 'magnet.n52': 'ndfeb', 'magnet.ferrite-c8': 'ferrite-hard',
};
/** The finish of a material: its colour, how metallic, how rough. */
export function finishOf(material: string): Finish {
  const m = material.toLowerCase();
  if (/^el-/.test(m)) { const sym = m.slice(3); const g = Object.entries(ELEMENTS).find(([s]) => s.toLowerCase() === sym)?.[1].group ?? ''; return { color: g === 'Metals' ? 0xc0c7cc : g === 'Rare earths' ? 0xb39ddb : g === 'Metalloids' ? 0x90a4ae : 0x80deea, metal: g === 'Metals' ? 0.8 : 0.1, rough: 0.35 }; }
  const T: [RegExp, Finish][] = [
    [/^(gold)$/, { color: 0xffc94a, metal: 1, rough: 0.25 }], [/^(silver|silver-paste)$/, { color: 0xe8ecef, metal: 1, rough: 0.2 }], [/brass|bronze|zamak/, { color: 0xd4af5a, metal: 0.95, rough: 0.3 }],
    [/copper|magnet-wire|constantan/, { color: 0xd8875a, metal: 0.95, rough: 0.3 }], [/^al-|alumin|al-foil/, { color: 0xc9ced3, metal: 0.85, rough: 0.35 }], [/stainless|nickel|chrom|platinum|pt-rh|ti-|nicro|nisil|alumel|tin|solder/, { color: 0xbfc5ca, metal: 0.9, rough: 0.28 }],
    [/steel|iron|hss|carbide|tool|spring/, { color: 0x8d969c, metal: 0.85, rough: 0.4 }], [/ndfeb|ferrite|alnico/, { color: 0x6f7377, metal: 0.6, rough: 0.45 }], [/^zinc$/, { color: 0xb5bcc2, metal: 0.8, rough: 0.4 }], [/lead/, { color: 0x6e737a, metal: 0.6, rough: 0.6 }], [/lithium/, { color: 0xd0d4d8, metal: 0.8, rough: 0.4 }],
    [/fr4|solder-mask/, { color: 0x1f6f43, metal: 0.05, rough: 0.6 }], [/^(glass|bk7|quartz|pmma|pc)$/, { color: 0xbfe9f7, metal: 0, rough: 0.05, clear: true }], [/alumina|si3n4|mgo|batio3|pzt|ceramic|mica|yag/, { color: 0xeeeae2, metal: 0, rough: 0.7 }],
    [/nbr|epdm|fkm|rubber|neoprene/, { color: 0x262626, metal: 0, rough: 0.9 }], [/silicone/, { color: 0xd84f4f, metal: 0, rough: 0.8 }], [/pu$|^pu|tpu/, { color: 0xf2a541, metal: 0, rough: 0.7 }],
    [/pla|asa|abs/, { color: 0x3d8bfd, metal: 0, rough: 0.55 }], [/nylon|pom|pe$|^pe|pp$|ptfe|peek|pbt|pet/, { color: 0xf1efe8, metal: 0, rough: 0.6 }], [/pvc/, { color: 0x5d6b78, metal: 0, rough: 0.6 }], [/phenolic|epoxy|mould-compound/, { color: 0x3b2f2a, metal: 0, rough: 0.55 }],
    [/wood|paper|glue|rosin/, { color: 0xc8a06a, metal: 0, rough: 0.85 }], [/graphite|cfrp|sic|cds/, { color: 0x30343a, metal: 0.2, rough: 0.6 }], [/silicon|gan|algainp|bi2te3/, { color: 0x4a5a78, metal: 0.4, rough: 0.3 }],
    [/water|electrolyte|oil|grease|acid|koh/, { color: 0x7ecbf2, metal: 0, rough: 0.1, clear: true }], [/nitrogen|argon|co2/, { color: 0xe0f7fa, metal: 0, rough: 0.1, clear: true }], [/gypsum|rutile|zirconia|zinc-oxide|portland/, { color: 0xf4f1ea, metal: 0, rough: 0.9 }], [/^ps$/, { color: 0xf7f7f2, metal: 0, rough: 0.8 }], [/borosilicate/, { color: 0xd8f3fb, metal: 0, rough: 0.05, clear: true }], [/^tungsten$/, { color: 0xa9adb1, metal: 1, rough: 0.35 }], [/al-4043|al-5356/, { color: 0xc9ced3, metal: 0.85, rough: 0.35 }],
  ];
  return T.find(([re]) => re.test(m))?.[1] ?? { color: 0x9aa7b0, metal: 0.3, rough: 0.5 };
}
/** What a thing is mostly made of: the material of its first part that is a material, or of its first part's. */
export function mainMaterial(i: Item, depth = 0): string {
  if (i.kind === 'material' || i.kind === 'element') return i.id;
  if (depth > 6) return '';
  const mats = i.of.map((c) => INVENTORY.get(c.id)).filter((x): x is Item => !!x);
  const m = mats.find((x) => x.kind === 'material'); if (m) return m.id;
  for (const x of mats) { const y = mainMaterial(x, depth + 1); if (y) return y; }
  return '';
}
const mm = (x: number) => x / 1000;
/** Its box, metres, and where that came from: its own size, the typical size of its kind (src/nexus/looks.ts), its
 *  mass at its material's density, or a guess. */
export function sized(i: Item): { box: V3; from: 'size' | 'typical' | 'mass' | 'guess' } {
  if (i.size && i.size.every((x) => x > 0)) return { box: i.size.map(mm) as V3, from: 'size' };
  const row = lookRow(i.id); if (row) return { box: row.size.map(mm) as V3, from: 'typical' };
  if (i.kind === 'element') return { box: [0.03, 0.03, 0.03], from: 'typical' };
  if (i.kind === 'material') return { box: [0.04, 0.04, 0.04], from: 'typical' };
  if (i.g && i.g > 0) { const s = Math.cbrt(i.g / 1.5) / 100; return { box: [s * 1.3, s * 0.9, s], from: 'mass' }; }
  return { box: [0.06, 0.06, 0.06], from: 'guess' };
}
export const boxOf = (i: Item): V3 => sized(i).box;
const F = (i: Item) => i.sized?.family ?? i.family ?? '';
const P = (i: Item, k: string) => Number(i.sized?.params[k]);
/** How a thing looks: the shape of its kind, at its size, in its finish. */
export function lookOf(i: Item): Look {
  const f = F(i), id = i.id, name = i.name.toLowerCase(), size = boxOf(i), finish = finishOf(mainMaterial(i) || 'steel');
  const L = (kind: ShapeKind, more: Partial<Look> = {}): Look => ({ kind, size, finish, ...more });
  const bores: Partial<Record<ShapeKind, number>> = { gear: 0.2, ring: 0.5, tube: 0.8, bearing: 0.35 };
  // a kind's own look: its shape, then a mark, its wire in mm and its teeth ("coil w12", "gear z60")
  const own = (t: string[]) => { const w = t.find((x) => /^w[\d.]+$/.test(x)), z = t.find((x) => /^z\d+$/.test(x)), mark = t.find((x) => !/^[wz][\d.]+$/.test(x)); return { ...(mark ? { mark } : {}), ...(w ? { wire: Number(w.slice(1)) / 1000 } : {}), ...(z ? { teeth: Number(z.slice(1)) } : {}) }; };
  const row: { kind: string; teeth?: number; mark?: string; wire?: number } | null = lookRow(id) ?? (i.look ? (([kind, ...t]) => ({ kind: kind!, ...own(t) }))(i.look.split(' ')) : null);
  if (row && SHAPES.includes(row.kind as ShapeKind)) return L(row.kind as ShapeKind, { ...(row.teeth ? { teeth: row.teeth } : {}), ...(row.mark ? { mark: row.mark } : {}), ...(row.wire ? { wire: row.wire } : {}), ...(bores[row.kind as ShapeKind] ? { bore: bores[row.kind as ShapeKind] } : {}) });
  if (i.kind === 'element') return L('atom', { mark: Object.keys(ELEMENTS).find((s) => `el-${s.toLowerCase()}` === id) ?? '?' });
  if (i.kind === 'material') return L('swatch');
  if (/^(screw|bolt|countersunk|buttonhead|panhead|carriagebolt|shoulderbolt|eyebolt|drywallscrew|chipboardscrew)$/.test(f) || /^screw-|^bolt-/.test(id)) return L('screw', { mark: /^(countersunk|drywallscrew|chipboardscrew)$/.test(f) ? 'flat' : f === 'buttonhead' || f === 'panhead' || f === 'carriagebolt' ? 'dome' : f === 'bolt' ? 'hex' : 'socket' });
  if (/^(setscrew|threadedrod|leadscrew|ballscrew|dowel|springpin|clevispin|splitpin|nail|rod|rodend)$/.test(f) || (f === 'antenna' && !/pcb/.test(id)) || (f === 'audiojack' && /plug/.test(id)) || /shaft|rod-|smooth-rod|lead-screw|spoke/.test(id)) return L('rod', { mark: /threaded|lead|ball|setscrew/.test(f) || /lead-screw/.test(id) ? 'thread' : '' });
  if (/^(nut|flangenut|capnut|wingnut|standoff|hexbar|slotnut)$/.test(f) || /^nut-|t-nut/.test(id)) return L('hex', { bore: /hexbar|standoff/.test(f) ? 0 : 0.55 });
  if (/^(bearing|thrustbearing|needlebearing|flangebearing|camfollower|taperbearing|angularbearing|selfaligning|sphericalbearing)$/.test(f) || /bearing-6|^bearing|lm8uu|bushing/.test(id)) return L('bearing', { bore: Math.min(0.7, Math.max(0.3, P(i, 'd') / 1000 / size[0] || 0.4)), ...(f === 'taperbearing' ? { mark: 'taper' } : /^(needlebearing|sphericalbearing)$/.test(f) ? { mark: 'rollers' } : {}) });
  if (/^(oring|oringcord|biketyre)$/.test(f) || /o-?ring/.test(name)) return L('torus');
  if (/^(washer|fenderwasher|springwasher|circlip|circlipint|eclip|collar|plainbush|shaftseal|discspring|linear|pillowblock|flangeunit|coupling|jawcoupling|rigidcoupling|heatshrink|ferrule)$/.test(f)) return L('ring', { bore: /washer|circlip|eclip|discspring|ferrule|heatshrink/.test(f) ? 0.5 : 0.4 });
  if (/^(tube|pipe|coppertube|airtube|softhose|boxsection|pexpipe|conduit|hydraulichose)$/.test(f) || /tube-|^pipe-|hose/.test(id)) return L('tube', { bore: 0.8 });
  if (/^(gear|helicalgear|ringgear|sprocket|pulley|htdpulley|vpulley|idler|bevelgear|wormset)$/.test(f) || /gear|pulley|chainring|sprocket/.test(id)) return L('gear', { teeth: Math.max(8, Math.min(120, P(i, 'z') || P(i, 'teeth') || 20)), bore: 0.2 });
  if (/^(spring|extspring|torsionspring)$/.test(f) || /spring-(compression|extension|torsion)|^spring/.test(id)) return L('spring', { coils: Math.max(3, Math.min(40, P(i, 'n') || 8)), wire: mm(P(i, 'd') || 1) });
  if (/^(sheet|pcb|thermalpad|abrasive|hookloop|mirror|lens|tape)$/.test(f) || /sheet|pcb|plywood|acrylic/.test(id)) return L('sheet');
  if (/^(extrusion|guiderail|dinrail|angle|channel|ibeam|flatbar|squarebar|lumber|rack|trunking|heatsink)$/.test(f) || /extrusion|rail|beam/.test(id)) return L('tslot', { mark: f === 'extrusion' ? 'tslot' : f === 'heatsink' ? 'fins' : '' });
  if (/^(wire|multicore|mainscord|coax|patchcord|usbcable|rope|sleeving|chain|solderwire|filament)$/.test(f) || /wire|cable|cord|lead-wire/.test(id)) return L('coil', { wire: Math.max(0.0015, Math.min(size[0], size[1])), coils: 5 });
  if (/^(belt|vbelt|htdbelt)$/.test(f) || /belt/.test(id)) return L('loop');
  if (/^(stepper|dcmotor|servo|outrunner|gearmotor|vibmotor|fan|linactuator|acmotor)$/.test(f) || /motor|nema|servo|mg996r|fan-/.test(id)) return L('motor', { mark: /stepper|nema/.test(f + id) ? 'square' : '' });
  if (/^(mcb|rcd|contactor|memorycard)$/.test(f)) return L('case');
  if (/^(sensormodule)$/.test(f) || (f === 'antenna' && /pcb/.test(id))) return L('board');
  if (/^(cell|battery|capacitor|crystal|thermistor|fuse|gasstrut|aircylinder|heatpipe|thermocouple|rtd|proxsensor|cablegland|microphone|xlr|rfconn)$/.test(f) || /cell|battery|capacitor-electrolytic|cylinder/.test(id)) return L('can');
  if (/^(chip|regulator|transistor|chipresistor|mlcc|smdled|display|tec)$/.test(f) || /ic-package|chip|module|board|esp32|arduino|raspberry/.test(id)) return L('chip', { mark: String(i.sized?.params.pkg ?? '') });
  if (/^(led|laserdiode|lamp|loudspeaker|pushbutton22)$/.test(f) || /^led-|ws2812|bulb/.test(id)) return L('dome');
  return L('box');
}
const vol = (s: V3) => s[0] * s[1] * s[2];
/** Points round an ellipse facing you, rings of them if many. */
function ringOf(n: number, rx: number, ry: number): V3[] {
  if (n <= 0) return [];
  const rows = n <= 10 ? [n] : [Math.ceil(n * 0.45), n - Math.ceil(n * 0.45)];
  return rows.flatMap((k, r) => Array.from({ length: k }, (_, j): V3 => { const t = Math.PI / 2 + (j / k) * Math.PI * 2 + r * 0.3; const f = r ? 1.42 : 1; return [Math.cos(t) * rx * f, Math.sin(t) * ry * f, r ? -0.06 : 0]; }));
}
/** The most kinds of part laid out at once; the rest are counted. */
export const MOST = 18;
/** How an item comes apart: its look whole, scaled to fit about 0.3 m, and each of its parts round it at the same scale. */
export function planOf(id: string, fit = 0.3): Plan | null {
  const i = INVENTORY.get(id); if (!i) return null;
  const whole = lookOf(i), scale = fit / Math.max(...whole.size);
  type Row = { item: Item; n: number; pct?: number };
  let rows: Row[];
  let says: string;
  if (i.kind === 'element') {
    rows = [...INVENTORY.values()].filter((x) => x.makeup?.some((m) => m.id === id)).map((x) => ({ item: x, n: 1, pct: x.makeup!.find((m) => m.id === id)!.pct })).sort((a, b) => b.pct! - a.pct!);
    says = `${i.name}: ${i.says}. ${rows.length} materials here are made with it.`;
  } else if (i.kind === 'material') {
    rows = (i.makeup ?? []).map((m) => ({ item: INVENTORY.get(m.id)!, n: 1, pct: m.pct })).filter((r) => r.item);
    says = `${i.name}: ${i.spec ?? i.says}. By mass: ${rows.slice(0, 6).map((r) => `${r.item.name.replace(/ \(.*\)$/, '')} ${r.pct! >= 1 ? r.pct!.toFixed(1) : r.pct!.toFixed(2)} %`).join(', ')}.`;
  } else {
    rows = i.of.map((c) => ({ item: INVENTORY.get(c.id)!, n: c.n })).filter((r) => r.item).sort((a, b) => vol(boxOf(b.item)) * b.n - vol(boxOf(a.item)) * a.n);
    says = `${i.name}: ${rows.length} kinds of part, ${countSays(rows.reduce((a, r) => a + r.n, 0))} in all, laid round it (where each sits inside it is not in the inventory)${i.spec ? `. ${i.spec}` : ''}.`;
  }
  const shownRows = rows.slice(0, MOST), at = ringOf(shownRows.length, fit * 1.6, fit * 1.0);
  const pieces: Piece[] = shownRows.map((r, k) => {
    const look = r.pct !== undefined && (r.item.kind === 'element' || r.item.kind === 'material') && i.kind === 'material'
      ? { ...lookOf(r.item), size: [1, 1, 1].map(() => Math.max(0.012, 0.075 * Math.cbrt(r.pct! / 100))) as V3 }
      : lookOf(r.item);
    const s = look.size.map((x) => x * (r.pct !== undefined && i.kind === 'material' ? 1 : scale)) as V3, big = Math.max(...s);
    // too small to see, or so big it hides the rest: shown at a size you can see, and it says so
    const least = fit * 0.2, shown = big < least ? least / big : big > fit * 0.7 ? (fit * 0.7) / big : 1;
    const size = s.map((x) => x * shown) as V3;
    const sz = sized(r.item), real = sz.box.map((x) => +(x * 1000).toPrecision(3)) as V3, dims = sz.from === 'guess' ? 'size not known' : `${sz.from === 'size' ? '' : 'about '}${real.join(' × ')} mm${sz.from === 'mass' ? ' (from its mass)' : ''}`;
    return { id: r.item.id, name: r.item.name, n: r.n, look: { ...look, size }, whole: [0, 0, 0], apart: at[k]!, shown,
      note: `${r.n !== 1 ? `${countSays(r.n)} × ` : ''}${r.item.name}${r.pct !== undefined ? ` · ${r.pct >= 1 ? r.pct.toFixed(1) : r.pct.toFixed(2)} %` : ''}${r.item.kind === 'material' || r.item.kind === 'element' ? '' : ` · ${dims}`}${shown > 1.01 ? ' · shown larger' : shown < 0.99 ? ' · shown smaller' : ''}` };
  });
  return { id, name: i.name, says, whole: { ...whole, size: whole.size.map((x) => x * scale) as V3 }, pieces, more: Math.max(0, rows.length - MOST), scale, deeper: rows.length > 0 };
}
/** The way down from an item to an element, always: its first part each time, then the material, then the element. */
export function wayDown(id: string, most = 20): string[] {
  const out = [id];
  for (let k = 0; k < most; k++) { const p = planOf(out.at(-1)!); const i = INVENTORY.get(out.at(-1)!); if (!p || !i || i.kind === 'element' || !p.pieces.length) break; out.push(p.pieces[0]!.id); }
  return out;
}
