// The inventory: real products, by category and subcategory (electrical, mechanical, hardware, and the materials they
// come down to), each mapped to what is inside it, and what is inside that, down to its materials. Each entry says how
// it is made from what is in it (wound, cast, stamped, assembled, …) and the workshop says whether it can do that
// itself: what it can is made in it (printed, cast, wound, soldered, crimped, heat-treated, put together by the arms);
// what it cannot (a silicon die needs a fab, a lamination a press) is taken from the rack as bought, and said so; where a
// part that is moulded or machined could be printed or cast here instead, that is the way it is made here.
//
// What each entry is made of is how such products are made (their teardowns and their makers' descriptions); the
// standard parts carry their standard's name and sizes (ISO 4762 screws, the 608 bearing's 8 × 22 × 7 mm, the NEMA 17
// face). Counts and masses marked "about" or "typical" vary from maker to maker.

import { shapes, type Section } from './cell';
import type { Board } from './boards';
import { callFamily, FAMILIES } from './families';
import { ELEMENTS, elementId, elementsOf, makeup, makeupSays } from './elements';
import { LIFE, MOLECULES, daltonsOf } from './life';

/** How a thing is made from what is in it. */
export type Process =
  | 'stock' | 'print' | 'cast' | 'wind' | 'solder' | 'crimp' | 'assemble' | 'heat-treat' | 'bend'
  | 'machine' | 'stamp' | 'mould' | 'extrude' | 'draw' | 'cold-head' | 'roll-thread' | 'sinter' | 'etch' | 'fab' | 'coat' | 'grind' | 'laminate' | 'weld' | 'forge' | 'blow' | 'coil' | 'chemistry' | 'roll' | 'swage' | 'grow';
export const PROCESSES: Record<Process, { says: string; here: boolean }> = {
  stock: { says: 'taken from stock as a raw material', here: true },
  print: { says: 'printed in PLA on the 3D printer', here: true },
  cast: { says: 'cast in metal by lost-PLA in the kiln and furnace', here: true },
  wind: { says: 'wound with magnet wire by the bench arm', here: true },
  solder: { says: 'soldered at the bench', here: true },
  crimp: { says: 'crimped at the bench', here: true },
  assemble: { says: 'put together by the arms', here: true },
  'heat-treat': { says: 'heat-treated in the kiln', here: true },
  bend: { says: 'bent by hand at the bench', here: true },
  coil: { says: 'coiled from wire on a mandrel at the bench', here: true },
  machine: { says: 'machined (turned or milled): needs a lathe or mill', here: false },
  stamp: { says: 'stamped from sheet: needs a press and a die', here: false },
  mould: { says: 'injection moulded: needs a moulding machine and a mould', here: false },
  extrude: { says: 'extruded through a die: needs an extrusion press', here: false },
  draw: { says: 'drawn into wire: needs a drawing line', here: false },
  'cold-head': { says: 'cold-headed from wire: needs a header', here: false },
  'roll-thread': { says: 'thread-rolled: needs thread-rolling dies', here: false },
  sinter: { says: 'pressed from powder and sintered: needs a press and a sintering furnace', here: false },
  etch: { says: 'etched (a circuit board): needs etching and plating', here: false },
  fab: { says: 'made in a semiconductor fab', here: false },
  coat: { says: 'coated or plated: needs a plating or coating line', here: false },
  grind: { says: 'ground to size: needs a precision grinder', here: false },
  laminate: { says: 'laminated in a press', here: false },
  weld: { says: 'welded: needs a welder', here: false },
  forge: { says: 'forged: needs a forging press or hammer', here: false },
  blow: { says: 'blown or drawn from melt (glass)', here: false },
  chemistry: { says: 'made by chemistry: refined, reacted or synthesised', here: false },
  roll: { says: 'hot-rolled in a mill: needs a rolling mill', here: false },
  swage: { says: 'swaged: compacted by a swaging machine', here: false },
  grow: { says: 'grown by living cells, from food, as their genes direct', here: false },
};
export type Kind = 'product' | 'assembly' | 'part' | 'material' | 'element';
export interface Item {
  id: string; name: string; path: string[]; kind: Kind; make: Process;
  /** a way the workshop can make it where its own way is not here (a moulded case printed, a die-cast part cast) */ alt?: Process;
  of: { id: string; n: number }[]; says: string; spec?: string;
  /** about how big (mm) and heavy (g), where it is printed or cast here, or known */ size?: [number, number, number]; g?: number;
  /** made to sizes it is called with (a family's size), or one size of a family that makes any */ adjustable?: boolean; family?: string;
  /** added by you, not seeded */ yours?: boolean;
  /** a material's make-up by mass, one level down: elements (el-…), or the materials a blend is of */ makeup?: { id: string; pct: number }[];
  /** made to sizes by a family: which, and the numbers it was called with (what its behaviours are worked out from) */ sized?: { family: string; params: Record<string, string | number> };
  /** parts made to its sizes with it, each by its own family (a cylinder's barrel and rod), put in with it */ inner?: Item[];
  /** its 3D shape where its kind says it: a shape kind of the view and a mark (src/nexus/pieces.ts) */ look?: string;
  /** grams of each of what is in it, where that is said by mass (tissue in an organ, water in a cell) */ mass?: Record<string, number>;
  /** a molecule's weight, daltons */ da?: number;
  /** a set of so many like members, each its size (both tonsils, the 23 ligamenta flava) */ members?: number;
}
const items = new Map<string, Item>();
/** The inventory's revision: one more each time an entry is added, so what is worked out from it (its categories, each
 *  item's plan) is worked out once and kept until it changes. */
let rev = 0;
const put = (it: Item): void => { for (const c of it.inner ?? []) if (!items.has(c.id)) put(c); items.set(it.id, it); rev++; };
export const inventoryRev = (): number => rev;
/** f of an id, kept until the inventory changes. */
function memo<T>(f: (id: string) => T): (id: string) => T {
  let at = -1; const kept = new Map<string, T>();
  return (id) => { if (at !== rev) { kept.clear(); at = rev; } let v = kept.get(id); if (v === undefined) { v = f(id); kept.set(id, v); } return v; };
}
/** An entry, compactly: id, name, "Category/Subcategory[/Sub-subcategory]", kind, process, "child*n child …", says, spec, more. */
function e(id: string, name: string, path: string, kind: Kind, make: Process, of: string, says: string, spec = '', more: Partial<Item> = {}): void {
  put({ id, name, path: path.split('/'), kind, make, of: of.trim() ? of.trim().split(/\s+/).map((x) => { const [c, n] = x.split('*'); return { id: c!, n: Number(n ?? 1) }; }) : [], says, ...(spec ? { spec } : {}), ...more });
}
const m = (id: string, name: string, group: string, says: string, spec = '') => e(id, name, `Materials/${group}`, 'material', 'stock', '', says, spec);

// ==== materials ========================================================================================================
m('steel-low', 'low-carbon steel', 'Metals/Steels', 'iron with under 0.25 % carbon: soft, easy to form and weld', 'e.g. AISI 1010–1020');
m('steel-alloy', 'alloy steel', 'Metals/Steels', 'steel with chromium and molybdenum, hardened and tempered for strength', 'e.g. AISI 4140; screws of class 10.9 and 12.9');
m('steel-spring', 'spring steel (music wire)', 'Metals/Steels', 'high-carbon steel drawn hard, for springs', 'ASTM A228');
m('steel-chrome', 'bearing steel', 'Metals/Steels', 'high-carbon chromium steel, through-hardened, for rings and balls', 'AISI 52100 / 100Cr6');
m('steel-tool', 'tool steel', 'Metals/Steels', 'shock-resisting tool steel for bits and shafts', 'e.g. S2');
m('stainless-304', 'stainless steel 304', 'Metals/Steels', 'iron with 18 % chromium and 8 % nickel: does not rust in air', 'AISI 304');
m('steel-electrical', 'electrical steel', 'Metals/Steels', 'iron with about 3 % silicon, in thin insulated sheets: little loss to eddy currents', 'grain-oriented or not');
m('al-6061', 'aluminium 6061-T6', 'Metals/Aluminium', 'aluminium with magnesium and silicon, solution-treated and aged', 'yield 276 MPa (ASM)');
m('al-6063', 'aluminium 6063-T5', 'Metals/Aluminium', 'the extrusion alloy: flows well through a die', '');
m('al-a380', 'aluminium A380 (die-cast)', 'Metals/Aluminium', 'the common die-casting alloy', '');
m('al-foil', 'aluminium foil', 'Metals/Aluminium', 'aluminium rolled to tens of micrometres', '');
m('copper', 'copper', 'Metals/Copper alloys', 'the conductor: 58 MS/m annealed', 'IACS 100 %');
m('copper-foil', 'copper foil', 'Metals/Copper alloys', 'copper rolled or plated to 18–70 µm, for boards and electrodes', '1 oz/ft² is 35 µm');
m('brass', 'brass', 'Metals/Copper alloys', 'copper with zinc: machines and casts well', 'e.g. C36000');
m('bronze', 'bronze', 'Metals/Copper alloys', 'copper with tin', '');
m('phosphor-bronze', 'phosphor bronze', 'Metals/Copper alloys', 'bronze with a little phosphorus: springy, for contacts', '');
m('nickel', 'nickel', 'Metals/Other metals', 'plating, and the strip that joins cells', '');
m('tin', 'tin', 'Metals/Other metals', 'plating that solders well', '');
m('zinc', 'zinc', 'Metals/Other metals', 'for brass, die-casting and galvanising', '');
m('gold', 'gold', 'Metals/Other metals', 'bond wires and contact plating: does not tarnish', '');
m('silver', 'silver', 'Metals/Other metals', 'contacts and conductive paste', '');
m('nichrome', 'nichrome', 'Metals/Resistance alloys', 'nickel with 20 % chromium: a heating element that holds up to oxidation', 'NiCr 80/20');
m('chromel', 'chromel', 'Metals/Resistance alloys', 'nickel–chromium: the positive leg of a type K thermocouple', '');
m('alumel', 'alumel', 'Metals/Resistance alloys', 'nickel–aluminium–manganese–silicon: the negative leg of type K', '');
m('solder', 'lead-free solder', 'Metals/Other metals', 'tin with 3 % silver and 0.5 % copper', 'SAC305, melts at about 217 °C');
m('ndfeb', 'neodymium magnet alloy', 'Magnetic materials/Permanent magnets', 'Nd₂Fe₁₄B: the strongest permanent magnets', 'grades N35–N52');
m('ferrite-hard', 'hard ferrite', 'Magnetic materials/Permanent magnets', 'barium or strontium ferrite: cheap magnets that do not corrode', '');
m('ferrite-soft', 'soft ferrite', 'Magnetic materials/Soft magnetic', 'manganese–zinc or nickel–zinc ferrite: cores for high frequency', '');
m('pla', 'PLA', 'Polymers/Thermoplastics', 'polylactic acid: what the printer prints', 'prints at 190–220 °C; 1.24 g/cm³');
m('abs', 'ABS', 'Polymers/Thermoplastics', 'tough moulding plastic for cases', '');
m('nylon', 'nylon (PA66)', 'Polymers/Thermoplastics', 'strong, slippery: gears, housings, connector bodies', '');
m('pom', 'acetal (POM)', 'Polymers/Thermoplastics', 'stiff and low-friction: gears and cages', '');
m('pc', 'polycarbonate', 'Polymers/Thermoplastics', 'clear and tough: diffusers, cases', '');
m('pbt', 'PBT', 'Polymers/Thermoplastics', 'heat-resisting: end caps, connector bodies', '');
m('pp', 'polypropylene', 'Polymers/Thermoplastics', 'light and tough: hubs, handles', '');
m('pe', 'polyethylene', 'Polymers/Thermoplastics', 'separators and insulation', '');
m('pvc', 'PVC', 'Polymers/Thermoplastics', 'wire insulation', '');
m('pmma', 'acrylic (PMMA)', 'Polymers/Thermoplastics', 'clear sheet and lenses', '');
m('ptfe', 'PTFE', 'Polymers/Thermoplastics', 'the lowest friction: seats and liners', '');
m('polyimide', 'polyimide', 'Polymers/Films', 'heat-resisting film: flex circuits, strain-gauge backing', 'e.g. Kapton');
m('pu', 'polyurethane', 'Polymers/Elastomers', 'treads, belts', '');
m('silicone', 'silicone rubber', 'Polymers/Elastomers', 'heat-resisting rubber', '');
m('nbr', 'nitrile rubber (NBR)', 'Polymers/Elastomers', 'oil-resisting seals and O-rings', '');
m('neoprene', 'neoprene', 'Polymers/Elastomers', 'belts and surrounds', '');
m('rubber', 'natural rubber', 'Polymers/Elastomers', 'tyres', '');
m('epoxy', 'epoxy', 'Polymers/Thermosets', 'coatings, potting, moulding compound', '');
m('phenolic', 'phenolic', 'Polymers/Thermosets', 'potentiometer substrates, handles', '');
m('fr4', 'FR-4 laminate', 'Composites/Laminates', 'woven glass in epoxy: the board circuits are on', '');
m('fibreglass', 'glass fibre', 'Composites/Fibres', 'tension cords, insulation sleeving', '');
m('cfrp', 'carbon fibre in epoxy', 'Composites/Laminates', 'stiff and light', '');
m('paper', 'paper', 'Other materials/Natural', 'cones, separators', '');
m('wood-veneer', 'wood veneer', 'Other materials/Natural', 'plies for plywood', '');
m('alumina', 'alumina', 'Ceramics and glass/Technical ceramics', 'Al₂O₃: insulators and resistor cores', '');
m('batio3', 'barium titanate', 'Ceramics and glass/Technical ceramics', 'the dielectric of ceramic capacitors', '');
m('pzt', 'PZT', 'Ceramics and glass/Technical ceramics', 'lead zirconate titanate: piezo elements', '');
m('mgo', 'magnesium oxide', 'Ceramics and glass/Technical ceramics', 'packed round heater wire: insulates, conducts heat', '');
m('ntc-ceramic', 'NTC ceramic', 'Ceramics and glass/Technical ceramics', 'sintered metal oxides whose resistance falls as they warm', '');
m('glass', 'glass', 'Ceramics and glass/Glass', 'soda-lime and borosilicate', '');
m('quartz', 'quartz', 'Ceramics and glass/Crystals', 'crystal for oscillators', '');
m('silicon', 'silicon wafer', 'Semiconductor materials/Wafers', 'single-crystal silicon, the base of chips', '');
m('gan', 'gallium nitride (InGaN)', 'Semiconductor materials/Compound', 'the light-emitting layers of blue and white LEDs', '');
m('magnet-wire', 'magnet wire', 'Electrical materials/Conductors', 'copper wire with a thin enamel coat', 'e.g. 0.1–1 mm');
m('graphite', 'graphite', 'Electrical materials/Carbon', 'brushes, anodes', '');
m('nmc', 'NMC cathode powder', 'Electrical materials/Battery', 'lithium nickel manganese cobalt oxide', '');
m('electrolyte-li', 'lithium electrolyte', 'Electrical materials/Battery', 'LiPF₆ in organic carbonates', '');
m('electrolyte-al', 'capacitor electrolyte', 'Electrical materials/Capacitors', 'ethylene glycol based', '');
m('solder-mask', 'solder mask', 'Electrical materials/Boards', 'the green coat on a board', '');
m('grease', 'grease', 'Other materials/Lubricants', 'lithium soap grease', '');
m('oil', 'oil', 'Other materials/Lubricants', 'mineral or synthetic', '');
m('nitrogen', 'nitrogen', 'Other materials/Gases', 'the charge of a gas spring', '');
m('glue', 'adhesive', 'Other materials/Adhesives', 'cyanoacrylate or epoxy', '');

// ==== parts made from materials (the shared inner pieces) =============================================================
e('lamination-stack', 'lamination stack', 'Mechanical/Electromagnetic parts/Cores', 'part', 'stamp', 'steel-electrical', 'thin electrical-steel sheets stamped to shape and stacked, insulated from each other', 'stacked so eddy currents cannot circle through the core');
e('winding', 'winding', 'Electrical/Coils/Windings', 'part', 'wind', 'magnet-wire', 'turns of enamelled wire round a core or former');
e('bobbin', 'coil bobbin', 'Electrical/Coils/Bobbins', 'part', 'mould', 'nylon', 'the former a coil is wound on', '', { alt: 'print', size: [20, 20, 15] });
e('shaft-steel', 'steel shaft', 'Mechanical/Shafts and couplings/Shafts', 'part', 'grind', 'steel-alloy', 'a ground, hardened round shaft');
e('commutator', 'commutator', 'Electrical/Motors and actuators/Motor parts', 'part', 'machine', 'copper phenolic', 'copper segments on an insulating hub: it switches the current in each coil as the rotor turns');
e('carbon-brush', 'carbon brush', 'Electrical/Motors and actuators/Motor parts', 'part', 'sinter', 'graphite copper', 'a block of graphite and copper pressed against the commutator');
e('brush-spring', 'brush spring', 'Electrical/Motors and actuators/Motor parts', 'part', 'stamp', 'phosphor-bronze', 'the springy arm that holds a brush to the commutator');
e('magnet-ferrite-arc', 'ferrite arc magnet', 'Electrical/Magnets/Ferrite', 'part', 'sinter', 'ferrite-hard', 'a curved sintered ferrite magnet lining a motor can');
e('magnet-ndfeb', 'neodymium magnet', 'Electrical/Magnets/Neodymium', 'part', 'sinter', 'ndfeb nickel', 'a sintered Nd₂Fe₁₄B magnet, nickel-plated against corrosion');
e('motor-can', 'motor can', 'Electrical/Motors and actuators/Motor parts', 'part', 'stamp', 'steel-low', 'the deep-drawn steel can: the motor\'s case and the return path of its magnetic field');
e('sleeve-bearing', 'sintered bronze bushing', 'Mechanical/Bearings/Plain bearings', 'part', 'sinter', 'bronze oil', 'porous bronze soaked in oil: a bearing that lubricates itself');
e('end-cap-motor', 'motor end cap', 'Electrical/Motors and actuators/Motor parts', 'part', 'mould', 'pbt', 'the plastic cap that carries the brushes and a bearing', '', { alt: 'print', size: [20, 20, 6] });
e('gear-small', 'small spur gear', 'Mechanical/Gears and gearboxes/Spur gears', 'part', 'machine', 'brass', 'a small module-0.3 to 0.5 gear of a gearbox', '', { alt: 'cast', size: [10, 10, 3] });
e('gear-plastic', 'plastic spur gear', 'Mechanical/Gears and gearboxes/Spur gears', 'part', 'mould', 'pom', 'a moulded acetal gear', '', { alt: 'print', size: [20, 20, 5] });
e('pcb-bare', 'bare circuit board', 'Electrical/Boards and controllers/Circuit boards', 'part', 'etch', 'fr4 copper-foil solder-mask tin', 'FR-4 with copper traces etched on it, solder mask over them, and pads tinned', 'a few layers of 35 µm copper');
e('lead-wire', 'component lead', 'Electrical/Wiring and connectors/Leads', 'part', 'draw', 'copper tin', 'tinned copper wire');
e('si-die', 'silicon die', 'Electrical/Semiconductors/Dies', 'part', 'fab', 'silicon', 'a chip cut from a processed wafer');
e('bond-wire', 'bond wire', 'Electrical/Semiconductors/Packaging', 'part', 'draw', 'gold', 'gold or copper wire tens of micrometres across that joins a die to its leads');
e('lead-frame', 'lead frame', 'Electrical/Semiconductors/Packaging', 'part', 'stamp', 'copper tin', 'the stamped copper frame a die sits on, its leads part of it');
e('mould-compound', 'moulding compound', 'Electrical/Semiconductors/Packaging', 'part', 'mould', 'epoxy', 'the black epoxy body of a chip');
e('ic-package', 'packaged chip', 'Electrical/Semiconductors/Integrated circuits', 'assembly', 'assemble', 'si-die lead-frame bond-wire*8 mould-compound', 'a die on a lead frame, bonded out and moulded in epoxy (QFN or SOIC)');
e('pin-header', 'pin header (1 × 20, 2.54 mm)', 'Electrical/Wiring and connectors/Headers', 'part', 'assemble', 'header-pin*20 header-insulator', 'square brass pins in a moulded strip, their ends gold-flashed', '2.54 mm (0.1 in) pitch');
e('screw-terminal', 'screw terminal block', 'Electrical/Wiring and connectors/Terminals', 'part', 'assemble', 'terminal-housing terminal-clamp*2 terminal-screw*2', 'a moulded body with a brass clamp and screw for each wire');
e('wire-hookup', 'hook-up wire', 'Electrical/Wiring and connectors/Wire', 'part', 'extrude', 'copper pvc', 'stranded copper in PVC insulation', 'e.g. 22 AWG');
e('crimp-contact', 'crimp contact', 'Electrical/Wiring and connectors/Contacts', 'part', 'stamp', 'brass tin', 'a stamped, tin-plated brass contact crimped onto a wire');
e('connector-housing', 'connector housing', 'Electrical/Wiring and connectors/Housings', 'part', 'mould', 'nylon', 'the moulded shell the contacts click into', '', { alt: 'print', size: [10, 6, 6] });
e('jst-xh', 'JST XH connector (2.5 mm)', 'Electrical/Wiring and connectors/Connectors', 'assembly', 'crimp', 'connector-housing crimp-contact*2 wire-hookup*2', 'two wires crimped into contacts and clicked into a housing', '2.5 mm pitch');
e('usb-c-socket', 'USB-C socket', 'Electrical/Wiring and connectors/Connectors', 'part', 'stamp', 'stainless-304 copper gold nylon', 'a stamped shell round 24 gold-plated contacts in a moulded tongue');
e('smd-passives', 'chip resistors and capacitors', 'Electrical/Passive components/Chip passives', 'part', 'fab', 'chip-resistor*10 chip-capacitor*10', 'the tiny surface-mount resistors and capacitors a board is strewn with');
e('resistor-film', 'metal-film resistor', 'Electrical/Passive components/Resistors', 'product', 'assemble', 'alumina nichrome lead-wire*2 epoxy', 'a thin metal film on a ceramic rod, a spiral cut into it to set its resistance, end caps, leads and a lacquer coat', 'tolerance 1 %, 0.25 W typical');
e('capacitor-electrolytic', 'aluminium electrolytic capacitor', 'Electrical/Passive components/Capacitors', 'product', 'assemble', 'al-foil*2 paper electrolyte-al lead-wire*2 rubber al-6061', 'two aluminium foils, one with an oxide film for its dielectric, wound with paper soaked in electrolyte, sealed in a can with a rubber bung');
e('capacitor-ceramic', 'ceramic capacitor (MLCC)', 'Electrical/Passive components/Capacitors', 'product', 'sinter', 'batio3 nickel tin', 'layers of barium-titanate ceramic and nickel electrodes, fired together, ends plated');
e('inductor-power', 'power inductor', 'Electrical/Passive components/Inductors', 'product', 'wind', 'ferrite-soft magnet-wire', 'a winding on a ferrite core');
e('potentiometer', 'potentiometer', 'Electrical/Passive components/Potentiometers', 'product', 'assemble', 'phenolic graphite brass steel-low lead-wire*3', 'a carbon track on a phenolic disc, a sprung wiper turned by the shaft, three terminals');
e('fuse-glass', 'glass cartridge fuse', 'Electrical/Passive components/Fuses', 'product', 'assemble', 'fuse-tube fuse-cap*2 fuse-element', 'a wire that melts at its rated current, in a glass tube between brass caps', '5 × 20 mm');
e('crystal', 'quartz crystal', 'Electrical/Passive components/Oscillators', 'product', 'assemble', 'quartz-blank crystal-base crystal-can lead-wire*2', 'a quartz blank cut to ring at its frequency, electrodes on its faces, sealed in a can');
e('thermistor-ntc', 'NTC thermistor (100 kΩ)', 'Electrical/Sensors/Temperature', 'product', 'sinter', 'ntc-ceramic glass lead-wire*2', 'a bead of sintered oxides, its resistance falling as it warms, sealed in glass', '100 kΩ at 25 °C; the hot-end sensor of many printers');

