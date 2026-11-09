// Common pieces, the small things every build is made of, each made only by the operations of room.ts (decision 0021):
// no place is written here, so no piece can be put where another is. Each says how it mates, by what it offers: a
// line (a bolt's shank, a pipe's axis, a plate's holes, a board's footprint) that another passes along or slides over,
// a room another goes into. The matings themselves are the operations: a bolt through plates and a nut over its end
// (`boltedJoint`), a wire's stripped end through a terminal, a coupling over a pipe, an LED's leads through a board, a
// winding over its bobbin's core, a header's pins through its body; a pipe's ends in an elbow's sockets, laid as a run
// with its straights and bends (`pipeRun`, decision 0024).
//
// Sizes: metric fasteners from their standards (hex bolts ISO 4017, socket screws ISO 4762, nuts ISO 4032, washers ISO
// 7089, clearance holes ISO 273 medium); copper pipe EN 1057, its socket elbows after EN 1254-1 (their sizes typical), a
// bent pipe's radius 3.5 × its outside diameter (an estimate); solid copper conductors IEC 60228 class 1 (their
// diameters typical); LEDs, the tactile switch, the pin header (2.54 mm pitch) and the terminal block (5.08 mm pitch)
// as their usual datasheets give them (typical); the rest typical, labelled so where they are made.
//
// The second set (decision 0021, its second round): resistors, capacitors, a TO-92 transistor, cells (18650 typical; AA
// and AAA within IEC 60086-2), a toggle switch, a 5 × 20 mm fuse (IEC 60127-2), a JST XH header, a potentiometer; a lid
// and what closes a box with it, an L bracket and a block bolted down to a plate made under its holes, deep-groove ball
// bearings (ISO 15), dowel pins (ISO 8734), set screws (ISO 4026), a spur gear (its teeth from its module and count, ISO
// 53's basic rack), a GT2 pulley, a compression spring (its rate by Shigley), a butt hinge, heat-set inserts. Each
// says, where it is made, what it stands on and what is approximated.
//
// The third set (decision 0024), pieces made upright and turned: DIP ICs (JEDEC MS-001, 8, 14 and 16 leads, their leads
// bent down outside the body), a DC barrel jack and its 5.5 × 2.1 mm plug (Same Sky's PJ-002A and PP3-002A), a copper
// equal tee (its branch joined into its run's side by Branch); the L bracket's upright and the hinge's leaves made flat
// with their holes and turned up, and a block bolted to a wall plate by holes that run across it.

import { made, stack, through, onto, ring, over, into, joint, jointed, run, turn, branch, boundOf, namedIn, noted, FITS, fitGap, type Block, type Fit, type Line, type P3, type Piece, type RunSeg, type RunTube } from './room';
import { SPRING_WIRES, springRate } from '../engineering/springs';
import { ISO_METRIC } from './parts/bdw';
import { BEARINGS as BEARING_SIZES, IPE, ballsOf } from './families';

const mm = (x: number): number => x / 1000;

/** ISO metric coarse, M1.6 to M64, in mm, read from the one table of them (`ISO_METRIC`, src/nexus/parts/bdw.ts, copied
 *  from bd_warehouse with its notice): d the thread, s across a hex's flats and k a hex head's height (ISO 4014/4017), dk
 *  a socket head's diameter (its maximum) and ks its height (ISO 4762), m a nut's height (ISO 4032), a washer's bore d1,
 *  outside d2 and thickness hw (ISO 7089, hw its maximum as bd_warehouse gives it), the clearance hole for it (ISO 273,
 *  medium). (threads.ts keeps a nominal table of its own for the families and the interfaces, M1.6 to M24: merging it
 *  moves the old imprint's figures by the maxima, left for the polish pass.) A size the standard has no
 *  hex head, socket head, nut or washer for has that field missing, and a piece that needs it refuses the size, saying
 *  which standard stops where. */
export interface MetricSize { d: number; p: number; s?: number; k?: number; dk?: number; ks?: number; m?: number; d1?: number; d2?: number; hw?: number; clear?: number }
export const METRIC: Record<string, MetricSize> = Object.fromEntries(Object.entries(ISO_METRIC).map(([k, r]) => [k, {
  d: Number(k.slice(1)), p: r.p, ...(r.hex || r.nut ? { s: (r.hex ?? r.nut)!.s } : {}), ...(r.hex ? { k: r.hex.k } : {}), ...(r.socket ? { dk: r.socket.dk, ks: r.socket.k } : {}), ...(r.nut ? { m: r.nut.m } : {}),
  ...(r.washer ? { d1: r.washer.d1, d2: r.washer.d2, hw: r.washer.h } : {}), ...(r.clear ? { clear: r.clear.normal } : {}) }]));
export type Metric = string;
export const METRIC_SIZES = Object.keys(METRIC);
/** What each field is, and the standard whose table has it, for a refusal that says why. */
const FIELD: Record<string, string> = { s: 'hex across flats (ISO 4014 / ISO 4032)', k: 'hex head (ISO 4014)', dk: 'socket head (ISO 4762)', ks: 'socket head (ISO 4762)', m: 'hex nut (ISO 4032)', d1: 'plain washer (ISO 7089)', d2: 'plain washer (ISO 7089)', hw: 'plain washer (ISO 7089)', clear: 'clearance hole (ISO 273)' };
const has = (f: string) => METRIC_SIZES.filter((k) => (METRIC[k] as unknown as Record<string, unknown>)[f] !== undefined);
/** A metric size's row, with the fields a piece needs: refused, naming the standard and the sizes it has, where one is
 *  missing. */
export function sizeOf<F extends keyof MetricSize>(size: string, ...need: F[]): MetricSize & Required<Pick<MetricSize, F>> {
  const m = METRIC[size]; if (!m) throw new Error(`no metric size ${size} (${METRIC_SIZES.join(', ')})`);
  for (const f of need) if (m[f] === undefined) { const ok = has(f); throw new Error(`no ${FIELD[f]} of ${size} in its table: it has ${ok[0]} to ${ok[ok.length - 1]} (${ok.length} sizes)`); }
  return m as MetricSize & Required<Pick<MetricSize, F>>;
}

/** A bolt: its shank, and its head on top (a hex head, ISO 4017, or a socket head, ISO 4762). Its shank offers its axis
 *  (`<size> shank/axis`): a washer or a nut slides over it, and it passes through a hole. */
export function bolt(size: string, length: number, head: 'hex' | 'socket' = 'hex', mat = 'steel-alloy'): Block {
  const m = sizeOf(size), shank = made(`${size} shank`, mat, { cyl: [mm(m.d) / 2, length] }, { color: 0x5c5f63 });
  const top = head === 'hex' ? (() => { const h = sizeOf(size, 's', 'k'); return made(`${size} head`, mat, { hex: [mm(h.s), mm(h.k)] }, { color: 0x5c5f63 }); })() : (() => { const h = sizeOf(size, 'dk', 'ks'); return made(`${size} head`, mat, { cyl: [mm(h.dk) / 2, mm(h.ks)] }, { color: 0x2a2b2e }); })();
  return stack(`${size}×${Math.round(length * 1000)} ${head === 'hex' ? 'hex bolt' : 'socket screw'}`, 1, [{ b: shank }, { b: top }]);
}
/** A hex nut, ISO 4032: its bore the thread's size (the thread itself not drawn), tapped: it goes on a shank or a rod
 *  of its size by its thread whatever fit is asked (ISO 965's fit, no gap drawn), as an insert does. */
export const nut = (size: string, mat = 'steel-low'): Block => { const m = sizeOf(size, 's', 'm'); return made(`${size} nut`, mat, { hex: [mm(m.s), mm(m.m), mm(m.d) / 2] }, { color: 0x8a8c90, tapped: true }); };
/** A plain washer, ISO 7089. */
export const washer = (size: string, mat = 'steel-low'): Block => { const m = sizeOf(size, 'd1', 'd2', 'hw'); return made(`${size} washer`, mat, { tube: [mm(m.d1) / 2, mm(m.d2) / 2, mm(m.hw)] }, { color: 0xa9acb0 }); };
/** A hex standoff, female both ends (M3, 5.5 mm across flats; its bore the M3 tap drill, 2.5 mm; typical). */
export const standoff = (length: number, mat = 'brass'): Block => made(`M3 standoff ${Math.round(length * 1000)} mm`, mat, { hex: [mm(5.5), length, mm(2.5) / 2] });

/** A plate (a sheet, a board, a bracket's leaf): its holes at points about its middle (x, z), each offered as a line
 *  `<name>/holes` (a hole of `hole` diameter cut, or none: a footprint where what passes cuts its own room). */
export function plate(name: string, w: number, t: number, d: number, mat: string, points: [number, number][] = [], hole = 0, color?: number): Block {
  return made(name, mat, { box: [w, t, d] }, { ...(color !== undefined ? { color } : {}), ...(points.length ? { pattern: { name: 'holes', points, ...(hole > 0 ? { hole: hole / 2 } : {}) } } : {}) });
}
/** A solid block. */
export const block = (name: string, w: number, h: number, d: number, mat: string, color?: number): Block => made(name, mat, { box: [w, h, d] }, color !== undefined ? { color } : {});
/** A round case, hollow, open at the top: its cavity offered as a room (`<name>/cavity`) for what goes in. */
export const roundCase = (name: string, r: number, h: number, wall: number, floor: number, mat: string, color?: number): Block => made(name, mat, { cup: [r, h, wall, floor] }, color !== undefined ? { color } : {});

/** Pipes and tubes by their standard sizes: outside diameter and wall, mm (copper EN 1057; aluminium and PVC typical). */
export const PIPES = {
  'copper 15×0.7': { od: 15, wall: 0.7, mat: 'copper' }, 'copper 22×0.9': { od: 22, wall: 0.9, mat: 'copper' }, 'copper 28×0.9': { od: 28, wall: 0.9, mat: 'copper' },
  'aluminium 20×2': { od: 20, wall: 2, mat: 'al-6063' }, 'aluminium 25×1.5': { od: 25, wall: 1.5, mat: 'al-6063' }, 'PVC 32×2.4': { od: 32, wall: 2.4, mat: 'pvc' },
} as const;
export type PipeSize = keyof typeof PIPES;
const pipeOf = (size: string) => { const p = PIPES[size as PipeSize]; if (!p) throw new Error(`no pipe ${size} (${Object.keys(PIPES).join(', ')})`); return p; };
/** A pipe or tube: it offers its axis (`<name>/axis`), for a coupling to slide over or something to pass along. */
export function pipe(size: string, length: number): Block { const p = pipeOf(size); return made(`${size} pipe`, p.mat, { tube: [mm(p.od / 2 - p.wall), mm(p.od / 2), length] }, p.mat === 'pvc' ? { color: 0xe8e8e4 } : {}); }
/** A straight coupling for a pipe of that size: its bore the pipe's outside and the sliding fit's gap at that size (the
 *  room's slide fit, ISO 286 H7/g6's least clearance halved: 3 µm at 15 mm, derived by fitGap), its wall 1.2 mm, 40 mm long
 *  (typical of a solder or press coupling). (Wave 11 integration: before, a 0.25 mm gap, typical; since over writes a face
 *  only within the fit's gap, the coupling stood 250 µm off its pipe, no face was written and the two fell apart.) */
