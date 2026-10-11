/** The designer: every build's own numbers derived from its own geometry, and checked against what it claims.
 *
 *  `builds.ts` owns what a thing is made of and where each piece sits. This owns the arithmetic over that, and it
 *  exists because the bills were typed by hand: four lines once carried a tenth of their own material (mm³ divided by
 *  10⁴), a copper arm was rounded up past its own envelope, and each was found by a script written for that one
 *  round and then thrown away. A volume nobody computed is a number nobody checked, so here the volume is computed —
 *  from the same section, cylinder and bore that `builtParts` draws the piece with, so the drawing and the bill
 *  cannot disagree about how much metal is in it.
 *
 *  That makes a build editable, which is the other half: change a size and `editBuild` re-derives every volume from
 *  it rather than leaving a stale number behind. A bill you can edit is a bill whose numbers are derived.
 *
 *  Nothing here is special-cased to a build. `designFaults` runs over all of them (`npm run works -- design`), so a
 *  new build is checked the moment it is written instead of when a test is next thought of. */
import { DENSITY } from '../parts/mass';
import { component } from '../parts/components';
import { BUILDS, lineFor, sectionOf, type Build } from './builds';
import { classOf, priceOfLine, type PartLine } from './lines';

/** Something the designer will not let a bill say. `line` is absent where the fault is the build's as a whole. */
export interface Fault { build: string; line?: string; kind: 'volume' | 'material' | 'place' | 'price' | 'library'; says: string }

const area = (pts: [number, number][]): number => {
  let a = 0;
  for (let i = 0; i < pts.length; i++) { const [x1, y1] = pts[i]!, [x2, y2] = pts[(i + 1) % pts.length]!; a += x1 * y2 - x2 * y1; }
  return Math.abs(a) / 2;
};

/** cm³ of material in one of a line (`materialIn`, not `volumeOf`: machines/cell.ts owns that name for a melt), from its own size and the shape its own name states: the section of an angle or
 *  a box section, a cylinder where the line is round, the box otherwise, less whatever its bore takes out. Null where
 *  the bill gives no size — then there is nothing to derive it from, and the bill's own figure stands or it is bought. */
export function materialIn(line: PartLine): number | null {
  if (!line.size) return null;
  const [a, c, L] = line.size, cut = sectionOf(line);
  // a section's polygon is in metres (it is drawn as one): m² × m → m³, and 10⁶ cm³ in a m³
  let mm3 = cut ? (area(cut.prism.pts) - (cut.prism.holes ?? []).reduce((s, h) => s + area(h), 0)) * cut.prism.L * 1e9
    : line.shape === 'round' ? (Math.PI / 4) * a * a * L : a * c * L;
  if (line.bore) mm3 -= (Math.PI / 4) * line.bore[0] * line.bore[0] * Math.min(line.bore[1], L);
  return Math.max(0, mm3) / 1000;
}

/** The mass of one of a line, kg (`lineKg`: parts/mass.ts owns `massOf`, which weighs a drawn part), where the library knows what it is made of. A density is kg/m³ and a bill is in
 *  cm³, and there are a million cm³ in a m³: the first run of this said a welded bench weighed 54 tonnes. */
export function lineKg(line: PartLine): number | null {
  const cm3 = line.cm3 ?? materialIn(line), d = DENSITY[line.mat];
  return cm3 == null || d === undefined ? null : +(cm3 * 1e-6 * d).toFixed(4);
}

/** The thickness a line's own name states, mm, where it states one ("6 mm steel sheet", "25 mm birch ply"). */
export function statedThickness(name: string): number | null {
  const m = /(\d+(?:\.\d+)?)\s?mm\b/.exec(name);
  return m ? Number(m[1]) : null;
}

/** Whether `materialIn` is this line's material and not merely the box it fits in. A length of stock cut to size is
 *  solid to its own box: a section, a round bar, a plate whose stated thickness is one of its three sizes. A part that
 *  is *formed* is not — a 2 mm sheet folded into a 520 × 520 × 90 splash pan holds a twentieth of that box, a thrown
 *  mug is a wall round air, a casting is shelled, and a bought motor is a box with windings in it. Checking those
 *  against their envelope is the only honest thing to do, and it is what the envelope check below does. */
export function solidToItsBox(line: PartLine): boolean {
  if (!line.size) return false;
  if (sectionOf(line)) return true;
  // a flat part is *not* solid to its box even where its thickness is one of its sizes: a plate is cut to a
  // profile and a carbon unibody is mostly holes, so its box is a bound. Only stock cut to length is an equality.
  // only the head noun counts: "pulley, 240 mm V on the head shaft" is a pulley, and reading "shaft" out of where it
  // is fitted had the designer hold a webbed pulley to a solid billet's volume
  return line.shape === 'round' && /\b(bar|rod|pin|shaft|wire|tube)\b/i.test(line.name.split(',')[0]!);
}

