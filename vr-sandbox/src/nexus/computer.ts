// A computer from its smallest working part up: a FinFET transistor (its fins, gate, high-k liner, spacers, raised source
// and drain, contacts) drawn at its process's published pitches; the cells made of transistors (a 6T SRAM bit, a NAND2
// logic gate) with their first metal wires; arrays and rows of cells; cores of logic and cache; a die; the package the die
// is flipped into (bumps, underfill, heat spreader, lands); the motherboard (socket, memory, power stages, chipset, an
// M.2 drive); and the PC round it. Each level is placed from the one below, never copied: a die of billions of
// transistors stores one transistor of each kind, one cell of each kind, one array, and places them.
//
// What is drawn true: each process's fin pitch, gate pitch, metal pitch, fin height and SRAM bit-cell area as its maker
// published them (Intel at IEDM) or as they were reported (TSMC's N5: reported figures, said as such); a package's size
// and land count from its maker's datasheet; a motherboard's size from its form-factor standard; a DIMM's from JEDEC.
// What is not: a real chip's netlist and floor plan are its maker's. Logic here is rows of one cell (NAND2) at a typical
// utilisation, its periphery (decoders, sense amplifiers) and its upper metal layers (a dozen of them, about 10 µm)
// drawn as blocks or not at all, and said so.

import type { Part, V3 } from './kits';
import { arrayGrid, boundsOfAll, frame, place, type Assembly, type Override, type Placed } from './assembly';
import * as THREE from 'three';

const nm = 1e-9, um = 1e-6, mm = 1e-3, PI = Math.PI;

// ---- processes ------------------------------------------------------------------------------------------------------------
export interface Process {
  id: string; label: string; finPitch: number; cpp: number; mmp: number; finH: number; finW: number; Lg: number;
  /** a high-density 6T SRAM bit cell's area, m² */ sram: number; /** a logic cell's height, m */ cellH: number;
  /** transistors per mm², as its maker or the press reported it (millions) */ density: number; source: string;
}
export const PROCESSES: Record<string, Process> = {
  'intel-22nm': { id: 'intel-22nm', label: 'Intel 22 nm', finPitch: 60 * nm, cpp: 90 * nm, mmp: 80 * nm, finH: 34 * nm, finW: 8 * nm, Lg: 26 * nm, sram: 0.092 * um * um, cellH: 8 * 80 * nm, density: 15.3,
    source: 'Intel, IEDM 2012 (Auth et al.): fins 60 nm apart and 34 nm tall, gates 90 nm apart, metal 80 nm, SRAM bit 0.092 µm²; 15.3 M transistors/mm² (Intel, 2017); fin width and gate length as reported; its logic cell 8 metal tracks tall (an estimate)' },
  'intel-14nm': { id: 'intel-14nm', label: 'Intel 14 nm', finPitch: 42 * nm, cpp: 70 * nm, mmp: 52 * nm, finH: 42 * nm, finW: 8 * nm, Lg: 20 * nm, sram: 0.0588 * um * um, cellH: 399 * nm, density: 37.5,
    source: 'Intel, IEDM 2014 (Natarajan et al.): fins 42 nm apart and 42 nm tall, gates 70 nm apart, metal 52 nm, SRAM bit 0.0588 µm²; logic cells 399 nm tall and 37.5 M transistors/mm² (Intel, 2017); fin width and gate length as reported' },
  'tsmc-n5': { id: 'tsmc-n5', label: 'TSMC N5', finPitch: 28 * nm, cpp: 51 * nm, mmp: 28 * nm, finH: 50 * nm, finW: 6 * nm, Lg: 16 * nm, sram: 0.021 * um * um, cellH: 210 * nm, density: 171.3,
    source: 'reported, not TSMC\'s own table: SRAM bit 0.021 µm² (TSMC, IEDM 2019); gates 51 nm apart, metal 28 nm, cells about 210 nm tall and 171 M transistors/mm² (WikiChip\'s figures); fin pitch, height and width and gate length estimates' },
};

// ---- the transistor -------------------------------------------------------------------------------------------------------
const kept = new Map<string, Part | Assembly>();
const keep = <T extends Part | Assembly>(k: string, make: () => T): T => { const was = kept.get(k); if (was) return was as T; const v = make(); kept.set(k, v); return v; };
const bx = (name: string, s: V3, at: V3, mat: string, color: number, more: Partial<Part> = {}): Part => ({ name, shape: { box: s }, at, mat, color, ...more });
const put = (p: Part): Placed => place(p, p.at ?? [0, 0, 0], p.rot ?? [0, 0, 0]);
const COL = { si: 0x6d7390, oxide: 0x9ec6dc, gate: 0x8c8676, hk: 0xd8a640, spacer: 0xe6e4dc, nEpi: 0x4f9d68, pEpi: 0xc4644e, w: 0x7c7f8a, cu: 0xc87533 };
/** A FinFET: its fins of silicon standing up through the trench oxide off the substrate, the gate wrapped over them (a
 *  metal gate on a high-k liner of hafnium oxide, about 1.5 nm), a spacer each side, the raised source and drain grown on
 *  the fins either side (silicon doped with phosphorus for an n-type, silicon-germanium for a p-type), a tungsten contact
 *  over each, and one on the gate. Its fins run along x, one gate pitch long; the trench oxide's top at y = 0. */