export function coupling(size: string): Block { const p = pipeOf(size), ri = mm(p.od / 2) + fitGap('slide', mm(p.od)); return made(`${size} coupling`, p.mat === 'pvc' ? 'pvc' : p.mat === 'copper' ? 'brass' : p.mat, { tube: [ri, ri + mm(1.2), mm(40)] }); }

/** Socket elbows for copper pipe after EN 1254-1 (capillary, end feed), 90° and 45°, by the EN 1057 sizes: each socket's
 *  depth (how far the pipe goes in, mm), its wall (mm) and the body's bend radius to its middle line (mm). Typical of
 *  makers' tables, not read from the standard (not public here): labelled typical. Each socket's bore is the pipe's
 *  outside and the slide fit's gap at that size (ISO 286 H7/g6's least clearance halved, derived by fitGap), as the
 *  coupling's; the body's bore is the pipe's, so a pipe's end stops on it. (Wave 13: before, a 0.25 mm gap, typical,
 *  which over writes no face for at the slide fit: a socket stood 250 µm off its pipe, as the coupling did.) */
export const ELBOWS = {
  'copper 15×0.7': { socket: 11, wall: 1, R: 10, status: 'typical' }, 'copper 22×0.9': { socket: 15, wall: 1.2, R: 14, status: 'typical' }, 'copper 28×0.9': { socket: 18, wall: 1.2, R: 18, status: 'typical' },
} as const;
export type ElbowSize = keyof typeof ELBOWS;
/** A bent length of pipe's usual bend radius to its middle line: 3.5 × its outside diameter (an estimate, of a bending
 *  machine's former for copper; a tighter one is set by hand, never at or under the tube's own radius). */
export const bendRadius = (size: string): number => mm(3.5 * pipeOf(size).od);
const elbowOf = (size: string) => { const e = ELBOWS[size as ElbowSize]; if (!e) throw new Error(`no elbow for ${size} (${Object.keys(ELBOWS).join(', ')})`); return e; };
// (an elbow's three solids: a socket, its bent body, a socket; the sockets' bore and outside)
const elbowRings = (size: string) => { const p = pipeOf(size), e = elbowOf(size), ri = mm(p.od / 2) + fitGap('slide', mm(p.od)); return { ri, ro: ri + mm(e.wall), depth: mm(e.socket), R: mm(e.R), bore: mm(p.od / 2 - p.wall) }; };
/** A socket elbow on its own (EN 1254-1, typical sizes): a socket, its body bent through 90° or 45°, a socket; laid as
 *  a run, so nothing is placed by a number. */
export function elbow(size: string, angle: 90 | 45 = 90): Block {
  if (angle !== 90 && angle !== 45) throw new Error(`an elbow of 90° or 45° (${angle}°)`);
  const k = elbowRings(size), name = `${size} elbow ${angle}°`, t = (nm: string): RunTube => ({ name: nm, mat: 'copper', ri: k.ri, ro: k.ro });
  return run(name, [{ ...t(`${name} socket`), straight: k.depth }, { name: `${name} body`, mat: 'copper', ri: k.bore, ro: k.ro, bend: angle, R: k.R }, { ...t(`${name} socket 2`), straight: k.depth }]);
}
/** A bent length of pipe: the pipe bent through so many degrees round a bend radius (its usual one where none is given). */
export function bentPipe(size: string, angle: number, R = bendRadius(size)): Block { const p = pipeOf(size); return made(`${size} bend ${Math.round(angle)}°`, p.mat, { bend: [R, mm(p.od / 2), angle, mm(p.od / 2 - p.wall)] }, p.mat === 'pvc' ? { color: 0xe8e8e4 } : {}); }
/** A step of a pipe run: a straight so long (m), a bend of the pipe itself (degrees, its radius, which way), or a socket
 *  elbow (90° or 45°, which way) between two straights. Which way: degrees round the heading from the run's own +x
 *  toward its +z (0: +x, 90: +z, 180: −x, 270: −z), its frame turning with it. */
export type PipeStep = { straight: number } | { bend: number; R?: number; toward?: number } | { elbow: 90 | 45; toward?: number };
/** A run of pipe laid with no coordinates (Run of pipe): its straights, its bends and its elbows in order, each from
 *  where the last one ended. An elbow's sockets go over the straights each side of it, whose ends stop on its body; a
 *  straight is at least as long as the sockets on it. Refused, with both numbers, where a bend's radius is not above the
 *  pipe's radius, or the path runs into itself. */
export function pipeRun(size: string, steps: readonly PipeStep[], name = `${size} run`): Block {
  const p = pipeOf(size), ro = mm(p.od / 2), ri = mm(p.od / 2 - p.wall), segs: RunSeg[] = [], look = p.mat === 'pvc' ? { color: 0xe8e8e4 } : {};
  let elbows = 0, pending: (RunTube & { from: number; to: number }) | undefined;
  steps.forEach((s, i) => {
    if ('straight' in s) { const L = s.straight; segs.push({ name: `${size} pipe ${i + 1}`, mat: p.mat, ro, ri, ...look, straight: L, ...(pending ? { sleeves: [{ ...pending, to: Math.min(pending.to, L) }] } : {}) });
      if (pending && L < pending.to) throw new Error(`${name}: the straight after elbow ${elbows} is ${(L * 1000).toFixed(1)} mm; its socket takes ${(pending.to * 1000).toFixed(1)} mm`); pending = undefined; return; }
    if (pending) throw new Error(`${name}: elbow ${elbows}'s second socket takes a straight after it (step ${i + 1} is not one)`);
    if ('bend' in s) { segs.push({ name: `${size} bend ${i + 1}`, mat: p.mat, ro, ri, ...look, bend: s.bend, R: s.R ?? bendRadius(size), ...(s.toward !== undefined ? { toward: s.toward } : {}) }); return; }
    const k = elbowRings(size), en = `${size} elbow ${s.elbow}° ${++elbows}`, prev = segs[segs.length - 1];
    if (!prev || !('straight' in prev)) throw new Error(`${name}: an elbow's sockets take straight pipe: a straight before elbow ${elbows} (step ${i + 1})`);
    if (prev.straight < k.depth + (prev.sleeves?.reduce((t, v) => t + v.to - v.from, 0) ?? 0)) throw new Error(`${name}: the straight before elbow ${elbows} is ${(prev.straight * 1000).toFixed(1)} mm; its sockets take ${((k.depth + (prev.sleeves?.reduce((t, v) => t + v.to - v.from, 0) ?? 0)) * 1000).toFixed(1)} mm`);
    segs[segs.length - 1] = { ...prev, sleeves: [...(prev.sleeves ?? []), { name: `${en} socket`, mat: 'copper', ri: k.ri, ro: k.ro, from: prev.straight - k.depth, to: prev.straight }] };
    segs.push({ name: `${en} body`, mat: 'copper', ri: k.bore, ro: k.ro, bend: s.elbow, R: k.R, ...(s.toward !== undefined ? { toward: s.toward } : {}) });
    pending = { name: `${en} socket 2`, mat: 'copper', ri: k.ri, ro: k.ro, from: 0, to: k.depth };
  });
  if (pending) throw new Error(`${name}: elbow ${elbows}'s second socket takes a straight after it`);
  return run(name, segs);
}
/** A pipe run's path written out: steps by `;`, each a straight's length in mm (`200`, or `straight 200`), `bend 90`
 *  (its radius `R 60` in mm, its way `toward +z`), or `elbow 90` / `elbow 45` (its way). Ways: +x, +z, -x, -z, or degrees. */
export function pathOf(text: string): PipeStep[] {
  const way = (w: string | undefined) => { if (w === undefined) return undefined; const k = { '+x': 0, '+z': 90, '-x': 180, '-z': 270, x: 0, z: 90 }[w.toLowerCase().replace('−', '-')]; const n = k ?? Number(w); if (!Number.isFinite(n)) throw new Error(`a way to turn is +x, +z, -x, -z or degrees (${w})`); return n; };
  return text.split(';').map((t) => t.trim()).filter(Boolean).map((t): PipeStep => {
    const m = /^(?:straight\s+)?(\d+(?:\.\d+)?)\s*(?:mm)?$/i.exec(t); if (m) return { straight: Number(m[1]) / 1000 };
    const b = /^bend\s+(\d+(?:\.\d+)?)\s*°?(?:\s+R\s*(\d+(?:\.\d+)?))?(?:\s+toward\s+(\S+))?$/i.exec(t); if (b) { const w = way(b[3]); return { bend: Number(b[1]), ...(b[2] ? { R: Number(b[2]) / 1000 } : {}), ...(w !== undefined ? { toward: w } : {}) }; }
    const e = /^elbow\s+(90|45)\s*°?(?:\s+toward\s+(\S+))?$/i.exec(t); if (e) { const w = way(e[2]); return { elbow: Number(e[1]) as 90 | 45, ...(w !== undefined ? { toward: w } : {}) }; }
    throw new Error(`a step of a run is a length in mm, "bend 90 R 60 toward +z" or "elbow 90 toward -x" (${t})`);
  });
}

/** Solid copper conductors (IEC 60228 class 1: the conductor's diameter typical) and their PVC insulation's wall
 *  (typical of IEC 60227 single cores). */
export const WIRES = { '0.5 mm²': { d: 0.8, wall: 0.6 }, '1.5 mm²': { d: 1.38, wall: 0.7 }, '2.5 mm²': { d: 1.78, wall: 0.8 }, '4 mm²': { d: 2.25, wall: 0.8 } } as const;
export type WireSize = keyof typeof WIRES;
export const INSULATION: Record<string, number> = { red: 0xc62828, black: 0x1c1c1c, blue: 0x1565c0, brown: 0x6d4c41, 'green-yellow': 0x7cb342, white: 0xf2f2f2 };
/** A copper wire: bare, or in its insulation with each end stripped (`strip`); its core offers its axis. The core runs
 *  along y, its stripped end at the bottom first. */
