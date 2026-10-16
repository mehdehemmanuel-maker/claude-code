// How a composed machine is DRAWN: each unit laid out as the thing it is, and the units put where the stack says.
// Owner of: the shape a unit takes in space, and nothing about what a machine is made of or whether it holds.
//
// It lives apart from `machine.ts` because composing a machine and drawing one are two concerns that were one file,
// and the lint said so at 723 lines. The split is also where this round's fault lived: `layUnit` carried three Euler
// constants derived from how a length of stock is DECLARED, while the part it actually receives has already been
// turned by a `rot` of its own, so every one of them turned it twice (docs/MANNY.md #46). Orientation is measured
// here now, by `layAlong` in `parts/space.ts`, which owns oriented boxes — so this file holds placement and borrows
// every geometric judgement rather than remembering one.

import { layAlong, layFlat } from '../parts/space';
import type { Part, V3 } from '../parts/kits';
import { RAIL, type Machine, type Unit } from './machine';

/** A unit drawn as the thing it is, not as a heap of its parts in a grid.
 *
 *  The first run of this laid every part on a 60 mm lattice, which is what a bill of materials looks like when you
 *  pretend it is a machine: recognisable to nobody, and the exact fault the user named about the works room. A unit
 *  knows its own shape, so it places its own parts — a slide is a beam along its travel with the rail on top of it, the
 *  carriage at mid-span, the motor hung off one end and the screw or belt running between them; a turn axis is the
 *  motor under its bearing pair with the pulleys between; a frame is twelve lengths on the edges of its own box.
 *  Nothing here is per-machine: it is per *shape*, and there are five shapes. */
