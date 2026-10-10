// What an item of the inventory gives besides itself: its bill of materials, flat; its mass, added up from what is in
// it; where it is used; an OpenSCAD model of it (made to its sizes where it is a sized part, its box where not, which
// the room's OpenSCAD reader also builds); it beside another; the entries a few words find; and what kind of thing it
// is, by what it does.

import { INVENTORY, inventoryRev, plan, type Item } from '../parts/inventory';
import { BEARINGS, CHAINS, IPE, METRIC, NPS40, HEX_K } from '../parts/families';

// ---- the bill of materials ---------------------------------------------------------------------------------------------
export interface BomRow { id: string; name: string; n: number; how: 'bought' | 'stock' | 'made'; unit?: string }
/** Everything that goes into one of it, flat: what is bought and what is taken from stock, added up across the tree;
 *  and, apart, what is made here on the way. */
export function flatBom(id: string): { buy: BomRow[]; made: BomRow[] } {
  const buy = new Map<string, BomRow>(), made = new Map<string, BomRow>();
  for (const r of plan(id).slice(1)) {
    const it = INVENTORY.get(r.id)!, how = r.kind === 'material' ? 'stock' : r.route.bought ? 'bought' : 'made', to = how === 'made' ? made : buy;
    const was = to.get(r.id); if (was) was.n += r.n; else to.set(r.id, { id: r.id, name: it.name, n: r.n, how });
  }
  const order = (m: Map<string, BomRow>) => [...m.values()].sort((a, b) => (a.how === b.how ? b.n - a.n : a.how === 'bought' ? -1 : 1));
  return { buy: order(buy), made: order(made) };
}
/** The bill as CSV, to paste into a spreadsheet. */
export const bomCsv = (id: string): string => ['id,name,quantity,how', ...[...flatBom(id).buy, ...flatBom(id).made].map((r) => `${r.id},"${r.name.replace(/"/g, "'")}",${r.n},${r.how}`)].join('\n');

// ---- mass --------------------------------------------------------------------------------------------------------------
/** Its mass: its own where it is known; else what is in it, added up, each part by its own or by what is in that. Says
 *  how many of the parts counted have no mass known (materials taken as they are have none: their amount is the part's). */
export function massOf(id: string): { g: number; known: number; unknown: string[] } {
  const unknown = new Set<string>(); let known = 0;
  const walk = (x: string, depth: number): number => {
    const i = INVENTORY.get(x); if (!i || depth > 12) return 0;
    if (i.g !== undefined) { known++; return i.g; }
    if (!i.of.length || i.kind === 'material') { unknown.add(i.name); return 0; }
    return i.of.reduce((a, c) => a + c.n * walk(c.id, depth + 1), 0);
  };
  const g = walk(id, 0);
  return { g, known, unknown: [...unknown] };
}

// ---- where used --------------------------------------------------------------------------------------------------------
let usedAt = -1; const parents = new Map<string, Set<string>>();
/** What has it in it, directly; and the products it ends up in, however deep. */
export function usedIn(id: string): { direct: Item[]; products: Item[] } {
  if (usedAt !== inventoryRev()) { parents.clear(); for (const i of INVENTORY.values()) for (const c of i.of) { let s = parents.get(c.id); if (!s) parents.set(c.id, (s = new Set())); s.add(i.id); } usedAt = inventoryRev(); }
  const direct = [...(parents.get(id) ?? [])].map((x) => INVENTORY.get(x)!).filter(Boolean);
  const seen = new Set<string>(), products = new Set<Item>(), up = [id];
  while (up.length) { const x = up.pop()!; for (const p of parents.get(x) ?? []) { if (seen.has(p)) continue; seen.add(p); const it = INVENTORY.get(p)!; if (it.kind === 'product') products.add(it); up.push(p); } }
  return { direct, products: [...products].sort((a, b) => a.name.localeCompare(b.name)) };
}

