// The build sheet: what you would need to make it for real, and how. Every assembly, each of its parts and what each
// part is cut from (and, for a glued-up panel, the boards in it), each joint and the hardware in it, what to buy,
// how to cut it, the order to put it together, and what was checked and what wasn't. Real stock comes in real sizes:
// a part that can't be cut from anything you can buy, or a joint whose fasteners don't fit its face, is said to be
// a problem here, not left for the workshop to find.

import { getConnectorKind } from '../connectors/registry';
import { connectionGeometry, driven, sectionThickness } from '../connectors/through';
import type { Material } from '../data/materials';
import { ADHESIVES, FILLERS } from '../engineering/joining';
import { fastenerFit } from '../engineering/spacing';
import { fastenerName } from '../engineering/fasteners';
import { METRIC_COARSE } from '../engineering/threads';
import type { BuildDoc, Connection, Part } from '../doc/types';
import { effectiveParams, fittedGearhead, getPartKind, LUMBER, massOf } from '../parts/registry';
import { getMotor, type Price } from '../data/motors';
import { getBattery, WIRE_GAUGES } from '../data/batteries';
import { numberOf, stringOf } from '../schema/params';

const mm = (x: number) => `${Math.round(x * 1000)} mm`;
const kg = (x: number) => (x < 1 ? `${Math.round(x * 1000)} g` : `${x.toFixed(1)} kg`);

/** Saw kerf allowed between cuts on one board (a circular saw blade, about 3 mm). */
export const KERF = 0.003;
/** Lumber is sold in 2 ft steps from 8 to 16 ft. */
export const LUMBER_LENGTHS = [2.438, 3.048, 3.658, 4.267, 4.877];
/** Steel and aluminium bar, tube and section: 6 m (20 ft) lengths. */
export const BAR_LENGTH = 6.096;
/** Sheet goods (plywood, MDF, metal and plastic sheet): 2440 x 1220 mm (8 x 4 ft). */
export const SHEET: [number, number] = [2.44, 1.22];
/** Solid wood panels: the boards in each layer, and the thickest it flattens to (1x is 19 mm, 2x is 38 mm actual). */
export const SOLID_LAYERS = [
  { t: 0.018, boards: ['1x6'] },
  { t: 0.035, boards: ['2x6'] },
  { t: 0.054, boards: ['2x6', '1x6'] },
  { t: 0.072, boards: ['2x6', '2x6'] },
];
/** Plywood and MDF thicknesses sold (mm). */
const SHEET_THICKNESS = [3, 6, 9, 12, 15, 18, 21, 24, 25, 30];
/** ISO 4014/4017 bolt lengths (mm). */
const BOLT_LENGTHS = [16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200, 220, 240, 260, 280, 300];

export interface SheetPart {
  id: string;
  name: string;
  what: string;
  material: string;
  size: string;
  mass: number;
  /** What it is cut from, or bought as. */
  from: string;
  /** What it is made of in turn (the boards in a glued-up panel). */
  sub: string[];
  problems: string[];
}

export interface SheetJoint {
  id: string;
  between: string;
  process: string;
  /** The hardware and consumables in it. */
  sub: string[];
  notes: string[];
  problems: string[];
  /** How hard it worked on the test stand, if it was tested. */
  tested?: string;
}

export interface SheetAssembly { parts: SheetPart[]; joints: SheetJoint[]; mass: number }

export interface BuildSheet {
  title: string;
  assemblies: SheetAssembly[];
  /** Everything to buy, consolidated. */
  buy: string[];
  /** Each length of stock and the cuts on it. */
  cuts: string[];
  /** The order to put it together. */
  steps: string[];
  problems: string[];
  /** What the design was checked for, and what nothing here checks. */
  checked: string[];
  unchecked: string[];
  mass: number;
}

const isWood = (m: Material) => m.category === 'wood' || m.category === 'engineered-wood';
const isMetal = (m: Material) => ['steel', 'stainless', 'aluminum', 'titanium', 'copper-alloy', 'cast-iron'].includes(m.category);

/** First-fit decreasing: the fewest lengths of `stock` the cuts fit on, kerf between them. Each length's cuts. */
export function packLengths(cuts: { label: string; length: number }[], stock: number): { label: string; length: number }[][] {
  const bins: { left: number; items: { label: string; length: number }[] }[] = [];
  for (const c of [...cuts].sort((a, b) => b.length - a.length)) {
    if (c.length > stock) continue;
    const bin = bins.find((b) => b.left >= c.length + (b.items.length ? KERF : 0));
    if (bin) { bin.left -= c.length + (bin.items.length ? KERF : 0); bin.items.push(c); }
    else bins.push({ left: stock - c.length, items: [c] });
  }
  return bins.map((b) => b.items);
}