export function wire(size: string, length: number, colour = 'none', strip = 0.01): Block {
  const w = WIRES[size as WireSize]; if (!w) throw new Error(`no wire ${size} (${Object.keys(WIRES).join(', ')})`);
  const core = made(`${size} core`, 'copper', { cyl: [mm(w.d) / 2, length] });
  if (colour === 'none') return core;
  if (!(INSULATION[colour] !== undefined)) throw new Error(`no insulation colour ${colour} (${Object.keys(INSULATION).join(', ')})`);
  if (!(length > 2 * strip)) throw new Error(`a wire of ${length * 1000} mm cannot be stripped ${strip * 1000} mm at each end`);
  return over(core, `${size} core/axis`, made(`${size} insulation (${colour})`, 'pvc', { tube: [mm(w.d) / 2, mm(w.d) / 2 + mm(w.wall), length - 2 * strip] }, { color: INSULATION[colour] }), 'mid', 'touch');
}

/** A bobbin (nylon, typical) and a winding of enamelled copper wound on its core, close-wound in one layer: as many turns
 *  as fit between its flanges. The winding is slid over the core: its bore the core's outside. */
export function winding(coreOD: number, length: number, wireD: number, layers = 1, flangeOD = coreOD * 2, bore = coreOD * 0.6): Block {
  if (!(Number.isInteger(layers) && layers >= 1)) throw new Error('a winding of one layer or more');
  const t = mm(1.5), core = made('bobbin core', 'nylon', { tube: [bore / 2, coreOD / 2, length] }), flange = () => made('bobbin flange', 'nylon', { tube: [bore / 2, flangeOD / 2, t] });
  const bob = stack('bobbin', 1, [{ b: flange() }, { b: core }, { b: flange() }]);
  const turns = Math.floor((length - wireD) / wireD); if (turns < 1) throw new Error(`no room for a turn: the core is ${length * 1000} mm long and the wire ${wireD * 1000} mm`);
  if (!(coreOD / 2 + layers * wireD < flangeOD / 2)) throw new Error(`the flanges (${flangeOD * 1000} mm) are no wider than ${layers} layer${layers > 1 ? 's' : ''} of wire`);
  const coil = made('copper winding', 'copper', { coil: [coreOD / 2 + wireD / 2, wireD, turns, wireD, layers] });
  return over(bob, 'bobbin core/axis', coil, 'mid', 'touch');
}

/** Through-hole LEDs (3 mm and 5 mm): two leads 2.54 mm apart, a flange, a body and its lens, the whole 5.3 or 8.6 mm high
 *  above its flange's foot (typical datasheet sizes). Its leads end at the bottom: put through a board's footprint. */
export const LED_COLOURS: Record<string, number> = { red: 0xff2a2a, green: 0x2ee86a, blue: 0x2a6bff, yellow: 0xffd23a, white: 0xf4f6ff };
export function led(size: 3 | 5, colour = 'red', leads = mm(25)): Block {
  const c = LED_COLOURS[colour]; if (c === undefined) throw new Error(`no LED colour ${colour} (${Object.keys(LED_COLOURS).join(', ')})`);
  const r = mm(size) / 2, lead = made('lead', 'steel-low', { cyl: [mm(0.25), leads] }, { color: 0xc8ccd0 });
  const legs = ring(`${size} mm LED leads`, lead, 2, mm(1.27), 'clear');
  const flange = made(`${size} mm LED flange`, 'epoxy', { cyl: [r + mm(0.4), mm(1)] }, { color: c }), body = made(`${size} mm LED body`, 'epoxy', { cyl: [r, (size === 5 ? mm(8.6) : mm(5.3)) - mm(1) - r] }, { color: c });
  return stack(`${size} mm ${colour} LED`, 1, [{ b: legs }, { b: flange }, { b: body }, { b: made(`${size} mm LED lens`, 'epoxy', { dome: [r] }, { color: c }) }]);
}
/** A small lamp: its glass bulb (a dome, 11 mm across) on a brass screw base (E10: 9.5 mm across, 10 mm long; typical). */
export const bulb = (): Block => stack('E10 bulb', 1, [{ b: made('E10 base', 'brass', { cyl: [mm(4.75), mm(10)] }) }, { b: made('bulb glass', 'glass', { dome: [mm(5.5)] }, { color: 0xf3f0e0 }) }]);

/** A pin header, one row, 2.54 mm pitch: its plastic body, each pin (0.64 mm square, 11.6 mm long, gilt) put through it
 *  at its place (typical). */
export function header(pins: number): Block {
  if (!(Number.isInteger(pins) && pins >= 1 && pins <= 40)) throw new Error('a header of 1 to 40 pins');
  const P = mm(2.54), pts = Array.from({ length: pins }, (_, i) => [(i - (pins - 1) / 2) * P, 0] as [number, number]);
  let b = made(`1×${pins} header`, 'nylon', { box: [pins * P, mm(2.5), P] }, { color: 0x1c1c1c, pattern: { name: 'pins', points: pts } });
  for (let i = 0; i < pins; i++) b = through(b, made('pin', 'brass', { box: [mm(0.64), mm(11.6), mm(0.64)] }, { color: 0xd4af37 }), { port: `1×${pins} header/pins`, i, from: 'lo' }, 'touch');
  return b;
}
/** A 6 × 6 mm tactile switch: four legs, its body, its plunger (typical of the common through-hole part). */
export const button = (): Block => stack('6×6 push button', 1, [{ b: ring('button legs', made('leg', 'steel-low', { box: [mm(0.7), mm(3.5), mm(0.3)] }, { color: 0xc8ccd0 }), 4, mm(3.2), 'clear') }, { b: made('button body', 'pom', { box: [mm(6), mm(3.5), mm(6)] }) }, { b: made('button plunger', 'pom', { cyl: [mm(1.75), mm(1.5)] }, { color: 0x3a3a3a }) }]);
/** A push-in terminal block, 5.08 mm pitch: a wire's stripped end goes down its holes from above (typical). */
export function terminal(poles: number): Block {
  if (!(Number.isInteger(poles) && poles >= 1 && poles <= 12)) throw new Error('a terminal block of 1 to 12 poles');
  const P = mm(5.08), pts = Array.from({ length: poles }, (_, i) => [(i - (poles - 1) / 2) * P, 0] as [number, number]);
  return made(`${poles}-pole terminal block`, 'nylon', { box: [poles * P, mm(9), mm(8)] }, { color: 0x2e7d32, pattern: { name: 'holes', points: pts, hole: mm(2.6) / 2 } });
}

/** A bolted joint: the bolt's shank down a hole of what it holds (from above), its head on top of it on that hole, and a
 *  washer and a nut slid over the shank's end below it. The shank is as long as the grip, the washer and the nut. */
/** What already stands in a hole (P2's one bolt to a hole): a round piece, solid, on the hole's line where it runs up,
 *  within the height of the piece `k` that offers it (a bolt's shank, a part's solder joint seated at its footprint). */
function holdingIn(held: Block, k: number, o: Line): Piece | undefined {
  const tb = boundOf(held.pieces[k]!); if (o.dir && !(Math.abs(o.dir[0]) < 1e-9 && Math.abs(o.dir[2]) < 1e-9)) return undefined;
  return held.pieces.find((q, j) => { if (j === k) return false; const B = q.solid.base, qb = boundOf(q); if (B.k !== 'cyl' || B.ri !== undefined) return false;
    return Math.hypot(B.c[0] - o.x, B.c[2] - o.z) < 1e-9 && qb[0][1] < tb[1][1] - 1e-9 && qb[1][1] > tb[0][1] + 1e-9; });
}
export function boltedJoint(held: Block, port0: string, size: string, i = 0, head: 'hex' | 'socket' = 'hex', fit: Fit = 'slide', turned = false): Block {
  // (a name given almost right: the holes it plainly means, said back as a note (decision 0026, step 4))
  const nm = namedIn(held, port0, 'line', 'bolted joint'), port = nm.port, notes = nm.note ? [nm.note] : [];
  // (holes of one name in two pieces or more, stacked: the bolt goes down the top one's, through all under it, said back)
  // (P2, AUDIT 5.2: holes of that name on pieces side by side (two pillow blocks' feet, each its own hole) are each a hole of
  // their own: `which` (i) counts through every distinct hole, the top piece's first, then the others' in their order; at
  // each the bolt goes down the top piece that offers it there. Before, `which` counted only the first top piece's holes and
  // fell back to its first, so a second block stayed unbolted and one hole took two bolts)
  const owners = held.pieces.map((p, k) => ({ p, k })).filter(({ p }) => p.lines.some((l) => l.port === port)), topY = (x: { p: Piece }) => boundOf(x.p)[1][1];
  const order = [...owners].sort((u, v) => topY(v) - topY(u) || u.k - v.k), at = (l: Line, m: Line) => Math.hypot(l.x - m.x, l.z - m.z) < 1e-9 && (l.y ?? 0) === (m.y ?? 0) && (l.dir ?? [0, 1, 0]).every((v, k) => Math.abs(v - (m.dir ?? [0, 1, 0])[k]!) < 1e-9);
  const holes: { w: { p: Piece; k: number }; l: Line; j: number }[] = [];
  for (const w of order) w.p.lines.filter((l) => l.port === port).forEach((l, j) => { if (!holes.some((h) => at(h.l, l))) holes.push({ w, l, j }); });
  const hole = holes[i] ?? (i === 0 ? undefined : (() => { throw new Error(`bolted joint: ${held.name} has ${holes.length} hole${holes.length === 1 ? '' : 's'} ${port} (which 0 to ${holes.length - 1}), not ${i}`); })());
  const top = hole?.w, o = hole?.l;
  if (!o || !top) throw new Error(`bolted joint: ${held.name} offers no hole ${port}`);
  if (owners.length > 1) notes.push(`bolted joint: ${owners.length} pieces offer ${port}: hole ${i} of ${holes.length}, down the ${top.p.name} (piece ${top.k + 1})${owners.some((w) => w !== top && at(w.p.lines.find((l) => l.port === port)!, o)) ? ', through all under it' : ''}`);
  // (one bolt to a hole: a hole that already holds a round piece on its line, through the piece that offers it, is refused)
  const inIt = holdingIn(held, top.k, o);
  if (inIt) throw new Error(`bolted joint: hole ${i} of ${port} (in the ${top.p.name}) already holds the ${inIt.name}: one bolt to a hole; name another (which 0 to ${holes.length - 1})`);
  const ti = top.p.lines.filter((l) => l.port === port).indexOf(o);
  // (its grip: from the top of the piece whose hole it goes down to the bottom of the lowest piece under that hole, so a
  // second joint on the same plates is not lengthened by the first one's head and nut)
  // (a hole that runs across or down (a fan's frame stood on its side, a wall plate's): the whole turned so it runs up, bolted
  // there, and turned back, so the joint follows the hole's own direction (decision 0026, as Bolted down does); a hole at an
  // angle to x, y and z is refused)
  if (o.dir && !(Math.abs(o.dir[0]) < 1e-9 && Math.abs(o.dir[2]) < 1e-9 && o.dir[1] > 0)) {
    const d = o.dir, ax = d.findIndex((v) => Math.abs(Math.abs(v) - 1) < 1e-9); if (ax < 0) throw new Error(`bolted joint: the hole ${port} runs at an angle, not along x, y or z: not made yet`);
    // (turned once and still not up: holes of that name on pieces facing different ways, the top one changing with each
    // turn; refused, not turned again (decision 0028: it turned for ever, 'Maximum call stack size exceeded'))
    if (turned) throw new Error(`bolted joint: the holes ${port} face different ways on the pieces that offer them (${owners.map((w) => w.p.name).slice(0, 3).join(', ')}): turned so the top one's runs up, another's is on top and does not; turn the whole first (room.turn) so the hole meant runs up, or bolt the part that offers it before it is joined to the rest`);
    const about: P3 = d[1] < 0 ? [1, 0, 0] : [-d[2], 0, d[0]], deg = d[1] < 0 ? 180 : 90;
    return noted(turn(boltedJoint(turn(held, about, deg), port, size, i, head, fit, true), about, -deg), notes.join('; '));
  }
  const owner = top.p, ceiling = boundOf(owner)[1][1];
  const under = held.pieces.map(boundOf).filter((b) => b[0][0] < o.x && o.x < b[1][0] && b[0][2] < o.z && o.z < b[1][2] && b[1][1] <= ceiling + 1e-9);
  const m = sizeOf(size, 'hw', 'm'), grip = ceiling - Math.min(...under.map((b) => b[0][1])), L = grip + mm(m.hw) + mm(m.m);
  // (each joint's pieces named apart, so a second joint's washer and nut find its own shank: "M8 shank 2")
  const k = 1 + held.pieces.filter((p) => p.name.startsWith(`${size} shank`)).length, tag = k > 1 ? ` ${k}` : '';
  const shank = made(`${size} shank${tag}`, 'steel-alloy', { cyl: [mm(m.d) / 2, L] }, { color: 0x5c5f63 });
  const cap = head === 'hex' ? (() => { const h = sizeOf(size, 's', 'k'); return made(`${size} head${tag}`, 'steel-alloy', { hex: [mm(h.s), mm(h.k)] }, { color: 0x5c5f63 }); })() : (() => { const h = sizeOf(size, 'dk', 'ks'); return made(`${size} head${tag}`, 'steel-alloy', { cyl: [mm(h.dk) / 2, mm(h.ks)] }, { color: 0x2a2b2e }); })();
  const passed = through(held, shank, { port, i: ti, from: 'hi', ...(owners.length > 1 ? { k: top.k } : {}) }, fit);
  const headed = onto(passed, '+y', cap, 'touch', `${size} shank${tag}/axis`);
  // (P2: every face the joint made, the shank in its holes, the head and the nut on what they clamp, said fixed: a bolted
  // joint holds what it clamps, whatever fit its shank was laid down the holes with)
  const nutted = over(headed, `${size} shank${tag}/axis`, stack(`${size} washer and nut`, 1, [{ b: nut(size) }, { b: washer(size) }]), 'lo', 'touch');
  return noted(jointed(nutted, held.faces.length, 'fixed'), notes.join('; '));
}