// ---- an OpenSCAD model -------------------------------------------------------------------------------------------------
const n3 = (x: number) => +x.toFixed(3);
/** OpenSCAD for an item, in mm, z up: made to its sizes where it is a sized part (a screw's shank and head, a nut's hex,
 *  a bearing's rings, a gear's blank and teeth, a spring's coils as rings, a beam's flanges and web …), else its box. */
export function scadOf(i: Item): string {
  const s = i.sized, p = s?.params ?? {}, head = `// ${i.name}${i.spec ? `: ${i.spec}` : ''}\n$fn = 48;\n`;
  const box = () => { const [w, d, h] = i.size ?? [20, 20, 10]; return `${head}cube([${n3(w)}, ${n3(d)}, ${n3(h)}]);\n`; };
  if (!s) return box();
  switch (s.family) {
    case 'screw': case 'bolt': case 'setscrew': case 'threadedrod': {
      const t = String(p.thread), T = METRIC[t]!, d = Number(t.slice(1)), L = Number(p.length);
      if (s.family === 'setscrew' || s.family === 'threadedrod') return `${head}cylinder(h = ${L}, d = ${d});\n`;
      const hex = s.family === 'bolt', k = hex ? HEX_K[t] ?? 0.7 * d : T.k;
      return `${head}// the shank, the head on top\ncylinder(h = ${L}, d = ${d});\ntranslate([0, 0, ${L}]) ${hex ? `cylinder(h = ${k}, d = ${n3(T.s / Math.cos(Math.PI / 6))}, $fn = 6)` : `difference() { cylinder(h = ${k}, d = ${T.dk}); translate([0, 0, ${n3(k / 2)}]) cylinder(h = ${n3(k / 2 + 0.1)}, d = ${n3(d * 0.6)}, $fn = 6); }`};\n`;
    }
    case 'nut': { const t = String(p.thread), T = METRIC[t]!, d = Number(t.slice(1)); return `${head}difference() { cylinder(h = ${T.m}, d = ${n3(T.s / Math.cos(Math.PI / 6))}, $fn = 6); translate([0, 0, -0.1]) cylinder(h = ${n3(T.m + 0.2)}, d = ${d}); }\n`; }
    case 'washer': { const T = METRIC[String(p.thread)]!; return `${head}difference() { cylinder(h = ${T.h}, d = ${T.d2}); translate([0, 0, -0.1]) cylinder(h = ${n3(T.h + 0.2)}, d = ${T.d1}); }\n`; }
    case 'bearing': { const [d, D, B] = BEARINGS[String(p.number)]!; return `${head}// outer ring, inner ring (the balls between them are not drawn)\ndifference() { cylinder(h = ${B}, d = ${D}); translate([0, 0, -0.1]) cylinder(h = ${B + 0.2}, d = ${n3(D - (D - d) * 0.3)}); }\ndifference() { cylinder(h = ${B}, d = ${n3(d + (D - d) * 0.3)}); translate([0, 0, -0.1]) cylinder(h = ${B + 0.2}, d = ${d}); }\n`; }
    case 'gear': { const m = Number(p.m), z = Number(p.z), b = Number(p.b), r = (m * z) / 2; let teeth = ''; for (let k = 0; k < z; k++) { const a = (2 * Math.PI * k) / z; teeth += `translate([${n3((r + m * 0.4) * Math.cos(a))}, ${n3((r + m * 0.4) * Math.sin(a))}, 0]) cylinder(h = ${b}, d = ${n3(m * 1.5)}, $fn = 8);\n`; } return `${head}// the blank at the root circle, a tooth at each pitch (a sketch of the involute: print it from the slicer's shape)\ncylinder(h = ${b}, r = ${n3(r - 1.25 * m)});\n${teeth}`; }
    case 'spring': { const d = Number(p.d), D = Number(p.D), L = Number(p.L), n = Number(p.n), tot = n + 2; let rings = ''; for (let k = 0; k < tot; k++) rings += `translate([0, 0, ${n3(k * ((L - d) / Math.max(1, tot - 1)))}]) difference() { cylinder(h = ${d}, d = ${n3(D + d)}); translate([0, 0, -0.1]) cylinder(h = ${n3(d + 0.2)}, d = ${n3(D - d)}); }\n`; return `${head}// a coil as a ring each turn (a helix in OpenSCAD wants linear_extrude with twist)\n${rings}`; }
    case 'rod': return `${head}cylinder(h = ${Number(p.length)}, d = ${Number(p.d)});\n`;
    case 'dowel': return `${head}cylinder(h = ${Number(p.length)}, d = ${Number(p.d)});\n`;
    case 'magnet': return `${head}cylinder(h = ${Number(p.h)}, d = ${Number(p.d)});\n`;
    case 'tube': { const D = Number(p.od), t = Number(p.wall), L = Number(p.length); return p.shape === 'square' ? `${head}difference() { cube([${D}, ${D}, ${L}]); translate([${t}, ${t}, -0.1]) cube([${n3(D - 2 * t)}, ${n3(D - 2 * t)}, ${L + 0.2}]); }\n` : `${head}difference() { cylinder(h = ${L}, d = ${D}); translate([0, 0, -0.1]) cylinder(h = ${L + 0.2}, d = ${n3(D - 2 * t)}); }\n`; }
    case 'pipe': { const [OD, t] = NPS40[String(p.nps)]!, L = Number(p.length) * 1000; return `${head}difference() { cylinder(h = ${L}, d = ${OD}); translate([0, 0, -0.1]) cylinder(h = ${L + 0.2}, d = ${n3(OD - 2 * t)}); }\n`; }
    case 'ibeam': { const [h, b, tw, tf] = IPE[String(p.size)]!, L = Number(p.length) * 1000; return `${head}// the bottom flange, the web, the top flange, along y\ncube([${b}, ${L}, ${tf}]);\ntranslate([${n3((b - tw) / 2)}, 0, ${tf}]) cube([${tw}, ${L}, ${n3(h - 2 * tf)}]);\ntranslate([0, 0, ${n3(h - tf)}]) cube([${b}, ${L}, ${tf}]);\n`; }
    case 'sprocket': { const C = CHAINS[String(p.series)]!, z = Number(p.z), D = C.p / Math.sin(Math.PI / z), t = 0.93 * C.width; return `${head}difference() { cylinder(h = ${n3(t)}, d = ${n3(D + C.p * 0.3)}); translate([0, 0, -0.1]) cylinder(h = ${n3(t + 0.2)}, d = ${Number(p.bore)}); }\n`; }
    case 'pulley': { const z = Number(p.teeth), D = (2 * z) / Math.PI; return `${head}cylinder(h = 7, d = ${n3(D)});\ntranslate([0, 0, 7]) cylinder(h = 1, d = ${n3(D + 3)});\ntranslate([0, 0, -1]) cylinder(h = 1, d = ${n3(D + 3)});\n`; }
    case 'linear': { const d = String(p.d), sz = ({ '3': [3, 7, 10], '4': [4, 8, 12], '5': [5, 10, 15], '6': [6, 12, 19], '8': [8, 15, 24], '10': [10, 19, 29], '12': [12, 21, 30], '16': [16, 28, 37], '20': [20, 32, 42] } as Record<string, number[]>)[d]!; return `${head}difference() { cylinder(h = ${sz[2]}, d = ${sz[1]}); translate([0, 0, -0.1]) cylinder(h = ${sz[2]! + 0.2}, d = ${sz[0]}); }\n`; }
    default: return box();
  }
}