export function transistor(procId: string, type: 'n' | 'p', fins = 2): Part {
  const pr = PROCESSES[procId]; if (!pr) throw new Error(`no process "${procId}" (there are ${Object.keys(PROCESSES).join(', ')})`);
  return keep(`fet ${procId} ${type} ${fins}`, () => {
    const X = pr.cpp, fp = pr.finPitch, below = 60 * nm, sub = 40 * nm, Wz = fins * fp, hk = 1.5 * nm, sp = 7 * nm, gw = (fins - 1) * fp + pr.finW + 40 * nm, gateH = pr.finH + 50 * nm;
    const sd = Math.max(2 * nm, (X - pr.Lg - 2 * hk - 2 * sp) / 2 - 1 * nm), epiH = pr.finH + 10 * nm, parts: Part[] = [
      bx('substrate', [X, sub, Wz], [0, -below - sub / 2, 0], 'silicon', COL.si, { says: 'the silicon wafer under it' }),
      bx('trench oxide', [X, below, Wz], [0, -below / 2, 0], 'sio2', COL.oxide, { finish: 'gloss', says: 'shallow-trench isolation: silicon dioxide between the fins\' feet' }),
    ];
    for (let k = 0; k < fins; k++) parts.push(bx('fin', [X, below + pr.finH, pr.finW], [0, (pr.finH - below) / 2, (k - (fins - 1) / 2) * fp], 'silicon', COL.si, { says: `${(pr.finW / nm).toFixed(0)} nm wide, ${(pr.finH / nm).toFixed(0)} nm over the oxide (its channel: where the gate wraps it)` }));
    parts.push(bx('high-k liner (HfO₂)', [pr.Lg + 2 * hk, pr.finH + hk + 4 * nm, gw + 2 * hk], [0, (pr.finH + hk + 4 * nm) / 2, 0], 'hfo2', COL.hk, { says: 'hafnium oxide, about 1.5 nm: the gate\'s insulator' }));
    parts.push(bx('gate (metal)', [pr.Lg, gateH, gw], [0, gateH / 2 + 0.5 * nm, 0], 'tungsten', COL.gate, { finish: 'satin', says: `${(pr.Lg / nm).toFixed(0)} nm long (as reported): work-function metals (titanium nitride, titanium aluminide) under a tungsten fill` }));
    for (const s of [-1, 1]) {
      parts.push(bx('spacer', [sp, gateH, gw], [s * (pr.Lg / 2 + hk + sp / 2), gateH / 2, 0], 'sio2', COL.spacer, { says: 'silicon nitride, about 7 nm (typical)' }));
      const x = s * (X / 2 - sd / 2);
      for (let k = 0; k < fins; k++) parts.push(bx(type === 'n' ? 'source/drain (Si:P)' : 'source/drain (SiGe)', [sd, epiH, Math.min(fp * 0.85, pr.finW * 4)], [x, epiH / 2 - 5 * nm, (k - (fins - 1) / 2) * fp], 'silicon', type === 'n' ? COL.nEpi : COL.pEpi, { says: type === 'n' ? 'silicon grown on the fin, doped with phosphorus' : 'silicon-germanium grown on the fin, squeezing its channel (faster holes)' }));
      parts.push(bx('contact', [sd * 0.6, 40 * nm, gw], [x, epiH + 15 * nm, 0], 'tungsten', COL.w, { says: 'a tungsten trench contact down to the source or drain' }));
    }
    parts.push(bx('gate contact', [pr.Lg * 0.8, 30 * nm, 16 * nm], [0, gateH + 15 * nm, gw / 2 - 12 * nm], 'tungsten', COL.w));
    return { name: `${type}FET, ${fins} fin${fins > 1 ? 's' : ''} (${pr.label})`, at: [0, 0, 0], parts, says: `a FinFET at ${pr.label}'s pitches: ${pr.source}`, ports: [frame('gate', [0, gateH, 0], [0, 1, 0], [1, 0, 0])] };
  });
}

// ---- cells ------------------------------------------------------------------------------------------------------------------
const wire = (name: string, s: V3, at: V3): Part => bx(name, s, at, 'copper', COL.cu, { finish: 'satin' });
// (in a cell, each transistor's own slab of substrate and trench oxide is left out, and the wafer under the whole cell is
// laid as one: the same transistor is stored, and a wafer is one piece of silicon)
const ONE_WAFER: Override = { hide: true, path: '^(substrate|trench oxide)$' };
const wafer = (X: number, Z: number): Placed[] => [put(bx('trench oxide', [X, 60 * nm, Z], [0, -30 * nm, 0], 'sio2', COL.oxide, { finish: 'gloss' })), put(bx('substrate', [X, 40 * nm, Z], [0, -80 * nm, 0], 'silicon', COL.si))];
/** A 6T SRAM bit: two cross-coupled inverters (a pull-up p-type and a pull-down n-type each) holding the bit, two n-type
 *  pass gates letting it onto its bit lines when its word line is high; one fin each (a high-density cell). Two gate
 *  pitches wide; its area the process's published bit cell. Its bit lines (M1) and word line (M2) over it. */
