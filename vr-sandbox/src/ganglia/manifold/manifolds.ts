// The foundational manifolds: the storage branch of the engineering language, from the behaviour "store" down to
// datasheets, across every lawful mechanism, with the transformation manifolds that bridge domains. Nothing here is
// a category of things; each entry is a family of configurations with the laws that bound it, the parameters that
// vary across it, and, where it can be sized, a scaling that makes a member of it for a contract. Every number is
// from its source or is labelled an estimate of what.
import { BATTERIES, type BatteryData } from '../../data/batteries';
import { MOTORS } from '../../data/motors';
import { MATERIALS, getMaterial, STANDARD_GRAVITY as g } from '../../data/materials';
import { blockCapacity } from '../../engineering/battery';
import { getPartKind } from '../../parts/registry';
import type { Source } from '../types';
import { C0, WH, type Contract, type Environment, type Manifold, type Member, type Parameter, type Provenance } from './language';

const LINDEN: Source = { cite: 'Linden & Reddy, Handbook of Batteries, 4th ed., McGraw-Hill 2011', kind: 'handbook' };
const GENTA: Source = { cite: 'Genta, Kinetic Energy Storage: Theory and Practice of Advanced Flywheel Systems, Butterworths 1985', kind: 'textbook' };
const SHIGLEY: Source = { cite: 'Budynas & Nisbett, Shigley\'s Mechanical Engineering Design, 10th ed., McGraw-Hill 2015 (ch. 10 springs; Table 10-5 G of A228; Table 10-6 allowable torsional stress)', kind: 'textbook' };
const ROARK: Source = { cite: 'Young & Budynas, Roark\'s Formulas for Stress and Strain, 7th ed., McGraw-Hill 2002 (rotating disc)', kind: 'handbook' };
const PHYSICS: Source = { cite: 'Young & Freedman, University Physics, 15th ed., Pearson 2019', kind: 'textbook' };
const CONWAY: Source = { cite: 'Conway, Electrochemical Supercapacitors, Kluwer 1999; Linden & Reddy ch. 39 (electrochemical capacitors)', kind: 'textbook' };
const PAHL: Source = { cite: 'Pahl, Beitz, Feldhusen & Grote, Engineering Design: A Systematic Approach, 3rd ed., Springer 2007 (function structures: energy, material, signal)', kind: 'textbook' };
const est = (of: string): Provenance => ({ estimate: of });
const p = (sym: string, name: string, unit: string, low: number, high: number, of: Provenance): Parameter => ({ sym, name, unit, low, high, of });

/** The energy and power a kilogram of a family holds and gives, for a member sized by a contract from that range. */
function byDensity(id: string, c: Contract, e: Parameter, pw: Parameter, eff: number, laws: string[], instantiable: boolean, says: string): Member {
  const E = (c.stores ?? 0) / eff, P = Math.max(c.releases ?? 0, c.absorbs ?? 0);
  const low = Math.max(E / e.high, P / pw.high), high = Math.max(E / e.low, P / pw.low);
  return { manifold: id, mass: [low, high], parameters: { e: e.low, eHigh: e.high, p: pw.low, pHigh: pw.high, efficiency: eff }, instantiable, laws, says: `${says}: ${(E / WH).toFixed(1)} Wh to hold at ${(e.low / WH).toFixed(0)} to ${(e.high / WH).toFixed(0)} Wh/kg and ${P.toFixed(0)} W at ${pw.low.toFixed(0)} to ${pw.high.toFixed(0)} W/kg make ${low.toFixed(2)} to ${high.toFixed(2)} kg` };
}

/**
 * A pack of a stocked chemistry for a contract, from its datasheet: cells enough for the energy at the rate the
 * power implies (the maker's capacity at that current), and enough that the power leaves the terminals at 80 % of
 * open-circuit volts (an estimate of acceptable sag: the matched-load maximum, V²/4R, gives half the energy to heat).
 */
function packFor(id: string, c: Contract, b: BatteryData, eff: number): Member {
  const E = (c.stores ?? 0) / eff, P = Math.max(c.releases ?? 0, c.absorbs ?? 0);
  const perBlockP = (0.16 * b.V * b.V) / b.internalR;
  const blocksForPower = Math.ceil(P / perBlockP);
  // the current one block sees when the power is shared by the blocks it takes: the capacity at that rate
  let blocks = Math.max(1, blocksForPower);
  for (let i = 0; i < 8; i++) {
    const I = P / Math.max(1, blocks) / b.V;
    const Wh = b.V * blockCapacity(b, Math.max(I, 1e-3));
    const forEnergy = Math.ceil(E / (Wh * WH));
    const next = Math.max(blocksForPower, forEnergy, 1);
    if (next === blocks) break;
    blocks = next;
  }
  // a string of at most 20 cells (an estimate of a small controller's reach: under 30 V) and no longer than the
  // pack part's template allows; strings in parallel up to what it allows; more cells than one pack holds make more
  // packs: a realisation is a member of its part kind's own parameter manifold
  const limit = packLimits();
  const perString = Math.max(1, Math.min(Math.floor(20 / b.cells), limit.series));
  const perPack = perString * limit.parallel;
  const packs = Math.max(1, Math.ceil(blocks / perPack));
  const inPack = Math.ceil(blocks / packs);
  const series = Math.min(inPack, perString), parallel = Math.ceil(inPack / series);
  const total = series * parallel * packs;
  const mass = total * b.mass;
  const Wh = total * b.V * blockCapacity(b, P / Math.max(1, total) / b.V);
  return { manifold: id, mass: [mass, mass], parameters: { blocks: total, series, parallel, packs, V: series * b.V, Wh }, realization: b.id, instantiable: true, laws: ['energy.electric', 'ohm'], says: `${total} × ${b.label.split(',')[0]!.toLowerCase()} (${packs > 1 ? `${packs} packs of ` : ''}${series} in series × ${parallel} in parallel, ${(series * b.V).toFixed(1)} V): ${mass.toFixed(2)} kg by its datasheet` };
}

