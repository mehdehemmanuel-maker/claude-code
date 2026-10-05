// A permanent-magnet motor, designed from what it must give (docs/NEXUS-FROM-REALITY.md, section 28): a torque at a
// speed, from a supply. It is designed outward from the air gap, every size from the one before:
//
//   rotor        T = 2 σ V_r: the shear the gap carries over the rotor's surface, so V_r = T / 2σ, L = a D
//   magnets      B_g = B_r l_m / (l_m + μ_r g): the gap flux a magnet of thickness l_m drives across the gap g
//   teeth        b_t = B_g τ_s / B_design: wide enough that no tooth carries more flux than its steel is designed to
//   yoke         t_y = Φ / (2 B_design L): the pole's flux, split two ways round the back
//   turns        E_ph = 4.44 f N k_w Φ, with the line voltage's peak at most 85 % of the supply at full speed
//   current      3 E_ph I = T ω: what the torque asks of each phase, at that speed
//   wire         the copper area that carries I at the current density still air allows, as a gauge that exists
//   slots        deep enough to hold both coil sides at the fill machine winding reaches
//   heat         P = 3 I² R(T_w) + iron loss; ΔT = P / (h A) from the housing to still air, winding and magnet
//   shaft        τ = 16 T / (π d³) at a third of its steel's yield in shear, and as wide as what it drives
//   bearings     the smallest deep groove bearing whose bore takes the shaft; housing, end caps and their screws
//
// 12 slots and 10 poles, a concentrated winding (k_w = 0.933). Where a check fails (a winding or magnet too hot, slots
// too deep for the bore), the remedy is the rule's: a longer stack, more rotor for the same torque, and it is designed
// again. Everything it is made of is a part with a matter, a size, a place and the law that decided it.

import { MATERIALS } from '../../data/materials';
import { CLEARANCE_HOLE_MEDIUM } from '../../engineering/threads';
import { part, type Assembly, type Flaw, type Part, type Value } from './part';
import { AIR_GAP, AWG_SIZES, awgDiameter, BALL_BEARINGS, COPPER, CURRENT_DENSITY, ELECTRICAL_STEEL, GAP_SHEAR, NDFEB_GRADES, NDFEB_N42, SLOT_ASPECT, SLOT_FILL, SOCKET_HEAD, stockScrew, WINDING_CLASS, WINDING_FACTOR_12S10P } from './stock';

const mm = 1e-3;
const mat = (id: string) => MATERIALS.find((m) => m.id === id)!;

export interface MotorAsk { T: number; w: number; V: number; shaftAtLeast: number; ambient: number; aspect?: number; name: string; id: string; grade?: string; paths?: number; layout?: number }
/** Slot and pole layouts with concentrated windings, from many poles (slow, low iron frequency per torque) to few; their winding factors. */
export const LAYOUTS = [{ Q: 12, poles: 10, kw: 0.933 }, { Q: 6, poles: 4, kw: 0.866 }, { Q: 3, poles: 2, kw: 0.866 }];
export interface Motor extends Assembly {
  ask: MotorAsk;
  /** What the drive and the wiring need of it. */
  electrical: { I: number; R: number; Kt: number; phases: 3; awg: number; strands: number; Pcu: number; Pfe: number };
  mech: { shaft: number; length: number; diameter: number; flangePCD: number; flangeScrew: string; mass: number };
  flaws: Flaw[];
}