/** A coil of wire on its own (air-cored, or to slide over a core): its mean radius, its wire, its turns close-wound, its
 *  layers. Its bore is offered by its axis. */
export const coil = (R: number, wireD: number, turns: number, layers = 1, mat = 'copper'): Block => made('coil', mat, { coil: [R, wireD, turns, wireD, layers] });

/** Bars of a section, by kind and size (mm): an equal angle (its legs a × a, thick t), a channel (h high, b wide, its
 *  web and flanges t), an I-beam (h, b, web tw, flanges tf), a tee (b wide, h high, t thick). Steel sizes from their
 *  tables (IPE: EN 10365; equal angle: EN 10056); aluminium sizes typical of stock extrusions. Its profile is in x and y,
 *  its length along z; a hole through a leg is a pattern like a plate's. */
export const SECTIONS = {
  'aluminium angle 20×20×2': { kind: 'angle', a: 20, t: 2, mat: 'al-6063' }, 'aluminium angle 40×40×4': { kind: 'angle', a: 40, t: 4, mat: 'al-6063' },
  'steel angle 50×50×5 (EN 10056)': { kind: 'angle', a: 50, t: 5, mat: 'steel-low' },
  'aluminium channel 25×25×2': { kind: 'channel', h: 25, b: 25, t: 2, mat: 'al-6063' }, 'aluminium channel 40×20×2': { kind: 'channel', h: 20, b: 40, t: 2, mat: 'al-6063' },
  // (every IPE of the one IPE table, families.ts, EN 10365)
  ...Object.fromEntries(Object.entries(IPE).map(([k, [h, b, tw, tf]]) => [`steel IPE ${k} (EN 10365)`, { kind: 'I', h, b, tw, tf, mat: 'steel-low' }])),
  'aluminium tee 25×25×3': { kind: 'T', b: 25, h: 25, t: 3, mat: 'al-6063' },
} as Record<string, { kind: string; a?: number; t?: number; h?: number; b?: number; tw?: number; tf?: number; mat: string }>;
export type SectionSize = string;
export function section(size: string, length: number): Block {
  const q = SECTIONS[size];
  if (!q) throw new Error(`no section ${size} (${Object.keys(SECTIONS).join(', ')})`);
  const k = (v: number | undefined) => mm(v ?? 0), t = k(q.t), h = k(q.h), b = k(q.b), a = k(q.a), tw = k(q.tw), tf = k(q.tf);
  const pts: [number, number][] = q.kind === 'angle' ? [[0, 0], [a, 0], [a, t], [t, t], [t, a], [0, a]]
    : q.kind === 'channel' ? [[0, 0], [b, 0], [b, h], [b - t, h], [b - t, t], [t, t], [t, h], [0, h]]
    : q.kind === 'I' ? [[-b / 2, -h / 2], [b / 2, -h / 2], [b / 2, -h / 2 + tf], [tw / 2, -h / 2 + tf], [tw / 2, h / 2 - tf], [b / 2, h / 2 - tf], [b / 2, h / 2], [-b / 2, h / 2], [-b / 2, h / 2 - tf], [-tw / 2, h / 2 - tf], [-tw / 2, -h / 2 + tf], [-b / 2, -h / 2 + tf]]
    : [[-t / 2, 0], [t / 2, 0], [t / 2, h - t], [b / 2, h - t], [b / 2, h], [-b / 2, h], [-b / 2, h - t], [-t / 2, h - t]];
  return made(`${size}, ${Math.round(length * 1000)} mm`, q.mat, { section: { pts, L: length } });
}
/** A box, hollow, open at the top (a project box, a tray, a tank): its walls and floor round a box-shaped cavity offered
 *  as a room (`<name>/cavity`) for what goes in, refused with both sizes where it does not fit. */
export const boxCase = (name: string, w: number, h: number, d: number, wall: number, floor: number, mat: string, color?: number): Block =>
  made(name, mat, { case: [w, h, d, wall, floor] }, color !== undefined ? { color } : {});

// ---- the second set: electronics -------------------------------------------------------------------------------
// (every one stands on its leads or pins, upright: room.ts's lines and round solids run along y only, so a part lying
// across a board (an axial resistor laid flat, a TO-92's bent leads) waits for turned blocks)
const LEAD = 0xc8ccd0;
const lead = (name: string, d: number, L: number): Block => made(name, 'copper', { cyl: [d / 2, L] }, { color: LEAD });
/** Parts whose pins run up through their body, in a row along x at a pitch (a header's, a TO-92's, a switch's lugs): the
 *  body offers the row as `<name>/<row>`, and each pin is put down it from the body's top (its top at the body's). */
function pinned(body: Block, row: string, pin: () => Block, n: number): Block {
  let b = body; for (let i = 0; i < n; i++) b = through(b, pin(), { port: `${body.name}/${row}`, i, from: 'hi' }, 'tight');
  return b;
}
const inRow = (n: number, P: number): [number, number][] => Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * P, 0] as [number, number]);

/** Axial resistors by their rating: the body's diameter D and length L, and the leads' diameter d, mm (typical of
 *  carbon-film datasheets at their largest: 1/4 W Ø2.5 × 6.5 mm on leads Ø0.6 mm). */
export const RESISTORS = { '1/8 W': { D: 1.8, L: 3.3, d: 0.45 }, '1/4 W': { D: 2.5, L: 6.5, d: 0.6 }, '1/2 W': { D: 3.5, L: 9.5, d: 0.6 }, '1 W': { D: 5, L: 12, d: 0.8 } } as const;
/** An axial resistor: a lead, its body (a ceramic core under its film and lacquer) and a lead, end to end along its axis,
 *  stood upright. Its leads (28 mm typical) go down a board's footprints. */
export function resistor(rating: string, leads = mm(28)): Block {
  const r = RESISTORS[rating as keyof typeof RESISTORS]; if (!r) throw new Error(`no resistor ${rating} (${Object.keys(RESISTORS).join(', ')})`);
  const l = () => lead(`${rating} resistor lead`, mm(r.d), leads);
  return stack(`${rating} resistor`, 1, [{ b: l() }, { b: made(`${rating} resistor body`, 'ceramic', { cyl: [mm(r.D) / 2, mm(r.L)] }, { color: 0xd8c39a }) }, { b: l() }]);
}
/** A radial ceramic capacitor (a dipped multilayer chip): its body drawn as its box, 5.0 wide, 5.5 high and 3.0 deep, on
 *  two leads Ø0.5 mm at 2.54 or 5.08 mm (typical of a dipped radial MLCC's datasheet). Its leads go down a board's
 *  footprints. */
export function ceramicCap(pitch = 2.54, leads = mm(20)): Block {
  if (pitch !== 2.54 && pitch !== 5.08) throw new Error('a ceramic capacitor\'s leads 2.54 or 5.08 mm apart');
  const legs = ring('ceramic capacitor leads', lead('ceramic capacitor lead', mm(0.5), leads), 2, mm(pitch) / 2, 'clear');
  return stack(`ceramic capacitor (${pitch} mm)`, 1, [{ b: legs }, { b: made('ceramic capacitor body', 'epoxy', { box: [mm(5), mm(5.5), mm(3)] }, { color: 0xd9a400 }) }]);
}
/** Radial electrolytic capacitors by their case, D × L, its leads F apart and d across, mm (the common case sizes and their
 *  lead spacings, typical of makers' tables). */