/** What the pack part's template allows of a string and of strings: the parameter manifold a realisation must lie in. */
function packLimits(): { series: number; parallel: number } {
  const defs = getPartKind('battery').params;
  const max = (key: string, fallback: number) => { const d = defs.find((x) => x.key === key); return d && 'max' in d ? d.max : fallback; };
  return { series: max('series', 8), parallel: max('parallel', 4) };
}

/** The electrochemical families: a member is the lightest stocked pack, else the family's range. */
function cellMember(id: string, ids: string[], e: Parameter, pw: Parameter, eff: number, says: string) {
  return (c: Contract): Member => {
    const packs = ids.map((b) => packFor(id, c, BATTERIES[b]!, eff)).sort((a, b) => a.mass[0] - b.mass[0]);
    return packs[0] ?? byDensity(id, c, e, pw, eff, ['energy.electric'], false, says);
  };
}

const STORE_PORTS = (domain: Manifold['domain'], species?: string) => [
  { name: 'energy_in', quantity: 'energy' as const, domain: domain!, direction: 'in' as const, ...(species ? { species } : {}) },
  { name: 'energy_out', quantity: 'energy' as const, domain: domain!, direction: 'out' as const, ...(species ? { species } : {}) },
  { name: 'thermal_out', quantity: 'heat' as const, domain: 'thermal' as const, direction: 'out' as const },
  { name: 'state', quantity: 'information' as const, domain: 'informational' as const, direction: 'out' as const },
];

/** Flywheel shape factor K in e = K σ/ρ (Genta): a constant-thickness solid disc. */
export const DISC_K = 0.606;
/** A practical rotor runs at half its yield (an estimate of a working safety factor on a rotor). */
const ROTOR_SF = 2;
/** A pressure vessel's wall works at a quarter of its yield (an estimate after code practice of 3.5 to 4 on strength). */
const VESSEL_SF = 4;
/** Bearings, shaft and a housing: about a fifth of the rotor (an estimate). */
const ROTOR_OVERHEAD = 0.2;

/** A solid-disc flywheel for a contract: the lightest stocked metal by yield over density, sped as its converter allows. */
function flywheelMember(id: string, c: Contract, env: Environment): Member | { refused: string; law?: string } {
  const E = c.stores ?? 0;
  const metals = MATERIALS.filter((m) => (m.category === 'steel' || m.category === 'aluminum') && m.yield > 0 && m.density > 0);
  if (!E) return { refused: 'nothing to store' };
  let best: Member | null = null;
  for (const m of metals) {
    const eStress = (DISC_K * m.yield) / (ROTOR_SF * m.density); // J/kg: flywheel.specific-energy
    const byStress = E / eStress;
    // E = 1/4 m r^2 w^2 for a solid disc (inertia.disc, energy.rotational): with the speed capped by the converter and
    // the radius by the room, the rotor can only be heavier
    const w = env.speedMax ?? Infinity, r = env.radiusMax;
    const bySpeed = Number.isFinite(w) ? (4 * E) / (r * r * w * w) : 0;
    const mass = Math.max(byStress, bySpeed);
    const rotorR = r; // the room's radius: the thinnest, slowest disc of that mass
    const thickness = mass / (m.density * Math.PI * rotorR * rotorR);
    const omega = Math.sqrt((4 * E) / (mass * rotorR * rotorR));
    // the disc's peak stress at that speed (Roark: a solid rotating disc, at its centre)
    const stress = (m.density * omega * omega * rotorR * rotorR * (3 + m.nu)) / 8;
    if (stress > m.yield / ROTOR_SF + 1) continue;
    const total = mass * (1 + ROTOR_OVERHEAD);
    const member: Member = {
      manifold: id, mass: [total, total], instantiable: true, laws: ['flywheel.specific-energy', 'inertia.disc', 'energy.rotational', 'stress.hoop'],
      parameters: { E, rotorMass: mass, radius: rotorR, thickness, omega, rpm: (omega * 60) / (2 * Math.PI), stress, limitedBy: bySpeed > byStress ? 1 : 0 },
      realization: m.id,
      says: `a ${m.name} disc, ${(rotorR * 1000).toFixed(0)} mm radius × ${(thickness * 1000).toFixed(1)} mm, ${mass.toFixed(2)} kg at ${((omega * 60) / (2 * Math.PI)).toFixed(0)} rpm (${(stress / 1e6).toFixed(0)} MPa at its centre, ${bySpeed > byStress ? 'its mass set by its converter\'s top speed, not by its strength' : 'its mass set by its strength'}); with bearings and housing ${total.toFixed(2)} kg`,
    };
    if (!best || member.mass[0] < best.mass[0]) best = member;
  }
  return best ?? { refused: 'no stocked metal holds together at the speed it would need', law: 'flywheel.specific-energy' };
}

/** A music-wire helical spring: energy per kilogram τ²/(4G)/ρ at the allowable torsional stress (Shigley). */
function springMember(id: string, c: Contract): Member {
  const m = getMaterial('steel.music-wire');
  const G = 81.7e9; // Pa, A228 (Shigley Table 10-5)
  const Sut = 2211e6 / Math.pow(2, 0.145); // Pa, A228 at 2 mm wire (Shigley eq. 10-14)
  const tau = 0.45 * Sut; // static service (Shigley Table 10-6)
  const u = (tau * tau) / (4 * G); // J/m^3
  const e = u / m.density;
  const E = c.stores ?? 0;
  const mass = E / e;
  return { manifold: id, mass: [mass, mass * 1.3], instantiable: false, laws: ['spring.energy', 'torsion.solid'], realization: m.id, parameters: { e, tau, G, mass }, says: `music wire at ${(tau / 1e6).toFixed(0)} MPa holds ${e.toFixed(0)} J/kg: ${mass.toFixed(1)} kg of spring (to ${(mass * 1.3).toFixed(1)} kg with its ends and guides, an estimate)` };
}