export function sramCell(procId: string, o: { n?: Part; p?: Part } = {}): Assembly {
  const pr = PROCESSES[procId]!, n = o.n ?? transistor(procId, 'n', 1), p = o.p ?? transistor(procId, 'p', 1);
  return keep(`sram ${procId} ${n.name} ${p.name}`, () => {
    const X = 2 * pr.cpp, Z = pr.sram / X, items: Placed[] = [];
    // (one inverter and its pass gate a column, the other column turned half round: the cell is symmetric about its middle)
    for (const [col, turn] of [[-1, 0], [1, PI]] as const) for (const [row, t] of [[-1, n], [0, n], [1, p]] as const) items.push(place(t, [col * pr.cpp / 2, 0, col * row * Z / 3], [0, turn, 0], 1, ONE_WAFER));
    items.push(...wafer(X, Z));
    const y1 = 150 * nm, w1 = pr.mmp / 2;
    items.push(put(wire('bit line', [w1, 20 * nm, Z], [-X / 4, y1, 0])), put(wire('bit line (inverse)', [w1, 20 * nm, Z], [X / 4, y1, 0])), put(wire('word line (M2)', [X, 20 * nm, w1], [0, y1 + 60 * nm, 0])));
    return { name: `SRAM bit, 6T (${pr.label})`, items, ports: [frame('cell', [0, 0, 0])] };
  });
}
/** A NAND2 logic gate: two p-type in parallel (the top half, its n-well) and two n-type in series (the bottom half), two
 *  fins each, three gate pitches wide and its process's cell height tall, its power rails (VDD over, VSS under) and its
 *  output on M1. */
export function nandCell(procId: string, o: { n?: Part; p?: Part } = {}): Assembly {
  const pr = PROCESSES[procId]!, n = o.n ?? transistor(procId, 'n', 2), p = o.p ?? transistor(procId, 'p', 2);
  return keep(`nand ${procId} ${n.name} ${p.name}`, () => {
    const W = 3 * pr.cpp, H = pr.cellH, items: Placed[] = [];
    for (const x of [-pr.cpp / 2, pr.cpp / 2]) { items.push(place(p, [x, 0, H / 4], [0, 0, 0], 1, ONE_WAFER)); items.push(place(n, [x, 0, -H / 4], [0, 0, 0], 1, ONE_WAFER)); }
    items.push(...wafer(W, H));
    const y1 = 150 * nm, w1 = pr.mmp;
    items.push(put(wire('VDD rail', [W, 20 * nm, w1], [0, y1, H / 2 - w1 / 2])), put(wire('VSS rail', [W, 20 * nm, w1], [0, y1, -H / 2 + w1 / 2])), put(wire('output', [pr.mmp / 2, 20 * nm, H * 0.6], [W / 2 - pr.cpp / 2, y1, 0])));
    return { name: `NAND2 gate (${pr.label})`, items };
  });
}

// ---- arrays, logic, cores, the die ------------------------------------------------------------------------------------------
const sizeOf = (a: Part | Assembly) => boundsOfAll(a).getSize(new THREE.Vector3());
/** An SRAM sub-array: 128 by 128 bits (2 KB), its periphery (row decoders, sense amplifiers: logic, drawn as blocks)
 *  along two sides, a fifth as wide as the bits each (so the bits are about 70 % of it: a typical array efficiency, an
 *  estimate). */
export function subArray(procId: string, cell?: Assembly): Assembly {
  const c = cell ?? sramCell(procId), pr = PROCESSES[procId]!;
  return keep(`sub ${procId} ${c.name}`, () => {
    const X = 2 * pr.cpp, Z = pr.sram / X, grid = arrayGrid(c, 128, 128, [X, 0, Z], 1, '128 × 128 bits'), w = 128 * X, d = 128 * Z, per = 0.2;
    return { name: 'SRAM sub-array, 2 KB', items: [place(grid), put(bx('row decoders (logic, drawn as a block)', [w * per, 120 * nm, d], [-w / 2 - w * per / 2, 60 * nm, 0], 'silicon', 0x3a4f6a)), put(bx('sense amplifiers (logic, drawn as a block)', [w, 120 * nm, d * per], [0, 60 * nm, d / 2 + d * per / 2], 'silicon', 0x3a4f6a))] };
  });
}
/** Cache of so many KB: its sub-arrays in a grid near square. */
export function cache(procId: string, KB: number, sub?: Assembly): { cache: Assembly; bits: number } {
  const s = sub ?? subArray(procId), n = Math.max(1, Math.round(KB / 2)), z = sizeOf(s), nx = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * z.z / z.x)))), nz = Math.ceil(n / nx);
  return { cache: keep(`cache ${procId} ${KB} ${s.name}`, () => arrayGrid(s, nx, nz, [z.x, 0, z.z], 1, `${KB >= 1024 ? `${KB / 1024} MB` : `${KB} KB`} cache`)), bits: nx * nz * 2048 * 8 };
}
/** Logic of so many mm²: rows of NAND2 cells, a thousand to a row, a thousand rows to a block, the blocks spaced so the
 *  cells cover 70 % of it (a typical placement density). Gives the cells it places. */