/**
 * Rectangles onto sheets, in shelves (first-fit decreasing height, each piece turned whichever way fits better). The
 * sheets used, each with its pieces. A piece bigger than a sheet in both orientations is left out (and is a problem).
 */
export function packSheets(pieces: { label: string; w: number; h: number }[], sheet: [number, number]): { label: string; w: number; h: number }[][] {
  const [SW, SH] = sheet;
  const fit = pieces.filter((p) => (p.w <= SW && p.h <= SH) || (p.h <= SW && p.w <= SH))
    .map((p) => (p.w <= SW && p.h <= SH && (p.h <= p.w || p.w > SH) ? p : { ...p, w: p.h, h: p.w }))
    .sort((a, b) => b.h - a.h);
  const sheets: { shelves: { y: number; h: number; x: number }[]; used: number; items: typeof fit }[] = [];
  for (const p of fit) {
    let placed = false;
    for (const s of sheets) {
      const shelf = s.shelves.find((sh) => p.h <= sh.h && sh.x + p.w <= SW);
      if (shelf) { shelf.x += p.w + KERF; s.items.push(p); placed = true; break; }
      if (s.used + p.h <= SH) { s.shelves.push({ y: s.used, h: p.h, x: p.w + KERF }); s.used += p.h + KERF; s.items.push(p); placed = true; break; }
    }
    if (!placed) sheets.push({ shelves: [{ y: 0, h: p.h, x: p.w + KERF }], used: p.h + KERF, items: [p] });
  }
  return sheets.map((s) => s.items);
}

interface Linear { kind: 'lumber' | 'bar'; stock: string; length: number; label: string }

const SYMBOL: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' };
/** ", about €502 (maxon online shop, seen 2026-10)": what it sold for, where and when; nothing when no price is charted. */
function priceOf(p: Price | undefined): string {
  return p ? `, about ${SYMBOL[p.currency] ?? ''}${p.amount.toFixed(2)} each (${p.note}, seen ${p.seen})` : '';
}
interface Sheet { thickness: number; material: Material; w: number; h: number; label: string }