export const ELECTROLYTICS = { '5×11': { D: 5, L: 11, F: 2, d: 0.5 }, '6.3×11': { D: 6.3, L: 11, F: 2.5, d: 0.5 }, '8×11.5': { D: 8, L: 11.5, F: 3.5, d: 0.6 }, '10×16': { D: 10, L: 16, F: 5, d: 0.6 }, '10×20': { D: 10, L: 20, F: 5, d: 0.6 } } as const;
/** A radial electrolytic capacitor: its aluminium can, its PVC sleeve (0.15 mm, typical) slid over it short of each end
 *  by 0.5 mm, on its two leads. Its leads go down a board's footprints; the longer (+) is not told apart here. */
export function electrolytic(size: string, leads = mm(20)): Block {
  const e = ELECTROLYTICS[size as keyof typeof ELECTROLYTICS]; if (!e) throw new Error(`no electrolytic case ${size} (${Object.keys(ELECTROLYTICS).join(', ')})`);
  const R = mm(e.D) / 2, w = mm(0.15), can = made(`${size} capacitor can`, 'al-3003', { cyl: [R - w, mm(e.L)] }, { color: 0xc0c4c8 });
  const sleeved = over(can, `${size} capacitor can/axis`, made(`${size} capacitor sleeve`, 'pvc', { tube: [R - w, R, mm(e.L) - mm(1)] }, { color: 0x1d2b5a }), 'mid', 'touch');
  const legs = ring(`${size} capacitor leads`, lead(`${size} capacitor lead`, mm(e.d), leads), 2, mm(e.F) / 2, 'clear');
  return stack(`${size} electrolytic capacitor`, 1, [{ b: legs }, { b: sleeved }]);
}
/** A transistor in a TO-92 case (JEDEC TO-226AA): its body drawn as its box, 4.8 wide, 4.8 high and 3.7 deep (the middle
 *  of the outline's limits; its rounded back not drawn), three leads 0.46 × 0.38 mm at 1.27 mm, 12.7 mm below it (the
 *  outline's least), run up into it. Its leads go down a board's footprints. */
export function to92(name = 'TO-92 transistor'): Block {
  const A = mm(4.8), body = made(`${name} body`, 'epoxy', { box: [mm(4.8), A, mm(3.7)] }, { color: 0x1c1c1c, pattern: { name: 'leads', points: inRow(3, mm(1.27)) } });
  return stack(name, 1, [{ b: pinned(body, 'leads', () => made(`${name} lead`, 'copper', { box: [mm(0.46), A + mm(12.7), mm(0.38)] }, { color: LEAD }), 3) }]);
}
/** Cells by their size, mm: an 18650 (Ø18.4, 65.0 high over its cap; typical of the common cell's datasheet, which gives
 *  at most Ø18.5 and 65.3), AA and AAA (IEC 60086-2: LR6 Ø13.5 to 14.5, 49.2 to 50.5 high, its pip at most Ø5.5 and at
 *  least 1.0 high; LR03 Ø9.5 to 10.5, 43.3 to 44.5 high, its pip at most Ø3.8 and at least 0.8 high; each drawn within
 *  them). Their cans' wall 0.25 mm and floor 0.3 mm, and their wraps 0.1 mm, typical. */
export const CELLS = {
  '18650': { D: 18.4, H: 65, pip: 7, pipH: 0.6, wrap: 0x2e6f8e }, 'AA (LR6)': { D: 14.2, H: 49.8, pip: 5.2, pipH: 1.2, wrap: 0x2b2b2b }, 'AAA (LR03)': { D: 10.2, H: 44, pip: 3.6, pipH: 0.9, wrap: 0x2b2b2b },
} as const;
/** A cell: its steel can (a cup), what it holds (its wound electrodes, drawn as one solid of a cell's mean density) into
 *  its cavity, its wrap slid over the can, and its + terminal on top. It goes into a holder's or a box's room; its ends
 *  are its contacts. */
export function cell(size: string): Block {
  const c = CELLS[size as keyof typeof CELLS]; if (!c) throw new Error(`no cell ${size} (${Object.keys(CELLS).join(', ')})`);
  const R = mm(c.D) / 2, w = mm(0.1), wall = mm(0.25), floor = mm(0.3), H = mm(c.H - c.pipH);
  const can = made(`${size} cell can`, 'steel-low', { cup: [R - w, H, wall, floor] }, { color: 0xb8bcc2 });
  const full = into(can, `${size} cell can/cavity`, made(`${size} cell electrodes`, 'battery', { cyl: [R - w - wall, H - floor] }, { color: 0x3a3a3a }), 'tight');
  const wrapped = over(full, `${size} cell can/axis`, made(`${size} cell wrap`, 'pvc', { tube: [R - w, R, H - mm(1)] }, { color: c.wrap }), 'mid', 'touch');
  return stack(`${size} cell`, 1, [{ b: wrapped }, { b: made(`${size} cell + terminal`, 'steel-low', { cyl: [mm(c.pip) / 2, mm(c.pipH)] }, { color: LEAD }) }]);
}
/** A miniature toggle switch, SPDT (typical of the common MTS-102): its body 13 × 10 × 8 mm, its bushing Ø6 mm (an M6
 *  thread, not drawn) 9 mm long, its lever Ø3 mm and 11 mm long in its middle place, three lugs 1.5 × 0.5 mm at 4.7 mm
 *  standing 4 mm below it. Its bushing goes up a panel's hole; its lugs take wires. (Its lever's two thrown places are
 *  turned off y: not in room.ts yet.) */
export function toggle(): Block {
  const H = mm(10), body = made('toggle switch body', 'pbt', { box: [mm(13), H, mm(8)] }, { color: 0x1c1c1c, pattern: { name: 'lugs', points: inRow(3, mm(4.7)) } });
  const lugs = pinned(body, 'lugs', () => made('toggle switch lug', 'brass', { box: [mm(1.5), H + mm(4), mm(0.5)] }, { color: LEAD }), 3);
  return stack('toggle switch', 1, [{ b: lugs }, { b: made('toggle switch bushing', 'brass', { cyl: [mm(3), mm(9)] }, { color: LEAD }) }, { b: made('toggle switch lever', 'stainless-304', { cyl: [mm(1.5), mm(11)] }) }]);
}
/** A 5 × 20 mm glass cartridge fuse (IEC 60127-2: 20 mm over its caps, Ø5.2 mm over them): its glass Ø5.0 mm with a 0.6 mm
 *  wall and its two caps 4.5 mm long (typical), its element (Ø0.15 mm here: its size is set by its rating) passed along
 *  its axis from cap to cap, touching each. It goes into a fuse holder's clips by its caps. */
export function fuse(rating = '1 A'): Block {
  const cap = () => made('5×20 fuse cap', 'nickel-plate', { cyl: [mm(2.6), mm(4.5)] }, { color: LEAD }), L = mm(11);
  const body = stack(`5×20 mm fuse, ${rating}`, 1, [{ b: cap() }, { b: made('5×20 fuse glass', 'glass', { tube: [mm(1.9), mm(2.5), L] }, { color: 0xdfe8ee }) }, { b: cap() }]);
  return through(body, made('5×20 fuse element', 'copper', { cyl: [mm(0.075), L] }), { port: '5×20 fuse glass/axis', from: 'lo' }, 'tight');
}
/** A JST XH header, top entry (B<n>B-XH-A), as JST's XH datasheet draws it: 2.50 mm pitch, its shroud (PA66) (n − 1) × 2.5
 *  + 4.9 mm wide, 5.75 deep and 7.0 high, each pin 0.64 mm square standing 3.4 mm below it; its walls 0.6 and its floor
 *  1.5 mm typical. Its pins go down a board's footprints and take the XHP plug's contacts in its shroud. */
export function jstXH(pins: number): Block {
  if (!(Number.isInteger(pins) && pins >= 2 && pins <= 16)) throw new Error('a JST XH header of 2 to 16 pins');
  const P = mm(2.5), H = mm(7), name = `JST XH ${pins}-pin housing`;
  const shroud = made(name, 'nylon', { case: [(pins - 1) * P + mm(4.9), H, mm(5.75), mm(0.6), mm(1.5)] }, { color: 0xf2efe6, pattern: { name: 'pins', points: inRow(pins, P) } });
  return stack(`JST XH ${pins}-pin header`, 1, [{ b: pinned(shroud, 'pins', () => made('JST XH pin', 'brass', { box: [mm(0.64), H + mm(3.4), mm(0.64)] }, { color: LEAD }), pins) }]);
}
/** A 16 mm rotary potentiometer (typical of the common 16 mm board-mounting pot): its body Ø16 × 7 mm, its bushing Ø7 mm
 *  (an M7 × 0.75 thread, not drawn) 7 mm long, its shaft Ø6 × 15 mm turning on its wiper's joint, three terminals 1 ×
 *  0.3 mm at 5 mm standing 5 mm below it. Its bushing goes up a panel's hole, a knob over its shaft. */
export function pot(): Block {
  const H = mm(7), body = made('16 mm pot body', 'steel-low', { cyl: [mm(8), H] }, { color: 0x9a9da2, pattern: { name: 'terminals', points: inRow(3, mm(5)) } });
  const terms = pinned(body, 'terminals', () => made('16 mm pot terminal', 'brass', { box: [mm(1), H + mm(5), mm(0.3)] }, { color: LEAD }), 3);
  return stack('16 mm potentiometer', 1, [{ b: terms }, { b: made('16 mm pot bushing', 'brass', { cyl: [mm(3.5), H] }, { color: LEAD }) }, { b: made('16 mm pot shaft', 'al-6061', { cyl: [mm(3), mm(15)] }, { joint: joint('wiper', { turn: true }) }) }]);
}

// ---- the second set: mechanical --------------------------------------------------------------------------------
/** A lid made for a box (a hollow box, or one already filled): a plate its outside width and depth, `t` thick, onto its
 *  top (Onto a face). It rests on the box's walls, or on what stands highest in it, and closes its cavity. */
export function closed(box: Block, t = mm(2), mat = 'abs'): Block {
  const c = box.pieces[0]?.color;
  return onto(box, '+y', made(`${box.name} lid`, mat, { box: [box.hi[0] - box.lo[0], t, box.hi[2] - box.lo[2]] }, c !== undefined ? { color: c } : {}), 'touch');
}
/** An L bracket: its upright and its foot, legs `a` by `a`, `t` thick and `L` long, the holes in each in a row along it
 *  (ISO 273 medium clearance for a bolt of that size), offered as `<name> foot/holes` and `<name> upright/holes`. Drawn as
 *  its two legs touching at the bend (a bent bracket is one piece; its bend's radius not drawn). Its upright is made as a
 *  plate lying flat with its holes through it, then turned up (decision 0024): its holes run across it (along +x, into
 *  the bracket), at the middle of its height above the foot. Bolted down by its foot, or to a wall by its upright
 *  (Bolted down to a plate). */