export function logic(procId: string, mm2: number, cell?: Assembly): { logic: Assembly; cells: number } {
  const pr = PROCESSES[procId]!, c = cell ?? nandCell(procId), W = 3 * pr.cpp, H = pr.cellH;
  const block = keep(`block ${procId} ${c.name}`, () => { const row = arrayGrid(c, 1000, 1, [W, 0, 0], 1, 'a row of 1,000 cells'); return arrayGrid(row, 1, 1000, [0, 0, H], 1, 'a block of 1,000 rows'); });
  const bw = 1000 * W / Math.sqrt(0.7), bd = 1000 * H / Math.sqrt(0.7), n = Math.max(1, Math.round((mm2 * mm * mm) / (bw * bd))), nx = Math.min(n, Math.ceil(Math.sqrt(n * bd / bw))), nz = Math.ceil(n / nx);
  return { logic: keep(`logic ${procId} ${mm2} ${c.name}`, () => arrayGrid(block, nx, nz, [bw, 0, bd], 1, `logic, ${mm2} mm²`)), cells: nx * nz * 1e6 };
}
export interface DieSpec { proc: string; cores: number; /** each core's logic, mm² (an estimate where its maker does not say) */ coreMm2: number; l2KB: number; l3MB: number; /** graphics, memory controller, I/O: logic, mm² */ uncoreMm2: number; name?: string }
export interface Die { die: Assembly; transistors: number; bits: number; cells: number; w: number; d: number; says: string }
const diesMade = new Map<string, Die>();
/** A die: its cores in two rows (each its logic and its L2), its L3 between them, its uncore along one end, on its
 *  silicon (thinned to about 0.25 mm, typical); its transistors counted from what it places (six to a bit, four to a
 *  gate). Its devices face +y; a package flips it. */
export function die(s: DieSpec, cells: { sram?: Assembly; nand?: Assembly } = {}): Die {
  const key = JSON.stringify([s, cells.sram?.name, cells.nand?.name]), was = diesMade.get(key); if (was) return was;
  const pr = PROCESSES[s.proc]; if (!pr) throw new Error(`no process "${s.proc}"`);
  const sub = subArray(s.proc, cells.sram), core = logic(s.proc, s.coreMm2, cells.nand), l2 = cache(s.proc, s.l2KB, sub), l3 = cache(s.proc, s.l3MB * 1024, sub), un = logic(s.proc, s.uncoreMm2, cells.nand);
  const cz = sizeOf(core.logic), lz = sizeOf(l2.cache), gap = 0.2 * mm;
  const coreW = Math.max(cz.x, lz.x), coreD = cz.z + lz.z + gap;
  const coreA: Assembly = { name: 'core', items: [place(core.logic, [0, 0, -coreD / 2 + cz.z / 2]), place(l2.cache, [0, 0, coreD / 2 - lz.z / 2])] };
  const perRow = Math.ceil(s.cores / 2), rowW = perRow * (coreW + gap), l3z = sizeOf(l3.cache), uz = sizeOf(un.logic);
  const W = Math.max(rowW, l3z.x, uz.x) + 2 * gap, D = 2 * coreD + l3z.z + uz.z + 5 * gap, items: Placed[] = [];
  for (let i = 0; i < s.cores; i++) { const r = i < perRow ? 0 : 1, k = r ? i - perRow : i; items.push(place(coreA, [-rowW / 2 + (k + 0.5) * (coreW + gap), 0, -D / 2 + gap + coreD / 2 + r * (coreD + l3z.z + 2 * gap)], [0, r ? PI : 0, 0])); }
  items.push(place(l3.cache, [0, 0, -D / 2 + 2 * gap + coreD + l3z.z / 2]), place(un.logic, [0, 0, D / 2 - gap - uz.z / 2]));
  items.push(put(bx('silicon (thinned)', [W, 0.25 * mm, D], [0, -0.25 * mm / 2 - 100 * nm, 0], 'silicon', 0x4a4e60, { finish: 'gloss' })));
  const bits = s.cores * l2.bits + l3.bits, ncells = s.cores * core.cells + un.cells, transistors = bits * 6 + ncells * 4;
  const d: Assembly = { name: s.name ?? `die, ${s.cores} cores (${pr.label})`, items, ports: [frame('face', [0, 0, 0], [0, 1, 0], [1, 0, 0])] };
  const out: Die = { die: d, transistors, bits, cells: ncells, w: W, d: D, says: `${(W / mm).toFixed(1)} × ${(D / mm).toFixed(1)} mm (${(W * D / mm / mm).toFixed(0)} mm²), ${(transistors / 1e9).toFixed(2)} billion transistors placed (${(transistors / (W * D / mm / mm) / 1e6).toFixed(1)} M/mm²; ${pr.label} is reported at ${pr.density} M/mm²)` };
  diesMade.set(key, out); return out;
}