/** What a part is cut from or bought as, and any reason it can't be. */
function stockOf(p: Part, m: Material, linear: Linear[], sheets: Sheet[]): { from: string; sub: string[]; problems: string[]; size: string } {
  const k = getPartKind(p.kind), e = effectiveParams(k, p.params, m);
  const n = (key: string) => numberOf(e, key, 0);
  const problems: string[] = [];
  if (stringOf(p.params, 'fracture', 'auto') === 'off') problems.push('set to be unbreakable, which nothing real is: its strength here is not checked');
  switch (p.kind) {
    case 'lumber': {
      const size = stringOf(e, 'size', '2x4');
      const L = n('length');
      if (L > LUMBER_LENGTHS[LUMBER_LENGTHS.length - 1]!) problems.push(`${mm(L)} is longer than ${size} lumber is sold (16 ft, 4877 mm): it needs a splice`);
      linear.push({ kind: 'lumber', stock: `${size} ${m.name}`, length: L, label: p.name });
      const [t, w] = LUMBER[size] ?? [0, 0];
      return { from: `${size} lumber (${mm(t)} × ${mm(w)} actual), cut to ${mm(L)}`, sub: [], problems, size: `${size} × ${mm(L)}` };
    }
    case 'rod.round': case 'rod.square': case 'tube.round': case 'tube.square': case 'angle': case 'beam.i': {
      const L = n('length');
      if (L > BAR_LENGTH) problems.push(`${mm(L)} is longer than the 6 m lengths bar and tube are sold in: it needs a splice`);
      const sect = p.kind === 'rod.round' ? `Ø${mm(n('diameter'))} round bar` : p.kind === 'rod.square' ? `${mm(n('side'))} square bar`
        : p.kind === 'tube.round' ? `Ø${mm(n('od'))} × ${mm(n('wall'))} round tube` : p.kind === 'tube.square' ? `${mm(n('side'))} × ${mm(n('wall'))} square tube`
          : p.kind === 'angle' ? `angle ${mm(n('leg') || n('a'))}` : `I-beam ${mm(n('depth'))} × ${mm(n('flange'))}`;
      linear.push({ kind: 'bar', stock: `${sect}, ${m.name}`, length: L, label: p.name });
      return { from: `${sect} in ${m.name}, cut to ${mm(L)}`, sub: [], problems, size: `${sect} × ${mm(L)}` };
    }
    case 'plate': {
      const L = n('length'), W = n('width'), t = n('thickness');
      const size = `${mm(L)} × ${mm(W)} × ${mm(t)}`;
      if (m.category === 'wood') {
        // solid wood: boards edge-glued to width, then flattened, which takes off about 1 mm from 1x stock (19 mm) and
        // 3 mm from 2x (38 mm, which cups more); thicker than that is laminated from layers
        const layers = SOLID_LAYERS.find((x) => x.t >= t - 1e-6);
        if (!layers) problems.push(`${mm(t)} is thicker than solid wood is laminated here (${mm(SOLID_LAYERS[SOLID_LAYERS.length - 1]!.t)})`);
        const use = layers ?? SOLID_LAYERS[SOLID_LAYERS.length - 1]!;
        const count = Math.ceil(W / 0.14);
        const sub: string[] = [];
        for (const board of use.boards) {
          sub.push(`${count} × ${board} ${m.name} boards (${mm(0.14)} wide), ${mm(L)} long, edge-glued${use.boards.length > 1 ? ' as one layer' : ''}`);
          for (let i = 0; i < count; i++) linear.push({ kind: 'lumber', stock: `${board} ${m.name}`, length: L, label: `${p.name} ${board} ${i + 1}` });
        }
        sub.push(`${use.boards.length > 1 ? 'layers glued face to face, ' : ''}flattened to ${mm(t)}`);
        return { from: `a glued-up ${m.name} panel`, sub, problems, size };
      }
      if (m.category === 'engineered-wood' || isMetal(m) || m.category === 'polymer' || m.category === 'polyolefin' || m.category === 'composite') {
        if (m.category === 'engineered-wood' && !SHEET_THICKNESS.includes(Math.round(t * 1000))) problems.push(`${mm(t)} isn't a thickness ${m.name} is sold in (${SHEET_THICKNESS.join(', ')} mm)`);
        if (!((L <= SHEET[0] && W <= SHEET[1]) || (W <= SHEET[0] && L <= SHEET[1]))) problems.push(`${size} is bigger than a ${mm(SHEET[0])} × ${mm(SHEET[1])} sheet: it needs joining from pieces`);
        sheets.push({ thickness: t, material: m, w: L, h: W, label: p.name });
        return { from: `${mm(t)} ${m.name} sheet, cut to ${mm(L)} × ${mm(W)}`, sub: [], problems, size };
      }
      return { from: `${m.name}, ${mm(t)} thick, cut to ${mm(L)} × ${mm(W)}${m.category === 'glass' ? ' by a glass shop (edges ground)' : m.category === 'stone' ? ' from a slab by a stone yard' : ''}`, sub: [], problems, size };
    }
    case 'block': {
      const size = `${mm(n('x'))} × ${mm(n('y'))} × ${mm(n('z'))}`;
      if (m.id === 'ceramic.clay-brick') return { from: 'a standard brick (215 × 102.5 × 65 mm)', sub: [], problems, size };
      if (isWood(m)) return { from: `${m.name} blank, cut to ${size}${Math.min(n('x'), n('y'), n('z')) > 0.089 ? ' (glued up: thicker than a 4x4)' : ''}`, sub: [], problems, size };
      if (isMetal(m)) return { from: `${m.name} bar or block stock, cut to ${size}`, sub: [], problems, size };
      return { from: `${m.name}, cut or cast to ${size}`, sub: [], problems, size };
    }
    case 'wheel': return { from: `a wheel Ø${mm(n('diameter'))} × ${mm(n('width'))} (bought: ${m.name} tyre)`, sub: [], problems, size: `Ø${mm(n('diameter'))}` };
    case 'motor.dc': {
      const mo = getMotor(stringOf(e, 'model', '')), g = fittedGearhead(e);
      return {
        from: `a ${mo.label}${priceOf(mo.price)} (bought)`,
        sub: g ? [`fitted with a ${g.label}${priceOf(g.price)}`] : [], problems, size: k.label,
      };
    }
    case 'battery': {
      const b = getBattery(stringOf(e, 'model', '')), count = n('series') * n('parallel');
      return { from: `${count} × ${b.label}${priceOf(b.price)} (bought)`, sub: [`${n('series')} in series${n('parallel') > 1 ? `, ${n('parallel')} strings in parallel` : ''}`], problems, size: k.label };
    }
    case 'magnet.disc': case 'magnet.block': case 'magnet.electro':
      return { from: p.kind === 'magnet.electro' ? `an electromagnet, ${numberOf(e, 'rating', 0).toFixed(0)} N rated (bought), with its power supply and switch` : `a ${m.name} magnet (bought)`, sub: [], problems, size: k.label };
    case 'sphere': return { from: `a ${m.name} ball Ø${mm(n('diameter'))} (bought)`, sub: [], problems, size: `Ø${mm(n('diameter'))}` };
    case 'disc': return { from: `${mm(n('thickness'))} ${m.name}, cut to a Ø${mm(n('diameter'))} disc`, sub: [], problems, size: `Ø${mm(n('diameter'))} × ${mm(n('thickness'))}` };
    case 'wedge': return { from: `${m.name}, cut to a wedge ${mm(n('length'))} × ${mm(n('height'))} × ${mm(n('width'))}`, sub: [], problems, size: `${mm(n('length'))} × ${mm(n('height'))} × ${mm(n('width'))}` };
    default: return { from: `${m.name} ${k.label.toLowerCase()}`, sub: [], problems, size: k.label };
  }
}