export function designMotor(ask: MotorAsk): Motor {
  const a = ask.aspect ?? 1;
  const vals: Value[] = [];
  const v = (name: string, value: number, unit: string, law: string) => { vals.push({ name, value, unit, law }); return value; };
  const lay = LAYOUTS[ask.layout ?? 0]!;
  const sigma = GAP_SHEAR.value, Q = lay.Q, poles = lay.poles, kw = Q === 12 ? WINDING_FACTOR_12S10P.value : lay.kw, Bd = ELECTRICAL_STEEL.Bdesign, g = AIR_GAP.value;
  const grade = NDFEB_GRADES.find((x) => x.id === (ask.grade ?? 'N42'))!, paths = ask.paths ?? 1;

  // the shaft first: it bounds the rotor from inside
  const steel = mat('steel.1018-cd'), tauAllow = (0.577 * steel.yield) / 3;
  const dTwist = (16 * ask.T / (Math.PI * tauAllow)) ** (1 / 3);
  const dNeed = Math.max(dTwist, ask.shaftAtLeast, 3 * mm);
  const bearing = BALL_BEARINGS.find((b) => b.d >= dNeed - 1e-9) ?? BALL_BEARINGS.at(-1)!;
  const ds = v('shaft diameter', bearing.d, 'm', `τ = 16T/(πd³) at a third of 1018 steel's shear yield gives ${(dTwist * 1e3).toFixed(2)} mm; what it drives needs ${(ask.shaftAtLeast * 1e3).toFixed(1)} mm; the ${bearing.id} bearing's bore`);

  // the rotor: the gap's shear over its surface gives the torque
  const lm = v('magnet thickness', Math.max(1.5 * mm, 3 * g), 'm', 'at least three air gaps, and no thinner than a sintered magnet is cut (1.5 mm)');
  const Vr = ask.T / (2 * sigma);
  const DrMin = ds + 2 * 2 * mm + 2 * lm;
  const Dr = v('rotor diameter', Math.max(DrMin, 12 * mm, ((4 * Vr) / (Math.PI * a)) ** (1 / 3)), 'm', `T = 2σV_r with σ = ${sigma / 1e3} kPa (${GAP_SHEAR.source}) and L = ${a.toFixed(2)} D; no less than the shaft, 2 mm of back iron and the magnets`);
  const L = v('stack length', Math.max(8 * mm, a * Dr), 'm', `L = ${a.toFixed(2)} D`);
  const Bg = v('gap flux density', (grade.Br * lm) / (lm + NDFEB_N42.muR * g), 'T', `B_g = B_r l_m/(l_m + μ_r g), ${grade.id}: B_r ${grade.Br} T, gap ${g * 1e3} mm`);
  const Db = Dr + 2 * g;
  const tauS = (Math.PI * Db) / Q, tauP = (Math.PI * Db) / poles;
  const bt = v('tooth width', (Bg * tauS) / Bd, 'm', `b_t = B_g τ_s / ${Bd} T: no tooth past its steel's design flux`);
  const Phi = (2 / Math.PI) * Bg * tauP * L;
  const ty = v('yoke thickness', Math.max(1.5 * mm, Phi / (2 * Bd * L)), 'm', 't_y = Φ/(2 B_design L): a pole\'s flux split two ways round the back');

  // the winding: turns from the voltage, current from the torque
  const f = (poles / 2) * (ask.w / (2 * Math.PI));
  const Eph = (0.85 * ask.V) / Math.sqrt(6);
  // with `paths` parallel paths, a phase's four coils are in `paths` parallel groups: fewer series turns, more current
  const series = Q / 3 / paths;
  const NcIdeal = Eph / (4.44 * f * kw * Phi) / series;
  // turns: the fewer of what the supply's voltage allows at full speed, and what slots no deeper than five of their
  // widths hold. Fewer turns than the voltage allows only means more current, and the drive's switching brings the
  // voltage down
  const rb = Db / 2;
  const slotWidth = (h: number) => (Math.PI * 2 * (rb + h / 2)) / Q - bt;
  const slotArea = (h: number) => (Math.PI * ((rb + h) ** 2 - rb ** 2) - Q * bt * h) / Q;
  let hsMax = 3 * mm; while (hsMax < 4 * Db && hsMax / slotWidth(hsMax) < SLOT_ASPECT.value) hsMax += 0.1 * mm;
  // the conductor of a coil: the thinnest single gauge that carries it, no thicker than 16 AWG (stiffer wire does not
  // wind round a small tooth), and past that, strands of 16 AWG wound in hand
  const area = (n: number) => (Math.PI * awgDiameter(n) ** 2) / 4;
  const wireFor = (current: number) => {
    const Aw = current / paths / CURRENT_DENSITY.value;
    const single = AWG_SIZES.filter((x) => x >= 16).find((x) => area(x) >= Aw);
    if (single !== undefined) return { n: single, d: awgDiameter(single), strands: 1 };
    const strands = Math.ceil(Aw / area(16));
    return { n: 16, d: awgDiameter(16) * Math.sqrt(strands), strands };
  };
  const currentAt = (nc: number) => (ask.T * ask.w) / (3 * 4.44 * f * nc * series * kw * Phi);
  const copperNeed = (nc: number) => (2 * nc * Math.PI * (wireFor(currentAt(nc)).d * 1.08) ** 2) / 4 / SLOT_FILL.value;
  // and no more turns than make the current fill even the thinnest wire at its current density: more only adds copper
  const floorI = 0.5 * CURRENT_DENSITY.value * area(AWG_SIZES[0]!) * paths;
  let nc = Math.max(1, Math.floor(NcIdeal));
  while (nc > 1 && currentAt(nc) < floorI) nc = Math.max(1, Math.floor(nc * 0.9));
  while (nc > 1 && copperNeed(nc) > slotArea(hsMax)) nc--;
  const Nc = v('turns per coil', nc, '1', `the fewer of what ${ask.V} V allows at ${(ask.w * 60 / (2 * Math.PI)).toFixed(0)} rpm (E_ph = 4.44 f N k_w Φ, line peak at 85 %: ${NcIdeal.toFixed(1)}) and what slots at most ${SLOT_ASPECT.value} widths deep hold; ${series} coil${series > 1 ? 's' : ''} in series in each of ${paths} parallel path${paths > 1 ? 's' : ''} a phase`);
  const Nph = Nc * series;
  const EphReal = 4.44 * f * Nph * kw * Phi;
  const I = v('phase current', (ask.T * ask.w) / (3 * EphReal), 'A', '3 E_ph I = T ω: the power the torque takes at speed');
  const { n: awg, strands } = wireFor(I), AwBare = strands * area(awg);
  v('wire', awg, 'AWG', `the thinnest gauge of at least I/(paths J), J = ${CURRENT_DENSITY.value / 1e6} A/mm²${strands > 1 ? `, as ${strands} strands in hand` : ''}: ${(awgDiameter(awg) * 1e3).toFixed(3)} mm copper, class F enamel`);
  const J = v('current density', I / paths / AwBare, 'A/m^2', 'the phase current over its paths and its copper');
  const need = copperNeed(Nc);
  let hs = 3 * mm;
  while (slotArea(hs) < need && hs < 2 * Db) hs += 0.1 * mm;
  v('slot depth', hs, 'm', `both coil sides at ${SLOT_FILL.value} fill: ${(need * 1e6).toFixed(2)} mm² a slot`);
  const Ds = v('stator outer diameter', Db + 2 * hs + 2 * ty, 'm', 'bore, slots and yoke');
  const hew = 0.5 * tauS + 1 * mm;
  const lt = 2 * L + 2 * 1.2 * tauS;

  // heat: from the windings and the iron, out through the housing to still air
  const screw = Ds < 25 * mm ? 'M2' : Ds < 40 * mm ? 'M2_5' : Ds < 70 * mm ? 'M3' : 'M4';
  const sd = SOCKET_HEAD[screw]!.d;
  const wall = v('housing wall', Math.max(1.5 * mm, sd + 1.2 * mm), 'm', `room for ${screw.replace('_', '.')} screws tapped into its ends, with metal round them`);
  const OD = v('housing outer diameter', Ds + 2 * wall, 'm', 'the stator, pressed into its housing');
  const tcap = bearing.B + 1.5 * mm;
  const Lh = v('housing length', L + 2 * hew + 2 * tcap, 'm', 'stack, end turns, and two end caps each a bearing\'s width and 1.5 mm');
  const surface = Math.PI * OD * Lh + (2 * Math.PI * OD ** 2) / 4, h = 15;
  const ironMass = ELECTRICAL_STEEL.density * L * (Math.PI * ((Ds / 2) ** 2 - (Ds / 2 - ty) ** 2) + Q * bt * hs);
  const Pfe = v('iron loss', ELECTRICAL_STEEL.lossWkgAt1T5_50Hz * ironMass * (Bg / 1.5) ** 2 * (f / 50) ** 1.5, 'W', 'Steinmetz: p ∝ B² f^1.5 from 2.5 W/kg at 1.5 T, 50 Hz');
  let Tw = ask.ambient + 20;
  let R = 0, Pcu = 0;
  for (let it = 0; it < 30; it++) {
    R = (COPPER.rho * Nph * lt) / AwBare / paths * (1 + COPPER.alpha * (Tw - 20));
    Pcu = 3 * I * I * R;
    Tw = ask.ambient + 1.25 * (Pcu + Pfe) / (h * surface);
  }
  v('phase resistance (hot)', R, 'Ω', 'R = ρ N l_turn / A, at the winding\'s own temperature (α = 0.00393 /K)');
  v('copper loss', Pcu, 'W', 'P = 3 I² R');
  const Thousing = ask.ambient + (Pcu + Pfe) / (h * surface);
  v('winding temperature', Tw, 'degC', `ΔT = P/(hA) to still air, h ≈ ${h} W/m²K (convection and radiation, an estimate), a quarter more inside the winding`);
  v('magnet temperature', Thousing, 'degC', 'the rotor at about the housing\'s temperature');
  const Kt = ask.T / (3 * I);

  // flaws, each with the remedy the rules hold
  const flaws: Flaw[] = [];
  // a remedy reads what causes the heat: iron loss grows with frequency, so fewer poles; copper loss falls with more
  // rotor, so a longer stack; only the magnets too hot, a grade that holds hotter
  const heatRemedy = Pfe > Pcu && (ask.layout ?? 0) < LAYOUTS.length - 1 ? 'fewer poles' : 'lengthen the stack';
  if (Tw > WINDING_CLASS.maxC) flaws.push({ check: 'winding-class', where: ask.id, says: `the winding runs at ${Tw.toFixed(0)} °C, past ${WINDING_CLASS.id}; ${Pfe > Pcu ? 'the iron' : 'the copper'} makes most of the heat`, law: 'ΔT = P/(hA)', value: Tw, limit: WINDING_CLASS.maxC, remedy: heatRemedy });
  if (Thousing > grade.maxC) flaws.push({ check: 'magnet-grade', where: ask.id, says: `the magnets run at ${Thousing.toFixed(0)} °C, past ${grade.id}'s ${grade.maxC} °C`, law: 'ΔT = P/(hA)', value: Thousing, limit: grade.maxC, remedy: grade.id === NDFEB_GRADES.at(-1)!.id ? heatRemedy : 'a magnet grade that holds hotter' });
  if (J > CURRENT_DENSITY.value * 1.05) flaws.push({ check: 'current-density', where: ask.id, says: `the winding carries ${(J / 1e6).toFixed(1)} A/mm², past ${CURRENT_DENSITY.value / 1e6}`, law: 'J = I / A', value: J, limit: CURRENT_DENSITY.value, remedy: paths < Q / 3 ? 'coils in parallel paths' : 'lengthen the stack' });
  if (NcIdeal < 1) flaws.push({ check: 'turns', where: ask.id, says: `fewer than one turn a coil holds the voltage at this speed (${NcIdeal.toFixed(2)})`, law: 'E = 4.44 f N k_w Φ', value: NcIdeal, limit: 1, remedy: paths < Q / 3 ? 'coils in parallel paths' : 'shorten the stack' });
  if (hs > hsMax + 1e-9) flaws.push({ check: 'slots', where: ask.id, says: `one turn a coil needs slots ${(hs / slotWidth(hs)).toFixed(1)} of their widths deep`, law: 'slot area at fill, depth over width', value: hs, limit: hsMax, remedy: 'lengthen the stack' });

  // ---- its parts, in its own frame: axis along +z, the shaft out of the front --------------------------------------
  const P: Part[] = [];
  const cat = 'motion/actuators/pm-motor';
  const al = mat('aluminum.6061-t6'), cu = COPPER.density;
  const add = (p: Omit<Part, 'mass' | 'category'> & { category?: string; mass?: number }, density: number) => P.push(part({ category: cat, ...p }, density));
  const ext = 15 * mm;
  add({ id: `${ask.id}/shaft`, name: 'shaft', material: 'steel.1018-cd', shape: { kind: 'round', r: ds / 2, length: Lh + ext + 3 * mm, axis: 'z' }, at: [0, 0, (ext - 3 * mm) / 2], colour: 0xb0b8c0, values: vals.filter((x) => x.name === 'shaft diameter') }, steel.density);
  add({ id: `${ask.id}/rotor-iron`, name: 'rotor back iron', material: 'steel.1018-cd', shape: { kind: 'round', r: Dr / 2 - lm, length: L, axis: 'z', bore: ds }, at: [0, 0, 0], colour: 0x6b7480, values: [] }, steel.density);
  for (let i = 0; i < poles; i++) {
    const th = ((i + 0.5) * 2 * Math.PI) / poles, rm = Dr / 2 - lm / 2;
    add({ id: `${ask.id}/magnet-${i + 1}`, name: `magnet ${i + 1}, ${grade.id} (${i % 2 ? 'S' : 'N'} out)`, material: `NdFeB ${grade.id}`, category: cat, shape: { kind: 'block', size: [lm, (0.85 * Math.PI * Dr) / poles, L] }, at: [Math.cos(th) * rm, Math.sin(th) * rm, 0], turn: { axis: 'z', angle: th }, colour: i % 2 ? 0x3949ab : 0xc62828, values: vals.filter((x) => x.name === 'gap flux density' || x.name === 'magnet thickness') }, NDFEB_N42.density);
  }
  add({ id: `${ask.id}/stator-yoke`, name: 'stator yoke (laminated)', material: 'M19 electrical steel', shape: { kind: 'round', r: Ds / 2, length: L, axis: 'z', bore: Ds - 2 * ty }, at: [0, 0, 0], colour: 0x546e7a, values: vals.filter((x) => x.name === 'yoke thickness' || x.name === 'stator outer diameter') }, ELECTRICAL_STEEL.density);
  for (let i = 0; i < Q; i++) {
    const th = (i * 2 * Math.PI) / Q, rt = rb + hs / 2;
    add({ id: `${ask.id}/tooth-${i + 1}`, name: `stator tooth ${i + 1}`, material: 'M19 electrical steel', shape: { kind: 'block', size: [hs, bt, L] }, at: [Math.cos(th) * rt, Math.sin(th) * rt, 0], turn: { axis: 'z', angle: th }, colour: 0x607d8b, values: vals.filter((x) => x.name === 'tooth width' || x.name === 'slot depth') }, ELECTRICAL_STEEL.density);
    const coilT = Math.max(0.4 * mm, (tauS * (rb + hs / 2) / rb - bt) * 0.42);
    const phase = ['A', 'B', 'C'][Math.floor(i / 2) % 3]!;
    add({ id: `${ask.id}/coil-${i + 1}`, name: `coil ${i + 1}, phase ${phase}: ${Nc} turns of ${strands > 1 ? `${strands} × ` : ''}AWG ${awg}`, material: 'copper (class F enamelled magnet wire)', shape: { kind: 'block', size: [hs * 0.85, bt + 2 * coilT, L + 2 * hew * 0.8] }, at: [Math.cos(th) * (rb + hs * 0.55), Math.sin(th) * (rb + hs * 0.55), 0], turn: { axis: 'z', angle: th }, colour: 0xd08a3c, values: vals.filter((x) => ['turns per coil', 'wire', 'phase current'].includes(x.name)), mass: Nc * lt * AwBare * cu }, cu);
  }
  add({ id: `${ask.id}/housing`, name: 'housing', material: 'aluminum.6061-t6', shape: { kind: 'round', r: OD / 2, length: Lh - 2 * tcap, axis: 'z', bore: OD - 2 * wall }, at: [0, 0, 0], colour: 0x9aa6b2, values: vals.filter((x) => ['housing wall', 'housing outer diameter', 'housing length'].includes(x.name)) }, al.density);
  for (const [side, z] of [['front', Lh / 2 - tcap / 2], ['rear', -Lh / 2 + tcap / 2]] as const) {
    add({ id: `${ask.id}/cap-${side}`, name: `${side} end cap`, material: 'aluminum.6061-t6', shape: { kind: 'round', r: OD / 2, length: tcap, axis: 'z', bore: ds + 1 * mm }, at: [0, 0, z], colour: 0xb7c2cc, values: [{ name: 'thickness', value: tcap, unit: 'm', law: `the ${bearing.id} bearing's width and 1.5 mm` }] }, al.density);
    add({ id: `${ask.id}/bearing-${side}`, name: `${side} bearing ${bearing.id} (${bearing.d * 1e3}×${bearing.D * 1e3}×${bearing.B * 1e3} mm)`, material: 'steel.52100', category: 'motion/guides/bearings', shape: { kind: 'round', r: bearing.D / 2, length: bearing.B, axis: 'z', bore: bearing.d }, at: [0, 0, z], colour: 0xdfe4ea, values: [{ name: 'bore', value: bearing.d, unit: 'm', law: 'the smallest ISO 15 bearing that takes the shaft' }] }, mat('steel.52100').density);
    // four screws through each cap into the housing's tapped ends: a cap's thickness and 1.5 diameters of thread
    const len = stockScrew(tcap + 1.5 * sd)!, pcd = (Ds + OD) / 2;
    for (let k = 0; k < 4; k++) {
      const th = Math.PI / 4 + (k * Math.PI) / 2;
      add({ id: `${ask.id}/cap-screw-${side}-${k + 1}`, name: `${screw.replace('_', '.')}×${(len * 1e3).toFixed(0)} socket head cap screw (ISO 4762), ${side} cap`, material: 'steel class 8.8', category: 'structure/fasteners/screws', shape: { kind: 'screw', size: screw, length: len, axis: 'z', head: side === 'front' ? 1 : -1 }, at: [Math.cos(th) * pcd / 2, Math.sin(th) * pcd / 2, side === 'front' ? Lh / 2 - len / 2 : -Lh / 2 + len / 2], colour: 0x2b2b2b, values: [{ name: 'length', value: len, unit: 'm', law: `the cap (${(tcap * 1e3).toFixed(1)} mm) and 1.5 d of thread engaged in aluminium, as a stocked length` }, { name: 'clearance hole', value: CLEARANCE_HOLE_MEDIUM[screw.replace('_', '.')] ?? sd * 1.1, unit: 'm', law: 'ISO 273 medium clearance' }] }, 7850);
    }
  }
  // the encoder its position is read through: a diametral magnet on the shaft's rear end and a sensor board facing it
  add({ id: `${ask.id}/encoder-magnet`, name: 'diametral encoder magnet 6×2.5 mm', material: 'NdFeB N42', category: 'sensing/position', shape: { kind: 'round', r: 3 * mm, length: 2.5 * mm, axis: 'z' }, at: [0, 0, -Lh / 2 - 1.5 * mm], colour: 0x8e24aa, values: [] }, NDFEB_N42.density);
  add({ id: `${ask.id}/encoder-board`, name: 'magnetic encoder board (12-bit, 4096 counts a turn)', material: 'FR4', category: 'sensing/position', shape: { kind: 'round', r: Math.min(OD / 2 - 1 * mm, 14 * mm), length: 1.6 * mm, axis: 'z' }, at: [0, 0, -Lh / 2 - 5 * mm], colour: 0x1b5e20, values: [] }, 1850);
  const mass = P.reduce((s, x) => s + x.mass, 0);
  const flangePCD = 0.7 * OD, flangeScrew = screw;
  return {
    id: ask.id, name: ask.name, category: cat, from: ask.id, parts: P, values: vals, ask, flaws,
    electrical: { I, R, Kt, phases: 3, awg, strands, Pcu, Pfe },
    mech: { shaft: ds, length: Lh, diameter: OD, flangePCD, flangeScrew, mass },
  };
}

