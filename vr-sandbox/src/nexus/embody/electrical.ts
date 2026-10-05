// Interconnect and circuits (docs/NEXUS-FROM-REALITY.md, section 28): every path charge takes between the parts, and
// the circuits that give each load its current. From the loads embodiment found (motors, heaters, fans, sensors) and
// where each sits, every conductor is decided by law:
//
//   gauge        the thinnest that both holds its insulation's temperature, I² R'(T) = h π D (T − T_air), and keeps
//                the supply within 3 %, ΔV = 2 R' L I; never thinner than a moving or a power run can be handled
//   insulation   PVC where every point of its route is below 80 °C; silicone where it runs near heat and flexes
//   colour       by function, by IEC 60445 (line brown, neutral blue, earth green-and-yellow and nothing else) and by
//                IEC 60062 order for numbered conductors
//   terminations a connector rated past the current, per contact
//   containment  a cable carrier wherever a cable crosses an axis that moves, bending at ten of its largest cable's
//                diameters or more, as deep and wide as its bundle
//   protection   a mains fuse between what the supply draws (1.25 ×) and what its conductors carry; every exposed
//                metal part earthed
//   supply       rated a quarter past the most the loads draw at once
//   sensing      a divider whose fixed resistor equals the thermistor's resistance mid-band, where it is most sensitive
//   switching    a transistor rated twice the supply and twice the current, losing under half a watt
//
// The heater's channel (its switch, its divider, an indicator) is laid out on a breadboard too, as a circuit tried
// before it is made.

import { part, type Assembly, type Flaw, type Part, type V3, type Value } from './part';
import { AWG_SIZES, awgDiameter, BREADBOARD, CABLE_CARRIERS, CABLE_H, COLOURS, CONNECTORS, COPPER, FUSE_RATINGS, IEC_60062, INSULATIONS, PSU_24V } from './stock';

const mm = 1e-3;

export interface Conductor { role: string; fn: keyof typeof COLOURS }
export interface Load { id: string; name: string; kind: 'motor' | 'heater' | 'fan' | 'sensor'; V: number; I: number; P: number; conductors: Conductor[]; at: V3; rides: string[]; hotAtEnd: number }
export interface Cable {
  id: string; load: string; conductors: { role: string; colour: string; hex: number; standard: string }[];
  awg: number; insulation: string; length: number; current: number; drop: number; Tconductor: number; outerD: number;
  connector: string; carriers: string[]; route: V3[];
}
export interface Electrical extends Assembly { cables: Cable[]; psu: { id: string; W: number; load: number }; fuse: number; mainsI: number; divider: { R25: number; B: number; Rfixed: number; sensitivity: number; resolutionK: number } | null; mosfet: { Vds: number; Id: number; RdsOn: number; loss: number } | null; breadboard: Part[]; flaws: Flaw[] }

const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
/** The nearest preferred value of the E24 series (IEC 60063). */
export const e24 = (x: number) => { const dec = 10 ** Math.floor(Math.log10(x)); return E24.map((m) => m * dec).concat([10 * dec]).reduce((a, b) => (Math.abs(Math.log(b / x)) < Math.abs(Math.log(a / x)) ? b : a)); };

/** The temperature a conductor of gauge `awg` with insulation `ins` settles at carrying `I` in air at `Tair`: I² R'(T) = h π D (T − T_air). */
export function conductorTemperature(awg: number, ins: (typeof INSULATIONS)[number], I: number, Tair: number): number {
  const d = awgDiameter(awg), A = (Math.PI * d * d) / 4, D = d + 2 * ins.wall;
  let T = Tair + 5;
  for (let k = 0; k < 40; k++) {
    const Rp = (COPPER.rho * (1 + COPPER.alpha * (T - 20))) / A;
    const next = Tair + (I * I * Rp) / (CABLE_H.value * Math.PI * D);
    if (!Number.isFinite(next) || next > 2000) return Infinity;
    T = next;
  }
  return T;
}