// ==== electrical products ==============================================================================================
e('led-5mm', 'LED, 5 mm', 'Electrical/Semiconductors/LEDs', 'product', 'assemble', 'gan lead-frame bond-wire epoxy', 'an InGaN die in a reflector cup on one lead, a gold wire to the other, cast in a clear epoxy lens', 'about 20 mA');
e('diode-1n4007', 'rectifier diode 1N4007', 'Electrical/Semiconductors/Diodes', 'product', 'assemble', 'si-die lead-wire*2 epoxy', 'a silicon p–n junction between two leads in a moulded body', '1000 V, 1 A');
e('mosfet-to220', 'power MOSFET (TO-220)', 'Electrical/Semiconductors/Transistors', 'product', 'assemble', 'si-die lead-frame bond-wire*2 mould-compound', 'a silicon die on a copper tab (its drain and heat path), wires to its gate and source leads, moulded in epoxy');
e('ws2812b', 'WS2812B addressable LED', 'Electrical/Semiconductors/LEDs', 'product', 'assemble', 'gan*3 si-die lead-frame bond-wire*6 epoxy', 'red, green and blue dies and their driver chip in one 5050 package, set by a data line', '5 × 5 mm, up to about 60 mA at full white');
e('esp32-module', 'ESP32 module', 'Electrical/Boards and controllers/Modules', 'assembly', 'solder', 'pcb-bare ic-package*2 crystal smd-passives stainless-304', 'the ESP32 chip, its flash chip and crystal on a small board with a printed antenna, under a shield can', 'two cores up to 240 MHz, Wi-Fi and Bluetooth');
e('esp32-devkit', 'ESP32 development board', 'Electrical/Boards and controllers/Microcontroller boards', 'product', 'solder', 'pcb-bare esp32-module ic-package*2 usb-c-socket smd-passives led-5mm*2 pin-header*2', 'an ESP32 module, a USB-to-serial chip, a 3.3 V regulator, a USB socket, two buttons, LEDs and pin headers on one board');
e('drv8833-board', 'DRV8833 motor driver board', 'Electrical/Boards and controllers/Motor drivers', 'product', 'solder', 'pcb-bare ic-package smd-passives pin-header', 'two H-bridges in one chip, its capacitors, on a breakout board', '1.5 A RMS a bridge, 2.7–10.8 V');
e('a4988-board', 'A4988 stepper driver board', 'Electrical/Boards and controllers/Motor drivers', 'product', 'solder', 'pcb-bare ic-package smd-passives potentiometer pin-header*2', 'the A4988 chip, its current-sense resistors and a trimmer to set the current, on a carrier board', 'up to 2 A a phase with cooling');
e('buck-module', 'buck converter module', 'Electrical/Power/DC-DC converters', 'product', 'solder', 'pcb-bare ic-package inductor-power capacitor-electrolytic*2 diode-1n4007 potentiometer smd-passives', 'a switching regulator chip, its inductor, a diode, capacitors and a trimmer that sets the output', 'steps a higher voltage down efficiently');
e('vl53l1x-board', 'VL53L1X distance sensor board', 'Electrical/Sensors/Distance', 'product', 'solder', 'pcb-bare ic-package smd-passives pin-header', 'a time-of-flight sensor (a laser emitter and a single-photon detector array with their optics, in one package) and a regulator on a breakout', 'up to 4 m');
e('mpu6050-board', 'MPU-6050 IMU board', 'Electrical/Sensors/Motion', 'product', 'solder', 'pcb-bare ic-package smd-passives pin-header', 'a MEMS gyro and accelerometer in one package, on a breakout', '±250…2000 °/s, ±2…16 g');
e('bme280-board', 'BME280 environment sensor board', 'Electrical/Sensors/Environment', 'product', 'solder', 'pcb-bare ic-package smd-passives pin-header', 'a MEMS sensor for temperature, humidity and pressure, on a breakout', '300–1100 hPa');
e('strain-gauge', 'foil strain gauge', 'Electrical/Sensors/Force', 'part', 'etch', 'polyimide copper', 'a fine grid of metal foil on polyimide: its resistance changes as it stretches');
e('load-cell', 'load cell (bar)', 'Electrical/Sensors/Force', 'product', 'assemble', 'al-6061 strain-gauge*4 wire-hookup*4 silicone', 'an aluminium bar machined to bend where four strain gauges are glued, wired as a bridge, sealed', '', { alt: 'cast', size: [80, 13, 13] });
e('thermocouple-k', 'type K thermocouple probe', 'Electrical/Sensors/Temperature', 'product', 'assemble', 'thermoelement-chromel thermoelement-alumel tc-sheath mgo', 'a chromel and an alumel wire welded at the tip, packed in magnesium oxide in a stainless sheath', '−200 to 1350 °C');
e('image-sensor', 'image sensor', 'Electrical/Sensors/Imaging', 'part', 'fab', 'si-die cover-glass ceramic-package', 'a CMOS die of millions of photodiodes under a colour filter and microlenses');
e('lens-stack', 'camera lens', 'Electrical/Sensors/Imaging', 'part', 'mould', 'pmma pc', 'several moulded lens elements in a barrel');
e('camera-module', 'camera module', 'Electrical/Sensors/Imaging', 'product', 'assemble', 'image-sensor lens-stack winding magnet-ndfeb pcb-bare', 'an image sensor under a lens moved by a voice-coil motor for focus, on a small board with its flex cable', 'e.g. 12 MP');
e('motor-130', 'brushed DC motor (130 size)', 'Electrical/Motors and actuators/DC motors', 'product', 'assemble', 'motor-can magnet-ferrite-arc*2 armature end-cap-motor carbon-brush*2 brush-spring*2 sleeve-bearing*2', 'a wound rotor turning in the field of two ferrite magnets; carbon brushes on its commutator switch the current in its coils', 'about 3–6 V', { g: 18 });
e('armature', 'armature', 'Electrical/Motors and actuators/Motor parts', 'assembly', 'wind', 'shaft-steel lamination-stack winding*3 commutator', 'a laminated three-pole core on the shaft, a coil on each pole, the commutator at one end');
e('gearbox-n20', 'N20 gearbox', 'Mechanical/Gears and gearboxes/Gearboxes', 'assembly', 'assemble', 'gear-small*5 shaft-steel*3 steel-low', 'five small gears between two plates on three pins: each stage slows the motor and multiplies its torque');
e('n20-motor', 'N20 gear motor', 'Electrical/Motors and actuators/Gear motors', 'product', 'assemble', 'motor-130 gearbox-n20 shaft-steel', 'a small brushed motor with a spur gearbox on its face and a D-cut output shaft', '12 mm square; ratio as ordered', { g: 10 });
e('stator-stepper', 'stepper stator', 'Electrical/Motors and actuators/Motor parts', 'assembly', 'wind', 'lamination-stack winding*8', 'a laminated stator of eight toothed poles, a coil on each, wired as two phases');
e('rotor-stepper', 'stepper rotor', 'Electrical/Motors and actuators/Motor parts', 'assembly', 'assemble', 'lamination-stack*2 magnet-ndfeb shaft-steel', 'an axially magnetised ring magnet between two toothed laminated cups, their 50 teeth offset half a tooth', '50 teeth: 200 steps of 1.8°');
e('end-bell', 'motor end bell', 'Electrical/Motors and actuators/Motor parts', 'part', 'cast', 'al-a380', 'the die-cast aluminium end of a stepper, carrying a bearing', '', { size: [42, 42, 8] });
e('bearing-625', 'ball bearing 625 (5 × 16 × 5)', 'Mechanical/Bearings/Ball bearings', 'product', 'assemble', 'bearing-ring*2 bearing-ball*7 bearing-cage bearing-shield*2 grease', 'the small bearing at each end of many steppers', '5 mm bore, 16 mm outside, 5 mm wide');
e('nema17', 'NEMA 17 stepper motor', 'Electrical/Motors and actuators/Stepper motors', 'product', 'assemble', 'stator-stepper rotor-stepper end-bell*2 bearing-625*2 screw-m3*4 jst-xh', 'two phases of coils on a toothed stator, a toothed magnet rotor, die-cast end bells, two bearings, four long screws through it all', '42.3 mm face (NEMA ICS 16); 1.8° a step; e.g. 40 N·cm holding', { g: 280 });
e('servo-case', 'servo case', 'Electrical/Motors and actuators/Servo parts', 'part', 'mould', 'nylon', 'the three-piece moulded case of a hobby servo', '', { alt: 'print', size: [40, 20, 38] });
e('servo-board', 'servo control board', 'Electrical/Motors and actuators/Servo parts', 'assembly', 'solder', 'pcb-bare ic-package*2 smd-passives', 'a small board that compares the pulse it is sent with the potentiometer and drives the motor to match');
e('mg996r', 'MG996R servo', 'Electrical/Motors and actuators/Servos', 'product', 'assemble', 'servo-case motor-130 gear-small*4 potentiometer servo-board screw-m3*4 wire-hookup*3', 'a DC motor, a metal gear train, a potentiometer on the output for feedback, a control board, in a moulded case', 'stall 9.4 kg·cm at 4.8 V; 0.17 s for 60°', { g: 55 });
e('bldc-outrunner', 'brushless outrunner motor', 'Electrical/Motors and actuators/Brushless motors', 'product', 'assemble', 'lamination-stack winding*12 motor-can magnet-ndfeb*14 shaft-steel bearing-625*2 end-bell', 'a wound stator of 12 teeth inside a spinning bell lined with 14 magnets; an electronic controller switches its three phases', 'e.g. 2212 size');
e('solenoid', 'push-pull solenoid', 'Electrical/Motors and actuators/Solenoids', 'product', 'assemble', 'bobbin winding steel-low*2 spring-compression', 'a coil in a steel frame pulls a steel plunger in; a spring returns it');
e('relay', 'relay', 'Electrical/Switching/Relays', 'product', 'assemble', 'bobbin winding steel-low silver phosphor-bronze pbt', 'a coil pulls an armature that moves a sprung contact from one silver contact to another, in a sealed case');
e('pushbutton', 'tactile push button', 'Electrical/Switching/Switches', 'product', 'assemble', 'switch-housing snap-dome switch-actuator switch-terminal*4', 'a domed stainless disc that snaps down onto two contacts, under a plunger, in a moulded base');
e('transformer', 'mains transformer (small)', 'Electrical/Power/Transformers', 'product', 'assemble', 'lamination-stack bobbin winding*2 steel-low', 'a primary and a secondary winding on one bobbin over an E-I laminated core, in a steel frame', 'turns ratio sets the voltage ratio');
e('cell-18650', 'lithium-ion cell 18650', 'Electrical/Power/Cells', 'product', 'assemble', 'jelly-roll electrolyte-li cell-can cell-cap', 'a wound roll of cathode, separator and anode in a steel can, filled with electrolyte, sealed under a cap with its safety vent and interrupt', '18 mm × 65 mm; 3.6 V nominal', { g: 47 });
e('jelly-roll', 'electrode roll', 'Electrical/Power/Cell parts', 'assembly', 'wind', 'cathode-sheet anode-sheet separator-film*2', 'cathode (NMC on aluminium foil) and anode (graphite on copper foil) wound with a polyethylene separator between');
e('cell-can', 'cell can', 'Electrical/Power/Cell parts', 'part', 'stamp', 'steel-low nickel', 'a deep-drawn, nickel-plated steel can: the negative terminal');
e('cell-cap', 'cell top cap', 'Electrical/Power/Cell parts', 'assembly', 'assemble', 'cap-plate vent-disc cap-gasket', 'the positive cap: a vent, a current-interrupt disc and a gasket');
e('bms-board', 'battery protection board (2S)', 'Electrical/Power/Battery management', 'product', 'solder', 'pcb-bare ic-package mosfet-to220*2 smd-passives', 'a protection chip and two MOSFETs that cut the pack off when it is over-charged, over-drained or shorted');
e('pack-2s', 'battery pack, 2 cells', 'Electrical/Power/Battery packs', 'product', 'assemble', 'cell-18650*2 bms-board nickel*2 pack-holder jst-xh', 'two cells in series in a printed holder, joined by nickel strip, behind a protection board', '7.2 V nominal');
e('pack-holder', 'cell holder', 'Electrical/Power/Battery packs', 'part', 'mould', 'abs', 'the holder two cells sit in', '', { alt: 'print', size: [40, 70, 20] });
e('heater-cartridge', 'cartridge heater', 'Electrical/Heating/Heaters', 'product', 'assemble', 'nichrome mgo stainless-304 lead-wire*2 fibreglass', 'a coil of nichrome packed in magnesium oxide in a stainless tube, its leads in glass-fibre sleeving', 'e.g. 40 W, 6 mm × 20 mm: the hot end\'s heater');
e('heated-bed', 'heated bed', 'Electrical/Heating/Heaters', 'product', 'assemble', 'al-6061 pcb-bare thermistor-ntc wire-hookup*2', 'a copper trace heater on a board under an aluminium plate, a thermistor in its middle', 'e.g. 220 × 220 mm, 12 V');
e('speaker', 'loudspeaker', 'Electrical/Audio/Speakers', 'product', 'assemble', 'ferrite-hard steel-low*2 winding paper rubber steel-low screw-terminal', 'a ring magnet between steel plates, a voice coil in the gap moving a paper cone held by a rubber surround and a spider, in a stamped basket');
e('buzzer-piezo', 'piezo buzzer', 'Electrical/Audio/Buzzers', 'product', 'assemble', 'pzt brass abs lead-wire*2', 'a PZT disc on a brass plate that flexes when driven, in a resonant case');
e('led-bulb', 'LED bulb (E27)', 'Electrical/Lighting/Bulbs', 'product', 'assemble', 'led-5mm*12 pcb-bare buck-module heatsink-cast pc brass glass', 'LEDs on an aluminium board on a cast heat sink, a driver in its neck, a diffusing dome over them, a brass screw base');
e('heatsink-cast', 'heat sink', 'Mechanical/Thermal/Heat sinks', 'part', 'cast', 'al-a380', 'a finned aluminium body that carries heat to the air', '', { size: [40, 40, 25] });
e('led-strip', 'addressable LED strip', 'Electrical/Lighting/Strips', 'product', 'solder', 'polyimide copper-foil ws2812b*60 smd-passives', '60 WS2812B LEDs a metre on a flexible copper-on-polyimide strip');
e('usb-cable', 'USB-C cable', 'Electrical/Wiring and connectors/Cables', 'product', 'assemble', 'wire-hookup*4 copper pvc usb-c-socket*2 pvc', 'four or more wires and a braided shield in a jacket, a connector moulded on each end');
e('multimeter', 'digital multimeter', 'Electrical/Instruments/Meters', 'product', 'assemble', 'meter-case pcb-bare ic-package fuse-glass*2 potentiometer lcd-glass probes', 'a measuring chip and its range resistors on a board turned by a rotary switch, fuses, an LCD, probes, in a moulded case');
e('meter-case', 'meter case', 'Electrical/Instruments/Meter parts', 'part', 'mould', 'abs', 'the two-piece case', '', { alt: 'print', size: [75, 150, 35] });
e('lcd-glass', 'LCD glass', 'Electrical/Instruments/Meter parts', 'part', 'fab', 'glass', 'liquid crystal between two patterned glass plates and polarisers');
e('probes', 'test probes', 'Electrical/Instruments/Meter parts', 'part', 'assemble', 'probe-tip*2 probe-handle*2 test-lead*2 banana-plug*2', 'sharp brass tips in moulded handles on silicone leads');

// ==== mechanical =======================================================================================================
e('bearing-ring', 'bearing ring', 'Mechanical/Bearings/Bearing parts', 'part', 'grind', 'steel-chrome', 'an inner or outer ring: turned, hardened, its raceway ground and honed');
e('bearing-ball', 'bearing ball', 'Mechanical/Bearings/Bearing parts', 'part', 'grind', 'steel-chrome', 'a chrome-steel ball ground and lapped round to under a micrometre');
e('bearing-cage', 'bearing cage', 'Mechanical/Bearings/Bearing parts', 'part', 'stamp', 'steel-low', 'the stamped steel cage that keeps the balls apart');
e('bearing-shield', 'bearing shield', 'Mechanical/Bearings/Bearing parts', 'part', 'stamp', 'steel-low', 'a pressed steel shield (the Z in 2Z) that keeps grease in and dirt out');
e('bearing-608', 'ball bearing 608 (8 × 22 × 7)', 'Mechanical/Bearings/Ball bearings', 'product', 'assemble', 'bearing-ring*2 bearing-ball*7 bearing-cage bearing-shield*2 grease', 'two rings, a row of balls in a cage, shields both sides, grease', '8 mm bore, 22 mm outside, 7 mm wide (ISO 15); 7 balls typical', { g: 12 });
e('lm8uu', 'linear bearing LM8UU', 'Mechanical/Bearings/Linear bearings', 'product', 'assemble', 'steel-chrome bearing-ball*40 pom nbr*2', 'a hardened sleeve round rows of balls that roll and come back round in a plastic retainer, sealed at both ends', 'for 8 mm rods; balls about 40, typical');
e('bushing-bronze', 'bronze bushing', 'Mechanical/Bearings/Plain bearings', 'product', 'sinter', 'bronze oil', 'an oil-soaked sintered bronze sleeve');
e('spur-gear', 'spur gear (module 1, 30 teeth)', 'Mechanical/Gears and gearboxes/Spur gears', 'product', 'machine', 'steel-low', 'a gear cut with involute teeth', 'pitch circle 30 mm (module × teeth)', { alt: 'print', size: [32, 32, 8] });
e('worm-set', 'worm and wheel', 'Mechanical/Gears and gearboxes/Worm gears', 'product', 'assemble', 'worm worm-wheel', 'a hardened steel worm turning a bronze wheel: a large ratio in one stage, and it does not drive back');
e('planet-gearbox', 'planetary gearbox', 'Mechanical/Gears and gearboxes/Gearboxes', 'product', 'assemble', 'gear-plastic*4 ring-gear planet-carrier bearing-608*2 shaft-steel gearbox-housing', 'a sun gear driving three planets inside a ring gear; the planets\' carrier is the output', 'ratio 1 + ring teeth ÷ sun teeth');
e('ring-gear', 'ring gear', 'Mechanical/Gears and gearboxes/Gearbox parts', 'part', 'machine', 'steel-low', 'internal teeth round the inside of a ring', '', { alt: 'print', size: [50, 50, 12] });
e('planet-carrier', 'planet carrier', 'Mechanical/Gears and gearboxes/Gearbox parts', 'part', 'machine', 'al-6061', 'the plate the planets turn on, its middle the output', '', { alt: 'print', size: [40, 40, 6] });
e('gearbox-housing', 'gearbox housing', 'Mechanical/Gears and gearboxes/Gearbox parts', 'part', 'cast', 'al-a380', 'the case that holds the bearings and the ring', '', { size: [60, 60, 30] });
e('gt2-pulley', 'GT2 pulley, 20 teeth', 'Mechanical/Linear motion/Belts and pulleys', 'product', 'machine', 'al-6061 screw-set*2', 'an aluminium pulley with 20 teeth for a 2 mm pitch belt, held by two set screws', '2 mm pitch: 40 mm a turn', { alt: 'print', size: [16, 16, 16] });
e('gt2-belt', 'GT2 belt (6 mm)', 'Mechanical/Linear motion/Belts and pulleys', 'product', 'mould', 'neoprene fibreglass', 'a toothed neoprene belt round glass-fibre tension cords', '2 mm pitch, 6 mm wide');
e('lead-screw-t8', 'T8 lead screw and nut', 'Mechanical/Linear motion/Screws', 'product', 'assemble', 'lead-screw lead-nut', 'a rolled-thread stainless screw and a brass nut', '8 mm, 2 mm pitch × 4 starts: 8 mm a turn (or 2 mm single-start)');
e('linear-rail', 'linear rail MGN12 with carriage', 'Mechanical/Linear motion/Rails', 'product', 'assemble', 'steel-chrome*2 bearing-ball*40 pom nbr grease', 'a ground steel rail and a carriage whose balls roll along it and recirculate through plastic end caps, wipers at each end', '12 mm rail');
e('smooth-rod', 'smooth rod, 8 mm', 'Mechanical/Linear motion/Rods', 'product', 'grind', 'steel-chrome', 'a hardened, ground, chromed rod for linear bearings to run on');
e('coupling-flex', 'flexible shaft coupling 5 × 8', 'Mechanical/Shafts and couplings/Couplings', 'product', 'machine', 'al-6061 screw-set*4', 'an aluminium cylinder cut in a helix so it bends but not twists, clamped to each shaft', '', { alt: 'print', size: [19, 19, 25] });
e('shaft-collar', 'shaft collar', 'Mechanical/Shafts and couplings/Collars', 'product', 'machine', 'steel-low screw-set', 'a ring clamped on a shaft by a set screw', '', { alt: 'print', size: [16, 16, 8] });
e('spring-compression', 'compression spring', 'Mechanical/Springs/Compression', 'product', 'coil', 'steel-spring', 'music wire coiled on a mandrel, ends closed and ground, stress-relieved', 'rate k = G d⁴ / (8 D³ n)');
e('spring-extension', 'extension spring', 'Mechanical/Springs/Extension', 'product', 'coil', 'steel-spring', 'tightly coiled wire with a hook at each end');
e('spring-torsion', 'torsion spring', 'Mechanical/Springs/Torsion', 'product', 'coil', 'steel-spring', 'a coil whose legs are twisted round its axis');
e('gas-spring', 'gas spring', 'Mechanical/Springs/Gas springs', 'product', 'assemble', 'gas-spring-tube gas-spring-rod gas-spring-piston rod-seal nitrogen oil', 'nitrogen under pressure in a steel tube pushes a piston rod out through a seal');
e('caster', 'swivel caster', 'Mechanical/Wheels and casters/Casters', 'product', 'assemble', 'wheel-pu steel-low bearing-ball*20 screw-m5', 'a wheel on an axle in a stamped fork that swivels on a ring of balls under its plate');
e('wheel-pu', 'polyurethane wheel', 'Mechanical/Wheels and casters/Wheels', 'product', 'mould', 'pu pp', 'a polyurethane tread moulded onto a polypropylene hub', '', { alt: 'print', size: [50, 50, 20] });
e('wheel-robot', 'robot wheel 65 mm', 'Mechanical/Wheels and casters/Wheels', 'product', 'assemble', 'rubber wheel-hub', 'a rubber tyre on a plastic hub for a gear motor\'s shaft');
e('wheel-hub', 'wheel hub', 'Mechanical/Wheels and casters/Wheel parts', 'part', 'mould', 'pp', 'the hub of a small wheel', '', { alt: 'print', size: [60, 60, 20] });
e('omni-wheel', 'omni wheel', 'Mechanical/Wheels and casters/Wheels', 'product', 'assemble', 'wheel-hub*2 roller*12 shaft-steel*12', 'two hubs with free rollers round their rim, so it rolls sideways as well as forward');
e('roller', 'omni roller', 'Mechanical/Wheels and casters/Wheel parts', 'part', 'mould', 'pu', 'a small free roller', '', { alt: 'print', size: [10, 10, 15] });
e('hinge-butt', 'butt hinge', 'Mechanical/Hinges and joints/Hinges', 'product', 'assemble', 'hinge-leaf*2 steel-low', 'two stamped leaves rolled round a steel pin');
e('hinge-leaf', 'hinge leaf', 'Mechanical/Hinges and joints/Hinge parts', 'part', 'stamp', 'steel-low', 'a stamped leaf, its edge rolled into knuckles', '', { alt: 'print', size: [40, 30, 2] });
e('rod-end', 'rod end (ball joint)', 'Mechanical/Hinges and joints/Ball joints', 'product', 'assemble', 'rodend-housing rodend-ball rodend-liner', 'a steel housing round a hardened ball with a bore, in a PTFE liner');
e('u-joint', 'universal joint', 'Mechanical/Hinges and joints/Universal joints', 'product', 'assemble', 'steel-alloy*3 bearing-ball*40', 'two yokes joined by a cross on four needle-bearing cups');
e('pump-gear', 'gear pump', 'Mechanical/Fluid power/Pumps', 'product', 'assemble', 'pump-housing spur-gear*2 shaft-steel*2 bushing-bronze*4 nbr', 'two meshing gears in a close-fitting housing carry fluid round the outside from inlet to outlet');
e('pump-housing', 'pump housing', 'Mechanical/Fluid power/Pump parts', 'part', 'cast', 'al-a380', 'the body the gears fit closely in', '', { size: [60, 50, 40] });
e('pump-peristaltic', 'peristaltic pump', 'Mechanical/Fluid power/Pumps', 'product', 'assemble', 'n20-motor roller*3 silicone pump-head', 'rollers on a gear motor squeeze a silicone tube against a curved track, pushing what is in it along');
e('pump-head', 'peristaltic pump head', 'Mechanical/Fluid power/Pump parts', 'part', 'mould', 'abs', 'the curved track and its cover', '', { alt: 'print', size: [40, 40, 25] });
e('valve-ball', 'ball valve', 'Mechanical/Fluid power/Valves', 'product', 'assemble', 'valve-body brass ptfe*2 brass steel-low nbr', 'a bored ball turned a quarter turn by a stem between two PTFE seats in a brass body; a handle on the stem');
e('valve-body', 'valve body', 'Mechanical/Fluid power/Valve parts', 'part', 'forge', 'brass', 'the forged brass body', '', { alt: 'cast', size: [50, 30, 30] });
e('valve-solenoid', 'solenoid valve', 'Mechanical/Fluid power/Valves', 'product', 'assemble', 'valve-body bobbin winding steel-low spring-compression nbr', 'a coil lifts a plunger off its seat against a spring; a diaphragm opens the flow');
e('cylinder-hydraulic', 'hydraulic cylinder', 'Mechanical/Fluid power/Cylinders', 'product', 'assemble', 'cylinder-barrel piston-rod cylinder-piston cylinder-gland cylinder-cap rod-seal piston-seal wiper-seal seal-ring*2 oil', 'a honed steel barrel, a piston with seals on a chromed rod, end caps with ports', 'force = pressure × piston area');
e('extrusion-2020', 'aluminium extrusion 2020', 'Hardware/Structural/Extrusions', 'product', 'extrude', 'al-6063', 'a T-slot profile extruded from 6063 and aged', '20 × 20 mm, 6 mm slots; about 0.5 kg a metre');