export function layUnit(u: Unit, use: (words: string) => Part): Part[] {
  const out: Part[] = [], mm = 0.001;
  // A length of stock is DECLARED z-long with its section in x-y, and the three constants that used to stand here
  // turned one by that declaration: ALONG_X was [0, pi/2, 0], UPRIGHT was [pi/2, 0, 0]. But the part the library hands
  // back has already been stood upright by a `rot` of its own, so each of those turned it a second time: the four
  // members meant to be a frame's uprights cancelled to flat, the four meant to lie across stood up, and a 2000 mm
  // rail's beam was drawn on end. A near-cube frame looks like a frame however its twelve members are permuted, which
  // is how it survived six rounds of being looked at. `lay` measures the part instead of remembering a convention, so
  // the fault cannot come back by someone drawing the stock a different way (docs/MANNY.md #46).
  const X = 0, Y = 1, Z = 2;
  const got = (words: string): Part | null => { try { return use(words); } catch { return null; } };
  const put = (words: string, at: V3, rot: V3 = [0, 0, 0]) => { const p = got(words); if (p) out.push({ ...p, at, rot }); };
  /** put a length of stock down with its length along an axis, whichever way it happens to be drawn */
  const lay = (words: string, at: V3, axis: 0 | 1 | 2) => { const p = got(words); if (p) out.push({ ...p, at, rot: layAlong(p, axis) }); };
  const [W, H, D] = u.box.map((x) => x * mm) as V3;
  const words = (re: RegExp) => u.of.find((o) => re.test(o.words))?.words;

  if (u.does === 'hold' && u.id.startsWith('frame')) {
    // twelve lengths on the edges of its own box: four uprights, four along the width, four across the depth
    const up = u.of[2]?.words, along = u.of[0]?.words, across = u.of[1]?.words;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) if (up) lay(up, [sx * (W / 2 - 0.02), H / 2, sz * (D / 2 - 0.02)], Y);
    for (const y of [0.02, H - 0.02]) for (const sz of [-1, 1]) if (along) lay(along, [0, y, sz * (D / 2 - 0.02)], X);
    for (const y of [0.02, H - 0.02]) for (const sx of [-1, 1]) if (across) lay(across, [sx * (W / 2 - 0.02), y, 0], Z);
    return out;
  }
  if (u.does === 'hold' && u.id === 'bed') {
    // a board lies down. A sheet is drawn standing in its own plane, so laying it by its longest side (which is what
    // every other length of stock here wants) stands a spoil board on edge like a windscreen; `layFlat` turns the
    // side it has LEAST of to the vertical instead, measured off the drawing the same way.
    const sheet = words(/^sheet/);
    if (sheet) { const q = got(sheet); if (q) out.push({ ...q, at: [0, 0, 0], rot: layFlat(q, Y) }); }
    return out;
  }
  if (u.does === 'hold') {   // an arm's link, or a rail's brackets: along its own length
    for (const o of u.of) for (let i = 0; i < Math.min(o.n, 6); i++) {
      const at: V3 = [(o.n > 1 ? (i / (o.n - 1)) - 0.5 : 0) * W, 0, 0];
      if (/angle|extrusion|bar/.test(o.words)) lay(o.words, at, X); else put(o.words, at);
    }
    return out;
  }
  if (u.does === 'slide') {
    const beam = words(/^extrusion/), rail = words(/^rail/), motor = words(/^stepper/), plate = words(/^motorplate/);
    if (beam) lay(beam, [0, 0, 0], X);                                      // the beam along the travel
    if (rail) lay(rail, [0, 0.021, 0], X);                                  // its rail on the beam's top face
    if (plate) put(plate, [-W / 2 - 0.004, 0.02, 0], [0, Math.PI / 2, 0]);  // the motor plate on the far end
    // the motor behind it, its shaft along x INTO the beam it drives. Which way it is spun about that shaft is free,
    // and it is not arbitrary: a NEMA 17 is drawn with its 300 mm flying leads running out of the rear bell and away
    // ALONG THE GROUND, which is where they lie on a bench — so turning it the other way stood that run on end and
    // every motor on every composed machine grew a 300 mm spike out of its back, two of them clear of the frame's
    // top rail. Spun this way the shaft still faces the beam and the leads hang down, which is where a lead hangs.
    if (motor) put(motor, [-W / 2 - 0.03, 0.02, 0], [0, 0, -Math.PI / 2]);
    const bear = words(/^bearing/), pul = words(/^pulley/), idl = words(/^idler/);
    if (bear) for (const sx of [-1, 1]) put(bear, [sx * (W / 2 - 0.01), 0.02, 0], [0, 0, Math.PI / 2]);
    if (pul) put(pul, [-W / 2 + 0.02, 0.02, 0], [0, 0, Math.PI / 2]);
    if (idl) for (const sx of [-1, 1]) put(idl, [sx * (W / 2 - 0.015), 0.02, 0.012], [0, 0, Math.PI / 2]);
    return out;
  }
  if (u.does === 'turn') {
    const motor = words(/^stepper/), plate = words(/^motorplate/), bear = words(/^bearing/);
    const small = u.of.find((o) => /^pulley GT2 20/.test(o.words))?.words, big = u.of.find((o) => /^pulley GT2 (?!20)/.test(o.words))?.words;
    if (motor) put(motor, [-0.035, 0, 0]);
    if (plate) put(plate, [-0.035, 0.022, 0]);
    if (small) put(small, [-0.035, 0.03, 0]);
    if (big) put(big, [0.02, 0.03, 0]);
    if (bear) for (const y of [0.045, 0.062]) put(bear, [0.02, y, 0]);
    return out;
  }
  // a tool: its pieces stacked down from the mount, which is how every one of them really hangs
  let down = 0;
  for (const o of u.of) for (let i = 0; i < Math.min(o.n, 4); i++) { put(o.words, [i * 0.018 - 0.01, -down, 0]); down += 0.012; }
  return out;
}

/** The machine drawn from the library: every unit where the stack puts it, each unit laying out its own parts, so what
 *  was composed can be stood in the room and taken apart like anything else. A gantry stacks up its frame, a rail hangs
 *  from its brackets, and an arm is laid out along its own links. */