/** A joint, as the hardware and consumables that make it, and anything that stops it being made as specified. */
function jointOf(doc: BuildDoc, c: Connection, materialOf: (p: Part) => Material): Omit<SheetJoint, 'tested'> {
  const k = getConnectorKind(c.kind);
  const A = doc.parts[c.a.part]!, B = c.b ? doc.parts[c.b.part] ?? null : null;
  const mA = materialOf(A), mB = B ? materialOf(B) : null;
  const p = c.params;
  const g = connectionGeometry(doc, c, materialOf);
  const between = `${A.name} – ${B ? B.name : 'the floor'}`;
  const sub: string[] = [], notes: string[] = [], problems: string[] = [];
  const room = fastenerFit(c.kind, p, mA, mB);
  if (room && !room.fits) problems.push(`${room.count} fasteners don't fit a ${mm(numberOf(p, 'bondW', 0))} × ${mm(numberOf(p, 'bondL', 0))} face: ${room.max} do (${room.rule})`);
  // which way a screw, nail or bolt goes: through the part thinner along its path, into (or through) the other
  const way = driven(g.through, !B, g.thicknessA, g.thicknessB);
  const sideName = way.flip ? B!.name : A.name, holdName = way.flip ? A.name : B ? B.name : 'the floor';
  const endGrain = way.endGrain;
  const count = numberOf(p, 'count', 1);
  switch (c.kind) {
    case 'screwed': case 'nailed': {
      const L = numberOf(p, 'length', 0);
      const holding = way.flip ? mA : mB ?? mA;
      const what = fastenerName(c.kind, numberOf(p, 'diameter', 0), L, !!holding.specificGravity);
      sub.push(`${count} × ${what}`);
      if (what.includes('not a stock size')) problems.push(`${what.replace(' (not a stock size)', '')} isn't sold: pick a stocked size`);
      const pen = Math.min(L - way.side, way.hold);
      notes.push(`through ${sideName} (${mm(way.side)}) into ${holdName}${endGrain ? "'s end grain" : ''}, ${mm(Math.max(0, pen))} deep${c.kind === 'screwed' ? ': drill pilot holes' : ''}`);
      if (L > way.side + way.hold) problems.push(`the ${mm(L)} fasteners come out the far side of ${holdName}`);
      break;
    }
    case 'riveted':
      sub.push(`${count} × ${stringOf(p, 'type', 'blind')} rivet Ø${(numberOf(p, 'diameter', 0) * 1000).toFixed(1)} mm, ${stringOf(p, 'rivetMaterial', 'aluminum')}`);
      break;
    case 'bolted': {
      const size = stringOf(p, 'size', 'M8'), cls = stringOf(p, 'class', '8.8');
      const d = METRIC_COARSE[size]?.d ?? 0.008, P = METRIC_COARSE[size]?.P ?? 0.00125;
      const t = g.through;
      const tA = t ? t.a : g.thicknessA, tB = B ? (t ? t.b : g.thicknessB) : 0;
      // a bolt goes through what it can: along a leg's length (its end grain), through more than a bolt is long, or
      // through solid metal deeper than is worth drilling right through (10 d, at least 60 mm), it ends instead in a
      // tapped hole (metal) or a threaded insert (wood) in that part
      const blind = (x: Part | null, through: number, end: boolean) => {
        if (!x) return false;
        const metal = !materialOf(x).specificGravity;
        return end || through > BOLT_LENGTHS[BOLT_LENGTHS.length - 1]! / 1000 - 0.03 || (metal && through > Math.max(0.06, 10 * d));
      };
      const intoA = blind(A, tA, !!t?.endA), intoB = blind(B, tB, !!t?.endB);
      if (intoA && intoB) problems.push(`a bolt can't pass through either part here (${mm(tA)} and ${mm(tB)} along it): it needs a different joint`);
      if (intoA || intoB) {
        const held = intoB ? B! : A, mHeld = materialOf(held), other = intoB ? tA : tB;
        const engage = (mHeld.specificGravity ? 2 : 1.5) * d;
        const need = other + engage + 0.2 * d;
        const len = BOLT_LENGTHS.find((l) => l / 1000 >= need) ?? null;
        if (mHeld.specificGravity) {
          const insert = 1.6 * d, wall = (sectionThickness(held, mHeld) - insert) / 2;
          sub.push(`${count} × ${size} threaded insert (about Ø${mm(insert)}) set in ${held.name}`);
          if (wall < 0.006) problems.push(`a ${size} insert leaves only ${mm(Math.max(0, wall))} of wood each side in ${held.name}: use a smaller bolt or a bigger section`);
        } else {
          sub.push(`${count} × ${size} tapped hole in ${held.name}, ${mm(engage)} of thread`);
        }
        sub.push(`${count} × ${size} × ${len ?? Math.ceil(need * 1000)} mm bolt, class ${cls}`, `${count} × ${size} washer`);
        if (!len) problems.push(`a ${size} bolt long enough (${mm(need)}) isn't a standard length: use threaded rod`);
      } else {
        const grip = tA + tB;
        const need = grip + 0.8 * d + 2 * 0.2 * d + 2 * P;
        const len = BOLT_LENGTHS.find((l) => l / 1000 >= need) ?? null;
        if (!len) problems.push(`a ${size} bolt long enough (${mm(need)}) isn't a standard length: use threaded rod`);
        sub.push(`${count} × ${size} × ${len ?? Math.ceil(need * 1000)} mm bolt, class ${cls}`, `${count} × ${size} nut`, `${2 * count} × ${size} washer`);
      }
      const derived = k.derive({ params: p, matA: mA, matB: mB, thicknessA: g.thicknessA, thicknessB: g.thicknessB, through: g.through, distance: 0, cure: 1e12 });
      const torque = derived.readouts.find((r) => r.label === 'Wrench torque');
      if (torque) notes.push(`tighten to ${torque.value}`);
      break;
    }
    case 'clamp': {
      const size = stringOf(p, 'size', 'M5'), cls = stringOf(p, 'class', '8.8');
      // the block is bored to the body, sawn through across the bore, and drawn together by bolts across the cut
      const L = BOLT_LENGTHS.find((l) => l / 1000 >= 0.6 * g.thicknessA + 0.5 * (METRIC_COARSE[size]?.d ?? 0.005)) ?? null;
      notes.push(`bore ${A.name} to Ø${mm(numberOf(p, 'bore', 0.042))}, saw it through across the bore, drill and tap for the clamp bolts`);
      sub.push(`${count} × ${size} × ${L ?? 'cut-to-length'} mm socket cap screw, class ${cls}`, `${count} × ${size} washer`);
      const derived = k.derive({ params: p, matA: mA, matB: mB, thicknessA: g.thicknessA, thicknessB: g.thicknessB, through: g.through, distance: 0, cure: 1e12 });
      const holds = derived.readouts.find((r) => r.label === 'Holds against turning'), wrench = derived.readouts.find((r) => r.label === 'Wrench torque');
      if (wrench) notes.push(`tighten to ${wrench.value}`);
      if (holds) notes.push(`it then holds ${holds.value} against turning`);
      break;
    }
    case 'weld': {
      const leg = numberOf(p, 'leg', 0.005), L = numberOf(p, 'length', 0) || 2 * (numberOf(p, 'bondW', 0) + numberOf(p, 'bondL', 0));
      const filler = FILLERS[stringOf(p, 'filler', 'E70')];
      const metal = 0.5 * leg * leg * L * 7850;
      sub.push(`fillet weld, ${mm(leg)} leg × ${mm(L)}${numberOf(p, 'length', 0) ? '' : ' (all round)'}`, `${filler?.label ?? 'filler'}: about ${kg(metal * 1.3)} of wire (weld metal plus spatter)`);
      notes.push(`${stringOf(p, 'process', 'mig').toUpperCase()}, clean to bright metal first`);
      break;
    }
    case 'glued': {
      const a = ADHESIVES[stringOf(p, 'adhesive', 'epoxy-structural')];
      const area = numberOf(p, 'bondW', 0) * numberOf(p, 'bondL', 0);
      if (a?.id === 'mortar') {
        sub.push(`mortar bed: about ${(area * 0.01 * 1000).toFixed(2)} L (${mm(0.01)} thick)`);
        notes.push('lay in a full bed; keep damp while it cures');
      } else {
        sub.push(`${a?.label ?? 'adhesive'} over ${(area * 1e4).toFixed(0)} cm²`);
        notes.push(`clamp until it cures (${a ? Math.round((3 * a.cureTau) / 3600) : 24} h to near full strength)`);
      }
      break;
    }
    case 'soldered':
      sub.push(`solder: ${stringOf(p, 'alloy', 'sn63pb37')}`);
      break;
    default:
      sub.push(k.label);
  }
  const d = k.derive({ params: p, matA: mA, matB: mB, thicknessA: g.thicknessA, thicknessB: g.thicknessB, through: g.through, distance: 0, cure: 1e12 });
  if (d.instantFailure) problems.push(d.instantFailure);
  // cautions (a short bite, a brittle part clamped): buildable, but worth knowing when making it
  for (const w of d.warnings) notes.push(`caution: ${w}`);
  return { id: c.id, between, process: k.label, sub, notes, problems };
}