/** A thin-walled aluminium vessel of compressed air: isothermal work p V ln(p/p0) against a wall sized by hoop stress. */
function vesselMember(id: string, c: Contract): Member {
  const m = getMaterial('aluminum.6061-t6');
  const ratio = 20; // 20 bar in a shop vessel, an estimate
  const sigma = m.yield / VESSEL_SF;
  const eWall = (sigma * Math.log(ratio)) / (2 * m.density); // J per kg of wall: 2 p V / σ of wall for a cylinder
  const E = c.stores ?? 0;
  const p0 = 101325, pGas = ratio * p0;
  const V = E / (pGas * Math.log(ratio));
  const air = 1.204 * ratio * V; // kg, air at 20 °C compressed isothermally (an estimate of the ideal gas)
  const wall = E / eWall;
  const low = wall + air, high = (wall + air) * 1.5; // ends, ports and a valve: up to half again (an estimate)
  return { manifold: id, mass: [low, high], instantiable: false, laws: ['stress.hoop', 'gas.isothermal-work'], realization: m.id, parameters: { V, pressure: pGas, wall, air, e: eWall }, says: `${(V * 1000).toFixed(1)} L at ${ratio} bar in 6061 aluminium: ${wall.toFixed(2)} kg of wall and ${air.toFixed(2)} kg of air, ${low.toFixed(2)} to ${high.toFixed(2)} kg with ends and a valve` };
}

function raisedMassMember(id: string, c: Contract, env: Environment): Member {
  const E = c.stores ?? 0;
  const mass = E / (g * env.height);
  return { manifold: id, mass: [mass, mass * 1.1], instantiable: false, laws: ['energy.potential'], parameters: { height: env.height, mass }, says: `${mass.toFixed(0)} kg raised ${env.height} m (what this place allows) holds ${(E / 1000).toFixed(1)} kJ; the frame and rope add a tenth (an estimate)` };
}

function reservoirMember(id: string, c: Contract, env: Environment): Member {
  const E = c.stores ?? 0;
  const cWater = 4186, hot = 363.15; // J/kg K; an unpressurised tank at 90 °C, an estimate
  const dT = hot - env.ambient;
  const e = cWater * dT;
  const mass = E / e;
  return { manifold: id, mass: [mass * 1.1, mass * 1.5], instantiable: false, laws: ['heat.capacity', 'carnot'], parameters: { dT, e, water: mass }, says: `${mass.toFixed(1)} kg of water warmed ${dT.toFixed(0)} K holds ${(E / 1000).toFixed(1)} kJ of heat; its tank and lagging add a tenth to a half (an estimate)` };
}

/** A stocked DC machine for a power, or the family's range when none is stocked for it. */
function machineMember(id: string, c: Contract): Member {
  const P = Math.max(c.releases ?? 0, c.absorbs ?? 0);
  const stocked = Object.values(MOTORS).map((md) => {
    const rated = md.published.rated?.power ?? md.V * md.maxContinuousCurrent;
    const rpm = md.published.noLoadSpeed ?? md.published.rated?.speed ?? 0;
    return { md, rated, speedMax: (rpm * 2 * Math.PI) / 60 };
  }).filter((x) => x.rated >= P).sort((a, b) => a.md.mass - b.md.mass);
  const s = stocked[0];
  if (s) return { manifold: id, mass: [s.md.mass, s.md.mass], instantiable: true, realization: s.md.id, laws: ['motor.torque', 'power.rotary'], parameters: { rated: s.rated, speedMax: s.speedMax, P }, says: `${s.md.label.split(',')[0]!} (${s.rated.toFixed(0)} W rated, ${((s.speedMax * 60) / (2 * Math.PI)).toFixed(0)} rpm unloaded), ${s.md.mass.toFixed(2)} kg by its datasheet` };
  const specific = Object.values(MOTORS).map((md) => (md.published.rated?.power ?? md.V * md.maxContinuousCurrent) / md.mass);
  const low = P / Math.max(...specific), high = P / Math.min(...specific);
  return { manifold: id, mass: [low, high], instantiable: false, laws: ['motor.torque', 'power.rotary'], parameters: { P, speedMax: Infinity }, says: `no stocked machine gives ${P.toFixed(0)} W; by the stocked machines' ${Math.min(...specific).toFixed(0)} to ${Math.max(...specific).toFixed(0)} W/kg one would be ${low.toFixed(1)} to ${high.toFixed(1)} kg` };
}

/** A converter known only by its family's specific power (an estimate), with no stocked realisation. */
function familyConverter(id: string, low: number, high: number, laws: string[], of: string) {
  return (c: Contract): Member => {
    const P = Math.max(c.releases ?? 0, c.absorbs ?? 0);
    return { manifold: id, mass: [P / high, P / low], instantiable: false, laws, parameters: { P, speedMax: Infinity }, says: `${of}: ${P.toFixed(0)} W at ${low} to ${high} W/kg (an estimate) is ${(P / high).toFixed(2)} to ${(P / low).toFixed(2)} kg; none is stocked here` };
  };
}

const K = (celsius: number) => celsius + C0;