export function bracket(name = 'L bracket', a = mm(40), t = mm(4), L = mm(40), size = 'M5', holes = 2, mat = 'steel-low', upright = holes): Block {
  if (!(Number.isInteger(holes) && holes >= 1 && holes <= 6)) throw new Error('a bracket with 1 to 6 holes in its foot');
  if (!(Number.isInteger(upright) && upright >= 0 && upright <= 6)) throw new Error('a bracket with 0 to 6 holes in its upright');
  if (!(t < a / 2)) throw new Error(`a bracket's legs (${a * 1000} mm) more than twice its thickness (${t * 1000} mm)`);
  const m = sizeOf(size, 'clear'), row = (n: number, x: number) => Array.from({ length: n }, (_, i) => [x, (i - (n - 1) / 2) * (L / n)] as [number, number]);
  // (flat, its width across x; turned −90° about z its width stands up along y and its holes run along +x: a hole at
  // x = −t/2 in the flat plate stands t/2 above the upright's middle, the middle of its height above the foot)
  const up = turn(plate(`${name} upright`, a, t, L, mat, row(upright, -t / 2), mm(m.clear)), 2, -90);
  return stack(name, 0, [{ b: up }, { b: plate(`${name} foot`, a - t, t, L, mat, row(holes, 0), mm(m.clear)) }], undefined, true);
}
/** What offers holes (a bracket's foot, a plate) bolted down to a plate made under it: the plate's holes the reverse of its
 *  pattern (each under one of its holes, ISO 273 medium clearance), the two stacked, each hole bolted (Bolted joint).
 *  Holes that run across (a bracket's upright's, along x or z): the whole turned so they run up, the plate made against
 *  the face they come out of, bolted, and turned back (decision 0024): a wall plate. Refused where the piece with the
 *  holes is not on the outside there, or the holes run at an angle. */
export function boltedDown(held: Block, port0: string, w: number, t: number, d: number, mat = 'steel-low', size = 'M5', head: 'hex' | 'socket' = 'hex'): Block {
  // (a name given almost right: the holes it plainly means, said back as a note (decision 0026, step 4))
  const nm = namedIn(held, port0, 'line', 'bolted down'); if (nm.port !== port0) return noted(boltedDown(held, nm.port, w, t, d, mat, size, head), nm.note);
  const port = port0, ls = held.pieces.flatMap((p) => p.lines.filter((l) => l.port === port)); if (!ls.length) throw new Error(`bolted down: the ${held.name} offers no holes ${port}`);
  const dir = ls[0]!.dir;
  if (dir && !(Math.abs(dir[0]) < 1e-9 && Math.abs(dir[2]) < 1e-9 && dir[1] > 0)) {
    const ax = dir.findIndex((v) => Math.abs(Math.abs(v) - 1) < 1e-9); if (ax < 0) throw new Error(`bolted down: the ${held.name}'s holes ${port} run at an angle, not along x, y or z: not made yet`);
    const owner = held.pieces.find((p) => p.lines.some((l) => l.port === port))!, ob = boundOf(owner), off = dir[ax]! > 0 ? ob[0][ax]! - held.lo[ax]! : held.hi[ax]! - ob[1][ax]!;
    if (off > 1e-9) throw new Error(`bolted down: the ${owner.name} is ${(off * 1000).toFixed(2)} mm inside the ${held.name} where its holes ${port} come out: a plate cannot go against it`);
    // (the quarter turn taking the holes' way onto +y, about dir × y; a half turn about x where they run down)
    const about: P3 = dir[1] < 0 ? [1, 0, 0] : [-dir[2], 0, dir[0]], deg = dir[1] < 0 ? 180 : 90;
    return turn(boltedDown(turn(held, about, deg), port, w, t, d, mat, size, head), about, -deg);
  }
  const cx = (held.lo[0] + held.hi[0]) / 2, cz = (held.lo[2] + held.hi[2]) / 2;
  // (wave 11, P2's one bolt to a hole: a point of the line that already holds a piece (a board's footprint, where a part's
  // solder joint is seated in it) is no hole to bolt through: only the free ones are bolted, and the plate drilled under
  // them. Before, every point was: the Uno's 12, its headers', jacks' and chip's footprints with its 4 mounting holes)
  const owners = held.pieces.map((p, k) => ({ p, k })).filter(({ p }) => p.lines.some((l) => l.port === port));
  const free = ls.map((l) => !owners.some(({ k }) => holdingIn(held, k, l))), open = ls.filter((_, i) => free[i]);
  if (!open.length) throw new Error(`bolted down: every one of the ${held.name}'s ${ls.length} holes ${port} already holds a piece: none left to bolt through`);
  let b = stack(`${held.name}, bolted down`, 1, [{ b: plate(`${held.name} base plate`, w, t, d, mat, open.map((l) => [l.x - cx, l.z - cz] as [number, number]), mm(sizeOf(size, 'clear').clear)) }, { b: held }]);
  for (let i = 0; i < ls.length; i++) if (free[i]) b = boltedJoint(b, port, size, i, head);
  return b;
}
/** Deep-groove ball bearings: bore d, outside D and width B, read from the one bearing table (`BEARINGS`, families.ts:
 *  ISO 15, with BOSL2's makers' rows, src/nexus/parts/bosl2.ts); their balls, how many and how big, by `ballsOf` (each
 *  about 0.3 of the rings' section, as many as a Conrad assembly takes: typical, an estimate). */
export const BEARINGS: Record<string, { d: number; D: number; B: number; n: number; Dw: number }> = Object.fromEntries(Object.entries(BEARING_SIZES).map(([k, [d, D, B]]) => { const q = ballsOf(d, D); return [k, { d, D, B, n: q.z, Dw: +q.Db.toFixed(3) }]; }));
/** A deep-groove ball bearing: its inner ring, its cage slid over it at the middle of its width, its outer ring slid over
 *  all, and each ball put through its pocket in the cage (a sliding fit), the balls on their pitch circle ((d + D) / 2)
 *  touching both rings. Approximated so: each ball drawn as its bounding cylinder (room.ts has no sphere yet), the rings'
 *  raceway grooves not drawn (each ring's face toward the balls at the pitch less, or more, half a ball and the pocket's
 *  fit), the cage drawn as a solid ring with its pockets. Its inner ring's bore takes a shaft (Through a line); its outer
 *  ring goes into a housing's bore. */
export function bearing(size: string): Block {
  const q = BEARINGS[size]; if (!q) throw new Error(`no bearing ${size} (${Object.keys(BEARINGS).join(', ')})`);
  const R = mm(q.d + q.D) / 4, r = mm(q.Dw) / 2, g = FITS.slide.gap, ri = R - r - g, ro = R + r + g, steel = 0xb8bcc2;
  const inner = made(`${size} inner ring`, 'steel-chrome', { tube: [mm(q.d) / 2, ri, mm(q.B)] }, { color: steel });
  const cage = made(`${size} cage`, 'steel-low', { tube: [ri, ro, 2 * r] }, { color: 0x8a7550, pattern: { name: 'pockets', circle: { n: q.n, r: R } } });
  let b = over(over(inner, `${size} inner ring/axis`, cage, 'mid', 'touch'), `${size} inner ring/axis`, made(`${size} outer ring`, 'steel-chrome', { tube: [ro, mm(q.D) / 2, mm(q.B)] }, { color: steel }), 'mid', 'touch');
  for (let i = 0; i < q.n; i++) b = through(b, made(`${size} ball`, 'steel-chrome', { cyl: [r, 2 * r] }, { color: 0xd8dce0 }), { port: `${size} cage/pockets`, i, from: 'lo' }, 'slide');
  return stack(`${size} bearing`, 1, [{ b }]);
}
/** Dowel pins (ISO 8734: hardened steel, ground to m6) by their nominal diameters, mm. */
export const DOWELS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20] as const;
/** A dowel pin, ISO 8734, its diameter (mm) and length: its chamfered and rounded ends not drawn. It goes through two
 *  parts' reamed holes, locating one on the other (Through a line, fit H7/m6: an interference, carried as a pressure). */
export function dowel(d: number, length: number): Block {
  if (!(DOWELS as readonly number[]).includes(d)) throw new Error(`no ISO 8734 dowel of Ø${d} mm (${DOWELS.join(', ')})`);
  return made(`Ø${d} × ${Math.round(length * 1000)} dowel pin`, 'steel-tool', { cyl: [mm(d) / 2, length] }, { color: 0x9ea2a8 });
}
/** Hex socket set screws, flat point (ISO 4026): the socket's width across flats s and its depth t, mm, read from the one
 *  metric table (`ISO_METRIC`, src/nexus/parts/bdw.ts), every size it has. */
export const SET_SCREWS: Record<string, { s: number; t: number }> = Object.fromEntries(Object.entries(ISO_METRIC).filter(([, r]) => r.set).map(([k, r]) => [k, { s: r.set!.s, t: r.set!.t }]));
/** A set screw, ISO 4026: its body and its socketed end (the socket drawn round, as wide as its hexagon's corners; the
 *  thread and the flat point's chamfer not drawn), as two solids of one screw. It goes down a tapped hole in a hub
 *  (Through a line, from above), its point on the shaft. */
export function setScrew(size: string, length: number): Block {
  const q = SET_SCREWS[size]; if (!q) throw new Error(`no ISO 4026 set screw ${size} (${Object.keys(SET_SCREWS).join(', ')})`);
  const m = sizeOf(size); if (!(length > mm(q.t))) throw new Error(`a ${size} set screw longer than its socket (${q.t} mm)`);
  return stack(`${size}×${Math.round(length * 1000)} set screw`, 1, [{ b: made(`${size} set screw`, 'steel-alloy', { cyl: [mm(m.d) / 2, length - mm(q.t)] }, { color: 0x2a2b2e }) },
    { b: made(`${size} set screw socket end`, 'steel-alloy', { tube: [mm(q.s) / Math.sqrt(3), mm(m.d) / 2, mm(q.t)] }, { color: 0x2a2b2e }) }]);
}
/** A closed outline with a round bore taken out of it, as one outline (the bore joined to it by a cut of no width at the
 *  first point: inside it by the even-odd rule, and drawn so), mm in, m out. */
