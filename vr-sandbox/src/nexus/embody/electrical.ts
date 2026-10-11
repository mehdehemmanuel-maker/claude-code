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
// The heater's channel (its switch, its divider, an indicator) is drawn as nets and laid on a breadboard by its law
// (./breadboard): only what the board's clips can carry goes on it, every lead in a hole, and the board is checked to
// join exactly those nets. What it cannot carry is the controller's heater channel.

import { E24, preferred } from '../parts/series';
import { part, type Assembly, type Flaw, type Part, type V3, type Value } from './part';
import { conductorOf as conductorName, holeAt, layOut, type Component, type Layout } from './breadboard';
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

/** The nearest preferred value of the E24 series (IEC 60063), by the series' own owner. */
export const e24 = (x: number) => preferred(E24, x);

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
  // ---- the heater's channel as nets, laid on the breadboard before the cables, so the thermistor's ends at its header --
  const heaterL = o.loads.find((l) => l.kind === 'heater'), sensorL = o.thermistor ? o.loads.find((l) => l.kind === 'sensor' && /thermistor/.test(`${l.id} ${l.name}`)) : undefined;
  const bench = o.benchAt ?? [o.controllerAt[0] + 0.25, 0.002, o.controllerAt[2] + 0.3];
  const top: V3 = [bench[0], bench[1] + 0.0045, bench[2]];
  const comps: Component[] = [];
  const RES: V3 = [6.3 * mm, 2.5 * mm, 2.5 * mm];
  comps.push({ id: 'bb:j-controller', name: 'header to the controller', to: 'controller', body: [0, 8.5 * mm, 2.5 * mm], colour: 0x212121, pins: [{ name: '3V3', net: '+3.3 V' }, ...(sensorL ? [{ name: 'ADC', net: 'thermistor sense' }] : []), ...(heaterL ? [{ name: 'PWM', net: 'heater PWM' }] : []), { name: 'GND', net: '0 V' }] });
  if (sensorL) {
    comps.push({ id: 'bb:j-thermistor', name: 'header to the thermistor', to: 'thermistor', body: [0, 8.5 * mm, 2.5 * mm], colour: 0x212121, pins: [{ name: 'sense', net: 'thermistor sense' }, { name: '0 V', net: '0 V' }] });
    comps.push({ id: 'bb:r-divider', name: 'divider resistor', body: RES, colour: 0xc8a165, pins: [{ name: '1', net: '+3.3 V' }, { name: '2', net: 'thermistor sense' }] });
    comps.push({ id: 'bb:c-filter', name: 'filter capacitor', body: [4 * mm, 4 * mm, 2.5 * mm], colour: 0xe0a030, pins: [{ name: '1', net: 'thermistor sense' }, { name: '2', net: '0 V' }] });
  }
  if (heaterL) {
    const Ih = heaterL.I;
    comps.push({ id: 'bb:r-gate', name: 'gate resistor', body: RES, colour: 0xc8a165, pins: [{ name: '1', net: 'heater PWM' }, { name: '2', net: 'gate' }] });
    comps.push({ id: 'bb:r-pulldown', name: 'pull-down resistor', body: RES, colour: 0xc8a165, pins: [{ name: '1', net: 'gate' }, { name: '2', net: '0 V' }] });
    comps.push({ id: 'bb:q-heater', name: 'heater MOSFET', body: [10 * mm, 15 * mm, 4.5 * mm], colour: 0x111111, pins: [{ name: 'G', net: 'gate' }, { name: 'D', net: 'heater return', I: Ih }, { name: 'S', net: '0 V', I: Ih }] });
    comps.push({ id: 'bb:r-led', name: 'indicator resistor', body: RES, colour: 0xc8a165, pins: [{ name: '1', net: '+24 V', I: 0.005 }, { name: '2', net: 'indicator', I: 0.005 }] });
    comps.push({ id: 'bb:led', name: 'indicator LED', body: [5 * mm, 8.6 * mm, 5 * mm], colour: 0xff1744, pins: [{ name: 'A', net: 'indicator', I: 0.005 }, { name: 'K', net: 'heater return', I: 0.005 }] });
    comps.push({ id: 'bb:terminal', name: 'terminal to the heater', to: 'heater', every: 2, body: [0, 10 * mm, 8 * mm], colour: 0x1565c0, pins: [{ name: '+', net: '+24 V', I: Ih }, { name: '−', net: 'heater return', I: Ih }] });
    comps.push({ id: 'bb:supply', name: 'terminal from the supply', to: 'supply', every: 2, body: [0, 10 * mm, 8 * mm], colour: 0x1565c0, pins: [{ name: '+', net: '+24 V', I: Ih }, { name: '−', net: '0 V', I: Ih }] });
  }
  const lay: Layout = layOut(comps, { topPlus: '+3.3 V', topMinus: '0 V', bottomPlus: '+24 V', bottomMinus: '0 V' }, BREADBOARD.contactA);
  const pinTop = (id: string, pin: string): V3 | null => { const pl = lay.placed.find((x) => x.comp.id === id); const i = pl?.comp.pins.findIndex((x) => x.name === pin) ?? -1; if (!pl || i < 0) return null; const h = holeAt(pl.holes[i]!, top); return [h[0], h[1] + pl.comp.body[1], h[2]]; };
  const sensorEnd = pinTop('bb:j-thermistor', 'sense');
  for (const L of o.loads) {
    const end = L === sensorL && sensorEnd ? sensorEnd : o.controllerAt;
    const pts = route(L.at, end, o.via), len = lengthOf(pts) * 1.1;
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
    // its fixed end is screwed to the end of the axis it serves
    P.push(part({ into: [`${axisId}/end-a`], id: `carrier:${axisId}`, name: `${carrier.id} cable carrier, R${R * 1e3}, ${(cl * 1e3).toFixed(0)} mm`, category: 'interconnect/containment', material: 'igumid (PA)', shape: { kind: 'block', size }, at: c0, colour: 0x263238, values: [{ name: 'bend radius', value: R, unit: 'm', law: `R ≥ 10 d over its thickest cable, ${(maxD * 1e3).toFixed(1)} mm` }] }, 300));
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
  // ---- the breadboard: the board, each part with its leads in its holes, the jumpers, and the leads off it ---------------
  const bb: Part[] = [];
  bb.push({ ...part({ id: 'bb:board', name: `solderless breadboard, ${BREADBOARD.rows} rows, 2.54 mm pitch: ${lay.placed.length} parts, ${lay.jumpers.length} jumpers, ${lay.opens.length + lay.shorts.length ? `${lay.opens.length} open, ${lay.shorts.length} short` : 'every net joined, none to another'}`, category: 'circuits/prototyping', material: 'ABS, phosphor bronze clips', shape: { kind: 'block', size: [BREADBOARD.length, 0.009, BREADBOARD.width] }, at: bench, colour: 0xf5f5f5, values: [] }, 0), mass: 0.06 });
  const Rled = heaterL ? e24((o.Vbus - 2) / 0.005) : 0;
  const ohms = (R: number) => (R >= 1000 ? `${Number((R / 1000).toPrecision(3))} kΩ` : `${R} Ω`);
  const NAMES: Record<string, string> = {
    'bb:r-divider': `${divider ? ohms(divider.Rfixed) : '?'} resistor, ¼ W: the divider's pull-up, the thermistor's resistance mid-band (E24)`,
    'bb:c-filter': '100 nF ceramic capacitor: filters the sense line at the converter',
    'bb:r-gate': '100 Ω gate resistor', 'bb:r-pulldown': '10 kΩ pull-down: off until driven',
    'bb:q-heater': mosfet ? `N-channel MOSFET, ≥ ${mosfet.Vds} V, ≥ ${mosfet.Id.toFixed(0)} A, ≤ ${(mosfet.RdsOn * 1e3).toFixed(0)} mΩ (TO-220)` : 'MOSFET',
    'bb:r-led': `${ohms(Rled)} resistor (E24: (V − 2 V) / 5 mA)`, 'bb:led': 'indicator LED, 5 mm: lit while the heater is on',
  };
  const FN = (net: string): keyof typeof COLOURS => (net === '0 V' ? 'dc negative' : /^\+/.test(net) ? 'dc positive' : 'signal');
  for (const pl of lay.placed) {
    const c = pl.comp, hs = pl.holes.map((h) => holeAt(h, top)), name = `${NAMES[c.id] ?? c.name}${c.to ? `: ${c.pins.map((x) => `${x.name} (${x.net})`).join(', ')}` : ''}`;
    const values = c.id === 'bb:r-divider' ? vals.filter((x) => x.name === 'divider resistor') : c.id === 'bb:q-heater' ? vals.filter((x) => x.name === 'heater switch') : [];
    const holesSaid: Value = { name: 'holes', value: pl.holes.length, unit: '', law: pl.holes.map((h, i) => `${c.pins[i]!.name} in ${h.col >= 0 && h.col <= 9 ? `${'abcdefghij'[h.col]}${h.row + 1}` : `the ${conductorName(h)} by row ${h.row + 1}`} (${c.pins[i]!.net})`).join(', ') };
    if (c.pins.length >= 3 || c.to) {
      // down its holes, standing on the board
      const xs = hs.map((h) => h[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
      bb.push({ ...part({ id: c.id, name, category: 'circuits/prototyping', material: 'component', shape: { kind: 'block', size: [x1 - x0 + BREADBOARD.pitch, c.body[1], c.body[2]] }, at: [(x0 + x1) / 2, top[1] + c.body[1] / 2, hs[0]![2]], colour: c.colour, values: [...values, holesSaid] }, 0), mass: 0.002 });
      continue;
    }
    // two leads: the body resting on the board between its holes, along the line from one to the other, each lead bent down into its hole
    const [a, b] = hs as [V3, V3], dx = b[0] - a[0], dz = b[2] - a[2], along = Math.abs(dx) >= Math.abs(dz), lift = -0.2 * mm; // seated on the board, its leads bent down beside it
    const mid: V3 = [(a[0] + b[0]) / 2, top[1] + lift + c.body[1] / 2, (a[2] + b[2]) / 2], L = Math.min(c.body[0], Math.hypot(dx, dz) - 1.5 * mm);
    bb.push({ ...part({ id: c.id, name, category: 'circuits/prototyping', material: 'component', shape: { kind: 'block', size: along ? [L, c.body[1], c.body[2]] : [c.body[2], c.body[1], L] }, at: mid, colour: c.colour, values: [...values, holesSaid] }, 0), mass: 0.001 });
    const u = Math.hypot(dx, dz) || 1;
    for (const [k, h] of [a, b].entries()) {
      const s2 = k === 0 ? -1 : 1, endAt: V3 = [mid[0] + s2 * (dx / u) * (L / 2), mid[1], mid[2] + s2 * (dz / u) * (L / 2)];
      bb.push(part({ id: `${c.id}:lead-${c.pins[k]!.name}`, name: `lead ${c.pins[k]!.name} of ${c.name}, into ${conductorName(pl.holes[k]!)}`, category: 'circuits/prototyping', material: 'tinned copper', shape: { kind: 'wire', points: [[h[0], h[1] - 3 * mm, h[2]], [h[0], mid[1], h[2]], endAt], r: 0.3 * mm }, at: h, colour: 0xb0bec5, values: [] }, 0));
    }
  }
  for (const [i, j] of lay.jumpers.entries()) {
    const a = holeAt(j.from, top), b = holeAt(j.to, top);
    bb.push(part({ id: `bb:jumper-${i + 1}`, name: `jumper, ${COLOURS[FN(j.net)]!.colour}: ${j.net}, ${conductorName(j.from)} to ${conductorName(j.to)}`, category: 'interconnect/identification', material: 'copper, PVC', shape: { kind: 'wire', points: [[a[0], a[1] - 3 * mm, a[2]], [a[0], a[1] + 3 * mm, a[2]], [b[0], b[1] + 3 * mm, b[2]], [b[0], b[1] - 3 * mm, b[2]]], r: 0.3 * mm }, at: a, colour: COLOURS[FN(j.net)]!.hex, values: [] }, 0));
  }
  // the leads off the board, to the controller's pins
  const hdr = lay.placed.find((x) => x.comp.id === 'bb:j-controller');
  for (const [k, pin] of (hdr?.comp.pins ?? []).entries()) {
    const from = pinTop('bb:j-controller', pin.name)!, via: V3 = [from[0], from[1] + 0.02, from[2]];
    const pts = route(from, [o.controllerAt[0] + (k - 1.5) * 2.54 * mm, o.controllerAt[1], o.controllerAt[2]], via);
    bb.push(part({ id: `bb:lead-${pin.name}`, name: `lead to the controller's ${pin.name} pin (${pin.net}), AWG 24, ${(lengthOf(pts) * 1e3).toFixed(0)} mm`, category: 'interconnect/conductors/awg', material: 'copper, PVC', shape: { kind: 'wire', points: pts, r: 0.5 * mm }, at: from, colour: COLOURS[FN(pin.net)]!.hex, values: [] }, 0));
  }
  v('breadboard clips', BREADBOARD.contactA, 'A', lay.refused.length ? `what it cannot carry is the controller's heater channel: ${lay.refused.map((r) => `${comps.find((c) => c.id === r.id)?.name} (${r.why})`).join('; ')}` : 'everything of the channel is within its clips');
  v('breadboard nets', new Set(lay.placed.flatMap((x) => x.comp.pins.map((q) => q.net))).size, '', `${lay.opens.length + lay.shorts.length ? [...lay.opens, ...lay.shorts].join('; ') : 'checked by its strips, rails and jumpers: every net one conductor, no two nets on one'}`);
  flaws.push(...lay.flaws);
  bb[0]!.values = vals.filter((x) => x.name.startsWith('breadboard'));
  return { id: 'electrical', name: 'interconnect and circuits', category: 'interconnect', from: null, parts: P, values: vals, cables, psu: { ...psu, load }, fuse, mainsI, divider, mosfet, breadboard: bb, flaws };
}
