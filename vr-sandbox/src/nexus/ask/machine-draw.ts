// How a composed machine is DRAWN: each unit laid out as the thing it is, and the units put where the stack says.
// Owner of: the shape a unit takes in space, and nothing about what a machine is made of or whether it holds.
//
// It lives apart from `machine.ts` because composing a machine and drawing one are two concerns that were one file,
// and the lint said so at 723 lines. The split is also where this round's fault lived: `layUnit` carried three Euler
// constants derived from how a length of stock is DECLARED, while the part it actually receives has already been
// turned by a `rot` of its own, so every one of them turned it twice (docs/MANNY.md #46). Orientation is measured
// here now, by `layAlong` in `parts/space.ts`, which owns oriented boxes — so this file holds placement and borrows
// every geometric judgement rather than remembering one.

import { layAlong } from '../parts/space';
import type { Part, V3 } from '../parts/kits';
import type { Machine, Unit } from './machine';

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
    if (motor) put(motor, [-W / 2 - 0.03, 0.02, 0], [0, 0, Math.PI / 2]);   // the motor behind it, its shaft along x
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
  let up = 0;
  for (const s of m.stages) {
    // a slide axis is turned a quarter about the stack as it goes up, so the second one runs across the first — which
    // is what a gantry *is*, and laying them all the same way is how the first drawing of this read as a pile of beams
    const across = m.arrange === 'gantry' && s.unit.does === 'slide' && out.filter((p) => /axis/.test(p.name)).length % 2 === 1;
    out.push({ name: s.unit.name, at: [0, up * mm, 0], ...(across ? { rot: [0, Math.PI / 2, 0] as V3 } : {}), says: s.unit.says, parts: layUnit(s.unit, use) });
    up += s.unit.does === 'hold' && s.unit.id.startsWith('frame') ? 40 : s.unit.box[1];
  }
  return out;
}

/** A composed machine as one part, its units where the stack puts them: what to stand in the room. */
export function machinePart(m: Machine, use: (words: string) => Part): Part {
  return { name: m.name, at: [0, 0, 0], says: `${m.name}, ${m.reach.join(' × ')} mm. ${m.stages.map((s) => s.unit.says).join(' ')}`, parts: machineParts(m, use) };
}