// ==== hardware =========================================================================================================
e('screw-m3', 'M3 × 10 socket head cap screw', 'Hardware/Fasteners/Screws', 'product', 'roll-thread', 'steel-alloy', 'alloy steel wire cold-headed to its head and socket, its thread rolled, hardened and tempered, black-oxided', 'ISO 4762; 0.5 mm pitch (ISO 261); class 12.9 typical', { g: 1 });
e('screw-m5', 'M5 × 16 hex bolt', 'Hardware/Fasteners/Bolts', 'product', 'roll-thread', 'steel-low zinc', 'steel wire headed and trimmed to a hex, its thread rolled, zinc-plated', 'ISO 4017; 0.8 mm pitch');
e('screw-set', 'M3 set screw', 'Hardware/Fasteners/Screws', 'product', 'roll-thread', 'steel-alloy', 'a headless screw with a socket and a cup point', 'ISO 4029');
e('screw-wood', 'wood screw', 'Hardware/Fasteners/Screws', 'product', 'roll-thread', 'steel-low zinc', 'a tapered, coarse thread that cuts its own way');
e('nut-m3', 'M3 hex nut', 'Hardware/Fasteners/Nuts', 'product', 'cold-head', 'steel-low zinc', 'cold-formed from wire, pierced and tapped, zinc-plated', 'ISO 4032; 5.5 mm across flats');
e('nut-lock', 'M3 nylon lock nut', 'Hardware/Fasteners/Nuts', 'product', 'assemble', 'nut-m3 nylon', 'a nut with a nylon ring that grips the thread so it does not shake loose', 'ISO 10511');
e('washer-m3', 'M3 washer', 'Hardware/Fasteners/Washers', 'product', 'stamp', 'steel-low', 'a ring stamped from sheet', 'ISO 7089: 3.2 × 7 × 0.5 mm');
e('insert-m3', 'M3 heat-set insert', 'Hardware/Fasteners/Inserts', 'product', 'machine', 'brass', 'a knurled brass insert pressed hot into a printed part to give it a metal thread', '', { alt: 'cast', size: [5, 5, 4] });
e('t-nut', 'T-nut for 2020 slot', 'Hardware/Fasteners/Nuts', 'product', 'machine', 'steel-low zinc', 'a nut shaped to slide in the extrusion\'s slot', '', { alt: 'print', size: [10, 6, 4] });
e('rivet-pop', 'blind rivet', 'Hardware/Fasteners/Rivets', 'product', 'cold-head', 'al-6061 steel-low', 'an aluminium sleeve on a steel mandrel: pulled, the mandrel swells the sleeve and snaps off');
e('standoff', 'M3 standoff', 'Hardware/Fasteners/Spacers', 'product', 'machine', 'brass', 'a hex spacer threaded both ends, for boards', '', { alt: 'print', size: [5, 5, 10] });
e('bracket-corner', 'corner bracket (2020)', 'Hardware/Structural/Brackets', 'product', 'cast', 'al-a380', 'an L-shaped cast bracket with ribs, for joining extrusions at right angles', '', { size: [20, 20, 20] });
e('sheet-al', 'aluminium sheet 2 mm', 'Hardware/Structural/Sheet', 'product', 'extrude', 'al-6061', 'aluminium rolled to 2 mm');
e('tube-steel', 'square steel tube 20 × 20', 'Hardware/Structural/Tube', 'product', 'weld', 'steel-low', 'strip rolled into a square and seam-welded', '1.5 mm wall');
e('acrylic-sheet', 'acrylic sheet 3 mm', 'Hardware/Structural/Sheet', 'product', 'chemistry', 'pmma', 'cast PMMA sheet');
e('plywood', 'birch plywood 6 mm', 'Hardware/Structural/Sheet', 'product', 'laminate', 'wood-veneer*5 glue', 'odd numbers of veneers, grain crossed, glued and pressed');
e('screwdriver', 'screwdriver', 'Hardware/Hand tools/Drivers', 'product', 'assemble', 'driver-shaft driver-handle', 'a hardened tool-steel shaft with a shaped tip, in a moulded handle');
e('driver-shaft', 'screwdriver shaft', 'Hardware/Hand tools/Tool parts', 'part', 'heat-treat', 'steel-tool', 'a tool-steel rod forged or ground to its tip, hardened and tempered');
e('driver-handle', 'screwdriver handle', 'Hardware/Hand tools/Tool parts', 'part', 'mould', 'pp', 'a moulded grip', '', { alt: 'print', size: [30, 30, 100] });
e('hex-key', 'hex key', 'Hardware/Hand tools/Drivers', 'product', 'heat-treat', 'steel-tool', 'hex bar bent to an L, hardened and tempered', 'ISO 2936');
e('pliers', 'pliers', 'Hardware/Hand tools/Pliers', 'product', 'assemble', 'plier-jaw*2 plier-rivet handle-grip*2', 'two forged, hardened halves riveted at their pivot, grips on the handles');
e('caliper-digital', 'digital caliper', 'Hardware/Hand tools/Measuring', 'product', 'assemble', 'stainless-304 pcb-bare ic-package lcd-glass abs', 'a stainless beam and jaws; a capacitive encoder on the slider reads where it is to 0.01 mm on an LCD');
e('soldering-iron', 'soldering iron', 'Hardware/Hand tools/Soldering', 'product', 'assemble', 'heater-cartridge copper iron-plating driver-handle wire-hookup*3 thermistor-ntc', 'a heater in a copper tip plated with iron, its temperature read by a sensor, in an insulated handle');
e('iron-plating', 'iron-plated tip', 'Hardware/Hand tools/Soldering', 'part', 'coat', 'steel-low', 'the iron plating that keeps solder from eating a copper tip');

// ==== more products, mapped the same way ================================================================================
m('eva', 'EVA film', 'Polymers/Films', 'ethylene-vinyl acetate: the clear glue film solar cells are laid in', '');
m('pet', 'PET film', 'Polymers/Films', 'polyester film: backsheets, insulation', '');
m('al-laminate', 'aluminium-laminate film', 'Composites/Laminates', 'aluminium foil between plastic films: the skin of a pouch cell', '');
m('silver-paste', 'silver paste', 'Electrical materials/Conductors', 'silver powder in a binder, printed and fired as a solar cell\'s fingers', '');
m('nickel-alloy', 'nickel alloy', 'Metals/Other metals', 'nickel with chromium and iron, for spark-plug electrodes', '');
// a 3D printer and what it is made of
e('fan-frame', 'fan frame', 'Electrical/Motors and actuators/Fan parts', 'part', 'mould', 'pbt', 'the square moulded frame and its struts', '', { alt: 'print', size: [40, 40, 10] });
e('fan-impeller', 'fan impeller', 'Electrical/Motors and actuators/Fan parts', 'part', 'mould', 'pbt ferrite-hard', 'the moulded blades round a hub lined with a magnet ring', '', { alt: 'print', size: [38, 38, 9] });
e('nozzle', 'nozzle, 0.4 mm', 'Mechanical/3D printer parts/Hot end', 'part', 'machine', 'brass', 'a brass nozzle turned with a 0.4 mm bore at its tip', 'M6 thread (the common size)');
e('heat-block', 'heater block', 'Mechanical/3D printer parts/Hot end', 'part', 'machine', 'al-6061', 'an aluminium block that holds the heater, the thermistor and the nozzle', '', { alt: 'cast', size: [20, 16, 11] });
e('heat-break', 'heat break', 'Mechanical/3D printer parts/Hot end', 'part', 'machine', 'stainless-304', 'a thin-walled stainless tube that keeps the heat from climbing to the cold end');
e('hotend-sink', 'hot end heat sink', 'Mechanical/3D printer parts/Hot end', 'part', 'extrude', 'al-6063', 'a finned aluminium cold end, cooled by a fan', '', { alt: 'cast', size: [22, 22, 26] });
e('hotend', 'hot end', 'Mechanical/3D printer parts/Hot end', 'assembly', 'assemble', 'nozzle heat-block heat-break hotend-sink heater-cartridge thermistor-ntc fan-30', 'a heater block melting filament through a nozzle, a heat break and finned sink keeping the upper part cold, a fan on the sink', 'about 200–260 °C for PLA to PETG');
e('fan-30', 'fan, 30 mm', 'Electrical/Motors and actuators/Fans', 'product', 'assemble', 'fan-frame fan-impeller winding*4 ic-package sleeve-bearing wire-hookup*2', 'a small brushless fan', '30 × 30 × 10 mm');
e('drive-gear', 'extruder drive gear', 'Mechanical/3D printer parts/Extruder', 'part', 'machine', 'steel-alloy', 'a hardened toothed wheel that grips the filament and drives it', '');
e('extruder-body', 'extruder body', 'Mechanical/3D printer parts/Extruder', 'part', 'mould', 'nylon', 'the body that holds the gear, the idler and the filament path', '', { alt: 'print', size: [42, 42, 25] });
e('extruder', 'extruder', 'Mechanical/3D printer parts/Extruder', 'assembly', 'assemble', 'extruder-body nema17 drive-gear bearing-625 spring-compression screw-m3*4', 'a stepper turning a drive gear that presses the filament against a sprung bearing and pushes it into the hot end');
e('printer-board', 'printer control board', 'Electrical/Boards and controllers/Machine controllers', 'product', 'solder', 'pcb-bare ic-package a4988-board*4 mosfet-to220*2 screw-terminal*4 smd-passives', 'a microcontroller reading G-code, four stepper drivers, MOSFETs for the heaters, terminals for everything');
e('transformer-ferrite', 'switching transformer', 'Electrical/Power/Transformers', 'assembly', 'wind', 'ferrite-soft bobbin winding*3', 'windings on a ferrite core, for the high frequency a switching supply runs at');
e('psu-24v', 'switching power supply, 24 V', 'Electrical/Power/Power supplies', 'product', 'assemble', 'psu-case pcb-bare transformer-ferrite mosfet-to220 diode-1n4007*4 capacitor-electrolytic*3 ic-package fuse-glass screw-terminal fan-30', 'mains rectified, chopped at high frequency through a ferrite transformer, rectified and smoothed again, regulated by a controller chip, in a vented steel case', 'e.g. 24 V, 15 A');
e('psu-case', 'power supply case', 'Electrical/Power/Power supplies', 'part', 'stamp', 'steel-low zinc', 'a punched and folded sheet-steel case', '', { alt: 'bend', size: [215, 115, 50] });
e('lcd-module', 'display module', 'Electrical/Instruments/Displays', 'product', 'assemble', 'lcd-glass led-5mm*4 pcb-bare ic-package', 'a liquid-crystal panel, its backlight LEDs and its driver chip on a board');
e('printer-frame', 'printer frame', 'Mechanical/3D printer parts/Frame', 'assembly', 'assemble', 'extrusion-2020*8 bracket-corner*8 t-nut*32 screw-m3*32', 'aluminium extrusions joined by cast corner brackets and T-nuts');
e('printer-fdm', 'FDM 3D printer', 'Electrical/Machines/3D printers', 'product', 'assemble', 'printer-frame nema17*4 hotend extruder heated-bed printer-board psu-24v lcd-module gt2-belt*2 gt2-pulley*2 linear-rail*3 lead-screw-t8 coupling-flex wire-hookup*20 jst-xh*10', 'a frame carrying a hot end on belts and rails over a heated bed, steppers moving each axis, a board reading G-code, a power supply, a display', 'e.g. 220 × 220 × 250 mm build volume');
// a quadcopter
e('esc', 'electronic speed controller', 'Electrical/Boards and controllers/Motor drivers', 'product', 'solder', 'pcb-bare mosfet-to220*6 ic-package capacitor-electrolytic smd-passives wire-hookup*5', 'six MOSFETs switching a brushless motor\'s three phases in turn, timed by a microcontroller');
e('flight-controller', 'flight controller', 'Electrical/Boards and controllers/Flight controllers', 'product', 'solder', 'pcb-bare ic-package*2 mpu6050-board smd-passives pin-header', 'a microcontroller reading its gyro and accelerometer hundreds of times a second and setting each motor\'s speed to keep level');
e('propeller', 'propeller', 'Mechanical/Wheels and casters/Propellers', 'part', 'mould', 'nylon fibreglass', 'two moulded blades, pitched to push air down', '', { alt: 'print', size: [127, 12, 8] });
e('frame-quad', 'quadcopter frame', 'Mechanical/Structures/Frames', 'part', 'machine', 'cfrp', 'carbon-fibre plates cut to arms and a body', '', { alt: 'print', size: [220, 220, 4] });
e('pouch-cell', 'lithium polymer pouch cell', 'Electrical/Power/Cells', 'product', 'assemble', 'cathode-sheet anode-sheet separator-film*2 electrolyte-li pouch-film cell-tab*2', 'stacked cathode, separator and anode sheets sealed in an aluminium-laminate pouch', '3.7 V nominal');
e('xt60', 'XT60 connector', 'Electrical/Wiring and connectors/Connectors', 'part', 'mould', 'nylon brass gold', 'a moulded body round two gold-plated brass contacts, for battery current', 'about 60 A');
e('pack-lipo-4s', 'LiPo pack 4S', 'Electrical/Power/Battery packs', 'product', 'assemble', 'pouch-cell*4 xt60 jst-xh wire-hookup*2 pe', 'four pouch cells in series, wrapped, a main lead and a balance lead', '14.8 V nominal');
e('rc-receiver', 'radio receiver', 'Electrical/Boards and controllers/Radio', 'product', 'solder', 'pcb-bare ic-package crystal wire-hookup', 'a 2.4 GHz radio chip and its antenna wire, passing the sticks\' positions on');
e('quadcopter', 'quadcopter drone', 'Electrical/Machines/Drones', 'product', 'assemble', 'frame-quad bldc-outrunner*4 esc*4 flight-controller propeller*4 pack-lipo-4s camera-module rc-receiver screw-m3*24', 'four brushless motors on a frame, each with its controller, a flight controller keeping it level, a battery, a camera, a radio', 'it lifts what its four motors\' thrust exceeds its weight by');
// a cordless drill
e('drill-chuck', 'keyless chuck', 'Mechanical/Tools parts/Chucks', 'assembly', 'assemble', 'chuck-body chuck-jaw*3 chuck-nut chuck-sleeve', 'three hardened jaws driven in and out of a body by a threaded sleeve');
e('clutch-drill', 'torque clutch', 'Mechanical/Gears and gearboxes/Clutches', 'assembly', 'assemble', 'spring-compression*6 bearing-ball*6 steel-low', 'balls pressed by springs into a ring gear\'s face: past the torque set, they ride out and it slips');
e('trigger-switch', 'variable-speed trigger', 'Electrical/Switching/Switches', 'product', 'assemble', 'pcb-bare mosfet-to220 abs brass spring-compression', 'a trigger that slides a contact along a resistive track and a MOSFET that sets the motor\'s speed from it, with forward and reverse');
e('tool-housing', 'tool housing', 'Hardware/Hand tools/Tool parts', 'part', 'mould', 'abs', 'the two-part moulded body of a power tool', '', { alt: 'print', size: [200, 60, 180] });
e('drill-cordless', 'cordless drill', 'Hardware/Power tools/Drills', 'product', 'assemble', 'tool-housing dcmotor-550 planet-gearbox clutch-drill drill-chuck trigger-switch pack-5s screw-m3*12', 'a motor through a planetary gearbox and a torque clutch to a chuck, a trigger setting its speed, a battery pack', 'e.g. 18 V');
e('dcmotor-550', 'brushed DC motor 550', 'Electrical/Motors and actuators/DC motors', 'product', 'assemble', 'motor-can magnet-ferrite-arc*2 armature end-cap-motor carbon-brush*2 brush-spring*2 sleeve-bearing*2', 'the 550-size motor of many drills', 'about 36 mm across, 57 mm long (typical)');
e('pack-5s', 'battery pack 5S (18 V)', 'Electrical/Power/Battery packs', 'product', 'assemble', 'cell-18650*5 bms-board nickel*5 pack-holder', 'five cells in series in a clip-on case with a protection board', '18 V nominal');
// a desk fan
e('rotor-cage', 'squirrel-cage rotor', 'Electrical/Motors and actuators/Motor parts', 'assembly', 'cast', 'lamination-stack al-a380 shaft-steel', 'a laminated rotor with aluminium bars cast through it and shorted by rings at each end');
e('motor-shaded-pole', 'shaded-pole motor', 'Electrical/Motors and actuators/AC motors', 'product', 'assemble', 'lamination-stack winding copper rotor-cage sleeve-bearing*2 steel-low', 'a mains coil on a laminated core, a copper ring round part of each pole lagging its field so it turns the cage rotor');
e('fan-blade', 'fan blade', 'Mechanical/Wheels and casters/Propellers', 'part', 'mould', 'pp', 'moulded blades round a hub', '', { alt: 'print', size: [300, 300, 40] });
e('fan-guard', 'fan guard', 'Hardware/Structural/Wire forms', 'part', 'bend', 'steel-low', 'steel wire bent into rings and spokes and welded', '');
e('desk-fan', 'desk fan', 'Electrical/Appliances/Fans', 'product', 'assemble', 'motor-shaded-pole fan-blade fan-guard*2 tool-housing gear-plastic*3 pushbutton*3 wire-hookup*3', 'a shaded-pole motor turning blades between two guards, a little gearbox nodding it side to side, speed buttons, on a base');
// a computer mouse and a keyboard
e('micro-switch', 'micro switch', 'Electrical/Switching/Switches', 'product', 'assemble', 'switch-housing switch-actuator contact-spring contact-silver*3 switch-terminal*3', 'a snap-action leaf of phosphor bronze over silver contacts, in a moulded case', 'the click of a mouse button');
e('encoder-rotary', 'rotary encoder', 'Electrical/Sensors/Position', 'product', 'assemble', 'switch-housing code-disc contact-spring*3 pot-shaft detent-spring pcb-pin*5', 'sprung contacts wiping a patterned disc: two signals a quarter out of step say which way it turns');
e('optical-sensor', 'optical mouse sensor', 'Electrical/Sensors/Imaging', 'product', 'assemble', 'image-sensor lens-stack led-5mm', 'a tiny camera taking thousands of pictures a second of the surface, lit by an LED, working out how far they moved');
e('mouse-shell', 'mouse shell', 'Electrical/Computer parts/Cases', 'part', 'mould', 'abs', 'the top and bottom of a mouse', '', { alt: 'print', size: [65, 115, 38] });
e('mouse', 'computer mouse', 'Electrical/Computer parts/Input', 'product', 'assemble', 'mouse-shell pcb-bare optical-sensor micro-switch*3 encoder-rotary rubber ic-package usb-cable ptfe', 'an optical sensor and a chip that reports its moves over USB, three switches under its buttons, a wheel on an encoder, in a shell on PTFE feet');
e('keyswitch', 'mechanical key switch', 'Electrical/Switching/Switches', 'product', 'assemble', 'switch-housing*2 switch-stem spring-compression phosphor-bronze*2', 'a stem riding in a housing on a spring, pressing two phosphor-bronze leaves together', 'e.g. 4 mm travel, made at about 2 mm');
e('switch-housing', 'switch housing', 'Electrical/Switching/Switch parts', 'part', 'mould', 'pc', 'the top or bottom of a key switch', '', { alt: 'print', size: [15, 15, 6] });
e('switch-stem', 'switch stem', 'Electrical/Switching/Switch parts', 'part', 'mould', 'pom', 'the cross-topped stem a keycap sits on', '', { alt: 'print', size: [6, 6, 10] });
e('keycap', 'keycap', 'Electrical/Computer parts/Keycaps', 'part', 'mould', 'pbt', 'a moulded cap with its legend', '', { alt: 'print', size: [18, 18, 8] });
e('keyboard', 'mechanical keyboard', 'Electrical/Computer parts/Input', 'product', 'assemble', 'keyswitch*104 keycap*104 pcb-bare ic-package diode-1n4007*104 usb-c-socket tool-housing screw-m3*8', 'a switch under each key, wired as a matrix with a diode at each, scanned by a microcontroller that sends keys over USB');
// a kettle
e('bimetal-strip', 'bimetal disc', 'Mechanical/Thermal/Thermostats', 'part', 'laminate', 'steel-low brass', 'two metals bonded together: heated, one grows more, and the disc snaps over', '');
e('thermostat-bimetal', 'kettle thermostat', 'Mechanical/Thermal/Thermostats', 'product', 'assemble', 'bimetal-strip silver phosphor-bronze pbt', 'steam on a bimetal disc snaps it over and opens the contacts', 'opens at the boil');
e('heating-element', 'sheathed heating element', 'Electrical/Heating/Heaters', 'product', 'assemble', 'heater-sheath resistance-wire terminal-pin*2 mgo', 'a nichrome coil packed in magnesium oxide in a stainless tube, bent to shape', 'e.g. 2 kW at 230 V: 26 Ω');
e('kettle', 'electric kettle', 'Electrical/Appliances/Kettles', 'product', 'assemble', 'stainless-304 heating-element thermostat-bimetal pp brass pushbutton nbr', 'a stainless body over a sheathed element, a bimetal thermostat that switches it off at the boil, a base whose ring contacts let it sit any way round');
// a solar panel
e('solar-cell', 'silicon solar cell', 'Electrical/Power/Solar', 'product', 'fab', 'silicon silver-paste al-foil', 'a doped silicon wafer: light frees charges across its junction; silver fingers on its face and aluminium on its back collect them', 'about 0.6 V');
e('junction-box', 'junction box', 'Electrical/Power/Solar', 'product', 'assemble', 'abs diode-1n4007*3 wire-hookup*2 copper', 'a box on the back with bypass diodes and the panel\'s leads');
e('solar-panel', 'solar panel', 'Electrical/Power/Solar', 'product', 'laminate', 'solar-cell*60 glass eva*2 pet extrusion-2020*4 junction-box copper', 'sixty cells strung in series, laid in EVA between glass and a backsheet, laminated, framed in aluminium', 'about 30 V at its best');
// boards
e('arduino-uno', 'Arduino Uno', 'Electrical/Boards and controllers/Microcontroller boards', 'product', 'solder', 'pcb-bare ic-package*3 crystal*2 usb-c-socket pin-header*4 led-5mm*4 pushbutton smd-passives', 'an ATmega328P microcontroller, a USB chip to program it, a regulator, a crystal, headers for everything', '16 MHz, 5 V');
e('raspberry-pi', 'Raspberry Pi', 'Electrical/Boards and controllers/Single-board computers', 'product', 'solder', 'pcb-bare ic-package*5 usb-c-socket*3 pin-header*2 smd-passives stainless-304', 'a system-on-chip, its RAM, a power chip, Ethernet and USB chips, a shielded Wi-Fi module and its connectors, on a many-layer board', '');
// a flashlight and a smoke alarm
e('flashlight', 'LED flashlight', 'Electrical/Lighting/Flashlights', 'product', 'assemble', 'tube-flash led-5mm buck-module pc glass pushbutton cell-18650 spring-compression nbr*2', 'a power LED behind a reflector and a glass lens, a driver keeping its current steady, a switch and a cell, in a sealed aluminium tube');
e('tube-flash', 'flashlight body', 'Electrical/Lighting/Flashlight parts', 'part', 'machine', 'al-6061', 'the turned aluminium tube, anodised', '', { alt: 'cast', size: [25, 25, 120] });
e('smoke-alarm', 'smoke alarm', 'Electrical/Safety/Alarms', 'product', 'assemble', 'abs led-5mm*2 ic-package buzzer-piezo pushbutton cell-18650 pcb-bare', 'an infrared LED and a sensor at an angle in a dark chamber: smoke scatters the light onto the sensor, and a chip sounds the buzzer');
// a car's spark plug and alternator
e('spark-plug', 'spark plug', 'Mechanical/Vehicle parts/Ignition', 'product', 'assemble', 'spark-plug-shell spark-plug-insulator centre-electrode ground-electrode terminal-stud sealing-washer glass', 'a steel shell, a sintered alumina insulator, a copper-cored nickel-alloy centre electrode and a ground electrode a gap away', 'e.g. 14 mm thread; gap about 0.7–1.1 mm');
e('rotor-claw', 'claw-pole rotor', 'Electrical/Motors and actuators/Motor parts', 'assembly', 'assemble', 'steel-low*2 winding copper shaft-steel', 'a field coil between two interlocking steel claw poles on the shaft, fed through two slip rings');
e('alternator', 'car alternator', 'Mechanical/Vehicle parts/Charging', 'product', 'assemble', 'lamination-stack winding*3 rotor-claw diode-1n4007*6 ic-package carbon-brush*2 bearing-608*2 al-a380*2 steel-low', 'a claw-pole rotor spun by the engine inside a three-phase stator, six diodes rectifying its output, a regulator setting its field', 'about 14 V');