/** Everything wrong with a build, as the arithmetic over its own bill sees it. */
export function designFaults(b: Build): Fault[] {
  const out: Fault[] = [], f = (kind: Fault['kind'], says: string, line?: string): void => { out.push({ build: b.id, kind, says, ...(line ? { line } : {}) }); };
  for (const line of b.lines) {
    const own = materialIn(line);
    if (own != null && line.cm3 != null) {
      const off = Math.abs(line.cm3 - own) / Math.max(own, 1);
      // a part solid to its own box: the bill must say what the geometry says, and this is what caught four lines
      // carrying a tenth of their own steel
      if (solidToItsBox(line) && off > 0.06 && Math.abs(line.cm3 - own) > 1) {
        f('volume', `the bill says ${line.cm3} cm³ and its own ${line.size!.join(' × ')} mm${sectionOf(line) ? ' section' : ''} gives ${own.toFixed(1)}`, line.name);
      // a formed or bought part: its box is a bound and nothing more, so only more material than fits is a fault
      } else if (!solidToItsBox(line) && line.cm3 > own * 1.02) {
        f('volume', `the bill says ${line.cm3} cm³ and a ${line.size!.join(' × ')} mm envelope holds ${own.toFixed(1)}`, line.name);
      }
    }
    if (!DENSITY[line.mat]) f('material', `nothing weighs "${line.mat}": it is not a material the library has a density for`, line.name);
    // a bagged or fired mineral and a bought graphite crucible have no class on purpose: the plan buys them by
    // material and hands place them. Any *other* classless material is a line no process can be offered.
    else if (!classOf(line.mat) && !/^(refractory|castable|fibre-blanket|firebrick|gypsum|plaster|portland|lime|graphite|rubber)/.test(line.mat)) {
      f('material', `"${line.mat}" is in no material class, so no process here can be offered it`, line.name);
    }
    if (!priceOfLine(line)) f('price', 'no seller’s page prices it, so this build’s cost is short by this line', line.name);
    // where the library already draws the part the line names, the library's own size is the accurate one
    // only where the line's own head is a library word *with a size on it* ("slotnut slot6 M3", "buttonhead M5x10"):
    // a bare "pulley" or "belt" takes its family's first example, and the bill's V pulley is not a GT2 one
    const head = line.name.split(',')[0]!.trim(), g = head.split(/\s+/).length > 1 ? component(head) : 'one word';
    if (typeof g !== 'string' && g.item?.size && line.size) {
      const lib = g.item.size, off = Math.max(...lib.map((v, i) => Math.abs(v - line.size![i]!) / Math.max(v, 1)));
      if (off > 0.02) f('library', `the library draws it ${lib.join(' × ')} mm and the bill says ${line.size.join(' × ')}`, line.name);
    }
  }
  if (b.lay) {
    for (const place of b.lay) {
      if (!lineFor(b, place.line)) f('place', `a lay places "${place.line}", which is no line of this bill`);
    }
    for (const line of b.lines) {
      if (!line.size) continue;
      // a loop's two places are the two pulleys one belt runs over, not two belts
      const put = b.lay.filter((p) => lineFor(b, p.line) === line).reduce((s, p) => s + (p.bent === 'loop' ? 1 : p.at.length), 0);
      if (put > line.n) f('place', `${put} of them are placed and the bill buys ${line.n}`, line.name);
    }
  }
  return out;
}

/** A change to a build: a line's size, how many, or what it is made of. Everything derived from them follows. */
export interface Edit { line: string; size?: [number, number, number]; n?: number; mat?: string }

/** The build as edited, with every volume derived again from the size it now has. The bill that comes out is the one
 *  to route and to draw: nothing in it was typed. */
export function editBuild(b: Build, edits: Edit[]): Build {
  const lines = b.lines.map((line) => {
    const e = edits.find((x) => line.name.toLowerCase().startsWith(x.line.toLowerCase()));
    if (!e) return line;
    const next: PartLine = { ...line, ...(e.size ? { size: [...e.size] as [number, number, number] } : {}), ...(e.n ? { n: e.n } : {}), ...(e.mat ? { mat: e.mat } : {}) };
    const v = materialIn(next);
    return v == null ? next : { ...next, cm3: +v.toFixed(1) };
  });
  return { ...b, lines, src: `${b.src} — edited: ${edits.map((e) => `${e.line}${e.size ? ` to ${e.size.join(' × ')} mm` : ''}${e.n ? ` × ${e.n}` : ''}${e.mat ? ` in ${e.mat}` : ''}`).join('; ')}` };
}

/** Every build's faults, worst first by kind: a wrong volume is arithmetic, a missing price is work not yet done. */
export function designAll(builds: Build[] = BUILDS): Fault[] {
  const order: Fault['kind'][] = ['volume', 'place', 'library', 'material', 'price'];
  return builds.flatMap(designFaults).sort((x, y) => order.indexOf(x.kind) - order.indexOf(y.kind));
}

/** What a build weighs as drawn, kg, and what of it could not be weighed. */
export function weighBuild(b: Build): { kg: number; unweighed: string[] } {
  let kg = 0; const unweighed: string[] = [];
  for (const line of b.lines) { const m = lineKg(line); if (m == null) unweighed.push(line.name); else kg += m * line.n; }
  return { kg: +kg.toFixed(2), unweighed };
}

export function designText(builds: Build[] = BUILDS): string {
  const out: string[] = [];
  for (const b of builds) {
    const fs = designFaults(b), w = weighBuild(b);
    out.push(`${b.id} — ${b.what}`);
    out.push(`  ${b.lines.length} lines, ${w.kg} kg weighed${w.unweighed.length ? `, ${w.unweighed.length} not weighed` : ''}${b.lay ? `, ${b.lay.reduce((s, p) => s + p.at.length, 0)} placed` : ', not placed'}`);
    for (const x of fs.sort((p, q) => p.kind.localeCompare(q.kind))) out.push(`  ${x.kind.padEnd(8)} ${x.line ? `${x.line}: ` : ''}${x.says}`);
    if (!fs.length) out.push('  nothing to fault');
    out.push('');
  }
  const all = designAll(builds);
  out.push(`${all.length} faults over ${builds.length} builds: ${['volume', 'place', 'library', 'material', 'price'].map((k) => `${all.filter((x) => x.kind === k).length} ${k}`).join(', ')}`);
  return out.join('\n');
}
