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

/** How a thing is made from what is in it. */
export type Process =
  | 'stock' | 'print' | 'cast' | 'wind' | 'solder' | 'crimp' | 'assemble' | 'heat-treat' | 'bend'
  | 'machine' | 'stamp' | 'mould' | 'extrude' | 'draw' | 'cold-head' | 'roll-thread' | 'sinter' | 'etch' | 'fab' | 'coat' | 'grind' | 'laminate' | 'weld' | 'forge' | 'blow' | 'coil' | 'chemistry';
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
};
export type Kind = 'product' | 'assembly' | 'part' | 'material';
export interface Item {
  id: string; name: string; path: string[]; kind: Kind; make: Process;
  /** a way the workshop can make it where its own way is not here (a moulded case printed, a die-cast part cast) */ alt?: Process;
  of: { id: string; n: number }[]; says: string; spec?: string;
  /** about how big (mm) and heavy (g), where it is printed or cast here, or known */ size?: [number, number, number]; g?: number;
  /** made to sizes it is called with (a family's size), or one size of a family that makes any */ adjustable?: boolean; family?: string;
  /** added by you, not seeded */ yours?: boolean;
}
const items = new Map<string, Item>();
/** An entry, compactly: id, name, "Category/Subcategory[/Sub-subcategory]", kind, process, "child*n child …", says, spec, more. */
function e(id: string, name: string, path: string, kind: Kind, make: Process, of: string, says: string, spec = '', more: Partial<Item> = {}): void {
  items.set(id, { id, name, path: path.split('/'), kind, make, of: of.trim() ? of.trim().split(/\s+/).map((x) => { const [c, n] = x.split('*'); return { id: c!, n: Number(n ?? 1) }; }) : [], says, ...(spec ? { spec } : {}), ...more });
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
e('pin-header', 'pin header (1 × 20, 2.54 mm)', 'Electrical/Wiring and connectors/Headers', 'part', 'assemble', 'nylon brass gold', 'square brass pins in a moulded strip, their ends gold-flashed', '2.54 mm (0.1 in) pitch');
e('screw-terminal', 'screw terminal block', 'Electrical/Wiring and connectors/Terminals', 'part', 'assemble', 'nylon brass steel-low', 'a moulded body with a brass clamp and screw for each wire');
e('wire-hookup', 'hook-up wire', 'Electrical/Wiring and connectors/Wire', 'part', 'extrude', 'copper pvc', 'stranded copper in PVC insulation', 'e.g. 22 AWG');
e('crimp-contact', 'crimp contact', 'Electrical/Wiring and connectors/Contacts', 'part', 'stamp', 'brass tin', 'a stamped, tin-plated brass contact crimped onto a wire');
e('connector-housing', 'connector housing', 'Electrical/Wiring and connectors/Housings', 'part', 'mould', 'nylon', 'the moulded shell the contacts click into', '', { alt: 'print', size: [10, 6, 6] });
e('jst-xh', 'JST XH connector (2.5 mm)', 'Electrical/Wiring and connectors/Connectors', 'assembly', 'crimp', 'connector-housing crimp-contact*2 wire-hookup*2', 'two wires crimped into contacts and clicked into a housing', '2.5 mm pitch');
e('usb-c-socket', 'USB-C socket', 'Electrical/Wiring and connectors/Connectors', 'part', 'stamp', 'stainless-304 copper gold nylon', 'a stamped shell round 24 gold-plated contacts in a moulded tongue');
e('smd-passives', 'chip resistors and capacitors', 'Electrical/Passive components/Chip passives', 'part', 'fab', 'alumina batio3 nickel tin', 'the tiny surface-mount resistors and capacitors a board is strewn with');
e('resistor-film', 'metal-film resistor', 'Electrical/Passive components/Resistors', 'product', 'assemble', 'alumina nichrome lead-wire*2 epoxy', 'a thin metal film on a ceramic rod, a spiral cut into it to set its resistance, end caps, leads and a lacquer coat', 'tolerance 1 %, 0.25 W typical');
e('capacitor-electrolytic', 'aluminium electrolytic capacitor', 'Electrical/Passive components/Capacitors', 'product', 'assemble', 'al-foil*2 paper electrolyte-al lead-wire*2 rubber al-6061', 'two aluminium foils, one with an oxide film for its dielectric, wound with paper soaked in electrolyte, sealed in a can with a rubber bung');
e('capacitor-ceramic', 'ceramic capacitor (MLCC)', 'Electrical/Passive components/Capacitors', 'product', 'sinter', 'batio3 nickel tin', 'layers of barium-titanate ceramic and nickel electrodes, fired together, ends plated');
e('inductor-power', 'power inductor', 'Electrical/Passive components/Inductors', 'product', 'wind', 'ferrite-soft magnet-wire', 'a winding on a ferrite core');
e('potentiometer', 'potentiometer', 'Electrical/Passive components/Potentiometers', 'product', 'assemble', 'phenolic graphite brass steel-low lead-wire*3', 'a carbon track on a phenolic disc, a sprung wiper turned by the shaft, three terminals');
e('fuse-glass', 'glass cartridge fuse', 'Electrical/Passive components/Fuses', 'product', 'assemble', 'glass nickel brass', 'a wire that melts at its rated current, in a glass tube between brass caps', '5 × 20 mm');
e('crystal', 'quartz crystal', 'Electrical/Passive components/Oscillators', 'product', 'assemble', 'quartz silver steel-low', 'a quartz blank cut to ring at its frequency, electrodes on its faces, sealed in a can');
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
e('thermocouple-k', 'type K thermocouple probe', 'Electrical/Sensors/Temperature', 'product', 'assemble', 'chromel alumel mgo stainless-304', 'a chromel and an alumel wire welded at the tip, packed in magnesium oxide in a stainless sheath', '−200 to 1350 °C');
e('image-sensor', 'image sensor', 'Electrical/Sensors/Imaging', 'part', 'fab', 'silicon glass', 'a CMOS die of millions of photodiodes under a colour filter and microlenses');
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
e('pushbutton', 'tactile push button', 'Electrical/Switching/Switches', 'product', 'assemble', 'stainless-304 pbt brass', 'a domed stainless disc that snaps down onto two contacts, under a plunger, in a moulded base');
e('transformer', 'mains transformer (small)', 'Electrical/Power/Transformers', 'product', 'assemble', 'lamination-stack bobbin winding*2 steel-low', 'a primary and a secondary winding on one bobbin over an E-I laminated core, in a steel frame', 'turns ratio sets the voltage ratio');
e('cell-18650', 'lithium-ion cell 18650', 'Electrical/Power/Cells', 'product', 'assemble', 'jelly-roll electrolyte-li cell-can cell-cap', 'a wound roll of cathode, separator and anode in a steel can, filled with electrolyte, sealed under a cap with its safety vent and interrupt', '18 mm × 65 mm; 3.6 V nominal', { g: 47 });
e('jelly-roll', 'electrode roll', 'Electrical/Power/Cell parts', 'assembly', 'wind', 'nmc al-foil graphite copper-foil pe', 'cathode (NMC on aluminium foil) and anode (graphite on copper foil) wound with a polyethylene separator between');
e('cell-can', 'cell can', 'Electrical/Power/Cell parts', 'part', 'stamp', 'steel-low nickel', 'a deep-drawn, nickel-plated steel can: the negative terminal');
e('cell-cap', 'cell top cap', 'Electrical/Power/Cell parts', 'assembly', 'assemble', 'steel-low al-foil nbr', 'the positive cap: a vent, a current-interrupt disc and a gasket');
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
e('probes', 'test probes', 'Electrical/Instruments/Meter parts', 'part', 'assemble', 'brass silicone pvc', 'sharp brass tips in moulded handles on silicone leads');

// ==== mechanical =======================================================================================================
e('bearing-ring', 'bearing ring', 'Mechanical/Bearings/Bearing parts', 'part', 'grind', 'steel-chrome', 'an inner or outer ring: turned, hardened, its raceway ground and honed');
e('bearing-ball', 'bearing ball', 'Mechanical/Bearings/Bearing parts', 'part', 'grind', 'steel-chrome', 'a chrome-steel ball ground and lapped round to under a micrometre');
e('bearing-cage', 'bearing cage', 'Mechanical/Bearings/Bearing parts', 'part', 'stamp', 'steel-low', 'the stamped steel cage that keeps the balls apart');
e('bearing-shield', 'bearing shield', 'Mechanical/Bearings/Bearing parts', 'part', 'stamp', 'steel-low', 'a pressed steel shield (the Z in 2Z) that keeps grease in and dirt out');
e('bearing-608', 'ball bearing 608 (8 × 22 × 7)', 'Mechanical/Bearings/Ball bearings', 'product', 'assemble', 'bearing-ring*2 bearing-ball*7 bearing-cage bearing-shield*2 grease', 'two rings, a row of balls in a cage, shields both sides, grease', '8 mm bore, 22 mm outside, 7 mm wide (ISO 15); 7 balls typical', { g: 12 });
e('lm8uu', 'linear bearing LM8UU', 'Mechanical/Bearings/Linear bearings', 'product', 'assemble', 'steel-chrome bearing-ball*40 pom nbr*2', 'a hardened sleeve round rows of balls that roll and come back round in a plastic retainer, sealed at both ends', 'for 8 mm rods; balls about 40, typical');
e('bushing-bronze', 'bronze bushing', 'Mechanical/Bearings/Plain bearings', 'product', 'sinter', 'bronze oil', 'an oil-soaked sintered bronze sleeve');
e('spur-gear', 'spur gear (module 1, 30 teeth)', 'Mechanical/Gears and gearboxes/Spur gears', 'product', 'machine', 'steel-low', 'a gear cut with involute teeth', 'pitch circle 30 mm (module × teeth)', { alt: 'print', size: [32, 32, 8] });
e('worm-set', 'worm and wheel', 'Mechanical/Gears and gearboxes/Worm gears', 'product', 'assemble', 'steel-alloy bronze', 'a hardened steel worm turning a bronze wheel: a large ratio in one stage, and it does not drive back');
e('planet-gearbox', 'planetary gearbox', 'Mechanical/Gears and gearboxes/Gearboxes', 'product', 'assemble', 'gear-plastic*4 ring-gear planet-carrier bearing-608*2 shaft-steel gearbox-housing', 'a sun gear driving three planets inside a ring gear; the planets\' carrier is the output', 'ratio 1 + ring teeth ÷ sun teeth');
e('ring-gear', 'ring gear', 'Mechanical/Gears and gearboxes/Gearbox parts', 'part', 'machine', 'steel-low', 'internal teeth round the inside of a ring', '', { alt: 'print', size: [50, 50, 12] });
e('planet-carrier', 'planet carrier', 'Mechanical/Gears and gearboxes/Gearbox parts', 'part', 'machine', 'al-6061', 'the plate the planets turn on, its middle the output', '', { alt: 'print', size: [40, 40, 6] });
e('gearbox-housing', 'gearbox housing', 'Mechanical/Gears and gearboxes/Gearbox parts', 'part', 'cast', 'al-a380', 'the case that holds the bearings and the ring', '', { size: [60, 60, 30] });
e('gt2-pulley', 'GT2 pulley, 20 teeth', 'Mechanical/Linear motion/Belts and pulleys', 'product', 'machine', 'al-6061 screw-set*2', 'an aluminium pulley with 20 teeth for a 2 mm pitch belt, held by two set screws', '2 mm pitch: 40 mm a turn', { alt: 'print', size: [16, 16, 16] });
e('gt2-belt', 'GT2 belt (6 mm)', 'Mechanical/Linear motion/Belts and pulleys', 'product', 'mould', 'neoprene fibreglass', 'a toothed neoprene belt round glass-fibre tension cords', '2 mm pitch, 6 mm wide');
e('lead-screw-t8', 'T8 lead screw and nut', 'Mechanical/Linear motion/Screws', 'product', 'assemble', 'stainless-304 brass', 'a rolled-thread stainless screw and a brass nut', '8 mm, 2 mm pitch × 4 starts: 8 mm a turn (or 2 mm single-start)');
e('linear-rail', 'linear rail MGN12 with carriage', 'Mechanical/Linear motion/Rails', 'product', 'assemble', 'steel-chrome*2 bearing-ball*40 pom nbr grease', 'a ground steel rail and a carriage whose balls roll along it and recirculate through plastic end caps, wipers at each end', '12 mm rail');
e('smooth-rod', 'smooth rod, 8 mm', 'Mechanical/Linear motion/Rods', 'product', 'grind', 'steel-chrome', 'a hardened, ground, chromed rod for linear bearings to run on');
e('coupling-flex', 'flexible shaft coupling 5 × 8', 'Mechanical/Shafts and couplings/Couplings', 'product', 'machine', 'al-6061 screw-set*4', 'an aluminium cylinder cut in a helix so it bends but not twists, clamped to each shaft', '', { alt: 'print', size: [19, 19, 25] });
e('shaft-collar', 'shaft collar', 'Mechanical/Shafts and couplings/Collars', 'product', 'machine', 'steel-low screw-set', 'a ring clamped on a shaft by a set screw', '', { alt: 'print', size: [16, 16, 8] });
e('spring-compression', 'compression spring', 'Mechanical/Springs/Compression', 'product', 'coil', 'steel-spring', 'music wire coiled on a mandrel, ends closed and ground, stress-relieved', 'rate k = G d⁴ / (8 D³ n)');
e('spring-extension', 'extension spring', 'Mechanical/Springs/Extension', 'product', 'coil', 'steel-spring', 'tightly coiled wire with a hook at each end');
e('spring-torsion', 'torsion spring', 'Mechanical/Springs/Torsion', 'product', 'coil', 'steel-spring', 'a coil whose legs are twisted round its axis');
e('gas-spring', 'gas spring', 'Mechanical/Springs/Gas springs', 'product', 'assemble', 'steel-low steel-alloy nbr nitrogen oil', 'nitrogen under pressure in a steel tube pushes a piston rod out through a seal');
e('caster', 'swivel caster', 'Mechanical/Wheels and casters/Casters', 'product', 'assemble', 'wheel-pu steel-low bearing-ball*20 screw-m5', 'a wheel on an axle in a stamped fork that swivels on a ring of balls under its plate');
e('wheel-pu', 'polyurethane wheel', 'Mechanical/Wheels and casters/Wheels', 'product', 'mould', 'pu pp', 'a polyurethane tread moulded onto a polypropylene hub', '', { alt: 'print', size: [50, 50, 20] });
e('wheel-robot', 'robot wheel 65 mm', 'Mechanical/Wheels and casters/Wheels', 'product', 'assemble', 'rubber wheel-hub', 'a rubber tyre on a plastic hub for a gear motor\'s shaft');
e('wheel-hub', 'wheel hub', 'Mechanical/Wheels and casters/Wheel parts', 'part', 'mould', 'pp', 'the hub of a small wheel', '', { alt: 'print', size: [60, 60, 20] });
e('omni-wheel', 'omni wheel', 'Mechanical/Wheels and casters/Wheels', 'product', 'assemble', 'wheel-hub*2 roller*12 shaft-steel*12', 'two hubs with free rollers round their rim, so it rolls sideways as well as forward');
e('roller', 'omni roller', 'Mechanical/Wheels and casters/Wheel parts', 'part', 'mould', 'pu', 'a small free roller', '', { alt: 'print', size: [10, 10, 15] });
e('hinge-butt', 'butt hinge', 'Mechanical/Hinges and joints/Hinges', 'product', 'assemble', 'hinge-leaf*2 steel-low', 'two stamped leaves rolled round a steel pin');
e('hinge-leaf', 'hinge leaf', 'Mechanical/Hinges and joints/Hinge parts', 'part', 'stamp', 'steel-low', 'a stamped leaf, its edge rolled into knuckles', '', { alt: 'print', size: [40, 30, 2] });
e('rod-end', 'rod end (ball joint)', 'Mechanical/Hinges and joints/Ball joints', 'product', 'assemble', 'steel-low steel-chrome ptfe', 'a steel housing round a hardened ball with a bore, in a PTFE liner');
e('u-joint', 'universal joint', 'Mechanical/Hinges and joints/Universal joints', 'product', 'assemble', 'steel-alloy*3 bearing-ball*40', 'two yokes joined by a cross on four needle-bearing cups');
e('pump-gear', 'gear pump', 'Mechanical/Fluid power/Pumps', 'product', 'assemble', 'pump-housing spur-gear*2 shaft-steel*2 bushing-bronze*4 nbr', 'two meshing gears in a close-fitting housing carry fluid round the outside from inlet to outlet');
e('pump-housing', 'pump housing', 'Mechanical/Fluid power/Pump parts', 'part', 'cast', 'al-a380', 'the body the gears fit closely in', '', { size: [60, 50, 40] });
e('pump-peristaltic', 'peristaltic pump', 'Mechanical/Fluid power/Pumps', 'product', 'assemble', 'n20-motor roller*3 silicone pump-head', 'rollers on a gear motor squeeze a silicone tube against a curved track, pushing what is in it along');
e('pump-head', 'peristaltic pump head', 'Mechanical/Fluid power/Pump parts', 'part', 'mould', 'abs', 'the curved track and its cover', '', { alt: 'print', size: [40, 40, 25] });
e('valve-ball', 'ball valve', 'Mechanical/Fluid power/Valves', 'product', 'assemble', 'valve-body brass ptfe*2 brass steel-low nbr', 'a bored ball turned a quarter turn by a stem between two PTFE seats in a brass body; a handle on the stem');
e('valve-body', 'valve body', 'Mechanical/Fluid power/Valve parts', 'part', 'forge', 'brass', 'the forged brass body', '', { alt: 'cast', size: [50, 30, 30] });
e('valve-solenoid', 'solenoid valve', 'Mechanical/Fluid power/Valves', 'product', 'assemble', 'valve-body bobbin winding steel-low spring-compression nbr', 'a coil lifts a plunger off its seat against a spring; a diaphragm opens the flow');
e('cylinder-hydraulic', 'hydraulic cylinder', 'Mechanical/Fluid power/Cylinders', 'product', 'assemble', 'steel-low steel-alloy nbr*4 steel-low*2', 'a honed steel barrel, a piston with seals on a chromed rod, end caps with ports', 'force = pressure × piston area');
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
e('pliers', 'pliers', 'Hardware/Hand tools/Pliers', 'product', 'assemble', 'steel-alloy*2 steel-low pvc*2', 'two forged, hardened halves riveted at their pivot, grips on the handles');
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
e('pouch-cell', 'lithium polymer pouch cell', 'Electrical/Power/Cells', 'product', 'assemble', 'nmc graphite al-foil copper-foil pe electrolyte-li al-laminate', 'stacked cathode, separator and anode sheets sealed in an aluminium-laminate pouch', '3.7 V nominal');
e('xt60', 'XT60 connector', 'Electrical/Wiring and connectors/Connectors', 'part', 'mould', 'nylon brass gold', 'a moulded body round two gold-plated brass contacts, for battery current', 'about 60 A');
e('pack-lipo-4s', 'LiPo pack 4S', 'Electrical/Power/Battery packs', 'product', 'assemble', 'pouch-cell*4 xt60 jst-xh wire-hookup*2 pe', 'four pouch cells in series, wrapped, a main lead and a balance lead', '14.8 V nominal');
e('rc-receiver', 'radio receiver', 'Electrical/Boards and controllers/Radio', 'product', 'solder', 'pcb-bare ic-package crystal wire-hookup', 'a 2.4 GHz radio chip and its antenna wire, passing the sticks\' positions on');
e('quadcopter', 'quadcopter drone', 'Electrical/Machines/Drones', 'product', 'assemble', 'frame-quad bldc-outrunner*4 esc*4 flight-controller propeller*4 pack-lipo-4s camera-module rc-receiver screw-m3*24', 'four brushless motors on a frame, each with its controller, a flight controller keeping it level, a battery, a camera, a radio', 'it lifts what its four motors\' thrust exceeds its weight by');
// a cordless drill
e('drill-chuck', 'keyless chuck', 'Mechanical/Tools parts/Chucks', 'assembly', 'assemble', 'steel-alloy*3 steel-low pp', 'three hardened jaws driven in and out of a body by a threaded sleeve');
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
e('micro-switch', 'micro switch', 'Electrical/Switching/Switches', 'product', 'assemble', 'pbt phosphor-bronze silver brass', 'a snap-action leaf of phosphor bronze over silver contacts, in a moulded case', 'the click of a mouse button');
e('encoder-rotary', 'rotary encoder', 'Electrical/Sensors/Position', 'product', 'assemble', 'pbt phosphor-bronze brass steel-low', 'sprung contacts wiping a patterned disc: two signals a quarter out of step say which way it turns');
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
e('heating-element', 'sheathed heating element', 'Electrical/Heating/Heaters', 'product', 'assemble', 'nichrome mgo stainless-304', 'a nichrome coil packed in magnesium oxide in a stainless tube, bent to shape', 'e.g. 2 kW at 230 V: 26 Ω');
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
e('spark-plug', 'spark plug', 'Mechanical/Vehicle parts/Ignition', 'product', 'assemble', 'steel-low alumina nickel-alloy copper', 'a steel shell, a sintered alumina insulator, a copper-cored nickel-alloy centre electrode and a ground electrode a gap away', 'e.g. 14 mm thread; gap about 0.7–1.1 mm');
e('rotor-claw', 'claw-pole rotor', 'Electrical/Motors and actuators/Motor parts', 'assembly', 'assemble', 'steel-low*2 winding copper shaft-steel', 'a field coil between two interlocking steel claw poles on the shaft, fed through two slip rings');
e('alternator', 'car alternator', 'Mechanical/Vehicle parts/Charging', 'product', 'assemble', 'lamination-stack winding*3 rotor-claw diode-1n4007*6 ic-package carbon-brush*2 bearing-608*2 al-a380*2 steel-low', 'a claw-pole rotor spun by the engine inside a three-phase stator, six diodes rectifying its output, a regulator setting its field', 'about 14 V');

// the fixed sizes a family makes any size of: called by the family's words for another size
for (const [id, fam] of [['screw-m3', 'screw'], ['screw-set', 'screw'], ['nut-m3', 'nut'], ['washer-m3', 'washer'], ['bearing-608', 'bearing'], ['bearing-625', 'bearing'], ['spur-gear', 'gear'], ['spring-compression', 'spring'], ['wire-hookup', 'wire'], ['extrusion-2020', 'extrusion'], ['resistor-film', 'resistor'], ['nema17', 'stepper'], ['cell-18650', 'cell'], ['gt2-pulley', 'pulley'], ['lead-screw-t8', 'leadscrew'], ['led-5mm', 'led']] as const) { const it = items.get(id); if (it) it.family = fam; }

// ==== reading it ========================================================================================================
export const INVENTORY: ReadonlyMap<string, Item> = items;
export const itemOf = (id: string): Item | null => items.get(id) ?? null;
/** An item from words: an adjustable family called with its sizes ("screw M4x20"), else an entry by its id or name. */
export function resolve(words: string): Item | string | null {
  const f = callFamily(words); if (typeof f === 'string') return f;
  if (f) { if (!items.has(f.id)) items.set(f.id, f); return f; }
  return findItem(words);
}
/** An item by its id or (in part) its name. */
export function findItem(words: string): Item | null {
  const w = words.trim().toLowerCase(); if (!w) return null;
  return items.get(w) ?? [...items.values()].find((i) => i.name.toLowerCase() === w) ?? [...items.values()].find((i) => i.name.toLowerCase().includes(w) || i.id.includes(w.replace(/\s+/g, '-'))) ?? null;
}
/** The categories, as a tree of names: category → subcategory → sub-subcategory → the items filed there. */
export function categories(): Map<string, Map<string, Map<string, string[]>>> {
  const out = new Map<string, Map<string, Map<string, string[]>>>();
  for (const i of items.values()) { const [a, b = '', c = ''] = i.path; if (!out.has(a!)) out.set(a!, new Map()); const A = out.get(a!)!; if (!A.has(b)) A.set(b, new Map()); const B = A.get(b)!; if (!B.has(c)) B.set(c, []); B.get(c)!.push(i.id); }
  return out;
}
/** How an item is made here: its own way if the workshop has it, else a way it has that will do, else bought. */
export function routeOf(i: Item): { process: Process; here: boolean; bought: boolean; why: string } {
  if (PROCESSES[i.make].here) return { process: i.make, here: true, bought: false, why: PROCESSES[i.make].says };
  if (i.alt && PROCESSES[i.alt].here) return { process: i.alt, here: true, bought: false, why: `${PROCESSES[i.alt].says}, instead of ${i.make === 'mould' ? 'moulded' : i.make === 'machine' ? 'machined' : i.make === 'forge' ? 'forged' : i.make} as it is made in a factory` };
  return { process: i.make, here: false, bought: true, why: `bought: ${PROCESSES[i.make].says}, which the workshop has not` };
}
/** Everything inside an item, depth first, each with how many go into one of it and how it is made here. */
export interface PlanRow { id: string; name: string; depth: number; n: number; kind: Kind; route: ReturnType<typeof routeOf> }
export function plan(id: string): PlanRow[] {
  const out: PlanRow[] = [];
  const walk = (x: string, depth: number, n: number, seen: Set<string>) => {
    const i = items.get(x); if (!i || seen.has(x)) return;
    const r = routeOf(i); out.push({ id: x, name: i.name, depth, n, kind: i.kind, route: r });
    // what is bought is bought whole: what is inside it is the maker's, not the workshop's
    if (r.bought) return;
    const s2 = new Set(seen).add(x); for (const c of i.of) walk(c.id, depth + 1, n * c.n, s2);
  };
  walk(id, 0, 1, new Set());
  return out;
}
/** What making an item here comes to: how many things are made here, bought, taken from stock; how deep it goes. */
export function summary(id: string): { made: number; bought: number; stock: number; depth: number; processes: Process[] } {
  const p = plan(id); return { made: p.filter((r) => !r.route.bought && r.kind !== 'material').length, bought: p.filter((r) => r.route.bought).length, stock: p.filter((r) => r.kind === 'material').length, depth: Math.max(...p.map((r) => r.depth)), processes: [...new Set(p.filter((r) => r.route.here && r.kind !== 'material').map((r) => r.route.process))] };
}
/** The tree of what is in an item, every level, as lines to read. */
export function treeLines(id: string, most = 60): string[] { return plan(id).slice(0, most).map((r) => `${'  '.repeat(r.depth)}${r.n > 1 ? `${r.n} × ` : ''}${r.name} — ${r.route.bought ? 'bought' : r.kind === 'material' ? 'stock' : r.route.process}`); }
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
    const unknown = it.of.filter((c) => { if (items.has(c.id) || fresh.has(c.id)) return false; const f = callFamily(c.id.replace(/-/g, ' ')); if (f && typeof f === 'object') { items.set(f.id, f); c.id = f.id; return false; } return true; });
    if (unknown.length) { refused.push(`${it.id}: nothing known as ${unknown.map((c) => c.id).join(', ')}: add them too, or use what is in the inventory`); continue; }
    // nothing inside itself
    const inside = (x: string, seen: Set<string>): boolean => { const i = fresh.get(x) ?? items.get(x); if (!i) return false; for (const c of i.of) { if (c.id === it.id || seen.has(c.id)) return true; if (inside(c.id, new Set(seen).add(c.id))) return true; } return false; };
    if (inside(it.id, new Set([it.id]))) { refused.push(`${it.id}: it would be inside itself`); continue; }
    items.set(it.id, it); added.push(it);
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
  const b: Board = { title: `Inside: ${top.name}`, kind: 'categories', about: `${top.says}. Every part inside it, and what is inside that, down to its materials; each marked by how it is made here (made, bought, or from stock).`, nodes: {}, edges: {}, createdAt: at, updatedAt: at, source: `inventory:${id}` };
  let e2 = 0;
  const walk = (x: string, under: string | null, n: number, path: string) => {
    const i = items.get(x); if (!i) return; const r = routeOf(i), nid = `${path}/${x}`.replace(/[^a-z0-9/.-]/gi, '-');
    b.nodes[nid] = { label: `${n > 1 ? `${n} × ` : ''}${i.name}`, note: `${i.says}${i.spec ? ` · ${i.spec}` : ''} · ${i.kind === 'material' ? 'from stock' : r.bought ? r.why : `made here: ${r.why}`}` };
    if (under) b.edges[`e${e2++}`] = { from: under, to: nid, rel: 'contains' };
    if (path.split('/').length < 8) for (const c of i.of) walk(c.id, nid, c.n, `${path}/${x}`);
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