// the fixed sizes a family makes any size of: called by the family's words for another size
// ==== parts broken out of bought products (the breakdown queue, src/nexus/breakdown.ts) ================================
// Each is what a product family that is made by assembling parts is made of, written once for all its sizes; the shared
// ones (a lead, a die, a contact, a housing) are the same entry in every family that has them. Typical constructions.
m('ruthenium-oxide', 'ruthenium oxide', 'Electrical materials/Resistive', 'RuO₂: the conducting phase of thick-film resistor pastes', '');
m('aramid', 'aramid yarn', 'Polymers/Fibres', 'poly-paraphenylene terephthalamide: the strength yarn of cables', '');
// chip resistors (thick film)
e('chip-substrate', 'chip substrate', 'Electrical/Passive components/Chip parts', 'part', 'sinter', 'alumina', 'a 96 % alumina chip, scribed and snapped from a fired sheet');
e('resistive-film', 'resistive film', 'Electrical/Passive components/Chip parts', 'part', 'coat', 'ruthenium-oxide glass', 'ruthenium oxide in glass frit, screen-printed between the terminations, fired near 850 °C and laser-trimmed to its value');
e('overglaze', 'overglaze and overcoat', 'Electrical/Passive components/Chip parts', 'part', 'coat', 'glass epoxy', 'a fired glass layer over the film, an epoxy coat over that, its value marked on it');
e('chip-termination', 'chip termination', 'Electrical/Passive components/Chip parts', 'part', 'coat', 'silver-paste nickel tin', 'a fired silver end electrode, a nickel barrier plated over it, tin plated over that to solder');
// boxes
e('corrugated-board', 'corrugated board', 'Materials/Packaging', 'part', 'laminate', 'paper glue', 'two kraft liners glued either side of a fluted medium (single wall)');
// terminal blocks
e('terminal-housing', 'terminal block housing', 'Electrical/Connectors/Terminal parts', 'part', 'mould', 'pbt', 'the moulded body that holds a row of clamps and their pins');
e('terminal-clamp', 'terminal clamp', 'Electrical/Connectors/Terminal parts', 'part', 'stamp', 'brass tin', 'a rising cage clamp and the pin it is one with, stamped from brass and tinned');
e('terminal-screw', 'terminal screw', 'Electrical/Connectors/Terminal parts', 'part', 'cold-head', 'steel-low zinc', 'the slotted screw that draws its clamp onto the wire');
e('terminal-spring', 'terminal spring', 'Electrical/Connectors/Terminal parts', 'part', 'stamp', 'stainless-304', 'the leaf spring that presses the wire to its bar, opened by a push button');
// cables
e('insulated-conductor', 'insulated conductor', 'Electrical/Wiring and connectors/Cable parts', 'part', 'extrude', 'copper pe', 'a copper conductor with its insulation extruded over it, twisted with its pair');
e('cable-jacket', 'cable jacket', 'Electrical/Wiring and connectors/Cable parts', 'part', 'extrude', 'pvc', 'the outer sheath extruded over a cable\'s cores');
e('plug-body', 'plug body', 'Electrical/Connectors/Plug parts', 'part', 'mould', 'pc', 'a clear moulded modular plug body with its latch');
e('contact-blade', 'blade contact', 'Electrical/Connectors/Plug parts', 'part', 'stamp', 'phosphor-bronze gold', 'a stamped blade that cuts through a conductor\'s insulation when the plug is crimped, gold-plated where it meets');
e('rj45-plug', 'RJ45 plug (8P8C)', 'Electrical/Connectors/Modular', 'assembly', 'crimp', 'plug-body contact-blade*8', 'eight blade contacts in a moulded body, crimped onto a cable\'s conductors', 'TIA-568');
e('boot', 'strain relief boot', 'Electrical/Wiring and connectors/Cable parts', 'part', 'mould', 'pvc', 'a moulded sleeve where a cable meets its plug');
e('optical-fibre', 'optical fibre', 'Electrical/Optical/Fibre parts', 'part', 'draw', 'quartz', 'a silica core and cladding drawn from a preform, 125 µm across, coated in acrylate to 250 µm');
e('tight-buffer', 'tight buffer', 'Electrical/Optical/Fibre parts', 'part', 'extrude', 'pvc', 'a 900 µm plastic sleeve extruded over a fibre\'s coating');
e('strength-yarn', 'strength yarn', 'Electrical/Optical/Fibre parts', 'part', 'stock', 'aramid', 'aramid yarn laid along the fibre to take the pull');
e('ferrule', 'ferrule', 'Electrical/Optical/Fibre parts', 'part', 'sinter', 'zirconia', 'a zirconia sleeve bored to the fibre, its end polished: it aligns two fibres to a micrometre');
e('ferrule-spring', 'ferrule spring', 'Electrical/Optical/Fibre parts', 'part', 'coil', 'stainless-304', 'the coil that presses one ferrule to the other');
e('fibre-connector-body', 'fibre connector body', 'Electrical/Optical/Fibre parts', 'part', 'mould', 'pbt', 'the moulded housing and latch of an LC or SC connector');
e('fibre-connector', 'fibre connector', 'Electrical/Optical/Connectors', 'assembly', 'assemble', 'ferrule ferrule-spring fibre-connector-body', 'a ferrule held on its spring in a moulded latching body', 'IEC 61754');
// crystals
e('quartz-blank', 'quartz blank', 'Electrical/Passive components/Crystal parts', 'part', 'grind', 'quartz silver', 'an AT-cut quartz wafer lapped to its frequency, silver electrodes evaporated on its faces');
e('crystal-base', 'crystal base', 'Electrical/Passive components/Crystal parts', 'part', 'stamp', 'steel-low glass', 'a steel header, its two leads through glass seals, the clips that hold the blank on them');
e('crystal-can', 'crystal can', 'Electrical/Passive components/Crystal parts', 'part', 'stamp', 'steel-low nickel', 'a deep-drawn nickel-plated can, sealed onto the base in dry nitrogen');
e('ceramic-package', 'ceramic package', 'Electrical/Passive components/Crystal parts', 'part', 'sinter', 'alumina tungsten gold', 'a fired alumina cavity with printed tungsten tracks and gold-plated pads');
e('seam-lid', 'seam-welded lid', 'Electrical/Passive components/Crystal parts', 'part', 'stamp', 'steel-low nickel', 'a nickel-plated lid seam-welded over the cavity');
// speakers
e('speaker-cone', 'speaker cone', 'Electrical/Audio/Speaker parts', 'part', 'mould', 'paper', 'a cone formed from paper pulp');
e('voice-coil', 'voice coil', 'Electrical/Audio/Speaker parts', 'part', 'wind', 'magnet-wire paper', 'magnet wire wound on a paper former, hung in the magnet\'s gap');
e('speaker-magnet', 'speaker magnet', 'Electrical/Audio/Speaker parts', 'part', 'sinter', 'ferrite-hard', 'a sintered ferrite ring magnet');
e('top-plate', 'top plate', 'Electrical/Audio/Speaker parts', 'part', 'stamp', 'steel-low', 'the steel ring over the magnet that makes the gap\'s outer wall');
e('speaker-yoke', 'back plate and pole', 'Electrical/Audio/Speaker parts', 'part', 'cold-head', 'steel-low', 'the steel back plate and centre pole that close the magnet\'s circuit');
e('speaker-basket', 'speaker basket', 'Electrical/Audio/Speaker parts', 'part', 'stamp', 'steel-low', 'the pressed steel frame that holds the cone and the motor');
e('surround', 'surround', 'Electrical/Audio/Speaker parts', 'part', 'mould', 'rubber', 'the rubber roll that hangs the cone\'s rim in its basket');
e('spider', 'spider', 'Electrical/Audio/Speaker parts', 'part', 'mould', 'pet phenolic', 'the corrugated, resin-stiffened cloth that centres the voice coil');
e('dust-cap', 'dust cap', 'Electrical/Audio/Speaker parts', 'part', 'mould', 'paper', 'the dome over the coil at the cone\'s middle');
e('speaker-terminal', 'speaker terminal', 'Electrical/Audio/Speaker parts', 'part', 'stamp', 'brass tin', 'a tinned brass tab riveted to the basket, the coil\'s lead soldered to it');
// diodes
e('glass-body', 'glass diode body', 'Electrical/Discrete semiconductors/Package parts', 'part', 'blow', 'glass', 'a glass sleeve fused over the die and the dumet ends of its leads (DO-35)');
e('epoxy-body', 'moulded body', 'Electrical/Discrete semiconductors/Package parts', 'part', 'mould', 'epoxy', 'an epoxy body moulded over the die and its lead frame');
e('lead-frame', 'lead frame', 'Electrical/Discrete semiconductors/Package parts', 'part', 'stamp', 'copper tin', 'the stamped copper frame a die is soldered to, its legs tinned');
// thermocouples
for (const [a, n] of [['chromel', 'chromel'], ['alumel', 'alumel'], ['iron', 'iron'], ['constantan', 'constantan'], ['copper', 'copper'], ['nicrosil', 'Nicrosil'], ['nisil', 'Nisil'], ['pt-rh13', 'Pt-13 % Rh'], ['pt-rh10', 'Pt-10 % Rh'], ['pt-rh30', 'Pt-30 % Rh'], ['pt-rh6', 'Pt-6 % Rh'], ['platinum', 'platinum']] as const) e(`thermoelement-${a}`, `${n} thermoelement`, 'Electrical/Sensors/Thermocouple parts', 'part', 'draw', a, `a drawn ${n} wire: one leg of a thermocouple, welded to the other at its tip`);
e('tc-sleeving', 'glass-fibre sleeving', 'Electrical/Sensors/Thermocouple parts', 'part', 'laminate', 'glass', 'braided glass fibre over each leg and over the pair');
e('tc-sheath', 'thermocouple sheath', 'Electrical/Sensors/Thermocouple parts', 'part', 'draw', 'nickel-alloy', 'a drawn alloy tube round the legs, packed with magnesia, its tip closed');
// hydraulic cylinders
e('cylinder-barrel', 'cylinder barrel', 'Fluid/Hydraulics/Cylinder parts', 'part', 'machine', 'steel-low', 'a seamless tube honed inside to the bore');
e('piston-rod', 'piston rod', 'Fluid/Hydraulics/Cylinder parts', 'part', 'grind', 'steel-alloy chromium', 'a ground alloy-steel rod, hard-chromed');
e('cylinder-piston', 'piston', 'Fluid/Hydraulics/Cylinder parts', 'part', 'machine', 'steel-low', 'the piston on the rod\'s end, grooved for its seals');
e('cylinder-gland', 'gland', 'Fluid/Hydraulics/Cylinder parts', 'part', 'machine', 'steel-low', 'the rod end\'s cap that guides the rod and holds its seal and wiper');
e('cylinder-cap', 'end cap', 'Fluid/Hydraulics/Cylinder parts', 'part', 'machine', 'steel-low', 'the cap end, with its port and its mount');
e('rod-seal', 'rod seal', 'Fluid/Hydraulics/Cylinder parts', 'part', 'mould', 'nbr', 'a lipped seal round the rod in the gland');
e('piston-seal', 'piston seal', 'Fluid/Hydraulics/Cylinder parts', 'part', 'mould', 'ptfe nbr', 'a PTFE ring on a rubber energiser in the piston\'s groove');
e('wiper-seal', 'wiper', 'Fluid/Hydraulics/Cylinder parts', 'part', 'mould', 'nbr', 'the lip outside the rod seal that wipes dirt off the rod');
// slings and straps
e('webbing', 'webbing', 'Hardware/Lifting/Sling parts', 'part', 'laminate', 'pet', 'polyester yarn woven into a flat band');
e('sewing-thread', 'sewing thread', 'Hardware/Lifting/Sling parts', 'part', 'stock', 'pet', 'polyester thread for the stitched eyes and joins');
e('ratchet', 'ratchet buckle', 'Hardware/Lifting/Strap parts', 'part', 'stamp', 'steel-low zinc', 'a pressed steel ratchet: its frame, handle, spindle and pawls, zinc-plated');
e('strap-hook', 'strap hook', 'Hardware/Lifting/Strap parts', 'part', 'forge', 'steel-low zinc', 'a forged J-hook at each end');
// potentiometers
e('pot-track', 'resistive track', 'Electrical/Passive components/Potentiometer parts', 'part', 'coat', 'graphite phenolic', 'a carbon track printed on a phenolic board');
e('pot-wiper', 'wiper', 'Electrical/Passive components/Potentiometer parts', 'part', 'stamp', 'phosphor-bronze silver', 'the sprung contact that runs along the track');
e('pot-shaft', 'shaft and bushing', 'Electrical/Passive components/Potentiometer parts', 'part', 'machine', 'brass', 'the turned shaft and the threaded bushing it turns in');
e('pot-cover', 'cover', 'Electrical/Passive components/Potentiometer parts', 'part', 'stamp', 'steel-low', 'the steel cover crimped over the back');
e('pot-terminal', 'terminal', 'Electrical/Passive components/Potentiometer parts', 'part', 'stamp', 'brass tin', 'a tinned terminal riveted to the track');
// fuses
e('fuse-tube', 'fuse tube', 'Electrical/Circuit protection/Fuse parts', 'part', 'draw', 'glass', 'a drawn glass (or, for high breaking, ceramic) tube');
e('fuse-cap', 'fuse end cap', 'Electrical/Circuit protection/Fuse parts', 'part', 'stamp', 'brass nickel', 'a drawn brass cap, nickel-plated, over each end');
e('fuse-element', 'fuse element', 'Electrical/Circuit protection/Fuse parts', 'part', 'draw', 'copper tin', 'the wire that melts at its rating, soldered into the caps');
// gauges
e('bourdon-tube', 'Bourdon tube', 'Fluid/Instruments/Gauge parts', 'part', 'draw', 'phosphor-bronze', 'a flattened tube bent in a C that straightens under pressure');
e('gauge-movement', 'movement', 'Fluid/Instruments/Gauge parts', 'part', 'machine', 'brass', 'the sector and pinion that turn the tube\'s small movement into the pointer\'s sweep');
e('gauge-dial', 'dial and pointer', 'Fluid/Instruments/Gauge parts', 'part', 'stamp', 'steel-low', 'the printed dial and the pointer on the pinion');
e('gauge-case', 'gauge case', 'Fluid/Instruments/Gauge parts', 'part', 'stamp', 'steel-low', 'the drawn steel case');
e('gauge-window', 'gauge window', 'Fluid/Instruments/Gauge parts', 'part', 'mould', 'pc', 'the clear window over the dial');
e('gauge-socket', 'gauge socket', 'Fluid/Instruments/Gauge parts', 'part', 'machine', 'brass', 'the threaded socket the tube is brazed into');
// heat pipes
e('heatpipe-envelope', 'heat pipe envelope', 'Electrical/Thermal/Heat pipe parts', 'part', 'draw', 'copper', 'a drawn copper tube, its ends swaged and sealed');
e('heatpipe-wick', 'heat pipe wick', 'Electrical/Thermal/Heat pipe parts', 'part', 'sinter', 'copper', 'copper powder sintered to the tube\'s wall, that draws the condensed water back');
// hole saws
e('holesaw-cup', 'hole saw cup', 'Tools/Cutting tools/Hole saw parts', 'part', 'stamp', 'steel-low', 'the drawn steel cup, its back threaded for the arbor');
e('saw-edge', 'saw edge', 'Tools/Cutting tools/Hole saw parts', 'part', 'grind', 'steel-hss', 'a strip of high-speed steel teeth welded to the cup\'s rim');
// laser diodes
e('laser-chip', 'laser chip', 'Electrical/Optoelectronics/Laser parts', 'part', 'fab', 'gan gold', 'the edge-emitting chip, its facets cleaved for a mirror at each end, gold contacts on it');
e('submount', 'heat sink and submount', 'Electrical/Optoelectronics/Laser parts', 'part', 'machine', 'copper', 'the copper block the chip is soldered to, to carry its heat away');
e('to-header', 'TO header', 'Electrical/Optoelectronics/Laser parts', 'part', 'stamp', 'steel-low glass gold', 'a steel base with its pins through glass seals, gold-plated');
e('to-cap', 'TO cap and window', 'Electrical/Optoelectronics/Laser parts', 'part', 'stamp', 'steel-low glass', 'a steel cap welded over the chip, a glass window in it');
e('monitor-photodiode', 'monitor photodiode', 'Electrical/Optoelectronics/Laser parts', 'part', 'fab', 'silicon', 'a photodiode behind the chip that reads its rear light, to hold its power steady');
// rod ends and chains
e('rodend-housing', 'rod end housing', 'Mechanical/Linkages/Rod end parts', 'part', 'forge', 'steel-low', 'the forged eye and shank, threaded');
e('rodend-ball', 'rod end ball', 'Mechanical/Linkages/Rod end parts', 'part', 'grind', 'steel-chrome', 'a hardened ball, bored for the bolt');
e('rodend-liner', 'rod end liner', 'Mechanical/Linkages/Rod end parts', 'part', 'mould', 'ptfe', 'the PTFE race the ball turns in');
e('chain-plate-inner', 'inner plate', 'Mechanical/Power transmission/Chain parts', 'part', 'stamp', 'steel-alloy', 'a blanked and hardened inner link plate');
e('chain-plate-outer', 'outer plate', 'Mechanical/Power transmission/Chain parts', 'part', 'stamp', 'steel-alloy nickel', 'a blanked, hardened, nickel-plated outer link plate');
e('chain-pin', 'chain pin', 'Mechanical/Power transmission/Chain parts', 'part', 'grind', 'steel-alloy', 'a ground, hardened pin riveted through the outer plates');
e('chain-roller', 'chain roller', 'Mechanical/Power transmission/Chain parts', 'part', 'roll', 'steel-alloy', 'the roller that meets the sprocket\'s teeth, turning on the inner link');
// sensor connectors
e('connector-contact', 'machined contact', 'Electrical/Connectors/Contact parts', 'part', 'machine', 'brass gold', 'a turned brass pin or socket, gold-plated');
e('connector-overmould', 'overmoulded body', 'Electrical/Connectors/Housing parts', 'part', 'mould', 'pu', 'a body moulded over the contacts and the cable\'s end, sealing them');
e('coupling-nut', 'coupling nut', 'Electrical/Connectors/Housing parts', 'part', 'machine', 'brass nickel', 'the knurled nut that screws onto its mating socket');
e('seal-ring', 'O-ring', 'Mechanical/Seals/O-rings', 'part', 'mould', 'nbr', 'a moulded rubber ring');
// wiper blades
e('wiper-rubber', 'wiper rubber', 'Mechanical/Vehicle parts/Wiper parts', 'part', 'extrude', 'rubber', 'the extruded rubber blade that wipes');
e('wiper-frame', 'wiper frame', 'Mechanical/Vehicle parts/Wiper parts', 'part', 'stamp', 'steel-low zinc', 'the pressed steel yokes that spread the arm\'s force along the rubber');
e('wiper-spine', 'wiper spine', 'Mechanical/Vehicle parts/Wiper parts', 'part', 'roll', 'steel-spring', 'a curved spring-steel strip that presses a flat blade to the glass');
e('wiper-spoiler', 'spoiler', 'Mechanical/Vehicle parts/Wiper parts', 'part', 'extrude', 'pom', 'a moulded spoiler over the spine that the wind presses down');
e('wiper-adapter', 'wiper adapter', 'Mechanical/Vehicle parts/Wiper parts', 'part', 'mould', 'pom', 'the clip that fits the blade to its arm');
// screwdrivers
e('screwdriver-blade', 'screwdriver blade', 'Tools/Hand tools/Screwdriver parts', 'part', 'forge', 'steel-tool', 'a chrome-vanadium bar forged to its tip, hardened and tempered');
e('screwdriver-handle', 'screwdriver handle', 'Tools/Hand tools/Screwdriver parts', 'part', 'mould', 'pp rubber', 'a polypropylene core moulded onto the blade, a soft grip moulded over it');