/** Every assembly in these parts: groups joined by intact joints. */
function assembliesOf(doc: BuildDoc, ids: string[]): string[][] {
  const set = new Set(ids), seen = new Set<string>(), out: string[][] = [];
  const adj = new Map<string, string[]>();
  for (const c of Object.values(doc.connections)) {
    if (c.state.status === 'broken' || !c.b || !set.has(c.a.part) || !set.has(c.b.part)) continue;
    (adj.get(c.a.part) ?? adj.set(c.a.part, []).get(c.a.part)!).push(c.b.part);
    (adj.get(c.b.part) ?? adj.set(c.b.part, []).get(c.b.part)!).push(c.a.part);
  }
  for (const id of ids) {
    if (seen.has(id)) continue;
    const group: string[] = [], stack = [id];
    seen.add(id);
    while (stack.length) { const x = stack.pop()!; group.push(x); for (const y of adj.get(x) ?? []) if (!seen.has(y)) { seen.add(y); stack.push(y); } }
    out.push(group);
  }
  return out;
}

export interface SheetOptions {
  title?: string;
  /** How hard each joint worked on the test stand (by connection id), and the stand's story. */
  tested?: Record<string, { u: number; mode: string }>;
  testStory?: string[];
}

/** The build sheet for these parts of the document (all of them by default). */
export function buildSheet(doc: BuildDoc, materialOf: (p: Part) => Material, ids = Object.keys(doc.parts), opt: SheetOptions = {}): BuildSheet {
  const linear: Linear[] = [], sheets: Sheet[] = [];
  const problems: string[] = [];
  const assemblies: SheetAssembly[] = [];
  let total = 0;
  for (const group of assembliesOf(doc, ids)) {
    const parts: SheetPart[] = [];
    let mass = 0;
    for (const id of group) {
      const p = doc.parts[id]!, m = materialOf(p), k = getPartKind(p.kind);
      const mp = massOf(k, effectiveParams(k, p.params, m), m);
      mass += mp;
      const s = stockOf(p, m, linear, sheets);
      for (const x of s.problems) problems.push(`${p.name}: ${x}`);
      parts.push({ id, name: p.name, what: k.label, material: m.name, size: s.size, mass: mp, from: s.from, sub: s.sub, problems: s.problems });
    }
    const inGroup = new Set(group);
    const joints = Object.values(doc.connections).filter((c) => c.state.status !== 'broken' && inGroup.has(c.a.part) && (!c.b || inGroup.has(c.b.part)) && getConnectorKind(c.kind).model === 'rigid')
      .map((c) => {
        const j: SheetJoint = jointOf(doc, c, materialOf);
        const t = opt.tested?.[c.id];
        if (t) j.tested = `${Math.round(t.u * 100)}% of its ${t.mode} capacity on the test stand`;
        for (const x of j.problems) problems.push(`${j.process} joint ${j.between}: ${x}`);
        return j;
      });
    assemblies.push({ parts, joints, mass });
    total += mass;
  }
  // what to buy: lengths of lumber and bar, sheets, and the hardware, each counted up
  const buy: string[] = [], cuts: string[] = [];
  const byStock = new Map<string, Linear[]>();
  for (const l of linear) (byStock.get(l.stock) ?? byStock.set(l.stock, []).get(l.stock)!).push(l);
  for (const [stock, items] of byStock) {
    const lengths = items[0]!.kind === 'lumber' ? LUMBER_LENGTHS : [BAR_LENGTH];
    // the shortest stock length that takes the longest cut, packed
    const longest = Math.max(...items.map((i) => i.length));
    const len = lengths.find((x) => x >= longest) ?? lengths[lengths.length - 1]!;
    const bins = packLengths(items.map((i) => ({ label: i.label, length: i.length })), len);
    buy.push(`${bins.length} × ${stock}, ${mm(len)}${items[0]!.kind === 'lumber' ? ` (${Math.round(len / 0.3048)} ft)` : ''} long`);
    bins.forEach((b, i) => cuts.push(`${stock} #${i + 1} (${mm(len)}): ${b.map((c) => `${c.label} ${mm(c.length)}`).join(', ')}; ${mm(len - b.reduce((s, c) => s + c.length, 0) - KERF * (b.length - 1))} left over`));
  }
  const bySheet = new Map<string, Sheet[]>();
  for (const s of sheets) { const key = `${mm(s.thickness)} ${s.material.name}`; (bySheet.get(key) ?? bySheet.set(key, []).get(key)!).push(s); }
  for (const [key, items] of bySheet) {
    const packed = packSheets(items.map((i) => ({ label: i.label, w: i.w, h: i.h })), SHEET);
    buy.push(`${packed.length} × ${key} sheet, ${mm(SHEET[0])} × ${mm(SHEET[1])}`);
    packed.forEach((sh, i) => cuts.push(`${key} sheet #${i + 1}: ${sh.map((c) => `${c.label} ${mm(c.w)} × ${mm(c.h)}`).join(', ')}`));
  }
  const bought = new Map<string, number>();
  for (const a of assemblies) for (const p of a.parts) {
    const P = doc.parts[p.id]!;
    if (P.kind === 'battery') {
      const b = getBattery(stringOf(P.params, 'model', ''));
      const what = `${b.label}${priceOf(b.price)} (bought)`;
      bought.set(what, (bought.get(what) ?? 0) + numberOf(P.params, 'series', 1) * numberOf(P.params, 'parallel', 1));
      continue;
    }
    if (/\(bought|^a standard brick/.test(p.from)) bought.set(p.from, (bought.get(p.from) ?? 0) + 1);
    const g = P.kind === 'motor.dc' ? fittedGearhead(P.params) : null;
    if (g) { const what = `${g.label}${priceOf(g.price)} (bought)`; bought.set(what, (bought.get(what) ?? 0) + 1); }
  }
  for (const [what, n] of bought) buy.push(`${n} × ${what.replace(/^an? /, '')}${what.includes('brick') ? ` (plus 5% for breakage: ${Math.ceil(n * 1.05)})` : ''}`);
  const hardware = new Map<string, number>();
  for (const a of assemblies) for (const j of a.joints) for (const s of j.sub) {
    const m = /^(\d+) × (.+)$/.exec(s);
    if (m) hardware.set(m[2]!, (hardware.get(m[2]!) ?? 0) + Number(m[1]));
  }
  for (const [what, n] of hardware) buy.push(`${n} × ${what}`);
  // what isn't a rigid joint but is still bought: each motor drive's coupling and controller, the wire, the tie rods
  const inSheet = new Set(ids), extra = new Map<string, number>();
  const add = (what: string, n = 1) => extra.set(what, (extra.get(what) ?? 0) + n);
  for (const c of Object.values(doc.connections)) {
    if (c.state.status === 'broken' || !inSheet.has(c.a.part)) continue;
    if (c.kind === 'motor') {
      const A = doc.parts[c.a.part]!, mo = getMotor(stringOf(A.params, 'model', '')), g = fittedGearhead(A.params);
      add(`rigid shaft coupling, ${mm(g?.shaft ?? mo.shaft)} motor bore to the driven shaft's`);
      add(`brushed DC motor controller for ${mo.V} V, current limit set to ${numberOf(c.params, 'currentLimit', 20)} A`);
    } else if (c.kind === 'wire') {
      const w = WIRE_GAUGES[stringOf(c.params, 'gauge', '14')];
      const L = numberOf(c.params, 'length', 0) || 1;
      add(`${stringOf(c.params, 'gauge', '14')} AWG two-core copper cable${w ? ` (${w.ampacity} A chassis rating)` : ''}, metres`, L);
    } else if (c.kind === 'link') {
      add(`Ø${mm(numberOf(c.params, 'diameter', 0.008))} steel tie rod with a Ø${mm(numberOf(c.params, 'stud', 0.008))} rod end at each end`);
    }
  }
  for (const [what, n] of extra) buy.push(what.endsWith(', metres') ? `${n.toFixed(1)} m of ${what.slice(0, -', metres'.length)}` : `${n} × ${what}`);
  const priced = new Map<string, number>();
  for (const a of assemblies) for (const p of a.parts) {
    const P = doc.parts[p.id]!;
    const items: (Price | undefined)[] = P.kind === 'motor.dc' ? [getMotor(stringOf(P.params, 'model', '')).price, fittedGearhead(P.params)?.price]
      : P.kind === 'battery' ? Array(numberOf(P.params, 'series', 1) * numberOf(P.params, 'parallel', 1)).fill(getBattery(stringOf(P.params, 'model', '')).price) : [];
    for (const x of items) if (x) priced.set(x.currency, (priced.get(x.currency) ?? 0) + x.amount);
  }
  if (priced.size) buy.push(`Bought items charted with prices come to ${[...priced].map(([cur, v]) => `${SYMBOL[cur] ?? cur}${v.toFixed(2)}`).join(' + ')} (before tax and shipping; prices move)`);
  // the order: the biggest part first, then each part as it is joined to what's already there
  const steps: string[] = ['Cut everything to size from the cut list; mark each piece with its name.'];
  for (const a of assemblies) {
    if (!a.joints.length) continue;
    const first = [...a.parts].sort((x, y) => y.mass - x.mass)[0]!;
    const placed = new Set([first.id]);
    steps.push(`Start with ${first.name}${first.what === 'Plate / sheet' ? ', face down on a flat surface' : ''}.`);
    const left = [...a.joints];
    for (let guard = 0; left.length && guard < 1000; guard++) {
      const i = left.findIndex((j) => { const c = doc.connections[j.id]!; return placed.has(c.a.part) || (c.b && placed.has(c.b.part)); });
      const j = left.splice(i >= 0 ? i : 0, 1)[0]!;
      const c = doc.connections[j.id]!;
      placed.add(c.a.part);
      if (c.b) placed.add(c.b.part);
      steps.push(`${j.process} ${j.between}: ${j.sub.join(', ')}${j.notes.length ? ` (${j.notes.join('; ')})` : ''}.`);
    }
  }
  const checked = [
    'Every part is cut from stock sold in standard sizes, or bought whole.',
    'Every joint is a process those materials can be joined by, with fasteners that fit its face at their minimum edge distances and spacing.',
    'Each member was sized against its load (bending and sag for tops and shelves, crushing and buckling for legs) at 3× margin.',
    ...(opt.testStory?.length ? ['On the test stand (the same physics as the headset):', ...opt.testStory.map((s) => `  ${s}`)] : ['Not run on the test stand.']),
  ];
  const unchecked = [
    'How much it flexes or wobbles: the physics treats joined parts as rigid, so a frame that is strong but springy looks stiff here.',
    'Long-term effects: wood creep under a constant load, moisture movement, fatigue from years of use, corrosion.',
    'Workmanship: glue coverage, screws driven straight and to depth, welds fused properly. The joints are as strong as rated only when made well.',
  ];
  return { title: opt.title ?? doc.meta.name, assemblies, buy, cuts, steps, problems, checked, unchecked, mass: total };
}

/** The sheet as plain text, for the tablet, a report, or a printout. */
export function sheetText(s: BuildSheet): string[] {
  const out: string[] = [`BUILD SHEET: ${s.title} (${kg(s.mass)})`, ''];
  s.assemblies.forEach((a, i) => {
    out.push(`Assembly ${i + 1}: ${a.parts.length} part${a.parts.length === 1 ? '' : 's'}, ${a.joints.length} joint${a.joints.length === 1 ? '' : 's'}, ${kg(a.mass)}`);
    for (const p of a.parts) {
      out.push(`  ├ ${p.name}: ${p.what.toLowerCase()} in ${p.material}, ${p.size}, ${kg(p.mass)}`, `  │   from ${p.from}`);
      for (const x of p.sub) out.push(`  │   └ ${x}`);
    }
    for (const j of a.joints) {
      out.push(`  ├ ${j.process}: ${j.between}${j.tested ? ` [tested: ${j.tested}]` : ''}`);
      for (const x of j.sub) out.push(`  │   └ ${x}`);
    }
  });
  out.push('', 'TO BUY', ...s.buy.map((b) => `  • ${b}`), '', 'CUT LIST', ...s.cuts.map((c) => `  • ${c}`), '', 'STEPS', ...s.steps.map((x, i) => `  ${i + 1}. ${x}`));
  out.push('', s.problems.length ? 'PROBLEMS (not buildable as drawn)' : 'PROBLEMS: none found', ...s.problems.map((p) => `  ⚠ ${p}`));
  out.push('', 'CHECKED', ...s.checked.map((c) => `  ✓ ${c}`), '', 'NOT CHECKED', ...s.unchecked.map((c) => `  • ${c}`));
  return out;
}