// ---- the package, the board, the PC -----------------------------------------------------------------------------------------
export const SOCKETS: Record<string, { w: number; d: number; lands: number; ihs: [number, number]; source: string }> = {
  LGA1151: { w: 37.5 * mm, d: 37.5 * mm, lands: 1151, ihs: [28 * mm, 28 * mm], source: 'Intel desktop processor datasheets (LGA1151: a 37.5 × 37.5 mm package, 1,151 lands); its heat spreader\'s size typical' },
  LGA1700: { w: 37.5 * mm, d: 45 * mm, lands: 1700, ihs: [29 * mm, 36 * mm], source: 'Intel 12th–14th gen datasheets (LGA1700: 37.5 × 45 mm, 1,700 lands); its heat spreader\'s size typical' },
};
/** A flip-chip package: the die turned face down onto its substrate on solder bumps (about 150 µm apart, typical) in
 *  underfill, a heat spreader (nickel-plated copper) over it on a layer of solder, sealed round its foot, its lands (gold
 *  pads) under the substrate as its socket's datasheet counts them. */
export function packageOf(dieA: Assembly, socket: string): Assembly {
  const so = SOCKETS[socket]; if (!so) throw new Error(`no socket "${socket}" (there are ${Object.keys(SOCKETS).join(', ')})`);
  const ds = sizeOf(dieA), d = { die: dieA, w: ds.x, d: ds.z };
  return keep(`pkg ${socket} ${dieA.name} ${d.w}`, () => {
    const t = 1.0 * mm, bump = 0.08 * mm, pitch = 0.15 * mm, nx = Math.floor(d.w / pitch), nz = Math.floor(d.d / pitch), items: Placed[] = [];
    items.push(put(bx('substrate', [so.w, t, so.d], [0, t / 2, 0], 'fr4', 0x3b5a3a, { says: 'an organic build-up substrate, its layers of copper fanning the die\'s bumps out to the lands (about 1 mm: typical)' })));
    const ball: Part = { name: 'solder bump', shape: { sphere: bump / 2 }, at: [0, 0, 0], mat: 'solder', color: 0xb8bcc2, finish: 'satin' };
    items.push(place(arrayGrid(ball, nx, nz, [pitch, 0, pitch], 1, `${(nx * nz).toLocaleString('en-US')} solder bumps`), [0, t + bump / 2, 0]));
    items.push(put(bx('underfill', [d.w + 0.6 * mm, bump, d.d + 0.6 * mm], [0, t + bump / 2, 0], 'pu', 0x2a2620, { says: 'epoxy wicked under the die round its bumps' })));
    // the die, face down: its devices on its bumps
    items.push(place(d.die, [0, t + bump + 100 * nm, 0], [PI, 0, 0]));
    const top = t + bump + 0.25 * mm + 100 * nm, tim = 0.1 * mm, ihsT = 2.0 * mm, [iw, id] = so.ihs, lid = top + tim;
    items.push(put(bx('solder (heat path)', [d.w, tim, d.d], [0, top + tim / 2, 0], 'solder', 0xa8acb0, { says: 'indium solder from the die to the heat spreader (or a polymer paste, by the part: typical)' })));
    items.push(put(bx('heat spreader', [iw, ihsT, id], [0, lid + ihsT / 2, 0], 'copper', 0xc9ccd0, { finish: 'brushed', says: 'nickel-plated copper (typical)' })));
    for (const [w, d2, x, z] of [[iw, 1.2 * mm, 0, -id / 2 + 0.6 * mm], [iw, 1.2 * mm, 0, id / 2 - 0.6 * mm], [1.2 * mm, id, -iw / 2 + 0.6 * mm, 0], [1.2 * mm, id, iw / 2 - 0.6 * mm, 0]] as [number, number, number, number][]) items.push(put(bx('heat spreader skirt', [w, lid - t, d2], [x, t + (lid - t) / 2, z], 'copper', 0xc9ccd0, { finish: 'brushed' })));
    const pad: Part = { name: 'land (gold)', shape: { box: [0.6 * mm, 0.03 * mm, 0.6 * mm] }, at: [0, 0, 0], mat: 'gold', color: 0xd4af37, finish: 'gloss' };
    const n = Math.ceil(Math.sqrt(so.lands * so.w / so.d)), m = Math.ceil(so.lands / n);
    items.push(place(arrayGrid(pad, n, m, [so.w * 0.9 / n, 0, so.d * 0.9 / m], 1, `${(n * m).toLocaleString('en-US')} lands (${so.lands} in its datasheet)`), [0, -0.015 * mm, 0]));
    return { name: `processor, ${socket} package`, items, ports: [frame('base', [0, 0, 0], [0, -1, 0], [1, 0, 0])] };
  });
}
export const BOARDS: Record<string, { w: number; d: number; dimms: number; source: string }> = {
  ATX: { w: 305 * mm, d: 244 * mm, dimms: 4, source: 'the ATX specification (305 × 244 mm)' },
  'micro-ATX': { w: 244 * mm, d: 244 * mm, dimms: 4, source: 'the microATX specification (244 × 244 mm)' },
  'mini-ITX': { w: 170 * mm, d: 170 * mm, dimms: 2, source: 'the Mini-ITX specification (170 × 170 mm)' },
};
/** A DDR4 DIMM (JEDEC: 133.35 × 31.25 mm, 288 pins): its board, eight DRAM packages a side, its gold fingers. The DRAM dies
 *  inside are not drawn: a DRAM cell is one transistor and a capacitor, another process. */
