// Electrical power and drives (package P6 of plan/AUDIT.md): the pieces a circuit is made of, each with its terminals
// as lines of kind power or signal carrying their size ({V, A, pins}) and limits. A motor by its datasheet (its row in
// src/data/motors.ts, linked by its terminals' `std`, so a circuit drives it by its own R, K_t and K_e); a DC supply
// with its current limit; a brushed DC motor driver with its voltage range, its current limit and its PWM input. The
// circuit over them is nexus/circuit.ts.

import { made, stack, type Line } from '../room';
import { familyNode, type PartFamily } from './maker';
import type { BlockDef } from '../blocks';
import { MOTORS, type MotorData } from '../../data/motors';

const mm = (v: number) => v / 1000;
type Port = NonNullable<Pick<Line, 'kind' | 'size' | 'limits' | 'std'>>;

/** The motor's terminals as its row gives them: its nominal voltage, the current it carries continuously, two pins. */
export const motorTerminal = (m: MotorData): Port => ({
  kind: 'power', size: { V: m.V, A: m.maxContinuousCurrent, pins: 2 }, std: `data/motors.ts ${m.id}`,
  limits: { voltage: { max: m.V, unit: 'V', src: `its nominal voltage, ${m.source}` }, current: { max: m.maxContinuousCurrent, unit: 'A', src: `its nominal (most continuous) current, ${m.source}` } },
});
/** The motor a terminal line is linked to: its row in data/motors.ts, read from the line's `std`. */
export const motorOfLine = (l: Pick<Line, 'std'>): MotorData | undefined => (l.std?.startsWith('data/motors.ts ') ? MOTORS[l.std.slice(15)] : undefined);

/** The motor a block holds, by its terminals' link: the one whose pieces share the name of `near` (a piece, as a line's
 *  piece is named: "<label> shaft"), else the only one; undefined where none is linked, or several and none is near. */
export function motorOfBlock(b: { pieces: readonly { name: string; lines: readonly Line[] }[] }, near?: string): MotorData | undefined {
  const stem = (n: string) => n.replace(/\s+\S+$/, ''), found = b.pieces.flatMap((p) => p.lines.map((l) => [p.name, motorOfLine(l)] as const)).filter((x): x is readonly [string, MotorData] => !!x[1]);
  const by = near ? found.find(([n]) => stem(n) === stem(near)) : undefined;
  return by ? by[1] : new Set(found.map(([, m]) => m)).size === 1 ? found[0]![1] : undefined;
}
/** A datasheet motor's size, as its node calls it: its row's id in src/data/motors.ts less "motor." (never its label,
 *  whose words, "winding" among them, interfaces.ts would read a line's kind from). */
export const motorSize = (m: MotorData): string => m.id.replace(/^motor\./, '');
const MOTOR_ROWS: Record<string, MotorData> = Object.fromEntries(Object.values(MOTORS).map((m) => [motorSize(m), m]));
/** How far its shaft stands out of the can, in shaft diameters (typical: the sheets in data/motors.ts give no length). */
const SHAFT_OUT = 3;
const MOTOR: PartFamily<MotorData> = {
  id: 'piece.motor', name: 'DC motor (by its datasheet)', gloss: 'A brushed DC motor as its maker publishes it: its can, its shaft and its two terminals, linked to its datasheet row', domains: ['electrical', 'mechanical'], aisle: 'Electrical / Motors',
  says: 'A DC motor by its datasheet (src/data/motors.ts: each row a motor you can buy, its constants its maker\'s): its can (the row\'s diameter and length), its shaft (the row\'s diameter, standing out three diameters, typical) stacked on it, and its two terminals as one line, <size> motor can/terminals (its size its row\'s id less "motor."), of kind power, its size its nominal voltage and current, its std the row it is linked to, so a circuit (circuit.solve) drives it by its own R, K_t and K_e. Approximated: the can is its outline (no magnets, rotor or brushes inside), so its drawn mass is not the motor\'s',
  rows: MOTOR_ROWS, size: motorSize(Object.values(MOTORS)[0]!), source: 'src/data/motors.ts, each row\'s own source (maxon, sellers\' data); the shaft\'s length typical',
  envelope: 'its can is its outline, so its drawn mass is a solid can\'s, not the motor\'s',
  recipe: (m, size) => stack(`${size} motor`, 1, [
    { b: made(`${size} motor can`, 'steel-low', { cyl: [m.diameter / 2, m.length] }, { color: 0x9aa0a6, pattern: { name: 'terminals', points: [[0, 0]], port: motorTerminal(m) } }) },
    { b: made(`${size} motor shaft`, 'steel-alloy', { cyl: [m.shaft / 2, SHAFT_OUT * m.shaft] }) }]),
  expect: (m) => ({ bound: [m.diameter, m.length + SHAFT_OUT * m.shaft, m.diameter], tol: 0.01, says: 'its can by its row\'s diameter and length, and its shaft' }),
  tests: [{ inputs: {}, outputs: { pieces: 2 } }],
};

/** DC supplies by output, mm (typical of an enclosed 150 W switching supply, the class of Mean Well's LRS-150; not
 *  read from its sheet): its voltage, its rated current, which it is taken to limit at (a real one folds back at 105 to
 *  150 % of it, typical), its case L × W × H. */
interface Psu { V: number; A: number; L: number; W: number; H: number }
const PSUS: Record<string, Psu> = { '12 V 12.5 A': { V: 12, A: 12.5, L: 159, W: 97, H: 30 }, '24 V 6.5 A': { V: 24, A: 6.5, L: 159, W: 97, H: 30 }, '24 V 14.6 A': { V: 24, A: 14.6, L: 215, W: 115, H: 30 } };
const PSU_SRC = 'typical of an enclosed 150 to 350 W switching supply (the Mean Well LRS class), not read from its sheet';
/** The supply for a motor, by its terminals' voltage (and current, where its line gives one): the row of that voltage
 *  rated for at least that current, the least such; past every rating, the largest of that voltage, said; a voltage no
 *  row gives, or none on the line, the family's own size, said. */