// switches, relays and contactors
e('switch-housing', 'switch housing', 'Electrical/Switches/Switch parts', 'part', 'mould', 'pbt', 'the moulded case that holds a switch\'s contacts and its works');
e('switch-actuator', 'actuator', 'Electrical/Switches/Switch parts', 'part', 'mould', 'pom', 'the plunger, lever, rocker or button that is pressed');
e('contact-spring', 'contact spring', 'Electrical/Switches/Switch parts', 'part', 'stamp', 'phosphor-bronze', 'a stamped spring arm that carries a moving contact');
e('contact-silver', 'silver contact', 'Electrical/Switches/Switch parts', 'part', 'cold-head', 'silver copper', 'a silver-alloy contact rivet headed onto a copper base');
e('switch-terminal', 'switch terminal', 'Electrical/Switches/Switch parts', 'part', 'stamp', 'brass tin', 'a tinned brass terminal through the base, a fixed contact on its inner end');
e('return-spring', 'return spring', 'Mechanical/Springs/Small springs', 'part', 'coil', 'steel-spring', 'the small coil that returns a button or a valve');
e('snap-dome', 'snap dome', 'Electrical/Switches/Switch parts', 'part', 'stamp', 'stainless-304', 'a domed stainless disc that snaps through to close the contacts with a click');
e('toggle-lever', 'toggle lever', 'Electrical/Switches/Switch parts', 'part', 'machine', 'brass nickel', 'the nickel-plated lever and its threaded bushing');
e('faceplate', 'faceplate', 'Electrical/Wiring accessories/Accessory parts', 'part', 'mould', 'pc', 'the moulded front plate of a socket or a switch');
e('mounting-frame', 'mounting frame', 'Electrical/Wiring accessories/Accessory parts', 'part', 'stamp', 'steel-low zinc', 'the steel frame the works are fixed to and screwed to the box');
e('socket-contact', 'socket contact', 'Electrical/Wiring accessories/Accessory parts', 'part', 'stamp', 'brass', 'a pair of brass leaves that grip a plug\'s pin');
e('shutter', 'shutter', 'Electrical/Wiring accessories/Accessory parts', 'part', 'mould', 'pc', 'the sprung shutter over the live and neutral holes, opened by the earth pin');
e('coil-bobbin', 'coil bobbin', 'Electrical/Coils/Coil parts', 'part', 'mould', 'pbt', 'the moulded former a coil is wound on, its pins in its flanges');
e('magnetic-core', 'magnetic core', 'Electrical/Coils/Coil parts', 'part', 'stamp', 'steel-electrical', 'soft iron or laminated steel inside a coil, that its field magnetises');
e('armature', 'armature', 'Electrical/Coils/Coil parts', 'part', 'stamp', 'steel-electrical', 'the iron plate a coil pulls in, that moves the contacts');
e('relay-cover', 'relay cover', 'Electrical/Switches/Relay parts', 'part', 'mould', 'pbt', 'the moulded cover sealed onto the base');
e('pcb-pin', 'board pin', 'Electrical/Switches/Relay parts', 'part', 'stamp', 'brass tin', 'a tinned pin moulded through a base, soldered into a board');
e('contact-bridge', 'contact bridge', 'Electrical/Switches/Contactor parts', 'part', 'stamp', 'copper silver', 'a copper bar with a silver contact at each end that closes across a pole\'s two fixed contacts');
e('toroid-core', 'toroid core', 'Electrical/Coils/Coil parts', 'part', 'sinter', 'ferrite-soft', 'a ring core the live and neutral pass through: any difference between them magnetises it');
e('latch-mechanism', 'latch mechanism', 'Electrical/Circuit protection/Breaker parts', 'part', 'stamp', 'steel-low', 'the toggle, latch and springs that trip the contacts open and hold them');
e('reed-switch', 'reed switch', 'Electrical/Switches/Switch parts', 'part', 'blow', 'glass nickel', 'two nickel-iron reeds sealed in a glass tube, closed by a magnet');
// connectors
e('connector-shell', 'connector shell', 'Electrical/Connectors/Housing parts', 'part', 'stamp', 'steel-low tin', 'the drawn steel D shell, tin-plated, that shields and keys the connector');
e('insulator-insert', 'insulator insert', 'Electrical/Connectors/Housing parts', 'part', 'mould', 'pbt', 'the moulded insulator the contacts sit in');
e('contact-pin', 'contact pin', 'Electrical/Connectors/Contact parts', 'part', 'machine', 'brass gold', 'a turned or stamped pin or socket contact, gold-plated where it mates');
e('contact-socket', 'socket contact', 'Electrical/Connectors/Contact parts', 'part', 'stamp', 'phosphor-bronze gold tin', 'a two-leaf contact that grips a pin, gold where it grips, tin where it is soldered');
e('header-pin', 'header pin', 'Electrical/Connectors/Contact parts', 'part', 'stamp', 'brass gold', 'a square brass pin, 0.64 mm, gold-plated');
e('header-insulator', 'header insulator', 'Electrical/Connectors/Housing parts', 'part', 'mould', 'nylon', 'the moulded strip that holds the pins at their pitch');
e('plug-pin', 'plug pin', 'Electrical/Connectors/Contact parts', 'part', 'machine', 'brass gold', 'a turned brass pin or split socket for power, gold-plated');
e('jack-tip', 'jack tip', 'Electrical/Connectors/Contact parts', 'part', 'machine', 'brass nickel', 'the turned tip of a jack plug');
e('jack-sleeve', 'jack sleeve', 'Electrical/Connectors/Contact parts', 'part', 'machine', 'brass nickel', 'the turned sleeve (and any ring) of a jack plug, or a DC plug\'s barrel');
e('jack-insulator', 'jack insulator', 'Electrical/Connectors/Housing parts', 'part', 'mould', 'pbt', 'the insulating washers between a jack\'s tip, rings and sleeve');
e('plug-handle', 'plug handle', 'Electrical/Connectors/Housing parts', 'part', 'mould', 'nylon', 'the moulded grip screwed or moulded over a plug');
e('usb-plug', 'USB plug', 'Electrical/Connectors/Plugs', 'assembly', 'assemble', 'connector-shell insulator-insert contact-pin*4 plug-handle', 'four (or, for C, twenty-four) contacts in an insert, in a steel shell, moulded over at the cable', 'USB-IF');
e('jack-plug', 'jack plug', 'Electrical/Connectors/Plugs', 'assembly', 'assemble', 'jack-tip jack-sleeve jack-insulator*2 plug-handle', 'a tip and a sleeve insulated from each other, in a handle', 'IEC 60603-11');
e('mains-plug', 'mains plug', 'Electrical/Connectors/Plugs', 'assembly', 'assemble', 'plug-pin*3 plug-handle terminal-screw*3 fuse-tube', 'three pins and their terminals in a moulded body (BS 1363 with its fuse)', 'BS 1363 or IEC 60884');
e('cable-shield', 'cable shield', 'Electrical/Wiring and connectors/Cable parts', 'part', 'laminate', 'copper', 'a braid of fine copper wires (or a foil) round a cable\'s cores');
e('xlr-shell', 'XLR shell', 'Electrical/Connectors/Housing parts', 'part', 'cast', 'zamak nickel', 'a die-cast shell with its latch');
e('busbar', 'busbar', 'Electrical/Connectors/Terminal parts', 'part', 'stamp', 'copper tin', 'the copper bar a terminal\'s clamps carry current along');
// batteries
e('battery-can', 'battery can', 'Electrical/Power/Cell parts', 'part', 'stamp', 'steel-low nickel', 'a deep-drawn nickel-plated steel can, the positive terminal');
e('cathode-ring', 'cathode', 'Electrical/Power/Cell parts', 'part', 'sinter', 'mno2 graphite', 'manganese dioxide and graphite pressed into rings against the can');
e('anode-gel', 'anode gel', 'Electrical/Power/Cell parts', 'part', 'stock', 'zinc koh-electrolyte', 'zinc powder in a potassium hydroxide gel, in the middle');
e('cell-separator', 'separator', 'Electrical/Power/Cell parts', 'part', 'laminate', 'pp', 'a non-woven sheet between anode and cathode that ions cross and electrons cannot');
e('current-collector', 'current collector', 'Electrical/Power/Cell parts', 'part', 'cold-head', 'brass', 'the brass nail down the anode, welded to the negative cap');
e('cell-seal', 'cell seal', 'Electrical/Power/Cell parts', 'part', 'mould', 'nylon', 'the moulded seal and vent between the can and the negative cap');
e('negative-cap', 'negative cap', 'Electrical/Power/Cell parts', 'part', 'stamp', 'steel-low nickel', 'the plated steel end cap, the negative terminal');
e('lithium-anode', 'lithium anode', 'Electrical/Power/Cell parts', 'part', 'roll', 'lithium', 'lithium metal foil pressed into the cap (a coin cell) or wound with the cathode');
e('nimh-positive', 'nickel hydroxide electrode', 'Electrical/Power/Cell parts', 'part', 'coat', 'nickel', 'nickel hydroxide pasted in a nickel foam');
e('nimh-negative', 'metal hydride electrode', 'Electrical/Power/Cell parts', 'part', 'coat', 'lani5 nickel', 'a hydrogen-storing alloy pasted on a perforated nickel strip');
e('silver-oxide-pellet', 'silver oxide cathode', 'Electrical/Power/Cell parts', 'part', 'sinter', 'ag2o graphite', 'a pressed pellet of silver oxide and graphite');
e('battery-label', 'label', 'Electrical/Power/Cell parts', 'part', 'laminate', 'pet', 'the printed shrink sleeve round the can');
e('plate-positive', 'positive plate', 'Electrical/Power/Lead-acid parts', 'part', 'cast', 'lead pbo2', 'a cast lead-alloy grid pasted with lead dioxide');
e('plate-negative', 'negative plate', 'Electrical/Power/Lead-acid parts', 'part', 'cast', 'lead', 'a cast lead-alloy grid pasted with sponge lead');
e('plate-separator', 'plate separator', 'Electrical/Power/Lead-acid parts', 'part', 'extrude', 'pe', 'a ribbed polyethylene envelope round a plate (or, in AGM and gel cells, a glass mat)');
e('battery-case', 'battery case', 'Electrical/Power/Lead-acid parts', 'part', 'mould', 'pp', 'the moulded box of cells, a wall between each');
e('battery-lid', 'battery lid', 'Electrical/Power/Lead-acid parts', 'part', 'mould', 'pp', 'the lid heat-sealed onto the case, its vents in it');
e('battery-post', 'terminal post', 'Electrical/Power/Lead-acid parts', 'part', 'cast', 'lead', 'a cast lead post through the lid, joined to its cells\' straps');
e('cathode-sheet', 'cathode sheet', 'Electrical/Power/Cell parts', 'part', 'coat', 'nmc al-foil', 'lithium nickel manganese cobalt oxide coated both sides of aluminium foil');
e('anode-sheet', 'anode sheet', 'Electrical/Power/Cell parts', 'part', 'coat', 'graphite copper-foil', 'graphite coated both sides of copper foil');
e('separator-film', 'separator film', 'Electrical/Power/Cell parts', 'part', 'extrude', 'pe', 'a porous polyethylene film between the electrodes');
e('pouch-film', 'pouch film', 'Electrical/Power/Cell parts', 'part', 'laminate', 'al-laminate', 'the aluminium-laminate pouch, heat-sealed round the stack');
e('cell-tab', 'cell tab', 'Electrical/Power/Cell parts', 'part', 'stamp', 'al-foil nickel', 'an aluminium (positive) or nickel-plated copper (negative) tab welded to the electrodes');
e('cap-plate', 'cap plate', 'Electrical/Power/Cell parts', 'part', 'stamp', 'steel-low nickel', 'the positive cap of a cylindrical cell');
e('vent-disc', 'vent disc', 'Electrical/Power/Cell parts', 'part', 'stamp', 'al-foil', 'a scored aluminium disc that opens if the cell\'s pressure rises');
e('cap-gasket', 'cap gasket', 'Electrical/Power/Cell parts', 'part', 'mould', 'nbr', 'the ring that seals the cap into the can\'s crimp');
// valves and pumps
e('valve-body', 'valve body', 'Fluid/Valves/Valve parts', 'part', 'cast', 'brass', 'the cast and machined body, its ports threaded');
e('valve-disc', 'valve disc', 'Fluid/Valves/Valve parts', 'part', 'machine', 'brass', 'the disc or flap that closes on the seat');
e('valve-seat-seal', 'seat seal', 'Fluid/Valves/Valve parts', 'part', 'mould', 'nbr', 'the rubber face the disc closes on');
e('valve-cap', 'valve cap', 'Fluid/Valves/Valve parts', 'part', 'machine', 'brass', 'the screwed cap that closes the body');
e('spool', 'valve spool', 'Fluid/Valves/Valve parts', 'part', 'grind', 'steel-alloy', 'the ground spool whose lands open and close the ports as it slides');
e('solenoid-coil', 'solenoid', 'Fluid/Valves/Valve parts', 'part', 'wind', 'magnet-wire pbt', 'a coil wound and moulded over, that pushes the spool');
e('filter-bowl', 'filter bowl', 'Fluid/Pneumatics/Air prep parts', 'part', 'mould', 'pc', 'the clear bowl the water and dirt collect in');
e('filter-element', 'filter element', 'Fluid/Pneumatics/Air prep parts', 'part', 'sinter', 'bronze', 'sintered bronze, its pores the filter\'s rating');
e('regulator-diaphragm', 'diaphragm', 'Fluid/Pneumatics/Air prep parts', 'part', 'mould', 'nbr', 'the rubber diaphragm a regulator\'s spring balances the pressure against');
e('pump-housing', 'pump housing', 'Fluid/Pumps/Pump parts', 'part', 'cast', 'al-a380', 'the die-cast body, bored for its gears');
e('pump-gear', 'pump gear', 'Fluid/Pumps/Pump parts', 'part', 'grind', 'steel-alloy', 'a ground spur gear and its shaft, one of a meshing pair');
e('bushing', 'bushing', 'Mechanical/Bearings/Plain bearings', 'part', 'sinter', 'bronze', 'a plain bearing sleeve');
e('shaft-seal', 'shaft seal', 'Mechanical/Seals/Shaft seals', 'part', 'mould', 'nbr steel-low', 'a lipped rubber seal on a steel case, round a turning shaft');
e('pump-head', 'pump head', 'Fluid/Pumps/Pump parts', 'part', 'mould', 'pp', 'the moulded head with its inlet and outlet');
e('diaphragm', 'diaphragm', 'Fluid/Pumps/Pump parts', 'part', 'mould', 'nbr', 'the rubber diaphragm a cam flexes to pump');
e('valve-flap', 'valve flap', 'Fluid/Pumps/Pump parts', 'part', 'mould', 'nbr', 'a rubber flap that lets the flow one way');
// bearings with rollers
e('tapered-roller', 'tapered roller', 'Mechanical/Bearings/Bearing parts', 'part', 'grind', 'steel-chrome', 'a ground tapered roller');
e('spherical-roller', 'spherical roller', 'Mechanical/Bearings/Bearing parts', 'part', 'grind', 'steel-chrome', 'a ground barrel-shaped roller');
e('needle-roller', 'needle roller', 'Mechanical/Bearings/Bearing parts', 'part', 'grind', 'steel-chrome', 'a ground needle roller');
e('cam-stud', 'cam follower stud', 'Mechanical/Bearings/Bearing parts', 'part', 'grind', 'steel-alloy', 'the hardened stud the outer ring turns on, threaded for its nut');
// lamps, plugs, cylinders
e('bulb-envelope', 'bulb envelope', 'Electrical/Lighting/Lamp parts', 'part', 'blow', 'quartz', 'the quartz bulb, filled with halogen gas');
e('filament', 'filament', 'Electrical/Lighting/Lamp parts', 'part', 'coil', 'tungsten', 'the coiled tungsten wire that glows');
e('bulb-base', 'bulb base', 'Electrical/Lighting/Lamp parts', 'part', 'stamp', 'brass pbt', 'the metal base and its moulded holder, the filament\'s leads welded to its contacts');
e('spark-plug-shell', 'spark plug shell', 'Mechanical/Vehicle parts/Spark plug parts', 'part', 'cold-head', 'steel-low nickel', 'the threaded, hexed steel shell, nickel-plated, its ground electrode welded on');
e('spark-plug-insulator', 'insulator', 'Mechanical/Vehicle parts/Spark plug parts', 'part', 'sinter', 'alumina', 'the fired alumina insulator round the centre electrode');
e('centre-electrode', 'centre electrode', 'Mechanical/Vehicle parts/Spark plug parts', 'part', 'draw', 'nickel-alloy copper', 'a nickel-alloy electrode with a copper core to carry the heat away');
e('ground-electrode', 'ground electrode', 'Mechanical/Vehicle parts/Spark plug parts', 'part', 'draw', 'nickel-alloy', 'the bent electrode welded to the shell that the spark jumps to');
e('terminal-stud', 'terminal stud', 'Mechanical/Vehicle parts/Spark plug parts', 'part', 'cold-head', 'steel-low', 'the stud the ignition lead clips onto, sealed into the insulator with glass');
e('sealing-washer', 'sealing washer', 'Mechanical/Seals/Gaskets', 'part', 'stamp', 'steel-low', 'a folded steel washer that crushes to seal');
e('gas-cylinder', 'gas cylinder', 'Hardware/Gas/Cylinder parts', 'part', 'forge', 'steel-alloy', 'a seamless alloy-steel cylinder spun from a billet, tested to its pressure');
e('cylinder-valve', 'cylinder valve', 'Hardware/Gas/Cylinder parts', 'part', 'forge', 'brass', 'the forged brass valve screwed into its neck');
e('gas-spring-tube', 'gas spring tube', 'Mechanical/Springs/Gas spring parts', 'part', 'draw', 'steel-low', 'the sealed tube of nitrogen and a little oil');
e('gas-spring-rod', 'gas spring rod', 'Mechanical/Springs/Gas spring parts', 'part', 'grind', 'steel-alloy chromium', 'a ground, hard-chromed rod');
e('gas-spring-piston', 'gas spring piston', 'Mechanical/Springs/Gas spring parts', 'part', 'machine', 'steel-low', 'the piston on the rod, its orifice damping the stroke');
// tools and goods
e('tape-blade', 'tape blade', 'Tools/Measuring/Tape parts', 'part', 'roll', 'steel-spring', 'a curved spring-steel strip, painted and printed with its scale');
e('tape-spring', 'recoil spring', 'Tools/Measuring/Tape parts', 'part', 'roll', 'steel-spring', 'the flat coiled spring that winds the blade back');
e('tape-case', 'tape case', 'Tools/Measuring/Tape parts', 'part', 'mould', 'abs', 'the moulded case, its grip overmoulded');
e('tape-hook', 'tape hook', 'Tools/Measuring/Tape parts', 'part', 'stamp', 'steel-low', 'the riveted end hook that slides by its own thickness');
e('tape-lock', 'tape lock', 'Tools/Measuring/Tape parts', 'part', 'mould', 'nylon', 'the slide that locks the blade');
e('belt-clip', 'belt clip', 'Tools/Measuring/Tape parts', 'part', 'stamp', 'steel-spring', 'the spring-steel clip on the back');
e('clamp-bar', 'clamp bar', 'Tools/Clamps/Clamp parts', 'part', 'roll', 'steel-low', 'the steel bar the moving jaw slides on');
e('clamp-jaw', 'clamp jaw', 'Tools/Clamps/Clamp parts', 'part', 'mould', 'nylon pu', 'a nylon jaw with a soft pad');
e('clamp-trigger', 'clamp trigger', 'Tools/Clamps/Clamp parts', 'part', 'mould', 'nylon', 'the trigger and handle whose grip plates step the jaw along the bar');
e('indicator-case', 'indicator case', 'Tools/Measuring/Indicator parts', 'part', 'machine', 'brass chromium', 'the chromed brass case and its stem');
e('plunger', 'plunger', 'Tools/Measuring/Indicator parts', 'part', 'grind', 'steel-tool', 'the hardened, ground spindle with its rack and contact point');
e('gear-train', 'gear train', 'Tools/Measuring/Indicator parts', 'part', 'machine', 'brass', 'the pinions and wheels that turn the rack\'s travel into the pointer\'s turns, a hairspring taking up their play');
e('indicator-crystal', 'indicator crystal', 'Tools/Measuring/Indicator parts', 'part', 'mould', 'pc', 'the clear cover over the dial');
e('breadboard-body', 'breadboard body', 'Electrical/Boards and controllers/Breadboard parts', 'part', 'mould', 'abs', 'the moulded body, its grid of holes over the clip strips');
e('clip-strip', 'clip strip', 'Electrical/Boards and controllers/Breadboard parts', 'part', 'stamp', 'phosphor-bronze', 'a strip of five spring clips joined, under a row of holes');
e('adhesive-backing', 'adhesive backing', 'Materials/Adhesives/Tapes', 'part', 'laminate', 'pet', 'a foam-and-film backing with its adhesive and release paper');
e('pallet-board', 'pallet board', 'Materials/Packaging/Pallet parts', 'part', 'machine', 'wood', 'a sawn board of the deck, the bottom or a stringer');
e('pallet-block', 'pallet block', 'Materials/Packaging/Pallet parts', 'part', 'machine', 'wood', 'a sawn block (or one of pressed chips) between the decks');
e('pallet-nail', 'pallet nail', 'Materials/Packaging/Pallet parts', 'part', 'cold-head', 'steel-low', 'a ring-shanked nail clenched through the boards');
e('filter-media', 'filter media', 'Fluid/Filters/Filter parts', 'part', 'laminate', 'pet', 'a pleated non-woven web that catches the dust');
e('filter-frame', 'filter frame', 'Fluid/Filters/Filter parts', 'part', 'mould', 'paper', 'the frame round the pleats (board, plastic or steel)');
e('support-mesh', 'support mesh', 'Fluid/Filters/Filter parts', 'part', 'draw', 'steel-low', 'the expanded mesh that holds the pleats');
e('antenna-element', 'antenna element', 'Electrical/RF/Antenna parts', 'part', 'draw', 'brass', 'the radiating wire or rod, a quarter of a wavelength (or two, for a dipole)');
e('antenna-base', 'antenna base', 'Electrical/RF/Antenna parts', 'part', 'machine', 'brass nickel', 'the plated base and its connector');
e('antenna-sheath', 'antenna sheath', 'Electrical/RF/Antenna parts', 'part', 'extrude', 'pvc', 'the moulded or sleeved cover');
e('float', 'float', 'Electrical/Sensors/Float parts', 'part', 'blow', 'pp', 'a sealed hollow float with a ring magnet in it');
e('float-stem', 'float stem', 'Electrical/Sensors/Float parts', 'part', 'mould', 'pp', 'the stem the float slides on, its reed switch inside');
e('ring-magnet', 'ring magnet', 'Electrical/Magnets/Ferrite', 'part', 'sinter', 'ferrite-hard', 'a sintered ferrite ring');
e('buzzer-diaphragm', 'buzzer diaphragm', 'Electrical/Audio/Buzzer parts', 'part', 'stamp', 'steel-low', 'a thin steel disc the coil pulls and releases');
e('buzzer-case', 'buzzer case', 'Electrical/Audio/Buzzer parts', 'part', 'mould', 'abs', 'the moulded case, its sound hole in its top');
e('mov-disc', 'varistor disc', 'Electrical/Circuit protection/Varistor parts', 'part', 'sinter', 'zinc-oxide silver-paste', 'a sintered zinc-oxide disc, silver electrodes fired on its faces');
e('dip-coat', 'dipped coating', 'Electrical/Passive components/Coatings', 'part', 'coat', 'epoxy', 'an epoxy coat a part is dipped in and cured');
e('chuck-body', 'chuck body', 'Tools/Power tool parts/Chuck parts', 'part', 'machine', 'steel-low', 'the body, bored at three angles for the jaws, threaded for the spindle');
e('chuck-jaw', 'chuck jaw', 'Tools/Power tool parts/Chuck parts', 'part', 'grind', 'steel-alloy', 'a hardened jaw, threaded on its back');
e('chuck-nut', 'chuck nut', 'Tools/Power tool parts/Chuck parts', 'part', 'machine', 'steel-alloy', 'the split nut that drives the jaws in and out');
e('chuck-sleeve', 'chuck sleeve', 'Tools/Power tool parts/Chuck parts', 'part', 'mould', 'pp', 'the gripped sleeve turned by hand');
e('plier-jaw', 'plier half', 'Tools/Hand tools/Plier parts', 'part', 'forge', 'steel-alloy', 'one forged half: its jaw, its cutting edge and its handle');
e('plier-rivet', 'pivot rivet', 'Tools/Hand tools/Plier parts', 'part', 'cold-head', 'steel-low', 'the rivet the halves turn on');
e('handle-grip', 'handle grip', 'Tools/Hand tools/Grip parts', 'part', 'mould', 'pvc', 'a dipped or moulded grip over a handle');
e('worm', 'worm', 'Mechanical/Power transmission/Worm parts', 'part', 'grind', 'steel-alloy', 'the hardened, ground screw that drives the wheel');
e('worm-wheel', 'worm wheel', 'Mechanical/Power transmission/Worm parts', 'part', 'machine', 'bronze', 'the bronze wheel hobbed to the worm');
e('lead-screw', 'lead screw', 'Mechanical/Linear motion/Lead screw parts', 'part', 'roll', 'stainless-304', 'a stainless rod rolled with its trapezoidal thread');
e('lead-nut', 'lead screw nut', 'Mechanical/Linear motion/Lead screw parts', 'part', 'machine', 'brass', 'the flanged brass nut that rides on it');
e('heater-sheath', 'heater sheath', 'Electrical/Heating/Heater parts', 'part', 'draw', 'stainless-304', 'the tube round the coil, packed with magnesia and swaged tight');
e('resistance-wire', 'resistance wire', 'Electrical/Heating/Heater parts', 'part', 'coil', 'nichrome', 'a coil of nickel-chromium wire');
e('terminal-pin', 'terminal pin', 'Electrical/Heating/Heater parts', 'part', 'cold-head', 'steel-low nickel', 'the pin each end of the coil is welded to, out through the seal');
e('mica-sheet', 'mica sheet', 'Electrical/Heating/Heater parts', 'part', 'laminate', 'mica', 'a sheet of bonded mica the wire is wound on and laid between');
e('saddle-shell', 'saddle shell', 'Mechanical/Vehicle parts/Saddle parts', 'part', 'mould', 'nylon', 'the moulded nylon base');
e('saddle-padding', 'saddle padding', 'Mechanical/Vehicle parts/Saddle parts', 'part', 'mould', 'pu', 'moulded foam over the shell');
e('saddle-cover', 'saddle cover', 'Mechanical/Vehicle parts/Saddle parts', 'part', 'laminate', 'pu', 'the stretched cover over the foam');
e('saddle-rails', 'saddle rails', 'Mechanical/Vehicle parts/Saddle parts', 'part', 'bend', 'steel-low', 'the bent rails the seat post clamps');
e('rc-tyre', 'RC tyre', 'Mechanical/Vehicle parts/Wheel parts', 'part', 'mould', 'rubber', 'a moulded rubber tyre, glued on its rim');
e('rc-rim', 'RC rim', 'Mechanical/Vehicle parts/Wheel parts', 'part', 'mould', 'nylon', 'a moulded nylon rim with its hex hub');
e('tyre-foam', 'tyre insert', 'Mechanical/Vehicle parts/Wheel parts', 'part', 'mould', 'pu', 'the foam ring inside the tyre that holds its shape');
e('hose-wall', 'hose wall', 'Fluid/Hoses/Hose parts', 'part', 'extrude', 'pvc', 'the flexible PVC wall');
e('hose-helix', 'hose helix', 'Fluid/Hoses/Hose parts', 'part', 'coil', 'steel-spring', 'the steel wire helix in the wall that keeps it round');
e('headband-spring', 'headband spring', 'Electrical/Audio/Headphone parts', 'part', 'roll', 'steel-spring', 'the spring-steel band that presses the cups to the head');
e('headband-cushion', 'headband cushion', 'Electrical/Audio/Headphone parts', 'part', 'mould', 'pu', 'the foam pad under the band');
e('headband-shell', 'headband shell', 'Electrical/Audio/Headphone parts', 'part', 'mould', 'pp', 'the moulded cover over the spring');
e('mic-diaphragm', 'mic diaphragm', 'Electrical/Audio/Microphone parts', 'part', 'mould', 'pet', 'a thin film dome, its voice coil glued under it');
e('mic-magnet', 'mic magnet', 'Electrical/Audio/Microphone parts', 'part', 'sinter', 'ndfeb nickel', 'a small neodymium magnet in the pole piece');
e('mic-housing', 'mic housing', 'Electrical/Audio/Microphone parts', 'part', 'stamp', 'steel-low', 'the steel cup and pole that carry the magnet\'s field to the coil\'s gap');
e('electret-film', 'electret diaphragm', 'Electrical/Audio/Microphone parts', 'part', 'laminate', 'pet', 'a thin film charged for good and metallised on one face, over the backplate');
e('mic-backplate', 'backplate', 'Electrical/Audio/Microphone parts', 'part', 'stamp', 'brass', 'the perforated plate the diaphragm is a capacitor with');
e('mic-can', 'capsule can', 'Electrical/Audio/Microphone parts', 'part', 'stamp', 'al-foil', 'the drawn can, its sound hole behind a cloth');
e('probe-tip', 'probe tip', 'Tools/Measuring/Probe parts', 'part', 'machine', 'brass nickel', 'the pointed tip');
e('probe-handle', 'probe handle', 'Tools/Measuring/Probe parts', 'part', 'mould', 'pvc', 'the insulated handle with its finger guard');
e('banana-plug', 'banana plug', 'Electrical/Connectors/Plugs', 'part', 'machine', 'brass nickel', 'the sprung 4 mm plug at the lead\'s end');
e('test-lead', 'test lead', 'Electrical/Wiring and connectors/Cable parts', 'part', 'extrude', 'copper silicone', 'fine stranded copper in silicone insulation');
e('cover-glass', 'cover glass', 'Electrical/Optoelectronics/Sensor parts', 'part', 'draw', 'glass', 'the optical glass lid over an image sensor\'s die, its infrared filter coated on it');
e('chip-resistor', 'chip resistor', 'Electrical/Passive components/Resistors', 'assembly', 'assemble', 'chip-substrate resistive-film overglaze chip-termination*2', 'a thick-film resistor on a ceramic chip');
e('mlcc-body', 'ceramic capacitor body', 'Electrical/Passive components/Chip parts', 'part', 'sinter', 'batio3 nickel', 'barium titanate layers with nickel electrodes between, laminated and fired as one');
e('chip-capacitor', 'chip capacitor', 'Electrical/Passive components/Capacitors', 'assembly', 'assemble', 'mlcc-body chip-termination*2', 'a fired multilayer ceramic body, terminated at its ends');
e('platinum-film', 'platinum film', 'Electrical/Sensors/RTD parts', 'part', 'coat', 'platinum', 'a meandering platinum film sputtered on the chip and laser-trimmed to 100 Ω at 0 °C');
e('code-disc', 'code disc', 'Electrical/Sensors/Encoder parts', 'part', 'stamp', 'phosphor-bronze', 'the patterned contact disc the wipers read as the shaft turns');
e('detent-spring', 'detent spring', 'Electrical/Sensors/Encoder parts', 'part', 'stamp', 'steel-spring', 'the spring that gives each step its click');