export const MANIFOLDS: Manifold[] = [
  // ------------------------------------------------------------------------------------------------ behaviour
  { id: 'behavior.store', level: 'behavior', name: 'store', parent: null, behavior: 'store', ports: [], parameters: [], laws: ['energy.electric', 'energy.potential', 'energy.rotational'], invariants: ['what is stored is conserved: what comes out is what went in less what was dissipated'], source: PAHL },
  // ------------------------------------------------------------------------------------------------ function
  {
    id: 'store.energy', level: 'function', name: 'store energy', parent: 'behavior.store', behavior: 'store', quantity: 'energy',
    ports: [{ name: 'energy_in', quantity: 'energy', domain: 'electrical', direction: 'in' }, { name: 'energy_out', quantity: 'energy', domain: 'electrical', direction: 'out' }, { name: 'thermal_out', quantity: 'heat', domain: 'thermal', direction: 'out' }, { name: 'state', quantity: 'information', domain: 'informational', direction: 'out' }],
    parameters: [p('E', 'energy held', 'J', 0, Infinity, PHYSICS), p('P', 'power given', 'W', 0, Infinity, PHYSICS)], laws: ['energy.electric'], invariants: ['energy out ≤ energy in × round-trip efficiency', 'power × time ≤ energy held'], source: PAHL,
  },
  // ------------------------------------------------------------------------------------------------ mechanisms
  {
    id: 'store.energy.electrochemical', level: 'mechanism', name: 'electrochemical storage', parent: 'store.energy', behavior: 'store', quantity: 'energy', domain: 'electrical', mechanism: 'electrochemical',
    ports: STORE_PORTS('electrical'), parameters: [p('e', 'specific energy', 'J/kg', 20 * WH, 250 * WH, LINDEN)], laws: ['energy.electric', 'lead-acid.ocv', 'ohm'], invariants: ['open-circuit voltage is set by the chemistry, not the size', 'drawn faster, a cell gives less (Peukert)'], source: LINDEN,
  },
  {
    id: 'cell.reversible', level: 'architecture', name: 'reversible electrochemical cell', names: ['battery', 'accumulator', 'secondary cell', 'pack'], parent: 'store.energy.electrochemical', domain: 'electrical', mechanism: 'electrochemical', reversible: true,
    ports: STORE_PORTS('electrical'), parameters: [p('eff', 'round-trip efficiency', '-', 0.65, 0.95, LINDEN)], laws: ['energy.electric', 'lead-acid.ocv'], invariants: ['charged by current driven back through it'], source: LINDEN,
  },
  {
    id: 'cell.primary', level: 'architecture', name: 'primary electrochemical cell', names: ['primary battery', 'alkaline cell'], parent: 'store.energy.electrochemical', domain: 'electrical', mechanism: 'electrochemical', reversible: false,
    ports: STORE_PORTS('electrical'), parameters: [p('e', 'specific energy', 'J/kg', 100 * WH, 200 * WH, LINDEN)], laws: ['energy.electric'], invariants: ['spent once: its chemistry is not driven back'], source: LINDEN,
    member: (c) => byDensity('cell.primary', c, p('e', 'specific energy', 'J/kg', 100 * WH, 200 * WH, LINDEN), p('p', 'specific power', 'W/kg', 20, 100, est('an alkaline cell\'s rate capability')), 1, ['energy.electric'], false, 'alkaline primary cells'),
  },
  {
    id: 'cell.lead-acid', level: 'component', name: 'valve-regulated lead-acid cell', names: ['lead-acid battery', 'SLA', 'AGM'], parent: 'cell.reversible', domain: 'electrical', mechanism: 'electrochemical', reversible: true, window: [K(-20), K(50)],
    ports: STORE_PORTS('electrical'), parameters: [p('e', 'specific energy', 'J/kg', 30 * WH, 45 * WH, LINDEN), p('p', 'specific power', 'W/kg', 150, 400, est('VRLA rate capability from typical datasheets')), p('eff', 'round-trip efficiency', '-', 0.75, 0.85, LINDEN), p('cycles', 'deep cycles', '-', 200, 500, LINDEN)],
    laws: ['lead-acid.ocv', 'energy.electric', 'ohm'], invariants: ['2.0 V per cell nominal', 'capacity falls with rate'], realizations: ['battery.sla.12v-7ah'], source: LINDEN,
    member: cellMember('cell.lead-acid', ['battery.sla.12v-7ah'], p('e', 'specific energy', 'J/kg', 30 * WH, 45 * WH, LINDEN), p('p', 'specific power', 'W/kg', 150, 400, est('VRLA rate capability')), 0.8, 'lead-acid blocks'),
  },
  {
    id: 'cell.nimh', level: 'component', name: 'nickel-metal hydride cell', names: ['NiMH', 'NiMH battery'], parent: 'cell.reversible', domain: 'electrical', mechanism: 'electrochemical', reversible: true, window: [K(-20), K(60)],
    ports: STORE_PORTS('electrical'), parameters: [p('e', 'specific energy', 'J/kg', 60 * WH, 120 * WH, LINDEN), p('p', 'specific power', 'W/kg', 250, 1000, LINDEN), p('eff', 'round-trip efficiency', '-', 0.65, 0.75, est('NiMH charge acceptance against delivered energy')), p('cycles', 'cycles', '-', 300, 500, LINDEN)],
    laws: ['energy.electric', 'ohm'], invariants: ['1.2 V per cell nominal', 'self-discharge of tens of percent a month'], realizations: ['battery.nimh.aa', 'battery.nimh.aaa'], source: LINDEN,
    member: cellMember('cell.nimh', ['battery.nimh.aa', 'battery.nimh.aaa'], p('e', 'specific energy', 'J/kg', 60 * WH, 120 * WH, LINDEN), p('p', 'specific power', 'W/kg', 250, 1000, LINDEN), 0.7, 'NiMH cells'),
  },
  {
    id: 'cell.li-ion', level: 'component', name: 'lithium-ion cell', names: ['Li-ion', 'lithium battery'], parent: 'cell.reversible', domain: 'electrical', mechanism: 'electrochemical', reversible: true, window: [K(0), K(45)],
    ports: STORE_PORTS('electrical'), parameters: [p('e', 'specific energy', 'J/kg', 100 * WH, 250 * WH, LINDEN), p('p', 'specific power', 'W/kg', 300, 1500, LINDEN), p('eff', 'round-trip efficiency', '-', 0.9, 0.95, LINDEN), p('cycles', 'cycles', '-', 500, 2000, LINDEN)],
    laws: ['energy.electric', 'ohm'], invariants: ['3.6 V per cell nominal', 'charged only between 0 and 45 °C'], realizations: [], source: LINDEN,
    member: (c) => byDensity('cell.li-ion', c, p('e', 'specific energy', 'J/kg', 100 * WH, 250 * WH, LINDEN), p('p', 'specific power', 'W/kg', 300, 1500, LINDEN), 0.92, ['energy.electric'], false, 'lithium-ion cells (none stocked here)'),
  },
  {
    id: 'store.energy.electrostatic', level: 'mechanism', name: 'electrostatic storage', parent: 'store.energy', behavior: 'store', quantity: 'energy', domain: 'electrical', mechanism: 'electrostatic',
    ports: STORE_PORTS('electrical'), parameters: [p('e', 'specific energy', 'J/kg', 0.01 * WH, 10 * WH, CONWAY)], laws: ['energy.electric', 'electrostatic.pull'], invariants: ['E = ½ C V²: voltage falls as it empties'], source: CONWAY,
  },
  {
    id: 'capacitor.edlc', level: 'component', name: 'electrochemical double-layer capacitor', names: ['supercapacitor', 'ultracapacitor', 'EDLC'], parent: 'store.energy.electrostatic', domain: 'electrical', mechanism: 'electrostatic', reversible: true, window: [K(-40), K(65)],
    ports: STORE_PORTS('electrical'), parameters: [p('e', 'specific energy', 'J/kg', 3 * WH, 8 * WH, CONWAY), p('p', 'specific power', 'W/kg', 2000, 10000, CONWAY), p('eff', 'round-trip efficiency', '-', 0.9, 0.98, CONWAY), p('cycles', 'cycles', '-', 1e5, 1e6, CONWAY)],
    laws: ['energy.electric'], invariants: ['2.7 V per cell at most', 'voltage falls linearly with charge'], realizations: [], source: CONWAY,
    member: (c) => byDensity('capacitor.edlc', c, p('e', 'specific energy', 'J/kg', 3 * WH, 8 * WH, CONWAY), p('p', 'specific power', 'W/kg', 2000, 10000, CONWAY), 0.95, ['energy.electric'], false, 'double-layer capacitors (none stocked here)'),
  },
  {
    id: 'store.energy.inertial', level: 'mechanism', name: 'inertial storage', parent: 'store.energy', behavior: 'store', quantity: 'energy', domain: 'rotational', mechanism: 'inertial',
    ports: STORE_PORTS('rotational'), parameters: [p('e', 'specific energy', 'J/kg', 1e3, 200e3, GENTA)], laws: ['energy.rotational', 'inertia.disc', 'flywheel.specific-energy'], invariants: ['energy per kilogram is bounded by the rotor material\'s strength over its density: e ≤ K σ/ρ'], source: GENTA,
  },
  {
    id: 'flywheel.disc', level: 'architecture', name: 'solid-disc flywheel on bearings', names: ['flywheel'], parent: 'store.energy.inertial', domain: 'rotational', mechanism: 'inertial', reversible: true, window: [K(-40), K(80)],
    ports: STORE_PORTS('rotational'), parameters: [p('K', 'shape factor', '-', DISC_K, DISC_K, GENTA), p('sf', 'safety factor on yield', '-', ROTOR_SF, ROTOR_SF, est('a working rotor at half its yield')), p('loss', 'self-discharge', '1/h', 0.01, 0.1, est('bearing and windage loss of a small unevacuated rotor'))],
    laws: ['flywheel.specific-energy', 'inertia.disc', 'energy.rotational', 'stress.hoop'], invariants: ['its speed is its converter\'s: a disc holds E = ¼ m r² ω²'], source: GENTA, member: (c, env) => flywheelMember('flywheel.disc', c, env),
  },
  {
    id: 'store.energy.elastic', level: 'mechanism', name: 'elastic storage', parent: 'store.energy', behavior: 'store', quantity: 'energy', domain: 'elastic', mechanism: 'elastic',
    ports: STORE_PORTS('elastic'), parameters: [p('e', 'specific energy', 'J/kg', 10, 2000, SHIGLEY)], laws: ['spring.energy', 'hooke', 'torsion.solid'], invariants: ['energy per volume is bounded by the allowable stress squared over the modulus'], source: SHIGLEY,
  },
  {
    id: 'spring.helical', level: 'architecture', name: 'helical steel spring', names: ['spring', 'coil spring'], parent: 'store.energy.elastic', domain: 'elastic', mechanism: 'elastic', reversible: true, window: [K(-40), K(120)],
    ports: STORE_PORTS('elastic'), parameters: [p('tau', 'allowable torsional stress', 'Pa', 0.45 * 1500e6, 0.45 * 2200e6, SHIGLEY)], laws: ['spring.energy', 'torsion.solid', 'spring.rate'], invariants: ['u = τ²/4G per unit volume of round wire in torsion'], source: SHIGLEY, member: (c) => springMember('spring.helical', c),
  },
  {
    id: 'store.energy.pneumatic', level: 'mechanism', name: 'compressed-gas storage', parent: 'store.energy', behavior: 'store', quantity: 'energy', domain: 'pneumatic', mechanism: 'pneumatic',
    ports: STORE_PORTS('pneumatic'), parameters: [p('e', 'specific energy', 'J/kg', 5e3, 100e3, est('vessel-limited compressed air, steel to composite')), p('eff', 'round-trip efficiency', '-', 0.3, 0.5, est('compression heat lost without recovery'))], laws: ['gas.isothermal-work', 'stress.hoop', 'hydrostatic'], invariants: ['the wall carries pressure × radius over its thickness: the vessel, not the gas, is the mass'], source: PHYSICS,
  },
  {
    id: 'vessel.cylindrical', level: 'architecture', name: 'thin-walled cylindrical vessel', names: ['air tank', 'receiver'], parent: 'store.energy.pneumatic', domain: 'pneumatic', mechanism: 'pneumatic', reversible: true, window: [K(-40), K(80)],
    ports: STORE_PORTS('pneumatic'), parameters: [p('sf', 'safety factor on yield', '-', VESSEL_SF, VESSEL_SF, est('code practice of 3.5 to 4 on strength'))], laws: ['stress.hoop', 'gas.isothermal-work'], invariants: ['σ = p r / t'], source: ROARK, member: (c) => vesselMember('vessel.cylindrical', c),
  },
  {
    id: 'store.energy.gravitational', level: 'mechanism', name: 'gravitational storage', parent: 'store.energy', behavior: 'store', quantity: 'energy', domain: 'gravitational', mechanism: 'gravitational',
    ports: STORE_PORTS('gravitational'), parameters: [p('e', 'specific energy', 'J/kg', g * 1, g * 500, PHYSICS)], laws: ['energy.potential', 'weight'], invariants: ['E = m g h: energy per kilogram is the drop, so the place sets it'], source: PHYSICS,
  },
  {
    id: 'mass.raised', level: 'architecture', name: 'raised mass on a hoist', names: ['gravity battery', 'weight drive'], parent: 'store.energy.gravitational', domain: 'gravitational', mechanism: 'gravitational', reversible: true,
    ports: STORE_PORTS('gravitational'), parameters: [], laws: ['energy.potential'], invariants: ['the drop available here bounds it'], source: PHYSICS, member: (c, env) => raisedMassMember('mass.raised', c, env),
  },
  {
    id: 'store.energy.thermal', level: 'mechanism', name: 'thermal storage', parent: 'store.energy', behavior: 'store', quantity: 'energy', domain: 'thermal', mechanism: 'thermal',
    ports: STORE_PORTS('thermal'), parameters: [p('e', 'specific energy', 'J/kg', 50e3, 400e3, PHYSICS)], laws: ['heat.capacity', 'carnot'], invariants: ['heat back to work is bounded by Carnot: 1 − T_cold/T_hot'], source: PHYSICS,
  },
  {
    id: 'reservoir.sensible', level: 'architecture', name: 'sensible-heat water reservoir', names: ['hot water tank', 'thermal store'], parent: 'store.energy.thermal', domain: 'thermal', mechanism: 'thermal', reversible: true, window: [K(1), K(90)],
    ports: STORE_PORTS('thermal'), parameters: [p('c', 'specific heat of water', 'J/kg K', 4186, 4186, PHYSICS)], laws: ['heat.capacity', 'carnot'], invariants: ['Q = m c ΔT'], source: PHYSICS, member: (c, env) => reservoirMember('reservoir.sensible', c, env),
  },
  {
    id: 'store.energy.chemical', level: 'mechanism', name: 'chemical storage', parent: 'store.energy', behavior: 'store', quantity: 'energy', domain: 'chemical', mechanism: 'chemical',
    ports: STORE_PORTS('chemical'), parameters: [p('e', 'specific energy', 'J/kg', 1e6, 120e6, PHYSICS)], laws: ['energy.electric', 'carnot'], invariants: ['the energy is in bonds: giving it back needs a reaction, taking it back a reverse one'], source: PHYSICS,
  },
  {
    id: 'fuel.hydrocarbon', level: 'architecture', name: 'hydrocarbon fuel in a tank', names: ['fuel tank', 'petrol', 'diesel'], parent: 'store.energy.chemical', domain: 'chemical', mechanism: 'chemical', reversible: false,
    ports: STORE_PORTS('chemical', 'hydrocarbon'), parameters: [p('e', 'lower heating value', 'J/kg', 42e6, 44e6, PHYSICS)], laws: ['carnot'], invariants: ['burnt once'], source: PHYSICS,
    member: (c) => byDensity('fuel.hydrocarbon', c, p('e', 'lower heating value', 'J/kg', 42e6, 44e6, PHYSICS), p('p', 'specific power', 'W/kg', 1e6, 1e7, est('a tank gives fuel as fast as a pump draws it')), 1, ['carnot'], false, 'hydrocarbon fuel (its engine is a converter, not stocked)'),
  },
  {
    id: 'hydrogen.tank', level: 'architecture', name: 'hydrogen in a pressure tank', names: ['hydrogen storage'], parent: 'store.energy.chemical', domain: 'chemical', mechanism: 'chemical', reversible: true, window: [K(-40), K(85)],
    ports: STORE_PORTS('chemical', 'hydrogen'), parameters: [p('e', 'specific energy of the tank', 'J/kg', 1.2e3 * WH, 2.0e3 * WH, est('5 to 6 % hydrogen by mass of a composite tank at 33.3 kWh/kg of hydrogen'))], laws: ['stress.hoop', 'energy.electric'], invariants: ['the tank is the mass; the gas is a twentieth of it'], source: PHYSICS,
    member: (c) => byDensity('hydrogen.tank', c, p('e', 'specific energy of the tank', 'J/kg', 1.2e3 * WH, 2.0e3 * WH, est('5 to 6 % hydrogen by mass of a composite tank')), p('p', 'specific power', 'W/kg', 1e5, 1e6, est('a tank gives gas as fast as its valve lets it')), 1, ['stress.hoop'], false, 'a composite hydrogen tank (none stocked here)'),
  },
  // ------------------------------------------------------------------------------------------------ transformations
  {
    id: 'convert.electrical.rotational', level: 'transformation', name: 'electromagnetic machine', names: ['motor', 'generator', 'DC machine'], parent: 'behavior.store', domain: 'electrical', mechanism: 'electromagnetic',
    transformation: { from: 'electrical', to: 'rotational', law: 'motor.torque', reversible: true },
    ports: [{ name: 'electrical', quantity: 'energy', domain: 'electrical', direction: 'inout' }, { name: 'shaft', quantity: 'energy', domain: 'rotational', direction: 'inout' }, { name: 'thermal_out', quantity: 'heat', domain: 'thermal', direction: 'out' }],
    parameters: [p('p', 'specific power', 'W/kg', 100, 400, est('the stocked DC machines')), p('eff', 'efficiency', '-', 0.6, 0.9, est('small DC machines at their rated point'))], laws: ['motor.torque', 'motor.back-emf', 'power.rotary'], invariants: ['torque is K_t I and back-emf K_t ω: it runs the same equations as a generator'], realizations: Object.keys(MOTORS), source: { cite: 'Hughes, Electric Motors and Drives, 4th ed., Newnes 2013', kind: 'textbook' },
    member: (c) => machineMember('convert.electrical.rotational', c),
  },
  {
    id: 'convert.rotational.translational', level: 'transformation', name: 'screw or winch', names: ['lead screw', 'winch', 'rack'], parent: 'behavior.store', domain: 'rotational', mechanism: 'inertial',
    transformation: { from: 'rotational', to: 'translational', law: 'screw.force', reversible: true },
    ports: [{ name: 'shaft', quantity: 'energy', domain: 'rotational', direction: 'inout' }, { name: 'stroke', quantity: 'energy', domain: 'translational', direction: 'inout' }],
    parameters: [p('eff', 'efficiency', '-', 0.3, 0.9, SHIGLEY)], laws: ['screw.force', 'screw.efficiency', 'capstan'], invariants: ['a steep, low-friction thread or a drum backdrives; a shallow one does not'], source: SHIGLEY,
    member: familyConverter('convert.rotational.translational', 200, 2000, ['screw.force'], 'a screw or winch'),
  },
  {
    id: 'convert.translational.elastic', level: 'transformation', name: 'spring loading', parent: 'behavior.store', domain: 'translational', mechanism: 'elastic',
    transformation: { from: 'translational', to: 'elastic', law: 'hooke', reversible: true },
    ports: [{ name: 'stroke', quantity: 'energy', domain: 'translational', direction: 'inout' }, { name: 'strain', quantity: 'energy', domain: 'elastic', direction: 'inout' }],
    parameters: [p('eff', 'efficiency', '-', 0.9, 0.99, est('a spring\'s hysteresis'))], laws: ['hooke', 'spring.energy'], invariants: ['F = k x'], source: SHIGLEY, member: familyConverter('convert.translational.elastic', 1e4, 1e5, ['hooke'], 'a spring\'s own ends'),
  },
  {
    id: 'convert.translational.gravitational', level: 'transformation', name: 'lifting a mass', parent: 'behavior.store', domain: 'translational', mechanism: 'gravitational',
    transformation: { from: 'translational', to: 'gravitational', law: 'energy.potential', reversible: true },
    ports: [{ name: 'stroke', quantity: 'energy', domain: 'translational', direction: 'inout' }, { name: 'height', quantity: 'energy', domain: 'gravitational', direction: 'inout' }],
    parameters: [p('eff', 'efficiency', '-', 0.9, 0.98, est('rope and drum friction'))], laws: ['energy.potential', 'weight'], invariants: ['work = weight × rise'], source: PHYSICS, member: familyConverter('convert.translational.gravitational', 1e4, 1e5, ['energy.potential'], 'the rope and drum'),
  },
  {
    id: 'convert.electrical.pneumatic', level: 'transformation', name: 'compressor and expander', names: ['compressor', 'air motor'], parent: 'behavior.store', domain: 'electrical', mechanism: 'pneumatic',
    transformation: { from: 'electrical', to: 'pneumatic', law: 'gas.isothermal-work', reversible: true },
    ports: [{ name: 'electrical', quantity: 'energy', domain: 'electrical', direction: 'inout' }, { name: 'gas', quantity: 'energy', domain: 'pneumatic', direction: 'inout' }, { name: 'thermal_out', quantity: 'heat', domain: 'thermal', direction: 'out' }],
    parameters: [p('p', 'specific power', 'W/kg', 50, 300, est('small piston compressors and air motors with their drive')), p('eff', 'round-trip efficiency', '-', 0.3, 0.5, est('compression heat lost'))], laws: ['gas.isothermal-work', 'motor.torque'], invariants: ['compressing warms the gas; the heat is the loss unless stored'], source: PHYSICS,
    member: familyConverter('convert.electrical.pneumatic', 50, 300, ['gas.isothermal-work'], 'a compressor with an expander'),
  },
  {
    id: 'convert.electrical.thermal', level: 'transformation', name: 'resistance heater', names: ['heater', 'element'], parent: 'behavior.store', domain: 'electrical', mechanism: 'thermal',
    transformation: { from: 'electrical', to: 'thermal', law: 'joule', reversible: false },
    ports: [{ name: 'electrical', quantity: 'energy', domain: 'electrical', direction: 'in' }, { name: 'heat', quantity: 'energy', domain: 'thermal', direction: 'out' }],
    parameters: [p('p', 'specific power', 'W/kg', 1000, 10000, est('an immersion element')), p('eff', 'efficiency', '-', 1, 1, PHYSICS)], laws: ['joule'], invariants: ['all of I²R is heat'], source: PHYSICS, member: familyConverter('convert.electrical.thermal', 1000, 10000, ['joule'], 'an immersion heater'),
  },
  {
    id: 'convert.thermal.electrical', level: 'transformation', name: 'heat engine and generator', names: ['heat engine', 'Stirling generator'], parent: 'behavior.store', domain: 'thermal', mechanism: 'thermal',
    transformation: { from: 'thermal', to: 'electrical', law: 'carnot', reversible: false },
    ports: [{ name: 'heat', quantity: 'energy', domain: 'thermal', direction: 'in' }, { name: 'electrical', quantity: 'energy', domain: 'electrical', direction: 'out' }, { name: 'heat_rejected', quantity: 'heat', domain: 'thermal', direction: 'out' }],
    parameters: [p('p', 'specific power', 'W/kg', 10, 100, est('small Stirling and steam sets')), p('eff', 'efficiency', '-', 0.05, 0.15, est('small engines on a 60 to 90 °C source: a third to a half of Carnot'))], laws: ['carnot'], invariants: ['η ≤ 1 − T_cold / T_hot'], source: PHYSICS,
    member: familyConverter('convert.thermal.electrical', 10, 100, ['carnot'], 'a small heat engine with its generator'),
  },
  {
    id: 'convert.hydrocarbon.electrical', level: 'transformation', name: 'engine and generator', names: ['generator set', 'genset', 'engine'], parent: 'behavior.store', domain: 'chemical', mechanism: 'thermal',
    transformation: { from: 'chemical', to: 'electrical', law: 'carnot', reversible: false },
    ports: [{ name: 'fuel', quantity: 'energy', domain: 'chemical', direction: 'in', species: 'hydrocarbon' }, { name: 'electrical', quantity: 'energy', domain: 'electrical', direction: 'out' }, { name: 'thermal_out', quantity: 'heat', domain: 'thermal', direction: 'out' }],
    parameters: [p('p', 'specific power', 'W/kg', 100, 500, est('small petrol generator sets')), p('eff', 'efficiency', '-', 0.2, 0.3, est('small spark-ignition engines with their generator'))], laws: ['carnot'], invariants: ['burns fuel with air: a quarter of its heat comes out as current'], source: PHYSICS,
    member: familyConverter('convert.hydrocarbon.electrical', 100, 500, ['carnot'], 'an engine with its generator'),
  },
  {
    id: 'convert.electrical.chemical', level: 'transformation', name: 'electrolyser', names: ['electrolyser'], parent: 'behavior.store', domain: 'electrical', mechanism: 'electrochemical',
    transformation: { from: 'electrical', to: 'chemical', law: 'energy.electric', reversible: false },
    ports: [{ name: 'electrical', quantity: 'energy', domain: 'electrical', direction: 'in' }, { name: 'gas', quantity: 'energy', domain: 'chemical', direction: 'out', species: 'hydrogen' }],
    parameters: [p('p', 'specific power', 'W/kg', 50, 200, est('small PEM electrolysers')), p('eff', 'efficiency', '-', 0.6, 0.75, est('PEM electrolysis'))], laws: ['energy.electric'], invariants: ['splits water at above 1.23 V per cell'], source: LINDEN,
    member: familyConverter('convert.electrical.chemical', 50, 200, ['energy.electric'], 'an electrolyser'),
  },
  {
    id: 'convert.chemical.electrical', level: 'transformation', name: 'fuel cell', names: ['fuel cell'], parent: 'behavior.store', domain: 'chemical', mechanism: 'electrochemical',
    transformation: { from: 'chemical', to: 'electrical', law: 'energy.electric', reversible: false },
    ports: [{ name: 'gas', quantity: 'energy', domain: 'chemical', direction: 'in', species: 'hydrogen' }, { name: 'electrical', quantity: 'energy', domain: 'electrical', direction: 'out' }, { name: 'thermal_out', quantity: 'heat', domain: 'thermal', direction: 'out' }],
    parameters: [p('p', 'specific power', 'W/kg', 100, 1000, est('PEM fuel cell stacks with their balance of plant')), p('eff', 'efficiency', '-', 0.4, 0.6, LINDEN)], laws: ['energy.electric'], invariants: ['less than the bond energy comes out as current: the rest is heat'], source: LINDEN,
    member: familyConverter('convert.chemical.electrical', 100, 1000, ['energy.electric'], 'a fuel cell stack'),
  },
];