// ---- side by side; found by words; and by what it does ------------------------------------------------------------------
/** Two items side by side: what each is, its sizes, its mass, how deep it goes and how it is made here. */
export function compare(a: Item, b: Item): string[] {
  const row = (i: Item) => { const p = plan(i.id), m = massOf(i.id); return { kind: `${i.kind}, ${typeOf(i)}`, spec: i.spec ?? '—', mass: m.g ? `${m.g >= 1000 ? `${(m.g / 1000).toFixed(2)} kg` : `${m.g.toFixed(1)} g`}${m.unknown.length ? ` (+ ${m.unknown.length} of no known mass)` : ''}` : '—', parts: `${p.length - 1} inside, ${Math.max(0, ...p.map((r) => r.depth))} levels`, made: p[0]!.route.bought ? 'bought' : `made here: ${p[0]!.route.process}` }; };
  const x = row(a), y = row(b);
  return (Object.keys(x) as (keyof typeof x)[]).map((k) => `${k}: ${a.name}: ${x[k]} | ${b.name}: ${y[k]}`);
}
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9.]+/).filter((w) => w.length > 1);
/** The entries a few words find, the best first: a word in its name or id counts most, then its category, then what it
 *  says; a word that starts one of its words counts a little. */
export function search(q: string, n = 10): Item[] {
  const qs = words(q); if (!qs.length) return [];
  const scored: [Item, number][] = [];
  for (const i of INVENTORY.values()) {
    const fields: [string[], number][] = [[words(`${i.name} ${i.id.replace(/-/g, ' ')}`), 3], [words(i.path.join(' ')), 2], [words(`${i.says} ${i.spec ?? ''}`), 1]];
    let s = 0; for (const w of qs) for (const [ws, k] of fields) { if (ws.includes(w)) s += k; else if (ws.some((x) => x.startsWith(w))) s += k * 0.4; }
    if (s > 0) scored.push([i, s + (i.kind === 'product' ? 0.5 : 0)]);
  }
  return scored.sort((a, b) => b[1] - a[1]).slice(0, n).map(([i]) => i);
}
/** What kind of thing it is, by what it does: a fastener, a bearing, a transmission, an actuator, a sensor, power,
 *  electronics, a structure, fluid, heat, light and optics, sound, a machine, a vehicle, a tool, a material … */