/** A route along the frame's edges from one point to another: up or down first, then across, then along, with slack. */
/** Conductors in one cable are told apart: where a function's colour is already used, the next IEC 60062 colour not in the cable. */
const distinct = <C extends { colour: string; hex: number; standard: string }>(cs: C[]): C[] => {
  const used = new Set<string>();
  return cs.map((c) => {
    if (!used.has(c.colour)) { used.add(c.colour); return c; }
    const next = IEC_60062.find((x) => !used.has(x.colour) && x.colour !== 'green')!;
    used.add(next.colour);
    return { ...c, colour: next.colour, hex: next.hex, standard: `numbered by IEC 60062 order: ${c.colour} was taken in this cable, so ${next.colour}` };
  });
};
const route = (a: V3, b: V3, via: V3): V3[] => [a, [a[0], via[1], a[2]], [via[0], via[1], a[2]], [via[0], via[1], b[2]], [b[0], via[1], b[2]], b];
const lengthOf = (pts: V3[]) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i]![0], p[1] - pts[i]![1], p[2] - pts[i]![2]), 0);

export function designElectrical(o: { loads: Load[]; controllerAt: V3; psuAt: V3; inletAt: V3; via: V3; Vbus: number; Vmains: number; outletW: number; ambient: number; axes: { id: string; travel: number; at: V3; dir: V3; across: V3 }[]; benchAt?: V3; thermistor: { R25: number; B: number; Tlo: number; Thi: number; resolution: number } | null }): Electrical {
  const vals: Value[] = [], flaws: Flaw[] = [], P: Part[] = [];
  const v = (name: string, value: number, unit: string, law: string) => { vals.push({ name, value, unit, law }); return value; };
  const cables: Cable[] = [];
  const pvc = INSULATIONS.find((x) => x.id === 'PVC-80')!, sil = INSULATIONS.find((x) => x.id === 'SIL-200')!;
  const carriersUsed = new Map<string, Cable[]>();
  for (const L of o.loads) {
    const pts = route(L.at, o.controllerAt, o.via), len = lengthOf(pts) * 1.1;
    // its insulation: what the hottest point of its route allows; flexing runs need a flexible one
    const ins = L.hotAtEnd > pvc.maxC - 10 ? sil : L.rides.length ? sil : pvc;
    // its gauge: the thinnest that holds its insulation's temperature and keeps the drop within 3 %, and no thinner
    // than a run that moves or carries power can be handled
    const floor = L.kind === 'sensor' ? 28 : L.rides.length ? 24 : 22;
    let awg = AWG_SIZES.filter((n) => n <= floor).find((n) => {
      const T = conductorTemperature(n, ins, L.I, o.ambient);
      const d = awgDiameter(n), Rp = (COPPER.rho * (1 + COPPER.alpha * (T - 20))) / ((Math.PI * d * d) / 4);
      return T <= ins.maxC - 5 && 2 * Rp * len * L.I <= 0.03 * L.V;
    });
    if (awg === undefined) { awg = AWG_SIZES.at(-1)!; flaws.push({ check: 'ampacity', where: L.id, says: `no gauge carries ${L.I.toFixed(1)} A over ${(len * 1e3).toFixed(0)} mm within its insulation and 3 % drop`, law: "I² R' = h π D ΔT; ΔV = 2 R' L I", value: L.I, limit: 0, remedy: null }); }
    const T = conductorTemperature(awg, ins, L.I, o.ambient), d = awgDiameter(awg), Rp = (COPPER.rho * (1 + COPPER.alpha * (T - 20))) / ((Math.PI * d * d) / 4);
    const drop = 2 * Rp * len * L.I;
    const conn = CONNECTORS.filter((c) => c.pitch > 0).find((c) => c.amps >= 1.5 * L.I && c.volts >= L.V) ?? { id: 'none rated for it', amps: 0, volts: 0, pitch: 0, source: '' };
    if (conn.amps === 0) flaws.push({ check: 'termination', where: L.id, says: `no stocked connector is rated for ${L.I.toFixed(1)} A at ${L.V} V`, law: 'a connector rated past its current', value: L.I, limit: 0, remedy: null });
    const cable: Cable = {
      id: `cable:${L.id}`, load: L.id, conductors: distinct(L.conductors.map((c) => ({ role: c.role, ...COLOURS[c.fn]! }))), awg, insulation: ins.name, length: len, current: L.I, drop, Tconductor: T,
      outerD: Math.sqrt(L.conductors.length) * (d + 2 * ins.wall) * 1.15, connector: conn.id, carriers: L.rides, route: pts,
    };
    cables.push(cable);
    for (const a of L.rides) carriersUsed.set(a, [...(carriersUsed.get(a) ?? []), cable]);
    // the cable as a part: a run of its colour, its conductors twisted into one
    P.push(part({ id: cable.id, name: `${L.name} cable: ${L.conductors.length} × AWG ${awg} ${ins.name}, ${cable.conductors.map((c) => c.colour).join('/')}, ${(len * 1e3).toFixed(0)} mm, ${conn.id} at the board`, category: 'interconnect/conductors/awg', material: `copper, ${ins.name}`, shape: { kind: 'wire', points: pts, r: cable.outerD / 2 }, at: pts[0]!, colour: cable.conductors[0]!.hex, values: [
      { name: 'gauge', value: awg, unit: 'AWG', law: `the thinnest that holds ${ins.maxC} °C (I² R'(T) = h π D ΔT, h ≈ ${CABLE_H.value} W/m²K) and a drop within 3 %` },
      { name: 'conductor temperature', value: T, unit: 'degC', law: `at ${L.I.toFixed(2)} A in ${o.ambient} °C air` },
      { name: 'voltage drop', value: drop, unit: 'V', law: `ΔV = 2 R' L I over ${(len * 1e3).toFixed(0)} mm, ${(100 * drop / L.V).toFixed(2)} % of ${L.V} V` },
    ] }, COPPER.density * 0.6));
  }
  // cable carriers for every moving axis a cable crosses
  for (const [axisId, cs] of carriersUsed) {
    const ax = o.axes.find((a) => a.id === axisId);
    if (!ax) continue;
    const maxD = Math.max(...cs.map((c) => c.outerD)), width = cs.reduce((s, c) => s + c.outerD, 0) * 1.2;
    const minR = 10 * maxD;
    const carrier = CABLE_CARRIERS.find((c) => c.h >= 1.1 * maxD && c.w >= width && c.radii.some((r) => r >= minR)) ?? null;
    if (!carrier) { flaws.push({ check: 'bend', where: axisId, says: `no carrier holds ${cs.length} cables of up to ${(maxD * 1e3).toFixed(1)} mm at ten diameters' bend`, law: 'R ≥ 10 d', value: maxD, limit: 0, remedy: null }); continue; }
    const R = carrier.radii.find((r) => r >= minR)!, cl = ax.travel / 2 + Math.PI * R + 40 * mm;
    v(`cable carrier on ${axisId}`, cl, 'm', `${carrier.id}, bend radius ${R * 1e3} mm ≥ 10 × ${(maxD * 1e3).toFixed(1)} mm, for ${cs.length} cables; half the travel, the loop and 40 mm`);
    // it lies flat beside the axis it serves, its loop opening away from it: along the travel, half of it and the bend;
    // across, the loop's two radii and the links; deep, the links' width
    const along = ax.travel / 2 + R, out = 2 * R + carrier.h + 4 * mm, deep = carrier.w + 4 * mm;
    const c0 = [0, 1, 2].map((k) => ax.at[k]! + ax.dir[k]! * (ax.travel / 4) + ax.across[k]! * (out / 2 + 4 * mm)) as V3;
    const size = [0, 1, 2].map((k) => (Math.abs(ax.dir[k]!) > 0.5 ? along : Math.abs(ax.across[k]!) > 0.5 ? out : deep)) as V3;
    P.push(part({ id: `carrier:${axisId}`, name: `${carrier.id} cable carrier, R${R * 1e3}, ${(cl * 1e3).toFixed(0)} mm`, category: 'interconnect/containment', material: 'igumid (PA)', shape: { kind: 'block', size }, at: c0, colour: 0x263238, values: [{ name: 'bend radius', value: R, unit: 'm', law: `R ≥ 10 d over its thickest cable, ${(maxD * 1e3).toFixed(1)} mm` }] }, 300));
  }
  // the supply, its fuse and its mains conductors
  const load = o.loads.reduce((s, l) => s + l.P, 0) + 5;
  const psu = PSU_24V.find((p) => p.W >= 1.25 * load) ?? PSU_24V.at(-1)!;
  v('supply rating', psu.W, 'W', `${psu.id}: the first rated past 1.25 × ${load.toFixed(0)} W the loads draw at once (motors at their worst move, heaters, fans, the board's 5 W)`);
  if (psu.W < 1.25 * load) flaws.push({ check: 'headroom', where: 'supply', says: `the loads draw ${load.toFixed(0)} W, past every supply in the family`, law: 'P_rated ≥ 1.25 ΣP', value: load, limit: psu.W / 1.25, remedy: null });
  const mainsI = v('mains current', psu.W / 0.88 / o.Vmains, 'A', `the supply at full load, about 88 % efficient, from ${o.Vmains} V`);
  if (psu.W / 0.88 > o.outletW) flaws.push({ check: 'outlet', where: 'supply', says: 'the supply draws more than the outlet gives', law: 'P ≤ P_outlet', value: psu.W / 0.88, limit: o.outletW, remedy: null });
  const fuse = v('mains fuse', FUSE_RATINGS.find((f) => f >= 1.25 * mainsI)!, 'A', 'IEC 60127, the first past 1.25 × the mains current (time-lag, for the supply\'s inrush)');
  const mainsAwg = AWG_SIZES.filter((n) => n <= 18).find((n) => conductorTemperature(n, INSULATIONS[1]!, fuse, o.ambient) <= INSULATIONS[1]!.maxC - 5)!;
  v('mains conductors', mainsAwg, 'AWG', `the thinnest that carries the fuse's rating within PVC 105 °C: a fault opens the fuse before it heats the wire`);
  const mainsPts = route(o.inletAt, o.psuAt, [o.inletAt[0], o.psuAt[1], o.inletAt[2]]);
  for (const [i, fn] of (['mains line', 'mains neutral', 'protective earth'] as const).entries()) P.push(part({ id: `cable:mains:${fn}`, name: `${fn}: AWG ${mainsAwg} PVC 105 °C, ${COLOURS[fn]!.colour} (${COLOURS[fn]!.standard})`, category: 'interconnect/identification', material: 'copper, PVC (UL 1015)', shape: { kind: 'wire', points: mainsPts.map((p) => [p[0], p[1], p[2] + (i - 1) * 4 * mm] as V3), r: 1.4 * mm }, at: mainsPts[0]!, colour: COLOURS[fn]!.hex, values: [] }, COPPER.density * 0.6));
  // the heater's channel: its switch and the thermistor's divider
  const heater = o.loads.find((l) => l.kind === 'heater');
  let mosfet: Electrical['mosfet'] = null, divider: Electrical['divider'] = null;
  if (heater) {
    const Rmax = 0.5 / heater.I ** 2;
    mosfet = { Vds: 2 * o.Vbus, Id: 2 * heater.I, RdsOn: Rmax, loss: heater.I ** 2 * Rmax };
    v('heater switch', Rmax, 'Ω', `an N-channel logic-level MOSFET: V_DS ≥ ${2 * o.Vbus} V, I_D ≥ ${(2 * heater.I).toFixed(1)} A, R_DS(on) ≤ ${(Rmax * 1e3).toFixed(0)} mΩ at V_GS 3.3 V so it loses under 0.5 W at ${heater.I.toFixed(1)} A`);
  }
  if (o.thermistor) {
    const t = o.thermistor, Tm = (t.Tlo + t.Thi) / 2;
    const Rm = t.R25 * Math.exp(t.B * (1 / Tm - 1 / 298.15));
    const Rf = e24(Rm);
    const dRdT = (-t.B * Rm) / (Tm * Tm), Vref = 3.3;
    const dVdT = Math.abs((Vref * Rf * dRdT) / (Rm + Rf) ** 2), lsb = Vref / 4096;
    divider = { R25: t.R25, B: t.B, Rfixed: Rf, sensitivity: dVdT, resolutionK: lsb / dVdT };
    v('divider resistor', Rf, 'Ω', `the thermistor's resistance mid-band (${(Tm - 273.15).toFixed(0)} °C): R = R₂₅ e^{B(1/T − 1/298.15)} = ${Rm.toFixed(0)} Ω, as the nearest E24 value`);
    v('temperature resolution', lsb / dVdT, 'K', `one count of a 12-bit converter at 3.3 V over ${(dVdT * 1e3).toFixed(2)} mV/K there`);
    if (lsb / dVdT > t.resolution) flaws.push({ check: 'resolve', where: 'thermistor', says: 'the divider resolves coarser than the generator asked', law: 'dV/dT at mid-band', value: lsb / dVdT, limit: t.resolution, remedy: null });
  }
  // ---- the breadboard: the heater channel, tried before it is made -------------------------------------------------
  const bb: Part[] = [];
  // on the bench beside the machine, where a circuit is tried before it is made
  const bench = o.benchAt ?? [o.controllerAt[0] + 0.25, 0.002, o.controllerAt[2] + 0.3];
  const pitch = BREADBOARD.pitch, bx0 = bench[0], by0 = bench[1], bz0 = bench[2];
  const hole = (row: number, col: number): V3 => [bx0 - BREADBOARD.length / 2 + (row + 2) * pitch, by0 + 0.006, bz0 + (col - 4.5) * pitch * (col >= 5 ? 1 : 1) + (col >= 5 ? 2 * pitch : -2 * pitch) * 0.5];
  bb.push(part({ id: 'bb:board', name: `solderless breadboard, ${BREADBOARD.rows} rows, 2.54 mm pitch`, category: 'circuits/prototyping', material: 'ABS, phosphor bronze clips', shape: { kind: 'block', size: [BREADBOARD.length, 0.009, BREADBOARD.width] }, at: [bx0, by0, bz0], colour: 0xf5f5f5, values: [] }, 0, ));
  bb[0]!.mass = 0.06;
  const comp = (id: string, name: string, a: V3, size: V3, colour: number, values: Value[] = []) => bb.push({ ...part({ id, name, category: 'circuits/prototyping', material: 'component', shape: { kind: 'block', size }, at: a, colour, values }, 0), mass: 0.001 });
  const jumper = (id: string, from: V3, to: V3, fn: keyof typeof COLOURS) => bb.push(part({ id, name: `jumper, ${COLOURS[fn]!.colour} (${fn})`, category: 'interconnect/identification', material: 'copper, PVC', shape: { kind: 'wire', points: [from, [from[0], from[1] + 0.012, from[2]], [to[0], to[1] + 0.012, to[2]], to], r: 0.4 * mm }, at: from, colour: COLOURS[fn]!.hex, values: [] }, 0));
  if (divider) {
    comp('bb:r-divider', `${divider.Rfixed} Ω resistor (divider, E24)`, hole(10, 2), [7.5 * mm, 2.5 * mm, 2.5 * mm], 0xc8a165, vals.filter((x) => x.name === 'divider resistor'));
    comp('bb:c-filter', '100 nF ceramic capacitor (filter)', hole(14, 3), [4 * mm, 4 * mm, 2.5 * mm], 0xe0a030);
    comp('bb:j-thermistor', '2-pin header to the thermistor', hole(6, 1), [5 * mm, 8 * mm, 2.5 * mm], 0x212121);
    jumper('bb:w-3v3', hole(10, 0), hole(10, -2), 'dc positive');
    jumper('bb:w-adc', hole(14, 1), hole(40, -2), 'signal');
  }
  if (mosfet) {
    comp('bb:q-heater', `N-channel MOSFET, ≥ ${mosfet.Vds} V, ≥ ${mosfet.Id.toFixed(0)} A, ≤ ${(mosfet.RdsOn * 1e3).toFixed(0)} mΩ (TO-220)`, hole(24, 7), [10 * mm, 15 * mm, 4.5 * mm], 0x111111, vals.filter((x) => x.name === 'heater switch'));
    comp('bb:r-gate', '100 Ω gate resistor', hole(20, 6), [7.5 * mm, 2.5 * mm, 2.5 * mm], 0xc8a165);
    comp('bb:r-pulldown', '10 kΩ pull-down: off until driven', hole(22, 8), [7.5 * mm, 2.5 * mm, 2.5 * mm], 0xc8a165);
    const Rled = e24((o.Vbus - 2) / 0.005);
    comp('bb:led', `indicator LED with ${Rled >= 1000 ? `${Rled / 1000} kΩ` : `${Rled} Ω`} (E24: (V − 2 V) / 5 mA)`, hole(32, 7), [5 * mm, 8 * mm, 5 * mm], 0xff1744);
    comp('bb:terminal', 'screw terminal 5.08 mm to the heater', hole(46, 7), [10 * mm, 10 * mm, 8 * mm], 0x1565c0);
    jumper('bb:w-24v', hole(46, 9), hole(46, 11), 'dc positive');
    jumper('bb:w-gnd', hole(26, 9), hole(26, 11), 'dc negative');
    jumper('bb:w-gate', hole(20, 4), hole(40, -1), 'signal');
  }
  return { id: 'electrical', name: 'interconnect and circuits', category: 'interconnect', from: null, parts: P, values: vals, cables, psu: { ...psu, load }, fuse, mainsI, divider, mosfet, breadboard: bb, flaws };
}