/** Design, find the flaws, apply their remedies, design again: until it holds, or the remedies run out. */
export interface MotorRound { aspect: number; grade: string; paths: number; layout: number; flaws: Flaw[]; remedy: string | null }
export function motorFor(ask: MotorAsk, rounds = 16): { motor: Motor; history: MotorRound[] } {
  let aspect = ask.aspect ?? 1, grade = ask.grade ?? 'N42', paths = ask.paths ?? 1, layout = ask.layout ?? 0;
  const history: MotorRound[] = [];
  // the remedies in the order they cost least: a hotter grade, then the heat's own remedy, then the rest
  const order = ['a magnet grade that holds hotter', 'fewer poles', 'coils in parallel paths', 'lengthen the stack', 'shorten the stack'];
  for (let r = 0; r < rounds; r++) {
    const m = designMotor({ ...ask, aspect, grade, paths, layout });
    const remedy = m.flaws.map((f) => f.remedy).filter((x): x is string => !!x).sort((a, b) => order.indexOf(a) - order.indexOf(b))[0] ?? null;
    history.push({ aspect, grade, paths, layout, flaws: m.flaws, remedy });
    if (!m.flaws.length) return { motor: m, history };
    if (remedy === 'fewer poles') layout += 1;
    else if (remedy === 'lengthen the stack') aspect *= 1.3;
    else if (remedy === 'shorten the stack') aspect /= 1.3;
    else if (remedy === 'a magnet grade that holds hotter') grade = NDFEB_GRADES[NDFEB_GRADES.findIndex((x) => x.id === grade) + 1]!.id;
    else if (remedy === 'coils in parallel paths') paths = paths === 1 ? 2 : 4;
    else return { motor: m, history };
  }
  return { motor: designMotor({ ...ask, aspect, grade, paths, layout }), history };
}