export function dimm(): Assembly {
  return keep('dimm', () => {
    const L = 133.35 * mm, H = 31.25 * mm, t = 1.27 * mm, chip: Part = bx('DRAM package (8 Gb, typical)', [9 * mm, 11 * mm, 1.2 * mm], [0, 0, 0], 'pu', 0x16171a, { finish: 'satin' });
    const items: Placed[] = [put(bx('module board', [L, H, t], [0, H / 2, 0], 'fr4', 0x1f5a2e)), put(bx('gold fingers (288 pins)', [L * 0.95, 3.2 * mm, t + 0.04 * mm], [0, 1.6 * mm, 0], 'gold', 0xd4af37, { finish: 'gloss' }))];
    for (const s of [-1, 1]) for (let i = 0; i < 8; i++) items.push(place(chip, [-L / 2 + (i + 0.5) * (L / 8) + (i >= 4 ? 4 * mm : -4 * mm) * 0.3, H * 0.55, s * (t / 2 + 0.6 * mm)]));
    return { name: 'DDR4 memory module (DIMM)', items };
  });
}
/** A motherboard of a form factor with the processor package in its socket: the socket (its frame, load plate and lever),
 *  memory slots with modules in them, the power stages round the socket (chokes and their MOSFETs, under a heat sink),
 *  the chipset, a PCIe x16 slot, an M.2 2280 drive, the power connectors and the clock battery (a CR2032). */
