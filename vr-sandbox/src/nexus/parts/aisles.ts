// The parts catalogue's aisles (decision 0026, the user 2026-11-06: "organize it better for navigation"): every piece
// family that was made before families carried their own aisle, by its node's id, as `<Trade> / <Category>`. A block's
// own aisle (a family's `aisle`, set where it is made) is read first; this map only for the families made before that.
// The catalogue (navigate.ts partsCatalogue), the find tool's ranking and the parts browser (view/parts.ts) read it
// through aisleOf. Plain words a person calls a family by that its name and sizes do not say are its aliases.

/** The trades in the order the catalogue shows them; a trade not here comes after, by its name. */
export const TRADES = ['Fasteners', 'Motion', 'Electronics', 'Fluid', 'Structure', 'Hardware', 'Assemblies', 'Any part'];

const A = (aisle: string, ids: string): [string, string][] => ids.split(/\s+/).filter(Boolean).map((id) => [/^(piece|mate|seed)\./.test(id) ? id : `piece.${id}`, aisle]);
/** Every family made before families carried an aisle, by its node's id. */
export const AISLES: Record<string, string> = Object.fromEntries([
  ...A('Fasteners / Bolts', 'bolt carriagebolt threadedrod'),
  ...A('Fasteners / Screws', 'csk buttonhead panhead shoulderscrew setscrew'),
  ...A('Fasteners / Wood and masonry', 'woodscrew deckscrew nail wallplug anchor'),
  ...A('Fasteners / Nuts', 'nut flangenut nyloc squarenut wingnut capnut tnut'),
  ...A('Fasteners / Washers', 'washer lockwasher fenderwasher'),
  ...A('Fasteners / Pins, keys and clips', 'dowel splitpin clevispin rollpin key circlip'),
  ...A('Fasteners / Rivets and inserts', 'rivet rivnut heatset insert'),
  ...A('Fasteners / Standoffs and ties', 'standoff hexstandoff cabletie'),
  ...A('Motion / Bearings', 'bearing flangebearing pillowblock lmuu scuu'),
  ...A('Motion / Shafts and couplers', 'shaft collar coupler'),
  ...A('Motion / Linear motion', 'mgn leadscrew leadnut'),
  ...A('Motion / Gears, pulleys and belts', 'gear pulley gt2belt'),
  ...A('Motion / Springs and struts', 'spring gasstrut'),
  ...A('Motion / Wheels and castors', 'wheel castor'),
  ...A('Motion / Motors', 'dcmotor gearmotor servo stepper motorplate'),
  ...A('Electronics / Passives', 'resistor capacitor.ceramic capacitor.electrolytic crystal pot'),
  ...A('Electronics / Semiconductors', 'transistor diode to220 dip'),
  ...A('Electronics / Lights', 'led bulb'),
  ...A('Electronics / Connectors', 'header jst dsub usb rj45 audiojack jack plug screwterminal terminal'),
  ...A('Electronics / Switches and relays', 'button tactile toggle microswitch relay'),
  ...A('Electronics / Boards and displays', 'devboard breadboard perfboard display buzzer'),
  ...A('Electronics / Power', 'cell fuse'),
  ...A('Electronics / Wire and coils', 'wire coil winding'),
  ...A('Electronics / Fans', 'fan'),
  ...A('Fluid / Pipe and tube', 'pipe run bend npspipe pvcpipe cutube airtube'),
  ...A('Fluid / Fittings', 'coupling elbow tee gfitting pvcfitting cufitting pushfit hosebarb'),
  ...A('Fluid / Valves', 'ballvalve checkvalve needlevalve'),
  ...A('Fluid / Hose', 'hose hoseclamp'),
  ...A('Fluid / Flanges and seals', 'flange asmeflange flangegasket oring'),
  ...A('Fluid / Tanks', 'tank'),
  ...A('Structure / Sections', 'section steelbeam steelangle hollowsection bar extrusion rebar'),
  ...A('Structure / Plates and sheet', 'plate sheet'),
  ...A('Structure / Timber', 'lumber'),
  ...A('Structure / Masonry', 'brick wall'),
  ...A('Structure / Brackets', 'bracket anglebracket cornerbracket joisthanger'),
  ...A('Structure / Boxes', 'case'),
  ...A('Hardware / Hinges and slides', 'hinge pianohinge drawerslide'),
  ...A('Hardware / Handles and knobs', 'handle starknob'),
  ...A('Hardware / Feet and bumpers', 'foot bumper'),
  ...A('Hardware / Magnets', 'magnet magnetblock'),
  ...A('Any part / By its kind or a size worked out', 'kind sized'),
  ...A('Assemblies / Joints', 'mate.bolted mate.lid mate.plate'),
  ...A('Assemblies / Folded builds', 'seed.bolted-four seed.bolted-two seed.boxed seed.standoffs seed.motor-dc seed.pack-two seed.spring-checked'),
]);

/** Plain words a family is called by that its name, id and sizes do not say (the bootstrap's misses, agent.ts NAMED_AS). */
export const ALIASES: Record<string, string> = {
  'piece.lumber': 'timber wood stud joist rafter plank batten 2x4',
  'piece.sheet': 'plywood mdf osb chipboard hardboard panel board',
  'piece.devboard': 'arduino raspberry pi esp32 esp8266 nodemcu microcontroller mcu',
  'piece.wallplug': 'rawlplug plug',
  'piece.bolt': 'screw hex socket cap capscrew machine',
  'piece.nut': 'hex',
  'piece.nyloc': 'lock locknut nylon',
  'piece.lockwasher': 'lock spring',
  'piece.bearing': 'ball skate',
  'piece.coupler': 'shaft coupling',
  'piece.extrusion': 'aluminium aluminum t-slot vslot profile',
  'piece.case': 'box enclosure housing hollow',
  'piece.plate': 'panel',
  'piece.cell': 'battery 18650 aa aaa',
  'piece.led': 'light lamp diode',
  'piece.bulb': 'light lamp',
  'piece.wire': 'cable copper',
  'piece.dcmotor': 'motor brushed',
  'piece.stepper': 'nema motor',
  'piece.servo': 'motor',
  'piece.pot': 'potentiometer knob',
  'piece.gear': 'spur cog',
  'piece.spring': 'coil compression',
  'piece.pipe': 'tube copper',
  'piece.tank': 'reservoir',
  'piece.section': 'angle channel beam profile',
  'piece.header': 'pins',
  'piece.button': 'push switch',
  'piece.terminal': 'block screw',
  'piece.display': 'lcd oled tft screen',
  'piece.breadboard': 'prototype',
  'piece.hinge': 'door',
  'piece.fan': 'cooling blower',
};

/** Where a block sits in the catalogue: its own aisle first (a family made with one), else this map's; undefined where
 *  neither says. */
export const aisleOf = (d: { id: string; aisle?: string } | undefined): string | undefined => d ? d.aisle ?? AISLES[d.id] : undefined;
/** An aisle's trade and its category ("Fasteners / Nuts" → ["Fasteners", "Nuts"]); one without a slash is its own
 *  trade's "General". */
export const splitAisle = (aisle: string): [string, string] => { const i = aisle.indexOf('/'); return i < 0 ? [aisle.trim(), 'General'] : [aisle.slice(0, i).trim(), aisle.slice(i + 1).trim()]; };
/** The trades in the catalogue's order. */
export const tradeRank = (t: string): number => { const k = TRADES.indexOf(t); return k < 0 ? TRADES.length : k; };