export function machineParts(m: Machine, use: (words: string) => Part): Part[] {
  const out: Part[] = [], mm = 0.001;
  if (m.arrange === 'arm') {
    // along the arm: each joint at the end of the link before it, which is what makes it read as an arm
    let x = 0, y = 0.1;
    for (const s of m.stages) {
      out.push({ name: s.unit.name, at: [x, y, 0], says: s.unit.says, parts: layUnit(s.unit, use) });
      if (s.unit.does === 'hold') { x += s.unit.box[0] * mm; y += 0.02; } else y += 0.05;
    }
    return out;
  }
  if (m.arrange === 'gantry') return gantryParts(m, use);
  let up = 0;
  for (const s of m.stages) {
    // a slide axis is turned a quarter about the stack as it goes up, so the second one runs across the first
    const across = s.unit.does === 'slide' && out.filter((p) => /axis/.test(p.name)).length % 2 === 1;
    out.push({ name: s.unit.name, at: [0, up * mm, 0], ...(across ? { rot: [0, Math.PI / 2, 0] as V3 } : {}), says: s.unit.says, parts: layUnit(s.unit, use) });
    up += s.unit.does === 'hold' && s.unit.id.startsWith('frame') ? 40 : s.unit.box[1];
  }
  return out;
}

/** A GANTRY IS A CHAIN, NOT A PILE. Every unit used to go at [0, up, 0] with `up` the height of the one before, so a
 *  three-axis machine came out as three identical beams stacked up the middle of its frame with the spindle on top,
 *  cutting the air above the top rail — the works room's standing verdict, "the composed machines still read as
 *  lattices of posts and cubes", in one line of code.
 *
 *  What a gantry actually is: the beams hang from the top of the frame, each axis carried on the carriage of the one
 *  before it and running along its own travel, the LAST axis standing up as the column the tool rides, and the tool
 *  at the bottom of that column over the work. Nothing here is per-machine. Which axis is the column is not a
 *  convention either: it is the same law `liftCheck` checks by — the last slide is the one that has to RAISE what is
 *  above it, so it is the one drawn upright — and the others alternate across the width and along the depth, which is
 *  the order the ask's own three travels are read in. */
function gantryParts(m: Machine, use: (words: string) => Part): Part[] {
  const out: Part[] = [], mm = 0.001;
  const ACROSS: V3 = [0, 0, 0], ALONG: V3 = [0, Math.PI / 2, 0];
  // +X up the column puts the motor plate at its TOP, where a Z motor really sits, and turns the rail to face the
  // front, which is the side the tool rides on
  const UPRIGHT: V3 = [0, 0, -Math.PI / 2];
  const top = (m.stages.find((s) => s.unit.id.startsWith('frame'))?.unit.box[1] ?? 0) * mm;
  const slides = m.stages.filter((s) => s.unit.does === 'slide').length;
  let y = top, n = 0, face = 0;
  for (const s of m.stages) {
    const u = s.unit, parts = layUnit(u, use);
    if (u.id.startsWith('frame')) { out.push({ name: u.name, at: [0, 0, 0], says: u.says, parts }); continue; }
    if (u.id === 'bed') { out.push({ name: u.name, at: [0, (RAIL + u.box[1] / 2) * mm, 0], says: u.says, parts }); continue; }
    if (u.does === 'slide') {
      const column = n === slides - 1;
      // a beam hangs by its section; the column hangs by its length, because it stands on end
      const len = (column ? u.box[0] : u.box[1]) * mm;
      y -= len / 2;
      out.push({ name: u.name, at: [0, y, 0], rot: column ? UPRIGHT : n % 2 === 0 ? ACROSS : ALONG, says: u.says, parts });
      if (column) face = 0.035;
      y -= len / 2; n++;
      continue;
    }
    // the tool on the column's carriage, hanging down the front of it at the bed
    out.push({ name: u.name, at: [face, y, 0], says: u.says, parts });
  }
  return out;
}

/** A composed machine as one part, its units where the stack puts them: what to stand in the room. */
export function machinePart(m: Machine, use: (words: string) => Part): Part {
  return { name: m.name, at: [0, 0, 0], says: `${m.name}, ${m.reach.join(' × ')} mm. ${m.stages.map((s) => s.unit.says).join(' ')}`, parts: machineParts(m, use) };
}