export const manifoldById = (id: string): Manifold | undefined => MANIFOLDS.find((m) => m.id === id);
export const childrenOf = (id: string): Manifold[] => MANIFOLDS.filter((m) => m.parent === id && !m.transformation);
/** Every manifold under one, by refinement (transformations are their own branch). */
export function descendantsOf(id: string): Manifold[] {
  const out: Manifold[] = [];
  const walk = (x: string) => { for (const c of childrenOf(x)) { out.push(c); walk(c.id); } };
  walk(id);
  return out;
}
/** The refinement path from the root to a manifold. */
export function lineage(id: string): Manifold[] {
  const out: Manifold[] = [];
  for (let m = manifoldById(id); m; m = m.parent ? manifoldById(m.parent) : undefined) out.unshift(m);
  return out;
}
/** The transformation manifolds that turn one domain into another, either way when reversible. */
export function transformations(from: Manifold['domain'], to: Manifold['domain']): { manifold: Manifold; forward: boolean }[] {
  const out: { manifold: Manifold; forward: boolean }[] = [];
  for (const m of MANIFOLDS) {
    if (!m.transformation) continue;
    if (m.transformation.from === from && m.transformation.to === to) out.push({ manifold: m, forward: true });
    else if (m.transformation.reversible && m.transformation.from === to && m.transformation.to === from) out.push({ manifold: m, forward: false });
  }
  return out;
}
/** A manifold by one of the names people use, never by its identity. */
export function manifoldByName(word: string): Manifold | undefined {
  const w = word.toLowerCase();
  return MANIFOLDS.find((m) => m.names?.some((n) => n.toLowerCase() === w) || m.name.toLowerCase() === w);
}