function bored(outline: [number, number][], bore: number): [number, number][] {
  const a0 = Math.atan2(outline[0]![1], outline[0]![0]), K = 32, b = Array.from({ length: K }, (_, k) => { const a = a0 - (2 * Math.PI * k) / K; return [bore * Math.cos(a), bore * Math.sin(a)] as [number, number]; });
  return [...outline, outline[0]!, ...b, b[0]!].map(([x, y]) => [mm(x), mm(y)] as [number, number]);
}
const circle = (R: number, n = 48): [number, number][] => Array.from({ length: n }, (_, k) => [R * Math.cos((2 * Math.PI * k) / n), R * Math.sin((2 * Math.PI * k) / n)] as [number, number]);
const inv = (a: number) => Math.tan(a) - a;
/** A spur gear by its module (mm), its teeth and its face width, its bore through it: its profile a section drawn along
 *  its width (z), so it stands on edge. Each tooth by ISO 53's basic rack (20° pressure angle, addendum m, dedendum 1.25
 *  m): its flanks involutes of its base circle up to its tip, radial below the base circle, its root a chord (the root's
 *  fillet not drawn: approximated so). It meshes with a gear of its module, their axes m(z₁ + z₂)/2 apart: meshing is
 *  not an operation yet (two stacked side by side touch at their tips). */
export function gear(module: number, teeth: number, width: number, bore: number, mat = 'steel-alloy'): Block {
  if (!(Number.isInteger(teeth) && teeth >= 12 && teeth <= 100)) throw new Error('a spur gear of 12 to 100 teeth');
  const m = module, z = teeth, PA = (20 * Math.PI) / 180, r = (m * z) / 2, rb = r * Math.cos(PA), ra = r + m, rf = r - 1.25 * m, B = bore * 1000;
  if (!(m > 0 && B > 0 && B / 2 < rf - m)) throw new Error(`a gear's bore (${B} mm) inside its root circle less a module (Ø${(2 * (rf - m)).toFixed(2)} mm)`);
  const psi = (rho: number) => Math.PI / (2 * z) + inv(PA) - (rho > rb ? inv(Math.acos(rb / rho)) : 0), at = (rho: number, a: number): [number, number] => [rho * Math.cos(a), rho * Math.sin(a)];
  const lo = Math.max(rb, rf), radii = [...(rb > rf ? [rf] : []), ...Array.from({ length: 5 }, (_, k) => lo + (k / 4) * (ra - lo))], pts: [number, number][] = [];
  for (let k = 0; k < z; k++) { const th = (2 * Math.PI * k) / z; pts.push(at(rf, th - Math.PI / z)); for (const rho of radii) pts.push(at(rho, th - psi(rho))); for (const rho of [...radii].reverse()) pts.push(at(rho, th + psi(rho))); }
  // (its bore a pilot, opened to its shaft by what goes along its axis (Through a line), as far as its root circle less a
  // module, the rim it keeps)
  return made(`m${m} z${z} spur gear`, mat, { section: { pts: bored(pts, B / 2), L: width } }, { boreTo: mm(rf - m) });
}
/** A GT2 timing pulley (2 mm pitch) by its teeth, for a 6 mm belt: its pitch diameter z × 2 / π, its outside 0.508 mm less
 *  (twice GT2's 0.254 mm pitch line offset); its grooves approximated (each a U 1.11 mm wide and 0.75 mm deep, its
 *  bottom GT2's 0.555 mm radius); its teeth 7 mm wide between two flanges 1 mm thick, a hub 7 mm long, the flanges and the
 *  hub 3.3 mm over its outside (typical), its bore through all, all along its axis (z); an M3 × 4 set screw (ISO 4026)
 *  down its hub to the bore (its tapped hole through the hub). A belt goes round its teeth; a shaft along its bore needs
 *  a line along z (not in room.ts yet). */
export function gt2(teeth: number, bore = mm(5)): Block {
  if (!(Number.isInteger(teeth) && teeth % 2 === 0 && teeth >= 12 && teeth <= 80)) throw new Error('a GT2 pulley of an even count of teeth, 12 to 80');
  const z = teeth, R = (z * 2) / Math.PI / 2 - 0.254, rho = 0.555, Rc = R - 0.75 + rho, B = bore * 1000, Rf = R + 1.65, name = `GT2 ${z}T pulley`;
  if (!(B / 2 < R - 1.5)) throw new Error(`a ${name}'s bore (${B} mm) within its teeth's roots less 0.75 mm`);
  const pts: [number, number][] = [], d = Math.asin(rho / R);
  for (let k = 0; k < z; k++) { const th = (2 * Math.PI * (k + 0.5)) / z, u = [Math.cos(th), Math.sin(th)] as const, v = [-Math.sin(th), Math.cos(th)] as const;
    pts.push([R * Math.cos(th - d), R * Math.sin(th - d)]);
    for (const f of [270, 225, 180, 135, 90]) { const a = (f * Math.PI) / 180; pts.push([Rc * u[0] + rho * (Math.cos(a) * u[0] + Math.sin(a) * v[0]), Rc * u[1] + rho * (Math.cos(a) * u[1] + Math.sin(a) * v[1])]); }
    pts.push([R * Math.cos(th + d), R * Math.sin(th + d)]); }
  const disc = (part: string, L: number, o: Parameters<typeof made>[3] = {}) => made(`${name} ${part}`, 'al-6061', { section: { pts: bored(circle(Rf), B / 2), L } }, o);
  const hub = disc('hub', mm(7), { pattern: { name: 'set screw', points: [[0, 0]], hole: mm(2.5) / 2 } });
  const body = stack(name, 2, [{ b: hub }, { b: disc('flange', mm(1)) }, { b: made(`${name} teeth`, 'al-6061', { section: { pts: bored(pts, B / 2), L: mm(7) } }) }, { b: disc('flange', mm(1)) }]);
  return through(body, setScrew('M3', mm(4)), { port: `${name} hub/set screw`, from: 'hi' }, 'tight');
}
/** A compression spring of round wire by its wire's diameter, outside diameter and free length (m) and its active coils:
 *  two more coils at its ends, its pitch even throughout (its ends, closed and ground in most, drawn open). Its rate by
 *  Shigley's k = d⁴G / 8D³Nₐ (engineering/springs.ts) for its wire. It slides over a rod or into a bore (Over a shaft,
 *  Into a room). */
export function spring(d: number, OD: number, L0: number, active: number, wire = 'music-wire-a228'): { block: Block; rate: number } {
  const w = SPRING_WIRES[wire]; if (!w) throw new Error(`no spring wire ${wire} (${Object.keys(SPRING_WIRES).join(', ')})`);
  if (!(active >= 1 && d > 0 && OD > 2 * d)) throw new Error('a spring of one active coil or more, its outside more than twice its wire');
  const D = OD - d, total = active + 2, pitch = (L0 - d) / total;
  if (!(pitch > d)) throw new Error(`no room to compress: ${total} coils of ${d * 1000} mm wire in ${L0 * 1000} mm stand solid (its pitch ${(pitch * 1000).toFixed(2)} mm)`);
  return { block: made(`spring ${+(d * 1000).toFixed(2)} × ${+(OD * 1000).toFixed(2)} × ${+(L0 * 1000).toFixed(2)} mm`, 'steel-spring', { coil: [D / 2, d, total, pitch, 1] }, { color: 0x8a8c90 }), rate: springRate({ d, D, Na: active, L0, wire: w }) };
}
/** A butt hinge (typical of a 50 mm steel hinge): its knuckles Ø6 mm, each its share of its height, stacked along its axis,
 *  its pin Ø3 mm through them all (their bores a sliding fit over it), its two leaves 22 mm wide and 1.5 mm thick against
 *  the knuckles on each side, opened flat or at a right angle. Each leaf is made lying flat with its screw holes through it
 *  (Ø4.5 for a 4 mm screw, their countersinks not drawn; typical) and turned up (decision 0024), so its holes run across
 *  it; the second leaf, opened, is turned again a quarter about y and set against the knuckles on the pin's line. A leaf
 *  and its knuckles are one rolled piece in a hinge; here they touch. Its turn about the pin is not a joint: a turned
 *  piece goes on no joint yet, and a joint turns a piece about its own middle, not the pin (decision 0024). */
export function hinge(H = mm(50), knuckles = 3, holes = 2, open: 0 | 90 = 0): Block {
  if (!(Number.isInteger(knuckles) && knuckles >= 2 && knuckles <= 7)) throw new Error('a hinge of 2 to 7 knuckles');
  if (!(Number.isInteger(holes) && holes >= 0 && holes <= 4)) throw new Error('a hinge leaf of 0 to 4 screw holes');
  if (open !== 0 && open !== 90) throw new Error(`a hinge opened flat (0) or at a right angle (90), not ${String(open)}°`);
  const ks = stack('hinge knuckles', 1, Array.from({ length: knuckles }, (_, i) => ({ b: made(`hinge knuckle ${i + 1}`, 'steel-low', { tube: [mm(1.5) + FITS.slide.gap, mm(3), H / knuckles] }) })));
  const pin = through(ks, made('hinge pin', 'steel-low', { cyl: [mm(1.5), H] }), { port: 'hinge knuckle 1/axis', from: 'lo' }, 'slide');
  const pts = Array.from({ length: holes }, (_, i) => [0, (i - (holes - 1) / 2) * (H / holes)] as [number, number]);
  const leaf = (n: number) => turn(made(`hinge leaf ${n}`, 'steel-low', { box: [mm(22), mm(1.5), H] }, holes ? { pattern: { name: 'screw holes', points: pts, hole: mm(4.5) / 2 } } : {}), 0, 90);
  const one = onto(pin, '+x', leaf(1), 'touch');
  const both = open === 90 ? onto(one, '-z', turn(leaf(2), 1, 90), 'touch', 'hinge pin/axis') : onto(one, '-x', leaf(2), 'touch');
  return stack(`butt hinge ${Math.round(H * 1000)} mm${open ? ', opened 90°' : ''}`, 1, [{ b: both }]);
}
/** Heat-set threaded inserts (brass) by thread: length, outside (its knurl's crest), the hole they are pressed into and
 *  their bore (the thread's tap drill: the thread not drawn), mm (typical of the common heat-set inserts). */
export const INSERTS = { M2: { L: 4, OD: 3.6, hole: 3.2, bore: 1.6 }, M3: { L: 5.7, OD: 4.6, hole: 4, bore: 2.5 }, M4: { L: 8.1, OD: 6.3, hole: 5.6, bore: 3.3 }, M5: { L: 9.5, OD: 7.1, hole: 6.4, bore: 4.2 } } as const;
/** A heat-set insert: pressed hot down a plastic part's hole of its size (Through a line from above, tight: its knurl
 *  melts into the plastic round it), a screw then down its bore. */
