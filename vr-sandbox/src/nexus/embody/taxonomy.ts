// What realization knows, ordered: domains, their categories and subcategories, and for each the principles it holds
// and the laws that decide its parts. A part is filed under the subcategory that made it, a check under the principle
// it applies, so what was built can be read back as what was known. The tree is data: it grows as embodiment learns
// another kind of part, and nothing here is about any one machine.

import { GEOMETRY } from './geometry';

export interface Principle { id: string; says: string; law: string }
export interface Node {
  id: string; name: string; says: string; principles: Principle[]; children: Node[];
  /** What in Nexus makes or measures it; absent, it is known by its name and its law only (a gap to fill). */
  made?: string;
}

const n = (id: string, name: string, says: string, principles: Principle[] = [], children: Node[] = []): Node => ({ id, name, says, principles, children });
const p = (id: string, says: string, law: string): Principle => ({ id, says, law });

export const TAXONOMY: Node[] = [
  n('structure', 'Structure', 'what holds everything where it must be, against every load on it', [
    p('stiff', 'every member bends less, under its worst load, than its share of the tolerance', 'δ = F L³ / (48 E I), simply supported at the middle'),
  ], [
    n('structure/frame', 'Frames', 'members that carry load paths to the ground', [p('frame-encloses', 'a frame closes around every axis it carries, so each load returns through it', 'statics: ΣF = 0, ΣM = 0')], [
      n('structure/frame/profile', 'Slotted profiles', 'aluminium sections with slots that take T-nuts anywhere along them'),
    ]),
    n('structure/joints', 'Joints', 'how parts meet and stay met', [p('engage', 'a screw in aluminium engages at least 1.5 of its diameters of thread', 'thread strip: the nut matter\'s shear over the engaged length (ISO 898-1, VDI 2230)')], [
      n('structure/joints/bolted', 'Bolted joints', 'clamped by preload'),
      n('structure/joints/brackets', 'Brackets', 'corner plates that square two members'),
    ]),
    n('structure/fasteners', 'Fasteners', 'screws, nuts and washers that exist in stock', [p('stock', 'only sizes and lengths a standard defines', 'ISO 4762, ISO 4032, ISO 7089')], [
      n('structure/fasteners/screws', 'Socket head cap screws', 'ISO 4762'), n('structure/fasteners/nuts', 'Nuts and washers', 'ISO 4032, ISO 7089'),
    ]),
  ]),
  n('motion', 'Motion', 'what makes things move as wanted, and only as wanted', [
    p('margin', 'every drive gives at least half again the force its worst move asks', 'F = m a + μ m g'),
  ], [
    n('motion/actuators', 'Actuators', 'conversions of charge into motion', [
      p('gap-shear', 'a motor\'s torque is the shear its air gap carries over the rotor\'s surface', 'T = 2 σ V_rotor'),
      p('winding-class', 'a winding runs no hotter than its insulation class', 'ΔT = P_loss / (h A), against IEC 60085'),
      p('magnet-grade', 'a magnet runs no hotter than its grade holds its strength at', 'the grade\'s maximum working temperature'),
      p('saturation', 'no iron is asked to carry more flux than it is designed to', 'B_tooth = B_gap · pitch / tooth width ≤ B_design'),
      p('shaft-twist', 'a shaft twists at a third of the stress its steel yields at, or less', 'τ = 16 T / (π d³)'),
    ], [
      n('motion/actuators/pm-motor', 'Permanent-magnet motors', 'a magnet rotor in a slotted, wound stator, commutated electronically'),
    ]),
    n('motion/transmission', 'Transmissions', 'what carries a motor\'s motion to where it is wanted', [
      p('self-lock', 'an axis against gravity holds itself when its power is gone: its screw\'s lead angle below its friction angle', 'tan λ < μ / cos(α/2)'),
      p('belt-tension', 'a belt is tensioned past the most force its drive passes, so no tooth jumps', 'T₀ ≥ 1.5 F'),
    ], [
      n('motion/transmission/belt', 'Timing belts and pulleys', 'GT2'), n('motion/transmission/screw', 'Lead screws and nuts', 'ISO 2904 trapezoidal'), n('motion/transmission/coupling', 'Couplings', 'joining shafts of two diameters'),
    ]),
    n('motion/guides', 'Guides', 'what lets a part move one way and holds it in every other', [
      p('racking', 'bearings on a carriage are spaced at least twice their own length, so it does not rack', 'the binding ratio: drive offset over bearing spacing below one half'),
    ], [
      n('motion/guides/shafts', 'Shafts and linear bushings', 'hardened round shafts, LM..UU'), n('motion/guides/bearings', 'Rolling bearings', 'ISO 15 deep groove'),
    ]),
  ]),
  n('thermal', 'Thermal', 'where heat is made, held and sent', [
    p('watt-density', 'a heater gives no more power per area of its sheath than the fit carries away', 'P / (π d L) ≤ the fit\'s watt density'),
  ], [
    n('thermal/heating', 'Heating', 'resistive heat, in a block that spreads it', [], [n('thermal/heating/cartridge', 'Cartridge heaters', 'a resistance coil in a sheath'), n('thermal/heating/block', 'Heater blocks', 'aluminium that holds and spreads it')]),
    n('thermal/cooling', 'Cooling', 'fins and air that take heat away'),
  ]),
  n('interconnect', 'Interconnect', 'every path charge takes between parts, and everything that carries, names, joins, guards and protects it', [
    p('ampacity', 'a conductor carries no more than heats it to its insulation\'s rating', 'I² R\' = h π D ΔT'),
    p('drop', 'a supply arrives within 3 % of what left the source', 'ΔV = 2 ρ L I / A'),
    p('earth-colour', 'the protective conductor is green-and-yellow, and no other conductor is', 'IEC 60445'),
    p('bend', 'a cable that flexes bends at no less than ten of its diameters', 'cable carrier makers\' rule for continuous flexing'),
    p('separate', 'power and signal run apart, each in its own bundle', 'coupling falls with separation'),
  ], [
    n('interconnect/conductors', 'Conductors', 'copper of a gauge chosen by current and drop', [], [n('interconnect/conductors/awg', 'Gauges', 'AWG by ASTM B258'), n('interconnect/conductors/stranding', 'Stranding', 'fine strands where it flexes')]),
    n('interconnect/insulation', 'Insulation', 'PVC, silicone, PTFE by the temperature along its route'),
    n('interconnect/identification', 'Identification', 'colour by function, by standard; labels at both ends'),
    n('interconnect/terminations', 'Terminations', 'connectors rated past the current, ferrules on stranded ends, crimps'),
    n('interconnect/containment', 'Containment', 'cable carriers across moving axes, sleeving, ties, strain relief, conduit'),
    n('interconnect/protection', 'Protection', 'fuses sized between the load and the conductor, earthing of exposed metal', [p('fuse', 'a fuse opens below what its conductor carries and above what its load draws', '1.25 I_load ≤ I_fuse ≤ I_conductor')]),
  ]),
  n('circuits', 'Circuits', 'what turns supply into the right current at the right time', [], [
    n('circuits/power', 'Power conversion', 'mains to a safe low voltage', [p('headroom', 'a supply is rated at least a quarter above the most its loads draw at once', 'P_rated ≥ 1.25 ΣP')]),
    n('circuits/switching', 'Switching', 'transistors that open and close loads'),
    n('circuits/sensing', 'Sensing front-ends', 'dividers and amplifiers between a sensor and a converter', [p('divider', 'a divider is most sensitive where its fixed resistor equals the sensor\'s resistance there', 'd(V)/d(R) is largest at R_fixed = R_sensor')]),
    n('circuits/prototyping', 'Prototyping', 'breadboards: a circuit tried before it is made'),
  ]),
  n('sensing', 'Sensing', 'what tells the machine where and how hot it is', [p('resolve', 'a sensor resolves finer than what it must hold', 'counts per travel ≥ travel / resolution')], [
    n('sensing/position', 'Position', 'encoders and limit switches'), n('sensing/temperature', 'Temperature', 'thermistors'),
  ]),
  n('control', 'Control', 'what decides', [], [n('control/controller', 'Controllers', 'the board that runs it'), n('control/configuration', 'Configuration', 'steps, counts and limits the firmware is given')]),
  n('safety', 'Enclosure and safety', 'what keeps a person from harm', [p('reach', 'nothing hotter than a person may touch is within their reach outside a guard', 'the want on what the person may touch')], [n('safety/guards', 'Guards', 'panels between a person and a hazard')]),
  n('placement', 'Placement', 'where everything goes', [
    p('stack', 'the slowest axis carries the heaviest load; the fastest, the least', 'the moving mass each axis drives'),
    p('clear', 'no two parts that are not joined occupy one place', 'boxes do not overlap'),
    p('face', 'what the person uses faces the person; what is fed comes from the side its source is on', 'the regions the intent places'),
  ]),
];