for (const [id, fam] of [['screw-m3', 'screw'], ['screw-set', 'screw'], ['nut-m3', 'nut'], ['washer-m3', 'washer'], ['bearing-608', 'bearing'], ['bearing-625', 'bearing'], ['spur-gear', 'gear'], ['spring-compression', 'spring'], ['wire-hookup', 'wire'], ['extrusion-2020', 'extrusion'], ['resistor-film', 'resistor'], ['nema17', 'stepper'], ['cell-18650', 'cell'], ['gt2-pulley', 'pulley'], ['lead-screw-t8', 'leadscrew'], ['led-5mm', 'led']] as const) { const it = items.get(id); if (it) it.family = fam; }

// ==== more kinds of things: vehicles, home appliances, sound, light and heat, fluid, robots ===========================
/** A part made to sizes by its family, put in the inventory for an entry's list: F('bearing 6805') gives its id. */
const F = (words: string): string => { const it = callFamily(words); if (!it || typeof it === 'string') throw new Error(`the inventory's seed: "${words}": ${it ?? 'no such family'}`); if (!items.has(it.id)) put(it); return it.id; };
m('mica', 'mica', 'Minerals', 'a sheet silicate that splits into thin plates: it insulates and stands red heat', 'muscovite');
m('alnico', 'alnico', 'Metals/Magnetic alloys', 'an alloy of aluminium, nickel and cobalt with iron, cast and magnetised: the magnet of guitar pickups', 'e.g. alnico 5');
m('bi2te3', 'bismuth telluride', 'Semiconductors', 'the thermoelectric semiconductor of Peltier modules, doped n and p', 'Bi₂Te₃');
m('sic', 'silicon carbide grit', 'Ceramics', 'a very hard grit, bonded to paper or film as an abrasive', 'SiC');
m('water', 'water', 'Fluids', 'the working fluid in a heat pipe, boiling at the hot end and condensing at the cold', 'H₂O');
// a bicycle
e('rim-bike', 'bicycle rim', 'Mechanical/Vehicle parts/Wheels', 'part', 'extrude', 'al-6063', 'an aluminium profile extruded, rolled into a hoop and joined, drilled for its spokes', '622 mm bead seat (700c)');
e('spoke', 'spoke', 'Mechanical/Vehicle parts/Wheels', 'part', 'draw', 'stainless-304', 'stainless wire drawn, its head cold-formed and bent, its end thread-rolled', '2 mm, about 290 mm');
e('nipple-spoke', 'spoke nipple', 'Mechanical/Vehicle parts/Wheels', 'part', 'machine', 'brass', 'a small threaded brass nut that tensions a spoke at the rim', '', { alt: 'cast' });
e('hub-shell', 'hub shell', 'Mechanical/Vehicle parts/Wheels', 'part', 'machine', 'al-6061', 'turned and drilled for the spokes on its flanges', '', { alt: 'cast', size: [60, 60, 100] });
e('hub-bike', 'bicycle hub', 'Mechanical/Vehicle parts/Wheels', 'assembly', 'assemble', `hub-shell ${F('bearing 6000')}*2 ${F('rod 9mm 140 steel')} ${F('nut M8 lock')}*2`, 'a shell turning on two bearings round a fixed axle');
e('tyre-bike', 'bicycle tyre', 'Mechanical/Vehicle parts/Wheels', 'part', 'mould', 'rubber nylon steel-low', 'rubber vulcanised in a mould over a nylon casing, with steel beads that hold it on the rim', '700 × 28c');
e('inner-tube', 'inner tube', 'Mechanical/Vehicle parts/Wheels', 'part', 'mould', 'rubber brass', 'a butyl tube with a brass valve', '');
e('wheel-bike', 'bicycle wheel', 'Mechanical/Vehicles/Bicycles', 'assembly', 'assemble', 'rim-bike hub-bike spoke*32 nipple-spoke*32 tyre-bike inner-tube', 'a rim held round the hub by 32 tensioned spokes, trued; the tyre and tube on it');
e('frame-bike', 'bicycle frame', 'Mechanical/Vehicles/Bicycles', 'assembly', 'weld', `${F('tube round 28x1 600 steel')}*3 ${F('tube round 19x1 450 steel')}*4 ${F('tube round 34x1.5 150 steel')}`, 'steel tubes mitred and welded: the main triangle and the stays, a head tube for the fork and a shell for the bottom bracket', 'chromoly, about 2.2 kg (typical)');
e('fork-bike', 'bicycle fork', 'Mechanical/Vehicles/Bicycles', 'assembly', 'weld', `${F('tube round 25x1.5 250 steel')} ${F('tube round 22x1 400 steel')}*2`, 'a steerer tube and two blades welded to a crown, with dropouts for the wheel');
e('crank-arm', 'crank arm', 'Mechanical/Vehicle parts/Drivetrain', 'part', 'forge', 'al-6061', 'forged from aluminium bar and machined', '170 mm', { alt: 'cast' });
e('chainring', 'chainring', 'Mechanical/Vehicle parts/Drivetrain', 'part', 'stamp', 'al-6061', 'cut and stamped from plate, its teeth shaped for the chain to climb on', '44 teeth', { alt: 'cast' });
e('bottom-bracket', 'bottom bracket', 'Mechanical/Vehicle parts/Drivetrain', 'assembly', 'assemble', `${F('bearing 6805')}*2 ${F('rod 24mm 120 steel')} al-6061`, 'two thin bearings in cups threaded into the frame, a spindle through them');
e('crankset', 'crankset', 'Mechanical/Vehicles/Bicycles', 'assembly', 'assemble', `crank-arm*2 chainring bottom-bracket ${F('bolt M8x15')}*2`, 'the cranks on the spindle, the chainring on the right crank');
e('chain-bike', 'bicycle chain', 'Mechanical/Belts and chains/Roller chain', 'product', 'stamp', 'steel-alloy', 'plates stamped from strip, pins pressed through bushings and rollers', '½" × 3/32", 116 links');
e('freewheel', 'freewheel', 'Mechanical/Vehicle parts/Drivetrain', 'assembly', 'assemble', 'steel-low*7 bearing-ball*40 steel-spring steel-alloy', 'seven sprockets on a body that turns one way only: pawls on springs catch a ratchet', '14–28 teeth');
e('pedal-body', 'pedal body', 'Mechanical/Vehicle parts/Drivetrain', 'part', 'cast', 'al-a380', 'a cast platform with pins to grip the shoe', '', { size: [100, 90, 20] });
e('pedal', 'pedal', 'Mechanical/Vehicles/Bicycles', 'assembly', 'assemble', `pedal-body ${F('rod 9mm 90 steel')} bushing-bronze*2`, 'a platform turning on a steel spindle in bushings');
e('saddle', 'saddle', 'Mechanical/Vehicles/Bicycles', 'product', 'assemble', 'saddle-shell saddle-padding saddle-cover saddle-rails', 'foam on a moulded nylon shell, on steel rails');
e('handlebar', 'handlebar', 'Mechanical/Vehicles/Bicycles', 'part', 'bend', F('tube round 22x2 600 aluminium'), 'an aluminium tube bent to shape', '600 mm wide');
e('brake-arm', 'brake arm', 'Mechanical/Vehicle parts/Brakes', 'part', 'forge', 'al-6061', 'a forged arm that swings a pad onto the rim', '', { alt: 'cast' });
e('brake-pad', 'brake pad', 'Mechanical/Vehicle parts/Brakes', 'part', 'mould', 'rubber', 'a moulded rubber block that grips the rim');
e('brake-rim', 'rim brake', 'Mechanical/Vehicles/Bicycles', 'assembly', 'assemble', `brake-arm*2 brake-pad*2 spring-torsion ${F('bolt M6x30')}`, 'two arms on a bolt, pulled together by the cable against a spring');
e('brake-cable', 'brake cable', 'Mechanical/Vehicle parts/Brakes', 'product', 'draw', 'steel-alloy pe', 'stranded steel wire in a lined housing');
e('bicycle', 'bicycle', 'Mechanical/Vehicles/Bicycles', 'product', 'assemble', `frame-bike fork-bike wheel-bike*2 crankset chain-bike freewheel pedal*2 saddle handlebar brake-rim*2 brake-cable*2 ${F('bearing 6802')}*2`, 'a steel frame on two spoked wheels: the cranks drive the rear wheel by a chain through a freewheel; rim brakes; the fork steers on a headset of two bearings', 'about 11 kg (typical)');
// an electric scooter
e('tyre-scooter', 'scooter tyre', 'Mechanical/Vehicle parts/Wheels', 'part', 'mould', 'rubber', 'a solid or air-filled rubber tyre moulded for an 8.5" wheel');
e('hub-motor', 'hub motor', 'Electrical/Motors and actuators/Brushless motors', 'assembly', 'assemble', `lamination-stack winding*27 magnet-ndfeb*30 al-a380 shaft-steel ${F('bearing 6202')}*2 tyre-scooter`, 'a brushless outrunner built into the wheel: the stator on the fixed axle, the magnets in the cast hub that turns round it', '36 V, about 350 W (typical)');
e('wheel-scooter', 'scooter wheel', 'Mechanical/Vehicle parts/Wheels', 'assembly', 'assemble', `al-a380 tyre-scooter ${F('bearing 6001')}*2`, 'a cast rim with its tyre on two bearings');
e('deck-scooter', 'scooter deck', 'Mechanical/Vehicles/Scooters', 'part', 'extrude', 'al-6063', 'an aluminium profile extruded, cut and machined: the battery rides inside it');
e('stem-scooter', 'scooter stem', 'Mechanical/Vehicles/Scooters', 'assembly', 'weld', `${F('tube round 40x2 900 aluminium')} al-a380`, 'a tube welded to a cast folding hinge');
e('brake-disc', 'brake disc', 'Mechanical/Vehicle parts/Brakes', 'part', 'stamp', 'stainless-304', 'cut from stainless plate, drilled to shed heat and water', '120 mm');
e('brake-caliper-disc', 'disc brake caliper', 'Mechanical/Vehicle parts/Brakes', 'assembly', 'assemble', `al-a380 brake-pad*2 spring-compression ${F('bolt M6x20')}*2`, 'a cast body that a cable pulls shut, squeezing pads on the disc');
e('throttle-thumb', 'thumb throttle', 'Electrical/Vehicles/Scooters', 'product', 'assemble', 'magnet-ndfeb ic-package pc wire-hookup*3', 'a lever turning a magnet past a Hall sensor: its voltage is how hard you press');
e('e-scooter', 'electric scooter', 'Electrical/Vehicles/Scooters', 'product', 'assemble', `deck-scooter stem-scooter hub-motor wheel-scooter ${F('pack 10S3P')} esc throttle-thumb brake-disc brake-caliper-disc lcd-module ${F('bolt M6x20')}*12`, 'a hub motor in the front wheel driven by a controller from a 36 V pack in the deck; a disc brake at the back; the stem folds', 'about 12 kg, 25 km/h (typical)');
// a skateboard
e('deck-skate', 'skateboard deck', 'Mechanical/Vehicles/Skateboards', 'part', 'laminate', 'wood-veneer*7 glue', 'seven maple veneers glued and pressed in a mould to its concave', '8.0 × 31.5"');
e('griptape', 'grip tape', 'Mechanical/Vehicles/Skateboards', 'part', 'coat', 'sic paper glue', 'silicon carbide grit bonded to paper, a glue on its back');
e('truck', 'skateboard truck', 'Mechanical/Vehicles/Skateboards', 'assembly', 'assemble', `al-a380*2 ${F('bolt M10x60')} pu*2 ${F('rod 8mm 210 steel')} ${F('nut M8 lock')}*2`, 'a cast baseplate and hanger on a kingpin between polyurethane bushings: leaning turns the axle');
e('wheel-skate', 'skateboard wheel', 'Mechanical/Vehicles/Skateboards', 'part', 'mould', 'pu', 'cast polyurethane, 99A hard', '54 mm', { alt: 'print', size: [54, 54, 32] });
e('skateboard', 'skateboard', 'Mechanical/Vehicles/Skateboards', 'product', 'assemble', `deck-skate griptape truck*2 wheel-skate*4 ${F('bearing 608')}*8 ${F('screw M5x30')}*8`, 'a maple deck on two trucks; two 608 bearings in each wheel');
// a radio-controlled car
e('chassis-rc', 'RC car chassis', 'Electrical/Vehicles/RC cars', 'part', 'mould', 'pp', 'a moulded tub that carries everything', '', { alt: 'print', size: [300, 150, 40] });
e('wheel-rc', 'RC car wheel', 'Electrical/Vehicles/RC cars', 'assembly', 'assemble', 'rc-tyre rc-rim tyre-foam', 'a rubber tyre glued on a nylon rim', '', { size: [80, 80, 35] });
e('shock-rc', 'RC shock absorber', 'Electrical/Vehicles/RC cars', 'assembly', 'assemble', 'spring-compression al-6061 oil nbr', 'a piston in an oil-filled body inside a spring');
e('rc-car', 'radio-controlled car', 'Electrical/Vehicles/RC cars', 'product', 'assemble', `chassis-rc dcmotor-550 esc mg996r wheel-rc*4 ${F('gear m1 z60 b6 pom')} ${F('gear m1 z15 b6 steel')} shock-rc*4 pack-2s rc-receiver ${F('bearing 625')}*8`, 'a brushed motor drives the wheels through a spur gear; a servo steers the front; a receiver hands both the sticks of the transmitter');
// home appliances
e('mica-heater', 'mica heating element', 'Electrical/Heating/Heaters', 'assembly', 'wind', 'resistance-wire mica-sheet*2', 'nichrome ribbon wound back and forth on a mica card', '', { size: [140, 100, 2] });
e('toaster-case', 'toaster case', 'Electrical/Home appliances/Kitchen', 'part', 'stamp', 'steel-low', 'steel sheet stamped and folded, painted');
e('toast-carriage', 'toast carriage', 'Electrical/Home appliances/Kitchen', 'part', 'stamp', 'steel-low', 'the wire racks that lower the bread and push it back up');
e('power-cord', 'mains cord', 'Electrical/Connectors/Cables', 'assembly', 'crimp', 'insulated-conductor*3 cable-jacket mains-plug', 'three copper conductors in PVC, the plug moulded on its end');
e('toaster', 'toaster', 'Electrical/Home appliances/Kitchen', 'product', 'assemble', 'mica-heater*3 toaster-case toast-carriage thermostat-bimetal solenoid spring-extension power-cord', 'a lever lowers the bread and switches the elements on; an electromagnet holds it down until the bimetal timer lets it spring up', 'about 900 W (typical)');
e('field-coil', 'field winding', 'Electrical/Motors and actuators/Motor parts', 'assembly', 'wind', 'lamination-stack winding*2', 'two coils on a laminated stator: the field of a universal motor');
e('motor-universal', 'universal motor', 'Electrical/Motors and actuators/Brushed motors', 'assembly', 'assemble', `field-coil armature carbon-brush*2 brush-spring*2 ${F('bearing 608')}*2`, 'a brushed motor whose field is wound and in series with its armature, so it runs on AC: fast and strong for its size', 'e.g. 500 W, 20 000 rpm unloaded (typical)');
e('blade-blender', 'blender blade', 'Electrical/Home appliances/Kitchen', 'part', 'stamp', 'stainless-304', 'stamped from stainless sheet, its edges ground and bent up and down', '', { alt: 'grind' });
e('blade-assembly', 'blade assembly', 'Electrical/Home appliances/Kitchen', 'assembly', 'assemble', `blade-blender shaft-steel ${F('bearing 6000')}*2 nbr`, 'the blade on a shaft turning in two bearings, sealed by a lip seal');
e('jar-blender', 'blender jar', 'Electrical/Home appliances/Kitchen', 'part', 'mould', 'pc', 'a clear moulded jar with a spout and lid');
e('drive-coupling', 'drive coupling', 'Mechanical/Shafts and hubs/Couplings', 'part', 'mould', 'pom', 'a toothed cup that joins the motor to the blades when the jar sits on it', '', { alt: 'print', size: [30, 30, 12] });
e('base-blender', 'blender base', 'Electrical/Home appliances/Kitchen', 'part', 'mould', 'abs', 'the moulded housing the motor stands in', '', { alt: 'print', size: [180, 180, 120] });
e('blender', 'blender', 'Electrical/Home appliances/Kitchen', 'product', 'assemble', 'motor-universal blade-assembly jar-blender drive-coupling base-blender pushbutton*3 power-cord', 'a universal motor under the jar spins the blades through a coupling; buttons choose its speed');
e('fan-vacuum', 'vacuum impeller', 'Electrical/Home appliances/Cleaning', 'part', 'stamp', 'al-6061', 'aluminium blades stamped and riveted between two discs: it spins at 30 000 rpm and more', '', { alt: 'cast' });
e('filter-hepa', 'HEPA filter', 'Electrical/Home appliances/Cleaning', 'part', 'assemble', 'filter-media filter-frame', 'pleated glass-fibre paper in a moulded frame: it holds 99.97 % of particles of 0.3 µm (the HEPA standard)');
e('dust-bin', 'dust bin', 'Electrical/Home appliances/Cleaning', 'part', 'mould', 'pp', 'a clear moulded bin the air whirls round in', '', { alt: 'print' });
e('hose', 'vacuum hose', 'Electrical/Home appliances/Cleaning', 'assembly', 'extrude', 'hose-wall hose-helix', 'PVC extruded round a spring-steel coil');
e('brush-roll', 'brush roll', 'Electrical/Home appliances/Cleaning', 'assembly', 'assemble', 'nylon pp gt2-belt', 'nylon bristles set in a spinning roll, driven by a belt');
e('vacuum-cleaner', 'vacuum cleaner', 'Electrical/Home appliances/Cleaning', 'product', 'assemble', 'motor-universal fan-vacuum filter-hepa dust-bin hose brush-roll caster*2 pushbutton power-cord', 'a universal motor spins an impeller that pulls air through the hose, the bin and the filter; the brush roll lifts the dirt');
e('heater-coil', 'heating coil', 'Electrical/Heating/Heaters', 'assembly', 'wind', 'resistance-wire mica-sheet', 'nichrome wire coiled round a mica cross');
e('dryer-housing', 'hair dryer housing', 'Electrical/Home appliances/Personal', 'part', 'mould', 'pc', 'two moulded halves with a handle and a nozzle', '', { alt: 'print' });
e('hair-dryer', 'hair dryer', 'Electrical/Home appliances/Personal', 'product', 'assemble', 'heater-coil fan-impeller motor-130 diode-1n4007*4 thermostat-bimetal fuse-glass dryer-housing pushbutton*2 power-cord', 'a small DC motor, fed through four diodes, blows air over a nichrome coil; a bimetal cuts the heat if it runs too hot', 'about 1800 W (typical)');
// sound
e('driver-headphone', 'headphone driver', 'Electrical/Audio/Speakers', 'assembly', 'assemble', 'magnet-ndfeb steel-low winding pet', 'a voice coil in the gap of a small neodymium magnet moves a thin PET diaphragm', '40 mm, 32 Ω (typical)');
e('headband', 'headband', 'Electrical/Audio/Headphones', 'assembly', 'assemble', 'headband-spring headband-cushion headband-shell', 'a spring-steel band in a padded cover, its sliders to fit');
e('ear-cushion', 'ear cushion', 'Electrical/Audio/Headphones', 'part', 'mould', 'pu', 'memory foam in a soft cover');
e('ear-cup', 'ear cup', 'Electrical/Audio/Headphones', 'part', 'mould', 'abs', 'the moulded shell a driver sits in', '', { alt: 'print', size: [80, 70, 30] });
e('audio-cable', 'audio cable', 'Electrical/Connectors/Cables', 'assembly', 'crimp', 'insulated-conductor*2 cable-shield cable-jacket jack-plug*2', 'three thin conductors in a jacket, a 3.5 mm plug on its end');
e('headphones', 'headphones', 'Electrical/Audio/Headphones', 'product', 'assemble', 'driver-headphone*2 headband ear-cushion*2 ear-cup*2 audio-cable', 'a driver in each cup over each ear, on a sprung band');
e('alnico-rod', 'alnico pole piece', 'Electrical/Audio/Music', 'part', 'cast', 'alnico', 'a cast rod of alnico, ground and magnetised', '5 mm × 17 mm', { size: [5, 5, 17] });
e('guitar-pickup', 'guitar pickup', 'Electrical/Audio/Music', 'product', 'assemble', 'alnico-rod*6 bobbin winding lead-wire*2', 'six magnets under the strings in a bobbin wound with about 8 000 turns of fine wire: a moving steel string changes the field and makes a voltage in the coil', 'single coil, about 6 kΩ (typical)');
// light and heat
e('laser-diode', 'laser diode', 'Electrical/Optics/Lasers', 'product', 'fab', 'laser-chip submount to-header to-cap monitor-photodiode', 'a GaN laser die on a copper block in a TO-can', '405 nm, about 100 mW (typical)');
e('lens-collimator', 'collimating lens', 'Electrical/Optics/Lenses', 'part', 'grind', 'glass', 'a ground and polished glass lens that makes the diode\'s cone of light a beam');
e('housing-laser', 'laser housing', 'Electrical/Optics/Lasers', 'part', 'machine', 'brass', 'a turned brass barrel that holds the diode and focuses the lens on a thread', '', { alt: 'cast', size: [12, 12, 30] });
e('laser-driver', 'laser driver', 'Electrical/Optics/Lasers', 'product', 'solder', 'pcb-bare ic-package smd-passives', 'a constant-current supply: a laser diode fed by voltage alone destroys itself');
e('laser-module', 'laser module', 'Electrical/Optics/Lasers', 'product', 'assemble', 'laser-diode lens-collimator housing-laser laser-driver', 'a laser diode, its lens and its constant-current driver in a brass barrel');
e('te-pellet', 'thermoelectric pellet', 'Electrical/Thermal/Peltier', 'part', 'sinter', 'bi2te3', 'a small block of n- or p-doped bismuth telluride');
e('copper-tab', 'copper tab', 'Electrical/Thermal/Peltier', 'part', 'stamp', 'copper', 'a little copper strap that joins two pellets in series');
e('peltier-module', 'Peltier module', 'Electrical/Thermal/Peltier', 'product', 'solder', 'te-pellet*254 copper-tab*254 alumina*2 solder silicone wire-hookup*2', '127 pairs of n and p pellets in series between two ceramic plates: a current carries heat from one plate to the other', 'TEC1-12706: 12 V, about 6 A, up to about 66 K across it (typical of its makers\' sheets)');
e('heat-pipe', 'heat pipe', 'Electrical/Thermal/Coolers', 'part', 'draw', 'copper water', 'a sealed copper tube lined with a sintered wick, a little water in it under vacuum: it boils at the hot end and condenses at the cold, carrying heat far better than solid copper');
e('fin-stack', 'fin stack', 'Electrical/Thermal/Coolers', 'part', 'stamp', 'al-6063', 'thin aluminium fins stamped and stacked on the heat pipes');
e('base-cooler', 'cooler base', 'Electrical/Thermal/Coolers', 'part', 'machine', 'copper', 'a copper plate machined flat, the heat pipes soldered into it', '', { alt: 'cast' });
e('cpu-cooler', 'CPU cooler', 'Electrical/Thermal/Coolers', 'product', 'assemble', `heat-pipe*4 fin-stack base-cooler ${F('fan 120x25 12V')} steel-spring grease`, 'heat pipes carry the chip\'s heat from the base up into the fins, and the fan blows it away');
// fluid
e('cam-pump', 'pump cam', 'Mechanical/Fluid power/Pump parts', 'part', 'machine', 'steel-low', 'an eccentric on the motor shaft that rocks the diaphragm', '', { alt: 'print', size: [20, 20, 8] });
e('diaphragm', 'diaphragm', 'Mechanical/Fluid power/Pump parts', 'part', 'mould', 'nbr', 'a moulded rubber disc flexed by the cam');
e('valve-flap', 'flap valve', 'Mechanical/Fluid power/Pump parts', 'part', 'mould', 'silicone', 'a soft flap that lets water one way only');
e('pump-diaphragm', 'diaphragm pump, 12 V', 'Mechanical/Fluid power/Pumps', 'product', 'assemble', `${F('dcmotor 385 12V')} cam-pump diaphragm valve-flap*2 pump-housing screw-m3*4`, 'a motor rocks a diaphragm with a cam: each stroke draws water in past one flap valve and pushes it out past the other; it primes itself and can run dry', 'about 2 L/min (typical)');
e('enclosure-printed', 'printed enclosure', 'Electrical/Enclosures/Boxes', 'part', 'print', 'pla', 'a box printed to fit what goes in it, with a lid', '', { size: [120, 80, 40] });
e('irrigation-controller', 'irrigation controller', 'Mechanical/Fluid power/Irrigation', 'product', 'assemble', `valve-solenoid*4 relay*4 esp32-module buck-module enclosure-printed screw-terminal*8 ${F('pipe 3/4 0.5m pvc')}*4`, 'a Wi-Fi board switches four relays, each opening a solenoid valve on its own line, on a schedule or when the soil or the forecast says');
// robots
e('finger-printed', 'gripper finger', 'Mechanical/Robotics/Grippers', 'part', 'print', 'pla', 'a printed finger with a geared root', '', { size: [60, 15, 10] });
e('gripper-base', 'gripper base', 'Mechanical/Robotics/Grippers', 'part', 'print', 'pla', 'a printed plate the servo and fingers mount on', '', { size: [70, 40, 6] });
e('gripper', 'robot gripper', 'Mechanical/Robotics/Grippers', 'product', 'assemble', `mg996r finger-printed*2 gripper-base ${F('gear m1 z20 b6')}*2 screw-m3*6`, 'a servo turns one geared finger, which turns the other the opposite way: the two close together');
e('link-printed', 'arm link', 'Mechanical/Robotics/Arms', 'part', 'print', 'pla', 'a printed link between two servos', '', { size: [120, 40, 30] });
e('servo-driver', 'servo driver board', 'Electrical/Boards and controllers/Motor drivers', 'product', 'solder', `pcb-bare ic-package smd-passives ${F('header 3x16')}`, 'a 16-channel PWM chip that holds each servo where it is told, over I²C');
e('robot-arm-desk', 'desktop robot arm', 'Mechanical/Robotics/Arms', 'product', 'assemble', `mg996r*4 ${F('servo micro')}*2 link-printed*4 gripper-base ${F('bearing 6805')} servo-driver esp32-devkit buck-module screw-m3*24`, 'six servos: a base that turns on a thin bearing, shoulder, elbow and wrist, and a small gripper; a board holds each joint where the controller says');
e('ir-sensor', 'reflective IR sensor', 'Electrical/Sensors/Optical', 'product', 'solder', 'pcb-bare led-5mm ic-package smd-passives', 'an infrared LED and a phototransistor side by side: a dark line under it reflects less');
e('chassis-printed', 'robot chassis', 'Mechanical/Robotics/Mobile robots', 'part', 'print', 'pla', 'a printed plate with mounts for motors, wheels and boards', '', { size: [150, 120, 4] });
e('line-follower', 'line-following robot', 'Mechanical/Robotics/Mobile robots', 'product', 'assemble', 'chassis-printed n20-motor*2 wheel-robot*2 caster ir-sensor*5 drv8833-board esp32-devkit pack-2s screw-m3*12', 'five IR sensors under its nose see the line; it slows the wheel on the side the line drifts to');
// power and display
e('boost-module', 'boost converter module', 'Electrical/Power/DC-DC converters', 'product', 'solder', 'pcb-bare ic-package inductor-power capacitor-ceramic*2 diode-1n4007 smd-passives', 'a switching chip that steps a cell\'s 3.7 V up to 5 V');
e('power-bank', 'power bank', 'Electrical/Power/Power banks', 'product', 'assemble', `${F('pack 1S2P')} boost-module usb-c-socket led-5mm*4 enclosure-printed`, 'two cells side by side behind a protection board; a boost converter gives 5 V at the USB socket; four LEDs show how full it is', 'about 6 Ah at 3.6 V (typical)');
e('pcb-matrix', 'LED matrix board', 'Electrical/Displays/LED matrices', 'part', 'etch', 'fr4 copper solder-mask', 'a board etched with the data line running through every LED');
e('led-matrix', 'LED matrix sign', 'Electrical/Displays/LED matrices', 'product', 'solder', 'ws2812b*256 pcb-matrix esp32-module buck-module capacitor-electrolytic enclosure-printed', '256 addressable LEDs in a 16 × 16 grid, each told its colour down one wire by a Wi-Fi board', '16 × 16, 5 V, up to about 15 A at full white (60 mA an LED)');