export function insert(size: string): Block {
  const q = INSERTS[size as keyof typeof INSERTS]; if (!q) throw new Error(`no heat-set insert ${size} (${Object.keys(INSERTS).join(', ')})`);
  // (its bore drawn at the thread's size, as a nut's is (its tap drill, `bore`, is where its thread's crests reach), so a
  // screw of its size goes on by its thread: tapped)
  return made(`${size} heat-set insert`, 'brass', { tube: [mm(Number(size.slice(1))) / 2, mm(q.OD) / 2, mm(q.L)] }, { tapped: true });
}

// ---- the third set: pieces made upright and turned (decision 0024) ----------------------------------------------------
/** Plastic DIPs by their lead count, JEDEC MS-001 (.300 in rows), as Renesas' E8.3, E14.3 and E16.3 give it (MS-001-BA,
 *  -AA, -BB): the body's length D, mm, its limits (9.01 to 10.16 for 8 leads, 18.66 to 19.68 for 14 and 16), drawn at
 *  their middle; `corner` where the corner leads (1, N/2, N/2 + 1, N) are narrower (E8.3's and E16.3's note 10). */
export const DIPS = { 8: { D: [9.01, 10.16], variant: 'MS-001-BA', corner: true }, 14: { D: [18.66, 19.68], variant: 'MS-001-AA', corner: false }, 16: { D: [18.66, 19.68], variant: 'MS-001-BB', corner: true } } as const;
/** The rest of MS-001's outline, mm, each drawn at the middle of its limits: the body's width E1 (6.10 to 7.11) and
 *  thickness A2 (2.93 to 4.95), a lead's width b (0.356 to 0.558), its shoulder's b2 (1.15 to 1.77; a corner lead's 0.76
 *  to 1.14), its thickness c (0.204 to 0.355), its length below the seating plane L (2.93 to 3.81); the pitch e 2.54 and
 *  the rows eA 7.62 apart (basic). Estimates: the body's foot 0.5 above the seating plane (A1, at least 0.39; the whole
 *  then 4.44 high, within A's 5.33), each lead leaving the body at its middle (the lead frame between the mould's halves),
 *  moulded in 1.0 deep. */
export const DIP_OUTLINE = { E1: [6.1, 7.11], A2: [2.93, 4.95], b: [0.356, 0.558], b2: [1.15, 1.77], b2corner: [0.76, 1.14], c: [0.204, 0.355], L: [2.93, 3.81], e: 2.54, eA: 7.62, A1: 0.5, inner: 1.0 } as const;
const midOf = (r: readonly [number, number]) => mm((r[0] + r[1]) / 2);
/** A DIP IC by its leads (8, 14 or 16), JEDEC MS-001: its moulded body (epoxy), each lead (copper alloy) four solids of one
 *  bent strip: its part moulded in, through the body's side on its row's line (the body made with its rows' lines running
 *  up through it, and turned a quarter about x so they run across it); its arm out of the side, against the body on that
 *  line; its shoulder and its tip down from the arm's end to below the seating plane. Built upside down, each leg stood on
 *  its arm's end (the only piece in its path), its second row's side turned to face the same way first, and the whole
 *  turned over at the end: no place is written. Pins counted round from pin 1 anticlockwise seen from above; its pin-1
 *  notch not drawn. Its tips go down a board's holes 2.54 mm apart in rows 7.62 mm apart, or into a DIP socket; neither is
 *  an operation on it yet (a turned passer is refused, decision 0024): it stands on its own. */
export function dip(pins: number, name = `DIP-${pins}`): Block {
  const q = DIPS[pins as keyof typeof DIPS]; if (!q) throw new Error(`no DIP of ${pins} leads (${Object.keys(DIPS).join(', ')})`);
  const o = DIP_OUTLINE, k = pins / 2, E1 = midOf(o.E1), A2 = midOf(o.A2), c = midOf(o.c), arm = mm(o.eA / 2) + c / 2 - E1 / 2, shoulder = mm(o.A1) + A2 / 2 - c / 2;
  const wide = (p: number) => (q.corner && (p === 1 || p === k || p === k + 1 || p === pins) ? midOf(o.b2corner) : midOf(o.b2)), lead = (p: number) => `${name} pin ${p} lead`;
  let b = turn(made(`${name} body`, 'epoxy', { box: [midOf(q.D), E1, A2] }, { color: 0x1c1c1c, pattern: { name: 'leads', points: inRow(k, mm(o.e)) } }), 0, 90);
  // (a row: each lead's moulded-in part through the body's side on its line, from the +z face, and its arm against that
  // face on the line the part offers)
  const row = (pin: (i: number) => number, from: 'lo' | 'hi') => { for (let i = 0; i < k; i++) { const p = pin(i), w = wide(p);
    b = through(b, made(`${lead(p)}, moulded in`, 'copper', { box: [w, mm(o.inner), c] }, { color: LEAD, pattern: { name: 'line', points: [[0, 0]] } }), { port: `${name} body/leads`, i, from }, 'tight');
    b = onto(b, '+z', made(lead(p), 'copper', { box: [w, c, arm] }, { color: LEAD, pattern: { name: 'bend', points: [[0, arm / 2 - c / 2]] } }), 'touch', `${lead(p)}, moulded in/line`); } };
  row((i) => k - i, 'hi'); b = turn(b, 1, 180); row((i) => k + 1 + i, 'lo');
  for (let p = 1; p <= pins; p++) { const w = wide(p);
    b = onto(b, '+y', stack(`${lead(p)}'s leg`, 1, [{ b: made(`${lead(p)}'s shoulder`, 'copper', { box: [w, shoulder, c] }, { color: LEAD }) }, { b: made(`${lead(p)}'s tip`, 'copper', { box: [midOf(o.b), midOf(o.L), c] }, { color: LEAD }) }]), 'touch', `${lead(p)}/bend`); }
  return turn(b, 0, 180, `${name} (${q.variant})`);
}

/** A DC barrel jack for 5.5 × 2.1 mm plugs, right-angle, through-hole, as Same Sky's (formerly CUI) PJ-002A datasheet
 *  draws it: its housing (PBT) 9.0 wide, 11.0 high and 14.4 long, its bore Ø6.5 with its axis 6.5 above the board and
 *  9.5 deep (the plug's insertion), its centre pin Ø2.0 (copper) standing 8.0 from the bore's floor, three terminals 2.5
 *  × 1.0 standing 3.5 below it. Approximated: its housing drawn as two blocks (its back, and its bored front made upright
 *  and turned a quarter to lie along z: one moulding), its three terminals in a row across its back (on the datasheet the
 *  sleeve's and the switch's stand under the bore), its sleeve's contact spring not drawn. A plug goes along its bore from
 *  the front, over its pin (Through a line on `DC jack housing front/bore`, from the bore's floor); its terminals down a
 *  board's holes. */
export function barrelJack(): Block {
  const W = mm(9), H = mm(11), L = mm(14.4), depth = mm(9.5), axis = mm(6.5);
  const front = turn(made('DC jack housing front', 'pbt', { box: [W, depth, H] }, { color: 0x1c1c1c, pattern: { name: 'bore', points: [[0, H / 2 - axis]], hole: mm(6.5) / 2 } }), 0, 90);
  const back = made('DC jack housing back', 'pbt', { box: [W, H, L - depth] }, { color: 0x1c1c1c, pattern: { name: 'terminals', points: inRow(3, mm(3)) } });
  let b = through(stack('DC barrel jack 5.5 × 2.1 mm (PJ-002A)', 2, [{ b: back }, { b: front }]), made('DC jack centre pin', 'copper', { cyl: [mm(1), mm(8)] }, { color: LEAD }), { port: 'DC jack housing front/bore', from: 'lo' }, 'tight');
  for (let i = 0; i < 3; i++) b = through(b, made(`DC jack terminal ${i + 1}`, 'brass', { box: [mm(1), H + mm(3.5), mm(2.5)] }, { color: LEAD }), { port: 'DC jack housing back/terminals', i, from: 'hi' }, 'tight');
  return b;
}
/** A 5.5 × 2.1 mm DC plug, as Same Sky's PP3-002A draws it: its barrel 9.5 long, its outer barrel (brass) Ø5.5 outside,
 *  its centre contact (brass) Ø2.1 inside, an insulator (POM) between them (the barrels' walls 0.25 and 0.45 mm, typical),
 *  its cover (ABS) Ø8.2 and 22.5 long; its cable not drawn. Its contacts slid over one another (Over a shaft), its cover
 *  behind them along its axis (y). It goes along a jack's bore over its pin, its tip at the bore's floor. */
export function plug(): Block {
  const L = mm(9.5), centre = made('DC plug centre contact', 'brass', { tube: [mm(1.05), mm(1.5), L] }, { color: LEAD });
  const ins = over(centre, 'DC plug centre contact/axis', made('DC plug insulator', 'pom', { tube: [mm(1.5), mm(2.5), L] }, { color: 0x1c1c1c }), 'mid', 'touch');
  const barrel = over(ins, 'DC plug centre contact/axis', made('DC plug outer barrel', 'brass', { tube: [mm(2.5), mm(2.75), L] }, { color: LEAD }), 'mid', 'touch');
  return stack('DC plug 5.5 × 2.1 mm (PP3-002A)', 1, [{ b: barrel }, { b: made('DC plug cover', 'abs', { cyl: [mm(4.1), mm(22.5)] }, { color: 0x1c1c1c }) }]);
}

/** An equal tee for copper pipe after EN 1254-1 (capillary, end feed), by the EN 1057 sizes: its sockets and walls the
 *  elbow's (ELBOWS, typical), its run's body between its two sockets as long as its outside is across and 2 mm more, its
 *  branch's body from the run's axis to the branch's socket its outside radius and 2 mm (typical of makers' tables, so
 *  labelled). The run laid as a run (socket, body, socket); the branch made upright as a run of its own (body, socket),
 *  turned square to the run and joined into the side of its body (Branch, decision 0024): the run's wall opened by the
 *  branch's bore, the branch's end cut to the run's outside. A pipe's end goes into each socket to its shoulder; as a
 *  step in a Run of pipe it is not made yet (its branch a second run). */
export function tee(size: string, toward = 0): Block {
  const k = elbowRings(size), name = `${size} tee`, socket = (nm: string): RunSeg => ({ name: nm, mat: 'copper', ri: k.ri, ro: k.ro, straight: k.depth });
  const main = run(name, [socket(`${name} socket 1`), { name: `${name} body`, mat: 'copper', ri: k.bore, ro: k.ro, straight: 2 * k.ro + mm(2) }, socket(`${name} socket 2`)]);
  const side = run(`${name} branch`, [{ name: `${name} branch body`, mat: 'copper', ri: k.bore, ro: k.ro, straight: k.ro + mm(2) }, socket(`${name} socket 3`)]);
  return branch(main, `${name} body/axis`, side, toward);
}