export function motherboard(form: string, pkg: Assembly): Assembly {
  const f = BOARDS[form]; if (!f) throw new Error(`no board form "${form}" (there are ${Object.keys(BOARDS).join(', ')})`);
  return keep(`board ${form} ${pkg.name}`, () => {
    const t = 1.6 * mm, items: Placed[] = [], sx = -f.w / 2 + 0.36 * f.w, sz = -f.d / 2 + 0.3 * f.d, top = t;
    items.push(put(bx('circuit board', [f.w, t, f.d], [0, t / 2, 0], 'fr4', 0x1c2a22, { says: `${f.source}; FR-4, 1.6 mm, its copper in six to eight layers (typical)` })));
    items.push(put(bx('socket frame', [52 * mm, 4 * mm, 52 * mm], [sx, top + 2 * mm, sz], 'pc', 0x1a1a1a)));
    items.push(place(pkg, [sx, top + 4 * mm, sz]));
    items.push(put(bx('load plate', [52 * mm, 0.8 * mm, 6 * mm], [sx, top + 8 * mm, sz - 23 * mm], 'steel-low', 0x9a9ea4, { says: 'its window frame clamps the package down: drawn as its front edge, so the package shows' })));
    items.push(put({ name: 'socket lever', shape: { cyl: [0.9 * mm, 60 * mm] }, at: [sx + 29 * mm, top + 6 * mm, sz], rot: [PI / 2, 0, 0], mat: 'steel-low', color: 0x9a9ea4 }));
    const slot: Part = bx('memory slot', [146 * mm, 7 * mm, 6.5 * mm], [0, 0, 0], 'nylon', 0x23272c), mem = dimm();
    for (let i = 0; i < f.dimms; i++) { const x = sx + 75 * mm + i * 9.5 * mm; items.push(place(slot, [x, top + 3.5 * mm, sz], [0, PI / 2, 0])); items.push(place(mem, [x, top + 4 * mm, sz], [0, PI / 2, 0])); }
    const choke: Part = bx('choke (power stage)', [10 * mm, 6 * mm, 10 * mm], [0, 0, 0], 'ceramic', 0x2c2e33, { says: 'a ferrite inductor of one power phase (typical)' }), fet: Part = bx('power MOSFET', [5 * mm, 1 * mm, 6 * mm], [0, 0, 0], 'pu', 0x111111);
    for (let i = 0; i < 8; i++) { items.push(place(choke, [sx - 34 * mm, top + 3 * mm, sz - 35 * mm + i * 11 * mm])); items.push(place(fet, [sx - 47 * mm, top + 0.5 * mm, sz - 35 * mm + i * 11 * mm])); }
    items.push(put(bx('power-stage heat sink', [14 * mm, 22 * mm, 90 * mm], [sx - 47 * mm, top + 12 * mm, sz + 4 * mm], 'al-6061', 0x3a3e46, { finish: 'satin' })));
    items.push(put(bx('chipset (under its heat sink)', [40 * mm, 8 * mm, 40 * mm], [f.w / 2 - 70 * mm, top + 4 * mm, f.d / 2 - 70 * mm], 'al-6061', 0x3a3e46)));
    items.push(put(bx('PCIe x16 slot', [89 * mm, 11 * mm, 7.5 * mm], [-f.w / 2 + 70 * mm, top + 5.5 * mm, Math.min(f.d / 2 - 40 * mm, sz + 70 * mm)], 'nylon', 0x23272c, { says: '89 mm long (PCI Express: 164 pins)' })));
    const ssd: Assembly = { name: 'M.2 2280 drive', items: [put(bx('drive board', [80 * mm, 0.8 * mm, 22 * mm], [0, 0.4 * mm, 0], 'fr4', 0x111a14)), put(bx('controller', [12 * mm, 1.2 * mm, 12 * mm], [-25 * mm, 1.4 * mm, 0], 'pu', 0x1a1a1a)), put(bx('NAND flash package', [14 * mm, 1.2 * mm, 18 * mm], [0, 1.4 * mm, 0], 'pu', 0x111111)), put(bx('NAND flash package', [14 * mm, 1.2 * mm, 18 * mm], [20 * mm, 1.4 * mm, 0], 'pu', 0x111111))] };
    items.push(place(ssd, [-f.w / 2 + 70 * mm, top + 1 * mm, Math.min(f.d / 2 - 15 * mm, sz + 100 * mm)]));
    items.push(put(bx('24-pin power connector', [52 * mm, 15 * mm, 10 * mm], [f.w / 2 - 10 * mm, top + 7.5 * mm, 0], 'nylon', 0xeeeeea, { rot: [0, PI / 2, 0] })));
    items.push(put(bx('8-pin processor power', [21 * mm, 15 * mm, 10 * mm], [sx - 30 * mm, top + 7.5 * mm, -f.d / 2 + 10 * mm], 'nylon', 0xeeeeea)));
    items.push(put({ name: 'clock battery (CR2032)', shape: { cyl: [10 * mm, 3.2 * mm] }, at: [-f.w / 2 + 120 * mm, top + 2 * mm, f.d / 2 - 30 * mm], mat: 'steel-low', color: 0xc8ccd2, finish: 'brushed', says: '20 mm across, 3.2 mm thick (IEC 60086: CR2032)' }));
    return { name: `${form} motherboard`, items, ports: [frame('socket', [sx, top + 4 * mm, sz], [0, 1, 0], [1, 0, 0])] };
  });
}
/** A desktop PC round a motherboard: a mid-tower case (steel, its glass side not drawn so its inside shows), an ATX power
 *  supply at its foot (150 × 86 × 140 mm, the ATX standard's), the board stood on its standoffs, a graphics card in its x16 slot, a tower cooler over the
 *  processor (a copper base, four heat pipes up into a stack of 50 aluminium fins, a 120 mm fan). */