// the materials of the kinds of bought part
m('stainless-316', '316 stainless steel', 'Metals/Stainless steels', 'stainless with molybdenum: it stands salt water and acids better than 304', 'A4');
m('al-7075', '7075 aluminium', 'Metals/Aluminium alloys', 'zinc-strengthened aluminium, as strong as mild steel at a third the weight', '7075-T6');
m('al-5052', '5052 aluminium', 'Metals/Aluminium alloys', 'magnesium-strengthened sheet aluminium that bends well and stands salt water', '5052-H32');
m('ti-6al4v', 'titanium alloy', 'Metals/Titanium', 'titanium with aluminium and vanadium: strong, light, it does not corrode', 'Ti-6Al-4V');
m('cast-iron', 'cast iron', 'Metals/Irons', 'iron with 3–4 % carbon: it casts well, machines cleanly and damps vibration', 'grey iron');
m('zamak', 'zinc die-casting alloy', 'Metals/Zinc alloys', 'zinc with a little aluminium, die-cast into handles, buckles and bodies', 'Zamak 3');
m('steel-hss', 'high-speed steel', 'Metals/Steels', 'tool steel with tungsten, molybdenum and vanadium that stays hard when hot: drills and taps', 'M2');
m('tungsten-carbide', 'tungsten carbide', 'Ceramics', 'hard carbide grains cemented with cobalt: the cutting edge of carbide tools', 'WC-Co');
m('iron', 'pure iron', 'Metals/Irons', 'iron with almost nothing else: the positive leg of a type J thermocouple');
m('lead', 'lead', 'Metals/Pure metals', 'a soft, heavy metal: the plates of lead-acid batteries');
m('lithium', 'lithium metal', 'Metals/Pure metals', 'the lightest metal, the anode of primary lithium cells');
m('platinum', 'platinum', 'Metals/Precious metals', 'a precious metal of steady resistance: RTDs and thermocouples');
m('chromium', 'chromium plating', 'Metals/Pure metals', 'a hard, bright plating of chromium');
m('pt-rh6', 'platinum-6 % rhodium', 'Metals/Thermocouple alloys', 'type B negative leg');
m('pt-rh10', 'platinum-10 % rhodium', 'Metals/Thermocouple alloys', 'type S positive leg');
m('pt-rh13', 'platinum-13 % rhodium', 'Metals/Thermocouple alloys', 'type R positive leg');
m('pt-rh30', 'platinum-30 % rhodium', 'Metals/Thermocouple alloys', 'type B positive leg');
m('constantan', 'constantan', 'Metals/Thermocouple alloys', 'copper-nickel of nearly constant resistance: the negative leg of types J, T and E');
m('nicrosil', 'Nicrosil', 'Metals/Thermocouple alloys', 'type N positive leg');
m('nisil', 'Nisil', 'Metals/Thermocouple alloys', 'type N negative leg');
m('solder-snpb', 'tin-lead solder', 'Metals/Solders', 'the eutectic tin-lead solder, melting at one temperature', 'Sn63Pb37');
m('solder-sn60', 'tin-lead solder, 60/40', 'Metals/Solders', 'tin-lead solder with a short pasty range', 'Sn60Pb40');
m('solder-sncu', 'tin-copper solder', 'Metals/Solders', 'a cheap lead-free solder for wave soldering', 'Sn99.3Cu0.7');
m('peek', 'PEEK', 'Plastics', 'a stiff, tough plastic that stands 250 °C and most chemicals');
m('si3n4', 'silicon nitride', 'Ceramics', 'a tough, light ceramic: hybrid-bearing balls');
m('mno2', 'manganese dioxide', 'Chemicals', 'the cathode of alkaline and lithium primary cells');
m('pbo2', 'lead dioxide', 'Chemicals', 'the positive plate of a charged lead-acid battery');
m('ag2o', 'silver oxide', 'Chemicals', 'the cathode of silver-oxide button cells');
m('lani5', 'lanthanum-nickel alloy', 'Metals/Hydrogen storage', 'an alloy that soaks up hydrogen: the negative of NiMH cells');
m('rosin', 'rosin', 'Chemicals', 'pine resin: the flux in cored solder');
m('cyanoacrylate', 'cyanoacrylate', 'Chemicals', 'the monomer of super glue, polymerised by moisture');
m('algainp', 'AlGaInP', 'Semiconductors', 'the semiconductor of red, orange and yellow LEDs');
m('yag-phosphor', 'YAG:Ce phosphor', 'Ceramics', 'a yellow phosphor over a blue LED that makes it white');
m('cds', 'cadmium sulfide', 'Semiconductors', 'the light-dependent resistor\'s film');
m('epdm', 'EPDM rubber', 'Rubbers', 'a rubber that stands weather, steam and coolant');
m('fkm', 'FKM rubber', 'Rubbers', 'a fluoro-rubber (Viton-type) that stands fuel, oil and 200 °C');
m('asa', 'ASA', 'Plastics', 'a weather-proof cousin of ABS');
m('wood', 'softwood', 'Natural', 'spruce, pine or fir, sawn and dried');
m('bk7', 'borosilicate crown glass', 'Glasses', 'the clear optical glass of most lenses', 'N-BK7 type, n = 1.5168');
m('al-2024', '2024 aluminium', 'Metals/Aluminium alloys', 'copper-strengthened aluminium of aircraft skins and fittings', '2024-T3');
m('concrete', 'concrete', 'Building/Masonry', 'cement binding sand and gravel: strong in compression, weak pulled', 'C30/37');
m('granite', 'granite', 'Building/Stone', 'a hard igneous stone of quartz, feldspar and mica');
m('slate', 'slate', 'Building/Stone', 'a fine stone that splits flat: roofs and billiard beds');
m('marble', 'marble', 'Building/Stone', 'recrystallised limestone: calcite');
m('brick', 'fired clay brick', 'Building/Masonry', 'clay shaped and fired in a kiln');
m('koh-electrolyte', 'potassium hydroxide electrolyte', 'Chemicals', 'the alkaline electrolyte of alkaline and NiMH cells');
m('acid-electrolyte', 'battery acid', 'Chemicals', 'dilute sulfuric acid, the electrolyte of lead-acid batteries');
m('gypsum', 'gypsum', 'Building/Boards', 'calcium sulfate set with its water: the core of plasterboard and plaster');
m('argon', 'argon', 'Other materials/Gases', 'an inert gas, the shield of TIG and MIG welding', '99.996 %');
m('co2', 'carbon dioxide', 'Other materials/Gases', 'a cheap active shielding gas for steel; liquid in its cylinder');
m('borosilicate', 'borosilicate glass 3.3', 'Glasses', 'the glass of lab ware: it stands heat and thermal shock', 'ISO 3585');
m('rutile', 'rutile (titanium dioxide)', 'Ceramics', 'the main mineral of a rutile electrode\'s flux');
m('pvb', 'PVB', 'Polymers', 'polyvinyl butyral: the tough interlayer of laminated glass');
m('portland', 'Portland cement', 'Building/Binders', 'ground clinker and gypsum: with water it sets to stone', 'EN 197-1');
m('zinc-oxide', 'zinc oxide', 'Ceramics', 'a white semiconductor ceramic: sintered, the grains of a varistor');
m('zirconia', 'zirconia', 'Ceramics', 'a tough white ceramic: fibre ferrules, blades and bearing balls');
m('ps', 'polystyrene', 'Polymers', 'a light rigid plastic; foamed, it is EPS and XPS insulation');
m('tungsten', 'tungsten', 'Metals', 'the metal with the highest melting point: lamp filaments and TIG electrodes');
m('al-4043', '4043 aluminium filler', 'Metals/Aluminium alloys', 'aluminium with 5 % silicon: a filler wire that flows well', 'AWS A5.10 ER4043');
m('al-5356', '5356 aluminium filler', 'Metals/Aluminium alloys', 'aluminium with 5 % magnesium: a stronger filler wire', 'AWS A5.10 ER5356');