export function psuFor(V?: number, A?: number): { size: string; says: string } {
  const at = Object.entries(PSUS).filter(([, r]) => V !== undefined && r.V === V).sort((a, b) => a[1].A - b[1].A);
  const fits = at.find(([, r]) => A === undefined || r.A >= A);
  if (fits) return { size: fits[0], says: `${fits[0]}: its voltage the motor's ${V} V${A !== undefined ? `, rated for its ${A} A` : ''}` };
  if (at.length) { const top = at[at.length - 1]!; return { size: top[0], says: `${top[0]}: its voltage the motor's ${V} V, but rated below its ${A} A (no row of that voltage is more)` }; }
  return { size: PSU.size, says: `${PSU.size}, the family's own size: ${V === undefined ? 'the motor\'s line gives no voltage' : `no row gives ${V} V`}` };
}
const PSU: PartFamily<Psu> = {
  id: 'piece.psu', name: 'DC power supply', gloss: 'An enclosed DC supply by its output: its case and its output terminals, a voltage source with its current limit', domains: ['electrical'], aisle: 'Electrical / Power supplies',
  says: 'A DC supply by its output (12 V 12.5 A, 24 V 6.5 A, 24 V 14.6 A; all typical): its case with its output terminals on top as one line, <size> supply case/out, of kind power, its size its voltage and current and its current limit the current it is rated for (in a circuit it holds its voltage up to that current, then holds the current). Approximated: the case is its outline; its mains input not drawn',
  rows: PSUS, size: '24 V 6.5 A', source: PSU_SRC,
  envelope: 'its case is its outline (no board inside)',
  recipe: (r, size) => made(`${size} supply case`, 'steel-low', { box: [mm(r.L), mm(r.H), mm(r.W)] }, { color: 0xc8ccd0, pattern: { name: 'out', points: [[mm(0.4 * r.L), 0]],
    port: { kind: 'power', size: { V: r.V, A: r.A, pins: 2 }, limits: { current: { max: r.A, unit: 'A', src: PSU_SRC } } } } }),
  expect: (r) => ({ bound: [mm(r.L), mm(r.H), mm(r.W)], tol: 0.01, says: 'its case' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};

/** Brushed DC motor drivers (an H-bridge on a board) by current, mm (typical of the single-channel boards sold for
 *  hobby and light industrial motors; not read from a sheet): the supply it takes (Vmin to Vmax), the current it
 *  limits its output to, its board L × W × t, and its PWM input's logic level. */
interface Driver { Vmin: number; Vmax: number; A: number; L: number; W: number; t: number; logic: number }
const DRIVERS: Record<string, Driver> = { '10 A': { Vmin: 5, Vmax: 30, A: 10, L: 75, W: 43, t: 1.6, logic: 5 }, '30 A': { Vmin: 6, Vmax: 30, A: 30, L: 84, W: 62, t: 1.6, logic: 5 } };
const DRIVER_SRC = 'typical of a single-channel brushed DC motor driver board, not read from a sheet';
const DRIVER: PartFamily<Driver> = {
  id: 'piece.driver', name: 'DC motor driver', gloss: 'A brushed DC motor driver board by its current: its supply in, its motor out and its PWM input', domains: ['electrical'], aisle: 'Electrical / Motor drivers',
  says: 'A brushed DC motor driver (an H-bridge chopping its supply at a duty) by its current (10 A, 30 A; typical): its board with its supply terminals (<size> driver PCB/in, power, its voltage range as limits), its motor terminals (<size> driver PCB/out, power, its current limit) and its PWM input (<size> driver PCB/pwm, signal, its logic level). In a circuit its output is its duty times its input, its input current its duty times its output\'s (an ideal switch), and its output current never above its limit (it chops down to hold it). Approximated: its board is a plain FR-4 plate; the bridge, its losses and its dead time not drawn',
  rows: DRIVERS, size: '10 A', source: DRIVER_SRC,
  envelope: 'its board is a plate (no parts on it)',
  recipe: (r, size) => made(`${size} driver PCB`, 'fr4', { box: [mm(r.L), mm(r.t), mm(r.W)] }, { color: 0x1f6f3f, patterns: [
    { name: 'in', points: [[mm(-0.35 * r.L), 0]], port: { kind: 'power', size: { V: r.Vmax, A: r.A, pins: 2 }, limits: { voltage: { min: r.Vmin, max: r.Vmax, unit: 'V', src: DRIVER_SRC } } } },
    { name: 'out', points: [[mm(0.35 * r.L), 0]], port: { kind: 'power', size: { V: r.Vmax, A: r.A, pins: 2 }, limits: { current: { max: r.A, unit: 'A', src: DRIVER_SRC } } } },
    { name: 'pwm', points: [[0, mm(0.35 * r.W)]], port: { kind: 'signal', size: { V: r.logic, pins: 2 }, limits: { voltage: { max: r.logic, unit: 'V', src: DRIVER_SRC } } } }] }),
  expect: (r) => ({ bound: [mm(r.L), mm(r.t), mm(r.W)], tol: 0.01, says: 'its board' }),
  tests: [{ inputs: {}, outputs: { pieces: 1 } }],
};

export const POWER = [MOTOR, PSU, DRIVER] as PartFamily<unknown>[];
export const POWER_NODES: BlockDef[] = POWER.map((f) => familyNode(f));