export function desktop(board: Assembly, form = 'ATX'): Assembly {
  const f = BOARDS[form] ?? BOARDS.ATX!;
  return keep(`pc ${board.name}`, () => {
    const W = 0.21, H = 0.47, D = 0.45, t = 0.8 * mm, items: Placed[] = [], steel = (name: string, s: V3, at: V3) => put(bx(name, s, at, 'steel-low', 0x30343a, { finish: 'satin' }));
    items.push(steel('case floor', [D, t, W], [0, t / 2, 0]), steel('case top', [D, t, W], [0, H - t / 2, 0]), steel('case front', [t, H, W], [D / 2 - t / 2, H / 2, 0]), steel('case back', [t, H, W], [-D / 2 + t / 2, H / 2, 0]), steel('case side (the board\'s)', [D, H, t], [0, H / 2, -W / 2 + t / 2]));
    items.push(put(bx('power supply (ATX)', [0.14, 0.086, 0.15], [-D / 2 + 0.08, 0.05, 0], 'steel-low', 0x26282c, { kg: 1.8, says: '150 × 86 × 140 mm (ATX power supply form); 1.8 kg (typical: its insides are not drawn)' })));
    // the board stood up against its side, on 6 mm standoffs, its I/O at the back
    const by = 0.12 + f.d / 2, bx0 = -D / 2 + 0.02 + f.w / 2;
    items.push(place(board, [bx0, by, -W / 2 + t + 6 * mm], [PI / 2, 0, 0]));
    // its standoffs: brass, 6 mm, at the ATX holes' corners (four drawn of its nine)
    const standoff: Part = { name: 'standoff (M3, brass)', shape: { cyl: [2.5 * mm, 6 * mm] }, at: [0, 0, 0], mat: 'brass', color: 0xc9a227, facets: 6 };
    for (const [u, v] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) items.push(place(standoff, [bx0 + u * (f.w / 2 - 10 * mm), by + v * (f.d / 2 - 10 * mm), -W / 2 + t + 3 * mm], [PI / 2, 0, 0]));
    // a graphics card in its x16 slot (typical of a two-slot card: 267 × 111 mm board, a shroud with two fans, its bracket)
    const gpu: Assembly = { name: 'graphics card', items: [put(bx('card board', [0.267, 0.111, 1.6 * mm], [0, 0.0555, 0], 'fr4', 0x1a2a20)), put(bx('cooler shroud', [0.267, 0.111, 0.032], [0, 0.0555, 0.018], 'abs', 0x2a2d33, { finish: 'satin' })), put({ name: 'fan', shape: { cyl: [0.042, 0.004] }, at: [-0.06, 0.0555, 0.035], rot: [PI / 2, 0, 0], mat: 'pp', color: 0x15161a }), put({ name: 'fan', shape: { cyl: [0.042, 0.004] }, at: [0.06, 0.0555, 0.035], rot: [PI / 2, 0, 0], mat: 'pp', color: 0x15161a }), put(bx('slot bracket', [1 * mm, 0.12, 0.04], [-0.134, 0.06, 0.018], 'steel-low', 0xb8bcc2))], ports: [] };
    items.push(place(gpu, [bx0 - f.w / 2 + 0.07 + 0.134 - 0.0445, by - Math.min(f.d / 2 - 40 * mm, -f.d / 2 + 0.3 * f.d + 70 * mm), -W / 2 + t + 6 * mm + 1.6 * mm + 11 * mm], [PI / 2, 0, 0]));
    // its cooler, over the socket
    // (a tower: its base on the processor, four heat pipes out of it and turned up and down into a stack of fins standing
    // out from the board, each fin level in the case, the fan on the stack's front blowing back through it)
    const sock = board.ports?.[0]?.at ?? [0, 0, 0], fin: Part = bx('cooling fin', [0.125, 0.12, 0.0004], [0, 0, 0], 'al-6061', 0xc8ccd2, { finish: 'brushed' }), fins: Placed[] = [];
    for (let i = 0; i < 50; i++) fins.push(place(fin, [0, 0.1, -0.06 + i * 0.00245]));
    const pipes: Part[] = [[-0.03, 0.07, 1], [-0.01, 0.12, -1], [0.01, 0.12, 1], [0.03, 0.07, -1]].map(([x, y, s]) => ({ name: 'heat pipe', shape: { tube: { r: 3 * mm, pts: [[x!, 0.006, 0], [x!, y!, 0], [x!, y!, s! * 0.062]] as V3[], wall: 0.3 * mm, bend: 0.015 } }, at: [0, 0, 0], mat: 'copper', color: 0xc87533, finish: 'satin' }));
    // (its fan: the library knows a 120 × 25 mm fan's size but has no drawing of it yet, so it is drawn here simply: its
    // frame, its hub and seven blades)
    const blade: Part = bx('fan blade', [0.05, 0.002, 0.018], [0, 0, 0], 'pp', 0x202226), fanItems: Placed[] = [put(bx('fan frame', [0.12, 0.025, 0.12], [0, 0, 0], 'pp', 0x15161a, { shell: 0.002, says: '120 × 25 mm (typical of a tower cooler\'s fan)' })), put({ name: 'fan hub', shape: { cyl: [0.02, 0.026] }, at: [0, 0, 0], mat: 'pp', color: 0x202226 })];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * 2 * PI; fanItems.push(place(blade, [0.037 * Math.cos(a), 0, 0.037 * Math.sin(a)], [0.35, -a, 0])); }
    const fan: Assembly = { name: '120 mm fan', items: fanItems };
    const cooler: Assembly = { name: 'tower cooler', items: [put(bx('cooler base (copper)', [0.04, 0.006, 0.04], [0, 0.003, 0], 'copper', 0xc87533, { finish: 'brushed' })), ...pipes.map((p) => place(p)), ...fins, place(fan, [0.0755, 0.1, 0], [0, 0, PI / 2])] };
    const s0 = new THREE.Vector3(...sock).applyEuler(new THREE.Euler(PI / 2, 0, 0)).add(new THREE.Vector3(bx0, by, -W / 2 + t + 6 * mm));
    items.push(place(cooler, [s0.x, s0.y, s0.z + 0.0045], [PI / 2, 0, 0]));
    return { name: 'desktop PC', items };
  });
}