// ==== life: molecules, cells, tissues, organs, the human body, the organisms used in technology (src/nexus/life) =====
for (const mo of MOLECULES) { const da = daltonsOf(mo); put({ id: mo.id, name: mo.name, path: ['Life', 'Molecules', ...mo.group.split('/').slice(1)], kind: 'material', make: /Salts|Gases|Biominerals/.test(mo.group) ? 'stock' : 'grow', of: [], says: mo.says, ...(da ? { da: +da.toFixed(1) } : {}) }); }
for (const e of LIFE) put({ id: e.id, name: e.name, path: e.path.split('/'), kind: e.kind, make: 'grow', of: e.of.map((c) => ({ ...c })), says: e.says, ...(e.spec ? { spec: e.spec } : {}), ...(e.size ? { size: e.size } : {}), ...(e.members ? { members: e.members } : {}), g: e.g, ...(e.look ? { look: e.look } : {}), ...(Object.keys(e.mass).length ? { mass: { ...e.mass } } : {}) });

// ==== the fundamentals: every material down to its elements ==========================================================
// Every tree of the inventory, followed past its materials, ends in the same few dozen elements (src/nexus/elements.ts).
for (const [sym, el] of Object.entries(ELEMENTS)) put({ id: elementId(sym), name: `${el.name} (${sym})`, path: ['Elements', el.group], kind: 'element', make: 'chemistry', of: [], says: `got from ${el.from}`, spec: `atomic weight ${el.w}` });
for (const i of items.values()) if (i.kind === 'material') { const mk = makeup(i.id); if (mk.length) { i.makeup = mk.map(([x, pct]) => ({ id: ELEMENTS[x] ? elementId(x) : x, pct: +pct.toFixed(3) })).sort((a, b) => b.pct - a.pct); const ms = makeupSays(i.id); i.spec = i.spec && !ms.startsWith(i.spec) ? `${i.spec}; ${ms}` : ms; } }

// ==== reading it ========================================================================================================
export const INVENTORY: ReadonlyMap<string, Item> = items;
/** A count to read: 12, 4,000, 2.6 million, 26 trillion, 0.5. */
export function countSays(n: number): string {
  if (n < 1) return n.toPrecision(2).replace(/\.?0+$/, '');
  if (n < 1e6) return (Number.isInteger(n) ? n : +n.toPrecision(3)).toLocaleString('en');
  const [d, w] = n >= 1e18 ? [1e18, 'quintillion'] : n >= 1e15 ? [1e15, 'quadrillion'] : n >= 1e12 ? [1e12, 'trillion'] : n >= 1e9 ? [1e9, 'billion'] : [1e6, 'million'];
  return `${+(n / (d as number)).toPrecision(3)} ${w}`;
}
export const itemOf = (id: string): Item | null => items.get(id) ?? null;
/** An item from words: an adjustable family called with its sizes ("screw M4x20"), else an entry by its id or name. */
export function resolve(words: string): Item | string | null {
  const byId = items.get(words.trim().toLowerCase()); if (byId) return byId; // "pump-gear" is that pump, not the pump kind's sizes
  const f = callFamily(words);
  if (typeof f === 'string') { const ws = words.trim().toLowerCase().split(/[\s-]+/).filter(Boolean); return [...items.values()].find((i) => ws.every((x) => i.id.includes(x) || i.name.toLowerCase().includes(x))) ?? f; }
  if (f) { const had = items.get(f.id); if (!had) { put(f); return f; } return had; }
  return findItem(words);
}
/** An item by its id or (in part) its name. */
export function findItem(words: string): Item | null {
  const w = words.trim().toLowerCase(); if (!w) return null;
  return items.get(w) ?? [...items.values()].find((i) => i.name.toLowerCase() === w) ?? [...items.values()].find((i) => i.name.toLowerCase().includes(w) || i.id.includes(w.replace(/\s+/g, '-'))) ?? null;
}
/** The categories, as a tree of names: category → subcategory → sub-subcategory → the items filed there. */
let catsAt = -1, cats: Map<string, Map<string, Map<string, string[]>>> = new Map();
export function categories(): Map<string, Map<string, Map<string, string[]>>> {
  if (catsAt === rev) return cats;
  const out = new Map<string, Map<string, Map<string, string[]>>>();
  for (const i of items.values()) { const [a, b = '', c = ''] = i.path; if (!out.has(a!)) out.set(a!, new Map()); const A = out.get(a!)!; if (!A.has(b)) A.set(b, new Map()); const B = A.get(b)!; if (!B.has(c)) B.set(c, []); B.get(c)!.push(i.id); }
  catsAt = rev; cats = out;
  return out;
}
/** How an item is made here: its own way if the workshop has it, else a way it has that will do, else bought. */
export function routeOf(i: Item): { process: Process; here: boolean; bought: boolean; why: string } {
  if (PROCESSES[i.make].here) return { process: i.make, here: true, bought: false, why: PROCESSES[i.make].says };
  if (i.alt && PROCESSES[i.alt].here) return { process: i.alt, here: true, bought: false, why: `${PROCESSES[i.alt].says}, instead of ${i.make === 'mould' ? 'moulded' : i.make === 'machine' ? 'machined' : i.make === 'forge' ? 'forged' : i.make} as it is made in a factory` };
  if (i.make === 'grow') return { process: 'grow', here: false, bought: true, why: `grown, not made: ${PROCESSES.grow.says}` };
  return { process: i.make, here: false, bought: true, why: `bought: ${PROCESSES[i.make].says}, which the workshop has not` };
}
/** Everything inside an item, depth first, each with how many go into one of it and how it is made here. */
export interface PlanRow { id: string; name: string; depth: number; n: number; kind: Kind; route: ReturnType<typeof routeOf> }
export const plan = memo((id: string): readonly PlanRow[] => {
  const out: PlanRow[] = [];
  const walk = (x: string, depth: number, n: number, seen: Set<string>) => {
    const i = items.get(x); if (!i || seen.has(x)) return;
    const r = routeOf(i); out.push({ id: x, name: i.name, depth, n, kind: i.kind, route: r });
    // what is bought is bought whole: what is inside it is the maker's, not the workshop's
    if (r.bought) return;
    const s2 = new Set(seen).add(x); for (const c of i.of) walk(c.id, depth + 1, n * c.n, s2);
  };
  walk(id, 0, 1, new Set());
  return Object.freeze(out);
});
/** What making an item here comes to: how many things are made here, bought, taken from stock; how deep it goes. */
export const summary = memo((id: string): { made: number; bought: number; stock: number; depth: number; processes: Process[] } => {
  const p = plan(id); return { made: p.filter((r) => !r.route.bought && r.kind !== 'material').length, bought: p.filter((r) => r.route.bought).length, stock: p.filter((r) => r.kind === 'material').length, depth: Math.max(...p.map((r) => r.depth)), processes: [...new Set(p.filter((r) => r.route.here && r.kind !== 'material').map((r) => r.route.process))] };
});
/** Everything an item comes down to, inside what is bought too: the elements, each with the materials it comes in,
 *  by mass in each. Every item's tree ends here. */
export const fundamentals = memo((id: string): { id: string; name: string; via: { material: string; pct: number }[] }[] => {
  const via = new Map<string, Map<string, number>>(), seen = new Set<string>();
  const walk = (x: string, depth: number) => {
    const i = items.get(x); if (!i || depth > 16 || seen.has(x)) return; seen.add(x);
    if (i.kind === 'element') { if (!via.has(x)) via.set(x, new Map()); return; }
    if (i.kind === 'material') { for (const [sym, pct] of Object.entries(elementsOf(x))) { const e = elementId(sym); if (!via.has(e)) via.set(e, new Map()); via.get(e)!.set(i.name, pct); } return; }
    for (const c of i.of) walk(c.id, depth + 1);
  };
  walk(id, 0);
  return [...via].map(([e, m]) => ({ id: e, name: items.get(e)?.name ?? e, via: [...m].map(([material, pct]) => ({ material, pct })).sort((a, b) => b.pct - a.pct) })).sort((a, b) => b.via.length - a.via.length || a.name.localeCompare(b.name));
});

/** grams one of an item weighs: its own, else a molecule's weight; null where it is not known. */
const AMU = 1.66053907e-24;
export const gramsOfItem = (i: Item): number | null => i.g ?? (i.da ? i.da * AMU : null);
/** What an item is, element by element, by mass: each part weighed (its grams said, or its count times what one
 *  weighs) and each part's own make-up so, down to the materials' elements. Fractions adding to 1; null where no part
 *  of it has a weight (a screw's parts are not weighed). */
export const massMakeup = memo((id: string): Record<string, number> | null => {
  const i = items.get(id); if (!i) return null;
  if (i.kind === 'element') { const sym = Object.keys(ELEMENTS).find((s) => elementId(s) === id); return sym ? { [sym]: 1 } : null; }
  if (i.kind === 'material') { const e = elementsOf(id), t = Object.values(e).reduce((a, b) => a + b, 0); if (!t) return null; return Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v / t])); }
  const out: Record<string, number> = {}; let all = 0;
  for (const c of i.of) {
    const ci = items.get(c.id); if (!ci) continue;
    const g = i.mass?.[c.id] ?? (gramsOfItem(ci) ?? NaN) * c.n; if (!(g > 0)) continue;
    const mk = massMakeup(c.id); if (!mk) continue;
    for (const [el, f] of Object.entries(mk)) out[el] = (out[el] ?? 0) + g * f;
    all += g;
  }
  if (!all) return null;
  for (const k of Object.keys(out)) out[k]! /= all;
  return out;
});
/** The atoms in one of an item, element by element: its grams by element over each one's atomic weight, times
 *  Avogadro's number; kept as these counts until it is opened, they are its atoms as a mapped probability. */
export const atomsOf = memo((id: string): { total: number; by: { el: string; n: number; share: number }[] } | null => {
  const i = items.get(id), mk = massMakeup(id); if (!i || !mk) return null; const g = gramsOfItem(i); if (!g) return null;
  const by = Object.entries(mk).map(([el, f]) => ({ el, n: (g * f / ELEMENTS[el]!.w) * 6.02214076e23 })), total = by.reduce((a, b) => a + b.n, 0);
  return { total, by: by.map((b) => ({ ...b, share: b.n / total })).sort((a, b) => b.n - a.n) };
});
/** How many of a thing there are in an item, all the way down (red cells in a body, synapses in a brain). */
export const countIn = (id: string, what: string): number => {
  const memoN = new Map<string, number>();
  const n = (x: string): number => { if (x === what) return 1; const k = memoN.get(x); if (k !== undefined) return k; memoN.set(x, 0); const i = items.get(x); let t = 0; if (i) for (const c of i.of) t += c.n * n(c.id); memoN.set(x, t); return t; };
  return n(id);
};

/** The tree of what is in an item, every level, as lines to read. */
/** The tree of what is in an item, every level, as lines to read: inside what is bought too (its maker's parts, said
 *  as bought), each material's make-up under it, down to the elements. */
export function treeLines(id: string, most = 60): string[] {
  const out: string[] = [];
  const pct = (x: number) => (x >= 1 ? x.toFixed(1) : x.toFixed(2));
  const walk = (x: string, depth: number, n: number, seen: Set<string>) => {
    const i = items.get(x); if (!i || out.length >= most || seen.has(x)) return;
    const r = routeOf(i);
    out.push(`${'  '.repeat(depth)}${n !== 1 ? `${countSays(n)} × ` : ''}${i.name} — ${i.kind === 'element' ? 'element' : i.kind === 'material' ? 'stock' : i.make === 'grow' ? 'grown' : r.bought ? 'bought' : r.process}`);
    if (i.kind === 'material' && i.makeup) { out.push(`${'  '.repeat(depth + 1)}= ${i.makeup.slice(0, 8).map((m) => `${(items.get(m.id)?.name ?? m.id).replace(/ \(.*\)$/, '')} ${pct(m.pct)} %`).join(' · ')}`); for (const m of i.makeup) if (items.get(m.id)?.kind === 'material') walk(m.id, depth + 1, 1, new Set(seen).add(x)); return; }
    for (const c of i.of) walk(c.id, depth + 1, c.n, new Set(seen).add(x));
  };
  walk(id, 0, 1, new Set());
  return out;
}
/** A part's shape to print or cast it here: a hollow box of its size for a housing or case, a disc for a gear or wheel. */
export function sectionsOf(i: Item): Section[] {
  const [w, d, h] = i.size ?? [30, 30, 10];
  if (/gear/.test(i.id)) return [{ outline: shapes.gear(Math.max(10, Math.round(w / 1.5)), 1), holes: [shapes.circle(2.5)], z0: 0, z1: h }];
  if (/wheel|pulley|roller|collar|coupling|hub/.test(i.id)) return [{ outline: shapes.circle(w / 2), holes: [shapes.circle(Math.max(1.5, w / 8))], z0: 0, z1: h }];
  if (/case|housing|holder|head|cap|bobbin/.test(i.id)) return [{ outline: shapes.rect(w, d), z0: 0, z1: 1.2 }, { outline: shapes.rect(w, d), holes: [shapes.rect(w - 3, d - 3)], z0: 1.2, z1: h }];
  return [{ outline: shapes.rect(w, d), z0: 0, z1: h }];
}

// ==== feeding it fast ====================================================================================================
const KINDS: Kind[] = ['product', 'assembly', 'part', 'material'];
/** Entries read from text, as fast as they can be written: one a line, "id | name | Category/Sub | kind | process |
 *  child*n child | what it is | its spec"; or a JSON array of entries; or CSV with a header row of those names. Each is
 *  checked (its process known, everything in it known or given with it, nothing inside itself); what passes is added.
 *  Says what was added, and why any was not. */
export function feed(text: string): { added: Item[]; refused: string[] } {
  const rows: Partial<Record<'id' | 'name' | 'path' | 'kind' | 'make' | 'of' | 'says' | 'spec' | 'alt', string>>[] = [];
  const t = text.trim();
  if (/^\[/.test(t)) { try { for (const o of JSON.parse(t) as Record<string, unknown>[]) rows.push({ id: String(o.id ?? ''), name: String(o.name ?? o.id ?? ''), path: Array.isArray(o.path) ? (o.path as string[]).join('/') : String(o.path ?? 'Yours/Unsorted'), kind: String(o.kind ?? 'product'), make: String(o.make ?? 'assemble'), of: Array.isArray(o.of) ? (o.of as (string | { id: string; n?: number })[]).map((c) => (typeof c === 'string' ? c : `${c.id}*${c.n ?? 1}`)).join(' ') : String(o.of ?? ''), says: String(o.says ?? ''), spec: String(o.spec ?? ''), ...(o.alt ? { alt: String(o.alt) } : {}) }); } catch (e) { return { added: [], refused: [`Not JSON: ${(e as Error).message}`] }; } }
  else {
    const lines = t.split(/\n|;;/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const csv = lines[0] && /^id\s*,\s*name/i.test(lines[0]);
    const head = csv ? lines.shift()!.split(',').map((x) => x.trim().toLowerCase()) : ['id', 'name', 'path', 'kind', 'make', 'of', 'says', 'spec', 'alt'];
    for (const l of lines) { const cells = (csv ? l.split(',') : l.split('|')).map((x) => x.trim()); rows.push(Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']))); }
  }
  const added: Item[] = [], refused: string[] = [], fresh = new Map<string, Item>();
  for (const r of rows) {
    const id = (r.id ?? '').toLowerCase().replace(/[^a-z0-9.-]+/g, '-'); if (!id) { refused.push('an entry with no id'); continue; }
    const kind = (KINDS.includes(r.kind as Kind) ? r.kind : 'product') as Kind, make = (r.make && r.make in PROCESSES ? r.make : kind === 'material' ? 'stock' : 'assemble') as Process;
    if (r.make && !(r.make in PROCESSES)) { refused.push(`${id}: no process "${r.make}" (one of: ${Object.keys(PROCESSES).join(', ')})`); continue; }
    const of = (r.of ?? '').split(/\s+/).filter(Boolean).map((x) => { const [c, n] = x.split('*'); return { id: c!.toLowerCase(), n: Number(n ?? 1) || 1 }; });
    fresh.set(id, { id, name: r.name || id, path: (r.path || 'Yours/Unsorted').split('/').map((x) => x.trim()).filter(Boolean), kind, make, of, says: r.says ?? '', ...(r.spec ? { spec: r.spec } : {}), ...(r.alt && r.alt in PROCESSES ? { alt: r.alt as Process } : {}), yours: true });
  }
  for (const it of fresh.values()) {
    const unknown = it.of.filter((c) => { if (items.has(c.id) || fresh.has(c.id)) return false; const f = callFamily(c.id.replace(/-/g, ' ')); if (f && typeof f === 'object') { if (!items.has(f.id)) put(f); c.id = f.id; return false; } return true; });
    if (unknown.length) { refused.push(`${it.id}: nothing known as ${unknown.map((c) => c.id).join(', ')}: add them too, or use what is in the inventory`); continue; }
    // nothing inside itself
    const inside = (x: string, seen: Set<string>): boolean => { const i = fresh.get(x) ?? items.get(x); if (!i) return false; for (const c of i.of) { if (c.id === it.id || seen.has(c.id)) return true; if (inside(c.id, new Set(seen).add(c.id))) return true; } return false; };
    if (inside(it.id, new Set([it.id]))) { refused.push(`${it.id}: it would be inside itself`); continue; }
    put(it); added.push(it);
  }
  return { added, refused };
}
/** An entry as one line of the fast format, to copy, change and feed again. */
export const lineOf = (i: Item) => [i.id, i.name, i.path.join('/'), i.kind, i.make, i.of.map((c) => (c.n > 1 ? `${c.id}*${c.n}` : c.id)).join(' '), i.says, i.spec ?? ''].join(' | ');

// ==== as boards =========================================================================================================
/** The whole inventory as a board of its categories: category, subcategory and sub-subcategory, each entry filed under
 *  them; the adjustable families marked ⚙ with their sizes. */
export function boardOfInventory(at = Date.now()): Board {
  const b: Board = { title: 'Inventory', kind: 'categories', about: '', nodes: {}, edges: {}, createdAt: at, updatedAt: at, source: 'inventory' };
  let e2 = 0; const node = (id: string, label: string, note: string) => { if (!b.nodes[id]) b.nodes[id] = { label, note }; return id; }, link = (a: string, c: string) => { b.edges[`e${e2++}`] = { from: a, to: c, rel: 'contains' }; };
  const root = node('inv', 'Inventory', 'Everything the forge knows how to make, by what it is');
  for (const [cat, subs] of categories()) {
    const cid = node(`c-${cat}`, cat, ''); link(root, cid);
    for (const [sub, subsubs] of subs) {
      const sid = sub ? node(`s-${cat}-${sub}`, sub, '') : cid; if (sub) link(cid, sid);
      for (const [ss, ids] of subsubs) {
        const ssid = ss ? node(`ss-${cat}-${sub}-${ss}`, ss, '') : sid; if (ss) link(sid, ssid);
        for (const id of ids) { const i = items.get(id)!; if (i.adjustable && !i.family) continue; const sm = i.kind === 'material' ? null : summary(id); link(ssid, node(`i-${id}`, `${i.family ? '⚙ ' : ''}${i.name}`, `${i.says}${i.spec ? ` · ${i.spec}` : ''}${sm ? ` · made here: ${sm.made}, bought: ${sm.bought}, from stock: ${sm.stock}` : ''}${i.family ? ` · adjustable: "${FAMILIES.find((f) => f.id === i.family)?.examples[1] ?? i.family}"` : ''}`)); }
      }
    }
  }
  for (const f of FAMILIES) { const id = `f-${f.id}`, under = `ss-${f.path.join('-')}`; node(id, `⚙ ${f.name} (any size)`, `${f.says}. Call it: ${f.examples.join(', ')}. Sizes: ${f.params.map((q) => `${q.key} ${q.values ? q.values.join('/') : `${q.min}–${q.max} ${q.unit}`}`).join('; ')}`); link(b.nodes[under] ? under : root, id); }
  const n = [...items.values()].filter((i) => !(i.adjustable && !i.family)).length;
  b.about = `${n} entries in ${categories().size} categories, and ${FAMILIES.length} adjustable families (⚙) that make any size asked for. Each entry is mapped to what is inside it, down to its materials; open one's tree, or make it ("inventory make nema17", "inventory make screw M4x20").`;
  return b;
}
/** What is inside an item, every level down to its materials, as a board. */
export function boardOfTree(id: string, at = Date.now()): Board | null {
  const top = items.get(id); if (!top) return null;
  const b: Board = { title: `Inside: ${top.name}`, kind: 'categories', about: `${top.says}. Every part inside it, and what is inside that, down to its materials and their elements (each element one node, where every branch meets); each marked by how it is made here (made, bought, or from stock).`, nodes: {}, edges: {}, createdAt: at, updatedAt: at, source: `inventory:${id}` };
  let e2 = 0;
  const walk = (x: string, under: string | null, n: number, path: string) => {
    const i = items.get(x); if (!i || Object.keys(b.nodes).length >= 600) return; const r = routeOf(i), nid = `${path}/${x}`.replace(/[^a-z0-9/.-]/gi, '-');
    b.nodes[nid] = { label: `${n !== 1 ? `${countSays(n)} × ` : ''}${i.name}`, note: `${i.says}${i.spec ? ` · ${i.spec}` : ''} · ${i.kind === 'material' ? 'from stock' : r.bought ? r.why : `made here: ${r.why}`}` };
    if (under) b.edges[`e${e2++}`] = { from: under, to: nid, rel: 'contains' };
    if (path.split('/').length < 8) for (const c of i.of) walk(c.id, nid, c.n, `${path}/${x}`);
    // a material: what it is made of; an element is one node, so every branch that comes to it meets there
    if (i.kind === 'material' && i.makeup) for (const m of i.makeup) {
      const el = items.get(m.id); if (!el) continue;
      if (el.kind === 'element') { const fid = `fund/${m.id}`; if (!b.nodes[fid]) b.nodes[fid] = { label: `⚛ ${el.name}`, note: el.says }; b.edges[`e${e2++}`] = { from: nid, to: fid, rel: `${m.pct >= 1 ? m.pct.toFixed(1) : m.pct.toFixed(2)} % of it` }; }
      else if (path.split('/').length < 9) walk(m.id, nid, 1, `${path}/${x}`);
    }
  };
  walk(id, null, 1, '');
  return b;
}
/** Making an item, as a pipeline: each thing inside it made (or bought, or taken from stock), then it put together. */
export function makeBoard(id: string, at = Date.now()): Board | null {
  const i = items.get(id); if (!i) return null; const r = routeOf(i);
  const steps: [string, string, { kind: 'trigger' | 'action'; what: string }][] = [['t', 'Run', { kind: 'trigger', what: 'when I press run' }]];
  i.of.forEach((c, k) => { const ci = items.get(c.id); if (ci) steps.push([`c${k}`, `${c.n > 1 ? `${c.n} × ` : ''}${ci.name}`, { kind: 'action', what: `inventory make ${c.id}${c.n > 1 ? ` x${c.n}` : ''}` }]); });
  steps.push(['f', `${r.bought ? 'Take' : r.process === 'print' ? 'Print' : r.process === 'cast' ? 'Cast' : 'Put together'} the ${i.name}`, { kind: 'action', what: `inventory finish ${id}` }]);
  const b: Board = { title: `Make: ${i.name}`, kind: 'flow', about: `${i.says}. Each step makes (or buys, or takes from stock) one thing inside it, each of those made the same way all the way down; the last step ${r.bought ? 'takes it as bought' : r.why}.`, nodes: {}, edges: {}, createdAt: at, updatedAt: at, source: `inventory:${id}` };
  steps.forEach(([sid, label, step], k) => { b.nodes[sid] = { label, step }; if (k) b.edges[`e${k}`] = { from: steps[k - 1]![0], to: sid, rel: 'flows to' }; });
  return b;
}