/** The path of names from the root to a node, and the node. */
export function find(id: string, nodes = TAXONOMY): Node | null {
  for (const x of nodes) { if (x.id === id) return x; const y = find(id, x.children); if (y) return y; }
  return null;
}
/** Every principle in force along a category's path. */
export function principlesOf(category: string): Principle[] {
  const parts = category.split('/'), out: Principle[] = [];
  for (let i = 1; i <= parts.length; i++) { const node = find(parts.slice(0, i).join('/')); if (node) out.push(...node.principles); }
  return out;
}

// ---- geometry: what a shape is, before what it is for (src/nexus/embody/geometry.ts) --------------------------------
TAXONOMY.push(GEOMETRY);

// ---- what anything that moves, flies, holds heat or carries water adds (src/nexus/embody/any.ts) ----------------
TAXONOMY.push(
  n('energy', 'Energy storage', 'what holds energy until it is wanted', [p('capacity', 'a store holds what its longest want draws, with what it cannot give back to spare', 'E = P t / η')], [
    n('energy/battery', 'Batteries', 'cells in series for the voltage, in parallel for the current and the energy', [p('c-rate', 'no cell gives more current than its maker rates', 'I_cell = I / P ≤ I_max')]),
    n('energy/flywheel', 'Flywheels', 'a disc spun up', [p('hoop', 'its rim runs at a third of the stress its steel yields at, or less', 'σ = ρ ω² r²')]),
    n('energy/tank', 'Tanks', 'a volume of what is stored'),
  ]),
  n('fluid', 'Fluids', 'water and air carried where they are wanted', [], [
    n('fluid/pipes', 'Pipes', 'copper tube, its bore from the flow and the velocity it may run at', [p('velocity', 'water runs no faster than noise and erosion allow', 'v = Q / A ≤ v_max')]),
    n('fluid/air', 'Ventilation', 'fans and ducts that exchange air at the rate what is made inside asks'),
  ]),
);
find('motion')!.children.push(
  n('motion/wheels', 'Wheels', 'what carries a load on the ground and turns its torque into force', [p('load', 'a tyre carries no more than its rating', 'F_wheel ≤ load index'), p('climb', 'a wheel rolls over the ground\'s steps', '√(2rh − h²)/(r − h) ≤ the traction share')]),
  n('motion/brakes', 'Brakes', 'what takes motion away as heat', [p('heat', 'a stop heats the rotor no more than it bears', 'ΔT = E / (m c)')]),
  n('motion/rotors', 'Rotors', 'lift from air pushed down', [p('momentum', 'a rotor\'s power is what the air it pushes asks', 'P = T^1.5 / (FoM √(2 ρ A))')]),
  n('motion/suspension', 'Suspension', 'springs and dampers between the ground and what it carries', [p('ride', 'what is carried bobs slowly enough to be comfortable', 'k = m (2π f)²')]),
);
find('structure')!.children.push(n('structure/envelope', 'Envelopes', 'walls, roof and floor between inside and outside', [p('loss', 'it lets through no more heat than the heating can make up', 'Q = Σ U A ΔT')]));
find('safety')!.children.push(n('safety/crash', 'Crash structure', 'what crushes so the people inside do not stop too hard', [p('stroke', 'it crushes far enough to stop them within the deceleration they survive', 'σ A = m a, s ≥ v² / 2a')]));