const TYPES: [RegExp, string][] = [
  [/^Elements/, 'element'], [/^Materials/, 'material'], [/Tools/i, 'tool'], [/Fasteners|Retaining rings|Pins/, 'fastener'], [/Bearings/, 'bearing'], [/Gears|Pulleys|Belts|chain|Sprockets|Lead screws|Couplings|Keys|Shafts/i, 'transmission'],
  [/Motors|actuators|Servos|Solenoid|Gear motors/i, 'actuator'], [/Sensors|Thermistor|Temperature/i, 'sensor'], [/Power|Batter|Cells|Solar/i, 'power'],
  [/Heating|Thermal|Heat sinks/i, 'heat'], [/Fluid|Pump|Valve|Pipe/i, 'fluid'], [/Optics|Lighting|Laser|Lens|Camera|Imaging/i, 'light and optics'], [/Audio|Speaker|Music/i, 'sound'],
  [/Vehicles|Bicycles|Scooters|Boards|Drones/i, 'vehicle'], [/Robot/i, 'robot'], [/Home|Kitchen|Appliance|Cleaning|Personal/i, 'appliance'],
  [/Connectors|Pin headers|Wire|Cable/i, 'connection'], [/Electrical|Electronics|Boards|Chips|Passives|Switching|Displays/i, 'electronics'], [/Structural|Profiles|Beams|Sheet|Tube|Frames/i, 'structure'],
  [/Machines|3D printer/i, 'machine'], [/Mechanical/, 'mechanism'], [/Hardware/, 'hardware'],
];
export function typeOf(i: Item): string { const path = i.path.join('/'); return TYPES.find(([re]) => re.test(path))?.[1] ?? 'other'; }
/** How many of each type the inventory holds. */
export function types(): Map<string, number> { const m = new Map<string, number>(); for (const i of INVENTORY.values()) m.set(typeOf(i), (m.get(typeOf(i)) ?? 0) + 1); return new Map([...m].sort((a, b) => b[1] - a[1])); }
